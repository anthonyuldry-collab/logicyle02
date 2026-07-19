const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const TEAM_STATE_COLLECTIONS = [
  'riders', 'staff', 'vehicles', 'equipment', 'raceEvents', 'eventTransportLegs',
  'eventAccommodations', 'eventDocuments', 'eventRadioEquipments', 'eventRadioAssignments',
  'eventBudgetItems', 'eventChecklistItems', 'performanceEntries', 'riderEventSelections',
  'staffEventSelections', 'eventStaffAvailabilities', 'incomeItems', 'scoutingProfiles',
  'teamProducts', 'stockItems', 'equipmentStockItems', 'warehouses', 'stockMovements',
  'vehiclePositions', 'clientRecords', 'supplierInvoices', 'sepaBatches', 'bankTransactions',
  'quotes', 'peerRatings', 'teamEventReviews', 'debriefings', 'missions', 'meetingReports',
  'performanceArchives', 'expenseReceipts', 'organizerContacts',
];

const BATCH_SIZE = 400;

async function deleteCollection(collRef) {
  const snapshot = await collRef.get();
  if (snapshot.empty) return;

  let batch = db.batch();
  let count = 0;

  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
    count++;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

async function deleteByField(collRef, field, value) {
  const snapshot = await collRef.where(field, '==', value).get();
  if (snapshot.empty) return;

  let batch = db.batch();
  let count = 0;
  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
    count++;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

async function deleteStoragePrefix(prefix) {
  try {
    const [files] = await bucket.getFiles({ prefix });
    await Promise.all(files.map((file) => file.delete().catch(() => {})));
  } catch {
    // ignore
  }
}

async function writeAuditLog(entry) {
  try {
    await db.collection('gdprAuditLogs').add({
      ...entry,
      performedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

async function purgeUserData(userId, performedBy) {
  const userDoc = await db.collection('users').doc(userId).get();
  const teamIds = new Set();

  const memberships = await db.collection('teamMemberships').where('userId', '==', userId).get();
  for (const d of memberships.docs) {
    if (d.data().teamId) teamIds.add(d.data().teamId);
    await d.ref.delete();
  }

  if (userDoc.exists && userDoc.data().teamId) {
    teamIds.add(userDoc.data().teamId);
  }

  for (const teamId of teamIds) {
    await deleteStoragePrefix(`teams/${teamId}/riders/${userId}/`);
    await deleteStoragePrefix(`teams/${teamId}/staff/${userId}/`);

    const teamRef = db.collection('teams').doc(teamId);
    await teamRef.collection('riders').doc(userId).delete().catch(() => {});
    await teamRef.collection('staff').doc(userId).delete().catch(() => {});
    await teamRef.collection('scoutingProfiles').doc(userId).delete().catch(() => {});

    await deleteByField(teamRef.collection('riderEventSelections'), 'riderId', userId);
    await deleteByField(teamRef.collection('peerRatings'), 'raterRiderId', userId);
    await deleteByField(teamRef.collection('peerRatings'), 'ratedRiderId', userId);
    await deleteByField(teamRef.collection('staffEventSelections'), 'staffId', userId);
  }

  await deleteStoragePrefix(`users/${userId}/`);
  await db.collection('users').doc(userId).delete().catch(() => {});

  await writeAuditLog({
    action: 'user_purge',
    targetId: userId,
    performedBy,
    method: 'cloud_function',
  });
}

async function purgeTeamData(teamId, performedBy) {
  await deleteStoragePrefix(`teams/${teamId}/`);

  const teamRef = db.collection('teams').doc(teamId);
  for (const collName of TEAM_STATE_COLLECTIONS) {
    await deleteCollection(teamRef.collection(collName));
  }
  await deleteCollection(teamRef.collection('checklistTemplates'));

  const memberships = await db.collection('teamMemberships').where('teamId', '==', teamId).get();
  for (const m of memberships.docs) {
    const userId = m.data().userId;
    await m.ref.delete();
    if (userId) {
      await db.collection('users').doc(userId).update({
        teamId: admin.firestore.FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  await teamRef.delete().catch(() => {});

  await writeAuditLog({
    action: 'team_purge',
    targetId: teamId,
    performedBy,
    method: 'cloud_function',
  });
}


/** Création d'équipe atomique (Admin SDK) — membership ACTIVE + élévation Manager. */
exports.createTeamForUser = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const uid = request.auth.uid;
  const { name, level, country, planId } = request.data || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'Nom d\'équipe requis.');
  }
  if (!level || typeof level !== 'string') {
    throw new HttpsError('invalid-argument', 'Niveau d\'équipe requis.');
  }
  if (!country || typeof country !== 'string') {
    throw new HttpsError('invalid-argument', 'Pays requis.');
  }

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'Profil utilisateur introuvable.');
  }
  const userData = userSnap.data() || {};
  if (userData.teamId) {
    throw new HttpsError('already-exists', 'Vous appartenez déjà à une équipe.');
  }

  if (userData.userRole !== 'Manager') {
    throw new HttpsError(
      'permission-denied',
      'Inscrivez-vous avec le parcours Manager pour créer une équipe.'
    );
  }

  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + 14);
  const highTier = ['continental', 'pro', 'federation', 'CONTINENTAL', 'PRO', 'FEDERATION'];
  const isHigh = planId && highTier.map(String).includes(String(planId));
  const pilotEnds = new Date(now);
  pilotEnds.setDate(pilotEnds.getDate() + 90);

  const subscription = isHigh
    ? { planId: planId || 'pro', status: 'pilot', pilotEndsAt: pilotEnds.toISOString() }
    : { planId: planId || 'club', status: 'trialing', trialEndsAt: trialEnds.toISOString() };

  const teamRef = db.collection('teams').doc();
  const membershipRef = db.collection('teamMemberships').doc();

  const batch = db.batch();
  batch.set(teamRef, {
    name: name.trim(),
    level,
    country: country.trim(),
    subscription,
    operationalSettings: {
      acceptRiderApplications: false,
      acceptStaffApplications: false,
    },
    createdAt: now.toISOString(),
    createdByUserId: uid,
  });
  batch.set(membershipRef, {
    userId: uid,
    teamId: teamRef.id,
    status: 'Actif',
    userRole: 'Manager',
    source: 'team_create',
    startDate: now.toISOString().split('T')[0],
  });
  batch.set(
    userRef,
    {
      teamId: teamRef.id,
      userRole: 'Manager',
      permissionRole: 'Administrateur',
      isIndependentProfile: false,
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );

  // Init légère des sous-collections critiques
  const initCols = ['riders', 'staff', 'vehicles', 'raceEvents', 'incomeItems'];
  for (const coll of initCols) {
    batch.set(teamRef.collection(coll).doc('_init_'), { createdAt: now.toISOString() });
  }

  await batch.commit();
  return { teamId: teamRef.id };
});

exports.gdprPurgeUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const { userId, performedBy } = request.data || {};
  const targetId = userId || request.auth.uid;

  if (targetId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Vous ne pouvez supprimer que votre propre compte.');
  }

  await purgeUserData(targetId, performedBy || request.auth.uid);
  return { success: true };
});

exports.gdprPurgeTeam = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const { teamId, performedBy } = request.data || {};
  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId requis.');
  }

  const authEmail = (request.auth.token.email || '').toLowerCase();
  const isSuperAdmin = authEmail === 'anthony.uldry@hotmail.fr';

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const userData = userDoc.data() || {};
  const isManager =
    userData.teamId === teamId &&
    (userData.userRole === 'Manager' || userData.permissionRole === 'Administrateur');

  if (!isManager && !isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Seul un manager ou le Super Admin peut supprimer l\'équipe.');
  }

  await purgeTeamData(teamId, performedBy || request.auth.uid);
  return { success: true };
});

// --- Stripe Billing ---
let stripe = null;
try {
  const Stripe = require('stripe');
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch {
  // stripe package optional until configured
}

const STRIPE_PRICE_MAP = {
  club: { month: process.env.STRIPE_PRICE_CLUB_MONTH, year: process.env.STRIPE_PRICE_CLUB_YEAR },
  competition: { month: process.env.STRIPE_PRICE_COMPETITION_MONTH, year: process.env.STRIPE_PRICE_COMPETITION_YEAR },
  continental: { month: process.env.STRIPE_PRICE_CONTINENTAL_MONTH, year: process.env.STRIPE_PRICE_CONTINENTAL_YEAR },
  pro: { month: process.env.STRIPE_PRICE_PRO_MONTH, year: process.env.STRIPE_PRICE_PRO_YEAR },
  independent_rider: {
    month: process.env.STRIPE_PRICE_INDEPENDENT_RIDER_MONTH,
    year: process.env.STRIPE_PRICE_INDEPENDENT_RIDER_YEAR,
  },
  independent_staff: {
    month: process.env.STRIPE_PRICE_INDEPENDENT_STAFF_MONTH,
    year: process.env.STRIPE_PRICE_INDEPENDENT_STAFF_YEAR,
  },
};

async function assertTeamManager(uid, teamId) {
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data() || {};
  const isManager =
    userData.teamId === teamId &&
    (userData.userRole === 'Manager' || userData.permissionRole === 'Administrateur');
  if (!isManager) {
    throw new HttpsError('permission-denied', 'Seul un manager peut gérer l\'abonnement.');
  }
}

async function updateTeamSubscription(teamId, subscriptionPatch) {
  const teamRef = db.collection('teams').doc(teamId);
  const updates = {};
  for (const [key, value] of Object.entries(subscriptionPatch)) {
    updates[`subscription.${key}`] = value;
  }
  await teamRef.set(updates, { merge: true });
}

async function updateUserSubscription(userId, subscriptionPatch) {
  const userRef = db.collection('users').doc(userId);
  const updates = {};
  for (const [key, value] of Object.entries(subscriptionPatch)) {
    updates[`subscription.${key}`] = value;
  }
  updates.updatedAt = new Date().toISOString();
  await userRef.set(updates, { merge: true });
}

async function assertIndependentUser(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data() || {};
  const isIndependent =
    userData.signupMode === 'independent' || userData.isIndependentProfile === true;
  if (!isIndependent) {
    throw new HttpsError('permission-denied', 'Abonnement réservé aux profils indépendants.');
  }
  return userData;
}

async function findSubscriptionOwnerByCustomerId(customerId) {
  const teamsSnap = await db.collection('teams')
    .where('subscription.stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (!teamsSnap.empty) {
    return { type: 'team', id: teamsSnap.docs[0].id };
  }
  const usersSnap = await db.collection('users')
    .where('subscription.stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (!usersSnap.empty) {
    return { type: 'user', id: usersSnap.docs[0].id };
  }
  return null;
}

async function creditReferrer(referrerUserId) {
  const userRef = db.collection('users').doc(referrerUserId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;
  const data = userSnap.data() || {};
  const currentCredits = data.referralPendingCredits || 0;
  const newCredits = Math.min(currentCredits + 1, 3);
  await userRef.update({
    referralTotalCount: admin.firestore.FieldValue.increment(1),
    referralConvertedCount: admin.firestore.FieldValue.increment(1),
    referralPendingCredits: newCredits,
    updatedAt: new Date().toISOString(),
  });
}


/** Origines autorisées pour redirects Stripe (évite open redirect via Origin spoofé). */
function resolveAppOrigin(request) {
  const raw = (request.rawRequest && request.rawRequest.headers && request.rawRequest.headers.origin) || '';
  const defaults = ['https://logicyle.app', 'https://www.logicyle.app', 'http://localhost:5173', 'http://localhost:3000'];
  const fromEnv = (process.env.ALLOWED_APP_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = fromEnv.length ? fromEnv : defaults;
  if (raw && allowed.includes(raw)) return raw;
  return allowed[0] || 'https://logicyle.app';
}

exports.createStripeCheckout = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (!stripe) {
    throw new HttpsError('failed-precondition', 'Stripe non configuré. Contactez le support.');
  }

  const { teamId, planId, interval = 'year', referralCode, scope } = request.data || {};
  if (!planId) {
    throw new HttpsError('invalid-argument', 'planId requis.');
  }

  const isUserScope = scope === 'user';
  if (isUserScope) {
    await assertIndependentUser(request.auth.uid);
  } else {
    if (!teamId) {
      throw new HttpsError('invalid-argument', 'teamId requis.');
    }
    await assertTeamManager(request.auth.uid, teamId);
  }

  const priceId = STRIPE_PRICE_MAP[planId]?.[interval];
  if (!priceId) {
    throw new HttpsError('invalid-argument', `Price ID manquant pour ${planId}/${interval}`);
  }

  let referrerUserId = null;
  let normalizedReferralCode = null;
  if (referralCode && typeof referralCode === 'string') {
    normalizedReferralCode = referralCode.trim().toUpperCase();
    const refSnap = await db.collection('users').where('referralCode', '==', normalizedReferralCode).limit(1).get();
    if (!refSnap.empty) {
      referrerUserId = refSnap.docs[0].id;
      if (referrerUserId === request.auth.uid) {
        throw new HttpsError('invalid-argument', 'Vous ne pouvez pas utiliser votre propre code parrain.');
      }
    }
  }

  let customerId;
  const origin = resolveAppOrigin(request);

  if (isUserScope) {
    const userRef = db.collection('users').doc(request.auth.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    customerId = userData.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: request.auth.uid, scope: 'user', firebaseUid: request.auth.uid },
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'LogiCycle Indépendant',
        email: userData.email || undefined,
      });
      customerId = customer.id;
      await userRef.set(
        { subscription: { ...userData.subscription, stripeCustomerId: customerId } },
        { merge: true }
      );
    }
  } else {
    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();
    const teamData = teamSnap.data() || {};
    customerId = teamData.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { teamId, firebaseUid: request.auth.uid },
        name: teamData.name || 'LogiCycle Team',
      });
      customerId = customer.id;
      await teamRef.set({ subscription: { ...teamData.subscription, stripeCustomerId: customerId } }, { merge: true });
    }
  }

  const sessionParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancel`,
    metadata: isUserScope
      ? { userId: request.auth.uid, planId, scope: 'user' }
      : { teamId, planId },
  };

  if (referrerUserId && interval === 'year' && process.env.STRIPE_COUPON_REFERRAL_REFEREE) {
    sessionParams.discounts = [{ coupon: process.env.STRIPE_COUPON_REFERRAL_REFEREE }];
    sessionParams.metadata.referralCode = normalizedReferralCode;
    sessionParams.metadata.referrerUserId = referrerUserId;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url };
});

exports.createStripePortal = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (!stripe) {
    throw new HttpsError('failed-precondition', 'Stripe non configuré.');
  }

  const { teamId, scope } = request.data || {};
  const isUserScope = scope === 'user';
  let customerId;

  if (isUserScope) {
    await assertIndependentUser(request.auth.uid);
    const userSnap = await db.collection('users').doc(request.auth.uid).get();
    customerId = userSnap.data()?.subscription?.stripeCustomerId;
  } else {
    if (!teamId) {
      throw new HttpsError('invalid-argument', 'teamId requis.');
    }
    await assertTeamManager(request.auth.uid, teamId);
    const teamSnap = await db.collection('teams').doc(teamId).get();
    customerId = teamSnap.data()?.subscription?.stripeCustomerId;
  }

  if (!customerId) {
    throw new HttpsError('failed-precondition', 'Aucun client Stripe associé.');
  }

  const origin = resolveAppOrigin(request);
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/`,
  });

  return { url: portal.url };
});

exports.stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  if (!stripe) {
    res.status(503).send('Stripe non configuré');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(503).send('Webhook secret manquant');
    return;
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const teamId = session.metadata?.teamId;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const referrerUserId = session.metadata?.referrerUserId;
        const subscriptionPatch = {
          planId,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          trialEndsAt: admin.firestore.FieldValue.delete(),
          pilotEndsAt: admin.firestore.FieldValue.delete(),
          pendingReferralCode: admin.firestore.FieldValue.delete(),
          referredByUserId: referrerUserId || admin.firestore.FieldValue.delete(),
        };

        if (userId && session.metadata?.scope === 'user') {
          await updateUserSubscription(userId, subscriptionPatch);
          if (referrerUserId) {
            await creditReferrer(referrerUserId);
            await db.collection('referrals').add({
              referrerUserId,
              referredUserId: userId,
              referralCode: session.metadata?.referralCode || null,
              planId,
              convertedAt: new Date().toISOString(),
            });
          }
        } else if (teamId && planId) {
          await updateTeamSubscription(teamId, subscriptionPatch);
          if (referrerUserId) {
            await creditReferrer(referrerUserId);
            await db.collection('referrals').add({
              referrerUserId,
              referredTeamId: teamId,
              referralCode: session.metadata?.referralCode || null,
              planId,
              convertedAt: new Date().toISOString(),
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const owner = await findSubscriptionOwnerByCustomerId(customerId);
        if (owner) {
          const status = subscription.status === 'active' ? 'active'
            : subscription.status === 'trialing' ? 'trialing'
            : subscription.status === 'past_due' ? 'past_due'
            : 'canceled';
          const patch = {
            status,
            stripeSubscriptionId: subscription.id,
          };
          if (owner.type === 'team') {
            await updateTeamSubscription(owner.id, patch);
          } else {
            await updateUserSubscription(owner.id, patch);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const owner = await findSubscriptionOwnerByCustomerId(customerId);
        if (owner) {
          if (owner.type === 'team') {
            await updateTeamSubscription(owner.id, { status: 'canceled' });
          } else {
            await updateUserSubscription(owner.id, { status: 'canceled' });
          }
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    res.status(500).send('Webhook handler failed');
  }
});

// --- Nolio API (tokens stockés côté serveur uniquement) ---
const NOLIO_TOKEN_URL = 'https://www.nolio.io/api/token/';
const NOLIO_API_BASE = 'https://www.nolio.io/api/';

function nolioIntegrationRef(uid) {
  return db.collection('users').doc(uid).collection('privateIntegrations').doc('nolio');
}

async function nolioTokenRequest(body, clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(NOLIO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new HttpsError('internal', `Nolio token error ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpsError('internal', `Nolio token invalid JSON: ${text}`);
  }
}

async function getValidNolioAccessToken(uid) {
  const clientId = process.env.NOLIO_CLIENT_ID;
  const clientSecret = process.env.NOLIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HttpsError('failed-precondition', 'Nolio non configuré sur le serveur');
  }

  const doc = await nolioIntegrationRef(uid).get();
  if (!doc.exists) {
    throw new HttpsError('failed-precondition', 'Compte Nolio non connecté');
  }

  const data = doc.data();
  const expiresAt = data.tokenExpiresAt ? new Date(data.tokenExpiresAt).getTime() : 0;
  if (data.accessToken && expiresAt > Date.now() + 60_000) {
    return data.accessToken;
  }

  if (!data.refreshToken) {
    throw new HttpsError('failed-precondition', 'Session Nolio expirée — reconnectez-vous');
  }

  const tokens = await nolioTokenRequest(
    { grant_type: 'refresh_token', refresh_token: data.refreshToken },
    clientId,
    clientSecret
  );

  const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString();
  await nolioIntegrationRef(uid).set({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return tokens.access_token;
}

exports.nolioExchangeCode = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');

  const { code, redirectUri } = request.data || {};
  if (!code || !redirectUri) {
    throw new HttpsError('invalid-argument', 'code et redirectUri requis');
  }

  const clientId = process.env.NOLIO_CLIENT_ID;
  const clientSecret = process.env.NOLIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HttpsError('failed-precondition', 'Nolio non configuré');
  }

  const tokens = await nolioTokenRequest(
    { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
    clientId,
    clientSecret
  );

  const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString();
  const connectedAt = new Date().toISOString();

  await nolioIntegrationRef(request.auth.uid).set({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt,
    connectedAt,
    updatedAt: connectedAt,
  });

  await db.collection('users').doc(request.auth.uid).set({
    nolioConnected: true,
    nolioConnectedAt: connectedAt,
  }, { merge: true });

  return { connected: true, connectedAt };
});

exports.nolioGetConnectionStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
  const doc = await nolioIntegrationRef(request.auth.uid).get();
  if (!doc.exists) return { connected: false };
  const data = doc.data();
  return {
    connected: !!data.refreshToken || !!data.accessToken,
    connectedAt: data.connectedAt,
  };
});

exports.nolioGetTrainings = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');

  const { from, to } = request.data || {};
  if (!from || !to) throw new HttpsError('invalid-argument', 'from et to requis (YYYY-MM-DD)');

  const accessToken = await getValidNolioAccessToken(request.auth.uid);
  const params = new URLSearchParams({ from, to, limit: '300' });
  const res = await fetch(`${NOLIO_API_BASE}get/training/?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new HttpsError('internal', `Nolio trainings ${res.status}: ${text}`);
  }

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpsError('internal', 'Réponse Nolio invalide');
  }

  const list = Array.isArray(raw) ? raw : (raw.results || raw.data || []);
  const trainings = list.map((t) => ({
    id: t.id,
    name: t.name,
    date_start: t.date_start || t.date,
    duration: t.duration,
    distance: t.distance,
    elevation_gain: t.elevation_gain,
    sport_id: t.sport_id,
    rpe: t.rpe,
  }));

  return { trainings, from, to };
});

exports.nolioDisconnect = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
  await nolioIntegrationRef(request.auth.uid).delete();
  await db.collection('users').doc(request.auth.uid).set({
    nolioConnected: false,
    nolioConnectedAt: admin.firestore.FieldValue.delete(),
  }, { merge: true });
  return { success: true };
});

/** Webhook GPS télématique (Traccar, Geotab, etc.) */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

exports.ingestVehicleGps = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const teamId = req.query.teamId;
  const apiKey = req.query.key;
  if (!teamId || !apiKey) {
    res.status(400).send('Missing teamId or key');
    return;
  }

  const teamRef = db.collection('teams').doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    res.status(404).send('Team not found');
    return;
  }
  const privateGpsSnap = await teamRef.collection('privateConfig').doc('gps').get();
  let settings = privateGpsSnap.exists ? privateGpsSnap.data()?.webhookKey : null;
  if ((!settings || typeof settings !== 'string') && teamSnap.data().gpsWebhookKey) {
    settings = teamSnap.data().gpsWebhookKey;
    if (typeof settings === 'string' && settings.length >= 8) {
      await teamRef.collection('privateConfig').doc('gps').set({
        webhookKey: settings,
        migratedAt: new Date().toISOString(),
      }, { merge: true });
      await teamRef.set({ gpsWebhookKey: admin.firestore.FieldValue.delete() }, { merge: true });
    }
  }
  if (!settings || typeof settings !== 'string' || settings.length < 8) {
    res.status(403).send('GPS webhook key not configured');
    return;
  }
  const a = Buffer.from(String(settings));
  const b = Buffer.from(String(apiKey));
  if (a.length !== b.length || !require('crypto').timingSafeEqual(a, b)) {
    res.status(403).send('Invalid key');
    return;
  }

  const payload = req.body || {};
  const deviceId = String(payload.deviceId || payload.device_id || payload.imei || '');
  const lat = Number(payload.latitude ?? payload.lat);
  const lng = Number(payload.longitude ?? payload.lng ?? payload.lon);
  if (!deviceId || Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).send('Invalid payload');
    return;
  }

  let vehicleId = deviceId;
  const byDevice = await teamRef.collection('vehicles').where('gpsDeviceId', '==', deviceId).limit(1).get();
  if (!byDevice.empty) {
    vehicleId = byDevice.docs[0].id;
  } else {
    const byId = await teamRef.collection('vehicles').doc(deviceId).get();
    if (byId.exists) vehicleId = byId.id;
  }

  const recordedAt = payload.recordedAt || payload.fixTime || new Date().toISOString();
  const position = {
    id: `pos-${Date.now()}`,
    vehicleId,
    latitude: lat,
    longitude: lng,
    speedKmh: Number(payload.speed ?? payload.speedKmh) || null,
    heading: Number(payload.heading ?? payload.course) || null,
    recordedAt: typeof recordedAt === 'string' ? recordedAt : new Date(recordedAt).toISOString(),
    source: payload.source || 'traccar',
  };

  await teamRef.collection('vehiclePositions').doc(position.id).set(position);
  const vehicleRef = teamRef.collection('vehicles').doc(vehicleId);
  if ((await vehicleRef.get()).exists) {
    await vehicleRef.set({
      lastLatitude: lat,
      lastLongitude: lng,
      lastPositionAt: position.recordedAt,
      lastSpeedKmh: position.speedKmh,
    }, { merge: true });
  }

  res.json({ ok: true, vehicleId });
});

/** Position GPS chauffeur (app native Capacitor / PWA) — écriture serveur sécurisée */
exports.recordDriverGpsPosition = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const {
    teamId,
    staffId,
    vehicleIds,
    vehicleAssignments,
    latitude,
    longitude,
    speedKmh,
    heading,
    eventId,
    transportLegId,
  } = request.data || {};

  const assignmentItems = Array.isArray(vehicleAssignments) && vehicleAssignments.length > 0
    ? vehicleAssignments.map((a) => ({
        vehicleId: String(a.vehicleId || ''),
        eventId: a.eventId ? String(a.eventId) : undefined,
        transportLegId: a.transportLegId ? String(a.transportLegId) : undefined,
      }))
    : (Array.isArray(vehicleIds) ? vehicleIds : []).map((id) => ({
        vehicleId: String(id),
        eventId: eventId ? String(eventId) : undefined,
        transportLegId: transportLegId ? String(transportLegId) : undefined,
      }));

  if (!teamId || !staffId || assignmentItems.length === 0 || assignmentItems.some((a) => !a.vehicleId)) {
    throw new HttpsError('invalid-argument', 'Paramètres manquants.');
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new HttpsError('invalid-argument', 'Coordonnées invalides.');
  }

  const teamRef = db.collection('teams').doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Équipe introuvable.');
  }

  const membership = await db.collection('teamMemberships')
    .where('teamId', '==', teamId)
    .where('userId', '==', request.auth.uid)
    .limit(1)
    .get();
  if (membership.empty) {
    throw new HttpsError('permission-denied', 'Non membre de cette équipe.');
  }

  const userSnap = await db.collection('users').doc(request.auth.uid).get();
  const authEmail = userSnap.data()?.email?.trim().toLowerCase() || '';

  async function loadStaffDoc(id) {
    const snap = await teamRef.collection('staff').doc(id).get();
    return snap.exists ? { id: snap.id, data: snap.data() } : null;
  }

  function staffMatchesAuth(docId, data) {
    const staffEmail = data.email?.trim().toLowerCase() || '';
    return (
      docId === request.auth.uid
      || data.userId === request.auth.uid
      || (authEmail && staffEmail === authEmail)
    );
  }

  let resolvedStaffId = null;
  const requested = await loadStaffDoc(staffId);
  if (requested && staffMatchesAuth(requested.id, requested.data)) {
    resolvedStaffId = requested.id;
  }
  if (!resolvedStaffId && staffId !== request.auth.uid) {
    const byUid = await loadStaffDoc(request.auth.uid);
    if (byUid && staffMatchesAuth(byUid.id, byUid.data)) {
      resolvedStaffId = byUid.id;
    }
  }
  if (!resolvedStaffId) {
    const byUserId = await teamRef.collection('staff').where('userId', '==', request.auth.uid).limit(5).get();
    for (const doc of byUserId.docs) {
      if (staffMatchesAuth(doc.id, doc.data())) {
        resolvedStaffId = doc.id;
        break;
      }
    }
  }
  if (!resolvedStaffId && authEmail) {
    const staffSnap = await teamRef.collection('staff').get();
    for (const doc of staffSnap.docs) {
      const email = doc.data().email?.trim().toLowerCase() || '';
      if (email === authEmail) {
        resolvedStaffId = doc.id;
        break;
      }
    }
  }
  if (!resolvedStaffId) {
    throw new HttpsError('permission-denied', 'Identifiant chauffeur non autorisé.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const recordedAt = new Date().toISOString();

  for (const { vehicleId, eventId: itemEventId, transportLegId: itemTransportLegId } of assignmentItems) {
    const vehicleRef = teamRef.collection('vehicles').doc(vehicleId);
    const vehicleSnap = await vehicleRef.get();
    if (!vehicleSnap.exists) {
      throw new HttpsError('not-found', `Véhicule ${vehicleId} introuvable.`);
    }
    const vehicle = vehicleSnap.data();
    let allowed = vehicle.driverId === resolvedStaffId;

    if (!allowed) {
      const legsSnap = await teamRef.collection('eventTransportLegs')
        .where('driverId', '==', resolvedStaffId)
        .where('assignedVehicleId', '==', vehicleId)
        .limit(20)
        .get();
      for (const legDoc of legsSnap.docs) {
        const leg = legDoc.data();
        const dep = leg.departureDate ? String(leg.departureDate).slice(0, 10) : '';
        if (dep === today) {
          allowed = true;
          break;
        }
      }
    }

    if (!allowed) {
      throw new HttpsError('permission-denied', `Non assigné au véhicule ${vehicleId}.`);
    }

    const positionRef = teamRef.collection('vehiclePositions').doc();
    await positionRef.set({
      vehicleId,
      latitude: lat,
      longitude: lng,
      speedKmh: Number(speedKmh) || 0,
      heading: heading != null ? Number(heading) : null,
      recordedAt,
      source: 'driver_app',
      ...(itemEventId ? { eventId: itemEventId } : {}),
      ...(itemTransportLegId ? { transportLegId: itemTransportLegId } : {}),
    });

    await vehicleRef.set({
      lastLatitude: lat,
      lastLongitude: lng,
      lastPositionAt: recordedAt,
      lastSpeedKmh: Number(speedKmh) || 0,
      gpsSource: 'driver_app',
      gpsTrackingEnabled: true,
    }, { merge: true });
  }

  await teamRef.collection('staff').doc(resolvedStaffId).set({
    lastLatitude: lat,
    lastLongitude: lng,
    lastPositionAt: recordedAt,
    lastSpeedKmh: Number(speedKmh) || 0,
  }, { merge: true });

  return { ok: true, recordedAt };
});

exports.onUserNotificationCreated = onDocumentCreated(
  'userNotifications/{notificationId}',
  async (event) => {
    const data = event.data?.data();
    if (!data?.userId) return;

    const userSnap = await db.collection('users').doc(data.userId).get();
    const tokens = userSnap.data()?.pushTokens || [];
    if (tokens.length === 0) return;

    const message = {
      notification: { title: data.title || 'LogiCycle', body: data.body || '' },
      data: {
        eventId: data.eventId || '',
        teamId: data.teamId || '',
        type: data.type || 'SYSTEM',
      },
      tokens,
    };

    try {
      await admin.messaging().sendEachForMulticast(message);
    } catch (err) {
      console.error('FCM send error:', err);
    }
  }
);

/** Extraction CV → profil pro. Clé Gemini côté serveur uniquement (GEMINI_API_KEY). */
exports.extractCvProfile = onCall({ timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const callerSnap = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerSnap.data() || {};
  const canExtract =
    caller.userRole === 'Manager' ||
    caller.userRole === 'Staff' ||
    caller.permissionRole === 'Administrateur' ||
    caller.permissionRole === 'Editeur';
  if (!canExtract) {
    throw new HttpsError('permission-denied', 'Réservé aux managers / staff.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError(
      'failed-precondition',
      'GEMINI_API_KEY non configurée sur les Cloud Functions.'
    );
  }

  const { mimeType, base64, fileName } = request.data || {};
  if (!base64 || typeof base64 !== 'string') {
    throw new HttpsError('invalid-argument', 'CV manquant (base64).');
  }
  if (!mimeType || typeof mimeType !== 'string') {
    throw new HttpsError('invalid-argument', 'mimeType manquant.');
  }

  const supported = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];
  if (!supported.includes(mimeType)) {
    throw new HttpsError(
      'invalid-argument',
      'Format non supporté. Utilisez PDF ou image.'
    );
  }

  // Limite ~4 Mo base64
  if (base64.length > 6 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Fichier trop volumineux.');
  }

  const prompt = `Tu es un recruteur sportif spécialisé cyclisme / logistique d'équipe.
Analyse le CV fourni (${fileName || 'document'}) et extrais les informations professionnelles pour remplir un profil staff.

Réponds UNIQUEMENT en JSON strict (pas de markdown) avec cette structure:
{
  "professionalSummary": "résumé pro en français, 2 à 5 phrases",
  "experienceYears": number | null,
  "skills": ["compétence 1", "compétence 2"],
  "certifications": ["certification 1"],
  "workHistory": [
    {
      "position": "poste",
      "company": "organisation",
      "startDate": "AAAA-MM" | "",
      "endDate": "AAAA-MM" | "présent" | "",
      "description": "missions clés"
    }
  ],
  "education": [
    {
      "degree": "diplôme",
      "institution": "école",
      "year": 2020,
      "description": ""
    }
  ],
  "languages": [
    {
      "language": "Français",
      "proficiency": "Natif" | "Courant" | "Avancé" | "Intermédiaire" | "Basique"
    }
  ]
}

Règles:
- Extrais UNIQUEMENT ce qui est clairement présent dans le CV.
- skills: compétences techniques et soft skills concrètes (max 25), libellés courts.
- Preferer le français pour professionalSummary et descriptions.
- Si une info est absente, utilise [] ou null / "".
- Ne invente pas d'entreprises, diplômes ou certifications.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Gemini CV extract error:', response.status, err.slice(0, 300));
    throw new HttpsError('internal', `Analyse CV impossible (${response.status}).`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new HttpsError('internal', 'Réponse Gemini vide.');
  }

  let profile;
  try {
    const match = String(text).match(/\{[\s\S]*\}/);
    profile = JSON.parse(match ? match[0] : text);
  } catch {
    throw new HttpsError('internal', 'Réponse Gemini non JSON.');
  }

  return { profile };
});

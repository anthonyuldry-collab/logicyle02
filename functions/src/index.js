const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

/** Région EU unique — latence + RGPD (données UE). */
setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 40,
  concurrency: 80,
  timeoutSeconds: 60,
});

admin.initializeApp();

/** Secrets Gen2 montés en process.env (firebase functions:secrets:set …). */
const SECRET_STRIPE = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const SECRET_STRIPE_BILLING = ['STRIPE_SECRET_KEY'];
const SECRET_NOLIO = ['NOLIO_CLIENT_ID', 'NOLIO_CLIENT_SECRET'];
const SECRET_GEMINI = ['GEMINI_API_KEY'];

function logStructured(level, message, fields = {}) {
  const entry = {
    severity: level,
    message,
    service: 'logicyle-functions',
    ...fields,
    timestamp: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  if (level === 'ERROR' || level === 'CRITICAL') console.error(line);
  else if (level === 'WARNING') console.warn(line);
  else console.log(line);
}


const db = admin.firestore();
const bucket = admin.storage().bucket();

const FOUNDER_SUPER_ADMIN_EMAIL = 'anthony.uldry@hotmail.fr';

function isFounderSuperAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === FOUNDER_SUPER_ADMIN_EMAIL;
}

/** Abonnement Performance 5 ans, hors Stripe — équipes internes / démo fondateur. */
function complimentaryProSubscription() {
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 5);
  return {
    planId: 'pro',
    status: 'active',
    billingInterval: 'year',
    currentPeriodEnd: periodEnd.toISOString(),
  };
}

const {
  completeMissionPayment,
  markMissionPaymentFailed,
  markMissionPaymentRefunded,
} = require('./missionPaymentHandlers');
const { assertLegalReadyForMissionPayments, getLogicycleLegalEntity } = require('./logicycleLegal');
const {
  buildVacataireInvoicePdfBuffer,
} = require('./missionInvoicePdf');

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

/** Rate-limit mémoire (par instance) — appliqué APRÈS auth clé (anti-DoS flotte). */
const gpsRateBuckets = new Map();
const gpsAuthFailBuckets = new Map();
const GPS_RATE_WINDOW_MS = 60_000;
const GPS_RATE_MAX = 120;
const GPS_AUTH_FAIL_MAX = 30;

function pruneRateMap(map, now) {
  if (map.size <= 500) return;
  for (const [id, b] of map) {
    if (now - b.windowStart > GPS_RATE_WINDOW_MS) map.delete(id);
  }
}

function assertRateBucket(map, key, max) {
  const now = Date.now();
  pruneRateMap(map, now);
  let bucket = map.get(key);
  if (!bucket || now - bucket.windowStart > GPS_RATE_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    map.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    const err = new Error('rate_limited');
    err.status = 429;
    throw err;
  }
}

function assertGpsRateLimit(teamId) {
  assertRateBucket(gpsRateBuckets, `ok:${teamId}`, GPS_RATE_MAX);
}

function assertGpsAuthFailLimit(teamId, clientIp) {
  assertRateBucket(gpsAuthFailBuckets, `fail:${teamId}:${clientIp || 'unknown'}`, GPS_AUTH_FAIL_MAX);
}

function sendGpsRateLimited(res, teamId) {
  logStructured('WARNING', 'gps_rate_limited', { teamId });
  res.set('Retry-After', '60');
  res.status(429).send('Too many requests');
}

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
exports.createTeamForUser = onCall({ memory: '256MiB' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const uid = request.auth.uid;
  const authEmail = (request.auth.token.email || '').toLowerCase();
  const { name, level, country, planId, internal } = request.data || {};
  const wantInternal = Boolean(internal);
  const isFounder = isFounderSuperAdminEmail(authEmail);
  if (wantInternal && !isFounder) {
    throw new HttpsError(
      'permission-denied',
      'Seule la direction plateforme peut créer une équipe interne sans paiement.'
    );
  }
  const isFounderInternal = wantInternal && isFounder;

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
  if (!isFounderInternal && userData.teamId) {
    throw new HttpsError('already-exists', 'Vous appartenez déjà à une équipe.');
  }

  if (!isFounderInternal && userData.userRole !== 'Manager') {
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
  pilotEnds.setDate(pilotEnds.getDate() + 30);

  const subscription = isFounderInternal
    ? complimentaryProSubscription()
    : isHigh
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
    isPlatformInternal: isFounderInternal,
    commercialClient: false,
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
    source: isFounderInternal ? 'internal_team_create' : 'team_create',
    startDate: now.toISOString().split('T')[0],
  });
  if (isFounderInternal) {
    batch.set(
      userRef,
      {
        isPlatformInternal: true,
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );
  } else {
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
  }

  // Init légère des sous-collections critiques
  const initCols = ['riders', 'staff', 'vehicles', 'raceEvents', 'incomeItems'];
  for (const coll of initCols) {
    batch.set(teamRef.collection(coll).doc('_init_'), { createdAt: now.toISOString() });
  }

  await batch.commit();
  return { teamId: teamRef.id };
});

/**
 * Super Admin : convertit une équipe existante en sandbox interne
 * (abo Performance 5 ans, hors Stripe / hors MRR).
 */
exports.grantInternalTeamAccess = onCall({ memory: '256MiB' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  const authEmail = (request.auth.token.email || '').toLowerCase();
  if (!isFounderSuperAdminEmail(authEmail)) {
    throw new HttpsError(
      'permission-denied',
      'Réservé à la direction plateforme.'
    );
  }
  const teamId = request.data?.teamId;
  if (!teamId || typeof teamId !== 'string') {
    throw new HttpsError('invalid-argument', 'teamId requis.');
  }
  const teamRef = db.collection('teams').doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Équipe introuvable.');
  }
  const now = new Date();
  await teamRef.set(
    {
      isPlatformInternal: true,
      commercialClient: false,
      subscription: complimentaryProSubscription(),
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );

  const uid = request.auth.uid;
  const existing = await db
    .collection('teamMemberships')
    .where('teamId', '==', teamId)
    .where('userId', '==', uid)
    .limit(1)
    .get();
  if (existing.empty) {
    await db.collection('teamMemberships').add({
      userId: uid,
      teamId,
      status: 'Actif',
      userRole: 'Manager',
      source: 'internal_team_grant',
      startDate: now.toISOString().split('T')[0],
    });
  }

  await db.collection('users').doc(uid).set(
    { isPlatformInternal: true, updatedAt: now.toISOString() },
    { merge: true }
  );
  return { ok: true, teamId };
});

exports.gdprPurgeUser = onCall({ memory: '512MiB', timeoutSeconds: 300 }, async (request) => {
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

exports.gdprPurgeTeam = onCall({ memory: '1GiB', timeoutSeconds: 540 }, async (request) => {
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

/**
 * Super Admin only — purge Firestore orphelins (users/memberships/teams sans compte Auth).
 * data.dryRun=true : rapport sans suppression.
 */
exports.cleanupOrphanedData = onCall({ memory: '1GiB', timeoutSeconds: 540 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  const authEmail = (request.auth.token.email || '').toLowerCase();
  if (authEmail !== 'anthony.uldry@hotmail.fr') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const dryRun = Boolean(request.data?.dryRun);
  const authUids = new Set();
  let nextPageToken;
  do {
    const listed = await admin.auth().listUsers(1000, nextPageToken);
    for (const u of listed.users) authUids.add(u.uid);
    nextPageToken = listed.pageToken;
  } while (nextPageToken);

  const report = {
    dryRun,
    authUserCount: authUids.size,
    deletedUserDocs: [],
    deletedMemberships: [],
    deletedTeams: [],
    deletedPartnerAccesses: [],
    deletedScoutingRequests: [],
    deletedMarketplaceProfiles: [],
  };

  const usersSnap = await db.collection('users').get();
  for (const docSnap of usersSnap.docs) {
    if (authUids.has(docSnap.id)) continue;
    report.deletedUserDocs.push({
      id: docSnap.id,
      email: docSnap.data()?.email || null,
    });
    if (!dryRun) {
      await purgeUserData(docSnap.id, request.auth.uid);
    }
  }

  const membershipsSnap = await db.collection('teamMemberships').get();
  for (const docSnap of membershipsSnap.docs) {
    const userId = docSnap.data()?.userId;
    if (userId && authUids.has(userId)) continue;
    // Invitation email sans userId : garder si email Auth connu, sinon supprimer si stale userId
    if (!userId) continue;
    report.deletedMemberships.push({
      id: docSnap.id,
      userId,
      teamId: docSnap.data()?.teamId || null,
    });
    if (!dryRun) {
      await docSnap.ref.delete().catch(() => {});
    }
  }

  const teamsSnap = await db.collection('teams').get();
  for (const teamDoc of teamsSnap.docs) {
    const teamId = teamDoc.id;
    const members = await db.collection('teamMemberships').where('teamId', '==', teamId).get();
    const hasLivingMember = members.docs.some((m) => {
      const uid = m.data()?.userId;
      return uid && authUids.has(uid);
    });
    const creatorId = teamDoc.data()?.createdByUserId;
    const creatorAlive = creatorId ? authUids.has(creatorId) : false;
    if (hasLivingMember || creatorAlive) continue;

    report.deletedTeams.push({
      id: teamId,
      name: teamDoc.data()?.name || null,
      createdByUserId: creatorId || null,
    });
    if (!dryRun) {
      await purgeTeamData(teamId, request.auth.uid);
    }
  }

  const partnerSnap = await db.collection('partnerAccesses').get();
  for (const docSnap of partnerSnap.docs) {
    const userId = docSnap.data()?.userId;
    if (userId && authUids.has(userId)) continue;
    if (!userId) continue;
    report.deletedPartnerAccesses.push(docSnap.id);
    if (!dryRun) await docSnap.ref.delete().catch(() => {});
  }

  const scoutingSnap = await db.collection('scoutingRequests').get();
  for (const docSnap of scoutingSnap.docs) {
    const athleteId = docSnap.data()?.athleteId;
    if (athleteId && authUids.has(athleteId)) continue;
    if (!athleteId) continue;
    report.deletedScoutingRequests.push(docSnap.id);
    if (!dryRun) await docSnap.ref.delete().catch(() => {});
  }

  const marketSnap = await db.collection('partnerMarketplaceProfiles').get();
  for (const docSnap of marketSnap.docs) {
    const userId = docSnap.data()?.userId;
    if (userId && authUids.has(userId)) continue;
    if (!userId) continue;
    report.deletedMarketplaceProfiles.push(docSnap.id);
    if (!dryRun) await docSnap.ref.delete().catch(() => {});
  }

  await writeAuditLog({
    action: dryRun ? 'orphan_cleanup_dry_run' : 'orphan_cleanup',
    targetId: 'firestore',
    performedBy: request.auth.uid,
    method: 'cloud_function',
    summary: {
      users: report.deletedUserDocs.length,
      memberships: report.deletedMemberships.length,
      teams: report.deletedTeams.length,
    },
  });

  logStructured('INFO', 'orphan_cleanup_done', {
    dryRun,
    users: report.deletedUserDocs.length,
    memberships: report.deletedMemberships.length,
    teams: report.deletedTeams.length,
  });

  return report;
});

// --- Stripe Billing ---
let stripe = null;
function getStripe() {
  if (stripe) return stripe;
  try {
    const Stripe = require('stripe');
    if (!process.env.STRIPE_SECRET_KEY) return null;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    return stripe;
  } catch (err) {
    console.error(JSON.stringify({ severity: 'ERROR', message: 'stripe_init_failed', error: String(err && err.message || err) }));
    return null;
  }
}

function getStripePriceId(planId, interval) {
  const key = String(planId || '').toLowerCase();
  const map = {
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
  return map[key]?.[interval] || null;
}

async function assertTeamManager(uid, teamId) {
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data() || {};
  const isManagerOnUser =
    userData.teamId === teamId &&
    (userData.userRole === 'Manager' || userData.permissionRole === 'Administrateur');

  const membershipSnap = await db.collection('teamMemberships')
    .where('teamId', '==', teamId)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  let isManagerOnMembership = false;
  if (!membershipSnap.empty) {
    const m = membershipSnap.docs[0].data() || {};
    const status = String(m.status || '').toLowerCase();
    const active = !status || status === 'active' || status === 'approved' || status === 'accepted';
    isManagerOnMembership = active && (
      m.userRole === 'Manager' ||
      m.permissionRole === 'Administrateur'
    );
  }

  if (!isManagerOnUser && !isManagerOnMembership) {
    // Super admin / créateur d'équipe
    if (userData.email && String(userData.email).toLowerCase() === 'anthony.uldry@hotmail.fr') {
      return;
    }
    throw new HttpsError('permission-denied', 'Seul un manager peut gérer l\'abonnement.');
  }
}

async function updateTeamSubscription(teamId, subscriptionPatch, options = {}) {
  const teamRef = db.collection('teams').doc(teamId);
  const updates = {};
  for (const [key, value] of Object.entries(subscriptionPatch)) {
    updates[`subscription.${key}`] = value;
  }
  // Uniquement Checkout Live → entre dans le portefeuille Pilotage PDG.
  if (options.markCommercialClient === true) {
    updates.commercialClient = true;
  }
  await teamRef.set(updates, { merge: true });
}

async function updateUserSubscription(userId, subscriptionPatch, options = {}) {
  const userRef = db.collection('users').doc(userId);
  const updates = {};
  for (const [key, value] of Object.entries(subscriptionPatch)) {
    updates[`subscription.${key}`] = value;
  }
  if (options.markCommercialClient === true) {
    updates.commercialClient = true;
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
  const defaults = ['https://logicycle.app', 'https://www.logicycle.app', 'https://logicycle2.netlify.app', 'http://localhost:5173', 'http://localhost:3000'];
  const fromEnv = (process.env.ALLOWED_APP_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = fromEnv.length ? fromEnv : defaults;
  if (raw && allowed.includes(raw)) return raw;
  return allowed[0] || 'https://logicycle.app';
}

function assertMissionPaymentsEnabled() {
  if (process.env.MISSION_PAYMENTS_ENABLED !== 'true') {
    throw new HttpsError(
      'failed-precondition',
      'Paiements marketplace missions désactivés (MISSION_PAYMENTS_ENABLED).'
    );
  }
}

const MISSION_COMMISSION_STANDARD_PCT = 12;
const MISSION_COMMISSION_PRO_PCT = 10;
const MISSION_COMMISSION_MIN_EUR = 15;
const MISSION_COMMISSION_MAX_EUR = 450;

function isProMissionPlan(planId) {
  const id = String(planId || '').toLowerCase();
  return id === 'pro' || id === 'performance';
}

function missionDayCount(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function estimateMissionGmvEur(mission) {
  const days = missionDayCount(mission.startDate, mission.endDate);
  if (typeof mission.dailyRate === 'number' && mission.dailyRate > 0) {
    return Math.round(mission.dailyRate * days * 100) / 100;
  }
  const raw = String(mission.compensation || '');
  const match = raw.replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  if (match) {
    const n = Number(match[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0) {
      if (/\/\s*j/i.test(raw) || /jour/i.test(raw)) {
        return Math.round(n * days * 100) / 100;
      }
      return Math.round(n * 100) / 100;
    }
  }
  return 0;
}

function computeMissionCommissionEur(gmvEur, isProTeam) {
  if (!(gmvEur > 0)) return 0;
  const rate = isProTeam ? MISSION_COMMISSION_PRO_PCT : MISSION_COMMISSION_STANDARD_PCT;
  const raw = gmvEur * (rate / 100);
  return Math.min(
    MISSION_COMMISSION_MAX_EUR,
    Math.max(MISSION_COMMISSION_MIN_EUR, Math.round(raw * 100) / 100)
  );
}

function eurToCents(amountEur) {
  return Math.round(amountEur * 100);
}

async function getRecipientTransfersActive(stripeClient, accountId) {
  try {
    const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.recipient'],
    });
    const status =
      account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
    return status === 'active';
  } catch (err) {
    logStructured('WARNING', 'connect_account_retrieve_failed', {
      accountId,
      error: String(err && err.message || err),
    });
    return false;
  }
}

exports.createStripeCheckout = onCall({ secrets: SECRET_STRIPE_BILLING, memory: '256MiB' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  const stripeClient = getStripe();
  if (!stripeClient) {
    throw new HttpsError('failed-precondition', 'Stripe non configuré. Contactez le support.');
  }

  const { teamId, planId, interval = 'year', referralCode, scope, trialPeriodDays, applyFounderDiscount } =
    request.data || {};
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

  const priceId = getStripePriceId(planId, interval);
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
      const customer = await stripeClient.customers.create({
        metadata: { userId: request.auth.uid, scope: 'user', firebaseUid: request.auth.uid },
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Rovik Indépendant',
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
      const customer = await stripeClient.customers.create({
        metadata: { teamId, firebaseUid: request.auth.uid },
        name: teamData.name || 'Rovik Team',
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

  const trialDays = Number(trialPeriodDays);
  if (Number.isFinite(trialDays) && trialDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: Math.min(Math.floor(trialDays), 90),
    };
  }

  if (referrerUserId && interval === 'year' && process.env.STRIPE_COUPON_REFERRAL_REFEREE) {
    sessionParams.discounts = [{ coupon: process.env.STRIPE_COUPON_REFERRAL_REFEREE }];
    sessionParams.metadata.referralCode = normalizedReferralCode;
    sessionParams.metadata.referrerUserId = referrerUserId;
  } else if (
    applyFounderDiscount === true &&
    interval === 'year' &&
    !isUserScope &&
    process.env.STRIPE_COUPON_FOUNDER
  ) {
    // Cohorte fondateurs : −20 % an 1 (coupon repeating 12 mois). Pas cumulable avec parrainage.
    sessionParams.discounts = [{ coupon: process.env.STRIPE_COUPON_FOUNDER }];
    sessionParams.metadata.founderOffer = 'year1_20';
  }

  let session;
  try {
    session = await stripeClient.checkout.sessions.create(sessionParams);
  } catch (err) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'stripe_checkout_create_failed',
      planId,
      interval,
      priceId,
      error: String(err && err.message || err),
    }));
    throw new HttpsError('internal', `Stripe: ${err && err.message ? err.message : 'échec création session'}`);
  }

  return { url: session.url };
});

exports.createStripePortal = onCall({ secrets: SECRET_STRIPE, memory: '256MiB' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  const stripeClient = getStripe();
  if (!stripeClient) {
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
  const portal = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/`,
  });

  return { url: portal.url };
});

/** Stripe Connect — Accounts v2 recipient (vacataire marketplace missions). */
exports.createMissionConnectAccount = onCall(
  { secrets: SECRET_STRIPE_BILLING, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise.');
    }
    assertMissionPaymentsEnabled();
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new HttpsError('failed-precondition', 'Stripe non configuré.');
    }

    const userData = await assertIndependentUser(request.auth.uid);
    const userRef = db.collection('users').doc(request.auth.uid);

    if (userData.stripeConnectAccountId) {
      const payoutsEnabled = await getRecipientTransfersActive(
        stripeClient,
        userData.stripeConnectAccountId
      );
      if (payoutsEnabled !== Boolean(userData.stripeConnectPayoutsEnabled)) {
        await userRef.set(
          { stripeConnectPayoutsEnabled: payoutsEnabled, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
      return {
        accountId: userData.stripeConnectAccountId,
        payoutsEnabled,
      };
    }

    const displayName =
      `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
      userData.email ||
      'Vacataire Rovik';

    let account;
    try {
      account = await stripeClient.v2.core.accounts.create({
        contact_email: userData.email || undefined,
        display_name: displayName,
        identity: {
          country: 'fr',
          entity_type: 'individual',
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        dashboard: 'express',
        metadata: {
          firebaseUid: request.auth.uid,
          kind: 'mission_vacataire',
        },
        include: ['configuration.recipient', 'requirements'],
      });
    } catch (err) {
      logStructured('ERROR', 'connect_account_create_failed', {
        uid: request.auth.uid,
        error: String(err && err.message || err),
      });
      throw new HttpsError(
        'internal',
        `Stripe Connect: ${err && err.message ? err.message : 'échec création compte'}`
      );
    }

    await userRef.set(
      {
        stripeConnectAccountId: account.id,
        stripeConnectPayoutsEnabled: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { accountId: account.id, payoutsEnabled: false };
  }
);

exports.createMissionConnectAccountLink = onCall(
  { secrets: SECRET_STRIPE_BILLING, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise.');
    }
    assertMissionPaymentsEnabled();
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new HttpsError('failed-precondition', 'Stripe non configuré.');
    }

    const userData = await assertIndependentUser(request.auth.uid);
    let accountId = userData.stripeConnectAccountId;
    if (!accountId) {
      throw new HttpsError(
        'failed-precondition',
        'Compte Connect manquant. Appelez d’abord createMissionConnectAccount.'
      );
    }

    const origin = resolveAppOrigin(request);
    try {
      const accountLink = await stripeClient.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            configurations: ['recipient'],
            refresh_url: `${origin}/?connect=refresh`,
            return_url: `${origin}/?connect=return`,
          },
        },
      });
      return { url: accountLink.url, accountId };
    } catch (err) {
      logStructured('ERROR', 'connect_account_link_failed', {
        uid: request.auth.uid,
        accountId,
        error: String(err && err.message || err),
      });
      throw new HttpsError(
        'internal',
        `Stripe Connect: ${err && err.message ? err.message : 'échec Account Link'}`
      );
    }
  }
);

/** Checkout destination charge — équipe paie vacataire + commission Rovik. */
exports.createMissionPaymentCheckout = onCall(
  { secrets: SECRET_STRIPE_BILLING, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise.');
    }
    assertMissionPaymentsEnabled();
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new HttpsError('failed-precondition', 'Stripe non configuré.');
    }

    const key = process.env.STRIPE_SECRET_KEY || '';
    const isLiveKey = key.startsWith('sk_live');
    try {
      assertLegalReadyForMissionPayments(isLiveKey);
    } catch (err) {
      if (err && err.code === 'legal_entity_incomplete') {
        throw new HttpsError('failed-precondition', err.message);
      }
      throw err;
    }

    const { teamId, missionId } = request.data || {};
    if (!teamId || !missionId) {
      throw new HttpsError('invalid-argument', 'teamId et missionId requis.');
    }
    await assertTeamManager(request.auth.uid, teamId);

    const missionRef = db.collection('teams').doc(teamId).collection('missions').doc(missionId);
    const missionSnap = await missionRef.get();
    if (!missionSnap.exists) {
      throw new HttpsError('not-found', 'Mission introuvable.');
    }
    const mission = { id: missionSnap.id, ...missionSnap.data() };
    if (String(mission.status) !== 'Pourvu') {
      throw new HttpsError('failed-precondition', 'La mission doit être pourvue avant paiement.');
    }
    if (mission.payment?.status === 'paid') {
      throw new HttpsError('failed-precondition', 'Cette mission est déjà payée.');
    }

    // Régime B (emploi) exclu — Aligné docs/MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md
    const compensationType = String(mission.compensationType || '');
    const connectEligible =
      compensationType === 'Vacataire (Facture)' ||
      compensationType === 'Montant Fixe';
    if (!connectEligible) {
      throw new HttpsError(
        'failed-precondition',
        'Paiement Connect réservé aux missions en prestation indépendante (Vacataire / Montant fixe). CDD et salariat : contrat + paie hors Connect.'
      );
    }

    const applications = Array.isArray(mission.applications) ? mission.applications : [];
    const accepted = applications.find((a) => String(a.status) === 'Accepté(e)');
    if (!accepted?.userId) {
      throw new HttpsError('failed-precondition', 'Aucun candidat accepté sur cette mission.');
    }

    const vacataireSnap = await db.collection('users').doc(accepted.userId).get();
    const vacataire = vacataireSnap.data() || {};
    const connectedAccountId = vacataire.stripeConnectAccountId;
    if (!connectedAccountId) {
      throw new HttpsError(
        'failed-precondition',
        'Le vacataire n’a pas encore activé Stripe Connect.'
      );
    }

    const transfersActive = await getRecipientTransfersActive(stripeClient, connectedAccountId);
    await db.collection('users').doc(accepted.userId).set(
      {
        stripeConnectPayoutsEnabled: transfersActive,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    if (!transfersActive) {
      throw new HttpsError(
        'failed-precondition',
        'Le compte Stripe du vacataire n’est pas prêt (onboarding incomplet).'
      );
    }

    const teamSnap = await db.collection('teams').doc(teamId).get();
    const teamData = teamSnap.data() || {};
    const isProTeam = isProMissionPlan(teamData.subscription?.planId);
    const gmvEur = estimateMissionGmvEur(mission);
    if (!(gmvEur > 0)) {
      throw new HttpsError(
        'failed-precondition',
        'Montant mission invalide (renseignez un tarif journalier ou un montant).'
      );
    }
    const commissionEur = computeMissionCommissionEur(gmvEur, isProTeam);
    const gmvCents = eurToCents(gmvEur);
    const commissionCents = eurToCents(commissionEur);
    if (commissionCents >= gmvCents) {
      throw new HttpsError('failed-precondition', 'Commission incohérente vs GMV.');
    }

    const origin = resolveAppOrigin(request);
    const vacataireName =
      `${accepted.firstName || ''} ${accepted.lastName || ''}`.trim() || 'Vacataire';

    let session;
    try {
      session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: gmvCents,
              product_data: {
                name: `Mission : ${mission.title || missionId}`,
                description: `Règlement vacataire ${vacataireName} · commission Rovik ${commissionEur} €`,
              },
            },
          },
        ],
        success_url: `${origin}/?missionPayment=success&missionId=${encodeURIComponent(missionId)}`,
        cancel_url: `${origin}/?missionPayment=cancel&missionId=${encodeURIComponent(missionId)}`,
        metadata: {
          kind: 'mission_payment',
          teamId,
          missionId,
          vacataireUserId: accepted.userId,
          connectedAccountId,
          gmvCents: String(gmvCents),
          commissionCents: String(commissionCents),
        },
        payment_intent_data: {
          application_fee_amount: commissionCents,
          transfer_data: {
            destination: connectedAccountId,
          },
          metadata: {
            kind: 'mission_payment',
            teamId,
            missionId,
            vacataireUserId: accepted.userId,
          },
        },
      });
    } catch (err) {
      logStructured('ERROR', 'mission_checkout_create_failed', {
        teamId,
        missionId,
        error: String(err && err.message || err),
      });
      throw new HttpsError(
        'internal',
        `Stripe: ${err && err.message ? err.message : 'échec checkout mission'}`
      );
    }

    await missionRef.set(
      {
        payment: {
          status: 'checkout_pending',
          gmvCents,
          commissionCents,
          checkoutSessionId: session.id,
          connectedAccountId,
        },
      },
      { merge: true }
    );

    return {
      url: session.url,
      sessionId: session.id,
      gmvEur,
      commissionEur,
    };
  }
);

/** Vacataire : finalise le modèle → facture émise (n° définitif + archive). */
exports.finalizeVacataireMissionInvoice = onCall(
  { memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise.');
    }
    const { teamId, missionId } = request.data || {};
    if (!teamId || !missionId) {
      throw new HttpsError('invalid-argument', 'teamId et missionId requis.');
    }

    const missionRef = db.collection('teams').doc(teamId).collection('missions').doc(missionId);
    const missionSnap = await missionRef.get();
    if (!missionSnap.exists) {
      throw new HttpsError('not-found', 'Mission introuvable.');
    }
    const mission = missionSnap.data() || {};
    const payment = mission.payment || {};
    if (payment.status !== 'paid' && payment.status !== 'refunded') {
      throw new HttpsError('failed-precondition', 'La mission doit être payée.');
    }

    const applications = Array.isArray(mission.applications) ? mission.applications : [];
    const accepted = applications.find((a) => String(a.status) === 'Accepté(e)');
    if (!accepted || accepted.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Réservé au vacataire accepté.');
    }

    if (payment.vacataireInvoiceStatus === 'issued' && payment.vacataireInvoiceNumber) {
      return {
        invoiceNumber: payment.vacataireInvoiceNumber,
        alreadyIssued: true,
      };
    }

    const userSnap = await db.collection('users').doc(request.auth.uid).get();
    const business = userSnap.data()?.business || payment.vacataireBusinessSnapshot || null;
    if (!business?.siret || String(business.siret).includes('À COMPLÉTER')) {
      throw new HttpsError(
        'failed-precondition',
        'Complétez votre SIRET dans Espace indépendant → Ma société avant d’émettre.'
      );
    }

    const paidAt = payment.paidAt || new Date().toISOString();
    const ymd = paidAt.slice(0, 10).replace(/-/g, '');
    const short = String(missionId).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'XXXXXX';
    const vacataireInvoiceNumber = `V-${ymd}-${short}`;
    const issuedAt = new Date().toISOString();
    const archivePath = `teams/${teamId}/missionInvoices/${vacataireInvoiceNumber}.json`;
    const pdfPath = `teams/${teamId}/missionInvoices/${vacataireInvoiceNumber}.pdf`;

    const gmvEur = Math.round((Number(payment.gmvCents) || 0)) / 100;
    const commissionEur = Math.round((Number(payment.commissionCents) || 0)) / 100;
    const netEur = Math.max(0, Math.round((gmvEur - commissionEur) * 100) / 100);

    const archivePayload = {
      kind: 'vacataire_mission_invoice_issued',
      invoiceNumber: vacataireInvoiceNumber,
      draftNumber: payment.vacataireInvoiceDraftNumber,
      issuedAt,
      issueDate: issuedAt.slice(0, 10),
      netEur,
      commissionEur,
      teamId,
      missionId,
      missionTitle: mission.title,
      issuer: business,
      acceptedName: `${accepted.firstName || ''} ${accepted.lastName || ''}`.trim(),
      paymentIntentId: payment.paymentIntentId || null,
    };

    await bucket.file(archivePath).save(JSON.stringify(archivePayload, null, 2), {
      contentType: 'application/json; charset=utf-8',
    });
    await bucket.file(pdfPath).save(buildVacataireInvoicePdfBuffer(archivePayload), {
      contentType: 'application/pdf',
    });

    await missionRef.set(
      {
        payment: {
          ...payment,
          vacataireInvoiceStatus: 'issued',
          vacataireInvoiceNumber,
          vacataireInvoiceIssuedAt: issuedAt,
          vacataireBusinessSnapshot: business,
          vacataireInvoiceArchivePath: archivePath,
          vacataireInvoicePdfPath: pdfPath,
        },
      },
      { merge: true }
    );

    await db.collection('userNotifications').add({
      userId: request.auth.uid,
      title: 'Facture vacataire émise',
      body: `Facture ${vacataireInvoiceNumber} enregistrée.`,
      teamId,
      eventId: missionId,
      type: 'MISSION_INVOICE',
      createdAt: issuedAt,
      read: false,
    });

    logStructured('INFO', 'vacataire_invoice_issued', {
      teamId,
      missionId,
      vacataireInvoiceNumber,
      uid: request.auth.uid,
    });

    return { invoiceNumber: vacataireInvoiceNumber, alreadyIssued: false };
  }
);

exports.stripeWebhook = onRequest({ cors: false, secrets: SECRET_STRIPE, memory: '512MiB' }, async (req, res) => {
  const stripeClient = getStripe();
  if (!stripeClient) {
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
    event = stripeClient.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.metadata?.kind === 'mission_payment') {
          await completeMissionPayment(db, bucket, logStructured, session);
          break;
        }

        const teamId = session.metadata?.teamId;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const referrerUserId = session.metadata?.referrerUserId;
        const markCommercial = event.livemode === true;
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
          await updateUserSubscription(userId, subscriptionPatch, {
            markCommercialClient: markCommercial,
          });
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
          await updateTeamSubscription(teamId, subscriptionPatch, {
            markCommercialClient: markCommercial,
          });
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
      case 'checkout.session.expired': {
        const session = event.data.object;
        if (session.metadata?.kind === 'mission_payment') {
          await markMissionPaymentFailed(db, logStructured, {
            sessionId: session.id,
            paymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id,
            reason: 'checkout_expired',
            status: 'expired',
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        if (pi.metadata?.kind === 'mission_payment') {
          await markMissionPaymentFailed(db, logStructured, {
            paymentIntentId: pi.id,
            sessionId: null,
            reason: pi.last_payment_error?.message || 'payment_failed',
            status: 'failed',
          });
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (paymentIntentId) {
          await markMissionPaymentRefunded(db, bucket, logStructured, paymentIntentId);
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

exports.nolioExchangeCode = onCall({ secrets: SECRET_NOLIO }, async (request) => {
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

exports.nolioGetTrainings = onCall({ secrets: SECRET_NOLIO }, async (request) => {
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

exports.ingestVehicleGps = onRequest({ memory: '256MiB', timeoutSeconds: 30 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const teamId = String(req.query.teamId || (req.body && req.body.teamId) || '');
  // Préférer le header (évite la clé dans les logs d’URL / proxies).
  const apiKey = String(
    req.get('x-api-key') || req.get('x-logicyle-gps-key') || req.query.key || ''
  );
  if (!teamId || !apiKey) {
    res.status(400).send('Missing teamId or key');
    return;
  }

  const clientIp = String(
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || ''
  );

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
    try {
      assertGpsAuthFailLimit(teamId, clientIp);
    } catch (rateErr) {
      if (rateErr && rateErr.status === 429) {
        sendGpsRateLimited(res, teamId);
        return;
      }
      throw rateErr;
    }
    res.status(403).send('Invalid key');
    return;
  }

  // Rate-limit volume légitime uniquement après auth (évite DoS par teamId public).
  try {
    assertGpsRateLimit(teamId);
  } catch (rateErr) {
    if (rateErr && rateErr.status === 429) {
      sendGpsRateLimited(res, teamId);
      return;
    }
    throw rateErr;
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

  const recordedAt = payload.recordedAt || payload.timestamp || payload.fixTime || new Date().toISOString();
  const position = {
    id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    vehicleId,
    latitude: lat,
    longitude: lng,
    speedKmh: Number(payload.speed ?? payload.speedKmh) || null,
    heading: Number(payload.heading ?? payload.course) || null,
    recordedAt: typeof recordedAt === 'string' ? recordedAt : new Date(recordedAt).toISOString(),
    source: payload.source || 'traccar',
  };

  const vehicleRef = teamRef.collection('vehicles').doc(vehicleId);
  const vehicleExists = (await vehicleRef.get()).exists;
  const writes = [teamRef.collection('vehiclePositions').doc(position.id).set(position)];
  if (vehicleExists) {
    writes.push(vehicleRef.set({
      lastLatitude: lat,
      lastLongitude: lng,
      lastPositionAt: position.recordedAt,
      lastSpeedKmh: position.speedKmh,
    }, { merge: true }));
  }
  await Promise.all(writes);

  res.json({ ok: true, vehicleId });
});

/** Position GPS chauffeur (app native Capacitor / PWA) — écriture serveur sécurisée */
exports.recordDriverGpsPosition = onCall({ memory: '256MiB' }, async (request) => {
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
  {
    document: 'userNotifications/{notificationId}',
    memory: '256MiB',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data?.userId) return;

    const userSnap = await db.collection('users').doc(data.userId).get();
    const tokens = userSnap.data()?.pushTokens || [];
    if (tokens.length === 0) return;

    const message = {
      notification: { title: data.title || 'Rovik', body: data.body || '' },
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
      logStructured('ERROR', 'fcm_send_failed', { error: String(err && err.message || err) });
    }
  }
);

/** Extraction CV → profil pro. Clé Gemini côté serveur uniquement (GEMINI_API_KEY). */
exports.extractCvProfile = onCall({ secrets: SECRET_GEMINI, timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
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

/** Cache healthz deep — évite un write Firestore à chaque probe LB. */
let healthzDeepCache = { at: 0, ok: false };

/** Health check pour load balancers / uptime monitors (pas d'auth).
 *  GET /healthz        → liveness process (gratuit)
 *  GET /healthz?deep=1 → readiness Firestore (cache 15s)
 */
exports.healthz = onRequest({ invoker: 'public', memory: '128MiB', timeoutSeconds: 10 }, async (req, res) => {
  const deep = String(req.query.deep || '') === '1';
  const payload = {
    status: 'ok',
    service: 'logicyle-functions',
    region: 'europe-west1',
    timestamp: new Date().toISOString(),
  };

  if (!deep) {
    res.status(200).json(payload);
    return;
  }

  const now = Date.now();
  if (healthzDeepCache.ok && now - healthzDeepCache.at < 15_000) {
    res.status(200).json({ ...payload, deep: 'cached' });
    return;
  }

  try {
    await db.collection('_health').doc('ping').get();
    healthzDeepCache = { at: now, ok: true };
    logStructured('INFO', 'healthz_deep_ok', { status: 'ok' });
    res.status(200).json({ ...payload, deep: 'live' });
  } catch (err) {
    healthzDeepCache = { at: now, ok: false };
    logStructured('ERROR', 'healthz_failed', { error: String(err && err.message || err) });
    res.status(503).json({ status: 'degraded', error: 'firestore_unreachable' });
  }
});


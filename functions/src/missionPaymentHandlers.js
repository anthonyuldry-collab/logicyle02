/**
 * Handlers paiements marketplace missions (Stripe Connect).
 * Idempotence, archives JSON Storage, snapshots légaux, refunds, notifications.
 */

const admin = require('firebase-admin');
const {
  buildTeamInvoicePdfBuffer,
  buildVacataireInvoicePdfBuffer,
  buildCreditNotePdfBuffer,
} = require('./missionInvoicePdf');
const { sendTransactionalEmail, missionInvoiceEmailHtml } = require('./sendTransactionalEmail');
const { getLogicycleLegalEntity } = require('./logicycleLegal');

function shortMissionId(missionId, len = 6) {
  const clean = String(missionId || '').replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(-len) || 'XXXXXX').toUpperCase();
}

function buildTeamInvoiceNumber(missionId, paidAtIso) {
  const ymd = (paidAtIso || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  return `LC-M-${ymd}-${shortMissionId(missionId)}`;
}

function buildVacataireDraftNumber(missionId, paidAtIso) {
  const ymd = (paidAtIso || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  return `DRAFT-V-${ymd}-${shortMissionId(missionId)}`;
}

function buildCreditNoteNumber(teamInvoiceNumber) {
  return `${teamInvoiceNumber || 'LC-M-UNKNOWN'}-AV`;
}

function centsToEur(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

async function writeBinaryArchive(bucket, path, buffer, contentType) {
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'private, max-age=0',
      metadata: { retentionHint: 'accounting_10y' },
    },
  });
  return path;
}

async function writeInvoiceArchive(bucket, path, payload) {
  const file = bucket.file(path);
  await file.save(JSON.stringify(payload, null, 2), {
    contentType: 'application/json; charset=utf-8',
    metadata: {
      cacheControl: 'private, max-age=0',
      metadata: {
        kind: payload.kind || 'mission_invoice_archive',
        retentionHint: 'accounting_10y',
      },
    },
  });
  return path;
}

async function notifyUser(db, { userId, title, body, teamId, missionId, type }) {
  if (!userId) return;
  await db.collection('userNotifications').add({
    userId,
    title,
    body,
    teamId: teamId || null,
    eventId: missionId || null,
    type: type || 'MISSION_INVOICE',
    createdAt: new Date().toISOString(),
    read: false,
  });
}

async function notifyTeamManagers(db, teamId, payload) {
  const memberships = await db
    .collection('teamMemberships')
    .where('teamId', '==', teamId)
    .where('status', '==', 'Actif')
    .get();
  const userIds = new Set();
  for (const doc of memberships.docs) {
    const m = doc.data();
    if (m.userId) userIds.add(m.userId);
  }
  const teamSnap = await db.collection('teams').doc(teamId).get();
  const teamName = teamSnap.data()?.name || 'Équipe';

  await Promise.all(
    [...userIds].map(async (uid) => {
      const userSnap = await db.collection('users').doc(uid).get();
      const u = userSnap.data() || {};
      const isFinance =
        u.userRole === 'Manager' ||
        u.permissionRole === 'Administrateur' ||
        u.permissionRole === 'comptable' ||
        u.permissionRole === 'tresorier';
      if (!isFinance) return;
      await notifyUser(db, {
        ...payload,
        userId: uid,
        body: `${payload.body} (${teamName})`,
      });
    })
  );
}

/**
 * Marque une mission payée de façon idempotente + archives + snapshots.
 */
async function completeMissionPayment(db, bucket, logStructured, session) {
  const teamId = session.metadata?.teamId;
  const missionId = session.metadata?.missionId;
  if (!teamId || !missionId) return { skipped: true, reason: 'missing_ids' };

  if (session.payment_status && session.payment_status !== 'paid') {
    logStructured('WARNING', 'mission_payment_session_not_paid', {
      teamId,
      missionId,
      sessionId: session.id,
      payment_status: session.payment_status,
    });
    return { skipped: true, reason: 'not_paid' };
  }

  const missionRef = db.collection('teams').doc(teamId).collection('missions').doc(missionId);
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(missionRef);
    if (!snap.exists) return { skipped: true, reason: 'mission_missing' };
    const mission = { id: snap.id, ...snap.data() };
    const existing = mission.payment || {};

    if (existing.status === 'paid') {
      // Idempotent : même session ou déjà soldé — ne pas recalculer les numéros.
      return {
        skipped: true,
        reason: 'already_paid',
        teamInvoiceNumber: existing.teamInvoiceNumber,
        payment: existing,
        mission,
        vacataireUserId: session.metadata?.vacataireUserId,
      };
    }

    const paidAt = existing.paidAt || new Date().toISOString();
    const teamInvoiceNumber =
      existing.teamInvoiceNumber || buildTeamInvoiceNumber(missionId, paidAt);
    const vacataireInvoiceDraftNumber =
      existing.vacataireInvoiceDraftNumber || buildVacataireDraftNumber(missionId, paidAt);

    const gmvCents = Number(session.metadata?.gmvCents) || existing.gmvCents || 0;
    const commissionCents =
      Number(session.metadata?.commissionCents) || existing.commissionCents || 0;

    const applications = Array.isArray(mission.applications) ? mission.applications : [];
    const accepted = applications.find((a) => String(a.status) === 'Accepté(e)');
    const vacataireUserId =
      session.metadata?.vacataireUserId || accepted?.userId || null;

    const payment = {
      status: 'paid',
      gmvCents,
      commissionCents,
      checkoutSessionId: session.id,
      paymentIntentId,
      connectedAccountId:
        session.metadata?.connectedAccountId || existing.connectedAccountId || null,
      paidAt,
      teamInvoiceNumber,
      vacataireInvoiceDraftNumber,
      vacataireInvoiceStatus: existing.vacataireInvoiceStatus || 'draft',
      vacataireUserId,
    };

    tx.set(missionRef, { payment }, { merge: true });
    return {
      skipped: false,
      payment,
      mission,
      accepted,
      vacataireUserId,
      teamInvoiceNumber,
      vacataireInvoiceDraftNumber,
      gmvCents,
      commissionCents,
    };
  });

  if (result.skipped && result.reason === 'already_paid') {
    return result;
  }
  if (result.skipped) return result;

  // Snapshots + archives hors transaction (lectures users / Storage).
  const teamSnap = await db.collection('teams').doc(teamId).get();
  const teamData = teamSnap.data() || {};
  const invoiceSettings = teamData.invoiceSettings || {};
  const teamBillingSnapshot = {
    name: invoiceSettings.issuerName || teamData.name || 'Équipe',
    address: invoiceSettings.issuerAddress || undefined,
    siret: invoiceSettings.issuerSiret || undefined,
    vatNumber: invoiceSettings.issuerVatNumber || undefined,
    email: undefined,
  };

  let vacataireBusinessSnapshot = null;
  if (result.vacataireUserId) {
    const vacSnap = await db.collection('users').doc(result.vacataireUserId).get();
    const vac = vacSnap.data() || {};
    if (vac.business && typeof vac.business === 'object') {
      vacataireBusinessSnapshot = vac.business;
    }
  }

  const legal = getLogicycleLegalEntity();
  const gmvEur = centsToEur(result.gmvCents);
  const commissionEur = centsToEur(result.commissionCents);
  const netEur = Math.max(0, Math.round((gmvEur - commissionEur) * 100) / 100);

  const teamArchive = {
    kind: 'team_mission_invoice',
    invoiceNumber: result.teamInvoiceNumber,
    issueDate: (result.payment.paidAt || '').slice(0, 10),
    paidAt: result.payment.paidAt,
    currency: 'EUR',
    gmvEur,
    commissionEur,
    netEur,
    teamId,
    missionId,
    missionTitle: result.mission.title,
    client: teamBillingSnapshot,
    issuerName: legal.tradeName,
    issuerSiret: legal.siret || undefined,
    issuerAddress: legal.registeredOffice || undefined,
    provisional: legal.incomplete,
    vatMention: legal.incomplete
      ? 'TVA non applicable art. 293 B CGI — document provisoire (identite editeur incomplete).'
      : 'TVA selon regime LogiCycle (franchise 293 B tant que non assujetti).',
    paymentIntentId,
    checkoutSessionId: session.id,
    archivedAt: new Date().toISOString(),
  };

  const vacataireArchive = {
    kind: 'vacataire_mission_invoice_draft',
    invoiceNumber: result.vacataireInvoiceDraftNumber,
    issueDate: (result.payment.paidAt || '').slice(0, 10),
    paidAt: result.payment.paidAt,
    currency: 'EUR',
    netEur,
    commissionEur,
    teamId,
    missionId,
    missionTitle: result.mission.title,
    issuer: vacataireBusinessSnapshot,
    acceptedName: result.accepted
      ? `${result.accepted.firstName || ''} ${result.accepted.lastName || ''}`.trim()
      : '',
    accepted: result.accepted
      ? {
          userId: result.accepted.userId,
          firstName: result.accepted.firstName,
          lastName: result.accepted.lastName,
          email: result.accepted.email,
        }
      : null,
    paymentIntentId,
    archivedAt: new Date().toISOString(),
  };

  const teamInvoiceArchivePath = `teams/${teamId}/missionInvoices/${result.teamInvoiceNumber}.json`;
  const vacataireInvoiceArchivePath = `teams/${teamId}/missionInvoices/${result.vacataireInvoiceDraftNumber}.json`;
  const teamInvoicePdfPath = `teams/${teamId}/missionInvoices/${result.teamInvoiceNumber}.pdf`;
  const vacataireInvoicePdfPath = `teams/${teamId}/missionInvoices/${result.vacataireInvoiceDraftNumber}.pdf`;

  try {
    await writeInvoiceArchive(bucket, teamInvoiceArchivePath, teamArchive);
    await writeInvoiceArchive(bucket, vacataireInvoiceArchivePath, vacataireArchive);
    await writeBinaryArchive(
      bucket,
      teamInvoicePdfPath,
      buildTeamInvoicePdfBuffer(teamArchive),
      'application/pdf',
    );
    await writeBinaryArchive(
      bucket,
      vacataireInvoicePdfPath,
      buildVacataireInvoicePdfBuffer(vacataireArchive),
      'application/pdf',
    );
  } catch (err) {
    logStructured('ERROR', 'mission_invoice_archive_failed', {
      teamId,
      missionId,
      error: String(err && err.message || err),
    });
  }

  await missionRef.set(
    {
      payment: {
        ...result.payment,
        teamBillingSnapshot,
        vacataireBusinessSnapshot: vacataireBusinessSnapshot || null,
        teamInvoiceArchivePath,
        vacataireInvoiceArchivePath,
        teamInvoicePdfPath,
        vacataireInvoicePdfPath,
      },
    },
    { merge: true }
  );

  await notifyTeamManagers(db, teamId, {
    title: 'Facture mission disponible',
    body: `Paiement reçu — ${result.teamInvoiceNumber} (${gmvEur.toFixed(2)} €).`,
    teamId,
    missionId,
    type: 'MISSION_INVOICE',
  });

  if (result.vacataireUserId) {
    await notifyUser(db, {
      userId: result.vacataireUserId,
      title: 'Mission payée — modèle de facture',
      body: `Votre mission a été réglée. Modèle ${result.vacataireInvoiceDraftNumber} disponible.`,
      teamId,
      missionId,
      type: 'MISSION_INVOICE',
    });
  }

  // Emails optionnels (Resend) — non bloquants.
  try {
    const managerEmails = [];
    const memberships = await db
      .collection('teamMemberships')
      .where('teamId', '==', teamId)
      .where('status', '==', 'Actif')
      .get();
    for (const doc of memberships.docs) {
      const uid = doc.data()?.userId;
      if (!uid) continue;
      const u = (await db.collection('users').doc(uid).get()).data() || {};
      const isFinance =
        u.userRole === 'Manager' ||
        u.permissionRole === 'Administrateur' ||
        u.permissionRole === 'comptable' ||
        u.permissionRole === 'tresorier';
      if (isFinance && u.email) managerEmails.push(u.email);
    }

    const teamPdf = buildTeamInvoicePdfBuffer(teamArchive);
    if (managerEmails.length) {
      const emailResult = await sendTransactionalEmail({
        to: [...new Set(managerEmails)],
        subject: `Facture mission ${result.teamInvoiceNumber}`,
        html: missionInvoiceEmailHtml({
          title: 'Facture marketplace missions',
          intro: 'Votre facture LogiCycle (GMV) est disponible.',
          rows: [
            ['N°', result.teamInvoiceNumber],
            ['Mission', result.mission.title || missionId],
            ['Montant', `${gmvEur.toFixed(2)} €`],
          ],
        }),
        attachments: [
          { filename: `${result.teamInvoiceNumber}.pdf`, content: teamPdf },
        ],
      });
      logStructured('INFO', 'mission_invoice_email_team', emailResult);
    }

    if (result.accepted?.email) {
      const vacPdf = buildVacataireInvoicePdfBuffer(vacataireArchive);
      const emailResult = await sendTransactionalEmail({
        to: result.accepted.email,
        subject: `Modèle facture mission ${result.vacataireInvoiceDraftNumber}`,
        html: missionInvoiceEmailHtml({
          title: 'Modèle de facture vacataire',
          intro: 'Votre mission a été payée. Joignez / finalisez ce modèle (SIRET) puis émettez-le via LogiCycle.',
          rows: [
            ['N° modèle', result.vacataireInvoiceDraftNumber],
            ['Net', `${netEur.toFixed(2)} €`],
            ['Mission', result.mission.title || missionId],
          ],
        }),
        attachments: [
          { filename: `${result.vacataireInvoiceDraftNumber}.pdf`, content: vacPdf },
        ],
      });
      logStructured('INFO', 'mission_invoice_email_vacataire', emailResult);
    }
  } catch (err) {
    logStructured('WARNING', 'mission_invoice_email_failed', {
      error: String(err && err.message || err),
    });
  }

  logStructured('INFO', 'mission_payment_completed', {
    teamId,
    missionId,
    sessionId: session.id,
    teamInvoiceNumber: result.teamInvoiceNumber,
    legalProvisional: legal.incomplete,
  });

  return { skipped: false, teamInvoiceNumber: result.teamInvoiceNumber };
}

async function findMissionByPaymentIntent(db, paymentIntentId) {
  if (!paymentIntentId) return null;
  const snap = await db
    .collectionGroup('missions')
    .where('payment.paymentIntentId', '==', paymentIntentId)
    .limit(5)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const teamId = doc.ref.parent.parent?.id;
  return { ref: doc.ref, teamId, missionId: doc.id, data: doc.data() };
}

async function findMissionByCheckoutSession(db, sessionId) {
  if (!sessionId) return null;
  const snap = await db
    .collectionGroup('missions')
    .where('payment.checkoutSessionId', '==', sessionId)
    .limit(5)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const teamId = doc.ref.parent.parent?.id;
  return { ref: doc.ref, teamId, missionId: doc.id, data: doc.data() };
}

async function markMissionPaymentFailed(db, logStructured, { sessionId, paymentIntentId, reason, status }) {
  let found =
    (await findMissionByCheckoutSession(db, sessionId)) ||
    (await findMissionByPaymentIntent(db, paymentIntentId));
  if (!found) {
    logStructured('WARNING', 'mission_payment_fail_not_found', { sessionId, paymentIntentId, reason });
    return;
  }
  const existing = found.data.payment || {};
  if (existing.status === 'paid' || existing.status === 'refunded') return;

  await found.ref.set(
    {
      payment: {
        ...existing,
        status: status || 'failed',
        failureReason: reason || 'payment_failed',
      },
    },
    { merge: true }
  );
  logStructured('INFO', 'mission_payment_marked_failed', {
    teamId: found.teamId,
    missionId: found.missionId,
    status: status || 'failed',
  });
}

async function markMissionPaymentRefunded(db, bucket, logStructured, paymentIntentId) {
  const found = await findMissionByPaymentIntent(db, paymentIntentId);
  if (!found) {
    logStructured('WARNING', 'mission_refund_not_found', { paymentIntentId });
    return;
  }
  const existing = found.data.payment || {};
  if (existing.status === 'refunded') return;

  const creditNoteNumber =
    existing.creditNoteNumber || buildCreditNoteNumber(existing.teamInvoiceNumber);
  const refundedAt = new Date().toISOString();

  let creditNoteArchivePath;
  let creditNotePdfPath;

  if (existing.teamInvoiceNumber && found.teamId) {
    const path = `teams/${found.teamId}/missionInvoices/${creditNoteNumber}.json`;
    const pdfPath = `teams/${found.teamId}/missionInvoices/${creditNoteNumber}.pdf`;
    const archive = {
      kind: 'team_mission_credit_note',
      creditNoteNumber,
      originalInvoiceNumber: existing.teamInvoiceNumber,
      refundedAt,
      paymentIntentId,
      teamId: found.teamId,
      missionId: found.missionId,
      gmvCents: existing.gmvCents,
      commissionCents: existing.commissionCents,
    };
    try {
      await writeInvoiceArchive(bucket, path, archive);
      await writeBinaryArchive(
        bucket,
        pdfPath,
        buildCreditNotePdfBuffer(archive),
        'application/pdf',
      );
      creditNoteArchivePath = path;
      creditNotePdfPath = pdfPath;
    } catch (err) {
      logStructured('ERROR', 'mission_credit_note_archive_failed', {
        error: String(err && err.message || err),
      });
    }
  }

  await found.ref.set(
    {
      payment: {
        ...existing,
        status: 'refunded',
        refundedAt,
        creditNoteNumber,
        ...(creditNoteArchivePath ? { creditNoteArchivePath } : {}),
        ...(creditNotePdfPath ? { creditNotePdfPath } : {}),
      },
    },
    { merge: true }
  );

  await notifyTeamManagers(db, found.teamId, {
    title: 'Avoir mission',
    body: `Remboursement — ${creditNoteNumber}`,
    teamId: found.teamId,
    missionId: found.missionId,
    type: 'MISSION_INVOICE',
  });

  logStructured('INFO', 'mission_payment_refunded', {
    teamId: found.teamId,
    missionId: found.missionId,
    creditNoteNumber,
  });
}

module.exports = {
  completeMissionPayment,
  markMissionPaymentFailed,
  markMissionPaymentRefunded,
  buildTeamInvoiceNumber,
  buildVacataireDraftNumber,
};

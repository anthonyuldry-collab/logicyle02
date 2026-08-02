/**
 * Facturation marketplace missions (régime indépendant / MoR).
 * Aligné docs/MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md
 */

import { isLegalEntityIncomplete, LEGAL_ENTITY } from '../legal/meta';
import type { Mission, MissionApplication, MissionPayment } from '../types';

export type MissionInvoiceKind = 'team' | 'vacataire_draft';

export interface MissionInvoiceParty {
  name: string;
  address?: string;
  siret?: string;
  vatNumber?: string;
  email?: string;
  note?: string;
}

export interface MissionInvoiceLine {
  description: string;
  amountEur: number;
  /** Commission détaillée (facture équipe uniquement) */
  commissionEur?: number;
  netToVacataireEur?: number;
}

export interface MissionInvoiceDocument {
  kind: MissionInvoiceKind;
  invoiceNumber: string;
  issueDate: string;
  paidAt?: string;
  currency: 'EUR';
  vatRatePercent: number;
  vatMentionFr: string;
  vatMentionEn: string;
  issuer: MissionInvoiceParty;
  client: MissionInvoiceParty;
  line: MissionInvoiceLine;
  paymentRef?: string;
  missionId: string;
  teamId: string;
  /** true = modèle à compléter par le vacataire (SIRET, etc.) */
  isDraftTemplate: boolean;
  legalNoteFr: string;
  legalNoteEn: string;
}

function centsToEur(cents: number | undefined, fallbackEur: number): number {
  if (typeof cents === 'number' && Number.isFinite(cents) && cents >= 0) {
    return Math.round(cents) / 100;
  }
  return Math.round(fallbackEur * 100) / 100;
}

function shortId(id: string, len = 6): string {
  const clean = String(id || '').replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(-len) || 'XXXXXX').toUpperCase();
}

function issueDateFromPayment(payment?: MissionPayment | null): string {
  const raw = payment?.paidAt || new Date().toISOString();
  return raw.slice(0, 10);
}

/** Soft-launch : pas de TVA tant que société / assujettissement non prêts. */
export function resolveMissionInvoiceVatRatePercent(): number {
  return isLegalEntityIncomplete() ? 0 : 0;
}

export function missionInvoiceVatMention(language: 'fr' | 'en' = 'fr'): string {
  if (language === 'en') {
    return 'VAT not applicable (Art. 293 B French Tax Code — small business exemption), pending LogiCycle VAT registration.';
  }
  return 'TVA non applicable, art. 293 B du CGI (franchise en base) — à mettre à jour dès assujettissement LogiCycle.';
}

export function buildTeamMissionInvoiceNumber(missionId: string, paidAt?: string): string {
  const ymd = (paidAt || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  return `LC-M-${ymd}-${shortId(missionId)}`;
}

export function buildVacataireDraftInvoiceNumber(missionId: string, paidAt?: string): string {
  const ymd = (paidAt || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  return `DRAFT-V-${ymd}-${shortId(missionId)}`;
}

export function resolveMissionPaymentAmounts(
  payment: MissionPayment | null | undefined,
  fallbackGmvEur: number,
  fallbackCommissionEur: number,
): { gmvEur: number; commissionEur: number; netEur: number } {
  const gmvEur = centsToEur(payment?.gmvCents, fallbackGmvEur);
  const commissionEur = centsToEur(payment?.commissionCents, fallbackCommissionEur);
  const netEur = Math.max(0, Math.round((gmvEur - commissionEur) * 100) / 100);
  return { gmvEur, commissionEur, netEur };
}

function logicycleIssuer(): MissionInvoiceParty {
  return {
    name: LEGAL_ENTITY.tradeName,
    address: LEGAL_ENTITY.registeredOffice,
    siret: LEGAL_ENTITY.siret,
    vatNumber: LEGAL_ENTITY.vatNumber.includes('À COMPLÉTER')
      ? undefined
      : LEGAL_ENTITY.vatNumber,
    email: LEGAL_ENTITY.contactEmail,
    note: LEGAL_ENTITY.legalFormPlaceholder.fr,
  };
}

export function buildTeamMissionInvoice(input: {
  mission: Mission;
  payment: MissionPayment;
  teamName: string;
  teamAddress?: string;
  teamEmail?: string;
  teamBilling?: {
    name?: string;
    address?: string;
    siret?: string;
    vatNumber?: string;
    email?: string;
  };
  accepted?: MissionApplication | null;
  gmvEur: number;
  commissionEur: number;
  language?: 'fr' | 'en';
  forceDraft?: boolean;
}): MissionInvoiceDocument {
  const language = input.language || 'fr';
  const { gmvEur, commissionEur, netEur } = resolveMissionPaymentAmounts(
    input.payment,
    input.gmvEur,
    input.commissionEur,
  );
  const issueDate = issueDateFromPayment(input.payment);
  const invoiceNumber =
    input.payment.teamInvoiceNumber ||
    buildTeamMissionInvoiceNumber(input.mission.id, input.payment.paidAt);
  const vacataireName = input.accepted
    ? `${input.accepted.firstName || ''} ${input.accepted.lastName || ''}`.trim()
    : 'Vacataire';

  const description =
    language === 'en'
      ? `Mission marketplace — ${input.mission.title} (${input.mission.startDate} → ${input.mission.endDate}) · Freelancer: ${vacataireName} · Platform fee ${commissionEur.toFixed(2)} EUR · Net to freelancer ${netEur.toFixed(2)} EUR`
      : `Mission marketplace — ${input.mission.title} (${input.mission.startDate} → ${input.mission.endDate}) · Vacataire : ${vacataireName} · Commission plateforme ${commissionEur.toFixed(2)} € · Net vacataire ${netEur.toFixed(2)} €`;

  return {
    kind: 'team',
    invoiceNumber,
    issueDate,
    paidAt: input.payment.paidAt,
    currency: 'EUR',
    vatRatePercent: resolveMissionInvoiceVatRatePercent(),
    vatMentionFr: missionInvoiceVatMention('fr'),
    vatMentionEn: missionInvoiceVatMention('en'),
    issuer: logicycleIssuer(),
    client: {
      name: input.teamBilling?.name || input.teamName,
      address: input.teamBilling?.address || input.teamAddress,
      siret: input.teamBilling?.siret,
      vatNumber: input.teamBilling?.vatNumber,
      email: input.teamBilling?.email || input.teamEmail,
    },
    line: {
      description,
      amountEur: gmvEur,
      commissionEur,
      netToVacataireEur: netEur,
    },
    paymentRef: input.payment.paymentIntentId || input.payment.checkoutSessionId,
    missionId: input.mission.id,
    teamId: input.mission.teamId,
    /** Soft-launch : watermark tant que K-bis incomplet ou avoir / remboursement. */
    isDraftTemplate:
      isLegalEntityIncomplete() ||
      input.payment.status === 'refunded' ||
      Boolean(input.forceDraft),
    legalNoteFr:
      input.payment.status === 'refunded'
        ? `AVOIR / REMBOURSEMENT — Réf. ${input.payment.creditNoteNumber || '—'}. Facture initiale ${invoiceNumber} annulée pour le montant remboursé.`
        : isLegalEntityIncomplete()
          ? 'DOCUMENT PROVISOIRE — Identité éditeur LogiCycle en cours de constitution (SIRET / siège à compléter post K-bis). Ne pas utiliser comme facture définitive en production.'
          : 'Facture émise par LogiCycle en qualité d’intermédiaire de paiement (merchant of record). Paiement reçu via Stripe. Conservez ce document pour votre comptabilité.',
    legalNoteEn:
      input.payment.status === 'refunded'
        ? `CREDIT NOTE — Ref. ${input.payment.creditNoteNumber || '—'}.`
        : isLegalEntityIncomplete()
          ? 'PROVISIONAL — LogiCycle legal identity incomplete (post company registration). Not a final commercial invoice.'
          : 'Invoice issued by LogiCycle as payment intermediary (merchant of record). Payment received via Stripe. Keep this document for your accounts.',
  };
}

export function buildVacataireDraftMissionInvoice(input: {
  mission: Mission;
  payment: MissionPayment;
  teamName: string;
  accepted: MissionApplication;
  gmvEur: number;
  commissionEur: number;
  language?: 'fr' | 'en';
  /** Profil entreprise du vacataire (SIRET, adresse…) */
  business?: import('../types').IndependentBusinessProfile | null;
}): MissionInvoiceDocument {
  const language = input.language || 'fr';
  const { commissionEur, netEur } = resolveMissionPaymentAmounts(
    input.payment,
    input.gmvEur,
    input.commissionEur,
  );
  const issueDate = issueDateFromPayment(input.payment);
  const vacataireName =
    `${input.accepted.firstName || ''} ${input.accepted.lastName || ''}`.trim() || 'Vacataire';
  const biz = input.business || input.payment.vacataireBusinessSnapshot;
  const issuerName = biz?.legalName?.trim() || biz?.tradeName?.trim() || vacataireName;
  const addressParts = [biz?.addressLine, [biz?.postalCode, biz?.city].filter(Boolean).join(' '), biz?.country]
    .filter(Boolean)
    .join(', ');
  const hasBusinessIds = Boolean(biz?.siret?.trim());
  const isIssued =
    input.payment.vacataireInvoiceStatus === 'issued' &&
    Boolean(input.payment.vacataireInvoiceNumber);
  const invoiceNumber = isIssued
    ? input.payment.vacataireInvoiceNumber!
    : input.payment.vacataireInvoiceDraftNumber ||
      buildVacataireDraftInvoiceNumber(input.mission.id, input.payment.paidAt);

  const description =
    language === 'en'
      ? `Independent services — mission “${input.mission.title}” for team ${input.teamName} (${input.mission.startDate} → ${input.mission.endDate}) via LogiCycle · Platform fee withheld ${commissionEur.toFixed(2)} EUR`
      : `Prestation indépendante — mission « ${input.mission.title} » pour l’équipe ${input.teamName} (${input.mission.startDate} → ${input.mission.endDate}) via LogiCycle · Commission retenue ${commissionEur.toFixed(2)} €`;

  const vatMentionFr =
    biz?.vatRegime === 'franchise_293b'
      ? 'TVA non applicable, art. 293 B du CGI (franchise en base).'
      : biz?.vatRegime === 'tva_reelle'
        ? 'TVA selon votre régime réel — complétez le taux sur la facture définitive.'
        : 'Mentions TVA à compléter selon VOTRE régime (franchise 293 B, TVA sur les débits, etc.).';

  return {
    kind: 'vacataire_draft',
    invoiceNumber,
    issueDate,
    paidAt: input.payment.paidAt,
    currency: 'EUR',
    vatRatePercent: 0,
    vatMentionFr,
    vatMentionEn:
      biz?.vatRegime === 'franchise_293b'
        ? 'VAT not applicable (Art. 293 B FTC).'
        : 'Complete VAT wording according to YOUR regime.',
    issuer: {
      name: issuerName,
      email: input.accepted.email,
      siret: biz?.siret?.trim() || '[SIRET À COMPLÉTER]',
      vatNumber: biz?.vatNumber?.trim() || undefined,
      address: addressParts || '[Adresse professionnelle À COMPLÉTER]',
      note: hasBusinessIds
        ? isIssued
          ? 'Facture émise via LogiCycle — conservez pour URSSAF / comptabilité.'
          : 'Facture préremplie depuis votre dossier entreprise LogiCycle — vérifiez avant envoi.'
        : 'Modèle prérempli — finalisez SIRET / adresse dans Espace indépendant → Ma société.',
    },
    client: logicycleIssuer(),
    line: {
      description,
      amountEur: netEur,
      commissionEur,
      netToVacataireEur: netEur,
    },
    paymentRef: input.payment.paymentIntentId || input.payment.checkoutSessionId,
    missionId: input.mission.id,
    teamId: input.mission.teamId,
    isDraftTemplate: !isIssued && !hasBusinessIds,
    legalNoteFr: isIssued
      ? 'Facture définitive émise à LogiCycle. Ce n’est pas un bulletin de paie.'
      : hasBusinessIds
        ? 'Document généré pour votre comptabilité / URSSAF. Conservez-le et émettez-le à LogiCycle. Ce n’est pas un bulletin de paie.'
        : 'MODÈLE DE FACTURE — Complétez votre dossier « Ma société » (SIRET, adresse) pour préremplir automatiquement. Finalisez puis émettez à LogiCycle. Ce n’est pas un bulletin de paie.',
    legalNoteEn: isIssued
      ? 'Final invoice issued to LogiCycle. Not a payslip.'
      : hasBusinessIds
        ? 'Generated for your accounts / social filings. Issue to LogiCycle. Not a payslip.'
        : 'DRAFT TEMPLATE — Complete your business profile (SIRET, address) to auto-fill. Not a payslip.',
  };
}

/**
 * Marketplace missions vacataires — mode produit & règles économiques.
 * Aligné business-plan/marketplace-missions-commissions.md
 *
 * Soft-launch : matching only (VITE_MISSION_PAYMENTS non défini).
 * Stripe Connect TEST : VITE_MISSION_PAYMENTS=true (+ MISSION_PAYMENTS_ENABLED côté Functions).
 */

/** Mode runtime de la marketplace missions. */
export const MISSION_MARKETPLACE_MODE = {
  /**
   * Soft-launch public = false.
   * Activer le paiement in-app TEST via `VITE_MISSION_PAYMENTS=true`.
   */
  paymentsEnabled: false,
} as const;

/** Commission Rovik sur le montant vacataire (HT) — applicable quand paymentsEnabled. */
export const MISSION_COMMISSION = {
  /** Taux standard Compétition / Élite / Continental */
  standardTakeRatePercent: 12,
  /** Réduction Pro / Performance (volume missions) */
  proTakeRatePercent: 10,
  /** Minimum facturé par mission (€) */
  minFeeEur: 15,
  /** Plafond commission par mission (€) — missions longues */
  maxFeeEur: 450,
} as const;

/** Hypothèses marché (projections financières) */
export const MISSION_MARKET_ASSUMPTIONS = {
  avgDailyRateEur: 150,
  avgMissionDays: 5.5,
  /** GMV moyen = 150 × 5,5 ≈ 825 € */
  avgGmvPerMissionEur: 825,
  /** Missions vacataires payantes / an / équipe Continental+ à maturité */
  missionsPerEligibleTeamYear: 6,
  /** Part des missions réglées via Rovik (vs direct) */
  platformSharePercent: 75,
  /** Stripe Connect ~2,9 % + 0,25 € / transaction (charge COGS marketplace) */
  paymentProcessingPercent: 3.2,
} as const;

export const MISSION_COMMISSION_LABELS = {
  matchingOnlyBanner: {
    fr: 'Soft-launch : mise en relation uniquement. Le paiement in-app Stripe Connect est prêt mais pas activé ici — le règlement se fait encore hors plateforme (Vacataire / montant fixe).',
    en: 'Soft-launch: matching only. In-app Stripe Connect payouts are built but not enabled here — settlement remains off-platform (freelancer / fixed amount).',
  },
  paymentsEnabledBanner: {
    fr: 'Paiement in-app actif (Stripe Connect) : l’équipe paie via Rovik ; commission {rate} % (min. {min} €). CDD / CDI / stage restent hors Connect.',
    en: 'In-app payment on (Stripe Connect): the team pays via Rovik; {rate}% fee (min. €{min}). Employment contracts stay outside Connect.',
  },
  feeExplanation: {
    fr: 'Commission Rovik : {rate} % sur le montant vacataire (min. {min} €). Paiement sécurisé via Stripe Connect.',
    en: 'Rovik fee: {rate}% on freelancer amount (min. €{min}). Secure payment via Stripe Connect.',
  },
  proDiscount: {
    fr: 'Plan Performance : commission réduite à {rate} %',
    en: 'Performance plan: reduced fee at {rate}%',
  },
  connectOnboardingCta: {
    fr: 'Activer les paiements missions (Stripe)',
    en: 'Enable mission payouts (Stripe)',
  },
  connectOnboardingDesc: {
    fr: 'Créez votre compte destinataire Stripe Express pour recevoir le règlement des missions en prestation indépendante. Vous resterez responsable de votre facture vers Rovik (net) et de vos déclarations URSSAF.',
    en: 'Create your Stripe Express recipient account to receive payouts for independent-contractor missions. You remain responsible for invoicing Rovik (net) and your social/tax filings.',
  },
  connectReady: {
    fr: 'Paiements missions activés — vous pouvez recevoir des règlements via Rovik (régime indépendant).',
    en: 'Mission payouts enabled — you can receive payments via Rovik (independent-contractor regime).',
  },
  payMissionCta: {
    fr: 'Payer la mission',
    en: 'Pay mission',
  },
  paymentPaid: {
    fr: 'Mission payée via Stripe',
    en: 'Mission paid via Stripe',
  },
  paymentPending: {
    fr: 'Paiement en cours…',
    en: 'Payment pending…',
  },
  employmentExcluded: {
    fr: 'Paiement Connect réservé aux missions « Vacataire (Facture) » ou « Montant fixe ». Pour un CDD / CDI / stage, l’équipe reste employeur : contrat + paie hors flux Connect.',
    en: 'Connect payment is limited to “Freelancer invoice” or “Fixed amount” missions. For employment contracts, the team remains the employer: contract + payroll outside Connect.',
  },
  invoiceChainHint: {
    fr: 'Après paiement : téléchargez la facture équipe (GMV) et le modèle vacataire (net).',
    en: 'After payment: download the team invoice (GMV) and the freelancer draft (net).',
  },
  downloadTeamInvoice: {
    fr: 'Télécharger facture équipe (PDF)',
    en: 'Download team invoice (PDF)',
  },
  downloadVacataireDraft: {
    fr: 'Télécharger modèle facture vacataire (PDF)',
    en: 'Download freelancer invoice draft (PDF)',
  },
} as const;

/** Zones expansion (business-plan/expansion-internationale.md) */
export const EXPANSION_REGIONS = {
  phase1: { id: 'fr', label: { fr: 'France', en: 'France' }, startYear: 1 },
  phase2: {
    id: 'eu_core',
    label: { fr: 'Europe cœur (BE, NL, CH, ES, IT)', en: 'EU core (BE, NL, CH, ES, IT)' },
    startYear: 2,
  },
  phase3: {
    id: 'eu_full',
    label: { fr: 'Europe élargie (DE, PT, PL, UK…)', en: 'Extended Europe (DE, PT, PL, UK…)' },
    startYear: 4,
  },
  phase4: {
    id: 'world',
    label: { fr: 'Monde (US, AU, CA, Amérique latine)', en: 'World (US, AU, CA, Latin America)' },
    startYear: 6,
  },
} as const;

/** Soft-launch = false ; TEST Connect = `VITE_MISSION_PAYMENTS=true`. */
export function isMissionMarketplacePaymentsEnabled(): boolean {
  try {
    return import.meta.env?.VITE_MISSION_PAYMENTS === 'true';
  } catch {
    return Boolean(MISSION_MARKETPLACE_MODE.paymentsEnabled);
  }
}

/**
 * Paiement Connect = régime prestation indépendante uniquement.
 * CDD / CDI / stage / apprentissage / bénévolat → matching only (employeur = équipe).
 */
export function isMissionConnectPaymentEligible(
  compensationType: string | undefined | null,
): boolean {
  const t = String(compensationType || '');
  return (
    t === 'Vacataire (Facture)' ||
    t === 'Montant Fixe' ||
    t === 'FREELANCE' ||
    t === 'FIXED_AMOUNT'
  );
}

export function isProMissionCommissionPlan(planId?: string | null): boolean {
  const id = String(planId || '').toLowerCase();
  return id === 'pro' || id === 'performance';
}

export function missionDayCount(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

/**
 * Estime le GMV vacataire (€) : dailyRate × jours, sinon montant numérique dans compensation.
 */
export function estimateMissionGmvEur(mission: {
  startDate: string;
  endDate: string;
  dailyRate?: number;
  compensation?: string;
}): number {
  const days = missionDayCount(mission.startDate, mission.endDate);
  if (typeof mission.dailyRate === 'number' && mission.dailyRate > 0) {
    return Math.round(mission.dailyRate * days * 100) / 100;
  }
  const raw = String(mission.compensation || '');
  const match = raw.replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  if (match) {
    const n = Number(match[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0) {
      // Si le texte contient « /jour » ou « /j », multiplier par les jours
      if (/\/\s*j/i.test(raw) || /jour/i.test(raw)) {
        return Math.round(n * days * 100) / 100;
      }
      return Math.round(n * 100) / 100;
    }
  }
  return 0;
}

export function computeMissionCommissionEur(
  gmvEur: number,
  options?: { isProTeam?: boolean },
): number {
  if (!(gmvEur > 0)) return 0;
  const rate = options?.isProTeam
    ? MISSION_COMMISSION.proTakeRatePercent
    : MISSION_COMMISSION.standardTakeRatePercent;
  const raw = gmvEur * (rate / 100);
  return Math.min(
    MISSION_COMMISSION.maxFeeEur,
    Math.max(MISSION_COMMISSION.minFeeEur, Math.round(raw * 100) / 100),
  );
}

export function eurToCents(amountEur: number): number {
  return Math.round(amountEur * 100);
}

export function formatMissionMarketplaceBanner(
  language: 'fr' | 'en',
  options?: { isProTeam?: boolean },
): string {
  if (!isMissionMarketplacePaymentsEnabled()) {
    return MISSION_COMMISSION_LABELS.matchingOnlyBanner[language];
  }
  const rate = options?.isProTeam
    ? MISSION_COMMISSION.proTakeRatePercent
    : MISSION_COMMISSION.standardTakeRatePercent;
  return MISSION_COMMISSION_LABELS.paymentsEnabledBanner[language]
    .replace('{rate}', String(rate))
    .replace('{min}', String(MISSION_COMMISSION.minFeeEur));
}

export function estimateNetCommissionAfterStripe(grossCommissionEur: number, gmvEur: number): number {
  const stripeCost = gmvEur * (MISSION_MARKET_ASSUMPTIONS.paymentProcessingPercent / 100);
  return Math.max(0, grossCommissionEur - stripeCost * 0.4);
}

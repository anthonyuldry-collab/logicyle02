/**
 * Marketplace missions vacataires — commissions & règles économiques.
 * Aligné business-plan/marketplace-missions-commissions.md
 */

/** Commission LogiCycle sur le montant vacataire (HT, avant Stripe Connect) */
export const MISSION_COMMISSION = {
  /** Taux standard Continental / Compétition */
  standardTakeRatePercent: 12,
  /** Réduction Pro (volume missions) */
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
  /** Part des missions réglées via LogiCycle (vs direct) */
  platformSharePercent: 75,
  /** Stripe Connect ~2,9 % + 0,25 € / transaction (charge COGS marketplace) */
  paymentProcessingPercent: 3.2,
} as const;

export const MISSION_COMMISSION_LABELS = {
  feeExplanation: {
    fr: 'Commission LogiCycle : {rate} % sur le montant vacataire (min. {min} €). Paiement sécurisé via Stripe.',
    en: 'LogiCycle fee: {rate}% on freelancer amount (min. €{min}). Secure payment via Stripe.',
  },
  proDiscount: {
    fr: 'Plan Pro : commission réduite à {rate} %',
    en: 'Pro plan: reduced fee at {rate}%',
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

export function computeMissionCommissionEur(
  gmvEur: number,
  options?: { isProTeam?: boolean },
): number {
  const rate = options?.isProTeam
    ? MISSION_COMMISSION.proTakeRatePercent
    : MISSION_COMMISSION.standardTakeRatePercent;
  const raw = gmvEur * (rate / 100);
  return Math.min(
    MISSION_COMMISSION.maxFeeEur,
    Math.max(MISSION_COMMISSION.minFeeEur, Math.round(raw * 100) / 100),
  );
}

export function estimateNetCommissionAfterStripe(grossCommissionEur: number, gmvEur: number): number {
  const stripeCost = gmvEur * (MISSION_MARKET_ASSUMPTIONS.paymentProcessingPercent / 100);
  return Math.max(0, grossCommissionEur - stripeCost * 0.4);
}

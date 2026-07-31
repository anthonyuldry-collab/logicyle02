/**
 * Marketplace missions vacataires — mode produit & règles économiques.
 * Aligné business-plan/marketplace-missions-commissions.md
 *
 * Aujourd’hui : matching only (publier / postuler / accepter).
 * Stripe Connect + commission in-app : activés quand paymentsEnabled = true.
 */

/** Mode runtime de la marketplace missions. */
export const MISSION_MARKETPLACE_MODE = {
  /** false = mise en relation uniquement ; paiement hors plateforme */
  paymentsEnabled: false,
} as const;

/** Commission LogiCycle sur le montant vacataire (HT) — applicable quand paymentsEnabled. */
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
  matchingOnlyBanner: {
    fr: 'Mise en relation uniquement : publiez, postulez et acceptez des missions. Le règlement se fait hors plateforme pour le moment (pas de paiement in-app).',
    en: 'Matching only: post, apply and accept missions. Payment is handled off-platform for now (no in-app payouts yet).',
  },
  feeExplanation: {
    fr: 'Commission LogiCycle : {rate} % sur le montant vacataire (min. {min} €). Paiement sécurisé via Stripe — disponible lorsque le paiement in-app sera activé.',
    en: 'LogiCycle fee: {rate}% on freelancer amount (min. €{min}). Secure Stripe payment — available when in-app payments are enabled.',
  },
  proDiscount: {
    fr: 'Plan Pro : commission réduite à {rate} % (lorsque le paiement in-app sera activé)',
    en: 'Pro plan: reduced fee at {rate}% (when in-app payments are enabled)',
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

export function isMissionMarketplacePaymentsEnabled(): boolean {
  return Boolean(MISSION_MARKETPLACE_MODE.paymentsEnabled);
}

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

/**
 * Marketplace sponsoring — commissions sur les mises en relation équipe ↔ partenaire.
 * Aligné sur le modèle missions vacataires (take rate LogiCycle).
 */

export const PARTNERSHIP_MARKETPLACE = {
  /** Commission standard sur le montant du partenariat facilité (HT) */
  standardTakeRatePercent: 8,
  /** Réduction équipes Pro */
  proTakeRatePercent: 6,
  /** Minimum facturé par mise en relation contractualisée (€) */
  minFeeEur: 500,
  /** Plafond commission (€) */
  maxFeeEur: 25000,
} as const;

export const PARTNERSHIP_MARKETPLACE_LABELS = {
  feeExplanation: {
    fr: 'Commission LogiCycle : {rate} % sur le montant du partenariat facilité via la plateforme (min. {min} €).',
    en: 'LogiCycle fee: {rate}% on partnership amount facilitated via the platform (min. €{min}).',
  },
  proDiscount: {
    fr: 'Plan Pro équipe : commission réduite à {rate} %',
    en: 'Team Pro plan: reduced fee at {rate}%',
  },
  howItWorks: {
    fr: 'Les partenaires et les clubs se connectent via LogiCycle. En cas de signature, une commission de mise en relation s\'applique.',
    en: 'Partners and clubs connect via LogiCycle. Upon signing, a matchmaking fee applies.',
  },
} as const;

export function computePartnershipCommissionEur(
  partnershipAmountEur: number,
  options?: { isProTeam?: boolean },
): number {
  const rate = options?.isProTeam
    ? PARTNERSHIP_MARKETPLACE.proTakeRatePercent
    : PARTNERSHIP_MARKETPLACE.standardTakeRatePercent;
  const raw = partnershipAmountEur * (rate / 100);
  return Math.min(
    PARTNERSHIP_MARKETPLACE.maxFeeEur,
    Math.max(PARTNERSHIP_MARKETPLACE.minFeeEur, Math.round(raw * 100) / 100),
  );
}

export function formatPartnershipFeeLabel(
  language: 'fr' | 'en',
  options?: { isProTeam?: boolean },
): string {
  const rate = options?.isProTeam
    ? PARTNERSHIP_MARKETPLACE.proTakeRatePercent
    : PARTNERSHIP_MARKETPLACE.standardTakeRatePercent;
  const template = PARTNERSHIP_MARKETPLACE_LABELS.feeExplanation[language];
  return template
    .replace('{rate}', String(rate))
    .replace('{min}', String(PARTNERSHIP_MARKETPLACE.minFeeEur));
}

/** Programme de parrainage — visibilité à faible coût (mini remises). */
export const REFERRAL_PROGRAM = {
  /** Réduction filleul sur la 1ère facturation annuelle */
  refereeDiscountPercent: 10,
  /** Crédit parrain : équivalent 1 mois du plan filleul (appliqué au renouvellement) */
  referrerCreditMonthsPerReferral: 1,
  maxReferralsCountedPerYear: 5,
  maxStackedReferrerCredits: 3,
  codePrefix: 'LC',
  minPlanForReferralReward: 'club' as const,
} as const;

export const REFERRAL_LABELS = {
  refereeDiscount: {
    fr: '-10 % sur votre 1ère année',
    en: '-10% off your first year',
  },
  referrerReward: {
    fr: '1 mois offert sur votre renouvellement par équipe parrainée',
    en: '1 free month on renewal per referred team',
  },
  programTitle: {
    fr: 'Parrainez une équipe, gagnez en visibilité',
    en: 'Refer a team, grow the network',
  },
  programSubtitle: {
    fr: 'Votre filleul économise 10 %, vous recevez 1 mois offert (max 3/an). Équipes et indépendants éligibles.',
    en: 'Your referral saves 10%; you get 1 free month (max 3/yr). Teams and independents eligible.',
  },
};

export function formatReferralCode(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.startsWith('LC')) return cleaned.slice(0, 8);
  return `${REFERRAL_PROGRAM.codePrefix}-${cleaned.slice(0, 6)}`;
}

export function applyRefereeDiscount(amountEur: number): number {
  return Math.round(amountEur * (1 - REFERRAL_PROGRAM.refereeDiscountPercent / 100));
}

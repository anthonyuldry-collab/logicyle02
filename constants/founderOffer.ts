/**
 * Offre fondateurs + garantie première course.
 * FOUNDER_COHORT_CLAIMED : incrémenter à la main après chaque annuel fondateur signé.
 *
 * Politique raffinée : −20 % sur l’annuel année 1 seulement (pas de lock 24 mois).
 * An 2 = grille publique. Suivi manuel Stripe coupon / CRM.
 */
export const FOUNDER_COHORT_SIZE = 20;
export const FOUNDER_COHORT_CLAIMED = 0;
/** Remise fondateur sur l’annuel — année 1 uniquement. */
export const FOUNDER_YEAR1_DISCOUNT_PERCENT = 20;
/** Souscription annuelle avant cette date pour entrer dans la cohorte. */
export const FOUNDER_DEADLINE_ISO = '2027-06-01';

export const FIRST_RACE_GUARANTEE_CLAIM_DAYS = 14;

export function getFounderSeatsRemaining(): number {
  return Math.max(0, FOUNDER_COHORT_SIZE - FOUNDER_COHORT_CLAIMED);
}

export function isFounderCohortOpen(): boolean {
  return getFounderSeatsRemaining() > 0 && Date.now() < Date.parse(FOUNDER_DEADLINE_ISO);
}

/** Prix annuel fondateur (année 1) à partir du prix public annuel. */
export function getFounderYear1AnnualPrice(annualPriceEur: number | null): number | null {
  if (annualPriceEur == null || annualPriceEur <= 0) return null;
  return Math.round(annualPriceEur * (1 - FOUNDER_YEAR1_DISCOUNT_PERCENT / 100));
}

export const FOUNDER_DEMO_MAIL_SUBJECT = {
  fr: 'Rovik — faire tourner notre prochaine course (90 min)',
  en: 'Rovik — run our next race with you (90 min)',
} as const;

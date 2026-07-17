import { AppSection, SubscriptionPlanId, TeamLevel, UserRole } from '../types';
import { REFERRAL_PROGRAM } from './referralProgram';

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: { fr: string; en: string };
  tagline: { fr: string; en: string };
  monthlyPriceEur: number | null;
  annualPriceEur: number | null;
  maxUsers: number;
  maxEventsPerSeason: number | null;
  features: { fr: string; en: string }[];
  highlighted?: boolean;
  contactSales?: boolean;
}

/** Ordre croissant pour le gating */
export const PLAN_RANK: Record<SubscriptionPlanId, number> = {
  [SubscriptionPlanId.CLUB]: 0,
  [SubscriptionPlanId.COMPETITION]: 1,
  [SubscriptionPlanId.CONTINENTAL]: 2,
  [SubscriptionPlanId.PRO]: 3,
  [SubscriptionPlanId.FEDERATION]: 4,
  [SubscriptionPlanId.INDEPENDENT_RIDER]: -1,
  [SubscriptionPlanId.INDEPENDENT_STAFF]: -1,
};

/** 2 mois offerts sur l'annuel (= 10 mois facturés) */
export const ANNUAL_MONTHS_PAID = 10;

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    id: SubscriptionPlanId.CLUB,
    name: { fr: 'Club', en: 'Club' },
    tagline: {
      fr: 'Clubs, comités & structures jeunes',
      en: 'Clubs, committees & youth structures',
    },
    monthlyPriceEur: 49,
    annualPriceEur: 490,
    maxUsers: 25,
    maxEventsPerSeason: 30,
    features: [
      { fr: 'Effectif, calendrier & invitations', en: 'Roster, calendar & invites' },
      { fr: 'Logistique course (6 modules)', en: 'Race logistics (6 modules)' },
      { fr: 'App mobile coureurs & staff', en: 'Mobile app for riders & staff' },
      { fr: 'RGPD natif · essai 14 jours', en: 'Native GDPR · 14-day trial' },
    ],
  },
  {
    id: SubscriptionPlanId.COMPETITION,
    name: { fr: 'Compétition', en: 'Competition' },
    tagline: {
      fr: 'Équipes fédérales & élite nationale',
      en: 'National federation & elite teams',
    },
    monthlyPriceEur: 99,
    annualPriceEur: 990,
    maxUsers: 45,
    maxEventsPerSeason: 80,
    features: [
      { fr: 'Logistique course complète (12 onglets)', en: 'Full race logistics (12 tabs)' },
      { fr: 'Performance, nutrition & bike fit', en: 'Performance, nutrition & bike fit' },
      { fr: 'Suivi stage : wellness, chaleur, tests', en: 'Camp monitoring: wellness, heat, tests' },
      { fr: 'Budgets, justificatifs OCR & SEPA', en: 'Budgets, OCR receipts & SEPA' },
      { fr: 'Bulletins UCI J-20 / J-3 (équipes N1+)', en: 'UCI entry forms J-20 / J-3 (N1+ teams)' },
    ],
  },
  {
    id: SubscriptionPlanId.CONTINENTAL,
    name: { fr: 'Élite', en: 'Elite' },
    tagline: {
      fr: 'Circuits internationaux & structures ambitieuses',
      en: 'International circuits & ambitious structures',
    },
    monthlyPriceEur: 179,
    annualPriceEur: 1790,
    maxUsers: 70,
    maxEventsPerSeason: null,
    highlighted: true,
    features: [
      { fr: 'Tout Compétition +', en: 'Everything in Competition +' },
      { fr: 'Réseau talents & profils indépendants', en: 'Talent network & independent profiles' },
      { fr: 'Marketplace missions staff', en: 'Staff mission marketplace' },
      { fr: 'Camps altitude & chaleur avancés', en: 'Advanced altitude & heat camps' },
      { fr: 'Export compta & peer review', en: 'Accounting export & peer review' },
      { fr: 'Pilote 90 jours inclus', en: '90-day pilot included' },
    ],
  },
  {
    id: SubscriptionPlanId.PRO,
    name: { fr: 'Performance', en: 'Performance' },
    tagline: {
      fr: 'Structures professionnelles à haute exigence',
      en: 'High-demand professional structures',
    },
    monthlyPriceEur: 329,
    annualPriceEur: 3290,
    maxUsers: 120,
    maxEventsPerSeason: null,
    features: [
      { fr: 'Tout Élite +', en: 'Everything in Elite +' },
      { fr: 'Templates UCI & masse salariale', en: 'UCI templates & payroll mass' },
      { fr: 'Assistant nutrition IA', en: 'AI nutrition assistant' },
      { fr: 'Dashboard admin & support prioritaire', en: 'Admin dashboard & priority support' },
      { fr: 'Commission marketplace réduite (10 %)', en: 'Reduced marketplace fee (10%)' },
    ],
  },
  {
    id: SubscriptionPlanId.FEDERATION,
    name: { fr: 'Fédération', en: 'Federation' },
    tagline: {
      fr: 'Ligues, comités & réseaux multi-clubs',
      en: 'Leagues, committees & multi-club networks',
    },
    monthlyPriceEur: null,
    annualPriceEur: null,
    maxUsers: 9999,
    maxEventsPerSeason: null,
    contactSales: true,
    features: [
      { fr: 'Vue agrégée multi-structures', en: 'Multi-structure aggregated view' },
      { fr: 'Stats réseau anonymisées', en: 'Anonymized network stats' },
      { fr: 'SLA, SSO & API dédiées', en: 'Dedicated SLA, SSO & API' },
      { fr: 'Centres altitude & white-label', en: 'Altitude centres & white-label' },
      { fr: 'Sur devis — dès 449 €/mois', en: 'Custom quote — from €449/mo' },
    ],
  },
];

/**
 * Offre commerciale centres d’altitude / hébergeurs stage
 * (hors enum Stripe pour l’instant — devis Fédération / Enterprise)
 */
export const ALTITUDE_CENTRE_OFFER = {
  name: { fr: 'Centre altitude', en: 'Altitude centre' },
  tagline: {
    fr: 'CNEA, stations, hôtels stage — suivi multi-athlètes invités',
    en: 'National centres, resorts, camp hotels — multi-guest athlete monitoring',
  },
  monthlyFromEur: 449,
  seasonalPackEur: { min: 2990, max: 4990 },
  maxGuestAthletesPerCamp: 80,
  examples: ['CNEA Font-Romeu', 'Sierra Nevada', 'Livigno', 'St-Moritz', 'Teide'],
  features: [
    { fr: 'Créer des stages altitude (SpO₂, USG, wellness)', en: 'Create altitude camps (SpO₂, USG, wellness)' },
    { fr: 'Inviter athlètes indépendants ou équipes clientes', en: 'Invite independent athletes or client teams' },
    { fr: 'Dashboard coach centre · alertes saturation', en: 'Centre coach dashboard · SpO₂ alerts' },
    { fr: 'Export PDF fin de stage pour fédérations', en: 'End-of-camp PDF export for federations' },
    { fr: 'White-label optionnel (logo centre)', en: 'Optional white-label (centre logo)' },
  ],
} as const;

/**
 * Vision long terme — entraîneur indépendant (suivi athlètes perso + stages)
 * Stripe / enum : à brancher M6–M18 · voir business-plan/vision-independants-coach-athlete.md
 */
export const INDEPENDENT_COACH_OFFER = {
  name: { fr: 'Indépendant Entraîneur', en: 'Independent Coach' },
  tagline: {
    fr: 'Suivre tes athlètes perso en stage et en perf — sans ERP d’équipe',
    en: 'Follow your personal athletes in camp & performance — no team ERP',
  },
  monthlyPriceEur: 29,
  annualPriceEur: 290,
  includedAthletes: 15,
  extraAthletePack: { count: 10, monthlyPriceEur: 9 },
  proTier: {
    name: { fr: 'Coach Pro', en: 'Coach Pro' },
    monthlyPriceEur: 79,
    annualPriceEur: 790,
    includedAthletes: 40,
  },
  features: [
    { fr: 'Roster athlètes liés (consentement scopes)', en: 'Linked athlete roster (consent scopes)' },
    { fr: 'Suivi stages : wellness, SpO₂, charge, commentaires', en: 'Camp follow-up: wellness, SpO₂, load, comments' },
    { fr: 'Perf light : historique, RPE, alertes', en: 'Light performance: history, RPE, alerts' },
    { fr: 'PDF bilan athlète / fin de stage', en: 'Athlete / end-of-camp PDF report' },
    { fr: 'Invitation stage centre altitude (Font-Romeu…)', en: 'Join altitude-centre camps (Font-Romeu…)' },
  ],
  roadmapPhase: 'P2 — M6–M18',
} as const;
/** Profils indépendants : abonnement utilisateur (essai 14 j puis paiement) */
export const INDEPENDENT_PROFILE_FREE = false;

export const INDEPENDENT_PLANS: PlanDefinition[] = [
  {
    id: SubscriptionPlanId.INDEPENDENT_RIDER,
    name: { fr: 'Athlète', en: 'Athlete' },
    tagline: {
      fr: 'Sans équipe — scouting, carrière & carnet de stage',
      en: 'No team — scouting, career & camp journal',
    },
    monthlyPriceEur: 12,
    annualPriceEur: 120,
    maxUsers: 1,
    maxEventsPerSeason: null,
    features: [
      { fr: 'Profil scouting visible des équipes', en: 'Scouting profile visible to teams' },
      { fr: 'Demandes de contact & partage consenti', en: 'Contact requests & consent-based sharing' },
      { fr: 'Carnet stage : wellness, hydratation, notes', en: 'Camp journal: wellness, hydration, notes' },
      { fr: 'Invitation stages équipe / centre', en: 'Join team or centre camps' },
      { fr: 'Essai 14 jours · parrainage -10 %', en: '14-day trial · referral -10%' },
    ],
  },
  {
    id: SubscriptionPlanId.INDEPENDENT_STAFF,
    name: { fr: 'Staff', en: 'Staff' },
    tagline: {
      fr: 'Vacataire — marketplace & missions',
      en: 'Freelancer — marketplace & missions',
    },
    monthlyPriceEur: 15,
    annualPriceEur: 150,
    maxUsers: 1,
    maxEventsPerSeason: null,
    features: [
      { fr: 'Profil visible sur la marketplace', en: 'Visible marketplace profile' },
      { fr: 'Compétences & disponibilités', en: 'Skills & availability' },
      { fr: 'Monitoring stage si invité', en: 'Camp monitoring when invited' },
      { fr: 'Espace pro & app mobile', en: 'Pro space & mobile app' },
      { fr: 'Essai 14 jours · parrainage -10 %', en: '14-day trial · referral -10%' },
    ],
  },
];

export const TRIAL_DAYS = 14;
export const PILOT_DAYS = 90;

export const REFERRAL_DISCOUNT_PERCENT = REFERRAL_PROGRAM.refereeDiscountPercent;

/** Sections nécessitant un plan minimum */
export const SECTION_MIN_PLAN: Partial<Record<AppSection, SubscriptionPlanId>> = {
  performance: SubscriptionPlanId.COMPETITION,
  'season-planning': SubscriptionPlanId.COMPETITION,
  financial: SubscriptionPlanId.COMPETITION,
  expenseReceipts: SubscriptionPlanId.COMPETITION,
  stocks: SubscriptionPlanId.COMPETITION,
  accommodationHistory: SubscriptionPlanId.COMPETITION,
  scouting: SubscriptionPlanId.COMPETITION,
  talentAvailability: SubscriptionPlanId.CONTINENTAL,
  adminDashboard: SubscriptionPlanId.PRO,
};

export function getPlanById(planId: SubscriptionPlanId): PlanDefinition {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? SUBSCRIPTION_PLANS[0];
}

export function getDefaultPlanForTeamLevel(level: TeamLevel): SubscriptionPlanId {
  switch (level) {
    case TeamLevel.FEDERATION:
      return SubscriptionPlanId.FEDERATION;
    case TeamLevel.N1_N3:
      return SubscriptionPlanId.COMPETITION;
    case TeamLevel.PRO:
      return SubscriptionPlanId.PRO;
    case TeamLevel.JEUNES:
    case TeamLevel.HORS_DN:
    default:
      return SubscriptionPlanId.CLUB;
  }
}

export function getRecommendedPlansForTeamLevel(level: TeamLevel): SubscriptionPlanId[] {
  switch (level) {
    case TeamLevel.FEDERATION:
      return [SubscriptionPlanId.FEDERATION];
    case TeamLevel.PRO:
      return [SubscriptionPlanId.CONTINENTAL, SubscriptionPlanId.PRO];
    case TeamLevel.N1_N3:
      return [SubscriptionPlanId.COMPETITION, SubscriptionPlanId.CONTINENTAL];
    case TeamLevel.JEUNES:
    case TeamLevel.HORS_DN:
    default:
      return [SubscriptionPlanId.CLUB, SubscriptionPlanId.COMPETITION];
  }
}

export function isPlanAtLeast(current: SubscriptionPlanId, required: SubscriptionPlanId): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export function formatPriceEur(amount: number | null, language: 'fr' | 'en'): string {
  if (amount === null) return language === 'fr' ? 'Sur devis' : 'Contact us';
  return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAnnualSavingsPercent(plan: PlanDefinition): number {
  if (!plan.monthlyPriceEur || !plan.annualPriceEur) return 0;
  const fullYear = plan.monthlyPriceEur * 12;
  return Math.round((1 - plan.annualPriceEur / fullYear) * 100);
}

export function getReferralAnnualPrice(plan: PlanDefinition): number | null {
  if (plan.annualPriceEur === null) return null;
  return Math.round(plan.annualPriceEur * (1 - REFERRAL_DISCOUNT_PERCENT / 100));
}

export function getIndependentPlanIdForRole(userRole: UserRole | string): SubscriptionPlanId {
  return userRole === UserRole.STAFF
    ? SubscriptionPlanId.INDEPENDENT_STAFF
    : SubscriptionPlanId.INDEPENDENT_RIDER;
}

export function getIndependentPlanById(planId: SubscriptionPlanId): PlanDefinition {
  return INDEPENDENT_PLANS.find((p) => p.id === planId) ?? INDEPENDENT_PLANS[0];
}

export function getIndependentPlanForUser(userRole: UserRole | string): PlanDefinition {
  return getIndependentPlanById(getIndependentPlanIdForRole(userRole));
}

/** Qui voit quoi dans la rubrique Abonnement. */
export type PricingAudience =
  | 'public'
  | 'team_admin'
  | 'team_member'
  | 'independent_rider'
  | 'independent_staff';

export function resolvePricingAudience(params: {
  isPublic?: boolean;
  isIndependent?: boolean;
  userRole?: UserRole | string;
  canManageTeamBilling?: boolean;
}): PricingAudience {
  if (params.isPublic) return 'public';
  if (params.isIndependent) {
    return params.userRole === UserRole.STAFF ? 'independent_staff' : 'independent_rider';
  }
  if (params.canManageTeamBilling) return 'team_admin';
  return 'team_member';
}

import { AppSection, SubscriptionPlanId, TeamLevel } from '../types';

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
};

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    id: SubscriptionPlanId.CLUB,
    name: { fr: 'Club', en: 'Club' },
    tagline: { fr: 'Clubs & comités structurés', en: 'Structured clubs & committees' },
    monthlyPriceEur: 49,
    annualPriceEur: 470,
    maxUsers: 15,
    maxEventsPerSeason: 20,
    features: [
      { fr: 'Effectif & calendrier', en: 'Roster & calendar' },
      { fr: 'Logistique course (6 modules)', en: 'Race logistics (6 modules)' },
      { fr: 'RGPD natif', en: 'Native GDPR' },
      { fr: 'PWA mobile coureurs/staff', en: 'Mobile PWA for riders/staff' },
    ],
  },
  {
    id: SubscriptionPlanId.COMPETITION,
    name: { fr: 'Compétition', en: 'Competition' },
    tagline: { fr: 'DN Elite / N1-N3', en: 'Elite DN / N1-N3' },
    monthlyPriceEur: 99,
    annualPriceEur: 950,
    maxUsers: 35,
    maxEventsPerSeason: 50,
    features: [
      { fr: '12 onglets logistique course', en: '12 race logistics tabs' },
      { fr: 'PPR & nutrition coureurs', en: 'PPR & rider nutrition' },
      { fr: 'Budgets course & exports PDF', en: 'Race budgets & PDF exports' },
      { fr: 'Archives saison', en: 'Season archives' },
    ],
  },
  {
    id: SubscriptionPlanId.CONTINENTAL,
    name: { fr: 'Continental', en: 'Continental' },
    tagline: { fr: 'ProTeams Continental & ProSeries', en: 'Continental ProTeams & ProSeries' },
    monthlyPriceEur: 199,
    annualPriceEur: 1910,
    maxUsers: 60,
    maxEventsPerSeason: null,
    highlighted: true,
    features: [
      { fr: 'Scouting inter-équipes', en: 'Cross-team scouting' },
      { fr: 'Marketplace missions staff', en: 'Staff mission marketplace' },
      { fr: 'Peer review & archives multi-saisons', en: 'Peer review & multi-season archives' },
      { fr: 'Export comptable CSV', en: 'Accounting CSV export' },
    ],
  },
  {
    id: SubscriptionPlanId.PRO,
    name: { fr: 'Pro', en: 'Pro' },
    tagline: { fr: 'ProTeams structurés — au-dessus du Continental', en: 'Structured ProTeams — above Continental' },
    monthlyPriceEur: 349,
    annualPriceEur: 3350,
    maxUsers: 100,
    maxEventsPerSeason: null,
    features: [
      { fr: 'Tout Continental +', en: 'Everything in Continental +' },
      { fr: 'Masse salariale & prévisions contrats', en: 'Payroll mass & contract forecasts' },
      { fr: 'Templates UCI pré-remplis', en: 'Pre-filled UCI templates' },
      { fr: 'Tableau de bord admin avancé', en: 'Advanced admin dashboard' },
      { fr: 'Support prioritaire & onboarding dédié', en: 'Priority support & dedicated onboarding' },
    ],
  },
  {
    id: SubscriptionPlanId.FEDERATION,
    name: { fr: 'Fédération', en: 'Federation' },
    tagline: { fr: 'LNR, comités régionaux, ligues', en: 'National leagues & regional committees' },
    monthlyPriceEur: null,
    annualPriceEur: null,
    maxUsers: 9999,
    maxEventsPerSeason: null,
    contactSales: true,
    features: [
      { fr: 'Vue agrégée multi-clubs', en: 'Multi-club aggregated view' },
      { fr: 'Stats anonymisées réseau', en: 'Anonymized network stats' },
      { fr: 'SLA & SSO', en: 'SLA & SSO' },
      { fr: 'Tarif sur devis (dès 499 €/mois)', en: 'Custom pricing (from €499/mo)' },
    ],
  },
];

export const TRIAL_DAYS = 14;
export const PILOT_DAYS = 90;

/** Sections nécessitant un plan minimum */
export const SECTION_MIN_PLAN: Partial<Record<AppSection, SubscriptionPlanId>> = {
  performance: SubscriptionPlanId.COMPETITION,
  'season-planning': SubscriptionPlanId.COMPETITION,
  financial: SubscriptionPlanId.COMPETITION,
  expenseReceipts: SubscriptionPlanId.COMPETITION,
  stocks: SubscriptionPlanId.COMPETITION,
  scouting: SubscriptionPlanId.CONTINENTAL,
  talentAvailability: SubscriptionPlanId.CONTINENTAL,
  adminDashboard: SubscriptionPlanId.PRO,
  accommodationHistory: SubscriptionPlanId.COMPETITION,
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

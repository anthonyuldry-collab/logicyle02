import { ELIGIBLE_CATEGORIES_CONFIG } from '../constants';
import { OrganizerContact, TeamLevel } from '../types';

export type RaceGenderSegment = 'men' | 'women' | 'mixed' | 'youth';
export type RaceCircuitTier =
  | 'worldtour'
  | 'proseries'
  | 'continental1'
  | 'continental2'
  | 'national_elite'
  | 'amateur'
  | 'youth'
  | 'international'
  | 'other';

export type RaceCompetitionLevel = 'pro' | 'elite' | 'amateur' | 'youth';
export type FederationScope = 'uci' | 'ffc' | 'regional' | 'international';

export interface RaceTaxonomy {
  categoryId?: string;
  categoryLabel?: string;
  genderSegment: RaceGenderSegment;
  circuitTier: RaceCircuitTier;
  competitionLevel: RaceCompetitionLevel;
  federationScope: FederationScope;
  /** Libellé court pour badges UI */
  badgeLabel: string;
}

export interface ParticipationRegime {
  id: string;
  label: { fr: string; en: string };
  /** Délai recommandé pour envoyer la candidature avant la date d'épreuve */
  candidatureLeadDays: number;
  /** Fenêtre d'ouverture calendrier (mois typiques 1-12) */
  typicalApplicationMonths: number[];
  regulationRefs: string[];
  engagementSteps: { fr: string; en: string }[];
  letterIntro: { fr: string; en: string };
}

const CATEGORY_TAXONOMY: Record<
  string,
  Omit<RaceTaxonomy, 'categoryId' | 'categoryLabel'>
> = {
  'uci.m.wwt': {
    genderSegment: 'men',
    circuitTier: 'worldtour',
    competitionLevel: 'pro',
    federationScope: 'uci',
    badgeLabel: 'WWT H',
  },
  'uci.pro': {
    genderSegment: 'men',
    circuitTier: 'proseries',
    competitionLevel: 'pro',
    federationScope: 'uci',
    badgeLabel: 'ProSeries H',
  },
  'uci.1': {
    genderSegment: 'men',
    circuitTier: 'continental1',
    competitionLevel: 'elite',
    federationScope: 'uci',
    badgeLabel: 'UCI 1 H',
  },
  'uci.2': {
    genderSegment: 'men',
    circuitTier: 'continental2',
    competitionLevel: 'elite',
    federationScope: 'uci',
    badgeLabel: 'UCI 2 H',
  },
  'uci.ncup': {
    genderSegment: 'youth',
    circuitTier: 'youth',
    competitionLevel: 'youth',
    federationScope: 'uci',
    badgeLabel: 'NCU23 H',
  },
  'uci.wwt': {
    genderSegment: 'women',
    circuitTier: 'worldtour',
    competitionLevel: 'pro',
    federationScope: 'uci',
    badgeLabel: 'WWT F',
  },
  'uci.w.pro': {
    genderSegment: 'women',
    circuitTier: 'proseries',
    competitionLevel: 'pro',
    federationScope: 'uci',
    badgeLabel: 'ProSeries F',
  },
  'uci.w.1': {
    genderSegment: 'women',
    circuitTier: 'continental1',
    competitionLevel: 'elite',
    federationScope: 'uci',
    badgeLabel: 'UCI 1 F',
  },
  'uci.w.2': {
    genderSegment: 'women',
    circuitTier: 'continental2',
    competitionLevel: 'elite',
    federationScope: 'uci',
    badgeLabel: 'UCI 2 F',
  },
  'uci.w.ncup': {
    genderSegment: 'youth',
    circuitTier: 'youth',
    competitionLevel: 'youth',
    federationScope: 'uci',
    badgeLabel: 'NCU23 F',
  },
  'cdf.n1': {
    genderSegment: 'men',
    circuitTier: 'national_elite',
    competitionLevel: 'elite',
    federationScope: 'ffc',
    badgeLabel: 'CdF N1',
  },
  'cdf.n2': {
    genderSegment: 'men',
    circuitTier: 'national_elite',
    competitionLevel: 'amateur',
    federationScope: 'ffc',
    badgeLabel: 'CdF N2',
  },
  'cdf.n3': {
    genderSegment: 'men',
    circuitTier: 'amateur',
    competitionLevel: 'amateur',
    federationScope: 'ffc',
    badgeLabel: 'CdF N3',
  },
  'elite.nat': {
    genderSegment: 'mixed',
    circuitTier: 'national_elite',
    competitionLevel: 'elite',
    federationScope: 'ffc',
    badgeLabel: 'Elite NAT',
  },
  'cf.elite': {
    genderSegment: 'men',
    circuitTier: 'national_elite',
    competitionLevel: 'elite',
    federationScope: 'ffc',
    badgeLabel: 'CF Elite H',
  },
  'cf.amateur': {
    genderSegment: 'men',
    circuitTier: 'amateur',
    competitionLevel: 'amateur',
    federationScope: 'ffc',
    badgeLabel: 'CF Amateur',
  },
  'cdf.w': {
    genderSegment: 'women',
    circuitTier: 'national_elite',
    competitionLevel: 'elite',
    federationScope: 'ffc',
    badgeLabel: 'CdF F N1',
  },
  'cf.elite.w': {
    genderSegment: 'women',
    circuitTier: 'national_elite',
    competitionLevel: 'elite',
    federationScope: 'ffc',
    badgeLabel: 'CF Elite F',
  },
  'fed.u19': {
    genderSegment: 'youth',
    circuitTier: 'youth',
    competitionLevel: 'youth',
    federationScope: 'ffc',
    badgeLabel: 'Féd. U19',
  },
  'fed.u17': {
    genderSegment: 'youth',
    circuitTier: 'youth',
    competitionLevel: 'youth',
    federationScope: 'ffc',
    badgeLabel: 'Féd. U17',
  },
  'open.1': {
    genderSegment: 'mixed',
    circuitTier: 'amateur',
    competitionLevel: 'amateur',
    federationScope: 'regional',
    badgeLabel: 'Open 1',
  },
  'open.2': {
    genderSegment: 'mixed',
    circuitTier: 'amateur',
    competitionLevel: 'amateur',
    federationScope: 'regional',
    badgeLabel: 'Open 2',
  },
  'open.3': {
    genderSegment: 'mixed',
    circuitTier: 'amateur',
    competitionLevel: 'amateur',
    federationScope: 'regional',
    badgeLabel: 'Open 3',
  },
  jo: {
    genderSegment: 'mixed',
    circuitTier: 'international',
    competitionLevel: 'pro',
    federationScope: 'international',
    badgeLabel: 'JO',
  },
  cm: {
    genderSegment: 'mixed',
    circuitTier: 'international',
    competitionLevel: 'pro',
    federationScope: 'international',
    badgeLabel: 'CM',
  },
};

const REGIMES: Record<string, ParticipationRegime> = {
  uci_pro: {
    id: 'uci_pro',
    label: { fr: 'Calendrier UCI Pro (WWT / ProSeries)', en: 'UCI Pro calendar (WWT / ProSeries)' },
    candidatureLeadDays: 120,
    typicalApplicationMonths: [9, 10, 11, 12, 1],
    regulationRefs: ['UCI art. 2.1.001', 'UCI art. 1.2.049', 'UCI art. 1.2.090'],
    engagementSteps: [
      { fr: 'Demande d\'invitation / wildcard auprès de l\'organisateur (automne hiver N-1)', en: 'Invitation / wildcard request to organizer (autumn–winter)' },
      { fr: 'Confirmation d\'engagement au plus tard J-50 (art. 1.2.049)', en: 'Confirm entry by D-50 (art. 1.2.049)' },
      { fr: 'Bulletin officiel reçu J-40 · retour signé J-20', en: 'Official form received D-40 · signed return D-20' },
      { fr: 'Liste titulaires / remplaçants J-3 (72 h)', en: 'Starters / reserves list D-3 (72 h)' },
    ],
    letterIntro: {
      fr: 'Conformément au calendrier UCI et au Règlement UCI (participation des équipes),',
      en: 'In accordance with the UCI calendar and UCI regulations on team participation,',
    },
  },
  uci_continental: {
    id: 'uci_continental',
    label: { fr: 'UCI Classe 1 / 2', en: 'UCI Class 1 / 2' },
    candidatureLeadDays: 75,
    typicalApplicationMonths: [10, 11, 12, 1, 2],
    regulationRefs: ['UCI art. 1.2.049', 'UCI art. 2.1.005', 'UCI art. 1.2.090'],
    engagementSteps: [
      { fr: 'Candidature écrite à l\'organisateur (Continental / ProTeam invité)', en: 'Written application to organizer' },
      { fr: 'Réponse organisateur sous 50 jours avant l\'épreuve', en: 'Organizer response within 50 days before event' },
      { fr: 'Bulletin J-40 · signature J-20 · partants J-3', en: 'Form D-40 · signature D-20 · starters D-3' },
    ],
    letterIntro: {
      fr: 'Au titre de notre inscription UCI (Continental / ProSeries) et conformément à l\'art. 1.2.049,',
      en: 'As a UCI-registered team and pursuant to art. 1.2.049,',
    },
  },
  ffc_elite: {
    id: 'ffc_elite',
    label: { fr: 'FFC — Elite nationale / Coupe de France', en: 'FFC — National elite / French Cup' },
    candidatureLeadDays: 55,
    typicalApplicationMonths: [11, 12, 1, 2, 3],
    regulationRefs: ['Règlement FFC compétitions', 'Calendrier national FFC', 'CycleWeb FFC', 'UCI art. 1.2.049 (si homologation UCI)'],
    engagementSteps: [
      { fr: 'Inscription CycleWeb (plateforme FFC) dans le délai indiqué sur le calendrier fédéral', en: 'CycleWeb registration (FFC platform) within the federal calendar deadline' },
      { fr: 'Licences FFC à jour · autorisations DN si applicable', en: 'Valid FFC licenses · DN authorization if required' },
      { fr: 'Engagement bulletin selon homologation (UCI ou national)', en: 'Entry form per event homologation' },
    ],
    letterIntro: {
      fr: 'Conformément au calendrier fédéral FFC (inscription CycleWeb) et aux conditions d\'accès Elite nationale / Coupe de France,',
      en: 'Pursuant to the FFC federal calendar (CycleWeb registration) and Elite / French Cup access rules,',
    },
  },
  ffc_amateur: {
    id: 'ffc_amateur',
    label: { fr: 'FFC — Open / amateur', en: 'FFC — Open / amateur' },
    candidatureLeadDays: 30,
    typicalApplicationMonths: [1, 2, 3, 4, 5, 6],
    regulationRefs: ['Règlement FFC Open', 'Règlement départemental/régional FFC'],
    engagementSteps: [
      { fr: 'Inscription directe auprès de l\'organisateur (Open 1/2/3)', en: 'Direct registration with organizer' },
      { fr: 'Licence FFC compétition valide · catégorie d\'âge respectée', en: 'Valid FFC racing license · age category' },
    ],
    letterIntro: {
      fr: 'Dans le cadre du calendrier amateur FFC (Open / régional),',
      en: 'Under the FFC amateur calendar (Open / regional),',
    },
  },
  ffc_youth: {
    id: 'ffc_youth',
    label: { fr: 'FFC / UCI — Jeunes (U19 / U23)', en: 'FFC / UCI — Youth (U19 / U23)' },
    candidatureLeadDays: 45,
    typicalApplicationMonths: [10, 11, 12, 1, 2],
    regulationRefs: ['Règlement FFC jeunes', 'CycleWeb FFC', 'UCI art. 1.2.049', 'Coupe des Nations U23'],
    engagementSteps: [
      { fr: 'Inscription CycleWeb pour l\'épreuve fédérale jeunes', en: 'CycleWeb registration for the federal youth event' },
      { fr: 'Sélection équipe ou candidature club formateur', en: 'Team selection or development squad application' },
      { fr: 'Effectif U23/U19 conforme au règlement de l\'épreuve', en: 'U23/U19 roster per event rules' },
    ],
    letterIntro: {
      fr: 'Au titre de notre programme jeunes (U19/U23) et du calendrier fédéral FFC (inscription CycleWeb),',
      en: 'As part of our youth program (U19/U23) and the FFC federal calendar (CycleWeb registration),',
    },
  },
};

function allCategoryEntries(): { id: string; label: string; group: string }[] {
  return ELIGIBLE_CATEGORIES_CONFIG.flatMap((g) =>
    g.categories.map((c) => ({ id: c.id, label: c.label, group: g.group }))
  );
}

export function findCategoryById(categoryId: string) {
  return allCategoryEntries().find((c) => c.id === categoryId);
}

export function inferCategoryIdFromText(category?: string, uciClass?: string): string | undefined {
  const hay = `${category || ''} ${uciClass || ''}`.toLowerCase();
  if (!hay.trim()) return undefined;

  for (const entry of allCategoryEntries()) {
    if (hay.includes(entry.id.toLowerCase()) || hay.includes(entry.label.toLowerCase())) {
      return entry.id;
    }
  }

  if (hay.includes('worldtour') && hay.includes('women')) return 'uci.wwt';
  if (hay.includes('worldtour') || hay.includes('wwt')) return 'uci.m.wwt';
  if (hay.includes('proseries') && (hay.includes('women') || hay.includes('femme'))) return 'uci.w.pro';
  if (hay.includes('proseries') || hay.includes('pro series')) return 'uci.pro';
  if (hay.includes('u23') && (hay.includes('women') || hay.includes('femme'))) return 'uci.w.ncup';
  if (hay.includes('u23')) return 'uci.ncup';
  if (hay.includes('1.1') && (hay.includes('women') || hay.includes('femme'))) return 'uci.w.1';
  if (hay.includes('2.1') && (hay.includes('women') || hay.includes('femme'))) return 'uci.w.1';
  if (hay.includes('1.1') || hay.includes('1.2')) return 'uci.1';
  if (hay.includes('2.1') || hay.includes('2.2')) return 'uci.2';
  if (hay.includes('elite') && (hay.includes('femme') || hay.includes('women'))) return 'cf.elite.w';
  if (hay.includes('coupe de france') && hay.includes('n2')) return 'cdf.n2';
  if (hay.includes('coupe de france') && hay.includes('n3')) return 'cdf.n3';
  if (hay.includes('coupe de france')) return 'cdf.n1';
  if (hay.includes('elite nationale') || hay.includes('élite nationale')) return 'elite.nat';
  if (hay.includes('open 1')) return 'open.1';
  if (hay.includes('open 2')) return 'open.2';
  if (hay.includes('open 3')) return 'open.3';
  if (hay.includes('u19') || hay.includes('junior')) return 'fed.u19';
  if (hay.includes('u17') || hay.includes('cadet')) return 'fed.u17';

  return undefined;
}

export function resolveRaceTaxonomy(input: {
  categoryId?: string;
  category?: string;
  uciClass?: string;
  eventName?: string;
}): RaceTaxonomy {
  let categoryId = input.categoryId || inferCategoryIdFromText(input.category, input.uciClass);
  const nameLower = (input.eventName || '').toLowerCase();

  if (categoryId && CATEGORY_TAXONOMY[categoryId]) {
    const meta = findCategoryById(categoryId);
    const base = CATEGORY_TAXONOMY[categoryId];
    let genderSegment = base.genderSegment;
    if (genderSegment === 'mixed') {
      if (nameLower.includes('femme') || nameLower.includes('women') || nameLower.includes(' dames')) {
        genderSegment = 'women';
      } else if (nameLower.includes('u23') || nameLower.includes('u19') || nameLower.includes('avenir')) {
        genderSegment = 'youth';
      } else if (base.competitionLevel !== 'amateur') {
        genderSegment = 'men';
      }
    }
    return {
      categoryId,
      categoryLabel: meta?.label,
      ...base,
      genderSegment,
      badgeLabel:
        genderSegment === 'women' && base.badgeLabel.endsWith(' H')
          ? base.badgeLabel.replace(' H', ' F')
          : base.badgeLabel,
    };
  }

  const hay = `${input.category || ''} ${input.uciClass || ''} ${input.eventName || ''}`.toLowerCase();
  let genderSegment: RaceGenderSegment = 'mixed';
  if (hay.includes('femme') || hay.includes('women') || hay.includes(' dames')) genderSegment = 'women';
  else if (hay.includes('u23') || hay.includes('u19') || hay.includes('jeune') || hay.includes('avenir')) {
    genderSegment = 'youth';
  } else if (hay.includes('homme') || hay.includes(' men')) genderSegment = 'men';

  let circuitTier: RaceCircuitTier = 'other';
  let competitionLevel: RaceCompetitionLevel = 'elite';
  let federationScope: FederationScope = 'ffc';

  if (hay.includes('uci') || hay.includes('worldtour') || hay.includes('proseries')) {
    federationScope = 'uci';
  }
  if (hay.includes('worldtour')) circuitTier = 'worldtour';
  else if (hay.includes('proseries')) circuitTier = 'proseries';
  else if (hay.includes('1.1') || hay.includes('1.2')) circuitTier = 'continental1';
  else if (hay.includes('2.1') || hay.includes('2.2')) circuitTier = 'continental2';
  else if (hay.includes('open')) {
    circuitTier = 'amateur';
    competitionLevel = 'amateur';
  } else if (hay.includes('elite')) circuitTier = 'national_elite';

  return {
    categoryId,
    categoryLabel: input.category,
    genderSegment,
    circuitTier,
    competitionLevel,
    federationScope,
    badgeLabel: input.uciClass || input.category || '—',
  };
}

export function enrichOrganizerContact(contact: OrganizerContact): OrganizerContact {
  const categoryId =
    contact.categoryId || inferCategoryIdFromText(contact.category, contact.uciClass);
  const taxonomy = resolveRaceTaxonomy({
    categoryId,
    category: contact.category,
    uciClass: contact.uciClass,
    eventName: contact.eventName,
  });

  return {
    ...contact,
    categoryId: taxonomy.categoryId,
    genderSegment: taxonomy.genderSegment,
    circuitTier: taxonomy.circuitTier,
    competitionLevel: taxonomy.competitionLevel,
    federationScope: taxonomy.federationScope,
  };
}

export function getParticipationRegime(taxonomy: RaceTaxonomy): ParticipationRegime {
  if (taxonomy.competitionLevel === 'youth' || taxonomy.circuitTier === 'youth') {
    return REGIMES.ffc_youth;
  }
  if (taxonomy.federationScope === 'uci') {
    if (taxonomy.circuitTier === 'worldtour' || taxonomy.circuitTier === 'proseries') {
      return REGIMES.uci_pro;
    }
    return REGIMES.uci_continental;
  }
  const categoryId = taxonomy.categoryId ?? '';
  const isFederalFfc =
    taxonomy.federationScope === 'ffc' &&
    (taxonomy.circuitTier === 'national_elite' ||
      categoryId.startsWith('cdf.') ||
      categoryId.startsWith('elite.') ||
      categoryId.startsWith('cf.elite') ||
      categoryId.startsWith('fed.'));
  if (isFederalFfc) {
    return REGIMES.ffc_elite;
  }
  if (taxonomy.competitionLevel === 'amateur' || taxonomy.circuitTier === 'amateur') {
    return REGIMES.ffc_amateur;
  }
  return REGIMES.ffc_elite;
}

/** Épreuve du calendrier fédéral FFC → inscription via CycleWeb */
export function usesCycleWebRegistration(taxonomy: RaceTaxonomy): boolean {
  const regime = getParticipationRegime(taxonomy);
  return regime.id === 'ffc_elite' || regime.id === 'ffc_youth';
}

export const FEDERAL_REGISTRATION_LABEL = {
  fr: 'Inscription CycleWeb',
  en: 'CycleWeb registration',
} as const;

export function getCandidatureDeadlineDate(
  theoreticalEventDate: string,
  taxonomy: RaceTaxonomy
): string {
  const regime = getParticipationRegime(taxonomy);
  const d = new Date(theoreticalEventDate + 'T12:00:00');
  d.setDate(d.getDate() - regime.candidatureLeadDays);
  return d.toISOString().slice(0, 10);
}

export function isCandidatureWindowOpen(
  theoreticalEventDate: string,
  taxonomy: RaceTaxonomy,
  referenceDate = new Date()
): boolean {
  const deadline = getCandidatureDeadlineDate(theoreticalEventDate, taxonomy);
  const ref = referenceDate.toISOString().slice(0, 10);
  return ref <= theoreticalEventDate && ref >= deadline;
}

const TEAM_TIER_ACCESS: Record<TeamLevel, RaceCircuitTier[]> = {
  [TeamLevel.PRO]: ['worldtour', 'proseries', 'continental1', 'continental2', 'international'],
  [TeamLevel.N1_N3]: ['proseries', 'continental1', 'continental2', 'national_elite', 'international'],
  [TeamLevel.HORS_DN]: ['continental2', 'national_elite', 'amateur', 'youth'],
  [TeamLevel.JEUNES]: ['youth', 'amateur', 'national_elite'],
  [TeamLevel.FEDERATION]: [
    'worldtour',
    'proseries',
    'continental1',
    'continental2',
    'national_elite',
    'amateur',
    'youth',
    'international',
    'other',
  ],
};

export function isContactEligibleForTeam(
  contact: OrganizerContact,
  teamLevel?: TeamLevel,
  options?: { genderFocus?: RaceGenderSegment | 'all' }
): boolean {
  const enriched = enrichOrganizerContact(contact);
  const taxonomy = resolveRaceTaxonomy(enriched);

  if (options?.genderFocus && options.genderFocus !== 'all') {
    if (
      taxonomy.genderSegment !== 'mixed' &&
      taxonomy.genderSegment !== options.genderFocus &&
      taxonomy.genderSegment !== 'youth'
    ) {
      return false;
    }
  }

  if (!teamLevel) return true;
  const allowed = TEAM_TIER_ACCESS[teamLevel] || [];
  return allowed.includes(taxonomy.circuitTier) || taxonomy.circuitTier === 'other';
}

export function getTeamCalendarOfferSummary(teamLevel?: TeamLevel): {
  fr: string;
  en: string;
  recommendedTiers: RaceCircuitTier[];
} {
  switch (teamLevel) {
    case TeamLevel.PRO:
      return {
        fr: 'Offre cible : WorldTour & ProSeries (H/F), invitations UCI Classe 1, sélections internationales.',
        en: 'Target offer: WorldTour & ProSeries (M/W), UCI Class 1 invites, international selections.',
        recommendedTiers: TEAM_TIER_ACCESS[TeamLevel.PRO],
      };
    case TeamLevel.N1_N3:
      return {
        fr: 'Offre cible : ProSeries invité, UCI 1.1/2.1, Elite nationale & Coupes de France N1–N3 (H/F).',
        en: 'Target offer: ProSeries guest, UCI 1.1/2.1, national elite & French Cup N1–N3 (M/W).',
        recommendedTiers: TEAM_TIER_ACCESS[TeamLevel.N1_N3],
      };
    case TeamLevel.JEUNES:
      return {
        fr: 'Offre cible : Fédérales U17/U19, Coupe des Nations U23, circuits jeunes FFC.',
        en: 'Target offer: U17/U19 federation races, U23 Nations Cup, FFC youth calendar.',
        recommendedTiers: TEAM_TIER_ACCESS[TeamLevel.JEUNES],
      };
    default:
      return {
        fr: 'Offre cible : Elite nationale, Open 1/2/3, UCI 2.2 régional — calendrier amateur structuré.',
        en: 'Target offer: national elite, Open 1/2/3, regional UCI 2.2 — structured amateur calendar.',
        recommendedTiers: TEAM_TIER_ACCESS[TeamLevel.HORS_DN],
      };
  }
}

export function getTaxonomyBadgeClass(tier: RaceCircuitTier): string {
  switch (tier) {
    case 'worldtour':
      return 'bg-violet-950 text-violet-200 border-violet-700/60';
    case 'proseries':
      return 'bg-indigo-950 text-indigo-200 border-indigo-700/60';
    case 'continental1':
      return 'bg-sky-950 text-sky-200 border-sky-700/60';
    case 'continental2':
      return 'bg-cyan-950 text-cyan-200 border-cyan-700/60';
    case 'national_elite':
      return 'bg-emerald-950 text-emerald-200 border-emerald-700/60';
    case 'amateur':
      return 'bg-amber-950 text-amber-200 border-amber-700/60';
    case 'youth':
      return 'bg-orange-950 text-orange-200 border-orange-700/60';
    case 'international':
      return 'bg-rose-950 text-rose-200 border-rose-700/60';
    default:
      return 'bg-slate-800 text-slate-200 border-slate-600';
  }
}

export function getGenderBadgeClass(gender: RaceGenderSegment): string {
  switch (gender) {
    case 'women':
      return 'bg-pink-950 text-pink-200 border-pink-700/60';
    case 'men':
      return 'bg-blue-950 text-blue-200 border-blue-700/60';
    case 'youth':
      return 'bg-orange-950 text-orange-200 border-orange-700/60';
    default:
      return 'bg-slate-800 text-slate-200 border-slate-600';
  }
}

export const GENDER_FILTER_OPTIONS: { id: RaceGenderSegment | 'all'; fr: string; en: string }[] = [
  { id: 'all', fr: 'Tous genres', en: 'All genders' },
  { id: 'men', fr: 'Hommes', en: 'Men' },
  { id: 'women', fr: 'Femmes', en: 'Women' },
  { id: 'youth', fr: 'Jeunes', en: 'Youth' },
];

export const CIRCUIT_FILTER_OPTIONS: { id: RaceCircuitTier | 'all'; fr: string; en: string }[] = [
  { id: 'all', fr: 'Tous circuits', en: 'All circuits' },
  { id: 'worldtour', fr: 'WorldTour', en: 'WorldTour' },
  { id: 'proseries', fr: 'ProSeries', en: 'ProSeries' },
  { id: 'continental1', fr: 'UCI Classe 1', en: 'UCI Class 1' },
  { id: 'continental2', fr: 'UCI Classe 2', en: 'UCI Class 2' },
  { id: 'national_elite', fr: 'Elite nationale', en: 'National elite' },
  { id: 'amateur', fr: 'Amateur / Open', en: 'Amateur / Open' },
  { id: 'youth', fr: 'Jeunes', en: 'Youth' },
];

export const LEVEL_FILTER_OPTIONS: { id: RaceCompetitionLevel | 'all'; fr: string; en: string }[] = [
  { id: 'all', fr: 'Tous niveaux', en: 'All levels' },
  { id: 'pro', fr: 'Professionnel', en: 'Professional' },
  { id: 'elite', fr: 'Elite', en: 'Elite' },
  { id: 'amateur', fr: 'Amateur', en: 'Amateur' },
  { id: 'youth', fr: 'Jeunes', en: 'Youth' },
];

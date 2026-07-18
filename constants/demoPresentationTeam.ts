/**
 * Pack « Horizon Atlantique » — équipe fictive complète pour supports de présentation.
 * IDs préfixés `demo_pres_` pour détection / réinstallation.
 */
import {
  Address,
  BudgetItemCategory,
  Discipline,
  DisciplinePracticed,
  EventBudgetItem,
  EventType,
  FormeStatus,
  HealthCondition,
  IncomeCategory,
  IncomeItem,
  LanguageProficiency,
  MealDay,
  MoralStatus,
  OperationalTimingCategory,
  PerformanceEntry,
  PerformanceFactorDetail,
  PowerProfile,
  RaceEvent,
  Rider,
  RiderEventPreference,
  RiderEventSelection,
  RiderEventStatus,
  RiderQualitativeProfile,
  Sex,
  StaffMember,
  StaffRole,
  StaffStatus,
  TeamLevel,
  Vehicle,
  VehicleType,
  ClothingType,
  ContractType,
  CounterpartDeliverableStatus,
} from '../types';
import { getCurrentSeasonYear } from '../utils/seasonUtils';
import {
  buildDemoPresentationExtras,
  countDemoPresentationExtras,
  type DemoPresentationExtras,
} from './demoPresentationTeamExtras';

export const DEMO_PRES_PREFIX = 'demo_pres_';
export const DEMO_PRES_TEAM_NAME = 'Horizon Atlantique';
export const DEMO_PRES_PRIMARY = '#0f766e';
export const DEMO_PRES_ACCENT = '#f59e0b';
export const DEMO_PRES_LEVEL = TeamLevel.N1_N3;

export function isDemoPresentationId(id: string | undefined | null): boolean {
  return Boolean(id && id.startsWith(DEMO_PRES_PREFIX));
}

const HQ: Address = {
  streetName: '12 Quai de la Fosse',
  postalCode: '44000',
  city: 'Nantes',
  region: 'Pays de la Loire',
  country: 'France',
};

const emptyBike = () => ({
  specifics: {
    tailleCadre: '',
    cintre: '',
    potence: '',
    plateau: '',
    manivelle: '',
    capteurPuissance: '',
  },
  cotes: {
    hauteurSelle: '',
    reculSelle: '',
    longueurBecSelleAxeCintre: '',
    hauteurGuidonAxeRoueCentreCintre: '',
  },
});

const emptyNutrition = () => ({
  carbsPerHourTarget: 80,
  hydrationNotes: '500–750 ml/h selon chaleur',
  selectedGels: [],
  selectedBars: [],
  selectedDrinks: [],
  customProducts: [],
});

const factor = (
  forces: string,
  aOptimiser: string,
  aDevelopper: string,
  besoinsActions: string
): PerformanceFactorDetail => ({
  forces,
  aOptimiser,
  aDevelopper,
  besoinsActions,
  actionItems: [
    {
      id: `${DEMO_PRES_PREFIX}act_${besoinsActions.slice(0, 24).replace(/\W+/g, '_').toLowerCase() || 'plan'}`,
      title: besoinsActions.slice(0, 80) || 'Action à planifier',
      status: 'in_progress',
      targetDate: `${getCurrentSeasonYear()}-06-15`,
      createdAt: `${getCurrentSeasonYear()}-01-15T10:00:00.000Z`,
      updatedAt: `${getCurrentSeasonYear()}-01-15T10:00:00.000Z`,
    },
  ],
});

/** Profils W (fresh) réalistes ; fatigué = −8 / −15 / −22 % approx. */
function scalePower(base: PowerProfile, factorPct: number): PowerProfile {
  const f = 1 + factorPct / 100;
  const scale = (n?: number) => (typeof n === 'number' ? Math.round(n * f) : undefined);
  return {
    power1s: scale(base.power1s),
    power5s: scale(base.power5s),
    power30s: scale(base.power30s),
    power1min: scale(base.power1min),
    power3min: scale(base.power3min),
    power5min: scale(base.power5min),
    power12min: scale(base.power12min),
    power20min: scale(base.power20min),
    criticalPower: scale(base.criticalPower),
  };
}

type RiderSeed = {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  birthDate: string;
  nationality: string;
  heightCm: number;
  weightKg: number;
  profile: RiderQualitativeProfile;
  rosterRole: 'principal' | 'reserve';
  forme: FormeStatus;
  moral: MoralStatus;
  health: HealthCondition;
  salary: number;
  power: PowerProfile;
  goals: string;
  seasonObjectives: string;
  results: Array<{ date: string; eventName: string; rank: number; category: string }>;
};

const RIDER_SEEDS: RiderSeed[] = [
  {
    id: `${DEMO_PRES_PREFIX}rider_01`,
    firstName: 'Léa',
    lastName: 'Moreau',
    sex: Sex.FEMALE,
    birthDate: '2001-03-14',
    nationality: 'France',
    heightCm: 168,
    weightKg: 56,
    profile: RiderQualitativeProfile.GRIMPEUR,
    rosterRole: 'principal',
    forme: FormeStatus.EXCELLENT,
    moral: MoralStatus.ELEVEE,
    health: HealthCondition.PRET_A_COURIR,
    salary: 28000,
    power: {
      power1s: 980,
      power5s: 820,
      power30s: 520,
      power1min: 380,
      power3min: 310,
      power5min: 285,
      power12min: 255,
      power20min: 240,
      criticalPower: 235,
    },
    goals: 'Top 10 sur les courses montagne ; progresser en CLM collectif.',
    seasonObjectives: 'Podium Coupe de France · sélection stage altitude juillet.',
    results: [
      { date: '2025-09-12', eventName: 'Tour de la Loire Féminin', rank: 3, category: 'Elite' },
      { date: '2025-05-18', eventName: 'Classic Grand Est', rank: 7, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_02`,
    firstName: 'Inès',
    lastName: 'Bernard',
    sex: Sex.FEMALE,
    birthDate: '1999-07-22',
    nationality: 'France',
    heightCm: 172,
    weightKg: 62,
    profile: RiderQualitativeProfile.SPRINTEUR,
    rosterRole: 'principal',
    forme: FormeStatus.BON,
    moral: MoralStatus.BON,
    health: HealthCondition.PRET_A_COURIR,
    salary: 32000,
    power: {
      power1s: 1250,
      power5s: 1050,
      power30s: 680,
      power1min: 450,
      power3min: 340,
      power5min: 300,
      power12min: 260,
      power20min: 245,
      criticalPower: 238,
    },
    goals: 'Gagner au sprint sur courses plates ; finir les courses vallonnées.',
    seasonObjectives: '2 victoires nationales · lead-out structuré.',
    results: [
      { date: '2025-08-03', eventName: 'Critérium Nantes Métropole', rank: 1, category: 'Elite' },
      { date: '2025-04-20', eventName: 'GP Bretagne', rank: 2, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_03`,
    firstName: 'Camille',
    lastName: 'Rousseau',
    sex: Sex.FEMALE,
    birthDate: '2002-11-05',
    nationality: 'Belgique',
    heightCm: 170,
    weightKg: 58,
    profile: RiderQualitativeProfile.PUNCHEUR,
    rosterRole: 'principal',
    forme: FormeStatus.BON,
    moral: MoralStatus.ELEVEE,
    health: HealthCondition.PRET_A_COURIR,
    salary: 26000,
    power: {
      power1s: 1100,
      power5s: 900,
      power30s: 580,
      power1min: 410,
      power3min: 330,
      power5min: 295,
      power12min: 265,
      power20min: 248,
      criticalPower: 242,
    },
    goals: 'Attaques courtes en côtes · rôle de baroudeuse utile.',
    seasonObjectives: 'Échapper sur 1-day races · progresser récupération.',
    results: [
      { date: '2025-06-14', eventName: 'Flèche Ardennaise Espoirs', rank: 5, category: 'U23' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_04`,
    firstName: 'Nora',
    lastName: 'Petit',
    sex: Sex.FEMALE,
    birthDate: '2000-01-30',
    nationality: 'France',
    heightCm: 165,
    weightKg: 54,
    profile: RiderQualitativeProfile.COMPLET,
    rosterRole: 'principal',
    forme: FormeStatus.EXCELLENT,
    moral: MoralStatus.BON,
    health: HealthCondition.PRET_A_COURIR,
    salary: 30000,
    power: {
      power1s: 1020,
      power5s: 860,
      power30s: 550,
      power1min: 395,
      power3min: 320,
      power5min: 290,
      power12min: 268,
      power20min: 255,
      criticalPower: 250,
    },
    goals: 'Capitaine de route · régularité sur la saison.',
    seasonObjectives: 'Top 15 GC stage race · mentorat U23.',
    results: [
      { date: '2025-07-20', eventName: 'Tour de Normandie (GC)', rank: 8, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_05`,
    firstName: 'Sarah',
    lastName: 'Dupont',
    sex: Sex.FEMALE,
    birthDate: '2003-09-12',
    nationality: 'France',
    heightCm: 167,
    weightKg: 55,
    profile: RiderQualitativeProfile.ROULEUR,
    rosterRole: 'principal',
    forme: FormeStatus.BON,
    moral: MoralStatus.NEUTRE,
    health: HealthCondition.PRET_A_COURIR,
    salary: 22000,
    power: {
      power1s: 950,
      power5s: 780,
      power30s: 500,
      power1min: 370,
      power3min: 305,
      power5min: 280,
      power12min: 270,
      power20min: 260,
      criticalPower: 255,
    },
    goals: 'Travail d’équipe · CLM individuel + chrono par équipes.',
    seasonObjectives: '+8 W CP · podium CLM régional.',
    results: [
      { date: '2025-03-22', eventName: 'CLM Pays de la Loire', rank: 4, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_06`,
    firstName: 'Jade',
    lastName: 'Lefèvre',
    sex: Sex.FEMALE,
    birthDate: '2004-05-08',
    nationality: 'France',
    heightCm: 169,
    weightKg: 57,
    profile: RiderQualitativeProfile.CLASSIQUE,
    rosterRole: 'principal',
    forme: FormeStatus.MOYEN,
    moral: MoralStatus.BON,
    health: HealthCondition.REPOS_PRECAUTION,
    salary: 20000,
    power: {
      power1s: 1080,
      power5s: 880,
      power30s: 560,
      power1min: 400,
      power3min: 315,
      power5min: 280,
      power12min: 250,
      power20min: 235,
      criticalPower: 230,
    },
    goals: 'Tenir les pavés / vents · progresser endurance longue.',
    seasonObjectives: 'Finir 2 classiques · reprise charge progressive.',
    results: [
      { date: '2025-02-16', eventName: 'Boucles de la Mayenne', rank: 12, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_07`,
    firstName: 'Emma',
    lastName: 'Garcia',
    sex: Sex.FEMALE,
    birthDate: '1998-12-19',
    nationality: 'Espagne',
    heightCm: 171,
    weightKg: 59,
    profile: RiderQualitativeProfile.BAROUDEUR_PROFIL,
    rosterRole: 'principal',
    forme: FormeStatus.BON,
    moral: MoralStatus.ELEVEE,
    health: HealthCondition.PRET_A_COURIR,
    salary: 27000,
    power: {
      power1s: 1000,
      power5s: 840,
      power30s: 540,
      power1min: 390,
      power3min: 325,
      power5min: 300,
      power12min: 275,
      power20min: 258,
      criticalPower: 252,
    },
    goals: 'Échappées longues · présence médiatique équipe.',
    seasonObjectives: 'Prix de la combativité · 1 top 5 depuis échappée.',
    results: [
      { date: '2025-05-01', eventName: 'GP Sud-Ouest', rank: 6, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_08`,
    firstName: 'Chloé',
    lastName: 'Martin',
    sex: Sex.FEMALE,
    birthDate: '2005-02-27',
    nationality: 'France',
    heightCm: 166,
    weightKg: 53,
    profile: RiderQualitativeProfile.GRIMPEUR,
    rosterRole: 'reserve',
    forme: FormeStatus.BON,
    moral: MoralStatus.BON,
    health: HealthCondition.PRET_A_COURIR,
    salary: 18000,
    power: {
      power1s: 900,
      power5s: 750,
      power30s: 480,
      power1min: 350,
      power3min: 290,
      power5min: 265,
      power12min: 240,
      power20min: 225,
      criticalPower: 220,
    },
    goals: 'Intégration U23 → Elite · volumes structurés.',
    seasonObjectives: '10 jours de course · top 20 montagne.',
    results: [
      { date: '2025-08-24', eventName: 'Championnat Régional U23', rank: 2, category: 'U23' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_09`,
    firstName: 'Manon',
    lastName: 'Chevalier',
    sex: Sex.FEMALE,
    birthDate: '2001-06-11',
    nationality: 'France',
    heightCm: 174,
    weightKg: 64,
    profile: RiderQualitativeProfile.SPRINTEUR,
    rosterRole: 'reserve',
    forme: FormeStatus.MOYEN,
    moral: MoralStatus.NEUTRE,
    health: HealthCondition.BLESSURE_LEGERE,
    salary: 19000,
    power: {
      power1s: 1180,
      power5s: 980,
      power30s: 640,
      power1min: 420,
      power3min: 310,
      power5min: 275,
      power12min: 245,
      power20min: 230,
      criticalPower: 225,
    },
    goals: 'Retour blessure genou · garder la pointe sprint.',
    seasonObjectives: 'Reprise compétition juin · 1 top 5 sprint.',
    results: [
      { date: '2024-09-08', eventName: 'Critérium La Baule', rank: 3, category: 'Elite' },
    ],
  },
  {
    id: `${DEMO_PRES_PREFIX}rider_10`,
    firstName: 'Aïcha',
    lastName: 'Diallo',
    sex: Sex.FEMALE,
    birthDate: '2002-08-03',
    nationality: 'France',
    heightCm: 168,
    weightKg: 56,
    profile: RiderQualitativeProfile.COMPLET,
    rosterRole: 'reserve',
    forme: FormeStatus.BON,
    moral: MoralStatus.ELEVEE,
    health: HealthCondition.PRET_A_COURIR,
    salary: 21000,
    power: {
      power1s: 990,
      power5s: 810,
      power30s: 530,
      power1min: 385,
      power3min: 315,
      power5min: 288,
      power12min: 262,
      power20min: 248,
      criticalPower: 243,
    },
    goals: 'Polyvalence · apprendre le rôle d’équipière pro.',
    seasonObjectives: '15 jours de course · progresser tactique.',
    results: [
      { date: '2025-04-05', eventName: 'Classic Atlantique', rank: 9, category: 'Elite' },
    ],
  },
];

function buildRider(seed: RiderSeed, season: number): Rider {
  const email = `${seed.firstName}.${seed.lastName}@horizon-atlantique.demo`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z.@-]/g, '');

  return {
    id: seed.id,
    firstName: seed.firstName,
    lastName: seed.lastName,
    email,
    phone: `06 ${String(40 + RIDER_SEEDS.indexOf(seed)).padStart(2, '0')} 12 34 ${String(50 + RIDER_SEEDS.indexOf(seed)).padStart(2, '0')}`,
    birthDate: seed.birthDate,
    sex: seed.sex,
    nationality: seed.nationality,
    address: { ...HQ, city: seed.rosterRole === 'reserve' ? 'Angers' : 'Nantes' },
    heightCm: seed.heightCm,
    weightKg: seed.weightKg,
    uciId: `FRA${seed.birthDate.replace(/-/g, '').slice(2)}${RIDER_SEEDS.indexOf(seed) + 1}`,
    licenseNumber: `LIC-HA-${String(RIDER_SEEDS.indexOf(seed) + 1).padStart(3, '0')}`,
    teamName: DEMO_PRES_TEAM_NAME,
    salary: seed.salary,
    contractStartDate: `${season - 1}-11-01`,
    contractEndDate: `${season}-10-31`,
    contractType: ContractType.CDD,
    currentSeason: season,
    isActive: true,
    rosterRole: seed.rosterRole,
    qualitativeProfile: seed.profile,
    disciplines: [DisciplinePracticed.ROUTE],
    categories: seed.birthDate.startsWith('2004') || seed.birthDate.startsWith('2005') ? ['U23'] : ['Elite'],
    forme: seed.forme,
    moral: seed.moral,
    healthCondition: seed.health,
    favoriteRaces: [
      { id: `${seed.id}_fav1`, name: 'Tour de France Femmes', notes: 'Objectif A — calendrier prioritaire' },
      { id: `${seed.id}_fav2`, name: 'Paris–Roubaix Femmes', notes: 'Objectif B — classique pavée' },
    ],
    resultsHistory: seed.results.map((r, i) => ({
      id: `${seed.id}_res_${i}`,
      date: r.date,
      eventName: r.eventName,
      category: r.category,
      rank: r.rank,
      team: DEMO_PRES_TEAM_NAME,
      discipline: DisciplinePracticed.ROUTE,
      position: r.rank,
      season: r.date.slice(0, 4),
    })),
    teamsHistory: [
      {
        teamName: DEMO_PRES_TEAM_NAME,
        startDate: `${season - 1}-11-01`,
        status: 'Actif',
        role: 'Coureuse',
      },
    ],
    performanceGoals: seed.goals,
    physiquePerformanceProject: factor(
      'Bonne base aérobie et régularité des charges',
      'Puissance haute intensité en fin de course',
      'Résistance à la fatigue après 30–45 kJ/kg',
      '2 séances spécifiques fatigue / semaine'
    ),
    techniquePerformanceProject: factor(
      'Position stable · pédalage fluide',
      'Descente et placement peloton',
      'Technique de relais / lead-out',
      'Vidéo analyse 1× / mois avec entraîneur'
    ),
    mentalPerformanceProject: factor(
      'Motivation élevée · esprit d’équipe',
      'Gestion du stress en final',
      'Confiance sur les objectifs personnels',
      'Brief mental avant courses A'
    ),
    environnementPerformanceProject: factor(
      'Bonne intégration au groupe',
      'Sommeil en déplacement',
      'Équilibre vie perso / charge',
      'Check récupération J+1 avec staff'
    ),
    tactiquePerformanceProject: factor(
      'Compréhension du rôle en course',
      'Lecture des courses vallonnées',
      'Prise d’initiative contrôlée',
      'Débrief tactique post-course'
    ),
    seasonObjectives: seed.seasonObjectives,
    shortTermGoals: seed.seasonObjectives,
    mediumTermGoals: 'Stabiliser un niveau continental européen.',
    longTermGoals: 'Viser un calendrier WorldTour / partenaire premium.',
    allergies: [],
    performanceNutrition: emptyNutrition(),
    snack1: 'Banane + barre énergétique',
    snack2: 'Compote + riz cake',
    assistantInstructions: 'Hydratation prioritaire si T° > 25°C',
    roadBikeSetup: {
      ...emptyBike(),
      specifics: {
        ...emptyBike().specifics,
        tailleCadre: seed.heightCm >= 170 ? 'M' : 'S',
        plateau: '50/34',
        manivelle: '170',
        capteurPuissance: 'Assioma Duo',
      },
    },
    ttBikeSetup: emptyBike(),
    clothing: [
      { id: `${seed.id}_kit_race`, type: ClothingType.MAILLOT, quantity: 2, size: seed.heightCm >= 170 ? 'M' : 'S', brand: 'CyclePro', notes: 'Saison en cours' },
      { id: `${seed.id}_kit_train`, type: ClothingType.CUISSARD, quantity: 2, size: seed.heightCm >= 170 ? 'M' : 'S', brand: 'CyclePro' },
    ],
    powerProfileFresh: seed.power,
    powerProfile15KJ: scalePower(seed.power, -8),
    powerProfile30KJ: scalePower(seed.power, -15),
    powerProfile45KJ: scalePower(seed.power, -22),
    powerProfileHistory: {
      entries: [
        {
          id: `${seed.id}_hist_1`,
          date: `${season}-03-15`,
          powerProfileFresh: scalePower(seed.power, -4),
          weightKg: seed.weightKg + 0.5,
          notes: 'Test labo pré-saison',
        },
        {
          id: `${seed.id}_hist_2`,
          date: `${season}-05-20`,
          powerProfileFresh: seed.power,
          weightKg: seed.weightKg,
          notes: 'Pic de forme mi-saison',
        },
      ],
    },
    charSprint:
      seed.profile === RiderQualitativeProfile.SPRINTEUR
        ? 88
        : seed.profile === RiderQualitativeProfile.COMPLET
          ? 72
          : 55,
    charAnaerobic: seed.profile === RiderQualitativeProfile.PUNCHEUR ? 82 : 68,
    charPuncher: seed.profile === RiderQualitativeProfile.PUNCHEUR ? 90 : 70,
    charClimbing:
      seed.profile === RiderQualitativeProfile.GRIMPEUR
        ? 92
        : seed.profile === RiderQualitativeProfile.ROULEUR
          ? 60
          : 74,
    charRouleur:
      seed.profile === RiderQualitativeProfile.ROULEUR
        ? 90
        : seed.profile === RiderQualitativeProfile.SPRINTEUR
          ? 58
          : 72,
    generalPerformanceScore: 70 + Math.round((seed.power.criticalPower || 200) / 20),
    fatigueResistanceScore:
      seed.profile === RiderQualitativeProfile.ROULEUR ||
      seed.profile === RiderQualitativeProfile.COMPLET
        ? 78
        : 65,
    emergencyContactName: `Contact ${seed.lastName}`,
    emergencyContactPhone: '06 00 00 00 00',
  };
}

type StaffSeed = {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  sex: Sex;
  salary: number;
  skills: string[];
  summary: string;
};

const STAFF_SEEDS: StaffSeed[] = [
  {
    id: `${DEMO_PRES_PREFIX}staff_manager`,
    firstName: 'Claire',
    lastName: 'Armand',
    role: StaffRole.MANAGER,
    sex: Sex.FEMALE,
    salary: 48000,
    skills: ['Budget', 'Sponsoring', 'RH', 'UCI'],
    summary: 'Manager générale · 12 ans en structures continentales. Pilotage budget et partenaires.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_ds`,
    firstName: 'Marc',
    lastName: 'Delorme',
    role: StaffRole.DS,
    sex: Sex.MALE,
    salary: 42000,
    skills: ['Tactique', 'Course', 'Leadership', 'Radio'],
    summary: 'Directeur sportif · ancien pro. Spécialiste courses d’un jour et lead-out.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_assistant`,
    firstName: 'Sophie',
    lastName: 'Nguyen',
    role: StaffRole.ASSISTANT,
    sex: Sex.FEMALE,
    salary: 32000,
    skills: ['Logistique', 'Nutrition course', 'Hôtellerie'],
    summary: 'Assistante d’équipe · coordination hôtel, repas et timing permanence.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_mecano`,
    firstName: 'Julien',
    lastName: 'Faure',
    role: StaffRole.MECANO,
    sex: Sex.MALE,
    salary: 34000,
    skills: ['Groupe transmission', 'Roues', 'CLM', 'UCI compliance'],
    summary: 'Mécanicien chef · parc 22 vélos route + 8 CLM. Suivi usure et pressions.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_kine`,
    firstName: 'Élise',
    lastName: 'Morel',
    role: StaffRole.KINE,
    sex: Sex.FEMALE,
    salary: 36000,
    skills: ['Récupération', 'Blessures', 'Travel therapy'],
    summary: 'Kinésithérapeute · prévention genou/dos et récupération post-course.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_perf`,
    firstName: 'Thomas',
    lastName: 'Girard',
    role: StaffRole.RESP_PERF,
    sex: Sex.MALE,
    salary: 40000,
    skills: ['PPR', 'Charge', 'Fatigue', 'Tests'],
    summary: 'Responsable performance · suivi W/kg, durabilité et projets individuels.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_coach`,
    firstName: 'Anna',
    lastName: 'Keller',
    role: StaffRole.ENTRAINEUR,
    sex: Sex.FEMALE,
    salary: 38000,
    skills: ['Planification', 'Zones', 'Altitude'],
    summary: 'Entraîneure · plans individualisés et camps d’entraînement.',
  },
  {
    id: `${DEMO_PRES_PREFIX}staff_com`,
    firstName: 'Hugo',
    lastName: 'Blanc',
    role: StaffRole.COMMUNICATION,
    sex: Sex.MALE,
    salary: 30000,
    skills: ['Réseaux sociaux', 'Presse', 'Contenus'],
    summary: 'Chargé de communication · newsletters partenaires et story course.',
  },
];

function buildStaff(seed: StaffSeed, season: number): StaffMember {
  const email = `${seed.firstName}.${seed.lastName}@horizon-atlantique.demo`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z.@-]/g, '');
  return {
    id: seed.id,
    firstName: seed.firstName,
    lastName: seed.lastName,
    email,
    phone: '06 11 22 33 44',
    role: seed.role,
    status: StaffStatus.SALARIE,
    skills: seed.skills,
    professionalSummary: seed.summary,
    experienceYears: 8,
    certifications: seed.role === StaffRole.KINE ? ['DE Kinésithérapie', 'Sport santé'] : ['UCI Staff'],
    address: HQ,
    currentSeason: season,
    isActive: true,
    languages: [
      { id: `${seed.id}_lang_fr`, language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { id: `${seed.id}_lang_en`, language: 'Anglais', proficiency: LanguageProficiency.FLUENT },
    ],
    workHistory: [
      {
        id: `${seed.id}_wh1`,
        position: seed.role,
        company: DEMO_PRES_TEAM_NAME,
        startDate: `${season - 2}-11-01`,
        description: seed.summary,
      },
    ],
    education: [
      {
        id: `${seed.id}_edu1`,
        degree: 'Formation professionnelle sport',
        institution: 'INSEP / FFC',
        year: 2016,
      },
    ],
    salary: seed.salary,
    contractType: ContractType.CDI,
    birthDate: '1988-04-12',
    nationality: 'France',
    sex: seed.sex,
    seasonObjectives: `Assurer le dispositif ${seed.role} sur toute la saison ${season}.`,
    openToExternalMissions: false,
  };
}

function emptyRaceInfo(): RaceEvent['raceInfo'] {
  return {
    permanenceAddress: '',
    permanenceTime: '',
    permanenceDate: '',
    reunionDSTime: '',
    presentationTime: '',
    departFictifTime: '',
    departReelTime: '',
    arriveePrevueTime: '',
    distanceKm: 0,
    radioFrequency: '',
  };
}

export interface DemoPresentationPack {
  meta: {
    teamName: string;
    level: TeamLevel;
    primaryColor: string;
    accentColor: string;
    address: Address;
    season: number;
  };
  riders: Rider[];
  staff: StaffMember[];
  vehicles: Vehicle[];
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  eventBudgetItems: EventBudgetItem[];
  incomeItems: IncomeItem[];
  performanceEntries: PerformanceEntry[];
  extras: DemoPresentationExtras;
}

export function buildDemoPresentationPack(season = getCurrentSeasonYear(), teamId?: string): DemoPresentationPack {
  const riders = RIDER_SEEDS.map((s) => buildRider(s, season));
  const staff = STAFF_SEEDS.map((s) => buildStaff(s, season));

  const principalIds = riders.filter((r) => r.rosterRole === 'principal').map((r) => r.id);
  const startSix = principalIds.slice(0, 6);

  const dsId = `${DEMO_PRES_PREFIX}staff_ds`;
  const assistantId = `${DEMO_PRES_PREFIX}staff_assistant`;
  const mecanoId = `${DEMO_PRES_PREFIX}staff_mecano`;
  const kineId = `${DEMO_PRES_PREFIX}staff_kine`;
  const perfId = `${DEMO_PRES_PREFIX}staff_perf`;
  const comId = `${DEMO_PRES_PREFIX}staff_com`;
  const managerId = `${DEMO_PRES_PREFIX}staff_manager`;

  const eventClassicId = `${DEMO_PRES_PREFIX}event_classic`;
  const eventStageId = `${DEMO_PRES_PREFIX}event_bretagne`;
  const eventTrainId = `${DEMO_PRES_PREFIX}event_fontromeu`;
  const eventClmId = `${DEMO_PRES_PREFIX}event_clm`;
  const eventEarlyId = `${DEMO_PRES_PREFIX}event_early`;
  const eventMeetingId = `${DEMO_PRES_PREFIX}event_reunion`;
  const eventCoupeId = `${DEMO_PRES_PREFIX}event_coupe`;

  const vehicles: Vehicle[] = [
    {
      id: `${DEMO_PRES_PREFIX}veh_ds`,
      name: 'Voiture DS 1',
      licensePlate: 'HA-DS-01',
      driverId: dsId,
      vehicleType: VehicleType.VOITURE,
      seats: 5,
      estimatedDailyCost: 85,
      currentMileage: 62400,
      maintenanceHistory: [
        {
          id: `${DEMO_PRES_PREFIX}maint_1`,
          date: `${season}-02-10`,
          description: 'Révision 60 000 km + pneus course',
          cost: 780,
          mileage: 60120,
          garage: 'Nantes Auto Sport',
        },
      ],
      notes: 'Radio équipe + frigo gel',
    },
    {
      id: `${DEMO_PRES_PREFIX}veh_bus`,
      name: 'Minibus athlètes',
      licensePlate: 'HA-BUS-02',
      driverId: assistantId,
      vehicleType: VehicleType.MINIBUS,
      seats: 9,
      estimatedDailyCost: 120,
      currentMileage: 41200,
      maintenanceHistory: [],
      notes: '8 places coureuses + bagages',
    },
    {
      id: `${DEMO_PRES_PREFIX}veh_camion`,
      name: 'Camion atelier',
      licensePlate: 'HA-AT-03',
      driverId: mecanoId,
      vehicleType: VehicleType.CAMION,
      seats: 3,
      estimatedDailyCost: 150,
      currentMileage: 88000,
      maintenanceHistory: [],
      notes: 'Atelier mobile + 12 vélos',
    },
  ];


  const raceEvents: RaceEvent[] = [
    {
      id: eventClassicId,
      name: 'Classic Atlantique',
      date: `${season}-04-12`,
      startDate: `${season}-04-12`,
      endDate: `${season}-04-12`,
      location: 'La Baule (44)',
      eventType: EventType.COMPETITION,
      eligibleCategory: 'Elite / U23',
      discipline: Discipline.ROUTE,
      raceInfo: {
        ...emptyRaceInfo(),
        permanenceAddress: 'Palais des Congrès, La Baule',
        permanenceDate: `${season}-04-12`,
        permanenceTime: '09:00',
        reunionDSTime: '10:30',
        presentationTime: '12:45',
        departFictifTime: '13:15',
        departReelTime: '13:30',
        arriveePrevueTime: '17:10',
        distanceKm: 128,
        radioFrequency: '159.650',
      },
      operationalLogistics: [
        {
          id: `${eventClassicId}_log_1`,
          dayName: MealDay.SAMEDI,
          keyTimings: [
            {
              id: 't1',
              description: 'Petit-déj hôtel',
              time: '07:30',
              category: OperationalTimingCategory.REPAS,
            },
            {
              id: 't2',
              description: 'Départ parking hôtel',
              time: '08:15',
              category: OperationalTimingCategory.TRANSPORT,
            },
          ],
        },
      ],
      selectedRiderIds: startSix,
      selectedStaffIds: [dsId, assistantId, mecanoId, kineId, comId],
      selectedVehicleIds: vehicles.map((v) => v.id),
      checklistEmailSimulated: false,
      isLogisticsValidated: true,
      logisticsValidationDate: `${season}-04-05`,
      minRiders: 5,
      maxRiders: 6,
      organizerContact: {
        organizingEntity: 'Comité Atlantique Cyclisme',
        contactName: 'Paul Hébert',
        contactEmail: 'organisation@classic-atlantique.demo',
        contactPhone: '02 40 00 00 00',
      },
      managerId: [managerId],
      directeurSportifId: [dsId],
      assistantId: [assistantId],
      mecanoId: [mecanoId],
      kineId: [kineId],
      communicationId: [comId],
    },
    {
      id: eventStageId,
      name: 'Tour de Bretagne Femmes — Étapes 1-3',
      date: `${season}-05-20`,
      startDate: `${season}-05-20`,
      endDate: `${season}-05-22`,
      location: 'Saint-Brieuc → Quimper',
      eventType: EventType.COMPETITION,
      eligibleCategory: 'Elite',
      discipline: Discipline.ROUTE,
      raceInfo: {
        ...emptyRaceInfo(),
        permanenceAddress: 'Vélodrome Saint-Brieuc',
        permanenceDate: `${season}-05-19`,
        permanenceTime: '16:00',
        reunionDSTime: '18:00',
        distanceKm: 312,
        radioFrequency: '160.125',
        stageDays: [
          {
            id: `${eventStageId}_s1`,
            date: `${season}-05-20`,
            stageNumber: 1,
            stageLabel: 'Saint-Brieuc → Lannion',
            departLocation: 'Saint-Brieuc',
            arriveeLocation: 'Lannion',
            permanenceAddress: 'Mairie Saint-Brieuc',
            permanenceTime: '10:00',
            permanenceDate: `${season}-05-20`,
            reunionDSTime: '11:00',
            presentationTime: '12:30',
            departFictifTime: '13:00',
            departReelTime: '13:15',
            arriveePrevueTime: '16:40',
            distanceKm: 98,
            radioFrequency: '160.125',
          },
          {
            id: `${eventStageId}_s2`,
            date: `${season}-05-21`,
            stageNumber: 2,
            stageLabel: 'Lannion → Morlaix',
            departLocation: 'Lannion',
            arriveeLocation: 'Morlaix',
            permanenceAddress: 'Place Centrale Lannion',
            permanenceTime: '09:30',
            permanenceDate: `${season}-05-21`,
            reunionDSTime: '10:15',
            presentationTime: '11:45',
            departFictifTime: '12:15',
            departReelTime: '12:30',
            arriveePrevueTime: '16:10',
            distanceKm: 112,
            radioFrequency: '160.125',
          },
          {
            id: `${eventStageId}_s3`,
            date: `${season}-05-22`,
            stageNumber: 3,
            stageLabel: 'Morlaix → Quimper',
            departLocation: 'Morlaix',
            arriveeLocation: 'Quimper',
            permanenceAddress: 'Parking Morlaix Gare',
            permanenceTime: '09:00',
            permanenceDate: `${season}-05-22`,
            reunionDSTime: '09:45',
            presentationTime: '11:15',
            departFictifTime: '11:45',
            departReelTime: '12:00',
            arriveePrevueTime: '16:20',
            distanceKm: 102,
            radioFrequency: '160.125',
          },
        ],
      },
      operationalLogistics: [
        {
          id: `${eventStageId}_log_1`,
          dayName: MealDay.MARDI,
          keyTimings: [
            { id: 'b1', description: 'Petit-déj hôtel', time: '06:45', category: OperationalTimingCategory.REPAS },
            { id: 'b2', description: 'Transfert départ étape 1', time: '08:30', category: OperationalTimingCategory.TRANSPORT },
          ],
        },
      ],
      selectedRiderIds: principalIds.slice(0, 7),
      selectedStaffIds: [dsId, assistantId, mecanoId, kineId, perfId, comId, managerId],
      selectedVehicleIds: vehicles.map((v) => v.id),
      checklistEmailSimulated: false,
      isLogisticsValidated: true,
      minRiders: 6,
      maxRiders: 7,
      directeurSportifId: [dsId],
      assistantId: [assistantId],
      mecanoId: [mecanoId],
      kineId: [kineId],
      respPerfId: [perfId],
      communicationId: [comId],
      managerId: [managerId],
    },
    {
      id: eventTrainId,
      name: 'Stage altitude Font-Romeu',
      date: `${season}-07-05`,
      startDate: `${season}-07-05`,
      endDate: `${season}-07-18`,
      location: 'Font-Romeu (66)',
      eventType: EventType.STAGE,
      eligibleCategory: 'Tout effectif',
      discipline: Discipline.ROUTE,
      raceInfo: emptyRaceInfo(),
      operationalLogistics: [],
      selectedRiderIds: riders.map((r) => r.id),
      selectedStaffIds: [dsId, assistantId, mecanoId, kineId, perfId, `${DEMO_PRES_PREFIX}staff_coach`],
      selectedVehicleIds: [vehicles[1].id, vehicles[2].id],
      checklistEmailSimulated: false,
      isLogisticsValidated: false,
      minRiders: 8,
      maxRiders: 12,
      directeurSportifId: [dsId],
      entraineurId: [`${DEMO_PRES_PREFIX}staff_coach`],
      respPerfId: [perfId],
      kineId: [kineId],
      mecanoId: [mecanoId],
      assistantId: [assistantId],
      altitudeCampMeta: {
        isAltitudeCamp: true,
        isHeatCamp: true,
        altitudeMeters: 1800,
        sleepingAltitudeMeters: 1800,
        protocol: 'live_high_train_high',
        heatProtocol: 'combined_heat_altitude',
        targetTemperatureC: 32,
        targetHumidityPercent: 35,
        heatSessionMinutes: 40,
        hypoxiaNotes:
          'J1–J3 charge légère · cible SpO₂ matin ≥ 92 % · hydratation ≥ 3,5 L/j · USG (réfractomètre) cible ≤ 1.020 · fer / sommeil prioritaire.',
        heatNotes:
          'Sessions chaleur progressive · sodium + hydratation · pas de sauna si céphalées / USG > 1.025.',
        focusNotes: 'Volume aérobie + adaptation altitude/chaleur · tests PPR mi-stage (J7).',
      },
      campAthleteAltitudeRefs: riders.slice(0, 4).map((r, i) => ({
        riderId: r.id,
        referenceAltitudeMeters: i === 1 ? 2800 : i === 2 ? 2500 : 1800,
        hypoxicSetup: (i === 1 ? 'tent' : i === 2 ? 'chamber' : 'natural') as
          | 'tent'
          | 'chamber'
          | 'natural',
        heatSetup: (i === 0 ? 'sauna' : i === 3 ? 'chamber' : 'none') as
          | 'sauna'
          | 'chamber'
          | 'none',
        heatTargetTemperatureC: i === 0 ? 80 : i === 3 ? 35 : undefined,
        heatExposureMinutes: i === 0 ? 20 : i === 3 ? 40 : undefined,
        notes:
          i === 1
            ? 'Tente nuit · cible ~2800 m équivalent'
            : i === 2
              ? 'Chambre hypoxique 8 h/nuit'
              : i === 0
                ? 'Sauna post-séance 3×/sem'
                : undefined,
      })),
      campAthleteDailyMetrics: riders.slice(0, 4).flatMap((r, i) => [
        {
          id: `${DEMO_PRES_PREFIX}camp_m_${i}_d1`,
          riderId: r.id,
          date: `${season}-07-05`,
          referenceAltitudeMeters: i === 1 ? 2800 : i === 2 ? 2500 : 1800,
          ambientTemperatureC: 28 + i,
          heatExposureMinutes: i === 0 ? 20 : undefined,
          hrvMs: 58 + i * 3,
          restingHrBpm: 48 + i,
          spo2Percent: 93 - (i % 2),
          weightKg: 54 + i * 1.2,
          hydrationLiters: 3.2 + i * 0.1,
          urineColor: 2 + (i % 2),
          urineSpecificGravity: Number((1.012 + i * 0.004).toFixed(3)),
          sleepHours: 7.5,
          sleepQuality: 4,
          fatigue: 2 + (i % 2),
          mood: 4,
          muscleSoreness: 2,
          headache: i === 2,
          appetite: 3,
          sessionType: 'recovery' as const,
          trainingLoad: 45,
          rpe: 3,
          coachNotes: i === 2 ? 'Céphalées J1 — surveillance SpO₂ + hydratation.' : undefined,
        },
        {
          id: `${DEMO_PRES_PREFIX}camp_m_${i}_d2`,
          riderId: r.id,
          date: `${season}-07-06`,
          referenceAltitudeMeters: i === 1 ? 2600 : undefined,
          hrvMs: 55 + i * 2,
          restingHrBpm: 49 + i,
          spo2Percent: 94,
          weightKg: 53.8 + i * 1.2,
          hydrationLiters: 3.6,
          urineColor: 2,
          urineSpecificGravity: Number((1.01 + (i === 2 ? 0.016 : i * 0.003)).toFixed(3)),
          sleepHours: 8,
          sleepQuality: 4,
          fatigue: 2,
          mood: 4,
          muscleSoreness: 2,
          headache: false,
          appetite: 4,
          sessionType: 'endurance' as const,
          trainingLoad: 120,
          rpe: 5,
        },
      ]),
      campAthleteTests: [
        {
          id: `${DEMO_PRES_PREFIX}camp_test_pma`,
          riderId: riders[0].id,
          date: `${season}-07-06`,
          testType: 'power' as 'power',
          label: 'PMA 5′',
          powerWatts: 320,
          durationSec: 300,
          protocolKind: 'continuous' as 'continuous',
          heartRateBpm: 178,
          protocolNotes: 'Warm-up 20′ · altitude site 1800 m',
          resultNotes: 'Bonne stabilité cadence',
        },
        {
          id: `${DEMO_PRES_PREFIX}camp_test_lac`,
          riderId: riders[1].id,
          date: `${season}-07-06`,
          testType: 'lactate' as 'lactate',
          label: 'Profil lactate (LT1 / LT2)',
          lt1Mmol: 2.0,
          lt1PowerWatts: 210,
          lt1HeartRateBpm: 148,
          lt2Mmol: 3.8,
          lt2PowerWatts: 245,
          lt2HeartRateBpm: 168,
          vlMax: 0.62,
          lactateClearance: 48,
          lactateClearanceUnit: '%',
          lactateMmol: 8.4,
          lactateRestMmol: 1.1,
          restingHeartRateBpm: 46,
          heartRateBpm: 184,
          durationSec: 1800,
          protocolKind: 'steps' as 'steps',
          stepCount: 6,
          stepDurationSec: 180,
          recoveryDurationSec: 60,
          stepIncrementWatts: 20,
          resultNotes: 'LT2 un peu bas J2 — surveillance charge',
        },
      ],
    },
    {
      id: eventEarlyId,
      name: 'Grand Prix de Loire-Atlantique',
      date: `${season}-03-08`,
      startDate: `${season}-03-08`,
      endDate: `${season}-03-08`,
      location: 'Ancenis (44)',
      eventType: EventType.COMPETITION,
      eligibleCategory: 'Elite',
      discipline: Discipline.ROUTE,
      raceInfo: {
        ...emptyRaceInfo(),
        permanenceAddress: 'Stade d\'Ancenis',
        permanenceDate: `${season}-03-08`,
        permanenceTime: '09:00',
        reunionDSTime: '10:00',
        distanceKm: 118,
        radioFrequency: '160.100',
      },
      operationalLogistics: [],
      selectedRiderIds: principalIds.slice(0, 6),
      selectedStaffIds: [dsId, assistantId, mecanoId, kineId],
      selectedVehicleIds: [vehicles[0].id, vehicles[1].id],
      checklistEmailSimulated: false,
      isLogisticsValidated: true,
      minRiders: 5,
      maxRiders: 6,
      directeurSportifId: [dsId],
      assistantId: [assistantId],
      mecanoId: [mecanoId],
      kineId: [kineId],
    },
    {
      id: eventClmId,
      name: 'CLM par équipes — Challenge Atlantique',
      date: `${season}-06-14`,
      startDate: `${season}-06-14`,
      endDate: `${season}-06-14`,
      location: 'Les Sables-d\'Olonne',
      eventType: EventType.COMPETITION,
      eligibleCategory: 'Elite',
      discipline: Discipline.ROUTE,
      raceInfo: {
        ...emptyRaceInfo(),
        permanenceAddress: 'Casino des Sables',
        permanenceDate: `${season}-06-14`,
        permanenceTime: '08:00',
        reunionDSTime: '08:45',
        distanceKm: 28,
        radioFrequency: '160.150',
      },
      operationalLogistics: [],
      selectedRiderIds: principalIds.slice(0, 6),
      selectedStaffIds: [dsId, assistantId, mecanoId, perfId, comId],
      selectedVehicleIds: vehicles.map((v) => v.id),
      checklistEmailSimulated: false,
      isLogisticsValidated: true,
      minRiders: 4,
      maxRiders: 6,
      directeurSportifId: [dsId],
      mecanoId: [mecanoId],
      respPerfId: [perfId],
    },
    {
      id: eventCoupeId,
      name: 'Coupe de France — Manche Ouest',
      date: `${season}-08-23`,
      startDate: `${season}-08-23`,
      endDate: `${season}-08-23`,
      location: 'Vannes (56)',
      eventType: EventType.COMPETITION,
      eligibleCategory: 'Elite',
      discipline: Discipline.ROUTE,
      raceInfo: {
        ...emptyRaceInfo(),
        permanenceAddress: 'Parc du Golfe',
        permanenceDate: `${season}-08-23`,
        permanenceTime: '09:30',
        reunionDSTime: '10:30',
        distanceKm: 126,
        radioFrequency: '160.175',
      },
      operationalLogistics: [],
      selectedRiderIds: principalIds,
      selectedStaffIds: [dsId, assistantId, mecanoId, kineId, perfId, comId, managerId],
      selectedVehicleIds: vehicles.map((v) => v.id),
      checklistEmailSimulated: false,
      isLogisticsValidated: false,
      minRiders: 6,
      maxRiders: 7,
      directeurSportifId: [dsId],
      managerId: [managerId],
    },
    {
      id: eventMeetingId,
      name: 'Réunion staff mi-saison + bilan partenaires',
      date: `${season}-06-02`,
      startDate: `${season}-06-02`,
      endDate: `${season}-06-02`,
      location: 'Nantes — Siège Horizon Atlantique',
      eventType: EventType.ENTRAINEMENT,
      eligibleCategory: 'Staff',
      discipline: Discipline.ROUTE,
      raceInfo: emptyRaceInfo(),
      operationalLogistics: [],
      selectedRiderIds: [],
      selectedStaffIds: staff.map((s) => s.id),
      selectedVehicleIds: [],
      checklistEmailSimulated: false,
      isLogisticsValidated: true,
      minRiders: 0,
      maxRiders: 0,
      managerId: [managerId],
    },
  ];

  const riderEventSelections: RiderEventSelection[] = [
    ...startSix.map((riderId, i) => ({
      id: `${DEMO_PRES_PREFIX}sel_classic_${i}`,
      eventId: eventClassicId,
      riderId,
      status: RiderEventStatus.TITULAIRE,
      riderPreference: RiderEventPreference.VEUT_PARTICIPER,
      riderObjectives: i === 0 ? 'GC / classement général' : i === 1 ? 'Sprint final' : 'Travail d’équipe',
    })),
    ...principalIds.slice(0, 7).map((riderId, i) => ({
      id: `${DEMO_PRES_PREFIX}sel_bzh_${i}`,
      eventId: eventStageId,
      riderId,
      status: RiderEventStatus.TITULAIRE,
      riderPreference: RiderEventPreference.VEUT_PARTICIPER,
      riderObjectives: i < 2 ? 'Classement général' : 'Équipière / échappée',
    })),
    ...riders.map((r, i) => ({
      id: `${DEMO_PRES_PREFIX}sel_font_${i}`,
      eventId: eventTrainId,
      riderId: r.id,
      status: RiderEventStatus.TITULAIRE,
      riderPreference: RiderEventPreference.VEUT_PARTICIPER,
      riderObjectives: 'Adaptation altitude + volume aérobie',
    })),
    ...principalIds.slice(0, 6).map((riderId, i) => ({
      id: `${DEMO_PRES_PREFIX}sel_early_${i}`,
      eventId: eventEarlyId,
      riderId,
      status: RiderEventStatus.TITULAIRE,
      riderPreference: RiderEventPreference.VEUT_PARTICIPER,
      riderObjectives: 'Première course saison',
    })),
    ...principalIds.slice(0, 6).map((riderId, i) => ({
      id: `${DEMO_PRES_PREFIX}sel_clm_${i}`,
      eventId: eventClmId,
      riderId,
      status: RiderEventStatus.TITULAIRE,
      riderPreference: RiderEventPreference.VEUT_PARTICIPER,
      riderObjectives: 'CLM équipe — rythme stable',
    })),
  ];

  const eventBudgetItems: EventBudgetItem[] = [
    {
      id: `${DEMO_PRES_PREFIX}bud_1`,
      eventId: eventClassicId,
      category: BudgetItemCategory.HEBERGEMENT,
      description: 'Hôtel 2 nuits × 12 personnes',
      estimatedCost: 2880,
      actualCost: 2760,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_2`,
      eventId: eventClassicId,
      category: BudgetItemCategory.REPAS,
      description: 'Repas équipe + collations course',
      estimatedCost: 960,
      actualCost: 1010,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_3`,
      eventId: eventClassicId,
      category: BudgetItemCategory.TRANSPORT,
      description: 'Carburant + péages (3 véhicules)',
      estimatedCost: 420,
      actualCost: 455,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_4`,
      eventId: eventClassicId,
      category: BudgetItemCategory.FRAIS_COURSE,
      description: 'Engagements UCI + licences course',
      estimatedCost: 650,
      actualCost: 650,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_5`,
      eventId: eventStageId,
      category: BudgetItemCategory.HEBERGEMENT,
      description: '3 nuits étape Bretagne',
      estimatedCost: 4200,
      actualCost: 4100,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_6`,
      eventId: eventStageId,
      category: BudgetItemCategory.VOITURE_EQUIPE,
      description: 'Location renfort utilitaire',
      estimatedCost: 380,
      actualCost: 380,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_7`,
      eventId: eventStageId,
      category: BudgetItemCategory.REPAS,
      description: 'Repas 3 jours Bretagne',
      estimatedCost: 2100,
      actualCost: 1980,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_8`,
      eventId: eventStageId,
      category: BudgetItemCategory.TRANSPORT,
      description: 'Carburant + péages Bretagne',
      estimatedCost: 520,
      actualCost: 545,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_9`,
      eventId: eventTrainId,
      category: BudgetItemCategory.HEBERGEMENT,
      description: 'Résidence altitude 14 nuits',
      estimatedCost: 9800,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_10`,
      eventId: eventTrainId,
      category: BudgetItemCategory.REPAS,
      description: 'Courses alimentaires stage',
      estimatedCost: 3200,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_11`,
      eventId: eventTrainId,
      category: BudgetItemCategory.POLE_PERFORMANCE,
      description: 'Tests lactate + matériel SpO₂',
      estimatedCost: 650,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_12`,
      eventId: eventClmId,
      category: BudgetItemCategory.FRAIS_COURSE,
      description: 'Engagement CLM + licences',
      estimatedCost: 420,
      actualCost: 420,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_13`,
      eventId: eventEarlyId,
      category: BudgetItemCategory.FRAIS_COURSE,
      description: 'Engagement GP Loire-Atlantique',
      estimatedCost: 280,
      actualCost: 280,
    },
    {
      id: `${DEMO_PRES_PREFIX}bud_14`,
      eventId: eventCoupeId,
      category: BudgetItemCategory.HEBERGEMENT,
      description: 'Hôtel Vannes (prévision)',
      estimatedCost: 2400,
    },
  ];

  const incomeItems: IncomeItem[] = [
    {
      id: `${DEMO_PRES_PREFIX}inc_sponsor`,
      description: 'Sponsoring titre — Atlantique Énergies',
      amount: 120000,
      date: `${season}-01-15`,
      category: IncomeCategory.SPONSORING,
      sponsorCompanyName: 'Atlantique Énergies',
      sponsorshipContactName: 'Isabelle Vernet',
      sponsorshipContactEmail: 'i.vernet@atlantique-energies.demo',
      sponsorshipContactPhone: '02 51 00 00 00',
      sponsorshipContractStart: `${season}-01-01`,
      sponsorshipContractEnd: `${season}-12-31`,
      partnershipCounterparts: 'Logo maillot + véhicules + 4 posts / mois + hospitality 2 courses',
      partnershipDeliverables: [
        {
          id: `${DEMO_PRES_PREFIX}del_1`,
          label: 'Logo maillot saison',
          status: CounterpartDeliverableStatus.DELIVERED,
        },
        {
          id: `${DEMO_PRES_PREFIX}del_2`,
          label: 'Hospitality Classic Atlantique',
          status: CounterpartDeliverableStatus.IN_PROGRESS,
        },
        {
          id: `${DEMO_PRES_PREFIX}del_3`,
          label: 'Rapport visibilité S1',
          status: CounterpartDeliverableStatus.PLANNED,
        },
      ],
      notes: 'Partenaire titre — pack présentation',
    },
    {
      id: `${DEMO_PRES_PREFIX}inc_subv`,
      description: 'Subvention Région Pays de la Loire',
      amount: 35000,
      date: `${season}-02-01`,
      category: IncomeCategory.SUBVENTIONS,
      notes: 'Aide structure sportive régionale',
    },
    {
      id: `${DEMO_PRES_PREFIX}inc_equip`,
      description: 'Partenariat équipementier — CyclePro Gear',
      amount: 28000,
      date: `${season}-01-20`,
      category: IncomeCategory.SPONSORING,
      sponsorCompanyName: 'CyclePro Gear',
      sponsorshipContactName: 'Marc Lefort',
      sponsorshipContactEmail: 'm.lefort@cyclepro.demo',
      sponsorshipContractStart: `${season}-01-01`,
      sponsorshipContractEnd: `${season}-12-31`,
      partnershipCounterparts: 'Dotation textile + roues + atelier',
      partnershipDeliverables: [
        { id: `${DEMO_PRES_PREFIX}del_eq1`, label: 'Livraison maillots S1', status: CounterpartDeliverableStatus.DELIVERED },
        { id: `${DEMO_PRES_PREFIX}del_eq2`, label: 'Roues carbone réserve', status: CounterpartDeliverableStatus.IN_PROGRESS },
      ],
    },
    {
      id: `${DEMO_PRES_PREFIX}inc_prize`,
      description: 'Primes courses S1 (Classic + Bretagne)',
      amount: 4500,
      date: `${season}-05-25`,
      category: IncomeCategory.AUTRE,
      notes: 'Primes classement + étape',
    },
  ];

  const performanceEntries: PerformanceEntry[] = [
    {
      id: `${DEMO_PRES_PREFIX}perf_classic`,
      eventId: eventClassicId,
      date: `${season}-04-12`,
      generalObjectives: 'Protéger Inès pour le sprint · Léa libre sur la côte finale.',
      resultsSummary: '2e au sprint (Inès Bernard) · 7e Léa Moreau · équipe très présente.',
      keyLearnings: 'Lead-out à peaufiner dans les 800 derniers mètres · bonne gestion du vent.',
      raceOverallRanking: '2e',
      teamRiderRankings: 'Bernard 2 · Moreau 7 · Rousseau 14 · Petit 18 · Dupont 22 · Garcia 25',
      dsGeneralFeedback:
        'Belle course collective. Prochaine priorités : timing lead-out et hydratation finale.',
    },
    {
      id: `${DEMO_PRES_PREFIX}perf_early`,
      eventId: eventEarlyId,
      date: `${season}-03-08`,
      generalObjectives: 'Première course · rythme collectif · pas de prise de risque inutile.',
      resultsSummary: '12e Léa · 15e Inès · 4 coureuses dans le top 30 — entrée en matière solide.',
      keyLearnings: 'Communication radio à densifier · alimentation J-1 à standardiser.',
      raceOverallRanking: '12e',
      teamRiderRankings: 'Moreau 12 · Bernard 15 · Rousseau 22 · Petit 28',
      dsGeneralFeedback: 'Bonne base · monter l’intensité avant Classic Atlantique.',
    },
    {
      id: `${DEMO_PRES_PREFIX}perf_bzh`,
      eventId: eventStageId,
      date: `${season}-05-22`,
      generalObjectives: 'GC pour Léa · sprints d’étape pour Inès · protéger les jeunes.',
      resultsSummary: '5e au GC (Léa) · 1 victoire d’étape (Inès, étape 2) · esprit d’équipe excellent.',
      keyLearnings: 'Gestion 3 jours OK · attention récupération étape 3.',
      raceOverallRanking: '5e GC',
      teamRiderRankings: 'Moreau 5 GC · Bernard 1e étape 2 · Rousseau 18 GC',
      dsGeneralFeedback: 'Meilleure course étape de la saison à ce stade.',
    },
  ];

  const extras = buildDemoPresentationExtras({
    season,
    teamId,
    eventClassicId,
    eventStageId,
    eventTrainId,
    eventClmId,
    eventEarlyId,
    eventMeetingId,
    startSix,
    principalIds,
    riderIds: riders.map((r) => r.id),
    staffIds: {
      manager: managerId,
      ds: dsId,
      assistant: assistantId,
      mecano: mecanoId,
      kine: kineId,
      perf: perfId,
      coach: `${DEMO_PRES_PREFIX}staff_coach`,
      com: comId,
    },
    vehicleIds: {
      ds: vehicles[0].id,
      bus: vehicles[1].id,
      truck: vehicles[2].id,
    },
  });

  return {
    meta: {
      teamName: DEMO_PRES_TEAM_NAME,
      level: DEMO_PRES_LEVEL,
      primaryColor: DEMO_PRES_PRIMARY,
      accentColor: DEMO_PRES_ACCENT,
      address: HQ,
      season,
    },
    riders,
    staff,
    vehicles,
    raceEvents,
    riderEventSelections,
    eventBudgetItems,
    incomeItems,
    performanceEntries,
    extras,
  };
}

export function countDemoPresentationEntities(pack: DemoPresentationPack): number {
  return (
    pack.riders.length +
    pack.staff.length +
    pack.vehicles.length +
    pack.raceEvents.length +
    pack.riderEventSelections.length +
    pack.eventBudgetItems.length +
    pack.incomeItems.length +
    pack.performanceEntries.length +
    countDemoPresentationExtras(pack.extras)
  );
}

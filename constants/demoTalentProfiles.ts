import {
  DisciplinePracticed,
  PowerProfile,
  ResultItem,
  RiderQualitativeProfile,
  ScoutingProfile,
  ScoutingStatus,
  Sex,
  User,
  UserRole,
} from '../types';

const demoId = () => `demo_${Date.now().toString(36)}`;

/** Profils fictifs pour tester la recherche recrutement en développement */
export const DEMO_TALENT_PROFILES: User[] = [
  {
    id: 'demo_talent_route_1',
    email: 'demo.camille.bernard@logicycle.dev',
    firstName: 'Camille',
    lastName: 'Bernard',
    permissionRole: 'Athlète' as User['permissionRole'],
    userRole: UserRole.COUREUR,
    isSearchable: true,
    qualitativeProfile: RiderQualitativeProfile.GRIMPEUR,
    disciplines: [DisciplinePracticed.ROUTE],
    categories: ['U23'],
    signupInfo: {
      birthDate: '2002-04-12',
      sex: Sex.FEMALE,
      nationality: 'FR',
      heightCm: 168,
      weightKg: 54,
    },
  },
  {
    id: 'demo_talent_vtt_1',
    email: 'demo.lucas.martin@logicycle.dev',
    firstName: 'Lucas',
    lastName: 'Martin',
    permissionRole: 'Athlète' as User['permissionRole'],
    userRole: UserRole.COUREUR,
    isSearchable: true,
    qualitativeProfile: RiderQualitativeProfile.ROULEUR,
    disciplines: [DisciplinePracticed.VTT],
    categories: ['Elite'],
    signupInfo: {
      birthDate: '1998-09-03',
      sex: Sex.MALE,
      nationality: 'FR',
      heightCm: 182,
      weightKg: 71,
    },
  },
  {
    id: 'demo_talent_cx_1',
    email: 'demo.emma.dubois@logicycle.dev',
    firstName: 'Emma',
    lastName: 'Dubois',
    permissionRole: 'Athlète' as User['permissionRole'],
    userRole: UserRole.COUREUR,
    isSearchable: true,
    qualitativeProfile: RiderQualitativeProfile.PUNCHEUR,
    disciplines: [DisciplinePracticed.CYCLO_CROSS],
    categories: ['Elite'],
    signupInfo: {
      birthDate: '2000-01-28',
      sex: Sex.FEMALE,
      nationality: 'BE',
      heightCm: 172,
      weightKg: 62,
    },
  },
  {
    id: 'demo_talent_piste_1',
    email: 'demo.theo.leroy@logicycle.dev',
    firstName: 'Théo',
    lastName: 'Leroy',
    permissionRole: 'Athlète' as User['permissionRole'],
    userRole: UserRole.COUREUR,
    isSearchable: true,
    qualitativeProfile: RiderQualitativeProfile.SPRINTEUR,
    disciplines: [DisciplinePracticed.PISTE],
    categories: ['Elite'],
    signupInfo: {
      birthDate: '1999-11-15',
      sex: Sex.MALE,
      nationality: 'FR',
      heightCm: 178,
      weightKg: 78,
    },
  },
  {
    id: 'demo_talent_route_2',
    email: 'demo.sarah.petit@logicycle.dev',
    firstName: 'Sarah',
    lastName: 'Petit',
    permissionRole: 'Athlète' as User['permissionRole'],
    userRole: UserRole.COUREUR,
    isSearchable: true,
    qualitativeProfile: RiderQualitativeProfile.CLASSIQUE,
    disciplines: [DisciplinePracticed.ROUTE],
    categories: ['Open'],
    signupInfo: {
      birthDate: '1995-06-08',
      sex: Sex.FEMALE,
      nationality: 'FR',
      heightCm: 165,
      weightKg: 58,
    },
  },
  {
    id: 'demo_talent_autre_1',
    email: 'demo.nina.rodriguez@logicycle.dev',
    firstName: 'Nina',
    lastName: 'Rodriguez',
    permissionRole: 'Athlète' as User['permissionRole'],
    userRole: UserRole.COUREUR,
    isSearchable: true,
    qualitativeProfile: RiderQualitativeProfile.AUTRE,
    disciplines: [DisciplinePracticed.AUTRE],
    categories: ['Elite'],
    signupInfo: {
      birthDate: '2001-03-22',
      sex: Sex.FEMALE,
      nationality: 'ES',
      heightCm: 170,
      weightKg: 60,
    },
  },
];

export const DISCIPLINE_FILTER_LABELS: Record<DisciplinePracticed, string> = {
  [DisciplinePracticed.ROUTE]: '🚴 Route',
  [DisciplinePracticed.VTT]: '🚵 VTT',
  [DisciplinePracticed.CYCLO_CROSS]: '🌧️ Cyclo-cross',
  [DisciplinePracticed.PISTE]: '🏟️ Piste',
  [DisciplinePracticed.GRAVEL]: '🪨 Gravel',
  [DisciplinePracticed.AUTRE]: '⚙️ Autre',
};

export function isDemoTalentUser(userId: string): boolean {
  return userId.startsWith('demo_talent_');
}

type DemoExtras = {
  potentialRating: number;
  chars: { charSprint: number; charAnaerobic: number; charPuncher: number; charClimbing: number; charRouleur: number };
  powerProfileFresh: PowerProfile;
  resultsHistory: ResultItem[];
  pcsUrl?: string;
  scoutingNotes: string;
  careerObjective?: string;
};

export const DEMO_EXTRAS: Record<string, DemoExtras> = {
  demo_talent_route_1: {
    potentialRating: 4,
    chars: { charSprint: 62, charAnaerobic: 78, charPuncher: 74, charClimbing: 88, charRouleur: 70 },
    powerProfileFresh: { power5s: 820, power1min: 420, power5min: 340, power20min: 295, criticalPower: 290 },
    resultsHistory: [
      { id: 'd1', date: '2025-08-14', eventName: 'Tour de l\'Avenir — étape 3', category: 'U23', rank: 3, discipline: DisciplinePracticed.ROUTE },
      { id: 'd2', date: '2025-06-02', eventName: 'Classique des Alpes', category: 'U23', rank: 8, discipline: DisciplinePracticed.ROUTE },
    ],
    pcsUrl: 'https://www.procyclingstats.com/rider/camille-bernard/example',
    scoutingNotes: 'Profil exemple — grimpeuse U23, bonne régularité en stage.',
    careerObjective: 'Viser un contrat ProTour et une sélection sur le Tour de l\'Avenir.',
  },
  demo_talent_vtt_1: {
    potentialRating: 3,
    chars: { charSprint: 70, charAnaerobic: 72, charPuncher: 68, charClimbing: 75, charRouleur: 82 },
    powerProfileFresh: { power5s: 950, power1min: 480, power5min: 360, power20min: 310, criticalPower: 305 },
    resultsHistory: [
      { id: 'd3', date: '2025-07-20', eventName: 'Coupe de France VTT XCO', category: 'Elite', rank: 12, discipline: DisciplinePracticed.VTT },
    ],
    scoutingNotes: 'Profil exemple — spécialiste XCO, bon relance.',
    careerObjective: 'Intégrer une structure UCI WorldTeam VTT et performer aux Mondiaux.',
  },
  demo_talent_cx_1: {
    potentialRating: 4,
    chars: { charSprint: 85, charAnaerobic: 80, charPuncher: 82, charClimbing: 65, charRouleur: 60 },
    powerProfileFresh: { power5s: 980, power1min: 510, power5min: 350, power20min: 300, criticalPower: 295 },
    resultsHistory: [
      { id: 'd4', date: '2025-01-12', eventName: 'Superprestige Hoogstraten', category: 'Elite', rank: 6, discipline: DisciplinePracticed.CYCLO_CROSS },
    ],
    scoutingNotes: 'Profil exemple — puncheuse CX, début de saison solide.',
    careerObjective: 'Gagner une manche Superprestige et viser les Championnats du monde.',
  },
  demo_talent_piste_1: {
    potentialRating: 3,
    chars: { charSprint: 92, charAnaerobic: 88, charPuncher: 75, charClimbing: 45, charRouleur: 55 },
    powerProfileFresh: { power5s: 1450, power1min: 720, power5min: 380, power20min: 320, criticalPower: 315 },
    resultsHistory: [
      { id: 'd5', date: '2025-02-08', eventName: 'Championnats de France Piste — Omnium', category: 'Elite', rank: 2, discipline: DisciplinePracticed.PISTE },
    ],
    scoutingNotes: 'Profil exemple — sprinteur piste, à suivre en omnium.',
    careerObjective: 'Qualification JO et podium aux Championnats d\'Europe piste.',
  },
  demo_talent_route_2: {
    potentialRating: 3,
    chars: { charSprint: 68, charAnaerobic: 70, charPuncher: 72, charClimbing: 66, charRouleur: 85 },
    powerProfileFresh: { power5s: 880, power1min: 450, power5min: 355, power20min: 305, criticalPower: 300 },
    resultsHistory: [
      { id: 'd6', date: '2025-05-18', eventName: 'Paris-Roubaix Espoirs', category: 'Open', rank: 15, discipline: DisciplinePracticed.ROUTE },
    ],
    scoutingNotes: 'Profil exemple — flahute, résistant aux classiques.',
    careerObjective: 'Rejoindre une équipe Pro Continental et viser Paris-Roubaix.',
  },
  demo_talent_autre_1: {
    potentialRating: 2,
    chars: { charSprint: 60, charAnaerobic: 65, charPuncher: 62, charClimbing: 58, charRouleur: 68 },
    powerProfileFresh: { power5s: 750, power1min: 390, power5min: 320, power20min: 280, criticalPower: 275 },
    resultsHistory: [],
    scoutingNotes: 'Profil exemple — profil polyvalent en développement.',
    careerObjective: 'Trouver une équipe nationale UCI et consolider un palmarès continental.',
  },
};

export function getDemoCareerObjective(userId: string): string | undefined {
  return DEMO_EXTRAS[userId]?.careerObjective;
}

export function demoUserToScoutingProfile(user: User): ScoutingProfile {
  const extras = DEMO_EXTRAS[user.id] ?? DEMO_EXTRAS.demo_talent_route_1;
  return {
    id: `demo_preview_${demoId()}`,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: user.signupInfo?.birthDate,
    sex: user.signupInfo?.sex,
    nationality: user.signupInfo?.nationality,
    heightCm: user.signupInfo?.heightCm,
    weightKg: user.signupInfo?.weightKg,
    qualitativeProfile: user.qualitativeProfile ?? RiderQualitativeProfile.AUTRE,
    categories: user.categories ?? [],
    status: ScoutingStatus.TO_WATCH,
    potentialRating: extras.potentialRating,
    discipline: user.disciplines?.[0] ?? DisciplinePracticed.ROUTE,
    allergies: [],
    powerProfileFresh: extras.powerProfileFresh,
    powerProfile15KJ: extras.powerProfileFresh,
    qualitativeNotes: extras.scoutingNotes,
    ...extras.chars,
    resultsHistory: extras.resultsHistory,
    favoriteRaces: [],
    teamsHistory: [],
  };
}

export function isDemoPreviewScoutingProfile(profile: { id?: string }): boolean {
  return !!profile.id?.startsWith('demo_preview_');
}

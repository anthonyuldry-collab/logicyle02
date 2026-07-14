import {
  Rider,
  StaffMember,
  User,
  SignupInfo,
  RiderQualitativeProfile,
  DisciplinePracticed,
  FormeStatus,
  MoralStatus,
  HealthCondition,
  BikeType,
  PerformanceFactorDetail,
  BikeSetup,
  StaffRole,
  StaffStatus,
} from '../types';

const emptyPerformanceFactor = (): PerformanceFactorDetail => ({
  forces: '',
  aOptimiser: '',
  aDevelopper: '',
  besoinsActions: '',
});

const emptyBikeSetup = (bikeType: BikeType): BikeSetup => ({
  specifics: {},
  cotes: {},
  bikeType,
  size: '',
  brand: '',
  model: '',
});

export function buildDefaultRider(
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>,
  signupInfo?: SignupInfo
): Rider {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: signupInfo?.birthDate,
    sex: signupInfo?.sex,
    qualitativeProfile: RiderQualitativeProfile.ROULEUR,
    disciplines: [DisciplinePracticed.ROUTE],
    categories: ['Senior'],
    forme: FormeStatus.BON,
    moral: MoralStatus.BON,
    healthCondition: HealthCondition.PRET_A_COURIR,
    resultsHistory: [],
    favoriteRaces: [],
    performanceGoals: '',
    physiquePerformanceProject: emptyPerformanceFactor(),
    techniquePerformanceProject: emptyPerformanceFactor(),
    mentalPerformanceProject: emptyPerformanceFactor(),
    environnementPerformanceProject: emptyPerformanceFactor(),
    tactiquePerformanceProject: emptyPerformanceFactor(),
    allergies: [],
    performanceNutrition: {
      hydrationStrategy: '',
      preRaceMeal: '',
      duringRaceNutrition: '',
      recoveryNutrition: '',
    },
    roadBikeSetup: emptyBikeSetup(BikeType.ROUTE),
    ttBikeSetup: emptyBikeSetup(BikeType.CONTRE_LA_MONTRE),
    clothing: [],
    charSprint: 0,
    charAnaerobic: 0,
    charPuncher: 0,
    charClimbing: 0,
    charRouleur: 0,
    generalPerformanceScore: 0,
    fatigueResistanceScore: 0,
  };
}

export function buildDefaultStaffMember(
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>
): StaffMember {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: StaffRole.AUTRE,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: false,
    skills: [],
    availability: [],
  };
}

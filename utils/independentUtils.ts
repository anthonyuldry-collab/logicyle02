import { Rider, StaffMember, User, RiderQualitativeProfile, FormeStatus, MoralStatus, HealthCondition, DisciplinePracticed, UserRole } from '../types';

/** Construit un profil coureur virtuel à partir du document User (mode indépendant). */
export function userToRiderProfile(user: User): Rider {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: user.signupInfo?.birthDate,
    sex: user.signupInfo?.sex,
    phone: user.phone,
    photoUrl: user.photoUrl,
    disciplines: user.disciplines?.length ? user.disciplines : [DisciplinePracticed.ROUTE],
    categories: user.categories || ['Senior'],
    qualitativeProfile: user.qualitativeProfile || user.characteristics || RiderQualitativeProfile.ROULEUR,
    forme: (user.forme as FormeStatus) || FormeStatus.BON,
    moral: (user.moral as MoralStatus) || MoralStatus.BON,
    healthCondition: (user.healthCondition as HealthCondition) || HealthCondition.PRET_A_COURIR,
    resultsHistory: user.resultsHistory || [],
    favoriteRaces: user.favoriteRaces || [],
    performanceGoals: user.careerAspirations || '',
    physiquePerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    techniquePerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    mentalPerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    environnementPerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    tactiquePerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    allergies: [],
    performanceNutrition: {},
    roadBikeSetup: { specifics: {}, cotes: {} },
    ttBikeSetup: { specifics: {}, cotes: {} },
    clothing: [],
    powerProfileFresh: user.powerProfile,
    isSearchable: user.isSearchable ?? false,
    charSprint: 0,
    charAnaerobic: 0,
    charPuncher: 0,
    charClimbing: 0,
    charRouleur: 0,
    generalPerformanceScore: 0,
    fatigueResistanceScore: 0,
  };
}

export function userToStaffProfile(user: User): StaffMember {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: 'AUTRE',
    status: 'Vacataire',
    skills: user.skills || [],
    professionalSummary: user.professionalSummary || '',
    openToExternalMissions: user.openToExternalMissions ?? false,
    availability: [],
  };
}

export function isIndependentUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.signupMode === 'independent' || user.isIndependentProfile === true;
}

/** Staff vacataires : équipe + profils indépendants ouverts aux missions. */
export function getGlobalRecruitableStaff(users: User[], teamStaff: StaffMember[]): StaffMember[] {
  const independentStaff = users
    .filter(
      (u) =>
        u.userRole === UserRole.STAFF &&
        u.openToExternalMissions &&
        (u.isIndependentProfile || u.signupMode === 'independent' || !u.teamId)
    )
    .map(userToStaffProfile);

  const teamVacataires = teamStaff.filter((s) => s.openToExternalMissions);
  const seen = new Set<string>();
  return [...teamVacataires, ...independentStaff].filter((s) => {
    if (seen.has(s.email)) return false;
    seen.add(s.email);
    return true;
  });
}

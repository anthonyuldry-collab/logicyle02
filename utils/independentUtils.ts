import { Rider, StaffMember, User, RiderQualitativeProfile, FormeStatus, MoralStatus, HealthCondition, DisciplinePracticed, UserRole } from '../types';
import { getOwnRider, isCoureurUser } from './riderAccessUtils';
import { canIndependentShowInMarketplace } from './subscriptionEntitlements';
import { buildDemoVacataires, isDemoVacataire } from '../constants/demoVacataires';

const emptyPerformanceProject = () => ({
  forces: '',
  aOptimiser: '',
  aDevelopper: '',
  besoinsActions: '',
});

/** Construit un profil coureur virtuel à partir du document User (mode indépendant). */
export function userToRiderProfile(user: User): Rider {
  return {
    id: user.previewSubjectId && user.previewSubjectKind === 'rider' ? user.previewSubjectId : user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    birthDate: user.birthDate || user.signupInfo?.birthDate,
    sex: user.sex || user.signupInfo?.sex,
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
    physiquePerformanceProject: user.physiquePerformanceProject || emptyPerformanceProject(),
    techniquePerformanceProject: user.techniquePerformanceProject || emptyPerformanceProject(),
    mentalPerformanceProject: user.mentalPerformanceProject || emptyPerformanceProject(),
    environnementPerformanceProject: user.environnementPerformanceProject || emptyPerformanceProject(),
    tactiquePerformanceProject: user.tactiquePerformanceProject || emptyPerformanceProject(),
    allergies: user.allergies || [],
    performanceNutrition: user.performanceNutrition || {},
    roadBikeSetup: user.roadBikeSetup || { specifics: {}, cotes: {} },
    ttBikeSetup: user.ttBikeSetup || { specifics: {}, cotes: {} },
    clothing: user.clothing || [],
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    powerProfileFresh: user.powerProfileFresh || user.powerProfile,
    powerProfile15KJ: user.powerProfile15KJ,
    powerProfile30KJ: user.powerProfile30KJ,
    powerProfile45KJ: user.powerProfile45KJ,
    pcsUrl: user.pcsUrl,
    directVeloUrl: user.directVeloUrl,
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

/** Profil coureur équipe ou indépendant (User). */
export function resolveRiderForUser(riders: Rider[], user: User): Rider | undefined {
  const fromRoster = getOwnRider(riders, user);
  if (fromRoster) {
    // Profil indépendant : la source de vérité est le document User
    if (isIndependentUser(user) && !user.previewSubjectId) {
      return {
        ...fromRoster,
        ...userToRiderProfile(user),
        id: user.id,
      };
    }
    return fromRoster;
  }
  if (isCoureurUser(user) || isIndependentUser(user)) {
    return userToRiderProfile(user);
  }
  return undefined;
}

/** Mappe les champs Rider vers le document User (profil indépendant). */
export function riderProfileToUserUpdates(rider: Rider): Partial<User> {
  return {
    firstName: rider.firstName,
    lastName: rider.lastName,
    phone: rider.phone,
    photoUrl: rider.photoUrl,
    birthDate: rider.birthDate,
    sex: rider.sex,
    categories: rider.categories,
    disciplines: rider.disciplines,
    qualitativeProfile: rider.qualitativeProfile,
    characteristics: rider.qualitativeProfile,
    forme: rider.forme,
    moral: rider.moral,
    healthCondition: rider.healthCondition,
    resultsHistory: rider.resultsHistory,
    favoriteRaces: rider.favoriteRaces,
    careerAspirations: rider.performanceGoals,
    powerProfile: rider.powerProfileFresh,
    powerProfileFresh: rider.powerProfileFresh,
    powerProfile15KJ: rider.powerProfile15KJ,
    powerProfile30KJ: rider.powerProfile30KJ,
    powerProfile45KJ: rider.powerProfile45KJ,
    isSearchable: rider.isSearchable,
    allergies: rider.allergies,
    performanceNutrition: rider.performanceNutrition,
    roadBikeSetup: rider.roadBikeSetup,
    ttBikeSetup: rider.ttBikeSetup,
    clothing: rider.clothing,
    weightKg: rider.weightKg,
    heightCm: rider.heightCm,
    physiquePerformanceProject: rider.physiquePerformanceProject,
    techniquePerformanceProject: rider.techniquePerformanceProject,
    mentalPerformanceProject: rider.mentalPerformanceProject,
    environnementPerformanceProject: rider.environnementPerformanceProject,
    tactiquePerformanceProject: rider.tactiquePerformanceProject,
    pcsUrl: rider.pcsUrl,
    directVeloUrl: rider.directVeloUrl,
  };
}

export function staffProfileToUserUpdates(staff: StaffMember): Partial<User> {
  return {
    firstName: staff.firstName,
    lastName: staff.lastName,
    phone: staff.phone,
    photoUrl: staff.photoUrl,
    professionalSummary: staff.professionalSummary,
    defaultApplicationMessage: staff.defaultApplicationMessage,
    skills: staff.skills,
    experienceYears: staff.experienceYears,
    certifications: staff.certifications,
    workHistory: staff.workHistory,
    education: staff.education,
    languages: staff.languages,
    openToExternalMissions: staff.openToExternalMissions,
    birthDate: staff.birthDate,
    sex: staff.sex,
    nationality: staff.nationality,
    address: staff.address,
    emergencyContactName: staff.emergencyContactName,
    emergencyContactPhone: staff.emergencyContactPhone,
    socialSecurityNumber: staff.socialSecurityNumber,
    cvFileName: staff.cvFileName,
    cvMimeType: staff.cvMimeType,
    cvFileBase64: staff.cvFileBase64,
    licenseNumber: staff.licenseNumber,
    licenseImageBase64: staff.licenseImageBase64,
    licenseImageMimeType: staff.licenseImageMimeType,
    staffRole: staff.role,
  };
}

/** Profil staff équipe ou indépendant (User). */
export function resolveStaffForUser(staff: StaffMember[], user: User): StaffMember | undefined {
  const fromRoster = staff.find(
    (s) =>
      s.id === user.id ||
      s.userId === user.id ||
      (user.email && s.email?.trim().toLowerCase() === user.email.trim().toLowerCase()),
  );
  if (fromRoster) return fromRoster;
  if (user.userRole === UserRole.STAFF && isIndependentUser(user)) {
    return userToStaffProfile(user);
  }
  return undefined;
}

export function userToStaffProfile(user: User): StaffMember {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.staffRole || 'AUTRE',
    status: 'Vacataire',
    skills: user.skills || [],
    professionalSummary: user.professionalSummary || '',
    defaultApplicationMessage: user.defaultApplicationMessage,
    experienceYears: user.experienceYears,
    certifications: user.certifications || [],
    workHistory: user.workHistory || [],
    education: user.education || [],
    languages: user.languages || [],
    openToExternalMissions: user.openToExternalMissions ?? false,
    availability: [],
    birthDate: user.birthDate || user.signupInfo?.birthDate,
    sex: user.sex || user.signupInfo?.sex,
    nationality: user.nationality || user.signupInfo?.nationality,
    address: user.address,
    emergencyContactName: user.emergencyContactName,
    emergencyContactPhone: user.emergencyContactPhone,
    socialSecurityNumber: user.socialSecurityNumber,
    cvFileName: user.cvFileName,
    cvMimeType: user.cvMimeType,
    cvFileBase64: user.cvFileBase64,
    licenseNumber: user.licenseNumber,
    licenseImageBase64: user.licenseImageBase64,
    licenseImageMimeType: user.licenseImageMimeType,
    photoUrl: user.photoUrl,
  };
}

export function isIndependentUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.signupMode === 'independent' || user.isIndependentProfile === true;
}

/** Staff vacataires : équipe + profils indépendants + exemples démo. */
export function getGlobalRecruitableStaff(users: User[], teamStaff: StaffMember[]): StaffMember[] {
  const independentStaff = users
    .filter(
      (u) =>
        u.userRole === UserRole.STAFF &&
        canIndependentShowInMarketplace(u) &&
        (u.isIndependentProfile || u.signupMode === 'independent' || !u.teamId)
    )
    .map(userToStaffProfile);

  const teamVacataires = teamStaff.filter((s) => s.openToExternalMissions);
  const demos = buildDemoVacataires();
  const seen = new Set<string>();
  return [...teamVacataires, ...independentStaff, ...demos].filter((s) => {
    if (seen.has(s.id) || seen.has(s.email.toLowerCase())) return false;
    seen.add(s.id);
    seen.add(s.email.toLowerCase());
    return true;
  });
}

export { isDemoVacataire };

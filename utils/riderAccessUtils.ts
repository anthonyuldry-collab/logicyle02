import {
  AppSection,
  AppState,
  PerformanceEntry,
  Rider,
  StaffMember,
  TeamState,
  User,
  UserRole,
} from '../types';
import { MY_SPACE_SECTIONS } from './permissionUtils';
import { getRiderProfileForUser } from './eventRiderUtils';
import { getStaffMemberForUser } from './staffMemberUtils';
import { getStaffRoleKey } from './staffRoleUtils';
import {
  scopeRidersForStaffRole,
  staffRoleNeedsDataScoping,
  canViewOrganizerApplicationDossier,
} from './staffRoleDataAccess';

/** Sections réservées au staff / encadrement — jamais accessibles aux coureurs */
export const COUREUR_FORBIDDEN_SECTIONS: AppSection[] = [
  'roster',
  'performance',
  'scouting',
  'staff',
  'financial',
  'permissions',
  'userManagement',
  'season-planning',
  'vehicles',
  'equipment',
  'stocks',
  'settings',
  'pricing',
  'superAdmin',
  'adminDashboard',
  'checklist',
  'missionSearch',
];

const COUREUR_ALLOWED_SECTIONS: AppSection[] = [
  'events',
  'myDashboard',
  'userSettings',
  'eventDetail',
  ...MY_SPACE_SECTIONS,
];

export function isCoureurUser(user: User | null | undefined): boolean {
  if (!user?.userRole) return false;
  return (
    user.userRole === UserRole.COUREUR ||
    String(user.userRole).toLowerCase() === 'coureur'
  );
}

export function getOwnRider(riders: Rider[], user: User): Rider | undefined {
  return getRiderProfileForUser(riders, user);
}

/** Profil minimal pour la logistique (nutrition, allergies) — sans perf. ni admin. */
export function toLogisticsRiderStub(rider: Rider): Rider {
  return {
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    birthDate: rider.birthDate,
    sex: rider.sex,
    categories: rider.categories ?? [],
    disciplines: rider.disciplines ?? [],
    healthCondition: rider.healthCondition,
    allergies: rider.allergies ?? [],
    dietaryRegimen: rider.dietaryRegimen,
    performanceNutrition: rider.performanceNutrition,
    snack1: rider.snack1,
    snack2: rider.snack2,
    snack3: rider.snack3,
    assistantInstructions: rider.assistantInstructions,
    clothing: rider.clothing ?? [],
    qualitativeProfile: {
      sprint: 0,
      anaerobic: 0,
      puncher: 0,
      climbing: 0,
      rouleur: 0,
      generalPerformance: 0,
      fatigueResistance: 0,
    },
    favoriteRaces: [],
    resultsHistory: [],
    performanceGoals: '',
    physiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    techniquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    mentalPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    environnementPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    tactiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    roadBikeSetup: { bikeType: 'Route', size: '', brand: '', model: '', specifics: '', cotes: '' },
    ttBikeSetup: { bikeType: 'Contre-la-montre', size: '', brand: '', model: '', specifics: '', cotes: '' },
    charSprint: 0,
    charAnaerobic: 0,
    charPuncher: 0,
    charClimbing: 0,
    charRouleur: 0,
    generalPerformanceScore: 0,
    fatigueResistanceScore: 0,
  } as unknown as Rider;
}

export function filterRidersForLogisticsStaffView(riders: Rider[]): Rider[] {
  return riders.map(toLogisticsRiderStub);
}

export function toPublicStaffStub(member: StaffMember): StaffMember {
  return {
    ...member,
    phone: undefined,
    address: undefined,
    licenseNumber: undefined,
    licenseImageBase64: undefined,
    licenseImageMimeType: undefined,
    bankDetails: undefined,
    salary: undefined,
    contractEndDate: undefined,
    contractType: undefined,
  };
}

export function filterStaffForLogisticsView(staff: StaffMember[]): StaffMember[] {
  return staff.map(toPublicStaffStub);
}

export function scopeAppStateForStaffRole(state: AppState, staffMember: StaffMember, user?: User): AppState {
  const roleKey = getStaffRoleKey(staffMember.role);
  const scoped: AppState = {
    ...state,
    riders: scopeRidersForStaffRole(state.riders, roleKey),
    staff: filterStaffForLogisticsView(state.staff),
    scoutingProfiles: [],
    performanceArchives: [],
    performanceEntries: [],
    organizerContacts: canViewOrganizerApplicationDossier(user, staffMember)
      ? state.organizerContacts
      : [],
  };
  return scoped;
}

export function resolveScopedAppStateForUser(state: AppState, user: User): AppState {
  if (isCoureurUser(user)) return scopeAppStateForCoureur(state, user);
  if (user.userRole === UserRole.STAFF) {
    const member = getStaffMemberForUser(user, state.staff);
    if (member && staffRoleNeedsDataScoping(getStaffRoleKey(member.role))) {
      return scopeAppStateForStaffRole(state, member, user);
    }
  }
  return state;
}

export function isLogisticsRestrictedStaffUser(
  user: User | null | undefined,
  staff: StaffMember[],
): boolean {
  if (!user || user.userRole !== UserRole.STAFF) return false;
  const member = getStaffMemberForUser(user, staff);
  if (!member) return false;
  return staffRoleNeedsDataScoping(getStaffRoleKey(member.role));
}

/** @deprecated Préférer resolveScopedAppStateForUser */
export function scopeAppStateForLogisticsStaff(state: AppState): AppState {
  return {
    ...state,
    riders: filterRidersForLogisticsStaffView(state.riders),
    staff: filterStaffForLogisticsView(state.staff),
    scoutingProfiles: [],
    performanceArchives: [],
    performanceEntries: [],
  };
}

/** Profil minimal pour afficher un nom dans un événement (sans PPR ni données sensibles). */
export function toPublicRiderStub(rider: Rider): Rider {
  return {
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    email: rider.email,
    birthDate: rider.birthDate,
    sex: rider.sex,
    categories: rider.categories ?? [],
    disciplines: rider.disciplines ?? [],
    forme: rider.forme,
    moral: rider.moral,
    healthCondition: rider.healthCondition,
    qualitativeProfile: {
      sprint: 0,
      anaerobic: 0,
      puncher: 0,
      climbing: 0,
      rouleur: 0,
      generalPerformance: 0,
      fatigueResistance: 0,
    },
    favoriteRaces: [],
    resultsHistory: [],
    performanceGoals: '',
    physiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    techniquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    mentalPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    environnementPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    tactiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
    allergies: [],
    performanceNutrition: {
      hydrationStrategy: '',
      preRaceMeal: '',
      duringRaceNutrition: '',
      recoveryNutrition: '',
    },
    roadBikeSetup: { bikeType: 'Route', size: '', brand: '', model: '', specifics: '', cotes: '' },
    ttBikeSetup: { bikeType: 'Contre-la-montre', size: '', brand: '', model: '', specifics: '', cotes: '' },
    clothing: [],
    charSprint: 0,
    charAnaerobic: 0,
    charPuncher: 0,
    charClimbing: 0,
    charRouleur: 0,
    generalPerformanceScore: 0,
    fatigueResistanceScore: 0,
  } as unknown as Rider;
}

/** Effectif visible par un coureur : profil complet pour soi, stub public pour les autres. */
export function filterRidersForCoureurView(riders: Rider[], user: User): Rider[] {
  const own = getOwnRider(riders, user);
  // Ne pas vider l'effectif si le lien user↔rider n'est pas encore résolu :
  // sinon « Mon Profil » et le scoping restent cassés en boucle.
  if (!own) {
    return riders.map((r) => toPublicRiderStub(r));
  }
  return riders.map((r) => (r.id === own.id ? { ...own, ...r, id: own.id } : toPublicRiderStub(r)));
}

function filterPerformanceEntriesForCoureur(
  entries: PerformanceEntry[],
  ownRiderId?: string
): PerformanceEntry[] {
  if (!ownRiderId) return [];
  return entries.map((entry) => ({
    ...entry,
    generalObjectives: '',
    resultsSummary: '',
    keyLearnings: '',
    raceOverallRanking: undefined,
    teamRiderRankings: undefined,
    dsGeneralFeedback: undefined,
    staffRatings: [],
    riderRatings: (entry.riderRatings ?? []).filter((r) => r.riderId === ownRiderId),
  }));
}

import {
  filterPeerRatingsForCoureur,
  filterRiderSelfDebriefsForCoureur,
} from './riderDebriefUtils';

export function scopeTeamStateForCoureur(
  teamState: Partial<TeamState>,
  user: User
): Partial<TeamState> {
  const riders = teamState.riders ?? [];
  const ownRider = getOwnRider(riders, user);
  const ownRiderId = ownRider?.id;

  return {
    ...teamState,
    riders: filterRidersForCoureurView(riders, user),
    scoutingProfiles: [],
    performanceArchives: [],
    staff: [],
    incomeItems: [],
    sepaBatches: [],
    bankTransactions: [],
    quotes: [],
    clientRecords: [],
    supplierInvoices: [],
    missions: [],
    recruitmentOffers: [],
    recruitmentCampaigns: [],
    sepaSettings: undefined,
    gpsWebhookKey: undefined,
    performanceEntries: filterPerformanceEntriesForCoureur(
      teamState.performanceEntries ?? [],
      ownRiderId
    ),
    peerRatings: filterPeerRatingsForCoureur(
      teamState.peerRatings ?? [],
      ownRiderId,
      user.id,
    ),
    riderSelfDebriefs: filterRiderSelfDebriefsForCoureur(
      teamState.riderSelfDebriefs ?? [],
      ownRiderId,
      user.id,
    ),
  };
}

export function scopeAppStateForCoureur(state: AppState, user: User): AppState {
  const ownRider = getOwnRider(state.riders, user);
  const ownRiderId = ownRider?.id;

  return {
    ...state,
    riders: filterRidersForCoureurView(state.riders, user),
    scoutingProfiles: [],
    performanceArchives: [],
    staff: [],
    incomeItems: [],
    sepaBatches: [],
    bankTransactions: [],
    quotes: [],
    clientRecords: [],
    supplierInvoices: [],
    missions: [],
    recruitmentOffers: [],
    recruitmentCampaigns: [],
    sepaSettings: undefined,
    gpsWebhookKey: undefined,
    performanceEntries: filterPerformanceEntriesForCoureur(
      state.performanceEntries ?? [],
      ownRiderId
    ),
    peerRatings: filterPeerRatingsForCoureur(
      state.peerRatings ?? [],
      ownRiderId,
      user.id,
    ),
    riderSelfDebriefs: filterRiderSelfDebriefsForCoureur(
      state.riderSelfDebriefs ?? [],
      ownRiderId,
      user.id,
    ),
  };
}

/** Permissions finales pour un coureur — ignore les customPermissions staff. */
export function buildCoureurPermissions(): Partial<Record<AppSection, import('../types').PermissionLevel[]>> {
  const perms: Partial<Record<AppSection, import('../types').PermissionLevel[]>> = {
    events: ['view'],
    myDashboard: ['view'],
    userSettings: ['view', 'edit'],
  };
  MY_SPACE_SECTIONS.forEach((section) => {
    perms[section] = ['view', 'edit'];
  });
  return perms;
}

export function isSectionAllowedForCoureur(section: AppSection): boolean {
  return COUREUR_ALLOWED_SECTIONS.includes(section);
}

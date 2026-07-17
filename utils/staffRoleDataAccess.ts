import {
  AppSection,
  PermissionLevel,
  RaceEvent,
  Rider,
  Sex,
  StaffMember,
  TeamProduct,
  User,
  UserRole,
  TeamRole,
} from '../types';
import { StaffRoleKeyString, getStaffRoleKey } from './staffRoleUtils';

/** Sections retirées à tous les staff opérationnels sans accès encadrement. */
const BASE_OPERATIONAL_DENIALS: AppSection[] = [
  'performance',
  'season-planning',
  'scouting',
  'financial',
  'userManagement',
  'permissions',
  'adminDashboard',
  'superAdmin',
  'performanceProject',
  'automatedPerformanceProfile',
  'talentSearch',
  'staff',
  'accommodationHistory',
  'organizationDashboard',
  'settings',
];

/** Rôles staff autorisés à consulter le dossier candidatures organisateurs. */
export const ORGANIZER_DOSSIER_STAFF_ROLES = new Set<StaffRoleKeyString>([
  'DS',
  'ENTRAINEUR',
  'RESP_PERF',
  'MANAGER',
]);

export interface StaffRoleAccessProfile {
  roleKey: StaffRoleKeyString;
  label: string;
  missionTabLabel: string;
  missionTabDescription: string;
  sectionDenials: AppSection[];
  sectionGrants: Partial<Record<AppSection, PermissionLevel[]>>;
  /** Champs Rider conservés dans appState (hors effectif complet). */
  riderFields: (keyof Rider | string)[];
  canEditEventMissionLogistics: boolean;
}

const emptyPerformanceProject = {
  score: 0,
  notes: '',
  forces: '',
  aOptimiser: '',
  aDevelopper: '',
  besoinsActions: '',
};

function baseRiderShell(rider: Rider): Partial<Rider> {
  return {
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    sex: rider.sex,
    birthDate: rider.birthDate,
    categories: rider.categories ?? [],
    disciplines: rider.disciplines ?? [],
    favoriteRaces: [],
    resultsHistory: [],
    performanceGoals: '',
    physiquePerformanceProject: emptyPerformanceProject,
    techniquePerformanceProject: emptyPerformanceProject,
    mentalPerformanceProject: emptyPerformanceProject,
    environnementPerformanceProject: emptyPerformanceProject,
    tactiquePerformanceProject: emptyPerformanceProject,
    charSprint: 0,
    charAnaerobic: 0,
    charPuncher: 0,
    charClimbing: 0,
    charRouleur: 0,
    generalPerformanceScore: 0,
    fatigueResistanceScore: 0,
  };
}

export const STAFF_ROLE_ACCESS: Record<StaffRoleKeyString, StaffRoleAccessProfile> = {
  ASSISTANT: {
    roleKey: 'ASSISTANT',
    label: 'Assistant(e) sportif',
    missionTabLabel: 'Mission assistant',
    missionTabDescription:
      'Timings OP, nutrition, collations, stratégie glucidique et planning massages pour les coureuses sélectionnées.',
    sectionDenials: [...BASE_OPERATIONAL_DENIALS, 'roster', 'equipment', 'vehicles', 'stocks'],
    sectionGrants: {
      events: ['view'],
      checklist: ['view', 'edit'],
      myTrips: ['view', 'edit'],
      myCalendar: ['view', 'edit'],
      expenseReceipts: ['view', 'edit'],
      myDashboard: ['view'],
      userSettings: ['view', 'edit'],
    },
    riderFields: [
      'photoUrl',
      'healthCondition',
      'allergies',
      'dietaryRegimen',
      'foodPreferences',
      'snackPreferences',
      'snack1',
      'snack2',
      'snack3',
      'snackSchedule',
      'foodPreferences',
      'assistantInstructions',
      'performanceNutrition',
      'clothing',
    ],
    canEditEventMissionLogistics: true,
  },
  MECANO: {
    roleKey: 'MECANO',
    label: 'Mécanicien',
    missionTabLabel: 'Mission mécano',
    missionTabDescription: 'Matériel, vélos et équipement des coureurs sélectionnés sur cette course.',
    sectionDenials: [...BASE_OPERATIONAL_DENIALS, 'roster'],
    sectionGrants: {
      events: ['view'],
      equipment: ['view', 'edit'],
      vehicles: ['view', 'edit'],
      stocks: ['view'],
      checklist: ['view'],
      myTrips: ['view', 'edit'],
      myCalendar: ['view', 'edit'],
      expenseReceipts: ['view', 'edit'],
      myDashboard: ['view'],
      userSettings: ['view', 'edit'],
    },
    riderFields: [
      'roadBikeSetup',
      'ttBikeSetup',
      'clothing',
      'bikeFitMeasurements',
      'bikeSpecificMeasurements',
    ],
    canEditEventMissionLogistics: false,
  },
  COMMUNICATION: {
    roleKey: 'COMMUNICATION',
    label: 'Communication',
    missionTabLabel: 'Mission média',
    missionTabDescription:
      'Brief course, timings OP, partantes, modèles réseaux, fiche média et visibilité partenaires.',
    sectionDenials: [...BASE_OPERATIONAL_DENIALS, 'roster', 'equipment', 'vehicles', 'stocks'],
    sectionGrants: {
      events: ['view'],
      checklist: ['view'],
      myTrips: ['view', 'edit'],
      myCalendar: ['view', 'edit'],
      myDashboard: ['view'],
      userSettings: ['view', 'edit'],
    },
    riderFields: ['photoUrl', 'categories', 'disciplines'],
    canEditEventMissionLogistics: false,
  },
  KINE: {
    roleKey: 'KINE',
    label: 'Kinésithérapeute',
    missionTabLabel: 'Mission soins',
    missionTabDescription: 'État de santé et besoins des athlètes sur la course.',
    sectionDenials: [
      ...BASE_OPERATIONAL_DENIALS.filter(s => s !== 'roster'),
      'financial',
    ],
    sectionGrants: {
      roster: ['view'],
      events: ['view'],
      myTrips: ['view', 'edit'],
      myCalendar: ['view', 'edit'],
      myDashboard: ['view'],
      userSettings: ['view', 'edit'],
    },
    riderFields: ['photoUrl', 'healthCondition', 'allergies', 'assistantInstructions'],
    canEditEventMissionLogistics: false,
  },
  MEDECIN: {
    roleKey: 'MEDECIN',
    label: 'Médecin',
    missionTabLabel: 'Mission médicale',
    missionTabDescription: 'Santé, allergies et protocoles des athlètes convoqués.',
    sectionDenials: [
      ...BASE_OPERATIONAL_DENIALS.filter(s => s !== 'roster'),
      'financial',
    ],
    sectionGrants: {
      roster: ['view'],
      events: ['view'],
      myTrips: ['view', 'edit'],
      myCalendar: ['view', 'edit'],
      myDashboard: ['view'],
      userSettings: ['view', 'edit'],
    },
    riderFields: ['photoUrl', 'healthCondition', 'allergies', 'dietaryRegimen', 'assistantInstructions'],
    canEditEventMissionLogistics: false,
  },
  DS: {
    roleKey: 'DS',
    label: 'Directeur sportif',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: true,
  },
  ENTRAINEUR: {
    roleKey: 'ENTRAINEUR',
    label: 'Entraîneur',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: false,
  },
  RESP_PERF: {
    roleKey: 'RESP_PERF',
    label: 'Performance',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: false,
  },
  PREPA_PHYSIQUE: {
    roleKey: 'PREPA_PHYSIQUE',
    label: 'Préparateur physique',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: false,
  },
  DATA_ANALYST: {
    roleKey: 'DATA_ANALYST',
    label: 'Data',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: false,
  },
  MANAGER: {
    roleKey: 'MANAGER',
    label: 'Manager',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: true,
  },
  AUTRE: {
    roleKey: 'AUTRE',
    label: 'Staff',
    missionTabLabel: '',
    missionTabDescription: '',
    sectionDenials: [],
    sectionGrants: {},
    riderFields: [],
    canEditEventMissionLogistics: false,
  },
};

const MISSION_TAB_ROLES = new Set<StaffRoleKeyString>([
  'ASSISTANT',
  'MECANO',
  'COMMUNICATION',
  'KINE',
  'MEDECIN',
]);

const SCOPED_DATA_ROLES = new Set<StaffRoleKeyString>(['ASSISTANT', 'MECANO', 'COMMUNICATION']);

export function getStaffRoleAccessProfile(
  roleKey: StaffRoleKeyString | null | undefined,
): StaffRoleAccessProfile | null {
  if (!roleKey) return null;
  return STAFF_ROLE_ACCESS[roleKey] ?? STAFF_ROLE_ACCESS.AUTRE;
}

export function staffRoleHasMissionTab(roleKey: StaffRoleKeyString | null | undefined): boolean {
  return Boolean(roleKey && MISSION_TAB_ROLES.has(roleKey));
}

export function staffRoleNeedsDataScoping(roleKey: StaffRoleKeyString | null | undefined): boolean {
  return Boolean(roleKey && SCOPED_DATA_ROLES.has(roleKey));
}

export function getStaffMemberSectionDenialsForRole(
  staffMember: StaffMember | undefined,
): AppSection[] {
  if (!staffMember) return [];
  const profile = getStaffRoleAccessProfile(getStaffRoleKey(staffMember.role) as StaffRoleKeyString);
  return profile?.sectionDenials ?? [];
}

export function getStaffMemberSectionGrantsForRole(
  staffMember: StaffMember | undefined,
): Partial<Record<AppSection, PermissionLevel[]>> {
  if (!staffMember) return {};
  const profile = getStaffRoleAccessProfile(getStaffRoleKey(staffMember.role) as StaffRoleKeyString);
  return profile?.sectionGrants ?? {};
}

export function scopeRiderForStaffRole(rider: Rider, roleKey: StaffRoleKeyString): Rider {
  const profile = getStaffRoleAccessProfile(roleKey);
  if (!profile || profile.riderFields.length === 0) return rider;

  const shell = baseRiderShell(rider) as Rider;
  for (const field of profile.riderFields) {
    const key = field as keyof Rider;
    if (rider[key] !== undefined) {
      (shell as unknown as Record<string, unknown>)[key] = rider[key];
    }
  }
  return shell;
}

export function scopeRidersForStaffRole(riders: Rider[], roleKey: StaffRoleKeyString): Rider[] {
  if (!staffRoleNeedsDataScoping(roleKey)) return riders;
  return riders.map(r => scopeRiderForStaffRole(r, roleKey));
}

export function getEventSelectedRiders(event: RaceEvent, riders: Rider[]): Rider[] {
  const ids = new Set(event.selectedRiderIds ?? []);
  return riders.filter(r => ids.has(r.id));
}

export function isFemaleRider(rider: Rider): boolean {
  const s = String(rider.sex ?? '').toLowerCase();
  return s === Sex.FEMALE.toLowerCase() || s === 'female' || s === 'femme';
}

export function formatMassageScheduleForWhatsApp(
  event: RaceEvent,
  riders: Rider[],
  staff: StaffMember[],
): string {
  const lines: string[] = [`💆 Massages — ${event.name}`, ''];
  const days = event.operationalLogistics ?? [];
  days.forEach(day => {
    const massages = (day.keyTimings ?? []).filter(t => t.category === 'Massage');
    if (massages.length === 0) return;
    lines.push(`📅 ${day.dayName}`);
    massages
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      .forEach(t => {
        const rider = riders.find(r => r.id === t.personId);
        const masseur = staff.find(s => s.id === t.masseurId);
        const who = rider ? `${rider.firstName} ${rider.lastName}` : t.description;
        const by = masseur ? ` (${masseur.firstName})` : '';
        lines.push(`  ${t.time || '—'} — ${who}${by}`);
      });
    lines.push('');
  });
  return lines.join('\n').trim();
}

export function getTeamProductsForNutrition(teamProducts: TeamProduct[] = []): TeamProduct[] {
  return teamProducts;
}

/** Dossier candidatures organisateurs : réservé à l'encadrement (pas assistant / mécano / com). */
export function canViewOrganizerApplicationDossier(
  user: User | null | undefined,
  staffMember?: StaffMember,
): boolean {
  if (!user) return false;
  if (user.userRole === UserRole.MANAGER || user.permissionRole === TeamRole.ADMIN) return true;
  if (!staffMember) return false;
  const roleKey = getStaffRoleKey(staffMember.role) as StaffRoleKeyString;
  return ORGANIZER_DOSSIER_STAFF_ROLES.has(roleKey);
}

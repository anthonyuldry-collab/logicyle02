import { AppPermissions, AppSection, PermissionLevel, PermissionRole, StaffMember, StaffStatus, TeamRole, User, UserRole } from '../types';
import { SECTIONS } from '../constants';
import { getStaffRoleKey } from './staffRoleUtils';
import {
  getStaffMemberSectionDenialsForRole,
  getStaffMemberSectionGrantsForRole,
} from './staffRoleDataAccess';

export const VACATAIRE_MISSION_SECTION_GRANTS: Partial<Record<AppSection, PermissionLevel[]>> = {
  missionSearch: ['view', 'edit'],
};

/** Accès personnel staff : profil unique (admin + pro fusionnés). */
export const STAFF_SELF_SERVICE_SECTION_GRANTS: Partial<Record<AppSection, PermissionLevel[]>> = {
  myProfile: ['view', 'edit'],
  myDashboard: ['view'],
  userSettings: ['view', 'edit'],
};

export const MY_SPACE_SECTIONS: AppSection[] = [
  'career', 'nutrition', 'riderEquipment', 'adminDossier',
  'myTrips', 'myPerformance', 'performanceProject', 'automatedPerformanceProfile',
  'myProfile', 'myCalendar', 'myCareer', 'myStages', 'myResults', 'teamSearch',
];

export const ADMIN_SECTIONS: AppSection[] = SECTIONS
  .map((s) => s.id as AppSection)
  .filter((id) => id !== 'eventDetail' && !MY_SPACE_SECTIONS.includes(id));

/** Directeur sportif : coordination planification, staff et déplacements (hors finances globales). */
export const DIRECTEUR_SPORTIF_SECTION_GRANTS: Partial<Record<AppSection, PermissionLevel[]>> = {
  // Planification sportive
  'season-planning': ['view', 'edit'],
  events: ['view', 'edit'],
  roster: ['view', 'edit'],
  staff: ['view', 'edit'],
  scouting: ['view'],
  performance: ['view'],

  // Logistique & déplacements
  myTrips: ['view', 'edit'],
  myCalendar: ['view', 'edit'],
  vehicles: ['view', 'edit'],
  equipment: ['view', 'edit'],
  stocks: ['view'],
  accommodationHistory: ['view', 'edit'],
  checklist: ['view', 'edit'],
  expenseReceipts: ['view', 'edit'],
};

/** @deprecated Utiliser getStaffMemberSectionDenialsForRole — conservé pour référence. */
export const LOGISTICS_STAFF_SECTION_DENIALS: AppSection[] = [
  'roster',
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
];

export function getStaffMemberSectionGrants(
  staffMember: StaffMember | undefined,
): Partial<Record<AppSection, PermissionLevel[]>> {
  // Toujours exposer le dossier perso à tout membre effectif staff (tous rôles).
  if (!staffMember) return {};
  const grants: Partial<Record<AppSection, PermissionLevel[]>> = {
    ...STAFF_SELF_SERVICE_SECTION_GRANTS,
  };
  if (getStaffRoleKey(staffMember.role) === 'DS') {
    Object.assign(grants, DIRECTEUR_SPORTIF_SECTION_GRANTS);
  }
  if (staffMember.status === StaffStatus.VACATAIRE) {
    const roleKey = getStaffRoleKey(staffMember.role);
    if (roleKey === 'ASSISTANT' || roleKey === 'COMMUNICATION' || roleKey === 'MECANO') {
      Object.assign(grants, VACATAIRE_MISSION_SECTION_GRANTS);
    }
  }
  Object.assign(grants, getStaffMemberSectionGrantsForRole(staffMember));
  // Re-applique le self-service en dernier pour qu’aucun rôle ne l’écrase.
  Object.assign(grants, STAFF_SELF_SERVICE_SECTION_GRANTS);
  return grants;
}

/** Sections interdites selon le poste staff (prioritaires sur le rôle permission). */
export function getStaffMemberSectionDenials(staffMember: StaffMember | undefined): AppSection[] {
  return getStaffMemberSectionDenialsForRole(staffMember);
}

export function hasSectionPermission(
  permissions: Partial<Record<AppSection, PermissionLevel[]>> | undefined,
  section: AppSection,
  level: PermissionLevel = 'view',
): boolean {
  return Boolean(permissions?.[section]?.includes(level));
}

export function mergeSectionGrants(
  base: Partial<Record<AppSection, PermissionLevel[]>>,
  grants: Partial<Record<AppSection, PermissionLevel[]>>,
): Partial<Record<AppSection, PermissionLevel[]>> {
  const merged = { ...base };
  Object.entries(grants).forEach(([section, levels]) => {
    const key = section as AppSection;
    const combined = new Set<PermissionLevel>([...(merged[key] ?? []), ...(levels ?? [])]);
    merged[key] = Array.from(combined);
  });
  return merged;
}

export type PermissionPresetId =
  | 'athlete'
  | 'staff_logistics'
  | 'staff_performance'
  | 'manager'
  | 'read_only';

export const PERMISSION_PRESETS: Array<{
  id: PermissionPresetId;
  label: string;
  description: string;
}> = [
  { id: 'athlete', label: 'Coureur', description: 'Mon espace + calendrier (lecture)' },
  { id: 'staff_logistics', label: 'Staff logistique', description: 'Courses, checklists, déplacements (sans effectif ni perf.)' },
  { id: 'staff_performance', label: 'Staff performance', description: 'Performance, logistique (édition)' },
  { id: 'manager', label: 'Encadrement', description: 'Accès complet hors espace coureur' },
  { id: 'read_only', label: 'Lecture seule', description: 'Consultation limitée' },
];

export const DEFAULT_ROLE_PERMISSIONS: AppPermissions = {
  [TeamRole.VIEWER]: {
    events: ['view'],
    myDashboard: ['view'],
    myProfile: ['view', 'edit'],
    myCalendar: ['view', 'edit'],
    myCareer: ['view', 'edit'],
    myStages: ['view', 'edit'],
    myResults: ['view', 'edit'],
    nutrition: ['view', 'edit'],
    riderEquipment: ['view', 'edit'],
    myTrips: ['view', 'edit'],
    career: ['view', 'edit'],
    userSettings: ['view', 'edit'],
  },
  [TeamRole.MEMBER]: {
    events: ['view'],
    myDashboard: ['view'],
    roster: ['view'],
    staff: ['view'],
    vehicles: ['view'],
    equipment: ['view'],
    stocks: ['view'],
    accommodationHistory: ['view'],
    scouting: ['view'],
    userSettings: ['view', 'edit'],
  },
  [TeamRole.EDITOR]: {
    events: ['view', 'edit'],
    myDashboard: ['view'],
    roster: ['view', 'edit'],
    staff: ['view', 'edit'],
    vehicles: ['view', 'edit'],
    equipment: ['view', 'edit'],
    stocks: ['view', 'edit'],
    accommodationHistory: ['view', 'edit'],
    scouting: ['view', 'edit'],
    performance: ['view', 'edit'],
    checklist: ['view', 'edit'],
    'season-planning': ['view', 'edit'],
    partnerPortal: ['view', 'edit'],
    userSettings: ['view', 'edit'],
  },
};

function fullAccess(excludeMySpace = true): Partial<Record<AppSection, PermissionLevel[]>> {
  const perms: Partial<Record<AppSection, PermissionLevel[]>> = {};
  SECTIONS.forEach((section) => {
    const id = section.id as AppSection;
    if (id === 'eventDetail') return;
    if (excludeMySpace && MY_SPACE_SECTIONS.includes(id)) return;
    perms[id] = ['view', 'edit'];
  });
  return perms;
}

function viewOnly(sections: AppSection[]): Partial<Record<AppSection, PermissionLevel[]>> {
  return Object.fromEntries(sections.map((s) => [s, ['view'] as PermissionLevel[]]));
}

export function buildPresetPermissions(presetId: PermissionPresetId): Partial<Record<AppSection, PermissionLevel[]>> {
  switch (presetId) {
    case 'athlete':
      return {
        ...DEFAULT_ROLE_PERMISSIONS[TeamRole.VIEWER],
        ...Object.fromEntries(MY_SPACE_SECTIONS.map((s) => [s, ['view', 'edit'] as PermissionLevel[]])),
      };
    case 'staff_logistics':
      return {
        events: ['view'],
        myDashboard: ['view'],
        checklist: ['view'],
        myTrips: ['view', 'edit'],
        myCalendar: ['view', 'edit'],
        expenseReceipts: ['view', 'edit'],
        vehicles: ['view'],
        equipment: ['view'],
        stocks: ['view'],
        userSettings: ['view', 'edit'],
      };
    case 'staff_performance':
      return { ...DEFAULT_ROLE_PERMISSIONS[TeamRole.EDITOR] };
    case 'manager':
      return fullAccess(true);
    case 'read_only':
      return {
        ...viewOnly(['events', 'myDashboard', 'roster', 'staff', 'vehicles', 'equipment', 'scouting'] as AppSection[]),
        userSettings: ['view', 'edit'],
      };
    default:
      return {};
  }
}

export function resolveRolePermissions(
  roleId: string,
  basePermissions: AppPermissions
): Partial<Record<AppSection, PermissionLevel[]>> {
  if (roleId === TeamRole.ADMIN) return fullAccess(true);
  const configured = basePermissions[roleId];
  if (configured && Object.keys(configured).length > 0) return { ...configured };
  return { ...(DEFAULT_ROLE_PERMISSIONS[roleId] || DEFAULT_ROLE_PERMISSIONS[TeamRole.VIEWER] || {}) };
}

export function groupSectionsForPermissions(language: 'fr' | 'en' = 'fr') {
  const grouped = SECTIONS.reduce((acc, section) => {
    if (section.id === 'eventDetail') return acc;
    const group = section.group[language] || section.group.fr;
    if (!acc[group]) acc[group] = [];
    acc[group].push(section);
    return acc;
  }, {} as Record<string, typeof SECTIONS>);

  const order = [
    'Tableau de Bord',
    'Navigation Principale',
    'Performance & Santé',
    'Logistique & Équipement',
    'Administration',
  ];
  return order
    .filter((g) => grouped[g]?.length)
    .map((groupName) => ({ groupName, sections: grouped[groupName] }));
}

export function computePermissionDeltas(
  base: Partial<Record<AppSection, PermissionLevel[]>>,
  effective: Partial<Record<AppSection, PermissionLevel[]>>
): Partial<Record<AppSection, PermissionLevel[]>> {
  const deltas: Partial<Record<AppSection, PermissionLevel[]>> = {};
  const allSections = new Set([
    ...Object.keys(base),
    ...Object.keys(effective),
  ]) as Set<string>;

  allSections.forEach((key) => {
    const section = key as AppSection;
    const basePerms = [...(base[section] || [])].sort().join(',');
    const effectivePerms = [...(effective[section] || [])].sort().join(',');
    if (basePerms !== effectivePerms) {
      deltas[section] = effective[section] || [];
    }
  });
  return deltas;
}

export function getRoleLabel(roleId: string, permissionRoles: PermissionRole[]): string {
  return permissionRoles.find((r) => r.id === roleId)?.name || roleId;
}

export function suggestPermissionRoleForUser(userRole: UserRole): string {
  switch (userRole) {
    case UserRole.COUREUR:
      return TeamRole.VIEWER;
    case UserRole.MANAGER:
      return TeamRole.ADMIN;
    case UserRole.STAFF:
      return TeamRole.MEMBER;
    default:
      return TeamRole.MEMBER;
  }
}

export function mergeConfiguredPermissions(basePermissions: AppPermissions): AppPermissions {
  const merged: AppPermissions = { ...basePermissions };
  Object.entries(DEFAULT_ROLE_PERMISSIONS).forEach(([roleId, defaults]) => {
    if (!merged[roleId] || Object.keys(merged[roleId]!).length === 0) {
      merged[roleId] = { ...defaults };
    }
  });
  return merged;
}

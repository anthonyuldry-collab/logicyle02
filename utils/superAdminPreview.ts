import { IncomeItem, Rider, StaffMember, TeamRole, User, UserRole } from '../types';
import { isSponsorshipIncome } from './financialUtils';
import { getIndependentPlanIdForRole } from '../constants/subscriptionPlans';

import { isHoldingSuperAdminUser, isSuperAdminUser } from './superAdminUtils';

export type SuperAdminPreviewMode =
  | 'full'
  | 'manager'
  | 'coureur'
  | 'staff'
  | 'partenaire'
  | 'coureur_independant'
  | 'staff_independant';

export function isIndependentPreviewMode(
  mode: SuperAdminPreviewMode | undefined,
): boolean {
  return mode === 'coureur_independant' || mode === 'staff_independant';
}

export interface SuperAdminPreviewConfig {
  mode: SuperAdminPreviewMode;
  /** Id coureur, staff ou partenariat sponsor selon le mode */
  subjectId?: string | null;
}

export const DEFAULT_SUPER_ADMIN_PREVIEW: SuperAdminPreviewConfig = { mode: 'full' };

const SESSION_KEY = 'logicycle_super_admin_preview';

export function loadSuperAdminPreview(): SuperAdminPreviewConfig {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SUPER_ADMIN_PREVIEW;
    const parsed = JSON.parse(raw) as SuperAdminPreviewConfig;
    if (!parsed?.mode) return DEFAULT_SUPER_ADMIN_PREVIEW;
    return parsed;
  } catch {
    return DEFAULT_SUPER_ADMIN_PREVIEW;
  }
}

export function saveSuperAdminPreview(config: SuperAdminPreviewConfig): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(config));
}

export function getSponsorshipIncomeItems(incomeItems: IncomeItem[] = []): IncomeItem[] {
  return incomeItems.filter(isSponsorshipIncome);
}

export function normalizeSuperAdminPreview(
  config: SuperAdminPreviewConfig,
  riders: Rider[],
  staff: StaffMember[],
  incomeItems: IncomeItem[] = [],
): SuperAdminPreviewConfig {
  if (config.mode === 'full' || config.mode === 'manager') {
    return { mode: config.mode };
  }
  if (config.mode === 'coureur') {
    const subjectId =
      config.subjectId && riders.some((r) => r.id === config.subjectId)
        ? config.subjectId
        : riders[0]?.id ?? null;
    return { mode: 'coureur', subjectId };
  }
  if (config.mode === 'staff') {
    const subjectId =
      config.subjectId && staff.some((s) => s.id === config.subjectId)
        ? config.subjectId
        : staff[0]?.id ?? null;
    return { mode: 'staff', subjectId };
  }
  if (config.mode === 'partenaire') {
    const sponsors = getSponsorshipIncomeItems(incomeItems);
    const subjectId =
      config.subjectId && sponsors.some((i) => i.id === config.subjectId)
        ? config.subjectId
        : sponsors[0]?.id ?? null;
    return { mode: 'partenaire', subjectId };
  }
  if (config.mode === 'coureur_independant') {
    const subjectId =
      config.subjectId && riders.some((r) => r.id === config.subjectId)
        ? config.subjectId
        : riders[0]?.id ?? null;
    return { mode: 'coureur_independant', subjectId };
  }
  if (config.mode === 'staff_independant') {
    const subjectId =
      config.subjectId && staff.some((s) => s.id === config.subjectId)
        ? config.subjectId
        : staff[0]?.id ?? null;
    return { mode: 'staff_independant', subjectId };
  }
  return DEFAULT_SUPER_ADMIN_PREVIEW;
}

function buildIndependentPreviewSubscription(userRole: UserRole) {
  return {
    planId: getIndependentPlanIdForRole(userRole),
    status: 'active' as const,
  };
}

export function buildPreviewUser(
  realUser: User,
  config: SuperAdminPreviewConfig,
  context: {
    riders: Rider[];
    staff: StaffMember[];
    users: User[];
    incomeItems?: IncomeItem[];
  },
): User {
  const normalized = normalizeSuperAdminPreview(
    config,
    context.riders,
    context.staff,
    context.incomeItems ?? [],
  );

  if (normalized.mode === 'full') return realUser;

  if (normalized.mode === 'manager') {
    return {
      ...realUser,
      userRole: UserRole.MANAGER,
      permissionRole: TeamRole.ADMIN,
      customPermissions: undefined,
    };
  }

  if (normalized.mode === 'coureur') {
    const rider =
      context.riders.find((r) => r.id === normalized.subjectId) ?? context.riders[0];
    return {
      ...realUser,
      firstName: rider?.firstName ?? realUser.firstName,
      lastName: rider?.lastName ?? realUser.lastName,
      userRole: UserRole.COUREUR,
      permissionRole: TeamRole.VIEWER,
      customPermissions: undefined,
      isSearchable: rider?.isSearchable,
      previewSubjectId: rider?.id,
      previewSubjectKind: 'rider',
    };
  }

  if (normalized.mode === 'staff') {
    const member =
      context.staff.find((s) => s.id === normalized.subjectId) ?? context.staff[0];
    const linkedUser = member?.email
      ? context.users.find(
          (u) => u.email?.trim().toLowerCase() === member.email?.trim().toLowerCase(),
        )
      : undefined;
    return {
      ...realUser,
      firstName: member?.firstName ?? realUser.firstName,
      lastName: member?.lastName ?? realUser.lastName,
      userRole: UserRole.STAFF,
      permissionRole: linkedUser?.permissionRole ?? TeamRole.MEMBER,
      customPermissions: linkedUser?.customPermissions,
      openToExternalMissions: member?.openToExternalMissions,
      previewSubjectId: member?.id,
      previewSubjectKind: 'staff',
    };
  }

  if (normalized.mode === 'partenaire') {
    const sponsors = getSponsorshipIncomeItems(context.incomeItems ?? []);
    const income =
      sponsors.find((i) => i.id === normalized.subjectId) ?? sponsors[0];
    const contactName = income?.sponsorshipContactName?.trim();
    const [firstName = 'Partenaire', ...rest] = contactName
      ? contactName.split(/\s+/)
      : [];
    const lastName = contactName ? rest.join(' ') : income?.sponsorCompanyName ?? 'Sponsor';
    return {
      ...realUser,
      firstName: firstName || income?.sponsorCompanyName || 'Partenaire',
      lastName: lastName || '',
      userRole: UserRole.PARTNER,
      permissionRole: TeamRole.VIEWER,
      customPermissions: undefined,
      previewSubjectId: income?.id,
      previewSubjectKind: 'partner',
    };
  }

  if (normalized.mode === 'coureur_independant') {
    const rider =
      context.riders.find((r) => r.id === normalized.subjectId) ?? context.riders[0];
    return {
      ...realUser,
      firstName: rider?.firstName ?? 'Athlète',
      lastName: rider?.lastName ?? 'Indépendant',
      userRole: UserRole.COUREUR,
      permissionRole: TeamRole.VIEWER,
      customPermissions: undefined,
      signupMode: 'independent',
      isIndependentProfile: true,
      teamId: undefined,
      isSearchable: rider?.isSearchable ?? true,
      subscription: buildIndependentPreviewSubscription(UserRole.COUREUR),
      previewSubjectId: rider?.id,
      previewSubjectKind: 'rider',
    };
  }

  if (normalized.mode === 'staff_independant') {
    const member =
      context.staff.find((s) => s.id === normalized.subjectId) ?? context.staff[0];
    return {
      ...realUser,
      firstName: member?.firstName ?? 'Staff',
      lastName: member?.lastName ?? 'Indépendant',
      userRole: UserRole.STAFF,
      permissionRole: TeamRole.MEMBER,
      customPermissions: undefined,
      signupMode: 'independent',
      isIndependentProfile: true,
      teamId: undefined,
      openToExternalMissions: member?.openToExternalMissions ?? true,
      subscription: buildIndependentPreviewSubscription(UserRole.STAFF),
      previewSubjectId: member?.id,
      previewSubjectKind: 'staff',
    };
  }

  return realUser;
}

export function getSuperAdminPreviewLabel(
  config: SuperAdminPreviewConfig,
  riders: Rider[],
  staff: StaffMember[],
  incomeItems: IncomeItem[] = [],
): string {
  const normalized = normalizeSuperAdminPreview(config, riders, staff, incomeItems);
  switch (normalized.mode) {
    case 'full':
      return 'Super Admin (accès complet)';
    case 'manager':
      return 'Manager';
    case 'coureur': {
      const rider = contextSubject(riders, normalized.subjectId);
      return rider ? `Coureur — ${rider.firstName} ${rider.lastName}` : 'Coureur';
    }
    case 'staff': {
      const member = contextSubject(staff, normalized.subjectId);
      return member ? `Staff — ${member.firstName} ${member.lastName}` : 'Staff';
    }
    case 'partenaire': {
      const income = getSponsorshipIncomeItems(incomeItems).find(
        (i) => i.id === normalized.subjectId,
      );
      const name = income?.sponsorCompanyName || income?.description || 'Partenaire';
      return `Partenaire — ${name}`;
    }
    case 'coureur_independant': {
      const rider = contextSubject(riders, normalized.subjectId);
      return rider
        ? `Athlète indépendant — ${rider.firstName} ${rider.lastName}`
        : 'Athlète indépendant';
    }
    case 'staff_independant': {
      const member = contextSubject(staff, normalized.subjectId);
      return member
        ? `Staff indépendant — ${member.firstName} ${member.lastName}`
        : 'Staff indépendant';
    }
    default:
      return 'Aperçu';
  }
}

function contextSubject<T extends { id: string }>(
  items: T[],
  subjectId?: string | null,
): T | undefined {
  return items.find((item) => item.id === subjectId) ?? items[0];
}

export function isSuperAdminRolePreview(
  isSuperAdmin: boolean,
  config: SuperAdminPreviewConfig,
): boolean {
  return isSuperAdmin && config.mode !== 'full';
}

/** Vue holding : réservée au super admin holding, masquée en aperçu rôle (staff/coureur/manager). */
export function canAccessHoldingDashboard(
  user: User | null | undefined,
  options?: { realUser?: User | null; previewMode?: SuperAdminPreviewMode },
): boolean {
  if (!isHoldingSuperAdminUser(user)) return false;
  const { realUser, previewMode = 'full' } = options ?? {};
  if (realUser && isSuperAdminUser(realUser) && previewMode !== 'full') {
    return false;
  }
  return true;
}

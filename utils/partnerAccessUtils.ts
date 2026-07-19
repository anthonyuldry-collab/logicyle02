import {
  AppSection,
  IncomeCategory,
  IncomeItem,
  InvoiceStatus,
  PartnerAccess,
  PartnerScope,
  RaceEvent,
  TeamRole,
  User,
  UserRole,
} from '../types';
import { isSponsorshipIncome } from './financialUtils';
import { isSuperAdminUser } from './superAdminUtils';

export const ALL_PARTNER_SCOPES: PartnerScope[] = [
  'view_budget',
  'view_counterparts',
  'view_documents',
  'view_payment_status',
  'view_events',
  'view_comms',
  'view_media',
  'view_results',
];

/**
 * Scopes utiles au service com (rédaction / couverture) —
 * sans budget, contrats, paiement ni contreparties juridiques.
 */
export const COMMS_PARTNER_SCOPES: PartnerScope[] = [
  'view_events',
  'view_comms',
  'view_media',
  'view_results',
];

/** Compat : anciens accès sans view_media / view_results héritent via view_comms / view_events. */
const SCOPE_FALLBACKS: Partial<Record<PartnerScope, PartnerScope>> = {
  view_media: 'view_comms',
  view_results: 'view_events',
};

export function buildPartnerDashboard(params: {
  access: PartnerAccess;
  incomeItem: IncomeItem;
  teamName: string;
  events: RaceEvent[];
}) {
  const { access, incomeItem, teamName, events } = params;
  const allocatedBudget = incomeItem.amount;
  const isPaid = incomeItem.invoiceStatus === InvoiceStatus.PAID;
  const isIssued = incomeItem.invoiceStatus === InvoiceStatus.ISSUED;

  const contractStart = incomeItem.sponsorshipContractStart;
  const contractEnd = incomeItem.sponsorshipContractEnd;

  const teamEvents = events
    .filter((e) => {
      const d = e.date.slice(0, 10);
      if (contractStart && d < contractStart) return false;
      if (contractEnd && d > contractEnd) return false;
      return d >= new Date().toISOString().slice(0, 10);
    })
    .slice(0, 12);

  const contractDaysTotal =
    contractStart && contractEnd
      ? Math.max(
          1,
          Math.ceil(
            (new Date(contractEnd).getTime() - new Date(contractStart).getTime()) / 86400000,
          ),
        )
      : null;
  const contractDaysElapsed =
    contractStart && contractDaysTotal
      ? Math.min(
          contractDaysTotal,
          Math.max(
            0,
            Math.ceil(
              (Date.now() - new Date(contractStart).getTime()) / 86400000,
            ),
          ),
        )
      : null;
  const contractProgressPercent =
    contractDaysTotal && contractDaysElapsed != null
      ? Math.round((contractDaysElapsed / contractDaysTotal) * 100)
      : null;

  return {
    sponsorName: access.sponsorCompanyName,
    teamName,
    contractDescription: incomeItem.description,
    allocatedBudget,
    counterparts: incomeItem.partnershipCounterparts,
    conventionNumber: incomeItem.conventionNumber,
    cerfaReceiptNumber: incomeItem.cerfaReceiptNumber,
    paymentStatus: isPaid ? 'paid' : isIssued ? 'invoiced' : 'pending',
    paidAt: incomeItem.paidAt,
    issuedAt: incomeItem.issuedAt,
    contractStart,
    contractEnd,
    contractProgressPercent,
    contactName: incomeItem.sponsorshipContactName,
    contactEmail: incomeItem.sponsorshipContactEmail,
    upcomingEvents: teamEvents,
    scopes: access.scopes,
  };
}

export function canPartnerView(scope: PartnerScope, access: PartnerAccess): boolean {
  if (!access.isActive) return false;
  if (access.scopes.includes(scope)) return true;
  const fallback = SCOPE_FALLBACKS[scope];
  return Boolean(fallback && access.scopes.includes(fallback));
}

export function buildPartnerAccessFromIncome(
  income: IncomeItem,
  userId: string,
  teamId: string,
  grantedByUserId?: string,
  scopes: PartnerScope[] = ALL_PARTNER_SCOPES,
): PartnerAccess | null {
  if (!isSponsorshipIncome(income) && income.category !== IncomeCategory.SPONSORING && !income.sponsorCompanyName) {
    return null;
  }
  return {
    id: `pa-${income.id}-${userId}`,
    userId,
    teamId,
    incomeItemId: income.id,
    sponsorCompanyName: income.sponsorCompanyName || income.clientName || income.description,
    scopes,
    grantedAt: new Date().toISOString(),
    grantedByUserId,
    isActive: true,
  };
}

export function findIncomeForPartnerAccess(
  access: PartnerAccess,
  incomeItems: IncomeItem[],
): IncomeItem | null {
  return (
    incomeItems.find((i) => i.id === access.incomeItemId)
    || incomeItems.find((i) => isSponsorshipIncome(i))
    || null
  );
}

export function buildManagerPreviewAccess(
  income: IncomeItem,
  userId: string,
  teamId: string,
  scopes: PartnerScope[] = ALL_PARTNER_SCOPES,
): PartnerAccess {
  return {
    id: `preview-${income.id}-${userId}`,
    userId,
    teamId,
    incomeItemId: income.id,
    sponsorCompanyName: income.sponsorCompanyName || income.clientName || income.description,
    scopes: [...scopes],
    grantedAt: new Date().toISOString(),
    isActive: true,
  };
}

/** Aperçu portail restreint pour la com (médias / résultats / gazette / calendrier). */
export function buildCommsPreviewAccess(
  income: IncomeItem,
  userId: string,
  teamId: string,
): PartnerAccess {
  return buildManagerPreviewAccess(income, userId, teamId, COMMS_PARTNER_SCOPES);
}

export function canPreviewPartnerPortal(
  userRole?: string,
  permissionRole?: string,
  user?: User | null,
): boolean {
  if (isSuperAdminUser(user)) return true;
  if (userRole === UserRole.MANAGER || permissionRole === TeamRole.ADMIN) return true;
  // Admins équipe parfois stockés avec permissionRole string hors enum.
  if (String(permissionRole || '').toLowerCase() === 'admin') return true;
  return false;
}

const PARTNER_ALLOWED_SECTIONS: AppSection[] = ['partnerPortal', 'userSettings'];

export function isPartnerUser(user: User | null | undefined): boolean {
  return user?.userRole === UserRole.PARTNER;
}

export function isSectionAllowedForPartner(section: AppSection): boolean {
  return PARTNER_ALLOWED_SECTIONS.includes(section);
}

export function resolvePartnerAccess(params: {
  partnerAccesses: PartnerAccess[];
  userId: string;
  userEmail?: string;
  teamId: string | null;
  incomeItems: IncomeItem[];
  userRole?: string;
}): PartnerAccess | null {
  const { partnerAccesses, userId, userEmail, teamId, incomeItems } = params;
  const fromFirestore = partnerAccesses.find(
    (a) => a.userId === userId && a.isActive && (!teamId || a.teamId === teamId)
  );
  if (fromFirestore) return fromFirestore;

  const normalizedEmail = userEmail?.trim().toLowerCase();
  if (normalizedEmail && teamId) {
    const linkedIncome = incomeItems.find(
      (i) =>
        isSponsorshipIncome(i)
        && i.sponsorshipContactEmail?.trim().toLowerCase() === normalizedEmail,
    );
    if (linkedIncome) {
      return buildPartnerAccessFromIncome(linkedIncome, userId, teamId);
    }
  }

  return null;
}

export function resolvePartnerPortalSession(params: {
  partnerAccesses: PartnerAccess[];
  userId: string;
  userEmail?: string;
  teamId: string | null;
  incomeItems: IncomeItem[];
  userRole?: string;
  permissionRole?: string;
  previewIncomeItemId?: string | null;
  previewAsUser?: User | null;
  /** full = manager ; comms = aperçu rédactionnel sans données sensibles */
  previewMode?: 'full' | 'comms';
}): {
  access: PartnerAccess | null;
  incomeItem: IncomeItem | null;
  isPreview: boolean;
} {
  const {
    partnerAccesses,
    userId,
    userEmail,
    teamId,
    incomeItems,
    userRole,
    permissionRole,
    previewIncomeItemId,
    previewAsUser,
    previewMode = 'full',
  } = params;

  const fromFirestore = partnerAccesses.find(
    (a) => a.userId === userId && a.isActive && (!teamId || a.teamId === teamId),
  );
  if (fromFirestore) {
    return {
      access: fromFirestore,
      incomeItem: findIncomeForPartnerAccess(fromFirestore, incomeItems),
      isPreview: false,
    };
  }

  const normalizedEmail = userEmail?.trim().toLowerCase();
  if (normalizedEmail && teamId) {
    const linkedIncome = incomeItems.find(
      (i) =>
        isSponsorshipIncome(i)
        && i.sponsorshipContactEmail?.trim().toLowerCase() === normalizedEmail,
    );
    if (linkedIncome) {
      return {
        access: buildPartnerAccessFromIncome(linkedIncome, userId, teamId),
        incomeItem: linkedIncome,
        isPreview: false,
      };
    }
  }

  const isPartnerRolePreview = userRole === UserRole.PARTNER && !!previewIncomeItemId;
  const isManagerPreview = canPreviewPartnerPortal(userRole, permissionRole, previewAsUser);
  const isCommsPreview = previewMode === 'comms' && !!previewIncomeItemId && !!teamId;

  if ((isPartnerRolePreview || isManagerPreview || isCommsPreview) && teamId) {
    const previewIncome =
      (previewIncomeItemId
        ? incomeItems.find((i) => i.id === previewIncomeItemId)
        : null)
      || incomeItems.find((i) => isSponsorshipIncome(i))
      || incomeItems.find((i) => Boolean(i.sponsorCompanyName))
      || null;

    if (previewIncome) {
      const useCommsScopes =
        previewMode === 'comms'
        || (isCommsPreview && !isManagerPreview);
      return {
        access: buildManagerPreviewAccess(
          previewIncome,
          userId,
          teamId,
          useCommsScopes ? COMMS_PARTNER_SCOPES : ALL_PARTNER_SCOPES,
        ),
        incomeItem: previewIncome,
        isPreview: true,
      };
    }
  }

  return { access: null, incomeItem: null, isPreview: false };
}

export function findActivePartnerAccessForUser(
  partnerAccesses: PartnerAccess[],
  userId: string,
): PartnerAccess | undefined {
  return partnerAccesses.find((a) => a.userId === userId && a.isActive);
}

export function resolvePartnerTeamId(params: {
  partnerAccesses: PartnerAccess[];
  userId: string;
  userEmail?: string;
  incomeItems?: IncomeItem[];
}): string | null {
  const fromAccess = findActivePartnerAccessForUser(params.partnerAccesses, params.userId);
  if (fromAccess?.teamId) return fromAccess.teamId;

  const normalizedEmail = params.userEmail?.trim().toLowerCase();
  if (normalizedEmail && params.incomeItems?.length) {
    const linked = params.incomeItems.find(
      (i) =>
        isSponsorshipIncome(i)
        && i.sponsorshipContactEmail?.trim().toLowerCase() === normalizedEmail,
    );
    if (linked) {
      const accessForIncome = params.partnerAccesses.find(
        (a) => a.incomeItemId === linked.id && a.userId === params.userId && a.isActive,
      );
      if (accessForIncome?.teamId) return accessForIncome.teamId;
    }
  }
  return null;
}

/** Propose un patch teamId pour un compte partenaire invité. */
export function getPartnerUserTeamPatch(user: User, teamId: string): Partial<User> | null {
  if (user.userRole !== UserRole.PARTNER || user.teamId === teamId) return null;
  return { teamId };
}

export function getPartnerAccessesForTeam(
  partnerAccesses: PartnerAccess[],
  teamId: string,
): PartnerAccess[] {
  return partnerAccesses.filter((a) => a.teamId === teamId && a.isActive);
}

export function getPartnerAccessesForIncome(
  partnerAccesses: PartnerAccess[],
  incomeItemId: string,
): PartnerAccess[] {
  return partnerAccesses.filter((a) => a.incomeItemId === incomeItemId && a.isActive);
}

export function getPartnerScopeLabel(scope: PartnerScope, language: 'fr' | 'en' = 'fr'): string {
  const labels: Record<PartnerScope, { fr: string; en: string }> = {
    view_budget: { fr: 'Budget alloué', en: 'Allocated budget' },
    view_counterparts: { fr: 'Contreparties', en: 'Counterparts' },
    view_documents: { fr: 'Documents', en: 'Documents' },
    view_payment_status: { fr: 'Statut paiement', en: 'Payment status' },
    view_events: { fr: 'Événements', en: 'Events' },
    view_comms: { fr: 'Newsletters & com', en: 'Newsletters & comms' },
    view_media: { fr: 'Photos & médias', en: 'Photos & media' },
    view_results: { fr: 'Résultats & classements', en: 'Results & rankings' },
  };
  const entry = labels[scope];
  if (!entry) return String(scope);
  return entry[language] || entry.fr;
}

import { SECTION_MIN_PLAN, getIndependentPlanIdForRole, getPlanById, isPlanAtLeast } from '../constants/subscriptionPlans';
import { AppSection, SubscriptionPlanId, TeamSubscription, User, UserRole } from '../types';

export interface SubscriptionAccess {
  isActive: boolean;
  planId: SubscriptionPlanId;
  daysRemaining: number | null;
  isTrial: boolean;
  isPilot: boolean;
  isExpired: boolean;
  statusLabel: { fr: string; en: string };
}

function parseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeSubscription(
  subscription: TeamSubscription | undefined,
  teamLevelPlan: SubscriptionPlanId
): TeamSubscription {
  if (subscription?.planId && subscription?.status) {
    return subscription;
  }
  const now = new Date();
  const pilotEnds = new Date(now);
  pilotEnds.setDate(pilotEnds.getDate() + 90);
  return {
    planId: teamLevelPlan,
    status: 'pilot',
    pilotEndsAt: pilotEnds.toISOString(),
  };
}

export function getSubscriptionAccess(subscription: TeamSubscription | undefined, fallbackPlan: SubscriptionPlanId): SubscriptionAccess {
  const sub = normalizeSubscription(subscription, fallbackPlan);
  const now = Date.now();

  const trialEnd = parseDate(sub.trialEndsAt);
  const pilotEnd = parseDate(sub.pilotEndsAt);
  const periodEnd = parseDate(sub.currentPeriodEnd);

  const isTrial = sub.status === 'trialing' && trialEnd !== null && trialEnd.getTime() > now;
  const isPilot = sub.status === 'pilot' && pilotEnd !== null && pilotEnd.getTime() > now;
  const isActivePaid = sub.status === 'active';
  const isPastDue = sub.status === 'past_due';

  const endDate = isTrial ? trialEnd : isPilot ? pilotEnd : periodEnd;
  const daysRemaining = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - now) / (1000 * 60 * 60 * 24)))
    : null;

  const isExpired =
    sub.status === 'canceled' ||
    (sub.status === 'trialing' && trialEnd !== null && trialEnd.getTime() <= now) ||
    (sub.status === 'pilot' && pilotEnd !== null && pilotEnd.getTime() <= now);

  const isActive = isActivePaid || isPastDue || isTrial || isPilot;

  let statusLabel: { fr: string; en: string };
  if (isTrial) {
    statusLabel = { fr: `Essai (${daysRemaining}j restants)`, en: `Trial (${daysRemaining}d left)` };
  } else if (isPilot) {
    statusLabel = { fr: `Pilote (${daysRemaining}j restants)`, en: `Pilot (${daysRemaining}d left)` };
  } else if (isActivePaid) {
    statusLabel = { fr: 'Actif', en: 'Active' };
  } else if (isPastDue) {
    statusLabel = { fr: 'Paiement en retard', en: 'Past due' };
  } else if (isExpired) {
    statusLabel = { fr: 'Expiré', en: 'Expired' };
  } else {
    statusLabel = { fr: sub.status, en: sub.status };
  }

  return {
    isActive,
    planId: sub.planId,
    daysRemaining,
    isTrial,
    isPilot,
    isExpired,
    statusLabel,
  };
}

/** Sections toujours accessibles même si l’abonnement est expiré / hors plan. */
export const ALWAYS_ACCESSIBLE_SECTIONS: AppSection[] = [
  'userSettings',
  'settings',
  'pricing',
  'adminDashboard',
  'organizationDashboard',
  'superAdmin',
];

export function canAccessSection(
  section: AppSection,
  subscription: TeamSubscription | undefined,
  fallbackPlan: SubscriptionPlanId
): boolean {
  if (ALWAYS_ACCESSIBLE_SECTIONS.includes(section)) return true;

  const access = getSubscriptionAccess(subscription, fallbackPlan);
  if (!access.isActive) return false;

  const required = SECTION_MIN_PLAN[section];
  if (!required) return true;

  return isPlanAtLeast(access.planId, required);
}

export function getUpgradePlanForSection(
  section: AppSection,
  currentPlan: SubscriptionPlanId
): SubscriptionPlanId | null {
  const required = SECTION_MIN_PLAN[section];
  if (!required || isPlanAtLeast(currentPlan, required)) return null;
  return required;
}

export function canCreateEvent(
  subscription: TeamSubscription | undefined,
  fallbackPlan: SubscriptionPlanId,
  currentEventCount: number
): boolean {
  const access = getSubscriptionAccess(subscription, fallbackPlan);
  if (!access.isActive) return false;
  const limit = getPlanById(access.planId).maxEventsPerSeason;
  if (limit === null) return true;
  return currentEventCount < limit;
}

export function getLockedSections(
  subscription: TeamSubscription | undefined,
  fallbackPlan: SubscriptionPlanId
): AppSection[] {
  return (Object.keys(SECTION_MIN_PLAN) as AppSection[]).filter(
    (section) => !canAccessSection(section, subscription, fallbackPlan)
  );
}

export function normalizeIndependentSubscription(
  subscription: TeamSubscription | undefined,
  userRole: UserRole | string
): TeamSubscription {
  const fallbackPlan = getIndependentPlanIdForRole(userRole);
  if (subscription?.planId && subscription?.status) {
    return subscription;
  }
  // Pas d'essai inventé : sans formule choisie / activée, l'accès reste inactif
  return {
    planId: fallbackPlan,
    status: 'canceled',
  };
}

export function getIndependentSubscriptionAccess(
  user: User | null | undefined
): SubscriptionAccess | null {
  if (!user) return null;
  const fallbackPlan = getIndependentPlanIdForRole(user.userRole);
  return getSubscriptionAccess(user.subscription, fallbackPlan);
}

export function hasActiveIndependentSubscription(user: User | null | undefined): boolean {
  const access = getIndependentSubscriptionAccess(user);
  return access?.isActive ?? false;
}

/** Visibilité scouting / marketplace : abonnement actif + toggle utilisateur */
export function canIndependentShowInMarketplace(user: User): boolean {
  if (!hasActiveIndependentSubscription(user)) return false;
  if (user.userRole === UserRole.STAFF) return user.openToExternalMissions === true;
  return user.isSearchable === true;
}

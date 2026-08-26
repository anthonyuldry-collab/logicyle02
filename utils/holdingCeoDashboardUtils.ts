import {
  SubscriptionPlanId,
  SubscriptionStatus,
  Team,
  TeamSubscription,
  User,
  UserRole,
} from '../types';
import { SUPER_ADMIN_EMAILS } from '../constants';
import { getPlanById } from '../constants/subscriptionPlans';
import { isIndependentUser } from './independentUtils';
import { isPresentationDemoTeam } from './presentationDemoAccess';

const LIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'pilot', 'past_due'];

export function subscriptionIsLive(sub?: TeamSubscription): boolean {
  return Boolean(sub?.planId && sub.status && LIVE_STATUSES.includes(sub.status));
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

function isSuperAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return SUPER_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}

/**
 * Équipe cliente pour le Pilotage PDG.
 * Exclut sandboxes fondateur, démos et équipes marquées internes.
 * Compte uniquement si `commercialClient === true` (opt-in / webhook Stripe).
 */
export function isCommercialClientTeam(team: Team): boolean {
  if (!team || isPresentationDemoTeam(team)) return false;
  if (team.isPlatformInternal === true) return false;
  return team.commercialClient === true;
}

/**
 * Indépendant client pour le Pilotage PDG.
 * Exclut Super Admin / comptes internes ; opt-in `commercialClient`.
 */
export function isCommercialIndependentUser(user: User): boolean {
  if (!isIndependentUser(user)) return false;
  if (user.isPlatformInternal === true) return false;
  if (isSuperAdminEmail(user.email)) return false;
  return user.commercialClient === true;
}

export function filterCommercialClientTeams(teams: Team[]): Team[] {
  return teams.filter(isCommercialClientTeam);
}

export function filterCommercialIndependents(users: User[]): User[] {
  return users.filter(isCommercialIndependentUser);
}

/** MRR estimé à partir des grilles tarifaires (équipes + indépendants clients). */
export function estimatePortfolioMrr(teams: Team[], users: User[] = []): number {
  let mrr = 0;

  const addSub = (sub?: TeamSubscription) => {
    if (!subscriptionIsLive(sub) || !sub?.planId) return;
    const plan = getPlanById(sub.planId);
    if (plan.monthlyPriceEur == null) return;
    if (sub.billingInterval === 'year' && plan.annualPriceEur != null) {
      mrr += plan.annualPriceEur / 12;
    } else {
      mrr += plan.monthlyPriceEur;
    }
  };

  filterCommercialClientTeams(teams).forEach((t) => addSub(t.subscription));
  filterCommercialIndependents(users).forEach((u) => addSub(u.subscription));
  return Math.round(mrr);
}

export function countSubscriptionsByStatus(teams: Team[]): Record<string, number> {
  const counts: Record<string, number> = {
    active: 0,
    trialing: 0,
    pilot: 0,
    past_due: 0,
    canceled: 0,
    none: 0,
  };
  for (const team of filterCommercialClientTeams(teams)) {
    const status = team.subscription?.status;
    if (!status || !team.subscription?.planId) {
      counts.none += 1;
    } else if (status in counts) {
      counts[status] += 1;
    } else {
      counts.none += 1;
    }
  }
  return counts;
}

export function countIndependentPortfolio(users: User[]): {
  athletes: number;
  staff: number;
  searchableAthletes: number;
  openStaff: number;
} {
  const independents = filterCommercialIndependents(users);
  const athletes = independents.filter((u) => u.userRole === UserRole.COUREUR);
  const staff = independents.filter((u) => u.userRole === UserRole.STAFF);
  return {
    athletes: athletes.length,
    staff: staff.length,
    searchableAthletes: athletes.filter((u) => u.isSearchable).length,
    openStaff: staff.filter((u) => u.openToExternalMissions).length,
  };
}

export function teamsNeedingAttention(teams: Team[]): Team[] {
  return filterCommercialClientTeams(teams).filter((t) => {
    const s = t.subscription;
    if (!s?.planId) return false;
    if (s.status === 'past_due' || s.status === 'canceled') return true;
    const end = s.currentPeriodEnd || s.pilotEndsAt || s.trialEndsAt;
    if (!end) return false;
    const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 14;
  });
}

export function planLabelFr(planId?: SubscriptionPlanId | string): string {
  if (!planId) return 'Sans plan';
  try {
    return getPlanById(planId as SubscriptionPlanId).name.fr;
  } catch {
    return String(planId);
  }
}

/** Entonnoir lancement ops — à partir des abonnements clients (sans charge events cross-tenant). */
export function computeLaunchFunnelMetrics(teams: Team[]): {
  trialOrPilot: number;
  activePaid: number;
  pastDue: number;
  canceled: number;
  trialToActiveRatePct: number | null;
} {
  const clients = filterCommercialClientTeams(teams);
  let trialOrPilot = 0;
  let activePaid = 0;
  let pastDue = 0;
  let canceled = 0;

  for (const team of clients) {
    const status = team.subscription?.status;
    if (status === 'trialing' || status === 'pilot') trialOrPilot += 1;
    else if (status === 'active') activePaid += 1;
    else if (status === 'past_due') pastDue += 1;
    else if (status === 'canceled') canceled += 1;
  }

  const convertedBase = activePaid + trialOrPilot;
  const trialToActiveRatePct =
    convertedBase > 0 ? Math.round((activePaid / convertedBase) * 1000) / 10 : null;

  return { trialOrPilot, activePaid, pastDue, canceled, trialToActiveRatePct };
}

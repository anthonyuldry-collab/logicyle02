import {
  SubscriptionPlanId,
  SubscriptionStatus,
  Team,
  TeamSubscription,
  User,
  UserRole,
} from '../types';
import { getPlanById } from '../constants/subscriptionPlans';
import { isIndependentUser } from './independentUtils';

const LIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'pilot', 'past_due'];

export function subscriptionIsLive(sub?: TeamSubscription): boolean {
  return Boolean(sub?.planId && sub.status && LIVE_STATUSES.includes(sub.status));
}

/** MRR estimé à partir des grilles tarifaires (équipes + indépendants). */
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

  teams.forEach((t) => addSub(t.subscription));
  users.filter(isIndependentUser).forEach((u) => addSub(u.subscription));
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
  for (const team of teams) {
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
  const independents = users.filter(isIndependentUser);
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
  return teams.filter((t) => {
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

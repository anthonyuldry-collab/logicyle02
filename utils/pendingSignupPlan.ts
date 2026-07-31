import { SubscriptionPlanId } from '../types';

const PLAN_KEY = 'logicycle:pendingSignupPlan';
const INTERVAL_KEY = 'logicycle:pendingSignupInterval';

export type PendingSignupInterval = 'month' | 'year';

export function setPendingSignupPlan(
  planId: SubscriptionPlanId,
  interval?: PendingSignupInterval,
): void {
  try {
    sessionStorage.setItem(PLAN_KEY, planId);
    if (interval) sessionStorage.setItem(INTERVAL_KEY, interval);
  } catch {
    /* private mode */
  }
}

export function consumePendingSignupPlan(): {
  planId?: SubscriptionPlanId;
  interval?: PendingSignupInterval;
} {
  try {
    const planId = sessionStorage.getItem(PLAN_KEY) as SubscriptionPlanId | null;
    const interval = sessionStorage.getItem(INTERVAL_KEY) as PendingSignupInterval | null;
    sessionStorage.removeItem(PLAN_KEY);
    sessionStorage.removeItem(INTERVAL_KEY);
    if (planId && Object.values(SubscriptionPlanId).includes(planId)) {
      return {
        planId,
        interval: interval === 'month' || interval === 'year' ? interval : undefined,
      };
    }
  } catch {
    /* private mode */
  }
  return {};
}

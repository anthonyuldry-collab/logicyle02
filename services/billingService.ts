import { getFunctions, httpsCallable } from 'firebase/functions';
import { SubscriptionPlanId, TeamSubscription } from '../types';
import { PILOT_DAYS, TRIAL_DAYS, getDefaultPlanForTeamLevel } from '../constants/subscriptionPlans';
import { TeamLevel } from '../types';

export function buildInitialSubscription(
  level: TeamLevel,
  selectedPlanId?: SubscriptionPlanId
): TeamSubscription {
  const planId = selectedPlanId ?? getDefaultPlanForTeamLevel(level);
  const now = new Date();

  const isHighTier =
    planId === SubscriptionPlanId.CONTINENTAL ||
    planId === SubscriptionPlanId.PRO ||
    planId === SubscriptionPlanId.FEDERATION;

  if (isHighTier) {
    const pilotEnds = new Date(now);
    pilotEnds.setDate(pilotEnds.getDate() + PILOT_DAYS);
    return {
      planId,
      status: 'pilot',
      pilotEndsAt: pilotEnds.toISOString(),
    };
  }

  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
  return {
    planId,
    status: 'trialing',
    trialEndsAt: trialEnds.toISOString(),
  };
}

export async function createCheckoutSession(
  teamId: string,
  planId: SubscriptionPlanId,
  interval: 'month' | 'year'
): Promise<{ url: string }> {
  const functions = getFunctions();
  const fn = httpsCallable<
    { teamId: string; planId: SubscriptionPlanId; interval: 'month' | 'year' },
    { url: string }
  >(functions, 'createStripeCheckout');
  const result = await fn({ teamId, planId, interval });
  return result.data;
}

export async function createBillingPortalSession(teamId: string): Promise<{ url: string }> {
  const functions = getFunctions();
  const fn = httpsCallable<{ teamId: string }, { url: string }>(functions, 'createStripePortal');
  const result = await fn({ teamId });
  return result.data;
}

export async function requestPlanUpgrade(
  teamId: string,
  planId: SubscriptionPlanId,
  interval: 'month' | 'year' = 'year'
): Promise<void> {
  const { url } = await createCheckoutSession(teamId, planId, interval);
  window.location.href = url;
}

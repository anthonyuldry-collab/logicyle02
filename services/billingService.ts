import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';
import { FIREBASE_FUNCTIONS_REGION } from '../constants/firebaseRegions';
import { SubscriptionPlanId, TeamSubscription, UserRole } from '../types';
import {
  PILOT_DAYS,
  TRIAL_DAYS,
  getDefaultPlanForTeamLevel,
  getIndependentPlanIdForRole,
} from '../constants/subscriptionPlans';
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

export function buildInitialIndependentSubscription(userRole: UserRole | string): TeamSubscription {
  const planId = getIndependentPlanIdForRole(userRole);
  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
  return {
    planId,
    status: 'trialing',
    trialEndsAt: trialEnds.toISOString(),
  };
}

export async function createIndependentCheckoutSession(
  planId: SubscriptionPlanId,
  interval: 'month' | 'year',
  referralCode?: string | null
): Promise<{ url: string }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<
    { planId: SubscriptionPlanId; interval: 'month' | 'year'; referralCode?: string; scope: 'user' },
    { url: string }
  >(functions, 'createStripeCheckout');
  const payload: {
    planId: SubscriptionPlanId;
    interval: 'month' | 'year';
    referralCode?: string;
    scope: 'user';
  } = { planId, interval, scope: 'user' };
  if (referralCode?.trim()) {
    payload.referralCode = referralCode.trim();
  }
  const result = await fn(payload);
  return result.data;
}

export async function createIndependentBillingPortalSession(): Promise<{ url: string }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<{ scope: 'user' }, { url: string }>(functions, 'createStripePortal');
  const result = await fn({ scope: 'user' });
  return result.data;
}

export async function requestIndependentPlanUpgrade(
  planId: SubscriptionPlanId,
  interval: 'month' | 'year' = 'year',
  referralCode?: string | null
): Promise<void> {
  const { url } = await createIndependentCheckoutSession(planId, interval, referralCode);
  window.location.href = url;
}

export async function createCheckoutSession(
  teamId: string,
  planId: SubscriptionPlanId,
  interval: 'month' | 'year',
  referralCode?: string | null
): Promise<{ url: string }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<
    { teamId: string; planId: SubscriptionPlanId; interval: 'month' | 'year'; referralCode?: string },
    { url: string }
  >(functions, 'createStripeCheckout');
  const payload: { teamId: string; planId: SubscriptionPlanId; interval: 'month' | 'year'; referralCode?: string } = {
    teamId,
    planId,
    interval,
  };
  if (referralCode?.trim()) {
    payload.referralCode = referralCode.trim();
  }
  const result = await fn(payload);
  return result.data;
}

export async function createBillingPortalSession(teamId: string): Promise<{ url: string }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<{ teamId: string }, { url: string }>(functions, 'createStripePortal');
  const result = await fn({ teamId });
  return result.data;
}

export async function requestPlanUpgrade(
  teamId: string,
  planId: SubscriptionPlanId,
  interval: 'month' | 'year' = 'year',
  referralCode?: string | null
): Promise<void> {
  const { url } = await createCheckoutSession(teamId, planId, interval, referralCode);
  window.location.href = url;
}

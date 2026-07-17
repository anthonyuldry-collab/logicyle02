import { describe, expect, it } from 'vitest';
import { SubscriptionPlanId } from '../../types';
import { canAccessSection } from '../subscriptionEntitlements';

describe('canAccessSection — admin toujours accessible', () => {
  const expired = {
    planId: SubscriptionPlanId.CLUB,
    status: 'canceled' as const,
  };

  it('laisse passer userSettings et adminDashboard même abo expiré', () => {
    expect(canAccessSection('userSettings', expired, SubscriptionPlanId.CLUB)).toBe(true);
    expect(canAccessSection('adminDashboard', expired, SubscriptionPlanId.CLUB)).toBe(true);
    expect(canAccessSection('myDashboard', expired, SubscriptionPlanId.CLUB)).toBe(true);
    expect(canAccessSection('pricing', expired, SubscriptionPlanId.CLUB)).toBe(true);
  });

  it('bloque encore les modules premium si abo expiré', () => {
    expect(canAccessSection('financial', expired, SubscriptionPlanId.CLUB)).toBe(false);
    expect(canAccessSection('scouting', expired, SubscriptionPlanId.CLUB)).toBe(false);
  });
});

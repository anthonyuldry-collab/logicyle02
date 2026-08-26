import { describe, expect, it } from 'vitest';
import { SubscriptionPlanId, TeamLevel, type Team } from '../../types';
import {
  isComplimentaryAccessTeam,
  isPlatformInternalTeam,
  isSuperAdminSwitcherTeam,
} from '../platformInternalTeam';
import { DEMO_PRES_TEAM_NAME } from '../../constants/demoPresentationTeam';

const baseTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 't-1',
  name: 'Équipe test',
  country: 'FR',
  level: TeamLevel.HORS_DN,
  ...overrides,
});

describe('isPlatformInternalTeam', () => {
  it('détecte le flag interne', () => {
    expect(isPlatformInternalTeam(baseTeam({ isPlatformInternal: true }))).toBe(true);
    expect(isPlatformInternalTeam(baseTeam())).toBe(false);
  });
});

describe('isComplimentaryAccessTeam', () => {
  it('inclut interne et démo Horizon', () => {
    expect(isComplimentaryAccessTeam(baseTeam({ isPlatformInternal: true }))).toBe(true);
    expect(isComplimentaryAccessTeam(baseTeam({ name: DEMO_PRES_TEAM_NAME }))).toBe(true);
    expect(isComplimentaryAccessTeam(baseTeam({ commercialClient: true }))).toBe(false);
  });
});

describe('isSuperAdminSwitcherTeam', () => {
  it('montre les équipes internes même sans équipe active', () => {
    const internal = baseTeam({ id: 'int', isPlatformInternal: true });
    expect(isSuperAdminSwitcherTeam(internal, null)).toBe(true);
  });

  it('montre l’équipe active même si elle n’est pas interne', () => {
    const client = baseTeam({ id: 'cli', commercialClient: true });
    expect(isSuperAdminSwitcherTeam(client, 'cli')).toBe(true);
    expect(isSuperAdminSwitcherTeam(client, null)).toBe(false);
  });
});

describe('abonnement interne', () => {
  it('n’est pas un plan payant Stripe (flag commercial)', () => {
    const team = baseTeam({
      isPlatformInternal: true,
      subscription: {
        planId: SubscriptionPlanId.PRO,
        status: 'active',
        billingInterval: 'year',
      },
    });
    expect(isPlatformInternalTeam(team)).toBe(true);
    expect(team.commercialClient).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import {
  estimatePortfolioMrr,
  filterCommercialClientTeams,
  isCommercialClientTeam,
  isCommercialIndependentUser,
} from '../holdingCeoDashboardUtils';
import { SubscriptionPlanId, UserRole, type Team, type User } from '../../types';

const sandboxTeam: Team = {
  id: 't-sandbox',
  name: 'Mon équipe test',
  country: 'FR',
  level: 'Hors DN (Club/Comité)' as Team['level'],
  subscription: {
    planId: SubscriptionPlanId.CLUB,
    status: 'active',
    billingInterval: 'month',
  },
};

const clientTeam: Team = {
  id: 't-client',
  name: 'VC Client',
  country: 'FR',
  level: 'Hors DN (Club/Comité)' as Team['level'],
  commercialClient: true,
  subscription: {
    planId: SubscriptionPlanId.COMPETITION,
    status: 'active',
    billingInterval: 'month',
  },
};

const internalFlagged: Team = {
  ...clientTeam,
  id: 't-internal',
  commercialClient: true,
  isPlatformInternal: true,
};

describe('isCommercialClientTeam', () => {
  it('exclut les sandboxes sans flag commercialClient', () => {
    expect(isCommercialClientTeam(sandboxTeam)).toBe(false);
  });

  it('inclut les équipes marquées commerciales', () => {
    expect(isCommercialClientTeam(clientTeam)).toBe(true);
  });

  it('exclut les équipes internes même si commercialClient', () => {
    expect(isCommercialClientTeam(internalFlagged)).toBe(false);
  });
});

describe('estimatePortfolioMrr', () => {
  it('ignore les équipes fondateur / sandbox', () => {
    expect(estimatePortfolioMrr([sandboxTeam, clientTeam], [])).toBe(119);
  });

  it('reste à 0 si aucune équipe cliente', () => {
    expect(estimatePortfolioMrr([sandboxTeam], [])).toBe(0);
    expect(filterCommercialClientTeams([sandboxTeam])).toHaveLength(0);
  });
});

describe('isCommercialIndependentUser', () => {
  it('exclut le super admin même indépendant', () => {
    const sa = {
      id: 'sa',
      email: 'anthony.uldry@hotmail.fr',
      firstName: 'A',
      lastName: 'U',
      userRole: UserRole.COUREUR,
      isIndependentProfile: true,
      commercialClient: true,
    } as User;
    expect(isCommercialIndependentUser(sa)).toBe(false);
  });
});

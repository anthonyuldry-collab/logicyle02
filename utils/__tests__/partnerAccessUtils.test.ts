import { describe, expect, it } from 'vitest';
import {
  resolvePartnerPortalSession,
  resolvePartnerTeamId,
  getPartnerUserTeamPatch,
} from '../partnerAccessUtils';
import {
  IncomeCategory,
  TeamRole,
  UserRole,
  type IncomeItem,
  type PartnerAccess,
  type User,
} from '../../types';

const sponsorshipIncome: IncomeItem = {
  id: 'inc-sponsor',
  description: 'Contrat VeloTech',
  amount: 15000,
  date: '2026-01-01',
  category: IncomeCategory.SPONSORING,
  sponsorCompanyName: 'VeloTech',
};

describe('resolvePartnerPortalSession', () => {
  it('autorise un aperçu super admin en rôle partenaire', () => {
    const session = resolvePartnerPortalSession({
      partnerAccesses: [],
      userId: 'admin-1',
      teamId: 'team-1',
      incomeItems: [sponsorshipIncome],
      userRole: UserRole.PARTNER,
      previewIncomeItemId: 'inc-sponsor',
    });

    expect(session.isPreview).toBe(true);
    expect(session.access?.sponsorCompanyName).toBe('VeloTech');
    expect(session.incomeItem?.id).toBe('inc-sponsor');
  });

  it('autorise un aperçu manager sans accès Firestore', () => {
    const session = resolvePartnerPortalSession({
      partnerAccesses: [],
      userId: 'manager-1',
      teamId: 'team-1',
      incomeItems: [sponsorshipIncome],
      userRole: UserRole.MANAGER,
      permissionRole: TeamRole.ADMIN,
      previewIncomeItemId: 'inc-sponsor',
    });

    expect(session.isPreview).toBe(true);
    expect(session.access?.scopes.length).toBeGreaterThan(0);
  });

  it('refuse un partenaire sans accès explicite ni email sponsor', () => {
    const session = resolvePartnerPortalSession({
      partnerAccesses: [],
      userId: 'partner-unknown',
      teamId: 'team-1',
      incomeItems: [sponsorshipIncome],
      userRole: UserRole.PARTNER,
    });

    expect(session.access).toBeNull();
    expect(session.incomeItem).toBeNull();
  });

  it('résout le teamId depuis un partnerAccess actif', () => {
    const accesses: PartnerAccess[] = [{
      id: 'pa-1',
      userId: 'partner-1',
      teamId: 'team-sponsor',
      incomeItemId: 'inc-sponsor',
      sponsorCompanyName: 'VeloTech',
      scopes: ['view_budget'],
      grantedAt: '2026-01-01',
      isActive: true,
    }];
    expect(resolvePartnerTeamId({
      partnerAccesses: accesses,
      userId: 'partner-1',
    })).toBe('team-sponsor');
  });

  it('propose un patch teamId pour un partenaire invité', () => {
    const partner: User = {
      id: 'p1',
      email: 'sponsor@test.com',
      firstName: 'S',
      lastName: 'P',
      userRole: UserRole.PARTNER,
    };
    expect(getPartnerUserTeamPatch(partner, 'team-1')).toEqual({ teamId: 'team-1' });
    expect(getPartnerUserTeamPatch({ ...partner, teamId: 'team-1' }, 'team-1')).toBeNull();
  });
});

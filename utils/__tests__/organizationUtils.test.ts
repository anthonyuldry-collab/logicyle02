import { describe, expect, it } from 'vitest';
import {
  canViewOrgDashboard,
  resolveOrganizationForUser,
} from '../organizationUtils';
import {
  TeamMembershipStatus,
  TeamRole,
  UserRole,
  type Organization,
  type Team,
  type TeamMembership,
  type User,
} from '../../types';

const holdingSuperAdmin = {
  id: 'u-holding',
  email: 'anthony.uldry@hotmail.fr',
  firstName: 'Anthony',
  lastName: 'Uldry',
  userRole: UserRole.MANAGER,
  teamId: 't1',
  permissionRole: TeamRole.ADMIN,
} as User;

const manager = {
  id: 'u1',
  email: 'mgr@test.fr',
  firstName: 'Mgr',
  lastName: 'Test',
  userRole: UserRole.MANAGER,
  teamId: 't1',
  permissionRole: TeamRole.ADMIN,
} as User;

const teams: Team[] = [
  { id: 't1', name: 'Team A WT', country: 'FR', level: 'DN1' as any, organizationId: 'org-1', teamKind: 'worldtour' },
  { id: 't2', name: 'Team A Dev', country: 'FR', level: 'DN1' as any, organizationId: 'org-1', teamKind: 'development' },
];

const memberships: TeamMembership[] = [
  {
    id: 'm1',
    email: manager.email,
    userId: manager.id,
    teamId: 't1',
    status: TeamMembershipStatus.ACTIVE,
    userRole: UserRole.MANAGER,
  },
];

describe('resolveOrganizationForUser', () => {
  it('expose le holding plateforme pour le super admin holding', () => {
    const org = resolveOrganizationForUser({
      organizations: [],
      teams,
      activeTeamId: 't1',
      currentUser: holdingSuperAdmin,
      memberships: [],
      userTeams: teams,
      isHoldingSuperAdmin: true,
    });
    expect(org?.id).toBe('holding-super-admin');
    expect(org?.teamIds).toEqual(['t1', 't2']);
  });

  it('ne crée pas de holding virtuel pour un manager multi-équipes', () => {
    const org = resolveOrganizationForUser({
      organizations: [],
      teams: [
        { id: 't1', name: 'A', country: 'FR', level: 'DN1' as any },
        { id: 't3', name: 'B', country: 'FR', level: 'DN1' as any },
      ],
      activeTeamId: 't1',
      currentUser: manager,
      memberships: [
        ...memberships,
        {
          id: 'm2',
          email: manager.email,
          userId: manager.id,
          teamId: 't3',
          status: TeamMembershipStatus.ACTIVE,
          userRole: UserRole.MANAGER,
        },
      ],
      userTeams: [
        { id: 't1', name: 'A', country: 'FR', level: 'DN1' as any },
        { id: 't3', name: 'B', country: 'FR', level: 'DN1' as any },
      ],
    });
    expect(org).toBeNull();
  });

  it('résout une org Firestore via organizationId sans accès holding', () => {
    const org = resolveOrganizationForUser({
      organizations: [],
      teams,
      activeTeamId: 't1',
      currentUser: manager,
      memberships,
      userTeams: [teams[0]],
    });
    expect(org?.id).toBe('org-1');
    expect(org?.teamIds).toEqual(['t1', 't2']);
  });
});

describe('canViewOrgDashboard', () => {
  it('autorise uniquement le super admin holding', () => {
    expect(canViewOrgDashboard({ isHoldingSuperAdmin: true })).toBe(true);
    expect(canViewOrgDashboard({ isHoldingSuperAdmin: false })).toBe(false);
    expect(canViewOrgDashboard({})).toBe(false);
  });

  it('refuse un manager même avec une organisation', () => {
    const org: Organization = {
      id: 'org-1',
      name: 'Org',
      country: 'FR',
      teamIds: ['t1', 't2'],
      adminUserIds: [],
      createdAt: '2026-01-01',
    };
    expect(
      canViewOrgDashboard({
        isHoldingSuperAdmin: false,
      })
    ).toBe(false);
    void org;
  });
});

import { describe, expect, it } from 'vitest';
import {
  canViewOrganizerApplicationDossier,
  ORGANIZER_DOSSIER_STAFF_ROLES,
} from '../staffRoleDataAccess';
import { StaffRole, StaffStatus, TeamRole, UserRole, type StaffMember, type User } from '../../types';

const baseUser: User = {
  id: 'u1',
  email: 'staff@test.com',
  firstName: 'Test',
  lastName: 'User',
  userRole: UserRole.STAFF,
  permissionRole: TeamRole.MEMBER,
};

const assistantMember: StaffMember = {
  id: 's1',
  firstName: 'Alice',
  lastName: 'Assistant',
  email: 'staff@test.com',
  role: StaffRole.ASSISTANT,
  status: StaffStatus.SALARIE,
  skills: [],
};

const dsMember: StaffMember = {
  ...assistantMember,
  id: 's2',
  role: StaffRole.DS,
};

describe('canViewOrganizerApplicationDossier', () => {
  it('refuse l’assistant sportif', () => {
    expect(canViewOrganizerApplicationDossier(baseUser, assistantMember)).toBe(false);
  });

  it('autorise le directeur sportif', () => {
    expect(canViewOrganizerApplicationDossier(baseUser, dsMember)).toBe(true);
  });

  it('autorise manager et admin sans fiche staff', () => {
    expect(
      canViewOrganizerApplicationDossier(
        { ...baseUser, userRole: UserRole.MANAGER },
        undefined,
      ),
    ).toBe(true);
    expect(
      canViewOrganizerApplicationDossier(
        { ...baseUser, permissionRole: TeamRole.ADMIN },
        undefined,
      ),
    ).toBe(true);
  });

  it('expose les rôles encadrement autorisés', () => {
    expect(ORGANIZER_DOSSIER_STAFF_ROLES.has('DS')).toBe(true);
    expect(ORGANIZER_DOSSIER_STAFF_ROLES.has('ASSISTANT')).toBe(false);
  });
});

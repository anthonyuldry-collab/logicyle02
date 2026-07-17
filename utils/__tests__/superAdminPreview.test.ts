import { describe, expect, it } from 'vitest';
import {
  buildPreviewUser,
  canAccessHoldingDashboard,
  getSuperAdminPreviewLabel,
  normalizeSuperAdminPreview,
} from '../superAdminPreview';
import { HOLDING_SUPER_ADMIN_EMAIL } from '../../constants';
import { IncomeCategory, UserRole, TeamRole, type User, type Rider, type StaffMember, type IncomeItem } from '../../types';

const holdingUser: User = {
  id: 'holding',
  email: HOLDING_SUPER_ADMIN_EMAIL,
  firstName: 'Anthony',
  lastName: 'Admin',
  userRole: UserRole.MANAGER,
  permissionRole: TeamRole.ADMIN,
};

const riders: Rider[] = [
  { id: 'r1', firstName: 'Alice', lastName: 'Martin', categories: [], disciplines: [] },
];

const staff: StaffMember[] = [
  { id: 's1', firstName: 'Bob', lastName: 'Dupont', role: 'Assistant' },
];

const sponsorshipIncome: IncomeItem = {
  id: 'inc-sponsor',
  description: 'Contrat VeloTech',
  amount: 15000,
  date: '2026-01-01',
  category: IncomeCategory.SPONSORING,
  sponsorCompanyName: 'VeloTech',
  sponsorshipContactName: 'Jean Sponsor',
};

describe('canAccessHoldingDashboard', () => {
  it('autorise le super admin holding en mode complet', () => {
    expect(canAccessHoldingDashboard(holdingUser, { previewMode: 'full' })).toBe(true);
  });

  it('masque la vue holding en aperçu staff', () => {
    expect(
      canAccessHoldingDashboard(holdingUser, {
        realUser: holdingUser,
        previewMode: 'staff',
      }),
    ).toBe(false);
  });

  it('refuse un utilisateur non holding', () => {
    expect(
      canAccessHoldingDashboard(
        { ...holdingUser, email: 'assistant@team.com', userRole: UserRole.STAFF },
      ),
    ).toBe(false);
  });
});

describe('normalizeSuperAdminPreview — partenaire', () => {
  it('sélectionne le premier partenariat sponsor par défaut', () => {
    expect(
      normalizeSuperAdminPreview({ mode: 'partenaire' }, riders, staff, [sponsorshipIncome]),
    ).toEqual({ mode: 'partenaire', subjectId: 'inc-sponsor' });
  });

  it('conserve un partenariat valide', () => {
    expect(
      normalizeSuperAdminPreview(
        { mode: 'partenaire', subjectId: 'inc-sponsor' },
        riders,
        staff,
        [sponsorshipIncome],
      ),
    ).toEqual({ mode: 'partenaire', subjectId: 'inc-sponsor' });
  });
});

describe('buildPreviewUser — partenaire', () => {
  it('simule un compte partenaire lié au sponsor', () => {
    const preview = buildPreviewUser(
      holdingUser,
      { mode: 'partenaire', subjectId: 'inc-sponsor' },
      { riders, staff, users: [], incomeItems: [sponsorshipIncome] },
    );

    expect(preview.userRole).toBe(UserRole.PARTNER);
    expect(preview.firstName).toBe('Jean');
    expect(preview.lastName).toBe('Sponsor');
    expect(preview.previewSubjectKind).toBe('partner');
    expect(preview.previewSubjectId).toBe('inc-sponsor');
  });
});

describe('buildPreviewUser — profils indépendants', () => {
  it('simule un athlète indépendant sans équipe', () => {
    const preview = buildPreviewUser(
      holdingUser,
      { mode: 'coureur_independant', subjectId: 'r1' },
      { riders, staff, users: [] },
    );

    expect(preview.userRole).toBe(UserRole.COUREUR);
    expect(preview.signupMode).toBe('independent');
    expect(preview.isIndependentProfile).toBe(true);
    expect(preview.teamId).toBeUndefined();
    expect(preview.firstName).toBe('Alice');
    expect(preview.subscription?.status).toBe('active');
  });

  it('simule un staff indépendant vacataire', () => {
    const preview = buildPreviewUser(
      holdingUser,
      { mode: 'staff_independant', subjectId: 's1' },
      { riders, staff, users: [] },
    );

    expect(preview.userRole).toBe(UserRole.STAFF);
    expect(preview.signupMode).toBe('independent');
    expect(preview.isIndependentProfile).toBe(true);
    expect(preview.openToExternalMissions).toBe(true);
    expect(preview.firstName).toBe('Bob');
  });
});

describe('getSuperAdminPreviewLabel — profils indépendants', () => {
  it('affiche le libellé athlète indépendant', () => {
    expect(
      getSuperAdminPreviewLabel(
        { mode: 'coureur_independant', subjectId: 'r1' },
        riders,
        staff,
      ),
    ).toBe('Athlète indépendant — Alice Martin');
  });

  it('affiche le libellé staff indépendant', () => {
    expect(
      getSuperAdminPreviewLabel(
        { mode: 'staff_independant', subjectId: 's1' },
        riders,
        staff,
      ),
    ).toBe('Staff indépendant — Bob Dupont');
  });
});

describe('getSuperAdminPreviewLabel — partenaire', () => {
  it('affiche le nom du sponsor', () => {
    expect(
      getSuperAdminPreviewLabel(
        { mode: 'partenaire', subjectId: 'inc-sponsor' },
        riders,
        staff,
        [sponsorshipIncome],
      ),
    ).toBe('Partenaire — VeloTech');
  });
});

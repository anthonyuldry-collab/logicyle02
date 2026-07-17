import { describe, expect, it } from 'vitest';
import { TeamRole, UserRole, type User } from '../../types';
import { resolveRiderForUser, userToRiderProfile, isIndependentUser } from '../independentUtils';

const independentRider: User = {
  id: 'u-ind',
  email: 'athlete@example.com',
  firstName: 'Léa',
  lastName: 'Martin',
  userRole: UserRole.COUREUR,
  permissionRole: TeamRole.VIEWER,
  signupMode: 'independent',
  isIndependentProfile: true,
  weightKg: 58,
  careerAspirations: 'Passer Elite',
};

describe('espace athlète indépendant', () => {
  it('détecte un profil indépendant', () => {
    expect(isIndependentUser(independentRider)).toBe(true);
  });

  it('construit un profil coureur depuis le User sans roster', () => {
    const rider = resolveRiderForUser([], independentRider);
    expect(rider?.id).toBe('u-ind');
    expect(rider?.firstName).toBe('Léa');
    expect(rider?.weightKg).toBe(58);
    expect(rider?.performanceGoals).toBe('Passer Elite');
  });

  it('préfère les données User pour un indépendant même si un roster existe', () => {
    const rosterRider = {
      ...userToRiderProfile(independentRider),
      id: 'other',
      email: 'athlete@example.com',
      weightKg: 70,
    };
    const resolved = resolveRiderForUser([rosterRider], independentRider);
    expect(resolved?.id).toBe('u-ind');
    expect(resolved?.weightKg).toBe(58);
  });
});

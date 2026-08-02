import { describe, it, expect } from 'vitest';
import { StaffRole } from './types';
import {
  resolveStaffRole,
  isManagerEquivalentStaffRole,
  getStaffRoleDisplayLabel,
  STAFF_ROLE_KEYS,
} from './utils/staffRoleUtils';

describe('association staff roles', () => {
  it('resolves bureau labels', () => {
    expect(resolveStaffRole('Président')).toBe(StaffRole.PRESIDENT);
    expect(resolveStaffRole('trésorier')).toBe(StaffRole.TRESORIER);
    expect(resolveStaffRole('Secrétaire')).toBe(StaffRole.SECRETAIRE);
    expect(resolveStaffRole('Vice-président')).toBe(StaffRole.VICE_PRESIDENT);
  });
  it('president/vp are manager-equivalent', () => {
    expect(isManagerEquivalentStaffRole(StaffRole.PRESIDENT)).toBe(true);
    expect(isManagerEquivalentStaffRole(StaffRole.VICE_PRESIDENT)).toBe(true);
    expect(isManagerEquivalentStaffRole(StaffRole.TRESORIER)).toBe(false);
    expect(isManagerEquivalentStaffRole(StaffRole.MANAGER)).toBe(true);
  });
  it('lists new roles near top', () => {
    expect(STAFF_ROLE_KEYS.slice(0, 5)).toEqual([
      'MANAGER', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE', 'TRESORIER',
    ]);
    expect(getStaffRoleDisplayLabel(StaffRole.PRESIDENT)).toBe('Président');
  });
});

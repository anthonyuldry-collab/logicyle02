import { describe, expect, it } from 'vitest';
import { ChecklistRole, StaffRole } from '../../types';
import {
  buildEmptyChecklistTemplatesRecord,
  mapStaffRoleToChecklistRole,
  mapStaffRoleKeyToChecklistRole,
} from '../checklistRoleUtils';

describe('buildEmptyChecklistTemplatesRecord', () => {
  it('initialise les 9 rôles', () => {
    const record = buildEmptyChecklistTemplatesRecord();
    expect(Object.keys(record).length).toBe(9);
    expect(record[ChecklistRole.MEDECIN]).toEqual([]);
  });
});

describe('mapStaffRoleToChecklistRole', () => {
  it('mappe les rôles santé et entraînement', () => {
    expect(mapStaffRoleToChecklistRole(StaffRole.ENTRAINEUR)).toBe(ChecklistRole.ENTRAINEUR);
    expect(mapStaffRoleToChecklistRole(StaffRole.KINE)).toBe(ChecklistRole.KINE);
    expect(mapStaffRoleToChecklistRole(StaffRole.MEDECIN)).toBe(ChecklistRole.MEDECIN);
  });
});

describe('mapStaffRoleKeyToChecklistRole', () => {
  it('mappe prépa physique vers entraîneur', () => {
    expect(mapStaffRoleKeyToChecklistRole('PREPA_PHYSIQUE')).toBe(ChecklistRole.ENTRAINEUR);
  });
});

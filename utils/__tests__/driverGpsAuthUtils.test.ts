import { describe, expect, it } from 'vitest';
import { StaffMember, StaffRole, StaffStatus } from '../../types';
import {
  isDriverAssignedToVehicle,
  resolveAuthorizedDriverStaffId,
  staffMemberMatchesAuthUser,
} from '../driverGpsAuthUtils';

const baseStaff = (overrides: Partial<StaffMember> & { id: string }): StaffMember => ({
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@team.fr',
  role: StaffRole.ASSISTANT,
  status: StaffStatus.VACATAIRE,
  skills: [],
  ...overrides,
});

describe('driverGpsAuthUtils', () => {
  it('staffMemberMatchesAuthUser par uid, userId ou e-mail', () => {
    expect(staffMemberMatchesAuthUser({ id: 'auth-1', email: 'a@b.fr' }, 'auth-1')).toBe(true);
    expect(
      staffMemberMatchesAuthUser({ id: 'staff_1', userId: 'auth-1', email: 'a@b.fr' }, 'auth-1'),
    ).toBe(true);
    expect(
      staffMemberMatchesAuthUser({ id: 'staff_1', email: 'Chauffeur@Team.fr' }, 'other', 'chauffeur@team.fr'),
    ).toBe(true);
    expect(
      staffMemberMatchesAuthUser({ id: 'staff_2', email: 'other@team.fr' }, 'auth-1', 'a@b.fr'),
    ).toBe(false);
  });

  it('resolveAuthorizedDriverStaffId accepte staff_* lié par e-mail', () => {
    const staff = [
      baseStaff({ id: 'staff_driver_1', email: 'chauffeur@team.fr' }),
      baseStaff({ id: 'staff_other', email: 'other@team.fr' }),
    ];
    expect(
      resolveAuthorizedDriverStaffId('staff_driver_1', staff, 'firebase-uid', 'chauffeur@team.fr'),
    ).toBe('staff_driver_1');
  });

  it('resolveAuthorizedDriverStaffId refuse un staff non lié', () => {
    const staff = [baseStaff({ id: 'staff_x', email: 'other@team.fr' })];
    expect(resolveAuthorizedDriverStaffId('staff_x', staff, 'uid-1', 'me@team.fr')).toBeNull();
  });

  it('isDriverAssignedToVehicle via driverId ou leg du jour', () => {
    expect(
      isDriverAssignedToVehicle({
        vehicleDriverId: 'staff_1',
        staffDocId: 'staff_1',
        transportLegs: [],
        vehicleId: 'veh_1',
      }),
    ).toBe(true);

    expect(
      isDriverAssignedToVehicle({
        staffDocId: 'staff_1',
        transportLegs: [
          {
            driverId: 'staff_1',
            assignedVehicleId: 'veh_2',
            departureDate: new Date().toISOString().slice(0, 10),
          },
        ],
        vehicleId: 'veh_2',
      }),
    ).toBe(true);

    expect(
      isDriverAssignedToVehicle({
        staffDocId: 'staff_1',
        transportLegs: [],
        vehicleId: 'veh_9',
      }),
    ).toBe(false);
  });
});

import { StaffMember, Vehicle } from '../types';
import { isStaffPositionFresh } from './driverGpsUtils';

export interface DriverGpsSetupStatus {
  assignDriver: boolean;
  gpsSource: boolean;
  driverSharing: boolean;
  driverName?: string;
  vehicleName?: string;
}

export function applyDriverGpsToVehicle(vehicle: Vehicle, driverId: string): Vehicle {
  return {
    ...vehicle,
    driverId,
    gpsSource: 'driver_app',
    gpsTrackingEnabled: true,
  };
}

export function evaluateVehicleDriverGpsSetup(
  vehicle: Vehicle,
  staff: StaffMember[],
  driverIdOverride?: string,
): DriverGpsSetupStatus {
  const effectiveDriverId = driverIdOverride || vehicle.driverId;
  const driver = effectiveDriverId ? staff.find((s) => s.id === effectiveDriverId) : undefined;
  const assignDriver = Boolean(effectiveDriverId);
  const gpsSource =
    vehicle.gpsSource === 'driver_app' &&
    vehicle.gpsTrackingEnabled !== false &&
    (!driverIdOverride || vehicle.driverId === driverIdOverride);

  return {
    assignDriver,
    gpsSource: assignDriver && (gpsSource || Boolean(driverIdOverride)),
    driverSharing: driver ? isStaffPositionFresh(driver) : false,
    driverName: driver ? `${driver.firstName} ${driver.lastName}`.trim() : undefined,
    vehicleName: vehicle.name,
  };
}

export function countFleetDriverGpsReady(vehicles: Vehicle[], staff: StaffMember[]): {
  withDriver: number;
  withGpsSource: number;
  sharingNow: number;
} {
  let withDriver = 0;
  let withGpsSource = 0;
  let sharingNow = 0;
  for (const vehicle of vehicles) {
    const status = evaluateVehicleDriverGpsSetup(vehicle, staff);
    if (status.assignDriver) withDriver += 1;
    if (status.assignDriver && status.gpsSource) withGpsSource += 1;
    if (status.driverSharing) sharingNow += 1;
  }
  return { withDriver, withGpsSource, sharingNow };
}

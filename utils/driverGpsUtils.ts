import { EventTransportLeg, RaceEvent, StaffMember, Vehicle, VehiclePosition } from '../types';

export interface DriverVehicleAssignment {
  vehicle: Vehicle;
  leg?: EventTransportLeg;
  event?: RaceEvent;
}

/** Véhicules assignés au chauffeur (fiche véhicule + trajets du jour). */
export function getDriverVehicleAssignments(
  staffId: string,
  vehicles: Vehicle[],
  transportLegs: EventTransportLeg[],
  events: RaceEvent[],
): DriverVehicleAssignment[] {
  const today = new Date().toISOString().slice(0, 10);
  const byVehicleId = new Map<string, DriverVehicleAssignment>();

  for (const vehicle of vehicles) {
    if (vehicle.driverId === staffId && vehicle.gpsTrackingEnabled !== false) {
      byVehicleId.set(vehicle.id, { vehicle });
    }
  }

  for (const leg of transportLegs) {
    if (leg.driverId !== staffId || !leg.assignedVehicleId) continue;
    if (leg.departureDate?.slice(0, 10) !== today) continue;
    const vehicle = vehicles.find((v) => v.id === leg.assignedVehicleId);
    if (!vehicle || vehicle.gpsTrackingEnabled === false) continue;
    byVehicleId.set(vehicle.id, {
      vehicle,
      leg,
      event: events.find((e) => e.id === leg.eventId),
    });
  }

  return Array.from(byVehicleId.values());
}

export function getStaffLivePosition(staff: StaffMember): VehiclePosition | null {
  if (staff.lastLatitude == null || staff.lastLongitude == null || !staff.lastPositionAt) return null;
  return {
    id: `staff-${staff.id}`,
    vehicleId: staff.id,
    latitude: staff.lastLatitude,
    longitude: staff.lastLongitude,
    speedKmh: staff.lastSpeedKmh,
    recordedAt: staff.lastPositionAt,
    source: 'driver_app',
  };
}

export function isStaffPositionFresh(staff: StaffMember, maxAgeMinutes = 15): boolean {
  if (!staff.lastPositionAt) return false;
  const age = Date.now() - new Date(staff.lastPositionAt).getTime();
  return age <= maxAgeMinutes * 60 * 1000;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export const DRIVER_GPS_MIN_INTERVAL_MS = 30_000;

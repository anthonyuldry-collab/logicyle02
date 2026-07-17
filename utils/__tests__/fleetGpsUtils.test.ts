import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  isPositionStale,
  filterVehicleHistory,
  estimateEtaMinutes,
  computeLegEta,
  buildFleetStatuses,
  summarizeFleetOnline,
} from '../fleetGpsUtils';
import { EventTransportLeg, RaceEvent, StaffMember, Vehicle, VehiclePosition } from '../../types';

describe('fleetGpsUtils', () => {
  const vehicle: Vehicle = {
    id: 'v1',
    name: 'Bus 1',
    licensePlate: 'AB-123-CD',
    vehicleType: 'VOITURE' as Vehicle['vehicleType'],
    maintenanceHistory: [],
    gpsTrackingEnabled: true,
    driverId: 's1',
    gpsSource: 'driver_app',
  };

  const staff: StaffMember = {
    id: 's1',
    firstName: 'Jean',
    lastName: 'Chauffeur',
    role: 'Autre',
    lastLatitude: 48.11,
    lastLongitude: -1.67,
    lastPositionAt: new Date().toISOString(),
    lastSpeedKmh: 90,
  } as StaffMember;

  const positions: VehiclePosition[] = [
    {
      id: 'p1',
      vehicleId: 'v1',
      latitude: 48.1,
      longitude: -1.68,
      recordedAt: '2026-07-15T08:00:00.000Z',
      source: 'driver_app',
      eventId: 'ev1',
    },
    {
      id: 'p2',
      vehicleId: 'v1',
      latitude: 48.11,
      longitude: -1.67,
      recordedAt: '2026-07-15T08:30:00.000Z',
      source: 'driver_app',
      eventId: 'ev1',
    },
  ];

  it('haversineDistanceKm computes distance', () => {
    const km = haversineDistanceKm(48.8566, 2.3522, 45.764, 4.8357);
    expect(km).toBeGreaterThan(390);
    expect(km).toBeLessThan(420);
  });

  it('isPositionStale detects old positions', () => {
    const old = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    expect(isPositionStale(old)).toBe(true);
    expect(isPositionStale(new Date().toISOString())).toBe(false);
  });

  it('filterVehicleHistory filters by vehicle and date', () => {
    const rows = filterVehicleHistory(positions, {
      vehicleId: 'v1',
      date: '2026-07-15',
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('p1');
  });

  it('estimateEtaMinutes uses speed or fallback', () => {
    expect(estimateEtaMinutes(80, 80)).toBe(60);
    expect(estimateEtaMinutes(40)).toBe(30);
  });

  it('computeLegEta when arrival coords exist', () => {
    const leg: EventTransportLeg = {
      id: 'leg1',
      eventId: 'ev1',
      direction: 'Aller',
      mode: 'Minibus',
      occupants: [],
      arrivalLatitude: 48.2,
      arrivalLongitude: -1.5,
    };
    const pos = positions[1];
    const eta = computeLegEta(pos, leg);
    expect(eta.distanceToArrivalKm).toBeGreaterThan(0);
    expect(eta.etaMinutes).toBeGreaterThan(0);
  });

  it('buildFleetStatuses marks driver_app vehicle online', () => {
    const today = new Date().toISOString().slice(0, 10);
    const leg: EventTransportLeg = {
      id: 'leg1',
      eventId: 'ev1',
      direction: 'Aller',
      mode: 'Minibus',
      occupants: [],
      assignedVehicleId: 'v1',
      departureDate: today,
      departureTime: '06:00',
    };
    const event = { id: 'ev1', name: 'Dauphiné' } as RaceEvent;
    const statuses = buildFleetStatuses([vehicle], positions, [leg], [event], [staff]);
    expect(statuses[0].isOnline).toBe(true);
    expect(statuses[0].driverName).toContain('Jean');
    expect(statuses[0].assignedEventName).toBe('Dauphiné');
  });

  it('summarizeFleetOnline counts online vehicles', () => {
    const statuses = buildFleetStatuses([vehicle], positions, [], [], [staff]);
    const summary = summarizeFleetOnline(statuses);
    expect(summary.total).toBe(1);
    expect(summary.online).toBe(1);
  });
});

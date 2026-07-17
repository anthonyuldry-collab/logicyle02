import { EventTransportLeg, RaceEvent, StaffMember, Vehicle, VehiclePosition } from '../types';
import { getStaffLivePosition } from './driverGpsUtils';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isPositionStale(recordedAt: string, maxAgeMinutes = 15): boolean {
  const age = Date.now() - new Date(recordedAt).getTime();
  return age > maxAgeMinutes * 60 * 1000;
}

export function getVehicleLivePosition(
  vehicle: Vehicle,
  positions: VehiclePosition[],
  staff: StaffMember[] = [],
): VehiclePosition | null {
  const preferDriver =
    vehicle.gpsSource === 'driver_app' ||
    (!vehicle.gpsDeviceId && Boolean(vehicle.driverId));

  if (preferDriver && vehicle.driverId) {
    const driver = staff.find((s) => s.id === vehicle.driverId);
    if (driver) {
      const driverPos = getStaffLivePosition(driver);
      if (driverPos && !isPositionStale(driverPos.recordedAt)) {
        return { ...driverPos, vehicleId: vehicle.id };
      }
    }
  }

  if (vehicle.lastLatitude != null && vehicle.lastLongitude != null && vehicle.lastPositionAt) {
    return {
      id: `live-${vehicle.id}`,
      vehicleId: vehicle.id,
      latitude: vehicle.lastLatitude,
      longitude: vehicle.lastLongitude,
      speedKmh: vehicle.lastSpeedKmh,
      recordedAt: vehicle.lastPositionAt,
      source: vehicle.gpsSource || 'manual',
    };
  }
  const history = positions
    .filter((p) => p.vehicleId === vehicle.id)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return history[0] || null;
}

export interface FleetVehicleStatus {
  vehicle: Vehicle;
  position: VehiclePosition | null;
  isOnline: boolean;
  isStale: boolean;
  driverName?: string;
  gpsSourceLabel?: string;
  assignedEventName?: string;
  assignedLegLabel?: string;
  delayMinutes?: number;
  etaMinutes?: number;
  distanceToArrivalKm?: number;
}

export interface FleetHistoryFilter {
  vehicleId?: string;
  eventId?: string;
  transportLegId?: string;
  date?: string;
  maxPoints?: number;
}

export function filterVehicleHistory(
  positions: VehiclePosition[],
  filter: FleetHistoryFilter = {},
): VehiclePosition[] {
  const { vehicleId, eventId, transportLegId, date, maxPoints = 500 } = filter;
  let rows = [...positions];

  if (vehicleId) rows = rows.filter((p) => p.vehicleId === vehicleId);
  if (eventId) rows = rows.filter((p) => p.eventId === eventId);
  if (transportLegId) rows = rows.filter((p) => p.transportLegId === transportLegId);
  if (date) {
    rows = rows.filter((p) => p.recordedAt.slice(0, 10) === date);
  }

  return rows
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .slice(-maxPoints);
}

export function buildHistoryPolyline(
  positions: VehiclePosition[],
): { lat: number; lng: number }[] {
  return filterVehicleHistory(positions)
    .map((p) => ({ lat: p.latitude, lng: p.longitude }));
}

export function estimateEtaMinutes(
  distanceKm: number,
  speedKmh?: number,
  fallbackSpeedKmh = 80,
): number | undefined {
  if (distanceKm <= 0) return 0;
  const speed = speedKmh && speedKmh > 5 ? speedKmh : fallbackSpeedKmh;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

export function computeLegEta(
  position: VehiclePosition,
  leg: EventTransportLeg,
): { etaMinutes?: number; distanceToArrivalKm?: number } {
  if (leg.arrivalLatitude == null || leg.arrivalLongitude == null) return {};
  const distanceToArrivalKm = haversineDistanceKm(
    position.latitude,
    position.longitude,
    leg.arrivalLatitude,
    leg.arrivalLongitude,
  );
  return {
    distanceToArrivalKm,
    etaMinutes: estimateEtaMinutes(distanceToArrivalKm, position.speedKmh),
  };
}

export function exportFleetHistoryCsv(
  teamName: string,
  positions: VehiclePosition[],
  vehicles: Vehicle[],
): string {
  const vehicleNames = new Map(vehicles.map((v) => [v.id, v.name]));
  const header = 'vehicle,plate,recordedAt,latitude,longitude,speedKmh,source,eventId,transportLegId';
  const lines = filterVehicleHistory(positions, { maxPoints: 5000 }).map((p) => {
    const vehicle = vehicles.find((v) => v.id === p.vehicleId);
    return [
      vehicleNames.get(p.vehicleId) || p.vehicleId,
      vehicle?.licensePlate || '',
      p.recordedAt,
      p.latitude.toFixed(6),
      p.longitude.toFixed(6),
      p.speedKmh ?? '',
      p.source,
      p.eventId || '',
      p.transportLegId || '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',');
  });
  return [header, ...lines].join('\n');
}

export function downloadFleetHistoryCsv(teamName: string, positions: VehiclePosition[], vehicles: Vehicle[]) {
  const csv = exportFleetHistoryCsv(teamName, positions, vehicles);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fleet-gps-${teamName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function summarizeFleetOnline(
  statuses: FleetVehicleStatus[],
): { online: number; total: number; withPosition: number } {
  const withPosition = statuses.filter((s) => s.position).length;
  const online = statuses.filter((s) => s.isOnline).length;
  return { online, total: statuses.length, withPosition };
}

export function buildFleetStatuses(
  vehicles: Vehicle[],
  positions: VehiclePosition[],
  transportLegs: EventTransportLeg[],
  events: RaceEvent[],
  staff: StaffMember[] = [],
): FleetVehicleStatus[] {
  const today = new Date().toISOString().slice(0, 10);

  return vehicles.map((vehicle) => {
    const position = getVehicleLivePosition(vehicle, positions, staff);
    const isStale = position ? isPositionStale(position.recordedAt) : true;
    const isOnline = Boolean(position && !isStale && vehicle.gpsTrackingEnabled !== false);
    const driver = vehicle.driverId ? staff.find((s) => s.id === vehicle.driverId) : undefined;

    const activeLeg = transportLegs.find(
      (leg) =>
        leg.assignedVehicleId === vehicle.id &&
        leg.departureDate?.slice(0, 10) === today
    );
    const event = activeLeg
      ? events.find((e) => e.id === activeLeg.eventId)
      : undefined;

    let delayMinutes: number | undefined;
    let etaMinutes: number | undefined;
    let distanceToArrivalKm: number | undefined;

    if (activeLeg?.departureTime && position) {
      const planned = new Date(`${today}T${activeLeg.departureTime}`);
      const actual = new Date(position.recordedAt);
      if (actual > planned) {
        delayMinutes = Math.round((actual.getTime() - planned.getTime()) / 60000);
      }
    }

    if (activeLeg && position) {
      const eta = computeLegEta(position, activeLeg);
      etaMinutes = eta.etaMinutes;
      distanceToArrivalKm = eta.distanceToArrivalKm;
    }

    return {
      vehicle,
      position,
      isOnline,
      isStale,
      driverName: driver ? `${driver.firstName} ${driver.lastName}`.trim() : undefined,
      gpsSourceLabel: position?.source || vehicle.gpsSource,
      assignedEventName: event?.name,
      assignedLegLabel: activeLeg
        ? `${activeLeg.departureLocation} → ${activeLeg.arrivalLocation}`
        : undefined,
      delayMinutes,
      etaMinutes,
      distanceToArrivalKm,
    };
  });
}

export function parseGpsWebhookPayload(
  payload: Record<string, unknown>,
  source: Vehicle['gpsSource'] = 'traccar'
): Omit<VehiclePosition, 'id'> | null {
  const deviceId = String(payload.deviceId || payload.device_id || payload.imei || '');
  const lat = Number(payload.latitude ?? payload.lat);
  const lng = Number(payload.longitude ?? payload.lng ?? payload.lon);
  if (!deviceId || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    vehicleId: deviceId,
    latitude: lat,
    longitude: lng,
    speedKmh: Number(payload.speed ?? payload.speedKmh) || undefined,
    heading: Number(payload.heading ?? payload.course) || undefined,
    recordedAt: payload.recordedAt
      ? String(payload.recordedAt)
      : payload.fixTime
        ? String(payload.fixTime)
        : new Date().toISOString(),
    source: source || 'traccar',
    eventId: payload.eventId ? String(payload.eventId) : undefined,
    transportLegId: payload.transportLegId ? String(payload.transportLegId) : undefined,
  };
}

export function buildOpenStreetMapEmbedUrl(
  lat: number,
  lng: number,
  zoom = 14
): string {
  const delta = 0.02;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function buildFleetMapMarkers(statuses: FleetVehicleStatus[]) {
  return statuses
    .filter((s) => s.position)
    .map((s) => ({
      id: s.vehicle.id,
      name: s.vehicle.name,
      lat: s.position!.latitude,
      lng: s.position!.longitude,
      isOnline: s.isOnline,
      speed: s.position!.speedKmh,
      plate: s.vehicle.licensePlate,
      event: s.assignedEventName,
    }));
}

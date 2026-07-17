import React, { useMemo } from 'react';
import { FleetVehicleStatus, buildFleetMapMarkers } from '../utils/fleetGpsUtils';

interface FleetMapPanelProps {
  statuses: FleetVehicleStatus[];
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  language?: 'fr' | 'en';
  historyPolyline?: { lat: number; lng: number }[];
}

function computeBounds(markers: { lat: number; lng: number }[]) {
  if (markers.length === 0) {
    return { minLat: 46.58, maxLat: 46.63, minLng: 1.86, maxLng: 1.92 };
  }
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const pad = 0.015;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
}

const FleetMapPanel: React.FC<FleetMapPanelProps> = ({
  statuses,
  selectedVehicleId,
  onSelectVehicle,
  language = 'fr',
  historyPolyline = [],
}) => {
  const markers = useMemo(() => buildFleetMapMarkers(statuses), [statuses]);
  const tracePoints = useMemo(
    () => [...historyPolyline, ...markers.map((m) => ({ lat: m.lat, lng: m.lng }))],
    [historyPolyline, markers],
  );
  const bounds = useMemo(() => computeBounds(tracePoints), [tracePoints]);

  const toPosition = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { left: `${Math.min(96, Math.max(4, x))}%`, top: `${Math.min(92, Math.max(8, y))}%` };
  };

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const delta = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLng - bounds.minLng);
  const zoom = delta < 0.05 ? 14 : delta < 0.15 ? 12 : 10;
  const mapBg = `https://www.openstreetmap.org/export/embed.html?bbox=${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}&layer=mapnik&marker=${centerLat},${centerLng}`;

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg border border-gray-200 overflow-hidden bg-slate-100 h-72">
        <iframe title="Fleet map" src={mapBg} className="absolute inset-0 w-full h-full border-0 opacity-90" loading="lazy" />
        <div className="absolute inset-0 pointer-events-none">
          {historyPolyline.length >= 2 && (
            <svg className="absolute inset-0 w-full h-full z-[5]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="0.6"
                strokeOpacity="0.85"
                points={historyPolyline
                  .map((pt) => {
                    const pos = toPosition(pt.lat, pt.lng);
                    return `${parseFloat(pos.left)} ${parseFloat(pos.top)}`;
                  })
                  .join(' ')}
              />
            </svg>
          )}
          {markers.map((m) => {
            const pos = toPosition(m.lat, m.lng);
            const selected = m.id === selectedVehicleId;
            return (
              <button
                key={m.id}
                type="button"
                style={pos}
                onClick={() => onSelectVehicle?.(m.id)}
                className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-full z-10 flex flex-col items-center gap-0.5 ${
                  selected ? 'scale-110' : ''
                }`}
                title={`${m.name} · ${m.plate}`}
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 rounded-full border-2 border-white shadow ${
                    m.isOnline ? 'bg-green-500' : 'bg-amber-400'
                  }`}
                />
                <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-800 shadow-sm max-w-[120px] truncate">
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>
        <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] text-gray-600 shadow">
          {markers.length} {language === 'fr' ? 'véhicule(s) géolocalisé(s)' : 'tracked vehicle(s)'} · zoom {zoom}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {statuses.map((status) => {
          const pos = status.position;
          const selected = status.vehicle.id === selectedVehicleId;
          return (
            <button
              key={status.vehicle.id}
              type="button"
              onClick={() => onSelectVehicle?.(status.vehicle.id)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{status.vehicle.name}</span>
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    status.isOnline ? 'bg-green-500' : status.isStale ? 'bg-gray-300' : 'bg-yellow-500'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{status.vehicle.licensePlate}</p>
              {status.driverName && (
                <p className="text-xs text-emerald-700 mt-1">
                  {language === 'fr' ? 'Chauffeur' : 'Driver'}: {status.driverName}
                  {status.gpsSourceLabel === 'driver_app' ? ' · GPS mobile' : ''}
                </p>
              )}
              {status.vehicle.gpsDeviceId && (
                <p className="text-xs text-gray-400 mt-0.5">GPS: {status.vehicle.gpsDeviceId}</p>
              )}
              {pos && (
                <p className="text-xs text-gray-600 mt-2">
                  {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
                  {pos.speedKmh != null ? ` · ${Math.round(pos.speedKmh)} km/h` : ''}
                </p>
              )}
              {status.assignedEventName && (
                <p className="text-xs text-indigo-700 mt-1">
                  {language === 'fr' ? 'Course' : 'Event'}: {status.assignedEventName}
                </p>
              )}
              {status.delayMinutes != null && status.delayMinutes > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {language === 'fr' ? 'Retard' : 'Delay'}: +{status.delayMinutes} min
                </p>
              )}
              {status.etaMinutes != null && status.distanceToArrivalKm != null && (
                <p className="text-xs text-blue-700 mt-1">
                  {language === 'fr' ? 'ETA' : 'ETA'}: ~{status.etaMinutes} min · {status.distanceToArrivalKm.toFixed(1)} km
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FleetMapPanel;

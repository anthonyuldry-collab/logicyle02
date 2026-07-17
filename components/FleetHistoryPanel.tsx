import React, { useMemo, useState } from 'react';
import { Vehicle, VehiclePosition } from '../types';
import {
  buildFleetStatuses,
  buildHistoryPolyline,
  filterVehicleHistory,
  downloadFleetHistoryCsv,
} from '../utils/fleetGpsUtils';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';
import FleetMapPanel from './FleetMapPanel';

interface FleetHistoryPanelProps {
  vehicles: Vehicle[];
  positions: VehiclePosition[];
  teamName: string;
  selectedVehicleId?: string;
  eventId?: string;
  language?: 'fr' | 'en';
}

const FleetHistoryPanel: React.FC<FleetHistoryPanelProps> = ({
  vehicles,
  positions,
  teamName,
  selectedVehicleId,
  eventId,
  language = 'fr',
}) => {
  const { t } = useTranslations();
  const [vehicleFilter, setVehicleFilter] = useState(selectedVehicleId || '');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  const history = useMemo(
    () =>
      filterVehicleHistory(positions, {
        vehicleId: vehicleFilter || undefined,
        eventId,
        date: dateFilter,
        maxPoints: 300,
      }),
    [positions, vehicleFilter, eventId, dateFilter],
  );

  const polyline = useMemo(() => buildHistoryPolyline(history), [history]);

  const replayStatus = useMemo(() => {
    if (!vehicleFilter || history.length === 0) return [];
    const vehicle = vehicles.find((v) => v.id === vehicleFilter);
    if (!vehicle) return [];
    const last = history[history.length - 1];
    return buildFleetStatuses([vehicle], [last], [], [], []).map((s) => ({
      ...s,
      position: last,
      isOnline: true,
      isStale: false,
    }));
  }, [vehicleFilter, history, vehicles]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{t('fleetGpsHistoryTitle')}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{t('fleetGpsHistoryDesc')}</p>
        </div>
        {history.length > 0 && (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => downloadFleetHistoryCsv(teamName, history, vehicles)}
          >
            {t('fleetGpsHistoryExport')}
          </ActionButton>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">{t('fleetGpsHistoryVehicle')}</label>
          <select
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="">{t('fleetGpsHistoryAllVehicles')}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.licensePlate}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">{t('fleetGpsHistoryDate')}</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {polyline.length >= 2 && vehicleFilter && (
        <FleetMapPanel
          statuses={replayStatus}
          historyPolyline={polyline}
          language={language}
        />
      )}

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">{t('fleetGpsHistoryEmpty')}</p>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-md border border-gray-100">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500">{t('formDate')}</th>
                <th className="px-3 py-2 text-left text-gray-500">{t('fleetGpsHistoryVehicle')}</th>
                <th className="px-3 py-2 text-right text-gray-500">Lat/Lng</th>
                <th className="px-3 py-2 text-right text-gray-500">km/h</th>
                <th className="px-3 py-2 text-left text-gray-500">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...history].reverse().map((p) => {
                const vehicle = vehicles.find((v) => v.id === p.vehicleId);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-700">
                      {new Date(p.recordedAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-1.5 text-gray-800">{vehicle?.name || p.vehicleId}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                      {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-600">
                      {p.speedKmh != null ? Math.round(p.speedKmh) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{p.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        {history.length} {t('fleetGpsHistoryPoints')}
      </p>
    </div>
  );
};

export default FleetHistoryPanel;

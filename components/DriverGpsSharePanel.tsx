import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DriverVehicleAssignment } from '../utils/driverGpsUtils';
import { isNativeCapacitorApp } from '../utils/capacitorPlatform';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';
import { recordDriverGpsPositionSecure } from '../services/driverGpsCloudService';
import {
  GpsTrackingSession,
  isGpsTrackingSupported,
  openGpsSettings,
  startGpsTracking,
} from '../services/gpsTrackingService';

interface DriverGpsSharePanelProps {
  staffId: string;
  staffName: string;
  teamId: string;
  assignments: DriverVehicleAssignment[];
  onPositionRecorded?: (payload: {
    staffId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number;
    recordedAt: string;
    vehicleIds: string[];
  }) => void;
}

function buildAssignmentContexts(assignments: DriverVehicleAssignment[]) {
  return assignments.map((a) => ({
    vehicleId: a.vehicle.id,
    eventId: a.event?.id,
    transportLegId: a.leg?.id,
  }));
}

const DriverGpsSharePanel: React.FC<DriverGpsSharePanelProps> = ({
  staffId,
  staffName,
  teamId,
  assignments,
  onPositionRecorded,
}) => {
  const { t } = useTranslations();
  const [sharing, setSharing] = useState(false);
  const [trackingMode, setTrackingMode] = useState<'native_background' | 'web_foreground' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const sessionRef = useRef<GpsTrackingSession | null>(null);

  const vehicleIds = assignments.map((a) => a.vehicle.id);
  const assignmentContexts = useMemo(() => buildAssignmentContexts(assignments), [assignments]);
  const isNative = isNativeCapacitorApp();

  useEffect(() => {
    void isGpsTrackingSupported().then(setSupported);
  }, []);

  const sendPosition = useCallback(
    async (latitude: number, longitude: number, speedKmh?: number, heading?: number) => {
      if (vehicleIds.length === 0) return;
      const recordedAt = new Date().toISOString();
      try {
        await recordDriverGpsPositionSecure(
          {
            teamId,
            staffId,
            vehicleIds,
            vehicleAssignments: assignmentContexts.map((ctx) => ({
              vehicleId: ctx.vehicleId,
              eventId: ctx.eventId,
              transportLegId: ctx.transportLegId,
            })),
            latitude,
            longitude,
            speedKmh,
            heading,
          },
          { preferNativeHttp: isNative },
        );
        setLastSentAt(recordedAt);
        setError(null);
        onPositionRecorded?.({
          staffId,
          latitude,
          longitude,
          speedKmh,
          recordedAt,
          vehicleIds,
        });
      } catch {
        setError(t('driverGpsSaveError'));
      }
    },
    [teamId, staffId, vehicleIds, assignmentContexts, onPositionRecorded, t, isNative],
  );

  const stopSharing = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.stop();
      sessionRef.current = null;
    }
    setSharing(false);
    setTrackingMode(null);
  }, []);

  const startSharing = useCallback(async () => {
    setError(null);
    try {
      const session = await startGpsTracking({
        backgroundTitle: t('driverGpsBackgroundTitle'),
        backgroundMessage: t('driverGpsBackgroundMessage').replace('{name}', staffName),
        onFix: (fix) => sendPosition(fix.latitude, fix.longitude, fix.speedKmh, fix.heading),
        onError: (code) => {
          if (code === 'permission_denied') {
            setError(t('driverGpsPermissionDenied'));
          } else if (code === 'unsupported') {
            setError(t('driverGpsUnsupported'));
          } else {
            setError(t('driverGpsSaveError'));
          }
          void stopSharing();
        },
      });
      sessionRef.current = session;
      setTrackingMode(session.mode);
      setSharing(true);
    } catch {
      setError(t('driverGpsUnsupported'));
    }
  }, [sendPosition, staffName, stopSharing, t]);

  useEffect(() => () => {
    void stopSharing();
  }, [stopSharing]);

  if (assignments.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-emerald-900">{t('driverGpsTitle')}</h3>
          {isNative && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wide">
              {t('driverGpsNativeBadge')}
            </span>
          )}
        </div>
        <p className="text-xs text-emerald-800 mt-0.5">
          {isNative ? t('driverGpsDescNative') : t('driverGpsDesc')}
        </p>
      </div>

      <ul className="space-y-1.5">
        {assignments.map(({ vehicle, leg, event }) => (
          <li key={vehicle.id} className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm">
            <p className="font-medium text-gray-900">{vehicle.name}</p>
            <p className="text-xs text-gray-500">{vehicle.licensePlate}</p>
            {event && (
              <p className="text-xs text-indigo-700 mt-0.5">
                {event.name}
                {leg?.departureLocation ? ` · ${leg.departureLocation}` : ''}
              </p>
            )}
          </li>
        ))}
      </ul>

      {supported === false && (
        <p className="text-xs text-amber-700">{t('driverGpsUnsupported')}</p>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-xs text-red-600">{error}</p>
          {isNative && (
            <button type="button" className="text-xs text-indigo-600 hover:underline" onClick={() => void openGpsSettings()}>
              {t('driverGpsOpenSettings')}
            </button>
          )}
        </div>
      )}

      {lastSentAt && sharing && (
        <p className="text-xs text-emerald-700">
          {t('driverGpsLastUpdate').replace(
            '{time}',
            new Date(lastSentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          )}
        </p>
      )}

      {sharing && trackingMode === 'native_background' && (
        <p className="text-xs text-indigo-700">{t('driverGpsBackgroundActive')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {!sharing ? (
          <ActionButton size="sm" onClick={() => void startSharing()} disabled={supported === false}>
            {t('driverGpsStart')}
          </ActionButton>
        ) : (
          <ActionButton size="sm" variant="secondary" onClick={() => void stopSharing()}>
            {t('driverGpsStop')}
          </ActionButton>
        )}
      </div>

      <p className="text-[10px] text-emerald-700/80">
        {isNative ? t('driverGpsPrivacyHintNative') : t('driverGpsPrivacyHint')}
      </p>
    </div>
  );
};

export default DriverGpsSharePanel;

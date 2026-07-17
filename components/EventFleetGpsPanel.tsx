import React, { useMemo } from 'react';
import {
  EventTransportLeg,
  RaceEvent,
  StaffMember,
  Vehicle,
  VehiclePosition,
} from '../types';
import { buildFleetStatuses, summarizeFleetOnline } from '../utils/fleetGpsUtils';
import FleetMapPanel from './FleetMapPanel';
import { useTranslations } from '../hooks/useTranslations';

interface EventFleetGpsPanelProps {
  event: RaceEvent;
  vehicles: Vehicle[];
  positions: VehiclePosition[];
  transportLegs: EventTransportLeg[];
  staff: StaffMember[];
  language?: 'fr' | 'en';
}

const EventFleetGpsPanel: React.FC<EventFleetGpsPanelProps> = ({
  event,
  vehicles,
  positions,
  transportLegs,
  staff,
  language = 'fr',
}) => {
  const { t } = useTranslations();

  const eventLegs = useMemo(
    () => transportLegs.filter((leg) => leg.eventId === event.id),
    [transportLegs, event.id],
  );

  const assignedVehicleIds = useMemo(
    () => new Set(eventLegs.map((l) => l.assignedVehicleId).filter(Boolean) as string[]),
    [eventLegs],
  );

  const eventVehicles = useMemo(
    () => vehicles.filter((v) => assignedVehicleIds.has(v.id)),
    [vehicles, assignedVehicleIds],
  );

  const statuses = useMemo(
    () => buildFleetStatuses(eventVehicles, positions, eventLegs, [event], staff),
    [eventVehicles, positions, eventLegs, event, staff],
  );

  const summary = useMemo(() => summarizeFleetOnline(statuses), [statuses]);

  if (eventVehicles.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const hasTodayLeg = eventLegs.some((l) => l.departureDate?.slice(0, 10) === today);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">{t('eventFleetGpsTitle')}</h3>
          <p className="text-xs text-indigo-800 mt-0.5">{t('eventFleetGpsDesc')}</p>
        </div>
        <div className="rounded-full bg-white border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-900">
          {summary.online}/{summary.total} {t('fleetGpsOnline')}
        </div>
      </div>

      {!hasTodayLeg && (
        <p className="text-xs text-indigo-700 bg-indigo-100/80 rounded-md px-2 py-1.5">
          {t('eventFleetGpsNoTodayLeg')}
        </p>
      )}

      <FleetMapPanel
        statuses={statuses.filter((s) => s.position || s.isOnline)}
        language={language}
      />
    </div>
  );
};

export default EventFleetGpsPanel;

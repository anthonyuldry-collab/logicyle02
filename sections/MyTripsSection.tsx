import React, { useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  ReceiptPercentIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User,
  RaceEvent,
  EventTransportLeg,
  Rider,
  StaffMember,
  EventRaceDocument,
  Team,
  RiderEventSelection,
  Vehicle,
  TeamLevel,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import UciFormsWorkflowPanel from '../components/UciFormsWorkflowPanel';
import DriverGpsSharePanel from '../components/DriverGpsSharePanel';
import DriverGpsSetupGuide from '../components/DriverGpsSetupGuide';
import { useTranslations } from '../hooks/useTranslations';
import { canScanExpenseReceipts } from '../utils/expenseReceiptUtils';
import { getOwnRider } from '../utils/riderAccessUtils';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';
import { getStaffAssignedEvents } from '../utils/staffDashboardUtils';
import { getStaffRoleKey } from '../utils/staffRoleUtils';
import {
  ensureUciDocumentsForEvent,
  getUciDocumentsForEvent,
  isUciCategoryEvent,
} from '../utils/uciFormsWorkflow';
import { getDriverVehicleAssignments } from '../utils/driverGpsUtils';
import { evaluateVehicleDriverGpsSetup } from '../utils/driverGpsSetupUtils';

interface MyTripsSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  eventTransportLegs: EventTransportLeg[];
  raceEvents: RaceEvent[];
  eventDocuments?: EventRaceDocument[];
  teams?: Team[];
  activeTeamId?: string | null;
  teamLevel?: TeamLevel;
  riderEventSelections?: RiderEventSelection[];
  currentUser: User;
  onNavigateToReceipts?: (eventId?: string, transportLegId?: string) => void;
  onOpenEvent?: (eventId: string) => void;
  onOpenEventDocuments?: (eventId: string) => void;
  onUpdateEventDocument?: (doc: EventRaceDocument) => void;
  onEnsureUciDocuments?: (docs: EventRaceDocument[]) => void;
  vehicles?: Vehicle[];
  teamId?: string;
  onDriverGpsRecorded?: (payload: {
    staffId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number;
    recordedAt: string;
    vehicleIds: string[];
  }) => void;
}

type TripFilter = 'upcoming' | 'past' | 'all';

const MyTripsSection: React.FC<MyTripsSectionProps> = ({
  riders,
  staff,
  eventTransportLegs,
  raceEvents,
  eventDocuments = [],
  teams = [],
  activeTeamId = null,
  teamLevel,
  riderEventSelections = [],
  currentUser,
  onNavigateToReceipts,
  onOpenEvent,
  onOpenEventDocuments,
  onUpdateEventDocument,
  onEnsureUciDocuments,
  vehicles = [],
  teamId,
  onDriverGpsRecorded,
}) => {
  const { t } = useTranslations();
  const canScan = canScanExpenseReceipts(currentUser, staff);
  const [tripFilter, setTripFilter] = useState<TripFilter>('upcoming');
  const [showPast, setShowPast] = useState(false);

  const staffMember = useMemo(
    () => getStaffMemberForUser(currentUser, staff),
    [staff, currentUser],
  );
  const isDirecteurSportif = staffMember ? getStaffRoleKey(staffMember.role) === 'DS' : false;

  const driverAssignments = useMemo(() => {
    if (!staffMember || !teamId) return [];
    return getDriverVehicleAssignments(
      staffMember.id,
      vehicles,
      eventTransportLegs,
      raceEvents,
    );
  }, [staffMember, teamId, vehicles, eventTransportLegs, raceEvents]);

  const driverSetupStatus = useMemo(() => {
    if (!staffMember || driverAssignments.length === 0) return null;
    const primary = driverAssignments[0].vehicle;
    return evaluateVehicleDriverGpsSetup(primary, staff, staffMember.id);
  }, [staffMember, driverAssignments, staff]);

  const coordinatedEvents = useMemo(() => {
    if (!staffMember || !isDirecteurSportif) return [];
    return getStaffAssignedEvents(staffMember, raceEvents);
  }, [staffMember, isDirecteurSportif, raceEvents]);

  const coordinationTripItems = useMemo(() => {
    return coordinatedEvents.map(event => ({
      event,
      legs: eventTransportLegs
        .filter(leg => leg.eventId === event.id)
        .sort((a, b) => (a.departureDate || '').localeCompare(b.departureDate || '')),
    }));
  }, [coordinatedEvents, eventTransportLegs]);

  const userProfile = useMemo(() => {
    return getOwnRider(riders, currentUser) || getStaffMemberForUser(currentUser, staff);
  }, [riders, staff, currentUser]);

  const tripItems = useMemo(() => {
    if (!userProfile) return [];

    const byEvent = new Map<string, { event: RaceEvent; legs: EventTransportLeg[] }>();

    eventTransportLegs
      .filter(leg => leg.occupants.some(occ => occ.id === userProfile.id))
      .forEach(leg => {
        const event = raceEvents.find(e => e.id === leg.eventId);
        if (!event) return;
        const existing = byEvent.get(event.id) || { event, legs: [] };
        if (!existing.legs.some(l => l.id === leg.id)) existing.legs.push(leg);
        byEvent.set(event.id, existing);
      });

    return Array.from(byEvent.values())
      .map(({ event, legs }) => ({
        event,
        legs: [...legs].sort((a, b) => (a.departureDate || '').localeCompare(b.departureDate || '')),
      }))
      .sort((a, b) => (a.event.date || '').localeCompare(b.event.date || ''));
  }, [userProfile, eventTransportLegs, raceEvents]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = tripItems.filter(t => (t.event.date || '') >= today);
  const past = tripItems.filter(t => (t.event.date || '') < today);
  const nextTrip = upcoming[0];
  const totalLegs = tripItems.reduce((n, t) => n + t.legs.length, 0);

  const displayedTrips = useMemo(() => {
    if (tripFilter === 'upcoming') return upcoming;
    if (tripFilter === 'past') return past;
    return tripItems;
  }, [tripFilter, upcoming, past, tripItems]);

  const activeTeam = useMemo(
    () => teams.find(t => t.id === activeTeamId) ?? teams[0],
    [teams, activeTeamId],
  );

  const uciEventsNeedingDocs = useMemo(() => {
    return tripItems
      .filter(t => isUciCategoryEvent(t.event, teamLevel))
      .filter(t => ensureUciDocumentsForEvent(t.event, eventDocuments, teamLevel).length > 0);
  }, [tripItems, eventDocuments, teamLevel]);

  React.useEffect(() => {
    if (!onEnsureUciDocuments || uciEventsNeedingDocs.length === 0) return;
    const newDocs = uciEventsNeedingDocs.flatMap(t =>
      ensureUciDocumentsForEvent(t.event, eventDocuments, teamLevel),
    );
    if (newDocs.length > 0) onEnsureUciDocuments(newDocs);
  }, [uciEventsNeedingDocs, eventDocuments, onEnsureUciDocuments]);

  const formatLegShort = (leg: EventTransportLeg) => {
    const dir = String(leg.direction || '');
    const shortDir = dir.includes('Aller') ? 'Aller' : dir.includes('Retour') ? 'Retour' : dir.includes('Jour') ? 'Jour J' : dir || 'Trajet';
    const dateStr = leg.departureDate
      ? format(new Date(leg.departureDate + 'T12:00:00Z'), 'd MMM', { locale: fr })
      : null;
    return { shortDir, dateStr, mode: leg.mode || '—' };
  };

  const formatLegDetail = (dateStr?: string, timeStr?: string, location?: string) => {
    if (!dateStr && !location) return 'N/A';
    const datePart = dateStr
      ? format(new Date(dateStr + 'T12:00:00Z'), 'EEE d MMM', { locale: fr })
      : '';
    const timePart = timeStr || '';
    const locPart = location || '';
    return [datePart, timePart, locPart].filter(Boolean).join(' · ');
  };

  const renderTripCard = (item: typeof tripItems[0], options?: { highlight?: boolean }) => {
    const { event, legs } = item;
    const isPast = (event.date || '') < today;
    const eventDate = event.date ? new Date(event.date + 'T12:00:00Z') : null;
    const isHighlight = options?.highlight;

    return (
      <div
        key={event.id}
        className={`relative rounded-xl border transition-all ${
          isHighlight
            ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-white shadow-sm ring-1 ring-blue-100'
            : isPast
            ? 'border-gray-100 bg-gray-50/60'
            : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'
        }`}
      >
        {isHighlight && (
          <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold uppercase tracking-wide">
            Prochain
          </span>
        )}

        <div className="flex items-start gap-3 px-4 py-4">
          <div className={`shrink-0 w-12 text-center rounded-lg py-1.5 ${
            isHighlight ? 'bg-blue-600 text-white' : isPast ? 'bg-gray-100' : 'bg-blue-50'
          }`}>
            <div className={`text-base font-bold leading-none ${isHighlight ? 'text-white' : isPast ? 'text-gray-600' : 'text-blue-700'}`}>
              {eventDate ? format(eventDate, 'd', { locale: fr }) : '–'}
            </div>
            <div className={`text-[10px] uppercase mt-0.5 ${isHighlight ? 'text-blue-100' : isPast ? 'text-gray-400' : 'text-blue-500'}`}>
              {eventDate ? format(eventDate, 'MMM', { locale: fr }) : ''}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className={`text-sm font-semibold ${isPast ? 'text-gray-700' : 'text-gray-900'}`}>
                {event.name}
              </p>
              {event.location && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
            </div>

            {legs.length === 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Aucun transport planifié pour cette course.
              </p>
            )}

            {legs.map((leg) => {
              const { shortDir, dateStr, mode } = formatLegShort(leg);
              return (
                <div key={leg.id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                      <TruckIcon className="w-3 h-3" />
                      {shortDir}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-700">
                      {mode}
                    </span>
                    {dateStr && <span className="text-[11px] text-gray-500">{dateStr}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-gray-600">
                    <p><span className="font-medium text-gray-700">Départ</span> — {formatLegDetail(leg.departureDate, leg.departureTime, leg.departureLocation)}</p>
                    <p><span className="font-medium text-gray-700">Arrivée</span> — {formatLegDetail(leg.arrivalDate, leg.arrivalTime, leg.arrivalLocation)}</p>
                  </div>
                  {leg.details && (
                    <p className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-200">{leg.details}</p>
                  )}
                  {canScan && onNavigateToReceipts && (
                    <button
                      type="button"
                      onClick={() => onNavigateToReceipts(event.id, leg.id)}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <ReceiptPercentIcon className="w-3.5 h-3.5" />
                      {t('receiptScanForTrip')}
                    </button>
                  )}
                </div>
              );
            })}

            {isUciCategoryEvent(event, teamLevel) && (
              <div className="mt-3">
                <UciFormsWorkflowPanel
                  compact
                  event={event}
                  documents={eventDocuments}
                  riders={riders}
                  staff={staff}
                  team={activeTeam}
                  teamLevel={teamLevel}
                  riderEventSelections={riderEventSelections}
                  onUpdateDocument={onUpdateEventDocument}
                  onOpenDocuments={() => {
                    if (onOpenEventDocuments) onOpenEventDocuments(event.id);
                    else onOpenEvent?.(event.id);
                  }}
                />
                {getUciDocumentsForEvent(event.id, eventDocuments).length === 0 && (
                  <p className="text-[11px] text-violet-700 mt-1">
                    Initialisation des formulaires UCI…
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionWrapper title={t('titleMyTrips')}>
      {canScan && onNavigateToReceipts && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2">
            <ReceiptPercentIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">{t('receiptTripsHint')}</p>
          </div>
          <ActionButton size="sm" onClick={() => onNavigateToReceipts()}>
            {t('receiptScanButton')}
          </ActionButton>
        </div>
      )}

      {staffMember && teamId && driverAssignments.length > 0 && (
        <div className="mb-6 space-y-3">
          {driverSetupStatus && (
            <DriverGpsSetupGuide status={driverSetupStatus} mode="driver" compact />
          )}
          <DriverGpsSharePanel
            staffId={staffMember.id}
            staffName={`${staffMember.firstName} ${staffMember.lastName}`.trim()}
            teamId={teamId}
            assignments={driverAssignments}
            onPositionRecorded={onDriverGpsRecorded}
          />
        </div>
      )}

      {isDirecteurSportif && coordinatedEvents.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
            <h2 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              <TruckIcon className="w-4 h-4" />
              Déplacements à coordonner
            </h2>
            <p className="text-xs text-indigo-800 mt-1">
              Vue d&apos;ensemble des transports sur vos courses assignées — planifiez véhicules, occupants et horaires depuis la fiche course.
            </p>
          </div>
          {coordinationTripItems.map(item => (
            <div key={item.event.id} className="relative">
              {renderTripCard(item, { highlight: true })}
              {onOpenEvent && (
                <div className="px-4 pb-4 -mt-2">
                  <ActionButton size="sm" variant="secondary" onClick={() => onOpenEvent(item.event.id)}>
                    Planifier les transports
                  </ActionButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <PaperAirplaneIcon className="w-4 h-4 text-blue-600" />
              {isDirecteurSportif ? 'Mes trajets personnels' : 'Mes trajets'}
            </h2>
            {tripItems.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {upcoming.length} à venir
                {past.length > 0 && ` · ${past.length} passé${past.length > 1 ? 's' : ''}`}
                {totalLegs > 0 && ` · ${totalLegs} trajet${totalLegs > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'upcoming' as const, label: 'À venir', count: upcoming.length },
              { id: 'past' as const, label: 'Passés', count: past.length },
              { id: 'all' as const, label: 'Tous', count: tripItems.length },
            ]).map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTripFilter(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tripFilter === id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {label}
                <span className={`inline-flex min-w-[1rem] h-4 px-1 items-center justify-center rounded-full text-[10px] font-semibold ${
                  tripFilter === id ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {!userProfile ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
          <PaperAirplaneIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Profil non trouvé pour afficher vos déplacements.</p>
        </div>
      ) : tripItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
          <CalendarDaysIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">{t('myTripsEmpty')}</p>
        </div>
      ) : displayedTrips.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
          <p className="text-sm text-gray-600">Aucun déplacement dans cette catégorie.</p>
          {tripFilter === 'upcoming' && past.length > 0 && (
            <button type="button" onClick={() => setTripFilter('past')} className="text-xs text-blue-600 hover:underline mt-2">
              Voir les {past.length} passé{past.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tripFilter === 'upcoming' && nextTrip && renderTripCard(nextTrip, { highlight: true })}
          {(tripFilter === 'upcoming' ? upcoming.filter(t => t.event.id !== nextTrip?.event.id) : displayedTrips).map(item => renderTripCard(item))}
          {tripFilter === 'all' && past.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPast(!showPast)}
                className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1"
              >
                {showPast ? 'Masquer les passés' : `Voir les passés (${past.length})`}
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showPast ? 'rotate-180' : ''}`} />
              </button>
              {showPast && (
                <div className="space-y-3 mt-3 opacity-90">
                  {past.map(item => renderTripCard(item))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </SectionWrapper>
  );
};

export default MyTripsSection;

import React, { useMemo, useState } from 'react';
import {
  Rider,
  RaceEvent,
  RiderEventSelection,
  RiderEventStatus,
  RiderEventPreference,
  User,
  AppSection,
  PermissionLevel,
  SeasonYear,
  UserNotification,
  UserNotificationType,
} from '../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS, SEASON_YEAR_COLORS } from '../constants';
import SectionWrapper from '../components/SectionWrapper';
import CalendarIcon from '../components/icons/CalendarIcon';
import { isFutureEvent } from '../utils/dateUtils';
import { getOwnRider } from '../utils/riderAccessUtils';

interface MyCalendarSectionProps {
  riders: Rider[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  navigateTo?: (section: AppSection, eventId?: string) => void;
  convocationNotifications?: UserNotification[];
  onMarkConvocationRead?: (id: string) => void;
}

type ScopeFilter = 'mine' | 'all' | 'pending';

const getEventSeasonYear = (eventDate: string): SeasonYear => {
  const year = new Date(eventDate + 'T12:00:00Z').getFullYear();
  switch (year) {
    case 2024: return SeasonYear.SEASON_2024;
    case 2025: return SeasonYear.SEASON_2025;
    case 2026: return SeasonYear.SEASON_2026;
    case 2027: return SeasonYear.SEASON_2027;
    case 2028: return SeasonYear.SEASON_2028;
    default: return SeasonYear.SEASON_2025;
  }
};

const PREFERENCE_OPTIONS: RiderEventPreference[] = [
  RiderEventPreference.VEUT_PARTICIPER,
  RiderEventPreference.OBJECTIFS_SPECIFIQUES,
  RiderEventPreference.EN_ATTENTE,
  RiderEventPreference.ABSENT,
  RiderEventPreference.NE_VEUT_PAS,
];

type CalendarEvent = RaceEvent & {
  status: RiderEventStatus;
  riderPreference: RiderEventPreference;
  riderObjectives: string;
  isSelected: boolean;
};

const MyCalendarSection: React.FC<MyCalendarSectionProps> = ({
  riders,
  currentUser,
  raceEvents,
  riderEventSelections,
  setRiderEventSelections,
  navigateTo,
  convocationNotifications = [],
  onMarkConvocationRead,
}) => {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('mine');
  const [selectedSeasonYear, setSelectedSeasonYear] = useState<SeasonYear | 'ALL'>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const riderProfile = getOwnRider(riders, currentUser);
  const riderId = riderProfile?.id;

  const futureEvents = useMemo(
    () => raceEvents.filter((event) => isFutureEvent(event.date)),
    [raceEvents]
  );

  const enrichEvent = (event: RaceEvent, isSelected: boolean): CalendarEvent => {
    const selection = riderEventSelections.find(
      (sel) => sel.eventId === event.id && sel.riderId === riderId
    );
    return {
      ...event,
      isSelected,
      status: selection?.status ?? (isSelected ? RiderEventStatus.EN_ATTENTE : RiderEventStatus.NON_RETENU),
      riderPreference: selection?.riderPreference ?? RiderEventPreference.EN_ATTENTE,
      riderObjectives: selection?.riderObjectives ?? '',
    };
  };

  const myEvents = useMemo(() => {
    if (!riderId) return [];
    return futureEvents
      .filter((event) => (event.selectedRiderIds || []).includes(riderId))
      .map((event) => enrichEvent(event, true))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [futureEvents, riderEventSelections, riderId]);

  const allEvents = useMemo(() => {
    if (!riderId) return [];
    return futureEvents
      .map((event) => {
        const isSelected = (event.selectedRiderIds || []).includes(riderId);
        return enrichEvent(event, isSelected);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [futureEvents, riderEventSelections, riderId]);

  const pendingCount = useMemo(
    () =>
      myEvents.filter(
        (e) =>
          e.riderPreference === RiderEventPreference.EN_ATTENTE ||
          e.status === RiderEventStatus.EN_ATTENTE
      ).length,
    [myEvents]
  );

  const filteredEvents = useMemo(() => {
    let events: CalendarEvent[] =
      scopeFilter === 'all' ? allEvents : myEvents;

    if (scopeFilter === 'pending') {
      events = myEvents.filter(
        (e) => e.riderPreference === RiderEventPreference.EN_ATTENTE
      );
    }

    if (selectedSeasonYear !== 'ALL') {
      events = events.filter((e) => getEventSeasonYear(e.date) === selectedSeasonYear);
    }

    return events;
  }, [scopeFilter, myEvents, allEvents, selectedSeasonYear]);

  const eventsBySeason = useMemo(() => {
    const grouped: Partial<Record<SeasonYear, CalendarEvent[]>> = {};
    filteredEvents.forEach((event) => {
      const key = getEventSeasonYear(event.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key]!.push(event);
    });
    return grouped;
  }, [filteredEvents]);

  const upsertSelection = (
    eventId: string,
    patch: Partial<RiderEventSelection>
  ) => {
    if (!riderId) return;
    const existing = riderEventSelections.find(
      (sel) => sel.eventId === eventId && sel.riderId === riderId
    );
    if (existing) {
      setRiderEventSelections((prev) =>
        prev.map((sel) =>
          sel.eventId === eventId && sel.riderId === riderId
            ? { ...sel, ...patch }
            : sel
        )
      );
    } else {
      setRiderEventSelections((prev) => [
        ...prev,
        {
          id: `selection_${Date.now()}`,
          eventId,
          riderId,
          status: RiderEventStatus.EN_ATTENTE,
          riderPreference: RiderEventPreference.EN_ATTENTE,
          riderObjectives: '',
          notes: '',
          ...patch,
        },
      ]);
    }
  };

  const handlePreferenceChange = (eventId: string, preference: RiderEventPreference) => {
    upsertSelection(eventId, { riderPreference: preference });
    if (preference === RiderEventPreference.OBJECTIFS_SPECIFIQUES) {
      setExpandedEventId(eventId);
    }
  };

  const formatDateBadge = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return {
      day: d.toLocaleDateString('fr-FR', { day: 'numeric' }),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
    };
  };

  const renderEventRow = (event: CalendarEvent) => {
    const date = formatDateBadge(event.date);
    const isExpanded = expandedEventId === event.id;
    const canRespond = event.isSelected;

    return (
      <div
        key={event.id}
        className={`rounded-xl border transition-shadow ${
          event.isSelected
            ? 'bg-white border-blue-200 shadow-sm'
            : 'bg-gray-50 border-gray-200 opacity-90'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-14 text-center rounded-lg bg-slate-100 py-2">
              <div className="text-lg font-bold text-slate-900 leading-none">{date.day}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-0.5">{date.month}</div>
            </div>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigateTo?.('eventDetail', event.id)}
                className="font-semibold text-gray-900 hover:text-blue-600 text-left truncate block w-full"
              >
                {event.name}
              </button>
              <p className="text-sm text-gray-500 truncate">
                {date.weekday} · {event.location || 'Lieu à confirmer'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                event.isSelected
                  ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {event.isSelected ? event.status : 'Non retenu'}
            </span>
            {canRespond && (
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  RIDER_EVENT_PREFERENCE_COLORS[event.riderPreference]
                }`}
              >
                {event.riderPreference}
              </span>
            )}
            {canRespond && (
              <button
                type="button"
                onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                className="text-xs text-blue-600 hover:underline"
              >
                {isExpanded ? 'Réduire' : 'Répondre'}
              </button>
            )}
          </div>
        </div>

        {canRespond && isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0 space-y-3">
            <div>
              <label htmlFor={`pref-${event.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                Ma réponse pour cette course
              </label>
              <select
                id={`pref-${event.id}`}
                value={event.riderPreference}
                onChange={(e) =>
                  handlePreferenceChange(event.id, e.target.value as RiderEventPreference)
                }
                className="w-full sm:max-w-md text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PREFERENCE_OPTIONS.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>

            {event.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && (
              <div>
                <label htmlFor={`obj-${event.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                  Objectifs pour cette course
                </label>
                <textarea
                  id={`obj-${event.id}`}
                  value={event.riderObjectives}
                  onChange={(e) =>
                    upsertSelection(event.id, { riderObjectives: e.target.value })
                  }
                  rows={2}
                  placeholder="Ex. viser le top 10, aider la leader…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!riderProfile) {
    return (
      <SectionWrapper title="Mon Calendrier">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
        </div>
      </SectionWrapper>
    );
  }

  const seasonYears = Object.values(SeasonYear);

  const unreadConvocations = convocationNotifications.filter(
    n => n.type === UserNotificationType.CONVOCATION && !n.read,
  );

  return (
    <SectionWrapper title="Mon Calendrier">
      <div className="space-y-5 max-w-4xl">
        {unreadConvocations.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-blue-900">
              Convocations reçues ({unreadConvocations.length})
            </h3>
            {unreadConvocations.slice(0, 3).map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onMarkConvocationRead?.(n.id);
                  navigateTo?.('eventDetail', n.eventId);
                }}
                className="flex w-full items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-left text-sm hover:bg-white transition"
              >
                <span className="font-medium text-gray-900 truncate">{n.title}</span>
                <span className="text-xs text-blue-600 shrink-0 ml-2">Voir →</span>
              </button>
            ))}
          </div>
        )}

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{myEvents.length}</p>
            <p className="text-xs text-gray-600 mt-1">Mes courses</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-gray-600 mt-1">À confirmer</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-700">{filteredEvents.length}</p>
            <p className="text-xs text-gray-600 mt-1">Affichées</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Mes courses & disponibilités</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Indiquez votre réponse pour chaque course où vous êtes convoqué(e).
              Le staff valide vos choix et la disponibilité dans le Planning saison.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'mine' as ScopeFilter, label: 'Mes courses' },
                { id: 'pending' as ScopeFilter, label: `À confirmer${pendingCount ? ` (${pendingCount})` : ''}` },
                { id: 'all' as ScopeFilter, label: 'Calendrier équipe' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScopeFilter(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  scopeFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">Saison :</span>
            <button
              type="button"
              onClick={() => setSelectedSeasonYear('ALL')}
              className={`px-3 py-1 text-xs rounded-md ${
                selectedSeasonYear === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Toutes
            </button>
            {seasonYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedSeasonYear(year)}
                className={`px-3 py-1 text-xs rounded-md ${
                  selectedSeasonYear === year
                    ? 'bg-blue-600 text-white'
                    : `${SEASON_YEAR_COLORS[year]} hover:opacity-80`
                }`}
              >
                {year.replace('Saison ', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CalendarIcon className="w-10 h-10 mx-auto text-gray-300" />
            <p className="mt-3 font-medium text-gray-700">
              {scopeFilter === 'pending'
                ? 'Toutes vos réponses sont à jour'
                : scopeFilter === 'mine'
                  ? 'Aucune course programmée pour vous'
                  : 'Aucun événement sur cette période'}
            </p>
            {scopeFilter === 'mine' && (
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Voir le calendrier équipe
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(eventsBySeason).map(([season, events]) => (
              <div key={season}>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                  {season}
                </h4>
                <div className="space-y-3">
                  {events!.map((event) => renderEventRow(event))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default MyCalendarSection;

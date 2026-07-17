import React, { useMemo, useState } from 'react';
import { Mission, RaceEvent, Team, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import CalendarDaysIcon from '../components/icons/CalendarDaysIcon';
import BriefcaseIcon from '../components/icons/BriefcaseIcon';
import MapPinIcon from '../components/icons/MapPinIcon';
import {
  formatMissionDateRange,
  isMissionUpcoming,
  MissionCalendarItem,
  missionsToCalendarItems,
} from '../utils/missionCalendarUtils';
import { getDemoMissionTeamName } from '../constants/demoMissions';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';

interface IndependentStaffCalendarSectionProps {
  currentUser: User;
  missions: Mission[];
  teams?: Team[];
  raceEvents?: RaceEvent[];
  onNavigateToMissions?: () => void;
  onOpenEvent?: (eventId: string) => void;
}

type ScopeFilter = 'upcoming' | 'past' | 'all';

const IndependentStaffCalendarSection: React.FC<IndependentStaffCalendarSectionProps> = ({
  currentUser,
  missions,
  teams = [],
  raceEvents = [],
  onNavigateToMissions,
  onOpenEvent,
}) => {
  const [scope, setScope] = useState<ScopeFilter>('upcoming');

  const items = useMemo(
    () =>
      missionsToCalendarItems(missions, currentUser.id, {
        teams,
        raceEvents,
        teamNameResolver: (teamId) =>
          getDemoMissionTeamName(teamId) || teams.find((t) => t.id === teamId)?.name,
      }),
    [missions, currentUser.id, teams, raceEvents],
  );

  const filtered = useMemo(() => {
    if (scope === 'all') return items;
    if (scope === 'upcoming') return items.filter((i) => isMissionUpcoming(i));
    return items.filter((i) => !isMissionUpcoming(i));
  }, [items, scope]);

  const upcomingCount = items.filter((i) => isMissionUpcoming(i)).length;

  return (
    <SectionWrapper title="Mon Calendrier Missions">
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5" />
                Missions intégrées (week-ends & périodes)
              </h2>
              <p className="mt-1 text-sm text-blue-800">
                Dès qu&apos;une équipe vous accepte sur une mission, celle-ci apparaît ici avec les
                dates de l&apos;événement.
              </p>
            </div>
            {onNavigateToMissions && (
              <ActionButton onClick={onNavigateToMissions} variant="secondary" size="sm">
                Voir les offres
              </ActionButton>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-blue-900">
              {upcomingCount} à venir
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-blue-800">
              {items.length} au total
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {(
            [
              ['upcoming', 'À venir'],
              ['past', 'Passées'],
              ['all', 'Toutes'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                scope === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <BriefcaseIcon className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-3 text-lg font-medium text-gray-700">
              {scope === 'upcoming'
                ? 'Aucune mission à venir'
                : scope === 'past'
                  ? 'Aucune mission passée'
                  : 'Aucune mission acceptée'}
            </p>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Postulez aux offres week-end : une fois accepté(e), l&apos;événement est ajouté
              automatiquement à ce calendrier.
            </p>
            {onNavigateToMissions && (
              <ActionButton onClick={onNavigateToMissions} className="mt-4">
                Chercher des missions
              </ActionButton>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <MissionCalendarCard
                key={item.id}
                item={item}
                onOpenEvent={onOpenEvent}
              />
            ))}
          </ul>
        )}
      </div>
    </SectionWrapper>
  );
};

const MissionCalendarCard: React.FC<{
  item: MissionCalendarItem;
  onOpenEvent?: (eventId: string) => void;
}> = ({ item, onOpenEvent }) => {
  const upcoming = isMissionUpcoming(item);
  return (
    <li
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        upcoming ? 'border-emerald-200' : 'border-gray-200 opacity-90'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {formatMissionDateRange(item.startDate, item.endDate)}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">
            {getStaffRoleDisplayLabel(item.role as never)} · {item.teamName}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            upcoming ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {upcoming ? 'Confirmé' : 'Terminé'}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon className="w-4 h-4 text-gray-400" />
          {item.location || 'Lieu à confirmer'}
        </span>
        {item.compensation && <span>{item.compensation}</span>}
      </div>
      {item.eventName && (
        <p className="mt-2 text-sm text-blue-700">
          Événement équipe : <strong>{item.eventName}</strong>
        </p>
      )}
      {item.eventId && onOpenEvent && (
        <div className="mt-3">
          <ActionButton size="sm" variant="secondary" onClick={() => onOpenEvent(item.eventId!)}>
            Ouvrir l&apos;événement
          </ActionButton>
        </div>
      )}
    </li>
  );
};

export default IndependentStaffCalendarSection;

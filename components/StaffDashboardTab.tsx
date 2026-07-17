import React, { useMemo } from 'react';
import {
  AppSection,
  EventChecklistItem,
  EventTransportLeg,
  PermissionLevel,
  RaceEvent,
  StaffMember,
  TeamLevel,
  TeamOperationalSettings,
} from '../types';
import ActionButton from './ActionButton';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';
import { buildStaffDashboardSnapshot } from '../utils/staffDashboardUtils';
import CalendarIcon from './icons/CalendarIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import ChartBarIcon from './icons/ChartBarIcon';

interface StaffDashboardTabProps {
  staffMember: StaffMember;
  raceEvents: RaceEvent[];
  eventTransportLegs: EventTransportLeg[];
  eventChecklistItems: EventChecklistItem[];
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  teamLevel?: TeamLevel;
  operationalSettings?: TeamOperationalSettings;
  onNavigateTo?: (section: AppSection, eventId?: string) => void;
}

const formatEventDate = (date?: string) => {
  if (!date) return '—';
  try {
    return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return date;
  }
};

const StaffDashboardTab: React.FC<StaffDashboardTabProps> = ({
  staffMember,
  raceEvents,
  eventTransportLegs,
  eventChecklistItems,
  effectivePermissions,
  teamLevel,
  operationalSettings,
  onNavigateTo,
}) => {
  const snapshot = useMemo(
    () =>
      buildStaffDashboardSnapshot(
        staffMember,
        raceEvents,
        eventTransportLegs,
        eventChecklistItems,
        effectivePermissions,
        teamLevel,
        operationalSettings,
      ),
    [staffMember, raceEvents, eventTransportLegs, eventChecklistItems, effectivePermissions, teamLevel, operationalSettings],
  );

  const {
    config,
    upcomingEvents,
    nextEvent,
    tripCount,
    pendingChecklist,
    ficheTaskCount,
    roleOperationallyActive,
    eventFocusLabel,
    quickActions,
    filteredFocusAreas,
  } = snapshot;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-xl text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
              {config.missionTitle}
            </p>
            <h2 className="text-2xl font-bold mt-1">
              {staffMember.firstName} {staffMember.lastName}
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              {getStaffRoleDisplayLabel(staffMember.role)} · {staffMember.status}
            </p>
          </div>
          {nextEvent && (
            <div className="bg-white/10 rounded-lg px-4 py-3 min-w-[200px]">
              <p className="text-xs text-slate-300 uppercase">Prochaine mission</p>
              <p className="font-semibold mt-0.5 truncate">{nextEvent.name}</p>
              <p className="text-sm text-slate-300">{formatEventDate(nextEvent.date)}</p>
            </div>
          )}
        </div>
        <p className="text-slate-200 text-sm mt-4 leading-relaxed">{config.missionSummary}</p>
        {eventFocusLabel && (
          <p className="text-slate-400 text-xs mt-2">Calendrier : {eventFocusLabel}</p>
        )}
      </div>

      {!roleOperationallyActive && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Votre rôle n&apos;est pas activé dans le profil opérationnel de l&apos;équipe. Certaines missions et
          raccourcis sont masqués.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Courses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
          <p className="text-xs text-gray-500">à venir assignées</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <PaperAirplaneIcon className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Déplacements</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tripCount}</p>
          <p className="text-xs text-gray-500">trajets planifiés</p>
        </div>
        {pendingChecklist > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <ClipboardCheckIcon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Checklist</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{pendingChecklist}</p>
            <p className="text-xs text-amber-600">tâches en cours</p>
          </div>
        )}
        {ficheTaskCount !== undefined && roleOperationallyActive && (
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <ChartBarIcon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Fiche poste</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{ficheTaskCount}</p>
            <p className="text-xs text-blue-600">
              tâches réf.{nextEvent?.eventType ? ` (${nextEvent.eventType})` : ''}
            </p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Priorités de votre poste</h3>
          <ul className="space-y-2">
            {filteredFocusAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                {area}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Actions rapides</h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(action => (
              <ActionButton
                key={action.section}
                onClick={() => onNavigateTo?.(action.section)}
                variant={action.section === quickActions[0]?.section ? 'primary' : 'secondary'}
                size="sm"
                title={action.description}
              >
                {action.label}
              </ActionButton>
            ))}
          </div>
          {quickActions.length === 0 && (
            <p className="text-sm text-gray-500">Aucun raccourci disponible avec vos permissions actuelles.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Mes prochaines échéances</h3>
          {upcomingEvents.length > 0 && (
            <ActionButton onClick={() => onNavigateTo?.('events')} variant="secondary" size="sm">
              Voir tout
            </ActionButton>
          )}
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            Aucune course assignée pour le moment. Consultez votre calendrier ou contactez l&apos;encadrement.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcomingEvents.slice(0, 5).map(event => (
              <li
                key={event.id}
                className="flex items-center justify-between py-3 gap-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg cursor-pointer"
                onClick={() => onNavigateTo?.('eventDetail', event.id)}
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{event.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatEventDate(event.date)}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.eventType ? ` · ${event.eventType}` : ''}
                  </p>
                </div>
                {!event.isLogisticsValidated && snapshot.roleKey === 'DS' && (
                  <span className="shrink-0 text-[10px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    Logistique à valider
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StaffDashboardTab;

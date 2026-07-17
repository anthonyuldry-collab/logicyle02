import React, { useMemo } from 'react';
import {
  AppSection,
  Mission,
  Rider,
  StaffMember,
  Team,
  User,
  UserRole,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import CalendarIcon from '../components/icons/CalendarIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import PaperAirplaneIcon from '../components/icons/PaperAirplaneIcon';
import BriefcaseIcon from '../components/icons/BriefcaseIcon';
import UsersIcon from '../components/icons/UsersIcon';
import {
  resolveRiderForUser,
  resolveStaffForUser,
  userToRiderProfile,
  userToStaffProfile,
} from '../utils/independentUtils';
import {
  getStaffRoleDisplayLabel,
  getStaffRoleKey,
  STAFF_ROLE_KEYS,
} from '../utils/staffRoleUtils';
import { getStaffDashboardConfig } from '../data/staffDashboardConfig';
import {
  buildAthleteCalendarItems,
  isAthleteEntryUpcoming,
} from '../utils/athleteCalendarUtils';
import {
  getAcceptedMissionsForUser,
  missionsToCalendarItems,
} from '../utils/missionCalendarUtils';
import { buildDemoAcceptedMissionsForUser } from '../constants/demoMissions';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import { useTranslations } from '../hooks/useTranslations';

interface IndependentDashboardSectionProps {
  currentUser: User;
  riders?: Rider[];
  staff?: StaffMember[];
  missions?: Mission[];
  teams?: Team[];
  subscriptionAccess?: SubscriptionAccess | null;
  onNavigateTo?: (section: AppSection, eventId?: string) => void;
  includeDemoMissions?: boolean;
}

const formatDate = (date?: string) => {
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

const IndependentDashboardSection: React.FC<IndependentDashboardSectionProps> = ({
  currentUser,
  riders = [],
  staff = [],
  missions = [],
  teams = [],
  subscriptionAccess,
  onNavigateTo,
  includeDemoMissions = false,
}) => {
  const { language } = useTranslations();
  const isRider =
    currentUser.userRole === UserRole.COUREUR ||
    String(currentUser.userRole).toLowerCase() === 'coureur';

  const rider = useMemo(
    () => resolveRiderForUser(riders, currentUser) ?? userToRiderProfile(currentUser),
    [riders, currentUser],
  );

  const staffMember = useMemo(
    () => resolveStaffForUser(staff, currentUser) ?? userToStaffProfile(currentUser),
    [staff, currentUser],
  );

  const athleteCalendarItems = useMemo(
    () => buildAthleteCalendarItems(currentUser, { includeDemo: includeDemoMissions }),
    [currentUser, includeDemoMissions],
  );

  const upcomingRaces = useMemo(
    () =>
      athleteCalendarItems.filter(
        (i) => isAthleteEntryUpcoming(i) && i.status !== 'cancelled' && i.status !== 'done',
      ),
    [athleteCalendarItems],
  );

  const allMissions = useMemo(() => {
    const demos = includeDemoMissions ? buildDemoAcceptedMissionsForUser(currentUser.id) : [];
    return [...missions, ...demos];
  }, [missions, includeDemoMissions, currentUser.id]);

  const upcomingMissions = useMemo(() => {
    const accepted = getAcceptedMissionsForUser(allMissions, currentUser.id);
    const calendarItems = missionsToCalendarItems(accepted, currentUser.id, { teams });
    const today = new Date().toISOString().split('T')[0];
    return calendarItems
      .filter((m) => (m.endDate || m.startDate) >= today)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [allMissions, currentUser.id, teams]);

  if (isRider) {
    const resultsCount = rider.resultsHistory?.length ?? 0;
    const nextRace = upcomingRaces[0];

    return (
      <SectionWrapper title={`Bonjour, ${rider.firstName}`} variant="immersive">
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-700 to-slate-900 p-6 rounded-xl text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-medium">
                  Tableau de bord athlète
                </p>
                <h2 className="text-2xl font-bold mt-1">
                  {rider.firstName} {rider.lastName}
                </h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Profil indépendant
                  {subscriptionAccess
                    ? ` · ${subscriptionAccess.statusLabel[language]}`
                    : ''}
                </p>
              </div>
              {nextRace && (
                <div className="bg-white/10 rounded-lg px-4 py-3 min-w-[200px]">
                  <p className="text-xs text-indigo-200 uppercase">Prochaine course</p>
                  <p className="font-semibold mt-0.5 truncate">{nextRace.name}</p>
                  <p className="text-sm text-indigo-100">{formatDate(nextRace.startDate)}</p>
                </div>
              )}
            </div>
            <p className="text-indigo-50 text-sm mt-4 leading-relaxed">
              Suivez votre calendrier, vos performances et vos candidatures équipes depuis un seul
              tableau de bord.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Courses</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{upcomingRaces.length}</p>
              <p className="text-xs text-gray-500">à venir</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrophyIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Résultats</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{resultsCount}</p>
              <p className="text-xs text-gray-500">enregistrés</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ChartBarIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Forme</span>
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{String(rider.forme || '—')}</p>
              <p className="text-xs text-gray-500">Moral : {String(rider.moral || '—')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <UsersIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Visibilité</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {rider.isSearchable ? 'Active' : 'Off'}
              </p>
              <p className="text-xs text-gray-500">recrutement équipes</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Actions rapides</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { section: 'myCalendar' as AppSection, label: 'Mon calendrier' },
                  { section: 'myPerformance' as AppSection, label: 'Mes performances' },
                  { section: 'myResults' as AppSection, label: 'Mes résultats' },
                  { section: 'teamSearch' as AppSection, label: 'Chercher une équipe' },
                  { section: 'independentHub' as AppSection, label: 'Mon espace' },
                  { section: 'nutrition' as AppSection, label: 'Nutrition' },
                ].map((action) => (
                  <ActionButton
                    key={action.section}
                    size="sm"
                    variant={action.section === 'myCalendar' ? 'primary' : 'secondary'}
                    onClick={() => onNavigateTo?.(action.section)}
                  >
                    {action.label}
                  </ActionButton>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Prochaines courses</h3>
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigateTo?.('myCalendar')}
                >
                  Voir tout
                </ActionButton>
              </div>
              {upcomingRaces.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Aucune course planifiée. Ajoutez-en dans votre calendrier ou candidatez à une
                  équipe.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {upcomingRaces.slice(0, 5).map((race) => (
                    <li key={race.id} className="py-3">
                      <p className="font-medium text-gray-900 truncate">{race.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(race.startDate)}
                        {race.location ? ` · ${race.location}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  const roleKey = getStaffRoleKey(staffMember.role) || 'AUTRE';
  const config = getStaffDashboardConfig(roleKey);
  const nextMission = upcomingMissions[0];
  const expenseCount = currentUser.personalExpenseReceipts?.length ?? 0;

  const independentQuickActions: { section: AppSection; label: string }[] = [
    { section: 'missionSearch', label: 'Offres & missions' },
    { section: 'myCalendar', label: 'Mon calendrier' },
    { section: 'myTrips', label: 'Mes déplacements' },
    { section: 'expenseReceipts', label: 'Notes de frais' },
    { section: 'myProfile', label: 'Mon profil' },
    { section: 'independentHub', label: 'Mon espace' },
  ];

  return (
    <SectionWrapper title="Tableau de bord" variant="immersive">
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
                {getStaffRoleDisplayLabel(staffMember.role)} · Vacataire indépendant
                {subscriptionAccess
                  ? ` · ${subscriptionAccess.statusLabel[language]}`
                  : ''}
              </p>
            </div>
            {nextMission && (
              <div className="bg-white/10 rounded-lg px-4 py-3 min-w-[200px]">
                <p className="text-xs text-slate-300 uppercase">Prochaine mission</p>
                <p className="font-semibold mt-0.5 truncate">{nextMission.title}</p>
                <p className="text-sm text-slate-300">{formatDate(nextMission.startDate)}</p>
              </div>
            )}
          </div>
          <p className="text-slate-200 text-sm mt-4 leading-relaxed">{config.missionSummary}</p>
          {!staffMember.role || staffMember.role === 'AUTRE' ? (
            <p className="text-amber-200 text-xs mt-3">
              Renseignez votre <strong>fonction</strong> dans Mon Profil / Mon Espace pour adapter
              ce tableau de bord à votre poste.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <BriefcaseIcon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Missions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{upcomingMissions.length}</p>
            <p className="text-xs text-gray-500">acceptées à venir</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <PaperAirplaneIcon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Fonction</span>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">
              {getStaffRoleDisplayLabel(staffMember.role)}
            </p>
            <p className="text-xs text-gray-500">poste déclaré</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <ChartBarIcon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Frais</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{expenseCount}</p>
            <p className="text-xs text-gray-500">justificatifs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <UsersIcon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Visibilité</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {staffMember.openToExternalMissions ? 'Ouvert' : 'Fermé'}
            </p>
            <p className="text-xs text-gray-500">missions externes</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Priorités de votre poste</h3>
            <ul className="space-y-2">
              {config.focusAreas.slice(0, 4).map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  {area}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Fonctions : {STAFF_ROLE_KEYS.map((k) => getStaffRoleDisplayLabel(k)).slice(0, 6).join(', ')}…
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Actions rapides</h3>
            <div className="flex flex-wrap gap-2">
              {independentQuickActions.map((action, index) => (
                <ActionButton
                  key={action.section}
                  size="sm"
                  variant={index === 0 ? 'primary' : 'secondary'}
                  onClick={() => onNavigateTo?.(action.section)}
                >
                  {action.label}
                </ActionButton>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Mes prochaines missions</h3>
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => onNavigateTo?.('missionSearch')}
            >
              Voir les offres
            </ActionButton>
          </div>
          {upcomingMissions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Aucune mission acceptée pour le moment. Parcourez les offres pour candidater.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingMissions.slice(0, 5).map((mission) => (
                <li key={mission.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{mission.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(mission.startDate)}
                      {mission.location ? ` · ${mission.location}` : ''}
                      {mission.teamName ? ` · ${mission.teamName}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {getStaffRoleDisplayLabel(mission.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default IndependentDashboardSection;

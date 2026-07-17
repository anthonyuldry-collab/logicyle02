import React, { useState, useMemo } from 'react';
import {
  Rider,
  RaceEvent,
  RiderEventSelection,
  RiderEventStatus,
  RiderEventPreference,
  MoralStatus,
  FormeStatus,
  User,
  AppSection,
  PermissionLevel,
  TeamProduct,
  RiderSelfDebrief,
} from '../../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS } from '../../constants';
import ActionButton from '../ActionButton';
import UserCircleIcon from '../icons/UserCircleIcon';
import CalendarIcon from '../icons/CalendarIcon';
import ChartBarIcon from '../icons/ChartBarIcon';
import HeartIcon from '../icons/HeartIcon';
import TrophyIcon from '../icons/TrophyIcon';
import WrenchScrewdriverIcon from '../icons/WrenchScrewdriverIcon';
import { getAgeCategory } from '../../utils/ageUtils';
import { getRiderCharacteristicSafe } from '../../utils/riderUtils';
import { listEventsPendingRiderDebrief } from '../../utils/riderDebriefUtils';

interface RiderDashboardTabProps {
  formData: Rider | Omit<Rider, 'id'>;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  onUpdateRiderPreference?: (
    eventId: string,
    riderId: string,
    preference: RiderEventPreference,
    objectives?: string,
  ) => void;
  onUpdateGlobalPreferences?: (riderId: string, globalWishes: string, seasonObjectives: string) => void;
  currentUser?: User | null;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  teamProducts?: TeamProduct[];
  onNavigateTo?: (section: AppSection, eventId?: string, tabHint?: string) => void;
  riderSelfDebriefs?: RiderSelfDebrief[];
}

type DashboardSection = 'overview' | 'calendar' | 'performance' | 'nutrition' | 'equipment';

const formatEventDate = (date: string, style: 'short' | 'long' = 'short') => {
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', opts);
};

const formatEventDay = (date: string) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit' });

const formatEventMonth = (date: string) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

const getFormeBadgeClass = (forme?: FormeStatus | string): string => {
  const v = String(forme ?? '');
  if (['EXCELLENTE', 'Excellent', 'EXCELLENT'].includes(v)) return 'bg-emerald-400/25 text-emerald-100 ring-emerald-300/40';
  if (['BONNE', 'Bon', 'BON'].includes(v)) return 'bg-sky-400/25 text-sky-100 ring-sky-300/40';
  if (['MOYENNE', 'Moyen', 'MOYEN'].includes(v)) return 'bg-amber-400/25 text-amber-100 ring-amber-300/40';
  if (['FATIGUE', 'Fatigué(e)', 'PASSABLE', 'MAUVAIS'].includes(v)) return 'bg-rose-400/25 text-rose-100 ring-rose-300/40';
  return 'bg-white/15 text-white/80 ring-white/20';
};

const getMoralBadgeClass = (moral?: MoralStatus | string): string => {
  const v = String(moral ?? '');
  if (['EXCELLENT', 'Élevé', 'ELEVEE'].includes(v)) return 'bg-violet-400/25 text-violet-100 ring-violet-300/40';
  if (['BON', 'Bon'].includes(v)) return 'bg-sky-400/25 text-sky-100 ring-sky-300/40';
  if (['NEUTRE', 'Neutre', 'MOYEN'].includes(v)) return 'bg-amber-400/25 text-amber-100 ring-amber-300/40';
  if (['BAS', 'Bas'].includes(v)) return 'bg-rose-400/25 text-rose-100 ring-rose-300/40';
  return 'bg-white/15 text-white/80 ring-white/20';
};

const getFormeLabel = (forme?: FormeStatus | string) => {
  if (!forme || forme === FormeStatus.INCONNU) return 'Non renseigné';
  return String(forme);
};

const getMoralLabel = (moral?: MoralStatus | string) => {
  if (!moral || moral === MoralStatus.INCONNU) return 'Non renseigné';
  return String(moral);
};

const scoreTone = (value: number) => {
  if (value >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'from-emerald-50 to-white', ring: 'ring-emerald-100' };
  if (value >= 60) return { bar: 'bg-sky-500', text: 'text-sky-700', bg: 'from-sky-50 to-white', ring: 'ring-sky-100' };
  if (value >= 45) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'from-amber-50 to-white', ring: 'ring-amber-100' };
  return { bar: 'bg-slate-400', text: 'text-slate-600', bg: 'from-slate-50 to-white', ring: 'ring-slate-100' };
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  scoreBg: string;
}> = ({ label, value, icon, accent, scoreBg }) => {
  const tone = scoreTone(value);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tone.bg} p-4 shadow-sm ring-1 ${tone.ring} transition hover:shadow-md`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent} bg-opacity-15`}>
          {icon}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${scoreBg}`}
          aria-label={`${label} : ${value}`}
        >
          <span className={`text-lg font-bold leading-none tabular-nums text-center ${tone.text}`}>
            {value}
          </span>
        </div>
      </div>
      <p className="relative mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200/80">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
};

const QuickLink: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ label, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-600 group-hover:text-white">
      {icon}
    </span>
    <span className="text-xs font-medium text-gray-700">{label}</span>
  </button>
);

const RiderDashboardTab: React.FC<RiderDashboardTabProps> = ({
  formData,
  raceEvents,
  riderEventSelections,
  onUpdateRiderPreference,
  onUpdateGlobalPreferences,
  currentUser: _currentUser,
  effectivePermissions: _effectivePermissions,
  teamProducts: _teamProducts = [],
  onNavigateTo,
  riderSelfDebriefs = [],
}) => {
  const riderId = (formData as Rider).id;
  const rider = formData as Rider;
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [editingGlobalPrefs, setEditingGlobalPrefs] = useState(false);
  const [globalWishes, setGlobalWishes] = useState(rider.globalWishes || '');
  const [seasonObjectives, setSeasonObjectives] = useState(rider.seasonObjectives || '');

  const { category: ageCategory } = getAgeCategory(rider.birthDate || '');

  const futureEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return raceEvents.filter(event => new Date(event.date) >= today);
  }, [raceEvents]);

  const upcomingEvents = useMemo(() => {
    return futureEvents
      .filter(event => (event.selectedRiderIds || []).includes(riderId))
      .map(event => {
        const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
        return {
          ...event,
          status: selection?.status || RiderEventStatus.EN_ATTENTE,
          riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
          riderObjectives: selection?.riderObjectives || '',
          notes: selection?.notes || '',
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [futureEvents, riderEventSelections, riderId]);

  const nextEvent = upcomingEvents[0];

  const pendingDebriefEvents = useMemo(
    () =>
      listEventsPendingRiderDebrief({
        events: raceEvents,
        riderId,
        debriefs: riderSelfDebriefs,
      }),
    [raceEvents, riderId, riderSelfDebriefs],
  );

  const performanceStats = useMemo(
    () => ({
      generalPerformance: getRiderCharacteristicSafe(formData, 'generalPerformanceScore'),
      fatigueResistance: getRiderCharacteristicSafe(formData, 'fatigueResistanceScore'),
      sprint: getRiderCharacteristicSafe(formData, 'charSprint'),
      climbing: getRiderCharacteristicSafe(formData, 'charClimbing'),
      rouleur: getRiderCharacteristicSafe(formData, 'charRouleur'),
      puncher: getRiderCharacteristicSafe(formData, 'charPuncher'),
      anaerobic: getRiderCharacteristicSafe(formData, 'charAnaerobic'),
    }),
    [formData],
  );

  const nutritionSummary = useMemo(() => {
    const allergies = rider.allergies || [];
    return {
      allergiesCount: allergies.length,
      hasAllergies: allergies.length > 0,
      snackPreferences: rider.snack1 || rider.snack2 || rider.snack3,
      assistantInstructions: rider.assistantInstructions,
    };
  }, [rider]);

  const equipmentSummary = useMemo(() => {
    const clothing = rider.clothing || [];
    const roadBike = rider.roadBikeSetup;
    const ttBike = rider.ttBikeSetup;
    return {
      clothingItems: clothing.length,
      hasRoadBike: !!roadBike,
      hasTTBike: !!ttBike,
      totalValue: clothing.reduce((sum, item) => sum + (item.unitCost || 0) * (item.quantity || 1), 0),
    };
  }, [rider]);

  const handleGlobalPreferencesSave = () => {
    onUpdateGlobalPreferences?.(riderId, globalWishes, seasonObjectives);
    setEditingGlobalPrefs(false);
  };

  const quickLinks: { section: AppSection; label: string; icon: React.ReactNode }[] = [
    { section: 'myCareer', label: 'Ma carrière', icon: <TrophyIcon className="w-4 h-4" /> },
    { section: 'myCalendar', label: 'Calendrier', icon: <CalendarIcon className="w-4 h-4" /> },
    { section: 'myTrips', label: 'Déplacements', icon: <ChartBarIcon className="w-4 h-4" /> },
    { section: 'nutrition', label: 'Nutrition', icon: <HeartIcon className="w-4 h-4" /> },
    { section: 'riderEquipment', label: 'Matériel', icon: <WrenchScrewdriverIcon className="w-4 h-4" /> },
  ];

  const sections: { id: DashboardSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: UserCircleIcon },
    { id: 'calendar', label: 'Calendrier', icon: CalendarIcon },
    { id: 'performance', label: 'Performance', icon: ChartBarIcon },
    { id: 'nutrition', label: 'Nutrition', icon: HeartIcon },
    { id: 'equipment', label: 'Équipement', icon: WrenchScrewdriverIcon },
  ];

  const renderHero = () => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-6 text-white shadow-lg">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-400 blur-3xl" />
        <div className="absolute -bottom-10 left-1/4 h-32 w-32 rounded-full bg-violet-500 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {rider.photoUrl ? (
            <img
              src={rider.photoUrl}
              alt={`${formData.firstName} ${formData.lastName}`}
              className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-white/20">
              <UserCircleIcon className="h-14 w-14 text-white/70" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-blue-200/80">Mon espace coureur</p>
            <h2 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="mt-1 text-sm text-blue-100/90">
              {ageCategory} · {rider.disciplines?.[0] || 'Route'} · {rider.teamName || 'Équipe'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getFormeBadgeClass(rider.forme)}`}>
                Forme · {getFormeLabel(rider.forme)}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getMoralBadgeClass(rider.moral)}`}>
                Moral · {getMoralLabel(rider.moral)}
              </span>
            </div>
          </div>
        </div>

        {nextEvent && (
          <div className="shrink-0 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm lg:min-w-[220px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Prochaine course</p>
            <p className="mt-1 truncate font-semibold">{nextEvent.name}</p>
            <p className="text-sm text-blue-100/90">{formatEventDate(nextEvent.date)}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${RIDER_EVENT_STATUS_COLORS[nextEvent.status] || 'bg-white/20'}`}>
              {nextEvent.status}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuickLinks = () =>
    onNavigateTo ? (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
        {quickLinks.map(link => (
          <QuickLink key={link.section} label={link.label} icon={link.icon} onClick={() => onNavigateTo(link.section)} />
        ))}
      </div>
    ) : null;

  const renderOverviewSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Performance générale"
          value={performanceStats.generalPerformance}
          icon={<ChartBarIcon className="h-5 w-5 text-blue-600" />}
          accent="bg-blue-500"
          scoreBg="bg-blue-100"
        />
        <StatCard
          label="Résistance fatigue"
          value={performanceStats.fatigueResistance}
          icon={<TrophyIcon className="h-5 w-5 text-amber-600" />}
          accent="bg-amber-500"
          scoreBg="bg-amber-100"
        />
        <StatCard
          label="Sprint"
          value={performanceStats.sprint}
          icon={<HeartIcon className="h-5 w-5 text-rose-600" />}
          accent="bg-rose-500"
          scoreBg="bg-rose-100"
        />
        <StatCard
          label="Grimpeur"
          value={performanceStats.climbing}
          icon={<WrenchScrewdriverIcon className="h-5 w-5 text-emerald-600" />}
          accent="bg-emerald-500"
          scoreBg="bg-emerald-100"
        />
      </div>

      {pendingDebriefEvents.length > 0 && onNavigateTo && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/50 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-violet-100">Débriefings à compléter</h3>
          <p className="mt-1 text-sm text-violet-200/90">
            Partagez votre ressenti et notez vos coéquipiers (anonyme).
          </p>
          <ul className="mt-4 space-y-2">
            {pendingDebriefEvents.slice(0, 3).map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{event.name}</p>
                  <p className="text-xs text-slate-300">
                    {formatEventDate(event.endDate || event.date, 'short')}
                  </p>
                </div>
                <ActionButton
                  size="sm"
                  onClick={() => onNavigateTo('eventDetail', event.id, 'riderDebrief')}
                >
                  Débriefer
                </ActionButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Prochaines courses</h3>
            <p className="text-xs text-gray-500">Vos engagements à venir</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('calendar')}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Tout voir →
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">Aucune course planifiée pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <button
                key={event.id}
                type="button"
                onClick={() => onNavigateTo?.('eventDetail', event.id)}
                className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-slate-900/80 p-3 text-left transition hover:border-sky-400/40 hover:bg-slate-800"
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-800 shadow-sm ring-1 ring-white/10">
                  <span className="text-lg font-bold leading-none text-white">{formatEventDay(event.date)}</span>
                  <span className="text-[10px] font-semibold uppercase text-slate-300">{formatEventMonth(event.date)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-semibold text-white group-hover:text-sky-200">{event.name}</h4>
                  <p className="truncate text-sm text-slate-300">{event.location}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-gray-200'}`}>
                  {event.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Objectifs de saison</h3>
            <p className="text-xs text-gray-500">Souhaits et cibles pour l&apos;année</p>
          </div>
          <button
            type="button"
            onClick={() => setEditingGlobalPrefs(!editingGlobalPrefs)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {editingGlobalPrefs ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {editingGlobalPrefs ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mes souhaits</label>
              <textarea
                value={globalWishes}
                onChange={e => setGlobalWishes(e.target.value)}
                placeholder="Exprimez vos souhaits pour la saison..."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mes objectifs</label>
              <textarea
                value={seasonObjectives}
                onChange={e => setSeasonObjectives(e.target.value)}
                placeholder="Définissez vos objectifs principaux..."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <ActionButton onClick={handleGlobalPreferencesSave}>Enregistrer</ActionButton>
              <ActionButton
                onClick={() => {
                  setEditingGlobalPrefs(false);
                  setGlobalWishes(rider.globalWishes || '');
                  setSeasonObjectives(rider.seasonObjectives || '');
                }}
                variant="secondary"
              >
                Annuler
              </ActionButton>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Souhaits</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                {globalWishes || 'Aucun souhait défini — cliquez sur Modifier pour en ajouter.'}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-50/80 to-white p-4 ring-1 ring-blue-100/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Objectifs</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                {seasonObjectives || 'Aucun objectif défini — précisez vos cibles de saison.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCalendarSection = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Calendrier prévisionnel</h3>
      <p className="mt-1 text-sm text-gray-500">Consultez les courses et indiquez vos préférences.</p>

      {futureEvents.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
          Aucun événement à venir
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {futureEvents.map(event => {
            const isSelected = (event.selectedRiderIds || []).includes(riderId);
            const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);

            return (
              <div
                key={event.id}
                className={`rounded-xl border p-4 transition ${
                  isSelected ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{event.name}</h4>
                    <p className="text-sm text-gray-600">
                      {formatEventDate(event.date, 'long')} — {event.location}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      isSelected
                        ? RIDER_EVENT_STATUS_COLORS[selection?.status || RiderEventStatus.EN_ATTENTE] || 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isSelected ? selection?.status || RiderEventStatus.EN_ATTENTE : 'Non sélectionné'}
                  </span>
                </div>

                {isSelected && onUpdateRiderPreference && (
                  <div className="mt-4 border-t border-gray-200/80 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ma préférence</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(RiderEventPreference).map(preference => (
                        <button
                          key={preference}
                          type="button"
                          onClick={() => onUpdateRiderPreference(event.id, riderId, preference)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            selection?.riderPreference === preference
                              ? RIDER_EVENT_PREFERENCE_COLORS[preference]
                              : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {preference}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPerformanceSection = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Profil de performance</h3>
      <p className="mt-1 text-sm text-gray-500">Vue synthétique de vos caractéristiques</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Caractéristiques</h4>
          {[
            { label: 'Sprint', value: performanceStats.sprint },
            { label: 'Grimpeur', value: performanceStats.climbing },
            { label: 'Rouleur', value: performanceStats.rouleur },
            { label: 'Puncheur', value: performanceStats.puncher },
            { label: 'Anaérobie', value: performanceStats.anaerobic },
          ].map(stat => {
            const tone = scoreTone(stat.value);
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-600">{stat.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${stat.value}%` }} />
                </div>
                <span className={`w-8 text-right text-sm font-semibold tabular-nums ${tone.text}`}>{stat.value}</span>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white p-5 text-center ring-1 ring-blue-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Performance générale</p>
            <p className="mt-2 text-4xl font-bold text-blue-700 tabular-nums">{performanceStats.generalPerformance}</p>
            <p className="text-xs text-gray-500">/ 100</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white p-5 text-center ring-1 ring-emerald-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Résistance fatigue</p>
            <p className="mt-2 text-4xl font-bold text-emerald-700 tabular-nums">{performanceStats.fatigueResistance}</p>
            <p className="text-xs text-gray-500">/ 100</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNutritionSection = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Nutrition</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-rose-50/50 p-4 ring-1 ring-rose-100">
          <h4 className="text-sm font-semibold text-gray-800">Allergies & restrictions</h4>
          {nutritionSummary.hasAllergies ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rider.allergies?.map((allergy, index) => (
                <span key={index} className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800">
                  {allergy.allergen}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Aucune allergie déclarée</p>
          )}
        </div>
        <div className="rounded-xl bg-amber-50/50 p-4 ring-1 ring-amber-100">
          <h4 className="text-sm font-semibold text-gray-800">Préférences</h4>
          {nutritionSummary.snackPreferences ? (
            <p className="mt-2 text-sm text-gray-700">Collations : {nutritionSummary.snackPreferences}</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Aucune préférence définie</p>
          )}
          {nutritionSummary.assistantInstructions && (
            <p className="mt-3 rounded-lg bg-white/80 p-2 text-sm text-gray-600">{nutritionSummary.assistantInstructions}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderEquipmentSection = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Équipement</h3>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white p-5 text-center ring-1 ring-blue-100">
          <p className="text-xs font-semibold uppercase text-blue-600">Dotation</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{equipmentSummary.clothingItems}</p>
          <p className="text-xs text-gray-500">articles</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white p-5 text-center ring-1 ring-emerald-100">
          <p className="text-xs font-semibold uppercase text-emerald-600">Vélos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {(equipmentSummary.hasRoadBike ? 1 : 0) + (equipmentSummary.hasTTBike ? 1 : 0)}/2
          </p>
          <p className="text-xs text-gray-500">configurés</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-white p-5 text-center ring-1 ring-violet-100">
          <p className="text-xs font-semibold uppercase text-violet-600">Valeur</p>
          <p className="mt-2 text-3xl font-bold text-violet-700">{equipmentSummary.totalValue.toFixed(0)}€</p>
          <p className="text-xs text-gray-500">dotation totale</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {renderHero()}
      {renderQuickLinks()}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
        <div className="flex min-w-max gap-1 sm:min-w-0">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === 'overview' && renderOverviewSection()}
      {activeSection === 'calendar' && renderCalendarSection()}
      {activeSection === 'performance' && renderPerformanceSection()}
      {activeSection === 'nutrition' && renderNutritionSection()}
      {activeSection === 'equipment' && renderEquipmentSection()}
    </div>
  );
};

export default RiderDashboardTab;

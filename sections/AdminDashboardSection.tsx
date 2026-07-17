import React, { useState, useEffect, useMemo } from 'react';
import {
  Rider,
  User,
  StaffMember,
  RaceEvent,
  RiderEventSelection,
  AppState,
  StaffRole,
  StaffStatus,
  FormeStatus,
  MoralStatus,
  HealthCondition,
  AppSection,
} from '../types';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from '../components/ActionButton';

interface AdminDashboardSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  appState: AppState;
  navigateTo?: (section: AppSection, eventId?: string) => void;
}

const glassCard =
  'rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-xl shadow-xl shadow-black/20';
const glassCardSoft =
  'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md';

const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  riders,
  staff,
  currentUser,
  raceEvents,
  riderEventSelections,
  appState,
  navigateTo,
}) => {
  const { t, language } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);

  const teamName =
    appState.teams.find((tm) => tm.id === appState.activeTeamId)?.name || 'LogiCycle';

  const teamMetrics = useMemo(() => {
    const activeRiders = riders.filter((r) => r.healthCondition === HealthCondition.PRET_A_COURIR);
    const activeStaff = staff.filter(
      (s) => s.status === StaffStatus.VACATAIRE || s.status === StaffStatus.SALARIE,
    );

    const formeStats = {
      excellent: riders.filter((r) => r.forme === FormeStatus.EXCELLENT).length,
      bon: riders.filter((r) => r.forme === FormeStatus.BON).length,
      moyen: riders.filter((r) => r.forme === FormeStatus.MOYEN).length,
      mauvais: riders.filter((r) => r.forme === FormeStatus.MAUVAIS).length,
    };

    const moralStats = {
      excellent: riders.filter((r) => r.moral === MoralStatus.EXCELLENT).length,
      bon: riders.filter((r) => r.moral === MoralStatus.BON).length,
      moyen: riders.filter((r) => r.moral === MoralStatus.MOYEN).length,
      mauvais: riders.filter((r) => r.moral === MoralStatus.MAUVAIS).length,
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcomingEvents = raceEvents
      .filter((event) => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ridersWithRecentPerformance = riders.filter((r) => r.generalPerformanceScore > 0);

    const staffByRole = {
      ds: staff.filter((s) => s.role === StaffRole.DS).length,
      entraineur: staff.filter((s) => s.role === StaffRole.ENTRAINEUR).length,
      assistant: staff.filter((s) => s.role === StaffRole.ASSISTANT).length,
      mecano: staff.filter((s) => s.role === StaffRole.MECANO).length,
      autre: staff.filter((s) => s.role === StaffRole.AUTRE).length,
    };

    return {
      totalRiders: riders.length,
      activeRiders: activeRiders.length,
      totalStaff: staff.length,
      activeStaff: activeStaff.length,
      upcomingEvents: upcomingEvents.length,
      ridersWithPerformance: ridersWithRecentPerformance.length,
      formeStats,
      moralStats,
      staffByRole,
      upcomingEventsList: upcomingEvents,
    };
  }, [riders, staff, raceEvents]);

  const alerts = useMemo(() => {
    const alertsList: {
      type: 'warning' | 'error' | 'info';
      title: string;
      message: string;
      action: string;
      section: AppSection;
    }[] = [];

    const ridersWithoutPerformance = riders.filter((r) => r.generalPerformanceScore === 0);
    if (ridersWithoutPerformance.length > 0) {
      alertsList.push({
        type: 'warning',
        title: language === 'fr' ? 'Coureurs sans performance' : 'Riders without performance',
        message:
          language === 'fr'
            ? `${ridersWithoutPerformance.length} coureur(s) sans score de performance`
            : `${ridersWithoutPerformance.length} rider(s) without a performance score`,
        action: language === 'fr' ? 'Vérifier les profils' : 'Check profiles',
        section: 'performance',
      });
    }

    const ridersInBadForm = riders.filter((r) => r.forme === FormeStatus.MAUVAIS);
    if (ridersInBadForm.length > 0) {
      alertsList.push({
        type: 'error',
        title: language === 'fr' ? 'Forme préoccupante' : 'Concerning form',
        message:
          language === 'fr'
            ? `${ridersInBadForm.length} coureur(s) en mauvaise forme`
            : `${ridersInBadForm.length} rider(s) in poor form`,
        action: language === 'fr' ? 'Suivi recommandé' : 'Follow-up recommended',
        section: 'roster',
      });
    }

    const ridersInBadMoral = riders.filter((r) => r.moral === MoralStatus.MAUVAIS);
    if (ridersInBadMoral.length > 0) {
      alertsList.push({
        type: 'error',
        title: language === 'fr' ? 'Moral préoccupant' : 'Concerning morale',
        message:
          language === 'fr'
            ? `${ridersInBadMoral.length} coureur(s) en mauvais moral`
            : `${ridersInBadMoral.length} rider(s) with low morale`,
        action: language === 'fr' ? 'Entretien recommandé' : '1:1 recommended',
        section: 'roster',
      });
    }

    const eventsWithoutSelections = raceEvents.filter((event) => {
      const eventSelections = riderEventSelections.filter((sel) => sel.eventId === event.id);
      return eventSelections.length === 0 && new Date(event.date) > new Date();
    });
    if (eventsWithoutSelections.length > 0) {
      alertsList.push({
        type: 'info',
        title: language === 'fr' ? 'Sélections manquantes' : 'Missing selections',
        message:
          language === 'fr'
            ? `${eventsWithoutSelections.length} événement(s) sans sélection`
            : `${eventsWithoutSelections.length} event(s) without rider selection`,
        action: language === 'fr' ? 'Compléter' : 'Complete',
        section: 'events',
      });
    }

    return alertsList;
  }, [riders, raceEvents, riderEventSelections, language]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const formatEventDate = (dateStr: string, withYear = false) =>
    new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00')).toLocaleDateString(
      language === 'fr' ? 'fr-FR' : 'en-GB',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(withYear ? { year: 'numeric' as const } : {}),
      },
    );

  if (isLoading) {
    return (
      <div className="lc-dash relative min-h-[50vh] overflow-hidden text-white flex items-center justify-center">
        <div className="relative animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
      </div>
    );
  }

  const nextEvent = teamMetrics.upcomingEventsList[0];
  const eventTransports =
    nextEvent && appState.eventTransportLegs
      ? appState.eventTransportLegs.filter((leg) => leg.eventId === nextEvent.id)
      : [];
  const mainTransport =
    eventTransports.find((leg) => String(leg.direction) === 'ALLER') || eventTransports[0];

  const lastDebriefing = (appState.performanceEntries || [])
    .filter((entry) => entry.generalObjectives || entry.resultsSummary || entry.keyLearnings)
    .sort((a, b) => {
      const dateA = new Date(a.id.split('_')[1] || 0);
      const dateB = new Date(b.id.split('_')[1] || 0);
      return dateB.getTime() - dateA.getTime();
    })[0];
  const lastDebriefEvent = lastDebriefing
    ? appState.raceEvents.find((e) => e.id === lastDebriefing.eventId)
    : null;

  return (
    <div className="lc-dash relative overflow-hidden text-white min-h-screen">
      <style>{`
        @keyframes lc-dash-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lc-dash-rise { animation: lc-dash-rise 0.55s ease-out both; }
        .lc-dash-rise-d1 { animation: lc-dash-rise 0.55s ease-out 0.06s both; }
        .lc-dash-rise-d2 { animation: lc-dash-rise 0.55s ease-out 0.12s both; }
        .lc-dash-rise-d3 { animation: lc-dash-rise 0.55s ease-out 0.18s both; }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto p-5 sm:p-8 space-y-6 pb-12">
          {/* Hero */}
          <div className="lc-dash-rise text-center sm:text-left max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/90">
              {t('titleDashboard')}
            </p>
            <h1
              className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white"
              style={{ letterSpacing: '-0.03em' }}
            >
              {teamName}
            </h1>
            <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-xl">
              {t('loginSlogan')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {language === 'fr' ? 'Bonjour' : 'Hello'}, {currentUser.firstName}
              {' · '}
              {teamMetrics.totalRiders + teamMetrics.totalStaff}{' '}
              {language === 'fr' ? 'membres' : 'members'}
            </p>
          </div>

          {/* KPIs */}
          <div className="lc-dash-rise-d1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                value: teamMetrics.totalRiders,
                label: language === 'fr' ? 'Athlètes' : 'Athletes',
                sub: `${teamMetrics.activeRiders} ${language === 'fr' ? 'prêts' : 'ready'}`,
              },
              {
                value: teamMetrics.totalStaff,
                label: 'Staff',
                sub: `${teamMetrics.activeStaff} ${language === 'fr' ? 'actifs' : 'active'}`,
              },
              {
                value: teamMetrics.upcomingEvents,
                label: language === 'fr' ? 'Événements' : 'Events',
                sub: language === 'fr' ? 'à venir' : 'upcoming',
              },
            ].map((kpi) => (
              <div key={kpi.label} className={`${glassCard} p-5`}>
                <p className="text-4xl font-black tracking-tight text-white">{kpi.value}</p>
                <p className="mt-1 text-sm font-semibold text-indigo-200">{kpi.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Alertes */}
          {alerts.length > 0 && (
            <div className={`lc-dash-rise-d2 ${glassCard} overflow-hidden`}>
              <div className="px-5 py-3 border-b border-white/10 bg-rose-500/10">
                <h2 className="text-sm font-semibold text-rose-200">
                  {language === 'fr' ? 'Actions requises' : 'Required actions'}
                </h2>
              </div>
              <div className="divide-y divide-white/8">
                {alerts.map((alert, index) => (
                  <div
                    key={`${alert.title}-${index}`}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition"
                  >
                    <div className="min-w-0 flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                          alert.type === 'error'
                            ? 'bg-rose-400'
                            : alert.type === 'warning'
                              ? 'bg-amber-400'
                              : 'bg-sky-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        <p className="text-xs text-slate-400 truncate">{alert.message}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTo?.(alert.section)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition"
                    >
                      {language === 'fr' ? 'Voir' : 'View'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses + débrief */}
          <div className="lc-dash-rise-d2 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`${glassCard} p-5`}>
              <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wide mb-4">
                {language === 'fr' ? 'Prochains événements' : 'Upcoming events'}
              </h3>
              {teamMetrics.upcomingEventsList.length > 0 ? (
                <div className="space-y-3">
                  {teamMetrics.upcomingEventsList.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`${glassCardSoft} p-4 flex justify-between items-start gap-3`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{event.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{event.location}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatEventDate(event.date)}</p>
                      </div>
                      <ActionButton
                        onClick={() => navigateTo?.('eventDetail', event.id)}
                        size="sm"
                        variant="secondary"
                        className="!bg-white/10 !text-white !border-white/15 hover:!bg-white/15 shrink-0"
                      >
                        {language === 'fr' ? 'Voir' : 'View'}
                      </ActionButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">
                  {language === 'fr' ? 'Aucun événement à venir' : 'No upcoming events'}
                </p>
              )}
            </div>

            <div className={`${glassCard} p-5`}>
              <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wide mb-4">
                {language === 'fr' ? 'Dernier débriefing' : 'Latest debrief'}
              </h3>
              {lastDebriefing ? (
                <div className="space-y-3">
                  <div className={`${glassCardSoft} p-4`}>
                    <p className="font-semibold text-white">
                      {lastDebriefEvent?.name || (language === 'fr' ? 'Événement' : 'Event')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {lastDebriefEvent?.location ? `${lastDebriefEvent.location} — ` : ''}
                      {formatEventDate(
                        lastDebriefEvent?.date || lastDebriefing.id.split('_')[1] || '',
                      )}
                    </p>
                  </div>
                  {lastDebriefing.generalObjectives && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        {language === 'fr' ? 'Objectifs' : 'Objectives'}
                      </p>
                      <p className="text-sm text-slate-300 line-clamp-3">
                        {lastDebriefing.generalObjectives}
                      </p>
                    </div>
                  )}
                  {lastDebriefing.resultsSummary && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        {language === 'fr' ? 'Résultats' : 'Results'}
                      </p>
                      <p className="text-sm text-slate-300 line-clamp-3">
                        {lastDebriefing.resultsSummary}
                      </p>
                    </div>
                  )}
                  {lastDebriefing.keyLearnings && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        {language === 'fr' ? 'Enseignements' : 'Learnings'}
                      </p>
                      <p className="text-sm text-slate-300 line-clamp-3">
                        {lastDebriefing.keyLearnings}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">
                  {language === 'fr' ? 'Aucun débriefing disponible' : 'No debrief available'}
                </p>
              )}
            </div>
          </div>

          {/* Prochain déplacement */}
          <div className={`lc-dash-rise-d3 ${glassCard} p-5`}>
            <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wide mb-4">
              {language === 'fr' ? 'Prochain déplacement' : 'Next transfer'}
            </h3>
            {nextEvent ? (
              <div className="space-y-4">
                <div className={`${glassCardSoft} p-4`}>
                  <p className="font-semibold text-white">{nextEvent.name}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {nextEvent.location} — {formatEventDate(nextEvent.date, true)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(nextEvent.selectedRiderIds || []).length}{' '}
                    {language === 'fr' ? 'athlète(s) sélectionné(s)' : 'selected athlete(s)'}
                  </p>
                </div>

                {mainTransport ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1.5 text-slate-300">
                      <p>
                        <span className="text-slate-500">
                          {language === 'fr' ? 'Mode' : 'Mode'}:
                        </span>{' '}
                        {mainTransport.mode}
                      </p>
                      {mainTransport.departureLocation && (
                        <p>
                          <span className="text-slate-500">
                            {language === 'fr' ? 'Départ' : 'Departure'}:
                          </span>{' '}
                          {mainTransport.departureLocation}
                        </p>
                      )}
                      {mainTransport.arrivalLocation && (
                        <p>
                          <span className="text-slate-500">
                            {language === 'fr' ? 'Arrivée' : 'Arrival'}:
                          </span>{' '}
                          {mainTransport.arrivalLocation}
                        </p>
                      )}
                      {mainTransport.departureTime && (
                        <p>
                          <span className="text-slate-500">
                            {language === 'fr' ? 'Heure' : 'Time'}:
                          </span>{' '}
                          {mainTransport.departureTime}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                      {mainTransport.assignedVehicleId &&
                        (() => {
                          const vehicle = appState.vehicles.find(
                            (v) => v.id === mainTransport.assignedVehicleId,
                          );
                          return vehicle ? (
                            <p>
                              <span className="text-slate-500">
                                {language === 'fr' ? 'Véhicule' : 'Vehicle'}:
                              </span>{' '}
                              {vehicle.name}
                            </p>
                          ) : null;
                        })()}
                      {mainTransport.driverId &&
                        (() => {
                          const driver = [...appState.riders, ...appState.staff].find(
                            (p) => p.id === mainTransport.driverId,
                          );
                          return driver ? (
                            <p>
                              <span className="text-slate-500">
                                {language === 'fr' ? 'Conducteur' : 'Driver'}:
                              </span>{' '}
                              {driver.firstName} {driver.lastName}
                            </p>
                          ) : null;
                        })()}
                      <p>
                        <span className="text-slate-500">
                          {language === 'fr' ? 'Passagers' : 'Passengers'}:
                        </span>{' '}
                        {(mainTransport.occupants || []).length}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {language === 'fr'
                      ? 'Transport non planifié pour cet événement.'
                      : 'Transport not planned for this event yet.'}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigateTo?.('eventDetail', nextEvent.id)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition shadow-lg shadow-indigo-950/40"
                  >
                    {language === 'fr' ? "Voir l'événement" : 'Open event'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">
                {language === 'fr' ? 'Aucun événement à venir' : 'No upcoming events'}
              </p>
            )}
          </div>
        </div>
    </div>
  );
};

export default AdminDashboardSection;

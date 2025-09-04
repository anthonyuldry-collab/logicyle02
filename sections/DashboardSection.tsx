
import React, { useMemo } from 'react';
import { AppSection, RaceEvent, ChecklistItemStatus, User, TeamRole, HealthCondition, TransportMode, RiderEventStatus, Rider, StaffMember, ScoutingProfile, Vehicle, EventBudgetItem, EventTransportLeg, EventChecklistItem, IncomeItem, RiderEventSelection, PerformanceEntry } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import CheckCircleIcon from '../components/icons/CheckCircleIcon'; 
import XCircleIcon from '../components/icons/XCircleIcon'; 
import TrophyIcon from '../components/icons/TrophyIcon';
import CakeIcon from '../components/icons/CakeIcon';
import ChatBubbleLeftRightIcon from '../components/icons/ChatBubbleLeftRightIcon';
import StatCard from '../components/StatCard';
import FlagIcon from '../components/icons/FlagIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ActionButton from '../components/ActionButton';
import UsersIcon from '../components/icons/UsersIcon';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import TruckIcon from '../components/icons/TruckIcon';
import CurrencyDollarIcon from '../components/icons/CurrencyDollarIcon';
import ExclamationTriangleIcon from '../components/icons/ExclamationTriangleIcon';
import { RIDER_EVENT_STATUS_COLORS } from '../constants';
import { useTranslations } from '../hooks/useTranslations';

interface DashboardSectionProps {
  navigateTo: (section: AppSection, eventId?: string) => void;
  currentUser: User;
  riders: Rider[];
  staff: StaffMember[];
  vehicles: Vehicle[];
  scoutingProfiles: ScoutingProfile[];
  eventBudgetItems: EventBudgetItem[];
  raceEvents: RaceEvent[];
  eventTransportLegs: EventTransportLeg[];
  eventChecklistItems: EventChecklistItem[];
  incomeItems: IncomeItem[];
  riderEventSelections: RiderEventSelection[];
  performanceEntries: PerformanceEntry[];
}

// Define props for the new presentational components
interface OperationalDashboardViewProps {
  stats: {
    nextRace: string;
    activeRiders: string;
    ridersSubtext: string | undefined;
    activeStaff: string;
    scoutingProspects: string;
    fleetSize: string;
    balance: string;
    balanceSubtext: string;
  };
  upcomingEvents: RaceEvent[];
  alerts: { id: string; text: string; eventId?: string }[];
  lastDebriefing: { event: RaceEvent; generalObjectives?: string; resultsSummary?: string; keyLearnings?: string } | null;
  recentEventsAwaitingDebriefing: RaceEvent[];
  navigateTo: (section: AppSection, eventId?: string) => void;
}

interface AthleteDashboardViewProps {
  currentUser: User;
  upcomingRaces: (RaceEvent & { status?: RiderEventStatus })[];
  navigateTo: (section: AppSection, eventId?: string) => void;
}

// Renamed to be a pure presentational component without hooks
const OperationalDashboardView: React.FC<OperationalDashboardViewProps> = ({ 
  stats, 
  upcomingEvents, 
  alerts, 
  lastDebriefing,
  recentEventsAwaitingDebriefing,
  navigateTo 
}: OperationalDashboardViewProps) => {
  const { t } = useTranslations();
  return (
    <div className="space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard title={t('dashNextRace')} value={stats.nextRace} icon={FlagIcon} colorClass="bg-red-100 text-red-600" />
            <StatCard title={t('dashActiveRiders')} value={stats.activeRiders} subtext={stats.ridersSubtext} icon={UsersIcon} colorClass="bg-blue-100 text-blue-600" />
            <StatCard title={t('dashActiveStaff')} value={stats.activeStaff} icon={UserGroupIcon} colorClass="bg-green-100 text-green-600" />
            <StatCard title={t('dashScoutingProspects')} value={stats.scoutingProspects} icon={SearchIcon} colorClass="bg-purple-100 text-purple-600" />
            <StatCard title={t('dashFleetSize')} value={stats.fleetSize} icon={TruckIcon} colorClass="bg-yellow-100 text-yellow-800" />
            <StatCard title={t('dashCurrentBalance')} value={stats.balance} subtext={stats.balanceSubtext} icon={CurrencyDollarIcon} colorClass="bg-indigo-100 text-indigo-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Événements à Venir</h3>
                <div className="space-y-3">
                    {upcomingEvents && upcomingEvents.length > 0 ? (
                        upcomingEvents.map((event: RaceEvent) => (
                            <div key={event.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-800">{event.name}</p>
                                    <p className="text-xs text-gray-500">{new Date(event.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} - {event.location}</p>
                                </div>
                                <div className="flex items-center space-x-4 text-xs">
                                    <div className="text-center">
                                        <p className="font-semibold text-base">{event.selectedRiderIds.length}</p>
                                        <p className="text-gray-500">Coureurs</p>
                                    </div>
                                    <div className="text-center">
                                         {event.isLogisticsValidated ? 
                                            <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto" title="Logistique Validée"/> :
                                            <XCircleIcon className="w-6 h-6 text-red-500 mx-auto" title="Logistique non validée"/>
                                         }
                                        <p className="text-gray-500">Logistique</p>
                                    </div>
                                    <ActionButton onClick={() => navigateTo('eventDetail', event.id)} size="sm" variant="secondary">Voir</ActionButton>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 italic text-center py-4">Aucun événement à venir.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-md">
                 <h3 className="text-lg font-semibold text-gray-800 mb-3">Alertes & Actions Requises</h3>
                 <div className="space-y-2 max-h-96 overflow-y-auto">
                    {alerts && alerts.length > 0 ? (
                        alerts.map(alert => (
                             <div key={alert.id} className="flex items-center p-2 bg-red-50 border-l-4 border-red-400 rounded">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3 flex-shrink-0"/>
                                <p className="text-sm text-red-800 flex-grow">{alert.text}</p>
                                {alert.eventId && <ActionButton onClick={() => navigateTo('eventDetail', alert.eventId)} size="sm" variant="secondary" className="text-xs !p-1 !px-2">Voir</ActionButton>}
                             </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
                            <CheckCircleIcon className="w-12 h-12 text-green-400 mb-2"/>
                            <p className="text-sm text-gray-500 font-medium">Tout est en ordre !</p>
                            <p className="text-xs text-gray-500">Aucune alerte logistique pour les 14 prochains jours.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Dernier Débriefing */}
        {lastDebriefing && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Dernier Débriefing</h3>
              <ActionButton 
                onClick={() => navigateTo('eventDetail', lastDebriefing.event.id)} 
                size="sm" 
                variant="secondary"
              >
                Voir l'événement
              </ActionButton>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">{lastDebriefing.event.name}</h4>
                <p className="text-sm text-blue-600">
                  {new Date(lastDebriefing.event.endDate || lastDebriefing.event.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric' 
                  })} - {lastDebriefing.event.location}
                </p>
              </div>
              
              {lastDebriefing.generalObjectives && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Objectifs Généraux</h5>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{lastDebriefing.generalObjectives}</p>
                </div>
              )}
              
              {lastDebriefing.resultsSummary && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Résumé des Résultats</h5>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{lastDebriefing.resultsSummary}</p>
                </div>
              )}
              
              {lastDebriefing.keyLearnings && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Enseignements Clés</h5>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{lastDebriefing.keyLearnings}</p>
                </div>
              )}
              
              {!lastDebriefing.generalObjectives && !lastDebriefing.resultsSummary && !lastDebriefing.keyLearnings && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  Aucun détail de debriefing disponible pour cet événement.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Événements en attente de debriefing */}
        {recentEventsAwaitingDebriefing.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Événements Récents</h3>
              <span className="text-sm text-gray-500">Débriefing disponible demain</span>
            </div>
            <div className="space-y-3">
              {recentEventsAwaitingDebriefing.map(event => (
                <div key={event.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-800">{event.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(event.endDate || event.date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long',
                          year: 'numeric' 
                        })} - {event.location}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Débriefing demain
                      </span>
                      <ActionButton 
                        onClick={() => navigateTo('eventDetail', event.id)} 
                        size="sm" 
                        variant="secondary"
                      >
                        Voir l'événement
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

// Renamed to be a pure presentational component without hooks
const AthleteDashboardView: React.FC<AthleteDashboardViewProps> = ({ currentUser, upcomingRaces, navigateTo }) => {
    // Protection contre currentUser undefined
    if (!currentUser?.firstName) {
        return <div className="text-center text-gray-500">Chargement...</div>;
    }
    
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-800">Bonjour, {currentUser.firstName} !</h3>
            
            <div className="bg-white p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <FlagIcon className="w-5 h-5 mr-2 text-blue-500" />
                    Mes Prochaines Courses
                </h3>
                <div className="space-y-3">
                    {upcomingRaces && upcomingRaces.length > 0 ? (
                        upcomingRaces.map(event => (
                            <div key={event.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-800">{event.name}</p>
                                    <p className="text-xs text-gray-500">{new Date(event.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} - {event.location}</p>
                                </div>
                                <div className="flex items-center space-x-4 text-xs">
                                     {event.status && <span className={`px-2 py-1 font-semibold rounded-full ${RIDER_EVENT_STATUS_COLORS[event.status]}`}>{event.status}</span>}
                                    <ActionButton onClick={() => navigateTo('eventDetail', event.id)} size="sm" variant="secondary">Voir Détails</ActionButton>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 italic text-center py-4">Aucune course à venir pour le moment.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


export const DashboardSection: React.FC<DashboardSectionProps> = ({ navigateTo, currentUser, riders, staff, vehicles, scoutingProfiles, eventBudgetItems, raceEvents, eventTransportLegs, eventChecklistItems, incomeItems, riderEventSelections, performanceEntries }) => {
  const { t } = useTranslations();
  
  // Protection contre currentUser undefined
  if (!currentUser) {
    return (
      <SectionWrapper title={t('titleDashboard')}>
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
          <p className="mt-2 text-gray-500">Initialisation des données utilisateur...</p>
        </div>
      </SectionWrapper>
    );
  }
  
  const isViewer = currentUser.permissionRole === TeamRole.VIEWER;

  const today = useMemo(() => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now;
  }, []);

  const nextRace = useMemo(() => {
    if (isViewer || !raceEvents) return null;
    return [...raceEvents]
      .filter(event => {
        const eventEndDate = new Date((event.endDate || event.date) + "T23:59:59Z");
        return eventEndDate >= today;
      })
      .sort((a, b) => new Date(a.date + "T00:00:00Z").getTime() - new Date(b.date + "T00:00:00Z").getTime())[0];
  }, [raceEvents, isViewer, today]);

  const stats = useMemo(() => {
    if (isViewer || !riders || !incomeItems || !eventBudgetItems) return null;
    const injuredRiders = riders.filter(r => 
        r.healthCondition && r.healthCondition !== HealthCondition.PRET_A_COURIR && r.healthCondition !== HealthCondition.INCONNU && r.healthCondition !== HealthCondition.EN_RECUPERATION
    ).length;

    const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);

    const budget = eventBudgetItems.reduce((acc, item) => {
        acc.estimated += item.estimatedCost;
        acc.actual += item.actualCost || 0;
        return acc;
    }, { estimated: 0, actual: 0 });

    const totalSpent = budget.actual > 0 ? budget.actual : budget.estimated;
    const balance = totalIncome - totalSpent;

    return {
        nextRace: nextRace ? `${nextRace.name} - ${new Date(nextRace.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}` : 'Aucune course à venir',
        activeRiders: riders.length.toString(),
        ridersSubtext: injuredRiders > 0 ? `${injuredRiders} blessé(s)` : undefined,
        activeStaff: staff.length.toString(),
        scoutingProspects: scoutingProfiles.length.toString(),
        fleetSize: vehicles.length.toString(),
        balance: `${balance.toLocaleString('fr-FR')} €`,
        balanceSubtext: `Revenus: ${totalIncome.toLocaleString('fr-FR')} € / Dépenses: ${totalSpent.toLocaleString('fr-FR')} €`
    };
  }, [isViewer, riders, staff, vehicles, scoutingProfiles, eventBudgetItems, incomeItems, nextRace]);

  const upcomingEvents = useMemo(() => {
     if (isViewer || !raceEvents) return [];
     return [...raceEvents]
      .filter(event => {
        const eventEndDate = new Date((event.endDate || event.date) + "T23:59:59Z");
        return eventEndDate >= today;
      })
      .sort((a, b) => new Date(a.date + "T00:00:00Z").getTime() - new Date(b.date + "T00:00:00Z").getTime())
      .slice(0, 5);
  }, [raceEvents, isViewer, today]);

  // Dernier debriefing (seulement pour les événements terminés depuis au moins un jour)
  const lastDebriefing = useMemo(() => {
    if (isViewer || !performanceEntries || !raceEvents) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Début de la journée
    
    // Trouver le dernier debriefing avec les informations de l'événement
    const debriefingsWithEvents = performanceEntries
      .map(entry => {
        const event = raceEvents.find(e => e.id === entry.eventId);
        if (!event) return null;
        
        // Vérifier que l'événement est terminé depuis au moins un jour
        const eventEndDate = new Date(event.endDate || event.date);
        eventEndDate.setHours(23, 59, 59, 999); // Fin de la journée de l'événement
        const daysSinceEvent = Math.floor((today.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // L'événement doit être terminé depuis au moins 1 jour
        if (daysSinceEvent < 1) return null;
        
        return { ...entry, event, daysSinceEvent };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(a.event.endDate || a.event.date);
        const dateB = new Date(b.event.endDate || b.event.date);
        return dateB.getTime() - dateA.getTime();
      });

    return debriefingsWithEvents[0] || null;
  }, [isViewer, performanceEntries, raceEvents]);

  // Événements récents qui ne peuvent pas encore être débriefés
  const recentEventsAwaitingDebriefing = useMemo(() => {
    if (isViewer || !raceEvents) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return raceEvents
      .filter(event => {
        const eventEndDate = new Date(event.endDate || event.date);
        eventEndDate.setHours(23, 59, 59, 999);
        const daysSinceEvent = Math.floor((today.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // L'événement s'est terminé aujourd'hui (0 jours) ou hier (1 jour) mais n'a pas encore de debriefing
        return daysSinceEvent >= 0 && daysSinceEvent < 1 && !performanceEntries?.some(pe => pe.eventId === event.id);
      })
      .sort((a, b) => {
        const dateA = new Date(a.endDate || a.date);
        const dateB = new Date(b.endDate || b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3); // Limiter à 3 événements récents
  }, [isViewer, raceEvents, performanceEntries]);

  const alerts = useMemo(() => {
    if (isViewer || !raceEvents || !eventTransportLegs || !eventChecklistItems) return [];
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setUTCDate(today.getUTCDate() + 14);

    const alertsList: { id: string; text: string; eventId?: string }[] = [];

    const eventsInAlertWindow = raceEvents.filter(event => {
        const eventDate = new Date(event.date + "T00:00:00Z");
        return eventDate >= today && eventDate <= twoWeeksFromNow;
    });

    if (eventsInAlertWindow) {
        eventsInAlertWindow.forEach(event => {
            if (!event.directeurSportifId || event.directeurSportifId.length === 0) {
                alertsList.push({ id: `alert-ds-${event.id}`, text: `DS manquant pour ${event.name}`, eventId: event.id });
            }
            if (!event.selectedRiderIds || event.selectedRiderIds.length === 0) {
                alertsList.push({ id: `alert-riders-${event.id}`, text: `Aucun coureur sélectionné pour ${event.name}`, eventId: event.id });
            }
            const checklist = eventChecklistItems.filter(c => c.eventId === event.id);
            if (checklist.length > 0 && checklist.some(c => c.status !== ChecklistItemStatus.FAIT)) {
                 alertsList.push({ id: `alert-checklist-${event.id}`, text: `Checklist incomplète pour ${event.name}`, eventId: event.id });
            }
        });
    }
    
    if (eventTransportLegs) {
        eventTransportLegs.forEach(leg => {
            const event = raceEvents.find(e => e.id === leg.eventId);
            if (event) {
                const eventDate = new Date(event.date + "T00:00:00Z");
                if (eventDate >= today && eventDate <= twoWeeksFromNow) {
                    if (!leg.assignedVehicleId && leg.mode !== TransportMode.VOITURE_PERSO && leg.mode !== TransportMode.TRAIN && leg.mode !== TransportMode.VOL) {
                        alertsList.push({ id: `alert-transport-${leg.id}`, text: `Véhicule non assigné pour ${event.name}`, eventId: event.id });
                    }
                }
            }
        });
    }

    return alertsList;
  }, [raceEvents, eventTransportLegs, eventChecklistItems, isViewer, today]);

  // Hooks for AthleteDashboard
  const riderForCurrentUser = useMemo(() => {
    if (!isViewer) return null;
    return riders.find(r => r.email === currentUser.email);
  }, [riders, currentUser.email, isViewer]);

  const upcomingSelections = useMemo(() => {
    if (!isViewer || !riderForCurrentUser) return [];
    return riderEventSelections.filter(sel => sel.riderId === riderForCurrentUser.id && (sel.status === RiderEventStatus.TITULAIRE || sel.status === RiderEventStatus.PRE_SELECTION));
  }, [riderEventSelections, riderForCurrentUser, isViewer]);

  const upcomingRaces = useMemo(() => {
    if (!isViewer || !raceEvents) return [];
    return raceEvents.filter(event => 
        upcomingSelections.some(sel => sel.eventId === event.id) &&
        new Date((event.endDate || event.date) + 'T23:59:59Z') >= today
    ).sort((a,b) => new Date(a.date + "T00:00:00Z").getTime() - new Date(b.date + "T00:00:00Z").getTime())
    .map(event => {
        const selection = upcomingSelections.find(sel => sel.eventId === event.id);
        return {...event, status: selection?.status };
    })
    .slice(0, 5);
  }, [raceEvents, upcomingSelections, isViewer, today]);

  return (
    <SectionWrapper title={t('titleDashboard')}>
      {isViewer ? (
        <AthleteDashboardView
          currentUser={currentUser}
          upcomingRaces={upcomingRaces}
          navigateTo={navigateTo}
        />
      ) : (
        stats && (
          <OperationalDashboardView
            stats={stats}
            upcomingEvents={upcomingEvents}
            alerts={alerts}
            lastDebriefing={lastDebriefing}
            recentEventsAwaitingDebriefing={recentEventsAwaitingDebriefing}
            navigateTo={navigateTo}
          />
        )
      )}
    </SectionWrapper>
  );
};

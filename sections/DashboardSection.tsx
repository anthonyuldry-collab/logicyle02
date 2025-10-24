
import React, { useMemo } from 'react';
import { AppSection, RaceEvent, ChecklistItemStatus, User, TeamRole, HealthCondition, TransportMode, RiderEventStatus, Rider, StaffMember, ScoutingProfile, Vehicle, EventBudgetItem, EventTransportLeg, EventChecklistItem, IncomeItem, RiderEventSelection, PerformanceEntry, PermissionLevel } from '../types';
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
import { calculateRiderCharacteristics } from '../utils/performanceCalculations';
import MountainIcon from '../components/icons/MountainIcon';
import LungsIcon from '../components/icons/LungsIcon';
import CyclingIcon from '../components/icons/CyclingIcon';
import BeakerIcon from '../components/icons/BeakerIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import SeasonTransitionNotification from '../components/SeasonTransitionNotification';
import SeasonTransitionIndicator from '../components/SeasonTransitionIndicator';
import { getCurrentSeasonYear, getAvailableSeasonYears, getSeasonLabel } from '../utils/seasonUtils';
import { getActiveRidersForCurrentSeason, getActiveStaffForCurrentSeason } from '../utils/rosterArchiveUtils';

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
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
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
  riderProfile?: Rider;
  performanceEntries: PerformanceEntry[];
  careerStats?: {
    wins: number;
    podiums: number;
    top10s: number;
    totalRaces: number;
  };
  performanceMetrics?: {
    generalPerformanceScore: number;
    fatigueResistanceScore: number;
    charSprint: number;
    charAnaerobic: number;
    charPuncher: number;
    charClimbing: number;
    charRouleur: number;
  };
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
        {/* En-tête simplifié */}
        <div className="bg-blue-600 text-white p-6 rounded-lg">
          <h1 className="text-2xl font-bold mb-1">Tableau de Bord</h1>
          <p className="text-blue-100">Vue d'ensemble de l'équipe</p>
        </div>

        {/* KPI essentiels - Version compacte */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Prochaine Course</p>
                  <p className="text-lg font-bold text-red-600">{stats.nextRace}</p>
                </div>
                <FlagIcon className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Athlètes Actifs</p>
                  <p className="text-lg font-bold text-blue-600">{stats.activeRiders}</p>
                  {stats.ridersSubtext && (
                    <p className="text-xs text-orange-600">{stats.ridersSubtext}</p>
                  )}
                </div>
                <UsersIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Staff Actif</p>
                  <p className="text-lg font-bold text-green-600">{stats.activeStaff}</p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-green-500" />
              </div>
            </div>
        </div>

        {/* Section principale - Événements et Alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prochains événements - Version simplifiée */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FlagIcon className="w-5 h-5 mr-2 text-blue-500" />
                    Prochains Événements
                </h3>
                <div className="space-y-3">
                    {upcomingEvents && upcomingEvents.length > 0 ? (
                        upcomingEvents.slice(0, 2).map((event: RaceEvent) => (
                            <div key={event.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{event.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            {new Date(event.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { 
                                                day: 'numeric', 
                                                month: 'short' 
                                            })} - {event.location}
                                        </p>
                                        <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                                          <span>{event.selectedRiderIds.length} coureur{event.selectedRiderIds.length > 1 ? 's' : ''}</span>
                                          {event.isLogisticsValidated ? 
                                              <span className="text-green-600">✓ Logistique OK</span> :
                                              <span className="text-red-600">⚠ Logistique en attente</span>
                                          }
                                        </div>
                                    </div>
                                    <ActionButton 
                                      onClick={() => navigateTo('eventDetail', event.id)} 
                                      size="sm" 
                                      variant="secondary"
                                    >
                                        Voir
                                    </ActionButton>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <FlagIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Aucun événement à venir</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Alertes - Version simplifiée */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-orange-500" />
                    Alertes
                </h3>
                <div className="space-y-3">
                    {alerts && alerts.length > 0 ? (
                        alerts.slice(0, 2).map(alert => (
                            <div key={alert.id} className="p-3 bg-red-50 border-l-4 border-red-400 rounded-lg">
                                <p className="text-sm text-red-800 mb-2">{alert.text}</p>
                                {alert.eventId && (
                                    <ActionButton 
                                        onClick={() => navigateTo('eventDetail', alert.eventId)} 
                                        size="sm" 
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        Voir
                                    </ActionButton>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 bg-green-50 rounded-lg">
                            <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-3"/>
                            <p className="text-sm text-green-600 font-medium">Tout est en ordre !</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

    </div>
  );
};

// Renamed to be a pure presentational component without hooks
const AthleteDashboardView: React.FC<AthleteDashboardViewProps> = ({ 
    currentUser, 
    upcomingRaces, 
    navigateTo, 
    riderProfile, 
    performanceEntries, 
    careerStats, 
    performanceMetrics 
}) => {
    // Protection contre currentUser undefined
    if (!currentUser?.firstName) {
        return <div className="text-center text-gray-500">Chargement...</div>;
    }
    
    const { t } = useTranslations();
    
    return (
        <div className="space-y-6">
            {/* En-tête personnalisé */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold mb-2">Bonjour, {currentUser.firstName} !</h2>
                <p className="text-blue-100">Votre tableau de bord de performance personnel</p>
            </div>

            {/* Métriques de performance principales */}
            {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Score Général</p>
                                <p className="text-2xl font-bold text-blue-600">{performanceMetrics.generalPerformanceScore}/100</p>
                            </div>
                            <TrophyIcon className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Résistance</p>
                                <p className="text-2xl font-bold text-green-600">{performanceMetrics.fatigueResistanceScore}/100</p>
                            </div>
                            <LungsIcon className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Sprint</p>
                                <p className="text-2xl font-bold text-purple-600">{performanceMetrics.charSprint}/100</p>
                            </div>
                            <CyclingIcon className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Grimpeur</p>
                                <p className="text-2xl font-bold text-orange-600">{performanceMetrics.charClimbing}/100</p>
                            </div>
                            <MountainIcon className="w-8 h-8 text-orange-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Statistiques de carrière */}
            {careerStats && (
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <TrophyIcon className="w-5 h-5 mr-2 text-yellow-500" />
                        Statistiques de Carrière
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p className="text-3xl font-bold text-yellow-600">{careerStats.wins}</p>
                            <p className="text-sm text-gray-600">Victoires</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-3xl font-bold text-gray-600">{careerStats.podiums}</p>
                            <p className="text-sm text-gray-600">Podiums</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-3xl font-bold text-blue-600">{careerStats.top10s}</p>
                            <p className="text-sm text-gray-600">Top 10</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-3xl font-bold text-green-600">{careerStats.totalRaces}</p>
                            <p className="text-sm text-gray-600">Courses</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Prochaines courses */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FlagIcon className="w-5 h-5 mr-2 text-blue-500" />
                    Mes Prochaines Courses
                </h3>
                <div className="space-y-3">
                    {upcomingRaces && upcomingRaces.length > 0 ? (
                        upcomingRaces.map(event => (
                            <div key={event.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-gray-100 transition-colors">
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{event.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(event.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { 
                                            weekday: 'long', 
                                            day: 'numeric', 
                                            month: 'long' 
                                        })} - {event.location}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {event.status && (
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${RIDER_EVENT_STATUS_COLORS[event.status]}`}>
                                            {event.status}
                                        </span>
                                    )}
                                    <ActionButton 
                                        onClick={() => navigateTo('eventDetail', event.id)} 
                                        size="sm" 
                                        variant="secondary"
                                    >
                                        Voir Détails
                                    </ActionButton>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <FlagIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Aucune course à venir pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('myPerformance')}>
                    <div className="flex items-center mb-3">
                        <ChartBarIcon className="w-6 h-6 text-blue-500 mr-3" />
                        <h4 className="font-semibold text-gray-800">Mes Performances</h4>
                    </div>
                    <p className="text-sm text-gray-600">Consultez vos données de performance et votre profil de puissance</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('career')}>
                    <div className="flex items-center mb-3">
                        <TrophyIcon className="w-6 h-6 text-yellow-500 mr-3" />
                        <h4 className="font-semibold text-gray-800">Ma Carrière</h4>
                    </div>
                    <p className="text-sm text-gray-600">Gérez votre profil professionnel et vos résultats</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('nutrition')}>
                    <div className="flex items-center mb-3">
                        <BeakerIcon className="w-6 h-6 text-green-500 mr-3" />
                        <h4 className="font-semibold text-gray-800">Ma Nutrition</h4>
                    </div>
                    <p className="text-sm text-gray-600">Planifiez votre nutrition et vos stratégies alimentaires</p>
                </div>
            </div>
        </div>
    );
};


export const DashboardSection: React.FC<DashboardSectionProps> = ({ navigateTo, currentUser, riders, staff, vehicles, scoutingProfiles, eventBudgetItems, raceEvents, eventTransportLegs, eventChecklistItems, incomeItems, riderEventSelections, performanceEntries, effectivePermissions }) => {
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

  // Trouver le profil du coureur pour les athlètes
  const riderProfile = useMemo(() => {
    if (!isViewer || !riders) return null;
    return riders.find(r => r.email === currentUser.email) || null;
  }, [isViewer, riders, currentUser.email]);

  // Calculer les métriques de performance pour les athlètes
  const performanceMetrics = useMemo(() => {
    if (!riderProfile) return null;
    return calculateRiderCharacteristics(riderProfile);
  }, [riderProfile]);

  // Calculer les statistiques de carrière pour les athlètes
  const careerStats = useMemo(() => {
    if (!riderProfile?.resultsHistory) return null;
    
    let wins = 0;
    let podiums = 0;
    let top10s = 0;
    const totalRaces = riderProfile.resultsHistory.length;

    riderProfile.resultsHistory.forEach(result => {
      if (result.position === 1) wins++;
      if (result.position >= 1 && result.position <= 3) podiums++;
      if (result.position >= 1 && result.position <= 10) top10s++;
    });

    return { wins, podiums, top10s, totalRaces };
  }, [riderProfile]);

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
    
    // Utiliser les effectifs actifs pour la saison courante
    const activeRiders = getActiveRidersForCurrentSeason(riders);
    const activeStaff = getActiveStaffForCurrentSeason(staff);
    
    const injuredRiders = activeRiders.filter(r => 
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

    // Vérifier si l'utilisateur a accès à la section scouting
    const hasScoutingAccess = effectivePermissions && 
      effectivePermissions['scouting'] && 
      Array.isArray(effectivePermissions['scouting']) && 
      effectivePermissions['scouting'].includes('view');

    // Vérifier si l'utilisateur a accès aux sections logistiques
    const hasLogisticsAccess = effectivePermissions && 
      effectivePermissions['vehicles'] && 
      Array.isArray(effectivePermissions['vehicles']) && 
      effectivePermissions['vehicles'].includes('view');

    return {
        nextRace: nextRace ? `${nextRace.name} - ${new Date(nextRace.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}` : 'Aucune course à venir',
        activeRiders: activeRiders.length.toString(),
        ridersSubtext: injuredRiders > 0 ? `${injuredRiders} blessé(s)` : undefined,
        activeStaff: activeStaff.length.toString(),
        scoutingProspects: hasScoutingAccess ? scoutingProfiles.length.toString() : undefined,
        fleetSize: hasLogisticsAccess ? vehicles.length.toString() : undefined,
        balance: `${balance.toLocaleString('fr-FR')} €`,
        balanceSubtext: `Revenus: ${totalIncome.toLocaleString('fr-FR')} € / Dépenses: ${totalSpent.toLocaleString('fr-FR')} €`
    };
  }, [isViewer, riders, staff, vehicles, scoutingProfiles, eventBudgetItems, incomeItems, nextRace, effectivePermissions]);

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

  // Courses à venir pour les athlètes avec leur statut
  const upcomingRacesForAthlete = useMemo(() => {
    if (!isViewer || !raceEvents || !riderProfile) return [];
    
    return [...raceEvents]
      .filter(event => {
        const eventDate = new Date(event.date + "T00:00:00Z");
        return eventDate >= today && event.selectedRiderIds?.includes(riderProfile.id);
      })
      .map(event => {
        const selection = riderEventSelections?.find(s => s.eventId === event.id && s.riderId === riderProfile.id);
        return {
          ...event,
          status: selection?.status
        };
      })
      .sort((a, b) => new Date(a.date + "T00:00:00Z").getTime() - new Date(b.date + "T00:00:00Z").getTime())
      .slice(0, 5);
  }, [isViewer, raceEvents, today, riderProfile, riderEventSelections]);

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
      <SeasonTransitionNotification className="mb-6" />
      {isViewer ? (
        <AthleteDashboardView
          currentUser={currentUser}
          upcomingRaces={upcomingRacesForAthlete}
          navigateTo={navigateTo}
          riderProfile={riderProfile}
          performanceEntries={performanceEntries}
          careerStats={careerStats}
          performanceMetrics={performanceMetrics}
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

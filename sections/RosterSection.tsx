import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCircleIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { saveData, deleteData } from '../services/firebaseService';
import { Rider, RaceEvent, RiderEventSelection, FormeStatus, Sex, RiderQualitativeProfile, MoralStatus, HealthCondition, RiderEventStatus, RiderEventPreference, ScoutingProfile, TeamProduct, User, AppState } from '../types';
import { getAge, getAgeCategory, getLevelCategory } from '../utils/ageUtils';
import { calculateRiderCharacteristics } from '../utils/performanceCalculations';

interface RosterSectionProps {
  riders: Rider[];
  onSaveRider: (rider: Rider) => void;
  onDeleteRider: (rider: Rider) => void;
  raceEvents: RaceEvent[];
  setRaceEvents: (updater: React.SetStateAction<RaceEvent[]>) => void;
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
  performanceEntries: PerformanceEntry[];
  scoutingProfiles: ScoutingProfile[];
  teamProducts: TeamProduct[];
  currentUser: User;
  appState: AppState;
}

export default function RosterSection({ 
  riders, 
  onSaveRider, 
  onDeleteRider, 
  raceEvents, 
  setRaceEvents, 
  riderEventSelections, 
  setRiderEventSelections, 
  performanceEntries, 
  scoutingProfiles, 
  teamProducts, 
  currentUser, 
  appState 
}: RosterSectionProps) {
  if (!appState) {
    return <div>Chargement...</div>;
  }
  
  // Vérifications de sécurité pour éviter les erreurs undefined
  if (!riders || !Array.isArray(riders)) {
    return <div>Erreur: Données des athlètes non disponibles</div>;
  }
  
  if (!raceEvents || !Array.isArray(raceEvents)) {
    return <div>Erreur: Données des événements non disponibles</div>;
  }
  
  if (!riderEventSelections || !Array.isArray(riderEventSelections)) {
    return <div>Erreur: Données des sélections non disponibles</div>;
  }
  
  // États pour la gestion des onglets
  const [activeTab, setActiveTab] = useState<'roster' | 'seasonPlanning' | 'quality'>('roster');
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [minAgeFilter, setMinAgeFilter] = useState<number>(0);
  const [maxAgeFilter, setMaxAgeFilter] = useState<number>(100);
  
  // États pour le tri
  const [rosterSortBy, setRosterSortBy] = useState<'name' | 'firstName' | 'age' | 'ageCategory' | 'levelCategory' | 'raceDays'>('name');
  const [rosterSortDirection, setRosterSortDirection] = useState<'asc' | 'desc'>('asc');
  const [planningSortBy, setPlanningSortBy] = useState<'name' | 'raceDays'>('name');
  const [planningSortDirection, setPlanningSortDirection] = useState<'asc' | 'desc'>('asc');
  const [planningExpanded, setPlanningExpanded] = useState(true);
  const [localRaceEvents, setLocalRaceEvents] = useState(appState.raceEvents || []);
  const [includeScouts, setIncludeScouts] = useState(false);
  const [localRiderEventSelections, setLocalRiderEventSelections] = useState(appState.riderEventSelections || []);

  // États pour la qualité
  const [qualitySortField, setQualitySortField] = useState<'name' | 'age' | 'general' | 'sprint' | 'climbing' | 'puncher' | 'rouleur' | 'fatigue'>('general');
  const [qualitySortDirection, setQualitySortDirection] = useState<'asc' | 'desc'>('desc');
  
  // États pour le planning de saison
  const [planningSearchTerm, setPlanningSearchTerm] = useState('');
  const [planningGenderFilter, setPlanningGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [planningStatusFilter, setPlanningStatusFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [activePlanningTab, setActivePlanningTab] = useState<'statistics' | 'unified'>('statistics');
  const [riderSortField, setRiderSortField] = useState<'alphabetical' | 'raceDays' | 'potential'>('alphabetical');
  const [riderSortDirection, setRiderSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Fonctions de tri pour la qualité
  const handleQualitySort = (field: 'name' | 'age' | 'general' | 'sprint' | 'climbing' | 'puncher' | 'rouleur' | 'fatigue') => {
    if (qualitySortField === field) {
      setQualitySortDirection(qualitySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setQualitySortField(field);
      setQualitySortDirection('desc');
    }
  };

  // Fonctions de tri pour les athlètes
  const handleRiderSort = (field: 'name' | 'firstName' | 'age' | 'ageCategory' | 'levelCategory' | 'raceDays' | 'potential') => {
    if (rosterSortBy === field) {
      setRosterSortDirection(rosterSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRosterSortBy(field);
      setRosterSortDirection('asc');
    }
  };

  const getSortedRiders = (riders: Rider[], localRaceEvents: RaceEvent[], futureEvents: RaceEvent[], pastEvents: RaceEvent[], getRiderEventStatus: (eventId: string, riderId: string) => RiderEventStatus | null) => {
    return [...riders].sort((a, b) => {
      let comparison = 0;
      
      switch (riderSortField) {
        case 'alphabetical':
          // Tri alphabétique correct : d'abord par nom de famille, puis par prénom
          const lastNameA = (a.lastName || '').toLowerCase();
          const lastNameB = (b.lastName || '').toLowerCase();
          const firstNameA = (a.firstName || '').toLowerCase();
          const firstNameB = (b.firstName || '').toLowerCase();
          
          // Comparaison d'abord par nom de famille
          const lastNameComparison = lastNameA.localeCompare(lastNameB);
          if (lastNameComparison !== 0) {
            comparison = lastNameComparison;
          } else {
            // Si les noms de famille sont identiques, comparer par prénom
            comparison = firstNameA.localeCompare(firstNameB);
          }
          break;
          
        case 'raceDays':
          const aRaceDays = pastEvents.filter(event => 
            event.selectedRiderIds?.includes(a.id)
          ).length;
          const bRaceDays = pastEvents.filter(event => 
            event.selectedRiderIds?.includes(b.id)
          ).length;
          comparison = aRaceDays - bRaceDays;
          break;
          
        case 'potential':
          const aUpcomingEvents = futureEvents.filter(event => {
            const eventYear = new Date(event.date).getFullYear();
            return eventYear === selectedYear && (
              event.selectedRiderIds?.includes(a.id) || 
              getRiderEventStatus(event.id, a.id) === RiderEventStatus.PRE_SELECTION
            );
          }).length;
          const bUpcomingEvents = futureEvents.filter(event => {
            const eventYear = new Date(event.date).getFullYear();
            return eventYear === selectedYear && (
              event.selectedRiderIds?.includes(b.id) || 
              getRiderEventStatus(event.id, b.id) === RiderEventStatus.PRE_SELECTION
            );
          }).length;
          comparison = aUpcomingEvents - bUpcomingEvents;
          break;
      }
      
      return riderSortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  // Fonction pour obtenir les riders triés pour la qualité
  const getSortedRidersForQuality = () => {
    const allRiders = includeScouts ? [...riders, ...(appState.scoutingProfiles || [])] : riders;
    return allRiders.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (qualitySortField) {
        case 'name':
          // Tri alphabétique correct : d'abord par nom de famille, puis par prénom
          const lastNameA = (a.lastName || '').toLowerCase();
          const lastNameB = (b.lastName || '').toLowerCase();
          const firstNameA = (a.firstName || '').toLowerCase();
          const firstNameB = (b.firstName || '').toLowerCase();
          
          // Comparaison d'abord par nom de famille
          const lastNameComparison = lastNameA.localeCompare(lastNameB);
          if (lastNameComparison !== 0) {
            return qualitySortDirection === 'asc' ? lastNameComparison : -lastNameComparison;
          }
          
          // Si les noms de famille sont identiques, comparer par prénom
          const firstNameComparison = firstNameA.localeCompare(firstNameB);
          return qualitySortDirection === 'asc' ? firstNameComparison : -firstNameComparison;
          
        case 'age':
          valueA = getAge(a.birthDate) || 0;
          valueB = getAge(b.birthDate) || 0;
          return qualitySortDirection === 'asc' ? valueA - valueB : valueB - valueA;
          
        default:
          // Pour les scores de qualité
          const scoreA = calculateCogganProfileScore(a);
          const scoreB = calculateCogganProfileScore(b);
          
          switch (qualitySortField) {
            case 'general':
              valueA = scoreA.generalScore || 0;
              valueB = scoreB.generalScore || 0;
              break;
            case 'sprint':
              valueA = scoreA.sprintScore || 0;
              valueB = scoreB.sprintScore || 0;
              break;
            case 'climbing':
              valueA = scoreA.montagneScore || 0;
              valueB = scoreB.montagneScore || 0;
              break;
            case 'puncher':
              valueA = scoreA.puncheurScore || 0;
              valueB = scoreB.puncheurScore || 0;
              break;
            case 'rouleur':
              valueA = scoreA.rouleurScore || 0;
              valueB = scoreB.rouleurScore || 0;
              break;
            case 'fatigue':
              valueA = scoreA.resistanceScore || 0;
              valueB = scoreB.resistanceScore || 0;
              break;
            default:
              valueA = 0;
              valueB = 0;
          }
          
          return qualitySortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
    });
  };
  
  // Fonctions pour les modales
  const openViewModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsViewModalOpen(true);
  };
  
  const openEditModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsEditModalOpen(true);
  };

  // Composant pour l'onglet Statistiques
  const StatisticsTab = ({ futureEvents, pastEvents, riders, localRaceEvents, getRiderEventStatus }: {
    futureEvents: RaceEvent[];
    pastEvents: RaceEvent[];
    riders: Rider[];
    localRaceEvents: RaceEvent[];
    getRiderEventStatus: (eventId: string, riderId: string) => RiderEventStatus | null;
  }) => {
    const sortedRiders = getSortedRiders(riders, localRaceEvents, futureEvents, pastEvents, getRiderEventStatus);
    
    return (
    <div className="space-y-8">
      {/* Tableau de bord principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistiques globales */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-light text-blue-600 mb-1">{futureEvents.length}</div>
              <div className="text-sm text-gray-600">Événements planifiés</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-light text-green-600 mb-1">{riders.length}</div>
              <div className="text-sm text-gray-600">Athlètes disponibles</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-light text-purple-600 mb-1">
                {localRaceEvents.filter(event => event.selectedRiderIds && event.selectedRiderIds.length > 0).length}
              </div>
              <div className="text-sm text-gray-600">Sélections actives</div>
            </div>
          </div>
        </div>

        {/* Vue calendrier saison cycliste */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h4 className="text-lg font-medium text-gray-900">Calendrier Saison {selectedYear}</h4>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                  <option value={2029}>2029</option>
                  <option value={2030}>2030</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Courses confirmées</span>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Pré-sélections</span>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span>Période de repos</span>
              </div>
            </div>
            
            {/* Vue mensuelle de la saison */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {(() => {
                const currentYear = new Date().getFullYear();
                const months = [
                  { name: 'Janvier', events: futureEvents.filter(e => new Date(e.date).getMonth() === 0) },
                  { name: 'Février', events: futureEvents.filter(e => new Date(e.date).getMonth() === 1) },
                  { name: 'Mars', events: futureEvents.filter(e => new Date(e.date).getMonth() === 2) },
                  { name: 'Avril', events: futureEvents.filter(e => new Date(e.date).getMonth() === 3) },
                  { name: 'Mai', events: futureEvents.filter(e => new Date(e.date).getMonth() === 4) },
                  { name: 'Juin', events: futureEvents.filter(e => new Date(e.date).getMonth() === 5) },
                  { name: 'Juillet', events: futureEvents.filter(e => new Date(e.date).getMonth() === 6) },
                  { name: 'Août', events: futureEvents.filter(e => new Date(e.date).getMonth() === 7) },
                  { name: 'Septembre', events: futureEvents.filter(e => new Date(e.date).getMonth() === 8) },
                  { name: 'Octobre', events: futureEvents.filter(e => new Date(e.date).getMonth() === 9) },
                  { name: 'Novembre', events: futureEvents.filter(e => new Date(e.date).getMonth() === 10) },
                  { name: 'Décembre', events: futureEvents.filter(e => new Date(e.date).getMonth() === 11) }
                ];
                
                return months.map((month, index) => {
                  const isCurrentMonth = new Date().getMonth() === index;
                  const isOffSeason = index === 0 || index === 11; // Janvier et Décembre
                  
                  return (
                    <div key={month.name} className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrentMonth 
                        ? 'border-blue-500 bg-blue-50' 
                        : isOffSeason 
                          ? 'border-gray-200 bg-gray-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <h5 className={`font-medium text-sm ${
                          isCurrentMonth ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {month.name}
                        </h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isOffSeason 
                            ? 'bg-gray-200 text-gray-600' 
                            : month.events.length > 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {month.events.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {month.events.slice(0, 2).map(event => {
                          const titulaires = riders.filter(rider => 
                            event.selectedRiderIds?.includes(rider.id)
                          );
                          return (
                            <div key={event.id} className="text-xs text-gray-600 truncate">
                              {event.name} ({titulaires.length})
                            </div>
                          );
                        })}
                        {month.events.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{month.events.length - 2} autres
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* Charge de travail par athlète */}
            <div className="border-t border-gray-200 pt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Charge de Travail par Athlète</h5>
              <div className="space-y-2">
                {(() => {
                  const riderWorkload = riders.map(rider => {
                    const riderPastEvents = pastEvents.filter(event => 
                      event.selectedRiderIds?.includes(rider.id)
                    );
                    const upcomingEvents = futureEvents.filter(event => {
                      const eventYear = new Date(event.date).getFullYear();
                      return eventYear === selectedYear && (
                        event.selectedRiderIds?.includes(rider.id) || 
                        getRiderEventStatus(event.id, rider.id) === RiderEventStatus.PRE_SELECTION
                      );
                    });
                    return {
                      rider,
                      pastEvents: riderPastEvents.length,
                      upcomingEvents: upcomingEvents.length,
                      totalEvents: riderPastEvents.length + upcomingEvents.length
                    };
                  }).sort((a, b) => b.totalEvents - a.totalEvents).slice(0, 6);
                  
                  const maxEvents = Math.max(...riderWorkload.map(r => r.totalEvents), 1);
                  
                  return riderWorkload.map((riderStat, index) => (
                    <div key={riderStat.rider.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {riderStat.rider.firstName[0]}{riderStat.rider.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {riderStat.rider.firstName} {riderStat.rider.lastName}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="bg-green-100 text-green-700 px-1 rounded">
                              {riderStat.pastEvents} passées
                            </span>
                            <span className="bg-blue-100 text-blue-700 px-1 rounded">
                              {riderStat.upcomingEvents} à venir
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (riderStat.totalEvents / maxEvents) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-6 text-right">
                          {riderStat.totalEvents}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques des athlètes et équilibrage des calendriers */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h4 className="text-lg font-medium text-gray-900">Statistiques des Athlètes - Équilibrage des Calendriers</h4>
            
            {/* Bouton de filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              title="Afficher/masquer les filtres"
            >
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                <span>Filtres</span>
              </div>
            </button>
            
            {/* Boutons de tri discrets */}
            <div className="flex items-center space-x-1 flex-wrap">
              <button
                onClick={() => handleRiderSort('name')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  rosterSortBy === 'name'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title="Trier par nom complet"
              >
            <div className="flex items-center space-x-1">
                  <span>Nom</span>
                  {rosterSortBy === 'name' && (
                    <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleRiderSort('firstName')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  rosterSortBy === 'firstName'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title="Trier par prénom"
              >
                <div className="flex items-center space-x-1">
                  <span>Prénom</span>
                  {rosterSortBy === 'firstName' && (
                    <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleRiderSort('age')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  rosterSortBy === 'age'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title="Trier par âge"
              >
                <div className="flex items-center space-x-1">
                  <span>Âge</span>
                  {rosterSortBy === 'age' && (
                    <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleRiderSort('ageCategory')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  rosterSortBy === 'ageCategory'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title="Trier par catégorie d'âge"
              >
                <div className="flex items-center space-x-1">
                  <span>Cat. Âge</span>
                  {rosterSortBy === 'ageCategory' && (
                    <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleRiderSort('levelCategory')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  rosterSortBy === 'levelCategory'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title="Trier par niveau de performance"
              >
                <div className="flex items-center space-x-1">
                  <span>Niveau</span>
                  {rosterSortBy === 'levelCategory' && (
                    <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
            </div>
              </button>
              
              <button
                onClick={() => handleRiderSort('raceDays')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  rosterSortBy === 'raceDays'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title="Trier par nombre de jours de course"
              >
                <div className="flex items-center space-x-1">
                  <span>Jours</span>
                  {rosterSortBy === 'raceDays' && (
                    <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
        
        
        {/* Tableau des statistiques */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Athlète</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Jours de course</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Charge actuelle</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Prochaines courses</th>
              </tr>
            </thead>
            <tbody>
              {sortedRiders
                .filter(rider => {
                  // Filtre par recherche
                  const searchMatch = !planningSearchTerm || 
                    `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(planningSearchTerm.toLowerCase());
                  
                  // Filtre par genre
                  const genderMatch = planningGenderFilter === 'all' || 
                    (planningGenderFilter === 'male' && rider.sex === Sex.MALE) ||
                    (planningGenderFilter === 'female' && rider.sex === Sex.FEMALE);
                  
                  // Filtre par statut
                  const riderEvents = localRaceEvents.filter(event => 
                    event.selectedRiderIds?.includes(rider.id)
                  );
                  const statusMatch = planningStatusFilter === 'all' ||
                    (planningStatusFilter === 'selected' && riderEvents.length > 0) ||
                    (planningStatusFilter === 'unselected' && riderEvents.length === 0);
                  
                  return searchMatch && genderMatch && statusMatch;
                })
                .map(rider => {
                const riderEvents = localRaceEvents.filter(event => 
                  event.selectedRiderIds?.includes(rider.id)
                );
                const riderPreselections = localRaceEvents.filter(event => 
                  getRiderEventStatus(event.id, rider.id) === RiderEventStatus.PRE_SELECTION
                );
                // Compter les jours uniques de course
                const totalDays = new Set(riderEvents.map(event => event.date)).size;
                const upcomingEvents = futureEvents.filter(event => 
                  event.selectedRiderIds?.includes(rider.id) || 
                  getRiderEventStatus(event.id, rider.id) === RiderEventStatus.PRE_SELECTION
                );
                
                // Calculer la charge (nombre de jours de course)
                const chargeLevel = totalDays < 5 ? 'Faible' : totalDays < 10 ? 'Modérée' : 'Élevée';
                const chargeColor = totalDays < 5 ? 'text-green-600' : totalDays < 10 ? 'text-yellow-600' : 'text-red-600';
                
                return (
                  <tr key={rider.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {rider.firstName[0]}{rider.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {rider.firstName} {rider.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rider.sex === Sex.MALE ? 'Homme' : 'Femme'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-lg font-semibold text-gray-900">{totalDays}</div>
                      <div className="text-xs text-gray-500">jours</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`font-medium ${chargeColor}`}>{chargeLevel}</div>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mx-auto mt-1">
                        <div 
                          className={`h-1.5 rounded-full ${
                            totalDays < 5 ? 'bg-green-500' : 
                            totalDays < 10 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (totalDays / 15) * 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm text-gray-900">{upcomingEvents.length}</div>
                      <div className="text-xs text-gray-500">prochaines</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vue annuelle 2025 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Vue Annuelle 2025
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Statistiques de l'année */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              Statistiques {selectedYear}
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Total courses</span>
                <span className="text-blue-600 font-medium">{pastEvents.length + futureEvents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Courses passées</span>
                <span className="text-green-600 font-medium">{pastEvents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Courses à venir</span>
                <span className="text-blue-600 font-medium">{futureEvents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Athlètes sélectionnés</span>
                <span className="text-blue-600 font-medium">
                  {new Set([...pastEvents, ...futureEvents].flatMap(event => event.selectedRiderIds || [])).size}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Jours de course</span>
                <span className="text-blue-600 font-medium">
                  {riders.reduce((total, rider) => {
                    const riderPastEvents = pastEvents.filter(event => 
                      event.selectedRiderIds?.includes(rider.id)
                    );
                    const riderFutureEvents = futureEvents.filter(event => 
                      event.selectedRiderIds?.includes(rider.id) || 
                      getRiderEventStatus(event.id, rider.id) === RiderEventStatus.PRE_SELECTION
                    );
                    return total + riderPastEvents.length + riderFutureEvents.length;
                  }, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Prochaines courses importantes */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Prochaines Courses
            </h5>
            <div className="space-y-2">
              {futureEvents.slice(0, 4).map(event => {
                const titulaires = riders.filter(rider => 
                  event.selectedRiderIds?.includes(rider.id)
                );
                return (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-gray-700">{event.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </div>
                    </div>
                    <span className="text-green-600 font-medium">{titulaires.length}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Répartition par athlète */}
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              Répartition par Athlète
            </h5>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(() => {
                const riderStats = riders.map(rider => {
                  const riderPastEvents = pastEvents.filter(event => 
                    event.selectedRiderIds?.includes(rider.id)
                  );
                  const upcomingEvents = futureEvents.filter(event => {
                    const eventYear = new Date(event.date).getFullYear();
                    return eventYear === selectedYear && (
                      event.selectedRiderIds?.includes(rider.id) || 
                      getRiderEventStatus(event.id, rider.id) === RiderEventStatus.PRE_SELECTION
                    );
                  });
                  return {
                    rider,
                    pastEvents: riderPastEvents.length,
                    upcomingEvents: upcomingEvents.length,
                    totalEvents: riderPastEvents.length + upcomingEvents.length
                  };
                }).sort((a, b) => b.totalEvents - a.totalEvents);
                
                const maxEvents = Math.max(...riderStats.map(r => r.totalEvents), 1);
                
                return riderStats.map((riderStat, index) => (
                  <div key={riderStat.rider.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-gray-700 truncate">
                        {riderStat.rider.firstName} {riderStat.rider.lastName}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <span className="bg-green-100 text-green-700 px-1 rounded">
                          {riderStat.pastEvents}
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-1 rounded">
                          {riderStat.upcomingEvents}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (riderStat.totalEvents / maxEvents) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-purple-600 font-medium text-xs w-6 text-right">
                        {riderStat.totalEvents}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Recommandations intelligentes */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analyse de l'Équipe
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Athlètes sous-utilisés */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h5 className="font-medium text-gray-900 mb-2">Athlètes sous-utilisés</h5>
            <div className="space-y-2">
              {riders
                .filter(rider => {
                  const riderEvents = localRaceEvents.filter(event => 
                    event.selectedRiderIds?.includes(rider.id)
                  );
                  const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
                  return uniqueDays < 3;
                })
                .slice(0, 3)
                .map(rider => {
                  const riderEvents = localRaceEvents.filter(event => 
                    event.selectedRiderIds?.includes(rider.id)
                  );
                  const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
                  return (
                    <div key={rider.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{rider.firstName} {rider.lastName}</span>
                      <span className="text-blue-600 font-medium">{uniqueDays} jours</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Athlètes plus utilisés */}
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h5 className="font-medium text-gray-900 mb-2">Athlètes plus utilisés</h5>
            <div className="space-y-2">
              {riders
                .filter(rider => {
                  const riderEvents = localRaceEvents.filter(event => 
                    event.selectedRiderIds?.includes(rider.id)
                  );
                  const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
                  return uniqueDays > 8;
                })
                .slice(0, 3)
                .map(rider => {
                  const riderEvents = localRaceEvents.filter(event => 
                    event.selectedRiderIds?.includes(rider.id)
                  );
                  const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
                  return (
                    <div key={rider.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{rider.firstName} {rider.lastName}</span>
                      <span className="text-orange-600 font-medium">{uniqueDays} jours</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Prochaines courses */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h5 className="font-medium text-gray-900 mb-2">Prochaines courses</h5>
            <div className="space-y-2">
              {futureEvents.slice(0, 3).map(event => {
                const eventDate = new Date(event.date);
                const formattedDate = eventDate.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short'
                });
                
                return (
                  <div key={event.id} className="text-sm">
                    <div className="font-medium text-gray-700">{event.name}</div>
                    <div className="text-gray-500">{formattedDate}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Équilibrage des calendriers */}
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <h5 className="font-medium text-gray-900 mb-2">Équilibrage des calendriers</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Moyenne par athlète</span>
                <span className="text-purple-600 font-medium">
                  {riders.length > 0 ? Math.round(
                    riders.reduce((total, rider) => {
                      const riderEvents = localRaceEvents.filter(event => 
                        event.selectedRiderIds?.includes(rider.id)
                      );
                      const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
                      return total + uniqueDays;
                    }, 0) / riders.length * 10
                  ) / 10 : 0} jours
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Écart type</span>
                <span className="text-purple-600 font-medium">
                  {(() => {
                    const eventsPerRider = riders.map(rider => {
                      const riderEvents = localRaceEvents.filter(event => 
                        event.selectedRiderIds?.includes(rider.id)
                      );
                      return new Set(riderEvents.map(event => event.date)).size;
                    });
                    const mean = eventsPerRider.reduce((a, b) => a + b, 0) / eventsPerRider.length;
                    const variance = eventsPerRider.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / eventsPerRider.length;
                    return Math.round(Math.sqrt(variance) * 10) / 10;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Distribution</span>
                <span className="text-purple-600 font-medium">
                  {riders.filter(rider => {
                    const riderEvents = localRaceEvents.filter(event => 
                      event.selectedRiderIds?.includes(rider.id)
                    );
                    const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
                    return uniqueDays >= 3 && uniqueDays <= 6;
                  }).length}/{riders.length} équilibrés
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Composant pour l'onglet Sélections
  const SelectionsTab = ({ 
    futureEvents, 
    riders, 
    planningSearchTerm, 
    setPlanningSearchTerm, 
    planningGenderFilter, 
    setPlanningGenderFilter, 
    planningStatusFilter, 
    setPlanningStatusFilter,
    getRiderEventStatus,
    addRiderToEvent,
    removeRiderFromEvent,
    syncSelectionsFromEvents,
    syncSelectionsToEvents,
    saveAllSelections
  }: {
    futureEvents: RaceEvent[];
    riders: Rider[];
    planningSearchTerm: string;
    setPlanningSearchTerm: (term: string) => void;
    planningGenderFilter: 'all' | 'male' | 'female';
    setPlanningGenderFilter: (filter: 'all' | 'male' | 'female') => void;
    planningStatusFilter: 'all' | 'selected' | 'unselected';
    setPlanningStatusFilter: (filter: 'all' | 'selected' | 'unselected') => void;
    getRiderEventStatus: (eventId: string, riderId: string) => RiderEventStatus | null;
    addRiderToEvent: (eventId: string, riderId: string, status: RiderEventStatus) => void;
    removeRiderFromEvent: (eventId: string, riderId: string) => void;
    syncSelectionsFromEvents: () => void;
    syncSelectionsToEvents: () => void;
    saveAllSelections: () => void;
  }) => {
    const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null);

    return (
      <div className="space-y-6">
        {/* Barre de contrôle des sélections */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h4 className="text-lg font-medium text-gray-900">Gestion des Sélections</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Titulaires</span>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Remplaçants</span>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Pré-sélections</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={planningSearchTerm}
                  onChange={(e) => setPlanningSearchTerm(e.target.value)}
                  placeholder="Rechercher un athlète..."
                  className="w-full pl-12 pr-4 py-3 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <select
                value={planningGenderFilter}
                onChange={(e) => setPlanningGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                className="px-4 py-3 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="all">Tous</option>
                <option value="male">Hommes</option>
                <option value="female">Femmes</option>
              </select>
              <button
                onClick={() => {
                  setPlanningSearchTerm('');
                  setPlanningGenderFilter('all');
                  setPlanningStatusFilter('all');
                }}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>

        {/* Liste des événements cliquables */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {futureEvents.map(event => {
            const titulaires = riders.filter(rider => 
              event.selectedRiderIds?.includes(rider.id)
            );
            const remplacants = riders.filter(rider => 
              getRiderEventStatus(event.id, rider.id) === RiderEventStatus.REMPLACANT
            );
            const preselections = riders.filter(rider => 
              getRiderEventStatus(event.id, rider.id) === RiderEventStatus.PRE_SELECTION
            );
            
            const isSelected = selectedEvent?.id === event.id;
            
            return (
              <div 
                key={event.id} 
                className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedEvent(isSelected ? null : event)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="font-medium text-gray-900 text-lg">{event.name}</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(event.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{event.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-light text-blue-600">
                      {titulaires.length + remplacants.length + preselections.length}
                    </div>
                    <div className="text-xs text-gray-500">sélectionnés</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Titulaires</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{titulaires.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Remplaçants</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{remplacants.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Pré-sélections</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{preselections.length}</span>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <span className="text-sm text-blue-600 font-medium">
                        Cliquez pour gérer les sélections
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Interface de sélection détaillée pour l'événement sélectionné */}
        {selectedEvent && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-xl font-medium text-gray-900">{selectedEvent.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(selectedEvent.date).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })} • {selectedEvent.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filtrage des athlètes */}
            {(() => {
              const filteredRiders = riders.filter(rider => {
                const matchesSearch = !planningSearchTerm || 
                  rider.firstName.toLowerCase().includes(planningSearchTerm.toLowerCase()) ||
                  rider.lastName.toLowerCase().includes(planningSearchTerm.toLowerCase());
                
                const matchesGender = planningGenderFilter === 'all' || 
                  (planningGenderFilter === 'male' && rider.sex === Sex.MALE) ||
                  (planningGenderFilter === 'female' && rider.sex === Sex.FEMALE);
                
                return matchesSearch && matchesGender;
              });

              return (
                <div className="space-y-6">
                  {/* Groupe des Titulaires */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h5 className="font-medium text-gray-900">Titulaires</h5>
                        <span className="text-sm text-gray-500">
                          ({filteredRiders.filter(rider => selectedEvent.selectedRiderIds?.includes(rider.id)).length})
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            filteredRiders.forEach(rider => {
                              if (!selectedEvent.selectedRiderIds?.includes(rider.id)) {
                                addRiderToEvent(selectedEvent.id, rider.id, RiderEventStatus.TITULAIRE);
                              }
                            });
                          }}
                          className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => {
                            filteredRiders.forEach(rider => {
                              if (selectedEvent.selectedRiderIds?.includes(rider.id)) {
                                removeRiderFromEvent(selectedEvent.id, rider.id);
                              }
                            });
                          }}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors"
                        >
                          Tout désélectionner
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredRiders.map(rider => {
                        const isTitulaire = selectedEvent.selectedRiderIds?.includes(rider.id);
                        const isRemplacant = getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.REMPLACANT;
                        const isPreselection = getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.PRE_SELECTION;
                    
                        return (
                          <div key={rider.id} className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                            isTitulaire 
                              ? 'bg-green-50 border-green-200 shadow-sm' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isTitulaire}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addRiderToEvent(selectedEvent.id, rider.id, RiderEventStatus.TITULAIRE);
                                    } else {
                                      if (isTitulaire || isRemplacant || isPreselection) {
                                        removeRiderFromEvent(selectedEvent.id, rider.id);
                                      }
                                    }
                                  }}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <div>
                                  <div className={`font-medium ${isTitulaire ? 'text-green-900' : 'text-gray-900'}`}>
                                    {rider.firstName} {rider.lastName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {rider.sex === Sex.MALE ? 'Homme' : 'Femme'}
                                  </div>
                                </div>
                              </div>
                              {isTitulaire && (
                                <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                  Titulaire
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Groupe des Remplaçants */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <h5 className="font-medium text-gray-900">Remplaçants</h5>
                        <span className="text-sm text-gray-500">
                          ({filteredRiders.filter(rider => getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.REMPLACANT).length})
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            filteredRiders.forEach(rider => {
                              if (!selectedEvent.selectedRiderIds?.includes(rider.id) && 
                                  getRiderEventStatus(selectedEvent.id, rider.id) !== RiderEventStatus.REMPLACANT) {
                                addRiderToEvent(selectedEvent.id, rider.id, RiderEventStatus.REMPLACANT);
                              }
                            });
                          }}
                          className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full hover:bg-yellow-100 transition-colors"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => {
                            filteredRiders.forEach(rider => {
                              if (getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.REMPLACANT) {
                                removeRiderFromEvent(selectedEvent.id, rider.id);
                              }
                            });
                          }}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors"
                        >
                          Tout désélectionner
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredRiders.map(rider => {
                        const isRemplacant = getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.REMPLACANT;
                        const isTitulaire = selectedEvent.selectedRiderIds?.includes(rider.id);
                        const isPreselection = getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.PRE_SELECTION;
                        
                        return (
                          <div key={rider.id} className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                            isRemplacant 
                              ? 'bg-yellow-50 border-yellow-200 shadow-sm' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isRemplacant}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addRiderToEvent(selectedEvent.id, rider.id, RiderEventStatus.REMPLACANT);
                                    } else {
                                      if (isTitulaire || isRemplacant || isPreselection) {
                                        removeRiderFromEvent(selectedEvent.id, rider.id);
                                      }
                                    }
                                  }}
                                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                />
                                <div>
                                  <div className={`font-medium ${isRemplacant ? 'text-yellow-900' : 'text-gray-900'}`}>
                                    {rider.firstName} {rider.lastName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {rider.sex === Sex.MALE ? 'Homme' : 'Femme'}
                                  </div>
                                </div>
                              </div>
                              {isRemplacant && (
                                <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                  Remplaçant
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Groupe des Pré-sélections */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h5 className="font-medium text-gray-900">Pré-sélections</h5>
                        <span className="text-sm text-gray-500">
                          ({filteredRiders.filter(rider => getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.PRE_SELECTION).length})
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            filteredRiders.forEach(rider => {
                              if (!selectedEvent.selectedRiderIds?.includes(rider.id) && 
                                  getRiderEventStatus(selectedEvent.id, rider.id) !== RiderEventStatus.REMPLACANT &&
                                  getRiderEventStatus(selectedEvent.id, rider.id) !== RiderEventStatus.PRE_SELECTION) {
                                addRiderToEvent(selectedEvent.id, rider.id, RiderEventStatus.PRE_SELECTION);
                              }
                            });
                          }}
                          className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => {
                            filteredRiders.forEach(rider => {
                              if (getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.PRE_SELECTION) {
                                removeRiderFromEvent(selectedEvent.id, rider.id);
                              }
                            });
                          }}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors"
                        >
                          Tout désélectionner
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredRiders.map(rider => {
                        const isPreselection = getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.PRE_SELECTION;
                        const isTitulaire = selectedEvent.selectedRiderIds?.includes(rider.id);
                        const isRemplacant = getRiderEventStatus(selectedEvent.id, rider.id) === RiderEventStatus.REMPLACANT;
                        
                        return (
                          <div key={rider.id} className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                            isPreselection 
                              ? 'bg-blue-50 border-blue-200 shadow-sm' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isPreselection}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addRiderToEvent(selectedEvent.id, rider.id, RiderEventStatus.PRE_SELECTION);
                                    } else {
                                      if (isTitulaire || isRemplacant || isPreselection) {
                                        removeRiderFromEvent(selectedEvent.id, rider.id);
                                      }
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div>
                                  <div className={`font-medium ${isPreselection ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {rider.firstName} {rider.lastName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {rider.sex === Sex.MALE ? 'Homme' : 'Femme'}
                                  </div>
                                </div>
                              </div>
                              {isPreselection && (
                                <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  Pré-sélection
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Actions globales */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-center space-x-4">
            <button
              onClick={syncSelectionsFromEvents}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync depuis événements</span>
            </button>
            <button
              onClick={syncSelectionsToEvents}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync vers événements</span>
            </button>
            <button
              onClick={saveAllSelections}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Synchroniser l'état local avec l'état global
  useEffect(() => {
    setLocalRaceEvents(appState.raceEvents || []);
    setLocalRiderEventSelections(appState.riderEventSelections || []);
  }, [appState.raceEvents, appState.riderEventSelections]);

  // Synchronisation automatique au chargement
  useEffect(() => {
    if (localRaceEvents.length > 0 && localRiderEventSelections.length > 0) {
      console.log('🔄 Synchronisation automatique au chargement...');
      // Synchroniser les sélections depuis les événements vers le planning
      // Note: Les fonctions de synchronisation sont définies plus bas dans le composant
    }
  }, [localRaceEvents.length, localRiderEventSelections.length]);
  
  // États pour la gestion des modales
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [riderToDelete, setRiderToDelete] = useState<Rider | null>(null);


  // Fonction pour ajouter un nouveau coureur
  const openAddRiderModal = () => {
    const newRider: Rider = {
      id: `rider_${Date.now()}`,
      firstName: '',
      lastName: '',
      email: '',
      birthDate: new Date().toISOString().split('T')[0],
      sex: Sex.MALE,
      photoUrl: '',
      weightKg: 70,
      heightCm: 170,
      powerProfileFresh: {},
      forme: FormeStatus.INCONNU,
      moral: MoralStatus.INCONNU,
      healthCondition: HealthCondition.INCONNU,
      qualitativeProfile: RiderQualitativeProfile.AUTRE,
      disciplines: [],
      categories: [],
      favoriteRaces: [],
      resultsHistory: [],
      allergies: [],
      performanceNutrition: {
        carbsPerHourTarget: 0,
        hydrationNotes: '',
        selectedGels: [],
        selectedBars: [],
        selectedDrinks: [],
        customProducts: []
      },
      roadBikeSetup: {
        specifics: {
          tailleCadre: '',
          cintre: '',
          potence: '',
          plateau: '',
          manivelle: '',
          capteurPuissance: ''
        },
        cotes: {
          hauteurSelle: '',
          reculSelle: '',
          longueurBecSelleAxeCintre: '',
          hauteurGuidonAxeRoueCentreCintre: ''
        }
      },
      ttBikeSetup: {
        specifics: {
          tailleCadre: '',
          cintre: '',
          potence: '',
          plateau: '',
          manivelle: '',
          capteurPuissance: ''
        },
        cotes: {
          hauteurSelle: '',
          reculSelle: '',
          longueurBecSelleAxeCintre: '',
          hauteurGuidonAxeRoueCentreCintre: ''
        }
      },
      clothing: [],
      performanceGoals: '',
      physiquePerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: ''
      },
      techniquePerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: ''
      },
      mentalPerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: ''
      },
      environnementPerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: ''
      },
      tactiquePerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: ''
      },
      charSprint: 0,
      charAnaerobic: 0,
      charPuncher: 0,
      charClimbing: 0,
      charRouleur: 0,
      generalPerformanceScore: 0,
      fatigueResistanceScore: 0
    };
    setSelectedRider(newRider);
    setIsEditModalOpen(true);
  };

  // Fonction pour gérer la sauvegarde d'un coureur
  const handleSaveRider = (rider: Rider) => {
    try {
      onSaveRider(rider);
      setIsEditModalOpen(false);
      setSelectedRider(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du coureur');
    }
  };

  // Fonction pour gérer la mise à jour des préférences de course
  const handleUpdateRiderPreference = (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => {
    const existingSelection = riderEventSelections.find(sel => sel.eventId === eventId && sel.riderId === riderId);
    
    if (existingSelection) {
      // Mettre à jour la sélection existante
      setRiderEventSelections(prev => prev.map(sel => 
        sel.eventId === eventId && sel.riderId === riderId
          ? { ...sel, riderPreference: preference, riderObjectives: objectives || sel.riderObjectives }
          : sel
      ));
    } else {
      // Créer une nouvelle sélection
      const newSelection = {
        id: `selection_${Date.now()}`,
        eventId,
        riderId,
        status: RiderEventStatus.EN_ATTENTE,
        riderPreference: preference,
        riderObjectives: objectives || '',
        notes: ''
      };
      setRiderEventSelections(prev => [...prev, newSelection]);
    }
  };

  // Fonction pour gérer la suppression
  const handleDeleteRider = (rider: Rider) => {
    console.log('🗑️ Tentative de suppression du coureur:', rider.firstName, rider.lastName, 'ID:', rider.id);
    setRiderToDelete(rider);
    setIsDeleteModalOpen(true);
  };

  // Fonction pour le tri de l'effectif
  const handleRosterSort = (field: 'name' | 'age' | 'category') => {
    if (rosterSortBy === field) {
      setRosterSortDirection(rosterSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRosterSortBy(field);
      setRosterSortDirection('asc');
    }
  };

  // Fonction pour le tri du planning
  const handlePlanningSort = (field: 'name' | 'raceDays') => {
    if (planningSortBy === field) {
      setPlanningSortDirection(planningSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPlanningSortBy(field);
      setPlanningSortDirection('asc');
    }
  };

  // Fonction pour calculer le nombre de jours de course d'un athlète depuis le début de saison
  const getRiderRaceDays = (riderId: string) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Début de saison (1er janvier de l'année en cours)
    const seasonStart = new Date(currentYear, 0, 1);
    
    // Utiliser localRaceEvents pour avoir les données les plus récentes
    const seasonEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= seasonStart && 
             eventDate <= currentDate && 
             event.selectedRiderIds?.includes(riderId);
    });
    
    // Compter les jours uniques de course (pas le nombre d'événements)
    const uniqueDays = new Set(seasonEvents.map(event => event.date)).size;
    
    console.log(`🏁 Jours de course pour ${riderId}:`, uniqueDays, 'jours uniques sur', seasonEvents.length, 'événements');
    console.log('🏁 Événements trouvés:', seasonEvents.map(e => ({ name: e.name, date: e.date })));
    
    return uniqueDays;
  };

  // Calcul des coureurs triés et filtrés pour l'effectif
  const sortedRidersForAdmin = useMemo(() => {
    // Debug: Afficher tous les coureurs et leurs données
    console.log('=== DEBUG EFFECTIF ===');
    console.log('Total coureurs:', riders.length);
    console.log('Événements locaux:', localRaceEvents.length);
    console.log('Détail des événements:', localRaceEvents.map(e => ({ 
      name: e.name, 
      date: e.date, 
      selectedRiderIds: e.selectedRiderIds?.length || 0 
    })));
    console.log('Filtres actifs:', { searchTerm, genderFilter, ageCategoryFilter, minAgeFilter, maxAgeFilter });
    
    // Recherche spécifique d'Anthony Uldry
    const anthonyRider = riders.find(rider => 
      rider.firstName?.toLowerCase().includes('anthony') && 
      rider.lastName?.toLowerCase().includes('uldry')
    );
    
    if (anthonyRider) {
      console.log('🔍 ANTHONY ULDRY TROUVÉ:', anthonyRider);
    } else {
      console.log('❌ ANTHONY ULDRY NON TROUVÉ dans la liste des coureurs');
      console.log('📋 Liste des coureurs disponibles:', riders.map(r => `${r.firstName} ${r.lastName} (${r.email})`));
    }
    
    riders.forEach((rider, index) => {
      const { age, category } = getAgeCategory(rider.birthDate);
      const isAnthony = rider.firstName?.toLowerCase().includes('anthony') && 
                       rider.lastName?.toLowerCase().includes('uldry');
      
      console.log(`Coureur ${index + 1}${isAnthony ? ' ⭐ ANTHONY' : ''}:`, {
        id: rider.id,
        nom: `${rider.firstName} ${rider.lastName}`,
        email: rider.email,
        sex: rider.sex,
        birthDate: rider.birthDate,
        age,
        category,
        matchesSearch: rider.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      rider.lastName.toLowerCase().includes(searchTerm.toLowerCase()),
        matchesGender: genderFilter === 'all' || rider.sex === genderFilter,
        matchesAge: age !== null && age >= minAgeFilter && age <= maxAgeFilter,
        matchesCategory: ageCategoryFilter === 'all' || (age !== null && category === ageCategoryFilter)
      });
    });
    
    let filtered = riders.filter(rider => {
      const matchesSearch = rider.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rider.lastName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = genderFilter === 'all' || rider.sex === genderFilter;
      
      const { age } = getAgeCategory(rider.birthDate);
      // CORRECTION: Si pas d'âge valide, on considère que ça passe le filtre d'âge
      const matchesAge = age === null || (age >= minAgeFilter && age <= maxAgeFilter);
      
      const { category } = getAgeCategory(rider.birthDate);
      // CORRECTION: Si pas de catégorie valide, on considère que ça passe le filtre de catégorie
      const matchesCategory = ageCategoryFilter === 'all' || category !== 'N/A';
      
      const levelCategory = getLevelCategory(rider);
      const matchesLevel = levelFilter === 'all' || levelCategory === levelFilter;
      
      const isAnthony = rider.firstName?.toLowerCase().includes('anthony') && 
                       rider.lastName?.toLowerCase().includes('uldry');
      
      if (isAnthony) {
        console.log('🔍 ANTHONY ULDRY - Analyse du filtrage:', {
          matchesSearch,
          matchesGender,
          matchesAge,
          matchesCategory,
          age,
          birthDate: rider.birthDate,
          sex: rider.sex,
          searchTerm,
          genderFilter,
          ageCategoryFilter,
          minAgeFilter,
          maxAgeFilter,
          'FINAL_RESULT': matchesSearch && matchesGender && matchesAge && matchesCategory
        });
      }
      
      return matchesSearch && matchesGender && matchesAge && matchesCategory && matchesLevel;
    });
    
    console.log('Coureurs filtrés:', filtered.length);
    console.log('=== FIN DEBUG ===');

    // Tri
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (rosterSortBy) {
        case 'name':
          // Tri alphabétique correct : d'abord par nom de famille, puis par prénom
          const lastNameA = (a.lastName || '').toLowerCase();
          const lastNameB = (b.lastName || '').toLowerCase();
          const firstNameA = (a.firstName || '').toLowerCase();
          const firstNameB = (b.firstName || '').toLowerCase();
          
          // Comparer d'abord les noms de famille
          if (lastNameA !== lastNameB) {
            aValue = lastNameA;
            bValue = lastNameB;
          } else {
            // Si les noms de famille sont identiques, comparer par prénom
            aValue = firstNameA;
            bValue = firstNameB;
          }
          break;
        case 'firstName':
          aValue = (a.firstName || '').toLowerCase();
          bValue = (b.firstName || '').toLowerCase();
          break;
        case 'age':
          aValue = getAgeCategory(a.birthDate).age || 0;
          bValue = getAgeCategory(b.birthDate).age || 0;
          break;
        case 'ageCategory':
          aValue = getAgeCategory(a.birthDate).category;
          bValue = getAgeCategory(b.birthDate).category;
          break;
        case 'levelCategory':
          aValue = getLevelCategory(a);
          bValue = getLevelCategory(b);
          break;
        case 'raceDays':
          const aRaceDays = localRaceEvents.filter(event => 
            event.selectedRiderIds?.includes(a.id)
          ).length;
          const bRaceDays = localRaceEvents.filter(event => 
            event.selectedRiderIds?.includes(b.id)
          ).length;
          aValue = aRaceDays;
          bValue = bRaceDays;
          break;
        default:
          return 0;
      }
      
      if (rosterSortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [riders, searchTerm, genderFilter, ageCategoryFilter, levelFilter, minAgeFilter, maxAgeFilter, rosterSortBy, rosterSortDirection]);

  // Calcul des jours de course par coureur
  const raceDaysByRider = useMemo(() => {
    const riderRaceDays = new Map<string, { raceDays: number; events: RaceEvent[] }>();
    
    riders.forEach(rider => {
      const riderEvents = riderEventSelections
        .filter(selection => selection.riderId === rider.id)
        .map(selection => raceEvents.find(event => event.id === selection.eventId))
        .filter(Boolean) as RaceEvent[];
      
      const uniqueDays = new Set(riderEvents.map(event => event.date)).size;
      
      riderRaceDays.set(rider.id, {
        raceDays: uniqueDays,
        events: riderEvents
      });
    });
    
    return riderRaceDays;
  }, [riders, raceEvents, riderEventSelections]);

  // Calcul des coureurs triés pour le planning
  const sortedRidersForPlanning = useMemo(() => {
    const ridersWithRaceDays = riders.map(rider => {
      const { raceDays, events } = raceDaysByRider.get(rider.id) || { raceDays: 0, events: [] };
      return { rider, raceDays, events };
    });

    // Tri
    ridersWithRaceDays.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (planningSortBy) {
        case 'name':
          aValue = `${a.rider.firstName} ${a.rider.lastName}`.toLowerCase();
          bValue = `${b.rider.firstName} ${b.rider.lastName}`.toLowerCase();
          break;
        case 'raceDays':
          aValue = a.raceDays;
          bValue = b.raceDays;
          break;
        default:
          return 0;
      }
      
      if (planningSortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return ridersWithRaceDays;
  }, [riders, raceDaysByRider, planningSortBy, planningSortDirection]);

  // État pour le tri de l'onglet Qualité

  // Rendu de l'onglet Effectif
  const renderRosterTab = () => (
    <div className="space-y-4">
      {/* Contrôles de recherche et filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un coureur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filtre genre */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les genres</option>
            <option value="male">Hommes</option>
            <option value="female">Femmes</option>
          </select>
          
          {/* Filtre catégorie d'âge */}
          <select
            value={ageCategoryFilter}
            onChange={(e) => setAgeCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toutes catégories</option>
            <option value="U15">U15</option>
            <option value="U17">U17</option>
            <option value="U19">U19</option>
            <option value="U23">U23</option>
            <option value="Senior">Senior</option>
            <option value="Master">Master</option>
          </select>
          
          {/* Filtre niveau de performance */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les niveaux</option>
            <option value="Pro">Pro</option>
            <option value="Elite">Elite</option>
            <option value="Open 1">Open 1</option>
            <option value="Open 2">Open 2</option>
            <option value="Open 3">Open 3</option>
            <option value="Handisport">Handisport</option>
          </select>
          
          {/* Filtre âge */}
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Âge min"
              value={minAgeFilter}
              onChange={(e) => setMinAgeFilter(Number(e.target.value))}
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Âge max"
              value={maxAgeFilter}
              onChange={(e) => setMaxAgeFilter(Number(e.target.value))}
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        
      </div>

      {/* Liste des coureurs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleRiderSort('name')}
                  title="Trier par nom de famille"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nom</span>
                    {rosterSortBy === 'name' && (
                      <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleRiderSort('firstName')}
                  title="Trier par prénom"
                >
                  <div className="flex items-center space-x-1">
                    <span>Prénom</span>
                    {rosterSortBy === 'firstName' && (
                      <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleRiderSort('age')}
                  title="Trier par âge"
                >
                  <div className="flex items-center space-x-1">
                    <span>Âge</span>
                    {rosterSortBy === 'age' && (
                      <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleRiderSort('levelCategory')}
                  title="Trier par niveau de performance"
                >
                  <div className="flex items-center space-x-1">
                    <span>Niveau</span>
                    {rosterSortBy === 'levelCategory' && (
                      <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleRiderSort('raceDays')}
                  title="Trier par nombre de jours de course"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Jours de course</span>
                    {rosterSortBy === 'raceDays' && (
                      <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRidersForAdmin.map((rider) => {
                const { category, age } = getAgeCategory(rider.birthDate);
                const levelCategory = getLevelCategory(rider);
                
                return (
                  <tr key={rider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {rider.photoUrl ? (
                          <img src={rider.photoUrl} alt={rider.firstName} className="w-8 h-8 rounded-full mr-3"/>
                        ) : (
                          <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3"/>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rider.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rider.firstName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {age !== null ? `${age} ans` : 'Âge inconnu'}
                        {age !== null && (
                          <span className="text-xs text-gray-500 ml-1">({category})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {levelCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🏁 {(() => {
                            const raceDays = getRiderRaceDays(rider.id);
                            console.log(`🏁 Affichage jours de course pour ${rider.firstName} ${rider.lastName}:`, raceDays);
                            return raceDays;
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <ActionButton 
                          onClick={() => openViewModal(rider)} 
                          variant="secondary" 
                          size="sm" 
                          icon={<EyeIcon className="w-4 h-4"/>} 
                          title="Voir"
                        >
                          <span className="sr-only">Voir</span>
                        </ActionButton>
                        <ActionButton 
                          onClick={() => openEditModal(rider)} 
                          variant="warning" 
                          size="sm" 
                          icon={<PencilIcon className="w-4 h-4"/>} 
                          title="Modifier"
                        >
                          <span className="sr-only">Modifier</span>
                        </ActionButton>
                        <ActionButton 
                          onClick={() => handleDeleteRider(rider)} 
                          variant="danger" 
                          size="sm" 
                          icon={<TrashIcon className="w-4 h-4"/>} 
                          title="Supprimer"
                        >
                          <span className="sr-only">Supprimer</span>
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Calcul des données de monitoring de groupe (au niveau du composant)
  const groupMonitoringData = useMemo(() => {
    const eventSelections = raceEvents.map(event => ({
      event,
      selectedRiders: riders.filter(rider => event.selectedRiderIds?.includes(rider.id)),
      selectedStaff: appState.staff.filter(staffMember => event.selectedStaffIds?.includes(staffMember.id))
    }));

    // Calcul des blocs de course (événements consécutifs)
    const courseBlocks = [];
    const sortedEvents = [...raceEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentBlock = [];
    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];
      
      currentBlock.push(currentEvent);
      
      // Si c'est le dernier événement ou s'il y a plus de 7 jours entre les événements
      if (!nextEvent || 
          (new Date(nextEvent.date).getTime() - new Date(currentEvent.endDate || currentEvent.date).getTime()) > 7 * 24 * 60 * 60 * 1000) {
        if (currentBlock.length > 0) {
          courseBlocks.push([...currentBlock]);
          currentBlock = [];
        }
      }
    }

    return { eventSelections, courseBlocks };
  }, [raceEvents, riders, appState.staff]);

  // Composant unifié pour la gestion des sélections et disponibilités
  const UnifiedSelectionTab = ({ 
    futureEvents, 
    riders, 
    riderEventSelections,
    planningSearchTerm, 
    setPlanningSearchTerm, 
    planningGenderFilter, 
    setPlanningGenderFilter,
    planningStatusFilter,
    setPlanningStatusFilter,
    getRiderEventStatus,
    addRiderToEvent,
    removeRiderFromEvent,
    syncSelectionsFromEvents,
    syncSelectionsToEvents,
    saveAllSelections,
    onUpdateRiderPreference
  }: {
    futureEvents: RaceEvent[];
    riders: Rider[];
    riderEventSelections: RiderEventSelection[];
    planningSearchTerm: string;
    setPlanningSearchTerm: (term: string) => void;
    planningGenderFilter: 'all' | 'male' | 'female';
    setPlanningGenderFilter: (filter: 'all' | 'male' | 'female') => void;
    planningStatusFilter: 'all' | 'selected' | 'unselected';
    setPlanningStatusFilter: (filter: 'all' | 'selected' | 'unselected') => void;
    getRiderEventStatus: (eventId: string, riderId: string) => RiderEventStatus | null;
    addRiderToEvent: (eventId: string, riderId: string, status: RiderEventStatus) => void;
    removeRiderFromEvent: (eventId: string, riderId: string) => void;
    syncSelectionsFromEvents: () => void;
    syncSelectionsToEvents: () => void;
    saveAllSelections: () => void;
    onUpdateRiderPreference?: (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => void;
  }) => {
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [editingCell, setEditingCell] = useState<{riderId: string, eventId: string} | null>(null);
    const [tempPreference, setTempPreference] = useState<RiderEventPreference | null>(null);
    const [tempObjectives, setTempObjectives] = useState<string>('');
    const [statusDropdown, setStatusDropdown] = useState<{riderId: string, eventId: string} | null>(null);
    const [sortField, setSortField] = useState<'lastName' | 'firstName' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filtrer et trier les athlètes selon les critères de recherche
    const filteredAndSortedRiders = React.useMemo(() => {
      let filtered = riders.filter(rider => {
        const matchesSearch = !planningSearchTerm || 
          rider.firstName.toLowerCase().includes(planningSearchTerm.toLowerCase()) ||
          rider.lastName.toLowerCase().includes(planningSearchTerm.toLowerCase());
        
        const matchesGender = planningGenderFilter === 'all' || 
          (planningGenderFilter === 'male' && rider.sex === Sex.MALE) ||
          (planningGenderFilter === 'female' && rider.sex === Sex.FEMALE);
        
        // Filtre par statut de sélection
        const riderEvents = futureEvents.filter(event => 
          event.selectedRiderIds?.includes(rider.id)
        );
        const matchesStatus = planningStatusFilter === 'all' ||
          (planningStatusFilter === 'selected' && riderEvents.length > 0) ||
          (planningStatusFilter === 'unselected' && riderEvents.length === 0);
        
        return matchesSearch && matchesGender && matchesStatus;
      });

      // Appliquer le tri si un champ de tri est sélectionné
      if (sortField) {
        filtered.sort((a, b) => {
          let aValue = '';
          let bValue = '';
          
          if (sortField === 'lastName') {
            aValue = (a.lastName || '').toLowerCase();
            bValue = (b.lastName || '').toLowerCase();
          } else if (sortField === 'firstName') {
            aValue = (a.firstName || '').toLowerCase();
            bValue = (b.firstName || '').toLowerCase();
          }
          
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      return filtered;
    }, [riders, planningSearchTerm, planningGenderFilter, planningStatusFilter, futureEvents, sortField, sortDirection]);

    // Obtenir les préférences d'un athlète pour un événement
    const getRiderPreference = (eventId: string, riderId: string): RiderEventPreference | null => {
      const selection = riderEventSelections.find(sel => 
        sel.eventId === eventId && sel.riderId === riderId
      );
      return selection?.riderPreference || null;
    };

    // Obtenir les objectifs d'un athlète pour un événement
    const getRiderObjectives = (eventId: string, riderId: string): string | null => {
      const selection = riderEventSelections.find(sel => 
        sel.eventId === eventId && sel.riderId === riderId
      );
      return selection?.riderObjectives || null;
    };

    // Obtenir la couleur selon la préférence
    const getPreferenceColor = (preference: RiderEventPreference | null) => {
      switch (preference) {
        case RiderEventPreference.VEUT_PARTICIPER:
          return 'bg-green-100 text-green-800 border-green-200';
        case RiderEventPreference.OBJECTIFS_SPECIFIQUES:
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case RiderEventPreference.ABSENT:
          return 'bg-red-100 text-red-800 border-red-200';
        case RiderEventPreference.NE_VEUT_PAS:
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case RiderEventPreference.EN_ATTENTE:
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-gray-50 text-gray-500 border-gray-200';
      }
    };

    // Obtenir l'icône selon la préférence
    const getPreferenceIcon = (preference: RiderEventPreference | null) => {
      switch (preference) {
        case RiderEventPreference.VEUT_PARTICIPER:
          return '✓';
        case RiderEventPreference.OBJECTIFS_SPECIFIQUES:
          return '🎯';
        case RiderEventPreference.ABSENT:
          return '❌';
        case RiderEventPreference.NE_VEUT_PAS:
          return '🚫';
        case RiderEventPreference.EN_ATTENTE:
          return '⏳';
        default:
          return '?';
      }
    };

    // Gérer le clic sur une cellule pour l'édition
    const handleCellClick = (riderId: string, eventId: string) => {
      const preference = getRiderPreference(eventId, riderId);
      const objectives = getRiderObjectives(eventId, riderId);
      
      setEditingCell({ riderId, eventId });
      setTempPreference(preference);
      setTempObjectives(objectives || '');
    };

    // Sauvegarder les modifications d'une cellule
    const handleSaveCell = async () => {
      if (!editingCell || !tempPreference) return;

      if (onUpdateRiderPreference) {
        await onUpdateRiderPreference(
          editingCell.eventId, 
          editingCell.riderId, 
          tempPreference, 
          tempObjectives || undefined
        );
      }

      setEditingCell(null);
      setTempPreference(null);
      setTempObjectives('');
    };

    // Annuler l'édition d'une cellule
    const handleCancelEdit = () => {
      setEditingCell(null);
      setTempPreference(null);
      setTempObjectives('');
    };

    // Gérer l'ajout/suppression d'un athlète à un événement
    const handleStatusChange = async (riderId: string, eventId: string, newStatus: RiderEventStatus) => {
      const currentStatus = getRiderEventStatus(eventId, riderId);
      
      if (currentStatus) {
        if (newStatus === RiderEventStatus.NON_RETENU) {
          await removeRiderFromEvent(eventId, riderId);
        } else {
          await addRiderToEvent(eventId, riderId, newStatus);
        }
      } else {
        await addRiderToEvent(eventId, riderId, newStatus);
      }
      
      // Fermer le dropdown après sélection
      setStatusDropdown(null);
    };

    // Gérer l'ouverture/fermeture du dropdown de statut
    const handleStatusDropdownToggle = (riderId: string, eventId: string) => {
      if (statusDropdown?.riderId === riderId && statusDropdown?.eventId === eventId) {
        setStatusDropdown(null);
      } else {
        setStatusDropdown({ riderId, eventId });
      }
    };

    // Fermer tous les dropdowns
    const closeAllDropdowns = () => {
      setStatusDropdown(null);
      setEditingCell(null);
    };

    // Gérer le tri des colonnes
    const handleSort = (field: 'lastName' | 'firstName') => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    // Vue calendrier compacte
    const renderCalendarView = () => {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
      const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      
      // Événements du mois sélectionné
      const monthEvents = futureEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === selectedMonth && eventDate.getFullYear() === selectedYear;
      });

      return (
        <div className="space-y-6">
          {/* Contrôles du calendrier */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear(selectedYear - 1);
                  } else {
                    setSelectedMonth(selectedMonth - 1);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xl font-semibold text-gray-800">
                {new Date(selectedYear, selectedMonth).toLocaleDateString('fr-FR', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear(selectedYear + 1);
                  } else {
                    setSelectedMonth(selectedMonth + 1);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vue Tableau
              </button>
            </div>
          </div>

          {/* Grille du calendrier */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 bg-pink-50">
              {daysOfWeek.map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 bg-pink-100">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Jours du mois */}
            <div className="grid grid-cols-7">
              {/* Jours vides du début du mois */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="h-24 border-r border-b border-gray-200 last:border-r-0 bg-gray-50"></div>
              ))}
              
              {/* Jours du mois */}
              {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                const dayNumber = dayIndex + 1;
                const currentDate = new Date(selectedYear, selectedMonth, dayNumber);
                const dayEvents = monthEvents.filter(event => 
                  new Date(event.date).getDate() === dayNumber
                );
                const isToday = currentDate.toDateString() === new Date().toDateString();
                
                return (
                  <div key={dayNumber} className={`h-24 border-r border-b border-gray-200 last:border-r-0 p-2 ${
                    isToday ? 'bg-blue-50' : 'bg-white'
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                        {dayNumber}
                      </span>
                    </div>
                    
                    {/* Événements du jour */}
                    <div className="space-y-1">
                      {dayEvents.map(event => (
                        <div key={event.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded truncate font-medium">
                          {event.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Résumé des événements du mois */}
          {monthEvents.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Événements du mois</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm text-gray-900">{event.name}</h5>
                      <span className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {event.selectedRiderIds?.length || 0} athlète(s) sélectionné(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    // Vue tableau unifiée interactive
    const renderTableView = () => {
      return (
        <div className="space-y-6">
          {/* Contrôles de la vue tableau */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">Gestion des Sélections & Disponibilités</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vue Calendrier
              </button>
            </div>
          </div>


          {/* Tableau interactif */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <th 
                      className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-blue-100 transition-colors group"
                      onClick={() => handleSort('lastName')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Nom</span>
                        {sortField === 'lastName' && (
                          <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                        {sortField !== 'lastName' && (
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-blue-100 transition-colors group"
                      onClick={() => handleSort('firstName')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Prénom</span>
                        {sortField === 'firstName' && (
                          <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                        {sortField !== 'firstName' && (
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        )}
                      </div>
                    </th>
                    {futureEvents.map(event => (
                      <th key={event.id} className="px-4 py-4 text-center text-sm font-semibold text-gray-700 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 font-medium">
                            {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </div>
                          <div className="text-sm font-semibold text-gray-800 truncate">
                            {event.name}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedRiders.map((rider, index) => (
                    <tr key={rider.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/80 transition-colors border-b border-gray-100`}>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                        {rider.lastName}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-700">
                        {rider.firstName}
                      </td>
                      {futureEvents.map(event => {
                        const preference = getRiderPreference(event.id, rider.id);
                        const status = getRiderEventStatus(event.id, rider.id);
                        const isEditing = editingCell?.riderId === rider.id && editingCell?.eventId === event.id;
                        
                        return (
                          <td key={event.id} className="px-4 py-4 text-center align-top">
                            {isEditing ? (
                              // Mode édition
                              <div className="space-y-2">
                                <select
                                  value={tempPreference || ''}
                                  onChange={(e) => setTempPreference(e.target.value as RiderEventPreference)}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="">Sélectionner préférence</option>
                                  <option value={RiderEventPreference.VEUT_PARTICIPER}>Veut participer</option>
                                  <option value={RiderEventPreference.OBJECTIFS_SPECIFIQUES}>Objectifs spécifiques</option>
                                  <option value={RiderEventPreference.ABSENT}>Absent</option>
                                  <option value={RiderEventPreference.NE_VEUT_PAS}>Ne veut pas</option>
                                  <option value={RiderEventPreference.EN_ATTENTE}>En attente</option>
                                </select>
                                <input
                                  type="text"
                                  value={tempObjectives}
                                  onChange={(e) => setTempObjectives(e.target.value)}
                                  placeholder="Objectifs..."
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                />
                                <div className="flex space-x-1">
                                  <button
                                    onClick={handleSaveCell}
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Mode affichage
                              <div className="space-y-2">
                                {/* Bouton de statut avec dropdown */}
                                <div className="relative dropdown-container">
                                  <button
                                    onClick={() => handleStatusDropdownToggle(rider.id, event.id)}
                                    className={`w-full px-3 py-2 text-xs rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                                      status === RiderEventStatus.TITULAIRE 
                                        ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200' 
                                        : status === RiderEventStatus.REMPLACANT
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                                        : status === RiderEventStatus.PRE_SELECTION
                                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                                        : status === RiderEventStatus.INDISPONIBLE
                                        ? 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                                        : status === RiderEventStatus.NON_RETENU
                                        ? 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>
                                        {status || 'Définir le statut'}
                                      </span>
                                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </button>
                                  
                                  {/* Dropdown menu */}
                                  {statusDropdown?.riderId === rider.id && statusDropdown?.eventId === event.id && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
                                      <div className="py-1">
                                        <button
                                          onClick={() => handleStatusChange(rider.id, event.id, RiderEventStatus.TITULAIRE)}
                                          className="w-full px-3 py-2 text-xs text-left hover:bg-green-50 flex items-center space-x-2 transition-colors"
                                        >
                                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                          <span>Titulaire</span>
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(rider.id, event.id, RiderEventStatus.REMPLACANT)}
                                          className="w-full px-3 py-2 text-xs text-left hover:bg-blue-50 flex items-center space-x-2 transition-colors"
                                        >
                                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                          <span>Remplaçant</span>
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(rider.id, event.id, RiderEventStatus.PRE_SELECTION)}
                                          className="w-full px-3 py-2 text-xs text-left hover:bg-yellow-50 flex items-center space-x-2 transition-colors"
                                        >
                                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                          <span>Pré-sélectionné</span>
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(rider.id, event.id, RiderEventStatus.INDISPONIBLE)}
                                          className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 flex items-center space-x-2 transition-colors"
                                        >
                                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                          <span>Indisponible</span>
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(rider.id, event.id, RiderEventStatus.NON_RETENU)}
                                          className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                                        >
                                          <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                                          <span>Non retenu</span>
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(rider.id, event.id, RiderEventStatus.ABSENT)}
                                          className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                                        >
                                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                          <span>Absent</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Préférence cliquable */}
                                {preference && (
                                  <div 
                                    onClick={() => handleCellClick(rider.id, event.id)}
                                    className="cursor-pointer hover:scale-105 transition-transform duration-200"
                                  >
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border shadow-sm hover:shadow-md ${getPreferenceColor(preference)}`}>
                                      {getPreferenceIcon(preference)} {preference}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Objectifs */}
                                {getRiderObjectives(event.id, rider.id) && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200 truncate">
                                    {getRiderObjectives(event.id, rider.id)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Légende */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Légende des statuts</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Titulaire</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Remplaçant</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span>Pré-sélectionné</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span>Indisponible</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                <span>Non retenu</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                <span>Absent</span>
              </div>
            </div>
            
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Légende des préférences</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>Veut participer</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🎯</span>
                <span>Objectifs spécifiques</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>❌</span>
                <span>Absent</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🚫</span>
                <span>Ne veut pas</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>⏳</span>
                <span>En attente</span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Effet pour fermer les dropdowns quand on clique ailleurs
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!(event.target as Element).closest('.dropdown-container')) {
          closeAllDropdowns();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div className="space-y-6">
        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={planningSearchTerm}
                onChange={(e) => setPlanningSearchTerm(e.target.value)}
                placeholder="Rechercher un athlète..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={planningGenderFilter}
              onChange={(e) => setPlanningGenderFilter(e.target.value as 'all' | 'male' | 'female')}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les athlètes</option>
              <option value="male">Hommes</option>
              <option value="female">Femmes</option>
            </select>
            
            <button
              onClick={() => {
                setPlanningSearchTerm('');
                setPlanningGenderFilter('all');
              }}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        {viewMode === 'calendar' ? renderCalendarView() : renderTableView()}
      </div>
    );
  };

  // Rendu de l'onglet Planning de Saison - Version avec monitoring de groupe
  const renderSeasonPlanningTab = () => {
    console.log('🎯 Rendu du planning - Sélections actuelles:', appState.riderEventSelections?.length || 0);
    console.log('🎯 Événements locaux:', localRaceEvents.length);
    console.log('🎯 Détail des sélections:', appState.riderEventSelections);
    console.log('🎯 Sélections locales:', localRiderEventSelections.length);
    console.log('🎯 Détail des sélections locales:', localRiderEventSelections);
    console.log('🎯 Scouts disponibles:', appState.scoutingProfiles?.length || 0);
    console.log('🎯 Détail des scouts:', appState.scoutingProfiles);
    console.log('🎯 Riders disponibles:', riders.length);
    console.log('🎯 TeamId actif:', appState.activeTeamId);
    
    // Filtrer les événements passés de l'année sélectionnée
    const pastEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventYear = eventDate.getFullYear();
      return eventDate < today && eventYear === selectedYear;
    });

    // Filtrer les événements futurs de l'année sélectionnée (pas de saison prochaine)
    const futureEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventYear = eventDate.getFullYear();
      const currentYear = today.getFullYear();
      
      // Ne prendre que les événements de l'année sélectionnée ET de l'année courante
      return eventDate >= today && eventYear === selectedYear && eventYear === currentYear;
    });

    // Fonction pour mettre à jour les préférences d'un athlète pour un événement
    const onUpdateRiderPreference = async (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => {
      console.log(`🔄 Mise à jour des préférences: ${riderId} pour ${eventId} - ${preference}`);
      
      try {
        // Trouver la sélection existante ou en créer une nouvelle
        let existingSelection = localRiderEventSelections.find(
          sel => sel.eventId === eventId && sel.riderId === riderId
        );

        if (existingSelection) {
          // Mettre à jour la sélection existante
          const updatedSelection = {
            ...existingSelection,
            riderPreference: preference,
            riderObjectives: objectives || existingSelection.riderObjectives
          };

          // Sauvegarder dans Firebase
          if (appState.activeTeamId) {
            await updateData(appState.activeTeamId, "riderEventSelections", updatedSelection);
          }

          // Mettre à jour l'état local
          const updatedSelections = localRiderEventSelections.map(sel => 
            sel.id === existingSelection!.id ? updatedSelection : sel
          );
          setLocalRiderEventSelections(updatedSelections);
          setRiderEventSelections(updatedSelections);
        } else {
          // Créer une nouvelle sélection
          const newSelection: RiderEventSelection = {
            id: `${eventId}_${riderId}_${Date.now()}`,
            eventId: eventId,
            riderId: riderId,
            status: RiderEventStatus.EN_ATTENTE,
            riderPreference: preference,
            riderObjectives: objectives,
            notes: undefined
          };

          // Sauvegarder dans Firebase
          if (appState.activeTeamId) {
            const savedId = await saveData(appState.activeTeamId, "riderEventSelections", newSelection);
            newSelection.id = savedId;
          }

          // Mettre à jour l'état local
          const updatedSelections = [...localRiderEventSelections, newSelection];
          setLocalRiderEventSelections(updatedSelections);
          setRiderEventSelections(updatedSelections);
        }

        console.log('✅ Préférences mises à jour avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour des préférences:', error);
        alert('Erreur lors de la sauvegarde des préférences. Veuillez réessayer.');
      }
    };

    // Fonction pour ajouter automatiquement un athlète à un événement avec un statut
    const addRiderToEvent = async (eventId: string, riderId: string, status: RiderEventStatus = RiderEventStatus.TITULAIRE) => {
      console.log(`🔄 Tentative d'ajout: ${riderId} à ${eventId} avec statut ${status}`);
      try {
        // Vérifier si l'athlète est déjà sélectionné pour cet événement
        const existingSelection = localRiderEventSelections.find(
          sel => sel.eventId === eventId && sel.riderId === riderId
        );
        
        if (existingSelection) {
          console.log(`📝 Sélection existante trouvée, mise à jour du statut vers ${status}`);
          // Mettre à jour le statut existant au lieu de créer un nouveau
          await updateRiderEventStatus(eventId, riderId, status);
          return;
        }

        const newSelection: RiderEventSelection = {
          id: `${eventId}_${riderId}_${Date.now()}`,
          eventId: eventId,
          riderId: riderId,
          status: status,
          riderPreference: undefined,
          riderObjectives: undefined,
          notes: undefined
        };

        // Sauvegarder dans Firebase si on a un teamId
        console.log('🔍 TeamId actif:', appState.activeTeamId);
        if (appState.activeTeamId) {
          try {
            const savedId = await saveData(
              appState.activeTeamId,
              "riderEventSelections",
              newSelection
            );
            newSelection.id = savedId;
            console.log('✅ Sélection d\'athlète sauvegardée dans Firebase avec l\'ID:', savedId);
          } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde Firebase:', error);
            alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
            return;
          }
        } else {
          console.warn('⚠️ Aucun teamId actif, sauvegarde locale uniquement');
        }

        // Mettre à jour l'état local des sélections
        const updatedSelections = [...localRiderEventSelections, newSelection];
        setLocalRiderEventSelections(updatedSelections);
        console.log('✅ État local des sélections mis à jour:', updatedSelections.length);
        
        // Mettre à jour l'état global des sélections
        setRiderEventSelections(updatedSelections);
        console.log('✅ État global des sélections mis à jour:', updatedSelections.length);
        // Mettre à jour l'événement seulement si c'est un titulaire
        if (status === RiderEventStatus.TITULAIRE) {
          const event = localRaceEvents.find(e => e.id === eventId);
          if (event) {
            const updatedEvent = {
              ...event,
              selectedRiderIds: [...(event.selectedRiderIds || []), riderId]
            };
            // Mettre à jour l'événement dans la liste
            const updatedEvents = localRaceEvents.map(e => e.id === eventId ? updatedEvent : e);
            // Forcer le re-render en mettant à jour l'état local
            setLocalRaceEvents(updatedEvents);
            
            // Synchroniser avec l'état global des événements
            setRaceEvents(updatedEvents);
            
            console.log('🏁 Événement mis à jour avec titulaire:', {
              eventName: event.name,
              riderId: riderId,
              selectedRiderIds: updatedEvent.selectedRiderIds
            });
          }
        }

        console.log(`✅ Athlète ${riderId} ajouté à l'événement ${eventId} avec le statut ${status}`);
        console.log('📊 État des sélections après ajout:', appState.riderEventSelections?.length || 0);
      } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de l\'athlète:', error);
        alert('Erreur lors de l\'ajout de l\'athlète. Veuillez réessayer.');
      }
    };

    // Fonction pour changer le statut d'un athlète pour un événement
    const updateRiderEventStatus = async (eventId: string, riderId: string, newStatus: RiderEventStatus) => {
      try {
        const existingSelection = appState.riderEventSelections.find(
          sel => sel.eventId === eventId && sel.riderId === riderId
        );

        if (existingSelection) {
          const updatedSelection = { ...existingSelection, status: newStatus };

                  // Sauvegarder dans Firebase si on a un teamId
        console.log('🔍 TeamId actif pour mise à jour:', appState.activeTeamId);
        if (appState.activeTeamId) {
          try {
            await saveData(
              appState.activeTeamId,
              "riderEventSelections",
              updatedSelection
            );
            console.log('✅ Statut de sélection mis à jour dans Firebase');
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour Firebase:', error);
            alert('Erreur lors de la mise à jour. Veuillez réessayer.');
            return;
          }
        } else {
          console.warn('⚠️ Aucun teamId actif, sauvegarde locale uniquement');
        }

          // Mettre à jour l'état local des sélections
          const updatedSelections = localRiderEventSelections.map(sel =>
            sel.id === existingSelection.id ? updatedSelection : sel
          );
          setLocalRiderEventSelections(updatedSelections);
          console.log('✅ État local des sélections mis à jour après modification:', updatedSelections.length);
          
          // Mettre à jour l'état global des sélections si disponible
          if (true) {
            setRiderEventSelections(updatedSelections);
          } else {
            // Forcer la mise à jour en modifiant directement l'objet appState
            if (appState.riderEventSelections) {
              appState.riderEventSelections.length = 0;
              appState.riderEventSelections.push(...updatedSelections);
              console.log('✅ État global forcé mis à jour après modification:', appState.riderEventSelections.length);
            }
          }

          // Mettre à jour l'événement selon le nouveau statut
          const event = localRaceEvents.find(e => e.id === eventId);
          if (event) {
            const isCurrentlyInEvent = event.selectedRiderIds?.includes(riderId);
            const shouldBeInEvent = newStatus === RiderEventStatus.TITULAIRE;
            
            if (shouldBeInEvent && !isCurrentlyInEvent) {
              // Ajouter à l'événement si devient titulaire
              const updatedEvent = {
                ...event,
                selectedRiderIds: [...(event.selectedRiderIds || []), riderId]
              };
              const updatedEvents = localRaceEvents.map(e => e.id === eventId ? updatedEvent : e);
              setLocalRaceEvents(updatedEvents);
              
              // Synchroniser avec l'état global des événements
              if (true) {
                setRaceEvents(updatedEvents);
              }
              
              console.log('🏁 Événement mis à jour après ajout (statut):', {
                eventName: event.name,
                riderId: riderId,
                selectedRiderIds: updatedEvent.selectedRiderIds
              });
            } else if (!shouldBeInEvent && isCurrentlyInEvent) {
              // Retirer de l'événement si n'est plus titulaire
              const updatedEvent = {
                ...event,
                selectedRiderIds: (event.selectedRiderIds || []).filter(id => id !== riderId)
              };
              const updatedEvents = localRaceEvents.map(e => e.id === eventId ? updatedEvent : e);
              setLocalRaceEvents(updatedEvents);
              
              // Synchroniser avec l'état global des événements
              if (true) {
                setRaceEvents(updatedEvents);
              }
              
              console.log('🏁 Événement mis à jour après retrait (statut):', {
                eventName: event.name,
                riderId: riderId,
                selectedRiderIds: updatedEvent.selectedRiderIds
              });
            }
          }

          console.log(`✅ Statut de l'athlète ${riderId} mis à jour vers ${newStatus}`);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du statut:', error);
        alert('Erreur lors de la mise à jour du statut. Veuillez réessayer.');
      }
    };

    // Fonction pour synchroniser les sélections depuis les événements vers le planning
    const syncSelectionsFromEvents = () => {
      console.log('🔄 Synchronisation des sélections depuis les événements...');
      
      const newSelections: RiderEventSelection[] = [];
      
      // Parcourir tous les événements
      localRaceEvents.forEach(event => {
        // Ajouter les titulaires (ceux dans selectedRiderIds)
        if (event.selectedRiderIds) {
          event.selectedRiderIds.forEach(riderId => {
            // Vérifier si cette sélection n'existe pas déjà
            const existingSelection = localRiderEventSelections.find(
              sel => sel.eventId === event.id && sel.riderId === riderId
            );
            
            if (!existingSelection) {
              newSelections.push({
                id: `${event.id}_${riderId}_${Date.now()}`,
                eventId: event.id,
                riderId: riderId,
                status: RiderEventStatus.TITULAIRE,
                riderPreference: undefined,
                riderObjectives: undefined,
                notes: undefined
              });
            }
          });
        }
      });
      
      if (newSelections.length > 0) {
        console.log('✅ Nouvelles sélections synchronisées:', newSelections.length);
        const updatedSelections = [...localRiderEventSelections, ...newSelections];
        setLocalRiderEventSelections(updatedSelections);
        
        // Mettre à jour l'état global
        if (true) {
          setRiderEventSelections(updatedSelections);
        } else if (appState.riderEventSelections) {
          appState.riderEventSelections.length = 0;
          appState.riderEventSelections.push(...updatedSelections);
        }
      }
    };

    // Fonction pour synchroniser les sélections depuis le planning vers les événements
    const syncSelectionsToEvents = () => {
      console.log('🔄 Synchronisation des sélections vers les événements...');
      
      const updatedEvents = localRaceEvents.map(event => {
        // Récupérer tous les titulaires pour cet événement
        const titulaires = localRiderEventSelections
          .filter(sel => sel.eventId === event.id && sel.status === RiderEventStatus.TITULAIRE)
          .map(sel => sel.riderId);
        
        return {
          ...event,
          selectedRiderIds: titulaires
        };
      });
      
      setLocalRaceEvents(updatedEvents);
      console.log('✅ Événements mis à jour avec les sélections du planning');
    };

    // Fonction pour sauvegarder toutes les sélections
    const saveAllSelections = async () => {
      try {
        console.log('💾 Sauvegarde de toutes les sélections...');
        
        if (!appState.activeTeamId) {
          alert('Aucun teamId actif. Impossible de sauvegarder.');
          return;
        }

        let savedCount = 0;
        let errorCount = 0;

        for (const selection of localRiderEventSelections) {
          try {
            await saveData(
              appState.activeTeamId,
              "riderEventSelections",
              selection
            );
            savedCount++;
          } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la sélection:', selection.id, error);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          alert(`✅ Toutes les sélections ont été sauvegardées (${savedCount} sélections)`);
        } else {
          alert(`⚠️ Sauvegarde partielle: ${savedCount} réussies, ${errorCount} échecs`);
        }

        console.log(`💾 Sauvegarde terminée: ${savedCount} réussies, ${errorCount} échecs`);
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde globale:', error);
        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
    };

    // Fonction pour retirer un athlète d'un événement
    const removeRiderFromEvent = async (eventId: string, riderId: string) => {
      console.log(`🗑️ Tentative de retrait: ${riderId} de ${eventId}`);
      console.log('🔍 Sélections locales actuelles:', localRiderEventSelections.length);
      console.log('🔍 Détail des sélections:', localRiderEventSelections);
      try {
        const existingSelection = localRiderEventSelections.find(
          sel => sel.eventId === eventId && sel.riderId === riderId
        );
        console.log('🔍 Sélection existante trouvée:', existingSelection);

        if (existingSelection) {
          // Supprimer de Firebase si on a un teamId
          console.log('🔍 TeamId actif pour suppression:', appState.activeTeamId);
          if (appState.activeTeamId) {
            try {
              await deleteData(
                appState.activeTeamId,
                "riderEventSelections",
                existingSelection.id
              );
              console.log('✅ Sélection d\'athlète supprimée de Firebase');
            } catch (error) {
              console.error('❌ Erreur lors de la suppression Firebase:', error);
              alert('Erreur lors de la suppression. Veuillez réessayer.');
              return;
            }
          } else {
            console.warn('⚠️ Aucun teamId actif, suppression locale uniquement');
          }

          // Mettre à jour l'état local des sélections
          const updatedSelections = localRiderEventSelections.filter(
            sel => sel.id !== existingSelection.id
          );
          setLocalRiderEventSelections(updatedSelections);
          console.log('✅ État local des sélections mis à jour après suppression:', updatedSelections.length);
          
          // Mettre à jour l'état global des sélections si disponible
          if (true) {
            setRiderEventSelections(updatedSelections);
          } else {
            // Forcer la mise à jour en modifiant directement l'objet appState
            if (appState.riderEventSelections) {
              appState.riderEventSelections.length = 0;
              appState.riderEventSelections.push(...updatedSelections);
              console.log('✅ État global forcé mis à jour après suppression:', appState.riderEventSelections.length);
            }
          }

          // Mettre à jour l'événement en retirant l'athlète seulement s'il était titulaire
          if (existingSelection.status === RiderEventStatus.TITULAIRE) {
            const event = localRaceEvents.find(e => e.id === eventId);
            if (event) {
              const updatedEvent = {
                ...event,
                selectedRiderIds: (event.selectedRiderIds || []).filter(id => id !== riderId)
              };
              // Mettre à jour l'événement dans la liste
              const updatedEvents = localRaceEvents.map(e => e.id === eventId ? updatedEvent : e);
              // Forcer le re-render en mettant à jour l'état local
              setLocalRaceEvents(updatedEvents);
              
              // Synchroniser avec l'état global des événements
              if (true) {
                setRaceEvents(updatedEvents);
              }
              
              console.log('🏁 Événement mis à jour après retrait:', {
                eventName: event.name,
                riderId: riderId,
                selectedRiderIds: updatedEvent.selectedRiderIds
              });
            }
          }

          console.log(`✅ Athlète ${riderId} retiré de l'événement ${eventId}`);
          console.log('📊 État des sélections après retrait:', appState.riderEventSelections?.length || 0);
        }
      } catch (error) {
        console.error('❌ Erreur lors du retrait de l\'athlète:', error);
        alert('Erreur lors du retrait de l\'athlète. Veuillez réessayer.');
      }
    };

    // Fonction pour obtenir le statut d'un athlète pour un événement
    const getRiderEventStatus = (eventId: string, riderId: string): RiderEventStatus | null => {
      const selection = localRiderEventSelections.find(
        sel => sel.eventId === eventId && sel.riderId === riderId
      );
      console.log(`🔍 getRiderEventStatus(${eventId}, ${riderId}):`, selection ? selection.status : 'null');
      return selection ? selection.status : null;
    };

    return (
      <div className="space-y-8">
        {/* En-tête du centre de pilotage */}
        <div className="text-center">
          <h3 className="text-3xl font-light text-gray-800 mb-2">Centre de Pilotage Saison</h3>
          <p className="text-gray-600">Gestion stratégique des sélections et calendriers</p>
        </div>

        {/* Onglets de navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActivePlanningTab('statistics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activePlanningTab === 'statistics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                  <span>Monitoring du Groupe</span>
                </div>
              </button>
              <button
                onClick={() => setActivePlanningTab('unified')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activePlanningTab === 'unified'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>Gestion des Sélections & Disponibilités</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {activePlanningTab === 'statistics' ? (
              <StatisticsTab 
                futureEvents={futureEvents}
                pastEvents={pastEvents}
                riders={riders}
                localRaceEvents={localRaceEvents}
                getRiderEventStatus={getRiderEventStatus}
              />
            ) : (
              <UnifiedSelectionTab 
                futureEvents={futureEvents}
                riders={riders}
                riderEventSelections={localRiderEventSelections}
                planningSearchTerm={planningSearchTerm}
                setPlanningSearchTerm={setPlanningSearchTerm}
                planningGenderFilter={planningGenderFilter}
                setPlanningGenderFilter={setPlanningGenderFilter}
                planningStatusFilter={planningStatusFilter}
                setPlanningStatusFilter={setPlanningStatusFilter}
                getRiderEventStatus={getRiderEventStatus}
                addRiderToEvent={addRiderToEvent}
                removeRiderFromEvent={removeRiderFromEvent}
                syncSelectionsFromEvents={syncSelectionsFromEvents}
                syncSelectionsToEvents={syncSelectionsToEvents}
                saveAllSelections={saveAllSelections}
                onUpdateRiderPreference={onUpdateRiderPreference}
              />
            )}
      </div>
            </div>

    </div>
  );
  };

  // Algorithme de profilage Coggan Expert - Note générale = moyenne simple de toutes les données
    const calculateCogganProfileScore = (rider: any) => {
    // Vérifier si c'est un scout
    if (rider.isScout) {
      console.log('🔍 Calcul des scores pour scout:', rider.firstName, rider.lastName);
      // Utiliser les données de scouting
      const scoutingProfile = appState.scoutingProfiles?.find(s => s.id === rider.id);
      console.log('🔍 Profil de scouting trouvé:', scoutingProfile);
      if (scoutingProfile) {
        // Utiliser la même fonction que dans la section scouting pour avoir les mêmes notes
        const calculatedCharacteristics = calculateRiderCharacteristics({
          powerProfileFresh: scoutingProfile.powerProfileFresh,
          powerProfile15KJ: scoutingProfile.powerProfile15KJ,
          powerProfile30KJ: scoutingProfile.powerProfile30KJ,
          powerProfile45KJ: scoutingProfile.powerProfile45KJ,
          weightKg: scoutingProfile.weightKg,
          sex: scoutingProfile.sex,
          qualitativeProfile: scoutingProfile.qualitativeProfile
        });

        console.log('🔍 Caractéristiques calculées pour scout:', calculatedCharacteristics);

        // Mapper les caractéristiques calculées vers le format attendu
        return {
          generalScore: calculatedCharacteristics.generalPerformanceScore,
          sprintScore: calculatedCharacteristics.charSprint,
          montagneScore: calculatedCharacteristics.charClimbing,
          puncheurScore: calculatedCharacteristics.charPuncher,
          rouleurScore: calculatedCharacteristics.charRouleur,
          resistanceScore: calculatedCharacteristics.fatigueResistanceScore,
          automaticScores: {
            power1s: 0, power5s: 0, power30s: 0, power1min: 0, power3min: 0,
            power5min: 0, power12min: 0, power20min: 0, criticalPower: 0
          },
          pprNotes: { general: 0, sprint: 0, climbing: 0, puncher: 0, rouleur: 0, fatigue: 0 },
          powerProfile: {
            power1s: 0, power5s: 0, power30s: 0, power1min: 0, power3min: 0,
            power5min: 0, power12min: 0, power20min: 0, criticalPower: 0
          },
          isHybrid: false
        };
      }
    }
    
    // Logique normale pour les riders
    const powerProfile = (rider as any).powerProfileFresh || {};
    const weight = (rider as any).weightKg || 70; // Poids par défaut si non défini
    
    // Récupération des notes du profil de performance (PPR) si disponibles
    const pprNotes = {
      sprint: (rider as any).charSprint || 0,
      anaerobic: (rider as any).charAnaerobic || 0,
      puncher: (rider as any).charPuncher || 0,
      climbing: (rider as any).charClimbing || 0,
      rouleur: (rider as any).charRouleur || 0,
      general: (rider as any).generalPerformanceScore || 0,
      fatigue: (rider as any).fatigueResistanceScore || 0
    };
    
    // Calcul des puissances relatives (W/kg) pour chaque durée
    const power1s = (powerProfile.power1s || 0) / weight;
    const power5s = (powerProfile.power5s || 0) / weight;
    const power30s = (powerProfile.power30s || 0) / weight;
    const power1min = (powerProfile.power1min || 0) / weight;
    const power3min = (powerProfile.power3min || 0) / weight;
    const power5min = (powerProfile.power5min || 0) / weight;
    const power12min = (powerProfile.power12min || 0) / weight;
    const power20min = (powerProfile.power20min || 0) / weight;
    const criticalPower = (powerProfile.criticalPower || 0) / weight;
    
    // Références Coggan pour un athlète "ultime" (100/100) - Calibrées sur l'échelle Elite/Hero
    const cogganUltimate = {
      power1s: 19.42,   // 19.42 W/kg - Sprint ultime (Elite/Hero)
      power5s: 19.42,   // 19.42 W/kg - Anaérobie ultime (Elite/Hero)
      power30s: 13.69,  // 13.69 W/kg - Puissance critique ultime (Pro)
      power1min: 8.92,  // 8.92 W/kg - Endurance anaérobie ultime (Elite/Hero)
      power3min: 7.0,   // 7.0 W/kg - Seuil anaérobie ultime
      power5min: 6.35,  // 6.35 W/kg - Seuil fonctionnel ultime (Elite/Hero)
      power12min: 5.88, // 5.88 W/kg - FTP ultime (Elite/Hero)
      power20min: 5.88, // 5.88 W/kg - Endurance critique ultime (Elite/Hero)
      criticalPower: 5.35 // 5.35 W/kg - CP ultime (Elite/Hero)
    };
    
    // Références de résistance basées sur les données physiologiques réelles
    const resistanceReferences = {
      // Niveaux de performance par durée (en % de déficit par rapport à l'élite)
      elite: {
        power20min: -3,      // -3% (97% de l'élite)
        criticalPower: -2    // -2% (98% de l'élite)
      },
      amateur: {
        power20min: -6,      // -6% (94% de l'élite)
        criticalPower: -5    // -5% (95% de l'élite)
      },
      beginner: {
        power20min: -12,     // -12% (88% de l'élite)
        criticalPower: -10   // -10% (90% de l'élite)
      }
    };
    
    // Références pour les watts bruts (sprint/rouleur) - Calibrées sur l'échelle Elite/Hero
    const cogganUltimateRaw = {
      power1s: 1359,    // 1359W - Sprint ultime (70kg × 19.42W/kg)
      power5s: 1359,    // 1359W - Anaérobie ultime
      power30s: 958,    // 958W - Puissance critique ultime
      power1min: 624,   // 624W - Endurance anaérobie ultime
      power3min: 490,   // 490W - Seuil anaérobie ultime
      power5min: 445,   // 445W - Seuil fonctionnel ultime
      power12min: 412,  // 412W - FTP ultime
      power20min: 412,  // 412W - Endurance critique ultime
      criticalPower: 375 // 375W - CP ultime
    };
    
    // Calcul des scores par durée (0-100) - Calibré pour correspondre à l'échelle Elite/Hero
    const getDurationScore = (actual: number, ultimate: number, isFatigueData: boolean = false) => {
      if (actual >= ultimate) return 100;
      
      // Données de fatigue (20min et CP) ont un bonus de 10%
      const fatigueBonus = isFatigueData ? 1.1 : 1.0;
      
      // Notation calibrée : 70% de la puissance ultime = 70 points (pour correspondre à l'échelle Elite/Hero)
      const score = Math.max(0, Math.round((actual / ultimate) * 70 * fatigueBonus));
      return Math.min(100, score); // Limiter à 100
    };
    
    // Calcul des scores automatiques basés sur les données de puissance
    const automaticScores = {
      power1s: getDurationScore(power1s, cogganUltimate.power1s),
      power5s: getDurationScore(power5s, cogganUltimate.power5s),
      power30s: getDurationScore(power30s, cogganUltimate.power30s),
      power1min: getDurationScore(power1min, cogganUltimate.power1min),
      power3min: getDurationScore(power3min, cogganUltimate.power3min),
      power5min: getDurationScore(power5min, cogganUltimate.power5min),
      power12min: getDurationScore(power12min, cogganUltimate.power12min),
      power20min: getDurationScore(power20min, cogganUltimate.power20min),
      criticalPower: getDurationScore(criticalPower, cogganUltimate.criticalPower)
    };
    
    // Fonction pour utiliser les notes PPR si disponibles, sinon les scores automatiques
    const getScore = (pprScore: number, automaticScore: number) => {
      // Si une note PPR existe, l'utiliser directement
      if (pprScore > 0) return pprScore;
      
      // Sinon utiliser le score automatique
      return automaticScore;
    };
    
    // Calcul des scores : PPR prioritaire, sinon automatique
    const sprintScore = getScore(pprNotes.sprint, 
      Math.round((automaticScores.power1s + automaticScores.power5s) / 2));
    
    const montagneScore = getScore(pprNotes.climbing, 
      Math.round((automaticScores.power5min + automaticScores.power12min + automaticScores.power20min) / 3));
    
    const puncheurScore = getScore(pprNotes.puncher, 
      Math.round((automaticScores.power30s + automaticScores.power1min + automaticScores.power3min) / 3));
    
    const rouleurScore = getScore(pprNotes.rouleur, 
      Math.round((automaticScores.power12min + automaticScores.power20min + automaticScores.criticalPower) / 3));
    
    // Calcul optimisé de la note de résistance basé sur les données physiologiques
    const calculateResistanceScore = () => {
      // Si note PPR fatigue disponible, l'utiliser directement
      if (pprNotes.fatigue > 0) {
        return pprNotes.fatigue;
      }
      
      // Calcul basé sur les données de puissance et références physiologiques
      const power20minWkg = power20min;
      const criticalPowerWkg = criticalPower;
      
      if (!power20minWkg && !criticalPowerWkg) {
        return 0; // Pas de données de résistance
      }
      
      // Calcul du score de résistance basé sur la performance relative
      let resistanceScore = 0;
      let dataPoints = 0;
      
      if (power20minWkg) {
        // Score basé sur 20min (FTP) - 60% du score total
        const power20minRatio = power20minWkg / cogganUltimate.power20min;
        const power20minScore = Math.round(power20minRatio * 100);
        resistanceScore += power20minScore * 0.6;
        dataPoints++;
      }
      
      if (criticalPowerWkg) {
        // Score basé sur CP - 40% du score total
        const criticalPowerRatio = criticalPowerWkg / cogganUltimate.criticalPower;
        const criticalPowerScore = Math.round(criticalPowerRatio * 100);
        resistanceScore += criticalPowerScore * 0.4;
        dataPoints++;
      }
      
      // Normalisation si une seule donnée disponible
      if (dataPoints === 1) {
        resistanceScore = Math.round(resistanceScore / (dataPoints === 1 ? 0.6 : 0.4));
      }
      
      // Bonus de résistance basé sur la cohérence des données
      if (dataPoints === 2) {
        const consistencyBonus = Math.abs(power20minWkg - criticalPowerWkg) < 0.5 ? 5 : 0;
        resistanceScore += consistencyBonus;
      }
      
      // Bonus pour les athlètes avec une excellente résistance (données cohérentes et élevées)
      if (resistanceScore >= 80 && dataPoints === 2) {
        resistanceScore += 3; // Bonus élite
      }
      
      return Math.min(100, Math.max(0, resistanceScore));
    };
    
    const resistanceScore = calculateResistanceScore();
    
    // Note générale : PPR si disponible, sinon moyenne automatique
    const automaticGeneralScore = Math.round(
      Object.values(automaticScores).reduce((sum, score) => sum + score, 0) / Object.values(automaticScores).length
    );
    
    const generalScore = getScore(pprNotes.general, automaticGeneralScore);
    
    return {
      generalScore,
      sprintScore,
      montagneScore,
      puncheurScore,
      rouleurScore,
      resistanceScore,
      automaticScores, // Scores calculés automatiquement
      pprNotes,        // Notes du profil de performance
      powerProfile: {
        power1s, power5s, power30s, power1min, power3min, 
        power5min, power12min, power20min, criticalPower
      },
      isHybrid: pprNotes.general > 0 // Indicateur si le profil utilise des notes PPR
    };
  };

  // Rendu de l'onglet Qualité d'Effectif
  const renderQualityTab = () => {

    return (
      <div className="space-y-6">
        {/* Métriques globales simplifiées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg shadow-lg text-white">
            <div className="text-center">
              <h4 className="text-sm font-medium opacity-90">Total Effectif</h4>
              <p className="text-3xl font-bold">{riders.length}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg shadow-lg text-white">
            <div className="text-center">
              <h4 className="text-sm font-medium opacity-90">Moyenne Score</h4>
              <p className="text-3xl font-bold">
                {Math.round(riders.reduce((sum, r) => {
                  const profile = calculateCogganProfileScore(r);
                  return sum + profile.generalScore;
                }, 0) / riders.length)}
              </p>
            </div>
          </div>
        </div>

        {/* Tableau de pilotage style Pro Cycling Manager */}
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700">
                      <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Qualité d'Effectif
              </h3>
                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeScouts}
                    onChange={(e) => setIncludeScouts(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Inclure les scouts</span>
                </label>
              </div>
            </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('name')}
                    title="Trier par nom"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Coureur</span>
                      {qualitySortField === 'name' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('age')}
                    title="Trier par âge"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Âge</span>
                      {qualitySortField === 'age' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('general')}
                    title="Trier par score général"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>MOY</span>
                      {qualitySortField === 'general' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('sprint')}
                    title="Trier par score sprint"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>SPR</span>
                      {qualitySortField === 'sprint' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('climbing')}
                    title="Trier par score montagne"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>MON</span>
                      {qualitySortField === 'climbing' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('puncher')}
                    title="Trier par score puncher"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>PUN</span>
                      {qualitySortField === 'puncher' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('rouleur')}
                    title="Trier par score rouleur"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>ROU</span>
                      {qualitySortField === 'rouleur' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleQualitySort('fatigue')}
                    title="Trier par score résistance"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>RES</span>
                      {qualitySortField === 'fatigue' && (
                        <svg className={`w-3 h-3 transition-transform ${qualitySortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {getSortedRidersForQuality().map((rider) => {
                  const { category, age } = getAgeCategory(rider.birthDate);
                  const levelCategory = getLevelCategory(rider);
                  const cogganProfile = calculateCogganProfileScore(rider);
                  
                  return (
                    <tr key={rider.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {rider.photoUrl ? (
                            <img src={rider.photoUrl} alt={rider.firstName} className="w-10 h-10 rounded-full mr-4"/>
                          ) : (
                            <UserCircleIcon className="w-10 h-10 text-gray-400 mr-4"/>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">{rider.firstName} {rider.lastName}</span>
                              {(rider as any).isScout && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  SCOUT
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">{category} / {levelCategory}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {age !== null ? `${age} ans` : 'Âge inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            cogganProfile.generalScore >= 70 ? 'text-green-400' :
                            cogganProfile.generalScore >= 50 ? 'text-blue-400' :
                            cogganProfile.generalScore >= 30 ? 'text-yellow-400' :
                            cogganProfile.generalScore >= 20 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {cogganProfile.generalScore}
                          </div>

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            cogganProfile.sprintScore >= 70 ? 'text-green-400' :
                            cogganProfile.sprintScore >= 50 ? 'text-blue-400' :
                            cogganProfile.sprintScore >= 30 ? 'text-yellow-400' :
                            cogganProfile.sprintScore >= 20 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {cogganProfile.sprintScore}
                          </div>

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            cogganProfile.montagneScore >= 70 ? 'text-green-400' :
                            cogganProfile.montagneScore >= 50 ? 'text-blue-400' :
                            cogganProfile.montagneScore >= 30 ? 'text-yellow-400' :
                            cogganProfile.montagneScore >= 20 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {cogganProfile.montagneScore}
                          </div>

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            cogganProfile.puncheurScore >= 70 ? 'text-green-400' :
                            cogganProfile.puncheurScore >= 50 ? 'text-blue-400' :
                            cogganProfile.puncheurScore >= 30 ? 'text-yellow-400' :
                            cogganProfile.puncheurScore >= 20 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {cogganProfile.puncheurScore}
                          </div>

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            cogganProfile.rouleurScore >= 70 ? 'text-green-400' :
                            cogganProfile.rouleurScore >= 50 ? 'text-blue-400' :
                            cogganProfile.rouleurScore >= 30 ? 'text-yellow-400' :
                            cogganProfile.rouleurScore >= 20 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {cogganProfile.rouleurScore}
                          </div>

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            cogganProfile.resistanceScore >= 70 ? 'text-green-400' :
                            cogganProfile.resistanceScore >= 50 ? 'text-blue-400' :
                            cogganProfile.resistanceScore >= 30 ? 'text-yellow-400' :
                            cogganProfile.resistanceScore >= 20 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {cogganProfile.resistanceScore}
                          </div>

                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <ActionButton 
                            onClick={() => openViewModal(rider)} 
                            variant="secondary" 
                            size="sm" 
                            icon={<EyeIcon className="w-4 h-4"/>} 
                            title="Voir"
                          >
                            <span className="sr-only">Voir</span>
                          </ActionButton>
                          <ActionButton 
                            onClick={() => openEditModal(rider)} 
                            variant="warning" 
                            size="sm" 
                            icon={<PencilIcon className="w-4 h-4"/>} 
                            title="Modifier"
                          >
                            <span className="sr-only">Modifier</span>
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    );
  };

  // Fonction de fusion des profils par email
  const mergeDuplicateProfiles = () => {
    const emailGroups = new Map<string, Rider[]>();
    
    // Grouper les coureurs par email
    riders.forEach(rider => {
      if (rider.email) {
        if (!emailGroups.has(rider.email)) {
          emailGroups.set(rider.email, []);
        }
        emailGroups.get(rider.email)!.push(rider);
      }
    });
    
    // Trouver les groupes avec plusieurs profils
    const duplicates = Array.from(emailGroups.entries())
      .filter(([email, profiles]) => profiles.length > 1)
      .map(([email, profiles]) => ({ email, profiles }));
    
    if (duplicates.length === 0) {
      alert("Aucun profil en double trouvé !");
      return;
    }
    
    console.log("Profils en double trouvés:", duplicates);
    
    // Pour chaque groupe de doublons, garder le profil le plus complet
    duplicates.forEach(({ email, profiles }) => {
      // Trier par "complétude" (nombre de propriétés non vides)
      const sortedProfiles = profiles.sort((a, b) => {
        const aCompleteness = Object.values(a).filter(v => v !== undefined && v !== null && v !== '').length;
        const bCompleteness = Object.values(b).filter(v => v !== undefined && v !== null && v !== '').length;
        return bCompleteness - aCompleteness; // Plus complet en premier
      });
      
      const primaryProfile = sortedProfiles[0];
      const duplicateProfiles = sortedProfiles.slice(1);
      
      console.log(`Fusion du profil principal ${primaryProfile.firstName} ${primaryProfile.lastName} avec:`, duplicateProfiles.map(p => `${p.firstName} ${p.lastName}`));
      
      // Ici vous pourriez implémenter la logique de fusion dans Firebase
      // Pour l'instant, on affiche juste les informations
    });
    
    alert(`${duplicates.length} groupe(s) de profils en double trouvé(s). Vérifiez la console pour les détails.`);
  };

  return (
    <SectionWrapper 
      title="Annuaire de l'Equipe"
      actionButton={
        <div className="flex space-x-2">
          <ActionButton onClick={mergeDuplicateProfiles} variant="secondary" icon={<UserGroupIcon className="w-5 h-5"/>}>
            Fusionner Doublons
          </ActionButton>
          <ActionButton onClick={openAddRiderModal} icon={<PlusCircleIcon className="w-5 h-5"/>}>
            Ajouter Coureur
          </ActionButton>
        </div>
      }
    >
      <div className="mb-2 border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
          <button 
            onClick={() => setActiveTab('roster')} 
            className={
              activeTab === 'roster' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Effectif
          </button>
          <button 
            onClick={() => setActiveTab('seasonPlanning')} 
            className={
              activeTab === 'seasonPlanning' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Planning Saison
          </button>
          <button 
            onClick={() => setActiveTab('quality')} 
            className={
              activeTab === 'quality' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Qualite d'Effectif
          </button>
        </nav>
      </div>
      
      {activeTab === 'roster' ? renderRosterTab() : 
       activeTab === 'seasonPlanning' ? renderSeasonPlanningTab() : 
       activeTab === 'quality' ? renderQualityTab() : 
       renderRosterTab()}

      {/* Modal unique pour vue et édition */}
      {selectedRider && (
        <RiderDetailModal
          rider={selectedRider}
          isOpen={isViewModalOpen || isEditModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setIsEditModalOpen(false);
          }}
          onSaveRider={handleSaveRider}
          onUpdateRiderPreference={handleUpdateRiderPreference}
          raceEvents={raceEvents}
          riderEventSelections={riderEventSelections}
          performanceEntries={[]}
          powerDurationsConfig={[
            { key: 'power1s', label: '1s', unit: 'W', sortable: true },
            { key: 'power5s', label: '5s', unit: 'W', sortable: true },
            { key: 'power30s', label: '30s', unit: 'W', sortable: true },
            { key: 'power1min', label: '1min', unit: 'W', sortable: true },
            { key: 'power3min', label: '3min', unit: 'W', sortable: true },
            { key: 'power5min', label: '5min', unit: 'W', sortable: true },
            { key: 'power12min', label: '12min', unit: 'W', sortable: true },
            { key: 'power20min', label: '20min', unit: 'W', sortable: true },
            { key: 'criticalPower', label: 'CP', unit: 'W', sortable: true }
          ]}
          calculateWkg={(power?: number, weight?: number) => {
            if (!power || !weight) return '-';
            return (power / weight).toFixed(1);
          }}
          appState={appState}
          currentUser={currentUser}
          effectivePermissions={appState.effectivePermissions}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (riderToDelete) {
            try {
              // Supprimer de Firebase
              if (appState.activeTeamId) {
                await deleteData(appState.activeTeamId, "riders", riderToDelete.id);
              }
              
              // Supprimer de l'état local
              onDeleteRider(riderToDelete);
              
              console.log('✅ Coureur supprimé avec succès:', riderToDelete.firstName, riderToDelete.lastName);
            } catch (error) {
              console.error('❌ Erreur lors de la suppression:', error);
              alert('Erreur lors de la suppression du coureur. Vérifiez la console pour plus de détails.');
            }
          }
          setIsDeleteModalOpen(false);
          setRiderToDelete(null);
        }}
        title="Confirmer la suppression"
        message="Etes-vous sur de vouloir supprimer ce coureur ? Cette action est irreversible et supprimera toutes les donnees associees."
      />
    </SectionWrapper>
  );
}


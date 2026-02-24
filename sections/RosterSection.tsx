import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCircleIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { saveData, deleteData } from '../services/firebaseService';
import { Rider, RaceEvent, RiderEventSelection, FormeStatus, Sex, RiderQualitativeProfile, MoralStatus, HealthCondition, RiderEventStatus, RiderEventPreference, ScoutingProfile, TeamProduct, User, AppState } from '../types';
import { getAge, getAgeCategory, getLevelCategory } from '../utils/ageUtils';
import { calculateRiderCharacteristics } from '../utils/performanceCalculations';
import { getCurrentSeasonYear, getSeasonLabel, getAvailableSeasonYears, isSeasonActive, getSeasonTransitionStatus } from '../utils/seasonUtils';
import SeasonTransitionIndicator from '../components/SeasonTransitionIndicator';
import RosterTransitionManager from '../components/RosterTransitionManager';
import RosterArchiveViewer from '../components/RosterArchiveViewer';
import SeasonPlanningSection from './SeasonPlanningSection';
import { 
  getActiveRidersForCurrentSeason, 
  getActiveStaffForCurrentSeason,
  getRosterStatsForSeason 
} from '../utils/rosterArchiveUtils';
import { RosterArchive, RosterTransition } from '../types';

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
  staff?: StaffMember[];
  onRosterTransition?: (archive: RosterArchive, transition: RosterTransition) => void;
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
  appState,
  staff = [],
  onRosterTransition
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
  const [activeTab, setActiveTab] = useState<'roster' | 'seasonPlanning' | 'quality' | 'archives'>('roster');
  
  // États pour l'archivage des effectifs
  const [rosterArchives, setRosterArchives] = useState<RosterArchive[]>([]);
  const [showArchiveViewer, setShowArchiveViewer] = useState(false);
  
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
  const [qualityRoleFilter, setQualityRoleFilter] = useState<'team1' | 'reserve' | 'both'>('both');
  const [localRiderEventSelections, setLocalRiderEventSelections] = useState(appState.riderEventSelections || []);

  // États pour la qualité
  const [qualitySortField, setQualitySortField] = useState<'name' | 'age' | 'general' | 'sprint' | 'climbing' | 'puncher' | 'rouleur' | 'fatigue'>('general');
  const [qualitySortDirection, setQualitySortDirection] = useState<'asc' | 'desc'>('desc');
  
  // États pour le planning de saison
  const [planningSearchTerm, setPlanningSearchTerm] = useState('');
  const [planningGenderFilter, setPlanningGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [planningStatusFilter, setPlanningStatusFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [activePlanningTab, setActivePlanningTab] = useState<'unified' | 'monitoring'>('monitoring');
  const [hidePastEventsInPlanning, setHidePastEventsInPlanning] = useState(true);
  const [riderSortField, setRiderSortField] = useState<'alphabetical' | 'raceDays' | 'potential'>('alphabetical');
  const [riderSortDirection, setRiderSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentSeasonYear());
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeMonitoringTab, setActiveMonitoringTab] = useState<'monitoring' | 'selections'>('monitoring');
  
  // États pour le tri des jours de course
  const [workloadSortBy, setWorkloadSortBy] = useState<'alphabetical' | 'days'>('days');
  const [workloadSortDirection, setWorkloadSortDirection] = useState<'asc' | 'desc'>('desc');
  
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
  
  // Fonction pour obtenir les riders triés pour la qualité (utilise les effectifs actifs, filtre Équipe 1 / Réserve)
  const getSortedRidersForQuality = () => {
    const ridersToUse = activeRiders.length > 0 ? activeRiders : riders;
    let filteredByRole = ridersToUse;
    if (qualityRoleFilter === 'team1') {
      filteredByRole = ridersToUse.filter(r => (r as Rider).rosterRole !== 'reserve');
    } else if (qualityRoleFilter === 'reserve') {
      filteredByRole = ridersToUse.filter(r => (r as Rider).rosterRole === 'reserve');
    }
    const allRiders = includeScouts ? [...filteredByRole, ...(appState.scoutingProfiles || [])] : filteredByRole;
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
  
  // Fonction de tri pour la charge de travail des athlètes
  const handleWorkloadSort = (field: 'alphabetical' | 'days') => {
    if (workloadSortBy === field) {
      setWorkloadSortDirection(workloadSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setWorkloadSortBy(field);
      setWorkloadSortDirection(field === 'days' ? 'desc' : 'asc');
    }
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
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.riders || !Array.isArray(data.riders)) {
          alert('Format JSON invalide. Le fichier doit contenir un tableau "riders".');
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        // Traiter chaque coureur et ses sélections
        for (const riderData of data.riders) {
          // Trouver le coureur correspondant par nom (en nettoyant les espaces)
          const riderName = riderData.nom.trim();
          const rider = riders.find(r => 
            `${r.firstName} ${r.lastName}`.trim().toLowerCase() === riderName.toLowerCase()
          );

          if (!rider) {
            console.warn(`⚠️ Coureur non trouvé: ${riderName}`);
            skippedCount++;
            continue;
          }

          // Traiter chaque sélection
          if (riderData.selections && Array.isArray(riderData.selections)) {
            for (const selection of riderData.selections) {
              // Trouver l'événement correspondant par nom (en nettoyant les espaces)
              const eventName = selection.evenement.trim();
              const raceEvent = futureEvents.find(e => 
                e.name.trim().toLowerCase() === eventName.toLowerCase()
              );

              if (!raceEvent) {
                console.warn(`⚠️ Événement non trouvé: ${eventName}`);
                continue;
              }

              // Mapper le statut du JSON vers RiderEventStatus
              let status: RiderEventStatus | null = null;
              if (selection.statut === "Titulaire") {
                status = RiderEventStatus.TITULAIRE;
              } else if (selection.statut === "Remplaçant") {
                status = RiderEventStatus.REMPLACANT;
              } else if (selection.statut === "Pré-sélection" || selection.statut === "Pré-selection") {
                status = RiderEventStatus.PRE_SELECTION;
              } else if (selection.statut === "Non sélectionné") {
                // Ne rien faire pour les non sélectionnés
                continue;
              }

              if (status) {
                await addRiderToEvent(raceEvent.id, rider.id, status);
                importedCount++;
              }
            }
          }
        }

        alert(`✅ Import terminé!\n${importedCount} sélection(s) importée(s)\n${skippedCount} coureur(s) ignoré(s)`);
        
        // Réinitialiser l'input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'import:', error);
        alert('Erreur lors de l\'import du fichier JSON. Vérifiez le format du fichier.');
      } finally {
        setIsImporting(false);
      }
    };

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
              <div className="flex items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                  id="import-selections"
                />
                <label
                  htmlFor="import-selections"
                  className={`cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ${
                    isImporting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isImporting ? '⏳ Import...' : '📥 Importer JSON'}
                </label>
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
                  {titulaires.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {titulaires.map(rider => (
                        <div key={rider.id} className="text-xs text-gray-600">
                          • {rider.firstName} {rider.lastName}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Remplaçants</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{remplacants.length}</span>
                  </div>
                  {remplacants.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {remplacants.map(rider => (
                        <div key={rider.id} className="text-xs text-gray-600">
                          • {rider.firstName} {rider.lastName}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Pré-sélections</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{preselections.length}</span>
                  </div>
                  {preselections.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {preselections.map(rider => (
                        <div key={rider.id} className="text-xs text-gray-600">
                          • {rider.firstName} {rider.lastName}
                        </div>
                      ))}
                    </div>
                  )}
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
  const [initialModalTab, setInitialModalTab] = useState<string>('info');
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

  // Fonction pour ouvrir le modal d'un coureur avec un onglet spécifique
  const openRiderModal = (rider: Rider, initialTab: string = 'info') => {
    setSelectedRider(rider);
    setInitialModalTab(initialTab);
    setIsViewModalOpen(true);
  };

  // Fonction pour gérer la sauvegarde d'un coureur
  const handleSaveRider = async (rider: Rider) => {
    try {
      await onSaveRider(rider);
      // Mettre à jour le coureur affiché au lieu de fermer la modal, pour éviter que
      // le profil "disparaisse" quand on envoie en équipe première ou réserve
      setSelectedRider(rider);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      alert('Erreur lors de la sauvegarde : ' + message);
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
    const currentSeason = getCurrentSeasonYear();
    
    // Début de saison (1er janvier de l'année de saison courante)
    const seasonStart = new Date(currentSeason, 0, 1);
    
    // Utiliser localRaceEvents pour avoir les données les plus récentes
    const seasonEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      return eventYear === currentSeason && 
             eventDate >= seasonStart && 
             eventDate <= currentDate && 
             event.selectedRiderIds?.includes(riderId);
    });
    
    // Compter les jours uniques de course (pas le nombre d'événements)
    const uniqueDays = new Set(seasonEvents.map(event => event.date)).size;
    
    console.log(`🏁 Jours de course pour ${riderId} en ${currentSeason}:`, uniqueDays, 'jours uniques sur', seasonEvents.length, 'événements');
    console.log('🏁 Événements trouvés:', seasonEvents.map(e => ({ name: e.name, date: e.date })));
    
    return uniqueDays;
  };

  // Fonction pour calculer le nombre de jours de staff depuis le début de saison
  const getStaffDays = (staffId: string) => {
    const currentDate = new Date();
    const currentSeason = getCurrentSeasonYear();
    
    // Début de saison (1er janvier de l'année de saison courante)
    const seasonStart = new Date(currentSeason, 0, 1);
    
    // Utiliser localRaceEvents pour avoir les données les plus récentes
    const seasonEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      return eventYear === currentSeason && 
             eventDate >= seasonStart && 
             eventDate <= currentDate;
    });
    
    // Calculer la durée totale des événements où le staff est assigné
    const totalDays = seasonEvents.reduce((total, event) => {
      // Vérifier si le membre du staff est assigné à cet événement
      const isAssigned = event.selectedStaffIds?.includes(staffId) || 
                        Object.values(event).some(value => 
                          Array.isArray(value) && value.includes(staffId)
                        );
      
      if (isAssigned) {
        // Calculer la durée de l'événement
        const startDate = new Date(event.date + 'T00:00:00Z');
        const endDate = new Date((event.endDate || event.date) + 'T23:59:59Z');
        const eventDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + eventDurationDays;
      }
      
      return total;
    }, 0);
    
    console.log(`👥 Jours de staff pour ${staffId} en ${currentSeason}:`, totalDays, 'jours sur', seasonEvents.length, 'événements');
    
    return totalDays;
  };

  // Fonctions pour la gestion de l'archivage des effectifs
  const handleRosterTransition = (archive: RosterArchive, transition: RosterTransition) => {
    console.log('🔄 Transition des effectifs:', { archive, transition });
    
    // Ajouter l'archive à la liste
    setRosterArchives(prev => [...prev, archive]);
    
    // Notifier le composant parent si la fonction est fournie
    if (onRosterTransition) {
      onRosterTransition(archive, transition);
    }
    
    // Afficher un message de confirmation
    alert(`Effectifs de la saison ${archive.season} archivés avec succès !
    
Tous les coureurs et staff actifs ont été conservés pour 2026.
Les compteurs de jours de course ont été remis à 0.`);
  };

  const handleViewArchive = (archive: RosterArchive) => {
    console.log('👁️ Consultation de l\'archive:', archive);
    setShowArchiveViewer(true);
  };

  // Obtenir les coureurs actifs pour la saison courante
  const activeRiders = getActiveRidersForCurrentSeason(riders);
  const activeStaff = getActiveStaffForCurrentSeason(staff);

  // Calcul des coureurs triés et filtrés pour l'effectif (utilise les effectifs actifs)
  const sortedRidersForAdmin = useMemo(() => {
    // Utiliser les coureurs actifs pour la saison courante
    const ridersToUse = activeRiders.length > 0 ? activeRiders : riders;
    
    let filtered = ridersToUse.filter(rider => {
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
      
      return matchesSearch && matchesGender && matchesAge && matchesCategory && matchesLevel;
    });

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

  // Répartition équipe principale / réserve (par défaut principal si non défini)
  const principalRiders = useMemo(() => 
    sortedRidersForAdmin.filter(r => r.rosterRole !== 'reserve'), 
    [sortedRidersForAdmin]
  );
  const reserveRiders = useMemo(() => 
    sortedRidersForAdmin.filter(r => r.rosterRole === 'reserve'), 
    [sortedRidersForAdmin]
  );

  const handleMoveRosterRole = async (rider: Rider, newRole: 'principal' | 'reserve') => {
    const updatedRider = { ...rider, rosterRole: newRole };
    await onSaveRider(updatedRider);
    // Si le profil de ce coureur est ouvert, mettre à jour l’affichage pour qu’il ne disparaisse pas
    if (selectedRider?.id === rider.id) {
      setSelectedRider(updatedRider);
    }
  };

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

      {/* Section Équipe principale */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Équipe principale</h3>
          <p className="text-sm text-gray-500 mt-0.5">{principalRiders.length} coureur{principalRiders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('name')} title="Trier par nom de famille">
                  <div className="flex items-center space-x-1"><span>Nom</span>{rosterSortBy === 'name' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('firstName')} title="Trier par prénom">
                  <div className="flex items-center space-x-1"><span>Prénom</span>{rosterSortBy === 'firstName' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('age')} title="Trier par âge">
                  <div className="flex items-center space-x-1"><span>Âge</span>{rosterSortBy === 'age' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('levelCategory')} title="Trier par niveau">
                  <div className="flex items-center space-x-1"><span>Niveau</span>{rosterSortBy === 'levelCategory' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('raceDays')} title="Trier par jours de course">
                  <div className="flex items-center justify-center space-x-1"><span>Jours de course</span>{rosterSortBy === 'raceDays' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {principalRiders.map((rider) => {
                const { category, age } = getAgeCategory(rider.birthDate);
                const levelCategory = getLevelCategory(rider);
                return (
                  <tr key={rider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {rider.photoUrl ? <img src={rider.photoUrl} alt={rider.firstName} className="w-8 h-8 rounded-full mr-3"/> : <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3"/>}
                        <div className="text-sm font-medium text-gray-900">{rider.lastName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rider.firstName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{age !== null ? `${age} ans` : 'Âge inconnu'}{age !== null && <span className="text-xs text-gray-500 ml-1">({category})</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{levelCategory}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">🏁 {getRiderRaceDays(rider.id)}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={() => openViewModal(rider)} variant="secondary" size="sm" icon={<EyeIcon className="w-4 h-4"/>} title="Voir"><span className="sr-only">Voir</span></ActionButton>
                        <ActionButton onClick={() => openEditModal(rider)} variant="warning" size="sm" icon={<PencilIcon className="w-4 h-4"/>} title="Modifier"><span className="sr-only">Modifier</span></ActionButton>
                        <ActionButton onClick={() => handleMoveRosterRole(rider, 'reserve')} variant="secondary" size="sm" icon={<ArrowDownCircleIcon className="w-4 h-4"/>} title="Déplacer en réserve">Réserve</ActionButton>
                        <ActionButton onClick={() => handleDeleteRider(rider)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>} title="Supprimer"><span className="sr-only">Supprimer</span></ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Réserve */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200 bg-amber-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Réserve</h3>
          <p className="text-sm text-gray-500 mt-0.5">{reserveRiders.length} coureur{reserveRiders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('name')} title="Trier par nom de famille">
                  <div className="flex items-center space-x-1"><span>Nom</span>{rosterSortBy === 'name' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('firstName')} title="Trier par prénom">
                  <div className="flex items-center space-x-1"><span>Prénom</span>{rosterSortBy === 'firstName' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('age')} title="Trier par âge">
                  <div className="flex items-center space-x-1"><span>Âge</span>{rosterSortBy === 'age' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('levelCategory')} title="Trier par niveau">
                  <div className="flex items-center space-x-1"><span>Niveau</span>{rosterSortBy === 'levelCategory' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleRiderSort('raceDays')} title="Trier par jours de course">
                  <div className="flex items-center justify-center space-x-1"><span>Jours de course</span>{rosterSortBy === 'raceDays' && <svg className={`w-3 h-3 transition-transform ${rosterSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reserveRiders.map((rider) => {
                const { category, age } = getAgeCategory(rider.birthDate);
                const levelCategory = getLevelCategory(rider);
                return (
                  <tr key={rider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {rider.photoUrl ? <img src={rider.photoUrl} alt={rider.firstName} className="w-8 h-8 rounded-full mr-3"/> : <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3"/>}
                        <div className="text-sm font-medium text-gray-900">{rider.lastName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rider.firstName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{age !== null ? `${age} ans` : 'Âge inconnu'}{age !== null && <span className="text-xs text-gray-500 ml-1">({category})</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{levelCategory}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">🏁 {getRiderRaceDays(rider.id)}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={() => openViewModal(rider)} variant="secondary" size="sm" icon={<EyeIcon className="w-4 h-4"/>} title="Voir"><span className="sr-only">Voir</span></ActionButton>
                        <ActionButton onClick={() => openEditModal(rider)} variant="warning" size="sm" icon={<PencilIcon className="w-4 h-4"/>} title="Modifier"><span className="sr-only">Modifier</span></ActionButton>
                        <ActionButton onClick={() => handleMoveRosterRole(rider, 'principal')} variant="primary" size="sm" icon={<ArrowUpCircleIcon className="w-4 h-4"/>} title="Déplacer en équipe principale">Équipe principale</ActionButton>
                        <ActionButton onClick={() => handleDeleteRider(rider)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>} title="Supprimer"><span className="sr-only">Supprimer</span></ActionButton>
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
    const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'matrix'>('matrix');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [editingCell, setEditingCell] = useState<{riderId: string, eventId: string} | null>(null);
    const [tempPreference, setTempPreference] = useState<RiderEventPreference | null>(null);
    const [tempObjectives, setTempObjectives] = useState<string>('');
    const [statusDropdown, setStatusDropdown] = useState<{riderId: string, eventId: string} | null>(null);
    const [matrixCellMenu, setMatrixCellMenu] = useState<{riderId: string, eventId: string} | null>(null);
    const [sortField, setSortField] = useState<'lastName' | 'firstName' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [raceTypeFilter, setRaceTypeFilter] = useState<'all' | 'uci' | 'championnat' | 'coupe-france' | 'federal'>('all');

    // Déterminer le type de course à partir de l'eligibleCategory
    const getRaceType = (eligibleCategory: string): string => {
      if (!eligibleCategory) {
        console.warn('⚠️ eligibleCategory vide ou undefined');
        return 'autre';
      }
      
      const category = eligibleCategory.toLowerCase().trim();
      
      // UCI
      if (category.startsWith('uci.') || category.startsWith('uci ')) {
        return 'uci';
      }
      
      // Coupe de France (DOIT être vérifié AVANT cf. pour éviter confusion)
      if (category.startsWith('cdf.') || category.startsWith('cdf ') || 
          category.includes('coupe de france')) {
        return 'coupe-france';
      }
      
      // Championnat (Championnat de France, Monde, etc.)
      if (category.startsWith('cf.') || category.startsWith('cf ') ||
          category.startsWith('cm') || category.startsWith('cc') || 
          category.startsWith('jo') || category.includes('championnat')) {
        return 'championnat';
      }
      
      // Fédéral
      if (category.startsWith('fed.') || category.startsWith('fed ') || 
          category.includes('fédéral') || category.includes('federal')) {
        return 'federal';
      }
      
      console.warn(`⚠️ Type de course non reconnu pour: "${eligibleCategory}"`);
      return 'autre';
    };

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
      setMatrixCellMenu(null);
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

    // Vue matrice : tableau coureurs × événements (type tableur)
    const renderMatrixView = () => {
      const filteredEventsForMatrix = raceTypeFilter === 'all'
        ? futureEvents
        : futureEvents.filter(event => getRaceType(event.eligibleCategory || '') === raceTypeFilter);

      const principalRiders = filteredAndSortedRiders.filter(r => (r as any).rosterRole !== 'reserve');
      const reserveRiders = filteredAndSortedRiders.filter(r => (r as any).rosterRole === 'reserve');
      const displayRiders = reserveRiders.length > 0
        ? [...principalRiders, ...reserveRiders]
        : filteredAndSortedRiders;

      const getStatusBadge = (status: RiderEventStatus | null) => {
        if (!status) return null;
        switch (status) {
          case RiderEventStatus.TITULAIRE: return { label: 'T', class: 'bg-green-500 text-white' };
          case RiderEventStatus.REMPLACANT: return { label: 'R', class: 'bg-blue-500 text-white' };
          case RiderEventStatus.PRE_SELECTION: return { label: 'P', class: 'bg-amber-500 text-white' };
          case RiderEventStatus.INDISPONIBLE: return { label: 'I', class: 'bg-red-500 text-white' };
          case RiderEventStatus.NON_RETENU: return { label: 'N', class: 'bg-slate-500 text-white' };
          default: return { label: '·', class: 'bg-slate-200 text-slate-600' };
        }
      };

      const getEventTypeBadge = (event: RaceEvent) => {
        const t = getRaceType(event.eligibleCategory || '');
        if (t === 'uci') return { label: 'UCI', class: 'bg-violet-100 text-violet-800' };
        if (t === 'coupe-france') return { label: 'CDF', class: 'bg-blue-100 text-blue-800' };
        if (t === 'federal') return { label: 'Fédéral', class: 'bg-yellow-100 text-yellow-800' };
        if (t === 'championnat') return { label: 'Champ.', class: 'bg-red-100 text-red-800' };
        return { label: '', class: '' };
      };

      return (
        <div className="space-y-4">
          {/* Barre d’outils : filtre + vues */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Type de course</span>
              <select
                value={raceTypeFilter}
                onChange={(e) => setRaceTypeFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 bg-white"
              >
                <option value="all">Tous</option>
                <option value="uci">UCI</option>
                <option value="championnat">Championnat</option>
                <option value="coupe-france">Coupe de France</option>
                <option value="federal">Fédéral</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Vues :</span>
              <button
                onClick={() => setViewMode('table')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Souhaits
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Calendrier
              </button>
            </div>
          </div>

          {/* Légende compacte inline */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="font-medium text-slate-600">Légende</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-green-500 text-white font-bold text-[10px]">T</span> Titulaire</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-blue-500 text-white font-bold text-[10px]">R</span> Remplaçant</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-amber-500 text-white font-bold text-[10px]">P</span> Pré-sélection</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-red-500 text-white font-bold text-[10px]">I</span> Indisponible</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-slate-500 text-white font-bold text-[10px]">N</span> Non retenu</span>
            <span className="text-slate-500 ml-auto">Cliquez sur une cellule pour modifier</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/50">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-100 border-r border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 min-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Athlète
                  </th>
                  {filteredEventsForMatrix.map(event => {
                    const badge = getEventTypeBadge(event);
                    return (
                      <th key={event.id} className="border-r border-slate-200 px-2 py-2.5 text-center last:border-r-0 min-w-[100px]">
                        <div className="text-xs font-medium text-slate-700">
                          {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-slate-600 truncate" title={event.name}>{event.name}</div>
                        {badge.label && (
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.class}`}>
                            {badge.label}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {reserveRiders.length > 0 && principalRiders.length > 0 && (
                  <>
                    <tr className="bg-emerald-50/70">
                      <td colSpan={(filteredEventsForMatrix.length + 1)} className="sticky left-0 z-10 bg-emerald-50/70 border-r border-b border-slate-200 px-4 py-2 text-sm font-semibold text-emerald-800">
                        RIDERS
                      </td>
                    </tr>
                    {principalRiders.map((rider, idx) => (
                      <tr key={rider.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                        <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                          {rider.lastName} {rider.firstName}
                        </td>
                        {filteredEventsForMatrix.map(event => {
                          const status = getRiderEventStatus(event.id, rider.id);
                          const badge = getStatusBadge(status);
                          const isMenuOpen = matrixCellMenu?.riderId === rider.id && matrixCellMenu?.eventId === event.id;
                          return (
                            <td key={event.id} className="border-r border-slate-100 p-0 align-middle last:border-r-0 relative">
                              <div
                                role="button"
                                tabIndex={0}
                                className="w-full h-full min-h-[44px] flex items-center justify-center cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400 transition-colors"
                                onClick={() => setMatrixCellMenu(isMenuOpen ? null : { riderId: rider.id, eventId: event.id })}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMatrixCellMenu(isMenuOpen ? null : { riderId: rider.id, eventId: event.id }); }}
                              >
                                {badge ? (
                                  <span className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shadow-sm ${badge.class}`}>
                                    {badge.label}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-sm">–</span>
                                )}
                              </div>
                              {isMenuOpen && (
                                <div className="absolute left-0 top-full z-20 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[150px] dropdown-container">
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 text-slate-800 font-medium" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.TITULAIRE); setMatrixCellMenu(null); }}>T Titulaire</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.REMPLACANT); setMatrixCellMenu(null); }}>R Remplaçant</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.PRE_SELECTION); setMatrixCellMenu(null); }}>P Pré-sélection</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.INDISPONIBLE); setMatrixCellMenu(null); }}>I Indisponible</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-600 border-t border-slate-100" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.NON_RETENU); setMatrixCellMenu(null); }}>Retirer</button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-amber-50/70">
                      <td colSpan={(filteredEventsForMatrix.length + 1)} className="sticky left-0 z-10 bg-amber-50/70 border-r border-b border-slate-200 px-4 py-2 text-sm font-semibold text-amber-800">
                        Réserve
                      </td>
                    </tr>
                    {reserveRiders.map((rider, idx) => (
                      <tr key={rider.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                        <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                          {rider.lastName} {rider.firstName}
                        </td>
                        {filteredEventsForMatrix.map(event => {
                          const status = getRiderEventStatus(event.id, rider.id);
                          const badge = getStatusBadge(status);
                          const isMenuOpen = matrixCellMenu?.riderId === rider.id && matrixCellMenu?.eventId === event.id;
                          return (
                            <td key={event.id} className="border-r border-slate-100 p-0 align-middle last:border-r-0 relative">
                              <div
                                role="button"
                                tabIndex={0}
                                className="w-full h-full min-h-[44px] flex items-center justify-center cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400 transition-colors"
                                onClick={() => setMatrixCellMenu(isMenuOpen ? null : { riderId: rider.id, eventId: event.id })}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMatrixCellMenu(isMenuOpen ? null : { riderId: rider.id, eventId: event.id }); }}
                              >
                                {badge ? (
                                  <span className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shadow-sm ${badge.class}`}>
                                    {badge.label}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-sm">–</span>
                                )}
                              </div>
                              {isMenuOpen && (
                                <div className="absolute left-0 top-full z-20 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[150px] dropdown-container">
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 text-slate-800 font-medium" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.TITULAIRE); setMatrixCellMenu(null); }}>T Titulaire</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.REMPLACANT); setMatrixCellMenu(null); }}>R Remplaçant</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.PRE_SELECTION); setMatrixCellMenu(null); }}>P Pré-sélection</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.INDISPONIBLE); setMatrixCellMenu(null); }}>I Indisponible</button>
                                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-600 border-t border-slate-100" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.NON_RETENU); setMatrixCellMenu(null); }}>Retirer</button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}
                {(!reserveRiders.length || !principalRiders.length) && displayRiders.map((rider, idx) => (
                  <tr key={rider.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                    <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      {rider.lastName} {rider.firstName}
                    </td>
                    {filteredEventsForMatrix.map(event => {
                      const status = getRiderEventStatus(event.id, rider.id);
                      const badge = getStatusBadge(status);
                      const isMenuOpen = matrixCellMenu?.riderId === rider.id && matrixCellMenu?.eventId === event.id;
                      return (
                        <td key={event.id} className="border-r border-slate-100 p-0 align-middle last:border-r-0 relative">
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-full h-full min-h-[44px] flex items-center justify-center cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400 transition-colors"
                            onClick={() => setMatrixCellMenu(isMenuOpen ? null : { riderId: rider.id, eventId: event.id })}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMatrixCellMenu(isMenuOpen ? null : { riderId: rider.id, eventId: event.id }); }}
                          >
                            {badge ? (
                              <span className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shadow-sm ${badge.class}`}>
                                {badge.label}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">–</span>
                            )}
                          </div>
                          {isMenuOpen && (
                            <div className="absolute left-0 top-full z-20 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[150px] dropdown-container">
                              <button className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 text-slate-800 font-medium" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.TITULAIRE); setMatrixCellMenu(null); }}>T Titulaire</button>
                              <button className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.REMPLACANT); setMatrixCellMenu(null); }}>R Remplaçant</button>
                              <button className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.PRE_SELECTION); setMatrixCellMenu(null); }}>P Pré-sélection</button>
                              <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-slate-800" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.INDISPONIBLE); setMatrixCellMenu(null); }}>I Indisponible</button>
                              <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-600 border-t border-slate-100" onClick={() => { handleStatusChange(rider.id, event.id, RiderEventStatus.NON_RETENU); setMatrixCellMenu(null); }}>Retirer</button>
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
      );
    };

    // Vue calendrier compacte
    const renderCalendarView = () => {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
      const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      
      // Filtrer les événements selon le type de course sélectionné
      const filteredFutureEvents = raceTypeFilter === 'all' 
        ? futureEvents 
        : futureEvents.filter(event => {
            const eventRaceType = getRaceType(event.eligibleCategory || '');
            return eventRaceType === raceTypeFilter;
          });
      
      // Événements du mois sélectionné
      const monthEvents = filteredFutureEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === selectedMonth && eventDate.getFullYear() === selectedYear;
      });

      return (
        <div className="space-y-6">
          {/* Contrôles du calendrier */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
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
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtre par type de course */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Type de course:</label>
                  <select
                    value={raceTypeFilter}
                    onChange={(e) => setRaceTypeFilter(e.target.value as any)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    <option value="uci">🌍 UCI</option>
                    <option value="championnat">🏆 Championnat</option>
                    <option value="coupe-france">🇫🇷 Coupe de France</option>
                    <option value="federal">🚴 Fédéral</option>
                  </select>
                </div>

                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📊 Vue Tableau
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'matrix' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 Vue Matrice
                </button>
              </div>
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

    // Vue tableau unifiée interactive - Version optimisée
    const renderTableView = () => {
      const [groupBy, setGroupBy] = useState<'month' | 'week' | 'all'>('month');
      const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
      const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
      const [compactView, setCompactView] = useState<boolean>(false);

      // Filtrer les événements selon le type de course sélectionné
      const filteredEvents = useMemo(() => {
        if (raceTypeFilter === 'all') return futureEvents;
        
        return futureEvents.filter(event => {
          const eventRaceType = getRaceType(event.eligibleCategory || '');
          return eventRaceType === raceTypeFilter;
        });
      }, [futureEvents, raceTypeFilter]);

      // Grouper les événements selon le mode sélectionné
      const groupedEvents = useMemo(() => {
        if (groupBy === 'all') {
          return { 'Tous les événements': filteredEvents };
        }
        
        if (groupBy === 'month') {
          const groups: { [key: string]: RaceEvent[] } = {};
          filteredEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const monthKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}`;
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(event);
          });
          return groups;
        }
        
        if (groupBy === 'week') {
          const groups: { [key: string]: RaceEvent[] } = {};
          filteredEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const weekStart = new Date(eventDate);
            weekStart.setDate(eventDate.getDate() - eventDate.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!groups[weekKey]) groups[weekKey] = [];
            groups[weekKey].push(event);
          });
          return groups;
        }
        
        return { 'Tous les événements': filteredEvents };
      }, [filteredEvents, groupBy]);

      return (
        <div className="space-y-6">
          {/* Contrôles de la vue tableau optimisés */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">📊 Vue d'Ensemble des Souhaits et Sélections</h3>
                <p className="text-sm text-gray-600 mt-1">Gérez les souhaits et sélections en un coup d'œil - Tableau interactif avec colonnes par événement</p>
              </div>
              
              {/* Contrôles de vue */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtre par type de course */}
                <div className="flex items-center space-x-2 border-r pr-3 border-gray-300">
                  <label className="text-sm font-medium text-gray-700">Type de course:</label>
                  <select
                    value={raceTypeFilter}
                    onChange={(e) => setRaceTypeFilter(e.target.value as any)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    <option value="uci">🌍 UCI</option>
                    <option value="championnat">🏆 Championnat</option>
                    <option value="coupe-france">🇫🇷 Coupe de France</option>
                    <option value="federal">🚴 Fédéral</option>
                  </select>
                </div>

                {/* Tri des athlètes */}
                <div className="flex items-center space-x-2 border-r pr-3 border-gray-300">
                  <label className="text-sm font-medium text-gray-700">Trier par:</label>
                  <button
                    onClick={() => handleSort('lastName')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center space-x-1 ${
                      sortField === 'lastName'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>Nom</span>
                    {sortField === 'lastName' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('firstName')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center space-x-1 ${
                      sortField === 'firstName'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>Prénom</span>
                    {sortField === 'firstName' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </div>

                {/* Grouper par */}
            <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Grouper par:</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'month' | 'week' | 'all')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="month">📅 Mois</option>
                    <option value="week">📆 Semaine</option>
                    <option value="all">📋 Tous</option>
                  </select>
                </div>

                {/* Vue compacte */}
              <button
                  onClick={() => setCompactView(!compactView)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    compactView 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                  {compactView ? '🔍 Vue détaillée' : '📦 Vue compacte'}
                </button>

                {/* Vue calendrier */}
                <button
                  onClick={() => setViewMode('calendar')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  📅 Vue Calendrier
                </button>
                {/* Vue Matrice */}
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'matrix' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 Vue Matrice
                </button>
              </div>
            </div>
          </div>


          {/* Tableaux groupés optimisés */}
          {Object.entries(groupedEvents).map(([groupKey, events]) => {
            const groupLabel = groupBy === 'month' 
              ? new Date(groupKey + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              : groupBy === 'week'
              ? `Semaine du ${new Date(groupKey).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
              : groupKey;

            return (
              <div key={groupKey} className="space-y-4">
                {/* En-tête du groupe */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">
                      {groupLabel} ({events.length} événement{events.length > 1 ? 's' : ''})
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>👥 {filteredAndSortedRiders.length} athlètes</span>
                      <span>📊 {events.reduce((acc, event) => acc + (event.selectedRiderIds?.length || 0), 0)} sélections totales</span>
                      </div>
                      </div>
                          </div>

                {/* Vue organisée par colonnes de statuts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Colonne : Veut participer */}
                  <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-green-800 flex items-center space-x-2">
                        <span>✅</span>
                        <span>Veut participer</span>
                      </h5>
                      <span className="bg-green-200 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {filteredAndSortedRiders.filter(rider => 
                          events.some(event => {
                            const preference = getRiderPreference(event.id, rider.id);
                            return preference === RiderEventPreference.VEUT_PARTICIPER;
                          })
                        ).length}
                      </span>
                          </div>
                    <div className="space-y-2">
                      {filteredAndSortedRiders.filter(rider => 
                        events.some(event => {
                          const preference = getRiderPreference(event.id, rider.id);
                          return preference === RiderEventPreference.VEUT_PARTICIPER;
                        })
                      ).map(rider => (
                        <div key={rider.id} className="bg-white rounded-lg p-3 border border-green-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {rider.firstName?.[0]}{rider.lastName?.[0]}
                        </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{rider.firstName} {rider.lastName}</div>
                              <div className="text-xs text-gray-500">
                                {rider.birthDate ? new Date().getFullYear() - new Date(rider.birthDate).getFullYear() : 'N/A'} ans
                                {rider.qualitativeProfile && ` • ${rider.qualitativeProfile}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Colonne : Objectifs spécifiques */}
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-blue-800 flex items-center space-x-2">
                        <span>🎯</span>
                        <span>Objectifs spécifiques</span>
                      </h5>
                      <span className="bg-blue-200 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        {filteredAndSortedRiders.filter(rider => 
                          events.some(event => {
                            const preference = getRiderPreference(event.id, rider.id);
                            return preference === RiderEventPreference.OBJECTIFS_SPECIFIQUES;
                          })
                        ).length}
                      </span>
                    </div>
                              <div className="space-y-2">
                      {filteredAndSortedRiders.filter(rider => 
                        events.some(event => {
                          const preference = getRiderPreference(event.id, rider.id);
                          return preference === RiderEventPreference.OBJECTIFS_SPECIFIQUES;
                        })
                      ).map(rider => (
                        <div key={rider.id} className="bg-white rounded-lg p-3 border border-blue-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {rider.firstName?.[0]}{rider.lastName?.[0]}
                                </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{rider.firstName} {rider.lastName}</div>
                              <div className="text-xs text-gray-500">
                                {rider.birthDate ? new Date().getFullYear() - new Date(rider.birthDate).getFullYear() : 'N/A'} ans
                                {rider.qualitativeProfile && ` • ${rider.qualitativeProfile}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Colonne : En attente */}
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-yellow-800 flex items-center space-x-2">
                        <span>⏳</span>
                        <span>En attente</span>
                      </h5>
                      <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                        {filteredAndSortedRiders.filter(rider => 
                          events.some(event => {
                            const preference = getRiderPreference(event.id, rider.id);
                            return preference === RiderEventPreference.EN_ATTENTE;
                          })
                        ).length}
                                      </span>
                                    </div>
                    <div className="space-y-2">
                      {filteredAndSortedRiders.filter(rider => 
                        events.some(event => {
                          const preference = getRiderPreference(event.id, rider.id);
                          return preference === RiderEventPreference.EN_ATTENTE;
                        })
                      ).map(rider => (
                        <div key={rider.id} className="bg-white rounded-lg p-3 border border-yellow-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {rider.firstName?.[0]}{rider.lastName?.[0]}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{rider.firstName} {rider.lastName}</div>
                              <div className="text-xs text-gray-500">
                                {rider.birthDate ? new Date().getFullYear() - new Date(rider.birthDate).getFullYear() : 'N/A'} ans
                                {rider.qualitativeProfile && ` • ${rider.qualitativeProfile}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Colonne : Absent */}
                  <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-red-800 flex items-center space-x-2">
                        <span>❌</span>
                                          <span>Absent</span>
                      </h5>
                      <span className="bg-red-200 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        {filteredAndSortedRiders.filter(rider => 
                          events.some(event => {
                            const preference = getRiderPreference(event.id, rider.id);
                            return preference === RiderEventPreference.ABSENT;
                          })
                        ).length}
                      </span>
                                      </div>
                    <div className="space-y-2">
                      {filteredAndSortedRiders.filter(rider => 
                        events.some(event => {
                          const preference = getRiderPreference(event.id, rider.id);
                          return preference === RiderEventPreference.ABSENT;
                        })
                      ).map(rider => (
                        <div key={rider.id} className="bg-white rounded-lg p-3 border border-red-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {rider.firstName?.[0]}{rider.lastName?.[0]}
                                    </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{rider.firstName} {rider.lastName}</div>
                              <div className="text-xs text-gray-500">
                                {rider.birthDate ? new Date().getFullYear() - new Date(rider.birthDate).getFullYear() : 'N/A'} ans
                                {rider.qualitativeProfile && ` • ${rider.qualitativeProfile}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                                </div>
                                
                  {/* Colonne : Ne veut pas */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                        <span>🚫</span>
                        <span>Ne veut pas</span>
                      </h5>
                      <span className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                        {filteredAndSortedRiders.filter(rider => 
                          events.some(event => {
                            const preference = getRiderPreference(event.id, rider.id);
                            return preference === RiderEventPreference.NE_VEUT_PAS;
                          })
                        ).length}
                                    </span>
                                  </div>
                    <div className="space-y-2">
                      {filteredAndSortedRiders.filter(rider => 
                        events.some(event => {
                          const preference = getRiderPreference(event.id, rider.id);
                          return preference === RiderEventPreference.NE_VEUT_PAS;
                        })
                      ).map(rider => (
                        <div key={rider.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {rider.firstName?.[0]}{rider.lastName?.[0]}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{rider.firstName} {rider.lastName}</div>
                              <div className="text-xs text-gray-500">
                                {rider.birthDate ? new Date().getFullYear() - new Date(rider.birthDate).getFullYear() : 'N/A'} ans
                                {rider.qualitativeProfile && ` • ${rider.qualitativeProfile}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Colonne : Pas de choix */}
                  <div className="bg-gray-100 rounded-xl border border-gray-300 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-gray-700 flex items-center space-x-2">
                        <span>⚪</span>
                        <span>Pas de choix</span>
                      </h5>
                      <span className="bg-gray-300 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                        {filteredAndSortedRiders.filter(rider => 
                          !events.some(event => {
                            const preference = getRiderPreference(event.id, rider.id);
                            return preference && preference !== RiderEventPreference.EN_ATTENTE;
                          })
                        ).length}
                      </span>
                                  </div>
                    <div className="space-y-2">
                      {filteredAndSortedRiders.filter(rider => 
                        !events.some(event => {
                          const preference = getRiderPreference(event.id, rider.id);
                          return preference && preference !== RiderEventPreference.EN_ATTENTE;
                        })
                      ).map(rider => (
                        <div key={rider.id} className="bg-white rounded-lg p-3 border border-gray-300 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {rider.firstName?.[0]}{rider.lastName?.[0]}
                              </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{rider.firstName} {rider.lastName}</div>
                              <div className="text-xs text-gray-500">
                                {rider.birthDate ? new Date().getFullYear() - new Date(rider.birthDate).getFullYear() : 'N/A'} ans
                                {rider.qualitativeProfile && ` • ${rider.qualitativeProfile}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
            </div>
          </div>
                </div>
              </div>
            );
          })}

          {/* Légende des statuts (T / R / P cohérent avec la vue matrice) */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Légende des statuts</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded flex items-center justify-center bg-green-500 text-white font-bold">T</span>
                <span>Titulaire</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded flex items-center justify-center bg-blue-500 text-white font-bold">R</span>
                <span>Remplaçant</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded flex items-center justify-center bg-amber-500 text-white font-bold">P</span>
                <span>Pré-sélection</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded flex items-center justify-center bg-red-500 text-white font-bold">I</span>
                <span>Indisponible</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded flex items-center justify-center bg-gray-500 text-white font-bold">N</span>
                <span>Non retenu</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 text-gray-600 font-bold">·</span>
                <span>Non renseigné</span>
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
      <div className="space-y-5">
        {/* Barre de recherche et filtres - compacte */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={planningSearchTerm}
              onChange={(e) => setPlanningSearchTerm(e.target.value)}
              placeholder="Rechercher un athlète (nom, prénom)..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={planningGenderFilter}
              onChange={(e) => setPlanningGenderFilter(e.target.value as 'all' | 'male' | 'female')}
              className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 bg-white"
            >
              <option value="all">Tous</option>
              <option value="male">Hommes</option>
              <option value="female">Femmes</option>
            </select>
            <button
              type="button"
              onClick={() => { setPlanningSearchTerm(''); setPlanningGenderFilter('all'); }}
              className="px-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        {viewMode === 'calendar' ? renderCalendarView() : viewMode === 'matrix' ? renderMatrixView() : renderTableView()}
      </div>
    );
  };

  // Composant MonitoringTab - Centre de Pilotage Saison intégré
  const MonitoringTab = ({ 
    riders, 
    raceEvents, 
    riderEventSelections, 
    selectedYear, 
    setSelectedYear 
  }: {
    riders: Rider[];
    raceEvents: RaceEvent[];
    riderEventSelections: RiderEventSelection[];
    selectedYear: number;
    setSelectedYear: (year: number) => void;
  }) => {
    // Calculs pour les métriques clés
    const seasonMetrics = useMemo(() => {
      const currentYear = selectedYear;
      const currentDate = new Date();
      
      // Événements planifiés pour l'année sélectionnée
      const plannedEvents = raceEvents.filter(event => {
        try {
          const eventDate = new Date(event.date);
          const eventYear = eventDate.getFullYear();
          return eventYear === currentYear && !isNaN(eventDate.getTime());
        } catch (error) {
          console.warn('Erreur de parsing de date pour événement:', event);
          return false;
        }
      }).length;

      // Athlètes disponibles (avec profil complet)
      const availableAthletes = riders.filter(rider => 
        rider.generalPerformanceScore > 0 || 
        rider.powerProfileFresh?.criticalPower > 0
      ).length;

      // Sélections actives (coureurs sélectionnés pour des événements futurs)
      const activeSelections = raceEvents.filter(event => {
        try {
          const eventDate = new Date(event.date);
          const eventYear = eventDate.getFullYear();
          return eventYear === currentYear && eventDate >= currentDate && !isNaN(eventDate.getTime()) && event.selectedRiderIds?.length > 0;
        } catch (error) {
          return false;
        }
      }).length;

      // Charge de travail par athlète
      const athleteWorkload = riders.map(rider => {
        const pastEvents = raceEvents.filter(event => {
          try {
            const eventDate = new Date(event.date);
            const eventYear = eventDate.getFullYear();
            return eventYear === currentYear && 
                   eventDate < currentDate && 
                   !isNaN(eventDate.getTime()) &&
                   event.selectedRiderIds?.includes(rider.id);
          } catch (error) {
            return false;
          }
        }).length;

        const upcomingEvents = raceEvents.filter(event => {
          try {
            const eventDate = new Date(event.date);
            const eventYear = eventDate.getFullYear();
            return eventYear === currentYear && 
                   eventDate >= currentDate && 
                   !isNaN(eventDate.getTime()) &&
                   (event.selectedRiderIds?.includes(rider.id) || 
                    riderEventSelections.some(selection => 
                      selection.eventId === event.id && 
                      selection.riderId === rider.id && 
                      selection.status === RiderEventStatus.PRE_SELECTION
                    ));
          } catch (error) {
            return false;
          }
        }).length;

        return {
          rider,
          pastEvents,
          upcomingEvents,
          totalEvents: pastEvents + upcomingEvents
        };
      }).sort((a, b) => b.totalEvents - a.totalEvents);

      // Calendrier mensuel avec événements
      const monthlyCalendar = Array.from({ length: 12 }, (_, monthIndex) => {
        const monthName = new Date(2024, monthIndex).toLocaleDateString('fr-FR', { month: 'long' });
        const monthEvents = raceEvents.filter(event => {
          try {
            const eventDate = new Date(event.date);
            const eventYear = eventDate.getFullYear();
            const eventMonth = eventDate.getMonth();
            return eventYear === currentYear && eventMonth === monthIndex && !isNaN(eventDate.getTime());
          } catch (error) {
            console.warn('Erreur de parsing de date pour événement:', event);
            return false;
          }
        });

        const confirmedEvents = monthEvents.filter(event => 
          event.selectedRiderIds && event.selectedRiderIds.length > 0
        ).length;

        const preSelectionEvents = monthEvents.filter(event => {
          return riderEventSelections.some(selection => 
            selection.eventId === event.id && 
            selection.status === RiderEventStatus.PRE_SELECTION
          );
        }).length;

        return {
          month: monthName,
          monthIndex,
          totalEvents: monthEvents.length,
          confirmedEvents,
          preSelectionEvents,
          restPeriod: monthEvents.length === 0
        };
      });

      return {
        plannedEvents,
        availableAthletes,
        activeSelections,
        athleteWorkload,
        monthlyCalendar
      };
    }, [riders, raceEvents, riderEventSelections, selectedYear]);

    return (
      <div className="space-y-8">
        {/* Métriques clés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{seasonMetrics.plannedEvents}</div>
            <div className="text-sm font-medium text-gray-600">Événements planifiés</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{seasonMetrics.availableAthletes}</div>
            <div className="text-sm font-medium text-gray-600">Athlètes disponibles</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">{seasonMetrics.activeSelections}</div>
            <div className="text-sm font-medium text-gray-600">Sélections actives</div>
          </div>
        </div>

        {/* Contenu principal - Layout en deux colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendrier Saison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {getSeasonLabel(selectedYear)}
                <SeasonTransitionIndicator seasonYear={selectedYear} showDetails={true} className="ml-2" />
              </h3>
              <div className="flex items-center space-x-2">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableSeasonYears().map(year => (
                    <option key={year} value={year}>
                      {getSeasonLabel(year, false)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="p-6">
              {/* Légende */}
              <div className="flex items-center space-x-4 mb-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Courses confirmées</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Pré-sélections</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Période de repos</span>
                </div>
              </div>

              {/* Calendrier mensuel */}
              <div className="grid grid-cols-4 gap-3">
                {seasonMetrics.monthlyCalendar.map((month, index) => (
                  <div 
                    key={month.month}
                    className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
                      index === 8 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-700 mb-1">{month.month}</div>
                    <div className="text-lg font-bold text-gray-900">
                      {month.totalEvents > 0 ? (
                        <div className="flex items-center justify-center space-x-1">
                          {month.confirmedEvents > 0 && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                          {month.preSelectionEvents > 0 && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                          <span>{month.totalEvents}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>0</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message d'information si aucune course en 2026 */}
              {selectedYear === 2026 && seasonMetrics.plannedEvents === 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Saison 2026 - Transition Active</h4>
                      <p className="text-sm text-blue-600 mt-1">
                        La saison 2026 est officiellement lancée ! La transition fluide permet de commencer la planification dès novembre 2025. 
                        Créez des événements dans la section "Calendrier" pour les voir apparaître ici.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Jours de Course par Athlète */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Jours de Course par Athlète</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleWorkloadSort('alphabetical')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      workloadSortBy === 'alphabetical'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Trier par ordre alphabétique"
                  >
                    <div className="flex items-center space-x-1">
                      <span>A-Z</span>
                      {workloadSortBy === 'alphabetical' && (
                        <svg className={`w-3 h-3 transition-transform ${workloadSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handleWorkloadSort('days')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      workloadSortBy === 'days'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Trier par nombre de jours"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Jours</span>
                      {workloadSortBy === 'days' && (
                        <svg className={`w-3 h-3 transition-transform ${workloadSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  // Appliquer le tri aux données
                  const sortedWorkload = [...seasonMetrics.athleteWorkload].sort((a, b) => {
                    let comparison = 0;
                    
                    if (workloadSortBy === 'alphabetical') {
                      // Tri alphabétique par nom de famille puis prénom
                      const lastNameA = (a.rider.lastName || '').toLowerCase();
                      const lastNameB = (b.rider.lastName || '').toLowerCase();
                      const firstNameA = (a.rider.firstName || '').toLowerCase();
                      const firstNameB = (b.rider.firstName || '').toLowerCase();
                      
                      const lastNameComparison = lastNameA.localeCompare(lastNameB);
                      if (lastNameComparison !== 0) {
                        comparison = lastNameComparison;
                      } else {
                        comparison = firstNameA.localeCompare(firstNameB);
                      }
                    } else {
                      // Tri par nombre de jours
                      comparison = a.totalEvents - b.totalEvents;
                    }
                    
                    return workloadSortDirection === 'asc' ? comparison : -comparison;
                  });
                  
                  return sortedWorkload.slice(0, 10).map((workload, index) => (
                    <div key={workload.rider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {workload.rider.firstName?.[0]}{workload.rider.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {workload.rider.firstName} {workload.rider.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {workload.pastEvents} passées • {workload.upcomingEvents} à venir
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ 
                              width: `${Math.min((workload.totalEvents / 10) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-6 text-center">
                          {workload.totalEvents}
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
    );
  };

  // Rendu de l'onglet Planning de Saison - Version avec monitoring de groupe
  const renderSeasonPlanningTab = () => {
    // Filtrer les événements passés de l'année sélectionnée
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      return eventDate < today && eventYear === selectedYear;
    });

    // Filtrer les événements futurs de l'année sélectionnée (pas de saison prochaine)
    const futureEvents = localRaceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      const currentYear = today.getFullYear();
      return eventDate >= today && eventYear === selectedYear && eventYear === currentYear;
    });

    // Tous les événements de l'année sélectionnée (pour l'option "afficher les passés")
    const eventsForSelectedYear = localRaceEvents.filter(event =>
      new Date(event.date).getFullYear() === selectedYear
    );

    // Liste affichée : sans les passés si l'option est cochée
    const displayEvents = hidePastEventsInPlanning ? futureEvents : eventsForSelectedYear;

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
        const existingSelection = localRiderEventSelections.find(
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
        const updatedSelections = [...localRiderEventSelections];

        for (let i = 0; i < updatedSelections.length; i++) {
          const selection = updatedSelections[i];
          try {
            const savedId = await saveData(
              appState.activeTeamId,
              "riderEventSelections",
              selection
            );
            if (!selection.id) {
              updatedSelections[i] = { ...selection, id: savedId };
            }
            savedCount++;
          } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la sélection:', selection.id, error);
            errorCount++;
          }
        }

        if (savedCount > 0) {
          setLocalRiderEventSelections(updatedSelections);
          setRiderEventSelections(updatedSelections);
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
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* En-tête du centre de pilotage */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/80 px-6 py-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Centre de Pilotage Saison</h2>
              <p className="text-slate-600 text-sm mt-1">Gestion des sélections et calendriers par événement</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePastEventsInPlanning}
                  onChange={(e) => setHidePastEventsInPlanning(e.target.checked)}
                  className="h-4 w-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                />
                <span>Masquer les événements passés</span>
              </label>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {displayEvents.length} événement(s) affiché(s)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {riders.length} athlète(s)
              </span>
            </div>
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <nav className="flex" aria-label="Onglets planning">
            <button
              onClick={() => setActivePlanningTab('monitoring')}
              className={`flex-1 sm:flex-none py-4 px-5 font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activePlanningTab === 'monitoring'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserGroupIcon className="w-5 h-5 shrink-0" />
              <span>Monitoring du Groupe</span>
            </button>
            <button
              onClick={() => setActivePlanningTab('unified')}
              className={`flex-1 sm:flex-none py-4 px-5 font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activePlanningTab === 'unified'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="hidden xs:inline">Sélections & Disponibilités</span>
              <span className="xs:hidden">Sélections</span>
            </button>
          </nav>
          <div className="border-t border-slate-200" />

          {/* Contenu des onglets */}
          <div className="p-6">
            {activePlanningTab === 'monitoring' ? (
              <MonitoringTab 
                riders={riders}
                raceEvents={displayEvents}
                riderEventSelections={localRiderEventSelections}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
              />
            ) : (
              <UnifiedSelectionTab 
                futureEvents={displayEvents}
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
    const qualityPrincipalRiders = activeRiders.filter(r => r.rosterRole !== 'reserve');
    const qualityReserveRiders = activeRiders.filter(r => r.rosterRole === 'reserve');
    const avgPrincipal = qualityPrincipalRiders.length > 0
      ? Math.round(qualityPrincipalRiders.reduce((sum, r) => sum + calculateCogganProfileScore(r).generalScore, 0) / qualityPrincipalRiders.length)
      : 0;
    const avgReserve = qualityReserveRiders.length > 0
      ? Math.round(qualityReserveRiders.reduce((sum, r) => sum + calculateCogganProfileScore(r).generalScore, 0) / qualityReserveRiders.length)
      : 0;

    return (
      <div className="space-y-6">
        {/* Métriques globales simplifiées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg shadow-lg text-white">
            <div className="text-center">
              <h4 className="text-sm font-medium opacity-90">Total Effectif Actif</h4>
              <p className="text-3xl font-bold">{activeRiders.length}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg shadow-lg text-white">
            <div className="text-center">
              <h4 className="text-sm font-medium opacity-90">Moyenne Score</h4>
              <p className="text-3xl font-bold">
                {activeRiders.length > 0 ? Math.round(activeRiders.reduce((sum, r) => {
                  const profile = calculateCogganProfileScore(r);
                  return sum + profile.generalScore;
                }, 0) / activeRiders.length) : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Comparatif Équipe 1 / Réserve (affiché quand les deux sont inclus) */}
        {qualityRoleFilter === 'both' && (qualityPrincipalRiders.length > 0 || qualityReserveRiders.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 border border-blue-500/50 p-4 rounded-lg shadow text-white">
              <div className="text-center">
                <h4 className="text-sm font-medium text-blue-200">Équipe 1</h4>
                <p className="text-2xl font-bold text-blue-300">{qualityPrincipalRiders.length} coureur{qualityPrincipalRiders.length !== 1 ? 's' : ''}</p>
                <p className="text-lg text-blue-100 mt-1">Moy. {avgPrincipal}</p>
              </div>
            </div>
            <div className="bg-gray-800 border border-amber-500/50 p-4 rounded-lg shadow text-white">
              <div className="text-center">
                <h4 className="text-sm font-medium text-amber-200">Réserve</h4>
                <p className="text-2xl font-bold text-amber-300">{qualityReserveRiders.length} coureur{qualityReserveRiders.length !== 1 ? 's' : ''}</p>
                <p className="text-lg text-amber-100 mt-1">Moy. {avgReserve}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tableau de pilotage style Pro Cycling Manager */}
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700">
                      <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white">
                Qualité d'Effectif
              </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Afficher :</span>
                    <select
                      value={qualityRoleFilter}
                      onChange={(e) => setQualityRoleFilter(e.target.value as 'team1' | 'reserve' | 'both')}
                      className="rounded border border-gray-600 bg-gray-700 text-white text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="both">Équipe 1 + Réserve</option>
                      <option value="team1">Équipe 1</option>
                      <option value="reserve">Réserve</option>
                    </select>
                  </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rôle</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(rider as any).isScout ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Scout</span>
                        ) : (rider as Rider).rosterRole === 'reserve' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/50">Réserve</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/50">Équipe 1</span>
                        )}
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

  // Rendu de l'onglet Archives
  const renderArchivesTab = () => (
    <div className="space-y-6">
      {/* Gestionnaire de transition des effectifs */}
      <RosterTransitionManager
        riders={riders}
        staff={staff}
        onRosterTransition={handleRosterTransition}
      />
      
      {/* Visualiseur d'archives */}
      <RosterArchiveViewer
        riders={riders}
        staff={staff}
        archives={rosterArchives}
        onViewArchive={handleViewArchive}
      />
    </div>
  );

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
      {/* Gestionnaire de transition des effectifs */}
      <RosterTransitionManager
        riders={riders}
        staff={staff}
        onRosterTransition={handleRosterTransition}
      />
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
          <button 
            onClick={() => setActiveTab('archives')} 
            className={
              activeTab === 'archives' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Archives
          </button>
        </nav>
      </div>
      
      {activeTab === 'roster' ? renderRosterTab() : 
       activeTab === 'seasonPlanning' ? (
         <SeasonPlanningSection
           riders={riders}
           onSaveRider={onSaveRider}
           onDeleteRider={onDeleteRider}
           raceEvents={raceEvents}
           setRaceEvents={setRaceEvents}
           riderEventSelections={riderEventSelections}
           setRiderEventSelections={setRiderEventSelections}
           performanceEntries={performanceEntries}
           scoutingProfiles={scoutingProfiles}
           teamProducts={teamProducts}
           currentUser={currentUser}
           appState={appState}
           onOpenRiderModal={openRiderModal}
         />
       ) : 
       activeTab === 'quality' ? renderQualityTab() : 
       activeTab === 'archives' ? renderArchivesTab() :
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
          initialTab={initialModalTab}
          allRiders={riders}
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


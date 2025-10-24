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
  TrophyIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SeasonPlanningSection from './SeasonPlanningSection';
import { saveData, deleteData } from '../services/firebaseService';
import { Rider, RaceEvent, RiderEventSelection, FormeStatus, Sex, RiderQualitativeProfile, MoralStatus, HealthCondition, RiderEventStatus, RiderEventPreference, TalentAvailability, ScoutingProfile, TeamProduct, User, AppState } from '../types';
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
  const [activeTab, setActiveTab] = useState<'roster' | 'selections' | 'quality' | 'season-planning'>('roster');
  
  // État pour la sélection d'événement dans l'annuaire
  const [selectedEventForRoster, setSelectedEventForRoster] = useState<string | null>(null);
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  
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
  const [activePlanningTab, setActivePlanningTab] = useState<'unified' | 'monitoring'>('monitoring');
  const [riderSortField, setRiderSortField] = useState<'alphabetical' | 'raceDays' | 'potential'>('alphabetical');
  const [riderSortDirection, setRiderSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeMonitoringTab, setActiveMonitoringTab] = useState<'monitoring' | 'selections'>('monitoring');
  
  // États pour les modales
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editableRider, setEditableRider] = useState<Rider | null>(null);

  // Fonctions pour les modales
  const openViewModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsViewModalOpen(true);
  };
  
  const openEditModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsEditModalOpen(true);
  };

  // Fonction pour obtenir le statut d'un athlète pour un événement
  const getRiderEventStatus = (eventId: string, riderId: string): RiderEventStatus | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.status || null;
  };

  // Fonction pour ajouter un athlète à un événement
  const addRiderToEvent = async (eventId: string, riderId: string, status: RiderEventStatus = RiderEventStatus.TITULAIRE) => {
    try {
      const existingSelection = riderEventSelections.find(
        sel => sel.eventId === eventId && sel.riderId === riderId
      );
      
      if (existingSelection) {
        // Mettre à jour le statut existant
        const updatedSelection = { ...existingSelection, status };
        setRiderEventSelections(prev => 
          prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
        );
      } else {
        // Créer une nouvelle sélection
        const newSelection: RiderEventSelection = {
          id: `${eventId}_${riderId}_${Date.now()}`,
          eventId,
          riderId,
          status,
          riderPreference: RiderEventPreference.EN_ATTENTE,
          talentAvailability: TalentAvailability.DISPONIBLE,
          riderObjectives: '',
          notes: ''
        };
        setRiderEventSelections(prev => [...prev, newSelection]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'athlète:', error);
    }
  };

  // Fonction pour mettre à jour la préférence d'un athlète
  const updateRiderPreference = (eventId: string, riderId: string, preference: RiderEventPreference) => {
    const existingSelection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    
    if (existingSelection) {
      const updatedSelection = { ...existingSelection, riderPreference: preference };
      setRiderEventSelections(prev => 
        prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
      );
    }
  };

  // Fonction pour mettre à jour la disponibilité d'un athlète
  const updateRiderAvailability = (eventId: string, riderId: string, availability: TalentAvailability) => {
    const existingSelection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    
    if (existingSelection) {
      const updatedSelection = { ...existingSelection, talentAvailability: availability };
      setRiderEventSelections(prev => 
        prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
      );
    }
  };

  // Fonction pour retirer un athlète d'un événement
  const removeRiderFromEvent = (eventId: string, riderId: string) => {
    setRiderEventSelections(prev => 
      prev.filter(sel => !(sel.eventId === eventId && sel.riderId === riderId))
    );
  };

  // Filtrer les athlètes selon les critères de recherche
  const filteredRiders = useMemo(() => {
    return riders.filter(rider => {
      const matchesSearch = searchTerm === '' || 
        `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = genderFilter === 'all' || rider.sex === (genderFilter === 'male' ? Sex.MALE : Sex.FEMALE);
      const ageCategory = getAgeCategory(rider.birthDate);
      const matchesAgeCategory = ageCategoryFilter === 'all' || 
        ageCategory.category === ageCategoryFilter;
      const levelCategory = getLevelCategory(rider);
      const matchesLevel = levelFilter === 'all' || 
        levelCategory === levelFilter;
      
      return matchesSearch && matchesGender && matchesAgeCategory && matchesLevel;
    });
  }, [riders, searchTerm, genderFilter, ageCategoryFilter, levelFilter]);

  // Rendu de l'onglet de gestion des sélections
  const renderSelectionsTab = () => {
    const futureEvents = raceEvents.filter(event => {
      try {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour la comparaison
        
        // Vérifier que la date est valide
        if (isNaN(eventDate.getTime())) {
          console.warn('⚠️ Date invalide pour l\'événement:', event.name, event.date);
          return false;
        }
        
        // Filtre par date (futur) - plus permissif pour 2026
        const isFuture = eventDate >= today || eventDate.getFullYear() >= 2026;
        
        // Filtre par année si spécifié
        const yearMatch = yearFilter === 'all' || eventDate.getFullYear() === yearFilter;
        
        console.log(`🔍 Événement "${event.name}":`, {
          date: event.date,
          eventDate: eventDate.toISOString(),
          today: today.toISOString(),
          isFuture,
          yearMatch,
          year: eventDate.getFullYear(),
          yearFilter
        });
        
        return isFuture && yearMatch;
      } catch (error) {
        console.error('❌ Erreur lors du filtrage de l\'événement:', event.name, error);
        return false;
      }
    });

    // Obtenir les années disponibles dans les événements
    const availableYears = useMemo(() => {
      const years = new Set<number>();
      raceEvents.forEach(event => {
        const eventDate = new Date(event.date);
        if (!isNaN(eventDate.getTime())) {
          years.add(eventDate.getFullYear());
        }
      });
      return Array.from(years).sort((a, b) => b - a); // Tri décroissant
    }, [raceEvents]);

    // Debug: Afficher les événements disponibles
    console.log('🔍 Événements disponibles:', raceEvents.length);
    console.log('🔍 Événements futurs:', futureEvents.length);
    console.log('🔍 Années disponibles:', availableYears);
    console.log('🔍 Filtre année:', yearFilter);
    console.log('🔍 Détail des événements futurs:', futureEvents.map(e => ({ name: e.name, date: e.date })));
    
    // Debug spécifique pour février
    const februaryEvents = raceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const month = eventDate.getMonth() + 1; // getMonth() retourne 0-11
      return month === 2; // Février
    });
    console.log('🔍 Événements de février:', februaryEvents.length);
    console.log('🔍 Détail des événements de février:', februaryEvents.map(e => ({ name: e.name, date: e.date, year: new Date(e.date).getFullYear() })));
    
    // Debug pour tous les événements avec leurs mois
    console.log('🔍 Tous les événements par mois:', raceEvents.map(e => ({ 
      name: e.name, 
      date: e.date, 
      month: new Date(e.date).getMonth() + 1,
      year: new Date(e.date).getFullYear()
    })));
    
    // Debug détaillé pour comprendre le filtrage
    console.log('🔍 Debug détaillé du filtrage:');
    raceEvents.forEach((event, index) => {
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFuture = eventDate >= today;
      const yearMatch = yearFilter === 'all' || eventDate.getFullYear() === yearFilter;
      const shouldShow = isFuture && yearMatch;
      
      console.log(`Événement ${index + 1}:`, {
        name: event.name,
        date: event.date,
        eventDate: eventDate.toISOString(),
        today: today.toISOString(),
        isFuture,
        yearMatch,
        shouldShow,
        yearFilter
      });
    });

    return (
      <div className="space-y-6">
        {/* Filtres et recherche */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom de l'athlète..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous</option>
                <option value="male">Hommes</option>
                <option value="female">Femmes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie d'âge</label>
              <select
                value={ageCategoryFilter}
                onChange={(e) => setAgeCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                <option value="U23">U23</option>
                <option value="Elite">Elite</option>
                <option value="Master">Master</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous</option>
                <option value="Pro">Pro</option>
                <option value="Conti">Conti</option>
                <option value="Elite">Elite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Résumé des sélections */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé des Sélections</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {riderEventSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE).length}
              </div>
              <div className="text-sm text-blue-800">Titulaires</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {riderEventSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION).length}
              </div>
              <div className="text-sm text-yellow-800">Pré-sélections</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {riderEventSelections.filter(sel => sel.status === RiderEventStatus.REMPLACANT).length}
              </div>
              <div className="text-sm text-orange-800">Remplaçants</div>
            </div>
          </div>
        </div>

        {/* Message si aucun événement futur */}
        {futureEvents.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Aucun événement futur trouvé</h3>
            <p className="text-yellow-700 mb-4">
              Il n'y a actuellement aucun événement de course planifié pour les prochains mois.
            </p>
            
            {/* Informations de debug */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-blue-800 mb-2">🔍 Informations de diagnostic :</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Total d'événements dans la base : <strong>{raceEvents.length}</strong></p>
                <p>• Événements futurs trouvés : <strong>{futureEvents.length}</strong></p>
                <p>• Années disponibles : <strong>{availableYears.join(', ')}</strong></p>
                <p>• Filtre année actuel : <strong>{yearFilter === 'all' ? 'Toutes' : yearFilter}</strong></p>
                <p>• Date d'aujourd'hui : <strong>{new Date().toLocaleDateString('fr-FR')}</strong></p>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                💡 Ouvrez la console du navigateur (F12) pour voir les détails complets des événements
              </p>
            </div>
            
            <div className="text-sm text-yellow-600 mb-4">
              <p>Pour ajouter des événements :</p>
              <p>1. Allez dans la section "Calendrier"</p>
              <p>2. Cliquez sur "Ajouter Événement"</p>
              <p>3. Créez vos événements avec des dates futures</p>
            </div>
            
            {/* Boutons pour créer des événements de test */}
            <div className="mt-4 space-x-2">
              <button
                onClick={() => {
                  const testEvent: RaceEvent = {
                    id: `test-event-feb-${Date.now()}`,
                    name: "Course de Test - Février 2025",
                    date: "2025-02-15",
                    location: "Test Location",
                    eventType: "COMPETITION" as any,
                    eligibleCategory: "Senior",
                    discipline: "ROUTE" as any,
                    raceInfo: {
                      permanenceAddress: "Test Address",
                      permanenceTime: "08:00",
                      permanenceDate: "2025-02-15",
                      reunionDSTime: "09:00",
                      presentationTime: "10:00",
                      departFictifTime: "11:00",
                      departReelTime: "11:15",
                      arriveePrevueTime: "15:00",
                      distanceKm: 100,
                      radioFrequency: "145.500"
                    },
                    operationalLogistics: [],
                    selectedRiderIds: [],
                    selectedStaffIds: [],
                    selectedVehicleIds: [],
                    checklistEmailSimulated: false
                  };
                  
                  // Ajouter l'événement de test
                  setRaceEvents(prev => [...prev, testEvent]);
                  console.log('✅ Événement de test créé:', testEvent);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Créer un événement de test (Février 2025)
              </button>
              
              <button
                onClick={() => {
                  const testEvent: RaceEvent = {
                    id: `test-event-feb-2026-${Date.now()}`,
                    name: "Course de Test - Février 2026",
                    date: "2026-02-20",
                    location: "Test Location 2026",
                    eventType: "COMPETITION" as any,
                    eligibleCategory: "Senior",
                    discipline: "ROUTE" as any,
                    raceInfo: {
                      permanenceAddress: "Test Address 2026",
                      permanenceTime: "08:00",
                      permanenceDate: "2026-02-20",
                      reunionDSTime: "09:00",
                      presentationTime: "10:00",
                      departFictifTime: "11:00",
                      departReelTime: "11:15",
                      arriveePrevueTime: "15:00",
                      distanceKm: 120,
                      radioFrequency: "145.500"
                    },
                    operationalLogistics: [],
                    selectedRiderIds: [],
                    selectedStaffIds: [],
                    selectedVehicleIds: [],
                    checklistEmailSimulated: false
                  };
                  
                  // Ajouter l'événement de test
                  setRaceEvents(prev => [...prev, testEvent]);
                  console.log('✅ Événement de test 2026 créé:', testEvent);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Créer un événement de test (Février 2026)
              </button>
              
              <button
                onClick={() => {
                  console.log('🔄 Rechargement des données...');
                  console.log('📊 État actuel des raceEvents:', raceEvents);
                  console.log('📊 État actuel des riderEventSelections:', riderEventSelections);
                  console.log('📊 État actuel de appState:', appState);
                  alert('Données rechargées - Vérifiez la console pour les détails');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                🔄 Recharger les données
              </button>
            </div>
          </div>
        )}

        {/* Message d'aide si des événements existent mais ne s'affichent pas */}
        {raceEvents.length > 0 && futureEvents.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">⚠️ Événements trouvés mais non affichés</h4>
            <div className="text-sm text-orange-700 space-y-1">
              <p>• Vous avez <strong>{raceEvents.length}</strong> événements dans votre base de données</p>
              <p>• Mais aucun n'apparaît dans la liste des événements futurs</p>
              <p>• Cela peut être dû à :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Les événements sont dans le passé</li>
                <li>Le filtre par année exclut vos événements</li>
                <li>Problème de format de date</li>
              </ul>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => setYearFilter('all')}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
              >
                Afficher toutes les années
              </button>
              <button
                onClick={() => setYearFilter(2026)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Afficher 2026
              </button>
              <button
                onClick={() => {
                  console.log('🔍 Tous les événements:', raceEvents);
                  console.log('🔍 Événements futurs:', futureEvents);
                  alert('Vérifiez la console pour voir tous les événements');
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Voir dans la console
              </button>
            </div>
          </div>
        )}


        {/* Tableau avec colonnes par course */}
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vue d'Ensemble des Sélections</h3>
            <p className="text-sm text-gray-600">
              Tableau avec une colonne pour chaque course - Souhaits et sélections en un coup d'œil
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Colonnes fixes pour les informations de base */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-16 bg-gray-50 z-10">
                    Prénom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-32 bg-gray-50 z-10">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-48 bg-gray-50 z-10">
                    Niveau
                  </th>
                  
                  {/* Colonnes dynamiques pour chaque événement */}
                  {futureEvents.map(event => {
                    const eventDate = new Date(event.date);
                    const isFebruary = eventDate.getMonth() === 1; // Février = 1
                    
                    return (
                      <th key={event.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        <div className="flex flex-col items-center space-y-1">
                          <div className={`font-bold ${isFebruary ? 'text-blue-600' : 'text-gray-700'}`}>
                            {isFebruary && '🗓️ '}{event.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {eventDate.toLocaleDateString('fr-FR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: '2-digit' 
                            })}
                          </div>
                          <div className="text-xs text-gray-400">
                            Souhaits & Sélections
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  
                  {/* Colonne Actions */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {riders.map((rider, index) => {
                  return (
                    <tr key={rider.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* Colonnes fixes pour les informations de base */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                        {rider.lastName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-16 bg-white z-10">
                        {rider.firstName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 sticky left-32 bg-white z-10">
                        {getAgeCategory(rider.birthDate).category}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 sticky left-48 bg-white z-10">
                        {getLevelCategory(rider)}
                      </td>
                      
                      {/* Colonnes dynamiques pour chaque événement */}
                      {futureEvents.map(event => {
                        const riderSelection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === rider.id);
                        const riderStatus = riderSelection?.status || null;
                        const riderPreference = riderSelection?.riderPreference || null;
                        const riderAvailability = riderSelection?.talentAvailability || null;
                        
                        const isSelected = riderStatus !== null;
                        const isTitulaire = riderStatus === RiderEventStatus.TITULAIRE;
                        const isPreselection = riderStatus === RiderEventStatus.PRE_SELECTION;
                        const isRemplacant = riderStatus === RiderEventStatus.REMPLACANT;
                        
                        return (
                          <td key={event.id} className="px-3 py-3 text-center text-sm border-l border-gray-200">
                            <div className="flex flex-col space-y-2">
                              {/* Checkbox de sélection */}
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addRiderToEvent(event.id, rider.id, RiderEventStatus.PRE_SELECTION);
                                    } else {
                                      removeRiderFromEvent(event.id, rider.id);
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </div>
                              
                              {/* Préférence */}
                              <div>
                                {riderPreference ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    riderPreference === RiderEventPreference.VEUT_PARTICIPER ? 'bg-green-100 text-green-800' :
                                    riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES ? 'bg-blue-100 text-blue-800' :
                                    riderPreference === RiderEventPreference.ABSENT ? 'bg-red-100 text-red-800' :
                                    riderPreference === RiderEventPreference.NE_VEUT_PAS ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {riderPreference === RiderEventPreference.VEUT_PARTICIPER && '👍'}
                                    {riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && '🎯'}
                                    {riderPreference === RiderEventPreference.ABSENT && '❌'}
                                    {riderPreference === RiderEventPreference.NE_VEUT_PAS && '👎'}
                                    {riderPreference === RiderEventPreference.EN_ATTENTE && '⏳'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                              
                              {/* Disponibilité */}
                              <div>
                                {riderAvailability ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    riderAvailability === TalentAvailability.DISPONIBLE ? 'bg-green-100 text-green-800' :
                                    riderAvailability === TalentAvailability.PAS_DISPONIBLE ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {riderAvailability === TalentAvailability.DISPONIBLE && '✓'}
                                    {riderAvailability === TalentAvailability.PAS_DISPONIBLE && '✗'}
                                    {riderAvailability === TalentAvailability.OBJECTIFS && '🎯'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                              
                              {/* Statut */}
                              <div>
                                {isSelected ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    isTitulaire ? 'bg-green-100 text-green-800' :
                                    isPreselection ? 'bg-blue-100 text-blue-800' :
                                    isRemplacant ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {isTitulaire && 'T'}
                                    {isPreselection && 'P'}
                                    {isRemplacant && 'R'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                              
                              {/* Sélecteurs compacts */}
                              <div className="space-y-1">
                                <select
                                  value={riderPreference || ''}
                                  onChange={(e) => {
                                    const newPreference = e.target.value as RiderEventPreference;
                                    if (newPreference) {
                                      updateRiderPreference(event.id, rider.id, newPreference);
                                    }
                                  }}
                                  className="text-xs px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                >
                                  <option value="">Préf.</option>
                                  <option value={RiderEventPreference.EN_ATTENTE}>En attente</option>
                                  <option value={RiderEventPreference.VEUT_PARTICIPER}>Veut</option>
                                  <option value={RiderEventPreference.OBJECTIFS_SPECIFIQUES}>Objectifs</option>
                                  <option value={RiderEventPreference.ABSENT}>Absent</option>
                                  <option value={RiderEventPreference.NE_VEUT_PAS}>Ne veut pas</option>
                                </select>
                                
                                <select
                                  value={riderAvailability || ''}
                                  onChange={(e) => {
                                    const newAvailability = e.target.value as TalentAvailability;
                                    if (newAvailability) {
                                      updateRiderAvailability(event.id, rider.id, newAvailability);
                                    }
                                  }}
                                  className="text-xs px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                >
                                  <option value="">Dispo.</option>
                                  <option value={TalentAvailability.DISPONIBLE}>Disponible</option>
                                  <option value={TalentAvailability.PAS_DISPONIBLE}>Pas dispo.</option>
                                  <option value={TalentAvailability.OBJECTIFS}>Objectifs</option>
                                </select>
                                
                                <select
                                  value={riderStatus || ''}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as RiderEventStatus;
                                    if (newStatus) {
                                      addRiderToEvent(event.id, rider.id, newStatus);
                                    }
                                  }}
                                  className="text-xs px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                >
                                  <option value="">Statut</option>
                                  <option value={RiderEventStatus.PRE_SELECTION}>Pré-sélection</option>
                                  <option value={RiderEventStatus.TITULAIRE}>Titulaire</option>
                                  <option value={RiderEventStatus.REMPLACANT}>Remplaçant</option>
                                </select>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      
                      {/* Colonne Actions - sticky à droite */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-white z-10">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openViewModal(rider)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Voir le profil"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(rider)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Liste des événements avec sélections */}
        <div className="space-y-4">
          {futureEvents.map(event => {
            const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
            const titulaires = eventSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE).length;
            const preselections = eventSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION).length;
            const remplacants = eventSelections.filter(sel => sel.status === RiderEventStatus.REMPLACANT).length;
            
            return (
            <div key={event.id} className="bg-white rounded-lg border p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(event.date).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })} - {event.location}
                  </p>
                  <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {titulaires} titulaire{titulaires > 1 ? 's' : ''}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {preselections} pré-sélection{preselections > 1 ? 's' : ''}
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      {remplacants} remplaçant{remplacants > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Sélectionner tous les athlètes filtrés
                      filteredRiders.forEach(rider => {
                        addRiderToEvent(event.id, rider.id, RiderEventStatus.PRE_SELECTION);
                      });
                    }}
                    className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() => {
                      // Désélectionner tous les athlètes de cet événement
                      filteredRiders.forEach(rider => {
                        removeRiderFromEvent(event.id, rider.id);
                      });
                    }}
                    className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>

              {/* Liste des athlètes avec checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredRiders.map(rider => {
                  const riderSelection = riderEventSelections.find(
                    sel => sel.eventId === event.id && sel.riderId === rider.id
                  );
                  const riderStatus = riderSelection?.status || null;
                  const riderPreference = riderSelection?.riderPreference || null;
                  const riderAvailability = riderSelection?.talentAvailability || null;
                  
                  const isSelected = riderStatus !== null;
                  const isTitulaire = riderStatus === RiderEventStatus.TITULAIRE;
                  const isPreselection = riderStatus === RiderEventStatus.PRE_SELECTION;
                  const isRemplacant = riderStatus === RiderEventStatus.REMPLACANT;

                  // Couleurs selon la disponibilité
                  const getAvailabilityColor = (availability: TalentAvailability | null) => {
                    switch (availability) {
                      case TalentAvailability.DISPONIBLE:
                        return 'text-green-600';
                      case TalentAvailability.PAS_DISPONIBLE:
                        return 'text-red-600';
                      case TalentAvailability.OBJECTIFS:
                        return 'text-blue-600';
                      default:
                        return 'text-gray-400';
                    }
                  };

                  const getPreferenceColor = (preference: RiderEventPreference | null) => {
                    switch (preference) {
                      case RiderEventPreference.VEUT_PARTICIPER:
                        return 'text-green-600';
                      case RiderEventPreference.OBJECTIFS_SPECIFIQUES:
                        return 'text-blue-600';
                      case RiderEventPreference.ABSENT:
                        return 'text-red-600';
                      case RiderEventPreference.NE_VEUT_PAS:
                        return 'text-red-500';
                      case RiderEventPreference.EN_ATTENTE:
                        return 'text-yellow-600';
                      default:
                        return 'text-gray-400';
                    }
                  };

                  return (
                    <div key={rider.id} className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addRiderToEvent(event.id, rider.id, RiderEventStatus.PRE_SELECTION);
                              } else {
                                removeRiderFromEvent(event.id, rider.id);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {rider.firstName} {rider.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getAgeCategory(rider.birthDate).category} - {getLevelCategory(rider)}
                            </div>
                            
                            {/* Indicateurs de disponibilité et préférence */}
                            <div className="mt-1 flex space-x-2">
                              {riderAvailability && (
                                <span className={`text-xs ${getAvailabilityColor(riderAvailability)}`}>
                                  {riderAvailability === TalentAvailability.DISPONIBLE && '✓ Disponible'}
                                  {riderAvailability === TalentAvailability.PAS_DISPONIBLE && '✗ Indisponible'}
                                  {riderAvailability === TalentAvailability.OBJECTIFS && '🎯 Objectifs'}
                                </span>
                              )}
                              {riderPreference && (
                                <span className={`text-xs ${getPreferenceColor(riderPreference)}`}>
                                  {riderPreference === RiderEventPreference.VEUT_PARTICIPER && '👍 Veut participer'}
                                  {riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && '🎯 Objectifs spécifiques'}
                                  {riderPreference === RiderEventPreference.ABSENT && '❌ Absent'}
                                  {riderPreference === RiderEventPreference.NE_VEUT_PAS && '👎 Ne veut pas'}
                                  {riderPreference === RiderEventPreference.EN_ATTENTE && '⏳ En attente'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex flex-col space-y-1">
                            <select
                              value={riderStatus || ''}
                              onChange={(e) => {
                                const newStatus = e.target.value as RiderEventStatus;
                                if (newStatus) {
                                  addRiderToEvent(event.id, rider.id, newStatus);
                                }
                              }}
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value={RiderEventStatus.PRE_SELECTION}>Pré-sélection</option>
                              <option value={RiderEventStatus.TITULAIRE}>Titulaire</option>
                              <option value={RiderEventStatus.REMPLACANT}>Remplaçant</option>
                            </select>
                            
                            <select
                              value={riderAvailability || ''}
                              onChange={(e) => {
                                const newAvailability = e.target.value as TalentAvailability;
                                if (newAvailability) {
                                  updateRiderAvailability(event.id, rider.id, newAvailability);
                                }
                              }}
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value={TalentAvailability.DISPONIBLE}>Disponible</option>
                              <option value={TalentAvailability.PAS_DISPONIBLE}>Pas disponible</option>
                              <option value={TalentAvailability.OBJECTIFS}>Objectifs</option>
                            </select>
                            
                            <select
                              value={riderPreference || ''}
                              onChange={(e) => {
                                const newPreference = e.target.value as RiderEventPreference;
                                if (newPreference) {
                                  updateRiderPreference(event.id, rider.id, newPreference);
                                }
                              }}
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value={RiderEventPreference.EN_ATTENTE}>En attente</option>
                              <option value={RiderEventPreference.VEUT_PARTICIPER}>Veut participer</option>
                              <option value={RiderEventPreference.OBJECTIFS_SPECIFIQUES}>Objectifs spécifiques</option>
                              <option value={RiderEventPreference.ABSENT}>Absent</option>
                              <option value={RiderEventPreference.NE_VEUT_PAS}>Ne veut pas</option>
                            </select>
                          </div>
                        )}
                      </div>
                      
                      {/* Indicateurs de statut */}
                      {isSelected && (
                        <div className="mt-2 flex space-x-2">
                          {isTitulaire && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Titulaire
                            </span>
                          )}
                          {isPreselection && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Pré-sélection
                            </span>
                          )}
                          {isRemplacant && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Remplaçant
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <SectionWrapper 
      title="Gestion des Sélections & Disponibilités"
      actionButton={
        <ActionButton onClick={() => console.log('Add rider')} icon={<PlusCircleIcon className="w-5 h-5"/>}>
          Ajouter Coureur
        </ActionButton>
      }
    >
      <div className="space-y-6">
        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('roster')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'roster'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserGroupIcon className="w-4 h-4 inline mr-2" />
              Annuaire
            </button>
            <button
              onClick={() => setActiveTab('selections')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'selections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4 inline mr-2" />
              Sélections
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'quality'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrophyIcon className="w-4 h-4 inline mr-2" />
              Qualité
            </button>
            <button
              onClick={() => setActiveTab('season-planning')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'season-planning'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4 inline mr-2" />
              Planning de Saison
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            {/* Filtres pour l'annuaire */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nom de l'athlète..."
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous</option>
                    <option value="male">Hommes</option>
                    <option value="female">Femmes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie d'âge</label>
                  <select
                    value={ageCategoryFilter}
                    onChange={(e) => setAgeCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toutes</option>
                    <option value="U23">U23</option>
                    <option value="Elite">Elite</option>
                    <option value="Master">Master</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous</option>
                    <option value="Pro">Pro</option>
                    <option value="Conti">Conti</option>
                    <option value="Elite">Elite</option>
                  </select>
                </div>
              </div>
            </div>


            {/* Message d'information pour l'onglet roster */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">💡 Nouvelle Vue d'Ensemble</h4>
              <p className="text-sm text-blue-700">
                Pour voir le tableau avec une colonne par course (souhaits et sélections), 
                allez dans l'onglet <strong>"Sélections"</strong> ci-dessus.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'selections' && renderSelectionsTab()}

        {activeTab === 'quality' && (
          <div className="text-center p-8">
            <p>Onglet Qualité - En cours de développement...</p>
          </div>
        )}

        {activeTab === 'season-planning' && (
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
          />
        )}
      </div>
    </SectionWrapper>
  );
}










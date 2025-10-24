import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  Cog6ToothIcon,
  TrophyIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import { 
  Rider, 
  RaceEvent, 
  RiderEventSelection, 
  RiderEventStatus, 
  RiderEventPreference, 
  TalentAvailability,
  User,
  AppState,
  RiderQualitativeProfile,
  Sex,
  ScoutingProfile,
  TeamProduct
} from '../types';
import { getAge, getAgeCategory, getLevelCategory } from '../utils/ageUtils';
import { isFutureEvent, getEventYear, formatEventDate, formatEventDateRange } from '../utils/dateUtils';
import { getEffectivePermissions } from '../services/firebaseService';

interface SeasonPlanningSectionProps {
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
  onOpenRiderModal?: (rider: Rider, initialTab?: string) => void;
}

export default function SeasonPlanningSection({ 
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
  onOpenRiderModal
}: SeasonPlanningSectionProps) {
  if (!appState) {
    return <div>Chargement...</div>;
  }
  
  // Vérifications de sécurité
  if (!riders || !Array.isArray(riders)) {
    return <div>Erreur: Données des athlètes non disponibles</div>;
  }
  
  if (!raceEvents || !Array.isArray(raceEvents)) {
    return <div>Erreur: Données des événements non disponibles</div>;
  }
  
  if (!riderEventSelections || !Array.isArray(riderEventSelections)) {
    return <div>Erreur: Données des sélections non disponibles</div>;
  }

  // États pour la gestion des vues
  const [activeView, setActiveView] = useState<'overview' | 'rider-detail' | 'preferences'>('overview');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [preferenceFilter, setPreferenceFilter] = useState<'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting'>('all');
  const [raceTypeFilter, setRaceTypeFilter] = useState<'all' | 'uci' | 'championnat' | 'coupe-france' | 'federal'>('all');
  const [showFilters, setShowFilters] = useState(true);

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
  
  // États pour le tri
  const [sortField, setSortField] = useState<'name' | 'lastName' | 'firstName' | 'age' | 'profile' | 'raceDays'>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  

  // Calculer les permissions effectives
  const effectivePermissions = useMemo(() => {
    if (!currentUser) return {};
    return getEffectivePermissions(
      currentUser,
      appState.permissions,
      appState.staff
    );
  }, [currentUser, appState.permissions, appState.staff]);

  // Filtrer les événements futurs
  const futureEvents = useMemo(() => {
    const filtered = raceEvents.filter(event => {
      if (!isFutureEvent(event.date)) return false;
      if (selectedYear !== 'all' && getEventYear(event.date) !== selectedYear) return false;
      
      // Filtre par type de course
      if (raceTypeFilter !== 'all') {
        const eventRaceType = getRaceType(event.eligibleCategory || '');
        
        // Debug: afficher les informations de filtrage
        console.log(`🔍 Événement: ${event.name}`);
        console.log(`   eligibleCategory: "${event.eligibleCategory}"`);
        console.log(`   Type détecté: "${eventRaceType}"`);
        console.log(`   Filtre appliqué: "${raceTypeFilter}"`);
        console.log(`   Correspond: ${eventRaceType === raceTypeFilter}`);
        
        if (eventRaceType !== raceTypeFilter) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Debug: afficher le résumé
    if (raceTypeFilter !== 'all') {
      console.log(`📊 Résumé du filtre "${raceTypeFilter}": ${filtered.length} événement(s) trouvé(s)`);
    }
    
    return filtered;
  }, [raceEvents, selectedYear, raceTypeFilter]);

  // Obtenir les années disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    raceEvents.forEach(event => {
      if (isFutureEvent(event.date)) {
        years.add(getEventYear(event.date));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [raceEvents]);

  // Déterminer si on doit afficher la vue calendrier (plus de 5 événements)
  const shouldShowCalendarView = futureEvents.length > 5;

  // Fonction pour calculer le nombre de jours de course prévu pour un athlète (titulaires uniquement)
  const getRiderRaceDays = (riderId: string) => {
    return riderEventSelections.filter(sel => 
      sel.riderId === riderId && 
      futureEvents.some(event => event.id === sel.eventId) &&
      sel.status === RiderEventStatus.TITULAIRE
    ).length;
  };

  // Fonction pour calculer le nombre de pré-sélections
  const getRiderPreselections = (riderId: string) => {
    return riderEventSelections.filter(sel => 
      sel.riderId === riderId && 
      futureEvents.some(event => event.id === sel.eventId) &&
      sel.status === RiderEventStatus.PRE_SELECTION
    ).length;
  };

  // Fonction de tri des athlètes
  const sortRiders = (riders: Rider[]) => {
    return [...riders].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'lastName':
          aValue = (a.lastName || '').toLowerCase();
          bValue = (b.lastName || '').toLowerCase();
          break;
        case 'firstName':
          aValue = (a.firstName || '').toLowerCase();
          bValue = (b.firstName || '').toLowerCase();
          break;
        case 'age':
          aValue = getAge(a.birthDate);
          bValue = getAge(b.birthDate);
          break;
        case 'profile':
          aValue = a.qualitativeProfile || 'AUTRE';
          bValue = b.qualitativeProfile || 'AUTRE';
          break;
        case 'raceDays':
          aValue = getRiderRaceDays(a.id);
          bValue = getRiderRaceDays(b.id);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filtrer et trier les athlètes
  const filteredRiders = useMemo(() => {
    const filtered = riders.filter(rider => {
      const matchesSearch = searchTerm === '' || 
        `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = genderFilter === 'all' || rider.sex === (genderFilter === 'male' ? Sex.MALE : Sex.FEMALE);
      const ageCategory = getAgeCategory(rider.birthDate);
      const matchesAgeCategory = ageCategoryFilter === 'all' || 
        ageCategory.category === ageCategoryFilter;
      const levelCategory = getLevelCategory(rider);
      const matchesLevel = levelFilter === 'all' || 
        levelCategory === levelFilter;
      
      // Filtre par préférence - vérifier si l'athlète a au moins une préférence correspondante
      let matchesPreference = true;
      if (preferenceFilter !== 'all') {
        const riderSelections = riderEventSelections.filter(sel => sel.riderId === rider.id);
        matchesPreference = riderSelections.some(sel => {
          switch (preferenceFilter) {
            case 'wants':
              return sel.riderPreference === RiderEventPreference.VEUT_PARTICIPER;
            case 'objectives':
              return sel.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES;
            case 'waiting':
              return sel.riderPreference === RiderEventPreference.EN_ATTENTE;
            case 'unavailable':
              return sel.riderPreference === RiderEventPreference.ABSENT || 
                     sel.riderPreference === RiderEventPreference.NE_VEUT_PAS;
            default:
              return true;
          }
        });
      }
      
      return matchesSearch && matchesGender && matchesAgeCategory && matchesLevel && matchesPreference;
    });
    
    // Appliquer le tri
    return sortRiders(filtered);
  }, [riders, searchTerm, genderFilter, ageCategoryFilter, levelFilter, preferenceFilter, riderEventSelections, sortField, sortDirection]);

  // Fonction pour obtenir le statut d'un athlète pour un événement
  const getRiderEventStatus = (eventId: string, riderId: string): RiderEventStatus | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.status || null;
  };

  // Fonction pour obtenir la préférence d'un athlète pour un événement
  const getRiderEventPreference = (eventId: string, riderId: string): RiderEventPreference | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.riderPreference || null;
  };

  // Fonction pour obtenir la disponibilité d'un athlète pour un événement
  const getRiderEventAvailability = (eventId: string, riderId: string): TalentAvailability | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.talentAvailability || null;
  };

  // Fonction pour ajouter un athlète à un événement
  const addRiderToEvent = async (eventId: string, riderId: string, status: RiderEventStatus = RiderEventStatus.PRE_SELECTION) => {
    try {
      const event = raceEvents.find(e => e.id === eventId);
      if (!event) return;
      
      // Vérifier les limites de sélection
      const currentSelectedCount = getSelectedRidersCount(eventId);
      const maxRiders = event.maxRiders;
      
      if (maxRiders && currentSelectedCount >= maxRiders) {
        alert(`Impossible d'ajouter plus d'athlètes. Limite maximale de ${maxRiders} coureurs atteinte.`);
        return;
      }
      
      const existingSelection = riderEventSelections.find(
        sel => sel.eventId === eventId && sel.riderId === riderId
      );
      
      if (existingSelection) {
        const updatedSelection = { ...existingSelection, status };
        setRiderEventSelections(prev => 
          prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
        );
      } else {
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
    } else {
      // Créer une nouvelle sélection si elle n'existe pas
      const newSelection: RiderEventSelection = {
        id: `${eventId}_${riderId}_${Date.now()}`,
        eventId,
        riderId,
        status: RiderEventStatus.EN_ATTENTE,
        riderPreference: preference,
        talentAvailability: TalentAvailability.DISPONIBLE,
        riderObjectives: '',
        notes: ''
      };
      setRiderEventSelections(prev => [...prev, newSelection]);
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
    } else {
      // Créer une nouvelle sélection si elle n'existe pas
      const newSelection: RiderEventSelection = {
        id: `${eventId}_${riderId}_${Date.now()}`,
        eventId,
        riderId,
        status: RiderEventStatus.EN_ATTENTE,
        riderPreference: RiderEventPreference.EN_ATTENTE,
        talentAvailability: availability,
        riderObjectives: '',
        notes: ''
      };
      setRiderEventSelections(prev => [...prev, newSelection]);
    }
  };

  // Fonction pour retirer un athlète d'un événement
  const removeRiderFromEvent = (eventId: string, riderId: string) => {
    setRiderEventSelections(prev => 
      prev.filter(sel => !(sel.eventId === eventId && sel.riderId === riderId))
    );
  };


  // Fonction pour obtenir le nombre d'athlètes sélectionnés pour un événement
  const getSelectedRidersCount = (eventId: string) => {
    return riderEventSelections.filter(sel => 
      sel.eventId === eventId && 
      (sel.status === RiderEventStatus.TITULAIRE || sel.status === RiderEventStatus.PRE_SELECTION)
    ).length;
  };

  // Fonction pour vérifier si les limites sont respectées
  const isWithinLimits = (eventId: string) => {
    const event = raceEvents.find(e => e.id === eventId);
    if (!event) return true;
    
    const selectedCount = getSelectedRidersCount(eventId);
    const minRiders = event.minRiders || 0;
    const maxRiders = event.maxRiders || Infinity;
    
    return selectedCount >= minRiders && selectedCount <= maxRiders;
  };

  // Fonction pour ouvrir le calendrier d'un athlète
  const openRiderCalendar = (rider: Rider) => {
    console.log('Opening calendar for rider:', rider.firstName, rider.lastName);
    if (onOpenRiderModal) {
      onOpenRiderModal(rider, 'calendar');
    } else {
      console.error('onOpenRiderModal not provided');
    }
  };

  // Fonction pour ouvrir le profil d'un athlète
  const openRiderProfile = (rider: Rider) => {
    if (onOpenRiderModal) {
      onOpenRiderModal(rider, 'info');
    } else {
      console.error('onOpenRiderModal not provided');
    }
  };

  // Fonction de tri
  const handleSort = (field: 'name' | 'lastName' | 'firstName' | 'age' | 'profile' | 'raceDays') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  // Rendu de la vue calendrier
  const renderCalendarView = () => (
    <div className="space-y-6">
      {/* En-tête avec contrôles de vue */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">📅 Planning de Saison - Vue Calendrier</h2>
            <p className="text-gray-600">
              Vue calendrier des événements avec les sélections d'athlètes
            </p>
          </div>
          
          {/* Contrôles de vue */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Sélecteur d'année */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Année :</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Toutes</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year === 2026 ? `📅 ${year} (Planification)` : year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sélecteur de vue */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="w-4 h-4 mr-1 inline" />
                Tableau
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4 mr-1 inline" />
                Calendrier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier des événements */}
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Événements à venir</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {futureEvents.map(event => {
              const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
              const titulaires = eventSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE);
              const preselections = eventSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION);
              const remplacants = eventSelections.filter(sel => sel.status === RiderEventStatus.REMPLACANT);
              
              return (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-semibold text-gray-900 text-lg">{event.name}</h5>
                    <span className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{event.location}</p>
                  
                  {/* Informations de sélection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Titulaires</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{titulaires.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Pré-sélections</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{preselections.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Remplaçants</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{remplacants.length}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <span className="text-2xl font-light text-blue-600">
                        {titulaires.length + preselections.length + remplacants.length}
                      </span>
                      <div className="text-xs text-gray-500">sélectionnés</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Rendu de la vue détail par athlète
  const renderRiderDetailView = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">👤 Détail par Athlète</h2>
            <p className="text-gray-600">
              Vue détaillée du planning de chaque athlète
            </p>
          </div>
          
          {/* Sélecteur d'année */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Année :</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="all">Toutes</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year === 2026 ? `📅 ${year} (Planification)` : year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section de recherche */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <MagnifyingGlassIcon className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Rechercher un athlète</h3>
        </div>
        <input
          type="text"
          placeholder="Nom de l'athlète..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Liste des athlètes avec leurs événements */}
      <div className="space-y-4">
        {filteredRiders.map(rider => {
          const riderSelections = riderEventSelections.filter(sel => 
            sel.riderId === rider.id && 
            futureEvents.some(event => event.id === sel.eventId)
          );
          
          const titulaire = riderSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE);
          const preselection = riderSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION);
          
          return (
            <div key={rider.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* En-tête de l'athlète */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 h-16 w-16">
                      {rider.photoUrl ? (
                        <img className="h-16 w-16 rounded-full ring-2 ring-purple-200" src={rider.photoUrl} alt="" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center ring-2 ring-purple-200">
                          <span className="text-white font-semibold text-lg">
                            {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {rider.firstName} {rider.lastName}
                      </h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-gray-600">
                          {getAge(rider.birthDate)} ans
                        </span>
                        {rider.qualitativeProfile && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-purple-600 font-medium">
                              {rider.qualitativeProfile === RiderQualitativeProfile.GRIMPEUR && '🏔️ Grimpeur'}
                              {rider.qualitativeProfile === RiderQualitativeProfile.ROULEUR && '🛣️ Rouleur'}
                              {rider.qualitativeProfile === RiderQualitativeProfile.SPRINTEUR && '💨 Sprinteur'}
                              {rider.qualitativeProfile === RiderQualitativeProfile.PUNCHEUR && '⚡ Puncheur'}
                              {rider.qualitativeProfile === RiderQualitativeProfile.BAROUDEUR_PROFIL && '🌪️ Baroudeur'}
                              {rider.qualitativeProfile === RiderQualitativeProfile.AUTRE && '🔧 Autre'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center px-4 py-2 bg-white rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">{titulaire.length}</div>
                      <div className="text-xs text-gray-600">Titulaire</div>
                    </div>
                    <div className="text-center px-4 py-2 bg-white rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{preselection.length}</div>
                      <div className="text-xs text-gray-600">Pré-sélection</div>
                    </div>
                    <button
                      onClick={() => openRiderCalendar(rider)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <CalendarDaysIcon className="w-5 h-5 inline mr-2" />
                      Voir calendrier
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Liste des événements de l'athlète */}
              <div className="p-6">
                {riderSelections.length > 0 ? (
                  <div className="space-y-3">
                    {riderSelections.map(selection => {
                      const event = futureEvents.find(e => e.id === selection.eventId);
                      if (!event) return null;
                      
                      return (
                        <div key={selection.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                selection.status === RiderEventStatus.TITULAIRE ? 'bg-green-500' :
                                selection.status === RiderEventStatus.PRE_SELECTION ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}></div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{event.name}</h4>
                                <p className="text-sm text-gray-600">{formatEventDateRange(event)} • {event.location}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              selection.status === RiderEventStatus.TITULAIRE ? 'bg-green-100 text-green-800' :
                              selection.status === RiderEventStatus.PRE_SELECTION ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selection.status === RiderEventStatus.TITULAIRE ? 'Titulaire' :
                               selection.status === RiderEventStatus.PRE_SELECTION ? 'Pré-sélection' :
                               'Remplaçant'}
                            </span>
                            
                            {selection.riderPreference && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selection.riderPreference === RiderEventPreference.VEUT_PARTICIPER ? 'bg-green-100 text-green-800' :
                                selection.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES ? 'bg-blue-100 text-blue-800' :
                                selection.riderPreference === RiderEventPreference.ABSENT || selection.riderPreference === RiderEventPreference.NE_VEUT_PAS ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {selection.riderPreference === RiderEventPreference.VEUT_PARTICIPER ? '👍 Veut participer' :
                                 selection.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES ? '🎯 Objectifs' :
                                 selection.riderPreference === RiderEventPreference.ABSENT ? '❌ Absent' :
                                 selection.riderPreference === RiderEventPreference.NE_VEUT_PAS ? '🚫 Ne veut pas' :
                                 '⏳ En attente'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>Aucun événement planifié pour cet athlète</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si aucun athlète trouvé */}
      {filteredRiders.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun athlète trouvé</h3>
          <p className="text-gray-500">
            Essayez de modifier vos critères de recherche ou de filtrage
          </p>
        </div>
      )}
    </div>
  );

  // Rendu de la vue préférences/choix des athlètes
  const renderPreferencesView = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🎯 Choix des Athlètes</h2>
            <p className="text-gray-600">
              Vue centrée sur les préférences et souhaits des athlètes
            </p>
          </div>
          
          {/* Sélecteur d'année */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Année :</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="all">Toutes</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year === 2026 ? `📅 ${year} (Planification)` : year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filtre par préférence */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FunnelIcon className="w-5 h-5 mr-2 text-green-500" />
            Filtrer par préférence
          </h3>
          <select
            value={preferenceFilter}
            onChange={(e) => setPreferenceFilter(e.target.value as 'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="all">Toutes les préférences</option>
            <option value="wants">👍 Veut participer</option>
            <option value="objectives">🎯 Objectifs spécifiques</option>
            <option value="unavailable">❌ Indisponible (absent ou ne veut pas)</option>
            <option value="waiting">⏳ En attente</option>
          </select>
        </div>
      </div>

      {/* Liste des événements avec les préférences */}
      <div className="space-y-6">
        {futureEvents.map(event => {
          const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
          
          // Grouper les athlètes par préférence
          const wantsToParticipate = eventSelections.filter(sel => sel.riderPreference === RiderEventPreference.VEUT_PARTICIPER);
          const hasObjectives = eventSelections.filter(sel => sel.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES);
          const unavailable = eventSelections.filter(sel => 
            sel.riderPreference === RiderEventPreference.ABSENT || 
            sel.riderPreference === RiderEventPreference.NE_VEUT_PAS
          );
          const waiting = eventSelections.filter(sel => sel.riderPreference === RiderEventPreference.EN_ATTENTE);
          
          // Appliquer le filtre
          const shouldShowEvent = preferenceFilter === 'all' || 
            (preferenceFilter === 'wants' && wantsToParticipate.length > 0) ||
            (preferenceFilter === 'objectives' && hasObjectives.length > 0) ||
            (preferenceFilter === 'unavailable' && unavailable.length > 0) ||
            (preferenceFilter === 'waiting' && waiting.length > 0);
          
          if (!shouldShowEvent) return null;
          
          return (
            <div key={event.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* En-tête de l'événement */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatEventDateRange(event)} • {event.location}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-center px-4 py-2 bg-white rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{wantsToParticipate.length}</div>
                      <div className="text-xs text-gray-600">Intéressés</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Athlètes groupés par préférence */}
              <div className="p-6 space-y-6">
                {/* Veut participer */}
                {wantsToParticipate.length > 0 && (preferenceFilter === 'all' || preferenceFilter === 'wants') && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      Veut participer ({wantsToParticipate.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {wantsToParticipate.map(selection => {
                        const rider = riders.find(r => r.id === selection.riderId);
                        if (!rider) return null;
                        
                        return (
                          <div key={selection.id} className="flex items-center space-x-3 p-3 border border-green-200 rounded-lg bg-green-50">
                            <div className="flex-shrink-0 h-10 w-10">
                              {rider.photoUrl ? (
                                <img className="h-10 w-10 rounded-full" src={rider.photoUrl} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">
                                    {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {rider.firstName} {rider.lastName}
                              </p>
                              {selection.status && (
                                <p className="text-xs text-gray-600">
                                  {selection.status === RiderEventStatus.TITULAIRE ? '✓ Titulaire' :
                                   selection.status === RiderEventStatus.PRE_SELECTION ? '⋯ Pré-sélection' :
                                   '• Remplaçant'}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Objectifs spécifiques */}
                {hasObjectives.length > 0 && (preferenceFilter === 'all' || preferenceFilter === 'objectives') && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      Objectifs spécifiques ({hasObjectives.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {hasObjectives.map(selection => {
                        const rider = riders.find(r => r.id === selection.riderId);
                        if (!rider) return null;
                        
                        return (
                          <div key={selection.id} className="flex items-center space-x-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex-shrink-0 h-10 w-10">
                              {rider.photoUrl ? (
                                <img className="h-10 w-10 rounded-full" src={rider.photoUrl} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">
                                    {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {rider.firstName} {rider.lastName}
                              </p>
                              {selection.riderObjectives && (
                                <p className="text-xs text-gray-600 truncate">
                                  {selection.riderObjectives}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Indisponible */}
                {unavailable.length > 0 && (preferenceFilter === 'all' || preferenceFilter === 'unavailable') && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      Indisponible ({unavailable.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unavailable.map(selection => {
                        const rider = riders.find(r => r.id === selection.riderId);
                        if (!rider) return null;
                        
                        return (
                          <div key={selection.id} className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg bg-red-50">
                            <div className="flex-shrink-0 h-10 w-10">
                              {rider.photoUrl ? (
                                <img className="h-10 w-10 rounded-full" src={rider.photoUrl} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">
                                    {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {rider.firstName} {rider.lastName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {selection.riderPreference === RiderEventPreference.ABSENT ? 'Absent' : 'Ne veut pas'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* En attente */}
                {waiting.length > 0 && (preferenceFilter === 'all' || preferenceFilter === 'waiting') && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                      En attente ({waiting.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {waiting.map(selection => {
                        const rider = riders.find(r => r.id === selection.riderId);
                        if (!rider) return null;
                        
                        return (
                          <div key={selection.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex-shrink-0 h-10 w-10">
                              {rider.photoUrl ? (
                                <img className="h-10 w-10 rounded-full" src={rider.photoUrl} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">
                                    {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {rider.firstName} {rider.lastName}
                              </p>
                              <p className="text-xs text-gray-600">En attente de décision</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Rendu de la vue d'ensemble
  const renderOverviewView = () => (
    <div className="space-y-6">
      {/* En-tête simplifié avec contrôles principaux */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">📅 Planning de Saison</h2>
            <p className="text-gray-600">
              Pilotage des sélections et souhaits des athlètes
            </p>
          </div>
          
          {/* Contrôles principaux */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Sélecteur d'année */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Année :</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Toutes</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year === 2026 ? `📅 ${year} (Planification)` : year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sélecteur de vue */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="w-4 h-4 mr-1 inline" />
                Tableau
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4 mr-1 inline" />
                Calendrier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section de filtres et recherche */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FunnelIcon className="w-5 h-5 mr-2 text-blue-500" />
            Filtres et Recherche
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showFilters ? <ChevronUpIcon className="w-4 h-4 mr-1" /> : <ChevronDownIcon className="w-4 h-4 mr-1" />}
            {showFilters ? 'Masquer' : 'Afficher'} les filtres
          </button>
        </div>
        
        {showFilters && (
          <div className="space-y-4">
            {/* Première ligne: Recherche */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nom de l'athlète..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Deuxième ligne: Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtre par genre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="male">Hommes</option>
                  <option value="female">Femmes</option>
                </select>
              </div>
              
              {/* Filtre par catégorie d'âge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={ageCategoryFilter}
                  onChange={(e) => setAgeCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes</option>
                  <option value="U23">U23</option>
                  <option value="Elite">Elite</option>
                  <option value="Master">Master</option>
                </select>
              </div>
              
              {/* Filtre par type de course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de course</label>
                <select
                  value={raceTypeFilter}
                  onChange={(e) => setRaceTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les types</option>
                  <option value="uci">🌍 UCI</option>
                  <option value="championnat">🏆 Championnat</option>
                  <option value="coupe-france">🇫🇷 Coupe de France</option>
                  <option value="federal">🚴 Fédéral</option>
                </select>
              </div>
              
              {/* Filtre par préférence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Préférence</label>
                <select
                  value={preferenceFilter}
                  onChange={(e) => setPreferenceFilter(e.target.value as 'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes</option>
                  <option value="wants">Veut participer</option>
                  <option value="objectives">Objectifs spécifiques</option>
                  <option value="unavailable">Indisponible</option>
                  <option value="waiting">En attente</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Statistiques essentielles - Version simplifiée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Athlètes</p>
                <p className="text-2xl font-bold text-blue-600">{filteredRiders.length}</p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Événements</p>
                <p className="text-2xl font-bold text-green-600">{futureEvents.length}</p>
              </div>
              <CalendarDaysIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Actions rapides - Version compacte */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                filteredRiders.forEach(rider => {
                  futureEvents.forEach(event => {
                    const selection = riderEventSelections.find(sel => 
                      sel.riderId === rider.id && sel.eventId === event.id
                    );
                    if (selection?.riderPreference === RiderEventPreference.VEUT_PARTICIPER) {
                      addRiderToEvent(event.id, rider.id, RiderEventStatus.PRE_SELECTION);
                    }
                  });
                });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              ✓ Auto-sélection
            </button>
            
            <button
              onClick={() => {
                filteredRiders.forEach(rider => {
                  futureEvents.forEach(event => {
                    const selection = riderEventSelections.find(sel => 
                      sel.riderId === rider.id && sel.eventId === event.id
                    );
                    if (!selection?.riderPreference) {
                      updateRiderPreference(event.id, rider.id, RiderEventPreference.EN_ATTENTE);
                    }
                  });
                });
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
            >
              ⏳ Marquer en attente
            </button>
            
            <button
              onClick={() => setPreferenceFilter('wants')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              👁️ Voir préférences
            </button>
            
            <button
              onClick={() => {
                const data = {
                  riders: filteredRiders.map(rider => ({
                    nom: `${rider.firstName} ${rider.lastName}`,
                    selections: futureEvents.map(event => {
                      const selection = riderEventSelections.find(sel => 
                        sel.riderId === rider.id && sel.eventId === event.id
                      );
                      return {
                        evenement: event.name,
                        preference: selection?.riderPreference || 'Aucune',
                        statut: selection?.status || 'Non sélectionné'
                      };
                    })
                  }))
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `selections-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              📥 Exporter
            </button>
          </div>
        </div>


      {/* Tableau principal - Focus sur l'essentiel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-w-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center">
                <TableCellsIcon className="w-6 h-6 mr-2" />
                Tableau de Pilotage des Sélections
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Gestion des souhaits et sélections - {filteredRiders.length} athlètes × {futureEvents.length} événements
              </p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 400px)' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Colonne Athlète avec tri */}
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <UserGroupIcon className="h-4 w-4" />
                      <span>Nom / Prénom</span>
                    </div>
                    
                    {/* Boutons de tri pour nom et prénom */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSort('lastName')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'lastName' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'
                        }`}
                      >
                        Nom
                        {sortField === 'lastName' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('firstName')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'firstName' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'
                        }`}
                      >
                        Prénom
                        {sortField === 'firstName' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </div>
                    
                    {/* Boutons de tri secondaires */}
                    <div className="flex space-x-2 pt-1 border-t border-gray-200">
                      <button
                        onClick={() => handleSort('age')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'age' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Âge
                        {sortField === 'age' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('profile')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Profil
                        {sortField === 'profile' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('raceDays')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'raceDays' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Jours de course
                        {sortField === 'raceDays' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </th>
                
                {/* Colonnes dynamiques pour chaque événement */}
                {futureEvents.map(event => {
                  const eventDate = new Date(event.date);
                  const isPlanningYear = getEventYear(event.date) === 2026;
                  const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
                  const selectedCount = getSelectedRidersCount(event.id);
                  const withinLimits = isWithinLimits(event.id);
                  
                  // Obtenir les titulaires pour cet événement
                  const titulaires = eventSelections
                    .filter(sel => sel.status === RiderEventStatus.TITULAIRE)
                    .map(sel => {
                      const rider = riders.find(r => r.id === sel.riderId);
                      return rider ? `${rider.firstName} ${rider.lastName}` : null;
                    })
                    .filter(name => name !== null);
                  
                  return (
                    <th key={event.id} className="px-3 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[240px] border-l border-gray-200">
                      <div className="flex flex-col items-center space-y-2">
                        <div className={`font-bold text-sm ${isPlanningYear ? 'text-blue-600' : 'text-gray-700'}`}>
                          {isPlanningYear && '📅 '}{event.name}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {formatEventDateRange(event)}
                        </div>
                        
                        {/* Limites de sélection */}
                        <div className="flex items-center space-x-2">
                          {event.minRiders || event.maxRiders ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              withinLimits ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {event.minRiders || 0}-{event.maxRiders || '∞'} coureurs
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Aucune limite</span>
                          )}
                        </div>
                        
                        {/* Compteur de sélections */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">Sélections</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            withinLimits ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedCount}
                          </span>
                        </div>
                        
                        {/* Liste des titulaires */}
                        {titulaires.length > 0 && (
                          <div className="w-full mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs font-semibold text-green-700 mb-1">
                              Titulaires ({titulaires.length})
                            </div>
                            <div className="max-h-32 overflow-y-auto text-left space-y-1">
                              {titulaires.map((name, index) => (
                                <div key={index} className="text-xs text-gray-700 bg-green-50 px-2 py-1 rounded">
                                  • {name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
                
                {/* Colonne Actions */}
                <th className="px-2 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50 z-20 border-l border-gray-200 w-32">
                  <div className="flex items-center space-x-1">
                    <Cog6ToothIcon className="h-4 w-4" />
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRiders.map((rider, index) => {
                return (
                  <tr key={rider.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    {/* Colonnes fixes pour les informations de base */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-12 w-12">
                          {rider.photoUrl ? (
                            <img className="h-12 w-12 rounded-full ring-2 ring-gray-200" src={rider.photoUrl} alt="" />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-gray-200">
                              <span className="text-white font-semibold text-sm">
                                {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {rider.firstName} {rider.lastName}
                          </div>
                          <div className="space-y-1 mt-1">
                            {/* Ligne 1: Âge et profil qualitatif */}
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {getAge(rider.birthDate)} ans
                              </span>
                              <span className="text-gray-300">•</span>
                              {rider.qualitativeProfile && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {rider.qualitativeProfile === RiderQualitativeProfile.GRIMPEUR && '🏔️ Grimpeur'}
                                  {rider.qualitativeProfile === RiderQualitativeProfile.ROULEUR && '🛣️ Rouleur'}
                                  {rider.qualitativeProfile === RiderQualitativeProfile.SPRINTEUR && '💨 Sprinteur'}
                                  {rider.qualitativeProfile === RiderQualitativeProfile.PUNCHEUR && '⚡ Puncheur'}
                                  {rider.qualitativeProfile === RiderQualitativeProfile.BAROUDEUR_PROFIL && '🌪️ Baroudeur'}
                                  {rider.qualitativeProfile === RiderQualitativeProfile.AUTRE && '🔧 Autre'}
                                </span>
                              )}
                            </div>
                            
                            {/* Ligne 2: Caractéristiques physiques */}
                            <div className="flex items-center space-x-2">
                              {rider.weightKg && rider.heightCm && (
                                <span className="text-xs text-gray-500">
                                  {rider.weightKg}kg • {rider.heightCm}cm
                                </span>
                              )}
                            </div>
                            
                            {/* Ligne 3: Jours de course */}
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                🏁 {getRiderRaceDays(rider.id)} jours
                                {getRiderPreselections(rider.id) > 0 && (
                                  <span className="ml-1 text-purple-600">
                                    ({getRiderPreselections(rider.id)} pré-sél.)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Colonnes dynamiques pour chaque événement */}
                    {futureEvents.map(event => {
                      const riderSelection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === rider.id);
                      const riderStatus = riderSelection?.status || null;
                      const riderPreference = riderSelection?.riderPreference || null;
                      const riderAvailability = riderSelection?.talentAvailability || null;
                      const withinLimits = isWithinLimits(event.id);
                      const selectedCount = getSelectedRidersCount(event.id);
                      const maxRiders = event.maxRiders;
                      
                      const isSelected = riderStatus !== null;
                      const isTitulaire = riderStatus === RiderEventStatus.TITULAIRE;
                      const isPreselection = riderStatus === RiderEventStatus.PRE_SELECTION;
                      const isRemplacant = riderStatus === RiderEventStatus.REMPLACANT;
                      
                      return (
                        <td key={event.id} className={`px-2 py-3 text-center text-sm border-l border-gray-200 min-w-[140px] ${
                          !withinLimits ? 'bg-red-50' : 'bg-white'
                        }`}>
                          <div className="space-y-2">
                            
                            {/* Indicateurs compacts en une ligne */}
                            <div className="space-y-1">
                              {/* Préférence */}
                              <div className="flex justify-center">
                                <span className="text-gray-400 text-xs"></span>
                              </div>
                              
                              {/* Disponibilité */}
                              <div className="flex justify-center">
                                <span className="text-gray-400 text-xs"></span>
                              </div>
                              
                              {/* Statut */}
                              <div className="flex justify-center">
                                <span className="text-gray-400 text-xs"></span>
                              </div>
                            </div>
                            
                            {/* Interface simplifiée pour les sélections */}
                            <div className="space-y-2">
                              {/* Statut actuel */}
                              {riderStatus && (
                                <div className={`text-xs px-2 py-1 rounded text-center font-medium ${
                                  riderStatus === RiderEventStatus.TITULAIRE ? 'bg-green-100 text-green-800' :
                                  riderStatus === RiderEventStatus.PRE_SELECTION ? 'bg-blue-100 text-blue-800' :
                                  riderStatus === RiderEventStatus.REMPLACANT ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {riderStatus === RiderEventStatus.TITULAIRE ? 'Titulaire' :
                                   riderStatus === RiderEventStatus.PRE_SELECTION ? 'Pré-sélection' :
                                   riderStatus === RiderEventStatus.REMPLACANT ? 'Remplaçant' : riderStatus}
                                </div>
                              )}
                              
                              {/* Sélecteur principal - Statut */}
                              <select
                                value={riderStatus || ''}
                                onChange={(e) => {
                                  const newStatus = e.target.value as RiderEventStatus;
                                  if (newStatus) {
                                    addRiderToEvent(event.id, rider.id, newStatus);
                                  } else {
                                    removeRiderFromEvent(event.id, rider.id);
                                  }
                                }}
                                className={`text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full ${
                                  maxRiders && selectedCount >= maxRiders && !isSelected
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-gray-300 bg-white'
                                }`}
                                disabled={maxRiders && selectedCount >= maxRiders && !isSelected}
                              >
                                <option value="">Non sélectionné</option>
                                <option value={RiderEventStatus.PRE_SELECTION}>Pré-sélection</option>
                                <option value={RiderEventStatus.TITULAIRE}>Titulaire</option>
                                <option value={RiderEventStatus.REMPLACANT}>Remplaçant</option>
                              </select>
                              
                              {/* Indicateur de limite */}
                              {maxRiders && (
                                <div className="text-xs text-gray-500">
                                  {selectedCount}/{maxRiders} coureurs
                                </div>
                              )}
                              
                              {/* Préférence de l'athlète */}
                              <select
                                value={riderPreference || ''}
                                onChange={(e) => {
                                  const newPreference = e.target.value as RiderEventPreference;
                                  if (newPreference) {
                                    updateRiderPreference(event.id, rider.id, newPreference);
                                  }
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white"
                              >
                                <option value="">Préférence</option>
                                <option value={RiderEventPreference.VEUT_PARTICIPER}>👍 Veut participer</option>
                                <option value={RiderEventPreference.OBJECTIFS_SPECIFIQUES}>🎯 Objectifs spécifiques</option>
                                <option value={RiderEventPreference.ABSENT}>❌ Absent</option>
                                <option value={RiderEventPreference.NE_VEUT_PAS}>🚫 Ne veut pas</option>
                                <option value={RiderEventPreference.EN_ATTENTE}>⏳ En attente</option>
                              </select>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    
                    {/* Colonne Actions - sticky à droite */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white z-10 border-l border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openRiderCalendar(rider)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-150"
                          title="Voir le calendrier prévisionnel"
                        >
                          <CalendarDaysIcon className="h-4 w-4 mr-1" />
                          Calendrier
                        </button>
                        <button
                          onClick={() => openRiderProfile(rider)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors duration-150"
                          title="Voir le profil complet"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Profil
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

      {/* Message si aucun événement futur */}
      {futureEvents.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <CalendarDaysIcon className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Aucun événement futur trouvé</h3>
          <p className="text-yellow-700 mb-4">
            Il n'y a actuellement aucun événement de course planifié pour les prochains mois.
          </p>
          <div className="text-sm text-yellow-600">
            <p>Pour ajouter des événements :</p>
            <p>1. Allez dans la section "Calendrier"</p>
            <p>2. Cliquez sur "Ajouter Événement"</p>
            <p>3. Créez vos événements avec des dates futures</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <SectionWrapper 
      title="Planning de Saison"
      actionButton={
        <ActionButton onClick={() => console.log('Add event')} icon={<CalendarDaysIcon className="w-5 h-5"/>}>
          Ajouter Événement
        </ActionButton>
      }
    >
      {/* Onglets de navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'overview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveView('rider-detail')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'rider-detail'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Détail par athlète
          </button>
          <button
            onClick={() => setActiveView('preferences')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'preferences'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Choix des athlètes
          </button>
        </div>
      </div>
      {activeView === 'overview' ? (
        viewMode === 'calendar' ? renderCalendarView() : renderOverviewView()
      ) : activeView === 'rider-detail' ? (
        renderRiderDetailView()
      ) : activeView === 'preferences' ? (
        renderPreferencesView()
      ) : null}
    </SectionWrapper>
  );
}

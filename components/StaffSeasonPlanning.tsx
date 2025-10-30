import React, { useState, useMemo } from 'react';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  Cog6ToothIcon,
  TrophyIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from './SectionWrapper';
import ActionButton from './ActionButton';
import { StaffMember, RaceEvent, User, AppState, StaffEventSelection, StaffEventStatus, StaffEventPreference, StaffAvailability } from '../types';
import { 
  getFutureEventsForStaff,
  getAvailableYearsForStaff,
  getStaffWorkDays,
  getStaffEventStatus,
  getStaffEventPreference,
  getStaffEventAvailability,
  addStaffToEvent,
  updateStaffPreference,
  updateStaffAvailability,
  filterStaff,
  sortStaff,
  getStaffStatusColor,
  getStaffPreferenceColor,
  getStaffAvailabilityColor
} from '../utils/staffPlanningUtils';
import StaffIndividualCalendar from './StaffIndividualCalendar';
import StaffGroupMonitoring from './StaffGroupMonitoring';

interface StaffSeasonPlanningProps {
  staff: StaffMember[];
  raceEvents: RaceEvent[];
  staffEventSelections: StaffEventSelection[];
  setStaffEventSelections: (updater: React.SetStateAction<StaffEventSelection[]>) => void;
  currentUser: User;
  appState: AppState;
  onOpenStaffModal?: (staff: StaffMember, initialTab?: string) => void;
  onAssignStaffToEvent?: (eventId: string, staffId: string, status: StaffEventStatus) => void;
  onOpenEventDetail?: (eventId: string) => void;
}

export default function StaffSeasonPlanning({ 
  staff, 
  raceEvents, 
  staffEventSelections,
  setStaffEventSelections,
  currentUser, 
  appState,
  onOpenStaffModal,
  onAssignStaffToEvent,
  onOpenEventDetail
}: StaffSeasonPlanningProps) {
  // Vérification plus permissive pour éviter le blocage
  if (!appState && !staff) {
    return <div>Chargement...</div>;
  }
  
  // Vérifications de sécurité
  if (!staff || !Array.isArray(staff)) {
    return <div>Erreur: Données du staff non disponibles</div>;
  }
  
  if (!raceEvents || !Array.isArray(raceEvents)) {
    return <div>Erreur: Données des événements non disponibles</div>;
  }
  
  if (!staffEventSelections || !Array.isArray(staffEventSelections)) {
    return <div>Erreur: Données des sélections non disponibles</div>;
  }

  // États pour la gestion des vues
  const [activeView, setActiveView] = useState<'overview' | 'staff-detail'>('overview');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [preferenceFilter, setPreferenceFilter] = useState<'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // États pour le tri
  const [sortField, setSortField] = useState<'name' | 'role' | 'status' | 'workDays'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // États pour les animations et feedbacks
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastAction, setLastAction] = useState<{type: string, member: string, event: string} | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // États pour les calendriers
  const [selectedStaffForCalendar, setSelectedStaffForCalendar] = useState<StaffMember | null>(null);
  const [showGroupMonitoring, setShowGroupMonitoring] = useState(false);
  const [openCellMenu, setOpenCellMenu] = useState<{ eventId: string; staffId: string } | null>(null);
  const [openHeaderMenuEventId, setOpenHeaderMenuEventId] = useState<string | null>(null);

  const isCellMenuOpen = (eventId: string, staffId: string) =>
    openCellMenu && openCellMenu.eventId === eventId && openCellMenu.staffId === staffId;

  const closeCellMenu = () => setOpenCellMenu(null);
  const toggleHeaderMenu = (eventId: string) =>
    setOpenHeaderMenuEventId(prev => (prev === eventId ? null : eventId));

  const bulkSetStatus = (eventId: string, newStatus: StaffEventStatus) => {
    filteredStaff.forEach(member => addStaffToEventHandler(eventId, member.id, newStatus));
    setOpenHeaderMenuEventId(null);
  };

  const bulkSetAvailability = (eventId: string, availability: StaffAvailability) => {
    filteredStaff.forEach(member => updateStaffAvailabilityHandler(eventId, member.id, availability));
    setOpenHeaderMenuEventId(null);
  };

  const bulkSetPreference = (eventId: string, preference: StaffEventPreference) => {
    filteredStaff.forEach(member => updateStaffPreferenceHandler(eventId, member.id, preference));
    setOpenHeaderMenuEventId(null);
  };

  // Parité coureurs: progression par colonne
  const getColumnProgress = (eventId: string) => {
    const total = filteredStaff.length || 0;
    if (total === 0) return { percent: 0, selected: 0 };
    const selected = filteredStaff.filter(m => getStaffEventStatusForEvent(eventId, m.id) === StaffEventStatus.SELECTIONNE).length;
    return { percent: Math.round((selected / total) * 100), selected };
  };

  // Parité coureurs: navigation clavier
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const onCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, rowIdx: number, colIdx: number, eventId: string, staffId: string) => {
    if (e.key === 'Enter') {
      setOpenCellMenu({ eventId, staffId });
      e.preventDefault();
    } else if (e.key === 'Escape') {
      closeCellMenu();
    } else if (e.key === 'ArrowRight') {
      setFocusedCell({ row: rowIdx, col: colIdx + 1 });
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      setFocusedCell({ row: rowIdx, col: Math.max(0, colIdx - 1) });
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      setFocusedCell({ row: rowIdx + 1, col: colIdx });
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setFocusedCell({ row: Math.max(0, rowIdx - 1), col: colIdx });
      e.preventDefault();
    }
  };

  // Filtrer les événements futurs
  const futureEvents = useMemo(() => {
    return getFutureEventsForStaff(raceEvents, selectedYear);
  }, [raceEvents, selectedYear]);

  // Obtenir les années disponibles
  const availableYears = useMemo(() => {
    return getAvailableYearsForStaff(raceEvents);
  }, [raceEvents]);

  // Fonction pour calculer le nombre de jours de travail prévu pour un membre du staff
  const getStaffWorkDaysCount = (staffId: string) => {
    return getStaffWorkDays(staffId, staffEventSelections, futureEvents);
  };

  // Fonction de tri des membres du staff
  const sortStaffMembers = (staffMembers: StaffMember[]) => {
    return sortStaff(staffMembers, sortField, sortDirection, getStaffWorkDaysCount);
  };

  // Filtrer et trier les membres du staff
  const filteredStaff = useMemo(() => {
    const filtered = filterStaff(
      staff, 
      searchTerm, 
      roleFilter, 
      statusFilter, 
      preferenceFilter, 
      staffEventSelections
    );
    
    // Appliquer le tri
    return sortStaffMembers(filtered);
  }, [staff, searchTerm, roleFilter, statusFilter, preferenceFilter, staffEventSelections, sortField, sortDirection]);

  // Fonction pour obtenir le statut d'un membre du staff pour un événement
  const getStaffEventStatusForEvent = (eventId: string, staffId: string): StaffEventStatus | null => {
    return getStaffEventStatus(eventId, staffId, staffEventSelections);
  };

  // Fonction pour obtenir la préférence d'un membre du staff pour un événement
  const getStaffEventPreferenceForEvent = (eventId: string, staffId: string): StaffEventPreference | null => {
    return getStaffEventPreference(eventId, staffId, staffEventSelections);
  };

  // Fonction pour obtenir la disponibilité d'un membre du staff pour un événement
  const getStaffEventAvailabilityForEvent = (eventId: string, staffId: string): StaffAvailability | null => {
    return getStaffEventAvailability(eventId, staffId, staffEventSelections);
  };

  // Fonction pour ajouter un membre du staff à un événement avec feedback
  const addStaffToEventHandler = (eventId: string, staffId: string, status: StaffEventStatus = StaffEventStatus.PRE_SELECTION) => {
    addStaffToEvent(eventId, staffId, status, staffEventSelections, setStaffEventSelections);
    if (onAssignStaffToEvent) {
      onAssignStaffToEvent(eventId, staffId, status);
    }
    
    // Feedback visuel
    const member = staff.find(s => s.id === staffId);
    const event = futureEvents.find(e => e.id === eventId);
    setLastAction({
      type: status,
      member: member?.name || 'Membre',
      event: event?.name || 'Événement'
    });
    
    // Animation de succès
    setTimeout(() => setLastAction(null), 2000);
  };

  // Fonction pour mettre à jour la préférence d'un membre du staff
  const updateStaffPreferenceHandler = (eventId: string, staffId: string, preference: StaffEventPreference) => {
    updateStaffPreference(eventId, staffId, preference, staffEventSelections, setStaffEventSelections);
  };

  // Fonction pour mettre à jour la disponibilité d'un membre du staff
  const updateStaffAvailabilityHandler = (eventId: string, staffId: string, availability: StaffAvailability) => {
    updateStaffAvailability(eventId, staffId, availability, staffEventSelections, setStaffEventSelections);
  };

  // Fonction pour optimiser automatiquement les sélections avec animations
  const optimizeStaffSelections = async () => {
    setIsOptimizing(true);
    setShowSuccessMessage(false);
    
    console.log('🔧 Optimisation des sélections du staff...');
    
    let optimizationsCount = 0;
    
    // Pour chaque événement, optimiser les sélections avec délai pour l'animation
    for (const event of futureEvents) {
      for (const member of staff) {
        const currentStatus = getStaffEventStatusForEvent(event.id, member.id);
        const currentAvailability = getStaffEventAvailabilityForEvent(event.id, member.id);
        const currentPreference = getStaffEventPreferenceForEvent(event.id, member.id);
        
        // Logique d'optimisation intelligente
        if (currentAvailability === StaffAvailability.DISPONIBLE) {
          if (currentPreference === StaffEventPreference.VEUT_PARTICIPER) {
            // Staff disponible et veut participer → Sélectionner
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.SELECTIONNE);
            optimizationsCount++;
          } else if (currentPreference === StaffEventPreference.OBJECTIFS_SPECIFIQUES) {
            // Staff disponible avec objectifs spécifiques → Pré-sélectionner
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.PRE_SELECTION);
            optimizationsCount++;
          } else if (!currentStatus) {
            // Staff disponible sans préférence → Pré-sélectionner
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.PRE_SELECTION);
            optimizationsCount++;
          }
        } else if (currentAvailability === StaffAvailability.PARTIELLEMENT_DISPONIBLE) {
          if (currentPreference === StaffEventPreference.VEUT_PARTICIPER) {
            // Staff partiellement disponible mais veut participer → Pré-sélectionner
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.PRE_SELECTION);
            optimizationsCount++;
          }
        } else if (currentAvailability === StaffAvailability.INDISPONIBLE) {
          // Staff indisponible → Retirer
          if (currentStatus) {
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.NON_SELECTIONNE);
            optimizationsCount++;
          }
        } else if (currentPreference === StaffEventPreference.NE_VEUT_PAS || 
                   currentPreference === StaffEventPreference.ABSENT) {
          // Staff ne veut pas ou absent → Retirer
          if (currentStatus) {
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.NON_SELECTIONNE);
            optimizationsCount++;
          }
        }
        
        // Petit délai pour l'animation
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    setIsOptimizing(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
    
    console.log(`✅ Optimisation terminée ! ${optimizationsCount} sélections optimisées.`);
  };

  // Fonction pour gérer le tri
  const handleSort = (field: 'name' | 'role' | 'status' | 'workDays') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fonction pour ouvrir la modal de détail d'un membre du staff
  const openStaffModal = (staffMember: StaffMember) => {
    if (onOpenStaffModal) {
      onOpenStaffModal(staffMember, 'planning');
    }
  };

  return (
    <SectionWrapper 
      title="Planning de Saison - Staff"
    >
      <div className="space-y-6 w-full max-w-full overflow-hidden">
        {/* Message de succès */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 animate-bounce">
            <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-semibold">Optimisation terminée ! 🎉</span>
            </div>
          </div>
        )}
        
        
        {/* Feedback de dernière action */}
        {lastAction && (
          <div className="fixed top-20 right-4 z-50 animate-pulse">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
              {lastAction.member} {lastAction.type === 'SELECTIONNE' ? 'sélectionné' : 'pré-sélectionné'} pour {lastAction.event}
            </div>
          </div>
        )}
        
        {/* Contrôles de filtrage et tri - Version compacte */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
            {/* Recherche */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un membre du staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sélecteur d'année */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Année :</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="MANAGER">Manager</option>
                  <option value="DS">Directeur Sportif</option>
                  <option value="ASSISTANT">Assistant(e)</option>
                  <option value="MECANO">Mécanicien</option>
                  <option value="COMMUNICATION">Communication</option>
                  <option value="MEDECIN">Médecin</option>
                  <option value="KINE">Kinésithérapeute</option>
                  <option value="RESP_PERF">Responsable Performance</option>
                  <option value="ENTRAINEUR">Entraîneur</option>
                  <option value="DATA_ANALYST">Data Analyste</option>
                  <option value="PREPA_PHYSIQUE">Préparateur Physique</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Préférence</label>
                <select
                  value={preferenceFilter}
                  onChange={(e) => setPreferenceFilter(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les préférences</option>
                  <option value="wants">Veut participer</option>
                  <option value="objectives">Objectifs spécifiques</option>
                  <option value="waiting">En attente</option>
                  <option value="unavailable">Indisponible</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tri</label>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleSort('name')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      sortField === 'name' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Nom {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSort('workDays')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      sortField === 'workDays' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Jours {sortField === 'workDays' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Légende compacte */}
      <div className="mt-2 text-xs text-gray-600 flex flex-wrap items-center gap-3">
        <span className="font-semibold text-gray-700">Légende:</span>
        <span className="inline-flex items-center gap-1"><span className="text-green-600">✅</span> Disponible</span>
        <span className="inline-flex items-center gap-1"><span className="text-yellow-600">⚠️</span> Partiel</span>
        <span className="inline-flex items-center gap-1"><span className="text-red-600">❌</span> Indispo</span>
        <span className="inline-flex items-center gap-1"><span className="text-orange-600">❓</span> À confirmer</span>
        <span className="inline-flex items-center gap-1"><span>🚀</span> Veut participer</span>
        <span className="inline-flex items-center gap-1"><span>🎯</span> Objectifs</span>
        <span className="inline-flex items-center gap-1"><span>⏳</span> Pré-sél.</span>
        <span className="inline-flex items-center gap-1"><span>✓</span> Sélectionné</span>
      </div>

      {/* Message si aucun événement futur */}
      {futureEvents.length === 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 text-sm">
          Aucun événement futur pour l'année sélectionnée. Modifiez l'année ou ajoutez des événements à venir dans le calendrier.
        </div>
      )}

        {/* Version mobile - Cartes compactes */}
        <div className="block md:hidden max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="space-y-4">
          {filteredStaff.map((member) => (
            <div key={member.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{member.role || 'AUTRE'}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedStaffForCalendar(member)}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Calendrier"
                  >
                    <CalendarDaysIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openStaffModal(member)}
                    className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Profil"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Événements en version mobile */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 mb-2">Événements :</div>
                {futureEvents.slice(0, 3).map(event => {
                  const status = getStaffEventStatusForEvent(event.id, member.id);
                  const preference = getStaffEventPreferenceForEvent(event.id, member.id);
                  const availability = getStaffEventAvailabilityForEvent(event.id, member.id);
                  
                  return (
                    <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{event.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs px-2 py-1 rounded ${getStaffStatusColor(status)}`}>
                          {status ? (status === 'SELECTIONNE' ? '✓' : status === 'PRE_SELECTION' ? '⏳' : '✗') : '○'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {futureEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{futureEvents.length - 3} autres événements
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Tableau principal - Version desktop */}
        <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden w-full max-w-full">
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="table-container">
              <table className="divide-y divide-gray-200" style={{ minWidth: '600px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[240px]">
                    <div className="flex items-center space-x-2">
                      <UserGroupIcon className="w-4 h-4" />
                      <span>Staff</span>
                    </div>
                  </th>
                  <th className="px-2 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Rôle
                  </th>
                  <th className="px-2 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    Jours
                  </th>
                  {futureEvents.map(event => (
                    <th key={event.id} className="px-2 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] max-w-[220px]">
                      <div className="flex flex-col items-center space-y-1 relative">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenEventDetail && onOpenEventDetail(event.id)}
                            className="truncate text-xs font-semibold hover:underline hover:text-blue-600"
                            title={`${event.name} – ouvrir le détail`}
                          >
                            {event.name.length > 12 ? event.name.substring(0, 12) + '…' : event.name}
                          </button>
                          <button
                            onClick={() => toggleHeaderMenu(event.id)}
                            className="px-1.5 py-0.5 border rounded text-[11px] hover:bg-gray-50"
                            title="Actions de colonne"
                          >
                            …
                          </button>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>

                        {/* Barre de progression sélection (parité coureurs) */}
                        {(() => { const p = getColumnProgress(event.id); return (
                          <div className="w-20 h-1.5 bg-gray-200 rounded overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${p.percent}%` }} />
                          </div>
                        ); })()}

                        {openHeaderMenuEventId === event.id && (
                          <div className="absolute top-7 z-30 w-56 bg-white border border-gray-200 rounded-md shadow-lg text-left p-2">
                            <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">Appliquer à toute la colonne</div>
                            <div className="text-[12px] text-gray-600 px-1 py-1">Disponibilité</div>
                            <div className="grid grid-cols-4 gap-1 mb-2">
                              <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => bulkSetAvailability(event.id, 'DISPONIBLE' as any)}>✅</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border hover:border-yellow-200" onClick={() => bulkSetAvailability(event.id, 'PARTIELLEMENT_DISPONIBLE' as any)}>⚠️</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => bulkSetAvailability(event.id, 'INDISPONIBLE' as any)}>❌</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border hover:border-orange-200" onClick={() => bulkSetAvailability(event.id, 'A_CONFIRMER' as any)}>❓</button>
                            </div>

                            <div className="text-[12px] text-gray-600 px-1 py-1">Préférence</div>
                            <div className="grid grid-cols-4 gap-1 mb-2">
                              <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => bulkSetPreference(event.id, 'VEUT_PARTICIPER' as any)}>🚀</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border hover:border-yellow-200" onClick={() => bulkSetPreference(event.id, 'EN_ATTENTE' as any)}>⏳</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => bulkSetPreference(event.id, 'NE_VEUT_PAS' as any)}>👎</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-gray-50 border hover:border-gray-200" onClick={() => bulkSetPreference(event.id, 'ABSENT' as any)}>🚫</button>
                            </div>

                            <div className="text-[12px] text-gray-600 px-1 py-1">Statut</div>
                            <div className="grid grid-cols-3 gap-1">
                              <button className="text-xs px-2 py-1 rounded hover:bg-blue-50 border hover:border-blue-200" onClick={() => bulkSetStatus(event.id, 'PRE_SELECTION' as any)}>⏳ Pré-sél.</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => bulkSetStatus(event.id, 'SELECTIONNE' as any)}>✓ Sélec.</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => bulkSetStatus(event.id, 'NON_SELECTIONNE' as any)}>✗ Retiré</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-3 py-5 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white">
                                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                              </span>
                            </div>
                          </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 truncate"
                               onClick={() => openStaffModal(member)}
                               title={`${member.firstName} ${member.lastName}`}>
                              {member.firstName} {member.lastName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{member.email}</div>
                        </div>
                        <button
                          onClick={() => setSelectedStaffForCalendar(member)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir le calendrier individuel"
                        >
                          <CalendarDaysIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {member.role || 'AUTRE'}
                      </span>
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {getStaffWorkDaysCount(member.id)}
                      </span>
                    </td>
                    {futureEvents.map((event, colIdx) => {
                      const status = getStaffEventStatusForEvent(event.id, member.id);
                      const preference = getStaffEventPreferenceForEvent(event.id, member.id);
                      const availability = getStaffEventAvailabilityForEvent(event.id, member.id);
                      const availabilityLabel = availability === 'DISPONIBLE' ? 'Disponible' :
                        availability === 'PARTIELLEMENT_DISPONIBLE' ? 'Partiel' :
                        availability === 'INDISPONIBLE' ? 'Indispo' :
                        availability === 'A_CONFIRMER' ? 'À confirmer' : 'N/A';
                      const preferenceLabel = preference === 'VEUT_PARTICIPER' ? 'Veut participer' :
                        preference === 'OBJECTIFS_SPECIFIQUES' ? 'Objectifs' :
                        preference === 'EN_ATTENTE' ? 'En attente' :
                        preference === 'NE_VEUT_PAS' ? 'Ne veut pas' :
                        preference === 'ABSENT' ? 'Absent' : 'N/A';
                      const statusLabel = status === 'SELECTIONNE' ? 'Sélectionné' :
                        status === 'PRE_SELECTION' ? 'Pré-sélection' :
                        status === 'NON_SELECTIONNE' ? 'Retiré' : 'Non sélectionné';
                      
                      return (
                        <td key={event.id} className="px-2 py-4 text-center border-l border-gray-200 min-w-[180px] max-w-[220px]">
                          <div
                            className="relative outline-none"
                            tabIndex={0}
                            onFocus={() => setFocusedCell({ row: filteredStaff.findIndex(s => s.id === member.id), col: colIdx })}
                            onKeyDown={(e) => onCellKeyDown(e, filteredStaff.findIndex(s => s.id === member.id), colIdx, event.id, member.id)}
                          >
                            {/* Deux menus déroulants lisibles */}
                            <div className="flex flex-col items-stretch gap-2">
                              <select
                                value={preference || ''}
                                onChange={(e) => updateStaffPreferenceHandler(event.id, member.id, e.target.value as StaffEventPreference)}
                                className={`w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 transition-all duration-200 ${
                                  preference === 'VEUT_PARTICIPER' ? 'border-green-300 bg-green-50 focus:ring-green-500' :
                                  preference === 'EN_ATTENTE' ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-500' :
                                  preference === 'NE_VEUT_PAS' ? 'border-red-300 bg-red-50 focus:ring-red-500' :
                                  preference === 'ABSENT' ? 'border-gray-300 bg-gray-50 focus:ring-gray-500' : 'border-gray-300 bg-white focus:ring-purple-500'
                                }`}
                                title="Préférence"
                              >
                                <option value="">🎯 Préférence</option>
                                <option value={StaffEventPreference.VEUT_PARTICIPER}>🚀 Veut participer</option>
                                <option value={StaffEventPreference.EN_ATTENTE}>⏳ En attente</option>
                                <option value={StaffEventPreference.NE_VEUT_PAS}>👎 Ne veut pas</option>
                                <option value={StaffEventPreference.ABSENT}>🚫 Absent</option>
                              </select>

                              <select
                                value={status || ''}
                                onChange={(e) => {
                                  const newStatus = e.target.value as StaffEventStatus;
                                  if (newStatus) {
                                    addStaffToEventHandler(event.id, member.id, newStatus);
                                  } else {
                                    addStaffToEventHandler(event.id, member.id, StaffEventStatus.NON_SELECTIONNE);
                                  }
                                }}
                                className={`w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 transition-all duration-200 ${
                                  status === StaffEventStatus.SELECTIONNE ? 'border-green-300 bg-green-50 focus:ring-green-500' :
                                  status === StaffEventStatus.PRE_SELECTION ? 'border-blue-300 bg-blue-50 focus:ring-blue-500' :
                                  status === StaffEventStatus.NON_SELECTIONNE ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-300 bg-white focus:ring-gray-500'
                                }`}
                                title="Statut"
                              >
                                <option value="">○ Statut</option>
                                <option value={StaffEventStatus.PRE_SELECTION}>⏳ Pré-sélection</option>
                                <option value={StaffEventStatus.SELECTIONNE}>✓ Sélectionné</option>
                                <option value={StaffEventStatus.NON_SELECTIONNE}>✗ Retiré</option>
                              </select>
                            </div>

                            {/* Menu contextuel */}
                            {isCellMenuOpen(event.id, member.id) && (
                              <div className="absolute z-30 mt-2 left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-left p-2">
                                <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">Disponibilité</div>
                                <div className="grid grid-cols-4 gap-1 mb-2">
                                  <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border border-transparent hover:border-green-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'DISPONIBLE' as any); closeCellMenu(); }}>✅</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border border-transparent hover:border-yellow-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'PARTIELLEMENT_DISPONIBLE' as any); closeCellMenu(); }}>⚠️</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border border-transparent hover:border-red-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'INDISPONIBLE' as any); closeCellMenu(); }}>❌</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border border-transparent hover:border-orange-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'A_CONFIRMER' as any); closeCellMenu(); }}>❓</button>
                                </div>

                                <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">Préférence</div>
                                <div className="grid grid-cols-5 gap-1 mb-2">
                                  <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => { updateStaffPreferenceHandler(event.id, member.id, 'VEUT_PARTICIPER' as any); closeCellMenu(); }}>🚀</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-blue-50 border hover:border-blue-200" onClick={() => { updateStaffPreferenceHandler(event.id, member.id, 'OBJECTIFS_SPECIFIQUES' as any); closeCellMenu(); }}>🎯</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border hover:border-yellow-200" onClick={() => { updateStaffPreferenceHandler(event.id, member.id, 'EN_ATTENTE' as any); closeCellMenu(); }}>⏳</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => { updateStaffPreferenceHandler(event.id, member.id, 'NE_VEUT_PAS' as any); closeCellMenu(); }}>👎</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-gray-50 border hover:border-gray-200" onClick={() => { updateStaffPreferenceHandler(event.id, member.id, 'ABSENT' as any); closeCellMenu(); }}>🚫</button>
                                </div>

                                <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">Statut</div>
                                <div className="grid grid-cols-3 gap-1">
                                  <button className="text-xs px-2 py-1 rounded hover:bg-blue-50 border hover:border-blue-200" onClick={() => { addStaffToEventHandler(event.id, member.id, 'PRE_SELECTION' as any); closeCellMenu(); }}>⏳ Pré-sél.</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => { addStaffToEventHandler(event.id, member.id, 'SELECTIONNE' as any); closeCellMenu(); }}>✓ Sélec.</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => { addStaffToEventHandler(event.id, member.id, 'NON_SELECTIONNE' as any); closeCellMenu(); }}>✗ Retiré</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
        

        {/* Statistiques supprimées sur demande */}
      </div>
      
      {/* Calendrier individuel */}
      {selectedStaffForCalendar && (
        <StaffIndividualCalendar
          staffMember={selectedStaffForCalendar}
          raceEvents={raceEvents}
          staffEventSelections={staffEventSelections}
          onClose={() => setSelectedStaffForCalendar(null)}
          onOpenEvent={onOpenEventDetail}
        />
      )}
      
      {/* Monitoring de groupe */}
      {showGroupMonitoring && (
        <StaffGroupMonitoring
          staff={staff}
          raceEvents={raceEvents}
          staffEventSelections={staffEventSelections}
          onClose={() => setShowGroupMonitoring(false)}
          onViewIndividualCalendar={(staffMember) => {
            setShowGroupMonitoring(false);
            setSelectedStaffForCalendar(staffMember);
          }}
        />
      )}
    </SectionWrapper>
  );
}

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
  CheckCircleIcon,
  TableCellsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import SectionWrapper from './SectionWrapper';
import ActionButton from './ActionButton';
import { StaffMember, RaceEvent, User, AppState, StaffEventSelection, StaffEventStatus, StaffAvailability } from '../types';
import { getStaffRoleDisplayLabel, getStaffRoleKey, STAFF_ROLE_KEYS } from '../utils/staffRoleUtils';
import { 
  getStrictFutureEventsForStaff,
  getEventsForSelectedYear,
  getAvailableYearsForStaff,
  getStaffWorkDays,
  getStaffEventStatus,
  getStaffEventAvailability,
  addStaffToEvent,
  updateStaffAvailability,
  filterStaff,
  sortStaff,
  getStaffStatusColor,
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
  const [planningViewMode, setPlanningViewMode] = useState<'table' | 'cards'>('table');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
  const [openRowMenuStaffId, setOpenRowMenuStaffId] = useState<string | null>(null);
  const [hidePastEvents, setHidePastEvents] = useState(true);
  const [compactTable, setCompactTable] = useState(false);

  const isCellMenuOpen = (eventId: string, staffId: string) =>
    openCellMenu && openCellMenu.eventId === eventId && openCellMenu.staffId === staffId;

  const closeCellMenu = () => setOpenCellMenu(null);
  const toggleHeaderMenu = (eventId: string) =>
    setOpenHeaderMenuEventId(prev => (prev === eventId ? null : eventId));
  const toggleRowMenu = (staffId: string) =>
    setOpenRowMenuStaffId(prev => (prev === staffId ? null : staffId));

  const bulkSetStatus = (eventId: string, newStatus: StaffEventStatus) => {
    filteredStaff.forEach(member => addStaffToEventHandler(eventId, member.id, newStatus));
    setOpenHeaderMenuEventId(null);
  };

  const bulkSetAvailability = (eventId: string, availability: StaffAvailability) => {
    filteredStaff.forEach(member => updateStaffAvailabilityHandler(eventId, member.id, availability));
    setOpenHeaderMenuEventId(null);
  };


  const rowSetStatus = (staffId: string, newStatus: StaffEventStatus) => {
    displayEvents.forEach(ev => addStaffToEventHandler(ev.id, staffId, newStatus));
    setOpenRowMenuStaffId(null);
  };

  const rowSetAvailability = (staffId: string, availability: StaffAvailability) => {
    displayEvents.forEach(ev => updateStaffAvailabilityHandler(ev.id, staffId, availability));
    setOpenRowMenuStaffId(null);
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

  // Filtrer les événements futurs (date >= aujourd'hui, comme pour les athlètes)
  const futureEvents = useMemo(() => {
    return getStrictFutureEventsForStaff(raceEvents, selectedYear);
  }, [raceEvents, selectedYear]);

  // Tous les événements de l'année sélectionnée (pour l'option "afficher les passés")
  const eventsForSelectedYear = useMemo(() => {
    return getEventsForSelectedYear(raceEvents, selectedYear);
  }, [raceEvents, selectedYear]);

  // Liste affichée : sans les passés si l'option est cochée (comme pour les athlètes)
  const displayEvents = useMemo(() => {
    return hidePastEvents ? futureEvents : eventsForSelectedYear;
  }, [hidePastEvents, futureEvents, eventsForSelectedYear]);

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
      'all',
      staffEventSelections,
      getStaffRoleKey
    );
    return sortStaffMembers(filtered);
  }, [staff, searchTerm, roleFilter, statusFilter, staffEventSelections, sortField, sortDirection]);

  // Fonction pour obtenir le statut d'un membre du staff pour un événement
  const getStaffEventStatusForEvent = (eventId: string, staffId: string): StaffEventStatus | null => {
    return getStaffEventStatus(eventId, staffId, staffEventSelections);
  };

  // Fonction pour obtenir la disponibilité d'un membre du staff pour un événement
  const getStaffEventAvailabilityForEvent = (eventId: string, staffId: string): StaffAvailability | null => {
    return getStaffEventAvailability(eventId, staffId, staffEventSelections);
  };

  // Fonction pour ajouter un membre du staff à un événement avec feedback
  const addStaffToEventHandler = (eventId: string, staffId: string, status: StaffEventStatus = StaffEventStatus.SELECTIONNE) => {
    addStaffToEvent(eventId, staffId, status, staffEventSelections, setStaffEventSelections);
    if (onAssignStaffToEvent) {
      onAssignStaffToEvent(eventId, staffId, status);
    }
    
    // Feedback visuel
    const member = staff.find(s => s.id === staffId);
    const event = displayEvents.find(e => e.id === eventId);
    setLastAction({
      type: status,
      member: member?.name || 'Membre',
      event: event?.name || 'Événement'
    });
    
    // Animation de succès
    setTimeout(() => setLastAction(null), 2000);
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
        // Logique binaire :
        // - Dispo => déplacement Oui
        // - Indispo => déplacement Non
        if (currentAvailability === StaffAvailability.DISPONIBLE) {
          if (currentStatus !== StaffEventStatus.SELECTIONNE) {
            addStaffToEventHandler(event.id, member.id, StaffEventStatus.SELECTIONNE);
            optimizationsCount++;
          }
        } else if (currentAvailability === StaffAvailability.INDISPONIBLE) {
          // Staff indisponible → Retirer
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
    
    console.log(`Optimisation terminée ! ${optimizationsCount} sélections optimisées.`);
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

  const getAvailabilityShort = (availability: StaffAvailability | null) => {
    if (availability === 'DISPONIBLE') return 'Dispo';
    if (availability === 'PARTIELLEMENT_DISPONIBLE') return 'Partiel';
    if (availability === 'INDISPONIBLE') return 'Indispo';
    if (availability === 'A_CONFIRMER') return 'Conf.';
    return '—';
  };

  const getStatusShort = (status: StaffEventStatus | null) => {
    if (status === StaffEventStatus.SELECTIONNE) return 'Oui';
    if (status === StaffEventStatus.NON_SELECTIONNE) return 'Non';
    return '—';
  };

  const getStatusChar = (status: StaffEventStatus | null) => {
    if (status === StaffEventStatus.SELECTIONNE) return '✓';
    if (status === StaffEventStatus.NON_SELECTIONNE) return '×';
    return '○';
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
              <span className="font-semibold">Optimisation terminée !</span>
            </div>
          </div>
        )}
        
        
        {/* Feedback de dernière action */}
        {lastAction && (
          <div className="fixed top-20 right-4 z-50 animate-pulse">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
              {lastAction.member} {lastAction.type === 'SELECTIONNE' ? 'sélectionné' : 'retiré'} pour {lastAction.event}
            </div>
          </div>
        )}
        
        {/* Contrôles de filtrage et tri - Version compacte */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="space-y-3">
            {/* Ligne 1 : recherche + vues */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Rechercher un membre du staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Vue Tableau / Cartes */}
                <div className="flex items-center gap-1 border border-gray-200 rounded-md p-0.5 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setPlanningViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      planningViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Vue Tableau"
                  >
                    <TableCellsIcon className="w-4 h-4" />
                    Tableau
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanningViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      planningViewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Vue Cartes"
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                    Cartes
                  </button>
                </div>

                {/* Densité tableau */}
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={compactTable}
                    onChange={(e) => setCompactTable(e.target.checked)}
                    className="h-4 w-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                  />
                  <span className="text-sm text-gray-700">Mode compact</span>
                </label>
              </div>
            </div>

            {/* Ligne 2 : filtres (wrap propre) */}
            <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Rôle</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                  title="Filtrer par rôle"
                >
                  <option value="all">Tous les rôles</option>
                  {STAFF_ROLE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getStaffRoleDisplayLabel(key)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Année</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                >
                  <option value="all">Toutes</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hidePastEvents}
                  onChange={(e) => setHidePastEvents(e.target.checked)}
                  className="h-4 w-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                />
                <span className="text-sm text-gray-700">Masquer les événements passés</span>
              </label>
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
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Dispo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" /> Partiel
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Indispo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" /> Conf.
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Oui</span> Veut participer
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Obj.</span> Objectifs
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">Sel</span> Sélectionné
        </span>
      </div>

      {/* Message si aucun événement à afficher */}
      {displayEvents.length === 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 text-sm">
          {hidePastEvents
            ? "Aucun événement futur pour l'année sélectionnée. Modifiez l'année, cochez « Afficher les événements passés » ou ajoutez des événements à venir dans le calendrier."
            : "Aucun événement pour l'année sélectionnée."}
        </div>
      )}

        {/* Vue Cartes */}
        <div className={`${planningViewMode === 'cards' ? 'block' : 'hidden'} max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100`}>
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
                    <div className="text-xs text-gray-500">{getStaffRoleDisplayLabel(member.role) || 'Autre'}</div>
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
                {displayEvents.slice(0, 3).map(event => {
                  const status = getStaffEventStatusForEvent(event.id, member.id);
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
                          {status ? (status === 'SELECTIONNE' ? 'Sel' : 'Ret') : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {displayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{displayEvents.length - 3} autres événements
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Vue Tableau */}
        <div className={`${planningViewMode === 'table' ? 'block' : 'hidden'} bg-white rounded-lg border border-gray-200 overflow-hidden w-full max-w-full`}>
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="overflow-x-auto">
              <table className="divide-y divide-gray-200 w-max min-w-full" style={{ minWidth: '760px' }}>
              <thead className="bg-gray-50 sticky top-0 z-30">
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
                  {displayEvents.map(event => (
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
                              <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => bulkSetAvailability(event.id, 'DISPONIBLE' as any)}>Dispo</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border hover:border-yellow-200" onClick={() => bulkSetAvailability(event.id, 'PARTIELLEMENT_DISPONIBLE' as any)}>Partiel</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => bulkSetAvailability(event.id, 'INDISPONIBLE' as any)}>Indispo</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border hover:border-orange-200" onClick={() => bulkSetAvailability(event.id, 'A_CONFIRMER' as any)}>Conf.</button>
                            </div>

                              <div className="text-[12px] text-gray-600 px-1 py-1">Déplacement</div>
                              <div className="grid grid-cols-2 gap-1">
                                <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => bulkSetStatus(event.id, 'SELECTIONNE' as any)}>Oui</button>
                                <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => bulkSetStatus(event.id, 'NON_SELECTIONNE' as any)}>Non</button>
                              </div>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member, rowIdx) => (
                  <tr key={member.id} className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-gray-100/60 transition-colors`}>
                    <td className={`px-3 whitespace-nowrap sticky left-0 z-10 border-r border-gray-200 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} ${compactTable ? 'py-3' : 'py-5'}`}>
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
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedStaffForCalendar(member)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir le calendrier individuel"
                          >
                            <CalendarDaysIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowMenu(member.id)}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actions de ligne"
                          >
                            …
                          </button>
                        </div>
                      </div>

                      {openRowMenuStaffId === member.id && (
                        <div className="absolute mt-1 left-3 z-30 w-64 bg-white border border-gray-200 rounded-md shadow-lg text-left p-2">
                          <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">
                            Appliquer à toute la ligne
                          </div>

                          <div className="text-[12px] text-gray-600 px-1 py-1">Disponibilité</div>
                          <div className="grid grid-cols-4 gap-1 mb-2">
                            <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => rowSetAvailability(member.id, 'DISPONIBLE' as any)}>Dispo</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border hover:border-yellow-200" onClick={() => rowSetAvailability(member.id, 'PARTIELLEMENT_DISPONIBLE' as any)}>Partiel</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => rowSetAvailability(member.id, 'INDISPONIBLE' as any)}>Indispo</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border hover:border-orange-200" onClick={() => rowSetAvailability(member.id, 'A_CONFIRMER' as any)}>Conf.</button>
                          </div>

                          <div className="text-[12px] text-gray-600 px-1 py-1">Déplacement</div>
                          <div className="grid grid-cols-2 gap-1">
                            <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => rowSetStatus(member.id, 'SELECTIONNE' as any)}>Oui</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => rowSetStatus(member.id, 'NON_SELECTIONNE' as any)}>Non</button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={`px-2 whitespace-nowrap text-center ${compactTable ? 'py-3' : 'py-5'}`}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getStaffRoleDisplayLabel(member.role) || 'Autre'}
                      </span>
                    </td>
                    <td className={`px-2 whitespace-nowrap text-center ${compactTable ? 'py-3' : 'py-5'}`}>
                      <span className="text-sm font-medium text-gray-900">
                        {getStaffWorkDaysCount(member.id)}
                      </span>
                    </td>
                    {displayEvents.map((event, colIdx) => {
                      const status = getStaffEventStatusForEvent(event.id, member.id);
                      const availability = getStaffEventAvailabilityForEvent(event.id, member.id);
                      const availabilityLabel = availability === 'DISPONIBLE' ? 'Disponible' :
                        availability === 'PARTIELLEMENT_DISPONIBLE' ? 'Partiel' :
                        availability === 'INDISPONIBLE' ? 'Indispo' :
                        availability === 'A_CONFIRMER' ? 'À confirmer' : 'N/A';
                      const statusLabel = status === 'SELECTIONNE' ? 'Oui' :
                        status === 'NON_SELECTIONNE' ? 'Non' : '—';
                      
                      return (
                        <td key={event.id} className="px-2 py-4 text-center border-l border-gray-200 min-w-[180px] max-w-[220px]">
                          <div
                            className="relative outline-none"
                            tabIndex={0}
                            onFocus={() => setFocusedCell({ row: rowIdx, col: colIdx })}
                            onKeyDown={(e) => onCellKeyDown(e, rowIdx, colIdx, event.id, member.id)}
                          >
                            {/* Dans la grille : un seul contrôle (résumé) → menu */}
                            <button
                              type="button"
                              onClick={() => setOpenCellMenu({ eventId: event.id, staffId: member.id })}
                              className={`w-full rounded-md border px-3 ${compactTable ? 'py-2.5' : 'py-3'} text-left ${compactTable ? 'text-xs' : 'text-sm'} font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                getStaffAvailabilityColor(availability)
                              }`}
                              title={`Disponibilité: ${availabilityLabel} • Déplacement: ${statusLabel} (cliquer pour modifier)`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="inline-flex items-center gap-1 shrink-0" aria-label="Disponibilité">
                                    <span className={`inline-block w-2 h-2 rounded-full ${
                                      availability === 'DISPONIBLE' ? 'bg-green-500' :
                                      availability === 'PARTIELLEMENT_DISPONIBLE' ? 'bg-yellow-500' :
                                      availability === 'INDISPONIBLE' ? 'bg-red-500' :
                                      availability === 'A_CONFIRMER' ? 'bg-orange-500' : 'bg-gray-300'
                                    }`} />
                                    <span className="text-gray-700">{getAvailabilityShort(availability)}</span>
                                  </span>

                                  <span className="inline-flex items-center gap-1" aria-label="Déplacement">
                                    <span className={`inline-flex items-center justify-center ${compactTable ? 'w-5 h-5 text-[11px]' : 'w-6 h-6 text-xs'} rounded border border-gray-200 bg-white font-bold text-gray-700`}>
                                      {getStatusChar(status)}
                                    </span>
                                    <span className="text-gray-700">{getStatusShort(status)}</span>
                                  </span>
                                </div>

                                <span className="text-gray-400 shrink-0">…</span>
                              </div>
                            </button>

                            {/* Menu contextuel */}
                            {isCellMenuOpen(event.id, member.id) && (
                              <div className="absolute z-30 mt-2 left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-left p-2">
                                <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">Disponibilité</div>
                                <div className="grid grid-cols-4 gap-1 mb-2">
                                  <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border border-transparent hover:border-green-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'DISPONIBLE' as any); closeCellMenu(); }}>Dispo</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-yellow-50 border border-transparent hover:border-yellow-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'PARTIELLEMENT_DISPONIBLE' as any); closeCellMenu(); }}>Partiel</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border border-transparent hover:border-red-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'INDISPONIBLE' as any); closeCellMenu(); }}>Indispo</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border border-transparent hover:border-orange-200" onClick={() => { updateStaffAvailabilityHandler(event.id, member.id, 'A_CONFIRMER' as any); closeCellMenu(); }}>Conf.</button>
                                </div>

                                <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">Déplacement</div>
                                <div className="grid grid-cols-2 gap-1">
                                  <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border hover:border-green-200" onClick={() => { addStaffToEventHandler(event.id, member.id, 'SELECTIONNE' as any); closeCellMenu(); }}>Oui</button>
                                  <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border hover:border-red-200" onClick={() => { addStaffToEventHandler(event.id, member.id, 'NON_SELECTIONNE' as any); closeCellMenu(); }}>Non</button>
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

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TableCellsIcon,
  Squares2X2Icon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from './SectionWrapper';
import { StaffMember, RaceEvent, User, AppState, StaffEventSelection, StaffEventStatus, StaffAvailability } from '../types';
import { sendDigitalConvocationNotifications } from '../services/notificationService';
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
  isStaffPlanningValidator,
  isPendingCandidature,
  isStaffPlanningSelfViewOnly,
} from '../utils/staffPlanningUtils';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';
import StaffPlanningCell from './StaffPlanningCell';
import { formatEventDateRange } from '../utils/dateUtils';
import {
  normalizeStaffStatusKey,
  getStaffStatusLabel,
  getStaffStatusBadgeClass,
  compareStaffByStatus,
  staffMatchesEmploymentStatus,
  STAFF_STATUS_KEYS,
  type StaffStatusKey,
} from '../utils/staffStatusUtils';
import StaffIndividualCalendar from './StaffIndividualCalendar';
import StaffGroupMonitoring from './StaffGroupMonitoring';

const AVAILABILITY_SELECT_CLASSES: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PARTIELLEMENT_DISPONIBLE: 'bg-amber-50 text-amber-800 border-amber-200',
  INDISPONIBLE: 'bg-red-50 text-red-800 border-red-200',
  A_CONFIRMER: 'bg-orange-50 text-orange-800 border-orange-200',
};

const STATUS_SELECT_CLASSES: Record<string, string> = {
  SELECTIONNE: 'bg-green-50 text-green-800 border-green-200',
  NON_SELECTIONNE: 'bg-slate-50 text-slate-600 border-slate-200',
  EN_ATTENTE: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  PRE_SELECTION: 'bg-blue-50 text-blue-800 border-blue-200',
  REFUSE: 'bg-red-50 text-red-800 border-red-200',
};

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
  /** Intégré dans StaffSection : pas de SectionWrapper ni titre dupliqué */
  embedded?: boolean;
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
  onOpenEventDetail,
  embedded = false,
}: StaffSeasonPlanningProps) {
  const safeStaff = staff ?? [];
  const safeRaceEvents = raceEvents ?? [];
  const safeSelections = staffEventSelections ?? [];

  // États pour la gestion des vues
  const [planningViewMode, setPlanningViewMode] = useState<'table' | 'cards'>('table');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<'' | StaffStatusKey | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // États pour le tri
  const [sortField, setSortField] = useState<'name' | 'role' | 'status' | 'workDays'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Feedback de dernière action
  const [lastAction, setLastAction] = useState<{type: string, member: string, event: string} | null>(null);
  
  // États pour les calendriers
  const [selectedStaffForCalendar, setSelectedStaffForCalendar] = useState<StaffMember | null>(null);
  const [showGroupMonitoring, setShowGroupMonitoring] = useState(false);
  const [openHeaderMenuEventId, setOpenHeaderMenuEventId] = useState<string | null>(null);
  const [openRowMenuStaffId, setOpenRowMenuStaffId] = useState<string | null>(null);
  const [hidePastEvents, setHidePastEvents] = useState(true);
  const [compactTable, setCompactTable] = useState(true);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const closeAllMenus = () => {
    setOpenHeaderMenuEventId(null);
    setOpenRowMenuStaffId(null);
  };
  const toggleHeaderMenu = (eventId: string) =>
    setOpenHeaderMenuEventId(prev => (prev === eventId ? null : eventId));
  const toggleRowMenu = (staffId: string) =>
    setOpenRowMenuStaffId(prev => (prev === staffId ? null : staffId));

  const canValidatePlanning = isStaffPlanningValidator(currentUser, safeStaff);
  const selfViewOnly = isStaffPlanningSelfViewOnly(currentUser, safeStaff);
  const currentStaffMember = useMemo(
    () => getStaffMemberForUser(currentUser, safeStaff),
    [currentUser, safeStaff],
  );

  useEffect(() => {
    if (selfViewOnly) {
      setPlanningViewMode('cards');
    }
  }, [selfViewOnly]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuContainerRef.current?.contains(e.target as Node)) {
        closeAllMenus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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


  // Parité coureurs: progression par colonne (+ candidatures en attente)
  const getColumnProgress = (eventId: string) => {
    const total = filteredStaff.length || 0;
    if (total === 0) return { percent: 0, selected: 0, pending: 0 };
    const selected = filteredStaff.filter(m => getStaffEventStatusForEvent(eventId, m.id) === StaffEventStatus.SELECTIONNE).length;
    const pending = filteredStaff.filter(m => {
      const sel = safeSelections.find(s => s.eventId === eventId && s.staffId === m.id);
      return isPendingCandidature(sel);
    }).length;
    return { percent: Math.round((selected / total) * 100), selected, pending };
  };

  // Filtrer les événements futurs (date >= aujourd'hui, comme pour les athlètes)
  const futureEvents = useMemo(() => {
    return getStrictFutureEventsForStaff(safeRaceEvents, selectedYear);
  }, [safeRaceEvents, selectedYear]);

  // Tous les événements de l'année sélectionnée (pour l'option "afficher les passés")
  const eventsForSelectedYear = useMemo(() => {
    return getEventsForSelectedYear(safeRaceEvents, selectedYear);
  }, [safeRaceEvents, selectedYear]);

  // Liste affichée : sans les passés si l'option est cochée (comme pour les athlètes)
  const displayEvents = useMemo(() => {
    return hidePastEvents ? futureEvents : eventsForSelectedYear;
  }, [hidePastEvents, futureEvents, eventsForSelectedYear]);

  // Obtenir les années disponibles
  const availableYears = useMemo(() => {
    return getAvailableYearsForStaff(safeRaceEvents);
  }, [safeRaceEvents]);

  // Fonction pour calculer le nombre de jours de travail prévu pour un membre du staff
  const getStaffWorkDaysCount = (staffId: string) => {
    return getStaffWorkDays(staffId, safeSelections, displayEvents);
  };

  // Fonction de tri des membres du staff
  const sortStaffMembers = (staffMembers: StaffMember[]) => {
    if (sortField === 'status') {
      return [...staffMembers].sort((a, b) => compareStaffByStatus(a.status, b.status, sortDirection));
    }
    return sortStaff(staffMembers, sortField, sortDirection, getStaffWorkDaysCount);
  };

  // Filtrer et trier les membres du staff
  const filteredStaff = useMemo(() => {
    let filtered = filterStaff(
      safeStaff,
      searchTerm,
      roleFilter,
      statusFilter,
      'all',
      safeSelections,
      getStaffRoleKey
    ).filter((member) => staffMatchesEmploymentStatus(member.status, employmentStatusFilter));

    if (selfViewOnly && currentStaffMember) {
      filtered = filtered.filter(m => m.id === currentStaffMember.id);
    }

    return sortStaffMembers(filtered);
  }, [safeStaff, searchTerm, roleFilter, statusFilter, employmentStatusFilter, safeSelections, sortField, sortDirection, selfViewOnly, currentStaffMember]);

  // Fonction pour obtenir le statut d'un membre du staff pour un événement
  const getStaffEventStatusForEvent = (eventId: string, staffId: string): StaffEventStatus | null => {
    return getStaffEventStatus(eventId, staffId, safeSelections);
  };

  // Fonction pour obtenir la disponibilité d'un membre du staff pour un événement
  const getStaffEventAvailabilityForEvent = (eventId: string, staffId: string): StaffAvailability | null => {
    return getStaffEventAvailability(eventId, staffId, safeSelections);
  };

  // Fonction pour ajouter un membre du staff à un événement avec feedback
  const addStaffToEventHandler = (eventId: string, staffId: string, status: StaffEventStatus = StaffEventStatus.SELECTIONNE) => {
    addStaffToEvent(eventId, staffId, status, safeSelections, setStaffEventSelections);
    if (onAssignStaffToEvent) {
      onAssignStaffToEvent(eventId, staffId, status);
    }

    // Notification transversale : informer le membre du staff de son affectation
    const teamId = appState.activeTeamId;
    const event = displayEvents.find(e => e.id === eventId);
    if (teamId && currentUser?.id && event) {
      sendDigitalConvocationNotifications({
        teamId,
        eventId,
        eventName: event.name,
        eventDate: event.date,
        mode: 'staff',
        sentByUserId: currentUser.id,
        users: appState.users ?? [],
        riders: [],
        staff: safeStaff,
        staffId,
      }).catch(() => {/* silencieux si pas de compte */});
    }
    
    // Feedback visuel
    const member = safeStaff.find(s => s.id === staffId);
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
    updateStaffAvailability(eventId, staffId, availability, safeSelections, setStaffEventSelections);
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

  if (!staff || !Array.isArray(staff)) {
    return <div>Erreur: Données du staff non disponibles</div>;
  }

  if (!raceEvents || !Array.isArray(raceEvents)) {
    return <div>Erreur: Données des événements non disponibles</div>;
  }

  if (!staffEventSelections || !Array.isArray(staffEventSelections)) {
    return <div>Erreur: Données des sélections non disponibles</div>;
  }

  const content = (
      <div ref={menuContainerRef} className="space-y-4 w-full max-w-full overflow-hidden">
        {/* Feedback de dernière action */}
        {lastAction && (
          <div className="fixed top-20 right-4 z-50 animate-pulse">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
              {lastAction.member} {lastAction.type === 'SELECTIONNE' ? 'sélectionné' : 'retiré'} pour {lastAction.event}
            </div>
          </div>
        )}
        
        {/* Barre d'outils */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-600">
                {selfViewOnly
                  ? `Mon planning · ${displayEvents.length} événement${displayEvents.length > 1 ? 's' : ''}`
                  : `${filteredStaff.length} membre${filteredStaff.length > 1 ? 's' : ''} • ${displayEvents.length} événement${displayEvents.length > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!selfViewOnly && (
              <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setPlanningViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    planningViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Vue Tableau"
                >
                  <TableCellsIcon className="w-4 h-4" />
                  Tableau
                </button>
                <button
                  type="button"
                  onClick={() => setPlanningViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    planningViewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Vue Cartes"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  Cartes
                </button>
              </div>
              )}

              {!selfViewOnly && (
              <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={compactTable}
                  onChange={(e) => setCompactTable(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Compact</span>
              </label>
              )}

              {!selfViewOnly && (
              <button
                type="button"
                onClick={() => setShowGroupMonitoring(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title="Vue calendrier de groupe"
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Vue groupe
              </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-4 flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 border-t border-gray-100 pt-3">
            {!selfViewOnly && (
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un membre du staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            )}

            {!selfViewOnly && (
            <>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
              title="Filtrer par rôle"
            >
              <option value="all">Tous les rôles</option>
              {STAFF_ROLE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {getStaffRoleDisplayLabel(key)}
                </option>
              ))}
            </select>

            <select
              value={employmentStatusFilter}
              onChange={(e) => setEmploymentStatusFilter((e.target.value || 'all') as '' | StaffStatusKey | 'all')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              title="Filtrer par statut"
            >
              <option value="all">Tous statuts</option>
              {STAFF_STATUS_KEYS.map((key) => (
                <option key={key} value={key}>{getStaffStatusLabel(key)}</option>
              ))}
            </select>
            </>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
            >
              <option value="all">Toutes</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={hidePastEvents}
                onChange={(e) => setHidePastEvents(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Masquer passés</span>
            </label>

            {!selfViewOnly && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              {showFilters ? 'Masquer' : 'Plus de filtres'}
              {showFilters ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            </button>
            )}
          </div>

          {/* Filtres avancés */}
          {!selfViewOnly && showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 px-4 pb-4">
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
                  <button
                    onClick={() => handleSort('status')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      sortField === 'status' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Statut {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Légende intégrée */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-gray-500 mr-1">Légende</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Candidaté
        </span>
        <span className="text-gray-300">|</span>
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">Retenu</span>
        <span className="text-gray-400">validé par DS / manager</span>
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-medium">Refusé</span>
        {canValidatePlanning && (
          <span className="text-gray-400">— boutons sous chaque candidature</span>
        )}
      </div>

      {selfViewOnly && filteredStaff.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Votre fiche staff est introuvable dans cette équipe. Contactez l&apos;encadrement pour lier votre compte.
        </div>
      )}

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
                {displayEvents.map(event => {
                  const selection = staffEventSelections.find(
                    s => s.eventId === event.id && s.staffId === member.id,
                  );
                  return (
                    <div key={event.id} className="p-2.5 bg-gray-50 rounded-lg space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-900 leading-tight">{event.name}</div>
                          <div className="text-[10px] text-gray-500">{formatEventDateRange(event)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenEventDetail && onOpenEventDetail(event.id)}
                          className="text-[10px] text-blue-600 hover:underline shrink-0"
                        >
                          Détail
                        </button>
                      </div>
                      <StaffPlanningCell
                        eventId={event.id}
                        member={member}
                        selection={selection}
                        currentUser={currentUser}
                        staff={staff}
                        staffEventSelections={staffEventSelections}
                        setStaffEventSelections={setStaffEventSelections}
                      />
                    </div>
                  );
                })}
                {displayEvents.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Aucun événement à afficher</p>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Vue Tableau */}
        <div className={`${planningViewMode === 'table' ? 'block' : 'hidden'} bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full max-w-full`}>
          <div className="px-4 py-3 border-b border-gray-200 bg-blue-600 text-white">
            <h3 className="text-base font-semibold">{selfViewOnly ? 'Mon planning saison' : 'Grille de planning'}</h3>
            <p className="text-blue-100 text-xs mt-0.5">
              {canValidatePlanning
                ? 'Candidatures staff en haut · validez Retenu / Refusé (votre nom est enregistré)'
                : selfViewOnly
                  ? 'Indiquez votre disponibilité et candidatez aux courses qui vous intéressent'
                  : 'Cliquez Candidater ou Indispo sur votre ligne — la réponse du DS apparaît en dessous'}
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="divide-y divide-gray-200 w-max min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-30">
                <tr>
                  <th className={`px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[200px] ${compactTable ? 'py-2.5' : 'py-3'}`}>
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="w-4 h-4" />
                      <span>Staff</span>
                    </div>
                  </th>
                  <th className={`px-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[52px] border-r border-gray-100 ${compactTable ? 'py-2.5' : 'py-3'}`} title="Jours de déplacement confirmés">
                    Jours
                  </th>
                  {displayEvents.map(event => {
                    const progress = getColumnProgress(event.id);
                    return (
                    <th key={event.id} className={`px-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-200 relative ${compactTable ? 'py-2 min-w-[108px]' : 'py-3 min-w-[128px]'}`}>
                      <div className={`flex flex-col items-center ${compactTable ? 'gap-0.5' : 'gap-1'}`}>
                        <div className="flex items-center gap-1 w-full justify-center">
                          <button
                            type="button"
                            onClick={() => onOpenEventDetail && onOpenEventDetail(event.id)}
                            className={`font-semibold hover:underline hover:text-blue-600 text-left leading-tight ${compactTable ? 'text-[11px] line-clamp-2' : 'text-xs line-clamp-2'}`}
                            title={`${event.name} — ouvrir le détail`}
                          >
                            {event.name}
                          </button>
                          {canValidatePlanning && (
                          <button
                            type="button"
                            onClick={() => toggleHeaderMenu(event.id)}
                            className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded shrink-0"
                            title="Actions sur toute la colonne"
                          >
                            <EllipsisHorizontalIcon className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-normal normal-case">
                          {formatEventDateRange(event)}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          progress.percent === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selfViewOnly
                            ? (progress.selected > 0 ? 'Retenu' : progress.pending > 0 ? 'En attente' : '—')
                            : `${progress.selected}/${filteredStaff.length}`}
                        </span>
                        {progress.pending > 0 && canValidatePlanning && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                            {progress.pending} à valider
                          </span>
                        )}

                        {openHeaderMenuEventId === event.id && (
                          <div className="absolute top-full mt-1 z-40 w-52 bg-white border border-gray-200 rounded-lg shadow-lg text-left p-2 normal-case">
                            <div className="text-[10px] font-semibold text-gray-400 px-1 pb-1 uppercase">Colonne entière</div>
                            <div className="text-[11px] text-gray-500 px-1 py-0.5">Disponibilité</div>
                            <div className="grid grid-cols-2 gap-1 mb-2">
                              <button className="text-xs px-2 py-1 rounded hover:bg-emerald-50 border border-gray-100" onClick={() => bulkSetAvailability(event.id, StaffAvailability.DISPONIBLE)}>Dispo</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-amber-50 border border-gray-100" onClick={() => bulkSetAvailability(event.id, StaffAvailability.PARTIELLEMENT_DISPONIBLE)}>Partiel</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border border-gray-100" onClick={() => bulkSetAvailability(event.id, StaffAvailability.INDISPONIBLE)}>Indispo</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border border-gray-100" onClick={() => bulkSetAvailability(event.id, StaffAvailability.A_CONFIRMER)}>À conf.</button>
                            </div>
                            <div className="text-[11px] text-gray-500 px-1 py-0.5">Déplacement</div>
                            <div className="grid grid-cols-2 gap-1">
                              <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border border-gray-100" onClick={() => bulkSetStatus(event.id, StaffEventStatus.SELECTIONNE)}>Oui</button>
                              <button className="text-xs px-2 py-1 rounded hover:bg-slate-50 border border-gray-100" onClick={() => bulkSetStatus(event.id, StaffEventStatus.NON_SELECTIONNE)}>Non</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredStaff.map((member, rowIdx) => {
                  const workDays = getStaffWorkDaysCount(member.id);
                  const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
                  return (
                  <tr key={member.id} className={`${rowBg} hover:bg-blue-50/30 transition-colors`}>
                    <td className={`px-3 whitespace-nowrap sticky left-0 z-10 border-r border-gray-200 ${rowBg} relative ${compactTable ? 'py-2' : 'py-3'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ${compactTable ? 'h-7 w-7' : 'h-8 w-8'}`}>
                          <span className="text-[10px] font-semibold text-white">
                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openStaffModal(member)}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate text-left"
                              title={`${member.firstName} ${member.lastName}`}
                            >
                              {member.firstName} {member.lastName}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStaffForCalendar(member)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0"
                              title="Calendrier individuel"
                            >
                              <CalendarDaysIcon className="w-3.5 h-3.5" />
                            </button>
                            {canValidatePlanning && (
                            <button
                              type="button"
                              onClick={() => toggleRowMenu(member.id)}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded shrink-0"
                              title="Actions sur toute la ligne"
                            >
                              <EllipsisHorizontalIcon className="w-3.5 h-3.5" />
                            </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {getStaffRoleDisplayLabel(member.role) || 'Autre'}
                            </span>
                            {!compactTable && member.email && (
                              <span className="text-[10px] text-gray-400 truncate">{member.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {openRowMenuStaffId === member.id && (
                        <div className="absolute mt-1 left-2 z-40 w-52 bg-white border border-gray-200 rounded-lg shadow-lg text-left p-2">
                          <div className="text-[10px] font-semibold text-gray-400 px-1 pb-1 uppercase">Ligne entière</div>
                          <div className="text-[11px] text-gray-500 px-1 py-0.5">Disponibilité</div>
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            <button className="text-xs px-2 py-1 rounded hover:bg-emerald-50 border border-gray-100" onClick={() => rowSetAvailability(member.id, StaffAvailability.DISPONIBLE)}>Dispo</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-amber-50 border border-gray-100" onClick={() => rowSetAvailability(member.id, StaffAvailability.PARTIELLEMENT_DISPONIBLE)}>Partiel</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-red-50 border border-gray-100" onClick={() => rowSetAvailability(member.id, StaffAvailability.INDISPONIBLE)}>Indispo</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-orange-50 border border-gray-100" onClick={() => rowSetAvailability(member.id, StaffAvailability.A_CONFIRMER)}>À conf.</button>
                          </div>
                          <div className="text-[11px] text-gray-500 px-1 py-0.5">Déplacement</div>
                          <div className="grid grid-cols-2 gap-1">
                            <button className="text-xs px-2 py-1 rounded hover:bg-green-50 border border-gray-100" onClick={() => rowSetStatus(member.id, StaffEventStatus.SELECTIONNE)}>Oui</button>
                            <button className="text-xs px-2 py-1 rounded hover:bg-slate-50 border border-gray-100" onClick={() => rowSetStatus(member.id, StaffEventStatus.NON_SELECTIONNE)}>Non</button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={`px-2 text-center border-r border-gray-100 ${compactTable ? 'py-2' : 'py-3'}`}>
                      <span className={`inline-flex items-center justify-center rounded-full font-semibold ${
                        workDays > 0
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-400'
                      } ${compactTable ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-xs'}`}>
                        {workDays}
                      </span>
                    </td>
                    {displayEvents.map((event) => {
                      const selection = staffEventSelections.find(
                        s => s.eventId === event.id && s.staffId === member.id,
                      );
                      return (
                        <td key={event.id} className={`px-1.5 text-center border-l border-gray-100 ${compactTable ? 'py-1.5 min-w-[108px]' : 'py-2 min-w-[128px]'}`}>
                          <StaffPlanningCell
                            eventId={event.id}
                            member={member}
                            selection={selection}
                            currentUser={currentUser}
                            staff={staff}
                            staffEventSelections={staffEventSelections}
                            setStaffEventSelections={setStaffEventSelections}
                            compact={compactTable}
                          />
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
        

        {/* Statistiques supprimées sur demande */}
      </div>
  );

  return (
    <>
      {embedded ? content : (
        <SectionWrapper title="Planning de Saison - Staff">
          {content}
        </SectionWrapper>
      )}
      
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
    </>
  );
}

/**
 * Utilitaires pour le planning de saison du staff
 * Duplique la logique du planning de saison des coureurs pour le staff
 */

import { StaffMember, RaceEvent, StaffEventSelection, StaffEventStatus, StaffEventPreference, StaffAvailability } from '../types';
import { isFutureEvent, getEventYear, formatEventDate } from './dateUtils';


/**
 * Filtre les événements futurs pour le staff
 */
export const getFutureEventsForStaff = (raceEvents: RaceEvent[], selectedYear?: number | 'all') => {
  return raceEvents.filter(event => {
    if (!isFutureEvent(event.date)) return false;
    if (selectedYear !== 'all' && selectedYear && getEventYear(event.date) !== selectedYear) return false;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Obtient les années disponibles pour le planning du staff
 */
export const getAvailableYearsForStaff = (raceEvents: RaceEvent[]) => {
  const years = new Set<number>();
  raceEvents.forEach(event => {
    if (isFutureEvent(event.date)) {
      years.add(getEventYear(event.date));
    }
  });
  return Array.from(years).sort((a, b) => b - a);
};

/**
 * Calcule le nombre de jours de travail prévu pour un membre du staff
 */
export const getStaffWorkDays = (staffId: string, staffEventSelections: StaffEventSelection[], futureEvents: RaceEvent[]) => {
  return staffEventSelections.filter(sel => 
    sel.staffId === staffId && 
    futureEvents.some(event => event.id === sel.eventId) &&
    sel.status !== null
  ).length;
};

/**
 * Obtient le statut d'un membre du staff pour un événement
 */
export const getStaffEventStatus = (eventId: string, staffId: string, staffEventSelections: StaffEventSelection[]): StaffEventStatus | null => {
  const selection = staffEventSelections.find(
    sel => sel.eventId === eventId && sel.staffId === staffId
  );
  return selection?.status || null;
};

/**
 * Obtient la préférence d'un membre du staff pour un événement
 */
export const getStaffEventPreference = (eventId: string, staffId: string, staffEventSelections: StaffEventSelection[]): StaffEventPreference | null => {
  const selection = staffEventSelections.find(
    sel => sel.eventId === eventId && sel.staffId === staffId
  );
  return selection?.staffPreference || null;
};

/**
 * Obtient la disponibilité d'un membre du staff pour un événement
 */
export const getStaffEventAvailability = (eventId: string, staffId: string, staffEventSelections: StaffEventSelection[]): StaffAvailability | null => {
  const selection = staffEventSelections.find(
    sel => sel.eventId === eventId && sel.staffId === staffId
  );
  return selection?.staffAvailability || null;
};

/**
 * Ajoute un membre du staff à un événement
 */
export const addStaffToEvent = (
  eventId: string, 
  staffId: string, 
  status: StaffEventStatus = StaffEventStatus.PRE_SELECTION,
  staffEventSelections: StaffEventSelection[],
  setStaffEventSelections: (updater: React.SetStateAction<StaffEventSelection[]>) => void
) => {
  try {
    const existingSelection = staffEventSelections.find(
      sel => sel.eventId === eventId && sel.staffId === staffId
    );
    
    if (existingSelection) {
      const updatedSelection = { ...existingSelection, status };
      setStaffEventSelections(prev => 
        prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
      );
    } else {
      const newSelection: StaffEventSelection = {
        id: `${eventId}_${staffId}_${Date.now()}`,
        eventId,
        staffId,
        status,
        staffPreference: StaffEventPreference.EN_ATTENTE,
        staffAvailability: StaffAvailability.DISPONIBLE,
        staffObjectives: '',
        notes: ''
      };
      setStaffEventSelections(prev => [...prev, newSelection]);
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre du staff:', error);
  }
};

/**
 * Met à jour la préférence d'un membre du staff
 */
export const updateStaffPreference = (
  eventId: string, 
  staffId: string, 
  preference: StaffEventPreference,
  staffEventSelections: StaffEventSelection[],
  setStaffEventSelections: (updater: React.SetStateAction<StaffEventSelection[]>) => void
) => {
  const existingSelection = staffEventSelections.find(
    sel => sel.eventId === eventId && sel.staffId === staffId
  );
  
  if (existingSelection) {
    const updatedSelection = { ...existingSelection, staffPreference: preference };
    setStaffEventSelections(prev => 
      prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
    );
  } else {
    // Créer une nouvelle sélection si elle n'existe pas
    const newSelection: StaffEventSelection = {
      id: `${eventId}_${staffId}_${Date.now()}`,
      eventId,
      staffId,
      status: StaffEventStatus.EN_ATTENTE,
      staffPreference: preference,
      staffAvailability: StaffAvailability.DISPONIBLE,
      staffObjectives: '',
      notes: ''
    };
    setStaffEventSelections(prev => [...prev, newSelection]);
  }
};

/**
 * Met à jour la disponibilité d'un membre du staff
 */
export const updateStaffAvailability = (
  eventId: string, 
  staffId: string, 
  availability: StaffAvailability,
  staffEventSelections: StaffEventSelection[],
  setStaffEventSelections: (updater: React.SetStateAction<StaffEventSelection[]>) => void
) => {
  const existingSelection = staffEventSelections.find(
    sel => sel.eventId === eventId && sel.staffId === staffId
  );
  
  if (existingSelection) {
    const updatedSelection = { ...existingSelection, staffAvailability: availability };
    setStaffEventSelections(prev => 
      prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
    );
  } else {
    // Créer une nouvelle sélection si elle n'existe pas
    const newSelection: StaffEventSelection = {
      id: `${eventId}_${staffId}_${Date.now()}`,
      eventId,
      staffId,
      status: StaffEventStatus.EN_ATTENTE,
      staffPreference: StaffEventPreference.EN_ATTENTE,
      staffAvailability: availability,
      staffObjectives: '',
      notes: ''
    };
    setStaffEventSelections(prev => [...prev, newSelection]);
  }
};

/**
 * Filtre les membres du staff selon les critères
 */
export const filterStaff = (
  staff: StaffMember[],
  searchTerm: string,
  roleFilter: string,
  statusFilter: string,
  preferenceFilter: string,
  staffEventSelections: StaffEventSelection[]
) => {
  return staff.filter(member => {
    const matchesSearch = searchTerm === '' || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && member.isActive !== false) ||
      (statusFilter === 'inactive' && member.isActive === false);
    
    // Filtre par préférence - vérifier si le membre a au moins une préférence correspondante
    let matchesPreference = true;
    if (preferenceFilter !== 'all') {
      const memberSelections = staffEventSelections.filter(sel => sel.staffId === member.id);
      matchesPreference = memberSelections.some(sel => {
        switch (preferenceFilter) {
          case 'wants':
            return sel.staffPreference === StaffEventPreference.VEUT_PARTICIPER;
          case 'objectives':
            return sel.staffPreference === StaffEventPreference.OBJECTIFS_SPECIFIQUES;
          case 'waiting':
            return sel.staffPreference === StaffEventPreference.EN_ATTENTE;
          case 'unavailable':
            return sel.staffPreference === StaffEventPreference.ABSENT || 
                   sel.staffPreference === StaffEventPreference.NE_VEUT_PAS;
          default:
            return true;
        }
      });
    }
    
    return matchesSearch && matchesRole && matchesStatus && matchesPreference;
  });
};

/**
 * Trie les membres du staff
 */
export const sortStaff = (
  staff: StaffMember[],
  sortField: 'name' | 'role' | 'status' | 'workDays',
  sortDirection: 'asc' | 'desc',
  getStaffWorkDays: (staffId: string) => number
) => {
  return [...staff].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'role':
        aValue = a.role || 'AUTRE';
        bValue = b.role || 'AUTRE';
        break;
      case 'status':
        aValue = a.isActive !== false ? 'ACTIF' : 'INACTIF';
        bValue = b.isActive !== false ? 'ACTIF' : 'INACTIF';
        break;
      case 'workDays':
        aValue = getStaffWorkDays(a.id);
        bValue = getStaffWorkDays(b.id);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Obtient les couleurs pour les statuts du staff
 */
export const getStaffStatusColor = (status: StaffEventStatus | null) => {
  switch (status) {
    case StaffEventStatus.SELECTIONNE:
      return 'bg-green-100 text-green-800';
    case StaffEventStatus.PRE_SELECTION:
      return 'bg-blue-100 text-blue-800';
    case StaffEventStatus.EN_ATTENTE:
      return 'bg-yellow-100 text-yellow-800';
    case StaffEventStatus.NON_SELECTIONNE:
      return 'bg-gray-100 text-gray-800';
    case StaffEventStatus.REFUSE:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Obtient les couleurs pour les préférences du staff
 */
export const getStaffPreferenceColor = (preference: StaffEventPreference | null) => {
  switch (preference) {
    case StaffEventPreference.VEUT_PARTICIPER:
      return 'bg-green-100 text-green-800';
    case StaffEventPreference.OBJECTIFS_SPECIFIQUES:
      return 'bg-blue-100 text-blue-800';
    case StaffEventPreference.EN_ATTENTE:
      return 'bg-yellow-100 text-yellow-800';
    case StaffEventPreference.NE_VEUT_PAS:
    case StaffEventPreference.ABSENT:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Obtient les couleurs pour la disponibilité du staff
 */
export const getStaffAvailabilityColor = (availability: StaffAvailability | null) => {
  switch (availability) {
    case StaffAvailability.DISPONIBLE:
      return 'bg-green-100 text-green-800';
    case StaffAvailability.PARTIELLEMENT_DISPONIBLE:
      return 'bg-yellow-100 text-yellow-800';
    case StaffAvailability.INDISPONIBLE:
      return 'bg-red-100 text-red-800';
    case StaffAvailability.A_CONFIRMER:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

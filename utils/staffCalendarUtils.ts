/**
 * Utilitaires pour la gestion des calendriers du staff
 * Calendriers individuels et monitoring de groupe
 */

import { StaffMember, RaceEvent, StaffEventSelection, StaffEventStatus, StaffEventPreference, StaffAvailability } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

export interface StaffCalendarEvent {
  id: string;
  eventId: string;
  eventName: string;
  date: Date;
  endDate?: Date;
  status: StaffEventStatus | null;
  preference: StaffEventPreference | null;
  availability: StaffAvailability | null;
  location?: string;
  type?: string;
}

export interface StaffCalendarDay {
  date: Date;
  events: StaffCalendarEvent[];
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface GroupMonitoringData {
  date: Date;
  staffAssignments: {
    staffId: string;
    staffName: string;
    staffRole: string;
    eventId: string;
    eventName: string;
    status: StaffEventStatus | null;
    preference: StaffEventPreference | null;
    availability: StaffAvailability | null;
  }[];
  events: {
    eventId: string;
    eventName: string;
    eventLocation?: string;
    eventType?: string;
  }[];
}

export interface MonthlyMonitoringData {
  month: Date;
  days: GroupMonitoringData[];
  totalAssignments: number;
  uniqueStaff: number;
  uniqueEvents: number;
}

export interface YearlyMonitoringData {
  year: number;
  months: MonthlyMonitoringData[];
  totalAssignments: number;
  uniqueStaff: number;
  uniqueEvents: number;
}

/**
 * Génère les données du calendrier pour un membre du staff
 */
export function generateStaffCalendar(
  staffMember: StaffMember,
  raceEvents: RaceEvent[],
  staffEventSelections: StaffEventSelection[],
  month: Date = new Date()
): StaffCalendarDay[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  return days.map(date => {
    const dayEvents: StaffCalendarEvent[] = [];
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today;
    const isFuture = date > today;

    // Trouver les événements pour ce jour
    raceEvents.forEach(event => {
      if (!event.date) return;

      try {
        const eventDate = new Date(event.date);
        const eventEndDate = event.endDate ? new Date(event.endDate) : eventDate;

        // Vérifier si l'événement tombe sur ce jour
        const isSameDayCheck = eventDate.toDateString() === date.toDateString();
        const isInRange = eventEndDate && eventDate <= date && date <= eventEndDate;
        
        if (isSameDayCheck || isInRange) {
          
          // Trouver la sélection du staff pour cet événement
          const selection = staffEventSelections.find(
            sel => sel.eventId === event.id && sel.staffId === staffMember.id
          );

          dayEvents.push({
            id: `${event.id}-${staffMember.id}`,
            eventId: event.id,
            eventName: event.name || 'Événement sans nom',
            date: eventDate,
            endDate: eventEndDate,
            status: selection?.status || null,
            preference: selection?.staffPreference || null,
            availability: selection?.staffAvailability || null,
            location: event.location,
            type: event.type
          });
        }
      } catch (error) {
        console.warn('Erreur lors du parsing de la date:', event.date);
      }
    });

    return {
      date,
      events: dayEvents,
      isToday,
      isPast,
      isFuture
    };
  });
}

/**
 * Génère les données de monitoring de groupe pour une période
 */
export function generateGroupMonitoring(
  staff: StaffMember[],
  raceEvents: RaceEvent[],
  staffEventSelections: StaffEventSelection[],
  startDate: Date,
  endDate: Date
): GroupMonitoringData[] {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const today = new Date();
  
  // Debug temporaire
  console.log('🔍 generateGroupMonitoring Debug:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    today: today.toISOString(),
    raceEventsCount: raceEvents.length,
    raceEvents: raceEvents.map(e => ({ id: e.id, name: e.name, date: e.date }))
  });

  return days.map(date => {
    const staffAssignments: GroupMonitoringData['staffAssignments'] = [];
    const events: GroupMonitoringData['events'] = [];

    // Parcourir tous les événements pour ce jour
    raceEvents.forEach(event => {
      if (!event.date) return;

      try {
        const eventDate = new Date(event.date);
        const eventEndDate = event.endDate ? new Date(event.endDate) : eventDate;

        // Vérifier si l'événement tombe sur ce jour
        const isSameDayCheck = eventDate.toDateString() === date.toDateString();
        const isInRange = eventEndDate && eventDate <= date && date <= eventEndDate;
        
        // Vérifier si l'événement est dans le futur (pour éviter d'afficher des événements passés)
        const isFutureEvent = eventDate >= today;
        
        if ((isSameDayCheck || isInRange) && isFutureEvent) {
          
          // Ajouter l'événement à la liste
          events.push({
            eventId: event.id,
            eventName: event.name || 'Événement sans nom',
            eventLocation: event.location,
            eventType: event.eventType
          });
          
          // Chercher les assignations de staff pour cet événement
          staff.forEach(member => {
            const selection = staffEventSelections.find(
              sel => sel.eventId === event.id && sel.staffId === member.id
            );

            if (selection) {
              staffAssignments.push({
                staffId: member.id,
                staffName: member.name || 'Sans nom',
                staffRole: member.role || 'AUTRE',
                eventId: event.id,
                eventName: event.name || 'Événement sans nom',
                status: selection.status,
                preference: selection.staffPreference,
                availability: selection.staffAvailability
              });
            }
          });
        }
      } catch (error) {
        console.warn('Erreur lors du parsing de la date:', event.date);
      }
    });

    return {
      date,
      staffAssignments,
      events
    };
  });
}

/**
 * Génère les données de monitoring mensuel
 */
export function generateMonthlyMonitoring(
  staff: StaffMember[],
  raceEvents: RaceEvent[],
  staffEventSelections: StaffEventSelection[],
  year: number,
  month: number
): MonthlyMonitoringData {
  const monthDate = new Date(year, month - 1, 1);
  const startDate = startOfMonth(monthDate);
  const endDate = endOfMonth(monthDate);
  
  const days = generateGroupMonitoring(staff, raceEvents, staffEventSelections, startDate, endDate);
  
  // Calculer les statistiques du mois
  const totalAssignments = days.reduce((total, day) => total + day.staffAssignments.length, 0);
  const uniqueStaff = new Set(days.flatMap(day => day.staffAssignments.map(a => a.staffId))).size;
  const uniqueEvents = new Set(days.flatMap(day => day.staffAssignments.map(a => a.eventId))).size;
  
  return {
    month: monthDate,
    days,
    totalAssignments,
    uniqueStaff,
    uniqueEvents
  };
}

/**
 * Génère les données de monitoring annuel
 */
export function generateYearlyMonitoring(
  staff: StaffMember[],
  raceEvents: RaceEvent[],
  staffEventSelections: StaffEventSelection[],
  year: number
): YearlyMonitoringData {
  const months: MonthlyMonitoringData[] = [];
  
  // Générer les données pour chaque mois de l'année
  for (let month = 1; month <= 12; month++) {
    months.push(generateMonthlyMonitoring(staff, raceEvents, staffEventSelections, year, month));
  }
  
  // Calculer les statistiques de l'année
  const totalAssignments = months.reduce((total, month) => total + month.totalAssignments, 0);
  const uniqueStaff = new Set(months.flatMap(month => 
    month.days.flatMap(day => day.staffAssignments.map(a => a.staffId))
  )).size;
  const uniqueEvents = new Set(months.flatMap(month => 
    month.days.flatMap(day => day.staffAssignments.map(a => a.eventId))
  )).size;
  
  return {
    year,
    months,
    totalAssignments,
    uniqueStaff,
    uniqueEvents
  };
}

/**
 * Obtient les statistiques d'un calendrier de staff
 */
export function getStaffCalendarStats(
  calendarDays: StaffCalendarDay[]
): {
  totalEvents: number;
  selectedEvents: number;
  preSelectedEvents: number;
  availableDays: number;
  unavailableDays: number;
  workDays: number;
} {
  let totalEvents = 0;
  let selectedEvents = 0;
  let preSelectedEvents = 0;
  let availableDays = 0;
  let unavailableDays = 0;
  let workDays = 0;

  calendarDays.forEach(day => {
    if (day.events.length > 0) {
      workDays++;
    }

    day.events.forEach(event => {
      totalEvents++;
      
      if (event.status === StaffEventStatus.SELECTIONNE) {
        selectedEvents++;
      } else if (event.status === StaffEventStatus.PRE_SELECTION) {
        preSelectedEvents++;
      }

      if (event.availability === StaffAvailability.DISPONIBLE) {
        availableDays++;
      } else if (event.availability === StaffAvailability.INDISPONIBLE) {
        unavailableDays++;
      }
    });
  });

  return {
    totalEvents,
    selectedEvents,
    preSelectedEvents,
    availableDays,
    unavailableDays,
    workDays
  };
}

/**
 * Obtient les statistiques du monitoring de groupe
 */
export function getGroupMonitoringStats(
  monitoringData: GroupMonitoringData[] | MonthlyMonitoringData | YearlyMonitoringData
): {
  totalAssignments: number;
  selectedAssignments: number;
  preSelectedAssignments: number;
  availableStaff: number;
  unavailableStaff: number;
  eventsCoverage: number;
} {
  let totalAssignments = 0;
  let selectedAssignments = 0;
  let preSelectedAssignments = 0;
  let availableStaff = 0;
  let unavailableStaff = 0;
  let eventsCoverage = 0;

  // Gérer les différents types de données
  let days: GroupMonitoringData[] = [];
  
  if (Array.isArray(monitoringData)) {
    // Vue semaine ou tableau
    days = monitoringData;
  } else if ('days' in monitoringData) {
    // Vue mensuelle
    days = monitoringData.days;
  } else if ('months' in monitoringData) {
    // Vue annuelle - aplatir tous les jours de tous les mois
    days = monitoringData.months.flatMap(month => month.days);
  }

  days.forEach(day => {
    day.staffAssignments.forEach(assignment => {
      totalAssignments++;
      
      if (assignment.status === StaffEventStatus.SELECTIONNE) {
        selectedAssignments++;
      } else if (assignment.status === StaffEventStatus.PRE_SELECTION) {
        preSelectedAssignments++;
      }

      if (assignment.availability === StaffAvailability.DISPONIBLE) {
        availableStaff++;
      } else if (assignment.availability === StaffAvailability.INDISPONIBLE) {
        unavailableStaff++;
      }
    });

    if (day.staffAssignments.length > 0) {
      eventsCoverage++;
    }
  });

  return {
    totalAssignments,
    selectedAssignments,
    preSelectedAssignments,
    availableStaff,
    unavailableStaff,
    eventsCoverage
  };
}

/**
 * Formate une date pour l'affichage
 */
export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

/**
 * Formate une date pour l'affichage court
 */
export function formatCalendarDateShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/**
 * Obtient le nom du mois
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Obtient les couleurs pour les statuts
 */
export function getStatusColor(status: StaffEventStatus | null): string {
  switch (status) {
    case StaffEventStatus.SELECTIONNE:
      return 'bg-green-100 text-green-800 border-green-200';
    case StaffEventStatus.PRE_SELECTION:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case StaffEventStatus.EN_ATTENTE:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case StaffEventStatus.NON_SELECTIONNE:
      return 'bg-red-100 text-red-800 border-red-200';
    case StaffEventStatus.REFUSE:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Obtient les couleurs pour les disponibilités
 */
export function getAvailabilityColor(availability: StaffAvailability | null): string {
  switch (availability) {
    case StaffAvailability.DISPONIBLE:
      return 'bg-green-100 text-green-800 border-green-200';
    case StaffAvailability.PARTIELLEMENT_DISPONIBLE:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case StaffAvailability.INDISPONIBLE:
      return 'bg-red-100 text-red-800 border-red-200';
    case StaffAvailability.A_CONFIRMER:
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Obtient les couleurs pour les préférences
 */
export function getPreferenceColor(preference: StaffEventPreference | null): string {
  switch (preference) {
    case StaffEventPreference.VEUT_PARTICIPER:
      return 'bg-green-100 text-green-800 border-green-200';
    case StaffEventPreference.OBJECTIFS_SPECIFIQUES:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case StaffEventPreference.EN_ATTENTE:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case StaffEventPreference.NE_VEUT_PAS:
      return 'bg-red-100 text-red-800 border-red-200';
    case StaffEventPreference.ABSENT:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

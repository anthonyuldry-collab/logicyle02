/**
 * Utilitaires pour la transition de saison vers 2026
 * Bascule l'application sur 2026 comme année de référence sans supprimer les données
 */

import { Rider, StaffMember, RaceEvent, PerformanceEntry } from '../types';
import { getCurrentSeasonYear } from './seasonUtils';

/**
 * Filtre les événements de course pour 2026 et années suivantes (pour l'affichage)
 * @param raceEvents - Liste des événements de course
 * @returns Liste des événements filtrés pour 2026+
 */
export const getEventsFor2026 = (raceEvents: RaceEvent[]): RaceEvent[] => {
  return raceEvents.filter(event => {
    const eventYear = new Date(event.date).getFullYear();
    return eventYear >= 2026;
  });
};

/**
 * Filtre les entrées de performance pour 2026 et années suivantes (pour l'affichage)
 * @param performanceEntries - Liste des entrées de performance
 * @returns Liste des entrées de performance filtrées pour 2026+
 */
export const getPerformanceEntriesFor2026 = (performanceEntries: PerformanceEntry[]): PerformanceEntry[] => {
  return performanceEntries.filter(entry => {
    const entryYear = new Date(entry.date).getFullYear();
    return entryYear >= 2026;
  });
};

/**
 * Calcule les jours de course pour 2026 uniquement
 * @param rider - Coureur
 * @param raceEvents - Liste des événements
 * @returns Nombre de jours de course en 2026
 */
export const calculateRaceDaysFor2026 = (rider: Rider, raceEvents: RaceEvent[]): number => {
  const events2026 = getEventsFor2026(raceEvents);
  
  // Calculer la durée totale des événements où le coureur est assigné
  const totalDays = events2026.reduce((total, event) => {
    if (event.selectedRiderIds?.includes(rider.id)) {
      // Calculer la durée de l'événement
      const startDate = new Date(event.date + 'T00:00:00Z');
      const endDate = new Date((event.endDate || event.date) + 'T23:59:59Z');
      const eventDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + eventDurationDays;
    }
    
    return total;
  }, 0);
  
  return totalDays;
};

/**
 * Calcule les jours de staff pour 2026 uniquement
 * @param staffMember - Membre du staff
 * @param raceEvents - Liste des événements
 * @returns Nombre de jours de staff en 2026
 */
export const calculateStaffDaysFor2026 = (staffMember: StaffMember, raceEvents: RaceEvent[]): number => {
  const events2026 = getEventsFor2026(raceEvents);
  
  // Calculer la durée totale des événements où le staff est assigné
  const totalDays = events2026.reduce((total, event) => {
    // Vérifier si le membre du staff est assigné à cet événement
    const isAssigned = event.selectedStaffIds?.includes(staffMember.id) || 
                      Object.values(event).some(value => 
                        Array.isArray(value) && value.includes(staffMember.id)
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
  
  return totalDays;
};

/**
 * Vérifie si l'application doit basculer sur 2026
 * @param currentSeason - Année de saison actuelle
 * @returns true si le basculement sur 2026 est nécessaire
 */
export const shouldSwitchTo2026 = (currentSeason: number): boolean => {
  return currentSeason < 2026;
};

/**
 * Obtient le message d'information pour le basculement sur 2026
 * @returns Message d'information
 */
export const getSwitchTo2026Message = (): string => {
  return `L'application bascule automatiquement sur la saison 2026 pour la planification prévisionnelle.

Les données historiques sont conservées et peuvent être consultées via les filtres d'année.
Seules les données de 2026 et années suivantes sont affichées par défaut.`;
};

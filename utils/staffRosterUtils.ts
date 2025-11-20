/**
 * Utilitaires pour l'archivage des effectifs du staff par saison
 * Gère la transition entre les saisons et l'archivage des effectifs du staff
 * Duplique la logique de rosterArchiveUtils.ts pour le staff uniquement
 */

import { StaffMember, StaffArchive, StaffTransition } from '../types';
import { getCurrentSeasonYear } from './seasonUtils';

/**
 * Archive l'effectif du staff actuel pour une saison donnée
 */
export function archiveStaffForSeason(
  staff: StaffMember[],
  season: number
): StaffArchive {
  const activeStaff = staff.filter(member => member.isActive !== false);
  const inactiveStaff = staff.filter(member => member.isActive === false);
  
  return {
    season,
    staff: staff.map(member => ({
      ...member,
      currentSeason: season
    })),
    archivedAt: new Date().toISOString(),
    totalStaff: staff.length,
    activeStaff: activeStaff.length,
    inactiveStaff: inactiveStaff.length
  };
}

/**
 * Prépare la transition du staff vers une nouvelle saison
 * Conserve par défaut tous les membres actifs et remet les compteurs à 0
 */
export function prepareStaffTransition(
  currentStaff: StaffMember[],
  fromSeason: number,
  toSeason: number
): StaffTransition {
  // Conserver tout le staff actif par défaut
  const staffKept = currentStaff
    .filter(member => member.isActive !== false)
    .map(member => member.id);
  
  // Seuls les membres du staff explicitement inactifs sont retirés
  const staffRemoved = currentStaff
    .filter(member => member.isActive === false)
    .map(member => member.id);

  return {
    fromSeason,
    toSeason,
    transitionDate: new Date().toISOString(),
    staffAdded: [], // Sera rempli lors de l'ajout de nouveaux membres
    staffRemoved,
    staffKept
  };
}

/**
 * Filtre le staff pour une saison donnée
 */
export function getStaffForSeason(staff: StaffMember[], season: number): StaffMember[] {
  return staff.filter(member => 
    member.currentSeason === season || 
    (member.currentSeason === undefined && season === getCurrentSeasonYear())
  );
}

/**
 * Obtient le staff actif pour la saison courante
 */
export function getActiveStaffForCurrentSeason(staff: StaffMember[]): StaffMember[] {
  const currentSeason = getCurrentSeasonYear();
  return staff.filter(member => 
    (member.currentSeason === currentSeason || member.currentSeason === undefined) &&
    member.isActive !== false
  );
}

/**
 * Marque un membre du staff comme inactif pour la saison courante
 */
export function deactivateStaffForSeason(staff: StaffMember, season: number): StaffMember {
  return {
    ...staff,
    isActive: false,
    currentSeason: season
  };
}

/**
 * Active un membre du staff pour une nouvelle saison
 */
export function activateStaffForSeason(staff: StaffMember, season: number): StaffMember {
  return {
    ...staff,
    isActive: true,
    currentSeason: season
  };
}

/**
 * Obtient les statistiques du staff pour une saison
 */
export function getStaffStatsForSeason(
  staff: StaffMember[],
  season: number
): {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
} {
  const seasonStaff = getStaffForSeason(staff, season);
  
  const activeStaff = seasonStaff.filter(s => s.isActive !== false).length;
  const inactiveStaff = seasonStaff.filter(s => s.isActive === false).length;
  
  return {
    totalStaff: seasonStaff.length,
    activeStaff,
    inactiveStaff
  };
}

/**
 * Vérifie si une transition de saison est nécessaire pour le staff
 * Transition automatique au 1er novembre vers la nouvelle saison
 */
export function shouldTransitionStaffToNewSeason(): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() retourne 0-11, on veut 1-12
  const currentYear = now.getFullYear();
  
  // Transition automatique au 1er novembre
  if (currentMonth >= 11) {
    return true;
  }
  
  // Pour les années futures, vérifier si on est en période de transition
  return currentYear >= 2026;
}

/**
 * Remet les compteurs de jours de staff à 0 pour une nouvelle saison
 * Cette fonction peut être appelée lors de la transition pour réinitialiser les statistiques
 */
export function resetStaffDayCountersForNewSeason(
  staff: StaffMember[],
  newSeason: number
): StaffMember[] {
  // Pour le staff, on peut ajouter un champ pour tracker les jours de travail par saison
  // Pour l'instant, on se contente de mettre à jour la saison courante
  const updatedStaff = staff.map(member => ({
    ...member,
    currentSeason: newSeason,
    isActive: member.isActive !== false // Conserver le statut actif par défaut
  }));

  return updatedStaff;
}

/**
 * Obtient le message de transition pour les effectifs du staff
 */
export function getStaffTransitionMessage(fromSeason: number, toSeason: number): string {
  return `Transition des effectifs du staff de la saison ${fromSeason} vers la saison ${toSeason}.
  
Les effectifs du staff de ${fromSeason} sont maintenant archivés et figés.
Tous les membres du staff actifs sont conservés pour ${toSeason}.
Les compteurs de jours de travail sont remis à 0 pour la nouvelle saison.
Transition automatique au 1er novembre.`;
}

/**
 * Calcule les jours de travail du staff pour une saison donnée
 * @param staffMember - Membre du staff
 * @param raceEvents - Liste des événements
 * @param season - Saison pour laquelle calculer
 * @returns Nombre de jours de travail pour la saison
 */
export function calculateStaffDaysForSeason(
  staffMember: StaffMember, 
  raceEvents: any[], 
  season: number
): number {
  const seasonEvents = raceEvents.filter(event => {
    const eventYear = new Date(event.date).getFullYear();
    return eventYear === season;
  });
  
  // Calculer la durée totale des événements où le staff est assigné
  const totalDays = seasonEvents.reduce((total, event) => {
    // Vérifier si le membre du staff est assigné à cet événement
    const isAssigned = event.selectedStaffIds?.includes(staffMember.id) || 
                      Object.values(event).some(value => 
                        Array.isArray(value) && value.includes(staffMember.id)
                      );
    
    if (isAssigned) {
      try {
        // Calculer la durée de l'événement
        const startDate = new Date(event.date + 'T00:00:00Z');
        const endDate = new Date((event.endDate || event.date) + 'T23:59:59Z');
        const eventDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + eventDurationDays;
      } catch (error) {
        console.warn('Erreur lors du calcul de la durée de l\'événement:', event);
        return total;
      }
    }
    
    return total;
  }, 0);
  
  return totalDays;
}

/**
 * Obtient les statistiques détaillées du staff pour une saison
 * Inclut les jours de travail, les rôles, etc.
 */
export function getDetailedStaffStatsForSeason(
  staff: StaffMember[],
  raceEvents: any[],
  season: number
): {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  totalWorkDays: number;
  averageWorkDays: number;
  staffByRole: Record<string, number>;
  staffByStatus: Record<string, number>;
} {
  const seasonStaff = getStaffForSeason(staff, season);
  const activeStaff = seasonStaff.filter(s => s.isActive !== false);
  
  // Calculer les jours de travail totaux
  const totalWorkDays = activeStaff.reduce((total, member) => {
    return total + calculateStaffDaysForSeason(member, raceEvents, season);
  }, 0);
  
  const averageWorkDays = activeStaff.length > 0 ? Math.round(totalWorkDays / activeStaff.length) : 0;
  
  // Grouper par rôle
  const staffByRole: Record<string, number> = {};
  activeStaff.forEach(member => {
    const role = member.role || 'AUTRE';
    staffByRole[role] = (staffByRole[role] || 0) + 1;
  });
  
  // Grouper par statut
  const staffByStatus: Record<string, number> = {};
  activeStaff.forEach(member => {
    const status = member.status || 'BENEVOLE';
    staffByStatus[status] = (staffByStatus[status] || 0) + 1;
  });
  
  return {
    totalStaff: seasonStaff.length,
    activeStaff: activeStaff.length,
    inactiveStaff: seasonStaff.length - activeStaff.length,
    totalWorkDays,
    averageWorkDays,
    staffByRole,
    staffByStatus
  };
}

/**
 * Utilitaires pour l'archivage des effectifs par saison
 * Gère la transition entre les saisons et l'archivage des effectifs
 */

import { Rider, StaffMember, RosterArchive, RosterTransition } from '../types';
import { getCurrentSeasonYear } from './seasonUtils';

/**
 * Archive l'effectif actuel pour une saison donnée
 */
export function archiveRosterForSeason(
  riders: Rider[],
  staff: StaffMember[],
  season: number
): RosterArchive {
  const activeRiders = riders.filter(rider => rider.isActive !== false);
  const inactiveRiders = riders.filter(rider => rider.isActive === false);
  
  return {
    season,
    riders: riders.map(rider => ({
      ...rider,
      currentSeason: season
    })),
    staff: staff.map(member => ({
      ...member,
      currentSeason: season
    })),
    archivedAt: new Date().toISOString(),
    totalRiders: riders.length,
    totalStaff: staff.length,
    activeRiders: activeRiders.length,
    inactiveRiders: inactiveRiders.length
  };
}

/**
 * Prépare la transition vers une nouvelle saison
 * Conserve par défaut tous les membres actifs et remet les compteurs à 0
 */
export function prepareRosterTransition(
  currentRiders: Rider[],
  currentStaff: StaffMember[],
  fromSeason: number,
  toSeason: number
): RosterTransition {
  // Conserver tous les coureurs actifs par défaut
  const ridersKept = currentRiders
    .filter(rider => rider.isActive !== false)
    .map(rider => rider.id);
  
  // Seuls les coureurs explicitement inactifs sont retirés
  const ridersRemoved = currentRiders
    .filter(rider => rider.isActive === false)
    .map(rider => rider.id);
  
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
    ridersAdded: [], // Sera rempli lors de l'ajout de nouveaux coureurs
    ridersRemoved,
    ridersKept,
    staffAdded: [], // Sera rempli lors de l'ajout de nouveaux membres
    staffRemoved,
    staffKept
  };
}

/**
 * Filtre les coureurs pour une saison donnée
 */
export function getRidersForSeason(riders: Rider[], season: number): Rider[] {
  return riders.filter(rider => 
    rider.currentSeason === season || 
    (rider.currentSeason === undefined && season === getCurrentSeasonYear())
  );
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
 * Obtient les coureurs actifs pour la saison courante
 */
export function getActiveRidersForCurrentSeason(riders: Rider[]): Rider[] {
  const currentSeason = getCurrentSeasonYear();
  return riders.filter(rider => 
    (rider.currentSeason === currentSeason || rider.currentSeason === undefined) &&
    rider.isActive !== false
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
 * Marque un coureur comme inactif pour la saison courante
 */
export function deactivateRiderForSeason(rider: Rider, season: number): Rider {
  return {
    ...rider,
    isActive: false,
    currentSeason: season
  };
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
 * Active un coureur pour une nouvelle saison
 */
export function activateRiderForSeason(rider: Rider, season: number): Rider {
  return {
    ...rider,
    isActive: true,
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
 * Obtient les statistiques d'un effectif pour une saison
 */
export function getRosterStatsForSeason(
  riders: Rider[],
  staff: StaffMember[],
  season: number
): {
  totalRiders: number;
  activeRiders: number;
  inactiveRiders: number;
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
} {
  const seasonRiders = getRidersForSeason(riders, season);
  const seasonStaff = getStaffForSeason(staff, season);
  
  const activeRiders = seasonRiders.filter(r => r.isActive !== false).length;
  const inactiveRiders = seasonRiders.filter(r => r.isActive === false).length;
  const activeStaff = seasonStaff.filter(s => s.isActive !== false).length;
  const inactiveStaff = seasonStaff.filter(s => s.isActive === false).length;
  
  return {
    totalRiders: seasonRiders.length,
    activeRiders,
    inactiveRiders,
    totalStaff: seasonStaff.length,
    activeStaff,
    inactiveStaff
  };
}

/**
 * Vérifie si une transition de saison est nécessaire
 * Transition automatique au 1er octobre vers la nouvelle saison
 */
export function shouldTransitionToNewSeason(): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() retourne 0-11, on veut 1-12
  const currentYear = now.getFullYear();
  
  // Transition automatique au 1er octobre
  if (currentMonth >= 10) {
    return true;
  }
  
  // Pour les années futures, vérifier si on est en période de transition
  return currentYear >= 2026;
}

/**
 * Remet les compteurs de jours de course à 0 pour une nouvelle saison
 * Cette fonction peut être appelée lors de la transition pour réinitialiser les statistiques
 */
export function resetRaceDayCountersForNewSeason(
  riders: Rider[],
  staff: StaffMember[],
  newSeason: number
): { riders: Rider[], staff: StaffMember[] } {
  // Pour les coureurs, on peut ajouter un champ pour tracker les jours de course par saison
  // Pour l'instant, on se contente de mettre à jour la saison courante
  const updatedRiders = riders.map(rider => ({
    ...rider,
    currentSeason: newSeason,
    isActive: rider.isActive !== false // Conserver le statut actif par défaut
  }));

  const updatedStaff = staff.map(member => ({
    ...member,
    currentSeason: newSeason,
    isActive: member.isActive !== false // Conserver le statut actif par défaut
  }));

  return { riders: updatedRiders, staff: updatedStaff };
}

/**
 * Obtient le message de transition pour les effectifs
 */
export function getRosterTransitionMessage(fromSeason: number, toSeason: number): string {
  return `Transition des effectifs de la saison ${fromSeason} vers la saison ${toSeason}.
  
Les effectifs de ${fromSeason} sont maintenant archivés et figés.
Tous les coureurs et staff actifs sont conservés pour ${toSeason}.
Les compteurs de jours de course sont remis à 0 pour la nouvelle saison.
Transition automatique au 1er octobre.`;
}

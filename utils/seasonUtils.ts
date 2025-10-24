/**
 * Utilitaires pour la gestion des saisons et transitions
 */

/**
 * Détermine l'année de saison courante basée sur la date actuelle
 * Transition automatique au 1er octobre vers la saison suivante
 * Force 2026 comme année de planification prévisionnelle
 */
export const getCurrentSeasonYear = (): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() retourne 0-11, on veut 1-12
  
  // Force 2026 comme année de planification prévisionnelle
  if (currentYear <= 2026) {
    // Transition automatique au 1er octobre vers 2026
    if (currentMonth >= 10) {
      return 2026;
    }
    // Avant octobre, rester sur l'année courante
    return currentYear;
  }
  
  // À partir d'octobre (mois 10), on considère déjà la saison suivante
  if (currentMonth >= 10) {
    return currentYear + 1;
  }
  
  return currentYear;
};

/**
 * Détermine si on est en période de transition de saison
 * (octobre à décembre - période de transition vers la saison suivante)
 */
export const isInSeasonTransition = (): boolean => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  return currentMonth >= 10;
};

/**
 * Obtient l'année de saison pour une date donnée
 */
export const getSeasonYearForDate = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // À partir d'octobre, on considère la saison suivante
  if (month >= 10) {
    return year + 1;
  }
  
  return year;
};

/**
 * Obtient la période de transition pour une année donnée
 * Retourne les mois où la saison est considérée comme active
 */
export const getSeasonTransitionPeriod = (year: number): { startMonth: number; endMonth: number } => {
  return {
    startMonth: 10, // Octobre de l'année précédente
    endMonth: 9     // Septembre de l'année courante
  };
};

/**
 * Vérifie si une date est dans la période de transition d'une saison
 */
export const isDateInSeasonTransition = (date: Date, seasonYear: number): boolean => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Pour la saison 2026, on considère octobre 2025 à septembre 2026
  if (seasonYear === 2026) {
    return (year === 2025 && month >= 10) || (year === 2026 && month <= 9);
  }
  
  // Logique générale
  return (year === seasonYear - 1 && month >= 10) || (year === seasonYear && month <= 9);
};

/**
 * Obtient le label de saison avec indication de transition
 */
export const getSeasonLabel = (year: number, showTransition: boolean = true): string => {
  if (!showTransition) {
    return `Saison ${year}`;
  }
  
  const now = new Date();
  const currentSeason = getCurrentSeasonYear();
  
  if (year === currentSeason && isInSeasonTransition()) {
    return `Saison ${year} (Transition active)`;
  }
  
  return `Saison ${year}`;
};

/**
 * Obtient les années de saison disponibles pour les sélecteurs
 * Inclut la logique de transition et s'assure que 2026 est toujours disponible
 */
export const getAvailableSeasonYears = (): number[] => {
  const currentSeason = getCurrentSeasonYear();
  const years: number[] = [];
  
  // Inclure les 3 années précédentes et les 2 années suivantes
  for (let i = currentSeason - 3; i <= currentSeason + 2; i++) {
    years.push(i);
  }
  
  // S'assurer que 2026 est toujours disponible pour la planification prévisionnelle
  if (!years.includes(2026) && currentSeason <= 2026) {
    years.push(2026);
  }
  
  return years.sort((a, b) => b - a); // Tri décroissant
};

/**
 * Détermine si une saison est "active" (en cours ou en transition)
 */
export const isSeasonActive = (year: number): boolean => {
  const currentSeason = getCurrentSeasonYear();
  return year === currentSeason;
};

/**
 * Obtient le statut de transition pour une saison
 */
export const getSeasonTransitionStatus = (year: number): 'upcoming' | 'transition' | 'active' | 'past' => {
  const currentSeason = getCurrentSeasonYear();
  
  if (year < currentSeason) {
    return 'past';
  } else if (year > currentSeason) {
    return 'upcoming';
  } else if (year === currentSeason && isInSeasonTransition()) {
    return 'transition';
  } else {
    return 'active';
  }
};

/**
 * Obtient les années de planification prévisionnelle disponibles
 * Inclut 2026 et les années suivantes pour la planification
 */
export const getPlanningYears = (): number[] => {
  const currentSeason = getCurrentSeasonYear();
  const years: number[] = [];
  
  // Inclure l'année courante et les 3 années suivantes
  for (let i = currentSeason; i <= currentSeason + 3; i++) {
    years.push(i);
  }
  
  // S'assurer que 2026 est toujours inclus pour la planification
  if (!years.includes(2026) && currentSeason <= 2026) {
    years.push(2026);
  }
  
  return years.sort((a, b) => a - b); // Tri croissant pour la planification
};

/**
 * Vérifie si une année est une année de planification prévisionnelle
 */
export const isPlanningYear = (year: number): boolean => {
  return year >= getCurrentSeasonYear() && year <= getCurrentSeasonYear() + 3;
};

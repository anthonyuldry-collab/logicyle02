/**
 * Utilitaires pour la gestion des dates dans l'application
 * Assure une gestion cohérente des dates et des fuseaux horaires
 */

/**
 * Convertit une date string en objet Date en utilisant UTC pour éviter les problèmes de fuseau horaire
 * @param dateString - Date au format YYYY-MM-DD
 * @returns Date object en UTC
 */
export const parseEventDate = (dateString: string): Date => {
  return new Date(dateString + "T12:00:00Z");
};

/**
 * Obtient l'année d'un événement de manière cohérente
 * @param eventDate - Date de l'événement
 * @returns Année de l'événement
 */
export const getEventYear = (eventDate: string): number => {
  return parseEventDate(eventDate).getFullYear();
};

/**
 * Vérifie si un événement est dans le futur (incluant l'année courante et les années suivantes)
 * @param eventDate - Date de l'événement
 * @returns true si l'événement est dans le futur
 */
export const isFutureEvent = (eventDate: string): boolean => {
  const eventYear = getEventYear(eventDate);
  const currentYear = new Date().getFullYear();
  
  // Inclure tous les événements de 2026 et des années suivantes pour la planification prévisionnelle
  if (eventYear >= 2026) {
    return true;
  }
  
  // Si l'événement est dans une année future, il est futur
  if (eventYear > currentYear) {
    return true;
  }
  
  // Si l'événement est dans l'année courante, vérifier s'il est dans le futur
  if (eventYear === currentYear) {
    const eventDateObj = parseEventDate(eventDate);
    const eventMonth = eventDateObj.getMonth();
    const eventDay = eventDateObj.getDate();
    const currentMonth = new Date().getMonth();
    const currentDay = new Date().getDate();
    
    // Si l'événement est dans un mois futur de l'année courante
    if (eventMonth > currentMonth) {
      return true;
    }
    
    // Si l'événement est dans le mois courant mais dans le futur
    if (eventMonth === currentMonth && eventDay >= currentDay) {
      return true;
    }
  }
  
  return false;
};

/**
 * Obtient toutes les années disponibles dans une liste d'événements
 * @param events - Liste des événements
 * @param getEventDate - Fonction pour extraire la date d'un événement
 * @returns Liste des années triées par ordre décroissant
 */
export const getAvailableYears = <T>(
  events: T[], 
  getEventDate: (event: T) => string
): number[] => {
  const years = new Set<number>();
  
  events.forEach(event => {
    const year = getEventYear(getEventDate(event));
    years.add(year);
  });
  
  // S'assurer que 2026 est toujours disponible pour la planification prévisionnelle
  const currentYear = new Date().getFullYear();
  if (currentYear <= 2026) {
    years.add(2026);
  }
  
  return Array.from(years).sort((a, b) => b - a);
};

/**
 * Filtre les événements par année
 * @param events - Liste des événements
 * @param yearFilter - Année à filtrer ou 'all' pour toutes les années
 * @param getEventDate - Fonction pour extraire la date d'un événement
 * @returns Événements filtrés par année
 */
export const filterEventsByYear = <T>(
  events: T[],
  yearFilter: number | 'all',
  getEventDate: (event: T) => string
): T[] => {
  if (yearFilter === 'all') return events;
  return events.filter(event => getEventYear(getEventDate(event)) === yearFilter);
};

/**
 * Formate une date pour l'affichage dans l'interface utilisateur
 * @param dateString - Date au format YYYY-MM-DD
 * @param options - Options de formatage
 * @returns Date formatée
 */
export const formatEventDate = (
  dateString: string, 
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
): string => {
  return parseEventDate(dateString).toLocaleDateString('fr-FR', options);
};

/** Course sur plusieurs jours (date de fin différente du début). */
export const isStageRace = (event: { date: string; endDate?: string }): boolean =>
  Boolean(event.endDate && event.endDate !== event.date);

/**
 * Formate les dates d'un événement pour l'affichage, en gérant les courses à étapes
 * @param event - Événement avec date et endDate optionnelle
 * @param options - Options de formatage pour les dates individuelles
 * @returns Date formatée avec gestion des étapes
 */
export const formatEventDateRange = (
  event: { date: string; endDate?: string },
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
): string => {
  const startDate = formatEventDate(event.date, options);
  
  // Si c'est une course à étapes (endDate différente de date)
  if (event.endDate && event.endDate !== event.date) {
    const endDate = formatEventDate(event.endDate, options);
    return `Du ${startDate} au ${endDate}`;
  }
  
  // Sinon, affichage simple
  return startDate;
};

/**
 * Vérifie si une année est l'année de planification prévisionnelle (2026)
 * @param year - Année à vérifier
 * @returns true si c'est l'année de planification
 */
export const isPlanningYear = (year: number): boolean => {
  return year === 2026;
};

/**
 * Fonction de debug pour vérifier les événements futurs
 * @param raceEvents - Liste des événements
 * @returns Informations de debug sur les événements futurs
 */
export const debugFutureEvents = (raceEvents: any[]) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  
  console.log('🔍 Debug des événements futurs:');
  console.log('📅 Date actuelle:', currentDate.toLocaleDateString('fr-FR'));
  console.log('📅 Année actuelle:', currentYear);
  console.log('📅 Mois actuel:', currentMonth + 1);
  console.log('📅 Jour actuel:', currentDay);
  
  raceEvents.forEach(event => {
    const eventDate = parseEventDate(event.date);
    const eventYear = eventDate.getFullYear();
    const eventMonth = eventDate.getMonth();
    const eventDay = eventDate.getDate();
    const isFuture = isFutureEvent(event.date);
    
    console.log(`🏁 ${event.name} (${event.date}):`, {
      année: eventYear,
      mois: eventMonth + 1,
      jour: eventDay,
      estFutur: isFuture,
      raison: isFuture ? 
        (eventYear > currentYear ? 'Année future' : 
         eventMonth > currentMonth ? 'Mois futur' : 
         eventDay >= currentDay ? 'Jour futur/actuel' : 'Inconnu') : 
        'Passé'
    });
  });
};

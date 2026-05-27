import { 
  AppState, 
  PerformanceArchive, 
  GroupAverageArchive, 
  RiderQualityArchive, 
  StaffQualityArchive, 
  TeamMetricsArchive,
  Rider,
  RaceEvent,
  PerformanceEntry,
  RiderRating,
  StaffRating,
  RiderQualitativeProfile,
  ScoutingProfile,
} from '../types';
import { calculateRiderCharacteristics } from './performanceCalculations';
import { getAgeCategory } from './ageUtils';
import { countSeasonWins, countSeasonPodiums, countAllTimeWins } from './fatigueDurabilityUtils';

/** Libellé / valeur saison pour les stats « toutes saisons » */
export const ALL_TIME_STATS_SEASON = 0;
const EMPTY_POWER_AVERAGES = {
  cp: 0,
  power20min: 0,
  power12min: 0,
  power5min: 0,
  power1min: 0,
  power30s: 0,
};

/**
 * Calcule les moyennes de groupe pour une saison donnée
 */
export function calculateGroupAverages(
  riders: Rider[], 
  season: number
): GroupAverageArchive {
  // Calculs d'âge figés à l'année de l'archive
  const ages = riders.map(rider => {
    const birthDate = new Date(rider.birthDate);
    return season - birthDate.getFullYear();
  }).filter(age => !isNaN(age));
  
  const averageAge = ages.length > 0 
    ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
    : 0;
  
  // Répartition par catégorie d'âge avec métriques de puissance
  const ageDistribution = ['U19', 'U23', 'Senior'].map(category => {
    const categoryRiders = riders.filter(r => {
      const { category: riderCategory } = getAgeCategory(r.birthDate);
      return riderCategory === category;
    });
    
    const categoryAges = categoryRiders.map(r => {
      const birthDate = new Date(r.birthDate);
      return season - birthDate.getFullYear();
    }).filter(age => !isNaN(age));
    
    const categoryAverageAge = categoryAges.length > 0 
      ? Math.round((categoryAges.reduce((sum, age) => sum + age, 0) / categoryAges.length) * 10) / 10
      : 0;
    
    // Moyennes de puissance par catégorie
    const powerAverages = {
      cp: 0,
      power20min: 0,
      power12min: 0,
      power5min: 0,
      power1min: 0,
      power30s: 0
    };
    
    if (categoryRiders.length > 0) {
      const ridersWithPower = categoryRiders.filter(r => r.powerProfileFresh);
      if (ridersWithPower.length > 0) {
        powerAverages.cp = Math.round(
          ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.criticalPower || 0), 0) / ridersWithPower.length
        );
        powerAverages.power20min = Math.round(
          ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power20min || 0), 0) / ridersWithPower.length
        );
        powerAverages.power12min = Math.round(
          ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power12min || 0), 0) / ridersWithPower.length
        );
        powerAverages.power5min = Math.round(
          ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power5min || 0), 0) / ridersWithPower.length
        );
        powerAverages.power1min = Math.round(
          ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power1min || 0), 0) / ridersWithPower.length
        );
        powerAverages.power30s = Math.round(
          ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power30s || 0), 0) / ridersWithPower.length
        );
      }
    }
    
    return {
      category,
      count: categoryRiders.length,
      averageAge: categoryAverageAge,
      powerAverages
    };
  });

  // Coureurs avec profil de puissance
  const ridersWithPower = riders.filter(r => r.powerProfileFresh?.criticalPower).length;
  const powerCoverage = riders.length > 0 
    ? Math.round((ridersWithPower / riders.length) * 100) 
    : 0;

  // Moyennes globales de puissance
  const overallPowerAverages = {
    cp: 0,
    power20min: 0,
    power12min: 0,
    power5min: 0,
    power1min: 0,
    power30s: 0
  };

  if (ridersWithPower > 0) {
    overallPowerAverages.cp = Math.round(
      riders.reduce((sum, r) => sum + (r.powerProfileFresh?.criticalPower || 0), 0) / ridersWithPower
    );
    overallPowerAverages.power20min = Math.round(
      riders.reduce((sum, r) => sum + (r.powerProfileFresh?.power20min || 0), 0) / ridersWithPower
    );
    overallPowerAverages.power12min = Math.round(
      riders.reduce((sum, r) => sum + (r.powerProfileFresh?.power12min || 0), 0) / ridersWithPower
    );
    overallPowerAverages.power5min = Math.round(
      riders.reduce((sum, r) => sum + (r.powerProfileFresh?.power5min || 0), 0) / ridersWithPower
    );
    overallPowerAverages.power1min = Math.round(
      riders.reduce((sum, r) => sum + (r.powerProfileFresh?.power1min || 0), 0) / ridersWithPower
    );
    overallPowerAverages.power30s = Math.round(
      riders.reduce((sum, r) => sum + (r.powerProfileFresh?.power30s || 0), 0) / ridersWithPower
    );
  }

  return {
    season,
    totalRiders: riders.length,
    averageAge,
    ageDistribution,
    overallPowerAverages,
    powerCoverage
  };
}

/**
 * Construit une entrée d'archive pour un coureur (effectif actif ou retiré)
 */
export function buildRiderQualityArchive(
  rider: Rider,
  performanceEntries: PerformanceEntry[],
  season: number,
  options?: { markAsRemoved?: boolean }
): RiderQualityArchive {
  const seasonStart = new Date(season, 0, 1);
  const seasonEnd = new Date(season, 11, 31, 23, 59, 59);

  const seasonEntries = performanceEntries.filter(entry => {
    const entryDate = new Date(entry.id.split('_')[1] || Date.now());
    return entryDate >= seasonStart && entryDate <= seasonEnd;
  });

  const riderRatings: RiderRating[] = [];
  seasonEntries.forEach(entry => {
    if (entry.riderRatings) {
      const riderRating = entry.riderRatings.find(r => r.riderId === rider.id);
      if (riderRating) {
        riderRatings.push(riderRating);
      }
    }
  });

  const validRatings = riderRatings.filter(r =>
    r.collectiveScore !== undefined &&
    r.technicalScore !== undefined &&
    r.physicalScore !== undefined
  );

  const averageCollectiveScore = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + (r.collectiveScore || 0), 0) / validRatings.length
    : 0;

  const averageTechnicalScore = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + (r.technicalScore || 0), 0) / validRatings.length
    : 0;

  const averagePhysicalScore = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + (r.physicalScore || 0), 0) / validRatings.length
    : 0;

  const riderCharacteristics = calculateRiderCharacteristics(rider);
  const qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';

  const lastRatingDate = validRatings.length > 0
    ? seasonEntries
        .filter(entry => entry.riderRatings?.some(r => r.riderId === rider.id))
        .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime())[0]?.id || ''
    : '';

  return {
    riderId: rider.id,
    season,
    averageCollectiveScore: Math.round(averageCollectiveScore * 10) / 10,
    averageTechnicalScore: Math.round(averageTechnicalScore * 10) / 10,
    averagePhysicalScore: Math.round(averagePhysicalScore * 10) / 10,
    charSprint: Math.round(riderCharacteristics.charSprint),
    charAnaerobic: Math.round(riderCharacteristics.charAnaerobic),
    charPuncher: Math.round(riderCharacteristics.charPuncher),
    charClimbing: Math.round(riderCharacteristics.charClimbing),
    charRouleur: Math.round(riderCharacteristics.charRouleur),
    generalPerformanceScore: Math.round(riderCharacteristics.generalPerformanceScore),
    fatigueResistanceScore: Math.round(riderCharacteristics.fatigueResistanceScore),
    totalEvents: seasonEntries.length,
    eventsWithRatings: validRatings.length,
    qualityTrend,
    lastRatingDate,
    firstName: rider.firstName,
    lastName: rider.lastName,
    birthDate: rider.birthDate,
    sex: rider.sex,
    isRemovedFromRoster: options?.markAsRemoved ?? false,
    removedAt: options?.markAsRemoved ? new Date().toISOString() : undefined,
    weightKg: rider.weightKg,
    qualitativeProfile: rider.qualitativeProfile,
    rosterRole: rider.rosterRole,
    powerProfileFresh: rider.powerProfileFresh,
    powerProfile15KJ: rider.powerProfile15KJ,
    powerProfile30KJ: rider.powerProfile30KJ,
    powerProfile45KJ: rider.powerProfile45KJ,
    seasonWins: countSeasonWins(rider, season),
    seasonPodiums: countSeasonPodiums(rider, season),
  };
}

/**
 * Reconstruit un objet Rider minimal depuis une entrée d'archive (coureuse retirée)
 */
export function archiveNoteToRider(note: RiderQualityArchive): Rider {
  return {
    id: note.riderId,
    firstName: note.firstName || 'Inconnu',
    lastName: note.lastName || '',
    birthDate: note.birthDate,
    sex: note.sex,
    weightKg: note.weightKg,
    qualitativeProfile: note.qualitativeProfile ?? RiderQualitativeProfile.AUTRE,
    rosterRole: note.rosterRole,
    powerProfileFresh: note.powerProfileFresh,
    powerProfile15KJ: note.powerProfile15KJ,
    powerProfile30KJ: note.powerProfile30KJ,
    powerProfile45KJ: note.powerProfile45KJ,
  } as Rider;
}

/**
 * Liste des coureuses pour le tableau de puissances dans les archives :
 * effectif actuel + coureuses retirées (données figées).
 */
export function getRidersForArchivePowerAnalysis(
  appState: AppState,
  season: number
): Rider[] {
  const liveRiders = appState.riders || [];
  const liveIds = new Set(liveRiders.map(r => r.id));
  const stored = appState.performanceArchives?.find(a => a.season === season);
  const removedNotes = (stored?.riderQualityNotes || []).filter(
    n => n.isRemovedFromRoster && !liveIds.has(n.riderId)
  );
  const archivedRiders = removedNotes.map(archiveNoteToRider);
  return [...liveRiders, ...archivedRiders];
}

function noteHasPowerOrFatigueProfiles(
  note: Pick<
    RiderQualityArchive,
    'powerProfileFresh' | 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'
  >
): boolean {
  return !!(
    note.powerProfileFresh ||
    note.powerProfile15KJ ||
    note.powerProfile30KJ ||
    note.powerProfile45KJ
  );
}

/**
 * Tous les coureurs / coureuses avec au moins un profil en base :
 * effectif actuel + toutes les entrées d'archives (saison la plus récente par personne si hors effectif).
 */
export function getAllTimePowerAnalysisRiders(appState: AppState): Rider[] {
  const liveRiders = appState.riders || [];
  const liveIds = new Set(liveRiders.map(r => r.id));
  const archivedByRider = new Map<string, { rider: Rider; season: number }>();

  for (const archive of appState.performanceArchives || []) {
    for (const note of archive.riderQualityNotes || []) {
      if (!noteHasPowerOrFatigueProfiles(note)) continue;
      if (liveIds.has(note.riderId)) continue;
      const existing = archivedByRider.get(note.riderId);
      if (!existing || archive.season > existing.season) {
        archivedByRider.set(note.riderId, {
          rider: archiveNoteToRider(note),
          season: archive.season,
        });
      }
    }
  }

  return [...liveRiders, ...Array.from(archivedByRider.values()).map(v => v.rider)];
}

/** Tous les scouts du module Scouting (inclus automatiquement dans les tableaux all time). */
export function getAllScoutingProfilesForAnalysis(appState: AppState): ScoutingProfile[] {
  return appState.scoutingProfiles || [];
}

/** IDs des coureuses avec au moins une victoire sur tout l'historique (resultsHistory + archives). */
export function getAllTimeWinnerRiderIds(
  appState: AppState,
  riders: Rider[]
): Set<string> {
  const ids = new Set<string>();
  riders.forEach(r => {
    if (countAllTimeWins(r) > 0) ids.add(r.id);
  });
  for (const archive of appState.performanceArchives || []) {
    for (const note of archive.riderQualityNotes || []) {
      if ((note.seasonWins ?? 0) > 0) ids.add(note.riderId);
    }
  }
  return ids;
}

/** Coureuses présentes dans les archives mais plus dans l'effectif live */
export function getAllTimeArchivedRiderIds(appState: AppState): Set<string> {
  const liveIds = new Set((appState.riders || []).map(r => r.id));
  const archived = new Set<string>();
  for (const archive of appState.performanceArchives || []) {
    for (const note of archive.riderQualityNotes || []) {
      if (note.isRemovedFromRoster && !liveIds.has(note.riderId)) {
        archived.add(note.riderId);
      }
    }
  }
  return archived;
}

/**
 * Calcule les notes de qualité des coureurs pour une saison
 */
export function calculateRiderQualityNotes(
  riders: Rider[],
  performanceEntries: PerformanceEntry[],
  season: number
): RiderQualityArchive[] {
  return riders
    .map(rider => buildRiderQualityArchive(rider, performanceEntries, season))
    .filter(rider => rider.eventsWithRatings > 0 || rider.generalPerformanceScore > 0);
}

/**
 * Recalcule les moyennes de groupe à partir des notes archivées (inclut les coureuses retirées)
 */
export function recalculateGroupAveragesFromRiderNotes(
  notes: RiderQualityArchive[],
  season: number
): GroupAverageArchive {
  const ages = notes
    .map(n => {
      if (!n.birthDate) return NaN;
      return season - new Date(n.birthDate).getFullYear();
    })
    .filter(age => !isNaN(age));

  const averageAge = ages.length > 0
    ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
    : 0;

  return {
    season,
    totalRiders: notes.length,
    averageAge,
    ageDistribution: [],
    overallPowerAverages: { ...EMPTY_POWER_AVERAGES },
    powerCoverage: 0,
  };
}

/**
 * Ajoute ou met à jour une coureuse dans l'archive de la saison avant retrait de l'effectif
 */
export function addRiderToSeasonArchive(
  archives: PerformanceArchive[],
  rider: Rider,
  performanceEntries: PerformanceEntry[],
  season: number
): PerformanceArchive[] {
  const riderNote = buildRiderQualityArchive(rider, performanceEntries, season, { markAsRemoved: true });
  const existingIndex = archives.findIndex(a => a.season === season);

  if (existingIndex >= 0) {
    const archive = archives[existingIndex];
    const updatedNotes = [
      ...archive.riderQualityNotes.filter(n => n.riderId !== rider.id),
      riderNote,
    ];
    const updatedArchive: PerformanceArchive = {
      ...archive,
      archiveDate: new Date().toISOString(),
      riderQualityNotes: updatedNotes,
      groupAverages: recalculateGroupAveragesFromRiderNotes(updatedNotes, season),
    };
    return archives.map((a, i) => (i === existingIndex ? updatedArchive : a));
  }

  const newArchive: PerformanceArchive = {
    id: `archive-${season}-${Date.now()}`,
    season,
    archiveDate: new Date().toISOString(),
    groupAverages: recalculateGroupAveragesFromRiderNotes([riderNote], season),
    riderQualityNotes: [riderNote],
    staffQualityNotes: [],
    teamMetrics: {
      season,
      totalEvents: 0,
      averageRanking: 0,
      bestRanking: 0,
      worstRanking: 0,
      eventsWithDebriefings: 0,
      completionRate: 0,
    },
  };
  return [...archives, newArchive];
}

/**
 * Fusionne l'archive persistée (coureuses retirées) avec les données live de l'effectif actuel
 */
export function getMergedPerformanceArchive(
  appState: AppState,
  season: number
): PerformanceArchive | null {
  const stored = appState.performanceArchives?.find(a => a.season === season);
  const live = generatePerformanceArchive(appState, season);

  const removedNotes = (stored?.riderQualityNotes || []).filter(n => n.isRemovedFromRoster);
  const liveRiderIds = new Set(live.riderQualityNotes.map(n => n.riderId));
  const archivedOnly = removedNotes.filter(n => !liveRiderIds.has(n.riderId));

  const mergedNotes = [...live.riderQualityNotes, ...archivedOnly];

  if (
    mergedNotes.length === 0 &&
    live.teamMetrics.totalEvents === 0 &&
    live.staffQualityNotes.length === 0
  ) {
    return null;
  }

  return {
    ...live,
    id: stored?.id || live.id,
    riderQualityNotes: mergedNotes,
    groupAverages: {
      ...live.groupAverages,
      totalRiders: mergedNotes.length,
      averageAge: recalculateGroupAveragesFromRiderNotes(mergedNotes, season).averageAge,
    },
  };
}

/**
 * Calcule les notes de qualité du staff pour une saison
 */
export function calculateStaffQualityNotes(
  performanceEntries: PerformanceEntry[],
  season: number
): StaffQualityArchive[] {
  const seasonStart = new Date(season, 0, 1);
  const seasonEnd = new Date(season, 11, 31, 23, 59, 59);
  
  // Collecter tous les staff ratings de la saison
  const staffRatings: { [staffId: string]: StaffRating[] } = {};
  
  performanceEntries.forEach(entry => {
    const entryDate = new Date(entry.id.split('_')[1] || Date.now());
    if (entryDate >= seasonStart && entryDate <= seasonEnd && entry.staffRatings) {
      entry.staffRatings.forEach(staffRating => {
        if (!staffRatings[staffRating.staffId]) {
          staffRatings[staffRating.staffId] = [];
        }
        staffRatings[staffRating.staffId].push(staffRating);
      });
    }
  });

  // Calculer les moyennes pour chaque membre du staff
  return Object.entries(staffRatings).map(([staffId, ratings]) => {
    const validRatings = ratings.filter(r => r.rating > 0);
    
    const averageRating = validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length
      : 0;

    const qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    const lastRatingDate = validRatings.length > 0
      ? validRatings
          .sort((a, b) => new Date(b.eventId).getTime() - new Date(a.eventId).getTime())[0]?.eventId || ''
      : '';

    return {
      staffId,
      season,
      averageRating: Math.round(averageRating * 10) / 10,
      totalEvents: ratings.length,
      eventsWithRatings: validRatings.length,
      qualityTrend,
      lastRatingDate
    };
  }).filter(staff => staff.eventsWithRatings > 0);
}

/**
 * Calcule les métriques de l'équipe pour une saison
 */
export function calculateTeamMetrics(
  performanceEntries: PerformanceEntry[],
  raceEvents: RaceEvent[],
  season: number
): TeamMetricsArchive {
  const seasonStart = new Date(season, 0, 1);
  const seasonEnd = new Date(season, 11, 31, 23, 59, 59);
  
  // Filtrer les événements de la saison
  const seasonEvents = raceEvents.filter(event => {
    const eventDate = new Date(event.startDate);
    return eventDate >= seasonStart && eventDate <= seasonEnd;
  });

  // Filtrer les entrées de performance de la saison
  const seasonEntries = performanceEntries.filter(entry => {
    const entryDate = new Date(entry.id.split('_')[1] || Date.now());
    return entryDate >= seasonStart && entryDate <= seasonEnd;
  });

  // Calculer les métriques
  const rankings = seasonEntries
    .map(entry => entry.raceOverallRanking)
    .filter(ranking => ranking && !isNaN(parseInt(ranking)))
    .map(ranking => parseInt(ranking!));

  const averageRanking = rankings.length > 0
    ? Math.round((rankings.reduce((sum, r) => sum + r, 0) / rankings.length) * 10) / 10
    : 0;

  const bestRanking = rankings.length > 0 ? Math.min(...rankings) : 0;
  const worstRanking = rankings.length > 0 ? Math.max(...rankings) : 0;

  const eventsWithDebriefings = seasonEntries.filter(entry => 
    entry.generalObjectives || entry.resultsSummary || entry.keyLearnings
  ).length;

  const completionRate = seasonEvents.length > 0
    ? Math.round((eventsWithDebriefings / seasonEvents.length) * 100)
    : 0;

  return {
    season,
    totalEvents: seasonEvents.length,
    averageRanking,
    bestRanking,
    worstRanking,
    eventsWithDebriefings,
    completionRate
  };
}

/**
 * Génère une archive complète pour une saison
 */
export function generatePerformanceArchive(
  appState: AppState,
  season: number
): PerformanceArchive {
  const riders = appState.riders || [];
  const performanceEntries = appState.performanceEntries || [];
  const raceEvents = appState.raceEvents || [];

  const groupAverages = calculateGroupAverages(riders, season);
  const riderQualityNotes = calculateRiderQualityNotes(riders, performanceEntries, season);
  const staffQualityNotes = calculateStaffQualityNotes(performanceEntries, season);
  const teamMetrics = calculateTeamMetrics(performanceEntries, raceEvents, season);

  return {
    id: `archive-${season}-${Date.now()}`,
    season,
    archiveDate: new Date().toISOString(),
    groupAverages,
    riderQualityNotes,
    staffQualityNotes,
    teamMetrics
  };
}

/**
 * Compare deux archives pour analyser l'évolution
 */
export function compareArchives(
  currentArchive: PerformanceArchive,
  previousArchive: PerformanceArchive
) {
  const groupComparison = {
    totalRidersChange: currentArchive.groupAverages.totalRiders - previousArchive.groupAverages.totalRiders,
    averageAgeChange: currentArchive.groupAverages.averageAge - previousArchive.groupAverages.averageAge,
    powerCoverageChange: currentArchive.groupAverages.powerCoverage - previousArchive.groupAverages.powerCoverage,
    cpChange: currentArchive.groupAverages.overallPowerAverages.cp - previousArchive.groupAverages.overallPowerAverages.cp,
    power20minChange: currentArchive.groupAverages.overallPowerAverages.power20min - previousArchive.groupAverages.overallPowerAverages.power20min
  };

  const teamComparison = {
    totalEventsChange: currentArchive.teamMetrics.totalEvents - previousArchive.teamMetrics.totalEvents,
    averageRankingChange: currentArchive.teamMetrics.averageRanking - previousArchive.teamMetrics.averageRanking,
    completionRateChange: currentArchive.teamMetrics.completionRate - previousArchive.teamMetrics.completionRate
  };

  return {
    groupComparison,
    teamComparison,
    improvementAreas: [],
    decliningAreas: []
  };
}

/**
 * Vérifie si une archive doit être créée pour une saison donnée
 */
export function shouldCreateArchive(
  appState: AppState,
  season: number
): boolean {
  // Vérifier si une archive existe déjà pour cette saison
  const existingArchive = appState.performanceArchives?.find(archive => archive.season === season);
  if (existingArchive) {
    return false;
  }

  // Vérifier si la saison est terminée (plus de 30 jours après la fin de l'année)
  const seasonEnd = new Date(season, 11, 31, 23, 59, 59);
  const now = new Date();
  const daysSinceSeasonEnd = Math.floor((now.getTime() - seasonEnd.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceSeasonEnd < 30) {
    return false;
  }

  // Vérifier s'il y a des données à archiver
  const hasRiders = (appState.riders?.length || 0) > 0;
  const hasPerformanceEntries = (appState.performanceEntries?.length || 0) > 0;
  const hasRaceEvents = (appState.raceEvents?.length || 0) > 0;

  return hasRiders || hasPerformanceEntries || hasRaceEvents;
}

/**
 * Crée et sauvegarde une archive pour une saison donnée
 */
export async function createAndSaveArchive(
  appState: AppState,
  season: number,
  saveFunction: (archives: PerformanceArchive[]) => Promise<void>
): Promise<PerformanceArchive | null> {
  if (!shouldCreateArchive(appState, season)) {
    return null;
  }

  const archive = generatePerformanceArchive(appState, season);
  const updatedArchives = [...(appState.performanceArchives || []), archive];
  
  try {
    await saveFunction(updatedArchives);
    return archive;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'archive:', error);
    return null;
  }
}

/**
 * Vérifie et crée les archives manquantes pour toutes les saisons
 */
export async function checkAndCreateMissingArchives(
  appState: AppState,
  saveFunction: (archives: PerformanceArchive[]) => Promise<void>
): Promise<PerformanceArchive[]> {
  const currentYear = new Date().getFullYear();
  const createdArchives: PerformanceArchive[] = [];

  // Vérifier les 5 dernières années
  for (let year = currentYear - 1; year >= currentYear - 5; year--) {
    const archive = await createAndSaveArchive(appState, year, saveFunction);
    if (archive) {
      createdArchives.push(archive);
    }
  }

  return createdArchives;
}

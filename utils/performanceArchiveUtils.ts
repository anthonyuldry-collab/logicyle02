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
  StaffRating
} from '../types';
import { calculateRiderCharacteristics } from './performanceCalculations';
import { getAgeCategory } from './ageUtils';

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
 * Calcule les notes de qualité des coureurs pour une saison
 */
export function calculateRiderQualityNotes(
  riders: Rider[],
  performanceEntries: PerformanceEntry[],
  season: number
): RiderQualityArchive[] {
  const seasonStart = new Date(season, 0, 1);
  const seasonEnd = new Date(season, 11, 31, 23, 59, 59);
  
  return riders.map(rider => {
    // Filtrer les entrées de performance de la saison
    const seasonEntries = performanceEntries.filter(entry => {
      const entryDate = new Date(entry.id.split('_')[1] || Date.now());
      return entryDate >= seasonStart && entryDate <= seasonEnd;
    });

    // Collecter toutes les notes du coureur
    const riderRatings: RiderRating[] = [];
    seasonEntries.forEach(entry => {
      if (entry.riderRatings) {
        const riderRating = entry.riderRatings.find(r => r.riderId === rider.id);
        if (riderRating) {
          riderRatings.push(riderRating);
        }
      }
    });

    // Calculer les moyennes
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

    // Calculer les caractéristiques du coureur
    const riderCharacteristics = calculateRiderCharacteristics(rider);

    // Déterminer la tendance (simplifié)
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
      // Caractéristiques détaillées
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
      lastRatingDate
    };
  }).filter(rider => rider.eventsWithRatings > 0 || rider.generalPerformanceScore > 0); // Inclure les coureurs avec des évaluations ou des caractéristiques
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

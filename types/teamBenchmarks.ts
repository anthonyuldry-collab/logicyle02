import { PerformanceArchive, Rider } from '../types';

/** Données effectif pour repères anonymes (non filtrées vue coureur) */
export interface TeamBenchmarkData {
  riders: Rider[];
  performanceArchives: PerformanceArchive[];
}

export type PerformanceConnectionId =
  | 'nolio'
  | 'trainingpeaks'
  | 'intervals'
  | 'garmin'
  | 'coros'
  | 'whoop'
  | 'strava'
  | 'polar'
  | 'suunto'
  | 'wahoo';

export type PerformanceConnectionAvailability = 'live' | 'coming_soon';

export interface PerformanceConnectionProvider {
  id: PerformanceConnectionId;
  name: string;
  /** Court descriptif des données sync */
  syncs: string;
  /** Catégorie pour le groupement UI */
  category: 'planning' | 'analytics' | 'wearable' | 'ecosystem';
  availability: PerformanceConnectionAvailability;
  /** Couleur d’accent (hex) pour pastille / bordure */
  accent: string;
  website?: string;
}

/** Plateformes pour mise à jour auto des données de performance athlète. */
export const PERFORMANCE_CONNECTION_PROVIDERS: PerformanceConnectionProvider[] = [
  {
    id: 'nolio',
    name: 'Nolio',
    syncs: 'Plans, séances, volume, distance, dénivelé',
    category: 'planning',
    availability: 'live',
    accent: '#2563eb',
    website: 'https://www.nolio.io',
  },
  {
    id: 'trainingpeaks',
    name: 'TrainingPeaks',
    syncs: 'TSS, PMC, séances planifiées, métriques charge',
    category: 'planning',
    availability: 'coming_soon',
    accent: '#ea580c',
    website: 'https://www.trainingpeaks.com',
  },
  {
    id: 'intervals',
    name: 'Intervals.icu',
    syncs: 'Puissance, fitness, fatigue, analyses avancées',
    category: 'analytics',
    availability: 'coming_soon',
    accent: '#0d9488',
    website: 'https://intervals.icu',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    syncs: 'Activités, GPS, FC, puissance, récupération',
    category: 'ecosystem',
    availability: 'coming_soon',
    accent: '#0284c7',
    website: 'https://connect.garmin.com',
  },
  {
    id: 'coros',
    name: 'COROS',
    syncs: 'Activités montre, GPS, entraînement',
    category: 'ecosystem',
    availability: 'coming_soon',
    accent: '#dc2626',
    website: 'https://www.coros.com',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    syncs: 'Récupération, HRV, sommeil, strain',
    category: 'wearable',
    availability: 'coming_soon',
    accent: '#a3e635',
    website: 'https://www.whoop.com',
  },
  {
    id: 'strava',
    name: 'Strava',
    syncs: 'Activités, segments, effort relatif',
    category: 'ecosystem',
    availability: 'coming_soon',
    accent: '#fc4c02',
    website: 'https://www.strava.com',
  },
  {
    id: 'polar',
    name: 'Polar Flow',
    syncs: 'Activités, FC, charge d’entraînement',
    category: 'ecosystem',
    availability: 'coming_soon',
    accent: '#d4a017',
    website: 'https://flow.polar.com',
  },
  {
    id: 'suunto',
    name: 'Suunto',
    syncs: 'Activités, GPS, métriques montre',
    category: 'ecosystem',
    availability: 'coming_soon',
    accent: '#b45309',
    website: 'https://www.suunto.com',
  },
  {
    id: 'wahoo',
    name: 'Wahoo / SYSTM',
    syncs: 'Home trainer, séances indoor, puissance',
    category: 'ecosystem',
    availability: 'coming_soon',
    accent: '#e11d48',
    website: 'https://www.wahoofitness.com',
  },
];

export const PERFORMANCE_CONNECTION_CATEGORY_LABELS: Record<
  PerformanceConnectionProvider['category'],
  { fr: string; en: string }
> = {
  planning: { fr: 'Planification', en: 'Planning' },
  analytics: { fr: 'Analyse', en: 'Analytics' },
  wearable: { fr: 'Récupération & wearables', en: 'Recovery & wearables' },
  ecosystem: { fr: 'Montres & capteurs', en: 'Watches & sensors' },
};

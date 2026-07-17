import { BikeComponentWear, BikeSetup, BikeWearTracking } from '../types';

export type WearComponentKey = keyof BikeWearTracking;

export interface WearComponentConfig {
  key: WearComponentKey;
  label: string;
  icon: string;
  defaultMaxKm: number;
  hint: string;
}

export const WEAR_COMPONENTS: WearComponentConfig[] = [
  { key: 'chain', label: 'Chaîne', icon: '⛓', defaultMaxKm: 3000, hint: 'Remplacer entre 2 000 et 4 000 km selon conditions' },
  { key: 'tireFront', label: 'Pneu avant', icon: '🛞', defaultMaxKm: 3500, hint: 'Surveiller l\'usure du centre de la bande de roulement' },
  { key: 'tireRear', label: 'Pneu arrière', icon: '🛞', defaultMaxKm: 2500, hint: 'Usure plus rapide qu\'à l\'avant' },
  { key: 'brakePads', label: 'Plaquettes', icon: '🛑', defaultMaxKm: 2000, hint: 'Contrôler l\'épaisseur du composé régulièrement' },
];

export type WearStatus = 'good' | 'watch' | 'replace';

export function getWearPercent(wear: BikeComponentWear): number {
  if (!wear.maxKm || wear.maxKm <= 0) return 0;
  return Math.min(100, Math.round((wear.currentKm / wear.maxKm) * 100));
}

export function getWearStatus(percent: number): WearStatus {
  if (percent >= 85) return 'replace';
  if (percent >= 65) return 'watch';
  return 'good';
}

export const WEAR_STATUS_LABELS: Record<WearStatus, string> = {
  good: 'Bon état',
  watch: 'À surveiller',
  replace: 'À remplacer',
};

export const WEAR_STATUS_COLORS: Record<WearStatus, { bar: string; bg: string; text: string; ring: string }> = {
  good: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
  watch: { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  replace: { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' },
};

export function defaultWearItem(maxKm: number): BikeComponentWear {
  return { currentKm: 0, maxKm };
}

export function ensureBikeWear(setup: BikeSetup): BikeWearTracking {
  const wear = setup.wear ?? {};
  const result: BikeWearTracking = { ...wear };
  for (const cfg of WEAR_COMPONENTS) {
    if (!result[cfg.key]) {
      result[cfg.key] = defaultWearItem(cfg.defaultMaxKm);
    }
  }
  return result;
}

export function countWearAlerts(setups: BikeSetup[]): number {
  return setups.reduce((acc, setup) => {
    const wear = ensureBikeWear(setup);
    return acc + WEAR_COMPONENTS.filter(cfg => {
      const item = wear[cfg.key];
      return item && getWearStatus(getWearPercent(item)) !== 'good';
    }).length;
  }, 0);
}

export function getMostUrgentWear(setups: BikeSetup[]): { label: string; percent: number } | null {
  let best: { label: string; percent: number } | null = null;
  for (const setup of setups) {
    const wear = ensureBikeWear(setup);
    for (const cfg of WEAR_COMPONENTS) {
      const item = wear[cfg.key];
      if (!item) continue;
      const percent = getWearPercent(item);
      if (!best || percent > best.percent) {
        best = { label: cfg.label, percent };
      }
    }
  }
  return best;
}

export type BikeSetupKey = 'roadBikeSetup' | 'ttBikeSetup';

export const BIKE_SETUP_META: Record<BikeSetupKey, { title: string; subtitle: string; accent: string; gradient: string }> = {
  roadBikeSetup: {
    title: 'Vélo Route',
    subtitle: 'Setup course & entraînement',
    accent: 'border-rose-500',
    gradient: 'from-rose-500 to-pink-600',
  },
  ttBikeSetup: {
    title: 'Vélo CLM',
    subtitle: 'Contre-la-montre / triathlon',
    accent: 'border-orange-500',
    gradient: 'from-orange-500 to-amber-600',
  },
};

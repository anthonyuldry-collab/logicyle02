import {
  PowerProfile,
  PowerProfileHistory,
  PowerProfileHistoryEntry,
  Rider,
} from '../types';
import { getCurrentSeasonYear } from './seasonUtils';

export type PowerProfileSlot =
  | 'powerProfileFresh'
  | 'powerProfile15KJ'
  | 'powerProfile30KJ'
  | 'powerProfile45KJ';

export interface PowerTimelinePoint {
  id: string;
  date: string;
  label: string;
  isCurrent?: boolean;
  weightKg?: number;
  powerProfileFresh?: PowerProfile;
  powerProfile15KJ?: PowerProfile;
  powerProfile30KJ?: PowerProfile;
  powerProfile45KJ?: PowerProfile;
  notes?: string;
}

export interface PowerMetricSeriesPoint {
  date: string;
  label: string;
  value: number;
  isCurrent?: boolean;
}

export type PeriodDeltaPreset = '30d' | '90d' | 'season';

export interface PeriodDeltaResult {
  preset: PeriodDeltaPreset;
  label: string;
  pct: number | null;
  absolute: number | null;
  fromDate: string | null;
  toDate: string | null;
  fromValue: number | null;
  toValue: number | null;
}

const PROFILE_SLOT_LABELS: Record<PowerProfileSlot, string> = {
  powerProfileFresh: 'Frais',
  powerProfile15KJ: '15 kJ/kg',
  powerProfile30KJ: '30 kJ/kg',
  powerProfile45KJ: '45 kJ/kg',
};

export function getPowerProfileSlotLabel(slot: PowerProfileSlot): string {
  return PROFILE_SLOT_LABELS[slot];
}

export function formatPowerProgressDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/** Début de saison sportive étiquetée N = 1er novembre N−1. */
export function getSeasonStartIso(seasonYear = getCurrentSeasonYear()): string {
  return new Date(seasonYear - 1, 10, 1).toISOString();
}

export function getWkgFromProfiles(
  profiles: Pick<
    PowerTimelinePoint,
    | 'weightKg'
    | 'powerProfileFresh'
    | 'powerProfile15KJ'
    | 'powerProfile30KJ'
    | 'powerProfile45KJ'
  >,
  slot: PowerProfileSlot,
  metric: keyof PowerProfile,
  fallbackWeight?: number
): number | null {
  const watts = profiles[slot]?.[metric];
  const weight = profiles.weightKg || fallbackWeight;
  if (watts == null || !weight || weight <= 0) return null;
  return watts / weight;
}

/** Δ% perte vs frais (négatif = perte). */
export function getDropPctFromProfiles(
  profiles: Pick<
    PowerTimelinePoint,
    | 'weightKg'
    | 'powerProfileFresh'
    | 'powerProfile15KJ'
    | 'powerProfile30KJ'
    | 'powerProfile45KJ'
  >,
  slot: Exclude<PowerProfileSlot, 'powerProfileFresh'>,
  metric: keyof PowerProfile,
  fallbackWeight?: number
): number | null {
  const fresh = getWkgFromProfiles(profiles, 'powerProfileFresh', metric, fallbackWeight);
  const fatigued = getWkgFromProfiles(profiles, slot, metric, fallbackWeight);
  if (fresh == null || fatigued == null || fresh === 0) return null;
  return ((fatigued - fresh) / fresh) * 100;
}

export interface BuildTimelineInput {
  history?: PowerProfileHistory | PowerProfileHistoryEntry[] | null;
  current?: {
    weightKg?: number;
    powerProfileFresh?: PowerProfile;
    powerProfile15KJ?: PowerProfile;
    powerProfile30KJ?: PowerProfile;
    powerProfile45KJ?: PowerProfile;
  } | null;
  currentDateIso?: string;
  currentLabel?: string;
}

/** Timeline chronologique (ancien → récent), avec point « Actuel » en tête de temps. */
export function buildPowerTimeline(input: BuildTimelineInput): PowerTimelinePoint[] {
  const rawEntries = Array.isArray(input.history)
    ? input.history
    : input.history?.entries ?? [];

  const points: PowerTimelinePoint[] = rawEntries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    label: formatPowerProgressDate(entry.date),
    weightKg: entry.weightKg,
    powerProfileFresh: entry.powerProfileFresh,
    powerProfile15KJ: entry.powerProfile15KJ,
    powerProfile30KJ: entry.powerProfile30KJ,
    powerProfile45KJ: entry.powerProfile45KJ,
    notes: entry.notes,
  }));

  if (input.current) {
    const hasAnyProfile =
      Boolean(input.current.powerProfileFresh) ||
      Boolean(input.current.powerProfile15KJ) ||
      Boolean(input.current.powerProfile30KJ) ||
      Boolean(input.current.powerProfile45KJ);
    if (hasAnyProfile || input.current.weightKg) {
      points.push({
        id: 'current',
        date: input.currentDateIso || new Date().toISOString(),
        label: input.currentLabel || 'Actuel',
        isCurrent: true,
        weightKg: input.current.weightKg,
        powerProfileFresh: input.current.powerProfileFresh,
        powerProfile15KJ: input.current.powerProfile15KJ,
        powerProfile30KJ: input.current.powerProfile30KJ,
        powerProfile45KJ: input.current.powerProfile45KJ,
      });
    }
  }

  return points.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function buildPowerTimelineFromRider(rider: Rider): PowerTimelinePoint[] {
  return buildPowerTimeline({
    history: rider.powerProfileHistory,
    current: {
      weightKg: rider.weightKg,
      powerProfileFresh: rider.powerProfileFresh,
      powerProfile15KJ: rider.powerProfile15KJ,
      powerProfile30KJ: rider.powerProfile30KJ,
      powerProfile45KJ: rider.powerProfile45KJ,
    },
  });
}

export function getWkgSeries(
  timeline: PowerTimelinePoint[],
  slot: PowerProfileSlot,
  metric: keyof PowerProfile,
  fallbackWeight?: number
): PowerMetricSeriesPoint[] {
  const series: PowerMetricSeriesPoint[] = [];
  timeline.forEach((point) => {
    const value = getWkgFromProfiles(point, slot, metric, fallbackWeight);
    if (value == null) return;
    series.push({
      date: point.date,
      label: point.label,
      value,
      isCurrent: point.isCurrent,
    });
  });
  return series;
}

export function getDropSeries(
  timeline: PowerTimelinePoint[],
  slot: Exclude<PowerProfileSlot, 'powerProfileFresh'>,
  metric: keyof PowerProfile,
  fallbackWeight?: number
): PowerMetricSeriesPoint[] {
  const series: PowerMetricSeriesPoint[] = [];
  timeline.forEach((point) => {
    const value = getDropPctFromProfiles(point, slot, metric, fallbackWeight);
    if (value == null) return;
    series.push({
      date: point.date,
      label: point.label,
      value,
      isCurrent: point.isCurrent,
    });
  });
  return series;
}

function findReferencePoint(
  timeline: PowerTimelinePoint[],
  targetTime: number
): PowerTimelinePoint | null {
  if (timeline.length === 0) return null;
  const earlierOrEqual = [...timeline]
    .reverse()
    .find((p) => new Date(p.date).getTime() <= targetTime);
  if (earlierOrEqual) return earlierOrEqual;
  return timeline[0];
}

export function getPeriodDelta(
  series: PowerMetricSeriesPoint[],
  preset: PeriodDeltaPreset,
  options?: { seasonStartIso?: string; seasonLabel?: string }
): PeriodDeltaResult {
  const labels: Record<PeriodDeltaPreset, string> = {
    '30d': '30 jours',
    '90d': '90 jours',
    season: options?.seasonLabel || 'Début de saison',
  };

  const empty: PeriodDeltaResult = {
    preset,
    label: labels[preset],
    pct: null,
    absolute: null,
    fromDate: null,
    toDate: null,
    fromValue: null,
    toValue: null,
  };

  if (series.length < 2) return empty;

  const latest = series[series.length - 1];
  const now = new Date(latest.date).getTime();
  let targetTime: number;
  if (preset === '30d') {
    targetTime = now - 30 * 24 * 60 * 60 * 1000;
  } else if (preset === '90d') {
    targetTime = now - 90 * 24 * 60 * 60 * 1000;
  } else {
    targetTime = new Date(options?.seasonStartIso || getSeasonStartIso()).getTime();
  }

  let ref = [...series]
    .reverse()
    .find((p) => new Date(p.date).getTime() <= targetTime) ?? series[0];

  // Pas d’entrée antérieure assez éloignée : comparer à la plus ancienne
  if (ref.date === latest.date && series.length > 1) {
    ref = series[0];
  }

  if (ref.value === 0 && latest.value === 0) return empty;

  const absolute = latest.value - ref.value;
  const pct = ref.value === 0 ? null : (absolute / Math.abs(ref.value)) * 100;

  return {
    preset,
    label: labels[preset],
    pct,
    absolute,
    fromDate: ref.date,
    toDate: latest.date,
    fromValue: ref.value,
    toValue: latest.value,
  };
}

export function compareTimelinePoints(
  a: PowerTimelinePoint | null,
  b: PowerTimelinePoint | null,
  slot: PowerProfileSlot,
  metric: keyof PowerProfile,
  mode: 'wkg' | 'drop' = 'wkg'
): { aValue: number | null; bValue: number | null; deltaPct: number | null; deltaAbs: number | null } {
  const read =
    mode === 'wkg'
      ? (p: PowerTimelinePoint) => getWkgFromProfiles(p, slot, metric)
      : (p: PowerTimelinePoint) =>
          slot === 'powerProfileFresh'
            ? null
            : getDropPctFromProfiles(
                p,
                slot as Exclude<PowerProfileSlot, 'powerProfileFresh'>,
                metric
              );

  const aValue = a ? read(a) : null;
  const bValue = b ? read(b) : null;
  if (aValue == null || bValue == null) {
    return { aValue, bValue, deltaPct: null, deltaAbs: null };
  }
  const deltaAbs = bValue - aValue;
  const deltaPct = aValue === 0 ? null : (deltaAbs / Math.abs(aValue)) * 100;
  return { aValue, bValue, deltaPct, deltaAbs };
}

export function findTimelinePointById(
  timeline: PowerTimelinePoint[],
  id: string | null | undefined
): PowerTimelinePoint | null {
  if (!id) return null;
  return timeline.find((p) => p.id === id) ?? null;
}

/** Points utiles pour un sparkline dense (max N), conserve les bornes. */
export function downsampleSeries(
  series: PowerMetricSeriesPoint[],
  maxPoints = 24
): PowerMetricSeriesPoint[] {
  if (series.length <= maxPoints) return series;
  const result: PowerMetricSeriesPoint[] = [];
  const step = (series.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    result.push(series[idx]);
  }
  return result;
}

export { findReferencePoint };

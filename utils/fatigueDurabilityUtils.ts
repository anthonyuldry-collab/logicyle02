import { Rider, ResultItem } from '../types';
import { getAgeCategory } from './ageUtils';

export const POWER_DURATIONS = [
  { key: '1s', label: '1s', field: 'power1s' as const },
  { key: '5s', label: '5s', field: 'power5s' as const },
  { key: '30s', label: '30s', field: 'power30s' as const },
  { key: '1min', label: '1min', field: 'power1min' as const },
  { key: '3min', label: '3min', field: 'power3min' as const },
  { key: '5min', label: '5min', field: 'power5min' as const },
  { key: '12min', label: '12min', field: 'power12min' as const },
  { key: '20min', label: '20min', field: 'power20min' as const },
  { key: 'cp', label: 'CP', field: 'criticalPower' as const },
];

export type FatigueKjLevel = 'd15' | 'd30' | 'd45';

export interface FatigueDropRow {
  d15?: number;
  d30?: number;
  d45?: number;
}

export type FatigueDropMatrix = Record<string, FatigueDropRow>;

export interface DurabilityBenchmarkCell {
  durationKey: string;
  kjLevel: FatigueKjLevel;
  teamAverageDrop: number | null;
  teamMinDrop: number | null;
  teamMaxDrop: number | null;
  winnerAverageDrop: number | null;
  winnerMinDrop: number | null;
  winnerMaxDrop: number | null;
  eliteDrop: number | null;
  winnerCount: number;
  sampleCount: number;
}

/** Libellé lisible durée + charge fatigue */
export function formatFatigueCellLabel(durationKey: string, kjLevel: FatigueKjLevel): string {
  const kj = kjLevel === 'd15' ? '15' : kjLevel === 'd30' ? '30' : '45';
  const dur = POWER_DURATIONS.find(d => d.key === durationKey)?.label ?? durationKey;
  return `${dur} @ ${kj} kJ/kg`;
}

export function formatDropPct(value: number | null | undefined, digits = 1): string {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(digits)}%`;
}

export interface PotentialReason {
  durationKey: string;
  kjLevel: FatigueKjLevel;
  label: string;
  riderDrop: number;
  /** elite_resistance | above_winners_ref | best_in_category */
  type: 'elite_resistance' | 'above_winners_ref' | 'best_in_category';
  teamAvg: number | null;
  teamMin: number | null;
  teamMax: number | null;
  winnerAvg: number | null;
  eliteThreshold: number | null;
  category: string;
  explanation: string;
}

export interface RiderDurabilityPotential {
  riderId: string;
  riderName: string;
  category: string;
  highlights: string[];
  reasons: PotentialReason[];
}

export interface CategoryFatigueReport {
  category: string;
  riderCount: number;
  benchmarks: DurabilityBenchmarkCell[];
}

export interface FatigueAnalysisReport {
  season: number;
  globalBenchmarks: DurabilityBenchmarkCell[];
  byCategory: CategoryFatigueReport[];
  winnerRiderCount: number;
  riderWithFatigueCount: number;
}

function parseRank(result: ResultItem): number | null {
  const raw = result.position ?? result.rank;
  if (raw === undefined || raw === null) return null;
  const rank = typeof raw === 'string' ? parseInt(raw.replace(/\D/g, ''), 10) : raw;
  return !isNaN(rank) && rank > 0 ? rank : null;
}

function resultMatchesSeason(result: ResultItem, season: number): boolean {
  if (result.season === String(season)) return true;
  if (!result.date) return false;
  const year = new Date(result.date).getFullYear();
  return year === season;
}

/** Compte les victoires sur une saison (resultsHistory) */
export function countSeasonWins(rider: Rider, season: number): number {
  return (rider.resultsHistory || []).filter(r => {
    const rank = parseRank(r);
    return rank === 1 && resultMatchesSeason(r, season);
  }).length;
}

/** Victoires cumulées sur tout l'historique resultsHistory (toutes saisons) */
export function countAllTimeWins(rider: Rider): number {
  return (rider.resultsHistory || []).filter(r => {
    const rank = parseRank(r);
    return rank === 1;
  }).length;
}

export function countSeasonPodiums(rider: Rider, season: number): number {
  return (rider.resultsHistory || []).filter(r => {
    const rank = parseRank(r);
    return rank !== null && rank <= 3 && resultMatchesSeason(r, season);
  }).length;
}

export type FatigueAnalysisSubject = Pick<
  Rider,
  | 'id'
  | 'weightKg'
  | 'powerProfileFresh'
  | 'powerProfile15KJ'
  | 'powerProfile30KJ'
  | 'powerProfile45KJ'
>;

/** Vérifie si le sujet a assez de données pour l'analyse fatigue */
export function hasFatigueProfiles(
  item: Pick<
    Rider,
    'weightKg' | 'powerProfileFresh' | 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'
  >
): boolean {
  return !!(
    item.weightKg &&
    item.weightKg > 0 &&
    item.powerProfileFresh &&
    (item.powerProfile15KJ || item.powerProfile30KJ || item.powerProfile45KJ)
  );
}

export function hasFreshPowerProfile(
  item: Pick<Rider, 'powerProfileFresh' | 'weightKg'>
): boolean {
  return !!(item.powerProfileFresh && item.weightKg && item.weightKg > 0);
}

/** % de perte W/kg entre profil frais et profils fatigue (coureuses ou scouts) */
export function getFatigueDropPercentages(subject: FatigueAnalysisSubject): FatigueDropMatrix {
  const results: FatigueDropMatrix = {};
  const weight = subject.weightKg || 0;
  if (!weight || weight <= 0) return results;

  POWER_DURATIONS.forEach(duration => {
    const fresh = (subject.powerProfileFresh as Record<string, number | undefined>)?.[duration.field];
    const k15 = (subject.powerProfile15KJ as Record<string, number | undefined>)?.[duration.field];
    const k30 = (subject.powerProfile30KJ as Record<string, number | undefined>)?.[duration.field];
    const k45 = (subject.powerProfile45KJ as Record<string, number | undefined>)?.[duration.field];

    if (!fresh || fresh <= 0) {
      results[duration.key] = {};
      return;
    }

    const freshWkg = fresh / weight;
    const calc = (v?: number) =>
      v && v > 0 ? ((v / weight - freshWkg) / freshWkg) * 100 : undefined;

    results[duration.key] = {
      d15: calc(k15),
      d30: calc(k30),
      d45: calc(k45),
    };
  });

  return results;
}

export function getDropColorClass(drop?: number): string {
  if (drop === undefined || drop >= -2) return 'text-gray-800';
  const absDrop = Math.abs(drop);
  if (absDrop <= 10) return 'text-yellow-600 font-semibold';
  if (absDrop <= 20) return 'text-orange-600 font-semibold';
  return 'text-red-600 font-semibold';
}

export function isStrongFatigueDrop(drop?: number): boolean {
  return drop !== undefined && drop < -20;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function minValue(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.min(...values);
}

function maxValue(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.max(...values);
}

/** Meilleure résistance = perte la plus faible (valeur la plus proche de 0, ex. -2% > -18%) */
function eliteDropValue(values: number[]): number | null {
  if (values.length === 0) return null;
  return maxValue(values);
}

const AGE_CATEGORIES = ['U15', 'U17', 'U19', 'U23', 'Senior'] as const;

function collectBenchmarkCells(
  subjects: Array<FatigueAnalysisSubject & { birthDate?: string }>,
  winnerRiderIds: Set<string>,
  categoryFilter: string
): DurabilityBenchmarkCell[] {
  const filtered = subjects.filter(s => {
    if (!hasFatigueProfiles(s)) return false;
    if (categoryFilter === 'all') return true;
    return getAgeCategory(s.birthDate).category === categoryFilter;
  });

  const cells: DurabilityBenchmarkCell[] = [];
  const kjLevels: FatigueKjLevel[] = ['d15', 'd30', 'd45'];

  POWER_DURATIONS.forEach(duration => {
    kjLevels.forEach(kjLevel => {
      const allDrops: number[] = [];
      const winnerDrops: number[] = [];

      filtered.forEach(subject => {
        const drops = getFatigueDropPercentages(subject)[duration.key];
        const value = drops?.[kjLevel];
        if (value === undefined) return;
        allDrops.push(value);
        if (winnerRiderIds.has(subject.id)) {
          winnerDrops.push(value);
        }
      });

      const sorted = [...allDrops].sort((a, b) => b - a);
      const topQuartile = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.25)));

      cells.push({
        durationKey: duration.key,
        kjLevel,
        teamAverageDrop: average(allDrops),
        teamMinDrop: minValue(allDrops),
        teamMaxDrop: maxValue(allDrops),
        winnerAverageDrop: average(winnerDrops),
        winnerMinDrop: minValue(winnerDrops),
        winnerMaxDrop: maxValue(winnerDrops),
        eliteDrop: eliteDropValue(topQuartile),
        winnerCount: winnerDrops.length,
        sampleCount: allDrops.length,
      });
    });
  });

  return cells;
}

/**
 * Repères par catégorie d'âge : moyenne effectif, moyenne gagnantes, seuil élite (top 25 % résistance)
 */
export function computeDurabilityBenchmarks(
  riders: Rider[],
  _season: number,
  winnerRiderIds: Set<string>,
  categoryFilter: string = 'all'
): DurabilityBenchmarkCell[] {
  return collectBenchmarkCells(riders, winnerRiderIds, categoryFilter);
}

/** Rapport complet : stats globales + découpage par catégorie d'âge */
export function computeFatigueAnalysisReport(
  riders: Rider[],
  season: number,
  winnerRiderIds: Set<string>
): FatigueAnalysisReport {
  const withFatigue = riders.filter(hasFatigueProfiles);

  const byCategory: CategoryFatigueReport[] = AGE_CATEGORIES.map(category => {
    const inCat = withFatigue.filter(
      r => getAgeCategory(r.birthDate).category === category
    );
    return {
      category,
      riderCount: inCat.length,
      benchmarks: collectBenchmarkCells(withFatigue, winnerRiderIds, category),
    };
  }).filter(c => c.riderCount > 0);

  return {
    season,
    globalBenchmarks: collectBenchmarkCells(withFatigue, winnerRiderIds, 'all'),
    byCategory,
    winnerRiderCount: winnerRiderIds.size,
    riderWithFatigueCount: withFatigue.length,
  };
}

/** Détecte les coureuses au-dessus des repères (avec justification chiffrée) */
export function detectDurabilityPotentials(
  riders: Rider[],
  benchmarks: DurabilityBenchmarkCell[],
  winnerRiderIds: Set<string>,
  categoryFilter: string = 'all',
  categoryBenchmarks?: Map<string, DurabilityBenchmarkCell[]>
): RiderDurabilityPotential[] {
  const potentials: RiderDurabilityPotential[] = [];
  const globalMap = new Map(benchmarks.map(b => [`${b.durationKey}-${b.kjLevel}`, b]));

  const enduranceDurations = ['5min', '12min', '20min', 'cp'];

  riders.forEach(rider => {
    if (!hasFatigueProfiles(rider)) return;
    const { category } = getAgeCategory(rider.birthDate);
    if (categoryFilter !== 'all' && category !== categoryFilter) return;

    const catCells = categoryBenchmarks?.get(category) ?? benchmarks;
    const catMap = new Map(catCells.map(b => [`${b.durationKey}-${b.kjLevel}`, b]));

    const drops = getFatigueDropPercentages(rider);
    const reasons: PotentialReason[] = [];
    const isWinner = winnerRiderIds.has(rider.id);

    (['d45', 'd30', 'd15'] as FatigueKjLevel[]).forEach(kjLevel => {
      enduranceDurations.forEach(durationKey => {
        const drop = drops[durationKey]?.[kjLevel];
        const benchGlobal = globalMap.get(`${durationKey}-${kjLevel}`);
        const benchCat = catMap.get(`${durationKey}-${kjLevel}`);
        const bench = benchCat?.sampleCount ? benchCat : benchGlobal;
        if (drop === undefined || !bench || bench.sampleCount < 2) return;

        const label = formatFatigueCellLabel(durationKey, kjLevel);

        if (
          bench.winnerAverageDrop !== null &&
          bench.winnerCount >= 1 &&
          drop > bench.winnerAverageDrop + 3 &&
          !isWinner
        ) {
          reasons.push({
            durationKey,
            kjLevel,
            label,
            riderDrop: drop,
            type: 'above_winners_ref',
            teamAvg: bench.teamAverageDrop,
            teamMin: bench.teamMinDrop,
            teamMax: bench.teamMaxDrop,
            winnerAvg: bench.winnerAverageDrop,
            eliteThreshold: bench.eliteDrop,
            category,
            explanation:
              `Perte ${formatDropPct(drop)} vs moy. gagnantes ${formatDropPct(bench.winnerAverageDrop)} ` +
              `(effectif ${category}: min ${formatDropPct(bench.teamMinDrop)}, moy ${formatDropPct(bench.teamAverageDrop)}, max ${formatDropPct(bench.teamMaxDrop)}, n=${bench.sampleCount})`,
          });
        } else if (
          bench.eliteDrop !== null &&
          drop >= bench.eliteDrop - 1 &&
          bench.sampleCount >= 4
        ) {
          reasons.push({
            durationKey,
            kjLevel,
            label,
            riderDrop: drop,
            type: 'elite_resistance',
            teamAvg: bench.teamAverageDrop,
            teamMin: bench.teamMinDrop,
            teamMax: bench.teamMaxDrop,
            winnerAvg: bench.winnerAverageDrop,
            eliteThreshold: bench.eliteDrop,
            category,
            explanation:
              `Résistance élite : perte ${formatDropPct(drop)} ≥ seuil top 25% (${formatDropPct(bench.eliteDrop)}) ` +
              `— effectif ${category} moy ${formatDropPct(bench.teamAverageDrop)} [${formatDropPct(bench.teamMinDrop)} … ${formatDropPct(bench.teamMaxDrop)}]`,
          });
        } else if (
          bench.teamMinDrop !== null &&
          drop >= bench.teamMinDrop &&
          bench.sampleCount >= 3 &&
          drop > (bench.teamAverageDrop ?? -999) + 5
        ) {
          reasons.push({
            durationKey,
            kjLevel,
            label,
            riderDrop: drop,
            type: 'best_in_category',
            teamAvg: bench.teamAverageDrop,
            teamMin: bench.teamMinDrop,
            teamMax: bench.teamMaxDrop,
            winnerAvg: bench.winnerAverageDrop,
            eliteThreshold: bench.eliteDrop,
            category,
            explanation:
              `Meilleure que la moyenne catégorie : ${formatDropPct(drop)} vs moy ${formatDropPct(bench.teamAverageDrop)} ` +
              `(min cat. ${formatDropPct(bench.teamMinDrop)}, max ${formatDropPct(bench.teamMaxDrop)})`,
          });
        }
      });
    });

    if (reasons.length > 0) {
      const sorted = [...reasons].sort((a, b) => b.riderDrop - a.riderDrop);
      potentials.push({
        riderId: rider.id,
        riderName: `${rider.firstName} ${rider.lastName}`.trim(),
        category,
        highlights: sorted.map(r => r.explanation).slice(0, 4),
        reasons: sorted,
      });
    }
  });

  return potentials.sort((a, b) => b.reasons.length - a.reasons.length);
}

/** Cellules avec au moins une mesure (pour tableaux de synthèse) */
export function getBenchmarksWithData(
  cells: DurabilityBenchmarkCell[],
  minSamples = 1
): DurabilityBenchmarkCell[] {
  return cells.filter(c => c.sampleCount >= minSamples);
}

export function getBenchmarkForCell(
  benchmarks: DurabilityBenchmarkCell[],
  durationKey: string,
  kjLevel: FatigueKjLevel
): DurabilityBenchmarkCell | undefined {
  return benchmarks.find(b => b.durationKey === durationKey && b.kjLevel === kjLevel);
}

/** Compare une cellule à la référence gagnantes */
export function compareToWinnerRef(
  drop: number | undefined,
  bench: DurabilityBenchmarkCell | undefined
): 'above' | 'below' | 'neutral' | null {
  if (drop === undefined || !bench || bench.winnerAverageDrop === null) return null;
  if (drop > bench.winnerAverageDrop + 2) return 'above';
  if (drop < bench.winnerAverageDrop - 5) return 'below';
  return 'neutral';
}

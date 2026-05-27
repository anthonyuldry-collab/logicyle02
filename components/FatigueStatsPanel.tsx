import React, { useMemo, useState } from 'react';
import {
  FatigueAnalysisReport,
  DurabilityBenchmarkCell,
  RiderDurabilityPotential,
  formatDropPct,
  formatFatigueCellLabel,
  getBenchmarksWithData,
  type FatigueKjLevel,
} from '../utils/fatigueDurabilityUtils';
import BenchmarkStatsTable, {
  type BenchmarkStatsRow,
  type BenchmarkStatsSection,
} from './BenchmarkStatsTable';

interface FatigueStatsPanelProps {
  report: FatigueAnalysisReport;
  categoryFilter: string;
  statsRows: DurabilityBenchmarkCell[];
  potentials: RiderDurabilityPotential[];
  winnerCount: number;
  isAllTime?: boolean;
}

const KEY_DURATIONS = ['5min', '12min', '20min', 'cp'];
const KEY_KJ: FatigueKjLevel[] = ['d30', 'd45'];

const KJ_SECTION_LABEL: Record<FatigueKjLevel, string> = {
  d15: '15 kJ/kg',
  d30: '30 kJ/kg',
  d45: '45 kJ/kg',
};

function toFatigueBenchmarkRows(
  cells: DurabilityBenchmarkCell[],
  showWinnerColumn: boolean
): BenchmarkStatsRow[] {
  return cells.map(bench => ({
    id: `${bench.durationKey}-${bench.kjLevel}`,
    label: formatFatigueCellLabel(bench.durationKey, bench.kjLevel).replace(/ @ \d+ kJ\/kg$/, ''),
    sampleCount: bench.sampleCount,
    min: formatDropPct(bench.teamMinDrop),
    avg: formatDropPct(bench.teamAverageDrop),
    max: formatDropPct(bench.teamMaxDrop),
    winnerAvg:
      showWinnerColumn && bench.winnerCount > 0
        ? formatDropPct(bench.winnerAverageDrop)
        : null,
    winnerTitle:
      bench.winnerCount > 0
        ? `Gagnantes : ${formatDropPct(bench.winnerMinDrop)} – ${formatDropPct(bench.winnerMaxDrop)}`
        : undefined,
    elite: formatDropPct(bench.eliteDrop),
  }));
}

const FatigueStatsPanel: React.FC<FatigueStatsPanelProps> = ({
  report,
  categoryFilter,
  statsRows,
  potentials,
  winnerCount,
  isAllTime = false,
}) => {
  const [viewMode, setViewMode] = useState<'key' | 'all'>('key');

  const showWinnerColumn = useMemo(
    () => winnerCount > 0 && statsRows.some(b => b.winnerCount > 0),
    [winnerCount, statsRows]
  );

  const keyCells = useMemo(
    () =>
      statsRows.filter(
        b => KEY_DURATIONS.includes(b.durationKey) && KEY_KJ.includes(b.kjLevel)
      ),
    [statsRows]
  );

  const sections = useMemo((): BenchmarkStatsSection[] => {
    if (viewMode === 'all') {
      const rows = toFatigueBenchmarkRows(statsRows, showWinnerColumn);
      return rows.length ? [{ id: 'all', title: 'Toutes les mesures', rows }] : [];
    }
    return KEY_KJ.map(kj => {
      const cells = keyCells
        .filter(b => b.kjLevel === kj)
        .sort(
          (a, b) =>
            KEY_DURATIONS.indexOf(a.durationKey) - KEY_DURATIONS.indexOf(b.durationKey)
        );
      return {
        id: kj,
        title: KJ_SECTION_LABEL[kj],
        subtitle: '5 · 12 · 20 min · CP',
        rows: toFatigueBenchmarkRows(cells, showWinnerColumn),
      };
    }).filter(s => s.rows.length > 0);
  }, [viewMode, statsRows, keyCells, showWinnerColumn]);

  const categoryLabel =
    categoryFilter !== 'all' ? categoryFilter : 'Toutes catégories';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-indigo-100 text-indigo-900 px-2 py-1 font-medium">
          {isAllTime ? 'All time · toutes saisons' : `Saison ${report.season}`}
        </span>
        <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-1">
          {report.riderWithFatigueCount} profils fatigue
        </span>
        {winnerCount > 0 && (
          <span className="rounded-md bg-green-100 text-green-800 px-2 py-1">
            {winnerCount} gagnante{winnerCount > 1 ? 's' : ''}
          </span>
        )}
        <span className="rounded-md bg-slate-800 text-white px-2 py-1 font-semibold">
          % perte W/kg
        </span>
      </div>

      {statsRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-b border-slate-200 bg-slate-50">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Repères pertes fatigue</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{categoryLabel}</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('key')}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  viewMode === 'key'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Repères clés
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  viewMode === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tout
              </button>
            </div>
          </div>

          <BenchmarkStatsTable
            sections={sections}
            unitLabel="%"
            showWinnerColumn={showWinnerColumn}
            measureColumnLabel="Durée"
            caption="Plus la valeur est proche de 0, meilleure est la résistance (moins de perte de puissance)"
          />

          <details className="border-t border-slate-100 text-xs">
            <summary className="px-3 py-2 text-slate-600 cursor-pointer hover:bg-slate-50 list-none [&::-webkit-details-marker]:hidden">
              ℹ️ Potentiel & lecture des repères
            </summary>
            <ul className="px-3 pb-3 text-slate-600 space-y-1 list-disc list-inside">
              <li>
                <strong>Min</strong> = pertes les plus fortes · <strong>Max</strong> = meilleures résistances.
              </li>
              <li>
                <strong>Top 25 %</strong> = seuil du quartile le plus résistant (détection « résistance élite »).
              </li>
              <li>
                <strong>Gagn.</strong> = moyenne des vainqueuses (+ marge pour le potentiel « au-dessus réf.
                gagnantes »).
              </li>
            </ul>
          </details>
        </div>
      )}

      {categoryFilter === 'all' && report.byCategory.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="px-3 py-2.5 text-sm font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 list-none flex justify-between [&::-webkit-details-marker]:hidden">
            <span>Par catégorie d&apos;âge</span>
            <span className="text-xs font-normal text-slate-500">{report.byCategory.length} catégories</span>
          </summary>
          <div className="p-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 border-t border-slate-100 max-h-[32rem] overflow-y-auto">
            {report.byCategory.map(cat => {
              const cells = getBenchmarksWithData(
                cat.benchmarks.filter(
                  b => KEY_DURATIONS.includes(b.durationKey) && b.sampleCount >= 2
                )
              );
              if (cells.length === 0) return null;
              return (
                <div key={cat.category} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-2.5 py-2 bg-indigo-900 text-white text-xs font-semibold">
                    {cat.category}
                    <span className="font-normal opacity-80 ml-1">· {cat.riderCount} coureuses</span>
                  </div>
                  <BenchmarkStatsTable
                    rows={toFatigueBenchmarkRows(cells, false)}
                    unitLabel="%"
                    measureColumnLabel="Durée"
                    maxHeight="max-h-none"
                  />
                </div>
              );
            })}
          </div>
        </details>
      )}

      {potentials.length > 0 && (
        <details className="rounded-xl border border-emerald-200 bg-emerald-50/40">
          <summary className="px-3 py-2.5 text-sm font-semibold text-emerald-900 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            Potentiel détecté ({potentials.length})
          </summary>
          <ul className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto text-xs border-t border-emerald-100">
            {potentials.slice(0, 8).map(p => (
              <li key={p.riderId} className="bg-white/80 rounded-md px-2 py-1.5 border border-emerald-100">
                <span className="font-semibold text-emerald-900">{p.riderName}</span>
                <span className="text-slate-500"> · {p.category}</span>
                {p.reasons[0] && (
                  <p className="text-slate-600 mt-1 leading-snug">{p.reasons[0].explanation}</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {winnerCount === 0 && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Ajoutez des <strong>1ères places</strong> dans l&apos;historique pour la colonne « Gagn. ».
        </p>
      )}
    </div>
  );
};

export default FatigueStatsPanel;

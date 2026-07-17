import React, { useMemo, useState } from 'react';
import {
  PowerStatsReport,
  PowerDurationBenchmarkRow,
  formatPowerStatValue,
  getPowerRowsWithData,
  POWER_DURATION_KEYS,
  type PowerDurationKey,
} from '../utils/performanceInsights';
import BenchmarkStatsTable, {
  type BenchmarkStatsRow,
  type BenchmarkStatsSection,
} from './BenchmarkStatsTable';

const FATIGUE_LABEL: Record<PowerStatsReport['fatigue'], string> = {
  fresh: 'Profil frais',
  '15kj': 'Après 15 kJ/kg',
  '30kj': 'Après 30 kJ/kg',
  '45kj': 'Après 45 kJ/kg',
};

const ENDURANCE_KEYS: PowerDurationKey[] = ['1min', '3min', '5min', '12min', '20min', 'cp'];
const SPRINT_KEYS: PowerDurationKey[] = ['1s', '5s', '30s'];

function toBenchmarkRows(
  rows: PowerDurationBenchmarkRow[],
  mode: 'watts' | 'wattsPerKg',
  hasWinnerColumn: boolean
): BenchmarkStatsRow[] {
  return rows.map(row => ({
    id: row.durationKey,
    label: row.label,
    sampleCount: row.sampleCount,
    min: formatPowerStatValue(row.teamMin, mode),
    avg: formatPowerStatValue(row.teamAverage, mode),
    max: formatPowerStatValue(row.teamMax, mode),
    winnerAvg:
      hasWinnerColumn && row.winnerCount > 0
        ? formatPowerStatValue(row.winnerAverage, mode)
        : null,
    winnerTitle:
      row.winnerCount > 0
        ? `Fourchette gagnantes : ${formatPowerStatValue(row.winnerMin, mode)} – ${formatPowerStatValue(row.winnerMax, mode)}`
        : undefined,
    elite: formatPowerStatValue(row.eliteThreshold, mode),
  }));
}

interface PowerStatsPanelProps {
  report: PowerStatsReport;
  categoryFilter: string;
  statsRows: PowerDurationBenchmarkRow[];
  hasWinnerMeasurements: boolean;
  isAllTime?: boolean;
}

const PowerStatsPanel: React.FC<PowerStatsPanelProps> = ({
  report,
  categoryFilter,
  statsRows,
  hasWinnerMeasurements,
}) => {
  const [showSprint, setShowSprint] = useState(false);
  const unit = report.mode === 'watts' ? 'W' : 'W/kg';
  const mode = report.mode;

  const enduranceRows = useMemo(
    () => statsRows.filter(r => ENDURANCE_KEYS.includes(r.durationKey as PowerDurationKey)),
    [statsRows]
  );

  const sprintRows = useMemo(
    () => statsRows.filter(r => SPRINT_KEYS.includes(r.durationKey as PowerDurationKey)),
    [statsRows]
  );

  const sections = useMemo((): BenchmarkStatsSection[] => {
    const secs: BenchmarkStatsSection[] = [];
    const end = toBenchmarkRows(enduranceRows, mode, hasWinnerMeasurements);
    if (end.length > 0) {
      secs.push({
        id: 'endurance',
        title: 'Endurance',
        subtitle: '1 min → CP',
        rows: end,
      });
    }
    if (showSprint) {
      const spr = toBenchmarkRows(sprintRows, mode, hasWinnerMeasurements);
      if (spr.length > 0) {
        secs.push({
          id: 'sprint',
          title: 'Sprint',
          subtitle: '1 s · 5 s · 30 s',
          rows: spr,
        });
      }
    }
    return secs;
  }, [enduranceRows, sprintRows, showSprint, mode, hasWinnerMeasurements]);

  const allSections = useMemo((): BenchmarkStatsSection[] => {
    const all = toBenchmarkRows(statsRows, mode, hasWinnerMeasurements);
    if (all.length === 0) return [];
    return [{ id: 'all', title: 'Toutes les durées', rows: all }];
  }, [statsRows, mode, hasWinnerMeasurements]);

  const [viewMode, setViewMode] = useState<'focused' | 'all'>('focused');
  const tableSections = viewMode === 'all' ? allSections : sections;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-1">
          {FATIGUE_LABEL[report.fatigue]}
        </span>
        <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-1">
          {report.profileCount} profil{report.profileCount > 1 ? 's' : ''}
        </span>
        <span className="rounded-md bg-slate-800 text-white px-2 py-1 font-semibold tabular-nums">
          {unit}
        </span>
      </div>

      {statsRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Repères effectif</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setViewMode('focused')}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    viewMode === 'focused'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Endurance
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    viewMode === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Tout
                </button>
              </div>
              {viewMode === 'focused' && sprintRows.length > 0 && (
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSprint}
                    onChange={e => setShowSprint(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  + Sprint
                </label>
              )}
            </div>
          </div>

          <BenchmarkStatsTable
            sections={tableSections}
            unitLabel={unit}
            showWinnerColumn={hasWinnerMeasurements}
            caption="Min · Moy · Max · Top 25 %"
          />
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
              const rows = getPowerRowsWithData(
                cat.rows.filter(
                  r =>
                    ENDURANCE_KEYS.includes(r.durationKey as PowerDurationKey) &&
                    r.sampleCount >= 2
                ),
                1
              );
              if (rows.length === 0) return null;
              return (
                <div key={cat.category} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-2.5 py-2 bg-slate-800 text-white text-xs font-semibold">
                    {cat.category}
                    <span className="font-normal opacity-80 ml-1">· {cat.profileCount} profils</span>
                  </div>
                  <BenchmarkStatsTable
                    rows={toBenchmarkRows(rows, mode, false)}
                    unitLabel={unit}
                    measureColumnLabel="Durée"
                    maxHeight="max-h-none"
                  />
                </div>
              );
            })}
          </div>
        </details>
      )}

      {!hasWinnerMeasurements && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Ajoutez des <strong>1ères places</strong> dans l&apos;historique des résultats pour activer la colonne
          « Gagn. ».
        </p>
      )}
    </div>
  );
};

export default PowerStatsPanel;

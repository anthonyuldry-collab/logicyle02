import React, { useEffect, useMemo, useState } from 'react';
import { PowerProfile, PowerProfileHistory, Rider } from '../../types';
import { POWER_DURATIONS } from '../../utils/fatigueDurabilityUtils';
import { getCurrentSeasonYear } from '../../utils/seasonUtils';
import {
  buildPowerTimeline,
  buildPowerTimelineFromRider,
  compareTimelinePoints,
  downsampleSeries,
  findTimelinePointById,
  formatPowerProgressDate,
  getDropSeries,
  getPeriodDelta,
  getPowerProfileSlotLabel,
  getSeasonStartIso,
  getWkgSeries,
  PeriodDeltaPreset,
  PowerProfileSlot,
  PowerTimelinePoint,
} from '../../utils/powerProgressUtils';
import MiniSparkline from './MiniSparkline';

type Theme = 'light' | 'dark';

const TRACKED_METRICS: Array<{ key: keyof PowerProfile; label: string }> = [
  { key: 'power5min', label: '5 min' },
  { key: 'power20min', label: '20 min' },
  { key: 'criticalPower', label: 'CP/FTP' },
  { key: 'power1min', label: '1 min' },
];

interface PowerProgressTrackerProps {
  rider?: Rider;
  /** Alternative au rider : données actuelles + historique (ex. formulaire PowerPPRTab). */
  current?: {
    weightKg?: number;
    powerProfileFresh?: PowerProfile;
    powerProfile15KJ?: PowerProfile;
    powerProfile30KJ?: PowerProfile;
    powerProfile45KJ?: PowerProfile;
  };
  history?: PowerProfileHistory | null;
  theme?: Theme;
  compact?: boolean;
  title?: string;
  className?: string;
}

function deltaTone(pct: number | null, invert = false): string {
  if (pct == null || Math.abs(pct) < 0.05) return 'text-slate-500';
  const positive = invert ? pct < 0 : pct > 0;
  return positive ? 'text-emerald-600' : 'text-rose-600';
}

function formatSignedPct(pct: number | null, digits = 1): string {
  if (pct == null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(digits)}%`;
}

function formatSignedAbs(value: number | null, unit: string, digits = 2): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)} ${unit}`;
}

const PowerProgressTracker: React.FC<PowerProgressTrackerProps> = ({
  rider,
  current,
  history,
  theme = 'light',
  compact = false,
  title = 'Suivi des progrès',
  className = '',
}) => {
  const seasonYear = getCurrentSeasonYear();
  const seasonStartIso = rider?.currentSeasonStartDate || getSeasonStartIso(seasonYear);

  const timeline = useMemo<PowerTimelinePoint[]>(() => {
    if (rider) return buildPowerTimelineFromRider(rider);
    return buildPowerTimeline({
      history: history ?? undefined,
      current: current ?? undefined,
    });
  }, [rider, current, history]);

  const defaultMetric = TRACKED_METRICS[0].key;
  const [metric, setMetric] = useState<keyof PowerProfile>(defaultMetric);
  const [slot, setSlot] = useState<PowerProfileSlot>('powerProfileFresh');
  const [mode, setMode] = useState<'wkg' | 'drop'>('wkg');
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');

  useEffect(() => {
    if (timeline.length < 2) return;
    if (!compareA) setCompareA(timeline[0].id);
    if (!compareB) setCompareB(timeline[timeline.length - 1].id);
  }, [timeline, compareA, compareB]);

  const effectiveMode = slot === 'powerProfileFresh' ? 'wkg' : mode;

  const series = useMemo(() => {
    const fallbackWeight = rider?.weightKg ?? current?.weightKg;
    if (effectiveMode === 'drop' && slot !== 'powerProfileFresh') {
      return getDropSeries(timeline, slot, metric, fallbackWeight);
    }
    return getWkgSeries(
      timeline,
      slot === 'powerProfileFresh' ? 'powerProfileFresh' : slot,
      metric,
      fallbackWeight
    );
  }, [timeline, slot, metric, effectiveMode, rider?.weightKg, current?.weightKg]);

  const sparkValues = useMemo(
    () => downsampleSeries(series).map((p) => p.value),
    [series]
  );

  const periodPresets: PeriodDeltaPreset[] = ['30d', '90d', 'season'];
  const periodDeltas = useMemo(
    () =>
      periodPresets.map((preset) =>
        getPeriodDelta(series, preset, {
          seasonStartIso,
          seasonLabel: `Saison ${seasonYear}`,
        })
      ),
    [series, seasonStartIso, seasonYear]
  );

  const pointA = findTimelinePointById(timeline, compareA);
  const pointB = findTimelinePointById(timeline, compareB);
  const comparison = compareTimelinePoints(
    pointA,
    pointB,
    slot,
    metric,
    effectiveMode
  );

  const panelBg =
    theme === 'light'
      ? 'bg-white border-slate-200'
      : 'bg-slate-800 border-slate-600';
  const muted = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const titleCls = theme === 'light' ? 'text-slate-900' : 'text-slate-100';
  const chipIdle =
    theme === 'light'
      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      : 'bg-slate-700 text-slate-200 hover:bg-slate-600';
  const chipActive = 'bg-indigo-600 text-white';

  if (timeline.length < 2 || series.length < 2) {
    return (
      <div className={`rounded-xl border p-4 ${panelBg} ${className}`}>
        <h4 className={`text-sm font-semibold ${titleCls}`}>{title}</h4>
        <p className={`text-xs mt-1 ${muted}`}>
          Pas encore assez d’historique pour tracer les progrès. Les courbes apparaîtront après au
          moins 2 mesures de puissance.
        </p>
      </div>
    );
  }

  const invertColors = effectiveMode === 'drop';
  const unit = effectiveMode === 'drop' ? 'pts Δ%' : 'W/kg';
  const metricLabel =
    TRACKED_METRICS.find((m) => m.key === metric)?.label ||
    POWER_DURATIONS.find((d) => d.field === metric)?.label ||
    String(metric);

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${panelBg} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className={`text-sm font-semibold ${titleCls}`}>{title}</h4>
          <p className={`text-[11px] mt-0.5 ${muted}`}>
            Sparklines, deltas période et comparaison de 2 dates — {metricLabel} ·{' '}
            {getPowerProfileSlotLabel(slot)}
            {effectiveMode === 'drop' ? ' (perte vs frais)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MiniSparkline
            values={sparkValues}
            width={compact ? 88 : 120}
            height={compact ? 26 : 32}
            invertColors={invertColors}
            ariaLabel={`Évolution ${metricLabel}`}
          />
          <div className="text-right">
            <div className={`text-lg font-bold tabular-nums ${titleCls}`}>
              {series[series.length - 1].value.toFixed(effectiveMode === 'drop' ? 1 : 2)}
              <span className={`text-xs font-medium ml-1 ${muted}`}>{unit}</span>
            </div>
            <div className={`text-[10px] ${muted}`}>{series.length} points</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TRACKED_METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
              metric === m.key ? chipActive : chipIdle
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['powerProfileFresh', 'Frais'],
            ['powerProfile15KJ', '15 kJ'],
            ['powerProfile30KJ', '30 kJ'],
            ['powerProfile45KJ', '45 kJ'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSlot(id);
              if (id === 'powerProfileFresh') setMode('wkg');
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
              slot === id ? chipActive : chipIdle
            }`}
          >
            {label}
          </button>
        ))}
        {slot !== 'powerProfileFresh' && (
          <div className="ml-1 inline-flex rounded-lg overflow-hidden border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('wkg')}
              className={`px-2 py-1 text-[10px] font-medium ${
                mode === 'wkg' ? 'bg-indigo-50 text-indigo-700' : muted
              }`}
            >
              W/kg
            </button>
            <button
              type="button"
              onClick={() => setMode('drop')}
              className={`px-2 py-1 text-[10px] font-medium ${
                mode === 'drop' ? 'bg-indigo-50 text-indigo-700' : muted
              }`}
            >
              Δ% perte
            </button>
          </div>
        )}
      </div>

      {/* Deltas par période */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {periodDeltas.map((delta) => (
          <div
            key={delta.preset}
            className={`rounded-lg border px-3 py-2 ${
              theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-700/50 border-slate-600'
            }`}
          >
            <div className={`text-[10px] uppercase tracking-wide font-semibold ${muted}`}>
              vs {delta.label}
            </div>
            <div className={`text-base font-bold tabular-nums mt-0.5 ${deltaTone(delta.pct, invertColors)}`}>
              {formatSignedPct(delta.pct)}
            </div>
            <div className={`text-[10px] tabular-nums ${muted}`}>
              {formatSignedAbs(delta.absolute, unit, effectiveMode === 'drop' ? 1 : 2)}
              {delta.fromDate && (
                <span className="ml-1">
                  · depuis {formatPowerProgressDate(delta.fromDate)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparaison 2 dates */}
      <div
        className={`rounded-lg border p-3 ${
          theme === 'light' ? 'bg-indigo-50/40 border-indigo-100' : 'bg-slate-700/40 border-slate-600'
        }`}
      >
        <div className={`text-xs font-semibold mb-2 ${titleCls}`}>Comparer 2 dates</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <label className="block">
            <span className={`text-[10px] font-medium ${muted}`}>Date A</span>
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              className={`mt-0.5 w-full text-xs rounded-md border px-2 py-1.5 ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-slate-800 border-slate-500 text-slate-100'
              }`}
            >
              {timeline.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.isCurrent ? ' (actuel)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={`text-[10px] font-medium ${muted}`}>Date B</span>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              className={`mt-0.5 w-full text-xs rounded-md border px-2 py-1.5 ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-slate-800 border-slate-500 text-slate-100'
              }`}
            >
              {timeline.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.isCurrent ? ' (actuel)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className={`text-[10px] ${muted}`}>A</div>
            <div className={`text-sm font-bold tabular-nums ${titleCls}`}>
              {comparison.aValue != null
                ? `${comparison.aValue.toFixed(effectiveMode === 'drop' ? 1 : 2)} ${unit}`
                : '—'}
            </div>
          </div>
          <div className={`text-lg ${muted}`}>→</div>
          <div>
            <div className={`text-[10px] ${muted}`}>B</div>
            <div className={`text-sm font-bold tabular-nums ${titleCls}`}>
              {comparison.bValue != null
                ? `${comparison.bValue.toFixed(effectiveMode === 'drop' ? 1 : 2)} ${unit}`
                : '—'}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className={`text-[10px] ${muted}`}>Écart B − A</div>
            <div
              className={`text-base font-bold tabular-nums ${deltaTone(
                comparison.deltaPct,
                invertColors
              )}`}
            >
              {formatSignedPct(comparison.deltaPct)}
            </div>
            <div className={`text-[10px] tabular-nums ${muted}`}>
              {formatSignedAbs(comparison.deltaAbs, unit, effectiveMode === 'drop' ? 1 : 2)}
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className={muted}>
                <th className="text-left font-medium py-1 pr-3">Date</th>
                <th className="text-right font-medium py-1">Valeur</th>
                <th className="text-right font-medium py-1 pl-3">vs préc.</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().slice(0, 8).map((point, idx, arr) => {
                // arr is newest-first; previous chronologically is next index
                const prev = arr[idx + 1];
                const stepPct =
                  prev && prev.value !== 0
                    ? ((point.value - prev.value) / Math.abs(prev.value)) * 100
                    : null;
                return (
                  <tr
                    key={`${point.date}-${idx}`}
                    className={`border-t ${
                      theme === 'light' ? 'border-slate-100' : 'border-slate-700'
                    }`}
                  >
                    <td className={`py-1.5 pr-3 ${titleCls}`}>
                      {point.label}
                      {point.isCurrent ? ' · actuel' : ''}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${titleCls}`}>
                      {point.value.toFixed(effectiveMode === 'drop' ? 1 : 2)}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums pl-3 ${deltaTone(
                        stepPct,
                        invertColors
                      )}`}
                    >
                      {formatSignedPct(stepPct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PowerProgressTracker;

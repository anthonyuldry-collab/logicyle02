import React, { useMemo, useState } from 'react';
import { RaceEvent, Rider, ScoutingProfile } from '../../types';
import TrophyIcon from '../icons/TrophyIcon';
import UsersIcon from '../icons/UsersIcon';
import PerformanceInsightsAlerts from '../PerformanceInsightsAlerts';
import type { ProjectPilotageStats } from '../../utils/performancePilotageUtils';
import { getAllRiderActionItems, isActionOverdue } from '../../utils/performanceProjectUtils';
import { riderHasProjectContent } from '../../utils/performancePilotageUtils';

type PowerAverages = {
  cp: number;
  power20min: number;
  power12min: number;
  power5min: number;
  power1min: number;
  power30s: number;
  power5s: number;
  power1s: number;
};

type AgeBucket = {
  category: string;
  count: number;
  riders: Rider[];
  powerAverages: PowerAverages;
  powerAveragesWkg: PowerAverages;
};

type RosterBucket = {
  role: string;
  label: string;
  count: number;
  riders: Rider[];
  powerAverages: PowerAverages;
  powerAveragesWkg: PowerAverages;
};

type RecentResult = {
  id: string;
  eventId: string;
  raceOverallRanking?: string;
  resultsSummary?: string;
};

export interface PerformancePoleOverviewProps {
  totalRiders: number;
  femaleRiders: number;
  maleRiders: number;
  ageStats: { average: number; min: number; max: number };
  averageCP: number;
  powerCoverage: number;
  ridersWithPower: number;
  ageDistribution: AgeBucket[];
  rosterDistribution: RosterBucket[];
  projectPilotage: ProjectPilotageStats;
  riders: Rider[];
  scoutingProfiles: ScoutingProfile[];
  recentResults: RecentResult[];
  raceEvents: RaceEvent[];
  onOpenCategory: (detail: {
    type: 'age' | 'roster';
    key: string;
    label: string;
    riders: Rider[];
  }) => void;
  onOpenProjects: () => void;
  onOpenPowers: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  U19: '#3b82f6',
  U23: '#0ea5e9',
  Senior: '#6366f1',
};

const COMPARE_KEYS: Array<{ key: keyof PowerAverages; label: string }> = [
  { key: 'power1s', label: '1s' },
  { key: 'power5s', label: '5s' },
  { key: 'power30s', label: '30s' },
  { key: 'power1min', label: '1min' },
  { key: 'power5min', label: '5min' },
  { key: 'power12min', label: '12min' },
  { key: 'power20min', label: '20min' },
  { key: 'cp', label: 'CP' },
];

const CoverageRing: React.FC<{ pct: number; size?: number; color?: string }> = ({
  pct,
  size = 44,
  color = '#059669',
}) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        className="transition-all duration-500"
      />
    </svg>
  );
};

const GroupedBars: React.FC<{
  categories: AgeBucket[];
  mode: 'W' | 'Wkg';
}> = ({ categories, mode }) => {
  const series = categories.filter((c) => c.count > 0);
  const max = Math.max(
    1,
    ...series.flatMap((c) =>
      COMPARE_KEYS.map((k) => (mode === 'W' ? c.powerAverages[k.key] : c.powerAveragesWkg[k.key]) || 0)
    )
  );

  if (series.length === 0 || max <= 1) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Pas encore assez de profils puissance pour comparer les catégories.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {COMPARE_KEYS.map(({ key, label }) => (
        <div key={key} className="grid grid-cols-[3rem_1fr] gap-2 items-center">
          <span className="text-[11px] font-medium text-gray-500 tabular-nums">{label}</span>
          <div className="space-y-1">
            {series.map((cat) => {
              const value = mode === 'W' ? cat.powerAverages[key] : cat.powerAveragesWkg[key];
              const pct = value > 0 ? Math.round((value / max) * 100) : 0;
              const color = CATEGORY_COLORS[cat.category] || '#64748b';
              return (
                <div key={cat.category} className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-14 text-right text-[11px] tabular-nums text-gray-700">
                    {value > 0 ? (mode === 'W' ? `${value} W` : `${value}`) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-1">
        {series.map((cat) => (
          <span key={cat.category} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748b' }}
            />
            {cat.category}
          </span>
        ))}
      </div>
    </div>
  );
};

const PerformancePoleOverview: React.FC<PerformancePoleOverviewProps> = ({
  totalRiders,
  femaleRiders,
  maleRiders,
  ageStats,
  averageCP,
  powerCoverage,
  ridersWithPower,
  ageDistribution,
  rosterDistribution,
  projectPilotage,
  riders,
  scoutingProfiles,
  recentResults,
  raceEvents,
  onOpenCategory,
  onOpenProjects,
  onOpenPowers,
}) => {
  const [powerMode, setPowerMode] = useState<'W' | 'Wkg'>('W');
  const [showAllPowers, setShowAllPowers] = useState(false);

  const ageSlices = useMemo(
    () =>
      ageDistribution.map((d) => ({
        label: d.category,
        value: d.count,
        color: CATEGORY_COLORS[d.category] || '#94a3b8',
      })),
    [ageDistribution]
  );

  const ageTotal = ageSlices.reduce((s, x) => s + x.value, 0) || 1;
  const donutSize = 132;
  const donutR = donutSize / 2 - 14;
  const donutC = 2 * Math.PI * donutR;
  const donutSegments = useMemo(() => {
    let offset = 0;
    return ageSlices.map((slice) => {
      const dash = (slice.value / ageTotal) * donutC;
      const seg = { ...slice, dash, offset };
      offset += dash;
      return seg;
    });
  }, [ageSlices, ageTotal, donutC]);

  const priorityRiders = projectPilotage.ridersNeedingAttention.slice(0, 6);
  const actionMax = Math.max(
    projectPilotage.actionTotals.planned,
    projectPilotage.actionTotals.in_progress,
    projectPilotage.actionTotals.done,
    1
  );

  return (
    <div className="space-y-5">
      {/* KPI cockpit */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Effectif</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{totalRiders}</p>
            <div className="text-right text-[11px] text-gray-500 leading-tight">
              <div>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 mr-1" />
                {maleRiders} H
              </div>
              <div>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 mr-1" />
                {femaleRiders} F
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${totalRiders ? (maleRiders / totalRiders) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-rose-400"
              style={{ width: `${totalRiders ? (femaleRiders / totalRiders) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Âge moyen</p>
          <p className="text-3xl font-bold text-orange-600 mt-2 tabular-nums">{ageStats.average || '—'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {ageStats.min > 0 ? `${ageStats.min}–${ageStats.max} ans` : 'Données âge incomplètes'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPowers}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left hover:border-blue-300 hover:shadow transition-all"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">CP moyen</p>
          <p className="text-3xl font-bold text-blue-600 mt-2 tabular-nums">
            {averageCP > 0 ? `${averageCP}` : '—'}
            {averageCP > 0 && <span className="text-base font-semibold text-blue-400 ml-1">W</span>}
          </p>
          <p className="text-xs text-blue-600 mt-1">Voir l’analyse puissances →</p>
        </button>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <CoverageRing pct={powerCoverage} color={powerCoverage >= 80 ? '#059669' : powerCoverage >= 50 ? '#d97706' : '#e11d48'} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Couverture power</p>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">{powerCoverage}%</p>
            <p className="text-xs text-gray-500 truncate">
              {ridersWithPower}/{totalRiders} profils renseignés
            </p>
          </div>
        </div>
      </div>

      {/* Age + power comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrophyIcon className="w-4 h-4 text-blue-600" />
              Catégories d’âge
            </h3>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0" style={{ width: donutSize, height: donutSize }}>
              <svg width={donutSize} height={donutSize} className="-rotate-90">
                <circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={donutR}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth={18}
                />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.label}
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutR}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={18}
                    strokeDasharray={`${seg.dash} ${donutC - seg.dash}`}
                    strokeDashoffset={-seg.offset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-gray-900 tabular-nums">{totalRiders}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">athlètes</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {ageDistribution.map((cat) => {
                const pct = totalRiders > 0 ? Math.round((cat.count / totalRiders) * 100) : 0;
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() =>
                      onOpenCategory({
                        type: 'age',
                        key: cat.category,
                        label: cat.category,
                        riders: cat.riders,
                      })
                    }
                    className="w-full rounded-lg border border-gray-100 bg-slate-50 px-3 py-2 text-left hover:border-blue-300 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                        />
                        {cat.category}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-gray-800">{cat.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[cat.category],
                        }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                      <span>{pct}% effectif</span>
                      <span className="tabular-nums">
                        CP{' '}
                        {powerMode === 'W'
                          ? cat.powerAverages.cp
                            ? `${cat.powerAverages.cp} W`
                            : '—'
                          : cat.powerAveragesWkg.cp
                            ? `${cat.powerAveragesWkg.cp}`
                            : '—'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-gray-500">Cliquez une catégorie pour le détail et les profils de fatigue.</p>
        </div>

        <div className="xl:col-span-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Comparaison puissance par catégorie</h3>
              <p className="text-xs text-gray-500">Moyennes fresh · lecture visuelle U19 / U23 / Senior</p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['W', 'Wkg'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPowerMode(mode)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    powerMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'W' ? 'Watts' : 'W/kg'}
                </button>
              ))}
            </div>
          </div>
          <GroupedBars categories={ageDistribution} mode={powerMode} />
          <button
            type="button"
            onClick={() => setShowAllPowers((v) => !v)}
            className="mt-3 text-xs font-medium text-blue-600 hover:underline"
          >
            {showAllPowers ? 'Masquer le détail chiffré' : 'Afficher le détail chiffré'}
          </button>
          {showAllPowers && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              {ageDistribution.map((cat) => {
                const avg = powerMode === 'W' ? cat.powerAverages : cat.powerAveragesWkg;
                const unit = powerMode === 'W' ? 'W' : '';
                return (
                  <div key={cat.category} className="rounded-lg border border-gray-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-gray-800 mb-2">{cat.category}</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      {COMPARE_KEYS.map((k) => (
                        <div key={k.key} className="flex justify-between gap-1">
                          <span className="text-gray-500">{k.label}</span>
                          <span className="font-medium tabular-nums text-gray-800">
                            {avg[k.key] > 0 ? `${avg[k.key]}${unit ? ` ${unit}` : ''}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Projet + roster */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-white/15 bg-slate-900 p-4 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Pilotage projets</h3>
              <p className="text-xs text-slate-400">Couverture, pipeline d’actions et priorités</p>
            </div>
            <button
              type="button"
              onClick={onOpenProjects}
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
            >
              Ouvrir le cockpit →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg bg-indigo-950 border border-indigo-500/30 p-3">
              <p className="text-lg font-bold text-indigo-100 tabular-nums">
                {projectPilotage.contentCoveragePct}%
              </p>
              <p className="text-[11px] text-indigo-200">renseignés</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400"
                  style={{ width: `${projectPilotage.contentCoveragePct}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-amber-950 border border-amber-500/30 p-3">
              <p className="text-lg font-bold text-amber-100 tabular-nums">{projectPilotage.openActions}</p>
              <p className="text-[11px] text-amber-200">ouvertes</p>
            </div>
            <div className="rounded-lg bg-rose-950 border border-rose-500/30 p-3">
              <p className="text-lg font-bold text-rose-100 tabular-nums">{projectPilotage.overdueActions}</p>
              <p className="text-[11px] text-rose-200">en retard</p>
            </div>
            <div className="rounded-lg bg-sky-950 border border-sky-500/30 p-3">
              <p className="text-lg font-bold text-sky-100 tabular-nums">{projectPilotage.topThemes.length}</p>
              <p className="text-[11px] text-sky-200">thèmes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-200">Pipeline</p>
              {(
                [
                  ['Planifiées', projectPilotage.actionTotals.planned, 'bg-blue-500'],
                  ['En cours', projectPilotage.actionTotals.in_progress, 'bg-amber-500'],
                  ['Terminées', projectPilotage.actionTotals.done, 'bg-emerald-500'],
                ] as const
              ).map(([label, value, color]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{label}</span>
                    <span className="tabular-nums font-medium text-white">{value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${Math.round((value / actionMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-200 mb-2">Priorités</p>
              {priorityRiders.length === 0 ? (
                <p className="text-xs text-emerald-200 bg-emerald-950 border border-emerald-500/30 rounded-lg px-3 py-2">
                  Aucune urgence détectée sur les projets.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {priorityRiders.map((rider) => {
                    const overdue = getAllRiderActionItems(rider).filter(isActionOverdue).length;
                    return (
                      <span
                        key={rider.id}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950 px-2 py-1 text-[11px] text-amber-100"
                      >
                        <span className="font-medium">
                          {rider.firstName} {rider.lastName}
                        </span>
                        <span className="text-amber-200">
                          {!riderHasProjectContent(rider)
                            ? 'vide'
                            : overdue > 0
                              ? `${overdue} retard`
                              : 'à compléter'}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              {projectPilotage.topThemes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {projectPilotage.topThemes.slice(0, 5).map((t) => (
                    <span
                      key={t.theme}
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200"
                    >
                      {t.theme} · {t.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-white/15 bg-slate-900 p-4 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-indigo-300" />
            Équipe 1 / Réserve
          </h3>
          <div className="space-y-3">
            {rosterDistribution.map((roster) => {
              const pct = totalRiders > 0 ? Math.round((roster.count / totalRiders) * 100) : 0;
              const cp =
                powerMode === 'W' ? roster.powerAverages.cp : roster.powerAveragesWkg.cp;
              const p20 =
                powerMode === 'W' ? roster.powerAverages.power20min : roster.powerAveragesWkg.power20min;
              const isReserve = roster.role === 'reserve';
              return (
                <button
                  key={roster.role}
                  type="button"
                  onClick={() =>
                    onOpenCategory({
                      type: 'roster',
                      key: roster.role,
                      label: roster.label,
                      riders: roster.riders,
                    })
                  }
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isReserve
                      ? 'border-amber-500/40 bg-amber-950 hover:border-amber-400'
                      : 'border-blue-500/40 bg-blue-950 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                        isReserve ? 'text-amber-100' : 'text-blue-100'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isReserve ? 'bg-amber-400' : 'bg-blue-400'
                        }`}
                      />
                      {roster.label}
                    </span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        isReserve ? 'text-amber-200' : 'text-blue-200'
                      }`}
                    >
                      {roster.count}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isReserve ? 'bg-amber-400' : 'bg-blue-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={`mt-2 flex justify-between text-[11px] ${isReserve ? 'text-amber-200/90' : 'text-blue-200/90'}`}>
                    <span>{pct}% effectif</span>
                    <span className="tabular-nums">
                      CP {cp > 0 ? (powerMode === 'W' ? `${cp} W` : cp) : '—'} · 20′{' '}
                      {p20 > 0 ? (powerMode === 'W' ? `${p20} W` : p20) : '—'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PerformanceInsightsAlerts
        riders={riders}
        scoutingProfiles={scoutingProfiles}
        maxAlerts={5}
        maxInsights={8}
        showInsights
        showAlerts
      />

      {recentResults.length > 0 && (
        <div className="rounded-xl border border-white/15 bg-slate-900 p-4 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrophyIcon className="w-4 h-4 text-amber-400" />
            Derniers résultats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentResults.map((result, index) => {
              const event = raceEvents.find((e) => e.id === result.eventId);
              if (!event) return null;
              return (
                <div
                  key={result.id}
                  className="rounded-lg border border-amber-500/30 bg-amber-950 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{event.name}</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {new Date(event.startDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-300 shrink-0">#{index + 1}</span>
                  </div>
                  {result.raceOverallRanking && (
                    <p className="text-xs text-slate-200 mt-2">
                      <span className="text-slate-400">Classement:</span> {result.raceOverallRanking}
                    </p>
                  )}
                  {result.resultsSummary && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">{result.resultsSummary}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePoleOverview;

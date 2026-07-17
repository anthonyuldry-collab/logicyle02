import React, { useMemo, useState } from 'react';
import { Rider } from '../../types';
import {
  computeGroupAverages,
  computePowerStatsReport,
  formatPowerStatValue,
  getCellInsight,
  getPowerRowsWithData,
  getRiderPowerWatts,
  hasMeaningfulPowerProfile,
  type PowerDurationKey,
} from '../../utils/performanceInsights';
import { getAgeCategory } from '../../utils/ageUtils';
import { getCurrentSeasonYear } from '../../utils/seasonUtils';

const ENDURANCE_KEYS: PowerDurationKey[] = ['1min', '3min', '5min', '12min', '20min', 'cp'];
const SPRINT_KEYS: PowerDurationKey[] = ['1s', '5s', '30s'];

const DURATION_LABELS: Record<PowerDurationKey, string> = {
  '1s': '1 s',
  '5s': '5 s',
  '30s': '30 s',
  '1min': '1 min',
  '3min': '3 min',
  '5min': '5 min',
  '12min': '12 min',
  '20min': '20 min',
  cp: 'Puissance critique',
};

const FATIGUE_TABS = [
  { id: 'fresh' as const, label: 'Frais' },
  { id: '15kj' as const, label: '15 kJ/kg' },
  { id: '30kj' as const, label: '30 kJ/kg' },
  { id: '45kj' as const, label: '45 kJ/kg' },
];

interface AthletePowerViewProps {
  rider: Rider;
  /** Effectif complet pour repères anonymes (hors filtre coureur) */
  teamRiders: Rider[];
  season?: number;
}

const MIN_TEAM_SAMPLE = 2;

function getAthletePower(
  rider: Rider,
  key: PowerDurationKey,
  mode: 'watts' | 'wattsPerKg',
  fatigue: 'fresh' | '15kj' | '30kj' | '45kj'
): number {
  const watts = getRiderPowerWatts(rider, key, fatigue);
  if (mode === 'watts') return watts;
  const w = rider.weightKg ?? 0;
  return w > 0 ? watts / w : 0;
}

function formatAthleteValue(value: number, mode: 'watts' | 'wattsPerKg'): string {
  if (value <= 0) return '—';
  return mode === 'watts' ? `${Math.round(value)} W` : `${value.toFixed(1)} W/kg`;
}

function vsTeamBadge(athlete: number, teamAvg: number | undefined) {
  if (athlete <= 0 || !teamAvg || teamAvg <= 0) {
    return { text: 'Donnée insuffisante', className: 'bg-gray-100 text-gray-500' };
  }
  const pct = Math.round(((athlete - teamAvg) / teamAvg) * 100);
  const sign = pct > 0 ? '+' : '';
  if (pct >= 8) return { text: `${sign}${pct}% vs moy. effectif`, className: 'bg-green-100 text-green-800' };
  if (pct <= -8) return { text: `${sign}${pct}% vs moy. effectif`, className: 'bg-red-100 text-red-800' };
  return { text: `${sign}${pct}% vs moy. effectif`, className: 'bg-slate-100 text-slate-700' };
}

const PowerDurationCard: React.FC<{
  label: string;
  athleteValue: number;
  mode: 'watts' | 'wattsPerKg';
  teamMin?: number;
  teamAvg?: number;
  teamMax?: number;
  elite?: number;
  sampleCount: number;
  showBenchmarks: boolean;
  highlight?: boolean;
}> = ({ label, athleteValue, mode, teamMin, teamAvg, teamMax, elite, sampleCount, showBenchmarks, highlight }) => {
  const badge = showBenchmarks ? vsTeamBadge(athleteValue, teamAvg) : null;
  const unit = mode === 'watts' ? 'W' : 'W/kg';

  return (
    <div
      className={`rounded-xl border p-4 transition-shadow ${
        highlight ? 'border-blue-300 bg-blue-50/40 shadow-sm' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
        {highlight && (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            Au-dessus du groupe
          </span>
        )}
      </div>

      <div className="text-3xl font-bold text-gray-900 tabular-nums mb-3">
        {formatAthleteValue(athleteValue, mode)}
      </div>

      {badge && (
        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full mb-4 ${badge.className}`}>
          {badge.text}
        </span>
      )}

      {showBenchmarks ? (
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Repères effectif (n={sampleCount}, anonyme)
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-rose-700 font-semibold tabular-nums">
                {teamMin != null ? formatPowerStatValue(teamMin, mode) : '—'}
              </div>
              <div className="text-slate-400 mt-0.5">Min</div>
            </div>
            <div>
              <div className="text-slate-900 font-bold tabular-nums">
                {teamAvg != null ? formatPowerStatValue(teamAvg, mode) : '—'}
              </div>
              <div className="text-slate-400 mt-0.5">Moy</div>
            </div>
            <div>
              <div className="text-emerald-700 font-semibold tabular-nums">
                {teamMax != null ? formatPowerStatValue(teamMax, mode) : '—'}
              </div>
              <div className="text-slate-400 mt-0.5">Max</div>
            </div>
          </div>
          {elite != null && (
            <p className="text-xs text-indigo-700 pt-1 border-t border-slate-200">
              Top 25 % effectif : <strong className="tabular-nums">{formatPowerStatValue(elite, mode)} {unit}</strong>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Repères effectif indisponibles (effectif &lt; {MIN_TEAM_SAMPLE} coureurs avec PPR).
        </p>
      )}
    </div>
  );
};

const AthletePowerView: React.FC<AthletePowerViewProps> = ({
  rider,
  teamRiders,
  season = getCurrentSeasonYear(),
}) => {
  const [mode, setMode] = useState<'watts' | 'wattsPerKg'>('wattsPerKg');
  const [fatigue, setFatigue] = useState<'fresh' | '15kj' | '30kj' | '45kj'>('fresh');

  const statsReport = useMemo(
    () =>
      computePowerStatsReport(teamRiders, season, {
        mode,
        fatigue,
        winnerRiderIds: new Set(),
        categoryFilter: 'all',
      }),
    [teamRiders, season, mode, fatigue]
  );

  const teamSampleCount = statsReport.profileCount;
  const showBenchmarks = teamSampleCount >= MIN_TEAM_SAMPLE;

  const groupAverages = useMemo(
    () => computeGroupAverages(teamRiders, mode, fatigue),
    [teamRiders, mode, fatigue]
  );

  const benchmarkRows = useMemo(
    () => getPowerRowsWithData(statsReport.globalRows),
    [statsReport.globalRows]
  );

  const benchmarkByKey = useMemo(() => {
    const map = new Map<PowerDurationKey, (typeof benchmarkRows)[0]>();
    benchmarkRows.forEach(row => map.set(row.durationKey as PowerDurationKey, row));
    return map;
  }, [benchmarkRows]);

  const { category } = getAgeCategory(rider.birthDate);
  const hasProfile = hasMeaningfulPowerProfile(rider, fatigue);

  const renderDurationCards = (keys: PowerDurationKey[]) =>
    keys.map(key => {
      const athleteVal = getAthletePower(rider, key, mode, fatigue);
      const bench = benchmarkByKey.get(key);
      const insight = getCellInsight(rider, key, groupAverages, mode, fatigue);
      if (athleteVal <= 0 && !bench) return null;

      return (
        <PowerDurationCard
          key={key}
          label={DURATION_LABELS[key]}
          athleteValue={athleteVal}
          mode={mode}
          teamMin={bench?.teamMin ?? undefined}
          teamAvg={bench?.teamAverage ?? groupAverages.team[key]}
          teamMax={bench?.teamMax ?? undefined}
          elite={bench?.eliteThreshold ?? undefined}
          sampleCount={bench?.sampleCount ?? teamSampleCount}
          showBenchmarks={showBenchmarks}
          highlight={insight.aboveTeam}
        />
      );
    });

  if (!hasProfile) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        <p className="font-medium">Profil de puissance incomplet</p>
        <p className="text-sm mt-1">
          Complétez vos PPR dans l&apos;onglet Performances pour voir l&apos;analyse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Vos puissances</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Saison {season} · {category} · repères effectif anonymes
            {showBenchmarks ? ` (n=${teamSampleCount})` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(['wattsPerKg', 'watts'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  {m === 'wattsPerKg' ? 'W/kg' : 'W'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {FATIGUE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFatigue(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                fatigue === tab.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 px-1">Sprint</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {renderDurationCards(SPRINT_KEYS)}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 px-1">Endurance</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {renderDurationCards(ENDURANCE_KEYS)}
        </div>
      </div>
    </div>
  );
};

export default AthletePowerView;

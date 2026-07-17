import React, { useMemo, useState } from 'react';
import { Rider } from '../../types';
import {
  computeFatigueAnalysisReport,
  formatDropPct,
  getBenchmarkForCell,
  getBenchmarksWithData,
  getDropColorClass,
  getFatigueDropPercentages,
  hasFatigueProfiles,
  POWER_DURATIONS,
  type FatigueKjLevel,
} from '../../utils/fatigueDurabilityUtils';
import { getAgeCategory } from '../../utils/ageUtils';
import { getCurrentSeasonYear } from '../../utils/seasonUtils';
import { countSeasonWins } from '../../utils/fatigueDurabilityUtils';
import DurabilityLossChart from './DurabilityLossChart';
import PowerProgressTracker from '../performance/PowerProgressTracker';

const SPRINT_KEYS = ['1s', '5s', '30s'];
const ENDURANCE_KEYS = ['1min', '3min', '5min', '12min', '20min', 'cp'];

const KJ_LEVELS: { id: FatigueKjLevel; label: string }[] = [
  { id: 'd15', label: '15 kJ/kg' },
  { id: 'd30', label: '30 kJ/kg' },
  { id: 'd45', label: '45 kJ/kg' },
];

const MIN_TEAM_SAMPLE = 2;

interface AthleteDurabilityViewProps {
  rider: Rider;
  teamRiders: Rider[];
  season?: number;
}

function vsTeamDropBadge(athleteDrop: number | undefined, teamAvg: number | null | undefined) {
  if (athleteDrop === undefined || teamAvg === null || teamAvg === undefined) {
    return { text: '—', className: 'text-gray-400' };
  }
  const diff = athleteDrop - teamAvg;
  if (diff >= 3) {
    return { text: 'Meilleure résistance que la moy.', className: 'text-green-700 bg-green-50' };
  }
  if (diff <= -5) {
    return { text: 'Perte plus marquée que la moy.', className: 'text-red-700 bg-red-50' };
  }
  return { text: 'Proche de la moy. effectif', className: 'text-slate-600 bg-slate-100' };
}

const DropCard: React.FC<{
  label: string;
  athleteDrop?: number;
  teamMin: number | null;
  teamAvg: number | null;
  teamMax: number | null;
  elite: number | null;
  sampleCount: number;
  showBenchmarks: boolean;
}> = ({ label, athleteDrop, teamMin, teamAvg, teamMax, elite, sampleCount, showBenchmarks }) => {
  const badge = showBenchmarks ? vsTeamDropBadge(athleteDrop, teamAvg) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{label}</h4>
      <div className={`text-3xl font-bold tabular-nums mb-2 ${getDropColorClass(athleteDrop)}`}>
        {formatDropPct(athleteDrop)}
      </div>
      {badge && (
        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full mb-3 ${badge.className}`}>
          {badge.text}
        </span>
      )}
      {showBenchmarks ? (
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Effectif (n={sampleCount})
          </p>
          <div className="grid grid-cols-4 gap-1 text-center text-xs">
            <div>
              <div className="text-rose-700 font-semibold tabular-nums">{formatDropPct(teamMin)}</div>
              <div className="text-slate-400">Min</div>
            </div>
            <div>
              <div className="text-slate-900 font-bold tabular-nums">{formatDropPct(teamAvg)}</div>
              <div className="text-slate-400">Moy</div>
            </div>
            <div>
              <div className="text-emerald-700 font-semibold tabular-nums">{formatDropPct(teamMax)}</div>
              <div className="text-slate-400">Max</div>
            </div>
            <div>
              <div className="text-indigo-700 font-semibold tabular-nums">{formatDropPct(elite)}</div>
              <div className="text-slate-400">Top 25%</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Repères effectif indisponibles.
        </p>
      )}
    </div>
  );
};

const AthleteDurabilityView: React.FC<AthleteDurabilityViewProps> = ({
  rider,
  teamRiders,
  season = getCurrentSeasonYear(),
}) => {
  const [activeKj, setActiveKj] = useState<FatigueKjLevel>('d30');

  const winnerIds = useMemo(() => {
    const ids = new Set<string>();
    teamRiders.forEach(r => {
      if (countSeasonWins(r, season) > 0) ids.add(r.id);
    });
    return ids;
  }, [teamRiders, season]);

  const fatigueReport = useMemo(
    () => computeFatigueAnalysisReport(teamRiders, season, winnerIds),
    [teamRiders, season, winnerIds]
  );

  const benchmarks = useMemo(
    () => getBenchmarksWithData(fatigueReport.globalBenchmarks),
    [fatigueReport.globalBenchmarks]
  );

  const athleteDrops = useMemo(() => getFatigueDropPercentages(rider), [rider]);
  const { category } = getAgeCategory(rider.birthDate);

  const renderDropCards = (keys: string[]) =>
    keys.map(durKey => {
      const label = POWER_DURATIONS.find(d => d.key === durKey)?.label ?? durKey;
      const athleteDrop = athleteDrops[durKey]?.[activeKj];
      const bench = getBenchmarkForCell(benchmarks, durKey, activeKj);
      if (athleteDrop === undefined && !bench) return null;
      return (
        <DropCard
          key={durKey}
          label={label}
          athleteDrop={athleteDrop}
          teamMin={bench?.teamMinDrop ?? null}
          teamAvg={bench?.teamAverageDrop ?? null}
          teamMax={bench?.teamMaxDrop ?? null}
          elite={bench?.eliteDrop ?? null}
          sampleCount={bench?.sampleCount ?? 0}
          showBenchmarks={showBenchmarks}
        />
      );
    });

  if (!hasFatigueProfiles(rider)) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        <p className="font-medium">Profils fatigue incomplets</p>
        <p className="text-sm mt-1">
          Renseignez vos profils 15 / 30 / 45 kJ/kg dans Performances (PPR) pour voir la durabilité.
        </p>
      </div>
    );
  }

  const kjLabel = KJ_LEVELS.find(k => k.id === activeKj)?.label ?? activeKj;
  const showBenchmarks = fatigueReport.riderWithFatigueCount >= MIN_TEAM_SAMPLE;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-900">Votre durabilité sous fatigue</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Saison {season} · {category} · toutes durées · repères effectif anonymes (n=
          {fatigueReport.riderWithFatigueCount})
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {KJ_LEVELS.map(kj => (
            <button
              key={kj.id}
              type="button"
              onClick={() => setActiveKj(kj.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                activeKj === kj.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {kj.label}
            </button>
          ))}
        </div>
      </div>

      <DurabilityLossChart
        drops={athleteDrops}
        benchmarks={benchmarks}
        showTeamAvg={showBenchmarks}
      />

      <PowerProgressTracker
        rider={rider}
        theme="light"
        title="Vos progrès dans le temps"
      />

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-1 px-1">
          Détail — {kjLabel}
        </h4>
        <p className="text-xs text-gray-400 mb-3 px-1">Sprint</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
          {renderDropCards(SPRINT_KEYS)}
        </div>
        <p className="text-xs text-gray-400 mb-3 px-1">Endurance</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {renderDropCards(ENDURANCE_KEYS)}
        </div>
      </div>

      <p className="text-xs text-gray-400 px-1">
        Une perte faible (proche de 0 %) indique une bonne résistance à la fatigue.
      </p>
    </div>
  );
};

export default AthleteDurabilityView;

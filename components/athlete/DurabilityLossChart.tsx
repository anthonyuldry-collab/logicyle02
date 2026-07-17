import React, { useMemo } from 'react';
import {
  FatigueDropMatrix,
  FatigueKjLevel,
  formatDropPct,
  getBenchmarkForCell,
  getDropColorClass,
  POWER_DURATIONS,
  type DurabilityBenchmarkCell,
} from '../../utils/fatigueDurabilityUtils';

const SPRINT_KEYS = ['1s', '5s', '30s'];
const ENDURANCE_KEYS = ['1min', '3min', '5min', '12min', '20min', 'cp'];
export const ALL_DURABILITY_KEYS = [...SPRINT_KEYS, ...ENDURANCE_KEYS];

const KJ_CONFIG: { id: FatigueKjLevel; label: string; color: string }[] = [
  { id: 'd15', label: '15 kJ/kg', color: '#60a5fa' },
  { id: 'd30', label: '30 kJ/kg', color: '#6366f1' },
  { id: 'd45', label: '45 kJ/kg', color: '#7c3aed' },
];

interface DurabilityLossChartProps {
  drops: FatigueDropMatrix;
  benchmarks: DurabilityBenchmarkCell[];
  showTeamAvg?: boolean;
}

const DurabilityLossChart: React.FC<DurabilityLossChartProps> = ({
  drops,
  benchmarks,
  showTeamAvg = true,
}) => {
  const durationsWithData = useMemo(
    () =>
      ALL_DURABILITY_KEYS.filter(key =>
        KJ_CONFIG.some(kj => drops[key]?.[kj.id] !== undefined)
      ),
    [drops]
  );

  const floor = useMemo(() => {
    const vals = durationsWithData.flatMap(key =>
      KJ_CONFIG.map(kj => drops[key]?.[kj.id]).filter((v): v is number => v !== undefined)
    );
    return Math.min(...vals, -8);
  }, [drops, durationsWithData]);

  if (durationsWithData.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">Aucune donnée de perte à afficher.</p>
    );
  }

  /** 0 % en haut, pertes négatives vers le bas */
  const barHeight = (pct: number) => (Math.abs(pct) / Math.abs(floor)) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Graphique des pertes de durabilité</h4>
          <p className="text-xs text-gray-500">% de baisse W/kg vs profil frais — 0 % en haut</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {KJ_CONFIG.map(kj => (
            <span key={kj.id} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: kj.color }} />
              {kj.label}
            </span>
          ))}
          {showTeamAvg && (
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <span className="w-3 h-0.5 bg-gray-400" />
              Moy. @ 30
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-3 px-2 pb-1 min-h-[200px] border-b-2 border-gray-300 relative"
          style={{ minWidth: durationsWithData.length * 64 }}
        >
          <span className="absolute left-0 -top-4 text-[10px] text-gray-400">0 %</span>
          <span className="absolute left-0 bottom-0 text-[10px] text-gray-400 tabular-nums">{floor.toFixed(0)} %</span>

          {durationsWithData.map(durKey => {
            const label = POWER_DURATIONS.find(d => d.key === durKey)?.label ?? durKey;
            const teamAvg30 = getBenchmarkForCell(benchmarks, durKey, 'd30')?.teamAverageDrop;

            return (
              <div key={durKey} className="flex flex-col items-center flex-1 min-w-[56px]">
                <div className="relative flex items-end justify-center gap-1 h-44 w-full">
                  {showTeamAvg && teamAvg30 != null && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400 z-10 pointer-events-none"
                      style={{ bottom: `${barHeight(teamAvg30)}%` }}
                      title={`Moy. effectif 30 kJ/kg: ${formatDropPct(teamAvg30)}`}
                    />
                  )}
                  {KJ_CONFIG.map(kj => {
                    const val = drops[durKey]?.[kj.id];
                    if (val === undefined) {
                      return <div key={kj.id} className="w-3 h-1 bg-gray-100 rounded-t self-end" />;
                    }
                    return (
                      <div
                        key={kj.id}
                        className="w-3 sm:w-4 rounded-t transition-opacity hover:opacity-75 self-end"
                        style={{
                          height: `${Math.max(barHeight(val), 3)}%`,
                          backgroundColor: kj.color,
                        }}
                        title={`${label} · ${kj.label}: ${formatDropPct(val)}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] font-medium text-gray-600 mt-2 text-center leading-tight">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
        {ALL_DURABILITY_KEYS.map(durKey => {
          const d30 = drops[durKey]?.d30;
          if (d30 === undefined) return null;
          const label = POWER_DURATIONS.find(d => d.key === durKey)?.label ?? durKey;
          return (
            <div key={durKey} className="text-[10px] bg-gray-50 rounded px-1.5 py-1 text-center">
              <div className="text-gray-500 truncate">{label}</div>
              <div className={`font-bold tabular-nums ${getDropColorClass(d30)}`}>{formatDropPct(d30)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DurabilityLossChart;

import React from 'react';
import { PerformanceProjectHistoryEntry } from '../../types';
import {
  FIELD_KIND_CONFIG,
  PerformanceFieldKind,
  formatHistoryDate,
  getFieldHistoryTimeline,
} from '../../utils/performanceProjectUtils';

interface PerformanceFieldEvolutionStripProps {
  history: PerformanceProjectHistoryEntry[];
  factorKey: string;
  kind: PerformanceFieldKind;
}

const PerformanceFieldEvolutionStrip: React.FC<PerformanceFieldEvolutionStripProps> = ({
  history,
  factorKey,
  kind,
}) => {
  const timeline = getFieldHistoryTimeline(history, factorKey, kind);
  if (timeline.length < 2) return null;

  const config = FIELD_KIND_CONFIG[kind];
  const latest = timeline[0];
  const previous = timeline[1];
  const latestActive = latest.entries.filter(e => e.status === 'active').length;
  const previousActive = previous.entries.filter(e => e.status === 'active').length;
  const delta = latestActive - previousActive;

  return (
    <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600">
      <span className="font-medium text-slate-700">{config.label} — évolution : </span>
      {delta > 0 && <span className="text-emerald-700">+{delta} point(s) actif(s)</span>}
      {delta < 0 && <span className="text-amber-700">{delta} point(s) actif(s)</span>}
      {delta === 0 && <span>stable depuis {formatHistoryDate(previous.savedAt)}</span>}
      {delta !== 0 && (
        <span className="text-slate-400 ml-1">(vs {formatHistoryDate(previous.savedAt)})</span>
      )}
    </div>
  );
};

export default PerformanceFieldEvolutionStrip;

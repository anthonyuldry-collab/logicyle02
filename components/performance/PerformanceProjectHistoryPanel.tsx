import React, { useState } from 'react';
import { PerformanceProjectHistoryEntry } from '../../types';
import { PERFORMANCE_PROJECT_FACTORS_CONFIG } from '../../constants';
import {
  ENTRY_STATUS_LABELS,
  FIELD_KIND_CONFIG,
  PerformanceFieldKind,
  formatHistoryDate,
  formatTargetDate,
  getFactorActionItems,
  getFactorFieldEntries,
  summarizeHistoryEntry,
} from '../../utils/performanceProjectUtils';

interface PerformanceProjectHistoryPanelProps {
  history: PerformanceProjectHistoryEntry[];
}

const PerformanceProjectHistoryPanel: React.FC<PerformanceProjectHistoryPanelProps> = ({ history }) => {
  const [expandedId, setExpandedId] = useState<string | null>(history[0]?.id ?? null);

  if (history.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
        L&apos;historique se remplira à chaque sauvegarde du projet — vous pourrez suivre l&apos;évolution
        de vos objectifs et actions dans le temps.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Évolution du projet</h3>
        <p className="text-xs text-gray-500 mt-0.5">{history.length} version(s) enregistrée(s)</p>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {history.map((entry, index) => {
          const isExpanded = expandedId === entry.id;
          const isLatest = index === 0;

          return (
            <div key={entry.id} className={isLatest ? 'bg-blue-50/30' : ''}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatHistoryDate(entry.savedAt)}
                      {isLatest && (
                        <span className="ml-2 text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          Actuel
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{summarizeHistoryEntry(entry)}</p>
                  </div>
                  <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {entry.performanceGoals && (
                    <div className="text-xs">
                      <p className="font-semibold text-gray-600 mb-1">Objectifs généraux</p>
                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded">{entry.performanceGoals}</p>
                    </div>
                  )}
                  {PERFORMANCE_PROJECT_FACTORS_CONFIG.map(({ id, label }) => {
                    const factor = entry.factors[id];
                    if (!factor) return null;
                    const items = getFactorActionItems(factor);
                    const fieldKinds: PerformanceFieldKind[] = ['forces', 'aOptimiser', 'aDevelopper'];
                    const fieldEntries = fieldKinds.flatMap(kind => getFactorFieldEntries(factor, kind));
                    const hasContent =
                      fieldEntries.length > 0 ||
                      items.length > 0 ||
                      factor.besoinsActions;

                    if (!hasContent) return null;

                    return (
                      <div key={id} className="text-xs border-l-2 border-blue-200 pl-3">
                        <p className="font-semibold text-gray-800 mb-1">{label}</p>
                        {fieldKinds.map(kind => {
                          const entries = getFactorFieldEntries(factor, kind);
                          if (entries.length === 0) return null;
                          return (
                            <div key={kind} className="mb-2">
                              <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                                {FIELD_KIND_CONFIG[kind].label}
                              </p>
                              <ul className="space-y-0.5">
                                {entries.map(entryItem => (
                                  <li key={entryItem.id} className="text-gray-600">
                                    <span className={entryItem.status === 'achieved' ? 'line-through' : ''}>
                                      {entryItem.content}
                                    </span>
                                    {entryItem.targetDate && (
                                      <span className="text-gray-400 ml-1">
                                        ({formatTargetDate(entryItem.targetDate)})
                                      </span>
                                    )}
                                    <span className="text-gray-400 ml-1">
                                      — {ENTRY_STATUS_LABELS[entryItem.status]}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                        {items.length > 0 && (
                          <div className="mb-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Actions</p>
                            <ul className="space-y-0.5">
                              {items.map(item => (
                                <li key={item.id} className="text-gray-600">
                                  <span className={item.status === 'done' ? 'line-through' : ''}>{item.title}</span>
                                  {item.targetDate && (
                                    <span className="text-gray-400 ml-1">({formatTargetDate(item.targetDate)})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {factor.besoinsActions?.trim() && (
                          <p className="text-gray-500 italic mt-1">{factor.besoinsActions}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceProjectHistoryPanel;

import React from 'react';
import { PerformanceFactorDetail, PerformanceProjectEntry } from '../../types';
import {
  ENTRY_STATUS_CLASSES,
  ENTRY_STATUS_LABELS,
  FIELD_KIND_CONFIG,
  PerformanceFieldKind,
  createPerformanceProjectEntry,
  formatTargetDate,
  getFactorFieldEntries,
} from '../../utils/performanceProjectUtils';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TrashIcon from '../icons/TrashIcon';

interface PerformanceFieldItemsEditorProps {
  factor: PerformanceFactorDetail;
  kind: PerformanceFieldKind;
  isEditing: boolean;
  onChange: (entries: PerformanceProjectEntry[]) => void;
  placeholder?: string;
}

const PerformanceFieldItemsEditor: React.FC<PerformanceFieldItemsEditorProps> = ({
  factor,
  kind,
  isEditing,
  onChange,
  placeholder,
}) => {
  const config = FIELD_KIND_CONFIG[kind];
  const entries = getFactorFieldEntries(factor, kind);

  const updateEntry = (id: string, patch: Partial<PerformanceProjectEntry>) => {
    onChange(
      entries.map(entry =>
        entry.id === id
          ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
          : entry
      )
    );
  };

  const addEntry = () => {
    onChange([...entries, createPerformanceProjectEntry('')]);
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  if (!isEditing) {
    if (entries.length === 0) {
      const legacy = factor[config.legacyKey] as string | undefined;
      if (legacy?.trim()) {
        return <p className="text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap text-sm">{legacy}</p>;
      }
      return <p className="text-gray-500 text-sm italic">Non renseigné</p>;
    }

    return (
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50"
          >
            {config.showStatus && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ENTRY_STATUS_CLASSES[entry.status]}`}>
                {ENTRY_STATUS_LABELS[entry.status]}
              </span>
            )}
            <span
              className={`text-sm font-medium ${
                entry.status === 'achieved' ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {entry.content}
            </span>
            {entry.targetDate && (
              <span className="text-xs text-gray-500">Revue : {formatTargetDate(entry.targetDate)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.id} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={entry.content}
              onChange={e => updateEntry(entry.id, { content: e.target.value })}
              placeholder={placeholder || config.label}
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={entry.targetDate || ''}
              onChange={e => updateEntry(entry.id, { targetDate: e.target.value || undefined })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              title="Date de revue ou objectif"
            />
            {config.showStatus && (
              <select
                value={entry.status}
                onChange={e =>
                  updateEntry(entry.id, { status: e.target.value as PerformanceProjectEntry['status'] })
                }
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(ENTRY_STATUS_LABELS) as PerformanceProjectEntry['status'][]).map(s => (
                  <option key={s} value={s}>
                    {ENTRY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md"
              title="Supprimer"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addEntry}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        <PlusCircleIcon className="w-4 h-4" />
        {config.addLabel}
      </button>
    </div>
  );
};

export default PerformanceFieldItemsEditor;

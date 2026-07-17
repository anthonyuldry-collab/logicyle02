import React from 'react';
import { PerformanceActionItem, PerformanceFactorDetail } from '../../types';
import {
  ACTION_STATUS_CLASSES,
  ACTION_STATUS_LABELS,
  createPerformanceActionItem,
  formatTargetDate,
  getFactorActionItems,
  isActionOverdue,
} from '../../utils/performanceProjectUtils';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TrashIcon from '../icons/TrashIcon';

interface PerformanceActionItemsEditorProps {
  factor: PerformanceFactorDetail;
  isEditing: boolean;
  onChange: (items: PerformanceActionItem[]) => void;
  /** Notes libres complémentaires */
  onNotesChange?: (notes: string) => void;
}

const PerformanceActionItemsEditor: React.FC<PerformanceActionItemsEditorProps> = ({
  factor,
  isEditing,
  onChange,
  onNotesChange,
}) => {
  const items = getFactorActionItems(factor);

  const updateItem = (id: string, patch: Partial<PerformanceActionItem>) => {
    onChange(
      items.map(item =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
              completedAt:
                patch.status === 'done'
                  ? new Date().toISOString()
                  : patch.status != null
                  ? undefined
                  : item.completedAt,
            }
          : item
      )
    );
  };

  const addItem = () => {
    onChange([...items, createPerformanceActionItem('')]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(i => i.id !== id));
  };

  if (!isEditing) {
    if (items.length === 0 && !factor.besoinsActions?.trim()) {
      return <p className="text-gray-500 text-sm italic">Aucune action planifiée</p>;
    }

    return (
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${
              isActionOverdue(item) ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_STATUS_CLASSES[item.status]}`}>
              {ACTION_STATUS_LABELS[item.status]}
            </span>
            <span className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {item.title}
            </span>
            {item.targetDate && (
              <span className={`text-xs ${isActionOverdue(item) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                Objectif : {formatTargetDate(item.targetDate)}
              </span>
            )}
            {item.description && (
              <span className="text-xs text-gray-500 w-full">{item.description}</span>
            )}
          </div>
        ))}
        {factor.besoinsActions?.trim() && items.length === 0 && (
          <p className="text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{factor.besoinsActions}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={item.title}
              onChange={e => updateItem(item.id, { title: e.target.value })}
              placeholder="Action / objectif"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={item.targetDate || ''}
              onChange={e => updateItem(item.id, { targetDate: e.target.value || undefined })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              title="Date objectif"
            />
            <select
              value={item.status}
              onChange={e => updateItem(item.id, { status: e.target.value as PerformanceActionItem['status'] })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(ACTION_STATUS_LABELS) as PerformanceActionItem['status'][]).map(s => (
                <option key={s} value={s}>{ACTION_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md"
              title="Supprimer"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={item.description || ''}
            onChange={e => updateItem(item.id, { description: e.target.value })}
            placeholder="Précisions (optionnel)"
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        <PlusCircleIcon className="w-4 h-4" />
        Ajouter une action datée
      </button>

      {onNotesChange && (
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes complémentaires</label>
          <textarea
            value={factor.besoinsActions || ''}
            onChange={e => onNotesChange(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder="Contexte, ressources, remarques libres…"
          />
        </div>
      )}
    </div>
  );
};

export default PerformanceActionItemsEditor;

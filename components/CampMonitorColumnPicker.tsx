import React from 'react';
import {
  CampMonitorColumnKey,
  CampMonitoringConfig,
  CampStageKind,
} from '../types';
import {
  CAMP_MONITOR_COLUMN_CATALOG,
  CAMP_MONITOR_PRESET_FULL,
  CAMP_MONITOR_PRESET_MINIMAL,
  CAMP_MONITOR_PRESET_PRESEASON,
  CAMP_MONITOR_PRESET_RECOVERY,
  CAMP_STAGE_KIND_LABELS,
} from '../utils/trainingCampUtils';
import ActionButton from './ActionButton';

interface CampMonitorColumnPickerProps {
  config?: CampMonitoringConfig;
  visibleMetrics: CampMonitorColumnKey[];
  onChange: (next: CampMonitoringConfig) => void;
  disabled?: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  altitude: 'Altitude',
  heat: 'Chaleur',
  physio: 'Physio',
  hydration: 'Hydratation',
  wellness: 'Bien-être',
  session: 'Séance',
};

const CampMonitorColumnPicker: React.FC<CampMonitorColumnPickerProps> = ({
  config,
  visibleMetrics,
  onChange,
  disabled = false,
}) => {
  const stageKind = config?.stageKind || 'preseason';
  const selected = new Set(visibleMetrics);

  const applyPreset = (keys: CampMonitorColumnKey[], kind?: CampStageKind) => {
    onChange({
      stageKind: kind || stageKind,
      visibleMetrics: [...keys],
    });
  };

  const toggle = (key: CampMonitorColumnKey) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const ordered = CAMP_MONITOR_COLUMN_CATALOG.map((c) => c.key).filter((k) =>
      next.has(k),
    );
    onChange({
      stageKind,
      visibleMetrics: ordered.length > 0 ? ordered : ['notes'],
    });
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">
            Données de monitoring affichées
          </p>
          <p className="text-xs text-amber-900/80 mt-0.5">
            Stage hors altitude : choisissez les colonnes utiles (pré-saison, récup, etc.).
            Les stages altitude gardent le tableau complet automatiquement.
          </p>
        </div>
        <select
          disabled={disabled}
          value={stageKind}
          onChange={(e) => {
            const kind = e.target.value as CampStageKind;
            if (kind === 'recovery') applyPreset(CAMP_MONITOR_PRESET_RECOVERY, kind);
            else if (kind === 'preseason') applyPreset(CAMP_MONITOR_PRESET_PRESEASON, kind);
            else onChange({ ...config, stageKind: kind, visibleMetrics });
          }}
          className="text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white"
        >
          {(Object.keys(CAMP_STAGE_KIND_LABELS) as CampStageKind[])
            .filter((k) => k !== 'altitude')
            .map((k) => (
              <option key={k} value={k}>
                {CAMP_STAGE_KIND_LABELS[k]}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ActionButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => applyPreset(CAMP_MONITOR_PRESET_PRESEASON, 'preseason')}
        >
          Preset pré-saison
        </ActionButton>
        <ActionButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => applyPreset(CAMP_MONITOR_PRESET_RECOVERY, 'recovery')}
        >
          Preset récup
        </ActionButton>
        <ActionButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => applyPreset(CAMP_MONITOR_PRESET_MINIMAL)}
        >
          Minimal
        </ActionButton>
        <ActionButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => applyPreset(CAMP_MONITOR_PRESET_FULL)}
        >
          Tout afficher
        </ActionButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map((group) => {
          const cols = CAMP_MONITOR_COLUMN_CATALOG.filter((c) => c.group === group);
          if (cols.length === 0) return null;
          return (
            <div key={group} className="bg-white/80 rounded-lg border border-amber-100 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-1">
                {cols.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={selected.has(col.key)}
                      onChange={() => toggle(col.key)}
                      className="rounded border-gray-300 text-amber-600"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CampMonitorColumnPicker;

import React, { useState } from 'react';
import { BikeTirePressureGrid, TirePressureCell } from '../../types';
import {
  TIRE_SURFACE_CONDITIONS,
  TIRE_WEATHER_CONDITIONS,
  TireSurfaceId,
  TireWeatherId,
  getTirePressureCell,
  setTirePressureCell,
} from '../../utils/tirePressureUtils';
import TirePressureTable from './TirePressureTable';

interface TirePressureQuickEntryProps {
  grid?: BikeTirePressureGrid;
  onChange: (grid: BikeTirePressureGrid) => void;
  bikeLabel?: string;
}

const TirePressureQuickEntry: React.FC<TirePressureQuickEntryProps> = ({
  grid,
  onChange,
  bikeLabel,
}) => {
  const [surface, setSurface] = useState<TireSurfaceId>('dry');
  const [weather, setWeather] = useState<TireWeatherId>('mild');
  const [showFullGrid, setShowFullGrid] = useState(false);

  const cell = getTirePressureCell(grid, surface, weather);

  const update = (field: keyof TirePressureCell, value: string) => {
    onChange(setTirePressureCell(grid, surface, weather, { ...cell, [field]: value }));
  };

  const inputClass =
    'w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type de route</label>
          <select
            value={surface}
            onChange={e => setSurface(e.target.value as TireSurfaceId)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {TIRE_SURFACE_CONDITIONS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Météo</label>
          <select
            value={weather}
            onChange={e => setWeather(e.target.value as TireWeatherId)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {TIRE_WEATHER_CONDITIONS.map(w => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-gray-100">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-gray-400 text-center mb-1">
            Avant (bar)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={cell.front ?? ''}
            onChange={e => update('front', e.target.value)}
            className={inputClass}
            placeholder="6.5"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-gray-400 text-center mb-1">
            Arrière (bar)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={cell.rear ?? ''}
            onChange={e => update('rear', e.target.value)}
            className={inputClass}
            placeholder="7.0"
          />
        </div>
      </div>

      {bikeLabel && (
        <p className="text-[11px] text-gray-400 text-center">
          Pressions pour {bikeLabel.toLowerCase()} — {TIRE_SURFACE_CONDITIONS.find(s => s.id === surface)?.label},{' '}
          {TIRE_WEATHER_CONDITIONS.find(w => w.id === weather)?.label.toLowerCase()}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowFullGrid(v => !v)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {showFullGrid ? 'Masquer la grille complète' : 'Voir la grille complète (toutes conditions)'}
      </button>

      {showFullGrid && (
        <TirePressureTable grid={grid} onChange={onChange} compact />
      )}
    </div>
  );
};

export default TirePressureQuickEntry;

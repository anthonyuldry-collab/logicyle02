import React from 'react';
import { BikeTirePressureGrid, TirePressureCell } from '../../types';
import {
  TIRE_SURFACE_CONDITIONS,
  TIRE_WEATHER_CONDITIONS,
  TireSurfaceId,
  TireWeatherId,
  getTirePressureCell,
  setTirePressureCell,
} from '../../utils/tirePressureUtils';

interface TirePressureTableProps {
  grid?: BikeTirePressureGrid;
  onChange: (grid: BikeTirePressureGrid) => void;
  editable?: boolean;
  compact?: boolean;
}

const TirePressureTable: React.FC<TirePressureTableProps> = ({
  grid,
  onChange,
  editable = true,
  compact = false,
}) => {
  const updateCell = (
    surface: TireSurfaceId,
    weather: TireWeatherId,
    field: keyof TirePressureCell,
    value: string,
  ) => {
    const current = getTirePressureCell(grid, surface, weather);
    onChange(setTirePressureCell(grid, surface, weather, { ...current, [field]: value }));
  };

  const inputClass = compact
    ? 'w-full min-w-0 px-1.5 py-1 border border-gray-200 rounded text-xs text-center bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400'
    : 'w-full min-w-0 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400';

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[640px] text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-200">
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
              Route ↓ / Météo →
            </th>
            {TIRE_WEATHER_CONDITIONS.map(w => (
              <th key={w.id} className="px-2 py-2.5 text-xs font-semibold text-gray-700 text-center min-w-[120px]">
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIRE_SURFACE_CONDITIONS.map((surface, rowIdx) => (
            <tr
              key={surface.id}
              className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
            >
              <td className="px-3 py-2 text-xs font-medium text-gray-700 border-r border-gray-100">
                {surface.label}
              </td>
              {TIRE_WEATHER_CONDITIONS.map(weather => {
                const cell = getTirePressureCell(grid, surface.id, weather.id);
                return (
                  <td key={weather.id} className="px-2 py-2 border-r border-gray-100 last:border-r-0">
                    {editable ? (
                      <div className="flex gap-1">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[9px] text-gray-400 text-center mb-0.5">AV</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={cell.front ?? ''}
                            onChange={e => updateCell(surface.id, weather.id, 'front', e.target.value)}
                            className={inputClass}
                            placeholder="bar"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[9px] text-gray-400 text-center mb-0.5">AR</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={cell.rear ?? ''}
                            onChange={e => updateCell(surface.id, weather.id, 'rear', e.target.value)}
                            className={inputClass}
                            placeholder="bar"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-800">
                        <span className="font-medium">{cell.front || '—'}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="font-medium">{cell.rear || '—'}</span>
                        {(cell.front || cell.rear) && (
                          <span className="text-gray-400 text-[10px] ml-0.5">bar</span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TirePressureTable;

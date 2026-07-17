import { BikeTirePressureGrid, TirePressureCell } from '../types';

export const TIRE_SURFACE_CONDITIONS = [
  { id: 'dry', label: 'Route sèche' },
  { id: 'wet', label: 'Route humide' },
  { id: 'cobbles', label: 'Pavés / dégradé' },
  { id: 'gravel', label: 'Gravel' },
] as const;

export const TIRE_WEATHER_CONDITIONS = [
  { id: 'hot', label: 'Chaud (>25 °C)' },
  { id: 'mild', label: 'Tempéré (15–25 °C)' },
  { id: 'cold', label: 'Froid (<15 °C)' },
  { id: 'rain', label: 'Pluie' },
] as const;

export type TireSurfaceId = (typeof TIRE_SURFACE_CONDITIONS)[number]['id'];
export type TireWeatherId = (typeof TIRE_WEATHER_CONDITIONS)[number]['id'];

export function tirePressureKey(surface: TireSurfaceId, weather: TireWeatherId): string {
  return `${surface}_${weather}`;
}

export function getTirePressureCell(
  grid: BikeTirePressureGrid | undefined,
  surface: TireSurfaceId,
  weather: TireWeatherId,
): TirePressureCell {
  return grid?.cells?.[tirePressureKey(surface, weather)] ?? {};
}

export function setTirePressureCell(
  grid: BikeTirePressureGrid | undefined,
  surface: TireSurfaceId,
  weather: TireWeatherId,
  cell: TirePressureCell,
): BikeTirePressureGrid {
  const key = tirePressureKey(surface, weather);
  const cells = { ...(grid?.cells ?? {}), [key]: cell };
  if (!cell.front && !cell.rear) {
    delete cells[key];
  }
  return { cells };
}

/** Pression prioritaire pour affichage mission (sèche + tempéré, sinon 1ère cellule renseignée). */
export function getPreferredTirePressureCell(grid?: BikeTirePressureGrid): {
  cell: TirePressureCell;
  conditionsLabel?: string;
} {
  const preferred = getTirePressureCell(grid, 'dry', 'mild');
  if (preferred.front?.trim() || preferred.rear?.trim()) {
    return {
      cell: preferred,
      conditionsLabel: 'Route sèche · tempéré',
    };
  }

  for (const surface of TIRE_SURFACE_CONDITIONS) {
    for (const weather of TIRE_WEATHER_CONDITIONS) {
      const cell = getTirePressureCell(grid, surface.id, weather.id);
      if (cell.front?.trim() || cell.rear?.trim()) {
        return {
          cell,
          conditionsLabel: `${surface.label} · ${weather.label.toLowerCase()}`,
        };
      }
    }
  }

  return { cell: {} };
}

export function formatTirePressureDisplay(value?: string): string {
  if (!value?.trim()) return '—';
  const trimmed = value.trim();
  return /bar|psi|kpa/i.test(trimmed) ? trimmed : `${trimmed} bar`;
}

import { describe, expect, it } from 'vitest';
import {
  formatTirePressureDisplay,
  getPreferredTirePressureCell,
  setTirePressureCell,
} from '../tirePressureUtils';

describe('getPreferredTirePressureCell', () => {
  it('priorise route sèche + tempéré', () => {
    const grid = setTirePressureCell(undefined, 'dry', 'mild', { front: '6.2', rear: '6.8' });
    expect(getPreferredTirePressureCell(grid)).toEqual({
      cell: { front: '6.2', rear: '6.8' },
      conditionsLabel: 'Route sèche · tempéré',
    });
  });

  it('retombe sur une autre combinaison si dry/mild vide', () => {
    const grid = setTirePressureCell(undefined, 'wet', 'rain', { front: '5.5', rear: '6.0' });
    const result = getPreferredTirePressureCell(grid);
    expect(result.cell).toEqual({ front: '5.5', rear: '6.0' });
    expect(result.conditionsLabel).toContain('humide');
  });
});

describe('formatTirePressureDisplay', () => {
  it('ajoute bar si unité absente', () => {
    expect(formatTirePressureDisplay('6.5')).toBe('6.5 bar');
  });

  it('conserve une valeur vide', () => {
    expect(formatTirePressureDisplay('')).toBe('—');
  });
});

import { describe, expect, it } from 'vitest';
import { eventEditSignature, eventHasTimeTrial } from '../stageRaceUtils';
import type { RaceEvent } from '../../types';

const baseEvent = {
  raceInfo: {},
} as RaceEvent;

describe('eventHasTimeTrial', () => {
  it('détecte un chrono sur course simple', () => {
    expect(
      eventHasTimeTrial({
        ...baseEvent,
        raceInfo: { isTimeTrial: true },
      } as RaceEvent),
    ).toBe(true);
  });

  it('détecte un chrono sur une étape de stage race', () => {
    expect(
      eventHasTimeTrial({
        ...baseEvent,
        raceInfo: {
          stageDays: [{ isTimeTrial: false }, { isTimeTrial: true }],
        },
      } as RaceEvent),
    ).toBe(true);
  });

  it('retourne false sans chrono', () => {
    expect(
      eventHasTimeTrial({
        ...baseEvent,
        raceInfo: { isTimeTrial: false, stageDays: [{ isTimeTrial: false }] },
      } as RaceEvent),
    ).toBe(false);
  });
});

describe('eventEditSignature', () => {
  it('reste stable si seul le wrapping objet change', () => {
    const a = {
      id: 'e1',
      name: 'Tour',
      date: '2026-08-30',
      raceInfo: { stageDays: [{ id: 's1', date: '2026-08-30', stageNumber: 1, stageLabel: 'A' }] },
    } as RaceEvent;
    const b = { ...a, raceInfo: { ...a.raceInfo, stageDays: [...(a.raceInfo.stageDays || [])] } };
    expect(eventEditSignature(a)).toBe(eventEditSignature(b));
  });

  it('change si l’intitulé d’étape change', () => {
    const a = {
      id: 'e1',
      name: 'Tour',
      date: '2026-08-30',
      raceInfo: { stageDays: [{ id: 's1', date: '2026-08-30', stageNumber: 1, stageLabel: '' }] },
    } as RaceEvent;
    const b = {
      ...a,
      raceInfo: { stageDays: [{ id: 's1', date: '2026-08-30', stageNumber: 1, stageLabel: 'Burgas' }] },
    } as RaceEvent;
    expect(eventEditSignature(a)).not.toBe(eventEditSignature(b));
  });
});

import { describe, expect, it } from 'vitest';
import { eventHasTimeTrial } from '../stageRaceUtils';
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

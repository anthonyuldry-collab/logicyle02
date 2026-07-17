import { describe, expect, it } from 'vitest';
import { findCrossTeamRiderConflicts } from '../organizationUtils';
import type { RaceEvent, Rider } from '../../types';

const riderA: Rider = {
  id: 'r-wt',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@test.fr',
  isActive: true,
} as Rider;

const riderADev: Rider = {
  id: 'r-dev',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@test.fr',
  isActive: true,
} as Rider;

describe('findCrossTeamRiderConflicts', () => {
  it('détecte un conflit quand le même coureur est sélectionné sur 2 équipes le même jour', () => {
    const eventsByTeam: Record<string, RaceEvent[]> = {
      t1: [{
        id: 'e1',
        name: 'Paris-Nice',
        date: '2026-03-15',
        selectedRiderIds: ['r-wt'],
      } as RaceEvent],
      t2: [{
        id: 'e2',
        name: 'Tour de Normandie',
        date: '2026-03-15',
        selectedRiderIds: ['r-dev'],
      } as RaceEvent],
    };
    const ridersByTeam = {
      t1: [riderA],
      t2: [riderADev],
    };
    const conflicts = findCrossTeamRiderConflicts(eventsByTeam, ridersByTeam);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].riderName).toContain('Jean');
    expect(conflicts[0].teamIds).toEqual(['t1', 't2']);
    expect(conflicts[0].eventNames).toEqual(expect.arrayContaining(['Paris-Nice', 'Tour de Normandie']));
  });

  it('ignore les coureurs au roster mais non sélectionnés sur la course', () => {
    const eventsByTeam: Record<string, RaceEvent[]> = {
      t1: [{
        id: 'e1',
        name: 'Course A',
        date: '2026-03-15',
        selectedRiderIds: [],
      } as RaceEvent],
      t2: [{
        id: 'e2',
        name: 'Course B',
        date: '2026-03-15',
        selectedRiderIds: ['r-dev'],
      } as RaceEvent],
    };
    const conflicts = findCrossTeamRiderConflicts(eventsByTeam, {
      t1: [riderA],
      t2: [riderADev],
    });
    expect(conflicts).toHaveLength(0);
  });
});

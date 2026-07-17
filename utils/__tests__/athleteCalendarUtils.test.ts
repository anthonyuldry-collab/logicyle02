import { describe, expect, it } from 'vitest';
import { DisciplinePracticed, UserRole, TeamRole, type User } from '../../types';
import {
  buildAthleteCalendarItems,
  buildDemoAthleteCalendarEntries,
  formatAthleteDateRange,
  isAthleteEntryUpcoming,
  upsertAthleteCalendarEntry,
} from '../athleteCalendarUtils';

const baseUser = (overrides: Partial<User> = {}): User => ({
  id: 'athlete1',
  email: 'a@test.fr',
  firstName: 'Ana',
  lastName: 'Rider',
  userRole: UserRole.COUREUR,
  permissionRole: TeamRole.VIEWER,
  signupMode: 'independent',
  isIndependentProfile: true,
  ...overrides,
});

describe('athleteCalendarUtils', () => {
  it('formate une plage de dates', () => {
    expect(formatAthleteDateRange('2026-08-29', '2026-08-29')).toMatch(/29/);
    expect(formatAthleteDateRange('2026-09-12', '2026-09-19')).toMatch(/12/);
  });

  it('détecte une entrée à venir', () => {
    expect(
      isAthleteEntryUpcoming({ startDate: '2099-01-01', endDate: '2099-01-02' }, '2026-07-17'),
    ).toBe(true);
    expect(
      isAthleteEntryUpcoming({ startDate: '2020-01-01', endDate: '2020-01-02' }, '2026-07-17'),
    ).toBe(false);
  });

  it('inclut résultats et entrées manuelles', () => {
    const items = buildAthleteCalendarItems(
      baseUser({
        personalRaceCalendar: [
          {
            id: 'm1',
            name: 'Stage prépa',
            startDate: '2026-09-01',
            endDate: '2026-09-07',
            status: 'planned',
            source: 'manual',
          },
        ],
        resultsHistory: [
          {
            id: 'r1',
            date: '2026-05-10',
            eventName: 'GP Test',
            category: 'Elite',
            rank: 5,
            discipline: DisciplinePracticed.ROUTE,
          },
        ],
      }),
    );
    expect(items.some((i) => i.name === 'Stage prépa')).toBe(true);
    expect(items.some((i) => i.name === 'GP Test' && i.source === 'result')).toBe(true);
  });

  it('ajoute des exemples démo si demandé', () => {
    const demos = buildDemoAthleteCalendarEntries('athlete1');
    expect(demos.length).toBeGreaterThanOrEqual(2);
    const items = buildAthleteCalendarItems(baseUser(), { includeDemo: true });
    expect(items.some((i) => i.source === 'demo')).toBe(true);
  });

  it('upsert une entrée', () => {
    const next = upsertAthleteCalendarEntry([], {
      id: 'x',
      name: 'A',
      startDate: '2026-08-01',
      status: 'planned',
      source: 'manual',
    });
    expect(next).toHaveLength(1);
    const updated = upsertAthleteCalendarEntry(next, {
      id: 'x',
      name: 'B',
      startDate: '2026-08-01',
      status: 'confirmed',
      source: 'manual',
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('B');
  });
});

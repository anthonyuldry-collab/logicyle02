import { describe, expect, it } from 'vitest';
import { ChecklistRole, EventType, RaceEvent, TeamLevel } from '../../types';
import {
  getEnabledChecklistRoles,
  getRecommendedOperationalSettings,
  normalizeOperationalSettings,
  resolveFicheStructure,
  filterTasksForTeamContext,
  inferEventFocusFromCalendar,
  filterTasksByEventFocus,
} from '../teamOperationalUtils';
import { getFichePosteTasks } from '../fichePosteUtils';

describe('getRecommendedOperationalSettings', () => {
  it('limite les rôles pour une structure jeunes', () => {
    const settings = getRecommendedOperationalSettings(TeamLevel.JEUNES);
    expect(settings.enabledChecklistRoles).toContain(ChecklistRole.DS);
    expect(settings.enabledChecklistRoles).toContain(ChecklistRole.COUREUR);
    expect(settings.enabledChecklistRoles).not.toContain(ChecklistRole.MANAGER);
    expect(settings.enabledChecklistRoles).not.toContain(ChecklistRole.COMMUNICATION);
  });

  it('active tous les rôles pour une équipe pro', () => {
    const settings = getRecommendedOperationalSettings(TeamLevel.PRO);
    expect(settings.enabledChecklistRoles?.length).toBe(9);
    expect(settings.ficheProfile).toBe('pro');
    expect(settings.eventFocus).toBe('auto');
  });
});

describe('inferEventFocusFromCalendar', () => {
  it('détecte priorité stage', () => {
    const focus = inferEventFocusFromCalendar([
      { id: '1', name: 'Camp', date: '2026-12-01', eventType: EventType.STAGE } as RaceEvent,
      { id: '2', name: 'Stage 2', date: '2026-12-05', eventType: EventType.STAGE } as RaceEvent,
    ]);
    expect(focus).toBe('stage');
  });
});

describe('filterTasksByEventFocus', () => {
  it('ne garde que les tâches compétition', () => {
    const tasks = [
      { name: 'A', eventType: EventType.COMPETITION },
      { name: 'B', eventType: EventType.STAGE },
    ];
    const filtered = filterTasksByEventFocus(tasks as any, 'competition');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('A');
  });
});

describe('resolveFicheStructure', () => {
  it('mappe la fédération en fiches nationales', () => {
    expect(resolveFicheStructure(TeamLevel.FEDERATION)).toBe('competition');
  });

  it('respecte un profil forcé', () => {
    expect(
      resolveFicheStructure(TeamLevel.JEUNES, { ficheProfile: 'pro', enabledChecklistRoles: [] })
    ).toBe('pro');
  });
});

describe('filterTasksForTeamContext', () => {
  it('retire les tâches UCI/sponsors en structure jeunes', () => {
    const proTasks = getFichePosteTasks(ChecklistRole.COUREUR, 'pro', TeamLevel.PRO);
    const filtered = filterTasksForTeamContext(proTasks, TeamLevel.JEUNES);
    expect(filtered.length).toBeLessThan(proTasks.length);
    expect(filtered.every((t) => !t.name.toLowerCase().includes('uci'))).toBe(true);
  });
});

describe('normalizeOperationalSettings', () => {
  it('conserve au moins un rôle si liste vide', () => {
    const normalized = normalizeOperationalSettings(TeamLevel.HORS_DN, {
      enabledChecklistRoles: [],
      ficheProfile: 'auto',
    });
    expect(getEnabledChecklistRoles(TeamLevel.HORS_DN, normalized).length).toBeGreaterThan(0);
  });
});

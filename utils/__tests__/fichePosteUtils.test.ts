import { describe, expect, it } from 'vitest';
import { ChecklistRole, TeamLevel } from '../../types';
import {
  buildChecklistTemplatesFromFiche,
  getFichePosteTasks,
  getStructureLevelLabel,
  teamLevelToFicheStructure,
} from '../fichePosteUtils';

describe('teamLevelToFicheStructure', () => {
  it('mappe les niveaux club et fédération', () => {
    expect(teamLevelToFicheStructure(TeamLevel.FEDERATION)).toBe('competition');
    expect(teamLevelToFicheStructure(TeamLevel.JEUNES)).toBe('club');
    expect(teamLevelToFicheStructure(TeamLevel.HORS_DN)).toBe('club');
  });

  it('mappe le niveau compétition', () => {
    expect(teamLevelToFicheStructure(TeamLevel.N1_N3)).toBe('competition');
  });

  it('mappe le niveau pro', () => {
    expect(teamLevelToFicheStructure(TeamLevel.PRO)).toBe('pro');
  });
});

describe('getFichePosteTasks', () => {
  it('retourne plus de tâches pour Assistant en pro qu\'en club', () => {
    const club = getFichePosteTasks(ChecklistRole.ASSISTANT, 'club');
    const pro = getFichePosteTasks(ChecklistRole.ASSISTANT, 'pro');
    expect(pro.length).toBeGreaterThan(club.length);
  });

  it('retourne une fiche Coureur substantielle en compétition', () => {
    const tasks = getFichePosteTasks(ChecklistRole.COUREUR, 'competition');
    expect(tasks.length).toBeGreaterThanOrEqual(15);
  });

  it('couvre les neuf rôles', () => {
    expect(Object.values(ChecklistRole).length).toBe(9);
    Object.values(ChecklistRole).forEach((role) => {
      const tasks = getFichePosteTasks(role, 'competition');
      expect(tasks.length).toBeGreaterThan(0);
    });
  });
});

describe('buildChecklistTemplatesFromFiche', () => {
  it('ignore les doublons', () => {
    const existing = getFichePosteTasks(ChecklistRole.DS, 'club').slice(0, 1).map((task, i) => ({
      id: String(i),
      name: task.name,
      role: ChecklistRole.DS,
      eventType: task.eventType,
      timingLabel: task.timingLabel,
    }));
    const { added } = buildChecklistTemplatesFromFiche(
      ChecklistRole.DS,
      'club',
      existing,
      () => 'new-id'
    );
    expect(added).toBe(getFichePosteTasks(ChecklistRole.DS, 'club').length - 1);
  });
});

describe('getStructureLevelLabel', () => {
  it('retourne un libellé lisible', () => {
    expect(getStructureLevelLabel('pro')).toContain('Professionnel');
  });
});

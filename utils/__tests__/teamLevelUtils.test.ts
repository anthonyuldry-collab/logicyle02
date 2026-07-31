import { describe, expect, it } from 'vitest';
import { Sex, TeamLevel } from '../../types';
import {
  getSelectableTeamLevels,
  isNationalDnTeamLevel,
  normalizeTeamLevel,
  riderSexAllowsN3,
  teamGenderAllowsN3,
} from '../teamLevelUtils';

describe('teamLevelUtils', () => {
  it('reconnaît les niveaux DN', () => {
    expect(isNationalDnTeamLevel(TeamLevel.N1)).toBe(true);
    expect(isNationalDnTeamLevel(TeamLevel.N2)).toBe(true);
    expect(isNationalDnTeamLevel(TeamLevel.N3)).toBe(true);
    expect(isNationalDnTeamLevel(TeamLevel.N1_N3)).toBe(true);
    expect(isNationalDnTeamLevel(TeamLevel.PRO)).toBe(false);
  });

  it('normalise le legacy N1_N3 vers N1', () => {
    expect(normalizeTeamLevel(TeamLevel.N1_N3)).toBe(TeamLevel.N1);
    expect(normalizeTeamLevel(TeamLevel.N2)).toBe(TeamLevel.N2);
  });

  it('exclut N3 pour les équipes femmes', () => {
    expect(teamGenderAllowsN3('women')).toBe(false);
    expect(teamGenderAllowsN3('men')).toBe(true);
    expect(getSelectableTeamLevels('women')).not.toContain(TeamLevel.N3);
    expect(getSelectableTeamLevels('men')).toContain(TeamLevel.N3);
    expect(getSelectableTeamLevels('women')).not.toContain(TeamLevel.N1_N3);
  });

  it('exclut N3 pour les coureurs femmes', () => {
    expect(riderSexAllowsN3(Sex.FEMALE)).toBe(false);
    expect(riderSexAllowsN3(Sex.MALE)).toBe(true);
  });
});

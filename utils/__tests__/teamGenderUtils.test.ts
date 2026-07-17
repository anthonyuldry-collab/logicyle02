import { describe, expect, it } from 'vitest';
import { TeamLevel } from '../../types';
import { getTeamGender, teamMatchesGenderFilter } from '../teamGenderUtils';

describe('teamGenderUtils', () => {
  it('lit le sexe depuis operationalSettings', () => {
    expect(
      getTeamGender({
        gender: 'men',
        operationalSettings: { gender: 'women' },
      }),
    ).toBe('women');
  });

  it('filtre Homme / Femme en gardant les équipes mixtes', () => {
    const womenTeam = {
      operationalSettings: { gender: 'women' as const },
    };
    const menTeam = { gender: 'men' as const };
    const mixedTeam = { operationalSettings: { gender: 'mixed' as const } };
    const unknownTeam = { level: TeamLevel.PRO };

    expect(teamMatchesGenderFilter(womenTeam, 'women')).toBe(true);
    expect(teamMatchesGenderFilter(womenTeam, 'men')).toBe(false);
    expect(teamMatchesGenderFilter(menTeam, 'men')).toBe(true);
    expect(teamMatchesGenderFilter(mixedTeam, 'men')).toBe(true);
    expect(teamMatchesGenderFilter(unknownTeam, 'women')).toBe(true);
    expect(teamMatchesGenderFilter(womenTeam, 'all')).toBe(true);
  });
});

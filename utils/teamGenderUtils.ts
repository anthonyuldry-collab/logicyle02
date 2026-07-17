import { Team, TeamGender } from '../types';

export const TEAM_GENDER_LABELS: Record<TeamGender, { fr: string; en: string }> = {
  men: { fr: 'Homme', en: 'Men' },
  women: { fr: 'Femme', en: 'Women' },
  mixed: { fr: 'Mixte', en: 'Mixed' },
};

/** Résout le sexe affiché / filtrable d’une équipe (défaut : mixte). */
export function getTeamGender(team?: Pick<Team, 'gender' | 'operationalSettings'> | null): TeamGender {
  return team?.operationalSettings?.gender ?? team?.gender ?? 'mixed';
}

/** Filtre Homme / Femme : les équipes mixtes (ou non renseignées) restent visibles. */
export function teamMatchesGenderFilter(
  team: Pick<Team, 'gender' | 'operationalSettings'>,
  filter: TeamGender | 'all',
): boolean {
  if (filter === 'all') return true;
  const gender = getTeamGender(team);
  if (gender === 'mixed') return true;
  return gender === filter;
}

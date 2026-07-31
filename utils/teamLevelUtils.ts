import { Sex, TeamGender, TeamLevel } from '../types';

/** Niveaux DN / élite nationale (y compris l’ancien bucket N1–N3). */
export const NATIONAL_DN_TEAM_LEVELS: ReadonlySet<TeamLevel> = new Set([
  TeamLevel.N1,
  TeamLevel.N2,
  TeamLevel.N3,
  TeamLevel.N1_N3,
]);

export function isNationalDnTeamLevel(level?: TeamLevel | string | null): boolean {
  if (!level) return false;
  return NATIONAL_DN_TEAM_LEVELS.has(level as TeamLevel);
}

/**
 * Normalise un niveau stocké (ex. legacy N1_N3 → N1) pour presets / abonnements / UCI.
 * N2 et N3 restent distincts.
 */
export function normalizeTeamLevel(level?: TeamLevel | string | null): TeamLevel {
  if (!level) return TeamLevel.HORS_DN;
  if (level === TeamLevel.N1_N3 || level === 'Équipe Nationale/N1-N3') {
    return TeamLevel.N1;
  }
  if (Object.values(TeamLevel).includes(level as TeamLevel)) {
    return level as TeamLevel;
  }
  return TeamLevel.HORS_DN;
}

/** N3 n’existe qu’en calendrier hommes (FFC). */
export function teamGenderAllowsN3(gender?: TeamGender | null): boolean {
  return gender !== 'women';
}

export function riderSexAllowsN3(sex?: Sex | string | null): boolean {
  if (!sex) return true;
  const s = String(sex).toLowerCase();
  return !(
    s === Sex.FEMALE.toLowerCase()
    || s === Sex.FEMALE_SHORT
    || s === Sex.FEMALE_EN.toLowerCase()
    || s === 'femme'
    || s === 'women'
    || s === 'f'
  );
}

const BASE_SELECTABLE_LEVELS: TeamLevel[] = [
  TeamLevel.FEDERATION,
  TeamLevel.JEUNES,
  TeamLevel.HORS_DN,
  TeamLevel.N1,
  TeamLevel.N2,
  TeamLevel.N3,
  TeamLevel.PRO,
];

/**
 * Niveaux proposés à la création / réglages.
 * Femmes : pas de N3. L’ancien N1_N3 n’est plus proposé (legacy only).
 */
export function getSelectableTeamLevels(gender?: TeamGender | null): TeamLevel[] {
  if (teamGenderAllowsN3(gender)) return [...BASE_SELECTABLE_LEVELS];
  return BASE_SELECTABLE_LEVELS.filter((l) => l !== TeamLevel.N3);
}

/** Libellé court pour badges (N1, N2, N3, …). */
export function getTeamLevelShortLabel(level?: TeamLevel | string | null): string {
  switch (level) {
    case TeamLevel.N1:
    case TeamLevel.N1_N3:
      return 'N1';
    case TeamLevel.N2:
      return 'N2';
    case TeamLevel.N3:
      return 'N3';
    case TeamLevel.PRO:
      return 'Pro';
    case TeamLevel.JEUNES:
      return 'Jeunes';
    case TeamLevel.FEDERATION:
      return 'Fédé';
    case TeamLevel.HORS_DN:
      return 'Hors DN';
    default:
      return level ? String(level) : '—';
  }
}

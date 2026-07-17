import { DisciplinePracticed, Rider, RiderQualitativeProfile, ScoutingDataScope, ScoutingRequest, ScoutingRequestStatus, User } from '../types';
import { PROFILE_WEIGHTS, SPIDER_CHART_CHARACTERISTICS_CONFIG } from '../constants';
import { getRiderCharacteristicSafe } from './riderUtils';
import { DEMO_EXTRAS, isDemoTalentUser } from '../constants/demoTalentProfiles';
import { hasAnyScoutingDataAccess, hasScoutingScopeAccess } from './scoutingProspectUtils';

export type TalentSearchProfileGoal = 'all' | RiderQualitativeProfile;

export type TalentSortKey =
  | 'generalScore'
  | 'criterionScore'
  | 'name'
  | 'age'
  | 'charSprint'
  | 'charAnaerobic'
  | 'charPuncher'
  | 'charClimbing'
  | 'charRouleur';

export const TALENT_PROFILE_GOAL_OPTIONS: { value: TalentSearchProfileGoal; label: string }[] = [
  { value: 'all', label: 'Tous profils (moyenne)' },
  { value: RiderQualitativeProfile.GRIMPEUR, label: 'Grimpeur' },
  { value: RiderQualitativeProfile.SPRINTEUR, label: 'Sprinteur' },
  { value: RiderQualitativeProfile.PUNCHEUR, label: 'Puncheur' },
  { value: RiderQualitativeProfile.ROULEUR, label: 'Rouleur' },
  { value: RiderQualitativeProfile.COMPLET, label: 'Complet' },
  { value: RiderQualitativeProfile.CLASSIQUE, label: 'Classique / Flahute' },
  { value: RiderQualitativeProfile.BAROUDEUR_PROFIL, label: 'Baroudeur' },
];

export function getTalentDiscipline(user: User, riders: Rider[]): DisciplinePracticed | undefined {
  const rider = riders.find(r => r.email === user.email);
  if (rider?.disciplines?.length) return rider.disciplines[0];
  if (user.disciplines?.length) return user.disciplines[0];
  return undefined;
}

export function getCountryLabel(code?: string, countries?: { code: string; name: string }[]): string {
  if (!code) return '—';
  return countries?.find(c => c.code === code)?.name ?? code;
}

export function hasScoutingAccess(
  userId: string,
  teamRequests: ScoutingRequest[],
  scope?: ScoutingDataScope,
): boolean {
  if (scope) return hasScoutingScopeAccess(userId, teamRequests, scope);
  return hasAnyScoutingDataAccess(userId, teamRequests);
}

export function getTalentCharacteristics(
  user: User,
  riders: Rider[],
): Record<string, number> {
  if (isDemoTalentUser(user.id)) {
    const extras = DEMO_EXTRAS[user.id];
    if (extras) return { ...extras.chars };
  }
  const rider = riders.find(r => r.email === user.email || r.id === user.id);
  const source = rider ?? user;
  return Object.fromEntries(
    SPIDER_CHART_CHARACTERISTICS_CONFIG.map(c => [
      c.key,
      getRiderCharacteristicSafe(source, c.key),
    ]),
  );
}

/** Couleur type PCA selon le niveau de caractéristique (0–100) */
export function getCharacteristicCellClass(value: number | null): string {
  if (value === null || value <= 0) return 'bg-slate-700/50 text-slate-500';
  if (value >= 73) return 'bg-amber-500/90 text-amber-950 font-semibold';
  if (value >= 66) return 'bg-emerald-600/80 text-emerald-50';
  return 'bg-slate-600/70 text-slate-200';
}

export const CHARACTERISTIC_SHORT_LABELS: Record<string, string> = {
  charSprint: 'SPR',
  charAnaerobic: 'ANA',
  charPuncher: 'PUN',
  charClimbing: 'GRI',
  charRouleur: 'ROU',
};

export function getTalentRiderProfile(user: User, riders: Rider[]): Rider | undefined {
  return riders.find(r => r.email === user.email || r.id === user.id);
}

export function getTalentPowerProfile(user: User, riders: Rider[]) {
  const rider = getTalentRiderProfile(user, riders);
  return rider?.powerProfileFresh ?? rider?.powerProfile15KJ ?? user.powerProfile ?? {};
}

export function getTalentResultsHistory(user: User, riders: Rider[]) {
  const rider = getTalentRiderProfile(user, riders);
  return rider?.resultsHistory ?? user.resultsHistory ?? [];
}

export function getTalentPhotoUrl(user: User, riders: Rider[]): string | undefined {
  const rider = getTalentRiderProfile(user, riders);
  return rider?.photoUrl ?? user.photoUrl;
}

export function getTalentCareerObjective(user: User, riders: Rider[]): string | undefined {
  if (isDemoTalentUser(user.id)) {
    return DEMO_EXTRAS[user.id]?.careerObjective;
  }
  const rider = getTalentRiderProfile(user, riders);
  return user.careerAspirations?.trim() || rider?.careerAspirations?.trim() || undefined;
}

/** Caractéristique dominante pour un profil recherché */
export function getPrimaryCharacteristicKey(goal: TalentSearchProfileGoal): string {
  if (goal === 'all') return 'charRouleur';
  const weights = PROFILE_WEIGHTS[goal] as Record<string, number> | undefined;
  if (!weights) return 'charRouleur';
  return Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
}

export function getTalentPotentialRating(user: User): number | null {
  if (!isDemoTalentUser(user.id)) return null;
  return DEMO_EXTRAS[user.id]?.potentialRating ?? null;
}

/** Note générale 0–100 selon le profil recherché (pondérée ou moyenne) */
export function computeTalentGeneralScore(
  chars: Record<string, number>,
  goal: TalentSearchProfileGoal,
): number | null {
  const filled = Object.values(chars).filter(v => v > 0);
  if (filled.length === 0) return null;

  if (goal === 'all') {
    return Math.round(filled.reduce((a, b) => a + b, 0) / filled.length);
  }

  const weights = PROFILE_WEIGHTS[goal] as Record<string, number> | undefined;
  if (!weights) return null;

  let score = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = chars[key] ?? 0;
    if (value > 0) {
      score += value * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? Math.round(score / totalWeight) : null;
}

/** Note affichée : score caractéristiques + bonus potentiel démo */
export function getTalentDisplayGrade(
  user: User,
  riders: Rider[],
  goal: TalentSearchProfileGoal,
  unlocked: boolean,
): number | null {
  if (!unlocked) return null;
  const chars = getTalentCharacteristics(user, riders);
  const general = computeTalentGeneralScore(chars, goal);
  if (general === null) return null;

  const potential = getTalentPotentialRating(user);
  if (potential !== null) {
    return Math.round(general * 0.75 + potential * 20 * 0.25);
  }
  return general;
}

export function getTalentCriterionScore(
  user: User,
  riders: Rider[],
  goal: TalentSearchProfileGoal,
  unlocked: boolean,
): number | null {
  if (!unlocked) return null;
  const chars = getTalentCharacteristics(user, riders);
  const key = getPrimaryCharacteristicKey(goal);
  const value = chars[key];
  return value > 0 ? value : null;
}

export function getGeneralScoreCellClass(score: number | null): string {
  if (score === null) return 'bg-slate-700/50 text-slate-500';
  if (score >= 80) return 'bg-amber-500/90 text-amber-950 font-bold';
  if (score >= 70) return 'bg-emerald-600/80 text-emerald-50 font-semibold';
  if (score >= 60) return 'bg-slate-500/80 text-slate-100';
  return 'bg-slate-700/60 text-slate-400';
}

export function sortTalents(
  talents: User[],
  riders: Rider[],
  teamRequests: ScoutingRequest[],
  goal: TalentSearchProfileGoal,
  sortKey: TalentSortKey,
  direction: 'asc' | 'desc',
): User[] {
  const sorted = [...talents];
  const factor = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    const aUnlocked = hasScoutingAccess(a.id, teamRequests);
    const bUnlocked = hasScoutingAccess(b.id, teamRequests);

    if (sortKey === 'name') {
      const cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr');
      return cmp * factor;
    }

    if (sortKey === 'age') {
      const ageOf = (u: User) => {
        const bd = u.signupInfo?.birthDate;
        if (!bd) return -1;
        const today = new Date();
        const birth = new Date(bd);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
      };
      return (ageOf(a) - ageOf(b)) * factor;
    }

    const scoreKeys: TalentSortKey[] = [
      'generalScore',
      'criterionScore',
      'charSprint',
      'charAnaerobic',
      'charPuncher',
      'charClimbing',
      'charRouleur',
    ];

    if (scoreKeys.includes(sortKey)) {
      if (!aUnlocked && !bUnlocked) {
        return `${a.lastName}`.localeCompare(`${b.lastName}`, 'fr');
      }
      if (!aUnlocked) return 1;
      if (!bUnlocked) return -1;

      let aVal = 0;
      let bVal = 0;

      if (sortKey === 'generalScore') {
        aVal = getTalentDisplayGrade(a, riders, goal, true) ?? 0;
        bVal = getTalentDisplayGrade(b, riders, goal, true) ?? 0;
      } else if (sortKey === 'criterionScore') {
        aVal = getTalentCriterionScore(a, riders, goal, true) ?? 0;
        bVal = getTalentCriterionScore(b, riders, goal, true) ?? 0;
      } else {
        const aChars = getTalentCharacteristics(a, riders);
        const bChars = getTalentCharacteristics(b, riders);
        aVal = aChars[sortKey] ?? 0;
        bVal = bChars[sortKey] ?? 0;
      }

      if (aVal !== bVal) return (aVal - bVal) * factor;
      return `${a.lastName}`.localeCompare(`${b.lastName}`, 'fr');
    }

    return 0;
  });

  return sorted;
}

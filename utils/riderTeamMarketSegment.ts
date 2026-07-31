import { getLevelCategory } from './ageUtils';
import { Rider, Sex, Team, TeamGender, TeamLevel, TeamOperationalSettings, TeamRecruitmentTarget, User } from '../types';
import { getTeamGender } from './teamGenderUtils';
import { isNationalDnTeamLevel, riderSexAllowsN3 } from './teamLevelUtils';

/** Segment marché du coureur (du plus élevé au plus local). */
export type RiderMarketSegment =
  | 'pro'
  | 'elite' // Elite N1 (legacy id)
  | 'n2'
  | 'n3'
  | 'open1'
  | 'open2'
  | 'open3'
  | 'youth'
  | 'regional';

/** Cible de recherche choisie par l'équipe sur le marché talents. */
export type { TeamRecruitmentTarget } from '../types';

export interface TeamMarketContext {
  level: TeamLevel;
  teamKind?: Team['teamKind'];
  recruitmentTarget: TeamRecruitmentTarget;
  gender: TeamGender;
}

const SEGMENT_ORDER: RiderMarketSegment[] = [
  'pro',
  'elite',
  'n2',
  'n3',
  'open1',
  'open2',
  'open3',
  'youth',
  'regional',
];

export const RIDER_SEGMENT_LABELS: Record<RiderMarketSegment, string> = {
  pro: 'Pro / WorldTour',
  elite: 'Elite N1',
  n2: 'Elite N2',
  n3: 'Elite N3',
  open1: 'Open 1',
  open2: 'Open 2',
  open3: 'Open 3',
  youth: 'Jeunes U19–U23',
  regional: 'Club régional',
};

export const RECRUITMENT_TARGET_OPTIONS: {
  id: TeamRecruitmentTarget;
  label: string;
  hint: string;
}[] = [
  { id: 'auto', label: 'Automatique (selon niveau équipe)', hint: 'Segmentation par défaut' },
  { id: 'pro_conti', label: 'Pro / Continental', hint: 'Coureurs Pro et élite internationale' },
  { id: 'elite_n1', label: 'Elite nationale N1–N3', hint: 'DN N1/N2/N3 (N3 hommes uniquement)' },
  { id: 'open_amateur', label: 'Open amateur', hint: 'Open 1, 2 et 3' },
  { id: 'youth_u19', label: 'Jeunes U19–U23', hint: 'Réserve, espoirs, formation' },
  { id: 'regional_club', label: 'Club régional', hint: 'Open 2/3 et clubs locaux' },
];

function getAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Déduit N1 / N2 / N3 à partir d’un libellé de catégorie. */
export function parseDnLevelFromLabel(raw?: string | null): 1 | 2 | 3 | null {
  if (!raw) return null;
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\bn\s*3\b|\bdn\s*3\b|elite\s*n\s*3/.test(s)) return 3;
  if (/\bn\s*2\b|\bdn\s*2\b|elite\s*n\s*2/.test(s)) return 2;
  if (/\bn\s*1\b|\bdn\s*1\b|elite\s*n\s*1/.test(s)) return 1;
  return null;
}

function dnSegmentFromLevel(dn: 1 | 2 | 3): RiderMarketSegment {
  if (dn === 3) return 'n3';
  if (dn === 2) return 'n2';
  return 'elite';
}

export function resolveRiderMarketSegment(input: {
  categories?: string[];
  levelCategory?: string;
  birthDate?: string;
  sex?: Sex | string | null;
  rider?: Partial<Rider> | null;
  user?: Partial<User> | null;
}): RiderMarketSegment {
  const profile = input.rider ?? {
    categories: input.categories ?? input.user?.categories,
    levelCategory: input.levelCategory,
  };
  const sex =
    input.sex
    ?? input.rider?.sex
    ?? input.user?.sex
    ?? input.user?.signupInfo?.sex;
  const allowsN3 = riderSexAllowsN3(sex);

  const categoryHints = [
    ...(Array.isArray(profile.categories) ? profile.categories : []),
    (profile as { levelCategory?: string }).levelCategory,
    input.levelCategory,
  ].filter(Boolean) as string[];

  for (const hint of categoryHints) {
    const dn = parseDnLevelFromLabel(hint);
    if (dn != null) {
      const segment = dnSegmentFromLevel(dn);
      if (segment === 'n3' && !allowsN3) return 'n2';
      return segment;
    }
  }

  const level = getLevelCategory(profile);
  const dnFromLevel = parseDnLevelFromLabel(level);
  if (dnFromLevel != null) {
    const segment = dnSegmentFromLevel(dnFromLevel);
    if (segment === 'n3' && !allowsN3) return 'n2';
    return segment;
  }

  const age = getAge(input.birthDate ?? input.user?.signupInfo?.birthDate);

  if (level === 'Pro') return 'pro';
  if (level === 'Elite' || level === 'Elite N1') return 'elite';
  if (level === 'Elite N2') return 'n2';
  if (level === 'Elite N3') return allowsN3 ? 'n3' : 'n2';
  if (level === 'Open 1') return 'open1';
  if (level === 'Open 2') return 'open2';
  if (level === 'Open 3') return 'open3';

  if (age != null && age <= 23) return 'youth';
  if (age != null && age <= 19) return 'youth';

  return 'regional';
}

export function resolveRiderMarketSegmentFromUser(
  user: User,
  rider?: Rider | null,
): RiderMarketSegment {
  return resolveRiderMarketSegment({
    user,
    rider: rider ?? undefined,
    categories: user.categories,
    birthDate: user.signupInfo?.birthDate,
    sex: user.sex ?? user.signupInfo?.sex,
  });
}

function isDevelopmentTeam(ctx: TeamMarketContext): boolean {
  return ctx.teamKind === 'development' || ctx.teamKind === 'espoirs';
}

/** Équipe Pro / WorldTour / Continental (hors réserve et espoirs). */
function isProMainTeam(ctx: TeamMarketContext): boolean {
  return ctx.level === TeamLevel.PRO && !isDevelopmentTeam(ctx);
}

function filterSegmentsByTeamGender(
  segments: RiderMarketSegment[],
  gender: TeamGender,
): RiderMarketSegment[] {
  if (gender === 'women') return segments.filter((s) => s !== 'n3');
  return segments;
}

function segmentsForTarget(target: TeamRecruitmentTarget): RiderMarketSegment[] {
  switch (target) {
    case 'pro_conti':
      return ['pro', 'elite', 'n2'];
    case 'elite_n1':
      return ['elite', 'n2', 'n3', 'open1'];
    case 'open_amateur':
      return ['open1', 'open2', 'open3'];
    case 'youth_u19':
      return ['youth'];
    case 'regional_club':
      return ['regional', 'open3', 'open2'];
    default:
      return [];
  }
}

/** Segments qu'une équipe peut voir / recruter selon son niveau et sa cible. */
export function getAllowedRiderSegments(ctx: TeamMarketContext): Set<RiderMarketSegment> {
  if (ctx.recruitmentTarget !== 'auto') {
    const fromTarget = segmentsForTarget(ctx.recruitmentTarget);
    const autoAllowed = getAllowedRiderSegments({ ...ctx, recruitmentTarget: 'auto' });
    return new Set(
      filterSegmentsByTeamGender(fromTarget, ctx.gender).filter((s) => autoAllowed.has(s)),
    );
  }

  let base: RiderMarketSegment[];

  if (isDevelopmentTeam(ctx)) {
    base = ['youth', 'elite', 'n2', 'open1', 'open2'];
  } else if (isProMainTeam(ctx)) {
    base = ['pro', 'elite', 'n2'];
  } else if (isNationalDnTeamLevel(ctx.level)) {
    if (ctx.level === TeamLevel.N3) {
      base = ['elite', 'n2', 'n3', 'open1', 'open2', 'youth'];
    } else if (ctx.level === TeamLevel.N2) {
      base = ['elite', 'n2', 'open1', 'open2', 'youth'];
    } else {
      // N1 + legacy N1_N3
      base = ['elite', 'n2', 'n3', 'open1', 'open2', 'youth'];
    }
  } else if (ctx.level === TeamLevel.JEUNES) {
    base = ['youth', 'open3', 'regional'];
  } else if (ctx.level === TeamLevel.HORS_DN) {
    base = ['open2', 'open3', 'regional', 'youth'];
  } else if (ctx.level === TeamLevel.FEDERATION) {
    base = [...SEGMENT_ORDER];
  } else {
    base = ['open3', 'regional'];
  }

  return new Set(filterSegmentsByTeamGender(base, ctx.gender));
}

export function getTeamMarketContext(
  team?: Team | null,
  operationalSettings?: TeamOperationalSettings,
): TeamMarketContext {
  return {
    level: team?.level ?? TeamLevel.HORS_DN,
    teamKind: team?.teamKind,
    recruitmentTarget: operationalSettings?.recruitmentTarget ?? 'auto',
    gender: getTeamGender(team),
  };
}

export function canTeamScoutRider(ctx: TeamMarketContext, riderSegment: RiderMarketSegment): boolean {
  return getAllowedRiderSegments(ctx).has(riderSegment);
}

export function canRiderApplyToTeam(
  riderSegment: RiderMarketSegment,
  team?: Team | null,
  operationalSettings?: TeamOperationalSettings,
): boolean {
  if (!team) return false;
  if (!teamAcceptsRiderApplications(team, operationalSettings)) return false;
  const ctx = getTeamMarketContext(team, operationalSettings);
  return canTeamScoutRider(ctx, riderSegment);
}

/** Une équipe accepte-t-elle les candidatures coureurs sur le portail ? (défaut : oui) */
export function teamAcceptsRiderApplications(
  team?: Team | null,
  operationalSettings?: TeamOperationalSettings,
): boolean {
  const settings = operationalSettings ?? team?.operationalSettings;
  return settings?.acceptRiderApplications !== false;
}

export function getRecruitmentTargetsForTeam(ctx: TeamMarketContext): TeamRecruitmentTarget[] {
  const autoCtx = { ...ctx, recruitmentTarget: 'auto' as const };
  const allowed = getAllowedRiderSegments(autoCtx);
  const options: TeamRecruitmentTarget[] = ['auto'];

  const checks: [TeamRecruitmentTarget, RiderMarketSegment[]][] = [
    ['pro_conti', ['pro', 'elite']],
    ['elite_n1', ['elite', 'open1']],
    ['open_amateur', ['open1', 'open2', 'open3']],
    ['youth_u19', ['youth']],
    ['regional_club', ['regional', 'open3']],
  ];

  for (const [target, segments] of checks) {
    if (segments.every((s) => allowed.has(s))) {
      options.push(target);
    }
  }

  return options;
}

/** Options de filtre segment, éventuellement sans N3 (équipes / coureurs femmes). */
export function getRiderSegmentFilterOptions(options?: {
  teamGender?: TeamGender | null;
  riderSex?: Sex | string | null;
}): { id: RiderMarketSegment; label: string }[] {
  const allowN3 =
    (options?.teamGender == null || options.teamGender !== 'women')
    && (options?.riderSex == null || riderSexAllowsN3(options.riderSex));

  return SEGMENT_ORDER.filter((id) => allowN3 || id !== 'n3').map((id) => ({
    id,
    label: RIDER_SEGMENT_LABELS[id],
  }));
}

export function getMarketMismatchMessage(
  riderSegment: RiderMarketSegment,
  team?: Team | null,
): string {
  const teamName = team?.name ?? 'cette équipe';
  const riderLabel = RIDER_SEGMENT_LABELS[riderSegment];
  if (isDevelopmentTeam(getTeamMarketContext(team))) {
    return `Profil ${riderLabel} : hors périmètre réserve / formation de ${teamName}.`;
  }
  if (team?.level === TeamLevel.PRO) {
    return `Un coureur ${riderLabel} ne peut pas candidater en équipe Pro / WorldTour / Continental. ${teamName} recrute uniquement des profils Pro et Elite.`;
  }
  return `Profil ${riderLabel} incompatible avec le niveau de ${teamName}.`;
}

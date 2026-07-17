import { getLevelCategory } from './ageUtils';
import { Rider, Team, TeamLevel, TeamOperationalSettings, TeamRecruitmentTarget, User } from '../types';

/** Segment marché du coureur (du plus élevé au plus local). */
export type RiderMarketSegment =
  | 'pro'
  | 'elite'
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
}

const SEGMENT_ORDER: RiderMarketSegment[] = [
  'pro',
  'elite',
  'open1',
  'open2',
  'open3',
  'youth',
  'regional',
];

export const RIDER_SEGMENT_LABELS: Record<RiderMarketSegment, string> = {
  pro: 'Pro / WorldTour',
  elite: 'Elite / N1',
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
  { id: 'elite_n1', label: 'Elite nationale / N1', hint: 'DN, élite nationale, Open 1' },
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

export function resolveRiderMarketSegment(input: {
  categories?: string[];
  levelCategory?: string;
  birthDate?: string;
  rider?: Partial<Rider> | null;
  user?: Partial<User> | null;
}): RiderMarketSegment {
  const profile = input.rider ?? {
    categories: input.categories ?? input.user?.categories,
    levelCategory: input.levelCategory,
  };
  const level = getLevelCategory(profile);
  const age = getAge(input.birthDate ?? input.user?.signupInfo?.birthDate);

  if (level === 'Pro') return 'pro';
  if (level === 'Elite') return 'elite';
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
  });
}

function isDevelopmentTeam(ctx: TeamMarketContext): boolean {
  return ctx.teamKind === 'development' || ctx.teamKind === 'espoirs';
}

/** Équipe Pro / WorldTour / Continental (hors réserve et espoirs). */
function isProMainTeam(ctx: TeamMarketContext): boolean {
  return ctx.level === TeamLevel.PRO && !isDevelopmentTeam(ctx);
}

function segmentsForTarget(target: TeamRecruitmentTarget): RiderMarketSegment[] {
  switch (target) {
    case 'pro_conti':
      return ['pro', 'elite'];
    case 'elite_n1':
      return ['elite', 'open1'];
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
    return new Set(fromTarget.filter((s) => autoAllowed.has(s)));
  }

  if (isDevelopmentTeam(ctx)) {
    return new Set<RiderMarketSegment>(['youth', 'elite', 'open1', 'open2']);
  }

  if (isProMainTeam(ctx)) {
    return new Set<RiderMarketSegment>(['pro', 'elite']);
  }

  if (ctx.level === TeamLevel.N1_N3) {
    return new Set<RiderMarketSegment>(['elite', 'open1', 'open2', 'youth']);
  }

  if (ctx.level === TeamLevel.JEUNES) {
    return new Set<RiderMarketSegment>(['youth', 'open3', 'regional']);
  }

  if (ctx.level === TeamLevel.HORS_DN) {
    return new Set<RiderMarketSegment>(['open2', 'open3', 'regional', 'youth']);
  }

  if (ctx.level === TeamLevel.FEDERATION) {
    return new Set(SEGMENT_ORDER);
  }

  return new Set<RiderMarketSegment>(['open3', 'regional']);
}

export function getTeamMarketContext(
  team?: Team | null,
  operationalSettings?: TeamOperationalSettings,
): TeamMarketContext {
  return {
    level: team?.level ?? TeamLevel.HORS_DN,
    teamKind: team?.teamKind,
    recruitmentTarget: operationalSettings?.recruitmentTarget ?? 'auto',
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

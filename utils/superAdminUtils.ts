import { User, Team } from '../types';
import { HOLDING_SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAILS } from '../constants';

export function isSuperAdminUser(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  const email = user.email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === email);
}

/** Vue holding réservée au super administrateur plateforme (Anthony). */
export function isHoldingSuperAdminUser(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.trim().toLowerCase() === HOLDING_SUPER_ADMIN_EMAIL.toLowerCase();
}

/** Équipe de contexte pour tester l'app (scouting, effectif…) sans membership. */
export function resolveSuperAdminTeamId(
  user: User,
  teams: Team[],
  preferredTeamId?: string | null
): string | null {
  if (!isSuperAdminUser(user)) return preferredTeamId ?? null;
  if (preferredTeamId) return preferredTeamId;
  if (user.teamId) return user.teamId;
  return teams[0]?.id ?? null;
}

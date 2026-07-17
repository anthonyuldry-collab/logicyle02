import { User, Team } from '../types';
import { HOLDING_SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAILS } from '../constants';
import { auth } from '../firebaseConfig';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAllowedSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return SUPER_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}

/**
 * Super Admin : privilégie l’email Auth (non spoofable via doc Firestore).
 * Fallback sur user.email uniquement si Auth n’est pas encore hydraté.
 */
export function isSuperAdminUser(user: User | null | undefined): boolean {
  const authEmail = auth.currentUser?.email;
  if (authEmail) return isAllowedSuperAdminEmail(authEmail);
  if (!user?.email) return false;
  return isAllowedSuperAdminEmail(user.email);
}

/** Vue holding réservée au super administrateur plateforme (Anthony). */
export function isHoldingSuperAdminUser(user: User | null | undefined): boolean {
  const authEmail = auth.currentUser?.email;
  const email = authEmail || user?.email;
  if (!email) return false;
  return normalizeEmail(email) === HOLDING_SUPER_ADMIN_EMAIL.toLowerCase();
}

/** Équipe de contexte optionnelle (aperçu rôle). Jamais d’auto-rattachement à teams[0]. */
export function resolveSuperAdminTeamId(
  user: User,
  _teams: Team[],
  preferredTeamId?: string | null
): string | null {
  if (!isSuperAdminUser(user)) return preferredTeamId ?? null;
  return preferredTeamId ?? null;
}

/** Mode cockpit plateforme : Super Admin sans équipe active, hors aperçu rôle. */
export function isSuperAdminPlatformMode(
  user: User | null | undefined,
  activeTeamId: string | null | undefined,
  previewMode: string = 'full'
): boolean {
  return isSuperAdminUser(user) && !activeTeamId && previewMode === 'full';
}

/** Sections autorisées en mode plateforme (sans équipe). */
export const SUPER_ADMIN_PLATFORM_SECTIONS = [
  'organizationDashboard',
  'superAdmin',
  'userSettings',
  'pricing',
] as const;

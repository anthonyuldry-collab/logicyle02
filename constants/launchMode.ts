import { AppSection, SubscriptionPlanId } from '../types';
import { isPlanAtLeast } from './subscriptionPlans';

/**
 * Mode lancement « wedge ops » (défaut).
 * - `ops`  : surface réseau/marketplace retirée du parcours Club/Compétition
 * - `full` : toutes les sections selon SECTION_MIN_PLAN uniquement
 *
 * Variable : VITE_LAUNCH_MODE=ops|full
 */
export type LaunchMode = 'ops' | 'full';

export function getLaunchMode(): LaunchMode {
  const raw = String(import.meta.env.VITE_LAUNCH_MODE || 'ops').toLowerCase().trim();
  return raw === 'full' ? 'full' : 'ops';
}

export function isOpsLaunchMode(): boolean {
  return getLaunchMode() === 'ops';
}

/**
 * Sections réseau / marketplace masquées en mode ops pour les plans
 * sous Élite (CONTINENTAL). Les plans Élite+ les voient s’ils y ont droit.
 */
export const LAUNCH_OPS_SOFT_HIDE_SECTIONS: AppSection[] = [
  'missionSearch',
  'scouting',
  'talentAvailability',
  'talentSearch',
  'partnerPortal',
];

/**
 * En mode ops, ajoute des verrous soft pour Club / Compétition
 * (réseau & marketplace hors nav) sans toucher Élite+.
 */
export function getLaunchModeExtraLockedSections(
  planId: SubscriptionPlanId
): AppSection[] {
  if (!isOpsLaunchMode()) return [];
  if (isPlanAtLeast(planId, SubscriptionPlanId.CONTINENTAL)) return [];
  return [...LAUNCH_OPS_SOFT_HIDE_SECTIONS];
}

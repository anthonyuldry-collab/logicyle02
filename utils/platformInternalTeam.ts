import { Team, TeamSubscription } from '../types';
import {
  getUnlockedPresentationSubscription,
  isPresentationDemoTeam,
} from './presentationDemoAccess';

type ComplimentaryTeam = Pick<Team, 'id' | 'name'> & {
  isPlatformInternal?: boolean;
  isPresentationDemo?: boolean;
};

/** Sandbox / équipe de travail fondateur — hors MRR, sans Stripe. */
export function isPlatformInternalTeam(
  team: Pick<Team, 'id'> & { isPlatformInternal?: boolean } | null | undefined
): boolean {
  return Boolean(team?.isPlatformInternal);
}

/** Démo Horizon ou équipe interne : accès produit sans paiement. */
export function isComplimentaryAccessTeam(
  team: ComplimentaryTeam | null | undefined
): boolean {
  return isPresentationDemoTeam(team) || isPlatformInternalTeam(team);
}

export function getUnlockedInternalSubscription(): TeamSubscription {
  return getUnlockedPresentationSubscription();
}

/** Équipes que le Super Admin peut ouvrir depuis le sélecteur (cockpit). */
export function isSuperAdminSwitcherTeam(
  team: Team,
  activeTeamId?: string | null
): boolean {
  return isComplimentaryAccessTeam(team) || team.id === activeTeamId;
}

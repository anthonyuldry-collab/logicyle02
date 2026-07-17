import { DEMO_PRES_TEAM_NAME } from '../constants/demoPresentationTeam';
import { SubscriptionPlanId, Team, TeamSubscription } from '../types';

/** Équipe fictive Horizon Atlantique (présentation / démo). */
export function isPresentationDemoTeam(
  team: Pick<Team, 'name'> & { isPresentationDemo?: boolean } | null | undefined
): boolean {
  if (!team) return false;
  return team.isPresentationDemo === true || team.name === DEMO_PRES_TEAM_NAME;
}

/** Abonnement débloqué pour l’équipe de présentation (toutes les fonctionnalités). */
export function getUnlockedPresentationSubscription(): TeamSubscription {
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 5);
  return {
    planId: SubscriptionPlanId.PRO,
    status: 'active',
    billingInterval: 'year',
    currentPeriodEnd: periodEnd.toISOString(),
  };
}

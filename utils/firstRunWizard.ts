const STORAGE_PREFIX = 'logicycle_first_run_v1_';

export type FirstRunStep = 'roster' | 'event' | 'done';

export function firstRunStorageKey(teamId: string): string {
  return `${STORAGE_PREFIX}${teamId}`;
}

export function isFirstRunDismissed(teamId: string | null | undefined): boolean {
  if (!teamId || typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(firstRunStorageKey(teamId)) === 'done';
  } catch {
    return false;
  }
}

export function dismissFirstRun(teamId: string): void {
  try {
    window.localStorage.setItem(firstRunStorageKey(teamId), 'done');
  } catch {
    // ignore quota / private mode
  }
}

export function shouldShowFirstRunWizard(params: {
  teamId: string | null | undefined;
  isIndependent: boolean;
  isSuperAdminPlatform: boolean;
  riderCount: number;
  eventCount: number;
  isTrialOrPilot: boolean;
}): boolean {
  if (!params.teamId || params.isIndependent || params.isSuperAdminPlatform) return false;
  if (isFirstRunDismissed(params.teamId)) return false;
  // Wizard utile surtout en essai/pilote, ou tant qu’aucune course n’existe
  if (!params.isTrialOrPilot && params.eventCount > 0) return false;
  return params.eventCount === 0 || params.riderCount === 0;
}

export function resolveFirstRunStep(riderCount: number, eventCount: number): FirstRunStep {
  if (riderCount === 0) return 'roster';
  if (eventCount === 0) return 'event';
  return 'done';
}

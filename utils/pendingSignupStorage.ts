import type { SignupData } from '../sections/SignupView';

const PENDING_SIGNUP_KEY = 'logicycle_pending_signup_v1';

/** Persiste les données d'inscription (sans mot de passe) pour survivre au refresh auth. */
export function persistPendingSignup(data: SignupData): void {
  try {
    const { password: _password, ...safe } = data;
    sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(safe));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPendingSignup(): Omit<SignupData, 'password'> | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Omit<SignupData, 'password'>;
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    /* ignore */
  }
}

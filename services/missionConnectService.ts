import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';
import { FIREBASE_FUNCTIONS_REGION } from '../constants/firebaseRegions';

export async function createMissionConnectAccount(): Promise<{
  accountId: string;
  payoutsEnabled: boolean;
}> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<Record<string, never>, { accountId: string; payoutsEnabled: boolean }>(
    functions,
    'createMissionConnectAccount',
  );
  const result = await fn({});
  return result.data;
}

export async function createMissionConnectAccountLink(): Promise<{ url: string; accountId: string }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<Record<string, never>, { url: string; accountId: string }>(
    functions,
    'createMissionConnectAccountLink',
  );
  const result = await fn({});
  return result.data;
}

/** Crée le compte Connect si besoin puis redirige vers l’onboarding Express. */
export async function startMissionConnectOnboarding(): Promise<void> {
  await createMissionConnectAccount();
  const { url } = await createMissionConnectAccountLink();
  window.location.href = url;
}

export async function createMissionPaymentCheckout(
  teamId: string,
  missionId: string,
): Promise<{ url: string; gmvEur: number; commissionEur: number }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<
    { teamId: string; missionId: string },
    { url: string; gmvEur: number; commissionEur: number }
  >(functions, 'createMissionPaymentCheckout');
  const result = await fn({ teamId, missionId });
  return result.data;
}

export async function requestMissionPayment(teamId: string, missionId: string): Promise<void> {
  const { url } = await createMissionPaymentCheckout(teamId, missionId);
  window.location.href = url;
}

/** Vacataire : finalise le modèle de facture (n° définitif + archive). */
export async function finalizeVacataireMissionInvoice(
  teamId: string,
  missionId: string,
): Promise<{ invoiceNumber: string; alreadyIssued: boolean }> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<
    { teamId: string; missionId: string },
    { invoiceNumber: string; alreadyIssued: boolean }
  >(functions, 'finalizeVacataireMissionInvoice');
  const result = await fn({ teamId, missionId });
  return result.data;
}

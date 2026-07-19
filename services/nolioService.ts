import { getFunctions, httpsCallable } from 'firebase/functions';
import { FIREBASE_FUNCTIONS_REGION } from '../constants/firebaseRegions';
import { app } from '../firebaseConfig';
import { NolioConnectionInfo, NolioTrainingsResponse } from '../types/nolio';
import { generateId } from '../utils/themeUtils';

const NOLIO_AUTH_BASE = 'https://www.nolio.io/api/authorize/';
const NOLIO_STATE_KEY = 'logicycle_nolio_oauth_state';

function getClientId(): string | undefined {
  return import.meta.env.VITE_NOLIO_CLIENT_ID as string | undefined;
}

export function isNolioConfigured(): boolean {
  return !!getClientId();
}

export function buildNolioAuthorizeUrl(redirectUri: string): string {
  const clientId = getClientId();
  if (!clientId) throw new Error('VITE_NOLIO_CLIENT_ID non configuré');

  const state = generateId();
  sessionStorage.setItem(NOLIO_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });
  return `${NOLIO_AUTH_BASE}?${params.toString()}`;
}

export function consumeNolioOAuthState(returnedState: string | null): boolean {
  const expected = sessionStorage.getItem(NOLIO_STATE_KEY);
  sessionStorage.removeItem(NOLIO_STATE_KEY);
  return !!expected && expected === returnedState;
}

async function callNolio<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
  const fn = httpsCallable<Record<string, unknown>, T>(functions, name);
  const result = await fn(data);
  return result.data;
}

export async function exchangeNolioCode(code: string, redirectUri: string): Promise<NolioConnectionInfo> {
  return callNolio<NolioConnectionInfo>('nolioExchangeCode', { code, redirectUri });
}

export async function getNolioConnectionStatus(): Promise<NolioConnectionInfo> {
  try {
    return await callNolio<NolioConnectionInfo>('nolioGetConnectionStatus', {});
  } catch {
    return { connected: false };
  }
}

export async function fetchNolioTrainings(from: string, to: string): Promise<NolioTrainingsResponse> {
  return callNolio<NolioTrainingsResponse>('nolioGetTrainings', { from, to });
}

export async function disconnectNolio(): Promise<void> {
  await callNolio<{ success: boolean }>('nolioDisconnect', {});
}

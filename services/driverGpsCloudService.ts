import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, app } from '../firebaseConfig';
import { getFirebaseCallableUrl } from '../utils/gpsTrackingUtils';
import { FIREBASE_FUNCTIONS_REGION } from '../constants/firebaseRegions';

export interface DriverGpsVehicleAssignment {
  vehicleId: string;
  eventId?: string;
  transportLegId?: string;
}

export interface RecordDriverGpsPayload {
  teamId: string;
  staffId: string;
  vehicleIds: string[];
  /** Contexte par véhicule (événement / trajet) — évite N appels Cloud Function par fix */
  vehicleAssignments?: DriverGpsVehicleAssignment[];
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  eventId?: string;
  transportLegId?: string;
}

const FUNCTIONS_REGION = FIREBASE_FUNCTIONS_REGION;

async function postCallableNative(payload: RecordDriverGpsPayload): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Non authentifié');
  const token = await user.getIdToken();
  const url = getFirebaseCallableUrl('recordDriverGpsPosition', FUNCTIONS_REGION);
  const response = await CapacitorHttp.post({
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: { data: payload },
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }
  const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  if (body?.error) {
    throw new Error(body.error.message || 'Cloud Function error');
  }
}

async function postCallableWeb(payload: RecordDriverGpsPayload): Promise<void> {
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const callable = httpsCallable<RecordDriverGpsPayload, { ok: boolean }>(functions, 'recordDriverGpsPosition');
  await callable(payload);
}

/** Enregistre une position chauffeur via Cloud Function (Admin SDK). Repli client Firestore si indisponible. */
export async function recordDriverGpsPositionSecure(
  payload: RecordDriverGpsPayload,
  options: { preferNativeHttp?: boolean } = {},
): Promise<void> {
  const useNativeHttp = options.preferNativeHttp && Capacitor.isNativePlatform();

  try {
    if (useNativeHttp) {
      await postCallableNative(payload);
    } else {
      await postCallableWeb(payload);
    }
    return;
  } catch (error) {
    console.warn('recordDriverGpsPosition Cloud Function indisponible:', error);
    throw error instanceof Error ? error : new Error('GPS cloud unavailable');
  }
}

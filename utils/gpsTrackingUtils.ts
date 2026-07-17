export const GPS_TRACKING_MIN_INTERVAL_MS = 30_000;
export const GPS_DISTANCE_FILTER_METERS = 25;

export function shouldEmitGpsFix(
  lastSentAtMs: number,
  nowMs: number,
  minIntervalMs = GPS_TRACKING_MIN_INTERVAL_MS,
): boolean {
  return nowMs - lastSentAtMs >= minIntervalMs;
}

export function metersPerSecondToKmh(speedMps: number | null | undefined): number | undefined {
  if (speedMps == null || Number.isNaN(speedMps)) return undefined;
  return Math.max(0, speedMps * 3.6);
}

export function getFirebaseCallableUrl(functionName: string, region = 'europe-west1'): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
}

import { describe, expect, it } from 'vitest';
import {
  GPS_TRACKING_MIN_INTERVAL_MS,
  getFirebaseCallableUrl,
  metersPerSecondToKmh,
  shouldEmitGpsFix,
} from '../gpsTrackingUtils';

describe('gpsTrackingUtils', () => {
  it('throttles GPS fixes by interval', () => {
    expect(shouldEmitGpsFix(0, 10_000, GPS_TRACKING_MIN_INTERVAL_MS)).toBe(false);
    expect(shouldEmitGpsFix(0, 30_000, GPS_TRACKING_MIN_INTERVAL_MS)).toBe(true);
    expect(shouldEmitGpsFix(30_000, 50_000, GPS_TRACKING_MIN_INTERVAL_MS)).toBe(false);
  });

  it('converts m/s to km/h', () => {
    expect(metersPerSecondToKmh(10)).toBe(36);
    expect(metersPerSecondToKmh(-1)).toBe(0);
    expect(metersPerSecondToKmh(null)).toBeUndefined();
  });

  it('builds callable URL', () => {
    expect(getFirebaseCallableUrl('recordDriverGpsPosition', 'europe-west1')).toContain(
      'europe-west1-',
    );
    expect(getFirebaseCallableUrl('recordDriverGpsPosition', 'europe-west1')).toContain(
      'recordDriverGpsPosition',
    );
  });
});

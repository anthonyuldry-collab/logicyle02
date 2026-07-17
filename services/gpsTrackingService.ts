import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { Geolocation } from '@capacitor/geolocation';
import { isNativeCapacitorApp } from '../utils/capacitorPlatform';
import {
  GPS_DISTANCE_FILTER_METERS,
  GPS_TRACKING_MIN_INTERVAL_MS,
  metersPerSecondToKmh,
  shouldEmitGpsFix,
} from '../utils/gpsTrackingUtils';
import { isGeolocationSupported } from '../utils/driverGpsUtils';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export type GpsTrackingErrorCode = 'unsupported' | 'permission_denied' | 'unknown';

export interface GpsFix {
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  recordedAtMs: number;
}

export interface GpsTrackingOptions {
  backgroundTitle: string;
  backgroundMessage: string;
  onFix: (fix: GpsFix) => void | Promise<void>;
  onError?: (code: GpsTrackingErrorCode) => void;
}

export interface GpsTrackingSession {
  stop: () => Promise<void>;
  mode: 'native_background' | 'web_foreground';
}

async function requestNativePermissions(): Promise<boolean> {
  const perm = await Geolocation.requestPermissions();
  return perm.location === 'granted' || perm.coarseLocation === 'granted';
}

export async function isGpsTrackingSupported(): Promise<boolean> {
  if (isNativeCapacitorApp()) return true;
  return isGeolocationSupported();
}

export async function startGpsTracking(options: GpsTrackingOptions): Promise<GpsTrackingSession> {
  if (isNativeCapacitorApp()) {
    const granted = await requestNativePermissions();
    if (!granted) {
      options.onError?.('permission_denied');
      throw new Error('permission_denied');
    }

    let lastSentAt = 0;
    let watcherId: string | undefined;

    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: options.backgroundTitle,
        backgroundMessage: options.backgroundMessage,
        requestPermissions: false,
        stale: false,
        distanceFilter: GPS_DISTANCE_FILTER_METERS,
      },
      (location, error) => {
        if (error) {
          if (error.code === 'NOT_AUTHORIZED') {
            options.onError?.('permission_denied');
          } else {
            options.onError?.('unknown');
          }
          return;
        }
        if (!location) return;
        const now = location.time ?? Date.now();
        if (!shouldEmitGpsFix(lastSentAt, now, GPS_TRACKING_MIN_INTERVAL_MS)) return;
        lastSentAt = now;
        void options.onFix({
          latitude: location.latitude,
          longitude: location.longitude,
          speedKmh: metersPerSecondToKmh(location.speed),
          heading: location.bearing ?? undefined,
          recordedAtMs: now,
        });
      },
    );

    return {
      mode: 'native_background',
      stop: async () => {
        if (watcherId) {
          await BackgroundGeolocation.removeWatcher({ id: watcherId });
          watcherId = undefined;
        }
      },
    };
  }

  if (!isGeolocationSupported()) {
    options.onError?.('unsupported');
    throw new Error('unsupported');
  }

  let lastSentAt = 0;
  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (!shouldEmitGpsFix(lastSentAt, now, GPS_TRACKING_MIN_INTERVAL_MS)) return;
      lastSentAt = now;
      void options.onFix({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        speedKmh: metersPerSecondToKmh(pos.coords.speed),
        heading: pos.coords.heading ?? undefined,
        recordedAtMs: now,
      });
    },
    (err) => {
      options.onError?.(err.code === 1 ? 'permission_denied' : 'unknown');
    },
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
  );

  return {
    mode: 'web_foreground',
    stop: async () => {
      navigator.geolocation.clearWatch(watchId);
    },
  };
}

export async function openGpsSettings(): Promise<void> {
  if (isNativeCapacitorApp()) {
    await BackgroundGeolocation.openSettings();
  }
}

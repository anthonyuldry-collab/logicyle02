import { Capacitor } from '@capacitor/core';

export function isNativeCapacitorApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getCapacitorPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

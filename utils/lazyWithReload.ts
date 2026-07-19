import { ComponentType, lazy, LazyExoticComponent } from 'react';
import { recoverFromStaleDeploy } from './recoverFromStaleDeploy';

const RELOAD_KEY = 'logicycle:chunk-reload';

/** Erreur typique après un déploiement : l’ancien bundle référence un chunk hashé disparu. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as Error).message ?? error);
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Unable to preload CSS') ||
    (error as Error).name === 'ChunkLoadError'
  );
}

/**
 * Comme React.lazy, mais purge le SW / les caches puis recharge
 * si le chunk n’existe plus (souvent juste après un deploy Netlify).
 */
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && typeof window !== 'undefined') {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          void recoverFromStaleDeploy();
          // Empêche React de rendre l’erreur pendant le reload.
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

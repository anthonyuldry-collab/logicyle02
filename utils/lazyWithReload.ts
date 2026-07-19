import { ComponentType, lazy, LazyExoticComponent } from 'react';
import {
  clearChunkRecoveryLock,
  isChunkLoadError,
  recoverFromStaleDeployOnce,
} from './recoverFromStaleDeploy';

export { isChunkLoadError } from './recoverFromStaleDeploy';

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
      clearChunkRecoveryLock();
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && typeof window !== 'undefined') {
        recoverFromStaleDeployOnce();
        // Empêche React de rendre l’erreur pendant le reload.
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

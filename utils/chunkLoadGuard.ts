import {
  clearChunkRecoveryLock,
  isChunkLoadError,
  recoverFromStaleDeployOnce,
} from './recoverFromStaleDeploy';

declare const __APP_BUILD_ID__: string;

const BUILD_ID_KEY = 'logicycle:build-id';
const RECOVERED_FOR_KEY = 'logicycle:recovered-for';

/**
 * Détecte un nouveau deploy (version.json) et récupère si le shell local est obsolète.
 * À appeler au boot + au retour sur l’onglet.
 */
export async function checkAppVersionAndRecover(): Promise<void> {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return;

  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { buildId?: string };
    const remoteId = data.buildId?.trim();
    if (!remoteId) return;

    const localId = localStorage.getItem(BUILD_ID_KEY);
    const bundledId = typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : '';

    // Premier visit : mémorise sans recharger.
    if (!localId) {
      localStorage.setItem(BUILD_ID_KEY, remoteId);
      clearChunkRecoveryLock();
      return;
    }

    const deployChanged = localId !== remoteId;
    const bundleStale = Boolean(bundledId && bundledId !== remoteId);

    if (!deployChanged && !bundleStale) {
      clearChunkRecoveryLock();
      try {
        sessionStorage.removeItem(RECOVERED_FOR_KEY);
      } catch {
        // ignore
      }
      return;
    }

    // Évite une boucle si le SW / CDN sert encore un vieux shell pour ce buildId.
    try {
      if (sessionStorage.getItem(RECOVERED_FOR_KEY) === remoteId) {
        localStorage.setItem(BUILD_ID_KEY, remoteId);
        clearChunkRecoveryLock();
        return;
      }
      sessionStorage.setItem(RECOVERED_FOR_KEY, remoteId);
    } catch {
      // ignore
    }

    localStorage.setItem(BUILD_ID_KEY, remoteId);
    recoverFromStaleDeployOnce(true);
  } catch {
    // Hors ligne / version.json absent : ne pas bloquer l’app.
  }
}

/** Handlers globaux pour les imports dynamiques hors React.lazy (preload, nested, etc.). */
export function installChunkLoadRecovery(): void {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return;

  const onChunkFailure = (error: unknown) => {
    if (isChunkLoadError(error)) {
      recoverFromStaleDeployOnce();
    }
  };

  window.addEventListener('unhandledrejection', (event) => {
    onChunkFailure(event.reason);
  });

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLScriptElement &&
        typeof target.src === 'string' &&
        target.src.includes('/assets/')
      ) {
        recoverFromStaleDeployOnce();
        return;
      }
      onChunkFailure(event.error ?? event.message);
    },
    true
  );

  void checkAppVersionAndRecover();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkAppVersionAndRecover();
    }
  });
}

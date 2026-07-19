/**
 * Après un deploy Netlify, le service worker / le cache navigateur peut servir
 * un ancien index.html qui référence des chunks hashés disparus.
 */

const RECOVERY_LOCK = 'logicycle:chunk-reload';

export function isChunkLoadError(error: unknown): boolean {
  if (error == null) return false;
  const message = String(
    typeof error === 'object' && error !== null && 'message' in error
      ? (error as Error).message
      : error
  );
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as Error).name)
      : '';
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Unable to preload CSS') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    name === 'ChunkLoadError'
  );
}

export async function recoverFromStaleDeploy(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          try {
            await reg.active?.postMessage({ type: 'CLEAR_CACHES' });
          } catch {
            // ignore
          }
          await reg.unregister();
        })
      );
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best-effort : on force quand même le rechargement.
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_refresh', String(Date.now()));
  // Retire un éventuel ancien flag pour ne pas boucler après le reload réussi.
  try {
    sessionStorage.setItem(RECOVERY_LOCK, '1');
  } catch {
    // ignore
  }
  window.location.replace(url.toString());
}

/** Une seule récupération par session d’onglet, sauf forçage explicite. */
export function recoverFromStaleDeployOnce(force = false): void {
  if (typeof window === 'undefined') return;
  try {
    if (!force && sessionStorage.getItem(RECOVERY_LOCK) === '1') return;
    sessionStorage.setItem(RECOVERY_LOCK, '1');
  } catch {
    // sessionStorage indisponible : on tente quand même.
  }
  void recoverFromStaleDeploy();
}

export function clearChunkRecoveryLock(): void {
  try {
    sessionStorage.removeItem(RECOVERY_LOCK);
  } catch {
    // ignore
  }
}

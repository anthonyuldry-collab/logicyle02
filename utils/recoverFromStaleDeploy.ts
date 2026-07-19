/**
 * Après un deploy Netlify, le service worker peut servir un ancien index.html
 * qui référence des chunks hashés disparus. Un simple reload ne suffit pas.
 */
export async function recoverFromStaleDeploy(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
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
  window.location.replace(url.toString());
}

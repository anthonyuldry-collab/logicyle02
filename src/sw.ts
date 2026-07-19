/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Shell PWA uniquement (icônes). Jamais de chunks Vite ni d’index.html :
// un index précaché après deploy Netlify casse tous les lazy imports.
precacheAndRoute(self.__WB_MANIFEST);

// Toujours le réseau pour /assets/* (JS/CSS hashés).
registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/'),
  new NetworkOnly()
);

// Navigations HTML : réseau uniquement (pas de shell obsolète).
registerRoute(
  new NavigationRoute(new NetworkOnly(), {
    denylist: [/^\/assets\//, /\/api\//, /\/sw\.js$/],
  })
);

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Purge les anciennes caches qui contenaient tous les chunks hashés.
      await Promise.all(
        keys
          .filter((key) => !key.includes('precache'))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});

export {};

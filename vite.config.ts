import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const REQUIRED_FIREBASE_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const missingFirebase = REQUIRED_FIREBASE_ENV.filter((key) => !env[key]?.trim());
  if (missingFirebase.length > 0) {
    throw new Error(
      `[LogiCycle] Variables Firebase manquantes pour mode "${mode}".\n` +
        `Ajoute-les dans .env (local) ou dans les variables d’environnement Netlify/CI :\n` +
        `  ${missingFirebase.join(', ')}\n` +
        `Puis relance \`npm run dev\` ou \`npm run build\`.`
    );
  }

  return {
  resolve: {
    alias: {
      '@': '.',
      '@components': './components',
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@rollup/rollup-linux-x64-gnu'],
  },

  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      external: ['@rollup/rollup-linux-x64-gnu'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
        },
      },
      onwarn(warning, warn) {
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          warning.message.includes('@rollup/rollup-linux-x64-gnu')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },

  esbuild: {
    jsx: 'automatic',
  },

  server: {
    port: 3000,
    host: true,
  },

  preview: {
    port: 4173,
    host: true,
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // En dev, un SW actif casse les imports dynamiques Vite (.tsx).
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        minify: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: [
          '**/BarcodeScannerModal-*.js',
          '**/html2canvas*.js',
          '**/jspdf*.js',
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'LogiCycle — Logistique Équipe Cycliste',
        short_name: 'LogiCycle',
        description: 'Gestion sportive et logistique pour équipes cyclistes',
        theme_color: '#1e293b',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        lang: 'fr',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
};
});

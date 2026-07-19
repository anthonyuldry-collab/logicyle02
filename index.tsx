import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';
import { captureException, initMonitoring } from './services/monitoring';
import { installChunkLoadRecovery } from './utils/chunkLoadGuard';
import { isChunkLoadError } from './utils/lazyWithReload';
import {
  clearChunkRecoveryLock,
  recoverFromStaleDeploy,
} from './utils/recoverFromStaleDeploy';

void initMonitoring();
installChunkLoadRecovery();

const isDev = import.meta.env.DEV;

// En production uniquement : le SW PWA en local casse les imports dynamiques Vite.
if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        // Détecte plus vite un nouveau deploy pour éviter les chunks obsolètes.
        if (!registration) return;
        const check = () => {
          void registration.update();
        };
        setInterval(check, 60 * 1000);
        // Au retour sur l’onglet (cas fréquent après un deploy).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
      },
    });
  });
} else if ('serviceWorker' in navigator) {
  // Nettoie un SW résiduel (souvent après un build / preview sur la même URL).
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      void reg.unregister();
    });
  });
  if ('caches' in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => {
        void caches.delete(key);
      });
    });
  }
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error Boundary:', error, info.componentStack);
    captureException(error, { tags: { source: 'error_boundary' }, extra: { componentStack: info.componentStack } });
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 640,
          margin: '40px auto',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
        }}>
          <h1 style={{ color: '#b91c1c', marginTop: 0 }}>Erreur de l'application</h1>
          <p style={{ color: '#991b1b' }}>{this.state.error.message}</p>
          {isDev && (
            <pre style={{ overflow: 'auto', fontSize: 12, background: '#fff', padding: 12, border: '1px solid #fecaca' }}>
              {this.state.error.stack}
            </pre>
          )}
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            {isDev
              ? 'Ouvre la console du navigateur (F12) pour plus de détails.'
              : 'Rechargez la page ou contactez le support si le problème persiste.'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (isChunkLoadError(this.state.error)) {
                clearChunkRecoveryLock();
                void recoverFromStaleDeploy();
                return;
              }
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ Could not find root element to mount to");
  const newRootElement = document.createElement('div');
  newRootElement.id = 'root';
  document.body.appendChild(newRootElement);
}

const finalRootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(finalRootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);

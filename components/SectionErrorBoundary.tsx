import React from 'react';
import { isChunkLoadError } from '../utils/lazyWithReload';
import {
  clearChunkRecoveryLock,
  recoverFromStaleDeploy,
  recoverFromStaleDeployOnce,
} from '../utils/recoverFromStaleDeploy';

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  /** Libellé court pour la zone (ex. "détail de l'événement") */
  sectionName?: string;
  /** Appelé au clic sur "Réessayer" pour permettre une action (ex. naviguer ailleurs) */
  onRetry?: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ReferenceError typique d’un chunk HMR/SW obsolète après édition espace partenaire
 * (ex. « Partn is not defined » = identifiant Partner* tronqué dans un vieux bundle).
 */
function isStaleBundleReferenceError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message || '';
  if (error.name !== 'ReferenceError' && !/is not defined/i.test(message)) return false;
  return /\bPartn/i.test(message) || /\bPartner\w*\s+is not defined/i.test(message);
}

/**
 * Error boundary pour une section de l'app. En cas d'erreur, affiche un message
 * et un bouton "Réessayer" sans faire planter toute l'application.
 */
export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SectionErrorBoundary:', this.props.sectionName ?? 'Section', error, info.componentStack);
    // Une seule tentative auto de purge SW (évite une boucle si le bug est réel).
    if (isStaleBundleReferenceError(error)) {
      recoverFromStaleDeployOnce();
    }
  }

  handleRetry = () => {
    // Chunk / bundle obsolète : purger SW + caches, pas seulement re-rendre.
    if (isChunkLoadError(this.state.error) || isStaleBundleReferenceError(this.state.error)) {
      clearChunkRecoveryLock();
      void recoverFromStaleDeploy();
      return;
    }
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { sectionName = 'Cette section' } = this.props;
      const staleBundle =
        isChunkLoadError(this.state.error) || isStaleBundleReferenceError(this.state.error);
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Erreur dans {sectionName}
          </h3>
          <p className="text-sm text-red-700 mb-4 break-words">
            {staleBundle
              ? 'Une nouvelle version de l’application est disponible. Rechargez la page pour continuer.'
              : this.state.error.message}
          </p>
          {!staleBundle && (
            <p className="text-xs text-red-600/80 mb-4 font-mono break-all">
              {this.state.error.name}: {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            {staleBundle ? 'Recharger' : 'Réessayer'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

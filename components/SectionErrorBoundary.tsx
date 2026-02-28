import React from 'react';

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
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { sectionName = 'Cette section' } = this.props;
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Erreur dans {sectionName}
          </h3>
          <p className="text-sm text-red-700 mb-4">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

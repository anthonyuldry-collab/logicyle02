import { useContext } from 'react';
import { AppState } from '../types';

// Hook personnalisé pour accéder à appState de manière sécurisée
export const useAppState = (): AppState | null => {
  // Pour l'instant, nous retournons null car appState est passé via props
  // Ce hook peut être étendu plus tard pour utiliser un contexte React
  return null;
};

// Hook pour vérifier si appState est disponible
export const useAppStateSafe = (appState?: AppState): AppState | null => {
  if (!appState) {
    console.warn('⚠️ useAppStateSafe: appState is not provided');
    return null;
  }
  return appState;
};

// Fonction utilitaire pour accéder aux propriétés d'appState de manière sécurisée
export const getAppStateValue = <T>(
  appState: AppState | null | undefined,
  key: keyof AppState,
  defaultValue: T
): T => {
  if (!appState || !appState[key]) {
    console.warn(`⚠️ getAppStateValue: ${String(key)} is not available, using default value`);
    return defaultValue;
  }
  return appState[key] as T;
};

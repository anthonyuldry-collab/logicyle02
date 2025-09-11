import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  error?: string;
}

export const useLoadingState = (initialState: LoadingState = { isLoading: false }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>(initialState);

  const startLoading = useCallback((message?: string) => {
    setLoadingState({
      isLoading: true,
      loadingMessage: message,
      error: undefined
    });
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
      error: undefined
    });
  }, []);

  const setError = useCallback((error: string) => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
      error
    });
  }, []);

  const executeWithLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T | null> => {
    try {
      startLoading(loadingMessage);
      const result = await operation();
      stopLoading();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setError(errorMessage);
      console.error('Erreur lors de l\'opération:', error);
      return null;
    }
  }, [startLoading, stopLoading, setError]);

  return {
    ...loadingState,
    startLoading,
    stopLoading,
    setError,
    executeWithLoading
  };
};

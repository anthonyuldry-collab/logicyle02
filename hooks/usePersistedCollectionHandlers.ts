import React, { useCallback } from 'react';
import {
  buildCollectionRollbackPatch,
  persistCollectionDiff,
} from '../utils/persistCollectionUtils';
import type { AppState, TeamState } from '../types';

export type PersistErrorHandler = (
  error: unknown,
  collectionName: string,
) => void;

export { persistCollectionDiff };

/**
 * Handlers de collections team : persistance optimiste avec rollback,
 * et setters mémoire seule (draft local + onSave* explicite).
 */
export function usePersistedCollectionHandlers(
  setAppState: React.Dispatch<React.SetStateAction<AppState>>,
  onPersistError?: PersistErrorHandler,
) {
  const createPersistedBatchSetHandler = useCallback(
    <T extends { id?: string }>(
      collectionName: keyof TeamState,
    ): React.Dispatch<React.SetStateAction<T[]>> =>
      (updater: React.SetStateAction<T[]>) => {
        let snapshot: T[] | null = null;

        setAppState((prev: AppState) => {
          const currentItems = ((prev[collectionName] as T[]) || []) as T[];
          const newItems =
            typeof updater === 'function'
              ? (updater as (prevState: T[]) => T[])(currentItems)
              : updater;

          snapshot = currentItems;

          if (prev.activeTeamId) {
            void persistCollectionDiff(
              prev.activeTeamId,
              collectionName as string,
              currentItems,
              newItems,
            ).catch((error) => {
              if (snapshot) {
                const patch = buildCollectionRollbackPatch(
                  collectionName as string,
                  snapshot,
                );
                setAppState((latest) => ({
                  ...latest,
                  ...patch,
                }));
              }
              onPersistError?.(error, collectionName as string);
            });
          }

          return { ...prev, [collectionName]: newItems };
        });
      },
    [setAppState, onPersistError],
  );

  /**
   * Met à jour uniquement l'état React — n'écrit pas Firestore.
   * Utiliser onSave* / onDelete* ou createPersistedBatchSetHandler pour persister.
   */
  const createLocalOnlyBatchSetHandler = useCallback(
    <T,>(
      collectionName: keyof TeamState,
    ): React.Dispatch<React.SetStateAction<T[]>> =>
      (updater: React.SetStateAction<T[]>) => {
        setAppState((prev: AppState) => {
          const currentItems = (prev[collectionName] as T[]) || [];
          const newItems =
            typeof updater === 'function'
              ? (updater as (prevState: T[]) => T[])(currentItems)
              : updater;
          return { ...prev, [collectionName]: newItems };
        });
      },
    [setAppState],
  );

  return {
    createPersistedBatchSetHandler,
    createLocalOnlyBatchSetHandler,
    persistCollectionDiff,
  };
}

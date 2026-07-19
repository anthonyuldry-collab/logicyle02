import * as firebaseService from '../services/firebaseService';
import {
  applyCollectionDiffOps,
  buildCollectionDiffOps,
} from './collectionDiffUtils';

/**
 * Persiste le diff d'une collection team vers Firestore.
 * Propage l'erreur pour permettre un rollback côté caller.
 */
export async function persistCollectionDiff<T extends { id?: string }>(
  teamId: string,
  collectionName: string,
  oldItems: T[],
  newItems: T[],
): Promise<void> {
  const ops = buildCollectionDiffOps(oldItems, newItems);
  await applyCollectionDiffOps(ops, {
    save: (item) => firebaseService.saveData(teamId, collectionName, item),
    remove: (id) => firebaseService.deleteData(teamId, collectionName, id),
  });
}

/**
 * Construit un patch d'état pour rollback après échec de persistance.
 */
export function buildCollectionRollbackPatch<T>(
  collectionName: string,
  snapshot: T[],
): Record<string, T[]> {
  return { [collectionName]: snapshot };
}

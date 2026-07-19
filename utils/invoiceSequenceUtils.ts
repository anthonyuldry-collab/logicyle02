/**
 * Résout le prochain numéro de séquence document (facture / devis).
 * Partagé entre la transaction Firestore et les tests unitaires.
 */
export function resolveDocumentSequence(current: unknown): number {
  if (typeof current === 'number' && Number.isFinite(current) && current >= 1) {
    return Math.floor(current);
  }
  return 1;
}

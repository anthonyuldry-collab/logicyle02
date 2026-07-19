/**
 * Égalité structurelle rapide (early-exit) — évite JSON.stringify × 2
 * sur chaque élément lors des syncs Firebase à fort volume.
 */
export function isDeepEqualFast(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqualFast(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = Object.keys(aObj);
  if (keys.length !== Object.keys(bObj).length) return false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!isDeepEqualFast(aObj[key], bObj[key])) return false;
  }
  return true;
}

export type CollectionDiffOp<T extends { id?: string }> =
  | { type: 'save'; item: T }
  | { type: 'delete'; id: string };

/**
 * Calcule les opérations save/delete entre deux snapshots de collection.
 * Les éléments sans `id` côté new sont traités comme à sauvegarder (création).
 */
export function buildCollectionDiffOps<T extends { id?: string }>(
  oldItems: T[],
  newItems: T[],
): CollectionDiffOp<T>[] {
  const oldMap = new Map(
    oldItems.filter((item) => item.id).map((item) => [item.id!, item]),
  );
  const newMap = new Map(
    newItems.filter((item) => item.id).map((item) => [item.id!, item]),
  );

  const ops: CollectionDiffOp<T>[] = [];

  for (const item of newItems) {
    const oldItem = item.id ? oldMap.get(item.id) : undefined;
    if (!oldItem || !isDeepEqualFast(oldItem, item)) {
      ops.push({ type: 'save', item });
    }
  }

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      ops.push({ type: 'delete', id });
    }
  }

  return ops;
}

export async function applyCollectionDiffOps<T extends { id?: string }>(
  ops: CollectionDiffOp<T>[],
  handlers: {
    save: (item: T) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
  },
): Promise<void> {
  if (ops.length === 0) return;
  await Promise.all(
    ops.map((op) =>
      op.type === 'save' ? handlers.save(op.item) : handlers.remove(op.id),
    ),
  );
}

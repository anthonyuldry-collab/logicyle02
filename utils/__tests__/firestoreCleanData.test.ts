import { describe, expect, it } from 'vitest';

/**
 * Miroir de cleanDataForFirebase (services/firebaseService.ts) —
 * garantit que les payloads de mise à jour n’envoient jamais undefined à Firestore.
 */
const cleanDataForFirebase = (data: unknown): unknown => {
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.filter((item) => item !== undefined).map((item) => cleanDataForFirebase(item));
  }
  if ((data as object).constructor !== Object) return data;
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(data as Record<string, unknown>)) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      cleaned[key] = cleanDataForFirebase(value);
    }
  }
  return cleaned;
};

describe('cleanDataForFirebase (mises à jour Firestore)', () => {
  it('retire les undefined racine et imbriqués', () => {
    expect(
      cleanDataForFirebase({
        a: 1,
        b: undefined,
        nested: { ok: true, skip: undefined },
        list: [1, undefined, { x: undefined, y: 2 }],
      }),
    ).toEqual({
      a: 1,
      nested: { ok: true },
      list: [1, { y: 2 }],
    });
  });

  it('laisse un objet vide si tout était undefined (évite updateDoc invalide via guard amont)', () => {
    expect(cleanDataForFirebase({ a: undefined, b: undefined })).toEqual({});
  });
});

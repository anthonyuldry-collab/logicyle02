import { describe, it, expect, vi } from 'vitest';
import {
  isDeepEqualFast,
  buildCollectionDiffOps,
  applyCollectionDiffOps,
} from '../collectionDiffUtils';
import { buildCollectionRollbackPatch } from '../persistCollectionUtils';

describe('isDeepEqualFast', () => {
  it('returns true for identical references', () => {
    const obj = { a: 1 };
    expect(isDeepEqualFast(obj, obj)).toBe(true);
  });

  it('compares primitives and nested structures', () => {
    expect(isDeepEqualFast(1, 1)).toBe(true);
    expect(isDeepEqualFast(1, 2)).toBe(false);
    expect(isDeepEqualFast({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } })).toBe(true);
    expect(isDeepEqualFast({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 3] } })).toBe(false);
  });

  it('early-exits on length mismatch', () => {
    expect(isDeepEqualFast([1, 2], [1, 2, 3])).toBe(false);
    expect(isDeepEqualFast({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});

describe('buildCollectionDiffOps', () => {
  it('detects adds, updates and deletes', () => {
    const oldItems = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const newItems = [
      { id: 'a', name: 'A-updated' },
      { id: 'c', name: 'C' },
    ];
    const ops = buildCollectionDiffOps(oldItems, newItems);
    expect(ops).toEqual([
      { type: 'save', item: { id: 'a', name: 'A-updated' } },
      { type: 'save', item: { id: 'c', name: 'C' } },
      { type: 'delete', id: 'b' },
    ]);
  });

  it('skips unchanged items', () => {
    const items = [{ id: 'a', name: 'A' }];
    expect(buildCollectionDiffOps(items, items)).toEqual([]);
  });
});

describe('applyCollectionDiffOps', () => {
  it('runs save and delete handlers', async () => {
    const save = vi.fn(async () => undefined);
    const remove = vi.fn(async () => undefined);
    await applyCollectionDiffOps(
      [
        { type: 'save', item: { id: '1' } },
        { type: 'delete', id: '2' },
      ],
      { save, remove },
    );
    expect(save).toHaveBeenCalledWith({ id: '1' });
    expect(remove).toHaveBeenCalledWith('2');
  });

  it('propagates handler failures for rollback callers', async () => {
    const save = vi.fn(async () => {
      throw new Error('firestore denied');
    });
    await expect(
      applyCollectionDiffOps([{ type: 'save', item: { id: '1' } }], {
        save,
        remove: vi.fn(),
      }),
    ).rejects.toThrow('firestore denied');
  });
});

describe('buildCollectionRollbackPatch', () => {
  it('restores the snapshot for a collection key', () => {
    const snapshot = [{ id: 'old' }];
    expect(buildCollectionRollbackPatch('stockItems', snapshot)).toEqual({
      stockItems: snapshot,
    });
  });
});

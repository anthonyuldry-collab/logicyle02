import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveData = vi.fn();
const deleteData = vi.fn();

vi.mock('../../services/firebaseService', () => ({
  saveData: (...args: unknown[]) => saveData(...args),
  deleteData: (...args: unknown[]) => deleteData(...args),
}));

describe('persistCollectionDiff', () => {
  beforeEach(() => {
    saveData.mockReset();
    deleteData.mockReset();
    saveData.mockResolvedValue('id');
    deleteData.mockResolvedValue(undefined);
  });

  it('persists only changed items and deletes removed ones', async () => {
    const { persistCollectionDiff } = await import('../persistCollectionUtils');
    await persistCollectionDiff(
      'team-1',
      'stockItems',
      [{ id: 'a', qty: 1 }, { id: 'b', qty: 2 }],
      [{ id: 'a', qty: 3 }],
    );
    expect(saveData).toHaveBeenCalledWith('team-1', 'stockItems', { id: 'a', qty: 3 });
    expect(deleteData).toHaveBeenCalledWith('team-1', 'stockItems', 'b');
  });

  it('propagates errors so callers can rollback', async () => {
    saveData.mockRejectedValueOnce(new Error('network'));
    const { persistCollectionDiff } = await import('../persistCollectionUtils');
    await expect(
      persistCollectionDiff('team-1', 'missions', [], [{ id: 'm1', title: 'X' }]),
    ).rejects.toThrow('network');
  });
});

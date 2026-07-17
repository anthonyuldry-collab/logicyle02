import { describe, expect, it, vi, beforeEach } from 'vitest';

const postCallableWeb = vi.fn();
const postCallableNative = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  CapacitorHttp: { post: (...args: unknown[]) => postCallableNative(...args) },
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => postCallableWeb),
}));

vi.mock('../../firebaseConfig', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('token') } },
  app: {},
}));

import { recordDriverGpsPositionSecure } from '../../services/driverGpsCloudService';

const payload = {
  teamId: 'team-1',
  staffId: 'staff_driver',
  vehicleIds: ['veh-1'],
  latitude: 48.85,
  longitude: 2.35,
};

describe('recordDriverGpsPositionSecure', () => {
  beforeEach(() => {
    postCallableWeb.mockReset();
    postCallableNative.mockReset();
  });

  it('appelle la Cloud Function web en succès', async () => {
    postCallableWeb.mockResolvedValue({ data: { ok: true } });
    await recordDriverGpsPositionSecure(payload);
    expect(postCallableWeb).toHaveBeenCalledWith(payload);
  });

  it('accepte un lot vehicleAssignments (1 appel, plusieurs véhicules)', async () => {
    postCallableWeb.mockResolvedValue({ data: { ok: true } });
    await recordDriverGpsPositionSecure({
      ...payload,
      vehicleIds: ['veh-1', 'veh-2'],
      vehicleAssignments: [
        { vehicleId: 'veh-1', eventId: 'ev-1', transportLegId: 'leg-1' },
        { vehicleId: 'veh-2', eventId: 'ev-2' },
      ],
    });
    expect(postCallableWeb).toHaveBeenCalledTimes(1);
    expect(postCallableWeb.mock.calls[0][0].vehicleAssignments).toHaveLength(2);
  });

  it('propage l\'erreur sans repli Firestore client', async () => {
    postCallableWeb.mockRejectedValue(new Error('permission-denied'));
    await expect(recordDriverGpsPositionSecure(payload)).rejects.toThrow('permission-denied');
  });
});

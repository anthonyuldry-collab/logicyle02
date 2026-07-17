import { StaffMember } from '../types';

function normalizeEmail(email?: string): string {
  return email?.trim().toLowerCase() || '';
}

/** Vérifie qu'un document staff appartient à l'utilisateur authentifié. */
export function staffMemberMatchesAuthUser(
  staff: Pick<StaffMember, 'id' | 'email'> & { userId?: string },
  authUid: string,
  authEmail?: string,
): boolean {
  if (staff.id === authUid) return true;
  if (staff.userId === authUid) return true;
  const normalizedAuth = normalizeEmail(authEmail);
  const normalizedStaff = normalizeEmail(staff.email);
  return Boolean(normalizedAuth && normalizedStaff && normalizedAuth === normalizedStaff);
}

/**
 * Résout l'id Firestore staff autorisé pour le GPS chauffeur.
 * Accepte staffId = doc staff (staff_*) ou uid auth si la fiche est liée par e-mail / userId.
 */
export function resolveAuthorizedDriverStaffId(
  requestedStaffId: string,
  staffMembers: StaffMember[],
  authUid: string,
  authEmail?: string,
): string | null {
  const candidates = staffMembers.filter(
    (s) =>
      s.id === requestedStaffId
      || s.id === authUid
      || s.userId === authUid
      || (authEmail && normalizeEmail(s.email) === normalizeEmail(authEmail)),
  );

  for (const staff of candidates) {
    if (!staffMemberMatchesAuthUser(staff, authUid, authEmail)) continue;
    if (staff.id === requestedStaffId || requestedStaffId === authUid) {
      return staff.id;
    }
  }

  const byRequest = staffMembers.find((s) => s.id === requestedStaffId);
  if (byRequest && staffMemberMatchesAuthUser(byRequest, authUid, authEmail)) {
    return byRequest.id;
  }

  return null;
}

/** Vérifie que le chauffeur est assigné au véhicule (driverId ou leg du jour). */
export function isDriverAssignedToVehicle(params: {
  vehicleDriverId?: string;
  staffDocId: string;
  transportLegs: Array<{ driverId?: string; assignedVehicleId?: string; departureDate?: string }>;
  vehicleId: string;
  todayIso?: string;
}): boolean {
  const { vehicleDriverId, staffDocId, transportLegs, vehicleId } = params;
  const today = params.todayIso ?? new Date().toISOString().slice(0, 10);

  if (vehicleDriverId === staffDocId) return true;

  return transportLegs.some((leg) => {
    if (leg.driverId !== staffDocId) return false;
    if (leg.assignedVehicleId !== vehicleId) return false;
    const dep = leg.departureDate ? String(leg.departureDate).slice(0, 10) : '';
    return dep === today;
  });
}

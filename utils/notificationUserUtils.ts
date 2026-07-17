import { Rider, StaffMember, User } from '../types';

export function resolveUserIdForRider(rider: Rider, users: User[]): string | null {
  if (users.some(u => u.id === rider.id)) return rider.id;
  if (rider.email) {
    const match = users.find(u => u.email?.toLowerCase() === rider.email?.toLowerCase());
    if (match) return match.id;
  }
  return null;
}

export function resolveUserIdForStaff(staff: StaffMember, users: User[]): string | null {
  if (users.some(u => u.id === staff.id)) return staff.id;
  const match = users.find(u => u.email?.toLowerCase() === staff.email?.toLowerCase());
  return match?.id ?? null;
}

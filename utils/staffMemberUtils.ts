import { StaffMember, User, UserRole } from '../types';
import { isIndependentUser, userToStaffProfile } from './independentUtils';

function normalizeEmail(email?: string): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Retrouve le membre staff correspondant à l'utilisateur connecté (ou à l'aperçu super-admin).
 */
export function getStaffMemberForUser(
  user: User | null | undefined,
  staff: StaffMember[],
): StaffMember | undefined {
  if (!user || staff.length === 0) return undefined;

  if (user.previewSubjectKind === 'staff' && user.previewSubjectId) {
    const preview = staff.find(s => s.id === user.previewSubjectId);
    if (preview) return preview;
  }

  if (isIndependentUser(user) && user.userRole === UserRole.STAFF) {
    return userToStaffProfile(user);
  }

  if (user.id) {
    const byId = staff.find(s => s.id === user.id || s.userId === user.id);
    if (byId) return byId;
  }

  const userEmail = normalizeEmail(user.email);
  if (userEmail) {
    return staff.find(s => normalizeEmail(s.email) === userEmail);
  }

  return undefined;
}

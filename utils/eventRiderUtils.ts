import { Rider, User, RiderEventSelection, RiderEventStatus, RiderEventPreference } from '../types';

function normalizeEmail(email?: string): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

function normalizeNamePart(value?: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Retrouve la fiche coureur liée à l'utilisateur (aperçu, id, email, puis nom).
 */
export function getRiderProfileForUser(riders: Rider[], user: User): Rider | undefined {
  if (!user || riders.length === 0) return undefined;

  if (user.previewSubjectKind === 'rider' && user.previewSubjectId) {
    const preview = riders.find((r) => r.id === user.previewSubjectId);
    if (preview) return preview;
  }

  if (user.id) {
    const byId = riders.find((r) => r.id === user.id);
    if (byId) return byId;
  }

  const email = normalizeEmail(user.email);
  if (email) {
    const byEmail = riders.find((r) => normalizeEmail(r.email) === email);
    if (byEmail) return byEmail;
  }

  const first = normalizeNamePart(user.firstName);
  const last = normalizeNamePart(user.lastName);
  if (first && last) {
    const byName = riders.filter(
      (r) =>
        normalizeNamePart(r.firstName) === first && normalizeNamePart(r.lastName) === last,
    );
    if (byName.length === 1) return byName[0];
  }

  return undefined;
}

export function isRiderAbsentFromEvent(
  riderId: string,
  eventId: string,
  riderEventSelections: RiderEventSelection[]
): boolean {
  const selection = riderEventSelections.find(
    (s) => s.eventId === eventId && s.riderId === riderId
  );
  if (!selection) return false;
  return (
    selection.status === RiderEventStatus.ABSENT ||
    selection.riderPreference === RiderEventPreference.ABSENT
  );
}

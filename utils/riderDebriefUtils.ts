import { PeerRating, RaceEvent, RiderSelfDebrief } from '../types';

export function isEventEndedForDebrief(event: RaceEvent, now = new Date()): boolean {
  const end = new Date((event.endDate || event.date) + 'T23:59:59');
  return now >= end;
}

export function isEventDebriefWindowOpen(event: RaceEvent, now = new Date()): boolean {
  const start = new Date(event.date + 'T00:00:00');
  const end = new Date((event.endDate || event.date) + 'T23:59:59');
  const debriefDeadline = new Date(end);
  debriefDeadline.setDate(debriefDeadline.getDate() + 14);
  return now >= start && now <= debriefDeadline;
}

export function getRiderSelfDebriefForEvent(
  debriefs: RiderSelfDebrief[],
  eventId: string,
  riderId: string,
): RiderSelfDebrief | undefined {
  return debriefs.find((d) => d.eventId === eventId && d.riderId === riderId);
}

export function buildRiderSelfDebriefId(eventId: string, riderId: string): string {
  return `rsd-${eventId}-${riderId}`;
}

export function isSelfDebriefComplete(debrief?: RiderSelfDebrief): boolean {
  if (!debrief?.submittedAt) return false;
  return Boolean(
    debrief.selfSummary?.trim()
    || debrief.selfHighlights?.trim()
    || debrief.selfImprovements?.trim()
    || debrief.personalRanking?.trim(),
  );
}

export function countTeammatesRated(
  peerRatings: PeerRating[],
  eventId: string,
  raterRiderId: string,
  teammateIds: string[],
): number {
  const rated = new Set(
    peerRatings
      .filter(
        (r) =>
          r.eventId === eventId
          && r.raterRiderId === raterRiderId
          && teammateIds.includes(r.ratedRiderId)
          && r.rating != null
          && r.rating >= 1,
      )
      .map((r) => r.ratedRiderId),
  );
  return rated.size;
}

export function filterPeerRatingsForCoureur(
  ratings: PeerRating[],
  ownRiderId?: string,
  ownUserId?: string,
): PeerRating[] {
  if (!ownRiderId && !ownUserId) return [];
  return ratings.filter(
    (r) =>
      r.raterRiderId === ownRiderId
      || (ownUserId && r.raterUserId === ownUserId),
  );
}

export function filterRiderSelfDebriefsForCoureur(
  debriefs: RiderSelfDebrief[],
  ownRiderId?: string,
  ownUserId?: string,
): RiderSelfDebrief[] {
  if (!ownRiderId && !ownUserId) return [];
  return debriefs.filter(
    (d) => d.riderId === ownRiderId || (ownUserId && d.userId === ownUserId),
  );
}

export function listEventsPendingRiderDebrief(params: {
  events: RaceEvent[];
  riderId: string;
  debriefs: RiderSelfDebrief[];
  now?: Date;
}): RaceEvent[] {
  const { events, riderId, debriefs, now = new Date() } = params;
  return events
    .filter(
      (e) =>
        e.selectedRiderIds?.includes(riderId)
        && isEventDebriefWindowOpen(e, now)
        && !isSelfDebriefComplete(getRiderSelfDebriefForEvent(debriefs, e.id, riderId)),
    )
    .sort(
      (a, b) =>
        new Date(b.endDate || b.date).getTime() - new Date(a.endDate || a.date).getTime(),
    );
}

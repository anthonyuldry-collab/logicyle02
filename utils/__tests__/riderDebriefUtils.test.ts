import { describe, expect, it } from 'vitest';
import {
  buildRiderSelfDebriefId,
  filterPeerRatingsForCoureur,
  filterRiderSelfDebriefsForCoureur,
  getRiderSelfDebriefForEvent,
  isEventDebriefWindowOpen,
  isSelfDebriefComplete,
  listEventsPendingRiderDebrief,
} from '../riderDebriefUtils';
import type { PeerRating, RaceEvent, RiderSelfDebrief } from '../../types';

const event = {
  id: 'evt-1',
  name: 'Tour test',
  date: '2026-07-01',
  endDate: '2026-07-01',
  location: 'Paris',
  selectedRiderIds: ['rider-a', 'rider-b'],
} as RaceEvent;

describe('riderDebriefUtils', () => {
  it('ouvre la fenêtre de débriefing pendant 14 jours après la course', () => {
    expect(isEventDebriefWindowOpen(event, new Date('2026-06-30T12:00:00'))).toBe(false);
    expect(isEventDebriefWindowOpen(event, new Date('2026-07-02T12:00:00'))).toBe(true);
    expect(isEventDebriefWindowOpen(event, new Date('2026-07-15T12:00:00'))).toBe(true);
    expect(isEventDebriefWindowOpen(event, new Date('2026-07-15T23:59:59'))).toBe(true);
    expect(isEventDebriefWindowOpen(event, new Date('2026-07-16T00:00:01'))).toBe(false);
  });

  it('détecte un débriefing personnel complet', () => {
    expect(isSelfDebriefComplete(undefined)).toBe(false);
    expect(
      isSelfDebriefComplete({ id: '1', eventId: 'e', riderId: 'r', userId: 'u', submittedAt: '2026-07-02' }),
    ).toBe(false);
    expect(
      isSelfDebriefComplete({
        id: '1',
        eventId: 'e',
        riderId: 'r',
        userId: 'u',
        submittedAt: '2026-07-02',
        selfSummary: 'Bonne course',
      }),
    ).toBe(true);
  });

  it('filtre les peer ratings pour ne garder que ceux du coureur', () => {
    const ratings: PeerRating[] = [
      { id: '1', eventId: 'evt-1', raterRiderId: 'rider-a', raterUserId: 'user-a', ratedRiderId: 'rider-b', rating: 8 },
      { id: '2', eventId: 'evt-1', raterRiderId: 'rider-b', raterUserId: 'user-b', ratedRiderId: 'rider-a', rating: 7 },
    ];
    expect(filterPeerRatingsForCoureur(ratings, 'rider-a', 'user-a')).toHaveLength(1);
    expect(filterPeerRatingsForCoureur(ratings, 'rider-a', 'user-a')[0].id).toBe('1');
  });

  it('filtre les débriefings perso pour le coureur connecté', () => {
    const debriefs: RiderSelfDebrief[] = [
      { id: 'd1', eventId: 'evt-1', riderId: 'rider-a', userId: 'user-a', selfSummary: 'ok' },
      { id: 'd2', eventId: 'evt-1', riderId: 'rider-b', userId: 'user-b', selfSummary: 'top' },
    ];
    expect(filterRiderSelfDebriefsForCoureur(debriefs, 'rider-a', 'user-a')).toHaveLength(1);
    expect(filterRiderSelfDebriefsForCoureur(debriefs, 'rider-a', 'user-a')[0].id).toBe('d1');
  });

  it('liste les événements en attente de débriefing', () => {
    const debriefs: RiderSelfDebrief[] = [
      {
        id: buildRiderSelfDebriefId('evt-1', 'rider-a'),
        eventId: 'evt-1',
        riderId: 'rider-a',
        userId: 'user-a',
        submittedAt: '2026-07-02',
        selfSummary: 'Done',
      },
    ];
    const pending = listEventsPendingRiderDebrief({
      events: [event],
      riderId: 'rider-b',
      debriefs: [],
      now: new Date('2026-07-05T12:00:00'),
    });
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('evt-1');

    const nonePending = listEventsPendingRiderDebrief({
      events: [event],
      riderId: 'rider-a',
      debriefs,
      now: new Date('2026-07-05T12:00:00'),
    });
    expect(nonePending).toHaveLength(0);
  });

  it('retrouve le débriefing par événement et coureur', () => {
    const debriefs: RiderSelfDebrief[] = [
      { id: 'd1', eventId: 'evt-1', riderId: 'rider-a', userId: 'user-a' },
    ];
    expect(getRiderSelfDebriefForEvent(debriefs, 'evt-1', 'rider-a')?.id).toBe('d1');
    expect(getRiderSelfDebriefForEvent(debriefs, 'evt-1', 'rider-b')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { EventType, OrganizerContact } from '../../types';
import {
  buildProjectionEntriesForYear,
  formatProjectionDateRange,
  getTheoreticalEventEndDate,
  inferStageCountFromEvent,
  isOrganizerContactStageRace,
} from '../organizerContactUtils';

describe('organizerContactUtils stage race projection', () => {
  const stageContact: OrganizerContact = {
    id: 'stage-1',
    eventName: 'Tour du Limousin',
    contactEmail: 'test@example.com',
    lastEventDate: '2025-05-15',
    lastEventEndDate: '2025-05-17',
    typicalMonth: 5,
    typicalDay: 15,
    typicalEndMonth: 5,
    typicalEndDay: 17,
    stageCount: 3,
    eventType: EventType.STAGE,
    participationYears: [2025],
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  it('detects stage races from contact fields', () => {
    expect(isOrganizerContactStageRace(stageContact)).toBe(true);
    expect(
      isOrganizerContactStageRace({
        ...stageContact,
        stageCount: undefined,
        eventType: undefined,
        lastEventEndDate: undefined,
        typicalEndMonth: undefined,
      })
    ).toBe(false);
  });

  it('projects end date and stage count for target year', () => {
    expect(getTheoreticalEventEndDate(stageContact, 2026)).toBe('2026-05-17');

    const entries = buildProjectionEntriesForYear([stageContact], 2026);
    expect(entries).toHaveLength(1);
    expect(entries[0].theoreticalDate).toBe('2026-05-15');
    expect(entries[0].theoreticalEndDate).toBe('2026-05-17');
    expect(entries[0].stageCount).toBe(3);
    expect(entries[0].isStageRace).toBe(true);
  });

  it('formats projection date range in French', () => {
    expect(formatProjectionDateRange('2026-05-15', '2026-05-17')).toContain('Du');
    expect(formatProjectionDateRange('2026-05-15', '2026-05-17')).toContain('au');
    expect(formatProjectionDateRange('2026-05-15', null)).not.toContain('au');
  });

  it('infers stage count from race event', () => {
    expect(
      inferStageCountFromEvent({
        id: 'ev-1',
        name: 'Stage race',
        date: '2026-04-05',
        endDate: '2026-04-10',
        eventType: EventType.STAGE,
        raceInfo: { stageDays: [{}, {}, {}, {}, {}, {}] },
      } as Parameters<typeof inferStageCountFromEvent>[0])
    ).toBe(6);
  });
});

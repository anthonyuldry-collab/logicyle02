import { describe, expect, it } from 'vitest';
import {
  MissionCompensationType,
  MissionStatus,
  StaffRole,
  type Mission,
} from '../../types';
import {
  createMissionFromEvent,
  getOpenMissionsForEvent,
} from '../missionFromEventUtils';

const event = {
  id: 'evt_1',
  name: 'GP Ouest',
  date: '2026-08-28',
  endDate: '2026-08-30',
  location: 'Lorient',
};

describe('missionFromEventUtils', () => {
  it('crée une offre OPEN liée à l’événement avec le poste recherché', () => {
    const mission = createMissionFromEvent({
      event,
      teamId: 'team_a',
      role: StaffRole.MECANO,
      dailyRate: 180,
      id: 'mission_test',
    });

    expect(mission).toMatchObject({
      id: 'mission_test',
      teamId: 'team_a',
      title: 'Mécanicien — GP Ouest',
      role: StaffRole.MECANO,
      startDate: '2026-08-28',
      endDate: '2026-08-30',
      location: 'Lorient',
      eventId: 'evt_1',
      status: MissionStatus.OPEN,
      compensationType: MissionCompensationType.FREELANCE,
      compensation: '180 € / jour',
      dailyRate: 180,
    });
    expect(mission.requirements).toContain('Poste recherché : Mécanicien');
    expect(mission.applications).toEqual([]);
  });

  it('utilise endDate = date si endDate absent, et compensation à négocier sans tarif', () => {
    const mission = createMissionFromEvent({
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
      },
      teamId: 'team_a',
      role: StaffRole.ASSISTANT,
      id: 'mission_no_rate',
    });
    expect(mission.endDate).toBe('2026-08-28');
    expect(mission.compensation).toBe('À négocier');
    expect(mission.dailyRate).toBeUndefined();
  });

  it('filtre les offres ouvertes pour un événement', () => {
    const open: Mission = createMissionFromEvent({
      event,
      teamId: 'team_a',
      role: StaffRole.DS,
      id: 'open1',
    });
    const closed: Mission = { ...open, id: 'closed1', status: MissionStatus.CLOSED };
    const otherEvent: Mission = { ...open, id: 'other', eventId: 'evt_2' };
    expect(getOpenMissionsForEvent([open, closed, otherEvent], 'evt_1')).toEqual([open]);
  });
});

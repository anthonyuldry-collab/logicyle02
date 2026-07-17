import { describe, expect, it } from 'vitest';
import {
  MissionApplicationStatus,
  MissionCompensationType,
  MissionStatus,
  StaffRole,
  type Mission,
} from '../../types';
import {
  formatMissionDateRange,
  getAcceptedMissionsForUser,
  isUserAcceptedOnMission,
  missionsToCalendarItems,
} from '../missionCalendarUtils';

const baseMission = (overrides: Partial<Mission> = {}): Mission => ({
  id: 'm1',
  teamId: 'team_a',
  title: 'Assistant week-end',
  role: StaffRole.ASSISTANT,
  startDate: '2026-08-28',
  endDate: '2026-08-30',
  location: 'Lorient',
  description: 'Mission week-end',
  requirements: [],
  compensationType: MissionCompensationType.FREELANCE,
  compensation: '150 € / jour',
  status: MissionStatus.FILLED,
  applications: [
    {
      id: 'app1',
      userId: 'user_staff',
      firstName: 'Alex',
      lastName: 'Staff',
      email: 'alex@test.fr',
      appliedAt: '2026-07-01T10:00:00.000Z',
      status: MissionApplicationStatus.ACCEPTED,
    },
  ],
  ...overrides,
});

describe('missionCalendarUtils', () => {
  it('détecte une candidature acceptée', () => {
    expect(isUserAcceptedOnMission(baseMission(), 'user_staff')).toBe(true);
    expect(isUserAcceptedOnMission(baseMission(), 'other')).toBe(false);
  });

  it('liste les missions acceptées pour le calendrier', () => {
    const items = missionsToCalendarItems(
      [baseMission(), baseMission({ id: 'm2', applications: [] })],
      'user_staff',
      { teams: [{ id: 'team_a', name: 'Horizon', country: 'FR', level: 'Elite' as never }] },
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Assistant week-end');
    expect(items[0].startDate).toBe('2026-08-28');
    expect(items[0].endDate).toBe('2026-08-30');
    expect(items[0].teamName).toBe('Horizon');
  });

  it('accepte le legacy applicants + FILLED', () => {
    const mission = baseMission({
      applications: [],
      applicants: ['legacy_user'],
      status: MissionStatus.FILLED,
    });
    expect(getAcceptedMissionsForUser([mission], 'legacy_user')).toHaveLength(1);
  });

  it('formate une plage week-end', () => {
    expect(formatMissionDateRange('2026-08-28', '2026-08-30')).toMatch(/28/);
    expect(formatMissionDateRange('2026-08-28', '2026-08-30')).toMatch(/30/);
  });
});

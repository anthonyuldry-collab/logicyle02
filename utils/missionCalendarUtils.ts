import {
  Mission,
  MissionApplicationStatus,
  MissionStatus,
  RaceEvent,
  Team,
} from '../types';
import { getMissionApplications } from '../constants/demoMissions';

export interface MissionCalendarItem {
  id: string;
  missionId: string;
  title: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  teamId: string;
  teamName: string;
  compensation: string;
  status: MissionStatus;
  /** Course équipe liée, si l’offre a été rattachée à un événement */
  eventId?: string;
  eventName?: string;
  applicationStatus: MissionApplicationStatus;
}

/** Candidature acceptée pour cet utilisateur (applications[] ou legacy applicants + FILLED). */
export function getUserAcceptedApplication(mission: Mission, userId: string) {
  const apps = getMissionApplications(mission);
  const accepted = apps.find(
    (a) => a.userId === userId && a.status === MissionApplicationStatus.ACCEPTED,
  );
  if (accepted) return accepted;
  // Legacy : pourvu + user dans applicants sans statut riche
  if (
    mission.status === MissionStatus.FILLED &&
    (mission.applicants || []).includes(userId) &&
    apps.length === 0
  ) {
    return {
      id: `legacy_${userId}`,
      userId,
      firstName: '',
      lastName: '',
      email: '',
      appliedAt: '',
      status: MissionApplicationStatus.ACCEPTED,
    };
  }
  return undefined;
}

export function isUserAcceptedOnMission(mission: Mission, userId: string): boolean {
  return !!getUserAcceptedApplication(mission, userId);
}

export function getAcceptedMissionsForUser(
  missions: Mission[],
  userId: string,
): Mission[] {
  return (missions || []).filter((m) => isUserAcceptedOnMission(m, userId));
}

export function missionsToCalendarItems(
  missions: Mission[],
  userId: string,
  options?: {
    teams?: Team[];
    raceEvents?: RaceEvent[];
    teamNameResolver?: (teamId: string) => string | undefined;
  },
): MissionCalendarItem[] {
  const teams = options?.teams || [];
  const raceEvents = options?.raceEvents || [];
  const resolveTeamName = (teamId: string) =>
    options?.teamNameResolver?.(teamId) ||
    teams.find((t) => t.id === teamId)?.name ||
    teamId;

  return getAcceptedMissionsForUser(missions, userId)
    .map((mission) => {
      const app = getUserAcceptedApplication(mission, userId)!;
      const linkedEvent = mission.eventId
        ? raceEvents.find((e) => e.id === mission.eventId)
        : undefined;
      return {
        id: `mission_cal_${mission.id}`,
        missionId: mission.id,
        title: mission.title,
        role: String(mission.role),
        startDate: mission.startDate,
        endDate: mission.endDate || mission.startDate,
        location: mission.location,
        teamId: mission.teamId,
        teamName: resolveTeamName(mission.teamId),
        compensation: mission.compensation,
        status: mission.status,
        eventId: mission.eventId || linkedEvent?.id,
        eventName: linkedEvent?.name,
        applicationStatus: app.status,
      };
    })
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
}

/** Libellé plage week-end / mission (ex. 28–30 août 2026). */
export function formatMissionDateRange(startDate: string, endDate: string, locale = 'fr-FR'): string {
  const start = new Date(startDate + 'T12:00:00Z');
  const end = new Date((endDate || startDate) + 'T12:00:00Z');
  if (Number.isNaN(start.getTime())) return startDate;
  if (Number.isNaN(end.getTime()) || startDate === endDate) {
    return start.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    return `${start.getUTCDate()}–${end.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`;
  }
  return `${start.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })} → ${end.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

export function isMissionUpcoming(item: MissionCalendarItem, todayIso?: string): boolean {
  const today = todayIso || new Date().toISOString().slice(0, 10);
  return (item.endDate || item.startDate) >= today;
}

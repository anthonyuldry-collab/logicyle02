import {
  Mission,
  MissionCompensationType,
  MissionStatus,
  RaceEvent,
  StaffRole,
} from '../types';
import { getStaffRoleDisplayLabel } from './staffRoleUtils';

export type MissionFromEventInput = {
  event: Pick<RaceEvent, 'id' | 'name' | 'date' | 'location'> & { endDate?: string };
  teamId: string;
  role: StaffRole;
  dailyRate?: number;
  description?: string;
  /** Pour tests / ids stables ; sinon généré à la création */
  id?: string;
};

/** Rôles typiquement ouverts aux vacataires depuis un événement. */
export const VACATAIRE_MISSION_ROLES: StaffRole[] = [
  StaffRole.DS,
  StaffRole.ASSISTANT,
  StaffRole.MECANO,
  StaffRole.KINE,
  StaffRole.MEDECIN,
  StaffRole.COMMUNICATION,
  StaffRole.ENTRAINEUR,
  StaffRole.RESP_PERF,
  StaffRole.PREPA_PHYSIQUE,
  StaffRole.DATA_ANALYST,
  StaffRole.MANAGER,
  StaffRole.AUTRE,
];

/**
 * Crée une offre d'emploi vacataire liée à un événement équipe.
 * Une fois acceptée (eventId), le vacataire entre au planning et le budget auto se calcule.
 */
export function createMissionFromEvent(input: MissionFromEventInput): Mission {
  const { event, teamId, role, dailyRate, description, id } = input;
  const roleLabel = getStaffRoleDisplayLabel(role);
  const eventName = event.name?.trim() || 'Événement';
  const startDate = event.date || '';
  const endDate = event.endDate || event.date || '';

  return {
    id: id ?? `mission_${Date.now().toString(36)}`,
    teamId,
    title: `${roleLabel} — ${eventName}`,
    role,
    startDate,
    endDate,
    location: event.location?.trim() || '',
    description:
      description?.trim() ||
      `Mission vacataire ${roleLabel} pour ${eventName}. Dates et lieu alignés sur l'événement équipe.`,
    requirements: [`Poste recherché : ${roleLabel}`],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: dailyRate && dailyRate > 0 ? `${dailyRate} € / jour` : 'À négocier',
    ...(dailyRate && dailyRate > 0 ? { dailyRate } : {}),
    status: MissionStatus.OPEN,
    eventId: event.id,
    applicants: [],
    applications: [],
  };
}

export function getOpenMissionsForEvent(
  missions: Mission[] | undefined,
  eventId: string
): Mission[] {
  return (missions || []).filter(
    (m) => m.eventId === eventId && m.status === MissionStatus.OPEN
  );
}

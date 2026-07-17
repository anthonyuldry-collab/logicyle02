import { MeetingReportAudience, StaffMember, StaffStatus } from '../types';
import { getStaffRoleKey } from '../utils/staffRoleUtils';

export const MEETING_REPORT_AUDIENCE_OPTIONS: {
  value: MeetingReportAudience;
  label: string;
  description: string;
}[] = [
  {
    value: MeetingReportAudience.COMITE_DIRECTEUR,
    label: 'Comité directeur',
    description: 'Manager et direction générale',
  },
  {
    value: MeetingReportAudience.DIRECTION_SPORTIVE,
    label: 'Direction sportive',
    description: 'Directeurs sportifs et adjoints',
  },
  {
    value: MeetingReportAudience.STAFF_PERFORMANCE,
    label: 'Staff performance',
    description: 'Entraîneurs, prépa, data, resp. performance',
  },
  {
    value: MeetingReportAudience.STAFF_LOGISTIQUE,
    label: 'Staff logistique',
    description: 'Assistants, mécaniciens',
  },
  {
    value: MeetingReportAudience.STAFF_COMMUNICATION,
    label: 'Communication',
    description: 'Pôle communication et médias',
  },
  {
    value: MeetingReportAudience.STAFF_MEDICAL,
    label: 'Staff médical',
    description: 'Kinés et médecins',
  },
  {
    value: MeetingReportAudience.VACATAIRES,
    label: 'Vacataires',
    description: 'Tous les profils en statut vacataire',
  },
  {
    value: MeetingReportAudience.PARTICIPANTS,
    label: 'Participants invités',
    description: 'Uniquement les personnes cochées comme participants',
  },
];

/** Audiences par défaut pour une réunion interne encadrement */
export const DEFAULT_MEETING_VISIBILITY: MeetingReportAudience[] = [
  MeetingReportAudience.COMITE_DIRECTEUR,
  MeetingReportAudience.DIRECTION_SPORTIVE,
];

export function getStaffMemberAudiences(member: StaffMember): MeetingReportAudience[] {
  const audiences: MeetingReportAudience[] = [];
  const roleKey = getStaffRoleKey(member.role);

  if (roleKey === 'MANAGER') audiences.push(MeetingReportAudience.COMITE_DIRECTEUR);
  if (roleKey === 'DS' || roleKey === 'ASSISTANT') {
    audiences.push(MeetingReportAudience.DIRECTION_SPORTIVE);
  }
  if (
    roleKey === 'RESP_PERF' ||
    roleKey === 'ENTRAINEUR' ||
    roleKey === 'PREPA_PHYSIQUE' ||
    roleKey === 'DATA_ANALYST'
  ) {
    audiences.push(MeetingReportAudience.STAFF_PERFORMANCE);
  }
  if (roleKey === 'ASSISTANT' || roleKey === 'MECANO') {
    audiences.push(MeetingReportAudience.STAFF_LOGISTIQUE);
  }
  if (roleKey === 'COMMUNICATION') {
    audiences.push(MeetingReportAudience.STAFF_COMMUNICATION);
  }
  if (roleKey === 'KINE' || roleKey === 'MEDECIN') {
    audiences.push(MeetingReportAudience.STAFF_MEDICAL);
  }
  if (member.status === StaffStatus.VACATAIRE) {
    audiences.push(MeetingReportAudience.VACATAIRES);
  }

  return [...new Set(audiences)];
}

export function getAudienceLabel(audience: MeetingReportAudience): string {
  return MEETING_REPORT_AUDIENCE_OPTIONS.find(o => o.value === audience)?.label ?? audience;
}

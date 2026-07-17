import {
  MeetingReport,
  MeetingReportAudience,
  StaffMember,
  TeamRole,
  User,
  UserRole,
} from '../types';
import { getStaffMemberAudiences } from '../constants/meetingReportAudiences';
import { getStaffRoleKey } from './staffRoleUtils';

export function canManageMeetingReports(user: User, staff: StaffMember[]): boolean {
  if (user.userRole === UserRole.MANAGER) return true;
  if (user.permissionRole === TeamRole.ADMIN || user.permissionRole === TeamRole.EDITOR) return true;
  const member = staff.find(s => s.email === user.email);
  if (!member) return false;
  const key = getStaffRoleKey(member.role);
  return key === 'DS' || key === 'MANAGER';
}

export function canViewMeetingReport(
  user: User,
  staff: StaffMember[],
  report: MeetingReport,
): boolean {
  if (canManageMeetingReports(user, staff)) return true;

  const member = staff.find(s => s.email === user.email || s.id === user.id);
  if (!member) return false;

  const audiences = report.visibilityAudiences ?? [];
  if (audiences.length === 0) return false;

  const memberAudiences = getStaffMemberAudiences(member);
  const nonParticipantAudiences = audiences.filter(a => a !== MeetingReportAudience.PARTICIPANTS);

  if (nonParticipantAudiences.some(a => memberAudiences.includes(a))) {
    return true;
  }

  if (
    audiences.includes(MeetingReportAudience.PARTICIPANTS) &&
    report.participantIds?.includes(member.id)
  ) {
    return true;
  }

  return false;
}

export function filterVisibleMeetingReports(
  user: User,
  staff: StaffMember[],
  reports: MeetingReport[],
): MeetingReport[] {
  return reports.filter(r => canViewMeetingReport(user, staff, r));
}

export function shouldShowMeetingsTab(
  user: User,
  staff: StaffMember[],
  reports: MeetingReport[],
): boolean {
  if (canManageMeetingReports(user, staff)) return true;
  return filterVisibleMeetingReports(user, staff, reports).length > 0;
}

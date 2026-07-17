import {
  DisciplinePracticed,
  TeamRecruitmentCriteria,
  User,
} from '../types';
import { RiderMarketSegment, resolveRiderMarketSegmentFromUser, RIDER_SEGMENT_LABELS } from './riderTeamMarketSegment';
import { getTalentDiscipline } from './talentSearchUtils';

function getAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function riderMatchesRecruitmentCriteria(
  user: User,
  criteria?: TeamRecruitmentCriteria,
): boolean {
  if (!criteria) return true;

  const age = getAge(user.signupInfo?.birthDate ?? user.birthDate);
  if (criteria.minAge != null && (age == null || age < criteria.minAge)) return false;
  if (criteria.maxAge != null && (age == null || age > criteria.maxAge)) return false;

  if (criteria.riderSegments?.length) {
    const segment = resolveRiderMarketSegmentFromUser(user);
    if (!criteria.riderSegments.includes(segment)) return false;
  }

  if (criteria.disciplines?.length) {
    const discipline = getTalentDiscipline(user, []);
    if (!discipline || !criteria.disciplines.includes(discipline)) return false;
  }

  if (criteria.qualitativeProfiles?.length && user.qualitativeProfile) {
    if (!criteria.qualitativeProfiles.includes(user.qualitativeProfile)) return false;
  }

  return true;
}

export function formatRecruitmentCriteriaSummary(criteria?: TeamRecruitmentCriteria): string {
  if (!criteria) return 'Aucun critère — tous profils compatibles';
  const parts: string[] = [];
  if (criteria.minAge != null || criteria.maxAge != null) {
    parts.push(`Âge ${criteria.minAge ?? '…'}–${criteria.maxAge ?? '…'}`);
  }
  if (criteria.riderSegments?.length) {
    parts.push(
      criteria.riderSegments
        .map((s) => RIDER_SEGMENT_LABELS[s as RiderMarketSegment] ?? s)
        .join(', '),
    );
  }
  if (criteria.disciplines?.length) {
    parts.push(criteria.disciplines.join(', '));
  }
  if (criteria.notes?.trim()) parts.push(criteria.notes.trim());
  return parts.length ? parts.join(' · ') : 'Critères personnalisés';
}

export const RIDER_SEGMENT_FILTER_OPTIONS: { id: RiderMarketSegment; label: string }[] = (
  Object.entries(RIDER_SEGMENT_LABELS) as [RiderMarketSegment, string][]
).map(([id, label]) => ({ id, label }));

export const DISCIPLINE_FILTER_OPTIONS = Object.values(DisciplinePracticed);

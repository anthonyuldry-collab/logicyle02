import {
  PartnerMediaStatus,
  PartnerRaceReport,
  PerformanceEntry,
  RaceEvent,
  Rider,
} from '../types';
import { generateId } from './themeUtils';
import { formatEventDateRange } from './dateUtils';

export function findPerformanceForEvent(
  entries: PerformanceEntry[] = [],
  eventId: string,
): PerformanceEntry | undefined {
  return entries.find((e) => e.eventId === eventId);
}

export function buildRaceReportDraftFromPerformance(params: {
  teamId: string;
  event: RaceEvent;
  performance?: PerformanceEntry;
  incomeItemId?: string;
  createdByUserId?: string;
  existing?: PartnerRaceReport;
}): PartnerRaceReport {
  const { teamId, event, performance, incomeItemId, createdByUserId, existing } = params;
  const now = new Date().toISOString();
  return {
    id: existing?.id || generateId(),
    teamId,
    eventId: event.id,
    incomeItemId: incomeItemId ?? existing?.incomeItemId,
    status: existing?.status === 'published' ? 'published' : 'draft',
    resultsSummary: performance?.resultsSummary || existing?.resultsSummary || '',
    raceOverallRanking: performance?.raceOverallRanking || existing?.raceOverallRanking || '',
    teamRiderRankings: performance?.teamRiderRankings || existing?.teamRiderRankings || '',
    sourcePerformanceEntryId: performance?.id || existing?.sourcePerformanceEntryId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    publishedAt: existing?.publishedAt,
    createdByUserId: createdByUserId || existing?.createdByUserId,
  };
}

export function publishPartnerRaceReport(report: PartnerRaceReport): PartnerRaceReport {
  const now = new Date().toISOString();
  return {
    ...report,
    status: 'published',
    updatedAt: now,
    publishedAt: report.publishedAt || now,
  };
}

export function archivePartnerRaceReport(report: PartnerRaceReport): PartnerRaceReport {
  return {
    ...report,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };
}

export function setRaceReportStatus(
  report: PartnerRaceReport,
  status: PartnerMediaStatus,
): PartnerRaceReport {
  if (status === 'published') return publishPartnerRaceReport(report);
  if (status === 'archived') return archivePartnerRaceReport(report);
  return { ...report, status: 'draft', updatedAt: new Date().toISOString() };
}

/** Rapports visibles pour un partenaire. */
export function filterRaceReportsForPartner(
  reports: PartnerRaceReport[] = [],
  teamId: string,
  incomeItemId: string,
): PartnerRaceReport[] {
  return reports
    .filter((r) => r.teamId === teamId)
    .filter((r) => r.status === 'published')
    .filter((r) => !r.incomeItemId || r.incomeItemId === incomeItemId)
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
}

export function findReportForEvent(
  reports: PartnerRaceReport[] = [],
  eventId: string,
  incomeItemId?: string,
): PartnerRaceReport | undefined {
  const forEvent = reports.filter((r) => r.eventId === eventId);
  if (incomeItemId) {
    const targeted = forEvent.find((r) => r.incomeItemId === incomeItemId);
    if (targeted) return targeted;
  }
  return forEvent.find((r) => !r.incomeItemId) || forEvent[0];
}

export function countPublishedRaceReports(
  reports: PartnerRaceReport[] = [],
  teamId: string,
  incomeItemId: string,
): number {
  return filterRaceReportsForPartner(reports, teamId, incomeItemId).length;
}

export function hasPublishableResults(performance?: PerformanceEntry): boolean {
  if (!performance) return false;
  return Boolean(
    (performance.resultsSummary || '').trim()
    || (performance.raceOverallRanking || '').trim()
    || (performance.teamRiderRankings || '').trim(),
  );
}

export function buildResultsSocialCopy(params: {
  event: RaceEvent;
  riders: Rider[];
  teamName: string;
  report?: PartnerRaceReport;
  performance?: PerformanceEntry;
}): string {
  const { event, riders, teamName, report, performance } = params;
  const summary =
    report?.resultsSummary
    || performance?.resultsSummary
    || '';
  const overall =
    report?.raceOverallRanking
    || performance?.raceOverallRanking
    || '';
  const teamRankings =
    report?.teamRiderRankings
    || performance?.teamRiderRankings
    || '';

  const hashtag = teamName.replace(/[^\p{L}\p{N}]/gu, '') || 'equipe';
  const dateLabel = formatEventDateRange(event, { weekday: 'long', day: 'numeric', month: 'long' });
  const names =
    riders.length > 0
      ? riders.map((r) => `${r.firstName} ${r.lastName}`).join(', ')
      : 'notre effectif';

  const lines = [
    `🏁 ${event.name} — résultats ${teamName}`,
    `📅 ${dateLabel}${event.location ? ` · ${event.location}` : ''}`,
    '',
  ];

  if (overall.trim()) {
    lines.push(`Classement général : ${overall.trim()}`);
  }
  if (teamRankings.trim()) {
    lines.push(`Classements équipe : ${teamRankings.trim()}`);
  }
  if (summary.trim()) {
    lines.push('', summary.trim());
  } else if (!overall.trim() && !teamRankings.trim()) {
    lines.push(`Bravo à ${names} pour leur engagement aujourd'hui.`);
    lines.push('', 'Classement et réactions à compléter après la course.');
  }

  lines.push('', `#${hashtag} #cyclisme`);
  return lines.join('\n').trim();
}

import { ChecklistRole, IncomeCategory, IncomeItem, PartnerNewsletter, RaceEvent, Rider, StaffMember } from '../types';
import { formatEventDateRange } from './dateUtils';
import { isStageRace } from './stageRaceUtils';

export interface ScheduleHighlight {
  label: string;
  value: string;
}

export function getRaceScheduleHighlights(event: RaceEvent): ScheduleHighlight[] {
  const info = event.raceInfo;
  if (!info) return [];

  const rows: ScheduleHighlight[] = [];
  const push = (label: string, value?: string | number) => {
    const text = value === undefined || value === null ? '' : String(value).trim();
    if (text) rows.push({ label, value: text });
  };

  if (info.permanenceAddress || info.permanenceTime) {
    push(
      'Permanence',
      [info.permanenceTime, info.permanenceAddress].filter(Boolean).join(' — '),
    );
  }
  push('Réunion DS', info.reunionDSTime);
  push('Présentation coureurs', info.presentationTime);

  if (info.isTimeTrial) {
    push('Premier départ (CLM)', info.premierDepartTime);
  } else {
    push('Départ fictif', info.departFictifTime);
    push('Départ réel', info.departReelTime);
  }

  push('Arrivée prévue', info.arriveePrevueTime);
  if (info.distanceKm) push('Distance', `${info.distanceKm} km`);
  push('Fréquence radio', info.radioFrequency);

  if (isStageRace(event) && info.stageDays?.length) {
    info.stageDays.forEach(stage => {
      const label = stage.stageLabel
        ? `Étape ${stage.stageNumber} — ${stage.stageLabel}`
        : `Étape ${stage.stageNumber}`;
      const parts: string[] = [];
      if (stage.departLocation && stage.arriveeLocation) {
        parts.push(`${stage.departLocation} → ${stage.arriveeLocation}`);
      }
      if (stage.isTimeTrial && stage.premierDepartTime) {
        parts.push(`CLM dès ${stage.premierDepartTime}`);
      } else if (stage.departReelTime) {
        parts.push(`Départ ${stage.departReelTime}`);
      }
      if (parts.length) rows.push({ label, value: parts.join(' · ') });
    });
  }

  return rows;
}

export function getEventMediaStaffContacts(
  event: RaceEvent,
  staff: StaffMember[],
): { label: string; members: StaffMember[] }[] {
  const byIds = (ids?: string[]) =>
    (ids ?? [])
      .map(id => staff.find(s => s.id === id))
      .filter((s): s is StaffMember => Boolean(s));

  return [
    { label: 'Directeur(s) sportif', members: byIds(event.directeurSportifId) },
    { label: 'Manager(s)', members: byIds(event.managerId) },
    { label: 'Communication', members: byIds(event.communicationId) },
  ].filter(group => group.members.length > 0);
}

export function buildPartantsSocialCopy(params: {
  event: RaceEvent;
  riders: Rider[];
  teamName: string;
}): string {
  const { event, riders, teamName } = params;
  const dateLabel = formatEventDateRange(event, { weekday: 'long', day: 'numeric', month: 'long' });
  const hashtag = teamName.replace(/[^\p{L}\p{N}]/gu, '');

  const lines = [
    `📣 ${teamName} — ${event.name}`,
    `📅 ${dateLabel}${event.location ? ` · ${event.location}` : ''}`,
    '',
    riders.length > 0 ? 'Partantes :' : 'Effectif à confirmer.',
    ...riders.map(r => `• ${r.firstName} ${r.lastName}`),
    '',
    `#${hashtag || 'equipe'} #cyclisme`,
  ];

  return lines.join('\n').trim();
}

export function buildResultsPlaceholderCopy(params: {
  event: RaceEvent;
  riders: Rider[];
  teamName: string;
}): string {
  const { event, riders, teamName } = params;
  const names =
    riders.length > 0
      ? riders.map(r => `${r.firstName} ${r.lastName}`).join(', ')
      : 'notre effectif';
  return [
    `🏁 ${event.name} — résultats ${teamName}`,
    '',
    `Bravo à ${names} pour leur engagement aujourd'hui.`,
    '',
    'Classement et réactions à compléter après la course.',
    '',
    `#${teamName.replace(/[^\p{L}\p{N}]/gu, '') || 'equipe'}`,
  ].join('\n');
}

/** @deprecated Prefer buildResultsSocialCopy from partnerRaceReportUtils */
export { buildResultsSocialCopy } from './partnerRaceReportUtils';


const SPONSOR_CATEGORIES = new Set<IncomeCategory>([
  IncomeCategory.SPONSORING,
  IncomeCategory.MECENAT,
  IncomeCategory.DONS,
]);

export function getActiveSponsorsForMedia(incomeItems: IncomeItem[] = []): IncomeItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return incomeItems
    .filter(item => SPONSOR_CATEGORIES.has(item.category))
    .filter(item => {
      if (item.sponsorshipContractEnd && item.sponsorshipContractEnd < today) return false;
      if (item.sponsorshipContractStart && item.sponsorshipContractStart > today) return false;
      return true;
    })
    .sort((a, b) =>
      (a.sponsorCompanyName || a.description).localeCompare(b.sponsorCompanyName || b.description, 'fr'),
    );
}

export function summarizePartnerNewsletters(newsletters: PartnerNewsletter[] = []): {
  published: number;
  drafts: number;
  recent: PartnerNewsletter[];
} {
  const published = newsletters.filter(n => n.status === 'published');
  const drafts = newsletters.filter(n => n.status !== 'published');
  const recent = [...newsletters]
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
    .slice(0, 5);
  return { published: published.length, drafts: drafts.length, recent };
}

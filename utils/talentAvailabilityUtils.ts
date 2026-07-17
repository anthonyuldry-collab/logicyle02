import {
  RaceEvent,
  Rider,
  RiderEventPreference,
  RiderEventSelection,
  RiderEventStatus,
  SeasonYear,
  TalentAvailability,
} from '../types';

export type EventValidationIssue =
  | 'missing_staff_availability'
  | 'missing_rider_preference'
  | 'preference_conflict'
  | 'unavailable_but_selected';

export interface RiderEventValidation {
  riderId: string;
  selection: RiderEventSelection;
  issues: EventValidationIssue[];
}

export interface EventValidationSummary {
  event: RaceEvent;
  riderIds: string[];
  missingStaff: number;
  missingPreference: number;
  conflicts: number;
  riders: RiderEventValidation[];
  attentionRiders: RiderEventValidation[];
  isComplete: boolean;
  daysUntil: number;
}

export function getEventSeasonYear(eventDate: string): SeasonYear {
  const year = new Date(eventDate + 'T12:00:00Z').getFullYear();
  switch (year) {
    case 2024:
      return SeasonYear.SEASON_2024;
    case 2025:
      return SeasonYear.SEASON_2025;
    case 2026:
      return SeasonYear.SEASON_2026;
    case 2027:
      return SeasonYear.SEASON_2027;
    case 2028:
      return SeasonYear.SEASON_2028;
    default:
      return SeasonYear.SEASON_2026;
  }
}

export function isUpcomingEvent(eventDate: string, includeToday = true): boolean {
  const event = new Date(eventDate + 'T12:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!includeToday) {
    today.setDate(today.getDate() + 1);
  }
  return event >= today;
}

export function getActiveRiders(riders: Rider[]): Rider[] {
  return riders
    .filter(r => r.isActive !== false)
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'));
}

export function findRiderEventSelection(
  selections: RiderEventSelection[],
  eventId: string,
  riderId: string
): RiderEventSelection | undefined {
  return selections.find(s => s.eventId === eventId && s.riderId === riderId);
}

/** Coureurs liés à un événement (sélections + selectedRiderIds legacy) */
export function getEventRiderIds(event: RaceEvent, selections: RiderEventSelection[]): string[] {
  const fromSelections = selections
    .filter(s => s.eventId === event.id)
    .map(s => s.riderId);
  const fromEvent = event.selectedRiderIds ?? [];
  return [...new Set([...fromSelections, ...fromEvent])];
}

export function resolveRiderEventSelection(
  event: RaceEvent,
  riderId: string,
  selections: RiderEventSelection[]
): RiderEventSelection {
  const existing = findRiderEventSelection(selections, event.id, riderId);
  if (existing) return existing;

  const inEvent = event.selectedRiderIds?.includes(riderId);
  return {
    id: '',
    eventId: event.id,
    riderId,
    status: inEvent ? RiderEventStatus.PRE_SELECTION : RiderEventStatus.EN_ATTENTE,
  };
}

export function formatEventDate(eventDate: string, style: 'long' | 'short' = 'long'): string {
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(eventDate + 'T12:00:00Z').toLocaleDateString('fr-FR', options);
}

const SELECTED_STATUSES: RiderEventStatus[] = [
  RiderEventStatus.TITULAIRE,
  RiderEventStatus.PRE_SELECTION,
  RiderEventStatus.REMPLACANT,
];

const NEGATIVE_PREFERENCES: RiderEventPreference[] = [
  RiderEventPreference.NE_VEUT_PAS,
  RiderEventPreference.ABSENT,
];

export function getDaysUntilEvent(eventDate: string): number {
  const event = new Date(eventDate + 'T12:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function analyzeRiderEventIssues(selection: RiderEventSelection): EventValidationIssue[] {
  const issues: EventValidationIssue[] = [];

  if (!selection.talentAvailability) {
    issues.push('missing_staff_availability');
  }

  if (!selection.riderPreference || selection.riderPreference === RiderEventPreference.EN_ATTENTE) {
    issues.push('missing_rider_preference');
  }

  const isSelected = SELECTED_STATUSES.includes(selection.status);
  if (
    isSelected &&
    selection.riderPreference &&
    NEGATIVE_PREFERENCES.includes(selection.riderPreference)
  ) {
    issues.push('preference_conflict');
  }

  if (
    isSelected &&
    selection.talentAvailability === TalentAvailability.PAS_DISPONIBLE
  ) {
    issues.push('unavailable_but_selected');
  }

  return issues;
}

export function buildEventValidationSummary(
  event: RaceEvent,
  selections: RiderEventSelection[],
  activeRiderIds: Set<string>
): EventValidationSummary | null {
  const riderIds = getEventRiderIds(event, selections).filter(id => activeRiderIds.has(id));
  if (riderIds.length === 0) return null;

  const riders: RiderEventValidation[] = riderIds.map(riderId => {
    const selection = resolveRiderEventSelection(event, riderId, selections);
    return { riderId, selection, issues: analyzeRiderEventIssues(selection) };
  });

  const attentionRiders = riders.filter(r => r.issues.length > 0);
  const missingStaff = riders.filter(r => r.issues.includes('missing_staff_availability')).length;
  const missingPreference = riders.filter(r => r.issues.includes('missing_rider_preference')).length;
  const conflicts = riders.filter(
    r => r.issues.includes('preference_conflict') || r.issues.includes('unavailable_but_selected')
  ).length;

  return {
    event,
    riderIds,
    missingStaff,
    missingPreference,
    conflicts,
    riders,
    attentionRiders,
    isComplete: attentionRiders.length === 0,
    daysUntil: getDaysUntilEvent(event.date),
  };
}

export function getUpcomingEventsWithSelections(
  events: RaceEvent[],
  selections: RiderEventSelection[],
  activeRiderIds: Set<string>,
  horizonDays = 90
): EventValidationSummary[] {
  return events
    .filter(e => isUpcomingEvent(e.date))
    .filter(e => getDaysUntilEvent(e.date) <= horizonDays)
    .map(e => buildEventValidationSummary(e, selections, activeRiderIds))
    .filter((s): s is EventValidationSummary => s !== null)
    .sort((a, b) => a.event.date.localeCompare(b.event.date));
}

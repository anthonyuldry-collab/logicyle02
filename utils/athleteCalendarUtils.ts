import {
  AthleteCalendarEntry,
  AthleteCalendarEntryStatus,
  DisciplinePracticed,
  ResultItem,
  User,
} from '../types';

export interface AthleteCalendarItem extends AthleteCalendarEntry {
  /** Provenance affichée */
  sourceLabel: string;
}

export function formatAthleteDateRange(
  startDate: string,
  endDate?: string,
  locale = 'fr-FR',
): string {
  const start = new Date(startDate + 'T12:00:00Z');
  const end = endDate ? new Date(endDate + 'T12:00:00Z') : null;
  if (Number.isNaN(start.getTime())) return startDate;
  if (!end || Number.isNaN(end.getTime()) || startDate === endDate) {
    return start.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();
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

export function isAthleteEntryUpcoming(
  entry: Pick<AthleteCalendarEntry, 'startDate' | 'endDate'>,
  todayIso?: string,
): boolean {
  const today = todayIso || new Date().toISOString().slice(0, 10);
  return (entry.endDate || entry.startDate) >= today;
}

export function resultToCalendarEntry(result: ResultItem): AthleteCalendarEntry {
  return {
    id: `result_${result.id}`,
    name: result.eventName || result.raceName || 'Course',
    startDate: result.date,
    endDate: result.date,
    location: result.team || undefined,
    discipline: result.discipline,
    notes: result.rank != null ? `Classement : ${result.rank}` : result.notes,
    status: 'done',
    source: 'result',
  };
}

export function buildAthleteCalendarItems(
  user: User,
  options?: { includeDemo?: boolean },
): AthleteCalendarItem[] {
  const manual = (user.personalRaceCalendar || []).map((e) => ({
    ...e,
    sourceLabel:
      e.source === 'demo'
        ? 'Exemple'
        : e.status === 'done'
          ? 'Terminé'
          : e.status === 'confirmed'
            ? 'Confirmé'
            : 'Planifié',
  }));

  const fromResults = (user.resultsHistory || []).map((r) => {
    const entry = resultToCalendarEntry(r);
    return { ...entry, sourceLabel: 'Résultat' };
  });

  // Éviter les doublons résultat déjà présents en manuel
  const manualIds = new Set(manual.map((m) => m.id));
  const resultIds = new Set(
    manual
      .filter((m) => m.source === 'result')
      .map((m) => m.id.replace(/^result_/, '')),
  );
  const uniqueResults = fromResults.filter((r) => {
    if (manualIds.has(r.id)) return false;
    const rawId = r.id.replace(/^result_/, '');
    return !resultIds.has(rawId);
  });

  let items = [...manual, ...uniqueResults];

  if (options?.includeDemo && !items.some((i) => i.source === 'demo')) {
    items = [...items, ...buildDemoAthleteCalendarEntries(user.id).map((e) => ({
      ...e,
      sourceLabel: 'Exemple',
    }))];
  }

  return items.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
}

export function buildDemoAthleteCalendarEntries(userId: string): AthleteCalendarEntry[] {
  const suffix = userId.slice(0, 8);
  return [
    {
      id: `demo_athlete_cal_lorient_${suffix}`,
      name: 'Classic Lorient Agglomération',
      startDate: '2026-08-29',
      endDate: '2026-08-29',
      location: 'Lorient, France',
      discipline: DisciplinePracticed.ROUTE,
      notes: 'Objectif saison — course 1 jour',
      status: 'confirmed',
      source: 'demo',
    },
    {
      id: `demo_athlete_cal_stage_${suffix}`,
      name: 'Stage altitude / préparation',
      startDate: '2026-09-12',
      endDate: '2026-09-19',
      location: 'Font-Romeu',
      discipline: DisciplinePracticed.ROUTE,
      notes: 'Semaine volume + récup',
      status: 'planned',
      source: 'demo',
    },
    {
      id: `demo_athlete_cal_past_${suffix}`,
      name: 'Grand Prix de Plumelec',
      startDate: '2026-05-17',
      endDate: '2026-05-17',
      location: 'Plumelec',
      discipline: DisciplinePracticed.ROUTE,
      notes: 'Course déjà disputée (exemple)',
      status: 'done',
      source: 'demo',
    },
  ];
}

export function upsertAthleteCalendarEntry(
  entries: AthleteCalendarEntry[],
  entry: AthleteCalendarEntry,
): AthleteCalendarEntry[] {
  const exists = entries.some((e) => e.id === entry.id);
  if (exists) return entries.map((e) => (e.id === entry.id ? entry : e));
  return [...entries, entry];
}

export function removeAthleteCalendarEntry(
  entries: AthleteCalendarEntry[],
  entryId: string,
): AthleteCalendarEntry[] {
  return entries.filter((e) => e.id !== entryId);
}

export const ATHLETE_CALENDAR_STATUS_LABELS: Record<AthleteCalendarEntryStatus, string> = {
  planned: 'Planifié',
  confirmed: 'Confirmé',
  done: 'Terminé',
  cancelled: 'Annulé',
};

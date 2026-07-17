import { NolioTraining, WeeklyTrainingSummary } from '../types/nolio';

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

export function aggregateTrainingsByWeek(trainings: NolioTraining[]): WeeklyTrainingSummary[] {
  const byWeek = new Map<string, WeeklyTrainingSummary>();

  for (const t of trainings) {
    if (!t.date_start) continue;
    const date = new Date(t.date_start);
    if (Number.isNaN(date.getTime())) continue;

    const weekStartDate = startOfWeek(date);
    const weekStart = weekStartDate.toISOString().slice(0, 10);

    const existing = byWeek.get(weekStart) ?? {
      weekStart,
      weekLabel: formatWeekLabel(weekStartDate),
      sessionCount: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      totalElevationMeters: 0,
    };

    existing.sessionCount += 1;
    existing.totalDurationSeconds += t.duration ?? 0;
    existing.totalDistanceMeters += t.distance ?? 0;
    existing.totalElevationMeters += t.elevation_gain ?? 0;
    byWeek.set(weekStart, existing);
  }

  return Array.from(byWeek.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${m}` : `${h} h`;
}

export function formatDistance(meters: number): string {
  if (meters <= 0) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatElevation(meters: number): string {
  if (meters <= 0) return '—';
  return `${Math.round(meters)} m D+`;
}

/** Heures de selle (durée totale) */
export function formatSaddleHours(seconds: number, digits = 1): string {
  if (seconds <= 0) return '—';
  const hours = seconds / 3600;
  return `${hours.toFixed(digits)} h`;
}

export interface TrainingPeriodTotals {
  sessionCount: number;
  saddleSeconds: number;
  distanceMeters: number;
  elevationMeters: number;
}

export function computeTrainingPeriodTotals(trainings: NolioTraining[]): TrainingPeriodTotals {
  return trainings.reduce(
    (acc, t) => ({
      sessionCount: acc.sessionCount + 1,
      saddleSeconds: acc.saddleSeconds + (t.duration ?? 0),
      distanceMeters: acc.distanceMeters + (t.distance ?? 0),
      elevationMeters: acc.elevationMeters + (t.elevation_gain ?? 0),
    }),
    { sessionCount: 0, saddleSeconds: 0, distanceMeters: 0, elevationMeters: 0 }
  );
}

export function getDateRangeWeeks(weekCount: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - weekCount * 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

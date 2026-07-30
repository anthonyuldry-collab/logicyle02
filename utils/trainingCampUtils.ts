import {
  AltitudeCampMeta,
  AltitudeCampProtocol,
  CampAthleteAltitudeRef,
  CampAthleteTest,
  CampMonitorColumnKey,
  CampMonitoringConfig,
  CampProgrammeDay,
  CampProgrammeItem,
  CampProgrammeSlotKind,
  CampStageKind,
  CampTestType,
  EventType,
  HeatCampProtocol,
  HeatSetupType,
  HypoxicSetupType,
  RaceEvent,
  StageCampSessionType,
  StageDayAthleteMetrics,
} from '../types';
import { isStageRace, parseEventDate } from './dateUtils';

/** Événement de type stage / camp d'entraînement (pas une course). */
export function isTrainingCamp(event: Pick<RaceEvent, 'eventType'>): boolean {
  return event.eventType === EventType.STAGE;
}

/** Course / compétition (Course et Compétition sont équivalents). */
export function isCompetitiveEvent(event: Pick<RaceEvent, 'eventType'>): boolean {
  return event.eventType === EventType.COMPETITION || event.eventType === EventType.COURSE;
}

export function isTrainingSession(event: Pick<RaceEvent, 'eventType'>): boolean {
  return event.eventType === EventType.ENTRAINEMENT;
}

/** Unifie Course → Compétition pour l’UI et les nouvelles sauvegardes. */
export function normalizeEventType(type: EventType): EventType {
  return type === EventType.COURSE ? EventType.COMPETITION : type;
}

/** Options du sélecteur (sans doublon Course). */
export const EVENT_TYPE_FORM_OPTIONS: EventType[] = [
  EventType.COMPETITION,
  EventType.STAGE,
  EventType.ENTRAINEMENT,
];

/**
 * Course à étapes compétitive (multi-jours) — exclut les stages.
 * Les stages multi-jours ne doivent pas afficher permanence / départs / radio course.
 */
export function isCompetitiveStageRace(
  event: Pick<RaceEvent, 'eventType' | 'date' | 'endDate'>,
): boolean {
  return !isTrainingCamp(event) && isStageRace(event);
}

export function isAltitudeCamp(
  event: Pick<RaceEvent, 'eventType' | 'altitudeCampMeta'>,
): boolean {
  return isTrainingCamp(event) && Boolean(event.altitudeCampMeta?.isAltitudeCamp);
}

export function isHeatCamp(
  event: Pick<RaceEvent, 'eventType' | 'altitudeCampMeta'>,
): boolean {
  return isTrainingCamp(event) && Boolean(event.altitudeCampMeta?.isHeatCamp);
}

/** Stage avec contrainte environnementale (altitude et/ou chaleur). */
export function isEnvironmentalCamp(
  event: Pick<RaceEvent, 'eventType' | 'altitudeCampMeta'>,
): boolean {
  return isAltitudeCamp(event) || isHeatCamp(event);
}

export const ALTITUDE_PROTOCOL_LABELS: Record<AltitudeCampProtocol, string> = {
  live_high_train_high: 'Live High / Train High',
  live_high_train_low: 'Live High / Train Low',
  intermittent_hypoxia: 'Hypoxie intermittente',
  none: 'Pas d’altitude',
  other: 'Autre protocole',
};

export const HEAT_PROTOCOL_LABELS: Record<HeatCampProtocol, string> = {
  passive_sauna: 'Chaleur passive (sauna)',
  active_heat_training: 'Entraînement en chaleur',
  heat_chamber: 'Chambre / hot room',
  hot_water_immersion: 'Immersion eau chaude',
  combined_heat_altitude: 'Chaleur + altitude',
  none: 'Pas de chaleur',
  other: 'Autre protocole chaleur',
};

export const HYPOXIC_SETUP_LABELS: Record<HypoxicSetupType, string> = {
  natural: 'Altitude naturelle',
  tent: 'Tente hypoxique',
  chamber: 'Chambre hypoxique',
  mask: 'Masque / générateur',
  other: 'Autre',
};

export const HEAT_SETUP_LABELS: Record<HeatSetupType, string> = {
  none: 'Pas de chaleur',
  sauna: 'Sauna',
  chamber: 'Chambre chaleur',
  hot_room: 'Hot room',
  outdoor: 'Extérieur (chaleur)',
  bath: 'Bain / immersion',
  other: 'Autre',
};

export const STAGE_SESSION_TYPE_LABELS: Record<StageCampSessionType, string> = {
  rest: 'Repos',
  recovery: 'Récupération',
  endurance: 'Endurance',
  intensity: 'Intensité',
  test: 'Test / labo',
  other: 'Autre',
};

export const emptyAltitudeCampMeta = (): AltitudeCampMeta => ({
  isAltitudeCamp: false,
  isHeatCamp: false,
  protocol: 'none',
  heatProtocol: 'none',
});

/** Liste des jours calendaires d’un événement (inclusifs). */
export function listEventDayDates(event: { date: string; endDate?: string }): string[] {
  const start = parseEventDate(event.date);
  const end = parseEventDate(event.endDate || event.date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [event.date];
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days.length > 0 ? days : [event.date];
}

export function metricsKey(riderId: string, date: string): string {
  return `${riderId}_${date}`;
}

export function findCampMetric(
  metrics: StageDayAthleteMetrics[] | undefined,
  riderId: string,
  date: string,
): StageDayAthleteMetrics | undefined {
  return (metrics || []).find((m) => m.riderId === riderId && m.date === date);
}

export function upsertCampMetric(
  metrics: StageDayAthleteMetrics[] | undefined,
  patch: Omit<StageDayAthleteMetrics, 'id'> & { id?: string },
): StageDayAthleteMetrics[] {
  const list = [...(metrics || [])];
  const idx = list.findIndex((m) => m.riderId === patch.riderId && m.date === patch.date);
  const next: StageDayAthleteMetrics = {
    id: patch.id || (idx >= 0 ? list[idx].id : `camp_${patch.riderId}_${patch.date}`),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...next };
  else list.push(next);
  return list;
}

export function findAthleteAltitudeRef(
  refs: CampAthleteAltitudeRef[] | undefined,
  riderId: string,
): CampAthleteAltitudeRef | undefined {
  return (refs || []).find((r) => r.riderId === riderId);
}

export function upsertAthleteAltitudeRef(
  refs: CampAthleteAltitudeRef[] | undefined,
  patch: CampAthleteAltitudeRef,
): CampAthleteAltitudeRef[] {
  const list = [...(refs || [])];
  const idx = list.findIndex((r) => r.riderId === patch.riderId);
  if (idx >= 0) list[idx] = { ...list[idx], ...patch };
  else list.push(patch);
  return list;
}

/**
 * Altitude équivalente à considérer pour un athlète :
 * 1) saisie du jour → 2) référence athlète (tente/chambre) → 3) sommeil stage → 4) site.
 */
export function resolveAthleteReferenceAltitude(
  event: Pick<RaceEvent, 'altitudeCampMeta' | 'campAthleteAltitudeRefs'>,
  riderId: string,
  dailyMetric?: Pick<StageDayAthleteMetrics, 'referenceAltitudeMeters'> | null,
): number | undefined {
  if (
    dailyMetric?.referenceAltitudeMeters !== undefined &&
    dailyMetric.referenceAltitudeMeters !== null &&
    !Number.isNaN(dailyMetric.referenceAltitudeMeters)
  ) {
    return dailyMetric.referenceAltitudeMeters;
  }
  const ref = findAthleteAltitudeRef(event.campAthleteAltitudeRefs, riderId);
  if (
    ref?.referenceAltitudeMeters !== undefined &&
    ref.referenceAltitudeMeters !== null &&
    !Number.isNaN(ref.referenceAltitudeMeters)
  ) {
    return ref.referenceAltitudeMeters;
  }
  const meta = event.altitudeCampMeta;
  if (meta?.sleepingAltitudeMeters != null && !Number.isNaN(meta.sleepingAltitudeMeters)) {
    return meta.sleepingAltitudeMeters;
  }
  if (meta?.altitudeMeters != null && !Number.isNaN(meta.altitudeMeters)) {
    return meta.altitudeMeters;
  }
  return undefined;
}

/** Repères coach altitude (indicatif, pas un diagnostic médical). */
export function spo2AlertLevel(spo2?: number): 'ok' | 'watch' | 'alert' | undefined {
  if (spo2 === undefined || spo2 === null || Number.isNaN(spo2)) return undefined;
  if (spo2 < 88) return 'alert';
  if (spo2 < 92) return 'watch';
  return 'ok';
}

export function urineHydrationHint(color?: number): 'ok' | 'watch' | 'alert' | undefined {
  if (color === undefined || color === null) return undefined;
  if (color === 1 || color >= 5) return 'alert';
  if (color === 4) return 'watch';
  return 'ok';
}

/**
 * Repères USG (densité spécifique) — sport haut niveau / terrain.
 * Référence eau distillée = 1.000. Indicatif, pas un diagnostic médical.
 *  ≤ 1.010 bien hydraté · 1.010–1.020 OK · 1.020–1.025 vigilance · > 1.025 déshydratation.
 */
export function usgAlertLevel(usg?: number): 'ok' | 'watch' | 'alert' | undefined {
  if (usg === undefined || usg === null || Number.isNaN(usg)) return undefined;
  if (usg < 1.001 || usg > 1.05) return 'alert';
  if (usg > 1.025) return 'alert';
  if (usg > 1.02) return 'watch';
  return 'ok';
}

export function usgStatusLabel(usg?: number): string | undefined {
  const level = usgAlertLevel(usg);
  if (!level || usg === undefined) return undefined;
  if (usg < 1.001) return 'Valeur hors plage';
  if (usg <= 1.01) return 'Bien hydraté';
  if (usg <= 1.02) return 'Hydratation OK';
  if (usg <= 1.025) return 'Légère déshydratation';
  return 'Déshydratation';
}

/** Échelle visuelle couleur urine (1 = très clair → 8 = très foncé). */
export const URINE_COLOR_SCALE: {
  value: number;
  label: string;
  status: string;
  hex: string;
}[] = [
  { value: 1, label: 'Blanc', status: 'Maladie rénale possible', hex: '#f3eee6' },
  { value: 2, label: 'Jaune pâle', status: 'Sain', hex: '#f2e39a' },
  { value: 3, label: 'Jaune transparent', status: 'Normal', hex: '#efc93a' },
  { value: 4, label: 'Jaune foncé', status: "Besoin de s'hydrater", hex: '#d49a12' },
  { value: 5, label: 'Ambré', status: 'Déshydraté', hex: '#c77a1c' },
  { value: 6, label: 'Orange', status: 'Maladie hépatique possible', hex: '#a85c2a' },
  { value: 7, label: 'Rouge clair / rose', status: 'Sang dans les urines', hex: '#8b3a2f' },
  { value: 8, label: 'Rouge foncé', status: 'Alerte médicale', hex: '#3f1414' },
];

export function getUrineColorMeta(value?: number) {
  if (value === undefined || value === null) return undefined;
  return URINE_COLOR_SCALE.find((c) => c.value === value);
}

/** Échelles subjectives du suivi stage (1–5) avec libellés concrets. */
export type WellnessScaleKey =
  | 'sleepQuality'
  | 'fatigue'
  | 'mood'
  | 'muscleSoreness'
  | 'appetite';

export type WellnessScaleLevel = 1 | 2 | 3 | 4 | 5;

export interface WellnessScaleOption {
  value: WellnessScaleLevel;
  label: string;
  detail: string;
}

export const WELLNESS_SCALE_DEFINITIONS: Record<
  WellnessScaleKey,
  { title: string; hint: string; levels: WellnessScaleOption[] }
> = {
  fatigue: {
    title: 'Fatigue',
    hint: 'Comment vous sentez-vous ce matin ?',
    levels: [
      { value: 1, label: 'Frais', detail: 'Reposé, prêt à performer' },
      { value: 2, label: 'Légère', detail: 'Un peu fatigué, OK pour s’entraîner' },
      { value: 3, label: 'Modérée', detail: 'Fatigue nette, à surveiller' },
      { value: 4, label: 'Importante', detail: 'Lourd, charge à réduire' },
      { value: 5, label: 'Épuisé', detail: 'Très fatigué, récupération prioritaire' },
    ],
  },
  mood: {
    title: 'Moral',
    hint: 'Votre état d’esprit / motivation ce matin',
    levels: [
      { value: 1, label: 'Très bas', detail: 'Irritable, démotivé' },
      { value: 2, label: 'Bas', detail: 'Moral en berne' },
      { value: 3, label: 'Neutre', detail: 'Ni bon ni mauvais' },
      { value: 4, label: 'Bon', detail: 'Positif, motivé' },
      { value: 5, label: 'Excellent', detail: 'Très motivé, confiant' },
    ],
  },
  muscleSoreness: {
    title: 'Courbatures',
    hint: 'Douleurs musculaires / raideurs ressenties',
    levels: [
      { value: 1, label: 'Aucune', detail: 'Corps souple, pas de douleur' },
      { value: 2, label: 'Légères', detail: 'Légère raideur, sans gêne' },
      { value: 3, label: 'Modérées', detail: 'Sensibles au toucher / mouvement' },
      { value: 4, label: 'Fortes', detail: 'Gênantes à l’entraînement' },
      { value: 5, label: 'Très fortes', detail: 'Limitantes, difficile de bouger' },
    ],
  },
  appetite: {
    title: 'Appétit',
    hint: 'Envie / capacité à manger depuis hier',
    levels: [
      { value: 1, label: 'Absent', detail: 'Pas faim, difficulté à manger' },
      { value: 2, label: 'Faible', detail: 'Peu d’appétit' },
      { value: 3, label: 'Normal', detail: 'Appétit habituel' },
      { value: 4, label: 'Bon', detail: 'Bonne faim, mange bien' },
      { value: 5, label: 'Très fort', detail: 'Très faim, besoin de plus' },
    ],
  },
  sleepQuality: {
    title: 'Qualité du sommeil',
    hint: 'Comment avez-vous dormi cette nuit ?',
    levels: [
      { value: 1, label: 'Très mauvais', detail: 'Insomnie / réveils fréquents' },
      { value: 2, label: 'Mauvais', detail: 'Sommeil agité, peu récupérateur' },
      { value: 3, label: 'Moyen', detail: 'Correct sans plus' },
      { value: 4, label: 'Bon', detail: 'Sommeil récupérateur' },
      { value: 5, label: 'Excellent', detail: 'Nuit profonde, très reposé' },
    ],
  },
};

export function getWellnessScaleOptions(scale: WellnessScaleKey) {
  return WELLNESS_SCALE_DEFINITIONS[scale];
}

export function getWellnessScaleMeta(scale: WellnessScaleKey, value?: number) {
  if (value === undefined || value === null) return undefined;
  return WELLNESS_SCALE_DEFINITIONS[scale].levels.find((l) => l.value === value);
}

/** Métriques numériques suivies en stage (libellés complets). */
export type CampChartMetricKey =
  | 'hrvMs'
  | 'restingHrBpm'
  | 'spo2Percent'
  | 'weightKg'
  | 'hydrationLiters'
  | 'urineColor'
  | 'urineSpecificGravity'
  | 'ambientTemperatureC'
  | 'heatExposureMinutes'
  | 'sleepHours'
  | 'sleepQuality'
  | 'fatigue'
  | 'mood'
  | 'muscleSoreness'
  | 'appetite'
  | 'trainingLoad'
  | 'rpe';

export const CAMP_CHART_METRICS: {
  key: CampChartMetricKey;
  label: string;
  unit?: string;
  /** Baisse = mieux (ex. fatigue) */
  invertColors?: boolean;
}[] = [
  { key: 'hrvMs', label: 'HRV', unit: 'ms' },
  { key: 'restingHrBpm', label: 'Fréquence cardiaque repos', unit: 'bpm', invertColors: true },
  { key: 'spo2Percent', label: 'Saturation SpO₂', unit: '%' },
  { key: 'weightKg', label: 'Poids', unit: 'kg' },
  { key: 'hydrationLiters', label: 'Hydratation', unit: 'L' },
  { key: 'urineColor', label: 'Couleur urine', unit: 'échelle', invertColors: true },
  { key: 'urineSpecificGravity', label: 'USG (densité)', unit: '', invertColors: true },
  { key: 'ambientTemperatureC', label: 'Température ambiante', unit: '°C' },
  { key: 'heatExposureMinutes', label: 'Exposition chaleur', unit: 'min' },
  { key: 'sleepHours', label: 'Sommeil', unit: 'h' },
  { key: 'sleepQuality', label: 'Qualité du sommeil', unit: '1–5' },
  { key: 'fatigue', label: 'Fatigue', unit: '1–5', invertColors: true },
  { key: 'mood', label: 'Moral', unit: '1–5' },
  { key: 'muscleSoreness', label: 'Courbatures', unit: '1–5', invertColors: true },
  { key: 'appetite', label: 'Appétit', unit: '1–5' },
  { key: 'trainingLoad', label: "Charge d'entraînement" },
  { key: 'rpe', label: 'RPE', unit: '1–10' },
];

export interface CampMetricSeriesPoint {
  dayIndex: number;
  date: string;
  value: number | null;
}

/** Série alignée sur les jours du stage (J1 = index 0). */
export function buildCampMetricSeries(
  event: Pick<RaceEvent, 'date' | 'endDate' | 'campAthleteDailyMetrics'>,
  riderId: string,
  metric: CampChartMetricKey,
): CampMetricSeriesPoint[] {
  const days = listEventDayDates(event);
  return days.map((date, dayIndex) => {
    const row = findCampMetric(event.campAthleteDailyMetrics, riderId, date);
    const raw = row?.[metric];
    const value =
      typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    return { dayIndex, date, value };
  });
}

export function listOtherTrainingCamps(
  events: RaceEvent[],
  currentEventId: string,
): RaceEvent[] {
  return events
    .filter((e) => isTrainingCamp(e) && e.id !== currentEventId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/** Dernière valeur numérique non nulle d’une série. */
export function lastSeriesValue(
  series: CampMetricSeriesPoint[],
): { value: number; dayIndex: number; date: string } | null {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const p = series[i];
    if (p.value !== null && Number.isFinite(p.value)) {
      return { value: p.value, dayIndex: p.dayIndex, date: p.date };
    }
  }
  return null;
}

export function seriesDelta(series: CampMetricSeriesPoint[]): number | null {
  const vals = series.filter((p) => p.value !== null).map((p) => p.value as number);
  if (vals.length < 2) return null;
  return vals[vals.length - 1] - vals[0];
}

export interface CampAthleteOverviewRow {
  riderId: string;
  daysFilled: number;
  totalDays: number;
  lastHrv?: number;
  lastSpo2?: number;
  lastUsg?: number;
  lastFatigue?: number;
  lastWeight?: number;
  spo2Alerts: number;
  usgAlerts: number;
  headacheDays: number;
  hrvDelta: number | null;
  spo2Delta: number | null;
  status: 'ok' | 'watch' | 'alert';
}

export interface CampOverviewSummary {
  totalDays: number;
  athleteCount: number;
  metricsLogged: number;
  expectedSlots: number;
  fillRatePercent: number;
  spo2Alerts: number;
  usgAlerts: number;
  headacheDays: number;
  testsCount: number;
  daysWithAnyData: number;
  dayFillCounts: { date: string; count: number }[];
  athletes: CampAthleteOverviewRow[];
}

function rowHasMeaningfulData(row: StageDayAthleteMetrics | undefined): boolean {
  if (!row) return false;
  return (
    row.hrvMs != null ||
    row.restingHrBpm != null ||
    row.spo2Percent != null ||
    row.weightKg != null ||
    row.hydrationLiters != null ||
    row.urineColor != null ||
    row.urineSpecificGravity != null ||
    row.sleepHours != null ||
    row.sleepQuality != null ||
    row.fatigue != null ||
    row.mood != null ||
    row.muscleSoreness != null ||
    row.appetite != null ||
    row.trainingLoad != null ||
    row.rpe != null ||
    Boolean(row.headache) ||
    Boolean(row.coachNotes) ||
    Boolean(row.sessionNotes)
  );
}

/** Synthèse globale d’un stage pour la page de garde. */
export function buildCampOverviewSummary(
  event: Pick<
    RaceEvent,
    | 'date'
    | 'endDate'
    | 'selectedRiderIds'
    | 'campAthleteDailyMetrics'
    | 'campAthleteTests'
    | 'altitudeCampMeta'
    | 'eventType'
  >,
  riderIds: string[],
): CampOverviewSummary {
  const days = listEventDayDates(event);
  const metrics = event.campAthleteDailyMetrics || [];
  const tests = event.campAthleteTests || [];
  const totalDays = days.length;
  const athleteCount = riderIds.length;
  const expectedSlots = totalDays * athleteCount;

  let metricsLogged = 0;
  let spo2Alerts = 0;
  let usgAlerts = 0;
  let headacheDays = 0;

  const dayFillCounts = days.map((date) => {
    let count = 0;
    riderIds.forEach((riderId) => {
      const row = findCampMetric(metrics, riderId, date);
      if (rowHasMeaningfulData(row)) {
        count += 1;
        metricsLogged += 1;
      }
      if (spo2AlertLevel(row?.spo2Percent) === 'alert') spo2Alerts += 1;
      else if (spo2AlertLevel(row?.spo2Percent) === 'watch') spo2Alerts += 0.5;
      if (usgAlertLevel(row?.urineSpecificGravity) === 'alert') usgAlerts += 1;
      else if (usgAlertLevel(row?.urineSpecificGravity) === 'watch') usgAlerts += 0.5;
      if (row?.headache) headacheDays += 1;
    });
    return { date, count };
  });

  const athletes: CampAthleteOverviewRow[] = riderIds.map((riderId) => {
    const hrvSeries = buildCampMetricSeries(event, riderId, 'hrvMs');
    const spo2Series = buildCampMetricSeries(event, riderId, 'spo2Percent');
    const usgSeries = buildCampMetricSeries(event, riderId, 'urineSpecificGravity');
    const fatigueSeries = buildCampMetricSeries(event, riderId, 'fatigue');
    const weightSeries = buildCampMetricSeries(event, riderId, 'weightKg');

    let daysFilled = 0;
    let riderSpo2Alerts = 0;
    let riderUsgAlerts = 0;
    let riderHeadache = 0;
    days.forEach((date) => {
      const row = findCampMetric(metrics, riderId, date);
      if (rowHasMeaningfulData(row)) daysFilled += 1;
      const spo2 = spo2AlertLevel(row?.spo2Percent);
      if (spo2 === 'alert' || spo2 === 'watch') riderSpo2Alerts += 1;
      const usg = usgAlertLevel(row?.urineSpecificGravity);
      if (usg === 'alert' || usg === 'watch') riderUsgAlerts += 1;
      if (row?.headache) riderHeadache += 1;
    });

    let status: 'ok' | 'watch' | 'alert' = 'ok';
    const lastSpo2 = lastSeriesValue(spo2Series)?.value;
    const lastUsg = lastSeriesValue(usgSeries)?.value;
    const lastFatigue = lastSeriesValue(fatigueSeries)?.value;
    if (
      spo2AlertLevel(lastSpo2) === 'alert' ||
      usgAlertLevel(lastUsg) === 'alert' ||
      (lastFatigue != null && lastFatigue >= 5)
    ) {
      status = 'alert';
    } else if (
      spo2AlertLevel(lastSpo2) === 'watch' ||
      usgAlertLevel(lastUsg) === 'watch' ||
      (lastFatigue != null && lastFatigue >= 4) ||
      riderHeadache > 0
    ) {
      status = 'watch';
    }

    return {
      riderId,
      daysFilled,
      totalDays,
      lastHrv: lastSeriesValue(hrvSeries)?.value,
      lastSpo2,
      lastUsg,
      lastFatigue,
      lastWeight: lastSeriesValue(weightSeries)?.value,
      spo2Alerts: riderSpo2Alerts,
      usgAlerts: riderUsgAlerts,
      headacheDays: riderHeadache,
      hrvDelta: seriesDelta(hrvSeries),
      spo2Delta: seriesDelta(spo2Series),
      status,
    };
  });

  return {
    totalDays,
    athleteCount,
    metricsLogged,
    expectedSlots,
    fillRatePercent:
      expectedSlots > 0 ? Math.round((metricsLogged / expectedSlots) * 100) : 0,
    spo2Alerts: Math.round(spo2Alerts),
    usgAlerts: Math.round(usgAlerts),
    headacheDays,
    testsCount: tests.length,
    daysWithAnyData: dayFillCounts.filter((d) => d.count > 0).length,
    dayFillCounts,
    athletes,
  };
}

/** Catalogue des colonnes de monitoring (ordre d’affichage). */
export const CAMP_MONITOR_COLUMN_CATALOG: {
  key: CampMonitorColumnKey;
  label: string;
  group: 'altitude' | 'heat' | 'physio' | 'hydration' | 'wellness' | 'session';
  /** Inclus automatiquement sur stage altitude */
  altitudeDefault?: boolean;
  /** Inclus automatiquement sur stage chaleur */
  heatDefault?: boolean;
}[] = [
  { key: 'referenceAltitudeMeters', label: 'Alt. réf. (m)', group: 'altitude', altitudeDefault: true },
  { key: 'ambientTemperatureC', label: 'Temp. (°C)', group: 'heat', heatDefault: true },
  { key: 'heatExposureMinutes', label: 'Expo. chaleur (min)', group: 'heat', heatDefault: true },
  { key: 'hrvMs', label: 'HRV (ms)', group: 'physio', altitudeDefault: true, heatDefault: true },
  { key: 'restingHrBpm', label: 'FC repos (bpm)', group: 'physio', altitudeDefault: true, heatDefault: true },
  { key: 'spo2Percent', label: 'Saturation SpO₂ (%)', group: 'physio', altitudeDefault: true },
  { key: 'weightKg', label: 'Poids (kg)', group: 'physio', altitudeDefault: true, heatDefault: true },
  { key: 'hydrationLiters', label: 'Hydratation (L)', group: 'hydration', altitudeDefault: true, heatDefault: true },
  { key: 'urineColor', label: 'Couleur urine', group: 'hydration', altitudeDefault: true, heatDefault: true },
  { key: 'urineSpecificGravity', label: 'USG', group: 'hydration', altitudeDefault: true, heatDefault: true },
  { key: 'sleepHours', label: 'Sommeil (h)', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'sleepQuality', label: 'Qualité sommeil', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'fatigue', label: 'Fatigue', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'mood', label: 'Moral', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'muscleSoreness', label: 'Courbatures', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'headache', label: 'Céphalées', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'appetite', label: 'Appétit', group: 'wellness', altitudeDefault: true, heatDefault: true },
  { key: 'sessionType', label: 'Type de séance', group: 'session', altitudeDefault: true, heatDefault: true },
  { key: 'trainingLoad', label: "Charge d'entraînement", group: 'session', altitudeDefault: true, heatDefault: true },
  { key: 'rpe', label: 'RPE', group: 'session', altitudeDefault: true, heatDefault: true },
  { key: 'notes', label: 'Notes', group: 'session', altitudeDefault: true, heatDefault: true },
];

export const CAMP_STAGE_KIND_LABELS: Record<CampStageKind, string> = {
  altitude: 'Stage altitude / hypoxie',
  preseason: 'Pré-saison',
  training: 'Stage d’entraînement',
  recovery: 'Récupération / décharge',
  other: 'Autre',
};

/** Preset pré-saison : wellness + charge, sans SpO₂ / USG / alt. */
export const CAMP_MONITOR_PRESET_PRESEASON: CampMonitorColumnKey[] = [
  'hrvMs',
  'restingHrBpm',
  'weightKg',
  'hydrationLiters',
  'urineColor',
  'sleepHours',
  'sleepQuality',
  'fatigue',
  'mood',
  'muscleSoreness',
  'appetite',
  'sessionType',
  'trainingLoad',
  'rpe',
  'notes',
];

export const CAMP_MONITOR_PRESET_RECOVERY: CampMonitorColumnKey[] = [
  'hrvMs',
  'restingHrBpm',
  'weightKg',
  'sleepHours',
  'sleepQuality',
  'fatigue',
  'mood',
  'muscleSoreness',
  'appetite',
  'sessionType',
  'rpe',
  'notes',
];

export const CAMP_MONITOR_PRESET_MINIMAL: CampMonitorColumnKey[] = [
  'fatigue',
  'mood',
  'muscleSoreness',
  'sleepHours',
  'rpe',
  'notes',
];

export const CAMP_MONITOR_PRESET_FULL: CampMonitorColumnKey[] =
  CAMP_MONITOR_COLUMN_CATALOG.map((c) => c.key);

export function getAltitudeMonitorColumns(): CampMonitorColumnKey[] {
  return CAMP_MONITOR_COLUMN_CATALOG.filter((c) => c.altitudeDefault).map((c) => c.key);
}

export function getHeatMonitorColumns(): CampMonitorColumnKey[] {
  return CAMP_MONITOR_COLUMN_CATALOG.filter((c) => c.heatDefault).map((c) => c.key);
}

/** Colonnes auto pour stage altitude et/ou chaleur (union ordonnée). */
export function getEnvironmentalMonitorColumns(
  event: Pick<RaceEvent, 'eventType' | 'altitudeCampMeta'>,
): CampMonitorColumnKey[] {
  const altitude = isAltitudeCamp(event);
  const heat = isHeatCamp(event);
  return CAMP_MONITOR_COLUMN_CATALOG.map((c) => c.key).filter((key) => {
    const col = CAMP_MONITOR_COLUMN_CATALOG.find((c) => c.key === key)!;
    if (altitude && col.altitudeDefault) return true;
    if (heat && col.heatDefault) return true;
    return false;
  });
}

export function resolveVisibleMonitorColumns(
  event: Pick<RaceEvent, 'eventType' | 'altitudeCampMeta' | 'campMonitoringConfig'>,
): CampMonitorColumnKey[] {
  if (isEnvironmentalCamp(event)) return getEnvironmentalMonitorColumns(event);
  const configured = event.campMonitoringConfig?.visibleMetrics;
  if (configured && configured.length > 0) {
    const allowed = new Set(CAMP_MONITOR_COLUMN_CATALOG.map((c) => c.key));
    const ordered = CAMP_MONITOR_COLUMN_CATALOG.map((c) => c.key).filter(
      (k) => configured.includes(k) && allowed.has(k),
    );
    return ordered.length > 0 ? ordered : [...CAMP_MONITOR_PRESET_PRESEASON];
  }
  const kind = event.campMonitoringConfig?.stageKind;
  if (kind === 'recovery') return [...CAMP_MONITOR_PRESET_RECOVERY];
  return [...CAMP_MONITOR_PRESET_PRESEASON];
}

export function emptyCampMonitoringConfig(
  stageKind: CampStageKind = 'preseason',
): CampMonitoringConfig {
  return {
    stageKind,
    visibleMetrics:
      stageKind === 'recovery'
        ? [...CAMP_MONITOR_PRESET_RECOVERY]
        : [...CAMP_MONITOR_PRESET_PRESEASON],
  };
}

export const CAMP_TEST_TYPE_LABELS: Record<CampTestType, string> = {
  power: 'Puissance',
  lactate: 'Lactate',
  field: 'Terrain',
  lab: 'Labo',
  custom: 'Personnalisé',
};

export function upsertCampTest(
  tests: CampAthleteTest[] | undefined,
  patch: Omit<CampAthleteTest, 'id'> & { id?: string },
): CampAthleteTest[] {
  const list = [...(tests || [])];
  const id =
    patch.id ||
    `camp_test_${patch.riderId}_${patch.date}_${patch.testType}_${Date.now()}`;
  const idx = list.findIndex((t) => t.id === id);
  const next: CampAthleteTest = {
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...next };
  else list.push(next);
  return list;
}

export function removeCampTest(
  tests: CampAthleteTest[] | undefined,
  testId: string,
): CampAthleteTest[] {
  return (tests || []).filter((t) => t.id !== testId);
}

export function testsForDay(
  tests: CampAthleteTest[] | undefined,
  date: string,
  riderId?: string,
): CampAthleteTest[] {
  return (tests || []).filter(
    (t) => t.date === date && (!riderId || t.riderId === riderId),
  );
}

function newProgrammeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyCampProgrammeItem(
  partial?: Partial<CampProgrammeItem>,
): CampProgrammeItem {
  return {
    id: newProgrammeId('camp_prog_item'),
    title: '',
    sessionType: 'endurance',
    ...partial,
  };
}

export function emptyCampProgrammeDay(
  date: string,
  partial?: Partial<CampProgrammeDay>,
): CampProgrammeDay {
  return {
    id: newProgrammeId('camp_prog_day'),
    date,
    items: [],
    ...partial,
  };
}

/** Aligne le programme sur les dates du stage (ajoute les jours manquants, retire les hors période). */
export function syncCampProgrammeDays(
  event: Pick<RaceEvent, 'date' | 'endDate' | 'campProgrammeDays'>,
): CampProgrammeDay[] {
  const dates = listEventDayDates(event);
  const existing = event.campProgrammeDays || [];
  const byDate = new Map(existing.map((d) => [d.date, d]));
  return dates.map((date) => {
    const found = byDate.get(date);
    if (found) return found;
    return emptyCampProgrammeDay(date);
  });
}

export function findCampProgrammeDay(
  days: CampProgrammeDay[] | undefined,
  date: string,
): CampProgrammeDay | undefined {
  return (days || []).find((d) => d.date === date);
}

export function upsertCampProgrammeDay(
  days: CampProgrammeDay[] | undefined,
  day: CampProgrammeDay,
): CampProgrammeDay[] {
  const list = [...(days || [])];
  const idx = list.findIndex((d) => d.id === day.id || d.date === day.date);
  if (idx >= 0) list[idx] = day;
  else list.push(day);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function sortProgrammeItems(items: CampProgrammeItem[]): CampProgrammeItem[] {
  return [...items].sort((a, b) => {
    const ta = a.startTime || '99:99';
    const tb = b.startTime || '99:99';
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.title || '').localeCompare(b.title || '');
  });
}

export const CAMP_PROGRAMME_SLOT_KIND_LABELS: Record<CampProgrammeSlotKind, string> = {
  meal: 'Repas',
  briefing: 'Briefing',
  training: 'Séance',
  test: 'Test',
  recovery: 'Récup / soins',
  transfer: 'Transfert',
  other: 'Autre',
};

export type CampProgrammeDayTemplateId =
  | 'arrival'
  | 'endurance'
  | 'intensity'
  | 'recovery'
  | 'test'
  | 'departure';

type ProgrammeSlotDraft = Omit<CampProgrammeItem, 'id'>;

export interface CampProgrammeDayTemplate {
  id: CampProgrammeDayTemplateId;
  label: string;
  shortLabel: string;
  theme: string;
  description: string;
  slots: ProgrammeSlotDraft[];
}

/** Créneaux types pour remplir un jour en 1 clic. */
export const CAMP_PROGRAMME_QUICK_SLOTS: Array<ProgrammeSlotDraft & { id: string; label: string }> = [
  {
    id: 'breakfast',
    label: 'Petit-déj',
    startTime: '07:00',
    endTime: '07:45',
    title: 'Petit-déjeuner',
    slotKind: 'meal',
    sessionType: 'other',
  },
  {
    id: 'brief_am',
    label: 'Brief AM',
    startTime: '08:00',
    endTime: '08:15',
    title: 'Briefing matin',
    slotKind: 'briefing',
    sessionType: 'other',
  },
  {
    id: 'train_am',
    label: 'Séance AM',
    startTime: '08:30',
    endTime: '12:00',
    title: 'Séance matin',
    slotKind: 'training',
    sessionType: 'endurance',
  },
  {
    id: 'lunch',
    label: 'Déjeuner',
    startTime: '12:30',
    endTime: '13:30',
    title: 'Déjeuner',
    slotKind: 'meal',
    sessionType: 'other',
  },
  {
    id: 'recovery_pm',
    label: 'Récup',
    startTime: '14:00',
    endTime: '15:00',
    title: 'Récupération / soins',
    slotKind: 'recovery',
    sessionType: 'recovery',
  },
  {
    id: 'train_pm',
    label: 'Séance PM',
    startTime: '15:30',
    endTime: '17:30',
    title: 'Séance après-midi',
    slotKind: 'training',
    sessionType: 'endurance',
  },
  {
    id: 'dinner',
    label: 'Dîner',
    startTime: '19:00',
    endTime: '20:00',
    title: 'Dîner',
    slotKind: 'meal',
    sessionType: 'other',
  },
  {
    id: 'brief_pm',
    label: 'Brief soir',
    startTime: '20:30',
    endTime: '21:00',
    title: 'Briefing soir',
    slotKind: 'briefing',
    sessionType: 'other',
  },
];

/** Journées types — structure opérationnelle standard d’un stage. */
export const CAMP_PROGRAMME_DAY_TEMPLATES: CampProgrammeDayTemplate[] = [
  {
    id: 'arrival',
    label: 'Arrivée',
    shortLabel: 'Arrivée',
    theme: 'Arrivée / installation',
    description: 'Transfert, installation, activation légère',
    slots: [
      { startTime: '10:00', endTime: '12:00', title: 'Arrivée / transfert', slotKind: 'transfer', sessionType: 'other' },
      { startTime: '12:30', endTime: '13:30', title: 'Déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '14:00', endTime: '15:00', title: 'Installation hôtel / matériel', slotKind: 'other', sessionType: 'other' },
      { startTime: '15:30', endTime: '17:00', title: 'Activation / sortie courte', slotKind: 'training', sessionType: 'recovery' },
      { startTime: '18:00', endTime: '18:30', title: 'Briefing stage', slotKind: 'briefing', sessionType: 'other' },
      { startTime: '19:00', endTime: '20:00', title: 'Dîner', slotKind: 'meal', sessionType: 'other' },
    ],
  },
  {
    id: 'endurance',
    label: 'Endurance',
    shortLabel: 'Endurance',
    theme: 'Journée endurance',
    description: 'Rythme classique : brief → séance → repas → récup',
    slots: [
      { startTime: '07:00', endTime: '07:45', title: 'Petit-déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '08:00', endTime: '08:15', title: 'Briefing matin', slotKind: 'briefing', sessionType: 'other' },
      { startTime: '08:30', endTime: '12:30', title: 'Séance endurance', slotKind: 'training', sessionType: 'endurance' },
      { startTime: '13:00', endTime: '14:00', title: 'Déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '14:30', endTime: '16:00', title: 'Récupération / soins', slotKind: 'recovery', sessionType: 'recovery' },
      { startTime: '19:00', endTime: '20:00', title: 'Dîner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '20:30', endTime: '21:00', title: 'Briefing soir', slotKind: 'briefing', sessionType: 'other' },
    ],
  },
  {
    id: 'intensity',
    label: 'Intensité',
    shortLabel: 'Intensité',
    theme: 'Journée intensité',
    description: 'Séance qualité le matin, récup structurée',
    slots: [
      { startTime: '07:00', endTime: '07:45', title: 'Petit-déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '08:00', endTime: '08:20', title: 'Briefing intensité', slotKind: 'briefing', sessionType: 'other' },
      { startTime: '08:45', endTime: '11:30', title: 'Séance intensité', slotKind: 'training', sessionType: 'intensity' },
      { startTime: '12:15', endTime: '13:15', title: 'Déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '14:00', endTime: '16:00', title: 'Récupération active / kiné', slotKind: 'recovery', sessionType: 'recovery' },
      { startTime: '19:00', endTime: '20:00', title: 'Dîner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '20:30', endTime: '21:00', title: 'Débrief séance', slotKind: 'briefing', sessionType: 'other' },
    ],
  },
  {
    id: 'recovery',
    label: 'Récup',
    shortLabel: 'Récup',
    theme: 'Journée récupération',
    description: 'Charge basse, mobilité, soins',
    slots: [
      { startTime: '07:30', endTime: '08:15', title: 'Petit-déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '09:00', endTime: '10:30', title: 'Sortie récupération', slotKind: 'training', sessionType: 'recovery' },
      { startTime: '11:00', endTime: '12:00', title: 'Mobilité / prépa physique', slotKind: 'recovery', sessionType: 'recovery' },
      { startTime: '12:30', endTime: '13:30', title: 'Déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '15:00', endTime: '17:00', title: 'Soins / repos', slotKind: 'recovery', sessionType: 'rest' },
      { startTime: '19:00', endTime: '20:00', title: 'Dîner', slotKind: 'meal', sessionType: 'other' },
    ],
  },
  {
    id: 'test',
    label: 'Tests',
    shortLabel: 'Tests',
    theme: 'Journée tests',
    description: 'Protocole labo / terrain + récup',
    slots: [
      { startTime: '07:00', endTime: '07:30', title: 'Petit-déjeuner léger', slotKind: 'meal', sessionType: 'other' },
      { startTime: '07:45', endTime: '08:00', title: 'Briefing protocole', slotKind: 'briefing', sessionType: 'other' },
      { startTime: '08:15', endTime: '11:30', title: 'Tests (puissance / lactate)', slotKind: 'test', sessionType: 'test' },
      { startTime: '12:00', endTime: '13:00', title: 'Déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '14:30', endTime: '16:00', title: 'Récupération', slotKind: 'recovery', sessionType: 'recovery' },
      { startTime: '17:00', endTime: '18:00', title: 'Restitution résultats', slotKind: 'briefing', sessionType: 'other' },
      { startTime: '19:00', endTime: '20:00', title: 'Dîner', slotKind: 'meal', sessionType: 'other' },
    ],
  },
  {
    id: 'departure',
    label: 'Départ',
    shortLabel: 'Départ',
    theme: 'Journée départ',
    description: 'Session courte optionnelle + transfert',
    slots: [
      { startTime: '07:00', endTime: '07:45', title: 'Petit-déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '08:00', endTime: '09:30', title: 'Sortie courte / activation', slotKind: 'training', sessionType: 'recovery' },
      { startTime: '10:00', endTime: '11:00', title: 'Rangement matériel', slotKind: 'other', sessionType: 'other' },
      { startTime: '11:30', endTime: '12:30', title: 'Déjeuner', slotKind: 'meal', sessionType: 'other' },
      { startTime: '13:00', endTime: '15:00', title: 'Départ / transfert', slotKind: 'transfer', sessionType: 'other' },
    ],
  },
];

export function buildItemsFromTemplateSlots(
  slots: ProgrammeSlotDraft[],
): CampProgrammeItem[] {
  return sortProgrammeItems(
    slots.map((slot) =>
      emptyCampProgrammeItem({
        startTime: slot.startTime,
        endTime: slot.endTime,
        title: slot.title,
        slotKind: slot.slotKind,
        sessionType: slot.sessionType,
        location: slot.location,
        notes: slot.notes,
      }),
    ),
  );
}

export function applyCampProgrammeTemplate(
  day: CampProgrammeDay,
  templateId: CampProgrammeDayTemplateId,
): CampProgrammeDay {
  const template = CAMP_PROGRAMME_DAY_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return day;
  return {
    ...day,
    theme: template.theme,
    items: buildItemsFromTemplateSlots(template.slots),
  };
}

export function addQuickProgrammeSlot(
  day: CampProgrammeDay,
  quickId: string,
): CampProgrammeDay {
  const quick = CAMP_PROGRAMME_QUICK_SLOTS.find((s) => s.id === quickId);
  if (!quick) return day;
  const item = emptyCampProgrammeItem({
    startTime: quick.startTime,
    endTime: quick.endTime,
    title: quick.title,
    slotKind: quick.slotKind,
    sessionType: quick.sessionType,
  });
  return {
    ...day,
    items: sortProgrammeItems([...day.items, item]),
  };
}

function timeToMinutes(time?: string): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Chevauchements horaires (même jour) pour signaler un timing incohérent. */
export function findProgrammeOverlaps(
  items: CampProgrammeItem[],
): Array<{ aId: string; bId: string }> {
  const timed = sortProgrammeItems(items).filter(
    (item) => timeToMinutes(item.startTime) !== null && timeToMinutes(item.endTime) !== null,
  );
  const overlaps: Array<{ aId: string; bId: string }> = [];
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const aStart = timeToMinutes(timed[i].startTime)!;
      const aEnd = timeToMinutes(timed[i].endTime)!;
      const bStart = timeToMinutes(timed[j].startTime)!;
      const bEnd = timeToMinutes(timed[j].endTime)!;
      if (aStart < bEnd && bStart < aEnd) {
        overlaps.push({ aId: timed[i].id, bId: timed[j].id });
      }
    }
  }
  return overlaps;
}

/** Jours sans créneau — pour appliquer un modèle en masse. */
export function emptyProgrammeDayDates(days: CampProgrammeDay[]): string[] {
  return days.filter((d) => (d.items?.length || 0) === 0).map((d) => d.date);
}

export function applyTemplateToEmptyDays(
  days: CampProgrammeDay[],
  templateId: CampProgrammeDayTemplateId,
  onlyDates?: string[],
): CampProgrammeDay[] {
  const allow = onlyDates ? new Set(onlyDates) : null;
  return days.map((day) => {
    if (allow && !allow.has(day.date)) return day;
    if ((day.items?.length || 0) > 0) return day;
    return applyCampProgrammeTemplate(day, templateId);
  });
}

/** Suggestion de modèle selon la position du jour dans le stage. */
export function suggestTemplateForDayIndex(
  dayIndex: number,
  totalDays: number,
): CampProgrammeDayTemplateId {
  if (totalDays <= 1) return 'endurance';
  if (dayIndex === 0) return 'arrival';
  if (dayIndex === totalDays - 1) return 'departure';
  if (dayIndex === 1) return 'endurance';
  return 'endurance';
}

/** Remplit tout le stage vide avec une structure type Arrivée → Endurance… → Départ. */
export function seedCampProgrammeStructure(
  days: CampProgrammeDay[],
): CampProgrammeDay[] {
  const total = days.length;
  return days.map((day, index) => {
    if ((day.items?.length || 0) > 0) return day;
    return applyCampProgrammeTemplate(day, suggestTemplateForDayIndex(index, total));
  });
}

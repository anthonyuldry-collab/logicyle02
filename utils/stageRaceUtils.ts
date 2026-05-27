import {
  AccommodationStatus,
  MealDay,
  RaceEvent,
  StageDayAccommodation,
  StageDayLogistics,
  StageRaceVehicleKind,
  StageRavitoPoint,
  StageRavitoVehicle,
  StageRiderStartTime,
  StageTransferLogistics,
  StageTransferVehicle,
} from '../types';
import { isStageRace, parseEventDate } from './dateUtils';

export { isStageRace };

/** Marge d'arrivée équipe sur site avant le 1er départ d'un chrono (1h30). */
export const TIME_TRIAL_TEAM_ARRIVAL_LEAD_MINUTES = 90;

/** Heure de référence pour la logistique chrono : champ dédié, sinon 1ère coureuse renseignée. */
export const getTimeTrialFirstDepartTime = (
  premierDepartTime?: string,
  riderStartTimes?: StageRiderStartTime[],
): string | null => {
  if (premierDepartTime?.trim()) return premierDepartTime.trim();
  const fromRiders = (riderStartTimes || []).find(rst => rst.departTime?.trim())?.departTime?.trim();
  return fromRiders || null;
};

const MEAL_DAY_BY_WEEKDAY: Record<number, MealDay> = {
  0: MealDay.DIMANCHE,
  1: MealDay.LUNDI,
  2: MealDay.MARDI,
  3: MealDay.MERCREDI,
  4: MealDay.JEUDI,
  5: MealDay.VENDREDI,
  6: MealDay.SAMEDI,
};

/** Titre affiché pour une étape (ex. « Étape 1 : Ploemeur / Plouay »). */
export const formatStageTitle = (
  stage: Pick<StageDayLogistics, 'stageNumber' | 'stageLabel'>,
): string =>
  `Étape ${stage.stageNumber}${stage.stageLabel ? ` : ${stage.stageLabel}` : ''}`;

/** Titre d'étape par jour de la semaine (jour de course de l'étape). */
export const getStageTitleByMealDay = (event: RaceEvent): Partial<Record<MealDay, string>> => {
  if (!isStageRace(event)) return {};
  const out: Partial<Record<MealDay, string>> = {};
  event.raceInfo?.stageDays?.forEach(stage => {
    if (!stage.date) return;
    try {
      const mealDay = MEAL_DAY_BY_WEEKDAY[new Date(`${stage.date}T12:00:00Z`).getUTCDay()];
      if (mealDay) out[mealDay] = formatStageTitle(stage);
    } catch {
      /* ignore invalid date */
    }
  });
  return out;
};

/** Retire le suffixe « — Étape N : … » des descriptions (affichage en-tête jour). */
export const stripStageTitleFromTimingDescription = (
  description: string,
  stageTitle?: string,
): string => {
  if (stageTitle) {
    const escaped = stageTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return description.replace(new RegExp(`\\s—\\s${escaped}`, 'g'), '').trim();
  }
  return description.replace(/\s—\sÉtape\s+\d+(?:\s*:\s*[^()]+)?/g, '').trim();
};

/** Liste des dates ISO (YYYY-MM-DD) du premier au dernier jour inclus. */
export const getEventDateRange = (startDate: string, endDate: string): string[] => {
  const start = parseEventDate(startDate);
  const end = parseEventDate(endDate);
  if (end < start) return [startDate];

  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

export const createEmptyStageDay = (date: string, stageNumber: number): StageDayLogistics => ({
  id: `stage-${date}-${Date.now()}`,
  date,
  stageNumber,
  stageLabel: '',
  departLocation: '',
  arriveeLocation: '',
  permanenceAddress: '',
  permanenceTime: '',
  permanenceDate: date,
  reunionDSTime: '',
  reunionDSDate: date,
  presentationTime: '',
  departFictifTime: '',
  departReelTime: '',
  arriveePrevueTime: '',
  distanceKm: 0,
  radioFrequency: '',
  isTimeTrial: false,
  premierDepartTime: '',
  riderStartTimes: [],
  ravitoVehicles: [],
  additionalStaffIds: [],
});

/** Synchronise la liste des départs individuels avec les coureuses sélectionnées. */
export const syncRiderStartTimes = (
  existing: StageRiderStartTime[] | undefined,
  selectedRiderIds: string[],
): StageRiderStartTime[] =>
  selectedRiderIds.map((riderId, index) => {
    const found = existing?.find(r => r.riderId === riderId);
    return found ?? { riderId, departTime: '', startOrder: index + 1 };
  });

export const createEmptyTransfer = (fromDate: string, toDate: string): StageTransferLogistics => ({
  id: `transfer-${fromDate}-${toDate}-${Date.now()}`,
  fromDate,
  toDate,
  departLocation: '',
  arriveeLocation: '',
  departTime: '',
  arriveePrevueTime: '',
  distanceKm: undefined,
  duration: '',
  notes: '',
  vehicles: [],
});

export const createEmptyRavitoPoint = (): StageRavitoPoint => ({
  id: `ravito-pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: '',
  location: '',
  arrivalTime: '',
  departureTime: '',
  notes: '',
});

export const createEmptyRavitoVehicle = (
  kind: StageRaceVehicleKind = StageRaceVehicleKind.RAVITO,
): StageRavitoVehicle => ({
  id: `ravito-v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind,
  roleLabel:
    kind === StageRaceVehicleKind.RACE_FOLLOWER
      ? 'Véhicule suiveur course'
      : kind === StageRaceVehicleKind.STAFF_SUPPORT
        ? 'Véhicule staff'
        : 'Véhicule ravito',
  vehicleId: undefined,
  driverId: undefined,
  staffOccupantIds: [],
  directeurSportifStaffId: undefined,
  mecanoStaffId: undefined,
  points: kind === StageRaceVehicleKind.RAVITO ? [createEmptyRavitoPoint()] : [],
  notes: '',
});

/** Préremplit le suiveur course avec le DS et le mécano de l'événement. */
export const createRaceFollowerVehicle = (event: RaceEvent): StageRavitoVehicle => {
  const dsId = event.directeurSportifId?.[0];
  const mecanoId = event.mecanoId?.[0];
  const staffOccupantIds = [...new Set([dsId, mecanoId].filter(Boolean) as string[])];
  return {
    ...createEmptyRavitoVehicle(StageRaceVehicleKind.RACE_FOLLOWER),
    directeurSportifStaffId: dsId,
    mecanoStaffId,
    staffOccupantIds,
  };
};

export const syncRaceFollowerStaffOccupants = (vehicle: StageRavitoVehicle): StageRavitoVehicle => {
  if (vehicle.kind !== StageRaceVehicleKind.RACE_FOLLOWER) return vehicle;
  const ids = new Set(vehicle.staffOccupantIds ?? []);
  if (vehicle.directeurSportifStaffId) ids.add(vehicle.directeurSportifStaffId);
  if (vehicle.mecanoStaffId) ids.add(vehicle.mecanoStaffId);
  return { ...vehicle, staffOccupantIds: [...ids] };
};

export const createEmptyTransferVehicle = (): StageTransferVehicle => ({
  id: `transfer-v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  roleLabel: '',
  vehicleId: undefined,
  driverId: undefined,
  notes: '',
});

export const syncStageDaysWithEvent = (
  existing: StageDayLogistics[] | undefined,
  startDate: string,
  endDate: string,
): StageDayLogistics[] => {
  const dates = getEventDateRange(startDate, endDate);
  return dates.map((date, index) => {
    const existingDay = existing?.find(d => d.date === date);
    if (existingDay) {
      return {
        ...existingDay,
        stageNumber: index + 1,
        permanenceDate: existingDay.permanenceDate || date,
        reunionDSDate: existingDay.reunionDSDate || date,
      };
    }
    return createEmptyStageDay(date, index + 1);
  });
};

/** Date ISO de la veille (nuit d'hébergement avant le jour de course). */
export const getAccommodationNightDate = (stageDate: string): string => {
  const d = parseEventDate(stageDate);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export const createEmptyStageAccommodation = (
  stageDate: string,
  stageNumber: number,
): StageDayAccommodation => {
  const nightDate = getAccommodationNightDate(stageDate);
  return {
  id: `acco-stage-${stageDate}-${Date.now()}`,
  stageDate,
  nightDate,
  date: nightDate,
  stageNumber,
  hotelName: '',
  address: '',
  numberOfNights: 1,
  numberOfPeople: undefined,
  status: AccommodationStatus.A_RESERVER,
  estimatedCost: undefined,
  distanceFromStartKm: undefined,
  travelTimeToStart: '',
  reservationConfirmed: false,
  confirmationDetails: '',
  notes: '',
  isStopover: false,
};
};

export const syncStageAccommodationsWithStages = (
  existing: StageDayAccommodation[] | undefined,
  stageDays: StageDayLogistics[],
): StageDayAccommodation[] =>
  stageDays.map((stage, index) => {
    const nightDate = getAccommodationNightDate(stage.date);
    const existingAcco =
      existing?.find(a => a.stageDate === stage.date)
      ?? existing?.find(a => a.stageNumber === stage.stageNumber)
      ?? existing?.find(a => a.date === stage.date || a.date === nightDate)
      ?? existing?.[index];
    if (existingAcco) {
      const stageDate = existingAcco.stageDate || existingAcco.date || stage.date;
      const resolvedNight =
        existingAcco.nightDate
        || (existingAcco.date && existingAcco.date !== stageDate ? existingAcco.date : getAccommodationNightDate(stageDate));
      return {
        ...existingAcco,
        stageDate: stage.date,
        nightDate: resolvedNight,
        date: resolvedNight,
        stageNumber: stage.stageNumber,
      };
    }
    return createEmptyStageAccommodation(stage.date, stage.stageNumber);
  });

export const syncTransfersWithStages = (
  existing: StageTransferLogistics[] | undefined,
  stageDays: StageDayLogistics[],
): StageTransferLogistics[] => {
  if (stageDays.length < 2) return [];

  const transfers: StageTransferLogistics[] = [];
  for (let i = 0; i < stageDays.length - 1; i++) {
    const fromDate = stageDays[i].date;
    const toDate = stageDays[i + 1].date;
    const existingTransfer =
      existing?.find(t => t.fromDate === fromDate && t.toDate === toDate) ?? existing?.[i];
    transfers.push(
      existingTransfer
        ? { ...existingTransfer, fromDate, toDate }
        : createEmptyTransfer(fromDate, toDate),
    );
  }
  return transfers;
};

/** Met à jour stageDays et transfers selon les dates de l'événement. */
export const ensureStageRaceLogistics = (event: RaceEvent): RaceEvent => {
  if (!isStageRace(event)) return event;

  const stageDays = syncStageDaysWithEvent(
    event.raceInfo?.stageDays,
    event.date,
    event.endDate!,
  );
  const transfers = syncTransfersWithStages(event.raceInfo?.transfers, stageDays);
  const stageAccommodations = syncStageAccommodationsWithStages(
    event.raceInfo?.stageAccommodations,
    stageDays,
  );

  return {
    ...event,
    raceInfo: {
      ...event.raceInfo,
      stageDays,
      transfers,
      stageAccommodations,
    },
  };
};

export const formatStageDateLabel = (date: string): string =>
  parseEventDate(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

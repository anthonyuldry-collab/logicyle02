import {
  EventTransportLeg,
  EventTransportLogisticsPhase,
  StageDayLogistics,
  TransportDirection,
} from '../types';

export const isAllerDirection = (leg: EventTransportLeg): boolean =>
  leg.direction === TransportDirection.ALLER || leg.direction === 'Aller';

export const isJourJDirection = (leg: EventTransportLeg): boolean =>
  leg.direction === TransportDirection.JOUR_J || leg.direction === 'Transport Jour J';

export const isRetourDirection = (leg: EventTransportLeg): boolean =>
  leg.direction === TransportDirection.RETOUR || leg.direction === 'Retour';

const normalizePlace = (value?: string): string =>
  value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') ?? '';

const placesMatch = (a?: string, b?: string): boolean => {
  const na = normalizePlace(a);
  const nb = normalizePlace(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

/** Le trajet concerne uniquement cette date d'étape (évite d'afficher l'étape 2 sur l'étape 1). */
export const legTouchesStageDate = (leg: EventTransportLeg, stageDate: string): boolean => {
  if (leg.stageDate) {
    return leg.stageDate === stageDate;
  }
  const dep = leg.departureDate;
  const arr = leg.arrivalDate;
  if (dep && dep !== stageDate && arr && arr !== stageDate) return false;
  if (dep === stageDate || arr === stageDate) return true;
  return false;
};

export const legMatchesStageDate = (leg: EventTransportLeg, stageDate: string): boolean =>
  legTouchesStageDate(leg, stageDate);

const hasRiderOccupants = (leg: EventTransportLeg): boolean =>
  (leg.occupants || []).some((o) => o.type === 'rider');

const isInterCityTravelLeg = (leg: EventTransportLeg): boolean => {
  const dep = normalizePlace(leg.departureLocation);
  const arr = normalizePlace(leg.arrivalLocation);
  if (!dep || !arr || dep === arr) return false;
  return !placesMatch(leg.departureLocation, leg.arrivalLocation);
};

const isArrivalAtStageStart = (
  leg: EventTransportLeg,
  stage?: Pick<StageDayLogistics, 'departLocation' | 'arriveeLocation'>,
): boolean => {
  if (!stage?.departLocation?.trim()) return false;
  return placesMatch(leg.arrivalLocation, stage.departLocation);
};

export const hasDisplayableTransportContent = (leg: EventTransportLeg): boolean =>
  Boolean(
    leg.departureLocation?.trim() ||
    leg.arrivalLocation?.trim() ||
    leg.assignedVehicleId ||
    (leg.occupants?.length ?? 0) > 0 ||
    leg.mode === 'Vol' ||
    (leg.intermediateStops?.length ?? 0) > 0,
  );

/** Export coureuses : aller/retour toujours ; hors classique seulement si au moins une adresse (évite les entrées vides). */
export const isCoureusesVehicleLogisticsLeg = (leg: EventTransportLeg): boolean => {
  if (isAllerDirection(leg) || isRetourDirection(leg)) return true;
  return Boolean(leg.departureLocation?.trim() || leg.arrivalLocation?.trim());
};

export const isAllerSurCourseLeg = (
  leg: EventTransportLeg,
  stageDate: string,
  stage?: Pick<StageDayLogistics, 'departLocation' | 'arriveeLocation' | 'date'>,
): boolean => {
  if (isRetourDirection(leg)) return false;
  if (!legTouchesStageDate(leg, stageDate)) return false;
  if (leg.logisticsPhase === 'pendant' || leg.logisticsPhase === 'retour') return false;
  if (leg.logisticsPhase === 'aller_course') return true;

  if (isAllerDirection(leg)) {
    return true;
  }

  if (isJourJDirection(leg)) {
    if (hasRiderOccupants(leg)) return true;
    const dep = leg.departureDate;
    const arr = leg.arrivalDate || dep;
    if (dep && dep < stageDate) return true;
    if (arr && arr < stageDate) return true;
    if (isArrivalAtStageStart(leg, stage)) return true;
    if (isInterCityTravelLeg(leg)) return true;
  }

  return false;
};

export const isPendantCourseLeg = (
  leg: EventTransportLeg,
  stageDate: string,
  eventDate?: string,
  stage?: Pick<StageDayLogistics, 'departLocation' | 'arriveeLocation' | 'date'>,
): boolean => {
  if (isRetourDirection(leg) || isAllerDirection(leg)) return false;
  if (!legTouchesStageDate(leg, stageDate)) return false;
  if (isAllerSurCourseLeg(leg, stageDate, stage)) return false;

  if (leg.logisticsPhase === 'aller_course' || leg.logisticsPhase === 'retour') return false;
  if (leg.logisticsPhase === 'pendant') {
    return true;
  }

  if (isJourJDirection(leg)) {
    return false;
  }

  return Boolean(eventDate && stageDate === eventDate);
};

const sortLegsBySchedule = (legs: EventTransportLeg[]): EventTransportLeg[] =>
  [...legs].sort((a, b) => {
    const da = a.departureDate || a.arrivalDate || '';
    const db = b.departureDate || b.arrivalDate || '';
    if (da !== db) return da.localeCompare(db);
    return (a.departureTime || '').localeCompare(b.departureTime || '');
  });

export const getAllerSurCourseLegsForStage = (
  stageDate: string,
  allerLegs: EventTransportLeg[],
  jourJLegs: EventTransportLeg[],
  stage?: StageDayLogistics,
): EventTransportLeg[] => {
  const seen = new Set<string>();
  const out: EventTransportLeg[] = [];
  const push = (leg: EventTransportLeg) => {
    if (seen.has(leg.id)) return;
    if (!hasDisplayableTransportContent(leg)) return;
    seen.add(leg.id);
    out.push(leg);
  };
  allerLegs.forEach((leg) => {
    if (legTouchesStageDate(leg, stageDate) && (isAllerDirection(leg) || leg.logisticsPhase === 'aller_course')) {
      push(leg);
    }
  });
  jourJLegs.forEach((leg) => {
    if (isAllerSurCourseLeg(leg, stageDate, stage)) push(leg);
  });
  return sortLegsBySchedule(out);
};

export const getPendantCourseLegsForStage = (
  stageDate: string,
  jourJLegs: EventTransportLeg[],
  eventDate?: string,
  stage?: StageDayLogistics,
): EventTransportLeg[] =>
  sortLegsBySchedule(
    jourJLegs.filter((leg) => isPendantCourseLeg(leg, stageDate, eventDate, stage)),
  );

export const inferLogisticsPhase = (
  leg: EventTransportLeg,
  stageDate: string,
  stage?: Pick<StageDayLogistics, 'departLocation' | 'arriveeLocation' | 'date'>,
): EventTransportLogisticsPhase => {
  if (leg.logisticsPhase) return leg.logisticsPhase;
  if (isRetourDirection(leg)) return 'retour';
  if (!legTouchesStageDate(leg, stageDate)) return 'aller_course';
  if (isAllerSurCourseLeg(leg, stageDate, stage)) return 'aller_course';
  if (isJourJDirection(leg) && isPendantCourseLeg(leg, stageDate, undefined, stage)) return 'pendant';
  if (isAllerDirection(leg)) return 'aller_course';
  if (isJourJDirection(leg)) return 'aller_course';
  return 'pendant';
};

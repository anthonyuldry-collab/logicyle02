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
    // Emmener les coureurs = Avant, même sous direction technique Jour J
    if (hasRiderOccupants(leg)) return true;
    const dep = leg.departureDate;
    const arr = leg.arrivalDate || dep;
    // Déplacement avant le jour d’étape (veille, etc.) = encore Avant
    if (dep && dep < stageDate) return true;
    if (arr && arr < stageDate) return true;
    // Jour même, staff seul (suiveur, positionnement) → Jour J, pas Avant
    return false;
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
  // Les trajets « Avant » (emmener les coureurs) restent hors Jour J
  if (isAllerSurCourseLeg(leg, stageDate, stage)) return false;

  if (leg.logisticsPhase === 'aller_course' || leg.logisticsPhase === 'retour') return false;
  if (leg.logisticsPhase === 'pendant') return true;

  // Direction technique Jour J + pas un aller-sur-course → en course (suiveur, staff, etc.)
  if (isJourJDirection(leg)) return true;

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

/** Libellés UX des 3 phases du plan de transport (journée de course). */
export const TRANSPORT_PHASE_UI = {
  avant: {
    short: 'Avant',
    long: 'Avant — Départ vers la course',
    hint: 'Départ pour aller à la course (base / hôtel → lieu de départ).',
  },
  pendant: {
    short: 'Pendant',
    long: 'Pendant — En course',
    hint: 'Véhicules pendant l’épreuve (suiveur, ravito, staff). Les coureurs sont sur le vélo.',
  },
  apres: {
    short: 'Après',
    long: 'Après — Retour maison',
    hint: 'Retour à la maison après la course (arrivée → domicile / base).',
  },
} as const;

export type TransportPhaseKey = keyof typeof TRANSPORT_PHASE_UI;

/** Mappe la direction technique (ALLER / JOUR_J / RETOUR) vers Avant / Pendant / Après. */
export function transportDirectionToPhase(
  direction: TransportDirection | string | undefined,
): TransportPhaseKey {
  if (direction === TransportDirection.RETOUR || direction === 'Retour') return 'apres';
  if (direction === TransportDirection.JOUR_J || direction === 'Transport Jour J') return 'pendant';
  return 'avant';
}

/**
 * Préremplit un trajet « Après » : arrivée d’étape → hôtel (nuit suivante / transfert).
 */
export function buildApresStageTransportDefaults(
  stage: StageDayLogistics,
  options?: {
    nextStage?: StageDayLogistics;
    transfer?: {
      arriveeLocation?: string;
      departLocation?: string;
      departTime?: string;
      arriveePrevueTime?: string;
    };
    stageHotel?: { hotelName?: string; address?: string };
    eventHotel?: { hotelName?: string; address?: string };
  },
): Partial<EventTransportLeg> {
  const hotelLabel =
    options?.transfer?.arriveeLocation?.trim() ||
    options?.stageHotel?.address?.trim() ||
    options?.stageHotel?.hotelName?.trim() ||
    options?.eventHotel?.address?.trim() ||
    options?.eventHotel?.hotelName?.trim() ||
    options?.nextStage?.departLocation?.trim() ||
    '';

  const fromArrival =
    stage.arriveeLocation?.trim() ||
    options?.transfer?.departLocation?.trim() ||
    '';

  return {
    direction: TransportDirection.RETOUR,
    stageDate: stage.date,
    departureDate: stage.date,
    arrivalDate: stage.date,
    departureLocation: fromArrival,
    arrivalLocation: hotelLabel,
    departureTime: stage.arriveePrevueTime || options?.transfer?.departTime || '',
    arrivalTime: options?.transfer?.arriveePrevueTime || '',
    logisticsPhase: 'retour',
    details: hotelLabel
      ? `Transfert après l’étape ${stage.stageNumber} : arrivée → hôtel`
      : `Transfert après l’étape ${stage.stageNumber} (arrivée → hôtel)`,
  };
}

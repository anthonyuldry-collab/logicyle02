import { StageDayAccommodation, StageDayLogistics, StageTransferLogistics } from '../../types';

export type StageDayFieldKey = keyof Omit<StageDayLogistics, 'id' | 'date' | 'stageNumber'>;

export const stageDayLocationFields: { key: StageDayFieldKey; label: string; type: 'text' }[] = [
  { key: 'stageLabel', label: 'Intitulé de l\'étape', type: 'text' },
  { key: 'departLocation', label: 'Lieu de départ', type: 'text' },
  { key: 'arriveeLocation', label: 'Lieu d\'arrivée', type: 'text' },
];

const STAGE_DAY_RACE_FIELDS_ALL: { key: StageDayFieldKey; label: string; type: 'text' | 'number' | 'date' }[] = [
  { key: 'permanenceAddress', label: 'Adresse Permanence', type: 'text' },
  { key: 'permanenceTime', label: 'Heure Permanence', type: 'text' },
  { key: 'permanenceDate', label: 'Date Permanence', type: 'date' },
  { key: 'reunionDSTime', label: 'Réunion DS', type: 'text' },
  { key: 'reunionDSDate', label: 'Date Réunion DS', type: 'date' },
  { key: 'presentationTime', label: 'Présentation Équipes', type: 'text' },
  { key: 'departFictifTime', label: 'Départ Fictif', type: 'text' },
  { key: 'departReelTime', label: 'Départ Réel', type: 'text' },
  { key: 'arriveePrevueTime', label: 'Arrivée Prévue', type: 'text' },
  { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
  { key: 'radioFrequency', label: 'Fréquence Radio', type: 'text' },
];

/** Champs course visibles selon le format (contre-la-montre = sans départ fictif ni départ réel groupé). */
export const getVisibleStageDayRaceFields = (isTimeTrial: boolean) =>
  STAGE_DAY_RACE_FIELDS_ALL.filter(f => {
    if (isTimeTrial && (f.key === 'departFictifTime' || f.key === 'departReelTime')) {
      return false;
    }
    return true;
  });

/** @deprecated Préférer getVisibleStageDayRaceFields */
export const stageDayRaceFields = STAGE_DAY_RACE_FIELDS_ALL;

export type StageTransferFieldKey = keyof Omit<StageTransferLogistics, 'id' | 'fromDate' | 'toDate'>;

export type StageAccommodationFieldKey = keyof Omit<
  StageDayAccommodation,
  'id' | 'date' | 'stageDate' | 'nightDate' | 'stageNumber'
>;

export const stageAccommodationFields: {
  key: StageAccommodationFieldKey;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select';
}[] = [
  { key: 'hotelName', label: "Nom de l'hôtel", type: 'text' },
  { key: 'address', label: 'Adresse', type: 'text' },
  { key: 'numberOfNights', label: 'Nombre de nuits', type: 'number' },
  { key: 'numberOfPeople', label: 'Nombre de personnes', type: 'number' },
  { key: 'status', label: 'Statut', type: 'select' },
  { key: 'distanceFromStartKm', label: 'Distance du départ (km)', type: 'number' },
  { key: 'travelTimeToStart', label: 'Temps de trajet jusqu\'au départ', type: 'text' },
  { key: 'estimatedCost', label: 'Coût estimé (€)', type: 'number' },
  { key: 'confirmationDetails', label: 'Détails confirmation', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'reservationConfirmed', label: 'Réservation confirmée', type: 'checkbox' },
  { key: 'isStopover', label: 'Hébergement d\'étape en route', type: 'checkbox' },
];

export const stageTransferFields: { key: StageTransferFieldKey; label: string; type: 'text' | 'number' }[] = [
  { key: 'departLocation', label: 'Lieu de départ (fin d\'étape)', type: 'text' },
  { key: 'arriveeLocation', label: 'Lieu d\'arrivée (prochaine étape / hôtel)', type: 'text' },
  { key: 'departTime', label: 'Heure de départ transfert', type: 'text' },
  { key: 'arriveePrevueTime', label: 'Arrivée prévue transfert', type: 'text' },
  { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
  { key: 'duration', label: 'Durée estimée', type: 'text' },
  { key: 'notes', label: 'Notes (véhicules, convoi, etc.)', type: 'text' },
];

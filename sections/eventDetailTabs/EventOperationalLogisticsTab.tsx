import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { RaceEvent, OperationalLogisticsDay, OperationalTiming, AppState, EventTransportLeg, TransportDirection, TransportMode, MealDay, OperationalTimingCategory, Rider, StaffRole, TransportStopType, StageDayLogistics, RaceInformation, StageRiderStartTime, StageDayAccommodation } from '../../types';
import {
  getStageTitleByMealDay,
  getTimeTrialFirstDepartTime,
  isStageRace,
  stripStageTitleFromTimingDescription,
  TIME_TRIAL_TEAM_ARRIVAL_LEAD_MINUTES,
} from '../../utils/stageRaceUtils';
import { MealDay as MealDayEnum } from '../../types'; // For dayName dropdown
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import TrashIcon from '../../components/icons/TrashIcon';
import InformationCircleIcon from '../../components/icons/InformationCircleIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TruckIcon from '../../components/icons/TruckIcon';
import TrophyIcon from '../../components/icons/TrophyIcon';
import CakeIcon from '../../components/icons/CakeIcon';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';
import HandRaisedIcon from '../../components/icons/HandRaisedIcon';


// --- TIME PARSING UTILITIES ---

// Parses a single time-of-day string (e.g., "14h30", "8:15") into minutes from midnight.
const parseSingleTimeOfDayToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const cleanedTime = timeStr.trim().split('-')[0].trim();
    const parts = cleanedTime.replace(/h/g, ':').split(':');

    if (parts.length > 0) {
        const hours = parseInt(parts[0], 10);
        const minutes = (parts.length > 1 && parts[1]) ? parseInt(parts[1], 10) : 0;
        if (!isNaN(hours) && !isNaN(minutes)) {
            return hours * 60 + minutes;
        }
    }
    return null;
};

// Parses a time-of-day string or range (e.g., "14h30", "9h/12h") into minutes from midnight.
const parseTimeOfDayToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const normalized = timeStr.trim();
    const slashRangeMatch = normalized.match(/^(.+?)\s*\/\s*(.+)$/);
    if (slashRangeMatch) {
        const startMinutes = parseSingleTimeOfDayToMinutes(slashRangeMatch[1]);
        const endMinutes = parseSingleTimeOfDayToMinutes(slashRangeMatch[2]);
        if (startMinutes !== null && endMinutes !== null) {
            return startMinutes;
        }
    }

    const hyphenRangeMatch = normalized.match(/^(\d{1,2}(?:[:h]\d{2})?)\s*-\s*(\d{1,2}(?:[:h]\d{2})?)$/i);
    if (hyphenRangeMatch) {
        const startMinutes = parseSingleTimeOfDayToMinutes(hyphenRangeMatch[1]);
        const endMinutes = parseSingleTimeOfDayToMinutes(hyphenRangeMatch[2]);
        if (startMinutes !== null && endMinutes !== null) {
            return startMinutes;
        }
    }

    return parseSingleTimeOfDayToMinutes(normalized);
};

const arePlanningTimesEqual = (leftTime?: string, rightTime?: string): boolean => {
    const normalizedLeft = (leftTime || '').trim();
    const normalizedRight = (rightTime || '').trim();
    if (normalizedLeft === normalizedRight) return true;

    const leftIsRange = /[\/-]/.test(normalizedLeft);
    const rightIsRange = /[\/-]/.test(normalizedRight);
    if (leftIsRange !== rightIsRange) return false;

    const leftMinutes = parseTimeOfDayToMinutes(leftTime || '');
    const rightMinutes = parseTimeOfDayToMinutes(rightTime || '');
    if (leftMinutes !== null && rightMinutes !== null) return leftMinutes === rightMinutes;
    return false;
};

const parseTransportStopDescription = (description: string) => {
    const match = description.match(/ - (Récupération|Dépose) (.+) par (.+)$/);
    if (!match) return null;
    return {
        location: description.slice(0, description.length - match[0].length),
        action: match[1],
        people: match[2],
        vehicle: match[3],
    };
};

const GROUPED_VEHICLE_DEPARTURE_PATTERN = /^Départ des véhicules \((.+)\)$/;
const SINGLE_VEHICLE_DEPARTURE_PATTERN = /^Départ du (.+)$/;

const looksLikeVehicleDepartureDescription = (description: string): boolean =>
    /^Départ (du|des)\b/.test(description.trim());

const isVehicleDepartureDescription = (description: string): boolean => {
    const trimmed = description.trim();
    return GROUPED_VEHICLE_DEPARTURE_PATTERN.test(trimmed) || SINGLE_VEHICLE_DEPARTURE_PATTERN.test(trimmed);
};

const salvageVehicleNamesFromDepartureDescription = (description: string): string[] => {
    const trimmed = description.trim();
    if (!looksLikeVehicleDepartureDescription(trimmed)) return [];

    const structuredVehicles = extractVehicleNamesFromDepartureDescription(trimmed);
    if (structuredVehicles.length > 0) {
        return structuredVehicles.filter(vehicle => !looksLikeVehicleDepartureDescription(vehicle));
    }

    const vehicles = new Set<string>();
    const singleMatches = trimmed.matchAll(/\bDépart du ([^·,(]+)/g);
    for (const match of singleMatches) {
        const vehicleName = match[1].trim();
        if (vehicleName && !looksLikeVehicleDepartureDescription(vehicleName)) {
            vehicles.add(vehicleName);
        }
    }

    const groupedMatches = trimmed.matchAll(/Départ des véhicules \(([^)]+)\)/g);
    for (const match of groupedMatches) {
        match[1].split(',').forEach(part => {
            const vehicleName = part.trim().replace(/^Départ du /, '').trim();
            if (vehicleName && !looksLikeVehicleDepartureDescription(vehicleName)) {
                vehicles.add(vehicleName);
            }
        });
    }

    return Array.from(vehicles);
};

const normalizeVehicleDepartureDescription = (description: string): string => {
    if (!looksLikeVehicleDepartureDescription(description)) return description;
    const vehicles = salvageVehicleNamesFromDepartureDescription(description);
    if (vehicles.length === 0) return description;
    return formatVehicleDepartureDescription(vehicles);
};

const extractVehicleNamesFromDepartureDescription = (description: string): string[] => {
    const trimmed = description.trim();
    const groupedMatch = trimmed.match(GROUPED_VEHICLE_DEPARTURE_PATTERN);
    if (groupedMatch) {
        return groupedMatch[1].split(',').map(vehicle => vehicle.trim()).filter(Boolean);
    }

    const singleMatch = trimmed.match(SINGLE_VEHICLE_DEPARTURE_PATTERN);
    if (singleMatch) {
        return [singleMatch[1].trim()].filter(Boolean);
    }

    return [];
};

const formatVehicleDepartureDescription = (vehicles: string[]): string => {
    const uniqueVehicles = Array.from(new Set(vehicles.map(vehicle => vehicle.trim()).filter(Boolean)));
    if (uniqueVehicles.length === 0) return 'Départ des véhicules';
    if (uniqueVehicles.length === 1) return `Départ du ${uniqueVehicles[0]}`;
    return `Départ des véhicules (${uniqueVehicles.join(', ')})`;
};

const mergeSameTimeDescriptions = (descriptions: string[]): string => {
    const uniqueDescriptions = Array.from(new Set(descriptions.map(description => description.trim()).filter(Boolean)));
    if (uniqueDescriptions.length <= 1) return uniqueDescriptions[0] || '';

    if (uniqueDescriptions.every(looksLikeVehicleDepartureDescription)) {
        const vehicles = uniqueDescriptions.flatMap(salvageVehicleNamesFromDepartureDescription);
        if (vehicles.length > 0) {
            return formatVehicleDepartureDescription(vehicles);
        }
    }

    const parsedDescriptions = uniqueDescriptions.map(parseTransportStopDescription);
    if (parsedDescriptions.every(Boolean)) {
        const first = parsedDescriptions[0]!;
        const sameTransportStop = parsedDescriptions.every(
            parsed => parsed!.action === first.action
                && parsed!.vehicle === first.vehicle
                && parsed!.location === first.location
        );
        if (sameTransportStop) {
            const people = parsedDescriptions.flatMap(
                parsed => parsed!.people.split(',').map(person => person.trim())
            ).filter(Boolean);
            return `${first.location} - ${first.action} ${people.join(', ')} par ${first.vehicle}`;
        }
    }

    return uniqueDescriptions.join(' · ');
};

const groupPlanningTimingsByTime = (timings: OperationalTiming[]): OperationalTiming[] => {
    if (timings.length <= 1) return timings;

    const groupedTimings: OperationalTiming[] = [];
    let index = 0;

    while (index < timings.length) {
        const currentTiming = timings[index];
        const sameTimeTimings = [currentTiming];
        let nextIndex = index + 1;

        while (nextIndex < timings.length && arePlanningTimesEqual(currentTiming.time, timings[nextIndex].time)) {
            sameTimeTimings.push(timings[nextIndex]);
            nextIndex += 1;
        }

        if (sameTimeTimings.length === 1) {
            groupedTimings.push(currentTiming);
        } else {
            groupedTimings.push({
                ...currentTiming,
                description: mergeSameTimeDescriptions(sameTimeTimings.map(timing => timing.description || '')),
                category: sameTimeTimings.find(timing => timing.category)?.category || currentTiming.category,
            });
        }

        index = nextIndex;
    }

    return groupedTimings;
};

// Parses a duration string (e.g., "1h30", "45min") into total minutes.
const parseDurationToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    let remainingStr = timeStr.toLowerCase().trim();
    let totalMinutes = 0;
    
    const hourMatch = remainingStr.match(/^(\d+(?:\.\d+)?)\s*h/);
    if (hourMatch) {
        totalMinutes += parseFloat(hourMatch[1]) * 60;
        remainingStr = remainingStr.replace(hourMatch[0], '').trim();
    }
    
    const minMatch = remainingStr.match(/^(\d+)\s*(?:min|m)?/);
    if (minMatch && minMatch[1]) {
        totalMinutes += parseInt(minMatch[1], 10);
    }

    return totalMinutes > 0 ? totalMinutes : null;
};

// Formats total minutes from midnight into a time-of-day string (e.g., "14h30").
const formatMinutesToTimeOfDay = (totalMinutes: number): string => {
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
};

// Subtracts a duration in minutes from a time-of-day string.
const subtractDurationFromTimeOfDay = (timeOfDayStr: string, minutesToSubtract: number): string | null => {
    const initialMinutes = parseTimeOfDayToMinutes(timeOfDayStr);
    if (initialMinutes === null) return null;
    const resultMinutes = initialMinutes - minutesToSubtract;
    return formatMinutesToTimeOfDay(resultMinutes);
};

// Arrondit une heure au quart d'heure le plus proche
const roundToNearestQuarter = (timeStr: string): string => {
    const minutes = parseTimeOfDayToMinutes(timeStr);
    if (minutes === null) return timeStr;
    
    // Arrondir au quart d'heure le plus proche (0, 15, 30, 45)
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return formatMinutesToTimeOfDay(roundedMinutes);
};


interface EventOperationalLogisticsTabProps {
  event: RaceEvent;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => void;
  appState: AppState;
  viewMode?: 'team' | 'individual'; // Nouveau prop pour le mode d'affichage
  selectedPersonId?: string; // ID de la personne pour le mode individuel
  setEventTransportLegs?: React.Dispatch<React.SetStateAction<EventTransportLeg[]>>; // Pour synchroniser avec les trajets
  /** Consultation seule (assistants, staff mission…) */
  readOnly?: boolean;
  /** Affichage compact dans un autre onglet (mission assistant) */
  embedded?: boolean;
  /** Catégories masquées (ex. massages gérés ailleurs) */
  excludeCategories?: OperationalTimingCategory[];
}

interface AutoTiming extends OperationalTiming {
    targetMealDay: MealDay;
}

const categoryStyles: Record<OperationalTimingCategory, { icon: React.FC<any>; color: string }> = {
    [OperationalTimingCategory.TRANSPORT]: { icon: TruckIcon, color: 'text-blue-500' },
    [OperationalTimingCategory.COURSE]: { icon: TrophyIcon, color: 'text-green-500' },
    [OperationalTimingCategory.REPAS]: { icon: CakeIcon, color: 'text-orange-500' },
    [OperationalTimingCategory.DIVERS]: { icon: InformationCircleIcon, color: 'text-gray-500' },
    [OperationalTimingCategory.MASSAGE]: { icon: HandRaisedIcon, color: 'text-teal-500' },
};

// Mapping jour français -> getDay() (0 = dimanche, 6 = samedi)
const MEAL_DAY_TO_WEEKDAY: Record<string, number> = {
    [MealDayEnum.DIMANCHE]: 0,
    [MealDayEnum.LUNDI]: 1,
    [MealDayEnum.MARDI]: 2,
    [MealDayEnum.MERCREDI]: 3,
    [MealDayEnum.JEUDI]: 4,
    [MealDayEnum.VENDREDI]: 5,
    [MealDayEnum.SAMEDI]: 6,
};

const isTransportPickupStopType = (stopType: TransportStopType | string | undefined): boolean => {
    if (!stopType) return false;
    const value = String(stopType);
    return value.includes('Récupération') || value.toLowerCase().includes('pickup');
};

const isTransportDropoffStopType = (stopType: TransportStopType | string | undefined): boolean => {
    if (!stopType) return false;
    const value = String(stopType);
    return value.includes('Dépose') || value.toLowerCase().includes('dropoff');
};

const isRetourTransportLeg = (leg: EventTransportLeg): boolean =>
    leg.direction === TransportDirection.RETOUR || leg.direction === 'Retour';

const isAllerTransportLeg = (leg: EventTransportLeg): boolean =>
    leg.direction === TransportDirection.ALLER || leg.direction === 'Aller';

const getTransportStopActionLabel = (
    leg: EventTransportLeg,
    stopType?: TransportStopType | string,
): string | null => {
    if (isAllerTransportLeg(leg)) return 'Récupération';
    if (isRetourTransportLeg(leg)) return 'Dépose';
    if (isTransportDropoffStopType(stopType)) return 'Dépose';
    if (isTransportPickupStopType(stopType)) return 'Récupération';
    return null;
};

const formatDateForPlanning = (dateStr: string): string => {
    try {
        const d = new Date(dateStr + 'T12:00:00Z');
        const day = d.getUTCDate();
        const month = d.getUTCMonth() + 1;
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
    } catch {
        return '—';
    }
};

/** Résumé départ / arrivée pour la grille « Logistique véhicules » du PDF planning. */
const formatLegDepartureForSummary = (leg: EventTransportLeg): string | null => {
    const time = leg.departureTime?.trim();
    const location = leg.departureLocation?.trim();
    if (!time && !location) return null;
    if (time && location) return `${time} de ${location}`;
    if (time) return time;
    return location ? `de ${location}` : null;
};

const formatLegArrivalForSummary = (leg: EventTransportLeg): string | null => {
    const time = leg.arrivalTime?.trim();
    const location = leg.arrivalLocation?.trim();
    if (!time && !location) return null;
    if (time && location) return `${time} à ${location}`;
    if (time) return time;
    return location ? `à ${location}` : null;
};

const getLegStopFallbackDate = (leg: EventTransportLeg, fallbackDate?: string): string | undefined => {
    if (isRetourTransportLeg(leg)) {
        return leg.arrivalDate || leg.departureDate || fallbackDate;
    }
    return leg.departureDate || leg.arrivalDate || fallbackDate;
};

const formatIntermediateStopsToLines = (
    leg: EventTransportLeg,
    stops: EventTransportLeg['intermediateStops'],
    getOccupantName: (id: string, type: 'rider' | 'staff') => string
): string[] => {
    if (!stops?.length) return [];
    return stops.map((stop) => {
        const label = getTransportStopActionLabel(leg, stop.stopType) || 'Étape';
        const datePart = stop.date ? formatDateForPlanning(stop.date) : '';
        const timePart = stop.time?.trim() || '';
        const locationPart = stop.location?.trim() || '';
        const whenWhereParts: string[] = [];
        if (datePart) whenWhereParts.push(datePart);
        if (timePart && locationPart) whenWhereParts.push(`${timePart} à ${locationPart}`);
        else if (timePart) whenWhereParts.push(timePart);
        else if (locationPart) whenWhereParts.push(`à ${locationPart}`);
        const whenWhere = whenWhereParts.join(' — ') || '—';
        const names = (stop.persons || [])
            .map((p) => getOccupantName(p.id, p.type))
            .filter(Boolean)
            .join(', ');
        return names ? `${label} : ${whenWhere} (${names})` : `${label} : ${whenWhere}`;
    });
};

/** Étapes intermédiaires d'un trajet pour le tableau logistique véhicules (lieu, heure, personnes). */
const formatLegIntermediateStopLines = (
    leg: EventTransportLeg,
    getOccupantName: (id: string, type: 'rider' | 'staff') => string,
    dateMatches?: (dateStr: string | undefined) => boolean,
    fallbackDate?: string
): string[] => {
    if (!leg.intermediateStops?.length) return [];
    const stopFallback = getLegStopFallbackDate(leg, fallbackDate);
    let stops = leg.intermediateStops.filter((stop) => {
        if (!dateMatches) return true;
        return dateMatches(stop.date || stopFallback);
    });
    if (stops.length === 0) {
        stops = leg.intermediateStops;
    }
    return formatIntermediateStopsToLines(leg, stops, getOccupantName);
};

/** Supprime emoji et caractères non compatibles Helvetica pour un PDF lisible et professionnel. */
const sanitizeTextForPdf = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // contrôles et DEL
        .replace(/[^\u0020-\u007E\u00A0-\u024F\n]/g, '') // garde ASCII + Latin-1 + Latin étendu (accents)
        .replace(/\n{2,}/g, '\n')
        .trim();
};

/** Associe chaque jour présent dans le planning à une date ISO, y compris hors plage stricte de l'événement. */
const getCompleteDayToIsoDateMap = (event: RaceEvent, dayNames: MealDay[]): Record<string, string> => {
    const out = getDayToIsoDateMap(event);
    const endIso = toIsoDate(event.endDate || event.date);
    if (!endIso) return out;

    const end = new Date(endIso + 'T12:00:00Z');
    const startIso = toIsoDate(event.date) || endIso;
    const start = new Date(startIso + 'T12:00:00Z');
    const needed = new Set(dayNames.filter(dayName => dayName !== MealDayEnum.AUTRE));
    const missing = [...needed].filter(dayName => !out[dayName]);
    if (missing.length === 0) return out;

    const searchStart = new Date(end);
    searchStart.setUTCDate(searchStart.getUTCDate() - 6);
    const effectiveStart = start < searchStart ? new Date(start) : searchStart;

    for (let d = new Date(effectiveStart); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const weekday = d.getUTCDay();
        const key = Object.entries(MEAL_DAY_TO_WEEKDAY).find(([, value]) => value === weekday)?.[0];
        if (key && out[key] === undefined) out[key] = d.toISOString().slice(0, 10);
    }

    const stillMissing = [...needed].filter(dayName => !out[dayName]);
    if (stillMissing.length > 0) {
        const searchEnd = new Date(end);
        searchEnd.setUTCDate(searchEnd.getUTCDate() + 6);
        for (let d = new Date(end); d <= searchEnd; d.setUTCDate(d.getUTCDate() + 1)) {
            const weekday = d.getUTCDay();
            const key = Object.entries(MEAL_DAY_TO_WEEKDAY).find(([, value]) => value === weekday)?.[0];
            if (key && out[key] === undefined) out[key] = d.toISOString().slice(0, 10);
        }
    }

    return out;
};

const sortOperationalLogisticsDays = (
    event: RaceEvent,
    days: OperationalLogisticsDay[],
): OperationalLogisticsDay[] => {
    const dayToIso = getCompleteDayToIsoDateMap(event, days.map(day => day.dayName));
    const fallbackIndex = (dayName: MealDay) => Object.values(MealDayEnum).indexOf(dayName);

    return [...days].sort((a, b) => {
        const aIso = dayToIso[a.dayName];
        const bIso = dayToIso[b.dayName];

        if (aIso && bIso) return aIso.localeCompare(bIso);
        if (aIso && !bIso) return -1;
        if (!aIso && bIso) return 1;
        return fallbackIndex(a.dayName) - fallbackIndex(b.dayName);
    });
};

/** Retourne pour chaque jour (MealDay) la date dd/MM dans la plage event.date -> event.endDate. */
const getDayLabelsForEvent = (event: RaceEvent, dayNames: MealDay[] = []): Record<string, string> => {
    const isoMap = dayNames.length > 0
        ? getCompleteDayToIsoDateMap(event, dayNames)
        : getDayToIsoDateMap(event);
    const out: Record<string, string> = {};
    Object.entries(isoMap).forEach(([dayName, isoDate]) => {
        out[dayName] = formatDateForPlanning(isoDate);
    });
    return out;
};

/** Pour un trajet, retourne l'heure (minutes depuis minuit) du premier événement les jours où dateMatches(date) est vrai. */
const getLegFirstTimeOnDates = (
    leg: EventTransportLeg,
    dateMatches: (dateStr: string | undefined) => boolean,
    fallbackDate?: string
): number => {
    let minMinutes = 9999;
    const add = (date: string | undefined, time: string | undefined) => {
        if (date && dateMatches(date) && time) {
            const m = parseTimeOfDayToMinutes(time);
            if (m !== null && m < minMinutes) minMinutes = m;
        }
    };
    const effectiveDepartureDate = leg.departureDate || fallbackDate;
    const effectiveArrivalDate = leg.arrivalDate || effectiveDepartureDate;
    add(effectiveDepartureDate, leg.departureTime);
    add(effectiveArrivalDate, leg.arrivalTime);
    (leg.intermediateStops || []).forEach(stop => add(stop.date || effectiveDepartureDate, stop.time));
    return minMinutes;
};

/** Événement sur un trajet pour affichage "qui monte, où, quand". */
interface LegDayEvent {
    minutes: number;
    timeStr: string;
    line: string;
}

/** Construit la chronologie du jour pour un trajet : qui monte/descend, où, quand (triée par heure). */
const getLegDayEvents = (
    leg: EventTransportLeg,
    dateMatches: (dateStr: string | undefined) => boolean,
    getOccupantName: (id: string, type: 'rider' | 'staff') => string,
    driverName: string,
    fallbackDate?: string
): LegDayEvent[] => {
    const events: LegDayEvent[] = [];
    const add = (date: string | undefined, time: string | undefined, line: string) => {
        if (!date || !dateMatches(date) || !time) return;
        const m = parseTimeOfDayToMinutes(time);
        if (m === null) return;
        events.push({ minutes: m, timeStr: time, line });
    };

    const occupantsStr = (leg.occupants || []).map(o => getOccupantName(o.id, o.type)).join(', ') || '—';
    const effectiveDepartureDate = leg.departureDate || fallbackDate;
    const effectiveArrivalDate = leg.arrivalDate || effectiveDepartureDate;

    if (effectiveDepartureDate && dateMatches(effectiveDepartureDate) && leg.departureTime) {
        const lieu = leg.departureLocation || '—';
        add(effectiveDepartureDate, leg.departureTime, `Départ ${leg.departureTime} de ${lieu}. Conducteur : ${driverName}. À bord : ${occupantsStr}`);
    }

    (leg.intermediateStops || []).forEach(stop => {
        const stopDate = stop.date || effectiveDepartureDate;
        if (!stopDate || !dateMatches(stopDate)) return;
        const time = stop.time || '—';
        const lieu = stop.location || '—';
        const who = (stop.persons || []).map(p => getOccupantName(p.id, p.type)).join(', ');
        const actionLabel = getTransportStopActionLabel(leg, stop.stopType);
        if (actionLabel === 'Récupération') {
            add(stopDate, stop.time, who ? `Récupération de ${who} à ${time} à ${lieu}` : `Récupération à ${time} à ${lieu}`);
        } else if (actionLabel === 'Dépose') {
            add(stopDate, stop.time, who ? `Dépose de ${who} à ${time} à ${lieu}` : `Dépose à ${time} à ${lieu}`);
        } else {
            add(stopDate, stop.time, who ? `Étape : ${who} à ${time} à ${lieu}` : `Étape à ${time} à ${lieu}`);
        }
    });

    if (effectiveArrivalDate && dateMatches(effectiveArrivalDate) && leg.arrivalTime) {
        const lieu = leg.arrivalLocation || '—';
        add(effectiveArrivalDate, leg.arrivalTime, `Arrivée ${leg.arrivalTime} à ${lieu}. À bord : ${occupantsStr}`);
    }

    events.sort((a, b) => a.minutes - b.minutes);
    return events;
};

/** Normalise une date (YYYY-MM-DD ou DD/MM/YYYY) en YYYY-MM-DD pour comparaison. */
const toIsoDate = (dateStr: string | undefined): string | null => {
    if (!dateStr || !dateStr.trim()) return null;
    const s = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const ddmmyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyy) {
        const [, day, month, year] = ddmmyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    try {
        const d = new Date(s.includes('T') ? s : s + 'T12:00:00Z');
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch {}
    return null;
};

/** Même logique que les timings opérationnels : date → jour de la semaine (MealDay). */
const dayMapPdf: Record<number, MealDay> = { 0: MealDayEnum.DIMANCHE, 1: MealDayEnum.LUNDI, 2: MealDayEnum.MARDI, 3: MealDayEnum.MERCREDI, 4: MealDayEnum.JEUDI, 5: MealDayEnum.VENDREDI, 6: MealDayEnum.SAMEDI };
const getTargetMealDayForPdf = (dateStr: string | undefined): MealDay | null => {
    const iso = toIsoDate(dateStr);
    if (!iso) return null;
    try {
        const w = new Date(iso + 'T12:00:00Z').getUTCDay();
        return dayMapPdf[w] ?? null;
    } catch { return null; }
};

/** Retourne pour chaque MealDay la date ISO (YYYY-MM-DD) dans la plage de l'événement. */
const getDayToIsoDateMap = (event: RaceEvent): Record<string, string> => {
    const out: Record<string, string> = {};
    const start = new Date(event.date + 'T12:00:00Z');
    const endStr = event.endDate || event.date;
    const end = new Date(endStr + 'T12:00:00Z');
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const w = d.getUTCDay();
        const key = Object.entries(MEAL_DAY_TO_WEEKDAY).find(([, v]) => v === w)?.[0];
        if (key && out[key] === undefined) out[key] = d.toISOString().slice(0, 10);
    }
    return out;
};

const getPlanningExportColumnCount = (dayCount: number): number => {
    if (dayCount <= 1) return 1;
    if (dayCount === 2) return 2;
    if (dayCount <= 4) return dayCount;
    return 3;
};

interface ExportPlanningOptions {
    selectedDay?: MealDay | null;
    includeVehicleLogistics?: boolean;
}

/** Pas d'hébergement sur l'export du dernier jour (retour à domicile, pas de nuit à l'hôtel). */
const shouldShowAccommodationInPlanningPdf = (
    event: RaceEvent,
    selectedDay: MealDay | null,
    dayToIso: Record<string, string>
): boolean => {
    if (!selectedDay) return true;
    const endIso = toIsoDate(event.endDate || event.date);
    const selectedIso = toIsoDate(dayToIso[selectedDay]);
    if (!endIso || !selectedIso) return true;
    return selectedIso !== endIso;
};

const exportPlanningToPdf = (
    event: RaceEvent,
    logistics: OperationalLogisticsDay[],
    appState: AppState,
    getOccupantName: (id: string, type: 'rider' | 'staff') => string,
    getVehicleInfo: (vehicleId: string | undefined, leg?: EventTransportLeg) => string,
    options: ExportPlanningOptions = {}
): void => {
    const { selectedDay = null, includeVehicleLogistics = false } = options;
    const sortedLogistics = sortOperationalLogisticsDays(event, logistics);
    const filteredLogistics = selectedDay
        ? sortedLogistics.filter(d => d.dayName === selectedDay)
        : sortedLogistics;
    if (filteredLogistics.length === 0) {
        alert(selectedDay ? 'Aucun timing pour ce jour.' : 'Aucun timing à exporter.');
        return;
    }
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const footerHeight = 10;
    const contentBottomY = pageH - margin - footerHeight;
    const contentW = pageW - 2 * margin;
    const rowGap = 3;
    const colGap = 3;

    const colorCardHeader = [241, 245, 249] as [number, number, number];
    const colorCardBody = [255, 255, 255] as [number, number, number];
    const colorCardStripe = [248, 250, 252] as [number, number, number];
    const colorBorder = [203, 213, 225] as [number, number, number];
    const colorTextPrimary = [15, 23, 42] as [number, number, number];
    const colorTextMuted = [100, 116, 139] as [number, number, number];
    const colorTextOnDark = [241, 245, 249] as [number, number, number];
    const colorTextOnLight = [30, 41, 59] as [number, number, number];
    const colorAccHeader = [30, 41, 59] as [number, number, number];
    const colorTitle = [15, 23, 42] as [number, number, number];
    const colorRaceDay = [220, 38, 38] as [number, number, number];
    const dayLabels = getDayLabelsForEvent(event, filteredLogistics.map(day => day.dayName));
    const stageTitleByMealDay = getStageTitleByMealDay(event);
    const mainEventDayName = event.date
        ? dayMapPdf[new Date(`${event.date}T12:00:00Z`).getUTCDay()]
        : null;

    const titleBlockH = 22;
    const dayHeaderH = 12;
    const blockPadding = 2;
    const lineH = 3.4;
    const timeColW = 14;

    const formatTimingParts = (
        timing: OperationalTiming,
        day: OperationalLogisticsDay,
    ): { time: string; description: string } => {
        let description = timing.description || '';
        const stageTitle = stageTitleByMealDay[day.dayName];
        if (stageTitle) {
            description = stripStageTitleFromTimingDescription(description, stageTitle);
        }
        if (timing.category === OperationalTimingCategory.MASSAGE && timing.personId) {
            description += (description ? ' — ' : '') + getOccupantName(timing.personId, 'rider');
            if (timing.masseurId) description += ' par ' + getOccupantName(timing.masseurId, 'staff');
        }
        return {
            time: sanitizeTextForPdf((timing.time || '').trim() || '—'),
            description: sanitizeTextForPdf(description),
        };
    };

    const getSortedTimings = (day: OperationalLogisticsDay): OperationalTiming[] =>
        [...day.keyTimings].sort(
            (a, b) => (parseTimeOfDayToMinutes(a.time) ?? 9999) - (parseTimeOfDayToMinutes(b.time) ?? 9999)
        );

    const getDescriptionWidth = (currentColWidth: number) =>
        currentColWidth - 2 * blockPadding - timeColW - 2;

    const measureTimingHeight = (
        timing: OperationalTiming,
        day: OperationalLogisticsDay,
        currentColWidth: number,
    ): number => {
        const { description } = formatTimingParts(timing, day);
        const descriptionLines = description
            ? doc.splitTextToSize(description, getDescriptionWidth(currentColWidth))
            : [''];
        return Math.max(descriptionLines.length, 1) * lineH + 0.8;
    };

    const measureDayCardHeight = (day: OperationalLogisticsDay, currentColWidth: number): number => {
        const timings = getSortedTimings(day);
        if (timings.length === 0) return dayHeaderH + 10;
        const bodyHeight = timings.reduce(
            (total, timing) => total + measureTimingHeight(timing, day, currentColWidth),
            blockPadding * 2
        );
        return dayHeaderH + Math.max(bodyHeight, 10);
    };

    let numCols = getPlanningExportColumnCount(filteredLogistics.length);
    let colWidth = (contentW - (numCols - 1) * colGap) / numCols;
    const estimateRowHeight = (columns: number) => {
        const width = (contentW - (columns - 1) * colGap) / columns;
        const rowDays = filteredLogistics.slice(0, columns);
        return Math.max(...rowDays.map(day => measureDayCardHeight(day, width))) + 1;
    };

    if (filteredLogistics.length > 2 && estimateRowHeight(numCols) > contentBottomY - margin - titleBlockH) {
        numCols = Math.min(2, filteredLogistics.length);
        colWidth = (contentW - (numCols - 1) * colGap) / numCols;
    }

    if (filteredLogistics.length === 1) {
        colWidth = Math.min(132, contentW * 0.62);
    }

    const drawPlanningHeader = (y: number, compact = false): number => {
        const headerHeight = compact ? 11 : titleBlockH;
        const headerX = margin;
        const headerW = contentW;

        doc.setFillColor(...colorRaceDay);
        doc.rect(headerX, y, headerW, 1.2, 'F');

        doc.setFillColor(255, 255, 255);
        doc.rect(headerX, y + 1.2, headerW, headerHeight - 1.2, 'F');
        doc.setDrawColor(...colorBorder);
        doc.setLineWidth(0.2);
        doc.line(headerX, y + headerHeight, headerX + headerW, y + headerHeight);

        const centerX = pageW / 2;

        doc.setFontSize(compact ? 12 : 16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorTitle);
        doc.text(sanitizeTextForPdf(event.name), centerX, y + (compact ? 6 : 8), { align: 'center' });

        if (!compact) {
            const dateRange = event.endDate && event.endDate !== event.date
                ? `Du ${formatDateForPlanning(event.date)} au ${formatDateForPlanning(event.endDate)}`
                : `Le ${formatDateForPlanning(event.date)}`;
            const dateLabel = sanitizeTextForPdf(dateRange);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const pillPadX = 5;
            const pillW = doc.getTextWidth(dateLabel) + pillPadX * 2;
            const pillH = 5.5;
            const pillY = y + 11;
            const pillX = centerX - pillW / 2;
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(pillX, pillY, pillW, pillH, 2, 2, 'FD');
            doc.setTextColor(...colorTextPrimary);
            doc.text(dateLabel, centerX, pillY + 3.8, { align: 'center' });

            doc.setFontSize(7.5);
            doc.setTextColor(...colorTextMuted);
            doc.setFont('helvetica', 'normal');
            doc.text('Timing du déplacement', centerX, y + 19, { align: 'center' });
        }

        return y + headerHeight;
    };

    const drawPlanningFooter = () => {
        doc.setFontSize(7);
        doc.setTextColor(...colorTextMuted);
        doc.setFont('helvetica', 'normal');
        doc.text('Timing du déplacement — Logicycle', pageW / 2, pageH - margin + 1, { align: 'center' });
    };

    const drawDayCard = (
        day: OperationalLogisticsDay,
        x: number,
        y: number,
        cardHeight: number,
    ) => {
        const stageTitle = stageTitleByMealDay[day.dayName];
        const dayTitleBase = `${day.dayName.charAt(0).toLowerCase()}${day.dayName.slice(1)}`;
        const dayTitle = stageTitle ? `${dayTitleBase} — ${stageTitle}` : dayTitleBase;
        const dayDateLabel = dayLabels[day.dayName];
        const isWeekend = day.dayName === MealDayEnum.SAMEDI || day.dayName === MealDayEnum.DIMANCHE;
        const isRaceDay = day.dayName === mainEventDayName;
        const timings = getSortedTimings(day);

        const centerX = x + colWidth / 2;

        doc.setFillColor(...colorCardHeader);
        doc.setDrawColor(...colorBorder);
        doc.rect(x, y, colWidth, dayHeaderH, 'FD');

        if (isRaceDay) {
            doc.setFillColor(...colorRaceDay);
            doc.rect(x, y, colWidth, 1.1, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colorTextPrimary);
        const dayTitleDisplay = stageTitle
            ? dayTitleBase.charAt(0).toUpperCase() + dayTitleBase.slice(1)
            : dayTitle.charAt(0).toUpperCase() + dayTitle.slice(1);
        doc.text(dayTitleDisplay, centerX, y + (stageTitle ? 4.8 : 5.5), { align: 'center' });

        if (stageTitle) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...colorTextMuted);
            doc.text(sanitizeTextForPdf(stageTitle), centerX, y + 8.2, { align: 'center' });
        }

        const metaParts: string[] = [];
        if (dayDateLabel) metaParts.push(dayDateLabel);
        if (isWeekend) metaParts.push('Week-end');
        if (isRaceDay) metaParts.push('JOUR J');
        if (metaParts.length > 0) {
            const metaY = y + (stageTitle ? 10.8 : 9.5);
            doc.setFontSize(7);
            if (isRaceDay && metaParts.length > 0) {
                const plainParts = metaParts.filter(p => p !== 'JOUR J');
                const plainText = plainParts.join('  ·  ');
                if (plainText) {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...colorTextMuted);
                    const plainW = doc.getTextWidth(plainText);
                    const jourJW = doc.getTextWidth('JOUR J');
                    const sepW = doc.getTextWidth('  ·  ');
                    const totalW = plainText ? plainW + sepW + jourJW : jourJW;
                    let metaX = centerX - totalW / 2;
                    if (plainText) {
                        doc.text(plainText, metaX, metaY);
                        metaX += plainW + sepW;
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...colorRaceDay);
                    doc.text('JOUR J', metaX, metaY);
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...colorRaceDay);
                    doc.text('JOUR J', centerX, metaY, { align: 'center' });
                }
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colorTextMuted);
                doc.text(metaParts.join('  ·  '), centerX, metaY, { align: 'center' });
            }
        }

        doc.setFillColor(...colorCardBody);
        doc.setDrawColor(...colorBorder);
        doc.rect(x, y + dayHeaderH, colWidth, cardHeight - dayHeaderH, 'FD');

        doc.setFontSize(7);
        let rowY = y + dayHeaderH + blockPadding + 1.5;
        const descriptionW = getDescriptionWidth(colWidth);
        const contentBottom = y + cardHeight - blockPadding;

        timings.forEach((timing, timingIndex) => {
            const { time, description } = formatTimingParts(timing, day);
            if (!time && !description) return;

            const descriptionLines = description
                ? doc.splitTextToSize(description, descriptionW)
                : [''];
            const blockLines = Math.max(descriptionLines.length, 1);
            const blockHeight = blockLines * lineH + 0.8;
            if (rowY + blockHeight > contentBottom) return;

            if (timingIndex % 2 === 0) {
                doc.setFillColor(...colorCardStripe);
                doc.rect(x + 0.4, rowY - 0.8, colWidth - 0.8, blockHeight, 'F');
            }

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colorTextPrimary);
            doc.text(time, x + blockPadding + 1, rowY + 2);
            doc.setFont('helvetica', 'normal');
            descriptionLines.forEach((line: string, lineIndex: number) => {
                doc.text(line, x + blockPadding + 1 + timeColW, rowY + 2 + lineIndex * lineH);
            });
            rowY += blockHeight;
        });
    };

    let bodyStartY = drawPlanningHeader(margin);
    let gridBottomY = bodyStartY;
    const numRows = Math.ceil(filteredLogistics.length / numCols);

    for (let rowIndex = 0; rowIndex < numRows; rowIndex += 1) {
        const rowDays = filteredLogistics.slice(rowIndex * numCols, rowIndex * numCols + numCols);
        const rowHeight = Math.max(...rowDays.map(day => measureDayCardHeight(day, colWidth))) + 1;

        if (gridBottomY + rowHeight > contentBottomY) {
            if (rowIndex > 0) {
                drawPlanningFooter();
                doc.addPage();
                bodyStartY = drawPlanningHeader(margin, true);
                gridBottomY = bodyStartY;
            }
        }

        const rowWidth = rowDays.length * colWidth + (rowDays.length - 1) * colGap;
        const rowStartX = margin + (contentW - rowWidth) / 2;

        rowDays.forEach((day, colIndex) => {
            const x = rowStartX + colIndex * (colWidth + colGap);
            drawDayCard(day, x, gridBottomY, rowHeight);
        });

        gridBottomY += rowHeight + rowGap;
    }

    // Section Logistique véhicules (qui monte, où, quand) — filtrée et triée par date/heure du jour exporté
    if (includeVehicleLogistics && appState.eventTransportLegs) {
        const dayToDate = getDayToIsoDateMap(event);
        const datesToInclude = selectedDay && dayToDate[selectedDay]
            ? [dayToDate[selectedDay]]
            : Object.values(dayToDate).filter(Boolean);
        const datesSet = new Set(datesToInclude);

        // Même logique que les timings opérationnels : un trajet appartient au jour si sa date donne ce jour de la semaine
        const dateMatchesDay = selectedDay
            ? (dateStr: string | undefined) => getTargetMealDayForPdf(dateStr) === selectedDay
            : (dateStr: string | undefined) => {
                const iso = toIsoDate(dateStr);
                return iso !== null && datesSet.has(iso);
            };

        // Attribuer les trajets au bon jour (aligné sur "ordres véhicules" / Transport) : Retour = jour d'arrivée, Aller / Jour J = jour de départ ou d'arrivée ou étape
        const isRetourLeg = (leg: EventTransportLeg) =>
            leg.direction === 'Retour' || leg.direction === TransportDirection.RETOUR;

        const legsTouchingDays = appState.eventTransportLegs.filter(leg => {
            if (leg.eventId !== event.id) return false;
            const fallbackDate = leg.direction === TransportDirection.JOUR_J ? event.date : undefined;
            const effectiveDepartureDate = leg.departureDate || fallbackDate;
            const effectiveArrivalDate = leg.arrivalDate || effectiveDepartureDate;
            const stopOnDay = (leg.intermediateStops || []).some(s => dateMatchesDay(s.date || effectiveDepartureDate));
            if (stopOnDay) return true;
            if (isRetourLeg(leg)) {
                return dateMatchesDay(effectiveArrivalDate);
            }
            // Aller, Transport Jour J : même règle que les timings auto (départ/arrivée/étape ce jour)
            if (dateMatchesDay(effectiveDepartureDate)) return true;
            if (dateMatchesDay(effectiveArrivalDate)) return true;
            return false;
        });

        // Trier : d'abord tous les Aller (et Jour J), puis les Retour ; dans chaque groupe par heure
        const legsForExport = [...legsTouchingDays].sort((a, b) => {
            const aRetour = isRetourLeg(a) ? 1 : 0;
            const bRetour = isRetourLeg(b) ? 1 : 0;
            if (aRetour !== bRetour) return aRetour - bRetour; // Aller (0) avant Retour (1)
            const aFallback = a.direction === TransportDirection.JOUR_J ? event.date : undefined;
            const bFallback = b.direction === TransportDirection.JOUR_J ? event.date : undefined;
            return getLegFirstTimeOnDates(a, dateMatchesDay, aFallback) - getLegFirstTimeOnDates(b, dateMatchesDay, bFallback);
        });

        if (legsForExport.length > 0) {
            gridBottomY += 4;
            const vehHeaderH = 7;
            doc.setFillColor(...colorCardHeader);
            doc.setDrawColor(...colorBorder);
            doc.rect(margin, gridBottomY, contentW, vehHeaderH, 'FD');
            doc.setTextColor(...colorTextPrimary);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('Logistique véhicules', margin + 3, gridBottomY + vehHeaderH / 2 + 1.2);
            doc.setFont('helvetica', 'normal');
            gridBottomY += vehHeaderH;
            doc.setFontSize(7);
            doc.setTextColor(...colorTextOnLight);

            type VehicleCellSummary = {
                driverName: string;
                departureSummary: string | null;
                arrivalSummary: string | null;
                intermediateStopLines: string[];
                occupants: string;
                passengersAtStops: string[];
                passengersActionLabel: 'Qui monte' | 'Dépose';
                hasData: boolean;
            };
            const emptyCellSummary = (): VehicleCellSummary => ({
                driverName: '—',
                departureSummary: null,
                arrivalSummary: null,
                intermediateStopLines: [],
                occupants: '—',
                passengersAtStops: [],
                passengersActionLabel: 'Qui monte',
                hasData: false,
            });

            const vehicleRows = new Map<string, { vehicleName: string; aller: VehicleCellSummary; retour: VehicleCellSummary }>();
            legsForExport.forEach((leg) => {
                const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                const existing = vehicleRows.get(vehicleName) || {
                    vehicleName,
                    aller: emptyCellSummary(),
                    retour: emptyCellSummary(),
                };
                const driver = leg.driverId ? appState.staff.find((s) => s.id === leg.driverId) : null;
                const driverName = driver ? `${driver.firstName} ${driver.lastName}` : '—';
                const occupantsStr = (leg.occupants || []).map((o) => getOccupantName(o.id, o.type)).join(', ') || '—';

                const fallbackDate = leg.direction === TransportDirection.JOUR_J ? event.date : undefined;
                const stopFallback = getLegStopFallbackDate(leg, fallbackDate);
                let stopsForDisplay = (leg.intermediateStops || []).filter((s) =>
                    dateMatchesDay(s.date || stopFallback)
                );
                if (stopsForDisplay.length === 0 && (leg.intermediateStops || []).length > 0) {
                    stopsForDisplay = leg.intermediateStops || [];
                }

                const routeSummary: VehicleCellSummary = {
                    driverName,
                    departureSummary: formatLegDepartureForSummary(leg),
                    arrivalSummary: formatLegArrivalForSummary(leg),
                    intermediateStopLines: formatIntermediateStopsToLines(leg, stopsForDisplay, getOccupantName),
                    occupants: occupantsStr,
                    passengersAtStops: [],
                    passengersActionLabel: isRetourLeg(leg) ? 'Dépose' : 'Qui monte',
                    hasData: true,
                };
                if (isRetourLeg(leg)) {
                    existing.retour = routeSummary;
                } else {
                    existing.aller = routeSummary;
                }
                vehicleRows.set(vehicleName, existing);
            });

            const rows = Array.from(vehicleRows.values());
            const colGap = 1;
            const colW = (contentW - colGap) / 2;

            // En-têtes de colonnes
            doc.setFillColor(226, 232, 240);
            doc.rect(margin, gridBottomY, colW, 5, 'FD');
            doc.rect(margin + colW + colGap, gridBottomY, colW, 5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text('Aller / Jour J', margin + 2, gridBottomY + 3.2);
            doc.text('Retour', margin + colW + colGap + 2, gridBottomY + 3.2);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colorTextOnLight);
            gridBottomY += 5;

            const drawCellSummary = (
                x: number,
                y: number,
                summary: VehicleCellSummary
            ) => {
                const lineH = 2.8;
                if (!summary.hasData) {
                    doc.setFont('helvetica', 'normal');
                    doc.text('—', x, y + 3);
                    return;
                }

                let currentY = y + 3;

                const drawLabeledLine = (label: string, value: string) => {
                    doc.setFont('helvetica', 'normal');
                    doc.text(label, x, currentY);
                    const labelWidth = doc.getTextWidth(label);
                    const valueLines = doc.splitTextToSize(sanitizeTextForPdf(value), colW - 3 - labelWidth);
                    valueLines.forEach((line: string, index: number) => {
                        doc.text(line, x + (index === 0 ? labelWidth : 0), currentY);
                        currentY += lineH;
                    });
                };

                if (summary.departureSummary) {
                    drawLabeledLine('Départ: ', summary.departureSummary);
                }
                if (summary.arrivalSummary) {
                    drawLabeledLine('Arrivée: ', summary.arrivalSummary);
                }

                // Conducteur : nom en gras pour une lecture immédiate
                doc.setFont('helvetica', 'normal');
                doc.text('Conducteur: ', x, currentY);
                const driverLabelWidth = doc.getTextWidth('Conducteur: ');
                doc.setFont('helvetica', 'bold');
                doc.text(sanitizeTextForPdf(summary.driverName), x + driverLabelWidth, currentY);
                doc.setFont('helvetica', 'normal');
                currentY += lineH;

                const aboardLines = doc.splitTextToSize(`À bord: ${sanitizeTextForPdf(summary.occupants)}`, colW - 3);
                aboardLines.forEach((line: string) => {
                    doc.text(line, x, currentY);
                    currentY += lineH;
                });

                if (summary.intermediateStopLines.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Étapes:', x, currentY);
                    doc.setFont('helvetica', 'normal');
                    currentY += lineH;
                    summary.intermediateStopLines.forEach((stopLine) => {
                        const stopLines = doc.splitTextToSize(sanitizeTextForPdf(stopLine), colW - 5);
                        stopLines.forEach((line: string) => {
                            doc.text(line, x + 2, currentY);
                            currentY += lineH;
                        });
                    });
                } else if (summary.passengersAtStops.length > 0) {
                    const passengerText = sanitizeTextForPdf(summary.passengersAtStops.join(', '));
                    const passengerLines = doc.splitTextToSize(`${summary.passengersActionLabel}: ${passengerText}`, colW - 3);
                    passengerLines.forEach((line: string) => {
                        doc.text(line, x, currentY);
                        currentY += lineH;
                    });
                }
            };

            rows.forEach((row) => {
                const countLabeledLines = (label: string, value: string): number => {
                    const labelWidth = doc.getTextWidth(label);
                    return doc.splitTextToSize(sanitizeTextForPdf(value), colW - 3 - labelWidth).length;
                };

                const getSummaryLinesCount = (summary: VehicleCellSummary): number => {
                    if (!summary.hasData) return 1;
                    let count = 2; // Conducteur + au moins une ligne À bord
                    if (summary.departureSummary) {
                        count += countLabeledLines('Départ: ', summary.departureSummary);
                    }
                    if (summary.arrivalSummary) {
                        count += countLabeledLines('Arrivée: ', summary.arrivalSummary);
                    }
                    count += Math.max(1, doc.splitTextToSize(`À bord: ${sanitizeTextForPdf(summary.occupants)}`, colW - 3).length) - 1;
                    if (summary.intermediateStopLines.length > 0) {
                        count += 1; // libellé "Étapes:"
                        summary.intermediateStopLines.forEach((stopLine) => {
                            count += doc.splitTextToSize(sanitizeTextForPdf(stopLine), colW - 5).length;
                        });
                    } else if (summary.passengersAtStops.length > 0) {
                        count += doc.splitTextToSize(
                            `${summary.passengersActionLabel}: ${sanitizeTextForPdf(summary.passengersAtStops.join(', '))}`,
                            colW - 3
                        ).length;
                    }
                    return count;
                };

                const vehicleTitle = sanitizeTextForPdf(row.vehicleName);
                const leftLinesCount = getSummaryLinesCount(row.aller);
                const rightLinesCount = getSummaryLinesCount(row.retour);
                const nbLines = Math.max(leftLinesCount, rightLinesCount, 2);
                const lineHeight = 2.8;
                const rowH = Math.max(8, (nbLines + 1) * lineHeight + 1.5);

                doc.setDrawColor(...colorBorder);
                doc.rect(margin, gridBottomY, colW, rowH, 'S');
                doc.rect(margin + colW + colGap, gridBottomY, colW, rowH, 'S');

                doc.setFont('helvetica', 'bold');
                doc.text(vehicleTitle, margin + 1.5, gridBottomY + 3);
                doc.setFont('helvetica', 'normal');

                drawCellSummary(margin + 1.5, gridBottomY + 3.2, row.aller);
                drawCellSummary(margin + colW + colGap + 1.5, gridBottomY + 3.2, row.retour);

                gridBottomY += rowH;
            });
            gridBottomY += 3;
        }
    }

    const dayToIsoForExport = getDayToIsoDateMap(event);
    const accommodations = appState.eventAccommodations.filter(a => a.eventId === event.id);
    if (
        accommodations.length > 0
        && shouldShowAccommodationInPlanningPdf(event, selectedDay, dayToIsoForExport)
    ) {
        const accHeaderH = 7;
        let y = gridBottomY + 4;
        doc.setFillColor(...colorCardHeader);
        doc.setDrawColor(...colorBorder);
        doc.rect(margin, y, contentW, accHeaderH, 'FD');
        doc.setTextColor(...colorTextPrimary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Hébergement', margin + 3, y + accHeaderH / 2 + 1.2);
        doc.setFont('helvetica', 'normal');
        y += accHeaderH;
        doc.setFillColor(...colorCardBody);
        doc.setFontSize(8);
        doc.setTextColor(...colorTextPrimary);
        let accBodyHeight = 4;
        accommodations.forEach(acc => {
            if (acc.hotelName) accBodyHeight += 4.5;
            if (acc.address) {
                accBodyHeight += doc.splitTextToSize(sanitizeTextForPdf(acc.address), contentW - 8).length * 3.2;
            }
            accBodyHeight += 2;
        });
        doc.rect(margin, y, contentW, accBodyHeight, 'FD');
        let contentY = y + 3;
        accommodations.forEach(acc => {
            if (acc.hotelName) {
                doc.setFont('helvetica', 'bold');
                doc.text(sanitizeTextForPdf(acc.hotelName), margin + 3, contentY);
                doc.setFont('helvetica', 'normal');
                contentY += 4.5;
            }
            if (acc.address) {
                doc.setFontSize(7);
                doc.setTextColor(...colorTextMuted);
                doc.splitTextToSize(sanitizeTextForPdf(acc.address), contentW - 8).forEach((line: string) => {
                    doc.text(line, margin + 3, contentY);
                    contentY += 3.2;
                });
                doc.setFontSize(8);
                doc.setTextColor(...colorTextPrimary);
            }
            contentY += 2;
        });
    }

    drawPlanningFooter();

    const baseName = event.name.replace(/[^a-zA-Z0-9\-_\s]/g, '').trim().replace(/\s+/g, '_');
    const daySuffix = selectedDay ? `_${selectedDay.charAt(0).toLowerCase()}${selectedDay.slice(1)}` : '';
    doc.save(`Planning_${baseName}${daySuffix}.pdf`);
};

const EventOperationalLogisticsTab: React.FC<EventOperationalLogisticsTabProps> = ({ 
  event, 
  updateEvent, 
  appState, 
  viewMode = 'team', 
  selectedPersonId,
  setEventTransportLegs,
  readOnly = false,
  embedded = false,
  excludeCategories = [],
}) => {
  const allowEditing = !readOnly;
  const excluded = useMemo(() => new Set(excludeCategories), [excludeCategories]);

  const visibleTimingsForDay = (timings: OperationalTiming[]) =>
    excluded.size > 0 ? timings.filter(t => !excluded.has(t.category)) : timings;
  const [logistics, setLogistics] = useState<OperationalLogisticsDay[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [deletedAutoTimings, setDeletedAutoTimings] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'day'>('all');
  const [exportSelectedDay, setExportSelectedDay] = useState<MealDay | null>(null);
  const [exportIncludeVehicles, setExportIncludeVehicles] = useState(false);

  useEffect(() => {
    setLogistics(structuredClone(event.operationalLogistics || []));
  }, [event.operationalLogistics]);

  const getOccupantName = (occupantId: string, type: 'rider' | 'staff'): string => {
    const person = type === 'rider'
      ? appState.riders.find(r => r.id === occupantId)
      : appState.staff.find(s => s.id === occupantId);
    return person ? `${person.firstName} ${person.lastName}` : 'Inconnu';
  };

  const getVehicleInfo = (vehicleId: string | undefined, leg?: EventTransportLeg): string => {
    const isPersonalVehicle =
      vehicleId === 'perso'
      || leg?.mode === TransportMode.VOITURE_PERSO
      || leg?.mode === 'Voiture Personnelle';
    if (isPersonalVehicle) return 'Véhicule personnel';
    if (!vehicleId) return 'Véhicule personnel';
    const vehicle = appState.vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Véhicule inconnu';
  };

  const getAllVehiclesInfo = (leg: EventTransportLeg): string => {
    const vehicles: string[] = [];
    
    // Véhicule principal
    if (leg.assignedVehicleId) {
      vehicles.push(getVehicleInfo(leg.assignedVehicleId));
    }
    
    // Ajouter "Véhicule personnel" si il y a des occupants qui utilisent leur véhicule personnel
    // (logique basée sur le fait que certains occupants peuvent avoir leur propre véhicule)
    if (leg.occupants && leg.occupants.length > 0) {
      // Pour l'instant, on ajoute "Véhicule personnel" si il y a des occupants
      // Cette logique peut être affinée selon les besoins
      if (!vehicles.includes('Véhicule personnel')) {
        vehicles.push('Véhicule personnel');
      }
    }
    
    return vehicles.join(', ');
  };



  const autoGeneratedTimings = useMemo(() => {
    const timings: AutoTiming[] = [];
    const dayMap: Record<number, MealDayEnum> = { 0: MealDayEnum.DIMANCHE, 1: MealDayEnum.LUNDI, 2: MealDayEnum.MARDI, 3: MealDayEnum.MERCREDI, 4: MealDayEnum.JEUDI, 5: MealDayEnum.VENDREDI, 6: MealDayEnum.SAMEDI };
    const getTargetMealDay = (dateStr: string | undefined): MealDay | null => {
        if (!dateStr) return null;
        try {
            return dayMap[new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
        } catch { return null; }
    };
    // Fonction pour déterminer si un trajet est individuel (vol personnel, etc.)
    const isIndividualTrip = (leg: EventTransportLeg): boolean => {
        // Un trajet est considéré comme individuel SEULEMENT si :
        // 1. C'est un vol (mode VOL)
        // 2. OU c'est un trajet personnel spécifique (ex: vol d'Axelle)
        // Les véhicules du club (voitures, camping-cars, camions) sont TOUJOURS affichés
        return leg.mode === TransportMode.VOL || 
               leg.details?.toLowerCase().includes('personnel') ||
               leg.details?.toLowerCase().includes('individuel');
    };
    
    // Fonction pour déterminer si un trajet doit être affiché selon le mode
    const shouldShowInTiming = (leg: EventTransportLeg): boolean => {
        if (viewMode === 'individual' && selectedPersonId) {
            // Mode individuel : afficher tous les trajets de cette personne
            return leg.occupants?.some(occ => occ.id === selectedPersonId) || false;
        } else {
            // Mode équipe : afficher TOUS les véhicules du club
            // Seuls les vols personnels sont exclus
            if (leg.mode === TransportMode.VOL) {
                // Pour les vols, afficher seulement s'ils ont des étapes importantes
                return leg.intermediateStops && leg.intermediateStops.length > 0;
            } else {
                // Tous les autres véhicules (voitures, camping-cars, camions) sont TOUJOURS affichés
                return true;
            }
        }
    };
    
    appState.eventTransportLegs.filter(leg => leg.eventId === event.id).forEach(leg => {
        // Filtrer les trajets selon le mode d'affichage
        if (!shouldShowInTiming(leg)) {
            return; // Skip les trajets non pertinents
        }
        
        const isIndividual = isIndividualTrip(leg);
        
                // Afficher les départs de véhicules (sauf véhicules personnels)
        const fallbackDate = leg.direction === TransportDirection.JOUR_J ? event.date : undefined;
        const effectiveDepartureDate = leg.departureDate || fallbackDate;
        const effectiveArrivalDate = leg.arrivalDate || effectiveDepartureDate;

        if (effectiveDepartureDate && leg.departureTime) {
            const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
            
            // Ne pas afficher les départs des véhicules personnels
            if (leg.assignedVehicleId !== 'perso') {
                const targetDay = getTargetMealDay(effectiveDepartureDate);
                if (targetDay) {
                    const description = `Départ du ${vehicleName}`;
                    timings.push({
                        id: `auto-transport-depart-${leg.id}`,
                        time: leg.departureTime,
                        description: description,
                        isAutoGenerated: true,
                        targetMealDay: targetDay,
                        category: OperationalTimingCategory.TRANSPORT
                    });
                }
            }
        }
                // Afficher toutes les arrivées de véhicules (collectifs et individuels)
        if (effectiveArrivalDate && leg.arrivalTime) {
            const targetDay = getTargetMealDay(effectiveArrivalDate);
            if (targetDay) {
                // Créer une description détaillée pour le jour J
                let description = '';
                
                // Format simple pour les arrivées
                const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                if (leg.arrivalLocation) {
                    description = `Arrivée des véhicules à ${leg.arrivalLocation} (${vehicleName})`;
                } else {
                    description = `Arrivée du ${vehicleName}`;
                }
                
                timings.push({
                    id: `auto-transport-arrivee-${leg.id}`,
                    time: leg.arrivalTime,
                    description: description,
                    isAutoGenerated: true,
                    targetMealDay: targetDay,
                    category: OperationalTimingCategory.TRANSPORT
                });
            }
        }
        // Add intermediate stops to the timeline
        if (leg.intermediateStops && leg.intermediateStops.length > 0) {
            leg.intermediateStops.forEach(stop => {
                const targetDay = getTargetMealDay(stop.date || effectiveDepartureDate);
                if (targetDay && stop.time) {
                    // Informations sur le véhicule pour cette étape
                    const vehicleInfo = getVehicleInfo(leg.assignedVehicleId);
                    
                    // Déterminer le type d'étape avec emoji
                    let stopTypeLabel = '';
                    let emoji = '';
                    let isSimpleFormat = false;
                    
                    switch (stop.stopType) {
                        case 'AIRPORT_ARRIVAL':
                        case 'Arrivée aéroport':
                            stopTypeLabel = 'Vol arrive';
                            emoji = '✈️';
                            isSimpleFormat = true;
                            break;
                        case 'TRAIN_STATION_ARRIVAL':
                        case 'Arrivée gare':
                            stopTypeLabel = 'Train arrive';
                            emoji = '🚂';
                            isSimpleFormat = true;
                            break;
                        case 'PICKUP':
                        case 'Récupération':
                            stopTypeLabel = 'Récupération';
                            emoji = '👥';
                            break;
                        case 'DROPOFF':
                        case 'Dépose':
                            stopTypeLabel = 'Dépose';
                            emoji = '🚪';
                            break;
                        case 'MEETING_POINT':
                        case 'Lieu de rendez-vous':
                            stopTypeLabel = 'Rendez-vous';
                            emoji = '📍';
                            break;
                        case 'HOME_PICKUP':
                        case 'Récupération domicile':
                            stopTypeLabel = 'Récupération domicile';
                            emoji = '🏠';
                            break;
                        default:
                            stopTypeLabel = 'Étape';
                            emoji = '🛑';
                    }

                    const personsConcerned = stop.persons.map(p => getOccupantName(p.id, p.type)).join(', ');
                    let description = '';
                    const actionLabel = getTransportStopActionLabel(leg, stop.stopType);

                    if (personsConcerned && actionLabel) {
                        const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                        description = `${stop.location} - ${actionLabel} ${personsConcerned} par ${vehicleName}`;
                    } else if (personsConcerned) {
                        const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                        description = `${stop.location} - ${personsConcerned} par ${vehicleName}`;
                    } else {
                        description = `${stop.location}`;
                    }

                    timings.push({
                        id: `auto-stop-${stop.id}`,
                        time: stop.time,
                        description: description,
                        isAutoGenerated: true,
                        targetMealDay: targetDay,
                        category: OperationalTimingCategory.TRANSPORT
                    });
                }
            });
        }
    });

    const { raceInfo } = event;
    const stageDaysList = raceInfo?.stageDays?.filter(d => d.date) ?? [];

    const locationSuffix = (depart?: string, arrivee?: string) => {
      const parts: string[] = [];
      if (depart?.trim()) parts.push(`départ: ${depart.trim()}`);
      if (arrivee?.trim()) parts.push(`arrivée: ${arrivee.trim()}`);
      return parts.length ? ` (${parts.join(' · ')})` : '';
    };

    const getRiderDisplayName = (riderId: string) => {
      const rider = appState.riders.find(r => r.id === riderId);
      return rider ? `${rider.firstName} ${rider.lastName}` : 'Coureuse';
    };

    const appendTimeTrialArrivalOnSite = (
      premierDepartTime: string | undefined,
      riderStartTimes: StageRiderStartTime[] | undefined,
      timingId: string,
      suffix: string,
      mainEventDay: MealDay,
    ) => {
      const firstDepart = getTimeTrialFirstDepartTime(premierDepartTime, riderStartTimes);
      if (!firstDepart) return;
      const arrivalOnSiteTime = subtractDurationFromTimeOfDay(
        firstDepart,
        TIME_TRIAL_TEAM_ARRIVAL_LEAD_MINUTES,
      );
      if (!arrivalOnSiteTime) return;
      timings.push({
        id: timingId,
        time: arrivalOnSiteTime,
        description: `📍 Arrivée sur site (1h30 avant 1er départ)${suffix}`,
        isAutoGenerated: true,
        targetMealDay: mainEventDay,
        category: OperationalTimingCategory.COURSE,
      });
    };

    const appendRiderDepartureTimings = (
      riderStartTimes: StageRiderStartTime[] | undefined,
      idPrefix: string,
      suffix: string,
      mainEventDay: MealDay,
    ) => {
      const sorted = [...(riderStartTimes || [])]
        .filter(rst => rst.departTime?.trim())
        .sort((a, b) => {
          const orderA = a.startOrder ?? 999;
          const orderB = b.startOrder ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return getRiderDisplayName(a.riderId).localeCompare(getRiderDisplayName(b.riderId), 'fr');
        });
      sorted.forEach(rst => {
        timings.push({
          id: `${idPrefix}-${rst.riderId}`,
          time: rst.departTime,
          description: `🏁 Départ ${getRiderDisplayName(rst.riderId)}${suffix}`,
          isAutoGenerated: true,
          targetMealDay: mainEventDay,
          category: OperationalTimingCategory.COURSE,
        });
      });
    };

    const appendStageDayTimings = (stage: StageDayLogistics) => {
      const mainEventDay = getTargetMealDay(stage.date);
      if (!mainEventDay) return;
      const suffix = locationSuffix(stage.departLocation, stage.arriveeLocation);

      if (stage.permanenceTime) {
        const targetDay = getTargetMealDay(stage.permanenceDate) || mainEventDay;
        if (targetDay) {
          timings.push({
            id: `auto-permanence-${stage.id}`,
            time: stage.permanenceTime,
            description: `📋 Permanence${suffix}`,
            isAutoGenerated: true,
            targetMealDay: targetDay,
            category: OperationalTimingCategory.COURSE,
          });
        }
      }

      if (stage.reunionDSTime) {
        const targetDay = getTargetMealDay(stage.reunionDSDate) || getTargetMealDay(stage.permanenceDate) || mainEventDay;
        if (targetDay) {
          timings.push({
            id: `auto-reunionDS-${stage.id}`,
            time: stage.reunionDSTime,
            description: '👥 Réunion Directeurs Sportifs',
            isAutoGenerated: true,
            targetMealDay: targetDay,
            category: OperationalTimingCategory.COURSE,
          });
        }
      }

      if (stage.isTimeTrial) {
        appendRiderDepartureTimings(
          stage.riderStartTimes,
          `auto-depart-rider-${stage.id}`,
          suffix,
          mainEventDay,
        );
        appendTimeTrialArrivalOnSite(
          stage.premierDepartTime,
          stage.riderStartTimes,
          `auto-arriveeSite-${stage.id}`,
          suffix,
          mainEventDay,
        );
      } else {
        if (stage.departReelTime) {
          timings.push({
            id: `auto-departReel-${stage.id}`,
            time: stage.departReelTime,
            description: `🏁 Départ Réel${suffix}`,
            isAutoGenerated: true,
            targetMealDay: mainEventDay,
            category: OperationalTimingCategory.COURSE,
          });
          const mealTime = subtractDurationFromTimeOfDay(stage.departReelTime, 180);
          if (mealTime) {
            timings.push({
              id: `auto-repas-${stage.id}`,
              time: mealTime,
              description: '🍽️ Repas',
              isAutoGenerated: true,
              targetMealDay: mainEventDay,
              category: OperationalTimingCategory.REPAS,
            });
          }
        }

        if (stage.departFictifTime) {
          timings.push({
            id: `auto-departFictif-${stage.id}`,
            time: stage.departFictifTime,
            description: `🚩 Départ Fictif${suffix}`,
            isAutoGenerated: true,
            targetMealDay: mainEventDay,
            category: OperationalTimingCategory.COURSE,
          });
        }
      }

      if (stage.presentationTime) {
        timings.push({
          id: `auto-presentation-${stage.id}`,
          time: stage.presentationTime,
          description: '🎤 Présentation des équipes',
          isAutoGenerated: true,
          targetMealDay: mainEventDay,
          category: OperationalTimingCategory.COURSE,
        });
        if (!stage.isTimeTrial) {
          const arrivalOnSiteTime = subtractDurationFromTimeOfDay(stage.presentationTime, 30);
          if (arrivalOnSiteTime) {
            timings.push({
              id: `auto-arriveeSite-${stage.id}`,
              time: arrivalOnSiteTime,
              description: '📍 Arrivée sur site',
              isAutoGenerated: true,
              targetMealDay: mainEventDay,
              category: OperationalTimingCategory.COURSE,
            });
          }
        }
      }

      if (stage.arriveePrevueTime) {
        timings.push({
          id: `auto-arrivee-${stage.id}`,
          time: stage.arriveePrevueTime,
          description: `🏆 Arrivée Prévue${suffix}`,
          isAutoGenerated: true,
          targetMealDay: mainEventDay,
          category: OperationalTimingCategory.COURSE,
        });
      }
    };

    const appendTransferTimings = (info: RaceInformation) => {
      info.transfers?.forEach((transfer, index) => {
        const locNote = [transfer.departLocation, transfer.arriveeLocation].filter(Boolean).join(' → ');
        const locSuffix = locNote ? ` (${locNote})` : '';

        // Départ après la course : jour de fin d'étape (pas mélangé avec le déroulé « pendant »)
        if (transfer.departTime) {
          const departDay = getTargetMealDay(transfer.fromDate);
          if (departDay) {
            timings.push({
              id: `auto-transfer-depart-${transfer.id}`,
              time: transfer.departTime,
              description: `🚌 Après étape ${index + 1} — départ transfert${locSuffix}`,
              isAutoGenerated: true,
              targetMealDay: departDay,
              category: OperationalTimingCategory.TRANSPORT,
            });
          }
        }
        // Arrivée vers l'étape suivante (souvent le lendemain)
        if (transfer.arriveePrevueTime) {
          const arrivalDay = getTargetMealDay(transfer.toDate) || getTargetMealDay(transfer.fromDate);
          if (arrivalDay) {
            timings.push({
              id: `auto-transfer-arrivee-${transfer.id}`,
              time: transfer.arriveePrevueTime,
              description: `🏁 Arrivée vers étape ${index + 2}${locSuffix}`,
              isAutoGenerated: true,
              targetMealDay: arrivalDay,
              category: OperationalTimingCategory.TRANSPORT,
            });
          }
        }
      });
    };

    if (raceInfo && isStageRace(event) && stageDaysList.length > 0) {
      stageDaysList.forEach(appendStageDayTimings);
      appendTransferTimings(raceInfo);
    } else if (raceInfo) {
      // Jour J : event.date en priorité, sinon permanence ou réunion DS pour que les départs apparaissent
      const mainEventDay = getTargetMealDay(event.date)
        || getTargetMealDay(raceInfo.permanenceDate)
        || getTargetMealDay(raceInfo.reunionDSDate);
      
      // Permanence
      if (raceInfo.permanenceTime) {
        const targetDay = getTargetMealDay(raceInfo.permanenceDate) || mainEventDay;
        if (targetDay) {
          timings.push({ 
            id: 'auto-permanence', 
            time: raceInfo.permanenceTime, 
            description: '📋 Permanence', 
            isAutoGenerated: true, 
            targetMealDay: targetDay, 
            category: OperationalTimingCategory.COURSE 
          });
        }
      }
      
      // Réunion Directeurs Sportifs
      if (raceInfo.reunionDSTime) {
        const targetDay = getTargetMealDay(raceInfo.reunionDSDate) || getTargetMealDay(raceInfo.permanenceDate) || mainEventDay;
        if (targetDay) {
          timings.push({ 
            id: 'auto-reunionDS', 
            time: raceInfo.reunionDSTime, 
            description: "👥 Réunion Directeurs Sportifs", 
            isAutoGenerated: true, 
            targetMealDay: targetDay, 
            category: OperationalTimingCategory.COURSE 
          });
        }
      }
      
      // Jour J - Événements principaux (départs course, présentation, arrivée sur site)
      if (mainEventDay) {
        if (raceInfo.isTimeTrial) {
          appendRiderDepartureTimings(
            raceInfo.riderStartTimes,
            'auto-depart-rider',
            '',
            mainEventDay,
          );
          appendTimeTrialArrivalOnSite(
            raceInfo.premierDepartTime,
            raceInfo.riderStartTimes,
            'auto-arriveeSite',
            '',
            mainEventDay,
          );
        } else {
          // Départ réel de la course (toujours affiché si renseigné)
          if (raceInfo.departReelTime) {
            timings.push({ 
              id: 'auto-departReel', 
              time: raceInfo.departReelTime, 
              description: '🏁 Départ Réel', 
              isAutoGenerated: true, 
              targetMealDay: mainEventDay, 
              category: OperationalTimingCategory.COURSE 
            });
            
            // Repas avant le départ (3h avant)
            const mealTime = subtractDurationFromTimeOfDay(raceInfo.departReelTime, 180);
            if (mealTime) {
              timings.push({ 
                id: 'auto-repas', 
                time: mealTime, 
                description: '🍽️ Repas', 
                isAutoGenerated: true, 
                targetMealDay: mainEventDay, 
                category: OperationalTimingCategory.REPAS 
              });
            }
          }
          
          // Départ fictif (toujours affiché si renseigné)
          if (raceInfo.departFictifTime) {
            timings.push({ 
              id: 'auto-departFictif', 
              time: raceInfo.departFictifTime, 
              description: '🚩 Départ Fictif', 
              isAutoGenerated: true, 
              targetMealDay: mainEventDay, 
              category: OperationalTimingCategory.COURSE 
            });
          }
        }
        
        // Présentation des équipes
        if (raceInfo.presentationTime) {
          timings.push({ 
            id: 'auto-presentation', 
            time: raceInfo.presentationTime, 
            description: '🎤 Présentation des équipes', 
            isAutoGenerated: true, 
            targetMealDay: mainEventDay, 
            category: OperationalTimingCategory.COURSE 
          });
          
          if (!raceInfo.isTimeTrial) {
            // Arrivée sur site (30min avant présentation)
            const arrivalOnSiteTime = subtractDurationFromTimeOfDay(raceInfo.presentationTime, 30);
            if (arrivalOnSiteTime) {
              timings.push({ 
                id: 'auto-arriveeSite', 
                time: arrivalOnSiteTime, 
                description: '📍 Arrivée sur site', 
                isAutoGenerated: true, 
                targetMealDay: mainEventDay, 
                category: OperationalTimingCategory.COURSE 
              });
            }
          }
        }
        
        // Arrivée prévue
        if (raceInfo.arriveePrevueTime) {
          const arrivalDay = getTargetMealDay(event.endDate || event.date);
          if (arrivalDay) {
            timings.push({ 
              id: 'auto-arrivee', 
              time: raceInfo.arriveePrevueTime, 
              description: '🏆 Arrivée Prévue', 
              isAutoGenerated: true, 
              targetMealDay: arrivalDay, 
              category: OperationalTimingCategory.COURSE 
            });
          }
        }
      }
    }
    
    // Départ Hôtel et petit-déjeuner : à partir de l'arrivée sur site (temps de trajet hébergement)
    const globalAccommodation = appState.eventAccommodations.find(
      a => a.eventId === event.id && !a.isStopover,
    );

    const appendHotelAndBreakfastTimings = (
      referenceArrivalTime: string | null,
      dayForHotel: MealDay | null,
      travelTimeToStart: string | undefined,
      hotelId: string,
      breakfastId: string,
    ) => {
      if (!referenceArrivalTime || !dayForHotel || !travelTimeToStart?.trim()) return;
      const travelDurationMinutes = parseDurationToMinutes(travelTimeToStart);
      if (travelDurationMinutes === null) return;
      const totalTravelMinutesWithMargin = Math.ceil(travelDurationMinutes * 1.1);
      const hotelDepartureTime = subtractDurationFromTimeOfDay(
        referenceArrivalTime,
        totalTravelMinutesWithMargin,
      );
      if (!hotelDepartureTime) return;
      if (!timings.some(t => t.id === hotelId)) {
        timings.push({
          id: hotelId,
          time: hotelDepartureTime,
          description: '🏨 Départ Hôtel',
          isAutoGenerated: true,
          targetMealDay: dayForHotel,
          category: OperationalTimingCategory.TRANSPORT,
        });
      }
      if (!timings.some(t => t.id === breakfastId)) {
        const breakfastTime = subtractDurationFromTimeOfDay(hotelDepartureTime, 90);
        if (breakfastTime) {
          timings.push({
            id: breakfastId,
            time: breakfastTime,
            description: '🥐 Petit-déjeuner',
            isAutoGenerated: true,
            targetMealDay: dayForHotel,
            category: OperationalTimingCategory.REPAS,
          });
        }
      }
    };

    const findStageAccommodation = (
      accommodations: StageDayAccommodation[] | undefined,
      stage: StageDayLogistics,
    ): StageDayAccommodation | undefined =>
      accommodations?.find(a => !a.isStopover && a.stageDate === stage.date)
      ?? accommodations?.find(a => !a.isStopover && a.stageNumber === stage.stageNumber);

    const getStageReferenceArrivalTime = (stage: StageDayLogistics): string | null => {
      const arrivalTiming = timings.find(t => t.id === `auto-arriveeSite-${stage.id}`);
      if (arrivalTiming?.time) return arrivalTiming.time;
      if (stage.isTimeTrial) {
        const firstDepart = getTimeTrialFirstDepartTime(
          stage.premierDepartTime,
          stage.riderStartTimes,
        );
        return firstDepart
          ? subtractDurationFromTimeOfDay(firstDepart, TIME_TRIAL_TEAM_ARRIVAL_LEAD_MINUTES)
          : null;
      }
      if (stage.presentationTime) {
        return subtractDurationFromTimeOfDay(stage.presentationTime, 30);
      }
      if (stage.departFictifTime) {
        return subtractDurationFromTimeOfDay(stage.departFictifTime, 30);
      }
      if (stage.departReelTime) {
        return subtractDurationFromTimeOfDay(stage.departReelTime, 60);
      }
      return null;
    };

    if (raceInfo && isStageRace(event) && stageDaysList.length > 0) {
      stageDaysList.forEach(stage => {
        const stageAcco = findStageAccommodation(raceInfo.stageAccommodations, stage);
        const travelTimeToStart =
          stageAcco?.travelTimeToStart?.trim() || globalAccommodation?.travelTimeToStart;
        const arrivalTiming = timings.find(t => t.id === `auto-arriveeSite-${stage.id}`);
        const dayForHotel = arrivalTiming?.targetMealDay ?? getTargetMealDay(stage.date);
        appendHotelAndBreakfastTimings(
          getStageReferenceArrivalTime(stage),
          dayForHotel,
          travelTimeToStart,
          `auto-departHotel-${stage.id}`,
          `auto-petitDejeuner-${stage.id}`,
        );
      });
    } else if (raceInfo) {
      const arrivalOnSiteTiming = timings.find(t => t.id === 'auto-arriveeSite');
      const mainEventDayForHotel =
        getTargetMealDay(event.date)
        || getTargetMealDay(raceInfo.permanenceDate)
        || getTargetMealDay(raceInfo.reunionDSDate);
      const firstTimeTrialDepart = raceInfo.isTimeTrial
        ? getTimeTrialFirstDepartTime(raceInfo.premierDepartTime, raceInfo.riderStartTimes)
        : null;
      const referenceArrivalTime = arrivalOnSiteTiming?.time
        ?? (firstTimeTrialDepart
          ? subtractDurationFromTimeOfDay(firstTimeTrialDepart, TIME_TRIAL_TEAM_ARRIVAL_LEAD_MINUTES)
          : null)
        ?? (raceInfo.departFictifTime
          ? subtractDurationFromTimeOfDay(raceInfo.departFictifTime, 30)
          : raceInfo.departReelTime
            ? subtractDurationFromTimeOfDay(raceInfo.departReelTime, 60)
            : null);
      const dayForHotel = arrivalOnSiteTiming?.targetMealDay ?? mainEventDayForHotel;
      appendHotelAndBreakfastTimings(
        referenceArrivalTime,
        dayForHotel,
        globalAccommodation?.travelTimeToStart,
        'auto-departHotel',
        'auto-petitDejeuner',
      );
    }
    
    // Ajouter le dîner du soir (si c'est un événement multi-jours)
    if (event.endDate && event.endDate !== event.date) {
        const endDay = getTargetMealDay(event.endDate);
        if (endDay) {
            // Dîner à 19h30 le soir de l'arrivée
            timings.push({
                id: 'auto-diner',
                time: '19h30',
                description: '🍽️ Dîner',
                isAutoGenerated: true,
                targetMealDay: endDay,
                category: OperationalTimingCategory.REPAS
            });
        }
    }

    return timings;
  }, [event, appState.eventTransportLegs, appState.eventAccommodations, appState.riders]);

  const mainEventDayName = useMemo(() => {
    const dayMap: Record<number, MealDayEnum> = { 0: MealDayEnum.DIMANCHE, 1: MealDayEnum.LUNDI, 2: MealDayEnum.MARDI, 3: MealDayEnum.MERCREDI, 4: MealDayEnum.JEUDI, 5: MealDayEnum.VENDREDI, 6: MealDayEnum.SAMEDI };
    if (!event.date) return null;
    try {
        return dayMap[new Date(`${event.date}T12:00:00Z`).getUTCDay()];
    } catch { return null; }
  }, [event.date]);

  const stageTitleByMealDay = useMemo(() => getStageTitleByMealDay(event), [event]);

  const displayLogistics = useMemo(() => {
    const mergedDays: Record<string, OperationalLogisticsDay> = {};

    logistics.forEach(day => {
        mergedDays[day.dayName] = structuredClone(day);
    });

    autoGeneratedTimings.forEach(autoTiming => {
        const dayName = autoTiming.targetMealDay;
        const isAlreadyPresent = logistics.some(day => day.dayName === dayName && day.keyTimings.some(t => t.id === autoTiming.id));
        const isDeleted = deletedAutoTimings.has(autoTiming.id);

        if (!isAlreadyPresent && !isDeleted) {
            if (!mergedDays[dayName]) {
                mergedDays[dayName] = { id: `day-${dayName}`, dayName, keyTimings: [] };
            }
            mergedDays[dayName].keyTimings.push({ ...autoTiming, isOverridden: false });
        }
    });

    let finalDays = Object.values(mergedDays);
    finalDays.forEach(day => day.keyTimings.sort((a, b) => (parseTimeOfDayToMinutes(a.time) ?? 9999) - (parseTimeOfDayToMinutes(b.time) ?? 9999)));

    if (isEditing) {
        return sortOperationalLogisticsDays(event, finalDays);
    }

    // Logique de groupement simplifiée (uniquement en mode équipe)
    const groupedDays = finalDays.map(day => {
        // En mode individuel, ne pas grouper les timings
        if (viewMode === 'individual') {
            return {
                ...day,
                keyTimings: groupPlanningTimingsByTime(day.keyTimings).map(timing => ({
                    ...timing,
                    description: normalizeVehicleDepartureDescription(timing.description || ''),
                })),
            };
        }
        
        const newKeyTimings: OperationalTiming[] = [];
        const processedIndices = new Set<number>();

        for (let i = 0; i < day.keyTimings.length; i++) {
            if (processedIndices.has(i)) continue;

            const currentTiming = day.keyTimings[i];
            
                        // Grouper les arrivées identiques
            if (currentTiming.description.includes('Arrivée des véhicules')) {
                const time = currentTiming.time;
                const baseDescription = currentTiming.description.replace(/\([^)]*\)/, '').trim();
                
                // Chercher d'autres arrivées identiques et collecter les véhicules
                const vehicles: string[] = [];
                const vehicleMatch = currentTiming.description.match(/\(([^)]+)\)/);
                if (vehicleMatch) {
                    vehicles.push(vehicleMatch[1]);
                }
                
                for (let j = i + 1; j < day.keyTimings.length; j++) {
                    if (processedIndices.has(j)) continue;
                    
                    const nextTiming = day.keyTimings[j];
                    if (nextTiming.time === time && 
                        nextTiming.description.includes('Arrivée des véhicules')) {
                        
                        const nextVehicleMatch = nextTiming.description.match(/\(([^)]+)\)/);
                        if (nextVehicleMatch) {
                            vehicles.push(nextVehicleMatch[1]);
                        }
                        processedIndices.add(j);
                    }
                }
                
                // Créer la description groupée avec tous les véhicules
                const uniqueVehicles = [...new Set(vehicles)];
                const location = baseDescription.replace('Arrivée des véhicules à ', '');
                const groupedDescription = `Arrivée des véhicules à ${location} (${uniqueVehicles.join(', ')})`;
                
                newKeyTimings.push({
                    ...currentTiming,
                    description: groupedDescription
                });
            } else if (looksLikeVehicleDepartureDescription(currentTiming.description)) {
                const vehicles = salvageVehicleNamesFromDepartureDescription(currentTiming.description);

                for (let j = i + 1; j < day.keyTimings.length; j++) {
                    if (processedIndices.has(j)) continue;

                    const nextTiming = day.keyTimings[j];
                    if (!arePlanningTimesEqual(currentTiming.time, nextTiming.time)) continue;
                    if (!looksLikeVehicleDepartureDescription(nextTiming.description)) continue;

                    vehicles.push(...salvageVehicleNamesFromDepartureDescription(nextTiming.description));
                    processedIndices.add(j);
                }

                newKeyTimings.push({
                    ...currentTiming,
                    description: formatVehicleDepartureDescription(vehicles),
                });
            } else {
                // Pour tous les autres timings, les ajouter normalement
                newKeyTimings.push(currentTiming);
            }
        }
        return {
            ...day,
            keyTimings: groupPlanningTimingsByTime(newKeyTimings).map(timing => ({
                ...timing,
                description: normalizeVehicleDepartureDescription(timing.description || ''),
            })),
        };
    });

    return sortOperationalLogisticsDays(event, groupedDays);
  }, [logistics, autoGeneratedTimings, deletedAutoTimings, viewMode, isEditing, event.date, event.endDate]);

  const visibleDisplayLogistics = useMemo(() => {
    if (excluded.size === 0) return displayLogistics;
    return displayLogistics
      .map(day => ({
        ...day,
        keyTimings: visibleTimingsForDay(day.keyTimings),
      }))
      .filter(day => day.keyTimings.length > 0);
  }, [displayLogistics, excluded]);
  
  const handleTimingChange = (dayId: string, dayNameForCreation: MealDay, timing: OperationalTiming, field: keyof OperationalTiming, value: any) => {
    setLogistics(currentLogistics => {
        const updatedLogistics = structuredClone(currentLogistics);
        let dayIndex = updatedLogistics.findIndex(d => d.id === dayId);

        if (dayIndex === -1) {
            const newDay: OperationalLogisticsDay = { id: dayId, dayName: dayNameForCreation, keyTimings: [] };
            updatedLogistics.push(newDay);
            dayIndex = updatedLogistics.length - 1; 
        }
        
        let dayToUpdate = updatedLogistics[dayIndex];
        let timingIndex = dayToUpdate.keyTimings.findIndex(t => t.id === timing.id);
        
        let processedValue = value;
        if (field === 'order') {
          processedValue = value === '' ? undefined : parseInt(value, 10);
        }

        if (timingIndex > -1) {
          // Editing existing timing
          (dayToUpdate.keyTimings[timingIndex] as any)[field] = processedValue;
          if (dayToUpdate.keyTimings[timingIndex].isAutoGenerated) {
              dayToUpdate.keyTimings[timingIndex].isOverridden = true;
          }
        } else {
          // Adding a new timing
          const newTiming = { ...timing, [field]: processedValue, isOverridden: timing.isAutoGenerated, id: timing.id || Date.now().toString() };
          dayToUpdate.keyTimings.push(newTiming as OperationalTiming);
        }

        // Synchronisation avec les trajets de transport si c'est un timing de transport
        if (field === 'time' && timing.isAutoGenerated && setEventTransportLegs) {
          // Arrondir l'heure au quart d'heure le plus proche
          const roundedTime = roundToNearestQuarter(processedValue);
          syncTimingWithTransportLegs(timing.id, roundedTime);
          
          // Mettre à jour aussi l'affichage avec l'heure arrondie
          if (timingIndex > -1) {
            (dayToUpdate.keyTimings[timingIndex] as any)[field] = roundedTime;
          }
        }

        return updatedLogistics;
    });
};

  // Fonction pour synchroniser les modifications de timing avec les trajets de transport
  const syncTimingWithTransportLegs = (timingId: string, newTime: string) => {
    if (!setEventTransportLegs) return;

    // Extraire l'ID du trajet depuis l'ID du timing
    const legIdMatch = timingId.match(/auto-transport-(depart|arrivee)-(.+)/);
    const stopIdMatch = timingId.match(/auto-stop-(.+)/);
    
    if (legIdMatch) {
      // Synchronisation pour les départs/arrivées principaux
      const timingType = legIdMatch[1]; // 'depart' ou 'arrivee'
      const legId = legIdMatch[2];

      setEventTransportLegs(prevLegs => {
        return prevLegs.map(leg => {
          if (leg.id === legId) {
            const updatedLeg = { ...leg };
            
            if (timingType === 'depart') {
              updatedLeg.departureTime = newTime;
            } else if (timingType === 'arrivee') {
              updatedLeg.arrivalTime = newTime;
            }
            
            return updatedLeg;
          }
          return leg;
        });
      });
    } else if (stopIdMatch) {
      // Synchronisation pour les étapes intermédiaires
      const stopId = stopIdMatch[1];

      setEventTransportLegs(prevLegs => {
        return prevLegs.map(leg => {
          if (leg.intermediateStops) {
            const updatedLeg = { ...leg };
            updatedLeg.intermediateStops = leg.intermediateStops.map(stop => {
              if (stop.id === stopId) {
                return { ...stop, time: newTime };
              }
              return stop;
            });
            return updatedLeg;
          }
          return leg;
        });
      });
    }
};


  const handleDayNameChange = (dayId: string, newDayName: MealDay) => {
    setLogistics(prev => prev.map(day => day.id === dayId ? { ...day, dayName: newDayName } : day));
  };

  const addDay = () => setLogistics(prev => [...prev, { id: Date.now().toString(), dayName: MealDayEnum.AUTRE, keyTimings: [] }]);
  const removeDay = (dayIdToRemove: string) => setLogistics(prev => prev.filter(day => day.id !== dayIdToRemove));
  
  const addTimingToDay = (dayId: string, predefinedType?: string) => {
    const day = displayLogistics.find(d => d.id === dayId);
    if (!day) return;
    
    let newTiming: Partial<OperationalTiming> = {
      id: Date.now().toString(), 
      time: '', 
      description: '', 
      isAutoGenerated: false, 
      category: OperationalTimingCategory.DIVERS
    };
    
    // Timings prédéfinis
    if (predefinedType) {
      switch (predefinedType) {
        case 'reveil':
          newTiming = {
            ...newTiming,
            description: '⏰ Réveil',
            category: OperationalTimingCategory.DIVERS
          };
          break;
        case 'petit-dejeuner':
          newTiming = {
            ...newTiming,
            description: '🥐 Petit-déjeuner',
            category: OperationalTimingCategory.REPAS
          };
          break;
        case 'dejeuner':
          newTiming = {
            ...newTiming,
            description: '🍽️ Déjeuner',
            category: OperationalTimingCategory.REPAS
          };
          break;
        case 'diner':
          newTiming = {
            ...newTiming,
            description: '🍽️ Dîner',
            category: OperationalTimingCategory.REPAS
          };
          break;
        case 'briefing':
          newTiming = {
            ...newTiming,
            description: '📋 Briefing',
            category: OperationalTimingCategory.COURSE
          };
          break;
        case 'reunion':
          newTiming = {
            ...newTiming,
            description: '👥 Réunion',
            category: OperationalTimingCategory.COURSE
          };
          break;
        case 'massage':
          newTiming = {
            ...newTiming,
            description: '💆 Massage',
            category: OperationalTimingCategory.MASSAGE
          };
          break;
        case 'velo':
          newTiming = {
            ...newTiming,
            description: '🚴 Départ à vélo de l\'hôtel',
            category: OperationalTimingCategory.TRANSPORT
          };
          break;
        default:
          break;
      }
    }
    
    handleTimingChange(dayId, day.dayName, newTiming as OperationalTiming, 'description', newTiming.description || '');
  };

  const removeTimingFromDay = (dayId: string, timingId: string) => {
    // Vérifier si c'est un timing auto-généré
    const isAutoGenerated = autoGeneratedTimings.some(timing => timing.id === timingId);
    
    if (isAutoGenerated) {
      // Ajouter à la liste des timings auto-générés supprimés
      setDeletedAutoTimings(prev => new Set([...prev, timingId]));
    }
    
    setLogistics(prev => prev.map(day => {
      if (day.id === dayId) {
        return { ...day, keyTimings: day.keyTimings.filter(t => t.id !== timingId) };
      }
      return day;
    }));
  };

  const selectAllTimingsForDay = (dayId: string) => {
    setSelectedDay(dayId);
  };

  const deselectAllTimingsForDay = (dayId: string) => {
    setLogistics(prev => prev.map(day => {
      if (day.id === dayId) {
        return { ...day, keyTimings: [] };
      }
      return day;
    }));
  };

  const toggleDaySelection = (dayId: string) => {
    if (selectedDay === dayId) {
      setSelectedDay(null);
    } else {
      setSelectedDay(dayId);
    }
  };

  const restoreDeletedAutoTimings = () => {
    setDeletedAutoTimings(new Set());
  };

  const handleSave = () => {
    updateEvent({ operationalLogistics: logistics });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLogistics(structuredClone(event.operationalLogistics || []));
    setIsEditing(false);
  };
  
  const lightInputClass = "block w-full px-2 py-1 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 text-xs";
  
  // Obtenir le nom de la personne pour le mode individuel
  const getPersonName = (): string => {
    if (viewMode === 'individual' && selectedPersonId) {
      const rider = appState.riders.find(r => r.id === selectedPersonId);
      const staff = appState.staff.find(s => s.id === selectedPersonId);
      if (rider) return `${rider.firstName} ${rider.lastName}`;
      if (staff) return `${staff.firstName} ${staff.lastName}`;
    }
    return '';
  };
  
  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      <div className={`flex justify-between items-center ${embedded ? 'gap-2' : ''}`}>
        <div>
          <h3 className={`font-semibold text-gray-700 ${embedded ? 'text-base' : 'text-xl'}`}>
            {viewMode === 'individual' 
              ? `Timing Personnel - ${getPersonName()}` 
              : embedded
                ? 'Timings opérationnels'
                : 'Logistique Opérationnelle (Timing par Jour)'
            }
          </h3>
          {embedded && (
            <p className="text-xs text-gray-500 mt-0.5">
              Transport, repas, course et horaires du week-end (lecture seule).
            </p>
          )}
          {viewMode === 'individual' && (
            <p className="text-sm text-gray-500 mt-1">
              Affichage des trajets et timings personnels uniquement
            </p>
          )}
        </div>
        {(!isEditing && viewMode === 'team' && (allowEditing || readOnly)) && (
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => setIsExportModalOpen(true)}
              variant="secondary"
              size={embedded ? 'sm' : undefined}
            >
              Exporter le planning en PDF
            </ActionButton>
            {allowEditing && (
              <ActionButton onClick={() => setIsEditing(true)} variant="primary">
                Modifier Timings
              </ActionButton>
            )}
          </div>
        )}

        {isExportModalOpen && viewMode === 'team' && (
          <Modal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            title="Exporter le planning"
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Périmètre</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Tous les jours</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'day'}
                      onChange={() => setExportScope('day')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Un jour seulement</span>
                  </label>
                  {exportScope === 'day' && (
                    <select
                      value={exportSelectedDay ?? ''}
                      onChange={(e) => setExportSelectedDay((e.target.value || null) as MealDay | null)}
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    >
                      <option value="">Choisir un jour</option>
                      {displayLogistics.map((d) => (
                        <option key={d.id} value={d.dayName}>
                          {d.dayName.charAt(0).toLowerCase() + d.dayName.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportIncludeVehicles}
                    onChange={(e) => setExportIncludeVehicles(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Inclure la logistique véhicules (qui monte, où et quand)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Conducteur, départs/arrivées, personnes à bord et récupérations/déposes
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <ActionButton variant="secondary" onClick={() => setIsExportModalOpen(false)}>
                  Annuler
                </ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={() => {
                    if (exportScope === 'day' && !exportSelectedDay) {
                      alert('Veuillez choisir un jour.');
                      return;
                    }
                    exportPlanningToPdf(
                      event,
                      displayLogistics,
                      appState,
                      getOccupantName,
                      getVehicleInfo,
                      {
                        selectedDay: exportScope === 'day' ? exportSelectedDay : null,
                        includeVehicleLogistics: exportIncludeVehicles,
                      }
                    );
                    setIsExportModalOpen(false);
                  }}
                >
                  Exporter en PDF
                </ActionButton>
              </div>
            </div>
          </Modal>
        )}
      </div>

      {allowEditing && isEditing && viewMode === 'team' ? (
        <div className="space-y-4">
          {deletedAutoTimings.size > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">
                      Timings auto-générés supprimés
                    </h3>
                    <p className="text-yellow-700">
                      {deletedAutoTimings.size} timing{deletedAutoTimings.size > 1 ? 's' : ''} auto-généré{deletedAutoTimings.size > 1 ? 's' : ''} supprimé{deletedAutoTimings.size > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={restoreDeletedAutoTimings}
                >
                  Restaurer tous
                </ActionButton>
              </div>
            </div>
          )}
          {displayLogistics.map(day => {
            return (
            <div key={day.id} className={`p-3 border rounded-md ${selectedDay === day.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}>
              <div className="flex items-center mb-2">
                <select value={day.dayName} onChange={(e) => handleDayNameChange(day.id, e.target.value as MealDay)} className={`${lightInputClass} font-semibold !w-auto mr-2`}>
                  {Object.values(MealDayEnum).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {stageTitleByMealDay[day.dayName] && (
                  <span className="text-sm font-medium text-amber-800 mr-2">
                    — {stageTitleByMealDay[day.dayName]}
                  </span>
                )}
                {day.dayName === mainEventDayName && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">JOUR J</span>}
                
                {/* Boutons de sélection par jour */}
                <div className="flex gap-1 ml-2">
                  <ActionButton 
                    type="button" 
                    variant={selectedDay === day.id ? "primary" : "secondary"} 
                    size="sm" 
                    onClick={() => toggleDaySelection(day.id)} 
                    className="!p-1 text-xs"
                  >
                    {selectedDay === day.id ? "Sélectionné" : "Sélectionner"}
                  </ActionButton>
                  <ActionButton 
                    type="button" 
                    variant="danger" 
                    size="sm" 
                    onClick={() => deselectAllTimingsForDay(day.id)} 
                    className="!p-1 text-xs"
                  >
                    Vider
                  </ActionButton>
                </div>
                
                <ActionButton type="button" variant="danger" size="sm" onClick={() => removeDay(day.id)} className="ml-auto !p-1"><TrashIcon className="w-4 h-4"/></ActionButton>
              </div>
              
               <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-2">Catégorie</div>
                <div className="col-span-2">Heure</div>
                <div className="col-span-7">Description / Personnes</div>
                <div className="col-span-1"></div>
              </div>

              {day.keyTimings.map(timing => {
                const isMassage = timing.category === OperationalTimingCategory.MASSAGE;
                return (
                  <div key={timing.id} className="grid grid-cols-12 gap-2 mb-1 items-center">
                    <div className="col-span-2">
                        <select
                            value={timing.category || OperationalTimingCategory.DIVERS}
                            onChange={e => handleTimingChange(day.id, day.dayName, timing, 'category', e.target.value)}
                            className={lightInputClass}
                        >{Object.values(OperationalTimingCategory).map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select>
                    </div>
                    <div className="col-span-2">
                        <input 
                          type="text" 
                          value={timing.time} 
                          onChange={e => handleTimingChange(day.id, day.dayName, timing, 'time', e.target.value)} 
                          placeholder="ex: 14h" 
                          className={lightInputClass}
                          title={timing.isAutoGenerated ? "Heure automatiquement arrondie au quart d'heure le plus proche" : ""}
                        />
                        {timing.isAutoGenerated && timing.isOverridden && (
                          <span className="text-xs text-blue-600 ml-1">⏰</span>
                        )}
                    </div>
                    
                    {isMassage ? (
                      <>
                        <div className="col-span-2">
                            <select
                                value={timing.personId || ''}
                                onChange={e => handleTimingChange(day.id, day.dayName, timing, 'personId', e.target.value)}
                                className={lightInputClass}
                            >
                                <option value="">- Coureur -</option>
                                {appState.riders
                                    .filter(r => event.selectedRiderIds.includes(r.id))
                                    .map(r => <option key={r.id} value={r.id}>{`${r.firstName} ${r.lastName}`}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <select
                                value={timing.masseurId || ''}
                                onChange={e => handleTimingChange(day.id, day.dayName, timing, 'masseurId', e.target.value)}
                                className={lightInputClass}
                            >
                                <option value="">- Masseur -</option>
                                {appState.staff
                                    .filter(s => (s.role === StaffRole.KINE || s.role === StaffRole.ASSISTANT) && event.selectedStaffIds.includes(s.id))
                                    .map(s => <option key={s.id} value={s.id}>{`${s.firstName} ${s.lastName}`}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <input type="number" value={timing.order ?? ''} onChange={e => handleTimingChange(day.id, day.dayName, timing, 'order', e.target.value)} placeholder="Ordre" className={lightInputClass}/>
                        </div>
                      </>
                    ) : null}
                    
                    <div className={isMassage ? 'col-span-2' : 'col-span-7'}>
                        <input type="text" value={timing.description} onChange={e => handleTimingChange(day.id, day.dayName, timing, 'description', e.target.value)} placeholder="Description" className={lightInputClass} />
                    </div>
                    
                    <div className="col-span-1">
                        <ActionButton type="button" variant="danger" size="sm" onClick={() => removeTimingFromDay(day.id, timing.id)} className="!p-1 w-full"><TrashIcon className="w-4 h-4 mx-auto"/></ActionButton>
                    </div>
                  </div>
                )
              })}
              <div className="mt-2 flex gap-2">
                <ActionButton type="button" variant="secondary" size="sm" onClick={() => addTimingToDay(day.id)} className="text-xs" icon={<PlusCircleIcon className="w-3 h-3 mr-1"/>}>
                  Timing Libre
              </ActionButton>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      addTimingToDay(day.id, e.target.value);
                      e.target.value = ''; // Reset selection
                    }
                  }}
                  className="text-xs px-2 py-1 border rounded-md bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                >
                  <option value="">+ Timing Prédéfini</option>
                  <option value="reveil">⏰ Réveil</option>
                  <option value="petit-dejeuner">🥐 Petit-déjeuner</option>
                  <option value="dejeuner">🍽️ Déjeuner</option>
                  <option value="diner">🍽️ Dîner</option>
                  <option value="briefing">📋 Briefing</option>
                  <option value="reunion">👥 Réunion</option>
                  <option value="massage">💆 Massage</option>
                  <option value="velo">🚴 Départ à vélo</option>
                </select>
              </div>
            </div>
            )
          })}
          <div className="text-center mt-4 pt-4 border-t">
            <ActionButton type="button" variant="secondary" onClick={addDay} icon={<PlusCircleIcon className="w-4 h-4 mr-1"/>}>
                Ajouter une journée
            </ActionButton>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <ActionButton type="button" variant="secondary" onClick={handleCancel}>Annuler</ActionButton>
            <ActionButton type="button" onClick={handleSave}>Sauvegarder Timings</ActionButton>
          </div>
        </div>
      ) : (
        <>


          {visibleDisplayLogistics.length > 0 ? (
          visibleDisplayLogistics.map(day => (
            <div key={day.id} className="p-3 mb-3 border rounded-md bg-gray-50">
              <h4 className="text-md font-semibold text-gray-700 mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{day.dayName}</span>
                  {stageTitleByMealDay[day.dayName] && (
                    <span className="font-medium text-amber-800">— {stageTitleByMealDay[day.dayName]}</span>
                  )}
                  {day.dayName === mainEventDayName && (
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">JOUR J</span>
                  )}
              </h4>
              <ul className="space-y-1">
                {day.keyTimings.map(timing => {
                  const category = timing.category || OperationalTimingCategory.DIVERS;
                  const Icon = categoryStyles[category].icon;
                  const color = categoryStyles[category].color;
                  const title = timing.isAutoGenerated ? (timing.isOverridden ? 'Automatique, modifié' : 'Automatique') : 'Manuel';
                  
                  let description = timing.description || "N/A";
                  const stageTitle = stageTitleByMealDay[day.dayName];
                  if (stageTitle) {
                    description = stripStageTitleFromTimingDescription(description, stageTitle);
                  }
                  if (category === OperationalTimingCategory.MASSAGE && timing.personId) {
                      const riderName = getOccupantName(timing.personId, 'rider');
                      description = `${description}: ${riderName} ${timing.order ? `(#${timing.order})` : ''}`;
                      if (timing.masseurId) {
                          const masseurName = getOccupantName(timing.masseurId, 'staff');
                          description += ` par ${masseurName}`;
                      }
                  }

                  return (
                    <li key={timing.id} className="flex items-start py-2 border-b border-gray-200 last:border-b-0">
                      <span title={title} className="flex-shrink-0 mt-0.5">
                        {timing.isOverridden ? 
                            <PencilIcon className="w-4 h-4 mr-2 text-purple-600"/> :
                            <Icon className={`w-4 h-4 mr-2 ${color}`}/>
                        }
                      </span>
                      <span className="font-semibold w-20 text-gray-700">{timing.time || "N/A"}:</span>
                      <div className="flex-1">
                        <span className="text-gray-900 leading-relaxed">{description}</span>

                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">Aucune logistique opérationnelle définie.</p>
        )}
        </>
      )}

      {viewMode === 'individual' && displayLogistics.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">👤</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun timing personnel</h3>
          <p className="text-gray-500">
            {getPersonName()} n'a pas de trajets ou timings personnels planifiés pour cet événement.
          </p>
        </div>
      )}

      {!isEditing && viewMode === 'team' && !embedded && (
         <div className="mt-6 pt-4 border-t">
            <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center"><InformationCircleIcon className="w-5 h-5 mr-2 text-blue-500"/>Légende</h4>
            <ul className="text-xs text-gray-600 space-y-1">
                {Object.entries(categoryStyles).map(([cat, style]) => {
                    const Icon = style.icon;
                    return (
                         <li key={cat} className="flex items-center"><Icon className={`w-4 h-4 mr-2 flex-shrink-0 ${style.color}`}/> Timing de catégorie '{cat}'.</li>
                    );
                })}
                <li className="flex items-center"><PencilIcon className="w-4 h-4 mr-2 text-purple-600"/> Timing automatique qui a été modifié manuellement.</li>
            </ul>
        </div>
      )}
    </div>
  );
};

export default EventOperationalLogisticsTab;
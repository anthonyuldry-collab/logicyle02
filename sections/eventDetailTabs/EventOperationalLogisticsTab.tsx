import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { RaceEvent, OperationalLogisticsDay, OperationalTiming, AppState, EventTransportLeg, TransportDirection, TransportMode, MealDay, OperationalTimingCategory, Rider, StaffRole } from '../../types';
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

// Parses a time-of-day string (e.g., "14h30", "8:15") into minutes from midnight.
const parseTimeOfDayToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const cleanedTime = timeStr.trim().split('-')[0].trim();
    const parts = cleanedTime.replace('h', ':').split(':');
    
    if (parts.length > 0) {
        const hours = parseInt(parts[0], 10);
        const minutes = (parts.length > 1 && parts[1]) ? parseInt(parts[1], 10) : 0;
        if (!isNaN(hours) && !isNaN(minutes)) {
            return hours * 60 + minutes;
        }
    }
    return null;
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

/** Retourne pour chaque jour (MealDay) la date dd/MM dans la plage event.date -> event.endDate. */
const getDayLabelsForEvent = (event: RaceEvent): Record<string, string> => {
    const out: Record<string, string> = {};
    const start = new Date(event.date + 'T12:00:00Z');
    const endStr = event.endDate || event.date;
    const end = new Date(endStr + 'T12:00:00Z');
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const w = d.getUTCDay();
        const key = Object.entries(MEAL_DAY_TO_WEEKDAY).find(([, v]) => v === w)?.[0];
        if (key && out[key] === undefined) out[key] = formatDateForPlanning(d.toISOString().slice(0, 10));
    }
    return out;
};

/** Pour un trajet, retourne l'heure (minutes depuis minuit) du premier événement les jours où dateMatches(date) est vrai. */
const getLegFirstTimeOnDates = (leg: EventTransportLeg, dateMatches: (dateStr: string | undefined) => boolean): number => {
    let minMinutes = 9999;
    const add = (date: string | undefined, time: string | undefined) => {
        if (date && dateMatches(date) && time) {
            const m = parseTimeOfDayToMinutes(time);
            if (m !== null && m < minMinutes) minMinutes = m;
        }
    };
    add(leg.departureDate, leg.departureTime);
    add(leg.arrivalDate, leg.arrivalTime);
    (leg.intermediateStops || []).forEach(stop => add(stop.date, stop.time));
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
    driverName: string
): LegDayEvent[] => {
    const events: LegDayEvent[] = [];
    const add = (date: string | undefined, time: string | undefined, line: string) => {
        if (!date || !dateMatches(date) || !time) return;
        const m = parseTimeOfDayToMinutes(time);
        if (m === null) return;
        events.push({ minutes: m, timeStr: time, line });
    };

    const occupantsStr = (leg.occupants || []).map(o => getOccupantName(o.id, o.type)).join(', ') || '—';

    if (leg.departureDate && dateMatches(leg.departureDate) && leg.departureTime) {
        const lieu = leg.departureLocation || '—';
        add(leg.departureDate, leg.departureTime, `Départ ${leg.departureTime} de ${lieu}. Conducteur : ${driverName}. À bord : ${occupantsStr}`);
    }

    (leg.intermediateStops || []).forEach(stop => {
        if (!stop.date || !dateMatches(stop.date)) return;
        const time = stop.time || '—';
        const lieu = stop.location || '—';
        const who = (stop.persons || []).map(p => getOccupantName(p.id, p.type)).join(', ');
        const isPickup = String(stop.stopType).toLowerCase().includes('récupération') || String(stop.stopType).toLowerCase().includes('pickup');
        if (isPickup) {
            add(stop.date, stop.time, who ? `Récupération de ${who} à ${time} à ${lieu}` : `Récupération à ${time} à ${lieu}`);
        } else {
            add(stop.date, stop.time, who ? `Dépose de ${who} à ${time} à ${lieu}` : `Dépose à ${time} à ${lieu}`);
        }
    });

    if (leg.arrivalDate && dateMatches(leg.arrivalDate) && leg.arrivalTime) {
        const lieu = leg.arrivalLocation || '—';
        add(leg.arrivalDate, leg.arrivalTime, `Arrivée ${leg.arrivalTime} à ${lieu}. À bord : ${occupantsStr}`);
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

interface ExportPlanningOptions {
    selectedDay?: MealDay | null;
    includeVehicleLogistics?: boolean;
}

const exportPlanningToPdf = (
    event: RaceEvent,
    logistics: OperationalLogisticsDay[],
    appState: AppState,
    getOccupantName: (id: string, type: 'rider' | 'staff') => string,
    getVehicleInfo: (vehicleId: string | undefined, leg?: EventTransportLeg) => string,
    options: ExportPlanningOptions = {}
): void => {
    const { selectedDay = null, includeVehicleLogistics = false } = options;
    const filteredLogistics = selectedDay
        ? logistics.filter(d => d.dayName === selectedDay)
        : logistics;
    if (filteredLogistics.length === 0) {
        alert(selectedDay ? 'Aucun timing pour ce jour.' : 'Aucun timing à exporter.');
        return;
    }
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const footerHeight = 12; // zone réservée en bas pour le pied de page
    const contentBottomY = pageH - margin - footerHeight;
    const contentW = pageW - 2 * margin;

    const colorHeader = [30, 41, 59] as [number, number, number];
    const colorBlockBg = [51, 65, 85] as [number, number, number];
    const colorBorder = [100, 116, 139] as [number, number, number];
    const colorTextOnDark = [241, 245, 249] as [number, number, number];
    const colorTextOnLight = [30, 41, 59] as [number, number, number]; // texte lisible sur fond clair
    const colorAccHeader = [15, 23, 42] as [number, number, number];
    const colorTitle = [51, 65, 85] as [number, number, number];

    const titleBlockH = 16;
    const bodyStartY = margin + titleBlockH;
    const spaceForGrid = Math.max(35, (contentBottomY - bodyStartY) * 0.5); // moitié pour la grille, le reste pour véhicules + hébergement

    const numCols = Math.min(3, Math.max(1, filteredLogistics.length));
    const gap = 2;
    const colWidth = (contentW - (numCols - 1) * gap) / numCols;
    const dayHeaderH = 6;
    const blockPadding = 1;
    const lineH = 3.2;
    const numRows = Math.ceil(filteredLogistics.length / numCols);
    const rowHeight = Math.min(spaceForGrid / Math.max(numRows, 1), 42);
    const availableBodyH = rowHeight * numRows;

    const formatTimingLine = (timing: OperationalTiming): string => {
        let desc = (timing.time || '').trim();
        let rest = timing.description || '';
        if (timing.category === OperationalTimingCategory.MASSAGE && timing.personId) {
            rest += (rest ? ' — ' : '') + getOccupantName(timing.personId, 'rider');
            if (timing.masseurId) rest += ' par ' + getOccupantName(timing.masseurId, 'staff');
        }
        if (rest) desc += (desc ? ': ' : '') + rest;
        return sanitizeTextForPdf(desc);
    };

    // Titre (compact)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorTitle);
    doc.text(sanitizeTextForPdf(event.name), pageW / 2, margin + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const dateRange = event.endDate && event.endDate !== event.date
        ? `Du ${formatDateForPlanning(event.date)} au ${formatDateForPlanning(event.endDate)}`
        : `Le ${formatDateForPlanning(event.date)}`;
    doc.text(dateRange, pageW / 2, margin + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate 500
    doc.text('Timing du déplacement', pageW / 2, margin + 14, { align: 'center' });
    doc.setTextColor(...colorTitle);

    filteredLogistics.forEach((day, dayIndex) => {
        const col = dayIndex % numCols;
        const row = Math.floor(dayIndex / numCols);
        const x = margin + col * (colWidth + gap);
        const y = bodyStartY + row * rowHeight;

        const dayTitle = `${day.dayName.charAt(0).toLowerCase()}${day.dayName.slice(1)}`;
        const isWeekend = day.dayName === MealDayEnum.SAMEDI || day.dayName === MealDayEnum.DIMANCHE;
        const timings = day.keyTimings.length ? day.keyTimings : [];
        const contentH = rowHeight - dayHeaderH;

        doc.setFillColor(...colorHeader);
        doc.setDrawColor(...colorBorder);
        doc.rect(x, y, colWidth, dayHeaderH, 'FD');
        doc.setTextColor(...colorTextOnDark);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (isWeekend) {
            doc.text(dayTitle, x + colWidth / 2, y + 2.2, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(203, 213, 225);
            doc.text('Week-end', x + colWidth / 2, y + 4.5, { align: 'center' });
            doc.setTextColor(...colorTextOnDark);
            doc.setFontSize(7);
        } else {
            doc.text(dayTitle, x + colWidth / 2, y + dayHeaderH / 2 + 1.2, { align: 'center' });
        }
        doc.setFont('helvetica', 'normal');

        doc.setFillColor(...colorBlockBg);
        doc.setDrawColor(...colorBorder);
        doc.rect(x, y + dayHeaderH, colWidth, contentH, 'FD');
        doc.setFontSize(7);
        doc.setTextColor(...colorTextOnDark);
        let rowY = y + dayHeaderH + blockPadding + 1.5;
        const maxLinesPerTiming = 2;
        const lineW = colWidth - 2 * blockPadding - 2;
        timings.forEach((timing) => {
            if (rowY + lineH > y + dayHeaderH + contentH - 1) return;
            const line = formatTimingLine(timing);
            if (!line) return;
            const lines = doc.splitTextToSize(line, lineW);
            lines.slice(0, maxLinesPerTiming).forEach((l: string) => {
                if (rowY + lineH > y + dayHeaderH + contentH - 1) return;
                doc.text(l, x + blockPadding + 2, rowY + 2);
                rowY += lineH;
            });
            rowY += 0.5;
        });
    });

    let gridBottomY = bodyStartY + numRows * rowHeight;

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
            const stopOnDay = (leg.intermediateStops || []).some(s => dateMatchesDay(s.date));
            if (stopOnDay) return true;
            if (isRetourLeg(leg)) {
                return dateMatchesDay(leg.arrivalDate);
            }
            // Aller, Transport Jour J : même règle que les timings auto (départ/arrivée/étape ce jour)
            if (dateMatchesDay(leg.departureDate)) return true;
            if (dateMatchesDay(leg.arrivalDate)) return true;
            return false;
        });

        // Trier : d'abord tous les Aller (et Jour J), puis les Retour ; dans chaque groupe par heure
        const legsForExport = [...legsTouchingDays].sort((a, b) => {
            const aRetour = isRetourLeg(a) ? 1 : 0;
            const bRetour = isRetourLeg(b) ? 1 : 0;
            if (aRetour !== bRetour) return aRetour - bRetour; // Aller (0) avant Retour (1)
            return getLegFirstTimeOnDates(a, dateMatchesDay) - getLegFirstTimeOnDates(b, dateMatchesDay);
        });

        if (legsForExport.length > 0) {
            gridBottomY += 4;
            const vehHeaderH = 6;
            doc.setFillColor(...colorAccHeader);
            doc.setDrawColor(...colorBorder);
            doc.rect(margin, gridBottomY, contentW, vehHeaderH, 'FD');
            doc.setTextColor(...colorTextOnDark);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('Logistique véhicules — Qui monte, où et quand', margin + 3, gridBottomY + vehHeaderH / 2 + 1.2);
            doc.setFont('helvetica', 'normal');
            gridBottomY += vehHeaderH;
            doc.setFontSize(7);
            doc.setTextColor(...colorTextOnLight);

            let lastDirection: string | null = null;
            legsForExport.forEach(leg => {
                const isRetour = isRetourLeg(leg);
                const directionLabel = isRetour ? 'Retour' : 'Aller';
                if (lastDirection !== directionLabel) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(71, 85, 105);
                    doc.text(directionLabel, margin + 2, gridBottomY + 2.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(...colorTextOnLight);
                    gridBottomY += 3.5;
                    lastDirection = directionLabel;
                }

                const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                const driver = leg.driverId ? appState.staff.find(s => s.id === leg.driverId) : null;
                const driverName = driver ? `${driver.firstName} ${driver.lastName}` : '—';
                const dayEvents = getLegDayEvents(leg, dateMatchesDay, getOccupantName, driverName);

                doc.setFont('helvetica', 'bold');
                doc.text(sanitizeTextForPdf(`${vehicleName} (${leg.direction})`), margin + 3, gridBottomY + 2.5);
                doc.setFont('helvetica', 'normal');
                gridBottomY += 3;

                if (dayEvents.length === 0) {
                    doc.text('Aucun horaire ce jour pour ce véhicule.', margin + 5, gridBottomY + 2.5);
                    gridBottomY += 3;
                } else {
                    dayEvents.forEach(ev => {
                        const fullLine = sanitizeTextForPdf(ev.line);
                        const lines = doc.splitTextToSize(fullLine, contentW - margin - 10);
                        lines.slice(0, 2).forEach((l: string) => {
                            doc.text(l, margin + 5, gridBottomY + 2.5);
                            gridBottomY += 2.8;
                        });
                        if (lines.length > 2) gridBottomY += (lines.length - 2) * 2.8;
                        gridBottomY += 0.5;
                    });
                }
                gridBottomY += 2.5;
            });
            gridBottomY += 3;
        }
    }

    // Section hébergement (compact, tout sur une page)
    const accommodations = appState.eventAccommodations.filter(a => a.eventId === event.id);
    if (accommodations.length > 0) {
        const accHeaderH = 6;
        let y = gridBottomY + 4;
        doc.setFillColor(...colorAccHeader);
        doc.setDrawColor(...colorBorder);
        doc.rect(margin, y, contentW, accHeaderH, 'FD');
        doc.setTextColor(...colorTextOnDark);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Hébergement', margin + 3, y + accHeaderH / 2 + 1.2);
        doc.setFont('helvetica', 'normal');
        y += accHeaderH;
        doc.setFontSize(8);
        doc.setTextColor(...colorTextOnLight);
        accommodations.forEach(acc => {
            if (acc.hotelName) {
                doc.setFont('helvetica', 'bold');
                doc.text(sanitizeTextForPdf(acc.hotelName), margin + 3, y + 2.8);
                doc.setFont('helvetica', 'normal');
                y += 4;
            }
            if (acc.address) {
                doc.setFontSize(7);
                doc.splitTextToSize(sanitizeTextForPdf(acc.address), contentW - 6).forEach((l: string) => {
                    doc.text(l, margin + 3, y + 2.8);
                    y += 3.2;
                });
                doc.setFontSize(8);
            }
            y += 2;
        });
    }

    // Bas de page (footer) — une seule page
    const footerY = pageH - margin;
    doc.setDrawColor(...colorBorder);
    doc.line(margin, footerY - 6, margin + contentW, footerY - 6);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Timing du déplacement — Logicycle', pageW / 2, footerY - 3, { align: 'center' });

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
  setEventTransportLegs
}) => {
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
    if (!vehicleId) return 'Véhicule personnel';
    if (vehicleId === 'perso') {
      // Pour les véhicules personnels, afficher le nom de la personne
      if (leg && leg.occupants && leg.occupants.length > 0) {
        const occupantName = getOccupantName(leg.occupants[0].id, leg.occupants[0].type);
        return occupantName;
      }
      return 'Véhicule personnel';
    }
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
        if (leg.departureDate && leg.departureTime) {
            const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
            
            // Ne pas afficher les départs des véhicules personnels
            if (leg.assignedVehicleId !== 'perso') {
                const targetDay = getTargetMealDay(leg.departureDate);
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
        if (leg.arrivalDate && leg.arrivalTime) {
            const targetDay = getTargetMealDay(leg.arrivalDate);
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
                const targetDay = getTargetMealDay(stop.date);
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
                    
                                        // Format simple pour toutes les étapes
                    if (personsConcerned) {
                        const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                        description = `${stop.location} - Récupération ${personsConcerned} par ${vehicleName}`;
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
    if (raceInfo) {
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
    
    // Départ Hôtel et petit-déjeuner : à partir de l'arrivée sur site (ou d'une heure de référence si pas de présentation)
    const arrivalOnSiteTiming = timings.find(t => t.id === 'auto-arriveeSite');
    const raceInfoRef = event.raceInfo;
    const mainEventDayForHotel = raceInfoRef
      ? (getTargetMealDay(event.date) || getTargetMealDay(raceInfoRef.permanenceDate) || getTargetMealDay(raceInfoRef.reunionDSDate))
      : null;
    const accommodation = appState.eventAccommodations.find(a => a.eventId === event.id && !a.isStopover);
    const referenceArrivalTime = arrivalOnSiteTiming?.time ?? (raceInfoRef?.departFictifTime ? subtractDurationFromTimeOfDay(raceInfoRef.departFictifTime, 30) : raceInfoRef?.departReelTime ? subtractDurationFromTimeOfDay(raceInfoRef.departReelTime, 60) : null);
    const dayForHotel = arrivalOnSiteTiming?.targetMealDay ?? mainEventDayForHotel;

    if (referenceArrivalTime && dayForHotel && accommodation?.travelTimeToStart) {
      const travelDurationMinutes = parseDurationToMinutes(accommodation.travelTimeToStart);
      if (travelDurationMinutes !== null) {
        const totalTravelMinutesWithMargin = Math.ceil(travelDurationMinutes * 1.1);
        const hotelDepartureTime = subtractDurationFromTimeOfDay(referenceArrivalTime, totalTravelMinutesWithMargin);
        if (hotelDepartureTime) {
          const hasDepartHotel = timings.some(t => t.id === 'auto-departHotel');
          if (!hasDepartHotel) {
            timings.push({
              id: 'auto-departHotel',
              time: hotelDepartureTime,
              description: '🏨 Départ Hôtel',
              isAutoGenerated: true,
              targetMealDay: dayForHotel,
              category: OperationalTimingCategory.TRANSPORT
            });
          }
          const hasBreakfast = timings.some(t => t.id === 'auto-petitDejeuner');
          if (!hasBreakfast) {
            const breakfastTime = subtractDurationFromTimeOfDay(hotelDepartureTime, 90);
            if (breakfastTime) {
              timings.push({
                id: 'auto-petitDejeuner',
                time: breakfastTime,
                description: '🥐 Petit-déjeuner',
                isAutoGenerated: true,
                targetMealDay: dayForHotel,
                category: OperationalTimingCategory.REPAS
              });
            }
          }
        }
      }
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
  }, [event, appState.eventTransportLegs, appState.eventAccommodations]);

  const mainEventDayName = useMemo(() => {
    const dayMap: Record<number, MealDayEnum> = { 0: MealDayEnum.DIMANCHE, 1: MealDayEnum.LUNDI, 2: MealDayEnum.MARDI, 3: MealDayEnum.MERCREDI, 4: MealDayEnum.JEUDI, 5: MealDayEnum.VENDREDI, 6: MealDayEnum.SAMEDI };
    if (!event.date) return null;
    try {
        return dayMap[new Date(`${event.date}T12:00:00Z`).getUTCDay()];
    } catch { return null; }
  }, [event.date]);

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

    // Logique de groupement simplifiée (uniquement en mode équipe)
    const groupedDays = finalDays.map(day => {
        // En mode individuel, ne pas grouper les timings
        if (viewMode === 'individual') {
            return day;
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
            } else if (currentTiming.description.includes('Départ du')) {
                // Grouper les départs identiques
                const time = currentTiming.time;
                const vehicleName = currentTiming.description.replace('Départ du ', '');
                
                // Chercher d'autres départs à la même heure
                const vehicles: string[] = [vehicleName];
                
                for (let j = i + 1; j < day.keyTimings.length; j++) {
                    if (processedIndices.has(j)) continue;
                    
                    const nextTiming = day.keyTimings[j];
                    if (nextTiming.time === time && 
                        nextTiming.description.includes('Départ du')) {
                        
                        const nextVehicleName = nextTiming.description.replace('Départ du ', '');
                        vehicles.push(nextVehicleName);
                        processedIndices.add(j);
                    }
                }
                
                // Créer la description groupée avec tous les véhicules
                if (vehicles.length > 1) {
                    const uniqueVehicles = [...new Set(vehicles)];
                    const groupedDescription = `Départ des véhicules (${uniqueVehicles.join(', ')})`;
                    
                    newKeyTimings.push({
                        ...currentTiming,
                        description: groupedDescription
                    });
                } else {
                    newKeyTimings.push(currentTiming);
                }
            } else {
                // Pour tous les autres timings, les ajouter normalement
                newKeyTimings.push(currentTiming);
            }
        }
        return { ...day, keyTimings: newKeyTimings };
    });

    return groupedDays.sort((a, b) => Object.values(MealDayEnum).indexOf(a.dayName) - Object.values(MealDayEnum).indexOf(b.dayName));
  }, [logistics, autoGeneratedTimings]);
  
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-700">
            {viewMode === 'individual' 
              ? `Timing Personnel - ${getPersonName()}` 
              : 'Logistique Opérationnelle (Timing par Jour)'
            }
          </h3>
          {viewMode === 'individual' && (
            <p className="text-sm text-gray-500 mt-1">
              Affichage des trajets et timings personnels uniquement
            </p>
          )}
        </div>
        {!isEditing && viewMode === 'team' && (
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => setIsExportModalOpen(true)}
              variant="secondary"
            >
              Exporter le planning en PDF
            </ActionButton>
            <ActionButton onClick={() => setIsEditing(true)} variant="primary">
              Modifier Timings
            </ActionButton>
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

      {isEditing && viewMode === 'team' ? (
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


          {displayLogistics.length > 0 ? (
          displayLogistics.map(day => (
            <div key={day.id} className="p-3 mb-3 border rounded-md bg-gray-50">
              <h4 className="text-md font-semibold text-gray-700 mb-1 flex items-center">
                  {day.dayName}
                  {day.dayName === mainEventDayName && <span className="ml-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">JOUR J</span>}
              </h4>
              <ul className="space-y-1">
                {day.keyTimings.map(timing => {
                  const category = timing.category || OperationalTimingCategory.DIVERS;
                  const Icon = categoryStyles[category].icon;
                  const color = categoryStyles[category].color;
                  const title = timing.isAutoGenerated ? (timing.isOverridden ? 'Automatique, modifié' : 'Automatique') : 'Manuel';
                  
                  let description = timing.description || "N/A";
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

      {!isEditing && viewMode === 'team' && (
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
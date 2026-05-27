import { jsPDF } from 'jspdf';
import {
  EventTransportLeg,
  RaceEvent,
  StageRaceVehicleKind,
  StageDayLogistics,
  StageRavitoPoint,
  StageRavitoVehicle,
  StageTransferLogistics,
  TeamState,
  TransportDirection,
  TransportMode,
  TransportStopType,
} from '../types';
import {
  inferLogisticsPhase,
  isAllerDirection,
  isCoureusesVehicleLogisticsLeg,
  isJourJDirection,
  isRetourDirection,
  legTouchesStageDate,
} from './stageTransportLegUtils';
import { formatStageTitle } from './stageRaceUtils';

/** Coureuses = avant/après ; staff = pendant la course uniquement. */
export type VehicleLogisticsExportScope = 'coureuses' | 'staff';

const EXPORT_SCOPE_LABELS: Record<VehicleLogisticsExportScope, string> = {
  coureuses: 'Coureuses — avant / après la course',
  staff: 'Staff — pendant la course',
};

const EXPORT_SCOPE_DESCRIPTIONS: Record<VehicleLogisticsExportScope, string> = {
  coureuses: 'Allers sur la course, retours et transferts entre étapes',
  staff: 'Véhicules suiveur, ravitos et transports pendant l\'étape',
};

const PDF_PAGE_WIDTH = 210;
const PDF_PAGE_HEIGHT = 297;
const PDF_MARGIN = 15;
/** Marges pour l’export PDF coureuses (paysage) : plus de largeur utile, moins de pages. */
const COUREUSES_PAGE_MARGIN = 9;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
const PDF_TITLE_GRAY: [number, number, number] = [31, 41, 55];
const PDF_SUBTITLE_GRAY: [number, number, number] = [107, 114, 128];
const PDF_SECTION_GRAY: [number, number, number] = [75, 85, 99];
const PDF_LINE_GRAY: [number, number, number] = [229, 231, 235];
const PDF_BOX_BG: [number, number, number] = [248, 250, 252];
const PDF_BOX_BORDER: [number, number, number] = [226, 232, 240];
const PDF_LABEL_WIDTH = 28;
const PDF_LINE_H = 4.5;

const getDocPageSize = (doc: jsPDF): { w: number; h: number } => {
  const ps = (doc as unknown as {
    internal?: { pageSize?: { getWidth?: () => number; getHeight?: () => number; width?: number; height?: number } };
  }).internal?.pageSize;
  if (!ps) return { w: PDF_PAGE_WIDTH, h: PDF_PAGE_HEIGHT };
  const w = typeof ps.getWidth === 'function' ? ps.getWidth() : (ps.width ?? PDF_PAGE_WIDTH);
  const h = typeof ps.getHeight === 'function' ? ps.getHeight() : (ps.height ?? PDF_PAGE_HEIGHT);
  return { w, h };
};

const getDocContentWidth = (doc: jsPDF): number => getDocPageSize(doc).w - PDF_MARGIN * 2;

const getCoureusesContentWidth = (doc: jsPDF): number =>
  getDocPageSize(doc).w - COUREUSES_PAGE_MARGIN * 2;

const EMPTY_VALUE = '-';

const formatDateFr = (dateStr?: string): string => {
  if (!dateStr?.trim()) return EMPTY_VALUE;
  try {
    return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr || EMPTY_VALUE;
  }
};

const sanitizeTextForPdf = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[^\u0020-\u007E\u00A0-\u024F\n]/g, '')
    .trim();

const isPersonalVehicleLeg = (leg: EventTransportLeg): boolean =>
  leg.mode === TransportMode.VOITURE_PERSO
  || leg.mode === 'Voiture Personnelle'
  || leg.assignedVehicleId === 'perso';

const getVehicleLabel = (leg: EventTransportLeg, appState: TeamState): string => {
  if (isPersonalVehicleLeg(leg)) return 'Véhicule personnel';
  const vehicle = leg.assignedVehicleId
    ? appState.vehicles.find((v) => v.id === leg.assignedVehicleId)
    : undefined;
  if (vehicle?.name?.trim()) return vehicle.name.trim();
  if (
    leg.mode === TransportMode.VOITURE_EQUIPE
    || leg.mode === 'Voiture équipes'
    || leg.mode === 'Voiture Équipe'
  ) {
    return "Véhicule d'équipe";
  }
  if (leg.mode === TransportMode.MINIBUS) return 'Minibus';
  if (leg.mode === TransportMode.AUTRE) return 'Véhicule';
  return leg.mode || 'Transport';
};

const getDriverName = (leg: EventTransportLeg, appState: TeamState): string | null => {
  if (!leg.driverId) return null;
  const driver = appState.staff.find((s) => s.id === leg.driverId);
  return driver ? `${driver.firstName} ${driver.lastName}` : null;
};

const normalizePersonFullName = (firstName: string, lastName: string): string =>
  `${firstName} ${lastName}`.trim().toLowerCase();

const getOccupantsLabel = (leg: EventTransportLeg, appState: TeamState): string => {
  const names = (leg.occupants || [])
    .map((o) => {
      const person =
        o.type === 'rider'
          ? appState.riders.find((r) => r.id === o.id)
          : appState.staff.find((s) => s.id === o.id);
      return person ? `${person.firstName} ${person.lastName}` : '';
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : EMPTY_VALUE;
};

/** Passagers sans le conducteur (évite le doublon conducteur / à bord). */
const getOccupantsLabelExcludingDriver = (leg: EventTransportLeg, appState: TeamState): string => {
  const driver = leg.driverId ? appState.staff.find((s) => s.id === leg.driverId) : undefined;
  const driverKey = driver ? normalizePersonFullName(driver.firstName, driver.lastName) : '';
  const names = (leg.occupants || [])
    .map((o) => {
      const person =
        o.type === 'rider'
          ? appState.riders.find((r) => r.id === o.id)
          : appState.staff.find((s) => s.id === o.id);
      if (!person) return '';
      const full = `${person.firstName} ${person.lastName}`;
      if (driverKey && normalizePersonFullName(person.firstName, person.lastName) === driverKey) {
        return '';
      }
      if (o.type === 'staff' && leg.driverId && o.id === leg.driverId) return '';
      return full;
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : EMPTY_VALUE;
};

const formatLegDepartureStr = (leg: EventTransportLeg): string => {
  const datePart = leg.departureDate ? formatDateFr(leg.departureDate) : '';
  const time = leg.departureTime?.trim() || EMPTY_VALUE;
  const place = leg.departureLocation?.trim() || EMPTY_VALUE;
  if (datePart) return `${datePart} — ${time} — ${place}`;
  return `${time} — ${place}`;
};

const formatLegArrivalStr = (leg: EventTransportLeg): string => {
  const datePart = leg.arrivalDate ? formatDateFr(leg.arrivalDate) : '';
  const time = leg.arrivalTime?.trim() || EMPTY_VALUE;
  const place = leg.arrivalLocation?.trim() || EMPTY_VALUE;
  if (datePart) return `${datePart} — ${time} — ${place}`;
  return `${time} — ${place}`;
};

const isPickupType = (stopType: TransportStopType | string | undefined) => {
  if (!stopType) return false;
  const value = String(stopType);
  return value.includes('Récupération') || value.toLowerCase().includes('pickup');
};

const isDropoffType = (stopType: TransportStopType | string | undefined) => {
  if (!stopType) return false;
  const value = String(stopType);
  return value.includes('Dépose') || value.toLowerCase().includes('dropoff');
};

const getStopActionLabel = (leg: EventTransportLeg, stopType?: TransportStopType | string): string => {
  if (leg.direction === TransportDirection.ALLER || leg.direction === 'Aller') return 'Récupération';
  if (leg.direction === TransportDirection.RETOUR || leg.direction === 'Retour') return 'Dépose';
  if (isPickupType(stopType)) return 'Récupération';
  if (isDropoffType(stopType)) return 'Dépose';
  return 'Étape';
};

const getLegStopLines = (leg: EventTransportLeg, appState: TeamState): string[] => {
  if (!leg.intermediateStops?.length) return [];
  return leg.intermediateStops.map((stop) => {
    const label = getStopActionLabel(leg, stop.stopType);
    const datePart = stop.date
      ? new Date(stop.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      : '';
    const timePart = stop.time?.trim() || '';
    const locationPart = stop.location?.trim() || '';
    const whenWhere = [datePart, timePart, locationPart].filter(Boolean).join(' — ') || '—';
    const names = (stop.persons || [])
      .map((p) => {
        const person =
          p.type === 'rider'
            ? appState.riders.find((r) => r.id === p.id)
            : appState.staff.find((s) => s.id === p.id);
        return person ? `${person.firstName} ${person.lastName}` : '';
      })
      .filter(Boolean)
      .join(', ');
    return names ? `${label} : ${whenWhere} (${names})` : `${label} : ${whenWhere}`;
  });
};

/** Trajets où un conducteur / véhicule terrestre est pertinent (hors vol et train). */
export const isVehicleLogisticsLeg = (leg: EventTransportLeg): boolean => {
  if (leg.mode === TransportMode.VOL || leg.mode === TransportMode.TRAIN) return false;
  if (leg.driverId || leg.assignedVehicleId) return true;
  return [
    TransportMode.MINIBUS,
    TransportMode.VOITURE_EQUIPE,
    TransportMode.VOITURE_PERSO,
    TransportMode.AUTRE,
  ].includes(leg.mode);
};

export const resolveLegExportScope = (
  leg: EventTransportLeg,
  event: RaceEvent,
): VehicleLogisticsExportScope => {
  if (leg.logisticsPhase === 'pendant') return 'staff';
  if (leg.logisticsPhase === 'aller_course' || leg.logisticsPhase === 'retour') {
    return 'coureuses';
  }
  if (isRetourDirection(leg) || isAllerDirection(leg)) return 'coureuses';

  const stageDate = leg.stageDate || leg.departureDate || leg.arrivalDate || '';
  const stage = event.raceInfo?.stageDays?.find((s) => s.date === stageDate);

  if (isJourJDirection(leg) && stageDate) {
    return inferLogisticsPhase(leg, stageDate, stage) === 'pendant' ? 'staff' : 'coureuses';
  }

  if (isJourJDirection(leg)) {
    return leg.logisticsPhase === 'pendant' ? 'staff' : 'coureuses';
  }

  return 'coureuses';
};

export const legMatchesExportScope = (
  leg: EventTransportLeg,
  scope: VehicleLogisticsExportScope,
  event: RaceEvent,
): boolean => resolveLegExportScope(leg, event) === scope;

export const getVehicleLogisticsLegsForEvent = (
  event: RaceEvent,
  appState: TeamState,
  scope?: VehicleLogisticsExportScope,
  stageDate?: string,
): EventTransportLeg[] => {
  const directionOrder = (leg: EventTransportLeg): number => {
    if (leg.direction === TransportDirection.ALLER || leg.direction === 'Aller') return 0;
    if (leg.direction === TransportDirection.JOUR_J || leg.direction === 'Transport Jour J') return 1;
    return 2;
  };

  const legSortTime = (leg: EventTransportLeg): string => {
    const date = leg.departureDate || leg.arrivalDate || leg.stageDate || '';
    const time = leg.departureTime || leg.arrivalTime || '';
    return `${date}T${time}`;
  };

  return appState.eventTransportLegs
    .filter(
      (leg) =>
        leg.eventId === event.id
        && isVehicleLogisticsLeg(leg)
        && (!scope || legMatchesExportScope(leg, scope, event))
        && (scope !== 'coureuses' || isCoureusesVehicleLogisticsLeg(leg)),
    )
    .filter((leg) => (!stageDate ? true : legTouchesStageDate(leg, stageDate)))
    .sort((a, b) => {
      const dir = directionOrder(a) - directionOrder(b);
      if (dir !== 0) return dir;
      return legSortTime(a).localeCompare(legSortTime(b));
    });
};

/** Points géographiques du trajet (départ → étapes → arrivée) pour Google Maps. */
export const collectLegRoutePoints = (leg: EventTransportLeg): string[] => {
  const points: string[] = [];
  const pushUnique = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    if (points.length > 0 && points[points.length - 1].toLowerCase() === trimmed.toLowerCase()) return;
    points.push(trimmed);
  };
  pushUnique(leg.departureLocation);
  (leg.intermediateStops || []).forEach((stop) => pushUnique(stop.location));
  pushUnique(leg.arrivalLocation);
  return points;
};

export const buildGoogleMapsDirectionsUrl = (points: string[]): string | null => {
  const cleaned = points.map((p) => p.trim()).filter(Boolean);
  if (cleaned.length < 2) return null;
  const origin = encodeURIComponent(cleaned[0]);
  const destination = encodeURIComponent(cleaned[cleaned.length - 1]);
  const waypoints = cleaned.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.map(encodeURIComponent).join('|')}`;
  }
  return url;
};

const isUsablePlace = (place?: string): boolean => {
  const p = place?.trim();
  if (!p) return false;
  return p !== EMPTY_VALUE && p !== '—' && p !== '-';
};

/** Dernier lieu pertinent du trajet (arrivée, dernière étape, ou départ). */
export const getWazeNavigatePlaceForLeg = (leg: EventTransportLeg): string | null => {
  const routePoints = collectLegRoutePoints(leg);
  for (let i = routePoints.length - 1; i >= 0; i -= 1) {
    if (isUsablePlace(routePoints[i])) return routePoints[i].trim();
  }
  if (isUsablePlace(leg.arrivalLocation)) return leg.arrivalLocation!.trim();
  if (isUsablePlace(leg.departureLocation)) return leg.departureLocation!.trim();
  return null;
};

/** Lien Waze vers une adresse ou un lieu (navigation). */
export const buildWazeNavigateUrl = (place: string | undefined): string | null => {
  if (!isUsablePlace(place)) return null;
  return `https://www.waze.com/ul?q=${encodeURIComponent(place!.trim())}&navigate=yes`;
};

const STAFF_PAGE_MARGIN = 8;
const STAFF_LINE_H = 3;
const STAFF_LABEL_W = 22;
const STAFF_CARD_GAP = 3;
/** Mise à l'échelle : remplir la page sans dépasser une feuille A4 paysage. */
let staffPdfScale = 1;
const ss = (v: number): number => v * staffPdfScale;

const computeStaffPdfScale = (contentHeight: number, availableHeight: number): number => {
  if (contentHeight <= 0 || availableHeight <= 0) return 1;
  const target = (availableHeight * 0.94) / contentHeight;
  if (target > 1) return Math.min(1.1, target);
  return Math.max(0.74, target);
};
const STAFF_HEADER_BG: [number, number, number] = [30, 41, 59];
const STAFF_HEADER_ACCENT: [number, number, number] = [16, 185, 129];
const STAFF_SECTION_BAR_BG: [number, number, number] = [241, 245, 249];
const STAFF_ACCENT_JOUR_J: [number, number, number] = [234, 88, 12];
const STAFF_ACCENT_DEFAULT: [number, number, number] = [37, 99, 235];
const STAFF_ACCENT_RAVITO: [number, number, number] = [22, 163, 74];
const STAFF_DEP_BOX_TOP: [number, number, number] = [59, 130, 246];
const STAFF_ARR_BOX_TOP: [number, number, number] = [16, 185, 129];
const STAFF_TINT_JOUR_J: [number, number, number] = [255, 247, 237];
const STAFF_TINT_DEFAULT: [number, number, number] = [239, 246, 255];
const STAFF_TINT_RAVITO: [number, number, number] = [236, 253, 245];
const STAFF_POINT_NUM_BG: [number, number, number] = [209, 250, 229];
const STAFF_POINT_NUM_TEXT: [number, number, number] = [21, 128, 61];
const STAFF_NAV_FOOTER_BG: [number, number, number] = [248, 250, 252];
const STAFF_NAV_MAPS_BG: [number, number, number] = [239, 246, 255];
const STAFF_NAV_MAPS_BORDER: [number, number, number] = [147, 197, 253];
const STAFF_NAV_WAZE_BG: [number, number, number] = [255, 247, 237];
const STAFF_NAV_WAZE_BORDER: [number, number, number] = [253, 186, 116];
const STAFF_RAVITO_WAZE_BTN_H = 6.5;
const STAFF_CARD_HEADER_H = 8;
const STAFF_NAV_FOOTER_H = 7;
const MAX_STAFF_LEG_STOP_ROWS = 1;
const STAFF_BTN_FONT = 6.5;
const STAFF_BTN_H = 5.5;
const STAFF_SECTION_H = 6;
const STAFF_MAX_WRAP_LINES = 2;

const getStaffAccentTint = (accent: [number, number, number]): [number, number, number] => {
  if (accent === STAFF_ACCENT_JOUR_J) return STAFF_TINT_JOUR_J;
  if (accent === STAFF_ACCENT_RAVITO) return STAFF_TINT_RAVITO;
  return STAFF_TINT_DEFAULT;
};

const drawStaffSectionTitle = (
  doc: jsPDF,
  y: number,
  title: string,
  badge: string | undefined,
  hMargin: number,
): number => {
  const cw = getDocPageSize(doc).w - hMargin * 2;
  y = pdfEnsureSpaceStaffOnePage(doc, y, ss(STAFF_SECTION_H), hMargin);
  doc.setFillColor(...STAFF_SECTION_BAR_BG);
  doc.setDrawColor(...PDF_LINE_GRAY);
  doc.roundedRect(hMargin, y, cw, ss(STAFF_SECTION_H), 0.8, 0.8, 'FD');
  doc.setFillColor(...STAFF_HEADER_ACCENT);
  doc.rect(hMargin, y, 1.5, ss(STAFF_SECTION_H), 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5 * staffPdfScale);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.text(sanitizeTextForPdf(title), hMargin + 4, y + ss(4));
  if (badge) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5 * staffPdfScale);
    doc.setTextColor(...PDF_SUBTITLE_GRAY);
    doc.text(badge, hMargin + cw - 2, y + ss(4), { align: 'right' });
  }
  return y + ss(STAFF_SECTION_H) + ss(2);
};

/** Une seule page : pas de saut automatique (compactage prioritaire). */
const pdfEnsureSpaceStaffOnePage = (doc: jsPDF, y: number, needed: number, bottomMargin: number): number => {
  const pageH = getDocPageSize(doc).h;
  if (y + needed > pageH - bottomMargin) return y;
  return y;
};

const getStaffGridColumns = (itemCount: number): number => {
  if (itemCount >= 4) return 3;
  if (itemCount >= 2) return 2;
  return 1;
};

const truncatePdfText = (text: string, maxLen: number): string => {
  const t = sanitizeTextForPdf(text);
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(1, maxLen - 1))}…`;
};

const capPdfLines = (
  doc: jsPDF,
  text: string,
  width: number,
  maxLines: number = STAFF_MAX_WRAP_LINES,
): string[] => {
  const lines = doc.splitTextToSize(sanitizeTextForPdf(text), width);
  if (lines.length <= maxLines) return lines;
  if (maxLines <= 0) return [];
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncatePdfText(kept[maxLines - 1], 42);
  return kept;
};

const formatLegDepartureStaffCompact = (leg: EventTransportLeg): string => {
  const time = leg.departureTime?.trim() || '';
  const place = leg.departureLocation?.trim() || EMPTY_VALUE;
  return time ? `${time} — ${place}` : place;
};

const formatLegArrivalStaffCompact = (leg: EventTransportLeg): string => {
  const time = leg.arrivalTime?.trim() || EMPTY_VALUE;
  const place = leg.arrivalLocation?.trim() || EMPTY_VALUE;
  return `${time} — ${place}`;
};

const getRavitoPointsForStaffPdf = (points: StageRavitoPoint[]): StageRavitoPoint[] =>
  points.filter((p) => Boolean(formatRavitoPointLine(p)));

/** Bouton PDF avec zone cliquable explicite (fiabilité Preview / mobile). */
const drawPdfClickableButton = (
  doc: jsPDF,
  label: string,
  x: number,
  baselineY: number,
  url: string,
  colors: { bg: [number, number, number]; border: [number, number, number]; text: [number, number, number] },
): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(STAFF_BTN_FONT * staffPdfScale);
  const textW = doc.getTextWidth(label);
  const btnW = textW + ss(4);
  const btnH = ss(STAFF_BTN_H);
  const boxY = baselineY - btnH + ss(1.4);
  doc.setFillColor(...colors.bg);
  doc.setDrawColor(...colors.border);
  doc.roundedRect(x, boxY, btnW, btnH, 1.5, 1.5, 'FD');
  doc.setTextColor(...colors.text);
  doc.text(label, x + 3, baselineY);
  doc.link(x, boxY, btnW, btnH, { url });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return x + btnW + 3;
};

const drawPdfNavButtonRow = (
  doc: jsPDF,
  x: number,
  baselineY: number,
  mapsUrl: string | null,
  wazeUrl: string | null,
): void => {
  let lx = x;
  if (mapsUrl) {
    lx = drawPdfClickableButton(doc, 'Maps', lx, baselineY, mapsUrl, {
      bg: STAFF_NAV_MAPS_BG,
      border: STAFF_NAV_MAPS_BORDER,
      text: [29, 78, 216],
    });
  }
  if (wazeUrl) {
    drawPdfClickableButton(doc, 'Waze', lx, baselineY, wazeUrl, {
      bg: STAFF_NAV_WAZE_BG,
      border: STAFF_NAV_WAZE_BORDER,
      text: [194, 65, 12],
    });
  }
};

const getRavitoPointWazeLabel = (point: StageRavitoPoint, compact?: boolean): string => {
  if (compact) return 'Waze';
  const raw = point.label?.trim() || point.location?.trim() || 'Point';
  const short = raw.length > 16 ? `${raw.slice(0, 14)}…` : raw;
  return `Waze — ${short}`;
};

const getLegStopLinesForStaffPdf = (leg: EventTransportLeg, appState: TeamState): string[] => {
  if (MAX_STAFF_LEG_STOP_ROWS <= 0) return [];
  const full = getLegStopLines(leg, appState);
  if (full.length <= MAX_STAFF_LEG_STOP_ROWS) return full;
  return [...full.slice(0, MAX_STAFF_LEG_STOP_ROWS), `… +${full.length - MAX_STAFF_LEG_STOP_ROWS} étape(s)`];
};

const formatRaceVehicleStaffLinesCompact = (rv: StageRavitoVehicle, appState: TeamState): string[] => {
  const listedIds = new Set<string>();
  const veh = getFleetVehicleName(rv.vehicleId, appState);
  const driver = getFleetDriverName(rv.driverId, appState);
  const parts: string[] = [driver !== EMPTY_VALUE ? `${veh} — ${driver}` : veh];
  if (rv.driverId) listedIds.add(rv.driverId);
  if (rv.kind === StageRaceVehicleKind.RACE_FOLLOWER) {
    const ds = getFleetDriverName(rv.directeurSportifStaffId, appState);
    const meco = getFleetDriverName(rv.mecanoStaffId, appState);
    if (ds !== EMPTY_VALUE) parts.push(`DS:${ds}`);
    if (meco !== EMPTY_VALUE) parts.push(`Méca:${meco}`);
    if (rv.directeurSportifStaffId) listedIds.add(rv.directeurSportifStaffId);
    if (rv.mecanoStaffId) listedIds.add(rv.mecanoStaffId);
  }
  const aboard = (rv.staffOccupantIds ?? [])
    .filter((id) => !listedIds.has(id))
    .map((id) => getFleetDriverName(id, appState))
    .filter((n) => n !== EMPTY_VALUE);
  if (aboard.length > 0) parts.push(aboard.join(', '));
  return [truncatePdfText(parts.join(' · '), 72)];
};

const formatRavitoPointLine = (point: StageRavitoPoint): string | null => {
  const label = point.label?.trim() || '';
  const loc = point.location?.trim() || '';
  const arr = point.arrivalTime?.trim() || '';
  const dep = point.departureTime?.trim() || '';
  if (!label && !loc && !arr && !dep) return null;
  if (!loc && !arr && !dep) return null;
  const safeLabel = label || 'Point ravito';
  const safeLoc = loc || EMPTY_VALUE;
  if (dep) return `${safeLabel} : ${safeLoc} — arr.${arr || EMPTY_VALUE} dép.${dep}`;
  return `${safeLabel} : ${safeLoc}${arr ? ` — ${arr}` : ''}`;
};

const measureRavitoPointsWithWazeHeight = (
  doc: jsPDF,
  points: StageRavitoPoint[],
  innerWidth: number,
): number => {
  let h = 0;
  const textW = innerWidth - ss(6);
  points.forEach((point) => {
    const line = formatRavitoPointLine(point);
    if (!line) return;
    const wrapped = doc.splitTextToSize(sanitizeTextForPdf(line), textW);
    const lineCount = Math.max(1, wrapped.length);
    const hasWz = Boolean(buildWazeNavigateUrl(point.location));
    h += lineCount * ss(STAFF_LINE_H) + ss(4) + (hasWz ? ss(STAFF_RAVITO_WAZE_BTN_H) + ss(2) : ss(1)) + ss(1.5);
  });
  return h;
};

const drawRavitoPointsWithWaze = (
  doc: jsPDF,
  points: StageRavitoPoint[],
  textX: number,
  startCy: number,
  innerWidth: number,
): number => {
  let cy = startCy;
  const boxW = innerWidth;
  const textW = boxW - ss(6);
  let pointIndex = 0;
  points.forEach((point) => {
    const line = formatRavitoPointLine(point);
    if (!line) return;
    pointIndex += 1;
    const wrapped = doc.splitTextToSize(sanitizeTextForPdf(line), textW);
    const wz = buildWazeNavigateUrl(point.location);
    const boxH =
      Math.max(1, wrapped.length) * ss(STAFF_LINE_H) + ss(4) + (wz ? ss(STAFF_RAVITO_WAZE_BTN_H) + ss(2) : 0);
    const boxY = cy;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...PDF_LINE_GRAY);
    doc.roundedRect(textX, boxY, boxW, boxH, 1.2, 1.2, 'FD');
    doc.setFillColor(...STAFF_POINT_NUM_BG);
    doc.circle(textX + ss(5), boxY + ss(4.5), ss(2.6), 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5 * staffPdfScale);
    doc.setTextColor(...STAFF_POINT_NUM_TEXT);
    doc.text(String(pointIndex), textX + ss(5), boxY + ss(5), { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5 * staffPdfScale);
    doc.setTextColor(0, 0, 0);
    let lineY = boxY + ss(4);
    wrapped.forEach((w: string) => {
      doc.text(w, textX + ss(11), lineY);
      lineY += ss(STAFF_LINE_H);
    });
    if (wz) {
      drawPdfClickableButton(doc, getRavitoPointWazeLabel(point), textX + ss(10), lineY + ss(3), wz, {
        bg: STAFF_NAV_WAZE_BG,
        border: STAFF_NAV_WAZE_BORDER,
        text: [194, 65, 12],
      });
    }
    cy = boxY + boxH + ss(2);
  });
  return cy;
};

const getStaffLegAccentColor = (leg: EventTransportLeg): [number, number, number] => {
  if (leg.direction === TransportDirection.JOUR_J || leg.direction === 'Transport Jour J') {
    return STAFF_ACCENT_JOUR_J;
  }
  return STAFF_ACCENT_DEFAULT;
};

const getStaffLegDirectionBadge = (leg: EventTransportLeg): string => {
  if (leg.direction === TransportDirection.JOUR_J || leg.direction === 'Transport Jour J') {
    return 'JOUR J';
  }
  if (leg.direction === TransportDirection.ALLER || leg.direction === 'Aller') return 'ALLER';
  if (leg.direction === TransportDirection.RETOUR || leg.direction === 'Retour') return 'RETOUR';
  return String(leg.direction || 'TRANSPORT').toUpperCase();
};

const measureStaffStageGlobalArrivalHeight = (
  doc: jsPDF,
  stage: Pick<StageDayLogistics, 'arriveeLocation' | 'departLocation'>,
  cw: number,
): number => {
  const arr = stage.arriveeLocation?.trim();
  const dep = stage.departLocation?.trim();
  if (!isUsablePlace(arr) && !isUsablePlace(dep)) return 0;
  const half = (cw - 12) / 2;
  const colH = (place?: string): number =>
    isUsablePlace(place)
      ? capPdfLines(doc, place!, half - ss(22), 2).length * ss(STAFF_LINE_H) + ss(STAFF_NAV_FOOTER_H) + ss(1)
      : 0;
  const titleBarH = ss(5.5);
  return titleBarH + Math.max(colH(arr), isUsablePlace(dep) && dep !== arr ? colH(dep) : 0) + ss(2);
};

const drawStaffStageGlobalArrivalBlock = (
  doc: jsPDF,
  stage: Pick<StageDayLogistics, 'arriveeLocation' | 'departLocation'>,
  x: number,
  y: number,
  cw: number,
): { y: number; directionsCounted: number } => {
  const arr = stage.arriveeLocation?.trim();
  const dep = stage.departLocation?.trim();
  if (!isUsablePlace(arr) && !isUsablePlace(dep)) return { y, directionsCounted: 0 };

  const h = measureStaffStageGlobalArrivalHeight(doc, stage, cw);
  const padX = x + 3;
  const half = (cw - 12) / 2;
  const titleBarH = ss(5.5);
  const bodyTop = y + titleBarH + ss(1);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...STAFF_HEADER_ACCENT);
  doc.roundedRect(x, y, cw, h, 1.5, 1.5, 'FD');
  doc.setFillColor(...STAFF_TINT_RAVITO);
  doc.rect(x, y, cw, titleBarH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7 * staffPdfScale);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.text('GPS étape', padX, y + ss(3.6));

  let directionsCounted = 0;
  const drawPlaceCol = (colX: number, place: string): void => {
    let cy = bodyTop;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5 * staffPdfScale);
    doc.setTextColor(0, 0, 0);
    capPdfLines(doc, place, half - ss(22), 2).forEach((line: string) => {
      doc.text(line, colX, cy);
      cy += ss(STAFF_LINE_H);
    });
    const mapsUrl = buildGoogleMapsDirectionsUrl([place]);
    const wzUrl = buildWazeNavigateUrl(place);
    drawPdfNavButtonRow(doc, colX, cy + ss(2), mapsUrl, wzUrl);
    if (mapsUrl || wzUrl) directionsCounted += 1;
  };

  if (isUsablePlace(arr)) drawPlaceCol(padX, arr!);
  if (isUsablePlace(dep) && dep !== arr) drawPlaceCol(padX + half + 6, dep!);

  return { y: y + h + ss(1), directionsCounted };
};

const drawPdfLabelValue = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${label}`, x, y);
  doc.setFont('helvetica', 'normal');
  const wrapped = doc.splitTextToSize(sanitizeTextForPdf(value), width - PDF_LABEL_WIDTH);
  wrapped.forEach((line: string, index: number) => {
    doc.text(line, x + PDF_LABEL_WIDTH, y + index * PDF_LINE_H);
  });
  return y + Math.max(1, wrapped.length) * PDF_LINE_H + 1;
};

const drawPdfHeader = (
  doc: jsPDF,
  event: RaceEvent,
  scope: VehicleLogisticsExportScope,
  opts?: { compactCoureuses?: boolean; compactStaff?: boolean },
): number => {
  const { w } = getDocPageSize(doc);
  doc.setTextColor(...PDF_TITLE_GRAY);
  doc.setFont('helvetica', 'bold');
  if (opts?.compactStaff && scope === 'staff') {
    const headerH = ss(16);
    doc.setFillColor(...STAFF_HEADER_BG);
    doc.rect(0, 0, w, headerH, 'F');
    doc.setFillColor(...STAFF_HEADER_ACCENT);
    doc.rect(0, headerH - 1, w, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12 * staffPdfScale);
    doc.text(sanitizeTextForPdf(event.name), w / 2, ss(6.5), { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7 * staffPdfScale);
    doc.setTextColor(203, 213, 225);
    const end = event.endDate || event.date;
    doc.text(`Du ${formatDateFr(event.date)} au ${formatDateFr(end)}`, w / 2, ss(11), { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7 * staffPdfScale);
    doc.setTextColor(...STAFF_HEADER_ACCENT);
    doc.text('LOGISTIQUE STAFF — PENDANT LA COURSE', w / 2, ss(14.5), { align: 'center' });
    doc.setTextColor(0, 0, 0);
    return headerH + ss(2);
  }
  if (opts?.compactCoureuses && scope === 'coureuses') {
    const m = COUREUSES_PAGE_MARGIN;
    doc.setFontSize(11);
    doc.text(sanitizeTextForPdf(event.name), w / 2, 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_SUBTITLE_GRAY);
    const end = event.endDate || event.date;
    const range = `Du ${formatDateFr(event.date)} au ${formatDateFr(end)}`;
    doc.text(range, w / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_SECTION_GRAY);
    doc.text(
      sanitizeTextForPdf(`Logistique véhicules — ${EXPORT_SCOPE_LABELS[scope]}`),
      w / 2,
      19,
      { align: 'center' },
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_SUBTITLE_GRAY);
    doc.text('Allers, retours, transferts — détail dans Logicycle', w / 2, 23, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(...PDF_LINE_GRAY);
    const lineY = 25;
    doc.line(m, lineY, w - m, lineY);
    return lineY + 3;
  }
  doc.setFontSize(16);
  doc.text(sanitizeTextForPdf(event.name), w / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_SUBTITLE_GRAY);
  const end = event.endDate || event.date;
  const range = `Du ${formatDateFr(event.date)} au ${formatDateFr(end)}`;
  doc.text(range, w / 2, 25, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.text(
    sanitizeTextForPdf(`Logistique véhicules — ${EXPORT_SCOPE_LABELS[scope]}`),
    w / 2,
    32,
    { align: 'center' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_SUBTITLE_GRAY);
  doc.text(
    sanitizeTextForPdf(EXPORT_SCOPE_DESCRIPTIONS[scope]),
    w / 2,
    37,
    { align: 'center' },
  );
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(...PDF_LINE_GRAY);
  doc.line(PDF_MARGIN, 41, w - PDF_MARGIN, 41);
  return 47;
};

const buildExportFilenameSuffix = (scope: VehicleLogisticsExportScope): string =>
  scope === 'coureuses' ? 'coureuses_avant_apres' : 'staff_pendant';

const alertEmptyExport = (scope: VehicleLogisticsExportScope): void => {
  alert(
    scope === 'coureuses'
      ? 'Aucune logistique à exporter pour les coureuses (allers, retours ou transferts).'
      : 'Aucune logistique à exporter pour le staff (véhicules en course ou transports pendant l\'étape).',
  );
};

export interface VehicleLogisticsExportResult {
  legCount: number;
  legsWithDirections: number;
}

const getFleetVehicleName = (vehicleId: string | undefined, appState: TeamState): string => {
  if (!vehicleId) return EMPTY_VALUE;
  if (vehicleId === 'perso') return 'Véhicule personnel';
  return appState.vehicles.find((v) => v.id === vehicleId)?.name ?? 'Véhicule';
};

const getFleetDriverName = (driverId: string | undefined, appState: TeamState): string => {
  if (!driverId) return EMPTY_VALUE;
  const driver = appState.staff.find((s) => s.id === driverId);
  return driver ? `${driver.firstName} ${driver.lastName}` : EMPTY_VALUE;
};

export const hasVehicleLogisticsToExport = (
  event: RaceEvent,
  appState: TeamState,
  scope?: VehicleLogisticsExportScope,
  stageDate?: string,
): boolean => {
  if (!scope || scope === 'coureuses') {
    if (getVehicleLogisticsLegsForEvent(event, appState, 'coureuses', stageDate).length > 0) return true;
    if (
      event.raceInfo?.transfers?.some(
        (t) =>
          (t.vehicles?.length ?? 0) > 0
          && (!stageDate || t.fromDate === stageDate || t.toDate === stageDate),
      )
    ) {
      return true;
    }
  }
  if (!scope || scope === 'staff') {
    if (getVehicleLogisticsLegsForEvent(event, appState, 'staff', stageDate).length > 0) return true;
    if (
      event.raceInfo?.stageDays?.some(
        (d) =>
          (d.ravitoVehicles?.length ?? 0) > 0 && (!stageDate || d.date === stageDate),
      )
    ) {
      return true;
    }
  }
  return false;
};

export const hasVehicleLogisticsToExportForScope = (
  event: RaceEvent,
  appState: TeamState,
  scope: VehicleLogisticsExportScope,
  stageDate?: string,
): boolean => hasVehicleLogisticsToExport(event, appState, scope, stageDate);

const RACE_VEHICLE_KIND_LABELS: Record<StageRaceVehicleKind, string> = {
  [StageRaceVehicleKind.RACE_FOLLOWER]: 'Véhicule suiveur course',
  [StageRaceVehicleKind.RAVITO]: 'Véhicule ravito',
  [StageRaceVehicleKind.STAFF_SUPPORT]: 'Véhicule logistique',
};

const STAFF_RACE_VEHICLE_BADGE: Record<StageRaceVehicleKind, string> = {
  [StageRaceVehicleKind.RACE_FOLLOWER]: 'SUI',
  [StageRaceVehicleKind.RAVITO]: 'RAV',
  [StageRaceVehicleKind.STAFF_SUPPORT]: 'LOG',
};

const STAFF_RACE_VEHICLE_ACCENT: Record<StageRaceVehicleKind, [number, number, number]> = {
  [StageRaceVehicleKind.RACE_FOLLOWER]: STAFF_ACCENT_DEFAULT,
  [StageRaceVehicleKind.RAVITO]: STAFF_ACCENT_RAVITO,
  [StageRaceVehicleKind.STAFF_SUPPORT]: [109, 40, 217],
};

const getRaceVehicleKind = (rv: StageRavitoVehicle): StageRaceVehicleKind =>
  rv.kind ?? StageRaceVehicleKind.RAVITO;

const isStaffRavitoVehicle = (rv: StageRavitoVehicle): boolean =>
  getRaceVehicleKind(rv) === StageRaceVehicleKind.RAVITO;

const partitionStaffRaceVehicles = (
  entries: { rv: StageRavitoVehicle; stage: StageDayLogistics }[],
): {
  logistics: { rv: StageRavitoVehicle; stage: StageDayLogistics }[];
  ravitos: { rv: StageRavitoVehicle; stage: StageDayLogistics }[];
} => ({
  logistics: entries.filter((e) => !isStaffRavitoVehicle(e.rv)),
  ravitos: entries.filter((e) => isStaffRavitoVehicle(e.rv)),
});

const formatRaceVehicleTitle = (rv: StageRavitoVehicle): string => {
  const kind = getRaceVehicleKind(rv);
  const base = RACE_VEHICLE_KIND_LABELS[kind] || rv.roleLabel || 'Véhicule en course';
  return rv.roleLabel?.trim() && rv.roleLabel !== base ? `${base} — ${rv.roleLabel}` : base;
};

const formatRaceVehicleStaffLines = (rv: StageRavitoVehicle, appState: TeamState): string[] => {
  const lines: string[] = [];
  const listedIds = new Set<string>();
  const veh = getFleetVehicleName(rv.vehicleId, appState);
  lines.push(`Véhicule : ${veh}`);
  const driver = getFleetDriverName(rv.driverId, appState);
  if (driver !== EMPTY_VALUE) {
    lines.push(`Conducteur : ${driver}`);
    if (rv.driverId) listedIds.add(rv.driverId);
  }
  if (rv.kind === StageRaceVehicleKind.RACE_FOLLOWER) {
    const ds = getFleetDriverName(rv.directeurSportifStaffId, appState);
    const meco = getFleetDriverName(rv.mecanoStaffId, appState);
    if (ds !== EMPTY_VALUE) lines.push(`DS : ${ds}`);
    if (meco !== EMPTY_VALUE) lines.push(`Mécanicien : ${meco}`);
    if (rv.directeurSportifStaffId) listedIds.add(rv.directeurSportifStaffId);
    if (rv.mecanoStaffId) listedIds.add(rv.mecanoStaffId);
  }
  const aboard = (rv.staffOccupantIds ?? [])
    .filter((id) => !listedIds.has(id))
    .map((id) => getFleetDriverName(id, appState))
    .filter((n) => n !== EMPTY_VALUE);
  if (aboard.length > 0) {
    lines.push(`Équipage : ${aboard.join(', ')}`);
  }
  return lines;
};

const formatTransferHeader = (transfer: StageTransferLogistics): string => {
  const dep = transfer.departLocation?.trim() || EMPTY_VALUE;
  const arr = transfer.arriveeLocation?.trim() || EMPTY_VALUE;
  const time =
    transfer.departTime || transfer.arriveePrevueTime
      ? `${transfer.departTime || EMPTY_VALUE} → ${transfer.arriveePrevueTime || EMPTY_VALUE}`
      : '';
  return `Transfert ${formatDateFr(transfer.fromDate)} → ${formatDateFr(transfer.toDate)} : ${dep} → ${arr}${time ? ` (${time})` : ''}`;
};

const drawPdfTextBlock = (
  doc: jsPDF,
  title: string,
  lines: string[],
  y: number,
): number => {
  const titleWrapped = doc.splitTextToSize(sanitizeTextForPdf(title), PDF_CONTENT_WIDTH - 6);
  const bodyLines = lines.flatMap((line) =>
    doc.splitTextToSize(sanitizeTextForPdf(line), PDF_CONTENT_WIDTH - 6),
  );
  const boxHeight = 6 + titleWrapped.length * PDF_LINE_H + bodyLines.length * PDF_LINE_H + 6;
  const pageH = getDocPageSize(doc).h;
  if (y + boxHeight > pageH - PDF_MARGIN) {
    doc.addPage();
    y = PDF_MARGIN;
  }
  doc.setFillColor(...PDF_BOX_BG);
  doc.setDrawColor(...PDF_BOX_BORDER);
  doc.roundedRect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, boxHeight, 2, 2, 'FD');
  let cy = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_SECTION_GRAY);
  titleWrapped.forEach((line: string) => {
    doc.text(line, PDF_MARGIN + 3, cy);
    cy += PDF_LINE_H;
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  cy += 1;
  bodyLines.forEach((line: string) => {
    doc.text(line, PDF_MARGIN + 3, cy);
    cy += PDF_LINE_H;
  });
  return y + boxHeight + 3;
};

const COUREUSES_COMPACT_LINE = 2.85;
/** Colonne libellés (Départ:, Arrivée:) plus étroite sur la fiche coureuses pour gagner du texte. */
const COUREUSES_PDF_LABEL_W = 18;
const MAX_COUREUSES_ETAPES_ROWS = 1;
/** Lignes max par champ dans un bloc transfert (adresses longues). */
const COUREUSES_TRANSFER_MAX_WRAP_LINES = 2;

const getLegStopLinesForCoureusesPdf = (leg: EventTransportLeg, appState: TeamState): string[] => {
  const full = getLegStopLines(leg, appState);
  if (full.length <= MAX_COUREUSES_ETAPES_ROWS) return full;
  const extra = full.length - MAX_COUREUSES_ETAPES_ROWS;
  return [...full.slice(0, MAX_COUREUSES_ETAPES_ROWS), `… +${extra} étape(s) — voir Logicycle`];
};

/** Même rendu date que la convocation PDF (ex. « jeudi 14 mai »). */
const formatConvocationDayDate = (dateStr?: string): string => {
  if (!dateStr?.trim()) return '';
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const isPersonalVehicleLegExport = (leg: EventTransportLeg): boolean =>
  leg.mode === TransportMode.VOITURE_PERSO
  || leg.mode === 'Voiture Personnelle'
  || leg.assignedVehicleId === 'perso';

/** Libellé véhicule identique à la convocation (LogisticsSummaryTab). */
const getTransportLegLabelForExport = (leg: EventTransportLeg, vehicleName?: string | null): string => {
  if (isPersonalVehicleLegExport(leg)) return 'Véhicule personnel';
  if (vehicleName?.trim()) return vehicleName.trim();
  if (
    leg.mode === TransportMode.VOITURE_EQUIPE
    || leg.mode === 'Voiture équipes'
    || leg.mode === 'Voiture Équipe'
  ) {
    return "Véhicule d'équipe";
  }
  if (
    leg.assignedVehicleId
    && leg.assignedVehicleId !== 'perso'
    && (leg.mode === TransportMode.MINIBUS || leg.mode === TransportMode.AUTRE)
  ) {
    return "Véhicule d'équipe";
  }
  if (leg.mode === TransportMode.AUTRE || leg.mode === 'Autre') return "Véhicule d'équipe";
  return (leg.mode || '').trim() ? `(${leg.mode})` : '';
};

const getTransportLegTitleForCoureusesCell = (leg: EventTransportLeg, appState: TeamState): string => {
  const vehicle = leg.assignedVehicleId ? appState.vehicles.find((v) => v.id === leg.assignedVehicleId) : undefined;
  return getTransportLegLabelForExport(leg, vehicle?.name);
};

/** Clé d’alignement aller/retour : identique à getLegSortKey (convocation). */
const getLegPairingKey = (leg: EventTransportLeg, appState: TeamState): string => {
  if (isPersonalVehicleLegExport(leg)) return 'Véhicule personnel';
  const vehicle = leg.assignedVehicleId ? appState.vehicles.find((v) => v.id === leg.assignedVehicleId) : undefined;
  const label = getTransportLegLabelForExport(leg, vehicle?.name);
  return label || leg.id || '';
};

const formatLegDepartureConvocationStr = (leg: EventTransportLeg): string => {
  const depDayOnly = leg.departureDate ? formatConvocationDayDate(leg.departureDate) : '';
  const time = leg.departureTime?.trim() || '—';
  const loc = leg.departureLocation?.trim() || '—';
  if (depDayOnly) return `${depDayOnly} à ${time} de ${loc}`;
  return `${time} de ${loc}`;
};

const formatLegArrivalConvocationStr = (leg: EventTransportLeg): string => {
  const arrDayOnly = leg.arrivalDate ? formatConvocationDayDate(leg.arrivalDate) : '';
  const time = leg.arrivalTime?.trim() || '—';
  const loc = leg.arrivalLocation?.trim() || '—';
  if (arrDayOnly) return `${arrDayOnly} à ${time} à ${loc}`;
  return `${time} à ${loc}`;
};

const getOccupantsAbbrevConvocation = (leg: EventTransportLeg, appState: TeamState): string => {
  const parts = (leg.occupants || [])
    .map((o) => {
      const person =
        o.type === 'rider'
          ? appState.riders.find((r) => r.id === o.id)
          : appState.staff.find((s) => s.id === o.id);
      return person ? `${person.firstName[0]}.${person.lastName}` : '';
    })
    .filter(Boolean);
  return parts.join(', ');
};

const legDirectionIsAller = (leg: EventTransportLeg): boolean =>
  leg.direction === TransportDirection.ALLER || leg.direction === 'Aller';

const legDirectionIsRetour = (leg: EventTransportLeg): boolean =>
  leg.direction === TransportDirection.RETOUR || leg.direction === 'Retour';

const pdfEnsureSpace = (doc: jsPDF, y: number, needed: number, bottomMargin: number = PDF_MARGIN): number => {
  const pageH = getDocPageSize(doc).h;
  if (y + needed > pageH - bottomMargin) {
    doc.addPage();
    return bottomMargin;
  }
  return y;
};

const drawPdfTransportSectionTitle = (
  doc: jsPDF,
  y: number,
  title: string,
  opts?: { compact?: boolean; hMargin?: number },
): number => {
  const hMargin = opts?.hMargin ?? PDF_MARGIN;
  const cw = getDocPageSize(doc).w - hMargin * 2;
  let nextY = pdfEnsureSpace(doc, y, 12, hMargin);
  doc.setDrawColor(...PDF_LINE_GRAY);
  doc.line(hMargin, nextY, hMargin + cw, nextY);
  nextY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(opts?.compact ? 8 : 10);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.text(sanitizeTextForPdf(title), hMargin, nextY + 2.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(opts?.compact ? 7 : 9);
  return nextY + (opts?.compact ? COUREUSES_COMPACT_LINE + 2 : COUREUSES_COMPACT_LINE + 3.5);
};

const drawPdfNavLinksCoureuses = (
  doc: jsPDF,
  x: number,
  y: number,
  leg: EventTransportLeg,
  routePoints: string[],
): { y: number; countedDirections: number } => {
  const gmaps = buildGoogleMapsDirectionsUrl(routePoints);
  const wzArr = buildWazeNavigateUrl(getWazeNavigatePlaceForLeg(leg));
  let counted = 0;
  if (gmaps || wzArr) {
    drawPdfNavButtonRow(doc, x, y + 4, gmaps, wzArr);
    if (gmaps) counted += 1;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  return { y: y + (gmaps || wzArr ? COUREUSES_COMPACT_LINE + 3.5 : 0.5), countedDirections: counted };
};

const measureCoureusesLegCellHeight = (
  doc: jsPDF,
  leg: EventTransportLeg | null,
  width: number,
  appState: TeamState,
): number => {
  if (!leg) return COUREUSES_COMPACT_LINE * 2;
  const lineH = COUREUSES_COMPACT_LINE;
  let cy = 0;

  const title = getTransportLegTitleForCoureusesCell(leg, appState);
  const titleWrapped = doc.splitTextToSize(sanitizeTextForPdf(title), width - 2);
  cy += titleWrapped.length * lineH + 0.5;

  const depWrapped = doc.splitTextToSize(
    sanitizeTextForPdf(formatLegDepartureConvocationStr(leg)),
    width - COUREUSES_PDF_LABEL_W,
  );
  cy += lineH * 0.65 + Math.max(1, depWrapped.length) * lineH;

  const arrWrapped = doc.splitTextToSize(
    sanitizeTextForPdf(formatLegArrivalConvocationStr(leg)),
    width - COUREUSES_PDF_LABEL_W,
  );
  cy += lineH * 0.65 + Math.max(1, arrWrapped.length) * lineH;

  const driverName = getDriverName(leg, appState);
  const vehicle = leg.assignedVehicleId ? appState.vehicles.find((v) => v.id === leg.assignedVehicleId) : undefined;
  if (driverName) cy += lineH + 0.5;
  else if (vehicle) cy += lineH + 0.5;

  const occAbbrev = getOccupantsAbbrevConvocation(leg, appState);
  if (occAbbrev) {
    const ow = doc.splitTextToSize(sanitizeTextForPdf(occAbbrev), width - COUREUSES_PDF_LABEL_W);
    cy += lineH * 0.5 + Math.max(1, ow.length) * lineH;
  }

  const stopLines = getLegStopLinesForCoureusesPdf(leg, appState);
  if (stopLines.length > 0) {
    cy += lineH * 0.85 + lineH * 0.75;
    stopLines.forEach((line) => {
      const sw = doc.splitTextToSize(sanitizeTextForPdf(line), width - 6);
      cy += Math.max(1, sw.length) * lineH;
    });
  }

  const routePoints = collectLegRoutePoints(leg);
  const gmaps = buildGoogleMapsDirectionsUrl(routePoints);
  const wzArr = buildWazeNavigateUrl(getWazeNavigatePlaceForLeg(leg));
  const linkLines = gmaps || wzArr ? 1 : 0;
  cy += linkLines * (lineH + 0.35) + 0.8;

  return cy + 2;
};

const measureStaffLegCardHeight = (
  doc: jsPDF,
  leg: EventTransportLeg,
  width: number,
  appState: TeamState,
): number => {
  const inner = width - 10;
  const lh = ss(STAFF_LINE_H);
  let h = ss(STAFF_CARD_HEADER_H) + ss(2);
  h += Math.max(1, capPdfLines(doc, formatLegDepartureStaffCompact(leg), inner - 2, 2).length) * lh;
  h += Math.max(1, capPdfLines(doc, formatLegArrivalStaffCompact(leg), inner - 2, 2).length) * lh;
  const occLabel = getOccupantsLabelExcludingDriver(leg, appState);
  if (occLabel !== EMPTY_VALUE) {
    h += lh + ss(1);
  }
  const mapsUrl = buildGoogleMapsDirectionsUrl(collectLegRoutePoints(leg));
  const wzUrl = buildWazeNavigateUrl(getWazeNavigatePlaceForLeg(leg));
  if (mapsUrl || wzUrl) h += ss(STAFF_NAV_FOOTER_H) + ss(1);
  return h + ss(3);
};

const drawStaffLegCard = (
  doc: jsPDF,
  leg: EventTransportLeg,
  x: number,
  y: number,
  width: number,
  appState: TeamState,
): { height: number; directionsCounted: number } => {
  const height = measureStaffLegCardHeight(doc, leg, width, appState);
  const accent = getStaffLegAccentColor(leg);
  const badge = getStaffLegDirectionBadge(leg);
  const vehicleLabel = getVehicleLabel(leg, appState);
  const driverName = getDriverName(leg, appState);
  const inner = width - 10;
  const padX = x + 4;
  const contentX = padX + 2;
  const lh = ss(STAFF_LINE_H);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BOX_BORDER);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');
  doc.setFillColor(...accent);
  doc.rect(x, y, width, ss(1.5), 'F');

  const headerY = y + ss(2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6 * staffPdfScale);
  doc.setTextColor(255, 255, 255);
  const badgeW = doc.getTextWidth(badge) + ss(4);
  doc.setFillColor(...accent);
  doc.roundedRect(contentX, headerY + ss(2), badgeW, ss(5), 1.2, 1.2, 'F');
  doc.text(badge, contentX + ss(2), headerY + ss(5.2));
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.setFontSize(7.5 * staffPdfScale);
  const headerTitle = driverName
    ? `${sanitizeTextForPdf(vehicleLabel)} — ${sanitizeTextForPdf(driverName)}`
    : sanitizeTextForPdf(vehicleLabel);
  doc.splitTextToSize(headerTitle, inner - badgeW - 4).forEach((line: string, i: number) => {
    doc.text(line, contentX + badgeW + ss(2), headerY + ss(5.5) + i * lh);
  });

  let cy = headerY + ss(STAFF_CARD_HEADER_H) + ss(2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5 * staffPdfScale);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Dép.', contentX, cy + lh);
  doc.setFont('helvetica', 'normal');
  capPdfLines(doc, formatLegDepartureStaffCompact(leg), inner - 14, 2).forEach((line: string, i: number) => {
    doc.text(line, contentX + 12, cy + lh + i * lh);
  });
  cy += lh * 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Arr.', contentX, cy + lh);
  doc.setFont('helvetica', 'normal');
  capPdfLines(doc, formatLegArrivalStaffCompact(leg), inner - 14, 2).forEach((line: string, i: number) => {
    doc.text(line, contentX + 12, cy + lh + i * lh);
  });
  cy += lh * 2;

  const occLabel = getOccupantsLabelExcludingDriver(leg, appState);
  if (occLabel !== EMPTY_VALUE) {
    doc.setTextColor(...PDF_SUBTITLE_GRAY);
    capPdfLines(doc, `À bord : ${occLabel}`, inner, 1).forEach((line: string) => {
      doc.text(line, contentX, cy + lh);
    });
    doc.setTextColor(0, 0, 0);
    cy += lh;
  }

  const mapsUrl = buildGoogleMapsDirectionsUrl(collectLegRoutePoints(leg));
  const wzUrl = buildWazeNavigateUrl(getWazeNavigatePlaceForLeg(leg));
  let directionsCounted = 0;
  if (mapsUrl || wzUrl) {
    const footerY = y + height - ss(STAFF_NAV_FOOTER_H) - ss(1);
    doc.setFillColor(...STAFF_NAV_FOOTER_BG);
    doc.rect(contentX, footerY, inner, ss(STAFF_NAV_FOOTER_H), 'F');
    drawPdfNavButtonRow(doc, contentX + ss(2), footerY + ss(5), mapsUrl, wzUrl);
    directionsCounted += 1;
  }

  return { height, directionsCounted };
};

const STAFF_SUBSECTION_H = 5;

const drawStaffSubsectionTitle = (doc: jsPDF, y: number, title: string, hMargin: number): number => {
  const cw = getDocPageSize(doc).w - hMargin * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7 * staffPdfScale);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.text(sanitizeTextForPdf(title), hMargin, y + ss(3.5));
  doc.setDrawColor(...PDF_LINE_GRAY);
  doc.line(hMargin, y + ss(4.5), hMargin + cw, y + ss(4.5));
  return y + ss(STAFF_SUBSECTION_H);
};

const measureStaffCardGridHeight = <T>(
  doc: jsPDF,
  items: T[],
  cw: number,
  measure: (item: T, w: number) => number,
): number => {
  if (items.length === 0) return 0;
  const cols = getStaffGridColumns(items.length);
  const gap = ss(STAFF_CARD_GAP);
  const cardW = cols === 1 ? cw : (cw - gap * (cols - 1)) / cols;
  let h = 0;
  for (let i = 0; i < items.length; i += cols) {
    const row = items.slice(i, i + cols);
    const rowH = Math.max(...row.map((item) => measure(item, cardW))) + gap;
    h += rowH;
  }
  return h;
};

const measureStaffRaceVehicleCardHeight = (
  doc: jsPDF,
  rv: StageRavitoVehicle,
  width: number,
  appState: TeamState,
): number => {
  const inner = width - 10;
  const titleLines = doc.splitTextToSize(sanitizeTextForPdf(formatRaceVehicleTitle(rv)), inner - 18).length;
  let h = ss(STAFF_CARD_HEADER_H) + Math.max(0, titleLines - 1) * ss(STAFF_LINE_H) + ss(2);
  formatRaceVehicleStaffLines(rv, appState).forEach((line) => {
    const w = doc.splitTextToSize(sanitizeTextForPdf(line), inner);
    h += Math.max(1, w.length) * ss(STAFF_LINE_H);
  });
  if (isStaffRavitoVehicle(rv)) {
    const pdfPoints = getRavitoPointsForStaffPdf(rv.points);
    if (pdfPoints.length > 0) {
      h += ss(STAFF_LINE_H) + ss(1);
      h += measureRavitoPointsWithWazeHeight(doc, pdfPoints, inner);
    }
  }
  return h + ss(3);
};

const drawStaffRaceVehicleCard = (
  doc: jsPDF,
  rv: StageRavitoVehicle,
  x: number,
  y: number,
  width: number,
  appState: TeamState,
): { height: number } => {
  const height = measureStaffRaceVehicleCardHeight(doc, rv, width, appState);
  const kind = getRaceVehicleKind(rv);
  const accent = STAFF_RACE_VEHICLE_ACCENT[kind];
  const badge = STAFF_RACE_VEHICLE_BADGE[kind];
  const tint = getStaffAccentTint(accent);
  const padX = x + 4;
  const contentX = padX + 2;
  const inner = width - 10;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BOX_BORDER);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');
  doc.setFillColor(...accent);
  doc.rect(x, y, width, ss(1.5), 'F');

  const headerY = y + ss(2);
  const titleWrapped = doc.splitTextToSize(sanitizeTextForPdf(formatRaceVehicleTitle(rv)), inner - 20);
  const headerExtra = Math.max(0, titleWrapped.length - 1) * ss(STAFF_LINE_H);
  doc.setFillColor(...tint);
  doc.rect(padX, headerY, inner, ss(STAFF_CARD_HEADER_H) + headerExtra, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6 * staffPdfScale);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(...accent);
  const badgeW = ss(10);
  doc.roundedRect(contentX, headerY + ss(2), badgeW, ss(5), 1.2, 1.2, 'F');
  doc.text(badge, contentX + ss(2), headerY + ss(5.2));
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.setFontSize(7.5 * staffPdfScale);
  titleWrapped.forEach((line: string, i: number) => {
    doc.text(line, contentX + badgeW + ss(2), headerY + ss(5.5) + i * ss(STAFF_LINE_H));
  });

  let cy = headerY + ss(STAFF_CARD_HEADER_H) + headerExtra + ss(1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5 * staffPdfScale);
  doc.setTextColor(0, 0, 0);
  formatRaceVehicleStaffLines(rv, appState).forEach((line) => {
    doc.splitTextToSize(sanitizeTextForPdf(line), inner).forEach((w: string) => {
      doc.text(w, contentX, cy);
      cy += ss(STAFF_LINE_H);
    });
  });

  if (isStaffRavitoVehicle(rv)) {
    const pdfPoints = getRavitoPointsForStaffPdf(rv.points);
    if (pdfPoints.length > 0) {
      cy += ss(1);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5 * staffPdfScale);
      doc.setTextColor(...PDF_SECTION_GRAY);
      doc.text('Points ravito', contentX, cy);
      cy += ss(STAFF_LINE_H) + ss(0.5);
      drawRavitoPointsWithWaze(doc, pdfPoints, contentX, cy, inner);
    }
  }

  return { height };
};

const estimateStaffPdfContentHeight = (
  doc: jsPDF,
  legs: EventTransportLeg[],
  raceEntries: { rv: StageRavitoVehicle; stage: StageDayLogistics }[],
  stages: StageDayLogistics[],
  appState: TeamState,
  cw: number,
): number => {
  const { logistics, ravitos } = partitionStaffRaceVehicles(raceEntries);
  let h = 0;
  if (legs.length > 0 || raceEntries.length > 0) {
    h += STAFF_SECTION_H + 1;
  }
  const stageIdsDone = new Set<string>();
  stages.forEach((stage) => {
    if ((stage.ravitoVehicles?.length ?? 0) === 0 || stageIdsDone.has(stage.id)) return;
    stageIdsDone.add(stage.id);
    const blockH = measureStaffStageGlobalArrivalHeight(doc, stage, cw);
    if (blockH > 0) h += blockH + 1;
  });
  if (logistics.length > 0) {
    h += STAFF_SUBSECTION_H;
    h += measureStaffCardGridHeight(doc, logistics, cw, ({ rv }, w) =>
      measureStaffRaceVehicleCardHeight(doc, rv, w, appState),
    );
  }
  if (ravitos.length > 0) {
    h += STAFF_SUBSECTION_H;
    h += measureStaffCardGridHeight(doc, ravitos, cw, ({ rv }, w) =>
      measureStaffRaceVehicleCardHeight(doc, rv, w, appState),
    );
  }
  if (legs.length > 0) {
    h += STAFF_SUBSECTION_H;
    h += measureStaffCardGridHeight(doc, legs, cw, (leg, w) =>
      measureStaffLegCardHeight(doc, leg, w, appState),
    );
  }
  return h;
};

const estimateStaffPdfTotalHeight = (
  doc: jsPDF,
  legs: EventTransportLeg[],
  raceEntries: { rv: StageRavitoVehicle; stage: StageDayLogistics }[],
  stages: StageDayLogistics[],
  appState: TeamState,
  cw: number,
): number => 18 + estimateStaffPdfContentHeight(doc, legs, raceEntries, stages, appState, cw);

const drawStaffPendantLogisticsPdf = (
  doc: jsPDF,
  event: RaceEvent,
  legs: EventTransportLeg[],
  appState: TeamState,
  startY: number,
  stageDate?: string,
): { y: number; legsWithDirections: number } => {
  let y = startY;
  let legsWithDirections = 0;
  const m = STAFF_PAGE_MARGIN;
  const cw = getDocPageSize(doc).w - m * 2;

  const stages = (event.raceInfo?.stageDays ?? []).filter((stage) =>
    !stageDate ? true : stage.date === stageDate,
  );
  const raceEntries: { rv: StageRavitoVehicle; stage: (typeof stages)[0] }[] = [];
  stages.forEach((stage) => {
    (stage.ravitoVehicles ?? []).forEach((rv) => raceEntries.push({ rv, stage }));
  });
  const { logistics, ravitos } = partitionStaffRaceVehicles(raceEntries);

  const drawStaffCardGrid = <T>(
    items: T[],
    measure: (item: T, w: number) => number,
    draw: (item: T, x: number, yPos: number, w: number) => { directionsCounted?: number },
  ): void => {
    const cols = getStaffGridColumns(items.length);
    const gap = ss(STAFF_CARD_GAP);
    const cardW = cols === 1 ? cw : (cw - gap * (cols - 1)) / cols;
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols);
      const heights = row.map((item) => measure(item, cardW));
      const rowH = Math.max(...heights) + gap;
      y = pdfEnsureSpaceStaffOnePage(doc, y, rowH, m);
      row.forEach((item, col) => {
        const r = draw(item, m + col * (cardW + gap), y, cardW);
        if (r.directionsCounted) legsWithDirections += r.directionsCounted;
      });
      y += rowH;
    }
  };

  if (legs.length > 0 || raceEntries.length > 0) {
    const parts: string[] = [];
    if (logistics.length > 0) parts.push(`${logistics.length} logistique`);
    if (ravitos.length > 0) parts.push(`${ravitos.length} ravito${ravitos.length > 1 ? 's' : ''}`);
    if (legs.length > 0) parts.push(`${legs.length} trajet${legs.length > 1 ? 's' : ''}`);
    y = drawStaffSectionTitle(doc, y, 'PENDANT L\'ÉTAPE', parts.join(' · '), m);

    const stageIdsDone = new Set<string>();
    stages.forEach((stage) => {
      if ((stage.ravitoVehicles?.length ?? 0) === 0 || stageIdsDone.has(stage.id)) return;
      stageIdsDone.add(stage.id);
      const blockH = measureStaffStageGlobalArrivalHeight(doc, stage, cw);
      if (blockH > 0) {
        y = pdfEnsureSpaceStaffOnePage(doc, y, blockH + ss(1), m);
        const block = drawStaffStageGlobalArrivalBlock(doc, stage, m, y, cw);
        y = block.y;
        legsWithDirections += block.directionsCounted;
      }
    });

    if (logistics.length > 0) {
      y = drawStaffSubsectionTitle(
        doc,
        y,
        `Véhicules logistique & suiveur (${logistics.length})`,
        m,
      );
      drawStaffCardGrid(
        logistics,
        ({ rv }, w) => measureStaffRaceVehicleCardHeight(doc, rv, w, appState),
        ({ rv }, cardX, yPos, w) => {
          drawStaffRaceVehicleCard(doc, rv, cardX, yPos, w, appState);
          return {};
        },
      );
    }

    if (ravitos.length > 0) {
      y = drawStaffSubsectionTitle(doc, y, `Ravitos (${ravitos.length})`, m);
      drawStaffCardGrid(
        ravitos,
        ({ rv }, w) => measureStaffRaceVehicleCardHeight(doc, rv, w, appState),
        ({ rv }, cardX, yPos, w) => {
          drawStaffRaceVehicleCard(doc, rv, cardX, yPos, w, appState);
          return {};
        },
      );
    }

    if (legs.length > 0) {
      y = drawStaffSubsectionTitle(doc, y, `Transports Jour J (${legs.length})`, m);
      drawStaffCardGrid(
        legs,
        (leg, w) => measureStaffLegCardHeight(doc, leg, w, appState),
        (leg, cardX, yPos, w) => drawStaffLegCard(doc, leg, cardX, yPos, w, appState),
      );
    }
  }

  return { y, legsWithDirections };
};

const drawCoureusesLegCell = (
  doc: jsPDF,
  leg: EventTransportLeg,
  x: number,
  width: number,
  startY: number,
  appState: TeamState,
): { endY: number; directionsCounted: number } => {
  const lineH = COUREUSES_COMPACT_LINE;
  let cy = startY;
  const vehicle = leg.assignedVehicleId ? appState.vehicles.find((v) => v.id === leg.assignedVehicleId) : undefined;
  const driver = leg.driverId ? appState.staff.find((s) => s.id === leg.driverId) : undefined;
  const modeLabel = getTransportLegLabelForExport(leg, vehicle?.name);
  const title = modeLabel || leg.personName || 'Trajet';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.splitTextToSize(sanitizeTextForPdf(title), width - 2).forEach((w: string) => {
    doc.text(w, x, cy + 2.5);
    cy += lineH;
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  cy += 0.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Départ:', x, cy + 2.5);
  doc.setFont('helvetica', 'normal');
  doc
    .splitTextToSize(sanitizeTextForPdf(formatLegDepartureConvocationStr(leg)), width - COUREUSES_PDF_LABEL_W)
    .forEach((w: string) => {
      doc.text(w, x + COUREUSES_PDF_LABEL_W, cy + 2.5);
      cy += lineH;
    });
  cy += 0.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Arrivée:', x, cy + 2.5);
  doc.setFont('helvetica', 'normal');
  doc
    .splitTextToSize(sanitizeTextForPdf(formatLegArrivalConvocationStr(leg)), width - COUREUSES_PDF_LABEL_W)
    .forEach((w: string) => {
      doc.text(w, x + COUREUSES_PDF_LABEL_W, cy + 2.5);
      cy += lineH;
    });
  cy += 0.5;

  if (driver) {
    doc.setFont('helvetica', 'bold');
    doc.text('Conducteur:', x, cy + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${driver.firstName} ${driver.lastName}`, x + COUREUSES_PDF_LABEL_W, cy + 2.5);
    cy += lineH + 0.5;
  } else if (vehicle) {
    doc.setFont('helvetica', 'bold');
    doc.text('Véhicule:', x, cy + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.text(vehicle.name, x + COUREUSES_PDF_LABEL_W, cy + 2.5);
    cy += lineH + 0.5;
  }

  const occAbbrev = getOccupantsAbbrevConvocation(leg, appState);
  if (occAbbrev) {
    doc.setFont('helvetica', 'bold');
    doc.text('À bord:', x, cy + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.splitTextToSize(sanitizeTextForPdf(occAbbrev), width - COUREUSES_PDF_LABEL_W).forEach((w: string) => {
      doc.text(w, x + COUREUSES_PDF_LABEL_W, cy + 2.5);
      cy += lineH;
    });
    cy += 0.5;
  }

  const stopLines = getLegStopLinesForCoureusesPdf(leg, appState);
  if (stopLines.length > 0) {
    cy += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text('Étapes:', x, cy + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    cy += lineH * 0.85;
    stopLines.forEach((line) => {
      doc.splitTextToSize(sanitizeTextForPdf(line), width - 6).forEach((w: string) => {
        doc.text(w, x + 4, cy + 2.5);
        cy += lineH;
      });
    });
    doc.setFontSize(6.8);
  }

  const routePoints = collectLegRoutePoints(leg);
  const nav = drawPdfNavLinksCoureuses(doc, x, cy, leg, routePoints);

  return { endY: nav.y + 1, directionsCounted: nav.countedDirections };
};

const drawCoureusesLegsConvocationStylePdf = (
  doc: jsPDF,
  legs: EventTransportLeg[],
  appState: TeamState,
  startY: number,
): { y: number; legsWithDirections: number } => {
  let y = startY;
  let legsWithDirections = 0;

  const allerLegs = legs.filter(legDirectionIsAller);
  const retourLegs = legs.filter(legDirectionIsRetour);
  const autresLegs = legs.filter(
    (l) =>
      !legDirectionIsAller(l)
      && !legDirectionIsRetour(l)
      && isCoureusesVehicleLogisticsLeg(l),
  );

  if (allerLegs.length > 0 || retourLegs.length > 0) {
    y = drawPdfTransportSectionTitle(doc, y, 'TRANSPORT', {
      compact: true,
      hMargin: COUREUSES_PAGE_MARGIN,
    });

    const m = COUREUSES_PAGE_MARGIN;
    const cw = getCoureusesContentWidth(doc);
    const boxX = m;
    const boxW = cw;
    const colW = (boxW - 3) / 2;
    const xLeft = boxX + 1.5;
    const xRight = boxX + 1.5 + colW + 1.5;
    const colInner = colW - 2;

    const allKeys = Array.from(
      new Set([
        ...allerLegs.map((l) => getLegPairingKey(l, appState)),
        ...retourLegs.map((l) => getLegPairingKey(l, appState)),
      ]),
    ).sort((a, b) => {
      if (a === 'Véhicule personnel' && b !== 'Véhicule personnel') return 1;
      if (b === 'Véhicule personnel' && a !== 'Véhicule personnel') return -1;
      return a.localeCompare(b);
    });

    type Row = { aller: EventTransportLeg | null; retour: EventTransportLeg | null };
    const rows: Row[] = allKeys.map((key) => ({
      aller: allerLegs.find((l) => getLegPairingKey(l, appState) === key) ?? null,
      retour: retourLegs.find((l) => getLegPairingKey(l, appState) === key) ?? null,
    }));

    const headerH = COUREUSES_COMPACT_LINE + 3;
    const rowHeights = rows.map((row, idx) =>
      (idx > 0 ? 1.5 : 0)
      + Math.max(
        measureCoureusesLegCellHeight(doc, row.aller, colInner, appState),
        measureCoureusesLegCellHeight(doc, row.retour, colInner, appState),
      ),
    );
    const boxH = headerH + 2 + rowHeights.reduce((a, b) => a + b, 0) + 3;

    y = pdfEnsureSpace(doc, y, boxH + 3, m);
    const boxY = y;

    doc.setFillColor(...PDF_BOX_BG);
    doc.setDrawColor(...PDF_BOX_BORDER);
    doc.rect(boxX, boxY, boxW, boxH, 'FD');
    doc.setDrawColor(...PDF_LINE_GRAY);
    doc.line(boxX + boxW / 2, boxY, boxX + boxW / 2, boxY + boxH);
    doc.line(boxX, boxY + headerH, boxX + boxW, boxY + headerH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_SECTION_GRAY);
    doc.text('DÉPART (Aller)', boxX + colW / 2, boxY + headerH / 2 + 1.2, { align: 'center' });
    doc.text('RETOUR', boxX + boxW / 2 + colW / 2, boxY + headerH / 2 + 1.2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    let rowY = boxY + headerH + 1.5;
    rows.forEach((row, idx) => {
      if (idx > 0) {
        doc.setDrawColor(...PDF_LINE_GRAY);
        doc.line(xLeft, rowY + 0.5, xLeft + colInner, rowY + 0.5);
        doc.line(xRight, rowY + 0.5, xRight + colInner, rowY + 0.5);
        rowY += 1.5;
      }
      const startRowY = rowY;
      let cyL = startRowY;
      let cyR = startRowY;
      if (row.aller) {
        const r = drawCoureusesLegCell(doc, row.aller, xLeft, colInner, cyL, appState);
        cyL = r.endY;
        legsWithDirections += r.directionsCounted;
      }
      if (row.retour) {
        const r = drawCoureusesLegCell(doc, row.retour, xRight, colInner, cyR, appState);
        cyR = r.endY;
        legsWithDirections += r.directionsCounted;
      }
      rowY = Math.max(cyL, cyR);
    });

    y = boxY + boxH + 2;
  }

  if (autresLegs.length > 0) {
    const m = COUREUSES_PAGE_MARGIN;
    const cw = getCoureusesContentWidth(doc);
    y = drawPdfTransportSectionTitle(doc, y, 'AUTRES TRAJETS (hors aller/retour classique)', {
      compact: true,
      hMargin: m,
    });
    autresLegs.forEach((leg) => {
      const est = measureCoureusesLegCellHeight(doc, leg, cw - 6, appState) + 6;
      y = pdfEnsureSpace(doc, y, est + 2, m);
      const boxY = y;
      const h = est;
      doc.setFillColor(...PDF_BOX_BG);
      doc.setDrawColor(...PDF_BOX_BORDER);
      doc.roundedRect(m, boxY, cw, h, 2, 2, 'FD');
      const r = drawCoureusesLegCell(doc, leg, m + 3, cw - 6, boxY + 2.5, appState);
      legsWithDirections += r.directionsCounted;
      y = boxY + h + 2;
    });
  }

  return { y, legsWithDirections };
};

const buildCoureusesTransferBodyLines = (
  transfer: StageTransferLogistics,
  appState: TeamState,
): string[] => {
  const depAddr = transfer.departLocation?.trim() || '';
  const arrAddr = transfer.arriveeLocation?.trim() || '';
  const vehLines = (transfer.vehicles ?? []).map((tv) => {
    const role = tv.roleLabel?.trim() || 'Véhicule';
    const name = getFleetVehicleName(tv.vehicleId, appState);
    const drv = getFleetDriverName(tv.driverId, appState);
    return `${role}: ${name} (${drv})`;
  });
  return [
    sanitizeTextForPdf(`Période : ${formatDateFr(transfer.fromDate)} → ${formatDateFr(transfer.toDate)}`),
    depAddr ? sanitizeTextForPdf(`Départ : ${depAddr}`) : '',
    arrAddr ? sanitizeTextForPdf(`Arrivée : ${arrAddr}`) : '',
    ...vehLines.map((l) => sanitizeTextForPdf(l)),
  ].filter(Boolean);
};

const measureCoureusesTransferBoxHeight = (
  doc: jsPDF,
  transfer: StageTransferLogistics,
  boxOuterW: number,
  appState: TeamState,
): number => {
  const inner = Math.max(20, boxOuterW - 6);
  const lh = COUREUSES_COMPACT_LINE;
  const bodyPreview = buildCoureusesTransferBodyLines(transfer, appState);
  const depAddr = transfer.departLocation?.trim() || '';
  const arrAddr = transfer.arriveeLocation?.trim() || '';
  const routePts = [depAddr, arrAddr].filter(Boolean);
  const gmaps = buildGoogleMapsDirectionsUrl(routePts);
  const wzArr = buildWazeNavigateUrl(transfer.arriveeLocation);

  let h = 3.5 + lh + 1;
  bodyPreview.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, inner);
    const lines = Math.min(COUREUSES_TRANSFER_MAX_WRAP_LINES, Math.max(1, wrapped.length));
    h += lines * lh;
  });
  h += 0.5;
  if (gmaps || wzArr) h += lh + 0.35;
  return h + 2.5;
};

const drawCoureusesTransferBox = (
  doc: jsPDF,
  transfer: StageTransferLogistics,
  boxX: number,
  boxY: number,
  boxOuterW: number,
  appState: TeamState,
): { height: number; legsWithDirections: number } => {
  const height = measureCoureusesTransferBoxHeight(doc, transfer, boxOuterW, appState);
  const inner = Math.max(20, boxOuterW - 6);
  const lh = COUREUSES_COMPACT_LINE;
  const textX = boxX + 3;

  const depAddr = transfer.departLocation?.trim() || '';
  const arrAddr = transfer.arriveeLocation?.trim() || '';
  const routePts = [depAddr, arrAddr].filter(Boolean);
  const gmaps = buildGoogleMapsDirectionsUrl(routePts);
  const wzArr = buildWazeNavigateUrl(transfer.arriveeLocation);
  const bodyPreview = buildCoureusesTransferBodyLines(transfer, appState);

  doc.setFillColor(...PDF_BOX_BG);
  doc.setDrawColor(...PDF_BOX_BORDER);
  doc.roundedRect(boxX, boxY, boxOuterW, height, 1.5, 1.5, 'FD');
  let cy = boxY + 3.5;
  let legsWithDirections = 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_SECTION_GRAY);
  doc.text(sanitizeTextForPdf('Transfert'), textX, cy);
  cy += lh + 1;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  bodyPreview.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, inner);
    const show = wrapped.slice(0, COUREUSES_TRANSFER_MAX_WRAP_LINES);
    show.forEach((w: string) => {
      doc.text(w, textX, cy);
      cy += lh;
    });
  });
  cy += 0.5;
  if (gmaps || wzArr) {
    drawPdfNavButtonRow(doc, textX, cy + 4, gmaps, wzArr);
    if (gmaps) legsWithDirections += 1;
    cy += lh + 2;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  return { height, legsWithDirections };
};

const drawCoureusesTransferBlocksPdf = (
  doc: jsPDF,
  event: RaceEvent,
  appState: TeamState,
  startY: number,
  stageDate?: string,
): { y: number; legsWithDirections: number } => {
  let y = startY;
  let legsWithDirections = 0;
  const transfers = (event.raceInfo?.transfers ?? []).filter(
    (transfer) =>
      (transfer.vehicles?.length ?? 0) > 0
      && (!stageDate || transfer.fromDate === stageDate || transfer.toDate === stageDate),
  );
  if (transfers.length === 0) return { y, legsWithDirections };

  const m = COUREUSES_PAGE_MARGIN;
  const cw = getCoureusesContentWidth(doc);
  y = drawPdfTransportSectionTitle(doc, y, 'TRANSFERTS INTER-ÉTAPES', {
    compact: true,
    hMargin: m,
  });

  const colGap = 2;
  const halfW = (cw - colGap) / 2;

  let i = 0;
  while (i < transfers.length) {
    const left = transfers[i];
    const right = transfers[i + 1];
    if (right) {
      const hL = measureCoureusesTransferBoxHeight(doc, left, halfW, appState);
      const hR = measureCoureusesTransferBoxHeight(doc, right, halfW, appState);
      const rowH = Math.max(hL, hR) + 2;
      y = pdfEnsureSpace(doc, y, rowH + 1, m);
      const r1 = drawCoureusesTransferBox(doc, left, m, y, halfW, appState);
      const r2 = drawCoureusesTransferBox(doc, right, m + halfW + colGap, y, halfW, appState);
      legsWithDirections += r1.legsWithDirections + r2.legsWithDirections;
      y += rowH;
      i += 2;
    } else {
      const h = measureCoureusesTransferBoxHeight(doc, left, cw, appState);
      y = pdfEnsureSpace(doc, y, h + 2, m);
      const r = drawCoureusesTransferBox(doc, left, m, y, cw, appState);
      legsWithDirections += r.legsWithDirections;
      y += h + 2;
      i += 1;
    }
  }

  return { y, legsWithDirections };
};

export const exportVehicleLogisticsPdf = (
  event: RaceEvent,
  appState: TeamState,
  scope: VehicleLogisticsExportScope,
  stageDate?: string,
): VehicleLogisticsExportResult => {
  const legs = getVehicleLogisticsLegsForEvent(event, appState, scope, stageDate);
  const includeRavito = scope === 'staff';
  const includeTransfers = scope === 'coureuses';
  const hasRavito =
    includeRavito
    && (event.raceInfo?.stageDays ?? []).some(
      (d) => (d.ravitoVehicles?.length ?? 0) > 0 && (!stageDate || d.date === stageDate),
    );
  const hasTransfers =
    includeTransfers
    && (event.raceInfo?.transfers ?? []).some(
      (t) =>
        (t.vehicles?.length ?? 0) > 0
        && (!stageDate || t.fromDate === stageDate || t.toDate === stageDate),
    );

  if (legs.length === 0 && !hasRavito && !hasTransfers) {
    alertEmptyExport(scope);
    return { legCount: 0, legsWithDirections: 0 };
  }

  const doc = new jsPDF({
    orientation: scope === 'coureuses' || scope === 'staff' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y: number;
  let legsWithDirections = 0;

  if (scope === 'staff') {
    staffPdfScale = 1;
    const m = STAFF_PAGE_MARGIN;
    const cw = getDocPageSize(doc).w - m * 2;
    const stages = (event.raceInfo?.stageDays ?? []).filter((s) =>
      !stageDate ? true : s.date === stageDate,
    );
    const raceEntries: { rv: StageRavitoVehicle; stage: StageDayLogistics }[] = [];
    stages.forEach((stage) => {
      (stage.ravitoVehicles ?? []).forEach((rv) => raceEntries.push({ rv, stage }));
    });
    staffPdfScale = 1;
    const pageH = getDocPageSize(doc).h;
    const totalEst = estimateStaffPdfTotalHeight(doc, legs, raceEntries, stages, appState, cw);
    const available = pageH - m;
    staffPdfScale = computeStaffPdfScale(totalEst, available);
    const noopAddPage = doc.addPage.bind(doc);
    doc.addPage = () => doc;
    y = drawPdfHeader(doc, event, scope, { compactStaff: true });
    const staff = drawStaffPendantLogisticsPdf(doc, event, legs, appState, y, stageDate);
    y = staff.y;
    legsWithDirections += staff.legsWithDirections;
    doc.addPage = noopAddPage;
    while (doc.getNumberOfPages() > 1) {
      doc.deletePage(doc.getNumberOfPages());
    }
  } else {
    y = drawPdfHeader(
      doc,
      event,
      scope,
      scope === 'coureuses' ? { compactCoureuses: true } : undefined,
    );
  }

  if (scope === 'coureuses') {
    const conv = drawCoureusesLegsConvocationStylePdf(doc, legs, appState, y);
    y = conv.y;
    legsWithDirections += conv.legsWithDirections;
    const tr = drawCoureusesTransferBlocksPdf(doc, event, appState, y, stageDate);
    y = tr.y;
    legsWithDirections += tr.legsWithDirections;
  }

  const safeName = event.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'evenement';
  doc.save(`Logistique_vehicules_${buildExportFilenameSuffix(scope)}_${safeName}.pdf`);
  return { legCount: legs.length, legsWithDirections };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const htmlNavigationLinksForRavito = (rv: StageRavitoVehicle): string => {
  const routePoints = rv.points.map((p) => p.location?.trim()).filter(Boolean) as string[];
  const mapsUrl = buildGoogleMapsDirectionsUrl(routePoints);
  const parts: string[] = [];
  if (mapsUrl) {
    parts.push(
      `<a class="maps-btn" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Google Maps — itinéraire</a>`,
    );
  }
  rv.points.forEach((point) => {
    const wz = buildWazeNavigateUrl(point.location);
    if (wz) {
      parts.push(
        `<a class="waze-btn" href="${wz}" target="_blank" rel="noopener noreferrer">${escapeHtml(getRavitoPointWazeLabel(point))}</a>`,
      );
    }
  });
  return parts.length > 0
    ? `<div class="nav-btns">${parts.join(' ')}</div>`
    : '';
};

const htmlNavigationLinksForLeg = (leg: EventTransportLeg): string => {
  const routePoints = collectLegRoutePoints(leg);
  const mapsUrl = buildGoogleMapsDirectionsUrl(routePoints);
  const wzArr = buildWazeNavigateUrl(getWazeNavigatePlaceForLeg(leg));
  const parts: string[] = [];
  if (mapsUrl) {
    parts.push(
      `<a class="maps-btn" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Google Maps</a>`,
    );
  }
  if (wzArr) {
    parts.push(
      `<a class="waze-btn" href="${wzArr}" target="_blank" rel="noopener noreferrer">Waze — arrivée</a>`,
    );
  }
  return parts.length > 0
    ? `<div class="nav-btns">${parts.join(' ')}</div>`
    : '<p class="muted">Renseignez les adresses complètes pour activer la navigation.</p>';
};

const htmlNavigationLinksForTransfer = (transfer: StageTransferLogistics): string => {
  const pts = [transfer.departLocation, transfer.arriveeLocation]
    .map((p) => p?.trim())
    .filter(Boolean) as string[];
  const mapsUrl = buildGoogleMapsDirectionsUrl(pts);
  const wzArr = buildWazeNavigateUrl(transfer.arriveeLocation);
  const parts: string[] = [];
  if (mapsUrl) {
    parts.push(
      `<a class="maps-btn" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Google Maps</a>`,
    );
  }
  if (wzArr) parts.push(`<a class="waze-btn" href="${wzArr}" target="_blank" rel="noopener noreferrer">Waze — arrivée</a>`);
  return parts.length > 0 ? `<div class="nav-btns">${parts.join(' ')}</div>` : '';
};

export const exportVehicleLogisticsHtml = (
  event: RaceEvent,
  appState: TeamState,
  scope: VehicleLogisticsExportScope,
  stageDate?: string,
): VehicleLogisticsExportResult => {
  const legs = getVehicleLogisticsLegsForEvent(event, appState, scope, stageDate);
  const includeRavito = scope === 'staff';
  const includeTransfers = scope === 'coureuses';
  const hasRavito =
    includeRavito
    && (event.raceInfo?.stageDays ?? []).some(
      (d) => (d.ravitoVehicles?.length ?? 0) > 0 && (!stageDate || d.date === stageDate),
    );
  const hasTransfers =
    includeTransfers
    && (event.raceInfo?.transfers ?? []).some(
      (t) =>
        (t.vehicles?.length ?? 0) > 0
        && (!stageDate || t.fromDate === stageDate || t.toDate === stageDate),
    );

  if (legs.length === 0 && !hasRavito && !hasTransfers) {
    alertEmptyExport(scope);
    return { legCount: 0, legsWithDirections: 0 };
  }

  let legsWithDirections = 0;
  const end = event.endDate || event.date;
  let legCards = '';
  if (scope === 'coureuses' && legs.length > 0) {
    legs.forEach((leg) => {
      if (buildGoogleMapsDirectionsUrl(collectLegRoutePoints(leg))) legsWithDirections += 1;
    });
    legCards = `<section class="conv-section">
  <h2 class="conv-h2">Transport — aller / retour (comme convocation)</h2>
  <p class="conv-intro">Même présentation que la convocation générale : libellé véhicule, départ / arrivée sur une ligne, passagers abrégés.</p>
  <div class="table-scroll">
  <table class="conv-table">
    <thead>
      <tr>
        <th>Véhicule</th>
        <th>Départ</th>
        <th>Arrivée</th>
        <th>Conducteur</th>
        <th>À bord</th>
        <th>Étapes</th>
        <th>Navigation</th>
      </tr>
    </thead>
    <tbody>
      ${legs
        .map((leg) => {
          const vehicleTitle = getTransportLegTitleForCoureusesCell(leg, appState);
          const driverName = getDriverName(leg, appState);
          const stopLines = getLegStopLines(leg, appState);
          const stopsHtml =
            stopLines.length > 0
              ? `<ul class="mini-stops">${stopLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
              : '<span class="muted">—</span>';
          const occAbbrev = getOccupantsAbbrevConvocation(leg, appState);
          return `<tr>
            <td><strong>${escapeHtml(vehicleTitle)}</strong></td>
            <td>${escapeHtml(formatLegDepartureConvocationStr(leg))}</td>
            <td>${escapeHtml(formatLegArrivalConvocationStr(leg))}</td>
            <td>${driverName ? escapeHtml(driverName) : '<span class="muted">—</span>'}</td>
            <td>${occAbbrev ? escapeHtml(occAbbrev) : '<span class="muted">—</span>'}</td>
            <td>${stopsHtml}</td>
            <td class="nav-cell">${htmlNavigationLinksForLeg(leg)}</td>
          </tr>`;
        })
        .join('\n')}
    </tbody>
  </table>
  </div>
</section>`;
  } else {
    legCards = legs
      .map((leg) => {
        const vehicleLabel = getVehicleLabel(leg, appState);
        const driverName = getDriverName(leg, appState);
        const stopLines = getLegStopLines(leg, appState);
        const routePoints = collectLegRoutePoints(leg);
        const mapsUrl = buildGoogleMapsDirectionsUrl(routePoints);

        const stopsHtml =
          stopLines.length > 0
            ? `<ul class="stops">${stopLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
            : '';

        const navHtml = htmlNavigationLinksForLeg(leg);
        if (mapsUrl) legsWithDirections += 1;

        return `
        <article class="card">
          <h2>${escapeHtml(leg.direction)} — ${escapeHtml(vehicleLabel)}</h2>
          ${driverName ? `<p><strong>Conducteur :</strong> ${escapeHtml(driverName)}</p>` : ''}
          <p><strong>Départ :</strong> ${escapeHtml(formatLegDepartureStr(leg))}</p>
          <p><strong>Arrivée :</strong> ${escapeHtml(formatLegArrivalStr(leg))}</p>
          <p><strong>À bord :</strong> ${escapeHtml(getOccupantsLabel(leg, appState))}</p>
          ${stopsHtml}
          ${leg.details?.trim() ? `<p><strong>Détails :</strong> ${escapeHtml(leg.details)}</p>` : ''}
          <div class="directions">${navHtml}</div>
        </article>`;
      })
      .join('\n');
  }

  const ravitoCards = includeRavito
    ? (() => {
        const entries = (event.raceInfo?.stageDays ?? [])
          .filter((stage) => (!stageDate ? true : stage.date === stageDate))
          .flatMap((stage) =>
            (stage.ravitoVehicles ?? []).map((rv) => ({ rv, stage })),
          );
        const { logistics, ravitos } = partitionStaffRaceVehicles(entries);
        const renderVehicle = (rv: StageRavitoVehicle, stage: StageDayLogistics) => {
          const kind = getRaceVehicleKind(rv);
          const badge = STAFF_RACE_VEHICLE_BADGE[kind];
          const navHtml = isStaffRavitoVehicle(rv) ? htmlNavigationLinksForRavito(rv) : '';
          if (navHtml.includes('maps-btn')) legsWithDirections += 1;
          const pointsHtml = isStaffRavitoVehicle(rv)
            ? rv.points
                .map((p) => formatRavitoPointLine(p))
                .filter(Boolean)
                .map((line) => `<li>${escapeHtml(line as string)}</li>`)
                .join('')
            : '';
          const staffLines = formatRaceVehicleStaffLines(rv, appState)
            .map((l) => `<p>${escapeHtml(l)}</p>`)
            .join('');
          return `
        <article class="card card-ravito">
          <h2><span class="badge">${escapeHtml(badge)}</span> ${escapeHtml(formatRaceVehicleTitle(rv))} — ${escapeHtml(formatStageTitle(stage))}</h2>
          ${staffLines}
          ${pointsHtml ? `<ul class="stops">${pointsHtml}</ul>` : ''}
          ${navHtml}
        </article>`;
        };
        const blocks: string[] = [];
        if (logistics.length > 0) {
          blocks.push('<h3 class="subsection">Véhicules logistique &amp; suiveur</h3>');
          logistics.forEach(({ rv, stage }) => blocks.push(renderVehicle(rv, stage)));
        }
        if (ravitos.length > 0) {
          blocks.push('<h3 class="subsection">Ravitos</h3>');
          ravitos.forEach(({ rv, stage }) => blocks.push(renderVehicle(rv, stage)));
        }
        return blocks.join('\n');
      })()
    : '';

  const transferCards = includeTransfers
    ? (event.raceInfo?.transfers ?? [])
        .filter((transfer) => (!stageDate ? true : transfer.fromDate === stageDate || transfer.toDate === stageDate))
        .filter((t) => (t.vehicles?.length ?? 0) > 0)
        .map((transfer) => {
          const mapsUrl = buildGoogleMapsDirectionsUrl(
            [transfer.departLocation, transfer.arriveeLocation]
              .map((p) => p?.trim())
              .filter(Boolean) as string[],
          );
          if (mapsUrl) legsWithDirections += 1;
          const depAddr = transfer.departLocation?.trim() || '';
          const arrAddr = transfer.arriveeLocation?.trim() || '';
          const vehHtml = (transfer.vehicles ?? [])
            .map(
              (tv) =>
                `<li>${escapeHtml(tv.roleLabel || 'Véhicule')} : ${escapeHtml(getFleetVehicleName(tv.vehicleId, appState))} — ${escapeHtml(getFleetDriverName(tv.driverId, appState))}</li>`,
            )
            .join('');
          const navHtml = htmlNavigationLinksForTransfer(transfer);
          return `
        <article class="card card-transfer">
          <h2>Transfert inter-étapes</h2>
          <p>${escapeHtml(formatTransferHeader(transfer))}</p>
          ${depAddr ? `<p><strong>Lieu départ :</strong> ${escapeHtml(depAddr)}</p>` : ''}
          ${arrAddr ? `<p><strong>Lieu arrivée :</strong> ${escapeHtml(arrAddr)}</p>` : ''}
          <ul class="stops">${vehHtml}</ul>
          <div class="directions">${navHtml || '<p class="muted">Ajoutez les lieux de départ et d\'arrivée du transfert.</p>'}</div>
        </article>`;
        })
        .join('\n')
    : '';

  const cards = [legCards, ravitoCards, transferCards].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Logistique véhicules — ${escapeHtml(event.name)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #f1f5f9; color: #1e293b; }
    header { text-align: center; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    .subtitle { color: #64748b; margin: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .card h2 { margin: 0 0 12px; font-size: 1.1rem; color: #334155; }
    .stops { margin: 8px 0 0 16px; padding: 0; font-size: 0.9rem; }
    .directions { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .route { font-size: 0.85rem; color: #64748b; margin: 0 0 10px; }
    .maps-btn { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; }
    .waze-btn { display: inline-block; background: #0dadbd; color: #fff !important; text-decoration: none; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 0.8rem; }
    .conv-section { margin-bottom: 24px; }
    .conv-h2 { font-size: 1.15rem; color: #1e40af; margin: 0 0 8px; }
    .conv-intro { font-size: 0.85rem; color: #64748b; margin: 0 0 12px; }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; }
    .conv-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 720px; }
    .conv-table th, .conv-table td { border: 1px solid #e2e8f0; padding: 10px 8px; vertical-align: top; text-align: left; }
    .conv-table th { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
    .conv-table tr:nth-child(even) td { background: #fafafa; }
    .when { color: #334155; font-weight: 600; }
    .addr { color: #0f172a; font-size: 0.9em; display: inline-block; margin-top: 4px; line-height: 1.35; }
    .mini-stops { margin: 0; padding-left: 16px; font-size: 0.8rem; }
    .nav-cell { min-width: 150px; }
    .nav-btns { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .muted { color: #94a3b8; font-size: 0.9rem; margin: 0; }
    footer { text-align: center; color: #94a3b8; font-size: 0.8rem; margin-top: 24px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(event.name)}</h1>
    <p class="subtitle">Du ${escapeHtml(formatDateFr(event.date))} au ${escapeHtml(formatDateFr(end))}</p>
    <p class="subtitle">${escapeHtml(EXPORT_SCOPE_LABELS[scope])}</p>
    <p class="subtitle muted">${escapeHtml(EXPORT_SCOPE_DESCRIPTIONS[scope])}</p>
  </header>
  ${cards}
  <footer>Généré par Logicycle</footer>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = event.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'evenement';
  anchor.href = url;
  anchor.download = `Logistique_vehicules_${buildExportFilenameSuffix(scope)}_${safeName}.html`;
  anchor.click();
  URL.revokeObjectURL(url);

  return { legCount: legs.length, legsWithDirections };
};

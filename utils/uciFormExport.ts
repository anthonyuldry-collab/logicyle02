import { jsPDF } from 'jspdf';
import {
  RaceEvent,
  Rider,
  RiderEventSelection,
  RiderEventStatus,
  StaffMember,
  StaffRole,
  Team,
} from '../types';
import { ALL_COUNTRIES } from '../constants';
import { getStaffRoleDisplayLabel } from './staffRoleUtils';

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface UciBulletinExportOptions {
  team: Team;
  event: RaceEvent;
  riders: Rider[];
  staff?: StaffMember[];
  riderEventSelections?: RiderEventSelection[];
  /** Entité organisatrice (ex. TOUR DU LIMOUSIN ORGANISATION) */
  organizingEntity?: string;
  /** Classe UCI (ex. 1.1, 2.1) */
  eventClass?: string;
  /** Catégorie UCI (ex. WE, ME, MU) */
  uciCategory?: string;
  /** Variante bulletin : J-20 complet ou J-3 titulaires seulement */
  variant?: 'J20' | 'J3';
}

interface PersonRow {
  lastName: string;
  firstName: string;
  birthDate?: string;
  nationality?: string;
  uciId?: string;
  phone?: string;
  email?: string;
  role?: string;
}

function formatDateFrench(iso?: string): string {
  if (!iso) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  const parts = iso.slice(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso.slice(0, 10);
}

function countryToTrigram(codeOrName?: string): string {
  if (!codeOrName) return '';
  const v = codeOrName.trim();
  if (v.length === 3 && v === v.toUpperCase()) return v;
  const byCode = ALL_COUNTRIES.find((c) => c.code.toUpperCase() === v.toUpperCase());
  if (byCode) return byCode.code.toUpperCase();
  const byName = ALL_COUNTRIES.find(
    (c) => c.name.toLowerCase() === v.toLowerCase() || c.name.toLowerCase().includes(v.toLowerCase())
  );
  return byName?.code.toUpperCase() ?? v.slice(0, 3).toUpperCase();
}

function riderToRow(r: Rider): PersonRow {
  return {
    lastName: r.lastName || '',
    firstName: r.firstName || '',
    birthDate: formatDateFrench(r.birthDate),
    nationality: countryToTrigram(r.nationality || r.address?.country),
    uciId: r.uciId || '',
    phone: r.phone || '',
    email: r.email || '',
  };
}

function staffToRow(s: StaffMember, roleLabel?: string): PersonRow {
  return {
    lastName: s.lastName || '',
    firstName: s.firstName || '',
    birthDate: formatDateFrench(s.birthDate),
    nationality: countryToTrigram(s.nationality || s.address?.country),
    uciId: s.uciId || '',
    phone: s.phone || '',
    email: s.email || '',
    role: roleLabel || getStaffRoleDisplayLabel(s.role as StaffRole) || String(s.role),
  };
}

function splitRiders(
  riders: Rider[],
  eventId: string,
  selections?: RiderEventSelection[]
): { titulaires: Rider[]; remplacants: Rider[] } {
  if (selections?.length) {
    const forEvent = selections.filter((s) => s.eventId === eventId);
    const titulaireIds = new Set(
      forEvent.filter((s) => s.status === RiderEventStatus.TITULAIRE).map((s) => s.riderId)
    );
    const remplacantIds = new Set(
      forEvent.filter((s) => s.status === RiderEventStatus.REMPLACANT).map((s) => s.riderId)
    );
    return {
      titulaires: riders.filter((r) => titulaireIds.has(r.id)),
      remplacants: riders.filter((r) => remplacantIds.has(r.id)),
    };
  }
  const titulaires = riders.filter((r) => r.rosterRole !== 'reserve');
  const remplacants = riders.filter((r) => r.rosterRole === 'reserve');
  if (remplacants.length === 0 && titulaires.length === riders.length) {
    return { titulaires: riders, remplacants: [] };
  }
  return { titulaires, remplacants };
}

function getStaffByRoleKeys(
  event: RaceEvent,
  staff: StaffMember[],
  roleKeys: (keyof RaceEvent)[]
): StaffMember[] {
  const ids = new Set<string>();
  for (const key of roleKeys) {
    const arr = event[key];
    if (Array.isArray(arr)) arr.forEach((id) => ids.add(String(id)));
  }
  return staff.filter((s) => ids.has(s.id));
}

function drawLabelValue(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelW = 42
): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(value || '________________', CONTENT_W - labelW);
  doc.text(lines, x + labelW, y);
  return y + Math.max(5, lines.length * 4);
}

function drawSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
  return y + 7;
}

function drawRiderTable(
  doc: jsPDF,
  startY: number,
  rows: PersonRow[],
  maxRows: number,
  withBirthDate = true
): number {
  const colX = {
    num: MARGIN,
    last: MARGIN + 8,
    first: MARGIN + 38,
    birth: MARGIN + 68,
    nat: MARGIN + 95,
    uci: MARGIN + 108,
    phone: MARGIN + 138,
    email: MARGIN + 158,
  };

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('N°', colX.num, startY);
  doc.text('Nom', colX.last, startY);
  doc.text('Prénom', colX.first, startY);
  if (withBirthDate) doc.text('Naiss.', colX.birth, startY);
  doc.text('Nat.', colX.nat, startY);
  doc.text('UCI ID', colX.uci, startY);
  doc.text('Tél.', colX.phone, startY);
  doc.text('Email', colX.email, startY);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, startY + 1, PAGE_W - MARGIN, startY + 1);

  let y = startY + 5;
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i];
    doc.text(String(i + 1), colX.num, y);
    doc.text((row?.lastName || '').slice(0, 18), colX.last, y);
    doc.text((row?.firstName || '').slice(0, 14), colX.first, y);
    if (withBirthDate) doc.text((row?.birthDate || '').slice(0, 10), colX.birth, y);
    doc.text((row?.nationality || '').slice(0, 3), colX.nat, y);
    doc.text((row?.uciId || '').slice(0, 11), colX.uci, y);
    doc.text((row?.phone || '').slice(0, 12), colX.phone, y);
    doc.text((row?.email || '').slice(0, 18), colX.email, y);
    y += 5;
  }
  return y + 2;
}

function drawStaffTable(doc: jsPDF, startY: number, rows: PersonRow[], maxRows: number): number {
  const colX = {
    num: MARGIN,
    last: MARGIN + 8,
    first: MARGIN + 38,
    nat: MARGIN + 68,
    uci: MARGIN + 80,
    role: MARGIN + 108,
    phone: MARGIN + 138,
    email: MARGIN + 158,
  };

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('N°', colX.num, startY);
  doc.text('Nom', colX.last, startY);
  doc.text('Prénom', colX.first, startY);
  doc.text('Nat.', colX.nat, startY);
  doc.text('UCI ID', colX.uci, startY);
  doc.text('Rôle', colX.role, startY);
  doc.text('Tél.', colX.phone, startY);
  doc.text('Email', colX.email, startY);
  doc.line(MARGIN, startY + 1, PAGE_W - MARGIN, startY + 1);

  let y = startY + 5;
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i];
    doc.text(String(i + 1), colX.num, y);
    doc.text((row?.lastName || '').slice(0, 18), colX.last, y);
    doc.text((row?.firstName || '').slice(0, 14), colX.first, y);
    doc.text((row?.nationality || '').slice(0, 3), colX.nat, y);
    doc.text((row?.uciId || '').slice(0, 11), colX.uci, y);
    doc.text((row?.role || '').slice(0, 14), colX.role, y);
    doc.text((row?.phone || '').slice(0, 12), colX.phone, y);
    doc.text((row?.email || '').slice(0, 18), colX.email, y);
    y += 5;
  }
  return y + 2;
}

function drawPageHeader(doc: jsPDF, pageLabel: string): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("BULLETIN OFFICIEL D'ENGAGEMENT", PAGE_W / 2, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.text('POUR EPREUVES SUR ROUTE', PAGE_W / 2, 17, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(pageLabel, PAGE_W - MARGIN, 12, { align: 'right' });
  doc.text('(modèle LogiCycle — art. 1.2.049 Règlement UCI)', MARGIN, 22);
  return 28;
}

/** Export bulletin d'engagement UCI (pages 1 & 2) pré-rempli depuis LogiCycle. */
export function exportUciEngagementBulletin(options: UciBulletinExportOptions): void {
  const {
    team,
    event,
    riders,
    staff = [],
    riderEventSelections,
    organizingEntity = '',
    eventClass = '',
    uciCategory = '',
    variant = 'J20',
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const eventDate = formatDateFrench(event.startDate || event.date);
  const eventEnd = formatDateFrench(event.endDate || event.date);
  const teamNat = countryToTrigram(team.country);
  const category = uciCategory || event.eligibleCategory || '';
  const uciClass = eventClass || event.type || '';

  const { titulaires, remplacants } = splitRiders(riders, event.id, riderEventSelections);
  const titulaireRows = titulaires.map(riderToRow);
  const remplacantRows = variant === 'J3' ? [] : remplacants.map(riderToRow);

  const dsTitulaire = getStaffByRoleKeys(event, staff, ['directeurSportifId']);
  const dsAdjoints = getStaffByRoleKeys(event, staff, ['assistantId', 'managerId']);
  const autresStaff = staff.filter(
    (s) =>
      (event.selectedStaffIds || []).includes(s.id) &&
      !dsTitulaire.some((d) => d.id === s.id) &&
      !dsAdjoints.some((d) => d.id === s.id)
  );

  // ——— Page 1 ———
  let y = drawPageHeader(doc, 'page 1/2');
  y = drawLabelValue(doc, MARGIN, y, 'Epreuve :', event.name);
  y = drawLabelValue(doc, MARGIN, y, 'Classe :', uciClass);
  y = drawLabelValue(doc, MARGIN, y, 'Catégorie :', category);
  y = drawLabelValue(doc, MARGIN, y, 'Entité organisatrice :', organizingEntity || event.location);
  y = drawLabelValue(doc, MARGIN, y, 'Pays :', countryToTrigram(event.location?.slice(-2)) || 'FRA');
  y = drawLabelValue(doc, MARGIN, y, 'Début (jj/mm/aa) :', eventDate);
  y = drawLabelValue(doc, MARGIN, y, 'Fin (jj/mm/aa) :', eventEnd);
  y += 3;
  y = drawLabelValue(doc, MARGIN, y, "Nom de l'Equipe :", team.name);
  y = drawLabelValue(doc, MARGIN, y, 'Nationalité équipe :', teamNat);
  y = drawLabelValue(doc, MARGIN, y, 'Coureurs par équipe :', String(event.maxRiders ?? (titulaireRows.length || 6)));
  y = drawLabelValue(doc, MARGIN, y, 'Responsable financier :', '(à compléter par l\'équipe)');
  y += 4;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const legalText = [
    "Le présent bulletin (page 1) doit être renvoyé à l'Organisateur rempli et signé au moins 20 jours avant l'épreuve (art. 1.2.049).",
    "Au moins 72 h avant le départ : bulletin avec titulaires et remplaçants (page 2).",
    "Confirmation des partants : signature du DS titulaire lors de la réunion des directeurs sportifs (art. 1.2.090).",
  ];
  legalText.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, CONTENT_W);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 3.5 + 1;
  });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Nom et prénom du signataire autorisé (responsable administratif de l\'Equipe) :', MARGIN, y);
  y += 10;
  doc.line(MARGIN, y, MARGIN + 90, y);
  doc.text('Date :', MARGIN + 100, y - 2);
  doc.line(MARGIN + 110, y, PAGE_W - MARGIN, y);
  y += 8;
  doc.text('Lieu :', MARGIN, y);
  doc.line(MARGIN + 12, y, MARGIN + 70, y);

  // ——— Page 2 ———
  doc.addPage();
  y = drawPageHeader(doc, 'page 2/2');

  y = drawLabelValue(doc, MARGIN, y, 'Epreuve :', event.name);
  y = drawLabelValue(doc, MARGIN, y, 'Classe :', uciClass);
  y = drawLabelValue(doc, MARGIN, y, "Nom de l'Equipe :", team.name);
  y = drawLabelValue(doc, MARGIN, y, 'Nationalité :', teamNat);
  y = drawLabelValue(doc, MARGIN, y, 'Date début :', eventDate);
  y = drawLabelValue(doc, MARGIN, y, 'Date fin :', eventEnd);
  y += 2;

  y = drawSectionTitle(doc, y, 'Coureurs titulaires *');
  y = drawRiderTable(doc, y, titulaireRows, Math.max(8, titulaireRows.length));

  y = drawSectionTitle(doc, y, 'Coureurs remplaçants (max 50%) *');
  y = drawRiderTable(doc, y, remplacantRows, Math.max(4, remplacantRows.length));

  y = drawSectionTitle(doc, y, 'Directeur Sportif titulaire sur l\'épreuve');
  y = drawStaffTable(
    doc,
    y,
    dsTitulaire.map((s) => staffToRow(s, 'Directeur Sportif')),
    1
  );

  y = drawSectionTitle(doc, y, 'Directeur(s) Sportif(s) adjoint(s) sur l\'épreuve');
  y = drawStaffTable(
    doc,
    y,
    dsAdjoints.map((s) => staffToRow(s, getStaffRoleDisplayLabel(s.role as StaffRole))),
    Math.max(2, dsAdjoints.length)
  );

  y = drawSectionTitle(doc, y, 'Autres personnes sur l\'épreuve (mécaniciens, assistants médicaux, etc.)');
  y = drawStaffTable(
    doc,
    y,
    autresStaff.map((s) => staffToRow(s)),
    Math.max(6, autresStaff.length)
  );

  if (y > 265) {
    doc.addPage();
    y = 20;
  }
  y += 4;
  doc.setFontSize(7);
  doc.text('* Rayer les noms des coureurs non-partants lors de la confirmation des partants.', MARGIN, y);
  y += 8;
  doc.text('Signature du Directeur Sportif titulaire (confirmation des partants) :', MARGIN, y);
  y += 8;
  doc.line(MARGIN, y, MARGIN + 100, y);

  doc.setFontSize(6);
  doc.text(
    'Document généré par LogiCycle — vérifier et compléter avant envoi à l\'organisateur (délai : J-20 puis J-3).',
    MARGIN,
    290
  );

  const safeTeam = team.name.replace(/\s+/g, '_');
  const safeEvent = event.name.replace(/\s+/g, '_');
  doc.save(`UCI_Engagement_${safeTeam}_${safeEvent}.pdf`);
}

/** @deprecated Utiliser exportUciEngagementBulletin */
export function exportUciStartListPdf(
  team: Team,
  event: RaceEvent,
  selectedRiders: Rider[],
  staff?: StaffMember[],
  riderEventSelections?: RiderEventSelection[]
): void {
  exportUciEngagementBulletin({
    team,
    event,
    riders: selectedRiders,
    staff,
    riderEventSelections,
  });
}

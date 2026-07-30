import { jsPDF } from 'jspdf';
import {
  AppState,
  CampProgrammeDay,
  CampProgrammeItem,
  CampProgrammeSlotKind,
  RaceEvent,
  StageCampSessionType,
} from '../types';
import {
  CAMP_PROGRAMME_SLOT_KIND_LABELS,
  STAGE_SESSION_TYPE_LABELS,
  listEventDayDates,
  sortProgrammeItems,
  syncCampProgrammeDays,
} from './trainingCampUtils';
import { formatEventDate, formatEventDateRange } from './dateUtils';
import {
  PDF_COLORS,
  PDF_CONTENT_W,
  PDF_MARGIN_BOTTOM,
  PDF_MARGIN_TOP,
  PDF_MARGIN_X,
  PDF_PAGE_H,
  sanitizePdfText,
} from './pdfLayoutUtils';

export type CampProgrammeExportScope = 'all' | 'day';

export interface CampProgrammeExportOptions {
  scope: CampProgrammeExportScope;
  /** Requis si scope === 'day' */
  dayDate?: string;
  teamName?: string;
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'stage';
}

function durationMinutes(item: CampProgrammeItem): number | null {
  if (!item.startTime || !item.endTime) return null;
  const [sh, sm] = item.startTime.split(':').map(Number);
  const [eh, em] = item.endTime.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Number.isFinite(mins) && mins > 0 ? mins : null;
}

function formatDuration(mins: number | null): string {
  if (mins == null) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function slotKindLabel(kind?: CampProgrammeSlotKind): string {
  if (!kind) return '';
  return CAMP_PROGRAMME_SLOT_KIND_LABELS[kind] || kind;
}

function sessionLabel(type?: StageCampSessionType): string {
  if (!type) return '';
  return STAGE_SESSION_TYPE_LABELS[type] || type;
}

function resolveDays(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): CampProgrammeDay[] {
  const days = syncCampProgrammeDays(event).filter((d) => (d.items?.length || 0) > 0 || d.theme?.trim());
  if (options.scope === 'day') {
    const date = options.dayDate || event.date;
    return days.filter((d) => d.date === date);
  }
  return days;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= PDF_PAGE_H - PDF_MARGIN_BOTTOM) return y;
  doc.addPage();
  return PDF_MARGIN_TOP;
}

function drawFooter(doc: jsPDF, page: number, total: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    sanitizePdfText(`Programme de stage — Logicycle · ${page}/${total}`),
    PDF_MARGIN_X + PDF_CONTENT_W / 2,
    PDF_PAGE_H - 10,
    { align: 'center' },
  );
}

export function buildCampProgrammeFilename(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): string {
  const base = safeFilenamePart(event.name);
  if (options.scope === 'day' && options.dayDate) {
    return `Programme_${base}_${options.dayDate}.pdf`;
  }
  return `Programme_${base}.pdf`;
}

/** Texte plain pour e-mail / presse-papiers. */
export function buildCampProgrammePlainText(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): string {
  const days = resolveDays(event, options);
  const allDates = listEventDayDates(event);
  const lines: string[] = [
    `PROGRAMME — ${event.name}`,
    formatEventDateRange(event),
    event.location ? `Lieu : ${event.location}` : '',
    '',
  ].filter(Boolean) as string[];

  if (days.length === 0) {
    lines.push('Aucun créneau planifié.');
    return lines.join('\n');
  }

  days.forEach((day) => {
    const dayNumber = Math.max(0, allDates.indexOf(day.date)) + 1;
    const dayLabel = formatEventDate(day.date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    lines.push('────────────────────────────────');
    lines.push(`J${dayNumber} — ${dayLabel}${day.theme ? ` · ${day.theme}` : ''}`);
    if (day.notes?.trim()) lines.push(`Notes : ${day.notes.trim()}`);
    lines.push('');
    const items = sortProgrammeItems(day.items || []);
    if (items.length === 0) {
      lines.push('  (aucun créneau)');
      lines.push('');
      return;
    }
    items.forEach((item) => {
      const time =
        item.startTime && item.endTime
          ? `${item.startTime}–${item.endTime}`
          : item.startTime || item.endTime || '—:—';
      const kind = slotKindLabel(item.slotKind);
      const sess = sessionLabel(item.sessionType);
      const meta = [kind, sess].filter(Boolean).join(' · ');
      lines.push(`  ${time}  ${item.title || '—'}${meta ? `  [${meta}]` : ''}`);
      if (item.location?.trim()) lines.push(`           → ${item.location.trim()}`);
      if (item.notes?.trim()) lines.push(`           ${item.notes.trim()}`);
    });
    lines.push('');
  });

  lines.push('—');
  lines.push('Document généré via Logicycle');
  return lines.join('\n');
}

export function buildCampProgrammePdfDoc(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): jsPDF {
  const days = resolveDays(event, options);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = PDF_MARGIN_TOP;

  // Header
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(...PDF_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(sanitizePdfText('Programme de stage'), PDF_MARGIN_X, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(sanitizePdfText(event.name), PDF_MARGIN_X, 19);
  doc.setFontSize(8);
  const metaRight = [
    formatEventDateRange(event),
    event.location || '',
    options.teamName || '',
  ]
    .filter(Boolean)
    .map(sanitizePdfText);
  metaRight.forEach((line, i) => {
    doc.text(line, PDF_MARGIN_X + PDF_CONTENT_W, 11 + i * 4, { align: 'right' });
  });

  y = 36;

  if (days.length === 0) {
    doc.setTextColor(...PDF_COLORS.muted);
    doc.setFontSize(10);
    doc.text('Aucun créneau planifié pour ce périmètre.', PDF_MARGIN_X, y);
    drawFooter(doc, 1, 1);
    return doc;
  }

  const allDates = listEventDayDates(event);

  days.forEach((day) => {
    const items = sortProgrammeItems(day.items || []);
    const dayNumber = Math.max(0, allDates.indexOf(day.date)) + 1;
    const dayTitle = sanitizePdfText(
      `J${dayNumber} — ${formatEventDate(day.date, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}${day.theme ? ` · ${day.theme}` : ''}`,
    );

    y = ensureSpace(doc, y, 18);
    doc.setFillColor(...PDF_COLORS.primaryLight);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.rect(PDF_MARGIN_X, y, PDF_CONTENT_W, 9, 'FD');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(dayTitle, PDF_MARGIN_X + 3, y + 5.8);
    y += 12;

    if (day.notes?.trim()) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.muted);
      const noteLines = doc.splitTextToSize(
        sanitizePdfText(day.notes.trim()),
        PDF_CONTENT_W - 2,
      );
      y = ensureSpace(doc, y, noteLines.length * 3.5 + 2);
      noteLines.forEach((line: string) => {
        doc.text(line, PDF_MARGIN_X, y);
        y += 3.5;
      });
      y += 1.5;
    }

    if (items.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text('Aucun créneau', PDF_MARGIN_X + 2, y);
      y += 6;
      return;
    }

    // Table header
    const cols = {
      time: PDF_MARGIN_X,
      dur: PDF_MARGIN_X + 28,
      kind: PDF_MARGIN_X + 42,
      title: PDF_MARGIN_X + 68,
      place: PDF_MARGIN_X + 138,
    };
    const rowH = 6.2;

    y = ensureSpace(doc, y, rowH + 2);
    doc.setFillColor(241, 245, 249);
    doc.rect(PDF_MARGIN_X, y - 3.8, PDF_CONTENT_W, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('HORAIRE', cols.time + 1, y);
    doc.text('DURÉE', cols.dur, y);
    doc.text('TYPE', cols.kind, y);
    doc.text('INTITULÉ', cols.title, y);
    doc.text('LIEU', cols.place, y);
    y += 4;

    items.forEach((item, idx) => {
      const time =
        item.startTime && item.endTime
          ? `${item.startTime}–${item.endTime}`
          : item.startTime || '—';
      const dur = formatDuration(durationMinutes(item));
      const kind = slotKindLabel(item.slotKind) || '—';
      const titleBase = item.title || '—';
      const sess = sessionLabel(item.sessionType);
      const title =
        sess && (item.slotKind === 'training' || item.slotKind === 'test' || item.slotKind === 'recovery')
          ? `${titleBase} (${sess})`
          : titleBase;
      const place = item.location || '—';

      const titleLines = doc.splitTextToSize(sanitizePdfText(title), 66);
      const placeLines = doc.splitTextToSize(sanitizePdfText(place), 34);
      const noteLines = item.notes?.trim()
        ? doc.splitTextToSize(sanitizePdfText(item.notes.trim()), PDF_CONTENT_W - 6)
        : [];
      const contentLines = Math.max(titleLines.length, placeLines.length, 1);
      const blockH = contentLines * 3.4 + (noteLines.length > 0 ? noteLines.length * 3.1 + 1 : 0) + 3;

      y = ensureSpace(doc, y, blockH + 2);
      if (idx % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(PDF_MARGIN_X, y - 3.5, PDF_CONTENT_W, blockH, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(sanitizePdfText(time), cols.time + 1, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF_COLORS.muted);
      if (dur) doc.text(dur, cols.dur, y);
      doc.text(sanitizePdfText(kind), cols.kind, y);

      doc.setTextColor(...PDF_COLORS.text);
      titleLines.forEach((line: string, i: number) => {
        doc.text(line, cols.title, y + i * 3.4);
      });
      placeLines.forEach((line: string, i: number) => {
        doc.text(line, cols.place, y + i * 3.4);
      });

      let localY = y + contentLines * 3.4;
      if (noteLines.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...PDF_COLORS.muted);
        noteLines.forEach((line: string) => {
          doc.text(line, PDF_MARGIN_X + 3, localY + 1);
          localY += 3.1;
        });
      }

      y += blockH;
    });

    y += 4;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  return doc;
}

export function exportCampProgrammePdf(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): void {
  const doc = buildCampProgrammePdfDoc(event, options);
  doc.save(buildCampProgrammeFilename(event, options));
}

export function getCampProgrammePdfBlob(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): { blob: Blob; filename: string } {
  const doc = buildCampProgrammePdfDoc(event, options);
  const filename = buildCampProgrammeFilename(event, options);
  const blob = doc.output('blob');
  return { blob, filename };
}

export interface CampProgrammeRecipient {
  id: string;
  label: string;
  email: string;
  kind: 'rider' | 'staff';
}

export function listCampProgrammeRecipients(
  event: RaceEvent,
  appState: AppState,
): CampProgrammeRecipient[] {
  const riders = (event.selectedRiderIds || [])
    .map((id) => appState.riders.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r?.email?.trim()))
    .map((r) => ({
      id: r.id,
      label: `${r.firstName} ${r.lastName}`,
      email: r.email!.trim(),
      kind: 'rider' as const,
    }));

  const staff = (event.selectedStaffIds || [])
    .map((id) => appState.staff.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s?.email?.trim()))
    .map((s) => ({
      id: s.id,
      label: `${s.firstName} ${s.lastName}`,
      email: s.email.trim(),
      kind: 'staff' as const,
    }));

  const byEmail = new Map<string, CampProgrammeRecipient>();
  [...riders, ...staff].forEach((r) => {
    const key = r.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, r);
  });
  return Array.from(byEmail.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Ouvre le client mail avec le programme en corps (joindre le PDF téléchargé). */
export function openCampProgrammeEmail(params: {
  event: RaceEvent;
  options: CampProgrammeExportOptions;
  emails: string[];
}): void {
  const { event, options, emails } = params;
  const unique = Array.from(new Set(emails.map((e) => e.trim()).filter(Boolean)));
  const subject =
    options.scope === 'day' && options.dayDate
      ? `Programme — ${event.name} — ${options.dayDate}`
      : `Programme de stage — ${event.name}`;
  const body = [
    `Bonjour,`,
    ``,
    `Veuillez trouver ci-dessous le programme du stage « ${event.name} ».`,
    `Joignez le PDF téléchargé depuis Logicycle à cet e-mail.`,
    ``,
    buildCampProgrammePlainText(event, options),
  ].join('\n');

  const mailto = `mailto:?bcc=${encodeURIComponent(unique.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

/** Partage natif (mobile / desktop compatible) avec fichier PDF si possible. */
export async function shareCampProgrammePdf(params: {
  event: RaceEvent;
  options: CampProgrammeExportOptions;
}): Promise<'shared' | 'unsupported' | 'aborted' | 'error'> {
  const { blob, filename } = getCampProgrammePdfBlob(params.event, params.options);
  const file = new File([blob], filename, { type: 'application/pdf' });
  const data: ShareData = {
    title: `Programme — ${params.event.name}`,
    text: buildCampProgrammePlainText(params.event, params.options).slice(0, 800),
    files: [file],
  };

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  try {
    if (navigator.canShare && !navigator.canShare(data)) {
      // Fallback without file
      await navigator.share({
        title: data.title,
        text: buildCampProgrammePlainText(params.event, params.options),
      });
      return 'shared';
    }
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'aborted';
    return 'error';
  }
}

export function copyCampProgrammeText(
  event: RaceEvent,
  options: CampProgrammeExportOptions,
): Promise<void> {
  const text = buildCampProgrammePlainText(event, options);
  return navigator.clipboard.writeText(text);
}

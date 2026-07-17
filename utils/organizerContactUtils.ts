import {
  EventType,
  OrganizerApplicationRecord,
  OrganizerApplicationStatus,
  OrganizerContact,
  RaceEvent,
  RaceEventOrganizerContact,
} from '../types';
import {
  enrichOrganizerContact,
  inferCategoryIdFromText,
  isContactEligibleForTeam,
  RaceCircuitTier,
  RaceCompetitionLevel,
  RaceGenderSegment,
  resolveRaceTaxonomy,
} from './raceCalendarTaxonomy';
import { isStageRace } from './dateUtils';
import { getEventDateRange } from './stageRaceUtils';

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function normalizeEventKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getParticipationYear(event: RaceEvent): number {
  const d = event.date || event.startDate;
  if (!d) return new Date().getFullYear();
  return new Date(d + 'T12:00:00').getFullYear();
}

function parseEventDate(dateStr?: string): { month: number; day: number } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, day: d.getDate() };
}

export function inferTypicalDateFromEvent(event: RaceEvent): { typicalMonth?: number; typicalDay?: number } {
  const parsed = parseEventDate(event.date || event.startDate);
  if (!parsed) return {};
  return { typicalMonth: parsed.month, typicalDay: parsed.day };
}

export function inferTypicalEndDateFromEvent(event: RaceEvent): {
  lastEventEndDate?: string;
  typicalEndMonth?: number;
  typicalEndDay?: number;
} {
  if (!isStageRace(event)) return {};
  const endDate = event.endDate || event.date;
  const parsed = parseEventDate(endDate);
  if (!parsed) return { lastEventEndDate: endDate };
  return {
    lastEventEndDate: endDate,
    typicalEndMonth: parsed.month,
    typicalEndDay: parsed.day,
  };
}

export function inferStageCountFromEvent(event: RaceEvent): number | undefined {
  if (!isStageRace(event)) return undefined;
  const fromStageDays = event.raceInfo?.stageDays?.length;
  if (fromStageDays != null && fromStageDays > 0) return fromStageDays;
  if (event.endDate && event.endDate !== event.date) {
    return getEventDateRange(event.date, event.endDate).length;
  }
  return undefined;
}

export function isOrganizerContactStageRace(contact: OrganizerContact): boolean {
  if (contact.eventType === EventType.STAGE) return true;
  if (contact.stageCount != null && contact.stageCount > 1) return true;
  if (
    contact.lastEventEndDate &&
    contact.lastEventDate &&
    contact.lastEventEndDate !== contact.lastEventDate
  ) {
    return true;
  }
  if (contact.typicalEndMonth != null && contact.typicalMonth != null) {
    return (
      contact.typicalEndMonth !== contact.typicalMonth ||
      (contact.typicalEndDay ?? 1) !== (contact.typicalDay ?? 1)
    );
  }
  return false;
}

export function getTheoreticalEventEndDate(
  contact: OrganizerContact,
  targetYear: number
): string | null {
  if (!isOrganizerContactStageRace(contact)) return null;

  if (contact.typicalEndMonth) {
    const safeDay = Math.min(
      contact.typicalEndDay || 1,
      daysInMonth(targetYear, contact.typicalEndMonth)
    );
    return `${targetYear}-${String(contact.typicalEndMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  const start = getTheoreticalEventDate(contact, targetYear);
  if (!start) return null;

  if (contact.lastEventEndDate && contact.lastEventDate) {
    const lastStart = new Date(`${contact.lastEventDate}T12:00:00`);
    const lastEnd = new Date(`${contact.lastEventEndDate}T12:00:00`);
    const deltaDays = Math.round((lastEnd.getTime() - lastStart.getTime()) / 86400000);
    const end = new Date(`${start}T12:00:00`);
    end.setUTCDate(end.getUTCDate() + deltaDays);
    return end.toISOString().slice(0, 10);
  }

  if (contact.stageCount != null && contact.stageCount > 1) {
    const end = new Date(`${start}T12:00:00`);
    end.setUTCDate(end.getUTCDate() + contact.stageCount - 1);
    return end.toISOString().slice(0, 10);
  }

  return null;
}

export function getProjectedStageCount(
  contact: OrganizerContact,
  theoreticalStart: string,
  theoreticalEnd: string | null
): number | undefined {
  if (contact.stageCount != null && contact.stageCount > 0) return contact.stageCount;
  if (theoreticalEnd && theoreticalEnd !== theoreticalStart) {
    return getEventDateRange(theoreticalStart, theoreticalEnd).length;
  }
  return undefined;
}

export function formatProjectionDateRange(
  start: string,
  end: string | null | undefined,
  options?: { approximate?: boolean }
): string {
  const prefix = options?.approximate ? '≈ ' : '';
  const startLabel = formatFrenchDate(start, { approximate: false }).replace(/^≈ /, '');
  if (!end || end === start) return `${prefix}${startLabel}`;
  const endLabel = formatFrenchDate(end, { approximate: false }).replace(/^≈ /, '');
  return `${prefix}Du ${startLabel} au ${endLabel}`;
}

export function getTheoreticalEventDate(contact: OrganizerContact, targetYear: number): string | null {
  const month = contact.typicalMonth;
  const day = contact.typicalDay;
  if (!month) {
    if (contact.lastEventDate) {
      const parsed = parseEventDate(contact.lastEventDate);
      if (parsed) {
        const safeDay = Math.min(parsed.day, daysInMonth(targetYear, parsed.month));
        return `${targetYear}-${String(parsed.month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
      }
    }
    return null;
  }
  const safeDay = Math.min(day || 1, daysInMonth(targetYear, month));
  return `${targetYear}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatFrenchDate(dateStr: string, options?: { approximate?: boolean }): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const prefix = options?.approximate ? '≈ ' : '';
  return `${prefix}${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatFrenchMonthYear(month: number, year: number): string {
  if (month < 1 || month > 12) return `Saison ${year}`;
  return `${FRENCH_MONTHS[month - 1]} ${year}`;
}

export function getApplicationStatus(
  contact: OrganizerContact,
  year: number
): OrganizerApplicationStatus {
  const record = contact.applications?.find((a) => a.year === year);
  return record?.status || 'pending';
}

export function setApplicationStatus(
  contact: OrganizerContact,
  year: number,
  status: OrganizerApplicationStatus
): OrganizerContact {
  const now = new Date().toISOString();
  const existing = contact.applications || [];
  const idx = existing.findIndex((a) => a.year === year);
  const record: OrganizerApplicationRecord = {
    year,
    status,
    sentAt: status === 'sent' ? now : existing[idx]?.sentAt,
  };
  const applications =
    idx >= 0
      ? existing.map((a, i) => (i === idx ? { ...a, ...record } : a))
      : [...existing, record];
  return { ...contact, applications, updatedAt: now };
}

export function hasOrganizerEmail(contact?: RaceEventOrganizerContact): boolean {
  return Boolean(contact?.contactEmail?.trim());
}

/** Fusionne le contact d'un événement dans le répertoire équipe. */
export function upsertOrganizerContactFromEvent(
  event: RaceEvent,
  existing: OrganizerContact[]
): OrganizerContact | null {
  const oc = event.organizerContact;
  if (!hasOrganizerEmail(oc)) return null;

  const email = oc!.contactEmail!.trim().toLowerCase();
  const eventKey = normalizeEventKey(event.name);
  const year = getParticipationYear(event);
  const now = new Date().toISOString();
  const typical = inferTypicalDateFromEvent(event);
  const typicalEnd = inferTypicalEndDateFromEvent(event);
  const stageCount = inferStageCountFromEvent(event);
  const categoryId =
    inferCategoryIdFromText(event.eligibleCategory, event.type) ||
    (event.eligibleCategory?.includes('.') ? event.eligibleCategory : undefined);

  const matchIdx = existing.findIndex(
    (c) =>
      c.contactEmail.toLowerCase() === email &&
      normalizeEventKey(c.eventName) === eventKey
  );

  if (matchIdx >= 0) {
    const prev = existing[matchIdx];
    const years = new Set(prev.participationYears || []);
    years.add(year);
    return enrichOrganizerContact({
      ...prev,
      organizingEntity: oc!.organizingEntity || prev.organizingEntity,
      contactName: oc!.contactName || prev.contactName,
      contactEmail: email,
      contactPhone: oc!.contactPhone || prev.contactPhone,
      location: event.location || prev.location,
      uciClass: event.type || prev.uciClass,
      category: event.eligibleCategory || prev.category,
      categoryId: categoryId || prev.categoryId,
      discipline: event.discipline || prev.discipline,
      lastEventDate: event.date,
      lastEventEndDate: typicalEnd.lastEventEndDate ?? prev.lastEventEndDate,
      lastEventId: event.id,
      typicalMonth: typical.typicalMonth ?? prev.typicalMonth,
      typicalDay: typical.typicalDay ?? prev.typicalDay,
      typicalEndMonth: typicalEnd.typicalEndMonth ?? prev.typicalEndMonth,
      typicalEndDay: typicalEnd.typicalEndDay ?? prev.typicalEndDay,
      stageCount: stageCount ?? prev.stageCount,
      eventType: event.eventType ?? prev.eventType,
      participationYears: Array.from(years).sort((a, b) => b - a),
      notes: oc!.notes || prev.notes,
      updatedAt: now,
    });
  }

  return enrichOrganizerContact({
    id: `org_${Date.now().toString(36)}`,
    eventName: event.name.trim(),
    organizingEntity: oc!.organizingEntity,
    contactName: oc!.contactName,
    contactEmail: email,
    contactPhone: oc!.contactPhone,
    location: event.location,
    uciClass: event.type,
    category: event.eligibleCategory,
    categoryId,
    discipline: event.discipline,
    lastEventDate: event.date,
    lastEventEndDate: typicalEnd.lastEventEndDate,
    lastEventId: event.id,
    typicalMonth: typical.typicalMonth,
    typicalDay: typical.typicalDay,
    typicalEndMonth: typicalEnd.typicalEndMonth,
    typicalEndDay: typicalEnd.typicalEndDay,
    stageCount,
    eventType: event.eventType,
    participationYears: [year],
    notes: oc!.notes,
    updatedAt: now,
  });
}

export function mergeOrganizerContactList(
  existing: OrganizerContact[],
  updated: OrganizerContact
): OrganizerContact[] {
  const idx = existing.findIndex((c) => c.id === updated.id);
  if (idx >= 0) {
    return existing.map((c, i) => (i === idx ? updated : c));
  }
  const byEmailName = existing.findIndex(
    (c) =>
      c.contactEmail.toLowerCase() === updated.contactEmail.toLowerCase() &&
      normalizeEventKey(c.eventName) === normalizeEventKey(updated.eventName)
  );
  if (byEmailName >= 0) {
    return existing.map((c, i) => (i === byEmailName ? { ...updated, id: c.id } : c));
  }
  return [...existing, updated];
}

export function buildOrganizerContactsFromEvents(events: RaceEvent[]): OrganizerContact[] {
  let list: OrganizerContact[] = [];
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (const ev of sorted) {
    const upserted = upsertOrganizerContactFromEvent(ev, list);
    if (upserted) {
      list = mergeOrganizerContactList(list, upserted);
    }
  }
  return list.sort((a, b) => a.eventName.localeCompare(b.eventName, 'fr')).map(enrichOrganizerContact);
}

export function mergeOrganizerContactDirectories(
  existing: OrganizerContact[],
  fromEvents: OrganizerContact[]
): OrganizerContact[] {
  let merged = [...existing];
  for (const contact of fromEvents) {
    merged = mergeOrganizerContactList(merged, contact);
  }
  return merged.sort((a, b) => {
    const dateA = getTheoreticalEventDate(a, new Date().getFullYear() + 1);
    const dateB = getTheoreticalEventDate(b, new Date().getFullYear() + 1);
    if (dateA && dateB) return dateA.localeCompare(dateB);
    if (dateA) return -1;
    if (dateB) return 1;
    return a.eventName.localeCompare(b.eventName, 'fr');
  }).map(enrichOrganizerContact);
}

export interface OrganizerContactGroup {
  key: string;
  label: string;
  contacts: OrganizerContact[];
}

export interface DossierProgressStats {
  total: number;
  pending: number;
  sent: number;
  accepted: number;
  declined: number;
  completionRate: number;
  withDate: number;
}

export interface ProjectedCalendarEntry {
  contact: OrganizerContact;
  theoreticalDate: string;
  theoreticalEndDate: string | null;
  stageCount?: number;
  isStageRace: boolean;
  status: OrganizerApplicationStatus;
  month: number;
  day: number;
}

export function getDossierProgressStats(
  contacts: OrganizerContact[],
  targetYear: number
): DossierProgressStats {
  let pending = 0;
  let sent = 0;
  let accepted = 0;
  let declined = 0;
  let withDate = 0;

  for (const c of contacts) {
    if (getTheoreticalEventDate(c, targetYear)) withDate += 1;
    const status = getApplicationStatus(c, targetYear);
    if (status === 'pending') pending += 1;
    else if (status === 'sent') sent += 1;
    else if (status === 'accepted') accepted += 1;
    else if (status === 'declined') declined += 1;
  }

  const total = contacts.length;
  const done = sent + accepted + declined;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return { total, pending, sent, accepted, declined, completionRate, withDate };
}

export function buildProjectionEntriesForYear(
  contacts: OrganizerContact[],
  targetYear: number
): ProjectedCalendarEntry[] {
  const entries: ProjectedCalendarEntry[] = [];
  for (const contact of contacts) {
    const theoreticalDate = getTheoreticalEventDate(contact, targetYear);
    if (!theoreticalDate) continue;
    const parsed = parseEventDate(theoreticalDate);
    if (!parsed) continue;
    const theoreticalEndDate = getTheoreticalEventEndDate(contact, targetYear);
    const isStage = isOrganizerContactStageRace(contact);
    entries.push({
      contact,
      theoreticalDate,
      theoreticalEndDate,
      stageCount: isStage
        ? getProjectedStageCount(contact, theoreticalDate, theoreticalEndDate)
        : undefined,
      isStageRace: isStage,
      status: getApplicationStatus(contact, targetYear),
      month: parsed.month,
      day: parsed.day,
    });
  }
  return entries.sort((a, b) => a.theoreticalDate.localeCompare(b.theoreticalDate));
}

export function groupProjectionEntriesByMonth(
  entries: ProjectedCalendarEntry[],
  targetYear: number
): OrganizerContactGroup[] {
  const byMonth = new Map<number, ProjectedCalendarEntry[]>();
  const undated: ProjectedCalendarEntry[] = [];

  for (const entry of entries) {
    if (!entry.month) {
      undated.push(entry);
      continue;
    }
    const list = byMonth.get(entry.month) || [];
    list.push(entry);
    byMonth.set(entry.month, list);
  }

  const groups: OrganizerContactGroup[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, list]) => ({
      key: `proj-m${month}`,
      label: formatFrenchMonthYear(month, targetYear),
      contacts: list.map((e) => e.contact),
    }));

  if (undated.length > 0) {
    groups.push({
      key: 'proj-undated',
      label: 'Date à confirmer',
      contacts: undated.map((e) => e.contact),
    });
  }

  return groups;
}

export function getMonthProjectionCounts(
  contacts: OrganizerContact[],
  targetYear: number
): { month: number; count: number; accepted: number }[] {
  const counts = new Map<number, { count: number; accepted: number }>();
  for (const c of contacts) {
    const month = c.typicalMonth || (c.lastEventDate ? parseEventDate(c.lastEventDate)?.month : undefined);
    if (!month) continue;
    const prev = counts.get(month) || { count: 0, accepted: 0 };
    prev.count += 1;
    if (getApplicationStatus(c, targetYear) === 'accepted') prev.accepted += 1;
    counts.set(month, prev);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, data]) => ({ month, ...data }));
}

export function groupOrganizerContactsByMonth(
  contacts: OrganizerContact[],
  targetYear: number
): OrganizerContactGroup[] {
  const byMonth = new Map<number, OrganizerContact[]>();
  const undated: OrganizerContact[] = [];

  for (const c of contacts) {
    const month = c.typicalMonth || (c.lastEventDate ? parseEventDate(c.lastEventDate)?.month : undefined);
    if (!month) {
      undated.push(c);
      continue;
    }
    const list = byMonth.get(month) || [];
    list.push(c);
    byMonth.set(month, list);
  }

  const groups: OrganizerContactGroup[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, list]) => ({
      key: `m${month}`,
      label: formatFrenchMonthYear(month, targetYear),
      contacts: list.sort((a, b) => (a.typicalDay || 1) - (b.typicalDay || 1)),
    }));

  if (undated.length > 0) {
    groups.push({
      key: 'undated',
      label: 'Date à confirmer',
      contacts: undated.sort((a, b) => a.eventName.localeCompare(b.eventName, 'fr')),
    });
  }

  return groups;
}

export function groupOrganizerContactsByCategory(contacts: OrganizerContact[]): OrganizerContactGroup[] {
  const byCat = new Map<string, OrganizerContact[]>();

  for (const c of contacts) {
    const cat = c.category?.trim() || 'Sans catégorie';
    const list = byCat.get(cat) || [];
    list.push(c);
    byCat.set(cat, list);
  }

  return Array.from(byCat.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([cat, list]) => ({
      key: cat,
      label: cat,
      contacts: list.sort((a, b) => a.eventName.localeCompare(b.eventName, 'fr')),
    }));
}

export function getUniqueCategories(contacts: OrganizerContact[]): string[] {
  const cats = new Set<string>();
  for (const c of contacts) {
    if (c.category?.trim()) cats.add(c.category.trim());
  }
  return Array.from(cats).sort((a, b) => a.localeCompare(b, 'fr'));
}

export function filterOrganizerContacts(
  contacts: OrganizerContact[],
  search: string,
  category: string | null,
  statusFilter: OrganizerApplicationStatus | 'all',
  targetYear: number,
  taxonomyFilters?: {
    gender?: RaceGenderSegment | 'all';
    circuit?: RaceCircuitTier | 'all';
    level?: RaceCompetitionLevel | 'all';
    teamLevel?: import('../types').TeamLevel;
    teamFitOnly?: boolean;
  }
): OrganizerContact[] {
  const q = search.trim().toLowerCase();
  return contacts.filter((c) => {
    const enriched = enrichOrganizerContact(c);
    const taxonomy = resolveRaceTaxonomy(enriched);

    if (category && (c.category?.trim() || 'Sans catégorie') !== category) return false;
    if (statusFilter !== 'all' && getApplicationStatus(c, targetYear) !== statusFilter) return false;

    if (taxonomyFilters?.gender && taxonomyFilters.gender !== 'all') {
      if (taxonomy.genderSegment !== taxonomyFilters.gender && taxonomy.genderSegment !== 'mixed') {
        return false;
      }
    }
    if (taxonomyFilters?.circuit && taxonomyFilters.circuit !== 'all') {
      if (taxonomy.circuitTier !== taxonomyFilters.circuit) return false;
    }
    if (taxonomyFilters?.level && taxonomyFilters.level !== 'all') {
      if (taxonomy.competitionLevel !== taxonomyFilters.level) return false;
    }
    if (taxonomyFilters?.teamFitOnly && taxonomyFilters.teamLevel) {
      if (!isContactEligibleForTeam(enriched, taxonomyFilters.teamLevel)) return false;
    }

    if (!q) return true;
    return (
      c.eventName.toLowerCase().includes(q) ||
      c.contactEmail.toLowerCase().includes(q) ||
      (c.organizingEntity || '').toLowerCase().includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (taxonomy.badgeLabel || '').toLowerCase().includes(q)
    );
  });
}

export function buildCandidatureDossierText(
  contacts: OrganizerContact[],
  teamName: string,
  targetYear: number
): string {
  const progress = getDossierProgressStats(contacts, targetYear);
  const lines: string[] = [
    `DOSSIER CANDIDATURES — ${teamName} — Saison ${targetYear}`,
    `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    '',
    'SYNTHÈSE',
    `  Épreuves suivies     : ${progress.total}`,
    `  Dates projetées      : ${progress.withDate}/${progress.total}`,
    `  À candidater         : ${progress.pending}`,
    `  Demandes envoyées    : ${progress.sent}`,
    `  Confirmées           : ${progress.accepted}`,
    `  Refusées             : ${progress.declined}`,
    `  Avancement dossier   : ${progress.completionRate}%`,
    '='.repeat(60),
    '',
  ];

  const groups = groupOrganizerContactsByMonth(contacts, targetYear);
  for (const group of groups) {
    lines.push(`## ${group.label}`);
    lines.push('');
    for (const c of group.contacts) {
      const theoretical = getTheoreticalEventDate(c, targetYear);
      const theoreticalEnd = getTheoreticalEventEndDate(c, targetYear);
      const stageCount = getProjectedStageCount(c, theoretical || '', theoreticalEnd);
      const dateLabel = theoretical
        ? formatProjectionDateRange(theoretical, theoreticalEnd, { approximate: true })
        : 'Date à confirmer';
      const status = getApplicationStatus(c, targetYear);
      lines.push(`• ${c.eventName}`);
      lines.push(`  Date théorique : ${dateLabel}`);
      if (stageCount != null && stageCount > 1) {
        lines.push(`  Étapes : ${stageCount}`);
      }
      if (c.category) lines.push(`  Catégorie : ${c.category}`);
      const enriched = enrichOrganizerContact(c);
      const taxonomy = resolveRaceTaxonomy(enriched);
      lines.push(`  Circuit : ${taxonomy.badgeLabel} · ${taxonomy.genderSegment} · ${taxonomy.competitionLevel}`);
      if (c.uciClass) lines.push(`  Classe UCI : ${c.uciClass}`);
      if (c.location) lines.push(`  Lieu : ${c.location}`);
      lines.push(`  Organisation : ${c.organizingEntity || '—'}`);
      lines.push(`  Contact : ${c.contactName || '—'} <${c.contactEmail}>`);
      if (c.participationYears?.length) {
        lines.push(`  Participations : ${c.participationYears.join(', ')}`);
      }
      lines.push(`  Statut ${targetYear} : ${status}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function downloadCandidatureDossier(
  contacts: OrganizerContact[],
  teamName: string,
  targetYear: number
): void {
  const content = buildCandidatureDossierText(contacts, teamName, targetYear);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidatures-${teamName.replace(/\s+/g, '-').toLowerCase()}-${targetYear}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function organizerContactToEventFields(
  contact: OrganizerContact
): RaceEventOrganizerContact {
  return {
    organizingEntity: contact.organizingEntity,
    contactName: contact.contactName,
    contactEmail: contact.contactEmail,
    contactPhone: contact.contactPhone,
    notes: contact.notes,
  };
}

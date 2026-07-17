import {
  DocumentStatus,
  EventDocumentKind,
  EventRaceDocument,
  RaceEvent,
  Rider,
  TeamLevel,
  UciFormStepStatus,
} from '../types';
import { UCI_LIST_ATTESTATION_DAYS } from './uciBikeFitUtils';
import { checkUciTtCompliance, getUciHeightCategory } from './uciBikeFitUtils';
import { inferCategoryIdFromText, resolveRaceTaxonomy } from './raceCalendarTaxonomy';

const UCI_ENABLED_TEAM_LEVELS = new Set<TeamLevel>([
  TeamLevel.N1_N3,
  TeamLevel.PRO,
  TeamLevel.FEDERATION,
]);

function eventHaystack(event: RaceEvent): string {
  return `${event.eligibleCategory || ''} ${event.name || ''} ${event.type || ''}`.toLowerCase();
}

/** Course homologuée UCI (WorldTour, ProSeries, Classe 1/2, etc.) */
export function isUciHomologatedEvent(event: RaceEvent): boolean {
  const hay = eventHaystack(event);
  if (hay.includes('uci')) return true;

  const categoryId =
    inferCategoryIdFromText(event.eligibleCategory) ||
    inferCategoryIdFromText(event.name);
  if (categoryId) {
    const taxonomy = resolveRaceTaxonomy({
      categoryId,
      category: event.eligibleCategory,
      eventName: event.name,
    });
    if (taxonomy.federationScope === 'uci') return true;
    if (['worldtour', 'proseries', 'continental1', 'continental2', 'international'].includes(taxonomy.circuitTier)) {
      return true;
    }
  }

  return (
    hay.includes('worldtour') ||
    hay.includes('proseries') ||
    hay.includes('pro series') ||
    hay.includes('classe 1') ||
    hay.includes('classe 2') ||
    hay.includes("women's classe") ||
    /\buci\s*[12]\b/.test(hay) ||
    /\b1\.\d\b/.test(hay) ||
    /\b2\.\d\b/.test(hay)
  );
}

/** Afficher le workflow formulaires UCI (équipes N1+ sur courses UCI / pro invitées). */
export function isUciCategoryEvent(event: RaceEvent, teamLevel?: TeamLevel): boolean {
  if (isUciHomologatedEvent(event)) return true;
  if (teamLevel && UCI_ENABLED_TEAM_LEVELS.has(teamLevel)) {
    const hay = eventHaystack(event);
    return (
      hay.includes('proseries') ||
      hay.includes('pro series') ||
      hay.includes('continental') ||
      hay.includes('invitation') ||
      hay.includes('wildcard')
    );
  }
  return false;
}

export type UciFormStepId =
  | 'ENGAGEMENT_J20'
  | 'ENGAGEMENT_J3'
  | 'HEIGHT_ATTESTATION'
  | 'BIKE_COMPLIANCE'
  | 'CONFIRMATION_PARTANTS';

export interface UciFormWorkflowStep {
  id: UciFormStepId;
  kind: EventDocumentKind;
  title: string;
  description: string;
  deadlineDaysBefore: number;
  regulationRef: string;
  canGeneratePdf: boolean;
}

export const UCI_FORM_WORKFLOW_STEPS: UciFormWorkflowStep[] = [
  {
    id: 'ENGAGEMENT_J20',
    kind: EventDocumentKind.UCI_ENGAGEMENT_J20,
    title: "Bulletin d'engagement — page 1",
    description: "Envoi à l'organisateur signé (responsable administratif)",
    deadlineDaysBefore: 20,
    regulationRef: 'art. 1.2.049',
    canGeneratePdf: true,
  },
  {
    id: 'ENGAGEMENT_J3',
    kind: EventDocumentKind.UCI_ENGAGEMENT_J3,
    title: 'Bulletin — titulaires & remplaçants',
    description: 'Liste des partants au moins 72 h avant le départ',
    deadlineDaysBefore: 3,
    regulationRef: 'art. 1.2.049 / 1.2.090',
    canGeneratePdf: true,
  },
  {
    id: 'HEIGHT_ATTESTATION',
    kind: EventDocumentKind.UCI_HEIGHT_ATTESTATION,
    title: 'Attestation liste de taille UCI',
    description: `Pour coureurs ≥ 180 cm (cat. 2 ou 3) — formulaire J-${UCI_LIST_ATTESTATION_DAYS}`,
    deadlineDaysBefore: UCI_LIST_ATTESTATION_DAYS,
    regulationRef: 'art. 1.3.023',
    canGeneratePdf: false,
  },
  {
    id: 'BIKE_COMPLIANCE',
    kind: EventDocumentKind.UCI_BIKE_COMPLIANCE,
    title: 'Contrôle matériel CLM / bike fit',
    description: 'Cotes S/E/H conformes et fiche vélo CLM si applicable',
    deadlineDaysBefore: 1,
    regulationRef: 'art. 1.3.013 / 1.3.023',
    canGeneratePdf: false,
  },
  {
    id: 'CONFIRMATION_PARTANTS',
    kind: EventDocumentKind.UCI_CONFIRMATION_PARTANTS,
    title: 'Confirmation des partants',
    description: 'Signature DS titulaire en réunion des directeurs sportifs',
    deadlineDaysBefore: 0,
    regulationRef: 'art. 1.2.090',
    canGeneratePdf: false,
  },
];

const KIND_LABELS: Record<EventDocumentKind, string> = {
  [EventDocumentKind.UCI_ENGAGEMENT_J20]: "Bulletin d'engagement UCI (J-20)",
  [EventDocumentKind.UCI_ENGAGEMENT_J3]: 'Bulletin titulaires UCI (J-3)',
  [EventDocumentKind.UCI_HEIGHT_ATTESTATION]: 'Attestation taille UCI',
  [EventDocumentKind.UCI_BIKE_COMPLIANCE]: 'Contrôle matériel UCI',
  [EventDocumentKind.UCI_CONFIRMATION_PARTANTS]: 'Confirmation partants DS',
  [EventDocumentKind.ROADBOOK]: 'Roadbook',
  [EventDocumentKind.LICENSES]: 'Licences',
  [EventDocumentKind.OTHER]: 'Document',
};

export function getUciDocumentLabel(kind: EventDocumentKind | string): string {
  return KIND_LABELS[kind as EventDocumentKind] ?? String(kind);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + 'T12:00:00Z');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeStepDueDate(event: RaceEvent, deadlineDaysBefore: number): string {
  return addDays(event.startDate || event.date, -deadlineDaysBefore);
}

export function computeStepStatus(
  step: UciFormWorkflowStep,
  event: RaceEvent,
  document?: EventRaceDocument,
): UciFormStepStatus {
  if (document?.status === DocumentStatus.FAIT) return 'done';
  if (document?.status === DocumentStatus.EN_COURS) return 'in_progress';

  const dueDate = document?.dueDate ?? computeStepDueDate(event, step.deadlineDaysBefore);
  const remaining = daysUntil(dueDate);

  if (remaining < 0) return 'overdue';
  if (remaining <= 3) return 'due_soon';
  return 'pending';
}

export function needsHeightAttestation(riders: Rider[], selectedRiderIds: string[]): boolean {
  const selected = riders.filter(r => selectedRiderIds.includes(r.id));
  return selected.some(r => (r.heightCm ?? 0) >= 180 || getUciHeightCategory(r.heightCm) !== null);
}

export function needsBikeComplianceCheck(riders: Rider[], selectedRiderIds: string[]): boolean {
  const selected = riders.filter(r => selectedRiderIds.includes(r.id));
  return selected.some(r => {
    const tt = r.ttBikeSetup;
    if (!tt?.cotes) return false;
    const compliance = checkUciTtCompliance({
      cotes: tt.cotes,
      heightCm: r.heightCm,
      uciHeightListRegistered: tt.uciHeightListRegistered,
    });
    return compliance.checks.some(c => c.status === 'error' || c.status === 'warning');
  });
}

export function isStepApplicable(
  step: UciFormWorkflowStep,
  event: RaceEvent,
  riders: Rider[],
): boolean {
  if (step.id === 'HEIGHT_ATTESTATION') {
    return needsHeightAttestation(riders, event.selectedRiderIds || []);
  }
  if (step.id === 'BIKE_COMPLIANCE') {
    return needsBikeComplianceCheck(riders, event.selectedRiderIds || []);
  }
  return true;
}

export interface UciWorkflowStepView {
  step: UciFormWorkflowStep;
  document?: EventRaceDocument;
  status: UciFormStepStatus;
  dueDate: string;
  applicable: boolean;
}

export function buildUciWorkflowViews(
  event: RaceEvent,
  documents: EventRaceDocument[],
  riders: Rider[],
): UciWorkflowStepView[] {
  const eventDocs = documents.filter(d => d.eventId === event.id);

  return UCI_FORM_WORKFLOW_STEPS.map(step => {
    const document = eventDocs.find(d => d.kind === step.kind);
    const applicable = isStepApplicable(step, event, riders);
    const status = !applicable
      ? 'not_applicable'
      : computeStepStatus(step, event, document);
    const dueDate = document?.dueDate ?? computeStepDueDate(event, step.deadlineDaysBefore);
    return { step, document, status, dueDate, applicable };
  });
}

export function createUciDocumentPlaceholder(
  event: RaceEvent,
  step: UciFormWorkflowStep,
): EventRaceDocument {
  return {
    id: `uci_${step.kind}_${event.id}_${Date.now()}`,
    eventId: event.id,
    kind: step.kind,
    name: getUciDocumentLabel(step.kind),
    status: DocumentStatus.EN_ATTENTE,
    fileLinkOrPath: '',
    dueDate: computeStepDueDate(event, step.deadlineDaysBefore),
    notes: `${step.regulationRef} — ${step.description}`,
  };
}

export function ensureUciDocumentsForEvent(
  event: RaceEvent,
  existingDocuments: EventRaceDocument[],
  teamLevel?: TeamLevel,
): EventRaceDocument[] {
  if (!isUciCategoryEvent(event, teamLevel)) return [];

  const eventDocs = existingDocuments.filter(d => d.eventId === event.id);
  const toAdd: EventRaceDocument[] = [];

  for (const step of UCI_FORM_WORKFLOW_STEPS) {
    if (!eventDocs.some(d => d.kind === step.kind)) {
      toAdd.push(createUciDocumentPlaceholder(event, step));
    }
  }

  return toAdd;
}

export function getUciDocumentsForEvent(
  eventId: string,
  documents: EventRaceDocument[],
): EventRaceDocument[] {
  return documents.filter(
    d =>
      d.eventId === eventId &&
      Object.values(EventDocumentKind).includes(d.kind as EventDocumentKind) &&
      String(d.kind).startsWith('UCI_'),
  );
}

export const UCI_STEP_STATUS_LABELS: Record<UciFormStepStatus, string> = {
  pending: 'À faire',
  due_soon: 'Échéance proche',
  overdue: 'En retard',
  in_progress: 'En cours',
  done: 'Fait',
  not_applicable: 'N/A',
};

export const UCI_STEP_STATUS_CLASSES: Record<UciFormStepStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  due_soon: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-emerald-100 text-emerald-800',
  not_applicable: 'bg-gray-100 text-gray-500',
};

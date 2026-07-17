import { ChecklistRole, ChecklistTemplate, RaceEvent, TeamLevel, TeamOperationalSettings } from '../types';
import {
  FICHE_POSTE_CATALOG,
  FICHE_POSTE_ALL_TASKS,
  FICHE_STRUCTURE_LABELS,
  FichePosteRoleDefinition,
  FichePosteStructureLevel,
  FichePosteTask,
} from '../data/fichePosteCatalog';
import {
  filterTasksForTeamContext,
  filterTasksByEventFocus,
  resolveEventFocus,
  resolveFicheStructure,
} from './teamOperationalUtils';

/** @deprecated Préférer resolveFicheStructure avec operationalSettings */
export function teamLevelToFicheStructure(level?: TeamLevel): FichePosteStructureLevel {
  return resolveFicheStructure(level);
}

export function resolveFicheStructureForTeam(
  teamLevel?: TeamLevel,
  operationalSettings?: TeamOperationalSettings
): FichePosteStructureLevel {
  return resolveFicheStructure(teamLevel, operationalSettings);
}

export function getFichePosteDefinition(role: ChecklistRole): FichePosteRoleDefinition | undefined {
  return FICHE_POSTE_CATALOG.find((d) => d.role === role);
}

export function getFichePosteTasks(
  role: ChecklistRole,
  structureLevel: FichePosteStructureLevel,
  teamLevel?: TeamLevel,
  operationalSettings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[]
): FichePosteTask[] {
  const def = getFichePosteDefinition(role);
  if (!def) return [];
  let tasks = def.tasks[structureLevel] || def.tasks.club;
  tasks = filterTasksForTeamContext(tasks, teamLevel);
  const focus = resolveEventFocus(operationalSettings, raceEvents);
  return filterTasksByEventFocus(tasks, focus);
}

export function getFichePosteSummary(
  role: ChecklistRole,
  structureLevel: FichePosteStructureLevel
): string {
  const def = getFichePosteDefinition(role);
  return def?.summaries[structureLevel] || '';
}

export function getStructureLevelLabel(level: FichePosteStructureLevel): string {
  return FICHE_STRUCTURE_LABELS[level];
}

export function getTimingLabelFromFicheCatalog(
  name: string,
  eventType?: string
): string | undefined {
  if (!name?.trim()) return undefined;
  const key = name.trim().toLowerCase();
  const task = FICHE_POSTE_ALL_TASKS.find(
    (t) => t.name.trim().toLowerCase() === key && (!eventType || t.eventType === eventType)
  );
  return task?.timingLabel;
}

export function buildChecklistTemplatesFromFiche(
  role: ChecklistRole,
  structureLevel: FichePosteStructureLevel,
  existing: ChecklistTemplate[],
  generateId: () => string,
  teamLevel?: TeamLevel,
  operationalSettings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[]
): { added: number; templates: ChecklistTemplate[] } {
  const tasks = getFichePosteTasks(role, structureLevel, teamLevel, operationalSettings, raceEvents);
  const existingKeys = new Set(
    existing.map((t) => `${(t.name || '').trim().toLowerCase()}|${t.eventType || ''}|${t.timingLabel || ''}`)
  );
  const newTemplates: ChecklistTemplate[] = [];
  let added = 0;

  tasks.forEach((task) => {
    const key = `${task.name.trim().toLowerCase()}|${task.eventType}|${task.timingLabel || ''}`;
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    newTemplates.push({
      id: generateId(),
      name: task.name,
      role,
      kind: task.kind || 'task',
      eventType: task.eventType,
      timing: task.timing || 'pendant',
      timingLabel: task.timingLabel,
    });
    added += 1;
  });

  return { added, templates: newTemplates };
}

export function countMissingFichePosteTasks(
  role: ChecklistRole,
  structureLevel: FichePosteStructureLevel,
  existing: ChecklistTemplate[],
  teamLevel?: TeamLevel,
  operationalSettings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[]
): number {
  return buildChecklistTemplatesFromFiche(
    role,
    structureLevel,
    existing,
    () => 'preview',
    teamLevel,
    operationalSettings,
    raceEvents
  ).added;
}

export function groupFicheTasksBySection(
  tasks: FichePosteTask[]
): { label: string; items: FichePosteTask[] }[] {
  const groups: { label: string; items: FichePosteTask[] }[] = [];
  let currentLabel = '';
  let currentItems: FichePosteTask[] = [];
  tasks.forEach((task) => {
    const label = task.timingLabel || task.timing || 'Autre';
    if (label !== currentLabel) {
      if (currentItems.length) groups.push({ label: currentLabel, items: currentItems });
      currentLabel = label;
      currentItems = [];
    }
    currentItems.push(task);
  });
  if (currentItems.length) groups.push({ label: currentLabel, items: currentItems });
  return groups;
}

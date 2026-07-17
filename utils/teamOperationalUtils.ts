import {
  ChecklistRole,
  EventType,
  RaceEvent,
  TeamEventFocus,
  TeamFicheProfile,
  TeamLevel,
  TeamOperationalSettings,
} from '../types';
import { TEAM_OPERATIONAL_PRESETS } from '../data/teamOperationalPresets';
import type { FichePosteStructureLevel } from '../data/fichePosteCatalog';
import type { FichePosteTask } from '../data/fichePosteAssistant';
import { mapStaffRoleKeyToChecklistRole } from './checklistRoleUtils';

const ALL_CHECKLIST_ROLES = Object.values(ChecklistRole);

const FORMATION_EXCLUDED_KEYWORDS = [
  'uci',
  'sponsor',
  'presse',
  'anti-dopage',
  'whereabouts',
  'communiqué',
  'partenaires',
  'médias',
];

export function getOperationalPreset(teamLevel?: TeamLevel) {
  return TEAM_OPERATIONAL_PRESETS[teamLevel ?? TeamLevel.HORS_DN]
    ?? TEAM_OPERATIONAL_PRESETS[TeamLevel.HORS_DN];
}

export function getRecommendedOperationalSettings(teamLevel?: TeamLevel): TeamOperationalSettings {
  const preset = getOperationalPreset(teamLevel);
  return {
    enabledChecklistRoles: [...preset.enabledChecklistRoles],
    ficheProfile: preset.ficheProfile === 'auto' ? 'auto' : preset.ficheProfile,
    eventFocus: 'auto',
  };
}

export function normalizeOperationalSettings(
  teamLevel?: TeamLevel,
  settings?: TeamOperationalSettings
): TeamOperationalSettings {
  const preset = getOperationalPreset(teamLevel);
  const enabled = settings?.enabledChecklistRoles?.filter((r) => ALL_CHECKLIST_ROLES.includes(r));
  return {
    enabledChecklistRoles:
      enabled && enabled.length > 0 ? enabled : [...preset.enabledChecklistRoles],
    ficheProfile: settings?.ficheProfile ?? 'auto',
    eventFocus: settings?.eventFocus ?? 'auto',
    recruitmentTarget: settings?.recruitmentTarget ?? 'auto',
    acceptRiderApplications: settings?.acceptRiderApplications,
    gender: settings?.gender ?? 'mixed',
  };
}

export function getEnabledChecklistRoles(
  teamLevel?: TeamLevel,
  settings?: TeamOperationalSettings
): ChecklistRole[] {
  return normalizeOperationalSettings(teamLevel, settings).enabledChecklistRoles ?? ALL_CHECKLIST_ROLES;
}

export function isChecklistRoleEnabled(
  role: ChecklistRole,
  teamLevel?: TeamLevel,
  settings?: TeamOperationalSettings
): boolean {
  return getEnabledChecklistRoles(teamLevel, settings).includes(role);
}

export function resolveFicheStructure(
  teamLevel?: TeamLevel,
  settings?: TeamOperationalSettings
): FichePosteStructureLevel {
  const profile = normalizeOperationalSettings(teamLevel, settings).ficheProfile;
  if (profile && profile !== 'auto') {
    return profile;
  }
  switch (teamLevel) {
    case TeamLevel.PRO:
      return 'pro';
    case TeamLevel.N1_N3:
    case TeamLevel.FEDERATION:
      return 'competition';
    case TeamLevel.JEUNES:
    case TeamLevel.HORS_DN:
    default:
      return 'club';
  }
}

/** Déduit stage vs compétition à partir des événements à venir */
export function inferEventFocusFromCalendar(raceEvents: RaceEvent[]): Exclude<TeamEventFocus, 'auto'> {
  const today = new Date().toISOString().split('T')[0];
  let stage = 0;
  let competition = 0;
  raceEvents.forEach((event) => {
    if ((event.date || '') < today) return;
    if (event.eventType === EventType.STAGE) stage += 1;
    else if (event.eventType === EventType.COMPETITION) competition += 1;
  });
  if (stage === 0 && competition === 0) return 'mixed';
  if (stage >= competition * 1.25) return 'stage';
  if (competition >= stage * 1.25) return 'competition';
  return 'mixed';
}

export function resolveEventFocus(
  settings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[]
): Exclude<TeamEventFocus, 'auto'> {
  const configured = normalizeOperationalSettings(undefined, settings).eventFocus ?? 'auto';
  if (configured === 'stage' || configured === 'competition' || configured === 'mixed') {
    return configured;
  }
  if (raceEvents?.length) return inferEventFocusFromCalendar(raceEvents);
  return 'mixed';
}

export function getEventFocusLabel(
  settings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[]
): string {
  const resolved = resolveEventFocus(settings, raceEvents);
  const labels: Record<Exclude<TeamEventFocus, 'auto'>, string> = {
    mixed: 'Mixte (stage + compétition)',
    stage: 'Priorité stage',
    competition: 'Priorité compétition',
  };
  const base = labels[resolved];
  const configured = settings?.eventFocus ?? 'auto';
  if (configured === 'auto' && raceEvents?.length) {
    return `${base} (auto)`;
  }
  return base;
}

/** Filtre les tâches selon le focus calendrier */
export function filterTasksByEventFocus(
  tasks: FichePosteTask[],
  focus: Exclude<TeamEventFocus, 'auto'>
): FichePosteTask[] {
  if (focus === 'mixed') return tasks;
  const target = focus === 'stage' ? EventType.STAGE : EventType.COMPETITION;
  return tasks.filter((t) => t.eventType === target);
}

export function filterTasksForTeamContext(
  tasks: FichePosteTask[],
  teamLevel?: TeamLevel
): FichePosteTask[] {
  if (teamLevel !== TeamLevel.JEUNES) return tasks;
  return tasks.filter(
    (t) => !FORMATION_EXCLUDED_KEYWORDS.some((k) => t.name.toLowerCase().includes(k))
  );
}

export function getOperationalPresetDescription(teamLevel?: TeamLevel): string {
  return getOperationalPreset(teamLevel).description;
}

export function toggleChecklistRole(
  current: ChecklistRole[],
  role: ChecklistRole
): ChecklistRole[] {
  if (current.includes(role)) {
    const next = current.filter((r) => r !== role);
    return next.length > 0 ? next : current;
  }
  return [...current, role];
}

export function isStaffRoleOperationalActive(
  staffRoleKey: string | null,
  teamLevel?: TeamLevel,
  settings?: TeamOperationalSettings
): boolean {
  if (!staffRoleKey) return true;
  const checklistRole = mapStaffRoleKeyToChecklistRole(staffRoleKey);
  if (!checklistRole) return true;
  return isChecklistRoleEnabled(checklistRole, teamLevel, settings);
}

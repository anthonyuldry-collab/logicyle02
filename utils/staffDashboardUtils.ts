import {
  AppSection,
  ChecklistItemStatus,
  ChecklistRole,
  EventChecklistItem,
  EventTransportLeg,
  EventType,
  PermissionLevel,
  RaceEvent,
  StaffMember,
  TeamLevel,
  TeamOperationalSettings,
} from '../types';
import { getEventRoleKeyForStaff, getStaffRoleKey, StaffRoleKeyString, EVENT_ROLE_KEYS } from './staffRoleUtils';
import { getStaffDashboardConfig, StaffDashboardAction } from '../data/staffDashboardConfig';
import { getFichePosteTasks } from './fichePosteUtils';
import {
  getEnabledChecklistRoles,
  getEventFocusLabel,
  isStaffRoleOperationalActive,
  resolveEventFocus,
  resolveFicheStructure,
} from './teamOperationalUtils';
import { mapStaffRoleKeyToChecklistRole } from './checklistRoleUtils';

export function getStaffAssignedEvents(
  staffMember: StaffMember,
  raceEvents: RaceEvent[],
  operationalSettings?: TeamOperationalSettings,
): RaceEvent[] {
  const roleKey = getEventRoleKeyForStaff(staffMember.role);
  const today = new Date().toISOString().split('T')[0];
  const eventFocus = resolveEventFocus(operationalSettings, raceEvents);

  const isAssigned = (event: RaceEvent): boolean => {
    if (staffMember.id && event.selectedStaffIds?.includes(staffMember.id)) return true;
    if (roleKey) {
      const ids = event[roleKey as keyof RaceEvent] as string[] | undefined;
      if (ids?.includes(staffMember.id)) return true;
    }
    for (const key of EVENT_ROLE_KEYS) {
      const ids = event[key as keyof RaceEvent] as string[] | undefined;
      if (ids?.includes(staffMember.id)) return true;
    }
    return false;
  };

  return raceEvents
    .filter(event => isAssigned(event))
    .filter(event => (event.date || '') >= today)
    .filter((event) => {
      if (eventFocus === 'mixed' || !event.eventType) return true;
      if (eventFocus === 'stage') return event.eventType === EventType.STAGE;
      if (eventFocus === 'competition') return event.eventType === EventType.COMPETITION;
      return true;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

export function getStaffTripCount(
  staffMember: StaffMember,
  transportLegs: EventTransportLeg[],
  raceEvents: RaceEvent[] = [],
  operationalSettings?: TeamOperationalSettings,
): number {
  const roleKey = getStaffRoleKey(staffMember.role);
  if (roleKey === 'DS' && raceEvents.length > 0) {
    const coordinatedEventIds = new Set(
      getStaffAssignedEvents(staffMember, raceEvents, operationalSettings).map(e => e.id)
    );
    return transportLegs.filter(leg => coordinatedEventIds.has(leg.eventId)).length;
  }
  return transportLegs.filter(leg =>
    leg.occupants?.some(o => o.id === staffMember.id),
  ).length;
}

export function getStaffPendingChecklistCount(
  staffMember: StaffMember,
  checklistItems: EventChecklistItem[],
  assignedEvents: RaceEvent[],
): number {
  const eventIds = new Set(assignedEvents.map(e => e.id));
  const checklistRole = mapStaffRoleKeyToChecklistRole(getStaffRoleKey(staffMember.role));

  return checklistItems.filter(item => {
    if (!eventIds.has(item.eventId)) return false;
    if (item.status === ChecklistItemStatus.FAIT) return false;
    if (checklistRole && item.assignedRole === checklistRole) return true;
    if (getStaffRoleKey(staffMember.role) === 'ASSISTANT') return true;
    return false;
  }).length;
}

export function getRoleFicheTaskCount(
  roleKey: StaffRoleKeyString | null,
  teamLevel?: TeamLevel,
  operationalSettings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[],
  nextEvent?: RaceEvent,
): number | undefined {
  const checklistRole = mapStaffRoleKeyToChecklistRole(roleKey);
  if (!checklistRole) return undefined;
  const structure = resolveFicheStructure(teamLevel, operationalSettings);
  const events = raceEvents ?? (nextEvent ? [nextEvent] : []);
  return getFichePosteTasks(checklistRole, structure, teamLevel, operationalSettings, events)
    .filter((t) => t.kind !== 'a_prevoir').length;
}

const FOCUS_AREA_KEYWORDS: Record<string, string[]> = {
  stage: ['stage', 'sortie', 'massage', 'hôtel', 'lessive', 'bidon', 'ravito'],
  competition: ['course', 'ravitos', 'départ', 'tactique', 'uci', 'sponsor', 'presse'],
};

export function filterFocusAreasForEventFocus(
  focusAreas: string[],
  operationalSettings?: TeamOperationalSettings,
  raceEvents?: RaceEvent[]
): string[] {
  const focus = resolveEventFocus(operationalSettings, raceEvents);
  if (focus === 'mixed') return focusAreas;
  const keywords = FOCUS_AREA_KEYWORDS[focus] ?? [];
  const matched = focusAreas.filter((area) =>
    keywords.some((k) => area.toLowerCase().includes(k))
  );
  return matched.length > 0 ? matched : focusAreas.slice(0, 3);
}

export function filterDashboardActions(
  actions: StaffDashboardAction[],
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>,
  options?: {
    staffRoleKey?: StaffRoleKeyString | null;
    teamLevel?: TeamLevel;
    operationalSettings?: TeamOperationalSettings;
  }
): StaffDashboardAction[] {
  let filtered = actions;
  if (effectivePermissions) {
    filtered = filtered.filter(action => {
      const perms = effectivePermissions[action.section];
      if (!perms) {
        return action.section.startsWith('my') || action.section === 'userSettings';
      }
      return perms.includes('view');
    });
  }
  if (options?.staffRoleKey && options.operationalSettings) {
    const roleActive = isStaffRoleOperationalActive(
      options.staffRoleKey,
      options.teamLevel,
      options.operationalSettings
    );
    if (!roleActive) {
      filtered = filtered.filter((a) => a.section !== 'checklist');
    }
    const checklistRole = mapStaffRoleKeyToChecklistRole(options.staffRoleKey);
    const enabled = getEnabledChecklistRoles(options.teamLevel, options.operationalSettings);
    if (checklistRole && !enabled.includes(checklistRole)) {
      filtered = filtered.filter((a) => a.section !== 'checklist');
    }
  }
  return filtered;
}

export interface StaffDashboardSnapshot {
  roleKey: StaffRoleKeyString | null;
  upcomingEvents: RaceEvent[];
  nextEvent?: RaceEvent;
  tripCount: number;
  pendingChecklist: number;
  ficheTaskCount?: number;
  roleOperationallyActive: boolean;
  eventFocusLabel?: string;
  config: ReturnType<typeof getStaffDashboardConfig>;
  quickActions: StaffDashboardAction[];
  filteredFocusAreas: string[];
}

export function buildStaffDashboardSnapshot(
  staffMember: StaffMember,
  raceEvents: RaceEvent[],
  transportLegs: EventTransportLeg[],
  checklistItems: EventChecklistItem[],
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>,
  teamLevel?: TeamLevel,
  operationalSettings?: TeamOperationalSettings,
): StaffDashboardSnapshot {
  const roleKey = getStaffRoleKey(staffMember.role);
  const config = getStaffDashboardConfig(roleKey);
  const upcomingEvents = getStaffAssignedEvents(staffMember, raceEvents, operationalSettings);
  const nextEvent = upcomingEvents[0];
  const tripCount = getStaffTripCount(staffMember, transportLegs, raceEvents, operationalSettings);
  const pendingChecklist = getStaffPendingChecklistCount(
    staffMember,
    checklistItems,
    upcomingEvents,
  );
  const roleOperationallyActive = isStaffRoleOperationalActive(roleKey, teamLevel, operationalSettings);
  const filteredFocusAreas = filterFocusAreasForEventFocus(
    config.focusAreas,
    operationalSettings,
    raceEvents
  );

  return {
    roleKey,
    upcomingEvents,
    nextEvent,
    tripCount,
    pendingChecklist,
    ficheTaskCount: getRoleFicheTaskCount(
      roleKey,
      teamLevel,
      operationalSettings,
      raceEvents,
      nextEvent
    ),
    roleOperationallyActive,
    eventFocusLabel: getEventFocusLabel(operationalSettings, raceEvents),
    config,
    quickActions: filterDashboardActions(config.quickActions, effectivePermissions, {
      staffRoleKey: roleKey,
      teamLevel,
      operationalSettings,
    }),
    filteredFocusAreas,
  };
}

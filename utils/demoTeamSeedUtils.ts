import {
  DemoPresentationPack,
  buildDemoPresentationPack,
  countDemoPresentationEntities,
  isDemoPresentationId,
  DEMO_PRES_TEAM_NAME,
} from '../constants/demoPresentationTeam';
import {
  EventBudgetItem,
  IncomeItem,
  PerformanceEntry,
  RaceEvent,
  Rider,
  RiderEventSelection,
  StaffMember,
  Team,
  TeamLevel,
  Vehicle,
} from '../types';

export interface DemoPresentationInstallHandlers {
  saveRider: (rider: Rider) => Promise<void>;
  saveStaff: (staff: StaffMember) => Promise<void>;
  saveVehicle: (vehicle: Vehicle) => Promise<void>;
  saveRaceEvent: (event: RaceEvent) => Promise<void>;
  saveRiderEventSelection: (sel: RiderEventSelection) => Promise<void>;
  saveBudgetItem: (item: EventBudgetItem) => Promise<void>;
  saveIncomeItem: (item: IncomeItem) => Promise<void>;
  savePerformanceEntry: (entry: PerformanceEntry) => Promise<void>;
  applyTeamIdentity: (patch: {
    name: string;
    level: TeamLevel;
    primaryColor: string;
    accentColor: string;
    address?: Team['address'];
  }) => Promise<void>;
}

export interface DemoPresentationInstallResult {
  teamName: string;
  entityCount: number;
  riders: number;
  staff: number;
  events: number;
}

async function saveAll<T extends { id: string }>(
  items: T[],
  save: (item: T) => Promise<void>
): Promise<void> {
  for (const item of items) {
    await save(item);
  }
}

export async function installDemoPresentationTeam(
  handlers: DemoPresentationInstallHandlers,
  season?: number
): Promise<DemoPresentationInstallResult> {
  const pack: DemoPresentationPack = buildDemoPresentationPack(season);

  await handlers.applyTeamIdentity({
    name: pack.meta.teamName,
    level: pack.meta.level,
    primaryColor: pack.meta.primaryColor,
    accentColor: pack.meta.accentColor,
    address: pack.meta.address,
  });

  await saveAll(pack.riders, handlers.saveRider);
  await saveAll(pack.staff, handlers.saveStaff);
  await saveAll(pack.vehicles, handlers.saveVehicle);
  await saveAll(pack.raceEvents, handlers.saveRaceEvent);
  await saveAll(pack.riderEventSelections, handlers.saveRiderEventSelection);
  await saveAll(pack.eventBudgetItems, handlers.saveBudgetItem);
  await saveAll(pack.incomeItems, handlers.saveIncomeItem);
  await saveAll(pack.performanceEntries, handlers.savePerformanceEntry);

  return {
    teamName: DEMO_PRES_TEAM_NAME,
    entityCount: countDemoPresentationEntities(pack),
    riders: pack.riders.length,
    staff: pack.staff.length,
    events: pack.raceEvents.length,
  };
}

export function teamAlreadyHasDemoPresentation(params: {
  riders?: Rider[];
  staff?: StaffMember[];
  raceEvents?: RaceEvent[];
  teams?: Array<{ id: string; name: string; isPresentationDemo?: boolean }>;
}): boolean {
  if ((params.teams || []).some((t) => t.name === DEMO_PRES_TEAM_NAME || t.isPresentationDemo)) {
    return true;
  }
  return (
    (params.riders || []).some((r) => isDemoPresentationId(r.id)) ||
    (params.staff || []).some((s) => isDemoPresentationId(s.id)) ||
    (params.raceEvents || []).some((e) => isDemoPresentationId(e.id))
  );
}

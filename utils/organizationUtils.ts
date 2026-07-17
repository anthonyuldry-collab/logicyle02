import { Organization, RaceEvent, Rider, StaffMember, Team, TeamKind, TeamMembership, TeamMembershipStatus, User, UserRole } from '../types';

export interface OrgTeamSummary {
  team: Team;
  riderCount: number;
  staffCount: number;
  upcomingEvents: number;
  activeRiders: number;
}

export interface OrgDashboardKpis {
  totalTeams: number;
  totalRiders: number;
  totalStaff: number;
  totalUpcomingEvents: number;
  teamsByKind: Record<string, number>;
  teamSummaries: OrgTeamSummary[];
}

export function getOrganizationTeams(organization: Organization, teams: Team[]): Team[] {
  return teams.filter((t) => organization.teamIds.includes(t.id));
}

export function getTeamsForOrganization(teams: Team[], organizationId: string): Team[] {
  return teams.filter((t) => t.organizationId === organizationId);
}

export function buildOrgDashboardKpis(params: {
  organization: Organization;
  teams: Team[];
  ridersByTeam: Record<string, Rider[]>;
  staffByTeam: Record<string, StaffMember[]>;
  eventsByTeam: Record<string, RaceEvent[]>;
}): OrgDashboardKpis {
  const { organization, teams, ridersByTeam, staffByTeam, eventsByTeam } = params;
  const orgTeams = getOrganizationTeams(organization, teams);
  const now = new Date().toISOString().slice(0, 10);

  const teamSummaries: OrgTeamSummary[] = orgTeams.map((team) => {
    const riders = ridersByTeam[team.id] || [];
    const staff = staffByTeam[team.id] || [];
    const events = eventsByTeam[team.id] || [];
    const upcoming = events.filter((e) => e.date >= now).length;
    return {
      team,
      riderCount: riders.length,
      staffCount: staff.length,
      upcomingEvents: upcoming,
      activeRiders: riders.filter((r) => r.isActive !== false).length,
    };
  });

  const teamsByKind = orgTeams.reduce<Record<string, number>>((acc, t) => {
    const kind = t.teamKind || 'standard';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});

  return {
    totalTeams: orgTeams.length,
    totalRiders: teamSummaries.reduce((s, t) => s + t.riderCount, 0),
    totalStaff: teamSummaries.reduce((s, t) => s + t.staffCount, 0),
    totalUpcomingEvents: teamSummaries.reduce((s, t) => s + t.upcomingEvents, 0),
    teamsByKind,
    teamSummaries,
  };
}

export function getTeamKindLabel(kind: TeamKind | string | undefined, language: 'fr' | 'en' = 'fr'): string {
  const labels: Record<TeamKind, { fr: string; en: string }> = {
    root: { fr: 'Équipe principale', en: 'Main team' },
    worldtour: { fr: 'WorldTour', en: 'WorldTour' },
    development: { fr: 'Développement', en: 'Development' },
    espoirs: { fr: 'Espoirs', en: 'U23' },
    femmes: { fr: 'Équipe féminine', en: 'Women\'s team' },
    standard: { fr: 'Standard', en: 'Standard' },
  };
  const key = (kind && kind in labels ? kind : 'standard') as TeamKind;
  return labels[key][language];
}

export function isOrgAdmin(
  userId: string,
  organization: Organization,
  memberships: TeamMembership[]
): boolean {
  if (organization.adminUserIds.includes(userId)) return true;
  return memberships.some(
    (m) =>
      organization.teamIds.includes(m.teamId) &&
      m.userId === userId &&
      (m.userRole === UserRole.ORG_ADMIN || m.userRole === 'Admin Organisation')
  );
}

export function canViewOrgDashboard(params: {
  isHoldingSuperAdmin?: boolean;
}): boolean {
  return !!params.isHoldingSuperAdmin;
}

/** Résout l'organisation à afficher (holding plateforme réservé au super admin Anthony). */
export function resolveOrganizationForUser(params: {
  organizations: Organization[];
  teams: Team[];
  activeTeamId: string | null;
  currentUser: User;
  memberships: TeamMembership[];
  userTeams: Team[];
  isHoldingSuperAdmin?: boolean;
}): Organization | null {
  const { organizations, teams, activeTeamId, currentUser, isHoldingSuperAdmin } = params;

  // Cockpit PDG : toutes les équipes plateforme, même sans équipe active sélectionnée.
  if (isHoldingSuperAdmin) {
    return {
      id: 'holding-super-admin',
      name: 'LogiCycle — Pilotage PDG',
      country: teams.find((t) => t.id === activeTeamId)?.country || teams[0]?.country || 'FR',
      teamIds: teams.map((t) => t.id),
      adminUserIds: [currentUser.id],
      createdAt: new Date().toISOString(),
    };
  }

  if (!activeTeamId) return null;

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const fromFirestore = organizations.find(
    (o) =>
      o.teamIds.includes(activeTeamId) ||
      (activeTeam?.organizationId && o.id === activeTeam.organizationId)
  );
  if (fromFirestore) return fromFirestore;

  if (activeTeam?.organizationId) {
    const related = teams.filter((t) => t.organizationId === activeTeam.organizationId);
    if (related.length > 0) {
      return {
        id: activeTeam.organizationId,
        name: related[0].name.replace(/\s*(WT|Dev|U23).*$/i, '').trim() || 'Organisation',
        country: activeTeam.country,
        teamIds: related.map((t) => t.id),
        adminUserIds: [currentUser.id],
        createdAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

export interface CrossTeamConflict {
  riderKey: string;
  riderName: string;
  date: string;
  teamIds: string[];
  eventNames: string[];
}

function riderCrossTeamKey(rider: Rider): string {
  if (rider.email?.trim()) return rider.email.toLowerCase().trim();
  return `${(rider.firstName || '').trim()}|${(rider.lastName || '').trim()}`.toLowerCase();
}

export function findCrossTeamRiderConflicts(
  eventsByTeam: Record<string, RaceEvent[]>,
  ridersByTeam: Record<string, Rider[]>
): CrossTeamConflict[] {
  const conflicts: CrossTeamConflict[] = [];
  const riderDates: Record<
    string,
    Record<string, { teamIds: string[]; eventNames: string[]; riderName: string }>
  > = {};

  for (const [teamId, events] of Object.entries(eventsByTeam)) {
    const teamRiders = ridersByTeam[teamId] || [];
    for (const event of events) {
      const selectedIds = event.selectedRiderIds || [];
      if (selectedIds.length === 0) continue;

      for (const riderId of selectedIds) {
        const rider = teamRiders.find((r) => r.id === riderId);
        if (!rider) continue;
        const key = riderCrossTeamKey(rider);
        const riderName = `${rider.firstName || ''} ${rider.lastName || ''}`.trim() || riderId;
        if (!riderDates[key]) riderDates[key] = {};
        if (!riderDates[key][event.date]) {
          riderDates[key][event.date] = { teamIds: [], eventNames: [], riderName };
        }
        const entry = riderDates[key][event.date];
        if (!entry.teamIds.includes(teamId)) entry.teamIds.push(teamId);
        if (!entry.eventNames.includes(event.name)) entry.eventNames.push(event.name);
      }
    }
  }

  for (const [riderKey, dates] of Object.entries(riderDates)) {
    for (const [date, entry] of Object.entries(dates)) {
      if (entry.teamIds.length > 1) {
        conflicts.push({
          riderKey,
          riderName: entry.riderName,
          date,
          teamIds: entry.teamIds,
          eventNames: entry.eventNames,
        });
      }
    }
  }

  return conflicts.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

export const ACTIVE_TEAM_STORAGE_KEY = 'logicyle_active_team_id';

export function persistActiveTeamId(teamId: string): void {
  try {
    localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, teamId);
  } catch {
    // ignore
  }
}

export function restoreActiveTeamId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY);
  } catch {
    return null;
  }
}

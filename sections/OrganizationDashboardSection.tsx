import React, { useEffect, useMemo, useState } from 'react';
import {
  AppSection,
  Organization,
  RaceEvent,
  Rider,
  StaffMember,
  Team,
  TeamMembership,
  User,
  IncomeItem,
  EventBudgetItem,
  Vehicle,
  VehiclePosition,
  EventTransportLeg,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import EnterpriseRoadmapPanel from '../components/EnterpriseRoadmapPanel';
import { useTranslations } from '../hooks/useTranslations';
import {
  buildOrgDashboardKpis,
  canViewOrgDashboard,
  findCrossTeamRiderConflicts,
  getTeamKindLabel,
} from '../utils/organizationUtils';
import { buildOrgFinancialConsolidation } from '../utils/orgFinancialConsolidation';
import { calculatePayrollSummary } from '../utils/contractUtils';
import { buildFleetStatuses, summarizeFleetOnline } from '../utils/fleetGpsUtils';
import * as firebaseService from '../services/firebaseService';

interface OrgTeamBundle {
  riders: Rider[];
  staff: StaffMember[];
  events: RaceEvent[];
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
}

interface OrganizationDashboardSectionProps {
  organization: Organization;
  teams: Team[];
  riders: Rider[];
  staff: StaffMember[];
  raceEvents: RaceEvent[];
  currentUser: User;
  memberships: TeamMembership[];
  activeTeamId?: string | null;
  isHoldingSuperAdmin?: boolean;
  onSelectTeam?: (teamId: string) => void;
  onNavigate?: (section: AppSection, tabHint?: string) => void;
  orgTeamData?: Record<string, OrgTeamBundle>;
  vehicles?: Vehicle[];
  vehiclePositions?: VehiclePosition[];
  eventTransportLegs?: EventTransportLeg[];
}

const WT_REFERENCE_TARGETS = [
  { id: 'fdj', label: 'Groupama-FDJ', match: /fdj|groupama/i },
  { id: 'total', label: 'TotalEnergies', match: /total/i },
  { id: 'cofidis', label: 'Cofidis', match: /cofidis/i },
  { id: 'decathlon', label: 'Décathlon', match: /decathlon|décathlon/i },
];

const formatEur = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const OrganizationDashboardSection: React.FC<OrganizationDashboardSectionProps> = ({
  organization,
  teams,
  riders,
  staff,
  raceEvents,
  currentUser,
  memberships,
  activeTeamId,
  isHoldingSuperAdmin = false,
  onSelectTeam,
  onNavigate,
  orgTeamData = {},
  vehicles = [],
  vehiclePositions = [],
  eventTransportLegs = [],
}) => {
  const { t, language } = useTranslations();
  const [loadedOrgTeamData, setLoadedOrgTeamData] = useState<Record<string, OrgTeamBundle>>(orgTeamData);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    setLoadedOrgTeamData(orgTeamData);
  }, [orgTeamData]);

  useEffect(() => {
    let cancelled = false;
    const teamIds = organization.teamIds.filter(Boolean);
    if (teamIds.length === 0) return;

    setLoadingTeams(true);
    Promise.all(
      teamIds.map(async (teamId) => {
        if (teamId === activeTeamId) {
          return [
            teamId,
            {
              riders,
              staff,
              events: raceEvents,
              incomeItems: [] as IncomeItem[],
              budgetItems: [] as EventBudgetItem[],
            },
          ] as const;
        }
        try {
          const data = await firebaseService.getOrgTeamLightData(teamId);
          return [teamId, data] as const;
        } catch {
          return [
            teamId,
            {
              riders: [] as Rider[],
              staff: [] as StaffMember[],
              events: [] as RaceEvent[],
              incomeItems: [] as IncomeItem[],
              budgetItems: [] as EventBudgetItem[],
            },
          ] as const;
        }
      })
    ).then(async (entries) => {
      if (cancelled) return;
      const next: Record<string, OrgTeamBundle> = {};
      for (const [teamId, data] of entries) {
        if (teamId === activeTeamId && data.incomeItems.length === 0) {
          try {
            const full = await firebaseService.getOrgTeamLightData(teamId);
            next[teamId] = {
              riders: data.riders,
              staff: data.staff,
              events: data.events,
              incomeItems: full.incomeItems,
              budgetItems: full.budgetItems,
            };
          } catch {
            next[teamId] = data;
          }
        } else {
          next[teamId] = {
            riders: data.riders,
            staff: data.staff,
            events: data.events,
            incomeItems: data.incomeItems,
            budgetItems: data.budgetItems,
          };
        }
      }
      setLoadedOrgTeamData(next);
      setLoadingTeams(false);
    });

    return () => {
      cancelled = true;
    };
  }, [organization.id, organization.teamIds.join(','), activeTeamId, riders, staff, raceEvents]);

  const canView = canViewOrgDashboard({
    isHoldingSuperAdmin,
  });

  const kpis = useMemo(() => {
    const ridersByTeam: Record<string, Rider[]> = {};
    const staffByTeam: Record<string, StaffMember[]> = {};
    const eventsByTeam: Record<string, RaceEvent[]> = {};

    for (const teamId of organization.teamIds) {
      if (loadedOrgTeamData[teamId]) {
        ridersByTeam[teamId] = loadedOrgTeamData[teamId].riders;
        staffByTeam[teamId] = loadedOrgTeamData[teamId].staff;
        eventsByTeam[teamId] = loadedOrgTeamData[teamId].events;
      } else if (teams.find((t) => t.id === teamId)) {
        ridersByTeam[teamId] = riders;
        staffByTeam[teamId] = staff;
        eventsByTeam[teamId] = raceEvents;
      } else {
        ridersByTeam[teamId] = [];
        staffByTeam[teamId] = [];
        eventsByTeam[teamId] = [];
      }
    }

    return buildOrgDashboardKpis({
      organization,
      teams,
      ridersByTeam,
      staffByTeam,
      eventsByTeam,
    });
  }, [organization, teams, riders, staff, raceEvents, loadedOrgTeamData]);

  const financialConsolidation = useMemo(() => {
    const orgTeams = teams.filter((t) => organization.teamIds.includes(t.id));
    const teamNames = Object.fromEntries(orgTeams.map((t) => [t.id, t.name]));
    const teamKinds = Object.fromEntries(orgTeams.map((t) => [t.id, t.teamKind]));
    const incomeByTeam: Record<string, IncomeItem[]> = {};
    const budgetByTeam: Record<string, EventBudgetItem[]> = {};
    for (const teamId of organization.teamIds) {
      incomeByTeam[teamId] = loadedOrgTeamData[teamId]?.incomeItems || [];
      budgetByTeam[teamId] = loadedOrgTeamData[teamId]?.budgetItems || [];
    }
    return buildOrgFinancialConsolidation({
      teamIds: organization.teamIds,
      teamNames,
      teamKinds,
      incomeByTeam,
      budgetByTeam,
    });
  }, [organization.teamIds, teams, loadedOrgTeamData]);

  const payrollConsolidation = useMemo(() => {
    let totalMonthly = 0;
    let totalAnnual = 0;
    let expiring = 0;
    const byTeam: { teamId: string; teamName: string; monthly: number; annual: number }[] = [];

    for (const teamId of organization.teamIds) {
      const bundle = loadedOrgTeamData[teamId];
      const teamRiders =
        bundle?.riders ?? (teamId === activeTeamId ? riders : []);
      const teamStaff =
        bundle?.staff ?? (teamId === activeTeamId ? staff : []);
      const teamEvents =
        bundle?.events ?? (teamId === activeTeamId ? raceEvents : []);
      if (teamRiders.length === 0 && teamStaff.length === 0) continue;

      const summary = calculatePayrollSummary(teamRiders, teamStaff, {
        raceEvents: teamEvents,
      });
      totalMonthly += summary.monthlyTotal;
      totalAnnual += summary.annualForecast;
      expiring += summary.expiringWithin90Days;
      byTeam.push({
        teamId,
        teamName: teams.find((t) => t.id === teamId)?.name || teamId,
        monthly: summary.monthlyTotal,
        annual: summary.annualForecast,
      });
    }

    return { totalMonthly, totalAnnual, expiring, byTeam };
  }, [
    organization.teamIds,
    loadedOrgTeamData,
    activeTeamId,
    riders,
    staff,
    raceEvents,
    teams,
  ]);

  const orgFleetGps = useMemo(() => {
    const statuses = buildFleetStatuses(
      vehicles,
      vehiclePositions,
      eventTransportLegs,
      raceEvents,
      staff,
    );
    return summarizeFleetOnline(statuses);
  }, [vehicles, vehiclePositions, eventTransportLegs, raceEvents, staff]);

  const wtTeams = useMemo(
    () => kpis.teamSummaries.filter((s) => s.team.teamKind === 'worldtour'),
    [kpis.teamSummaries]
  );

  const wtReferenceStatus = useMemo(() => {
    const orgTeamNames = kpis.teamSummaries.map((s) => s.team.name);
    return WT_REFERENCE_TARGETS.map((ref) => ({
      ...ref,
      matched: orgTeamNames.some((name) => ref.match.test(name)),
    }));
  }, [kpis.teamSummaries]);

  const crossTeamConflicts = useMemo(() => {
    const eventsByTeam: Record<string, RaceEvent[]> = {};
    const ridersByTeam: Record<string, Rider[]> = {};
    for (const teamId of organization.teamIds) {
      const data = loadedOrgTeamData[teamId];
      eventsByTeam[teamId] =
        data?.events ||
        (teamId === activeTeamId ? raceEvents : []);
      ridersByTeam[teamId] =
        data?.riders ||
        (teamId === activeTeamId ? riders : []);
    }
    return findCrossTeamRiderConflicts(eventsByTeam, ridersByTeam);
  }, [organization.teamIds, loadedOrgTeamData, activeTeamId, raceEvents, riders]);

  const teamNameById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams]
  );

  const orgUpcomingEvents = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    const items: Array<{ teamName: string; event: RaceEvent; teamKind: string }> = [];
    for (const summary of kpis.teamSummaries) {
      const data = loadedOrgTeamData[summary.team.id];
      const events = data?.events || (summary.team.id === activeTeamId ? raceEvents : []);
      events
        .filter((e) => e.date >= now)
        .slice(0, 3)
        .forEach((event) => {
          items.push({
            teamName: summary.team.name,
            event,
            teamKind: summary.team.teamKind || 'standard',
          });
        });
    }
    return items.sort((a, b) => a.event.date.localeCompare(b.event.date)).slice(0, 8);
  }, [kpis.teamSummaries, loadedOrgTeamData, activeTeamId, raceEvents]);

  if (!canView) {
    return (
      <SectionWrapper title={t('orgDashboardTitle')}>
        <p className="text-sm text-gray-500">{t('orgDashboardNoAccess')}</p>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper
      title={t('orgDashboardTitle')}
      subtitle={organization.name}
      variant="dashboard"
      hideTitleOnMobile
    >
      <p className="mb-4 text-sm text-gray-500">{t('orgDashboardDesc')}</p>
      {loadingTeams && (
        <p className="mb-4 text-sm text-gray-400">{t('orgLoadingTeams')}</p>
      )}
      <div className="space-y-6">
        {(crossTeamConflicts.length > 0 || orgUpcomingEvents.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {crossTeamConflicts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-medium text-amber-900">{t('orgConflictsTitle')}</h3>
                <p className="mt-1 text-xs text-amber-700">{t('orgConflictsDesc')}</p>
                <ul className="mt-3 space-y-2 text-sm text-amber-900">
                  {crossTeamConflicts.slice(0, 6).map((c) => (
                    <li key={`${c.riderKey}-${c.date}`} className="rounded-md border border-amber-100 bg-white/70 px-3 py-2">
                      <p className="font-medium">{c.riderName}</p>
                      <p className="text-xs text-amber-800">
                        {c.date} · {c.teamIds.map((id) => teamNameById[id] || id).join(' + ')}
                      </p>
                      <p className="text-xs text-amber-700">{c.eventNames.join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {orgUpcomingEvents.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="font-medium text-gray-900">{t('orgCalendarTitle')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('orgCalendarDesc')}</p>
                <div className="mt-3 space-y-2">
                  {orgUpcomingEvents.map(({ teamName, event, teamKind }) => (
                    <div key={`${teamName}-${event.id}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{event.name}</p>
                        <p className="text-xs text-gray-500">{teamName} · {getTeamKindLabel(teamKind as any, language)}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-gray-600">{event.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard label={t('orgTeams')} value={kpis.totalTeams} />
          <KpiCard label={t('orgRiders')} value={kpis.totalRiders} />
          <KpiCard label={t('orgStaff')} value={kpis.totalStaff} />
          <KpiCard label={t('orgUpcomingEvents')} value={kpis.totalUpcomingEvents} />
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="font-medium text-emerald-900">{t('orgFinanceTitle')}</h3>
          <p className="mt-1 text-xs text-emerald-700">{t('orgFinanceDesc')}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FinanceKpi label={t('orgFinanceIncome')} value={formatEur(financialConsolidation.totalIncome)} />
            <FinanceKpi label={t('orgFinanceExpenses')} value={formatEur(financialConsolidation.totalExpenses)} />
            <FinanceKpi label={t('orgFinanceBalance')} value={formatEur(financialConsolidation.balance)} />
            <FinanceKpi label={t('orgFinanceSponsorship')} value={formatEur(financialConsolidation.totalSponsorship)} />
          </div>
          {financialConsolidation.byTeam.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-md border border-emerald-100 bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-emerald-50/80">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('orgTeamName')}</th>
                    <th className="px-3 py-2 text-right">{t('orgFinanceIncome')}</th>
                    <th className="px-3 py-2 text-right">{t('orgFinanceExpenses')}</th>
                    <th className="px-3 py-2 text-right">{t('orgFinanceBalance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {financialConsolidation.byTeam.map((row) => (
                    <tr key={row.teamId}>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row.teamName}
                        {row.teamKind && (
                          <span className="ml-1 text-gray-400">
                            · {getTeamKindLabel(row.teamKind as any, language)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{formatEur(row.totalIncome)}</td>
                      <td className="px-3 py-2 text-right">{formatEur(row.totalExpenses)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatEur(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="font-medium text-indigo-900">{t('orgStructure')}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(kpis.teamsByKind).map(([kind, count]) => (
              <span key={kind} className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-800">
                {getTeamKindLabel(kind as any, language)} · {count}
              </span>
            ))}
          </div>
        </div>

        {payrollConsolidation.totalMonthly > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-medium text-slate-900">{t('orgPayrollConsolidationTitle')}</h3>
            <p className="mt-1 text-xs text-slate-600">{t('orgPayrollConsolidationDesc')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white border border-slate-200 p-3 text-center">
                <p className="text-[10px] uppercase text-slate-500">{t('financialPayrollMonthlyTotal')}</p>
                <p className="text-lg font-bold text-slate-900">{formatEur(payrollConsolidation.totalMonthly)}</p>
              </div>
              <div className="rounded-md bg-white border border-slate-200 p-3 text-center">
                <p className="text-[10px] uppercase text-slate-500">{t('financialPayrollAnnualForecast')}</p>
                <p className="text-lg font-bold text-slate-900">{formatEur(payrollConsolidation.totalAnnual)}</p>
              </div>
              <div className="rounded-md bg-white border border-slate-200 p-3 text-center">
                <p className="text-[10px] uppercase text-slate-500">{t('financialPayrollExpiring')}</p>
                <p className={`text-lg font-bold ${payrollConsolidation.expiring > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {payrollConsolidation.expiring}
                </p>
              </div>
            </div>
            {payrollConsolidation.byTeam.length > 1 && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 pr-3">{t('orgTeamColumn')}</th>
                      <th className="py-1 pr-3 text-right">{t('financialPayrollMonthlyTotal')}</th>
                      <th className="py-1 text-right">{t('financialPayrollAnnualForecast')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollConsolidation.byTeam.map((row) => (
                      <tr key={row.teamId}>
                        <td className="py-1.5 pr-3 font-medium text-slate-800">{row.teamName}</td>
                        <td className="py-1.5 pr-3 text-right">{formatEur(row.monthly)}</td>
                        <td className="py-1.5 text-right">{formatEur(row.annual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {vehicles.length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-emerald-900">{t('orgFleetGpsTitle')}</h3>
                <p className="mt-1 text-xs text-emerald-700">{t('orgFleetGpsDesc')}</p>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('vehicles', 'gps')}
                  className="text-xs font-medium text-emerald-800 hover:underline"
                >
                  {t('orgFleetGpsOpen')}
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white border border-emerald-200 p-3 text-center">
                <p className="text-[10px] uppercase text-emerald-600">{t('fleetGpsOnline')}</p>
                <p className="text-lg font-bold text-emerald-900">{orgFleetGps.online}</p>
              </div>
              <div className="rounded-md bg-white border border-emerald-200 p-3 text-center">
                <p className="text-[10px] uppercase text-emerald-600">{t('orgFleetGpsTotal')}</p>
                <p className="text-lg font-bold text-emerald-900">{orgFleetGps.total}</p>
              </div>
              <div className="rounded-md bg-white border border-emerald-200 p-3 text-center">
                <p className="text-[10px] uppercase text-emerald-600">{t('orgFleetGpsWithPosition')}</p>
                <p className="text-lg font-bold text-emerald-900">{orgFleetGps.withPosition}</p>
              </div>
            </div>
            {wtTeams.length > 0 && (
              <p className="mt-2 text-[10px] text-emerald-700">{t('orgFleetGpsWtHint')}</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
          <h3 className="font-medium text-violet-900">{t('orgWtRefsTitle')}</h3>
          <p className="mt-1 text-xs text-violet-700">{t('orgWtRefsDesc')}</p>
          {wtTeams.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {wtTeams.map((s) => (
                <span key={s.team.id} className="rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-900">
                  {s.team.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {wtReferenceStatus.map((ref) => (
              <div
                key={ref.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  ref.matched ? 'border-emerald-200 bg-white text-emerald-900' : 'border-violet-100 bg-white/70 text-violet-800'
                }`}
              >
                <span>{ref.label}</span>
                <span className={`text-[10px] font-semibold uppercase ${ref.matched ? 'text-emerald-600' : 'text-violet-400'}`}>
                  {ref.matched ? t('orgWtRefMatched') : t('orgWtRefTarget')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <EnterpriseRoadmapPanel onNavigate={onNavigate} />

        <div className="grid gap-3 sm:hidden">
          {kpis.teamSummaries.map((s) => (
            <div key={s.team.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{s.team.name}</p>
                  <p className="text-xs text-gray-500">{getTeamKindLabel(s.team.teamKind || 'standard', language)}</p>
                </div>
                {onSelectTeam && (
                  <button
                    type="button"
                    onClick={() => onSelectTeam(s.team.id)}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {t('orgSwitchTeam')}
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-gray-50 p-2">
                  <p className="text-gray-500">{t('orgRiders')}</p>
                  <p className="font-semibold text-gray-900">{s.activeRiders}/{s.riderCount}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <p className="text-gray-500">{t('orgStaff')}</p>
                  <p className="font-semibold text-gray-900">{s.staffCount}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <p className="text-gray-500">{t('orgUpcomingEvents')}</p>
                  <p className="font-semibold text-gray-900">{s.upcomingEvents}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="table-container hidden rounded-lg border sm:block">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{t('orgTeamName')}</th>
                <th className="px-3 py-2 text-left">{t('orgTeamKind')}</th>
                <th className="px-3 py-2 text-right">{t('orgRiders')}</th>
                <th className="px-3 py-2 text-right">{t('orgStaff')}</th>
                <th className="px-3 py-2 text-right">{t('orgUpcomingEvents')}</th>
                <th className="px-3 py-2 text-right">{t('financialActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {kpis.teamSummaries.map((s) => (
                <tr key={s.team.id}>
                  <td className="px-3 py-2 font-medium">{s.team.name}</td>
                  <td className="px-3 py-2">{getTeamKindLabel(s.team.teamKind || 'standard', language)}</td>
                  <td className="px-3 py-2 text-right">{s.activeRiders}/{s.riderCount}</td>
                  <td className="px-3 py-2 text-right">{s.staffCount}</td>
                  <td className="px-3 py-2 text-right">{s.upcomingEvents}</td>
                  <td className="px-3 py-2 text-right">
                    {onSelectTeam && (
                      <button
                        type="button"
                        onClick={() => onSelectTeam(s.team.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {t('orgSwitchTeam')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionWrapper>
  );
};

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FinanceKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-emerald-100 bg-white p-3">
      <p className="text-[10px] uppercase text-emerald-600">{label}</p>
      <p className="text-lg font-bold text-emerald-900">{value}</p>
    </div>
  );
}

export default OrganizationDashboardSection;

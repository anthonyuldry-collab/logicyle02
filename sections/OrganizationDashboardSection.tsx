import React, { useMemo } from 'react';
import { AppSection, Organization, Team, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import EnterpriseRoadmapPanel from '../components/EnterpriseRoadmapPanel';
import { useTranslations } from '../hooks/useTranslations';
import { canViewOrgDashboard, getTeamKindLabel } from '../utils/organizationUtils';
import {
  countIndependentPortfolio,
  countSubscriptionsByStatus,
  estimatePortfolioMrr,
  planLabelFr,
  teamsNeedingAttention,
} from '../utils/holdingCeoDashboardUtils';

interface OrganizationDashboardSectionProps {
  organization: Organization;
  teams: Team[];
  currentUser: User;
  isHoldingSuperAdmin?: boolean;
  onNavigate?: (section: AppSection, tabHint?: string) => void;
  users?: User[];
}

const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  trialing: 'Essai',
  pilot: 'Pilote',
  past_due: 'Impayé',
  canceled: 'Annulé',
  none: 'Sans abo',
};

const formatEur = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const OrganizationDashboardSection: React.FC<OrganizationDashboardSectionProps> = ({
  organization,
  teams,
  currentUser,
  isHoldingSuperAdmin = false,
  onNavigate,
  users = [],
}) => {
  const { t, language } = useTranslations();

  const canView = canViewOrgDashboard({ isHoldingSuperAdmin });

  const orgTeams = useMemo(
    () => teams.filter((t) => organization.teamIds.includes(t.id)),
    [teams, organization.teamIds]
  );

  const teamsByKind = useMemo(() => {
    return orgTeams.reduce<Record<string, number>>((acc, team) => {
      const kind = team.teamKind || 'standard';
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    }, {});
  }, [orgTeams]);

  const portfolioMrr = useMemo(() => estimatePortfolioMrr(orgTeams, users), [orgTeams, users]);
  const subCounts = useMemo(() => countSubscriptionsByStatus(orgTeams), [orgTeams]);
  const independents = useMemo(() => countIndependentPortfolio(users), [users]);
  const attentionTeams = useMemo(() => teamsNeedingAttention(orgTeams), [orgTeams]);
  const liveSubscriptions =
    subCounts.active + subCounts.trialing + subCounts.pilot + subCounts.past_due;

  const sortedTeams = useMemo(
    () =>
      [...orgTeams].sort((a, b) => (a.name || a.id || '').localeCompare(b.name || b.id || '', 'fr')),
    [orgTeams]
  );

  const todayLabel = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!canView) {
    return (
      <SectionWrapper title={t('orgDashboardTitle')}>
        <p className="text-sm text-slate-400">{t('orgDashboardNoAccess')}</p>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper
      title={t('orgDashboardTitle')}
      subtitle={t('orgCeoPlatformSubtitle')}
      variant="dashboard"
      hideTitleOnMobile
    >
      <div className="space-y-6">
        <header className="rounded-xl border border-slate-600 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
                {t('orgCeoBadge')}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
                {t('orgDashboardTitle')}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">{t('orgDashboardDesc')}</p>
              <p className="mt-2 text-xs capitalize text-slate-500">
                {todayLabel}
                {currentUser.firstName ? ` · ${currentUser.firstName}` : ''}
                {' · '}
                {t('orgCeoNoTeamHint')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onNavigate && (
                <>
                  <QuickNavButton label={t('orgCeoNavSuperAdmin')} onClick={() => onNavigate('superAdmin')} />
                  <QuickNavButton label={t('orgCeoNavPricing')} onClick={() => onNavigate('pricing')} />
                </>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CeoKpi
            label={t('orgCeoKpiTeams')}
            value={String(orgTeams.length)}
            hint={`${liveSubscriptions} ${t('orgCeoKpiWithSub')}`}
          />
          <CeoKpi
            label={t('orgCeoKpiMrr')}
            value={formatEur(portfolioMrr)}
            hint={t('orgCeoKpiMrrHint')}
            accent="emerald"
          />
          <CeoKpi
            label={t('orgCeoKpiIndependents')}
            value={String(independents.athletes + independents.staff)}
            hint={`${independents.athletes} athl. · ${independents.staff} staff`}
            accent="sky"
          />
          <CeoKpi
            label={t('orgCeoKpiAttention')}
            value={String(attentionTeams.length)}
            hint={t('orgCeoKpiAttentionHint')}
            accent={attentionTeams.length > 0 ? 'amber' : 'default'}
          />
        </div>

        <section className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
          <h3 className="text-sm font-semibold text-emerald-100">{t('orgCeoMrrTitle')}</h3>
          <p className="mt-1 text-sm text-emerald-50/90">{formatEur(portfolioMrr)}</p>
          <p className="mt-2 text-xs leading-relaxed text-emerald-200/75">{t('orgCeoMrrExplain')}</p>
        </section>

        {attentionTeams.length > 0 && (
          <section className="rounded-xl border border-amber-700/40 bg-amber-950/25 p-4">
            <h3 className="text-sm font-semibold text-amber-100">{t('orgCeoAlertsTitle')}</h3>
            <p className="mt-1 text-xs text-amber-200/80">{t('orgCeoAlertsDesc')}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {attentionTeams.slice(0, 8).map((team) => {
                const status = team.subscription?.status || 'none';
                return (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-800/40 bg-slate-950/40 px-3 py-2 text-amber-50"
                  >
                    <span className="font-medium">{team.name || team.id}</span>
                    <span className="text-xs text-amber-200/90">
                      {planLabelFr(team.subscription?.planId)} · {SUB_STATUS_LABEL[status] || status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-600 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-slate-100">{t('orgCeoPortfolioTitle')}</h3>
            <p className="mt-1 text-xs text-slate-400">{t('orgCeoPortfolioDesc')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(['active', 'trialing', 'pilot', 'past_due', 'canceled', 'none'] as const).map((key) => (
                <div key={key} className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{SUB_STATUS_LABEL[key]}</p>
                  <p
                    className={`text-lg font-semibold tabular-nums ${
                      key === 'past_due' ? 'text-amber-300' : 'text-slate-100'
                    }`}
                  >
                    {subCounts[key]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-600 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-slate-100">{t('orgCeoIndepTitle')}</h3>
            <p className="mt-1 text-xs text-slate-400">{t('orgCeoIndepDesc')}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniStat
                label={t('orgCeoIndepAthletes')}
                value={independents.athletes}
                sub={`${independents.searchableAthletes} ${t('orgCeoIndepSearchable')}`}
              />
              <MiniStat
                label={t('orgCeoIndepStaff')}
                value={independents.staff}
                sub={`${independents.openStaff} ${t('orgCeoIndepOpen')}`}
              />
            </div>
            {Object.keys(teamsByKind).length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-slate-100">{t('orgCeoMixTitle')}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(teamsByKind).map(([kind, count]) => (
                    <span
                      key={kind}
                      className="rounded-md border border-slate-600 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-300"
                    >
                      {getTeamKindLabel(kind, language)} · {count}
                    </span>
                  ))}
                </div>
              </>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('superAdmin')}
                className="mt-4 text-xs font-medium text-sky-300 hover:underline"
              >
                {t('orgCeoIndepOpenAdmin')}
              </button>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-slate-600 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold text-slate-100">{t('orgCeoTeamsTableTitle')}</h3>
          <p className="mt-1 text-xs text-slate-400">{t('orgCeoTeamsTableDesc')}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">{t('orgTeamName')}</th>
                  <th className="px-3 py-2">{t('orgTeamKind')}</th>
                  <th className="px-3 py-2">{t('orgCeoColPlan')}</th>
                  <th className="px-3 py-2">{t('orgCeoColStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedTeams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      {t('orgCeoNoTeams')}
                    </td>
                  </tr>
                ) : (
                  sortedTeams.map((team) => (
                    <tr key={team.id}>
                      <td className="px-3 py-2 font-medium text-slate-100">{team.name || team.id}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {getTeamKindLabel(team.teamKind || 'standard', language)}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{planLabelFr(team.subscription?.planId)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {SUB_STATUS_LABEL[team.subscription?.status || 'none'] ||
                          team.subscription?.status ||
                          '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-600 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">{t('orgCeoDevTitle')}</h3>
          <p className="mb-4 text-xs text-slate-400">{t('orgCeoDevDesc')}</p>
          <EnterpriseRoadmapPanel onNavigate={onNavigate} />
        </section>
      </div>
    </SectionWrapper>
  );
};

function CeoKpi({
  label,
  value,
  hint,
  accent = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'default' | 'emerald' | 'sky' | 'amber';
}) {
  const valueClass =
    accent === 'emerald'
      ? 'text-emerald-300'
      : accent === 'sky'
        ? 'text-sky-300'
        : accent === 'amber'
          ? 'text-amber-300'
          : 'text-slate-50';
  return (
    <div className="rounded-xl border border-slate-600 bg-slate-900/80 p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function QuickNavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

export default OrganizationDashboardSection;

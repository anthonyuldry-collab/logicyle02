import React, { useMemo, useState } from 'react';
import { Rider } from '../types';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  computeProjectPilotageStats,
  DOMAIN_META,
  riderDomainCoverage,
  riderHasProjectContent,
} from '../utils/performancePilotageUtils';
import {
  getAllRiderActionItems,
  isActionOverdue,
} from '../utils/performanceProjectUtils';

interface PerformanceOverviewEnhancedProps {
  riders: Rider[];
  onRiderSelect?: (rider: Rider) => void;
  onGoToSynergies?: () => void;
  onGoToDetails?: () => void;
}

const BarRow: React.FC<{
  label: string;
  value: number;
  max: number;
  colorClass: string;
  suffix?: string;
}> = ({ label, value, max, colorClass, suffix = '' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="tabular-nums">
          {value}
          {suffix} · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const PerformanceOverviewEnhanced: React.FC<PerformanceOverviewEnhancedProps> = ({
  riders,
  onRiderSelect,
  onGoToSynergies,
  onGoToDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const stats = useMemo(() => computeProjectPilotageStats(riders), [riders]);

  const filteredRiders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return riders.filter((rider) => {
      if (!q) return true;
      return (
        `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(q) ||
        (rider.performanceGoals || '').toLowerCase().includes(q) ||
        (rider.qualitativeProfile || '').toLowerCase().includes(q)
      );
    });
  }, [riders, searchTerm]);

  const actionMax = Math.max(
    stats.actionTotals.planned,
    stats.actionTotals.in_progress,
    stats.actionTotals.done,
    1
  );
  const profileMax = Math.max(...stats.profileDistribution.map((p) => p.count), 1);
  const themeMax = Math.max(...stats.topThemes.map((t) => t.count), 1);

  return (
    <div className="space-y-4">
      {/* KPI cockpit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Couverture projets</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1 tabular-nums">{stats.contentCoveragePct}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.withContent}/{stats.riderCount} athlètes renseignés
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Objectifs</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{stats.withGoals}</p>
          <p className="text-xs text-gray-500 mt-1">athlètes avec objectifs saison</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Actions ouvertes</p>
          <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{stats.openActions}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.actionTotals.in_progress} en cours · {stats.actionTotals.planned} planifiées
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">En retard</p>
          <p className={`text-2xl font-bold mt-1 tabular-nums ${stats.overdueActions ? 'text-rose-700' : 'text-gray-800'}`}>
            {stats.overdueActions}
          </p>
          <p className="text-xs text-gray-500 mt-1">actions échéance dépassée</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Pipeline d&apos;actions</h3>
            {onGoToDetails && (
              <button type="button" onClick={onGoToDetails} className="text-xs font-medium text-blue-600 hover:underline">
                Voir détails
              </button>
            )}
          </div>
          <BarRow label="Planifiées" value={stats.actionTotals.planned} max={actionMax} colorClass="bg-blue-500" />
          <BarRow label="En cours" value={stats.actionTotals.in_progress} max={actionMax} colorClass="bg-amber-500" />
          <BarRow label="Terminées" value={stats.actionTotals.done} max={actionMax} colorClass="bg-emerald-500" />
          <BarRow label="Annulées" value={stats.actionTotals.cancelled} max={actionMax} colorClass="bg-gray-400" />
        </div>

        {/* Couverture domaines */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Couverture par domaine</h3>
          {stats.domainCoverage.map((d) => (
            <BarRow
              key={d.label}
              label={d.label}
              value={d.filled}
              max={stats.riderCount || 1}
              colorClass="bg-indigo-500"
              suffix={`/${stats.riderCount}`}
            />
          ))}
        </div>

        {/* Profils + thèmes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Profils qualitatifs</h3>
            </div>
            <div className="space-y-2">
              {stats.profileDistribution.slice(0, 6).map((p) => (
                <BarRow
                  key={p.profile}
                  label={p.profile}
                  value={p.count}
                  max={profileMax}
                  colorClass="bg-violet-500"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Thèmes transverses</h3>
              {onGoToSynergies && (
                <button type="button" onClick={onGoToSynergies} className="text-xs font-medium text-blue-600 hover:underline">
                  Synergies
                </button>
              )}
            </div>
            {stats.topThemes.length === 0 ? (
              <p className="text-xs text-gray-500">Pas encore assez de contenu projet pour détecter des thèmes.</p>
            ) : (
              <div className="space-y-2">
                {stats.topThemes.map((t) => (
                  <BarRow
                    key={t.theme}
                    label={t.theme}
                    value={t.count}
                    max={themeMax}
                    colorClass="bg-sky-500"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mots-clés équipe */}
      {stats.topKeywords.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Mots-clés récurrents (équipe)</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topKeywords.map((k) => (
              <span
                key={k.keyword}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {k.keyword}
                <span className="tabular-nums text-slate-500">{k.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attention */}
      {stats.ridersNeedingAttention.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">À piloter en priorité</h3>
              <p className="text-xs text-amber-800">
                Projets incomplets, sans objectifs, ou actions en retard.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.ridersNeedingAttention.map((rider) => {
              const overdue = getAllRiderActionItems(rider).filter(isActionOverdue).length;
              return (
                <button
                  key={rider.id}
                  type="button"
                  onClick={() => onRiderSelect?.(rider)}
                  className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-left text-sm hover:border-amber-400"
                >
                  <span className="font-medium text-gray-900">
                    {rider.firstName} {rider.lastName}
                  </span>
                  <span className="ml-2 text-xs text-amber-700">
                    {!riderHasProjectContent(rider)
                      ? 'projet vide'
                      : overdue > 0
                        ? `${overdue} retard`
                        : 'à compléter'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Heatmap domaines + liste */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Effectif — complétude des domaines</h3>
            <p className="text-xs text-gray-500">{filteredRiders.length} athlète(s)</p>
          </div>
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un athlète…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 sticky left-0 bg-gray-50">Athlète</th>
                {DOMAIN_META.map((d) => (
                  <th key={d.label} className="px-2 py-2 text-center font-medium">
                    {d.label.slice(0, 3)}
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Actions</th>
                <th className="px-3 py-2 text-left">Profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRiders.map((rider) => {
                const coverage = riderDomainCoverage(rider);
                const actions = getAllRiderActionItems(rider);
                const open = actions.filter((a) => a.status === 'planned' || a.status === 'in_progress').length;
                const overdue = actions.filter(isActionOverdue).length;
                return (
                  <tr
                    key={rider.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => onRiderSelect?.(rider)}
                  >
                    <td className="px-4 py-2 sticky left-0 bg-white font-medium text-gray-900 whitespace-nowrap">
                      {rider.firstName} {rider.lastName}
                    </td>
                    {DOMAIN_META.map((d) => (
                      <td key={d.label} className="px-2 py-2 text-center">
                        <span
                          className={`inline-block h-3 w-3 rounded ${
                            coverage[d.label] ? 'bg-emerald-500' : 'bg-gray-200'
                          }`}
                          title={coverage[d.label] ? `${d.label} renseigné` : `${d.label} vide`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center tabular-nums">
                      <span className={overdue ? 'text-rose-600 font-semibold' : 'text-gray-700'}>
                        {open}
                        {overdue > 0 ? ` · ${overdue}⚠` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{rider.qualitativeProfile || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRiders.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <UserGroupIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            Aucun athlète trouvé
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceOverviewEnhanced;

import React, { useMemo, useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import {
  CEO_ARR_TARGETS_M1_M24,
  CEO_PRELAUNCH_CHECKLIST,
  CHECKLIST_CATEGORY_LABEL,
  CHECKLIST_PHASE_LABEL,
  CeoChecklistPhase,
  getCurrentProjectionMonth,
  getTargetForMonth,
  loadChecklistDone,
  saveChecklistDone,
} from '../data/ceoLaunchPlan';

type TabId = 'checklist' | 'arr';

const formatEur = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

interface CeoLaunchPlanPanelProps {
  /** MRR réel portefeuille (équipes + indép.) pour comparer à l’objectif. */
  actualMrr?: number;
}

const PHASES: CeoChecklistPhase[] = ['sept', 'oct', 'nov', 'ongoing'];

const CeoLaunchPlanPanel: React.FC<CeoLaunchPlanPanelProps> = ({ actualMrr = 0 }) => {
  const { language } = useTranslations();
  const isFr = language !== 'en';
  const [tab, setTab] = useState<TabId>('checklist');
  const [done, setDone] = useState<Record<string, boolean>>(() => loadChecklistDone());

  const projectionMonth = getCurrentProjectionMonth();
  const currentTarget = getTargetForMonth(
    projectionMonth > 0 ? Math.min(projectionMonth, 24) : 1
  );
  const actualArr = actualMrr * 12;

  const progress = useMemo(() => {
    const total = CEO_PRELAUNCH_CHECKLIST.length;
    const checked = CEO_PRELAUNCH_CHECKLIST.filter((item) => done[item.id]).length;
    return { total, checked, pct: total ? Math.round((checked / total) * 100) : 0 };
  }, [done]);

  const toggleItem = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecklistDone(next);
      return next;
    });
  };

  const highlightMonths = new Set([1, 6, 8, 12, 16, 18, 19, 24]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            {isFr ? 'Plan PDG — pré-lancement & objectifs ARR' : 'CEO plan — pre-launch & ARR targets'}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isFr
              ? 'Checklist J-90 (sept.–nov. 2026) · Dual-Track M1–M24 · scénario Leader.'
              : 'D-90 checklist (Sep–Nov 2026) · Dual-Track M1–M24 · Leader scenario.'}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-600 bg-slate-950/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('checklist')}
            className={`rounded-md px-3 py-1.5 font-medium ${
              tab === 'checklist' ? 'bg-emerald-700/80 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFr ? `Checklist (${progress.pct} %)` : `Checklist (${progress.pct}%)`}
          </button>
          <button
            type="button"
            onClick={() => setTab('arr')}
            className={`rounded-md px-3 py-1.5 font-medium ${
              tab === 'arr' ? 'bg-sky-700/80 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFr ? 'Objectifs ARR M1–M24' : 'ARR targets M1–M24'}
          </button>
        </div>
      </div>

      {tab === 'checklist' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {isFr
                  ? `${progress.checked} / ${progress.total} actions cochées`
                  : `${progress.checked} / ${progress.total} items done`}
              </span>
              <span className="font-semibold tabular-nums text-emerald-300">{progress.pct} %</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>

          {PHASES.map((phase) => {
            const items = CEO_PRELAUNCH_CHECKLIST.filter((i) => i.phase === phase);
            if (!items.length) return null;
            return (
              <section key={phase} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {CHECKLIST_PHASE_LABEL[phase][isFr ? 'fr' : 'en']}
                </h4>
                <ul className="mt-2 space-y-2">
                  {items.map((item) => {
                    const checked = Boolean(done[item.id]);
                    const cat = CHECKLIST_CATEGORY_LABEL[item.category][isFr ? 'fr' : 'en'];
                    return (
                      <li key={item.id}>
                        <label
                          className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition ${
                            checked
                              ? 'border-emerald-800/50 bg-emerald-950/30'
                              : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  checked ? 'text-slate-400 line-through' : 'text-slate-100'
                                }`}
                              >
                                {isFr ? item.titleFr : item.titleEn}
                              </span>
                              <span className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                                {cat}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  item.priority === 'P0'
                                    ? 'bg-rose-950/60 text-rose-300'
                                    : item.priority === 'P1'
                                      ? 'bg-amber-950/50 text-amber-200'
                                      : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {isFr ? item.detailFr : item.detailEn}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'arr' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                {isFr ? 'ARR réel (estimé)' : 'Actual ARR (est.)'}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
                {formatEur(actualArr)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {isFr ? `MRR × 12 = ${formatEur(actualMrr)} × 12` : `MRR × 12 = ${formatEur(actualMrr)} × 12`}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                {projectionMonth <= 0
                  ? isFr
                    ? 'Cible M1 (go-live)'
                    : 'M1 target (go-live)'
                  : isFr
                    ? `Cible M${Math.min(projectionMonth, 24)}`
                    : `M${Math.min(projectionMonth, 24)} target`}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-sky-300">
                {formatEur(currentTarget?.arr ?? 0)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {currentTarget
                  ? `${currentTarget.dateLabel} · ${currentTarget.teams} ${isFr ? 'équipes' : 'teams'} · ${currentTarget.independents} ${isFr ? 'indép.' : 'ind.'}`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                {isFr ? 'Écart vs cible' : 'Gap vs target'}
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  actualArr >= (currentTarget?.arr ?? 0) ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {formatEur(actualArr - (currentTarget?.arr ?? 0))}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {projectionMonth <= 0
                  ? isFr
                    ? 'Avant lancement (déc. 2026) — comparaison indicative vs M1'
                    : 'Pre-launch (Dec 2026) — indicative vs M1'
                  : isFr
                    ? 'Scénario Dual-Track (référence)'
                    : 'Dual-Track scenario (baseline)'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-950/80 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Mois</th>
                  <th className="px-3 py-2">{isFr ? 'Date' : 'Date'}</th>
                  <th className="px-3 py-2 text-right">{isFr ? 'Équipes' : 'Teams'}</th>
                  <th className="px-3 py-2 text-right">{isFr ? 'Indép.' : 'Ind.'}</th>
                  <th className="px-3 py-2 text-right">MRR</th>
                  <th className="px-3 py-2 text-right">ARR</th>
                  <th className="px-3 py-2">{isFr ? 'Jalon' : 'Milestone'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {CEO_ARR_TARGETS_M1_M24.map((row) => {
                  const isHighlight = highlightMonths.has(row.month);
                  const isCurrent =
                    projectionMonth > 0 && row.month === Math.min(projectionMonth, 24);
                  return (
                    <tr
                      key={row.month}
                      className={
                        isCurrent
                          ? 'bg-sky-950/40'
                          : isHighlight
                            ? 'bg-slate-900/80'
                            : 'bg-slate-900/30'
                      }
                    >
                      <td className="px-3 py-1.5 font-medium tabular-nums text-slate-200">
                        M{row.month}
                        {isCurrent && (
                          <span className="ml-1 text-[10px] font-normal text-sky-400">
                            {isFr ? 'actuel' : 'now'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400">{row.dateLabel}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">{row.teams}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                        {row.independents}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                        {formatEur(row.mrr)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-emerald-200/90">
                        {formatEur(row.arr)}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-500">
                        {(isFr ? row.milestoneFr : row.milestoneEn) || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            {isFr
              ? 'Source : projections Dual-Track (leaderGlobal). Après M24 : Seed + portail organisateur Solo · triathlon pas avant M36. Les montants sont des objectifs de pilotage, pas un engagement contractuel.'
              : 'Source: Dual-Track projections (leaderGlobal). After M24: Seed + organizer Solo portal · triathlon not before M36. Targets for steering only, not contractual.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CeoLaunchPlanPanel;

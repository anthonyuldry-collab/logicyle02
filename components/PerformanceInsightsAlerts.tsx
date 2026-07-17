import React, { useMemo, useState } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { Rider, ScoutingProfile } from '../types';
import {
  getPerformanceInsights,
  getPerformanceAlerts,
  POWER_DURATION_KEYS,
  type PerformanceInsight,
  type PerformanceAlert,
  type PowerDurationKey,
} from '../utils/performanceInsights';
import Modal from './Modal';

interface PerformanceInsightsAlertsProps {
  riders: Rider[];
  scoutingProfiles?: ScoutingProfile[];
  maxAlerts?: number;
  maxInsights?: number;
  showInsights?: boolean;
  showAlerts?: boolean;
}

const FATIGUE_LABELS: Record<'15kj' | '30kj' | '45kj', string> = {
  '15kj': '15',
  '30kj': '30',
  '45kj': '45',
};

/** Parse "17.7 W/kg" or "5.4 W/kg" → number */
function parseValueLabel(label: string | undefined): number | null {
  if (!label) return null;
  const m = label.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

interface PowerPoint {
  durationKey: PowerDurationKey;
  label: string;
  athlete: number;
  team: number;
  isAboveTeam: boolean;
  percentDiff: number;
}

/** Construit la série puissance athlète vs équipe à partir des alertes et insights (toutes durées pour lesquelles on a des données) */
function buildPowerSeries(
  alerts: PerformanceAlert[],
  insights: PerformanceInsight[]
): PowerPoint[] {
  const byDuration = new Map<PowerDurationKey, { athlete: number; team: number; percent: number }>();
  const add = (dk: PowerDurationKey | undefined, athleteVal: number | null, teamVal: number | undefined, percent: number) => {
    if (!dk || teamVal == null || teamVal <= 0) return;
    const athlete = athleteVal ?? (percent >= 0 ? teamVal * (1 + percent / 100) : teamVal * (1 - Math.abs(percent) / 100));
    const existing = byDuration.get(dk);
    if (!existing || Math.abs(percent) > Math.abs(existing.percent))
      byDuration.set(dk, { athlete, team: teamVal, percent });
  };
  for (const a of alerts) {
    if (a.durationKey && (a.teamRefValue != null || a.valueLabel)) {
      const team = a.teamRefValue ?? 0;
      const athleteVal = parseValueLabel(a.valueLabel);
      const pct = a.percentVsTeam ?? (a.percentRegressionVsFresh != null ? -Math.abs(a.percentRegressionVsFresh) : 0);
      add(a.durationKey, athleteVal, team, pct);
    }
  }
  for (const i of insights) {
    if (i.durationKey && i.teamRefValue != null) {
      const team = i.teamRefValue;
      const athleteVal = parseValueLabel(i.valueLabel);
      const pct = i.percentAboveRef ?? (i.percentBelowRef != null ? -i.percentBelowRef : 0);
      add(i.durationKey, athleteVal, team, pct);
    }
  }
  // Afficher toutes les durées pour lesquelles on a des données, dans l'ordre standard
  return POWER_DURATION_KEYS.filter(dk => byDuration.has(dk)).map(dk => {
    const v = byDuration.get(dk)!;
    return {
      durationKey: dk,
      label: dk === 'cp' ? 'CP' : dk,
      athlete: v.athlete,
      team: v.team,
      isAboveTeam: v.percent >= 0,
      percentDiff: v.percent,
    };
  });
}

const INSIGHT_STRENGTH_TYPES = new Set(['above_team_avg', 'scout_match', 'above_category_avg', 'fatigue_resistance', 'profile_highlight']);
function isStrength(i: PerformanceInsight): boolean {
  return INSIGHT_STRENGTH_TYPES.has(i.type);
}

/** Synthèse type entraîneur expert à partir des alertes et insights */
function buildExpertAnalysis(
  subjectName: string,
  alerts: PerformanceAlert[],
  insights: PerformanceInsight[]
): { summary: string; profile: string; axes: string[]; recommandations: string[] } {
  const pointsForts = insights.filter(isStrength);
  const pointsFaibles = insights.filter(i => !isStrength);
  const aboveDurations = [...alerts.filter(a => a.type === 'above_team_avg'), ...pointsForts.filter(i => i.type === 'above_team_avg')]
    .map(x => x.durationKey)
    .filter((d): d is PowerDurationKey => !!d);
  const belowDurations = [...alerts.filter(a => a.type === 'below_team_avg'), ...pointsFaibles.filter(i => i.type === 'below_team_avg')]
    .map(x => x.durationKey)
    .filter((d): d is PowerDurationKey => !!d);
  const fatigueRegression = [...alerts, ...insights].filter(x => x.type === 'fatigue_regression' || (x as PerformanceAlert).type === 'fatigue_regression');
  const fatigueResistance = insights.filter(i => i.type === 'fatigue_resistance');
  const hasPeak = aboveDurations.some(d => d === '1s' || d === '5s' || d === '30s');
  const hasEnduranceGap = belowDurations.some(d => ['3min', '5min', '12min', '20min', 'cp'].includes(d));
  const regressionPct = fatigueRegression.length > 0
    ? Math.max(...fatigueRegression.map(x => Math.abs((x as PerformanceAlert).percentRegressionVsFresh ?? (x as PerformanceInsight).percentRegressionVsFresh ?? 0)))
    : 0;

  let profile = 'Profil équilibré';
  if (hasPeak && hasEnduranceGap && regressionPct >= 15) {
    profile = 'Profil explosif / pointe : très bon sur les efforts courts, à renforcer en endurance et en résistance à la fatigue.';
  } else if (hasPeak && hasEnduranceGap) {
    profile = 'Profil pointe : forces sur les efforts courts, lacunes sur les efforts soutenus (3–20 min).';
  } else if (hasEnduranceGap && regressionPct >= 15) {
    profile = 'Profil à travailler : endurance soutenue et résistance à la fatigue en deçà de la moyenne équipe.';
  } else if (hasPeak) {
    profile = 'Points forts sur les efforts courts ; à consolider sur les durées intermédiaires et longues.';
  } else if (belowDurations.length > 0) {
    profile = 'Écarts à l’équipe sur plusieurs durées ; prioriser les blocs où l’écart est le plus marqué.';
  } else if (fatigueResistance.length > 0) {
    profile = 'Bonne résistance à la fatigue sur au moins un niveau de charge ; à maintenir et généraliser.';
  }

  const axes: string[] = [];
  if (aboveDurations.length > 0) {
    const d = [...new Set(aboveDurations)].join(', ');
    axes.push(`Points forts : ${d} (au-dessus de la moyenne équipe).`);
  }
  if (belowDurations.length > 0) {
    const d = [...new Set(belowDurations)].join(', ');
    axes.push(`Axes de progression : ${d} (en dessous de la moyenne équipe).`);
  }
  if (fatigueRegression.length > 0) {
    const levels = fatigueRegression.map(f => (f as PerformanceAlert).fatigueLevel ?? (f as PerformanceInsight).fatigueLevel).filter(Boolean);
    axes.push(`Régression sous fatigue : baisse notable après charge (${[...new Set(levels)].map(l => FATIGUE_LABELS[l as keyof typeof FATIGUE_LABELS]).join(', ')}).`);
  }
  if (fatigueResistance.length > 0) {
    axes.push('Résistance à la fatigue : maintenue sur au moins un profil de charge.');
  }

  const recommandations: string[] = [];
  if (hasEnduranceGap) {
    recommandations.push('Renforcer les blocs en zone endurance (seuils 3–20 min, travail au CP) et la régularité des charges.');
  }
  if (regressionPct >= 15) {
    recommandations.push('Travailler spécifiquement la résistance à la fatigue (répétitions après charge, PPR fatigue 15/30/45 kJ/kg) et la récupération entre efforts.');
  }
  if (hasPeak && hasEnduranceGap) {
    recommandations.push('Exploiter la pointe en compétition (sprints, attaques courtes) tout en construisant la base endurance pour tenir la durée.');
  }
  if (pointsFaibles.length > 0 && recommandations.length === 0) {
    recommandations.push('Cibler les durées où l’écart à l’équipe est le plus important ; revoir la charge d’entraînement et la répartition des intensités.');
  }
  if (recommandations.length === 0 && (alerts.length > 0 || insights.length > 0)) {
    recommandations.push('Consolider les points forts et surveiller l’évolution des indicateurs au fil des cycles.');
  }

  const summary = `${subjectName} : ${profile} ${axes.length > 0 ? ' ' + axes.join(' ') : ''}`.trim();
  return { summary, profile, axes, recommandations };
}

function ExpertAnalysisSection({
  subjectName,
  alerts,
  insights,
}: {
  subjectName: string;
  alerts: PerformanceAlert[];
  insights: PerformanceInsight[];
}) {
  const { profile, axes, recommandations } = buildExpertAnalysis(subjectName, alerts, insights);
  if (alerts.length === 0 && insights.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-slate-900 p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-amber-400" />
        Analyse
      </h4>
      <p className="text-sm text-slate-200 mb-3 leading-relaxed">{profile}</p>
      {axes.length > 0 && (
        <ul className="list-disc list-inside text-sm text-slate-300 mb-3 space-y-1">
          {axes.map((axe, i) => (
            <li key={i}>{axe}</li>
          ))}
        </ul>
      )}
      {recommandations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Recommandations</p>
          <ul className="list-none space-y-1.5">
            {recommandations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-200">
                <span className="text-amber-400 font-bold">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PowerHistogram({
  series,
  subjectName,
}: {
  series: PowerPoint[];
  subjectName: string;
}) {
  if (series.length === 0) return null;
  const maxVal = Math.max(...series.flatMap(s => [s.athlete, s.team])) * 1.15 || 1;
  return (
    <div className="rounded-xl border border-white/15 bg-slate-900 p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-sky-400" />
        Profil puissance · {subjectName} vs moyenne équipe (W/kg)
      </h4>
      <div className="space-y-3">
        {series.map((s) => {
          const teamWidth = `${(s.team / maxVal) * 100}%`;
          const athleteWidth = `${(s.athlete / maxVal) * 100}%`;
          return (
            <div key={s.durationKey} className="flex items-center gap-2">
              <div className="w-14 shrink-0 text-xs font-medium text-slate-300">{s.label}</div>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <div
                  className="relative h-8 flex-1 min-w-0 rounded-md bg-slate-950/80 ring-1 ring-white/10 overflow-hidden"
                  title={`Moy. équipe ${s.team.toFixed(1)} W/kg · ${subjectName} ${s.athlete.toFixed(1)} W/kg`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-500/45"
                    style={{ width: teamWidth, minWidth: s.team > 0 ? '2px' : 0 }}
                  />
                  <div
                    className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r shadow-sm ${
                      s.isAboveTeam ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: athleteWidth, minWidth: s.athlete > 0 ? '2px' : 0 }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-white/30"
                    style={{ left: teamWidth }}
                  />
                  {(s.athlete / maxVal) * 100 >= 18 && (
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-white drop-shadow-sm pointer-events-none ${
                        (s.athlete / maxVal) * 100 >= 28 ? 'left-2' : 'left-1'
                      }`}
                    >
                      {s.athlete.toFixed(1)}
                    </span>
                  )}
                  {(s.team / maxVal) * 100 >= 22 && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-full pr-1 text-[10px] font-medium tabular-nums text-slate-200 drop-shadow-sm pointer-events-none"
                      style={{ left: teamWidth }}
                    >
                      {s.team.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="w-[5.5rem] shrink-0 text-right leading-tight">
                  <p className="text-[11px] tabular-nums text-slate-100">
                    <span className={s.isAboveTeam ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                      {s.athlete.toFixed(1)}
                    </span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-slate-400">{s.team.toFixed(1)}</span>
                    <span className="text-slate-500"> W/kg</span>
                  </p>
                  <p
                    className={`text-[11px] font-semibold tabular-nums ${
                      s.isAboveTeam ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {s.percentDiff >= 0 ? '+' : ''}{s.percentDiff}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-slate-500/70" /> Moy. équipe (fond)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500" /> Au-dessus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-amber-500" /> En dessous
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border border-white/15 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-800">
              <th className="text-left py-2 px-3 font-semibold text-slate-200">Durée</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-200">Athlète (W/kg)</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-200">Moy. équipe</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-200">Écart</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.durationKey} className="border-t border-white/10 even:bg-slate-800/40">
                <td className="py-2 px-3 font-medium text-slate-100">{s.label}</td>
                <td className="py-2 px-3 text-right font-medium text-white">{s.athlete.toFixed(1)}</td>
                <td className="py-2 px-3 text-right text-slate-300">{s.team.toFixed(1)}</td>
                <td className={`py-2 px-3 text-right font-semibold ${s.isAboveTeam ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {s.percentDiff >= 0 ? '+' : ''}{s.percentDiff}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PerformanceInsightsAlerts: React.FC<PerformanceInsightsAlertsProps> = ({
  riders,
  scoutingProfiles = [],
  maxAlerts = 5,
  maxInsights = 8,
  showInsights = true,
  showAlerts = true,
}) => {
  const [vigilanceExpanded, setVigilanceExpanded] = useState(false);
  const [vigilanceFilter, setVigilanceFilter] = useState<'all' | 'risk' | 'strength'>('all');
  const [detailSubject, setDetailSubject] = useState<{
    name: string;
    type: 'rider' | 'scout';
    alerts: PerformanceAlert[];
    insights: PerformanceInsight[];
  } | null>(null);

  const { mergedSubjects, hasAny, summaryCounts } = useMemo(() => {
    const ins = getPerformanceInsights(riders, scoutingProfiles);
    const alt = getPerformanceAlerts(riders, scoutingProfiles);
    const riderById = new Map(riders.map((r) => [r.id, r]));
    const valueTypes = new Set(['above_team_avg', 'below_team_avg', 'above_category_avg', 'scout_match']);
    const valueInsights = ins.filter(i => valueTypes.has(i.type));
    const otherInsights = ins.filter(i => !valueTypes.has(i.type));
    const bySubjectInsights = new Map<string, { name: string; type: 'rider' | 'scout'; items: PerformanceInsight[] }>();
    for (const i of valueInsights) {
      const key = i.subjectId;
      if (!bySubjectInsights.has(key)) bySubjectInsights.set(key, { name: i.subjectName, type: i.subjectType, items: [] });
      const group = bySubjectInsights.get(key)!;
      if (i.type === 'below_team_avg') {
        group.items.push(i);
      } else {
        const existing = group.items.find(x => x.durationKey === i.durationKey && x.type !== 'below_team_avg');
        if (!existing || (i.percentAboveRef ?? 0) > (existing.percentAboveRef ?? 0)) {
          if (existing) group.items = group.items.filter(x => !(x.durationKey === i.durationKey && x.type !== 'below_team_avg'));
          group.items.push(i);
        }
      }
    }
    for (const i of otherInsights) {
      const key = i.subjectId;
      if (!bySubjectInsights.has(key)) bySubjectInsights.set(key, { name: i.subjectName, type: i.subjectType, items: [] });
      bySubjectInsights.get(key)!.items.push(i);
    }
    const byAlertSubject = new Map<string, { name: string; alerts: PerformanceAlert[] }>();
    for (const a of alt) {
      if (!byAlertSubject.has(a.subjectId)) byAlertSubject.set(a.subjectId, { name: a.subjectName, alerts: [] });
      byAlertSubject.get(a.subjectId)!.alerts.push(a);
    }
    const allIds = new Set([...bySubjectInsights.keys(), ...byAlertSubject.keys()]);
    const merged: VigilanceSubject[] = [];
    for (const id of allIds) {
      const fromInsights = bySubjectInsights.get(id);
      const fromAlerts = byAlertSubject.get(id);
      const type = fromInsights?.type ?? fromAlerts?.alerts[0]?.subjectType ?? 'rider';
      const rider = riderById.get(id);
      merged.push({
        id,
        name: fromInsights?.name ?? fromAlerts?.name ?? '',
        type,
        rosterRole: rider?.rosterRole,
        alerts: fromAlerts?.alerts ?? [],
        insights: fromInsights?.items ?? [],
      });
    }

    merged.sort((a, b) => {
      const score = (s: VigilanceSubject) => {
        const warn = s.alerts.filter((x) => x.severity === 'warning').length;
        const below = s.insights.filter((i) => !isStrength(i)).length;
        const maxGap = Math.max(
          0,
          ...s.insights.map((i) => Math.abs(i.percentAboveRef ?? i.percentBelowRef ?? i.percentRegressionVsFresh ?? 0)),
          ...s.alerts.map((a) => Math.abs(a.percentVsTeam ?? a.percentRegressionVsFresh ?? 0))
        );
        return warn * 1000 + below * 100 + maxGap + s.alerts.length + s.insights.length;
      };
      return score(b) - score(a);
    });

    const summaryCounts = {
      athletes: merged.length,
      warnings: merged.filter((s) =>
        s.alerts.some((a) => a.severity === 'warning') || s.insights.some((i) => !isStrength(i))
      ).length,
      strengths: merged.filter((s) => s.insights.some(isStrength)).length,
      fatigue: merged.filter((s) =>
        [...s.alerts, ...s.insights].some((x) => x.type === 'fatigue_regression')
      ).length,
    };

    return { mergedSubjects: merged, hasAny: ins.length > 0 || alt.length > 0, summaryCounts };
  }, [riders, scoutingProfiles]);

  const filteredSubjects = useMemo(() => {
    if (vigilanceFilter === 'risk') {
      return mergedSubjects.filter(
        (s) =>
          s.alerts.some((a) => a.severity === 'warning') ||
          s.insights.some((i) => !isStrength(i))
      );
    }
    if (vigilanceFilter === 'strength') {
      return mergedSubjects.filter((s) => s.insights.some(isStrength));
    }
    return mergedSubjects;
  }, [mergedSubjects, vigilanceFilter]);

  const maxShown = Math.max(maxAlerts, maxInsights);
  const visibleSubjects = vigilanceExpanded ? filteredSubjects : filteredSubjects.slice(0, maxShown);
  const hasMore = filteredSubjects.length > maxShown;

  if (!showInsights && !showAlerts) return null;
  if (!hasAny) return null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-xl border border-white/15 overflow-hidden shadow-lg">
        <div className="px-4 py-3 bg-slate-800 border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/25">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-300" />
              </span>
              Vigilance performance
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-slate-700 border border-white/10 px-2 py-0.5 font-medium text-slate-200">
                {summaryCounts.athletes} athlètes
              </span>
              <span className="rounded-full bg-amber-950 border border-amber-500/30 px-2 py-0.5 font-medium text-amber-200">
                {summaryCounts.warnings} à surveiller
              </span>
              <span className="rounded-full bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 font-medium text-emerald-200">
                {summaryCounts.strengths} points forts
              </span>
              {summaryCounts.fatigue > 0 && (
                <span className="rounded-full bg-rose-950 border border-rose-500/30 px-2 py-0.5 font-medium text-rose-200">
                  {summaryCounts.fatigue} fatigue
                </span>
              )}
            </div>
          </div>
          <div className="mt-2.5 inline-flex rounded-lg border border-white/15 bg-slate-900 p-0.5">
            {(
              [
                { id: 'all', label: 'Tous' },
                { id: 'risk', label: 'À risque' },
                { id: 'strength', label: 'Points forts' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setVigilanceFilter(opt.id);
                  setVigilanceExpanded(false);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  vigilanceFilter === opt.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-white/10">
          {visibleSubjects.map((subject) => (
            <UnifiedVigilanceCard
              key={subject.id}
              subject={subject}
              onOpenDetail={() => setDetailSubject({
                name: subject.name,
                type: subject.type,
                alerts: subject.alerts,
                insights: subject.insights,
              })}
            />
          ))}
        </ul>
        {filteredSubjects.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun athlète dans ce filtre.</p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVigilanceExpanded((e) => !e)}
            className="w-full py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
          >
            {vigilanceExpanded ? <><ChevronUpIcon className="h-4 w-4" /> Réduire</> : <><ChevronDownIcon className="h-4 w-4" /> +{filteredSubjects.length - maxShown} athlète(s)</>}
          </button>
        )}
        <Modal
          isOpen={!!detailSubject}
          onClose={() => setDetailSubject(null)}
          title={detailSubject ? `Vigilance · ${detailSubject.name}` : ''}
        >
          {detailSubject && (
            <UnifiedDetailModalContent
              subjectName={detailSubject.name}
              alerts={detailSubject.alerts}
              insights={detailSubject.insights}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};


type VigilanceSubject = {
  id: string;
  name: string;
  type: 'rider' | 'scout';
  rosterRole?: string;
  alerts: PerformanceAlert[];
  insights: PerformanceInsight[];
};

function getSubjectBadge(subject: Pick<VigilanceSubject, 'type' | 'rosterRole'>): {
  label: string;
  className: string;
} {
  if (subject.type === 'scout') {
    return { label: 'Recrue', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (subject.rosterRole === 'reserve') {
    return { label: 'Réserve', className: 'bg-sky-100 text-sky-800' };
  }
  return { label: 'Effectif', className: 'bg-slate-100 text-slate-700' };
}

function getInsightDelta(i: PerformanceInsight): { label: string; pct: number; positive: boolean } | null {
  const duration =
    i.durationKey === 'cp'
      ? 'CP'
      : i.durationKey ||
        (i.fatigueLevel ? `${FATIGUE_LABELS[i.fatigueLevel]}kJ` : null);
  if (!duration) return null;
  if (i.type === 'below_team_avg' && i.percentBelowRef != null) {
    return { label: duration, pct: -Math.abs(i.percentBelowRef), positive: false };
  }
  if (i.percentAboveRef != null) {
    return { label: duration, pct: Math.abs(i.percentAboveRef), positive: true };
  }
  if (i.type === 'fatigue_regression' && i.percentRegressionVsFresh != null) {
    return { label: duration, pct: -Math.abs(i.percentRegressionVsFresh), positive: false };
  }
  return null;
}

function DeltaChip({ label, pct, positive }: { label: string; pct: number; positive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        positive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
      title={`${label} ${pct >= 0 ? '+' : ''}${pct}% vs moy. équipe`}
    >
      <span className="text-[10px] font-medium opacity-70">{label}</span>
      {pct >= 0 ? '+' : ''}
      {pct}%
    </span>
  );
}

function MiniDeltaBars({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);
  return (
    <div className="hidden sm:flex items-end gap-0.5 h-7 shrink-0" aria-hidden>
      {values.slice(0, 8).map((v, idx) => {
        const h = Math.max(2, Math.round((Math.abs(v) / maxAbs) * 24));
        return (
          <span
            key={idx}
            className={`w-1.5 rounded-sm ${v >= 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ height: h }}
            title={`${v >= 0 ? '+' : ''}${v}%`}
          />
        );
      })}
    </div>
  );
}

function UnifiedVigilanceCard({
  subject,
  onOpenDetail,
}: {
  subject: VigilanceSubject;
  onOpenDetail: () => void;
}) {
  const total = subject.alerts.length + subject.insights.length;
  const warningAlerts = subject.alerts.filter((a) => a.severity === 'warning').length;
  const strengthCount = subject.insights.filter(isStrength).length;
  const weakCount = subject.insights.filter((i) => !isStrength(i)).length;
  const fatigueCount = [...subject.alerts, ...subject.insights].filter(
    (x) => x.type === 'fatigue_regression'
  ).length;

  const deltas = [...subject.insights]
    .map(getInsightDelta)
    .filter((d): d is NonNullable<typeof d> => d != null)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const topDeltas = deltas.slice(0, 4);
  const extraDeltas = Math.max(0, deltas.length - topDeltas.length);
  const badge = getSubjectBadge(subject);
  const hasWarning = warningAlerts > 0 || weakCount > 0 || fatigueCount > 0;
  const ringColor = hasWarning ? 'ring-amber-300' : 'ring-emerald-300';
  const badgeBg = hasWarning ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <li className="px-4 py-3 hover:bg-slate-50/80 transition-colors">
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full flex items-start sm:items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-lg p-1 -m-1"
      >
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800 font-bold text-sm ring-2 ${ringColor}`}
        >
          {subject.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
          <span
            className={`absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${badgeBg}`}
          >
            {total}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{subject.name}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {warningAlerts > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                {warningAlerts} alerte{warningAlerts > 1 ? 's' : ''}
              </span>
            )}
            {fatigueCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                fatigue
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {topDeltas.map((d, idx) => (
              <DeltaChip key={`${d.label}-${idx}`} label={d.label} pct={d.pct} positive={d.positive} />
            ))}
            {extraDeltas > 0 && (
              <span className="text-[11px] font-medium text-slate-500">+{extraDeltas}</span>
            )}
            {topDeltas.length === 0 && (
              <span className="text-[11px] text-slate-500">
                {subject.alerts.length > 0
                  ? `${subject.alerts.length} signal(aux) — ouvrir le détail`
                  : 'Ouvrir le détail'}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            {strengthCount > 0 && (
              <span className="text-emerald-700">{strengthCount} point{strengthCount > 1 ? 's' : ''} fort{strengthCount > 1 ? 's' : ''}</span>
            )}
            {strengthCount > 0 && weakCount > 0 && <span> · </span>}
            {weakCount > 0 && (
              <span className="text-amber-700">{weakCount} écart{weakCount > 1 ? 's' : ''} négatif{weakCount > 1 ? 's' : ''}</span>
            )}
            {strengthCount === 0 && weakCount === 0 && subject.alerts.length > 0 && (
              <span>Voir le détail des alertes</span>
            )}
          </p>
        </div>

        <MiniDeltaBars values={deltas.map((d) => d.pct)} />
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400 rotate-[-90deg] mt-3 sm:mt-0" aria-hidden />
      </button>
    </li>
  );
}

function UnifiedDetailModalContent({
  subjectName,
  alerts,
  insights,
}: {
  subjectName: string;
  alerts: PerformanceAlert[];
  insights: PerformanceInsight[];
}) {
  const pointsForts = insights.filter(isStrength);
  const pointsFaibles = insights.filter(i => !isStrength);
  const powerSeries = useMemo(() => buildPowerSeries(alerts, insights), [alerts, insights]);
  const tableHeader = (
    <thead>
      <tr className="border-b border-white/10 bg-slate-800">
        <th className="text-left py-2 pr-4 font-semibold text-slate-200">Type</th>
        <th className="text-left py-2 pr-4 font-semibold text-slate-200">Durée / Contexte</th>
        <th className="text-center py-2 px-2 font-semibold text-slate-200">Valeur actuelle</th>
        <th className="text-center py-2 px-2 font-semibold text-slate-200">Écart</th>
        <th className="text-center py-2 px-2 font-semibold text-slate-200">Moy. équipe</th>
        <th className="text-left py-2 pl-4 font-semibold text-slate-200">Détail</th>
      </tr>
    </thead>
  );
  const renderInsightRow = (i: PerformanceInsight) => {
    const typeLabel = i.type === 'above_team_avg' ? 'Au-dessus équipe' : i.type === 'below_team_avg' ? 'En dessous équipe' : i.type === 'scout_match' ? 'Scout ≥ équipe' : i.type === 'above_category_avg' ? 'Au-dessus catégorie' : i.type === 'fatigue_regression' ? 'Régression fatigue' : i.type === 'fatigue_resistance' ? 'Bonne résistance fatigue' : i.type === 'profile_mismatch' ? 'Profil incohérent' : i.title;
    const durationCtx = i.durationKey ?? (i.fatigueLevel ? `${FATIGUE_LABELS[i.fatigueLevel]} kJ` : '–');
    const ecart = i.percentBelowRef != null ? `−${i.percentBelowRef}%` : i.percentRegressionVsFresh != null ? `−${Math.abs(i.percentRegressionVsFresh)}%` : i.percentAboveRef != null ? `+${i.percentAboveRef}%` : '–';
    const teamRefStr = i.teamRefValue != null && i.teamRefUnit ? `${typeof i.teamRefValue === 'number' && i.teamRefValue % 1 !== 0 ? i.teamRefValue.toFixed(1) : i.teamRefValue} ${i.teamRefUnit}` : '–';
    const isWeak = !isStrength(i);
    return (
      <tr key={i.id} className="border-b border-white/10">
        <td className="py-2 pr-4">
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${isWeak ? 'bg-amber-950 text-amber-200 border border-amber-500/40' : 'bg-emerald-950 text-emerald-200 border border-emerald-500/40'}`}>{typeLabel}</span>
        </td>
        <td className="py-2 pr-4 text-slate-200">{durationCtx}</td>
        <td className="py-2 px-2 text-center font-medium text-white">{i.valueLabel ?? '–'}</td>
        <td className="py-2 px-2 text-center"><span className={isWeak ? 'text-amber-300 font-medium' : 'text-emerald-300 font-medium'}>{ecart}</span></td>
        <td className="py-2 px-2 text-center text-slate-300">{teamRefStr}</td>
        <td className="py-2 pl-4 text-slate-300 max-w-xs">{i.description}</td>
      </tr>
    );
  };
  return (
    <div className="overflow-x-auto space-y-6">
      <ExpertAnalysisSection subjectName={subjectName} alerts={alerts} insights={insights} />
      <PowerHistogram series={powerSeries} subjectName={subjectName} />
      {alerts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Alertes à traiter
          </h4>
          <table className="min-w-full text-sm">
            {tableHeader}
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-white/10">
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${a.severity === 'positive' ? 'bg-emerald-950 text-emerald-200 border border-emerald-500/40' : a.severity === 'warning' ? 'bg-amber-950 text-amber-200 border border-amber-500/40' : 'bg-sky-950 text-sky-200 border border-sky-500/40'}`}>
                      {a.type === 'above_team_avg' && 'Au-dessus équipe'}
                      {a.type === 'below_team_avg' && 'En dessous équipe'}
                      {a.type === 'fatigue_regression' && 'Régression fatigue'}
                      {a.type === 'fatigue_data_missing' && 'PPR fatigue manquant'}
                      {a.type === 'missing_power' && 'PPR manquant'}
                      {a.type === 'scout_above_team' && 'Scout ≥ équipe'}
                      {a.type === 'profile_mismatch' && 'Profil incohérent'}
                      {!['above_team_avg', 'below_team_avg', 'fatigue_regression', 'fatigue_data_missing', 'missing_power', 'scout_above_team', 'profile_mismatch'].includes(a.type) && a.title}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-200">{a.durationKey ?? (a.fatigueLevel ? `${FATIGUE_LABELS[a.fatigueLevel]} kJ` : '–')}</td>
                  <td className="py-2 px-2 text-center font-medium text-white">{a.valueLabel ?? '–'}</td>
                  <td className="py-2 px-2 text-center">
                    {a.percentVsTeam != null && <span className={a.percentVsTeam >= 0 ? 'text-emerald-300 font-medium' : 'text-amber-300 font-medium'}>{a.percentVsTeam >= 0 ? '+' : ''}{a.percentVsTeam}%</span>}
                    {a.percentRegressionVsFresh != null && a.type === 'fatigue_regression' && <span className="text-amber-300 font-medium">−{Math.abs(a.percentRegressionVsFresh)}%</span>}
                    {a.percentVsTeam == null && a.percentRegressionVsFresh == null && '–'}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-300">
                    {a.teamRefValue != null && a.teamRefUnit != null ? `${(a.teamRefValue % 1 !== 0 ? a.teamRefValue.toFixed(1) : a.teamRefValue)} ${a.teamRefUnit}` : '–'}
                  </td>
                  <td className="py-2 pl-4 text-slate-300 max-w-xs">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pointsForts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-emerald-300 mb-2 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5" />Points forts (physique)</h4>
          <table className="min-w-full text-sm">{tableHeader}<tbody>{pointsForts.map(renderInsightRow)}</tbody></table>
        </div>
      )}
      {pointsFaibles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5" />Points faibles (physique)</h4>
          <table className="min-w-full text-sm">{tableHeader}<tbody>{pointsFaibles.map(renderInsightRow)}</tbody></table>
        </div>
      )}
      {alerts.length === 0 && pointsForts.length === 0 && pointsFaibles.length === 0 && (
        <p className="text-sm text-slate-400">Aucune alerte ni indicateur pour cet athlète.</p>
      )}
    </div>
  );
}

function InsightDetailModalContent({ items }: { items: PerformanceInsight[] }) {
  const pointsForts = items.filter(isStrength);
  const pointsFaibles = items.filter(i => !isStrength);

  const renderRow = (i: PerformanceInsight) => {
    const typeLabel = i.type === 'above_team_avg' ? 'Au-dessus équipe' : i.type === 'below_team_avg' ? 'En dessous équipe' : i.type === 'scout_match' ? 'Scout ≥ équipe' : i.type === 'above_category_avg' ? 'Au-dessus catégorie' : i.type === 'fatigue_regression' ? 'Régression fatigue' : i.type === 'fatigue_resistance' ? 'Bonne résistance fatigue' : i.type === 'profile_mismatch' ? 'Profil incohérent' : i.title;
    const durationCtx = i.durationKey ?? (i.fatigueLevel ? `${FATIGUE_LABELS[i.fatigueLevel]} kJ` : '–');
    const ecart = i.percentBelowRef != null ? `−${i.percentBelowRef}%` : i.percentRegressionVsFresh != null ? `−${Math.abs(i.percentRegressionVsFresh)}%` : i.percentAboveRef != null ? `+${i.percentAboveRef}%` : '–';
    const teamRefStr = i.teamRefValue != null && i.teamRefUnit
      ? `${typeof i.teamRefValue === 'number' && i.teamRefValue % 1 !== 0 ? i.teamRefValue.toFixed(1) : i.teamRefValue} ${i.teamRefUnit}`
      : '–';
    const isWeak = !isStrength(i);
    return (
      <tr key={i.id} className="border-b border-gray-100">
        <td className="py-2 pr-4">
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
            isWeak ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
          }`}>
            {typeLabel}
          </span>
        </td>
        <td className="py-2 pr-4 text-gray-700">{durationCtx}</td>
        <td className="py-2 px-2 text-center font-medium text-gray-800">{i.valueLabel ?? '–'}</td>
        <td className="py-2 px-2 text-center">
          <span className={isWeak ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>{ecart}</span>
        </td>
        <td className="py-2 px-2 text-center text-gray-600">{teamRefStr}</td>
        <td className="py-2 pl-4 text-gray-600 max-w-xs">{i.description}</td>
      </tr>
    );
  };

  const tableHeader = (
    <thead>
      <tr className="border-b border-gray-200">
        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Type</th>
        <th className="text-left py-2 pr-4 font-semibold text-gray-700">Durée / Contexte</th>
        <th className="text-center py-2 px-2 font-semibold text-gray-700">Valeur actuelle</th>
        <th className="text-center py-2 px-2 font-semibold text-gray-700">Écart</th>
        <th className="text-center py-2 px-2 font-semibold text-gray-700">Moy. équipe</th>
        <th className="text-left py-2 pl-4 font-semibold text-gray-700">Détail</th>
      </tr>
    </thead>
  );

  return (
    <div className="overflow-x-auto space-y-6">
      {pointsForts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            Points forts (physique)
          </h4>
          <table className="min-w-full text-sm">
            {tableHeader}
            <tbody>{pointsForts.map(renderRow)}</tbody>
          </table>
        </div>
      )}
      {pointsFaibles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Points faibles (physique)
          </h4>
          <table className="min-w-full text-sm">
            {tableHeader}
            <tbody>{pointsFaibles.map(renderRow)}</tbody>
          </table>
        </div>
      )}
      {pointsForts.length === 0 && pointsFaibles.length === 0 && (
        <p className="text-sm text-gray-500">Aucun indicateur physique pour cet athlète.</p>
      )}
    </div>
  );
}

function formatVsEquipe(i: PerformanceInsight): string {
  const teamStr = i.teamRefValue != null && i.teamRefUnit
    ? ` (moy. équipe ${typeof i.teamRefValue === 'number' && i.teamRefValue % 1 !== 0 ? i.teamRefValue.toFixed(1) : i.teamRefValue} ${i.teamRefUnit})`
    : '';
  if (i.type === 'below_team_avg' && i.percentBelowRef != null) return `${i.durationKey} −${i.percentBelowRef}%${teamStr}`;
  if (i.percentAboveRef != null) return `${i.durationKey} +${i.percentAboveRef}%${teamStr}`;
  if (i.type === 'fatigue_regression' && i.percentRegressionVsFresh != null) return `${FATIGUE_LABELS[i.fatigueLevel!]} kJ −${Math.abs(i.percentRegressionVsFresh)}%`;
  if (i.type === 'fatigue_resistance') return `${FATIGUE_LABELS[i.fatigueLevel!]} kJ résistance`;
  return `${i.durationKey}${teamStr}`;
}

function AlertRondByAthlete({
  name,
  alerts,
  onOpenTable,
}: {
  name: string;
  alerts: PerformanceAlert[];
  onOpenTable: () => void;
}) {
  const hasPositive = alerts.some(a => a.severity === 'positive');
  const hasWarning = alerts.some(a => a.severity === 'warning');
  const ringColor = hasPositive && !hasWarning ? 'ring-green-300' : 'ring-amber-300';
  return (
    <li className="px-4 py-3 hover:bg-amber-50/50 transition-colors">
      <button
        type="button"
        onClick={onOpenTable}
        className="w-full flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-amber-300 rounded-lg p-1 -m-1"
      >
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-900 font-bold text-sm ring-2 ${ringColor}`}>
          {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
            {alerts.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-gray-900">{name}</span>
          <p className="text-xs text-gray-600 mt-0.5">{alerts.length} alerte{alerts.length > 1 ? 's' : ''} · Cliquer pour le tableau</p>
        </div>
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400 rotate-[-90deg]" aria-hidden />
      </button>
    </li>
  );
}

function GroupedInsightCard({
  group,
  onOpenDetail,
}: {
  group: { id: string; name: string; type: 'rider' | 'scout'; items: PerformanceInsight[] };
  onOpenDetail: () => void;
}) {
  const sorted = [...group.items].sort((a, b) => Math.abs(b.percentAboveRef ?? b.percentBelowRef ?? 0) - Math.abs(a.percentAboveRef ?? a.percentBelowRef ?? 0));
  const summary = sorted.slice(0, 6).map(formatVsEquipe).join(' · ');
  return (
    <li className="px-4 py-3 hover:bg-indigo-50/50 transition-colors">
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded-lg p-1 -m-1"
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-900 font-bold text-sm ring-2 ring-indigo-300">
          {group.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-500 px-1 text-xs font-bold text-white">
            {group.items.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{group.name}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${group.type === 'scout' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
              {group.type === 'scout' ? 'Recrue' : 'Réserve'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 truncate" title={summary}>
            {summary ? `${summary} · Cliquer pour le tableau` : `${group.items.length} indicateur(s) · Cliquer pour le tableau`}
          </p>
        </div>
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400 rotate-[-90deg]" aria-hidden />
      </button>
    </li>
  );
}

function AlertCard({ alert, onOpenTable }: { alert: PerformanceAlert; onOpenTable?: () => void }) {
  const isMissing = alert.type === 'missing_power' || alert.type === 'fatigue_data_missing';
  const isRegression = alert.type === 'fatigue_regression';
  const isClickable = !!onOpenTable;

  const wrap = (content: React.ReactNode) =>
    isClickable ? (
      <button type="button" onClick={onOpenTable} className="w-full text-left focus:outline-none focus:ring-2 focus:ring-amber-300 rounded flex items-center gap-2 flex-wrap">
        {content}
      </button>
    ) : content;

  if (isRegression && alert.fatigueLevel != null && alert.percentRegressionVsFresh != null) {
    const pct = Math.min(100, Math.abs(alert.percentRegressionVsFresh));
    const level = alert.fatigueLevel;
    return (
      <li className="px-4 py-3 hover:bg-amber-50/50 transition-colors">
        {wrap(
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full overflow-hidden ring-2 ring-amber-200">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                <path fill="none" stroke="#e5e7eb" strokeWidth="3" d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" />
                <path fill="none" stroke={pct >= 20 ? '#dc2626' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct}, 100`} d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" />
              </svg>
              <span className="absolute text-xs font-bold text-gray-700">{pct}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{alert.subjectName}</span>
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-900">{FATIGUE_LABELS[level]} kJ</span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">Régression vs PPR frais · Cliquer pour le tableau</p>
            </div>
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-500" />
          </div>
        )}
      </li>
    );
  }

  if (alert.type === 'above_team_avg' && alert.percentVsTeam != null) {
    const teamStr = alert.teamRefValue != null && alert.teamRefUnit
      ? ` (moy. équipe ${alert.teamRefValue % 1 !== 0 ? alert.teamRefValue.toFixed(1) : alert.teamRefValue} ${alert.teamRefUnit})`
      : '';
    return (
      <li className="px-4 py-2 hover:bg-green-50/50 transition-colors flex items-center gap-2 flex-wrap">
        {wrap(
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-200 text-green-800 text-xs font-bold ring-2 ring-green-200">
              {alert.subjectName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
            <span className="font-semibold text-gray-900">{alert.subjectName}</span>
            <span className="text-xs font-medium text-green-700">
              +{alert.percentVsTeam}%{teamStr} par rapport à l&apos;équipe
              {alert.durationKey && <span className="text-gray-500"> · {alert.durationKey}</span>}
            </span>
            {isClickable && <span className="text-xs text-gray-400">· Cliquer pour le tableau</span>}
          </div>
        )}
      </li>
    );
  }

  if (alert.type === 'below_team_avg' && alert.percentVsTeam != null) {
    const teamStr = alert.teamRefValue != null && alert.teamRefUnit
      ? ` (moy. équipe ${alert.teamRefValue % 1 !== 0 ? alert.teamRefValue.toFixed(1) : alert.teamRefValue} ${alert.teamRefUnit})`
      : '';
    return (
      <li className="px-4 py-2 hover:bg-amber-50/50 transition-colors flex items-center gap-2 flex-wrap">
        {wrap(
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-bold ring-2 ring-amber-200">
              {alert.subjectName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
            <span className="font-semibold text-gray-900">{alert.subjectName}</span>
            <span className="text-xs font-medium text-amber-800">
              −{Math.abs(alert.percentVsTeam)}%{teamStr} par rapport à l&apos;équipe
              {alert.durationKey && <span className="text-gray-500"> · {alert.durationKey}</span>}
            </span>
            {isClickable && <span className="text-xs text-gray-400">· Cliquer pour le tableau</span>}
          </div>
        )}
      </li>
    );
  }

  if (isMissing) {
    return (
      <li className="px-4 py-3 hover:bg-blue-50/50 transition-colors">
        {wrap(
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-2 ring-blue-200">
              <InformationCircleIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-gray-900">{alert.subjectName}</span>
              <p className="text-xs text-blue-700 mt-0.5">{alert.type === 'fatigue_data_missing' ? 'PPR fatigue manquant' : 'PPR manquant'} · Cliquer pour le tableau</p>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="px-4 py-3 hover:bg-gray-50/60 transition-colors">
      {wrap(
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-2 ring-amber-200">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-gray-900">{alert.subjectName}</span>
            <p className="text-xs text-gray-600 truncate">{alert.title}</p>
          </div>
        </div>
      )}
    </li>
  );
}

function InsightCard({ insight }: { insight: PerformanceInsight }) {
  const isFatigueRegression = insight.type === 'fatigue_regression';
  const isFatigueResistance = insight.type === 'fatigue_resistance';

  if (isFatigueRegression && insight.fatigueLevel != null) {
    const pct = insight.percentRegressionVsFresh != null ? Math.min(100, Math.abs(insight.percentRegressionVsFresh)) : 0;
    return (
      <li className="px-4 py-3 hover:bg-amber-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <span className="text-xs font-bold text-amber-800">−{pct}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-gray-900">{insight.subjectName}</span>
            <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900">{FATIGUE_LABELS[insight.fatigueLevel]} kJ</span>
          </div>
        </div>
      </li>
    );
  }

  if (isFatigueResistance && insight.fatigueLevel != null) {
    return (
      <li className="px-4 py-3 hover:bg-green-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-gray-900">{insight.subjectName}</span>
            <span className="ml-2 rounded bg-green-200 px-1.5 py-0.5 text-xs font-medium text-green-800">Résistance {FATIGUE_LABELS[insight.fatigueLevel]} kJ</span>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="px-4 py-3 hover:bg-gray-50/60 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserCircleIcon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-gray-900">{insight.subjectName}</span>
          <p className="text-xs text-gray-600">{insight.title}</p>
        </div>
      </div>
    </li>
  );
}

export default PerformanceInsightsAlerts;

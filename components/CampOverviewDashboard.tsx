import React, { useMemo } from 'react';
import { RaceEvent, Rider } from '../types';
import {
  ALTITUDE_PROTOCOL_LABELS,
  buildCampMetricSeries,
  buildCampOverviewSummary,
  CAMP_TEST_TYPE_LABELS,
  HEAT_PROTOCOL_LABELS,
  isAltitudeCamp,
  isHeatCamp,
  listEventDayDates,
} from '../utils/trainingCampUtils';
import { formatEventDate, formatEventDateRange } from '../utils/dateUtils';
import MiniSparkline from './performance/MiniSparkline';

interface CampOverviewDashboardProps {
  event: RaceEvent;
  riders: Rider[];
  onOpenDaily: (date?: string) => void;
  onOpenTests: () => void;
  onOpenAthlete: (riderId: string) => void;
}

function statusLabel(status: 'ok' | 'watch' | 'alert') {
  if (status === 'alert') return 'Alerte';
  if (status === 'watch') return 'Vigilance';
  return 'OK';
}

function fmtDelta(delta: number | null, invert = false): string {
  if (delta === null || Number.isNaN(delta)) return '—';
  const sign = delta > 0 ? '+' : '';
  const good = invert ? delta < 0 : delta > 0;
  const mark = delta === 0 ? '' : good ? ' ↑' : ' ↓';
  return `${sign}${delta % 1 === 0 ? delta : delta.toFixed(1)}${mark}`;
}

const CampOverviewDashboard: React.FC<CampOverviewDashboardProps> = ({
  event,
  riders,
  onOpenDaily,
  onOpenTests,
  onOpenAthlete,
}) => {
  const altitude = isAltitudeCamp(event);
  const heat = isHeatCamp(event);
  const meta = event.altitudeCampMeta;
  const days = useMemo(() => listEventDayDates(event), [event.date, event.endDate]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentDayIndex = Math.max(
    0,
    days.findIndex((d) => d >= todayIso),
  );
  const activeDay =
    days.find((d) => d === todayIso) ||
    days[Math.min(currentDayIndex, days.length - 1)] ||
    event.date;

  const summary = useMemo(
    () => buildCampOverviewSummary(event, riders.map((r) => r.id)),
    [event, riders],
  );

  const recentTests = useMemo(() => {
    return [...(event.campAthleteTests || [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);
  }, [event.campAthleteTests]);

  const riderName = (id: string) => {
    const r = riders.find((x) => x.id === id);
    return r ? `${r.firstName} ${r.lastName}` : id;
  };

  const dayProgressLabel =
    days.length > 0
      ? `J${Math.min(days.indexOf(activeDay) + 1, days.length)} / ${days.length}`
      : '—';

  const envChips = [
    altitude
      ? `${meta?.altitudeMeters ? `${meta.altitudeMeters} m` : 'Altitude'}${
          meta?.protocol ? ` · ${ALTITUDE_PROTOCOL_LABELS[meta.protocol]}` : ''
        }`
      : null,
    heat
      ? `Chaleur${
          meta?.targetTemperatureC != null ? ` · ${meta.targetTemperatureC} °C` : ''
        }${meta?.heatProtocol ? ` · ${HEAT_PROTOCOL_LABELS[meta.heatProtocol]}` : ''}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="lc-overview space-y-6">
      <style>{`
        @keyframes lc-sweep {
          0% { transform: translateX(-40%) skewX(-18deg); opacity: 0; }
          20% { opacity: 0.55; }
          60% { opacity: 0.25; }
          100% { transform: translateX(140%) skewX(-18deg); opacity: 0; }
        }
        @keyframes lc-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.65; }
        }
        .lc-overview-hero { animation: lc-rise 0.55s ease-out both; }
        .lc-overview-panel { animation: lc-rise 0.6s ease-out 0.08s both; }
        .lc-overview-sweep {
          position: absolute;
          inset: -20% -10%;
          background: linear-gradient(90deg, transparent, rgba(129,140,248,0.22), transparent);
          width: 45%;
          animation: lc-sweep 4.8s ease-in-out infinite;
          pointer-events: none;
        }
        .lc-overview-live {
          animation: lc-pulse-dot 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* ——— Hero marque / stage ——— */}
      <section className="lc-overview-hero relative overflow-hidden rounded-3xl min-h-[280px] sm:min-h-[320px] text-white shadow-2xl shadow-slate-900/25">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 85% 15%, rgba(79,70,229,0.45), transparent 55%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(14,165,233,0.2), transparent 50%), linear-gradient(145deg, #0f172a 0%, #1e293b 48%, #0f172a 100%)',
          }}
        />
        {/* Motif roue / vitesse (identité icône LC) */}
        <svg
          className="absolute -right-8 -top-8 w-72 h-72 opacity-[0.14]"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <circle cx="100" cy="100" r="70" fill="none" stroke="#818cf8" strokeWidth="3" />
          <circle cx="100" cy="100" r="12" fill="#818cf8" />
          {[0, 45, 90, 135].map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="100"
              x2={100 + 70 * Math.cos((deg * Math.PI) / 180)}
              y2={100 + 70 * Math.sin((deg * Math.PI) / 180)}
              stroke="#818cf8"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-18deg, transparent, transparent 18px, #fff 18px, #fff 19px)',
          }}
        />
        <div className="lc-overview-sweep" />

        <div className="relative z-10 flex flex-col justify-between gap-8 p-6 sm:p-9 min-h-[280px] sm:min-h-[320px]">
          <div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-2 w-2 rounded-full bg-indigo-400 lc-overview-live" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200/90">
                  LogiCycle · Tableau de bord
                </p>
              </div>
              <h1
                className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-none"
                style={{ letterSpacing: '-0.03em' }}
              >
                LOGICYCLE
              </h1>
              <p className="mt-2 text-sm text-slate-300 max-w-md">
                Tableau de bord — le cockpit de votre stage
              </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">
                Stage en cours
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold mt-1 leading-tight text-white">
                {event.name}
              </h2>
              <p className="text-sm text-slate-300 mt-1.5">
                {formatEventDateRange(event)}
                <span className="text-slate-500 mx-1.5">·</span>
                {summary.totalDays} j
                <span className="text-slate-500 mx-1.5">·</span>
                {summary.athleteCount} athlète{summary.athleteCount > 1 ? 's' : ''}
              </p>
              {envChips.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {envChips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-indigo-100"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              {meta?.focusNotes && (
                <p className="mt-3 text-sm text-slate-300/90 max-w-2xl leading-relaxed">
                  {meta.focusNotes}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onOpenDaily(activeDay)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2.5 shadow-lg shadow-indigo-900/40 transition-colors"
              >
                Saisie du jour
                <span className="text-indigo-100/80 font-medium text-xs">{dayProgressLabel}</span>
              </button>
              <button
                type="button"
                onClick={onOpenTests}
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
              >
                Tests
                {summary.testsCount > 0 ? ` · ${summary.testsCount}` : ''}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ——— KPIs ——— */}
      <div className="lc-overview-panel grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Complétion',
            value: `${summary.fillRatePercent} %`,
            hint: `${summary.metricsLogged} / ${summary.expectedSlots} saisies`,
            accent: 'from-indigo-500/10 to-transparent border-indigo-200',
          },
          {
            label: 'Jours actifs',
            value: `${summary.daysWithAnyData}/${summary.totalDays}`,
            hint: 'Au moins une saisie',
            accent: 'from-sky-500/10 to-transparent border-sky-200',
          },
          {
            label: altitude ? 'Alertes SpO₂' : heat ? 'Alertes USG' : 'Alertes',
            value: String(altitude ? summary.spo2Alerts : summary.usgAlerts),
            hint: altitude ? 'Vigilance altitude' : 'Hydratation / chaleur',
            accent: 'from-amber-500/10 to-transparent border-amber-200',
          },
          {
            label: 'Céphalées',
            value: String(summary.headacheDays),
            hint: 'Jours × athlètes',
            accent: 'from-rose-500/10 to-transparent border-rose-200',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border bg-gradient-to-br ${kpi.accent} bg-white px-4 py-3.5 shadow-sm`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {kpi.label}
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums tracking-tight">
              {kpi.value}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* ——— Timeline ——— */}
      <div className="lc-overview-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Parcours du stage</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cliquez un jour pour ouvrir la saisie — intensité = remplissage athlètes
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.dayFillCounts.map((d, i) => {
            const ratio =
              summary.athleteCount > 0 ? d.count / summary.athleteCount : 0;
            const isActive = d.date === activeDay;
            const bg =
              ratio >= 0.8
                ? 'bg-indigo-600 text-white'
                : ratio >= 0.4
                  ? 'bg-indigo-400 text-white'
                  : ratio > 0
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-400';
            return (
              <button
                key={d.date}
                type="button"
                title={`${formatEventDate(d.date)} · ${d.count}/${summary.athleteCount}`}
                onClick={() => onOpenDaily(d.date)}
                className={`relative h-10 min-w-[2.5rem] px-2 rounded-xl text-[11px] font-bold transition-transform hover:scale-105 ${bg} ${
                  isActive ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                }`}
              >
                J{i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* ——— Athlètes ——— */}
      <div className="lc-overview-panel rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Peloton — synthèse</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dernières valeurs · tendances depuis J1
            </p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-1">
            {summary.athleteCount} profils
          </span>
        </div>
        {riders.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-8 text-center">
            Aucun athlète sélectionné sur ce stage.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Athlète</th>
                  <th className="text-center px-2 py-3 font-semibold">Statut</th>
                  <th className="text-center px-2 py-3 font-semibold">Saisies</th>
                  <th className="text-center px-2 py-3 font-semibold">HRV</th>
                  <th className="text-center px-2 py-3 font-semibold">SpO₂</th>
                  <th className="text-center px-2 py-3 font-semibold">USG</th>
                  <th className="text-center px-2 py-3 font-semibold">Fatigue</th>
                  <th className="text-center px-2 py-3 font-semibold">Δ HRV</th>
                  <th className="text-center px-2 py-3 font-semibold">SpO₂</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.athletes.map((row) => {
                  const rider = riders.find((r) => r.id === row.riderId);
                  if (!rider) return null;
                  const spo2Spark = buildCampMetricSeries(event, row.riderId, 'spo2Percent').map(
                    (p) => p.value,
                  );
                  return (
                    <tr key={row.riderId} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenAthlete(row.riderId)}
                          className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline text-left"
                        >
                          {rider.firstName} {rider.lastName}
                        </button>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            row.status === 'ok'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.status === 'watch'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-700 font-medium">
                        {row.daysFilled}/{row.totalDays}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">
                        {row.lastHrv != null ? row.lastHrv : '—'}
                        <span className="block text-[9px] text-slate-400">
                          {fmtDelta(row.hrvDelta)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">
                        {row.lastSpo2 != null ? `${row.lastSpo2} %` : '—'}
                        <span className="block text-[9px] text-slate-400">
                          {fmtDelta(row.spo2Delta, true)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">
                        {row.lastUsg != null ? row.lastUsg.toFixed(3) : '—'}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">
                        {row.lastFatigue != null ? row.lastFatigue : '—'}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">
                        {fmtDelta(row.hrvDelta)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-center">
                          <MiniSparkline values={spo2Spark} width={72} height={22} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ——— Tests ——— */}
      <div className="lc-overview-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Derniers tests</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Puissance · lactate · protocoles terrain
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTests}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Voir tout →
          </button>
        </div>
        {recentTests.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">
            Aucun test saisi — ouvrez l’onglet Tests pour un profil puissance / lactate.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentTests.map((t) => (
              <li
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs hover:border-indigo-200 transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900">{riderName(t.riderId)}</span>
                  <span className="text-slate-300 mx-1.5">·</span>
                  <span className="inline-flex rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold">
                    {CAMP_TEST_TYPE_LABELS[t.testType]}
                  </span>
                  <span className="text-slate-300 mx-1.5">·</span>
                  <span className="text-slate-700">{t.label}</span>
                </div>
                <div className="text-slate-500 tabular-nums">
                  {formatEventDate(t.date, { day: 'numeric', month: 'short' })}
                  {t.lt1HeartRateBpm != null || t.lt1PowerWatts != null
                    ? ` · LT1 ${[t.lt1PowerWatts != null ? `${t.lt1PowerWatts}W` : null, t.lt1HeartRateBpm != null ? `${t.lt1HeartRateBpm}bpm` : null].filter(Boolean).join('/')}`
                    : ''}
                  {t.powerWatts != null ? ` · ${t.powerWatts} W` : ''}
                  {t.lactateMmol != null ? ` · ${t.lactateMmol} mmol/L` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CampOverviewDashboard;

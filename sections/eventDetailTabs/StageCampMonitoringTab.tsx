import React, { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  CampMonitorColumnKey,
  CampMonitoringConfig,
  RaceEvent,
  Rider,
  StageCampSessionType,
  StageDayAthleteMetrics,
} from '../../types';
import ActionButton from '../../components/ActionButton';
import MiniSparkline from '../../components/performance/MiniSparkline';
import UrineColorPicker from '../../components/UrineColorPicker';
import WellnessScalePicker from '../../components/WellnessScalePicker';
import CampMonitorColumnPicker from '../../components/CampMonitorColumnPicker';
import CampTestsPanel from '../../components/CampTestsPanel';
import CampOverviewDashboard from '../../components/CampOverviewDashboard';
import AthleteCampDailyForm from '../../components/AthleteCampDailyForm';
import {
  ALTITUDE_PROTOCOL_LABELS,
  buildCampMetricSeries,
  CAMP_CHART_METRICS,
  CAMP_MONITOR_COLUMN_CATALOG,
  CampChartMetricKey,
  findAthleteAltitudeRef,
  findCampMetric,
  HYPOXIC_SETUP_LABELS,
  isAltitudeCamp,
  isHeatCamp,
  listEventDayDates,
  listOtherTrainingCamps,
  resolveAthleteReferenceAltitude,
  resolveVisibleMonitorColumns,
  spo2AlertLevel,
  STAGE_SESSION_TYPE_LABELS,
  upsertCampMetric,
  usgAlertLevel,
  usgStatusLabel,
  HEAT_PROTOCOL_LABELS,
  HEAT_SETUP_LABELS,
  WellnessScaleKey,
} from '../../utils/trainingCampUtils';
import { formatEventDate, formatEventDateRange } from '../../utils/dateUtils';
import { isRiderAbsentFromEvent } from '../../utils/eventRiderUtils';

interface StageCampMonitoringTabProps {
  event: RaceEvent;
  eventId: string;
  appState: AppState;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => Promise<void> | void;
  readOnly?: boolean;
  /** Restreint la grille / graphiques à un athlète (back-office coureur) */
  lockedRiderId?: string;
}

type NumericField = CampChartMetricKey;

const COLUMN_HEADERS: { key: CampMonitorColumnKey; label: string }[] =
  CAMP_MONITOR_COLUMN_CATALOG.map((c) => ({ key: c.key, label: c.label }));

function alertClass(level?: 'ok' | 'watch' | 'alert'): string {
  if (level === 'alert') return 'bg-red-50 border-red-300 text-red-900';
  if (level === 'watch') return 'bg-amber-50 border-amber-300 text-amber-900';
  return 'bg-white border-gray-200 text-gray-900';
}

/** Graphique dual-série (stage actuel vs comparaison), aligné sur J1, J2… */
const CampCompareChart: React.FC<{
  title: string;
  unit?: string;
  primary: Array<number | null>;
  secondary?: Array<number | null>;
  primaryLabel: string;
  secondaryLabel?: string;
  invertColors?: boolean;
}> = ({ title, unit, primary, secondary, primaryLabel, secondaryLabel, invertColors }) => {
  const width = 320;
  const height = 120;
  const pad = { top: 12, right: 12, bottom: 22, left: 36 };

  const allValues = [...primary, ...(secondary || [])].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );

  if (allValues.length < 1) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="text-xs font-semibold text-gray-800 mb-1">
          {title}
          {unit ? ` (${unit})` : ''}
        </p>
        <p className="text-xs text-gray-400 italic py-8 text-center">Pas assez de données</p>
      </div>
    );
  }

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const n = Math.max(primary.length, secondary?.length || 0, 2);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const toXY = (series: Array<number | null>, i: number, v: number) => {
    const x = pad.left + (i / Math.max(n - 1, 1)) * innerW;
    const y = pad.top + (1 - (v - min) / range) * innerH;
    return { x, y };
  };

  const buildPath = (series: Array<number | null>) => {
    const parts: string[] = [];
    series.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) return;
      const { x, y } = toXY(series, i, v);
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    });
    return parts.join(' ');
  };

  const primaryPath = buildPath(primary);
  const secondaryPath = secondary ? buildPath(secondary) : '';
  const lastPrimary = [...primary].reverse().find((v) => v !== null);
  const firstPrimary = primary.find((v) => v !== null);
  const delta =
    typeof lastPrimary === 'number' && typeof firstPrimary === 'number'
      ? lastPrimary - firstPrimary
      : 0;
  const improving = invertColors ? delta < 0 : delta > 0;
  const stroke = improving ? '#059669' : delta === 0 ? '#0284c7' : '#dc2626';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-semibold text-gray-800">
          {title}
          {unit ? ` (${unit})` : ''}
        </p>
        <MiniSparkline
          values={primary}
          width={64}
          height={22}
          invertColors={invertColors}
        />
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + t * innerH;
          const val = max - t * range;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text x={4} y={y + 3} className="fill-gray-400" fontSize={9}>
                {val.toFixed(range < 5 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: n }).map((_, i) => {
          const x = pad.left + (i / Math.max(n - 1, 1)) * innerW;
          return (
            <text
              key={i}
              x={x}
              y={height - 4}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize={9}
            >
              J{i + 1}
            </text>
          );
        })}
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {primaryPath && (
          <path
            d={primaryPath}
            fill="none"
            stroke={stroke}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 mt-1">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: stroke }} />
          {primaryLabel}
        </span>
        {secondaryLabel && (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 border-t-2 border-dashed border-slate-400" />
            {secondaryLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const AthleteCampChartsPanel: React.FC<{
  rider: Rider;
  event: RaceEvent;
  compareEvent: RaceEvent | null;
  otherCamps: RaceEvent[];
  compareEventId: string;
  onCompareChange: (id: string) => void;
  onBack: () => void;
  focusMetric: CampChartMetricKey;
  onFocusMetric: (m: CampChartMetricKey) => void;
  hideBack?: boolean;
  showGridToggle?: boolean;
  onShowGrid?: () => void;
}> = ({
  rider,
  event,
  compareEvent,
  otherCamps,
  compareEventId,
  onCompareChange,
  onBack,
  focusMetric,
  onFocusMetric,
  hideBack = false,
  showGridToggle = false,
  onShowGrid,
}) => {
  const primaryLabel = event.name;
  const secondaryLabel = compareEvent?.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            {!hideBack && (
              <ActionButton type="button" variant="secondary" size="sm" onClick={onBack}>
                ← Retour à la grille
              </ActionButton>
            )}
            {showGridToggle && onShowGrid && (
              <ActionButton type="button" variant="secondary" size="sm" onClick={onShowGrid}>
                Saisie journalière
              </ActionButton>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mt-3">
            Suivi graphique — {rider.firstName} {rider.lastName}
          </h3>
          <p className="text-sm text-gray-500">
            {event.name} · {formatEventDateRange(event)}
            {isAltitudeCamp(event) && event.altitudeCampMeta?.altitudeMeters
              ? ` · ${event.altitudeCampMeta.altitudeMeters} m`
              : ''}
          </p>
        </div>
        <div className="min-w-[16rem]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Comparer à un autre stage
          </label>
          <select
            value={compareEventId}
            onChange={(e) => onCompareChange(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Aucun (stage actuel seul)</option>
            {otherCamps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({formatEventDateRange(c)})
              </option>
            ))}
          </select>
          {otherCamps.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1">
              Aucun autre stage dans le calendrier pour comparer.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CAMP_CHART_METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onFocusMetric(m.key)}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
              focusMetric === m.key
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {(() => {
        const meta = CAMP_CHART_METRICS.find((m) => m.key === focusMetric)!;
        const primary = buildCampMetricSeries(event, rider.id, focusMetric).map((p) => p.value);
        const secondary = compareEvent
          ? buildCampMetricSeries(compareEvent, rider.id, focusMetric).map((p) => p.value)
          : undefined;
        return (
          <CampCompareChart
            title={meta.label}
            unit={meta.unit}
            primary={primary}
            secondary={secondary}
            primaryLabel={primaryLabel}
            secondaryLabel={secondaryLabel}
            invertColors={meta.invertColors}
          />
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {CAMP_CHART_METRICS.filter((m) => m.key !== focusMetric).map((meta) => {
          const primary = buildCampMetricSeries(event, rider.id, meta.key).map((p) => p.value);
          const secondary = compareEvent
            ? buildCampMetricSeries(compareEvent, rider.id, meta.key).map((p) => p.value)
            : undefined;
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => onFocusMetric(meta.key)}
              className="text-left hover:ring-2 hover:ring-sky-300 rounded-xl transition-shadow"
            >
              <CampCompareChart
                title={meta.label}
                unit={meta.unit}
                primary={primary}
                secondary={secondary}
                primaryLabel={primaryLabel}
                secondaryLabel={secondaryLabel}
                invertColors={meta.invertColors}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const StageCampMonitoringTab: React.FC<StageCampMonitoringTabProps> = ({
  event,
  eventId,
  appState,
  updateEvent,
  readOnly = false,
  lockedRiderId,
}) => {
  const days = useMemo(() => listEventDayDates(event), [event.date, event.endDate]);
  const [selectedDate, setSelectedDate] = useState(days[0] || event.date);
  const [saving, setSaving] = useState(false);
  const [draftNotesRiderId, setDraftNotesRiderId] = useState<string | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [compareEventId, setCompareEventId] = useState('');
  const [focusMetric, setFocusMetric] = useState<CampChartMetricKey>('hrvMs');
  const [viewMode, setViewMode] = useState<'overview' | 'daily' | 'tests'>('overview');
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  useEffect(() => {
    if (!days.includes(selectedDate) && days.length > 0) {
      setSelectedDate(days[0]);
    }
  }, [days, selectedDate]);

  const riders = useMemo(() => {
    const ids = new Set(event.selectedRiderIds || []);
    return appState.riders
      .filter(
        (r) =>
          ids.has(r.id) &&
          (!lockedRiderId || r.id === lockedRiderId) &&
          !isRiderAbsentFromEvent(r.id, eventId, appState.riderEventSelections || []),
      )
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'fr'),
      );
  }, [
    appState.riders,
    appState.riderEventSelections,
    event.selectedRiderIds,
    eventId,
    lockedRiderId,
  ]);

  const otherCamps = useMemo(
    () => listOtherTrainingCamps(appState.raceEvents || [], eventId),
    [appState.raceEvents, eventId],
  );

  const compareEvent = useMemo(
    () => otherCamps.find((c) => c.id === compareEventId) || null,
    [otherCamps, compareEventId],
  );

  const selectedRider = riders.find((r) => r.id === selectedRiderId) || null;

  const metrics = event.campAthleteDailyMetrics || [];
  const altitude = isAltitudeCamp(event);
  const heat = isHeatCamp(event);
  const meta = event.altitudeCampMeta;
  const visibleColumns = useMemo(
    () => resolveVisibleMonitorColumns(event),
    [event.altitudeCampMeta, event.campMonitoringConfig, event.eventType],
  );
  const show = (key: CampMonitorColumnKey) => visibleColumns.includes(key);
  const visibleHeaders = COLUMN_HEADERS.filter((c) => show(c.key));

  const saveMonitoringConfig = async (next: CampMonitoringConfig) => {
    if (readOnly) return;
    setSaving(true);
    try {
      await updateEvent({ campMonitoringConfig: next });
    } finally {
      setSaving(false);
    }
  };

  const patchMetric = async (
    riderId: string,
    patch: Partial<StageDayAthleteMetrics>,
  ) => {
    if (readOnly) return;
    const existing = findCampMetric(metrics, riderId, selectedDate);
    const next = upsertCampMetric(metrics, {
      id: existing?.id,
      riderId,
      date: selectedDate,
      ...existing,
      ...patch,
    });
    setSaving(true);
    try {
      await updateEvent({ campAthleteDailyMetrics: next });
    } finally {
      setSaving(false);
    }
  };

  const setNumeric = (riderId: string, field: NumericField, raw: string) => {
    if (raw === '') {
      void patchMetric(riderId, { [field]: undefined });
      return;
    }
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isNaN(n)) return;
    void patchMetric(riderId, { [field]: n });
  };

  const inputCls =
    'w-full min-w-[3.5rem] px-1.5 py-1 text-xs border rounded focus:ring-1 focus:ring-sky-500 focus:border-sky-500';

  if (selectedRider) {
    return (
      <AthleteCampChartsPanel
        rider={selectedRider}
        event={event}
        compareEvent={compareEvent}
        otherCamps={otherCamps}
        compareEventId={compareEventId}
        onCompareChange={setCompareEventId}
        onBack={() => setSelectedRiderId(null)}
        focusMetric={focusMetric}
        onFocusMetric={setFocusMetric}
        hideBack={false}
        showGridToggle={Boolean(lockedRiderId)}
        onShowGrid={lockedRiderId ? () => setSelectedRiderId(null) : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {viewMode === 'overview'
              ? lockedRiderId
                ? 'Mon stage — vue globale'
                : 'Page de garde — vue globale'
              : lockedRiderId
                ? 'Mon suivi du jour'
                : 'Suivi stage — athlètes'}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {viewMode === 'overview'
              ? lockedRiderId
                ? 'Synthèse de votre stage : complétion, alertes et tendances.'
                : 'Synthèse du stage : complétion, alertes, tendances athlètes et derniers tests.'
              : lockedRiderId
                ? 'Saisissez vos indicateurs du jour — une section à la fois, sans défilement horizontal.'
                : altitude || heat
                  ? `Monitoring ${[
                      altitude ? 'altitude' : null,
                      heat ? 'chaleur' : null,
                    ]
                      .filter(Boolean)
                      .join(' + ')} (hydratation, USG${altitude ? ', SpO₂' : ''}…).`
                  : 'Choisissez les données de monitoring selon le type de stage, et saisissez les tests (puissance, lactate…).'}
          </p>
          {(altitude || heat) && meta && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {altitude && (
                <p className="text-xs text-sky-800 bg-sky-50 border border-sky-100 rounded px-2 py-1 inline-block">
                  {meta.altitudeMeters ? `${meta.altitudeMeters} m` : 'Altitude'}
                  {meta.sleepingAltitudeMeters
                    ? ` · sommeil ${meta.sleepingAltitudeMeters} m`
                    : ''}
                  {meta.protocol ? ` · ${ALTITUDE_PROTOCOL_LABELS[meta.protocol]}` : ''}
                </p>
              )}
              {heat && (
                <p className="text-xs text-orange-900 bg-orange-50 border border-orange-100 rounded px-2 py-1 inline-block">
                  Chaleur
                  {meta.targetTemperatureC != null ? ` · ${meta.targetTemperatureC} °C` : ''}
                  {meta.targetHumidityPercent != null
                    ? ` · ${meta.targetHumidityPercent} % HR`
                    : ''}
                  {meta.heatProtocol ? ` · ${HEAT_PROTOCOL_LABELS[meta.heatProtocol]}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saving && <span className="text-xs text-gray-500">Enregistrement…</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          type="button"
          onClick={() => setViewMode('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            viewMode === 'overview'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Vue globale
        </button>
        <button
          type="button"
          onClick={() => setViewMode('daily')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            viewMode === 'daily'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Quotidien
        </button>
        <button
          type="button"
          onClick={() => setViewMode('tests')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            viewMode === 'tests'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Tests
          {(event.campAthleteTests || []).filter((t) => t.date === selectedDate).length > 0
            ? ` (${(event.campAthleteTests || []).filter((t) => t.date === selectedDate).length})`
            : ''}
        </button>
        {!lockedRiderId && !altitude && !heat && !readOnly && viewMode === 'daily' && (
          <button
            type="button"
            onClick={() => setShowColumnPicker((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          >
            {showColumnPicker ? 'Masquer colonnes' : 'Choisir les données'}
          </button>
        )}
      </div>

      {viewMode !== 'overview' && (
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d === selectedDate;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {formatEventDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}
            </button>
          );
        })}
      </div>
      )}

      {viewMode === 'overview' ? (
        <CampOverviewDashboard
          event={event}
          riders={riders}
          onOpenDaily={(date) => {
            if (date) setSelectedDate(date);
            setViewMode('daily');
          }}
          onOpenTests={() => setViewMode('tests')}
          onOpenAthlete={(riderId) => setSelectedRiderId(riderId)}
        />
      ) : viewMode === 'tests' ? (
        <CampTestsPanel
          riders={riders}
          date={selectedDate}
          tests={event.campAthleteTests || []}
          readOnly={readOnly}
          lockedRiderId={lockedRiderId}
          onChange={async (next) => {
            setSaving(true);
            try {
              await updateEvent({ campAthleteTests: next });
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : (
        <>
          {!lockedRiderId && !altitude && !heat && showColumnPicker && (
            <CampMonitorColumnPicker
              config={event.campMonitoringConfig}
              visibleMetrics={visibleColumns}
              disabled={readOnly}
              onChange={(next) => void saveMonitoringConfig(next)}
            />
          )}

      {riders.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Aucun athlète sélectionné sur ce stage. Ajoutez des participants pour saisir le suivi.
        </p>
      ) : lockedRiderId && riders[0] ? (
        <AthleteCampDailyForm
          rider={riders[0]}
          event={event}
          selectedDate={selectedDate}
          visibleColumns={visibleColumns}
          readOnly={readOnly}
          onPatch={(patch) => void patchMetric(riders[0].id, patch)}
          onOpenCharts={() => setSelectedRiderId(lockedRiderId)}
          onOpenNotes={() => setDraftNotesRiderId(riders[0].id)}
        />
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2.5 font-semibold min-w-[9rem]">
                  Athlète
                </th>
                {visibleHeaders.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2.5 font-semibold whitespace-nowrap text-center"
                    title={
                      col.key === 'urineSpecificGravity'
                        ? 'Densité spécifique urinaire (USG) — réfractomètre optique ou digital. Référence eau distillée = 1.000. ≤1.010 bien hydraté · 1.010–1.020 OK · >1.020 vigilance · >1.025 déshydratation.'
                        : undefined
                    }
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {riders.map((rider) => {
                const m = findCampMetric(metrics, rider.id, selectedDate);
                const spo2Level = spo2AlertLevel(m?.spo2Percent);
                const athleteRef = findAthleteAltitudeRef(event.campAthleteAltitudeRefs, rider.id);
                const resolvedAlt = resolveAthleteReferenceAltitude(event, rider.id, m);
                const dailyAltOverride =
                  m?.referenceAltitudeMeters !== undefined && m?.referenceAltitudeMeters !== null;
                return (
                  <tr key={rider.id} className="hover:bg-sky-50/40">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedRiderId(rider.id)}
                        className="text-left text-sky-700 hover:text-sky-900 hover:underline font-semibold"
                        title="Ouvrir le suivi graphique"
                      >
                        {rider.firstName} {rider.lastName}
                      </button>
                      {athleteRef?.hypoxicSetup && athleteRef.hypoxicSetup !== 'natural' && (
                        <span className="block text-[10px] text-violet-600 font-normal mt-0.5">
                          {HYPOXIC_SETUP_LABELS[athleteRef.hypoxicSetup]}
                          {athleteRef.referenceAltitudeMeters != null
                            ? ` · ${athleteRef.referenceAltitudeMeters} m`
                            : ''}
                        </span>
                      )}
                      {athleteRef?.heatSetup && athleteRef.heatSetup !== 'none' && (
                        <span className="block text-[10px] text-orange-700 font-normal mt-0.5">
                          {HEAT_SETUP_LABELS[athleteRef.heatSetup]}
                          {athleteRef.heatTargetTemperatureC != null
                            ? ` · ${athleteRef.heatTargetTemperatureC} °C`
                            : ''}
                          {athleteRef.heatExposureMinutes != null
                            ? ` · ${athleteRef.heatExposureMinutes} min`
                            : ''}
                        </span>
                      )}
                      {lockedRiderId && (
                        <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                          Graphiques →
                        </span>
                      )}
                    </td>
                    {show('referenceAltitudeMeters') && (
                    <td className="px-1 py-1" key={`${rider.id}_alt_${selectedDate}`}>
                      <input
                        type="number"
                        step={50}
                        disabled={readOnly}
                        defaultValue={
                          dailyAltOverride ? m?.referenceAltitudeMeters ?? '' : ''
                        }
                        placeholder={resolvedAlt != null ? String(resolvedAlt) : '—'}
                        title={
                          dailyAltOverride
                            ? 'Altitude du jour (override)'
                            : resolvedAlt != null
                              ? `Référence : ${resolvedAlt} m (modifiable pour ce jour)`
                              : 'Altitude équivalente tente / chambre (m)'
                        }
                        onBlur={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            void patchMetric(rider.id, { referenceAltitudeMeters: undefined });
                            return;
                          }
                          const n = parseFloat(raw.replace(',', '.'));
                          if (Number.isNaN(n)) return;
                          void patchMetric(rider.id, { referenceAltitudeMeters: n });
                        }}
                        className={`${inputCls} ${
                          dailyAltOverride
                            ? 'bg-violet-50 border-violet-300'
                            : 'bg-white border-gray-200'
                        }`}
                      />
                    </td>
                    )}
                    {(
                      [
                        ['ambientTemperatureC', m?.ambientTemperatureC],
                        ['heatExposureMinutes', m?.heatExposureMinutes],
                      ] as [CampMonitorColumnKey & NumericField, number | undefined][]
                    )
                      .filter(([field]) => show(field))
                      .map(([field, value]) => (
                        <td key={`${rider.id}_${field}_${selectedDate}`} className="px-1 py-1">
                          <input
                            type="number"
                            step={field === 'ambientTemperatureC' ? 0.5 : 1}
                            disabled={readOnly}
                            defaultValue={value ?? ''}
                            placeholder={
                              field === 'ambientTemperatureC'
                                ? meta?.targetTemperatureC != null
                                  ? String(meta.targetTemperatureC)
                                  : '°C'
                                : meta?.heatSessionMinutes != null
                                  ? String(meta.heatSessionMinutes)
                                  : 'min'
                            }
                            onBlur={(e) => setNumeric(rider.id, field, e.target.value)}
                            className={`${inputCls} ${
                              field === 'ambientTemperatureC' || field === 'heatExposureMinutes'
                                ? 'bg-orange-50/50 border-orange-200'
                                : alertClass()
                            }`}
                            title={
                              field === 'ambientTemperatureC'
                                ? 'Température ambiante / chambre (°C)'
                                : 'Exposition chaleur du jour (min)'
                            }
                          />
                        </td>
                      ))}
                    {(
                      [
                        ['hrvMs', m?.hrvMs],
                        ['restingHrBpm', m?.restingHrBpm],
                        ['spo2Percent', m?.spo2Percent],
                        ['weightKg', m?.weightKg],
                        ['hydrationLiters', m?.hydrationLiters],
                      ] as [NumericField & CampMonitorColumnKey, number | undefined][]
                    )
                      .filter(([field]) => show(field))
                      .map(([field, value]) => {
                      const highlight =
                        field === 'spo2Percent' ? alertClass(spo2Level) : alertClass();
                      return (
                        <td key={`${rider.id}_${field}_${selectedDate}`} className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            disabled={readOnly}
                            defaultValue={value ?? ''}
                            onBlur={(e) => setNumeric(rider.id, field, e.target.value)}
                            className={`${inputCls} ${highlight}`}
                          />
                        </td>
                      );
                    })}
                    {show('urineColor') && (
                    <td className="px-1 py-1 align-middle" key={`${rider.id}_urine_${selectedDate}`}>
                      <UrineColorPicker
                        value={m?.urineColor}
                        disabled={readOnly}
                        compact
                        onChange={(next) => void patchMetric(rider.id, { urineColor: next })}
                      />
                    </td>
                    )}
                    {show('urineSpecificGravity') && (
                    <td className="px-1 py-1" key={`${rider.id}_usg_${selectedDate}`}>
                      <input
                        type="number"
                        step={0.001}
                        min={1}
                        max={1.05}
                        disabled={readOnly}
                        defaultValue={m?.urineSpecificGravity ?? ''}
                        onBlur={(e) =>
                          setNumeric(rider.id, 'urineSpecificGravity', e.target.value)
                        }
                        placeholder="1.xxx"
                        title={
                          m?.urineSpecificGravity != null
                            ? `USG ${m.urineSpecificGravity.toFixed(3)} — ${
                                usgStatusLabel(m.urineSpecificGravity) || ''
                              }`
                            : 'Densité spécifique (USG) — réfractomètre · eau distillée = 1.000 · ≤1.010 bien hydraté · >1.020 vigilance · >1.025 déshydratation'
                        }
                        className={`${inputCls} min-w-[4.25rem] ${alertClass(
                          usgAlertLevel(m?.urineSpecificGravity),
                        )}`}
                      />
                    </td>
                    )}
                    {show('sleepHours') && (
                    <td className="px-1 py-1" key={`${rider.id}_sleepHours_${selectedDate}`}>
                      <input
                        type="number"
                        step="any"
                        disabled={readOnly}
                        defaultValue={m?.sleepHours ?? ''}
                        onBlur={(e) => setNumeric(rider.id, 'sleepHours', e.target.value)}
                        className={`${inputCls} ${alertClass()}`}
                        placeholder="h"
                        title="Heures de sommeil"
                      />
                    </td>
                    )}
                    {(
                      [
                        'sleepQuality',
                        'fatigue',
                        'mood',
                        'muscleSoreness',
                      ] as WellnessScaleKey[]
                    )
                      .filter((field) => show(field))
                      .map((field) => (
                      <td key={`${rider.id}_${field}_${selectedDate}`} className="px-1 py-1 align-middle">
                        <WellnessScalePicker
                          scale={field}
                          value={m?.[field]}
                          disabled={readOnly}
                          onChange={(next) => void patchMetric(rider.id, { [field]: next })}
                        />
                      </td>
                    ))}
                    {show('headache') && (
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={Boolean(m?.headache)}
                        onChange={(e) =>
                          void patchMetric(rider.id, { headache: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-sky-600"
                        title="Céphalées"
                      />
                    </td>
                    )}
                    {show('appetite') && (
                    <td className="px-1 py-1 align-middle" key={`${rider.id}_appetite_${selectedDate}`}>
                      <WellnessScalePicker
                        scale="appetite"
                        value={m?.appetite}
                        disabled={readOnly}
                        onChange={(next) => void patchMetric(rider.id, { appetite: next })}
                      />
                    </td>
                    )}
                    {show('sessionType') && (
                    <td className="px-1 py-1 min-w-[7rem]">
                      <select
                        disabled={readOnly}
                        value={m?.sessionType || ''}
                        onChange={(e) =>
                          void patchMetric(rider.id, {
                            sessionType: (e.target.value || undefined) as
                              | StageCampSessionType
                              | undefined,
                          })
                        }
                        className={inputCls}
                      >
                        <option value="">—</option>
                        {(Object.keys(STAGE_SESSION_TYPE_LABELS) as StageCampSessionType[]).map(
                          (k) => (
                            <option key={k} value={k}>
                              {STAGE_SESSION_TYPE_LABELS[k]}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    )}
                    {show('trainingLoad') && (
                    <td className="px-1 py-1" key={`${rider.id}_load_${selectedDate}`}>
                      <input
                        type="number"
                        disabled={readOnly}
                        defaultValue={m?.trainingLoad ?? ''}
                        onBlur={(e) => setNumeric(rider.id, 'trainingLoad', e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    )}
                    {show('rpe') && (
                    <td className="px-1 py-1" key={`${rider.id}_rpe_${selectedDate}`}>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        disabled={readOnly}
                        defaultValue={m?.rpe ?? ''}
                        onBlur={(e) => setNumeric(rider.id, 'rpe', e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    )}
                    {show('notes') && (
                    <td className="px-1 py-1">
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setDraftNotesRiderId((prev) =>
                            prev === rider.id ? null : rider.id,
                          )
                        }
                      >
                        {m?.coachNotes || m?.sessionNotes ? 'Voir' : 'Saisir'}
                      </ActionButton>
                    </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {draftNotesRiderId && (
        <div className="border border-sky-200 rounded-xl bg-sky-50/50 p-4 space-y-3">
          {(() => {
            const rider = riders.find((r) => r.id === draftNotesRiderId);
            const m = findCampMetric(metrics, draftNotesRiderId, selectedDate);
            if (!rider) return null;
            return (
              <>
                <h4 className="text-sm font-semibold text-gray-800">
                  Notes — {rider.firstName} {rider.lastName} ·{' '}
                  {formatEventDate(selectedDate, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notes séance / athlète
                  </label>
                  <textarea
                    disabled={readOnly}
                    rows={2}
                    defaultValue={m?.sessionNotes || ''}
                    key={`session_${draftNotesRiderId}_${selectedDate}_${m?.sessionNotes || ''}`}
                    onBlur={(e) =>
                      void patchMetric(draftNotesRiderId, { sessionNotes: e.target.value })
                    }
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
                    placeholder="Ressenti séance, symptômes, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notes coach
                  </label>
                  <textarea
                    disabled={readOnly}
                    rows={2}
                    defaultValue={m?.coachNotes || ''}
                    key={`coach_${draftNotesRiderId}_${selectedDate}_${m?.coachNotes || ''}`}
                    onBlur={(e) =>
                      void patchMetric(draftNotesRiderId, { coachNotes: e.target.value })
                    }
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
                    placeholder="Décision charge lendemain, vigilance altitude…"
                  />
                </div>
                <div className="flex justify-end">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setDraftNotesRiderId(null)}
                  >
                    Fermer
                  </ActionButton>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        {lockedRiderId
          ? altitude
            ? 'Repères SpO₂ : ≤ 91 % vigilance, ≤ 87 % alerte (contexte altitude — pas un diagnostic médical). Urine ≥ 4 / USG > 1.020 : hydratation à renforcer. Les tests se saisissent dans l’onglet Tests.'
            : heat
              ? 'Protocole chaleur : surveillez USG, poids, FC repos et céphalées. Les tests se saisissent dans l’onglet Tests.'
              : 'Les tests (puissance, lactate…) se saisissent dans l’onglet Tests. Utilisez « Voir mon suivi graphique » pour l’évolution sur le stage.'
          : altitude
            ? 'Repères indicatifs SpO₂ : ≤ 91 % vigilance, ≤ 87 % alerte (contexte altitude — pas un diagnostic médical). Urine ≥ 4 / USG > 1.020 : hydratation à renforcer. Cliquez le nom d’un athlète pour les graphiques.'
            : heat
              ? 'Protocole chaleur : surveillez USG, poids, FC repos et céphalées. Hydratation + sodium prioritaires. Cliquez le nom d’un athlète pour les graphiques.'
              : 'Configurez les colonnes via « Choisir les données ». Les tests (puissance, lactate, custom) se saisissent dans l’onglet Tests. Cliquez le nom d’un athlète pour les graphiques.'}
      </p>
        </>
      )}
    </div>
  );
};

export default StageCampMonitoringTab;

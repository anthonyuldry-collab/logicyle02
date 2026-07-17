import React from 'react';
import {
  CampMonitorColumnKey,
  RaceEvent,
  Rider,
  StageCampSessionType,
  StageDayAthleteMetrics,
} from '../types';
import ActionButton from './ActionButton';
import UrineColorPicker from './UrineColorPicker';
import WellnessScalePicker from './WellnessScalePicker';
import {
  CAMP_MONITOR_COLUMN_CATALOG,
  findAthleteAltitudeRef,
  findCampMetric,
  HEAT_SETUP_LABELS,
  HYPOXIC_SETUP_LABELS,
  resolveAthleteReferenceAltitude,
  spo2AlertLevel,
  STAGE_SESSION_TYPE_LABELS,
  usgAlertLevel,
  usgStatusLabel,
  WellnessScaleKey,
} from '../utils/trainingCampUtils';
import { formatEventDate } from '../utils/dateUtils';

type NumericField =
  | 'referenceAltitudeMeters'
  | 'ambientTemperatureC'
  | 'heatExposureMinutes'
  | 'hrvMs'
  | 'restingHrBpm'
  | 'spo2Percent'
  | 'weightKg'
  | 'hydrationLiters'
  | 'urineSpecificGravity'
  | 'sleepHours'
  | 'trainingLoad'
  | 'rpe';

const GROUP_META: Record<
  'altitude' | 'heat' | 'physio' | 'hydration' | 'wellness' | 'session',
  { title: string; subtitle: string }
> = {
  altitude: { title: 'Altitude', subtitle: 'Référence du jour' },
  heat: { title: 'Chaleur', subtitle: 'Exposition & température' },
  physio: { title: 'Physiologie', subtitle: 'Matin / récupération' },
  hydration: { title: 'Hydratation', subtitle: 'Liquides & urine' },
  wellness: { title: 'Bien-être', subtitle: 'Sommeil & ressenti' },
  session: { title: 'Séance', subtitle: 'Charge & notes' },
};

const GROUP_ORDER = [
  'physio',
  'hydration',
  'wellness',
  'session',
  'altitude',
  'heat',
] as const;

function alertClass(level?: 'ok' | 'watch' | 'alert'): string {
  if (level === 'alert') return 'bg-red-950 border-red-500/50 text-red-100';
  if (level === 'watch') return 'bg-amber-950 border-amber-500/50 text-amber-100';
  return 'bg-slate-950 border-white/20 text-white';
}

function catalogLabel(key: CampMonitorColumnKey): string {
  return CAMP_MONITOR_COLUMN_CATALOG.find((c) => c.key === key)?.label || key;
}

const FieldShell: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, children, className = '' }) => (
  <label className={`block min-w-0 ${className}`}>
    <span className="block text-xs font-semibold text-slate-200 mb-1.5">{label}</span>
    {children}
    {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
  </label>
);

interface AthleteCampDailyFormProps {
  rider: Rider;
  event: RaceEvent;
  selectedDate: string;
  visibleColumns: CampMonitorColumnKey[];
  readOnly?: boolean;
  onPatch: (patch: Partial<StageDayAthleteMetrics>) => void;
  onOpenCharts?: () => void;
  onOpenNotes?: () => void;
}

const AthleteCampDailyForm: React.FC<AthleteCampDailyFormProps> = ({
  rider,
  event,
  selectedDate,
  visibleColumns,
  readOnly = false,
  onPatch,
  onOpenCharts,
  onOpenNotes,
}) => {
  const m = findCampMetric(event.campAthleteDailyMetrics || [], rider.id, selectedDate);
  const show = (key: CampMonitorColumnKey) => visibleColumns.includes(key);
  const athleteRef = findAthleteAltitudeRef(event.campAthleteAltitudeRefs, rider.id);
  const resolvedAlt = resolveAthleteReferenceAltitude(event, rider.id, m);
  const dailyAltOverride =
    m?.referenceAltitudeMeters !== undefined && m?.referenceAltitudeMeters !== null;

  const setNumeric = (field: NumericField, raw: string) => {
    if (raw === '') {
      onPatch({ [field]: undefined });
      return;
    }
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isNaN(n)) return;
    onPatch({ [field]: n });
  };

  const fieldCls =
    'w-full px-3 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500';

  const renderNumeric = (
    field: NumericField & CampMonitorColumnKey,
    value: number | undefined,
    opts?: {
      step?: number | string;
      min?: number;
      max?: number;
      placeholder?: string;
      title?: string;
      highlight?: 'ok' | 'watch' | 'alert';
      hint?: string;
      wide?: boolean;
    },
  ) => {
    if (!show(field)) return null;
    return (
      <FieldShell
        key={field}
        label={catalogLabel(field)}
        hint={opts?.hint}
        className={opts?.wide ? 'sm:col-span-2' : ''}
      >
        <input
          type="number"
          step={opts?.step ?? 'any'}
          min={opts?.min}
          max={opts?.max}
          disabled={readOnly}
          defaultValue={value ?? ''}
          placeholder={opts?.placeholder}
          title={opts?.title}
          onBlur={(e) => setNumeric(field, e.target.value)}
          className={`${fieldCls} ${alertClass(opts?.highlight)}`}
        />
      </FieldShell>
    );
  };

  const buildFields = (
    group: (typeof GROUP_ORDER)[number],
  ): React.ReactNode[] => {
    const fields: React.ReactNode[] = [];

    if (group === 'altitude' && show('referenceAltitudeMeters')) {
      fields.push(
        <FieldShell
          key="referenceAltitudeMeters"
          label="Altitude de référence (m)"
          hint={
            dailyAltOverride
              ? 'Valeur du jour (override)'
              : resolvedAlt != null
                ? `Réf. profil : ${resolvedAlt} m — modifiable pour ce jour`
                : 'Altitude équivalente tente / chambre'
          }
          className="sm:col-span-2"
        >
          <input
            type="number"
            step={50}
            disabled={readOnly}
            defaultValue={dailyAltOverride ? m?.referenceAltitudeMeters ?? '' : ''}
            placeholder={resolvedAlt != null ? String(resolvedAlt) : '—'}
            onBlur={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onPatch({ referenceAltitudeMeters: undefined });
                return;
              }
              const n = parseFloat(raw.replace(',', '.'));
              if (Number.isNaN(n)) return;
              onPatch({ referenceAltitudeMeters: n });
            }}
            className={`${fieldCls} ${
              dailyAltOverride
                ? 'bg-violet-950 border-violet-500/50 text-violet-100'
                : alertClass()
            }`}
          />
        </FieldShell>,
      );
    }

    if (group === 'heat') {
      fields.push(
        renderNumeric('ambientTemperatureC', m?.ambientTemperatureC, {
          step: 0.5,
          placeholder: '°C',
        }),
        renderNumeric('heatExposureMinutes', m?.heatExposureMinutes, {
          step: 1,
          placeholder: 'min',
        }),
      );
    }

    if (group === 'physio') {
      fields.push(
        renderNumeric('hrvMs', m?.hrvMs, { placeholder: 'ms' }),
        renderNumeric('restingHrBpm', m?.restingHrBpm, { placeholder: 'bpm' }),
        renderNumeric('spo2Percent', m?.spo2Percent, {
          step: 1,
          min: 70,
          max: 100,
          placeholder: '%',
          highlight: spo2AlertLevel(m?.spo2Percent),
        }),
        renderNumeric('weightKg', m?.weightKg, { step: 0.1, placeholder: 'kg' }),
      );
    }

    if (group === 'hydration') {
      fields.push(
        renderNumeric('hydrationLiters', m?.hydrationLiters, {
          step: 0.1,
          placeholder: 'L',
        }),
      );
      if (show('urineColor')) {
        fields.push(
          <FieldShell key="urineColor" label="Couleur urine">
            <UrineColorPicker
              value={m?.urineColor}
              disabled={readOnly}
              compact={false}
              onChange={(next) => onPatch({ urineColor: next })}
            />
          </FieldShell>,
        );
      }
      fields.push(
        renderNumeric('urineSpecificGravity', m?.urineSpecificGravity, {
          step: 0.001,
          min: 1,
          max: 1.05,
          placeholder: '1.xxx',
          highlight: usgAlertLevel(m?.urineSpecificGravity),
          hint:
            m?.urineSpecificGravity != null
              ? `USG ${m.urineSpecificGravity.toFixed(3)}${
                  usgStatusLabel(m.urineSpecificGravity)
                    ? ` — ${usgStatusLabel(m.urineSpecificGravity)}`
                    : ''
                }`
              : '≤1.010 bien hydraté · >1.020 vigilance',
        }),
      );
    }

    if (group === 'wellness') {
      fields.push(
        renderNumeric('sleepHours', m?.sleepHours, {
          step: 0.25,
          placeholder: 'h',
        }),
      );
      (
        [
          'sleepQuality',
          'fatigue',
          'mood',
          'muscleSoreness',
          'appetite',
        ] as WellnessScaleKey[]
      ).forEach((scale) => {
        if (!show(scale)) return;
        fields.push(
          <div key={scale} className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-200 mb-1.5">
              {catalogLabel(scale)}
            </span>
            <WellnessScalePicker
              scale={scale}
              value={m?.[scale]}
              disabled={readOnly}
              variant="segmented"
              onChange={(next) => onPatch({ [scale]: next })}
            />
          </div>,
        );
      });
      if (show('headache')) {
        fields.push(
          <label
            key="headache"
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-slate-800 px-3 py-3 sm:col-span-2"
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={Boolean(m?.headache)}
              onChange={(e) => onPatch({ headache: e.target.checked })}
              className="h-5 w-5 rounded border-gray-300 text-sky-600"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                Céphalées
              </span>
              <span className="block text-[11px] text-slate-300">
                Cocher si maux de tête aujourd’hui
              </span>
            </span>
          </label>,
        );
      }
    }

    if (group === 'session') {
      if (show('sessionType')) {
        fields.push(
          <FieldShell key="sessionType" label="Type de séance" className="sm:col-span-2">
            <select
              disabled={readOnly}
              value={m?.sessionType || ''}
              onChange={(e) =>
                onPatch({
                  sessionType: (e.target.value || undefined) as
                    | StageCampSessionType
                    | undefined,
                })
              }
              className={fieldCls}
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
          </FieldShell>,
        );
      }
      fields.push(
        renderNumeric('trainingLoad', m?.trainingLoad, { placeholder: 'TSS / AU' }),
        renderNumeric('rpe', m?.rpe, { min: 1, max: 10, step: 1, placeholder: '1–10' }),
      );
      if (show('notes')) {
        fields.push(
          <div key="notes" className="sm:col-span-2">
            <span className="block text-xs font-semibold text-slate-200 mb-1.5">
              Notes
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onOpenNotes?.()}
              >
                {m?.coachNotes || m?.sessionNotes ? 'Voir / modifier' : 'Saisir des notes'}
              </ActionButton>
              {(m?.sessionNotes || m?.coachNotes) && (
                <span className="text-[11px] text-slate-400 truncate max-w-[16rem]">
                  {m.sessionNotes || m.coachNotes}
                </span>
              )}
            </div>
          </div>,
        );
      }
    }

    return fields.filter(Boolean);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-500/30 bg-slate-900 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">
            {rider.firstName} {rider.lastName}
          </p>
          <p className="text-sm text-slate-300 mt-0.5 capitalize">
            {formatEventDate(selectedDate, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {(athleteRef?.hypoxicSetup && athleteRef.hypoxicSetup !== 'natural') ||
          (athleteRef?.heatSetup && athleteRef.heatSetup !== 'none') ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {athleteRef?.hypoxicSetup && athleteRef.hypoxicSetup !== 'natural' && (
                <span className="text-[11px] text-violet-200 bg-violet-950 border border-violet-500/40 rounded-lg px-2 py-0.5">
                  {HYPOXIC_SETUP_LABELS[athleteRef.hypoxicSetup]}
                  {athleteRef.referenceAltitudeMeters != null
                    ? ` · ${athleteRef.referenceAltitudeMeters} m`
                    : ''}
                </span>
              )}
              {athleteRef?.heatSetup && athleteRef.heatSetup !== 'none' && (
                <span className="text-[11px] text-orange-200 bg-orange-950 border border-orange-500/40 rounded-lg px-2 py-0.5">
                  {HEAT_SETUP_LABELS[athleteRef.heatSetup]}
                </span>
              )}
            </div>
          ) : null}
        </div>
        {onOpenCharts && (
          <ActionButton type="button" variant="primary" size="sm" onClick={onOpenCharts}>
            Voir mon suivi graphique
          </ActionButton>
        )}
      </div>

      <div className="space-y-3">
        {GROUP_ORDER.map((group) => {
          const cleanFields = buildFields(group);
          if (cleanFields.length === 0) return null;
          const meta = GROUP_META[group];
          return (
            <section
              key={group}
              className="rounded-2xl border border-white/15 bg-slate-900 overflow-hidden"
            >
              <header className="px-4 py-3 border-b border-white/10 bg-slate-800">
                <h4 className="text-sm font-semibold text-white">{meta.title}</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">{meta.subtitle}</p>
              </header>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cleanFields}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default AthleteCampDailyForm;

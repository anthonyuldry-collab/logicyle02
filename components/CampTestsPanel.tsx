import React, { useMemo, useState } from 'react';
import {
  CampAthleteTest,
  CampTestType,
  Rider,
} from '../types';
import {
  CAMP_TEST_TYPE_LABELS,
  removeCampTest,
  testsForDay,
  upsertCampTest,
} from '../utils/trainingCampUtils';
import ActionButton from './ActionButton';

interface CampTestsPanelProps {
  riders: Rider[];
  date: string;
  tests: CampAthleteTest[];
  onChange: (next: CampAthleteTest[]) => void | Promise<void>;
  readOnly?: boolean;
  lockedRiderId?: string;
}

const PROTOCOL_KIND_LABELS: Record<NonNullable<CampAthleteTest['protocolKind']>, string> = {
  continuous: 'Continu',
  steps: 'Paliers',
  other: 'Autre',
};

function splitDuration(totalSec?: number): { min: number; sec: number } {
  if (totalSec === undefined || totalSec === null || Number.isNaN(totalSec) || totalSec < 0) {
    return { min: 0, sec: 0 };
  }
  const whole = Math.round(totalSec);
  return { min: Math.floor(whole / 60), sec: whole % 60 };
}

function joinDuration(min: number, sec: number): number | undefined {
  const m = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0;
  const s = Number.isFinite(sec) ? Math.max(0, Math.min(59, Math.floor(sec))) : 0;
  const total = m * 60 + s;
  return total > 0 ? total : undefined;
}

export function formatDurationMinSec(totalSec?: number): string {
  if (totalSec === undefined || totalSec === null || Number.isNaN(totalSec)) return '';
  const { min, sec } = splitDuration(totalSec);
  if (min === 0) return `${sec} s`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec.toString().padStart(2, '0')} s`;
}

const DurationMinSecInput: React.FC<{
  label: string;
  totalSec?: number;
  onChange: (totalSec: number | undefined) => void;
  inputCls: string;
  title?: string;
}> = ({ label, totalSec, onChange, inputCls, title }) => {
  const { min, sec } = splitDuration(totalSec);
  const hasValue = totalSec != null && totalSec > 0;
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1" title={title}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={hasValue || min > 0 ? min : ''}
          onChange={(e) => {
            const nextMin = e.target.value === '' ? 0 : Number(e.target.value);
            onChange(joinDuration(nextMin, sec));
          }}
          className={`${inputCls} w-14`}
          placeholder="min"
          title="Minutes"
        />
        <span className="text-[10px] text-gray-400 font-medium">min</span>
        <input
          type="number"
          min={0}
          max={59}
          value={hasValue || sec > 0 ? sec : ''}
          onChange={(e) => {
            const nextSec = e.target.value === '' ? 0 : Number(e.target.value);
            onChange(joinDuration(min, nextSec));
          }}
          className={`${inputCls} w-14`}
          placeholder="s"
          title="Secondes"
        />
        <span className="text-[10px] text-gray-400 font-medium">s</span>
      </div>
    </div>
  );
};

const emptyDraft = (riderId: string, date: string): Omit<CampAthleteTest, 'id'> => ({
  riderId,
  date,
  testType: 'power',
  label: 'PMA / test puissance',
  protocolKind: 'continuous',
});

const CampTestsPanel: React.FC<CampTestsPanelProps> = ({
  riders,
  date,
  tests,
  onChange,
  readOnly = false,
  lockedRiderId,
}) => {
  const [draft, setDraft] = useState<Omit<CampAthleteTest, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const dayTests = useMemo(() => {
    const list = testsForDay(tests, date, lockedRiderId);
    return list.sort((a, b) => {
      const ra = riders.find((r) => r.id === a.riderId);
      const rb = riders.find((r) => r.id === b.riderId);
      const na = ra ? `${ra.lastName} ${ra.firstName}` : a.riderId;
      const nb = rb ? `${rb.lastName} ${rb.firstName}` : b.riderId;
      return na.localeCompare(nb, 'fr') || a.label.localeCompare(b.label, 'fr');
    });
  }, [tests, date, lockedRiderId, riders]);

  const riderName = (id: string) => {
    const r = riders.find((x) => x.id === id);
    return r ? `${r.firstName} ${r.lastName}` : id;
  };

  const saveDraft = async () => {
    if (!draft || readOnly) return;
    if (!draft.riderId || !draft.label.trim()) return;
    const next = upsertCampTest(tests, {
      ...(editingId ? { id: editingId } : {}),
      ...draft,
      label: draft.label.trim(),
    });
    await onChange(next);
    setDraft(null);
    setEditingId(null);
  };

  const startEdit = (t: CampAthleteTest) => {
    setEditingId(t.id);
    const { id: _id, updatedAt: _u, ...rest } = t;
    setDraft(rest);
  };

  const inputCls =
    'w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">Tests du jour</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Puissance, lactate, terrain, labo ou protocole personnalisé (champs libres).
          </p>
        </div>
        {!readOnly && !draft && (
          <ActionButton
            type="button"
            size="sm"
            variant="primary"
            onClick={() =>
              setDraft(
                emptyDraft(
                  lockedRiderId || riders[0]?.id || '',
                  date,
                ),
              )
            }
            disabled={riders.length === 0}
          >
            + Ajouter un test
          </ActionButton>
        )}
      </div>

      {draft && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {!lockedRiderId && (
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  Athlète
                </label>
                <select
                  value={draft.riderId}
                  onChange={(e) => setDraft({ ...draft, riderId: e.target.value })}
                  className={inputCls}
                >
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.firstName} {r.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                Type
              </label>
              <select
                value={draft.testType}
                onChange={(e) => {
                  const testType = e.target.value as CampTestType;
                  const defaults: Record<CampTestType, string> = {
                    power: 'PMA / test puissance',
                    lactate: 'Profil lactate (LT1 / LT2)',
                    field: 'Test terrain',
                    lab: 'Test labo',
                    custom: 'Test personnalisé',
                  };
                  const defaultLabels = Object.values(defaults);
                  setDraft({
                    ...draft,
                    testType,
                    label: defaultLabels.includes(draft.label)
                      ? defaults[testType]
                      : draft.label || defaults[testType],
                    lactateClearanceUnit:
                      testType === 'lactate'
                        ? draft.lactateClearanceUnit || '%'
                        : draft.lactateClearanceUnit,
                    protocolKind:
                      testType === 'lactate' && !draft.protocolKind
                        ? 'steps'
                        : draft.protocolKind ||
                          (testType === 'power' ? 'continuous' : draft.protocolKind),
                  });
                }}
                className={inputCls}
              >
                {(Object.keys(CAMP_TEST_TYPE_LABELS) as CampTestType[]).map((k) => (
                  <option key={k} value={k}>
                    {CAMP_TEST_TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                Libellé du test
              </label>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className={inputCls}
                placeholder="Ex: PMA 5', Seuil 4 mmol, CMJ…"
              />
            </div>
          </div>

          {(draft.testType === 'power') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  Puissance (W)
                </label>
                <input
                  type="number"
                  value={draft.powerWatts ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      powerWatts: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <DurationMinSecInput
                label="Durée totale"
                totalSec={draft.durationSec}
                onChange={(durationSec) => setDraft({ ...draft, durationSec })}
                inputCls={inputCls}
                title="Durée du test (minutes + secondes)"
              />
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  NP (W)
                </label>
                <input
                  type="number"
                  value={draft.normalizedPower ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      normalizedPower:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  FC associée (bpm)
                </label>
                <input
                  type="number"
                  value={draft.heartRateBpm ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      heartRateBpm:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                  title="Fréquence cardiaque associée à la puissance mesurée"
                />
              </div>
            </div>
          )}

          {(draft.testType === 'power' ||
            draft.testType === 'lactate' ||
            draft.testType === 'field' ||
            draft.testType === 'lab') && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Protocole
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                    Type de protocole
                  </label>
                  <select
                    value={draft.protocolKind || 'continuous'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        protocolKind: e.target.value as CampAthleteTest['protocolKind'],
                      })
                    }
                    className={inputCls}
                  >
                    {(Object.keys(PROTOCOL_KIND_LABELS) as Array<
                      NonNullable<CampAthleteTest['protocolKind']>
                    >).map((k) => (
                      <option key={k} value={k}>
                        {PROTOCOL_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                {draft.testType !== 'power' && (
                  <DurationMinSecInput
                    label="Durée totale"
                    totalSec={draft.durationSec}
                    onChange={(durationSec) => setDraft({ ...draft, durationSec })}
                    inputCls={inputCls}
                  />
                )}
              </div>
              {(draft.protocolKind === 'steps' || draft.protocolKind === 'other') && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      Nb paliers
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={draft.stepCount ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          stepCount:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      placeholder="ex. 6"
                    />
                  </div>
                  <DurationMinSecInput
                    label="Durée palier"
                    totalSec={draft.stepDurationSec}
                    onChange={(stepDurationSec) => setDraft({ ...draft, stepDurationSec })}
                    inputCls={inputCls}
                    title="Durée de chaque palier"
                  />
                  <DurationMinSecInput
                    label="Récupération"
                    totalSec={draft.recoveryDurationSec}
                    onChange={(recoveryDurationSec) =>
                      setDraft({ ...draft, recoveryDurationSec })
                    }
                    inputCls={inputCls}
                    title="Durée de récupération entre paliers"
                  />
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      Incrément (W)
                    </label>
                    <input
                      type="number"
                      value={draft.stepIncrementWatts ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          stepIncrementWatts:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      placeholder="ex. 20"
                      title="Augmentation de puissance entre paliers"
                    />
                  </div>
                </div>
              )}
              {draft.protocolKind === 'steps' && (
                <p className="text-[10px] text-slate-500">
                  Ex. 6 × 3 min / récup 1 min · +20 W — précisez aussi le warm-up dans « Protocole /
                  conditions ».
                </p>
              )}
            </div>
          )}

          {draft.testType === 'lactate' && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                Profil lactate type labo/terrain : baseline → <strong>LT1 (AeT)</strong> →{' '}
                <strong>LT2 (AnT)</strong> avec puissance <em>et</em> FC associées, puis V̇La
                <sub>max</sub> / pic / clairance.
              </p>

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Baseline (repos)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      Lactate repos (mmol/L)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={draft.lactateRestMmol ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          lactateRestMmol:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      placeholder="ex. 1.2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      FC repos (bpm)
                    </label>
                    <input
                      type="number"
                      value={draft.restingHeartRateBpm ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          restingHeartRateBpm:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      placeholder="ex. 48"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    LT1 · seuil aérobie (AeT)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                        Lactate
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        value={draft.lt1Mmol ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            lt1Mmol: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={inputCls}
                        placeholder="mmol/L"
                        title="Souvent ~1,5–2,5 mmol/L selon méthode"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                        Puissance
                      </label>
                      <input
                        type="number"
                        value={draft.lt1PowerWatts ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            lt1PowerWatts:
                              e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={inputCls}
                        placeholder="W"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                        FC associée
                      </label>
                      <input
                        type="number"
                        value={draft.lt1HeartRateBpm ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            lt1HeartRateBpm:
                              e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={inputCls}
                        placeholder="bpm"
                        title="FC au moment du LT1"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    LT2 · seuil anaérobie (AnT)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                        Lactate
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        value={draft.lt2Mmol ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            lt2Mmol: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={inputCls}
                        placeholder="mmol/L"
                        title="Souvent ~3,5–4,5 mmol/L (méthode Dmax / OBLA / MLSS)"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                        Puissance
                      </label>
                      <input
                        type="number"
                        value={draft.lt2PowerWatts ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            lt2PowerWatts:
                              e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={inputCls}
                        placeholder="W"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                        FC associée
                      </label>
                      <input
                        type="number"
                        value={draft.lt2HeartRateBpm ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            lt2HeartRateBpm:
                              e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={inputCls}
                        placeholder="bpm"
                        title="FC au moment du LT2 — utile pour caler les zones"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-900">
                  Capacité glycolytique & récupération
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      V̇La<sub>max</sub>
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      value={draft.vlMax ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          vlMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      title="mmol·L⁻¹·s⁻¹ — production maximale"
                      placeholder="mmol/L/s"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      Lactate max
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={draft.lactateMmol ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          lactateMmol:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      title="Pic lactate du test"
                      placeholder="mmol/L"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      FC max
                    </label>
                    <input
                      type="number"
                      value={draft.heartRateBpm ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          heartRateBpm:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                      title="FC maximale atteinte pendant le test"
                      placeholder="bpm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      Clairance
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={draft.lactateClearance ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          lactateClearance:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      Unité clairance
                    </label>
                    <select
                      value={draft.lactateClearanceUnit || '%'}
                      onChange={(e) =>
                        setDraft({ ...draft, lactateClearanceUnit: e.target.value })
                      }
                      className={inputCls}
                    >
                      <option value="%">% (baisse)</option>
                      <option value="mmol/L/min">mmol/L/min</option>
                      <option value="mmol/L">mmol/L (Δ)</option>
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-500">
                Les FC LT1 / LT2 servent à caler les zones cardio. V̇La<sub>max</sub> + clairance
                renseignent le profil glycolytique (sprintabilité vs endurance).
              </p>
            </div>
          )}

          {(draft.testType === 'field' ||
            draft.testType === 'lab' ||
            draft.testType === 'custom') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  Valeur
                </label>
                <input
                  type="number"
                  step="any"
                  value={draft.value ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      value: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  Unité
                </label>
                <input
                  type="text"
                  value={draft.unit || ''}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                  className={inputCls}
                  placeholder="W, s, cm, mmol/L…"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  Puissance (W)
                </label>
                <input
                  type="number"
                  value={draft.powerWatts ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      powerWatts: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                  Lactate (mmol/L)
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={draft.lactateMmol ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lactateMmol:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                Protocole / conditions
              </label>
              <input
                type="text"
                value={draft.protocolNotes || ''}
                onChange={(e) => setDraft({ ...draft, protocolNotes: e.target.value })}
                className={inputCls}
                placeholder="Warm-up, altitude, matériel…"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                Notes résultat
              </label>
              <input
                type="text"
                value={draft.resultNotes || ''}
                onChange={(e) => setDraft({ ...draft, resultNotes: e.target.value })}
                className={inputCls}
                placeholder="Sensation, RPE, observation coach…"
              />
            </div>
          </div>

          {(draft.customFields || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase text-gray-500">
                Champs personnalisés
              </p>
              {(draft.customFields || []).map((cf, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={cf.key}
                    onChange={(e) => {
                      const customFields = [...(draft.customFields || [])];
                      customFields[idx] = { ...customFields[idx], key: e.target.value };
                      setDraft({ ...draft, customFields });
                    }}
                    className={inputCls}
                    placeholder="Nom du champ"
                  />
                  <input
                    type="text"
                    value={cf.value}
                    onChange={(e) => {
                      const customFields = [...(draft.customFields || [])];
                      customFields[idx] = { ...customFields[idx], value: e.target.value };
                      setDraft({ ...draft, customFields });
                    }}
                    className={inputCls}
                    placeholder="Valeur"
                  />
                  <button
                    type="button"
                    className="text-xs text-red-600 px-2"
                    onClick={() => {
                      const customFields = (draft.customFields || []).filter(
                        (_, i) => i !== idx,
                      );
                      setDraft({ ...draft, customFields });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  customFields: [...(draft.customFields || []), { key: '', value: '' }],
                })
              }
            >
              + Champ libre
            </ActionButton>
            <ActionButton type="button" size="sm" variant="primary" onClick={() => void saveDraft()}>
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </ActionButton>
            <ActionButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(null);
                setEditingId(null);
              }}
            >
              Annuler
            </ActionButton>
          </div>
        </div>
      )}

      {dayTests.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-6 text-center border border-dashed border-gray-200 rounded-xl">
          Aucun test saisi pour ce jour.
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Athlète</th>
                <th className="text-left px-3 py-2 font-semibold">Type</th>
                <th className="text-left px-3 py-2 font-semibold">Test</th>
                <th className="text-left px-3 py-2 font-semibold">Résultats</th>
                <th className="text-left px-3 py-2 font-semibold">Notes</th>
                {!readOnly && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dayTests.map((t) => (
                <tr key={t.id} className="hover:bg-sky-50/40">
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                    {riderName(t.riderId)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {CAMP_TEST_TYPE_LABELS[t.testType]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-800">{t.label}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {[
                      t.powerWatts != null ? `${t.powerWatts} W` : null,
                      t.normalizedPower != null ? `NP ${t.normalizedPower} W` : null,
                      t.durationSec != null ? formatDurationMinSec(t.durationSec) : null,
                      t.protocolKind === 'steps' || t.stepCount != null || t.stepDurationSec != null
                        ? [
                            t.protocolKind ? PROTOCOL_KIND_LABELS[t.protocolKind] : null,
                            t.stepCount != null ? `${t.stepCount} paliers` : null,
                            t.stepDurationSec != null
                              ? `palier ${formatDurationMinSec(t.stepDurationSec)}`
                              : null,
                            t.recoveryDurationSec != null
                              ? `récup ${formatDurationMinSec(t.recoveryDurationSec)}`
                              : null,
                            t.stepIncrementWatts != null ? `+${t.stepIncrementWatts} W` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || null
                        : t.protocolKind && t.protocolKind !== 'continuous'
                          ? PROTOCOL_KIND_LABELS[t.protocolKind]
                          : null,
                      t.lt1Mmol != null || t.lt1PowerWatts != null || t.lt1HeartRateBpm != null
                        ? `LT1 ${[
                            t.lt1Mmol != null ? `${t.lt1Mmol} mmol` : null,
                            t.lt1PowerWatts != null ? `${t.lt1PowerWatts} W` : null,
                            t.lt1HeartRateBpm != null ? `${t.lt1HeartRateBpm} bpm` : null,
                          ]
                            .filter(Boolean)
                            .join(' / ')}`
                        : null,
                      t.lt2Mmol != null || t.lt2PowerWatts != null || t.lt2HeartRateBpm != null
                        ? `LT2 ${[
                            t.lt2Mmol != null ? `${t.lt2Mmol} mmol` : null,
                            t.lt2PowerWatts != null ? `${t.lt2PowerWatts} W` : null,
                            t.lt2HeartRateBpm != null ? `${t.lt2HeartRateBpm} bpm` : null,
                          ]
                            .filter(Boolean)
                            .join(' / ')}`
                        : null,
                      t.lactateRestMmol != null ? `Repos ${t.lactateRestMmol} mmol` : null,
                      t.vlMax != null ? `V̇Lamax ${t.vlMax}` : null,
                      t.lactateClearance != null
                        ? `Clairance ${t.lactateClearance}${t.lactateClearanceUnit ? ` ${t.lactateClearanceUnit}` : ''}`
                        : null,
                      t.lactateMmol != null ? `Lac. max ${t.lactateMmol} mmol/L` : null,
                      t.heartRateBpm != null
                        ? t.testType === 'lactate'
                          ? `FC max ${t.heartRateBpm} bpm`
                          : `${t.heartRateBpm} bpm`
                        : null,
                      t.restingHeartRateBpm != null
                        ? `FC repos ${t.restingHeartRateBpm} bpm`
                        : null,
                      t.value != null
                        ? `${t.value}${t.unit ? ` ${t.unit}` : ''}`
                        : null,
                      ...(t.customFields || [])
                        .filter((c) => c.key)
                        .map((c) => `${c.key}: ${c.value}`),
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-[14rem] truncate">
                    {[t.protocolNotes, t.resultNotes].filter(Boolean).join(' — ') || '—'}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        type="button"
                        className="text-sky-700 hover:underline mr-2"
                        onClick={() => startEdit(t)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => void onChange(removeCampTest(tests, t.id))}
                      >
                        Suppr.
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CampTestsPanel;

import React, { useMemo } from 'react';
import { BikeSetup } from '../../types';
import { BIKE_SETUP_COTES_FIELDS, BIKE_SETUP_TT_COTES_FIELDS, BIKE_SETUP_SPECIFIC_FIELDS } from '../../constants';
import { BIKE_SETUP_META, BikeSetupKey, WEAR_COMPONENTS, ensureBikeWear, defaultWearItem } from '../../utils/bikeWearUtils';
import { checkUciTtCompliance, checkUciRoadCompliance } from '../../utils/uciBikeFitUtils';
import WearProgressCard from './WearProgressCard';
import BikeFitDiagram from './BikeFitDiagram';
import BikeFitTtDiagram from './BikeFitTtDiagram';
import { UciTtCompliancePanel, UciRoadCompliancePanel } from './UciComplianceAlerts';
import TirePressureQuickEntry from './TirePressureQuickEntry';

interface BikeFitPanelProps {
  bikeKey: BikeSetupKey;
  setup: BikeSetup;
  onChange: (setup: BikeSetup) => void;
  editable?: boolean;
  showWear?: boolean;
  wearOnly?: boolean;
  heightCm?: number;
}

const BikeFitPanel: React.FC<BikeFitPanelProps> = ({
  bikeKey,
  setup,
  onChange,
  editable = true,
  showWear = true,
  wearOnly = false,
  heightCm,
}) => {
  const meta = BIKE_SETUP_META[bikeKey];
  const isTt = bikeKey === 'ttBikeSetup';
  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const labelClass = 'text-xs font-medium text-gray-500 mb-1';
  const coteFields = isTt ? BIKE_SETUP_TT_COTES_FIELDS : BIKE_SETUP_COTES_FIELDS;

  const updateField = (path: 'brand' | 'model' | 'size' | 'groupset' | 'wheels' | 'year', value: string) => {
    onChange({ ...setup, [path]: value });
  };

  const updateSpecific = (key: string, value: string) => {
    onChange({ ...setup, specifics: { ...setup.specifics, [key]: value } });
  };

  const updateCote = (key: string, value: string) => {
    onChange({ ...setup, cotes: { ...setup.cotes, [key]: value } });
  };

  const wear = ensureBikeWear(setup);

  const updateWear = (key: typeof WEAR_COMPONENTS[number]['key'], value: typeof wear[typeof key]) => {
    onChange({ ...setup, wear: { ...wear, [key]: value } });
  };

  const cotes = setup.cotes ?? {};

  const ttCompliance = useMemo(() => {
    if (!isTt) return null;
    return checkUciTtCompliance({
      cotes,
      heightCm,
      uciHeightListRegistered: setup.uciHeightListRegistered,
    });
  }, [isTt, cotes, heightCm, setup.uciHeightListRegistered]);

  const roadCompliance = useMemo(() => {
    if (isTt) return null;
    return checkUciRoadCompliance(cotes);
  }, [isTt, cotes]);

  const uciErrorCount = ttCompliance?.checks.filter(c => c.status === 'error').length ?? 0;

  return (
    <div className="space-y-4">
      {!wearOnly && (
      <>
      <div className={`rounded-xl bg-gradient-to-r ${meta.gradient} p-4 text-white shadow-lg`}>
        <p className="text-xs uppercase tracking-wide opacity-80">{meta.subtitle}</p>
        <h3 className="text-xl font-bold">{meta.title}</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['brand', 'Marque'],
            ['model', 'Modèle'],
            ['size', 'Taille'],
            ['groupset', 'Groupe'],
          ] as const).map(([field, lbl]) => (
            <div key={field}>
              <label className="text-[10px] uppercase opacity-75">{lbl}</label>
              {editable ? (
                <input
                  type="text"
                  value={(setup[field] as string) ?? ''}
                  onChange={e => updateField(field, e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 rounded bg-white/15 border border-white/30 text-white placeholder-white/50 text-sm"
                  placeholder={lbl}
                />
              ) : (
                <p className="font-semibold text-sm">{(setup[field] as string) || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {isTt && ttCompliance && (
        <UciTtCompliancePanel
          compliance={ttCompliance}
          heightCm={heightCm}
          uciRegistered={!!setup.uciHeightListRegistered}
          onToggleRegistered={v => onChange({ ...setup, uciHeightListRegistered: v })}
          editable={editable}
        />
      )}

      {!isTt && roadCompliance && (
        <UciRoadCompliancePanel compliance={roadCompliance} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTt ? 'bg-orange-500' : 'bg-blue-500'}`} />
            {isTt ? 'Cotes UCI CLM' : 'Cotes Bike Fit'}
            {isTt && uciErrorCount > 0 && (
              <span className="ml-auto text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {uciErrorCount} alerte{uciErrorCount > 1 ? 's' : ''} UCI
              </span>
            )}
          </h4>
          <div className="rounded-lg overflow-hidden">
            {isTt && ttCompliance ? (
              <BikeFitTtDiagram cotes={cotes} bikeLabel={meta.title} compliance={ttCompliance} />
            ) : (
              <BikeFitDiagram cotes={cotes} bikeLabel={meta.title} />
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coteFields.map(field => {
              const ttField = isTt ? BIKE_SETUP_TT_COTES_FIELDS.find(f => f.key === field.key) : null;
              const check = ttField?.uciKey && ttCompliance
                ? ttCompliance.checks.find(c => c.key === ttField.uciKey)
                : null;
              const borderClass = check?.status === 'error'
                ? 'border-red-400 ring-1 ring-red-200'
                : check?.status === 'warning'
                  ? 'border-amber-400 ring-1 ring-amber-200'
                  : 'border-gray-300';

              return (
                <div key={String(field.key)}>
                  <label className={`${labelClass} flex items-center gap-1`}>
                    {field.label}
                    {ttField?.uciKey && (
                      <span className="text-orange-600 font-bold">({ttField.uciKey})</span>
                    )}
                  </label>
                  {editable ? (
                    <input
                      type="text"
                      value={cotes[field.key] ?? ''}
                      onChange={e => updateCote(String(field.key), e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${borderClass}`}
                      placeholder="mm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{cotes[field.key] || '—'}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            Spécificités
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BIKE_SETUP_SPECIFIC_FIELDS.map(field => (
              <div key={String(field.key)}>
                <label className={labelClass}>{field.label}</label>
                {editable ? (
                  <input
                    type="text"
                    value={setup.specifics?.[field.key] ?? ''}
                    onChange={e => updateSpecific(String(field.key), e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800">{setup.specifics?.[field.key] || '—'}</p>
                )}
              </div>
            ))}
            <div>
              <label className={labelClass}>Roues</label>
              {editable ? (
                <input type="text" value={setup.wheels ?? ''} onChange={e => updateField('wheels', e.target.value)} className={inputClass} />
              ) : (
                <p className="text-sm font-medium">{setup.wheels || '—'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          Pressions pneus
        </h4>
        <TirePressureQuickEntry
          grid={setup.tirePressures}
          onChange={tp => onChange({ ...setup, tirePressures: tp })}
          bikeLabel={meta.title}
        />
      </div>
      </>
      )}

      {(wearOnly || showWear) && (
        <div>
          {wearOnly && (
            <div className={`rounded-lg bg-gradient-to-r ${meta.gradient} px-4 py-2 mb-3 text-white`}>
              <span className="font-semibold">{meta.title}</span>
            </div>
          )}
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Suivi usure — {meta.title}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WEAR_COMPONENTS.map(cfg => (
              <WearProgressCard
                key={cfg.key}
                config={cfg}
                wear={wear[cfg.key] ?? defaultWearItem(cfg.defaultMaxKm)}
                onChange={v => updateWear(cfg.key, v)}
                onReset={() => updateWear(cfg.key, { ...defaultWearItem(cfg.defaultMaxKm), brand: wear[cfg.key]?.brand, model: wear[cfg.key]?.model })}
                editable={editable}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BikeFitPanel;

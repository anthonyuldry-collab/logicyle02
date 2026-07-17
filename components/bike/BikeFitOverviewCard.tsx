import React from 'react';
import { BikeSetup, BikeFitMeasurements } from '../../types';
import { BIKE_SETUP_META, BikeSetupKey, WEAR_COMPONENTS, ensureBikeWear, getWearPercent, getWearStatus, WEAR_STATUS_COLORS } from '../../utils/bikeWearUtils';
import { checkUciTtCompliance, getUciHeightCategoryLabel } from '../../utils/uciBikeFitUtils';

interface BikeFitOverviewCardProps {
  bikeKey: BikeSetupKey;
  setup: BikeSetup;
  heightCm?: number;
  onOpen: () => void;
}

function fmt(v?: string) {
  return v?.trim() ? `${v} mm` : '—';
}

const ROAD_COTES: { key: keyof BikeFitMeasurements; label: string }[] = [
  { key: 'hauteurSelle', label: 'Hauteur selle' },
  { key: 'reculSelle', label: 'Recul selle' },
  { key: 'longueurBecSelleAxeCintre', label: 'Bec → cintre' },
];

const TT_COTES: { key: keyof BikeFitMeasurements; label: string }[] = [
  { key: 'reculSelle', label: 'S' },
  { key: 'distanceExtensionE', label: 'E' },
  { key: 'hauteurProlongateursH', label: 'H' },
];

const BikeFitOverviewCard: React.FC<BikeFitOverviewCardProps> = ({
  bikeKey,
  setup,
  heightCm,
  onOpen,
}) => {
  const meta = BIKE_SETUP_META[bikeKey];
  const isTt = bikeKey === 'ttBikeSetup';
  const cotes = setup.cotes ?? {};
  const wear = ensureBikeWear(setup);
  const coteRows = isTt ? TT_COTES : ROAD_COTES;

  const ttCompliance = isTt
    ? checkUciTtCompliance({ cotes, heightCm, uciHeightListRegistered: setup.uciHeightListRegistered })
    : null;
  const uciErrors = ttCompliance?.checks.filter(c => c.status === 'error').length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`text-left w-full rounded-xl border-2 ${meta.accent} bg-white p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${meta.gradient}`}>
          {meta.title}
        </div>
        {isTt && uciErrors > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            UCI {uciErrors}
          </span>
        )}
      </div>

      <p className="font-bold text-gray-900">
        {[setup.brand, setup.model].filter(Boolean).join(' ') || 'Non renseigné'}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        Taille {setup.size || '—'}
        {setup.wheels ? ` · ${setup.wheels}` : ''}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {coteRows.map(row => (
          <div key={row.key} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center border border-gray-100">
            <p className="text-[9px] uppercase text-gray-400 tracking-wide">{row.label}</p>
            <p className="text-sm font-bold text-gray-800">{fmt(cotes[row.key])}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {WEAR_COMPONENTS.map(cfg => {
          const pct = getWearPercent(wear[cfg.key]!);
          const status = getWearStatus(pct);
          const colors = WEAR_STATUS_COLORS[status];
          const short = cfg.key === 'tireFront' ? 'AV' : cfg.key === 'tireRear' ? 'AR' : cfg.key === 'brakePads' ? 'Plaq.' : 'Chaîne';
          return (
            <span
              key={cfg.key}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}
            >
              {short} {pct}%
            </span>
          );
        })}
      </div>

      {isTt && ttCompliance && (
        <p className="text-[10px] text-gray-400 mt-2">
          {getUciHeightCategoryLabel(heightCm)} · E ≤ {ttCompliance.effectiveLimits.E} · H ≤ {ttCompliance.effectiveLimits.H}
        </p>
      )}
    </button>
  );
};

export default BikeFitOverviewCard;

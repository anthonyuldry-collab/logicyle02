import React from 'react';
import { BikeComponentWear } from '../../types';
import {
  getWearPercent,
  getWearStatus,
  WEAR_STATUS_COLORS,
  WEAR_STATUS_LABELS,
  WearComponentConfig,
} from '../../utils/bikeWearUtils';
import ActionButton from '../ActionButton';

interface WearProgressCardProps {
  config: WearComponentConfig;
  wear: BikeComponentWear;
  onChange: (wear: BikeComponentWear) => void;
  onReset: () => void;
  editable?: boolean;
}

const WearProgressCard: React.FC<WearProgressCardProps> = ({
  config,
  wear,
  onChange,
  onReset,
  editable = true,
}) => {
  const percent = getWearPercent(wear);
  const status = getWearStatus(percent);
  const colors = WEAR_STATUS_COLORS[status];
  const remaining = Math.max(0, wear.maxKm - wear.currentKm);

  const inputClass = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white';

  return (
    <div className={`rounded-xl border p-4 ring-1 ${colors.ring} ${colors.bg} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>{config.icon}</span>
          <div>
            <h4 className="font-semibold text-gray-900">{config.label}</h4>
            <p className="text-[11px] text-gray-500">{config.hint}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.bg} ${colors.text} border border-current/20`}>
          {WEAR_STATUS_LABELS[status]}
        </span>
      </div>

      {/* Jauge circulaire simplifiée */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percent} 100`}
              className={colors.text}
              strokeLinecap="round"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-baseline gap-px" style={{ transform: 'translateY(0.5px)' }}>
              <span className={`text-sm font-semibold tabular-nums leading-none ${colors.text}`}>
                {percent}
              </span>
              <span className={`text-[10px] font-medium leading-none opacity-80 ${colors.text}`}>
                %
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-1 text-sm">
          <p><span className="text-gray-500">Parcouru :</span> <strong>{wear.currentKm.toLocaleString('fr-FR')} km</strong></p>
          <p><span className="text-gray-500">Durée de vie :</span> <strong>{wear.maxKm.toLocaleString('fr-FR')} km</strong></p>
          <p><span className="text-gray-500">Restant ~</span> <strong>{remaining.toLocaleString('fr-FR')} km</strong></p>
        </div>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${percent}%` }} />
      </div>

      {editable && (
        <div className="space-y-2 pt-2 border-t border-gray-200/80">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Km parcourus</label>
              <input
                type="number"
                min="0"
                value={wear.currentKm}
                onChange={e => onChange({ ...wear, currentKm: Math.max(0, parseInt(e.target.value) || 0) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Durée vie (km)</label>
              <input
                type="number"
                min="100"
                value={wear.maxKm}
                onChange={e => onChange({ ...wear, maxKm: Math.max(100, parseInt(e.target.value) || config.defaultMaxKm) })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Marque"
              value={wear.brand ?? ''}
              onChange={e => onChange({ ...wear, brand: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Modèle / réf."
              value={wear.model ?? ''}
              onChange={e => onChange({ ...wear, model: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {[100, 250, 500].map(add => (
              <button
                key={add}
                type="button"
                onClick={() => onChange({ ...wear, currentKm: wear.currentKm + add })}
                className="text-xs px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50"
              >
                +{add} km
              </button>
            ))}
            <ActionButton type="button" size="sm" variant="secondary" onClick={onReset}>
              Remise à zéro
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default WearProgressCard;

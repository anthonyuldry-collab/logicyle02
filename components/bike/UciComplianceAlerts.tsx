import React from 'react';
import {
  UciMeasurementCheck,
  UciTtComplianceResult,
  UciRoadComplianceResult,
  UCI_HEIGHT_CATEGORY_LIMITS,
  UCI_DEFAULT_CATEGORY_LIMITS,
  UCI_FOREARM_SUPPORT_LIMITS,
  UCI_LIST_ATTESTATION_DAYS,
  UCI_REGULATION_VERSION,
  getUciHeightCategoryLabel,
} from '../../utils/uciBikeFitUtils';

const STATUS_STYLES = {
  ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: '✓' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '!' },
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '✕' },
  missing: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', icon: '—' },
};

function CheckRow({ check }: { check: UciMeasurementCheck }) {
  const style = STATUS_STYLES[check.status];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${style.bg} ${style.border}`}>
      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.text} bg-white border ${style.border}`}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`text-sm font-semibold ${style.text}`}>{check.label}</span>
          {check.value != null && (
            <span className="text-sm text-gray-700">{check.value} mm</span>
          )}
          <span className="text-xs text-gray-500">Limite : {check.limitLabel}</span>
        </div>
        <p className={`text-xs mt-0.5 ${style.text}`}>{check.message}</p>
      </div>
    </div>
  );
}

interface UciTtCompliancePanelProps {
  compliance: UciTtComplianceResult;
  heightCm?: number;
  uciRegistered: boolean;
  onToggleRegistered: (v: boolean) => void;
  editable?: boolean;
}

export const UciTtCompliancePanel: React.FC<UciTtCompliancePanelProps> = ({
  compliance,
  heightCm,
  uciRegistered,
  onToggleRegistered,
  editable = true,
}) => {
  const { effectiveCategory, effectiveLimits, checks, categoryReason } = compliance;
  const isDefault = effectiveCategory === 'default';

  const categoryBadge = isDefault
    ? UCI_DEFAULT_CATEGORY_LIMITS.label
    : UCI_HEIGHT_CATEGORY_LIMITS[effectiveCategory as 1 | 2 | 3].label;

  const categoryColor = compliance.hasErrors
    ? 'bg-red-100 text-red-800 border-red-200'
    : compliance.hasWarnings
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-orange-600">UCI</span>
            Contrôle cotes CLM
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Règlement {UCI_REGULATION_VERSION} · {getUciHeightCategoryLabel(heightCm)}
            {' · '}E ≤ {effectiveLimits.E} · H ≤ {effectiveLimits.H} mm
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${categoryColor}`}>
          {categoryBadge}
        </span>
      </div>

      <p className="text-xs text-gray-600 bg-white/70 rounded-lg px-3 py-2 border border-orange-100">
        {categoryReason}
      </p>

      {heightCm != null && heightCm >= 180 && editable && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={uciRegistered}
            onChange={e => onToggleRegistered(e.target.checked)}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          Inscrit sur la liste UCI (catégories de taille 2 ou 3)
        </label>
      )}

      <div className="space-y-2">
        {checks.map(check => (
          <CheckRow key={check.key} check={check} />
        ))}
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700 font-medium">
          Référentiel UCI art. 1.3.023 (depuis {UCI_REGULATION_VERSION})
        </summary>
        <ul className="mt-2 space-y-1 pl-2">
          <li><strong>Taille 1</strong> (&lt; 180 cm) : E ≤ 800 · H ≤ 100 · S ≥ 50 mm</li>
          <li><strong>Taille 2</strong> (180–189 cm) : E ≤ 830 · H ≤ 120 · S ≥ 50 mm — liste UCI requise</li>
          <li><strong>Taille 3</strong> (≥ 190 cm) : E ≤ 850 · H ≤ 140 · S ≥ 50 mm — liste UCI requise</li>
          <li><strong>Catégorie par défaut</strong> : E ≤ 750 · H selon taille · S art. 1.3.013 (bec derrière axe pédalier)</li>
          <li className="pt-1 text-gray-400">
            Attestation taille : formulaire UCI au moins J-{UCI_LIST_ATTESTATION_DAYS} avant l&apos;événement
          </li>
          <li className="text-gray-400">
            Coussinets : max {UCI_FOREARM_SUPPORT_LIMITS.maxWidthMm}×{UCI_FOREARM_SUPPORT_LIMITS.maxLengthMm} mm,
            inclinaison ≤ {UCI_FOREARM_SUPPORT_LIMITS.maxInclinationDeg}° · base barre ≥ {UCI_FOREARM_SUPPORT_LIMITS.baseBarMinWidthMm} mm
          </li>
        </ul>
      </details>
    </div>
  );
};

interface UciRoadCompliancePanelProps {
  compliance: UciRoadComplianceResult;
}

export const UciRoadCompliancePanel: React.FC<UciRoadCompliancePanelProps> = ({ compliance }) => {
  const check = compliance.checks[0];
  const style = STATUS_STYLES[check.status];

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${style.bg} ${style.border}`}>
      <p className="text-xs font-semibold text-gray-700 mb-1">Règle UCI route — art. 1.3.013 ({UCI_REGULATION_VERSION})</p>
      <p className={`text-xs ${style.text}`}>
        {check.message}
        {check.value != null && <span className="ml-1 text-gray-600">({check.value} mm)</span>}
      </p>
    </div>
  );
};

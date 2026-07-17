import React, { useState } from 'react';
import {
  getPerformanceRatingAccentRing,
  getPerformanceRatingBadgeClass,
  getPerformanceRatingCriteria,
  getPerformanceRatingLabel,
  getPerformanceRatingScale,
  PerformanceRatingScaleId,
} from '../../utils/performanceRatingScales';

interface ContributionRatingPickerProps {
  value: number | undefined;
  isAbsent?: boolean;
  onChange: (value: number | undefined, isAbsent: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  allowAbsent?: boolean;
  /** Barème à appliquer (défaut : apport collectif) */
  scale?: PerformanceRatingScaleId;
}

const ContributionRatingPicker: React.FC<ContributionRatingPickerProps> = ({
  value,
  isAbsent = false,
  onChange,
  disabled = false,
  compact = false,
  allowAbsent = true,
  scale = 'contribution',
}) => {
  const [showScale, setShowScale] = useState(false);
  const scaleDef = getPerformanceRatingScale(scale);
  const btnSize = compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';
  const accentRing = getPerformanceRatingAccentRing(scale);

  const levelTitle = (score: number) => {
    const label = getPerformanceRatingLabel(scale, score);
    const criteria = getPerformanceRatingCriteria(scale, score);
    return `${label}\n${criteria}`;
  };

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-[11px] font-medium text-gray-500">{scaleDef.title}</p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {([10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const).map((score) => {
          const selected = !isAbsent && value === score;
          const level = scaleDef.levels[score];
          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected ? undefined : score, false)}
              className={`${btnSize} rounded-lg font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                selected
                  ? `${getPerformanceRatingBadgeClass(score)} ring-2 ring-offset-1 ${accentRing}`
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title={level ? levelTitle(score) : undefined}
            >
              {score}
            </button>
          );
        })}
        {allowAbsent && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(undefined, !isAbsent)}
            className={`${compact ? 'px-2 h-7 text-xs' : 'px-3 h-8 text-sm'} rounded-lg font-bold border transition-colors disabled:opacity-40 ${
              isAbsent
                ? 'bg-gray-800 text-white border-gray-800 ring-2 ring-offset-1 ring-gray-500'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
            title="Coureur absent"
          >
            X
          </button>
        )}
      </div>
      {(value != null || isAbsent) && (
        <div className={`text-xs text-gray-600 ${compact ? 'mt-1' : ''}`}>
          {isAbsent ? (
            <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">Coureur absent</span>
          ) : (
            <div className="space-y-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full border font-medium ${getPerformanceRatingBadgeClass(value!)}`}>
                {value}/10 — {getPerformanceRatingLabel(scale, value)}
              </span>
              {!compact && getPerformanceRatingCriteria(scale, value) && (
                <p className="text-[11px] text-gray-500 leading-snug max-w-prose">
                  {getPerformanceRatingCriteria(scale, value)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowScale((v) => !v)}
        className="text-[11px] text-blue-600 hover:underline"
      >
        {showScale ? 'Masquer le barème' : `Voir le barème — ${scaleDef.title.toLowerCase()}`}
      </button>
      {showScale && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 max-w-lg">
          <p className="font-semibold text-gray-900">{scaleDef.title}</p>
          <p className="text-gray-500 mt-1 mb-3 leading-relaxed">{scaleDef.intro}</p>
          <div className="space-y-2">
            {Object.entries(scaleDef.levels)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([note, level]) => (
                <div key={note} className="flex gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="font-bold w-5 shrink-0 text-gray-900">{note}</span>
                  <div>
                    <p className="font-medium text-gray-800">{level.label}</p>
                    <p className="text-gray-500 mt-0.5 leading-snug">{level.criteria}</p>
                  </div>
                </div>
              ))}
          </div>
          {allowAbsent && scale === 'contribution' && (
            <div className="flex gap-2 pt-2 mt-2 border-t border-gray-200">
              <span className="font-bold w-5 shrink-0">X</span>
              <span>Coureur absent — non noté sur cette course</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContributionRatingPicker;

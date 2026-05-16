import React from 'react';
import { StageDayLogistics, StageTransferLogistics } from '../../types';
import { formatStageDateLabel } from '../../utils/stageRaceUtils';

interface StageRaceSubTabsProps {
  stageDays: StageDayLogistics[];
  transfers: StageTransferLogistics[];
  activeIndex: number;
  onSelectTab: (index: number) => void;
  children: (stage: StageDayLogistics, transferAfter: StageTransferLogistics | undefined, index: number) => React.ReactNode;
}

const shortStageDate = (date: string): string =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const StageRaceSubTabs: React.FC<StageRaceSubTabsProps> = ({
  stageDays,
  transfers,
  activeIndex,
  onSelectTab,
  children,
}) => {
  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, stageDays.length - 1));
  const activeStage = stageDays[safeIndex];

  if (stageDays.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic p-4">
        Aucune étape définie. Renseignez les dates de début et de fin de l&apos;événement.
      </p>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <nav
        className="flex overflow-x-auto border-b border-gray-200 bg-gray-50"
        aria-label="Étapes de la course"
      >
        {stageDays.map((stage, index) => {
          const isActive = index === safeIndex;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectTab(index)}
              className={`flex-shrink-0 px-4 py-3 text-left border-b-2 transition-colors min-w-[7rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                ${isActive
                  ? 'border-amber-500 bg-white text-amber-900'
                  : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <span className="block text-sm font-semibold">Étape {stage.stageNumber}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{shortStageDate(stage.date)}</span>
              {stage.stageLabel && (
                <span className="block text-xs text-amber-700 truncate max-w-[10rem] mt-0.5" title={stage.stageLabel}>
                  {stage.stageLabel}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 sm:p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">
          {formatStageDateLabel(activeStage.date)}
          {activeStage.stageLabel ? ` — ${activeStage.stageLabel}` : ''}
        </p>
        {children(activeStage, transfers[safeIndex], safeIndex)}
      </div>
    </div>
  );
};

export default StageRaceSubTabs;

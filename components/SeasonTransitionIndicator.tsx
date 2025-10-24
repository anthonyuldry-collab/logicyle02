import React from 'react';
import { getCurrentSeasonYear, isInSeasonTransition, getSeasonTransitionStatus } from '../utils/seasonUtils';

interface SeasonTransitionIndicatorProps {
  seasonYear: number;
  showDetails?: boolean;
  className?: string;
}

const SeasonTransitionIndicator: React.FC<SeasonTransitionIndicatorProps> = ({
  seasonYear,
  showDetails = false,
  className = ''
}) => {
  const currentSeason = getCurrentSeasonYear();
  const isTransitionActive = isInSeasonTransition();
  const transitionStatus = getSeasonTransitionStatus(seasonYear);

  if (seasonYear !== currentSeason || !isTransitionActive) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-medium text-blue-700">
          Transition Active
        </span>
      </div>
      
      {showDetails && (
        <div className="text-xs text-gray-600">
          Saison {seasonYear} lancée officiellement
        </div>
      )}
    </div>
  );
};

export default SeasonTransitionIndicator;

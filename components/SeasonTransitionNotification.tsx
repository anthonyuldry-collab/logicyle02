import React, { useState, useEffect } from 'react';
import { XMarkIcon, CalendarDaysIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { getCurrentSeasonYear, isInSeasonTransition } from '../utils/seasonUtils';

interface SeasonTransitionNotificationProps {
  onDismiss?: () => void;
  className?: string;
}

const SeasonTransitionNotification: React.FC<SeasonTransitionNotificationProps> = ({
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Afficher la notification seulement si on est en transition de saison
    if (isInSeasonTransition() && !isDismissed) {
      setIsVisible(true);
    }
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  const currentSeason = getCurrentSeasonYear();

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-800">
              🎯 Transition de Saison Active
            </h3>
            <button
              onClick={handleDismiss}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2">
            <p className="text-sm text-blue-700">
              La <strong>Saison {currentSeason}</strong> est officiellement lancée ! 
              Vous pouvez maintenant commencer à planifier vos événements et sélections pour l'année prochaine.
            </p>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <ArrowRightIcon className="h-3 w-3 mr-1" />
              <span>Transition fluide : Novembre 2025 → Décembre 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonTransitionNotification;

import React from 'react';
import { Rider, StaffMember, RaceEvent, PerformanceEntry } from '../types';
import { 
  shouldSwitchTo2026, 
  getSwitchTo2026Message,
  getEventsFor2026,
  getPerformanceEntriesFor2026,
  calculateRaceDaysFor2026,
  calculateStaffDaysFor2026
} from '../utils/seasonTransitionUtils';
import { getCurrentSeasonYear } from '../utils/seasonUtils';
import { InformationCircleIcon } from './icons';

interface SeasonTransitionManagerProps {
  riders: Rider[];
  staff: StaffMember[];
  raceEvents: RaceEvent[];
  performanceEntries: PerformanceEntry[];
}

const SeasonTransitionManager: React.FC<SeasonTransitionManagerProps> = ({
  riders,
  staff,
  raceEvents,
  performanceEntries
}) => {
  const currentSeason = getCurrentSeasonYear();
  const shouldSwitch = shouldSwitchTo2026(currentSeason);

  if (!shouldSwitch) {
    return null;
  }

  // Calculer les statistiques pour 2026
  const events2026 = getEventsFor2026(raceEvents);
  const performances2026 = getPerformanceEntriesFor2026(performanceEntries);
  
  const totalRaceDays2026 = riders.reduce((total, rider) => 
    total + calculateRaceDaysFor2026(rider, raceEvents), 0
  );
  
  const totalStaffDays2026 = staff.reduce((total, member) => 
    total + calculateStaffDaysFor2026(member, raceEvents), 0
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎯 Basculement sur la Saison 2026
          </h3>
          
          <p className="text-blue-800 text-sm mb-4">
            {getSwitchTo2026Message()}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">📅 Événements 2026</h4>
              <p className="text-2xl font-bold text-blue-600">{events2026.length}</p>
              <p className="text-sm text-blue-700">événements programmés</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">🏁 Jours de Course</h4>
              <p className="text-2xl font-bold text-blue-600">{totalRaceDays2026}</p>
              <p className="text-sm text-blue-700">jours planifiés</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">👥 Jours de Staff</h4>
              <p className="text-2xl font-bold text-blue-600">{totalStaffDays2026}</p>
              <p className="text-sm text-blue-700">jours planifiés</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Astuce :</strong> Utilisez les filtres d'année dans chaque section pour consulter les données historiques.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonTransitionManager;

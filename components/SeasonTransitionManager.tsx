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

  const events2026 = getEventsFor2026(raceEvents);
  const performances2026 = getPerformanceEntriesFor2026(performanceEntries);
  
  const totalRaceDays2026 = riders.reduce((total, rider) => 
    total + calculateRaceDaysFor2026(rider, raceEvents), 0
  );
  
  const totalStaffDays2026 = staff.reduce((total, member) => 
    total + calculateStaffDaysFor2026(member, raceEvents), 0
  );

  return (
    <div className="relative z-20 border-b border-indigo-400/20 bg-slate-950/95 px-4 py-5 sm:px-8 backdrop-blur-md">
      <div className="flex items-start max-w-7xl mx-auto">
        <InformationCircleIcon className="w-6 h-6 text-indigo-300 mt-1 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            Basculement sur la Saison 2026
          </h3>
          
          <p className="text-slate-300 text-sm mb-4">
            {getSwitchTo2026Message()}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <h4 className="font-semibold text-indigo-200 mb-2">Événements 2026</h4>
              <p className="text-2xl font-bold text-white">{events2026.length}</p>
              <p className="text-sm text-slate-400">événements programmés</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <h4 className="font-semibold text-indigo-200 mb-2">Jours de Course</h4>
              <p className="text-2xl font-bold text-white">{totalRaceDays2026}</p>
              <p className="text-sm text-slate-400">jours planifiés</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <h4 className="font-semibold text-indigo-200 mb-2">Jours de Staff</h4>
              <p className="text-2xl font-bold text-white">{totalStaffDays2026}</p>
              <p className="text-sm text-slate-400">jours planifiés</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10">
            <p className="text-sm text-indigo-100">
              <strong>Astuce :</strong> Utilisez les filtres d&apos;année dans chaque section pour consulter les données historiques.
              {performances2026.length > 0 ? ` (${performances2026.length} perf. 2026)` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonTransitionManager;

import React, { useState, useEffect, useMemo } from 'react';
import { Rider, StaffMember, RosterArchive, RosterTransition } from '../types';
import { 
  archiveRosterForSeason, 
  prepareRosterTransition, 
  getRosterStatsForSeason,
  getRosterTransitionMessage,
  getActiveRidersForCurrentSeason,
  getActiveStaffForCurrentSeason,
  resetRaceDayCountersForNewSeason
} from '../utils/rosterArchiveUtils';
import { getCurrentSeasonYear, isInSeasonTransition } from '../utils/seasonUtils';
import { InformationCircleIcon, DocumentDuplicateIcon, UsersIcon } from './icons';

interface RosterTransitionManagerProps {
  riders: Rider[];
  staff: StaffMember[];
  teamId?: string | null;
  onRosterTransition: (
    archive: RosterArchive,
    transition: RosterTransition,
    updated: { riders: Rider[]; staff: StaffMember[] }
  ) => void;
}

function transitionStorageKey(teamId: string | null | undefined, toSeason: number): string {
  return `logicycle_roster_transition_${teamId || 'local'}_${toSeason}`;
}

const RosterTransitionManager: React.FC<RosterTransitionManagerProps> = ({
  riders,
  staff,
  teamId,
  onRosterTransition
}) => {
  const toSeason = getCurrentSeasonYear();
  const fromSeason = toSeason - 1;
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const alreadyDone = useMemo(() => {
    try {
      return localStorage.getItem(transitionStorageKey(teamId, toSeason)) === '1';
    } catch {
      return false;
    }
  }, [teamId, toSeason]);

  useEffect(() => {
    if (isInSeasonTransition() && !alreadyDone && fromSeason >= 2020) {
      setShowTransitionModal(true);
    }
  }, [alreadyDone, fromSeason]);

  const handleConfirmTransition = async () => {
    setIsTransitioning(true);
    try {
      const archive = archiveRosterForSeason(riders, staff, fromSeason);
      const transition = prepareRosterTransition(riders, staff, fromSeason, toSeason);
      const updated = resetRaceDayCountersForNewSeason(riders, staff, toSeason);
      await Promise.resolve(onRosterTransition(archive, transition, updated));
      try {
        localStorage.setItem(transitionStorageKey(teamId, toSeason), '1');
      } catch {
        /* ignore */
      }
      setShowTransitionModal(false);
    } catch (error) {
      console.error('Erreur lors de la transition des effectifs:', error);
      alert('Impossible d’archiver la saison. Réessayez ou contactez le support.');
    } finally {
      setIsTransitioning(false);
    }
  };

  if (!showTransitionModal) {
    return null;
  }

  const currentStats = getRosterStatsForSeason(riders, staff, fromSeason);
  const activeRiders = getActiveRidersForCurrentSeason(riders);
  const activeStaff = getActiveStaffForCurrentSeason(staff);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
        <div className="flex items-start mb-6">
          <InformationCircleIcon className="w-8 h-8 text-indigo-600 mr-3 shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Transition effectif {fromSeason} → {toSeason}
            </h2>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
              {getRosterTransitionMessage(fromSeason, toSeason)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <UsersIcon className="w-4 h-4" /> Saison {fromSeason}
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{currentStats.totalRiders} coureurs</p>
            <p className="text-xs text-gray-500">{currentStats.totalStaff} staff</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
              <DocumentDuplicateIcon className="w-4 h-4" /> Conservés pour {toSeason}
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-900">{activeRiders.length} coureurs</p>
            <p className="text-xs text-indigo-700">{activeStaff.length} staff · compteurs remis à 0</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowTransitionModal(false)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={isTransitioning}
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmTransition()}
            disabled={isTransitioning}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isTransitioning ? 'Archivage…' : `Archiver ${fromSeason} et passer à ${toSeason}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RosterTransitionManager;

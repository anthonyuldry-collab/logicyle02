import React, { useState, useEffect, useMemo } from 'react';
import { StaffMember, StaffArchive, StaffTransition } from '../types';
import { 
  archiveStaffForSeason, 
  prepareStaffTransition, 
  getStaffStatsForSeason,
  getStaffTransitionMessage,
  getActiveStaffForCurrentSeason,
  resetStaffDayCountersForNewSeason
} from '../utils/staffRosterUtils';
import { getCurrentSeasonYear, isInSeasonTransition } from '../utils/seasonUtils';
import { InformationCircleIcon, DocumentDuplicateIcon, UsersIcon } from './icons';

interface StaffTransitionManagerProps {
  staff: StaffMember[];
  teamId?: string | null;
  onStaffTransition: (archive: StaffArchive, transition: StaffTransition, updatedStaff: StaffMember[]) => void;
}

function transitionStorageKey(teamId: string | null | undefined, toSeason: number): string {
  return `logicycle_staff_transition_${teamId || 'local'}_${toSeason}`;
}

const StaffTransitionManager: React.FC<StaffTransitionManagerProps> = ({
  staff,
  teamId,
  onStaffTransition
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
      const archive = archiveStaffForSeason(staff, fromSeason);
      const transition = prepareStaffTransition(staff, fromSeason, toSeason);
      const updatedStaff = resetStaffDayCountersForNewSeason(staff, toSeason);
      await Promise.resolve(onStaffTransition(archive, transition, updatedStaff));
      try {
        localStorage.setItem(transitionStorageKey(teamId, toSeason), '1');
      } catch {
        /* ignore */
      }
      setShowTransitionModal(false);
    } catch (error) {
      console.error('Erreur lors de la transition des effectifs du staff:', error);
      alert('Impossible d’archiver la saison staff. Réessayez ou contactez le support.');
    } finally {
      setIsTransitioning(false);
    }
  };

  if (!showTransitionModal) {
    return null;
  }

  const currentStats = getStaffStatsForSeason(staff, fromSeason);
  const activeStaff = getActiveStaffForCurrentSeason(staff);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
        <div className="flex items-start mb-6">
          <InformationCircleIcon className="w-8 h-8 text-indigo-600 mr-3 shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Transition staff {fromSeason} → {toSeason}
            </h2>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
              {getStaffTransitionMessage(fromSeason, toSeason)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <UsersIcon className="w-4 h-4" /> Effectif {fromSeason}
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{currentStats.totalStaff}</p>
            <p className="text-xs text-gray-500">{currentStats.activeStaff} actifs</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
              <DocumentDuplicateIcon className="w-4 h-4" /> Conservés pour {toSeason}
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-900">{activeStaff.length}</p>
            <p className="text-xs text-indigo-700">Compteurs remis à zéro</p>
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

export default StaffTransitionManager;

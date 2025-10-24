import React, { useState, useEffect } from 'react';
import { Rider, StaffMember, RosterArchive, RosterTransition } from '../types';
import { 
  archiveRosterForSeason, 
  prepareRosterTransition, 
  getRosterStatsForSeason,
  shouldTransitionToNewSeason,
  getRosterTransitionMessage,
  getActiveRidersForCurrentSeason,
  getActiveStaffForCurrentSeason,
  resetRaceDayCountersForNewSeason
} from '../utils/rosterArchiveUtils';
import { getCurrentSeasonYear } from '../utils/seasonUtils';
import { InformationCircleIcon, DocumentDuplicateIcon, UsersIcon } from './icons';

interface RosterTransitionManagerProps {
  riders: Rider[];
  staff: StaffMember[];
  onRosterTransition: (archive: RosterArchive, transition: RosterTransition) => void;
}

const RosterTransitionManager: React.FC<RosterTransitionManagerProps> = ({
  riders,
  staff,
  onRosterTransition
}) => {
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(getCurrentSeasonYear());
  
  // Vérifier si une transition est nécessaire
  useEffect(() => {
    if (shouldTransitionToNewSeason() && currentSeason < 2026) {
      setShowTransitionModal(true);
    }
  }, [currentSeason]);

  const handleTransitionTo2026 = async () => {
    setIsTransitioning(true);
    
    try {
      // 1. Archiver l'effectif 2025
      const archive2025 = archiveRosterForSeason(riders, staff, 2025);
      
      // 2. Préparer la transition vers 2026 (conserve tous les effectifs actifs)
      const transition = prepareRosterTransition(riders, staff, 2025, 2026);
      
      // 3. Réinitialiser les compteurs pour la nouvelle saison
      const { riders: updatedRiders, staff: updatedStaff } = resetRaceDayCountersForNewSeason(riders, staff, 2026);
      
      // 4. Notifier le parent de la transition avec les effectifs mis à jour
      onRosterTransition(archive2025, transition);
      
      // 4. Mettre à jour la saison courante
      setCurrentSeason(2026);
      setShowTransitionModal(false);
      
    } catch (error) {
      console.error('Erreur lors de la transition des effectifs:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCancelTransition = () => {
    setShowTransitionModal(false);
  };

  // Obtenir les statistiques actuelles
  const currentStats = getRosterStatsForSeason(riders, staff, currentSeason);
  const activeRiders = getActiveRidersForCurrentSeason(riders);
  const activeStaff = getActiveStaffForCurrentSeason(staff);

  if (!showTransitionModal && currentSeason >= 2026) {
    return null;
  }

  if (!showTransitionModal) {
    return null;
  }

  return (
    <>
      {/* Modal de transition */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-start mb-6">
            <DocumentDuplicateIcon className="w-8 h-8 text-blue-600 mt-1 mr-4 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Transition des Effectifs vers 2026
              </h2>
              <p className="text-gray-600">
                Il est temps de basculer sur les effectifs 2026 et d'archiver les effectifs 2025.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Résumé de la transition :</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Les effectifs 2025 seront archivés et figés</li>
              <li>• Tous les coureurs et staff actifs seront conservés pour 2026</li>
              <li>• Les compteurs de jours de course seront remis à 0</li>
              <li>• Transition automatique au 1er octobre vers la saison 2026</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Effectif 2025 (à archiver)</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {currentStats.totalRiders} coureurs total</p>
                <p>• {currentStats.activeRiders} coureurs actifs</p>
                <p>• {currentStats.totalStaff} membres du staff</p>
                <p>• {currentStats.activeStaff} staff actif</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Effectif 2026 (nouveau)</h4>
              <div className="space-y-1 text-sm text-green-600">
                <p>• {currentStats.activeRiders} coureurs conservés</p>
                <p>• {currentStats.activeStaff} staff conservé</p>
                <p>• Compteurs remis à 0</p>
                <p>• Prêt pour les nouveaux ajouts</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleCancelTransition}
              disabled={isTransitioning}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleTransitionTo2026}
              disabled={isTransitioning}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isTransitioning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Transition en cours...
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                  Archiver 2025 et passer à 2026
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RosterTransitionManager;

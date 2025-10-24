import React, { useState, useMemo } from 'react';
import { StaffMember, StaffArchive } from '../types';
import { getStaffStatsForSeason } from '../utils/staffRosterUtils';
import { getAvailableSeasonYears } from '../utils/seasonUtils';
import { DocumentDuplicateIcon, UsersIcon, CalendarIcon, EyeIcon } from './icons';

interface StaffArchiveViewerProps {
  staff: StaffMember[];
  archives: StaffArchive[];
  onViewArchive: (archive: StaffArchive) => void;
}

const StaffArchiveViewer: React.FC<StaffArchiveViewerProps> = ({
  staff,
  archives,
  onViewArchive
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  const availableSeasons = getAvailableSeasonYears();
  const currentSeason = Math.max(...availableSeasons);

  // Grouper les archives par saison
  const archivesBySeason = useMemo(() => {
    const grouped: Record<number, StaffArchive> = {};
    archives.forEach(archive => {
      grouped[archive.season] = archive;
    });
    return grouped;
  }, [archives]);

  // Obtenir les statistiques pour la saison sélectionnée
  const selectedArchive = selectedSeason ? archivesBySeason[selectedSeason] : null;
  const selectedStats = selectedSeason ? getStaffStatsForSeason(staff, selectedSeason) : null;

  const handleSeasonChange = (season: number) => {
    setSelectedSeason(season);
    if (archivesBySeason[season]) {
      onViewArchive(archivesBySeason[season]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <DocumentDuplicateIcon className="w-6 h-6 text-gray-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">
            Archives des Effectifs du Staff
          </h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'summary' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Résumé
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'detailed' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Détaillé
          </button>
        </div>
      </div>

      {/* Sélecteur de saison */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une saison archivée :
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {availableSeasons
            .filter(season => season < currentSeason)
            .map(season => (
              <button
                key={season}
                onClick={() => handleSeasonChange(season)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedSeason === season
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  <span className="font-medium">{season}</span>
                </div>
                {archivesBySeason[season] && (
                  <div className="text-xs text-gray-500">
                    {archivesBySeason[season].totalStaff} membres
                  </div>
                )}
              </button>
            ))}
        </div>
      </div>

      {/* Affichage des informations */}
      {selectedArchive && selectedStats ? (
        <div className="space-y-6">
          {/* Informations générales */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
              Saison {selectedSeason} - Informations générales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Archivé le :</p>
                <p className="font-medium">{formatDate(selectedArchive.archivedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total staff :</p>
                <p className="font-medium">{selectedStats.totalStaff}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Staff actif :</p>
                <p className="font-medium">{selectedStats.activeStaff}</p>
              </div>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center">
              <UsersIcon className="w-5 h-5 mr-2" />
              Effectifs du Staff
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Actifs :</span>
                <span className="font-medium text-green-900">{selectedStats.activeStaff}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Inactifs :</span>
                <span className="font-medium text-green-900">{selectedStats.inactiveStaff}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2">
                <span className="text-sm font-medium text-green-700">Total :</span>
                <span className="font-bold text-green-900">{selectedStats.totalStaff}</span>
              </div>
            </div>
          </div>

          {/* Bouton de consultation détaillée */}
          <div className="flex justify-center">
            <button
              onClick={() => onViewArchive(selectedArchive)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Consulter l'effectif détaillé
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <DocumentDuplicateIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Sélectionnez une saison pour voir les archives</p>
        </div>
      )}
    </div>
  );
};

export default StaffArchiveViewer;

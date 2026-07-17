import React, { useState, useMemo } from 'react';
import { Rider, StaffMember, RosterArchive } from '../types';
import { getRosterStatsForSeason } from '../utils/rosterArchiveUtils';
import { getAvailableSeasonYears } from '../utils/seasonUtils';
import { DocumentDuplicateIcon, UsersIcon, CalendarIcon, EyeIcon } from './icons';

interface RosterArchiveViewerProps {
  riders: Rider[];
  staff: StaffMember[];
  archives: RosterArchive[];
  onViewArchive: (archive: RosterArchive) => void;
}

const RosterArchiveViewer: React.FC<RosterArchiveViewerProps> = ({
  riders,
  staff,
  archives,
  onViewArchive
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  const availableSeasons = getAvailableSeasonYears();
  const currentSeason = Math.max(...availableSeasons);

  const archivesBySeason = useMemo(() => {
    const grouped: Record<number, RosterArchive> = {};
    archives.forEach(archive => {
      grouped[archive.season] = archive;
    });
    return grouped;
  }, [archives]);

  const selectedArchive = selectedSeason ? archivesBySeason[selectedSeason] : null;
  const selectedStats = selectedSeason ? getRosterStatsForSeason(riders, staff, selectedSeason) : null;
  const archivedSeasons = availableSeasons.filter(season => season < currentSeason);

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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <DocumentDuplicateIcon className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Archives des effectifs</h2>
            <p className="text-xs text-gray-500">{archivedSeasons.length} saison{archivedSeasons.length !== 1 ? 's' : ''} disponible{archivedSeasons.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['summary', 'detailed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                viewMode === mode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {mode === 'summary' ? 'Résumé' : 'Détaillé'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Sélectionner une saison</p>
          {archivedSeasons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Aucune saison archivée pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {archivedSeasons.map(season => (
                <button
                  key={season}
                  type="button"
                  onClick={() => handleSeasonChange(season)}
                  className={`inline-flex flex-col items-center px-4 py-2.5 rounded-lg border text-sm transition-colors min-w-[5rem] ${
                    selectedSeason === season
                      ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {season}
                  </span>
                  {archivesBySeason[season] && (
                    <span className="text-[11px] text-gray-500 mt-0.5">
                      {archivesBySeason[season].totalRiders} coureurs
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedArchive && selectedStats ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Saison {selectedSeason} — archivée le {formatDate(selectedArchive.archivedAt)}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">Coureurs</p>
                  <p className="text-lg font-bold text-gray-900">{selectedStats.totalRiders}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">Actifs</p>
                  <p className="text-lg font-bold text-blue-600">{selectedStats.activeRiders}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">Staff</p>
                  <p className="text-lg font-bold text-gray-900">{selectedStats.totalStaff}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">Staff actif</p>
                  <p className="text-lg font-bold text-emerald-600">{selectedStats.activeStaff}</p>
                </div>
              </div>
            </div>

            {viewMode === 'detailed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    Coureurs
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Actifs</span>
                      <span className="font-medium text-blue-900">{selectedStats.activeRiders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Inactifs</span>
                      <span className="font-medium text-blue-900">{selectedStats.inactiveRiders}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                      <span className="font-medium text-blue-800">Total</span>
                      <span className="font-bold text-blue-900">{selectedStats.totalRiders}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <h4 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    Staff
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Actifs</span>
                      <span className="font-medium text-emerald-900">{selectedStats.activeStaff}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Inactifs</span>
                      <span className="font-medium text-emerald-900">{selectedStats.inactiveStaff}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-2">
                      <span className="font-medium text-emerald-800">Total</span>
                      <span className="font-bold text-emerald-900">{selectedStats.totalStaff}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => onViewArchive(selectedArchive)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                Consulter l'effectif détaillé
              </button>
            </div>
          </div>
        ) : archivedSeasons.length > 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <DocumentDuplicateIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Sélectionnez une saison pour consulter les archives.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RosterArchiveViewer;

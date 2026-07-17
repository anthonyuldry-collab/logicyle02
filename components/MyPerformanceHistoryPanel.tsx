import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Rider, RiderQualityArchive, User } from '../types';
import { TeamBenchmarkData } from '../types/teamBenchmarks';
import {
  getMergedPerformanceArchive,
  getRiderQualityHistory,
  getRidersForArchivePowerAnalysis,
} from '../utils/performanceArchiveUtils';
import { getCurrentSeasonYear } from '../utils/seasonUtils';
import AthletePowerView from './athlete/AthletePowerView';
import AthleteDurabilityView from './athlete/AthleteDurabilityView';
import AthleteTrainingVolumeView from './athlete/AthleteTrainingVolumeView';
import ChartBarIcon from './icons/ChartBarIcon';

type HistorySubTab = 'quality' | 'powers' | 'durability' | 'volume';

interface MyPerformanceHistoryPanelProps {
  rider: Rider;
  appState: AppState;
  teamBenchmarks: TeamBenchmarkData;
  currentUser: User;
}

const TREND_LABELS: Record<RiderQualityArchive['qualityTrend'], string> = {
  improving: 'En progression',
  stable: 'Stable',
  declining: 'En baisse',
};

const TREND_CLASSES: Record<RiderQualityArchive['qualityTrend'], string> = {
  improving: 'bg-green-100 text-green-800',
  stable: 'bg-gray-100 text-gray-700',
  declining: 'bg-red-100 text-red-800',
};

const QUALITY_COMPARE_FIELDS: {
  key: keyof RiderQualityArchive;
  label: string;
  accent: string;
}[] = [
  { key: 'generalPerformanceScore', label: 'Général', accent: 'text-blue-600' },
  { key: 'charClimbing', label: 'Montagne', accent: 'text-green-600' },
  { key: 'charSprint', label: 'Sprint', accent: 'text-yellow-600' },
  { key: 'charAnaerobic', label: 'Anaérobie', accent: 'text-orange-600' },
  { key: 'charPuncher', label: 'Puncheur', accent: 'text-purple-600' },
  { key: 'charRouleur', label: 'Rouleur', accent: 'text-indigo-600' },
  { key: 'fatigueResistanceScore', label: 'Résistance', accent: 'text-red-600' },
];

function avgField(notes: RiderQualityArchive[], key: keyof RiderQualityArchive): number | null {
  const values = notes
    .map(n => n[key])
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

const QualityMetric = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className="text-center rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
    <div className={`text-2xl font-bold ${accent}`}>{value > 0 ? value : '—'}</div>
    <div className="text-xs font-medium text-gray-600 mt-1">{label}</div>
  </div>
);

const CompareCard: React.FC<{
  label: string;
  yours: number;
  teamAvg: number | null;
  accent: string;
  teamSize: number;
}> = ({ label, yours, teamAvg, accent, teamSize }) => {
  const diff =
    teamAvg != null && yours > 0 ? Math.round((yours - teamAvg) * 10) / 10 : null;
  const diffClass =
    diff == null ? 'text-gray-400' : diff >= 0.5 ? 'text-green-600' : diff <= -0.5 ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className={`text-3xl font-bold tabular-nums mt-1 ${accent}`}>
        {yours > 0 ? yours : '—'}
      </div>
      {teamAvg != null && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <p className="text-xs text-gray-500">
            Moy. effectif (n={teamSize}) : <strong className="text-gray-800">{teamAvg}</strong>
          </p>
          {diff != null && yours > 0 && (
            <p className={`text-xs font-semibold ${diffClass}`}>
              {diff > 0 ? '+' : ''}{diff} vs moyenne
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const MyPerformanceHistoryPanel: React.FC<MyPerformanceHistoryPanelProps> = ({
  rider,
  appState,
  teamBenchmarks,
  currentUser,
}) => {
  const [subTab, setSubTab] = useState<HistorySubTab>('volume');
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const currentSeason = getCurrentSeasonYear();

  const benchmarkAppState = useMemo(
    (): AppState => ({
      ...appState,
      riders: teamBenchmarks.riders,
      performanceArchives: teamBenchmarks.performanceArchives,
    }),
    [appState, teamBenchmarks]
  );

  const qualityHistory = useMemo(
    () => getRiderQualityHistory(benchmarkAppState, rider.id),
    [benchmarkAppState, rider.id]
  );

  useEffect(() => {
    if (qualityHistory.length > 0 && selectedSeason === null) {
      setSelectedSeason(qualityHistory[0].season);
    }
  }, [qualityHistory, selectedSeason]);

  const selectedNote = useMemo(
    () => qualityHistory.find(n => n.season === selectedSeason) ?? null,
    [qualityHistory, selectedSeason]
  );

  const teamQualityAvgs = useMemo(() => {
    if (!selectedSeason) return null;
    const archive = getMergedPerformanceArchive(benchmarkAppState, selectedSeason);
    if (!archive) return null;
    const notes = archive.riderQualityNotes.filter(n => n.riderId !== rider.id);
    if (notes.length < 2) return null;
    return {
      teamSize: notes.length,
      avgs: Object.fromEntries(
        QUALITY_COMPARE_FIELDS.map(f => [f.key, avgField(notes, f.key)])
      ) as Record<string, number | null>,
    };
  }, [benchmarkAppState, selectedSeason, rider.id]);

  const benchmarkRiders = useMemo(
    () => getRidersForArchivePowerAnalysis(benchmarkAppState, currentSeason),
    [benchmarkAppState, currentSeason]
  );

  const subTabs: { id: HistorySubTab; label: string }[] = [
    { id: 'volume', label: 'Volume (Nolio)' },
    { id: 'quality', label: 'Notes qualité' },
    { id: 'powers', label: 'Puissances' },
    { id: 'durability', label: 'Durabilité' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900">Historique & analyses</h3>
        <p className="text-sm text-gray-500 mt-1">
          Vos données personnelles · volumes Nolio · repères effectif anonymes (n=
          {benchmarkRiders.length} coureurs).
        </p>
      </div>

      <nav className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              subTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {subTab === 'volume' && (
        <AthleteTrainingVolumeView currentUser={currentUser} />
      )}

      {subTab === 'quality' && (
        <div className="space-y-4">
          {qualityHistory.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun historique disponible</p>
              <p className="text-sm mt-1">
                Vos notes apparaîtront ici après les débriefings et évaluations de la saison.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {qualityHistory.map(note => (
                  <button
                    key={note.season}
                    type="button"
                    onClick={() => setSelectedSeason(note.season)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedSeason === note.season
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {note.season}
                  </button>
                ))}
              </div>

              {selectedNote && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-3">
                      <h4 className="font-bold">Saison {selectedNote.season}</h4>
                      <p className="text-green-100 text-sm">
                        {selectedNote.eventsWithRatings} éval. · {selectedNote.seasonWins ?? 0} victoire(s)
                      </p>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {QUALITY_COMPARE_FIELDS.map(f => (
                        <QualityMetric
                          key={f.key}
                          label={f.label}
                          value={selectedNote[f.key] as number}
                          accent={f.accent}
                        />
                      ))}
                    </div>
                  </div>

                  {teamQualityAvgs && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 px-1">
                        Comparaison effectif anonyme (n={teamQualityAvgs.teamSize})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {QUALITY_COMPARE_FIELDS.map(f => (
                          <CompareCard
                            key={f.key}
                            label={f.label}
                            yours={selectedNote[f.key] as number}
                            teamAvg={teamQualityAvgs.avgs[f.key] ?? null}
                            accent={f.accent}
                            teamSize={teamQualityAvgs.teamSize}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {subTab === 'powers' && (
        <AthletePowerView rider={rider} teamRiders={benchmarkRiders} season={currentSeason} />
      )}

      {subTab === 'durability' && (
        <AthleteDurabilityView rider={rider} teamRiders={benchmarkRiders} season={currentSeason} />
      )}
    </div>
  );
};

export default MyPerformanceHistoryPanel;

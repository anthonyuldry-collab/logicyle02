import React, { useEffect, useMemo, useState } from 'react';
import { AppState, RaceEvent } from '../../types';
import StageCampMonitoringTab from '../../sections/eventDetailTabs/StageCampMonitoringTab';
import {
  isAltitudeCamp,
  isTrainingCamp,
  listEventDayDates,
} from '../../utils/trainingCampUtils';
import { formatEventDateRange } from '../../utils/dateUtils';

export interface StageCampPerformancePanelProps {
  appState: AppState;
  onSaveRaceEvent?: (event: RaceEvent) => Promise<void>;
  /** Mode athlète : uniquement ses lignes / stages où il est sélectionné */
  lockedRiderId?: string;
  readOnly?: boolean;
  /** Ouvrir la fiche événement (optionnel) */
  onOpenEvent?: (eventId: string) => void;
}

const StageCampPerformancePanel: React.FC<StageCampPerformancePanelProps> = ({
  appState,
  onSaveRaceEvent,
  lockedRiderId,
  readOnly = false,
  onOpenEvent,
}) => {
  const camps = useMemo(() => {
    const list = (appState.raceEvents || [])
      .filter(isTrainingCamp)
      .filter((e) =>
        lockedRiderId
          ? (e.selectedRiderIds || []).includes(lockedRiderId)
          : true,
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [appState.raceEvents, lockedRiderId]);

  const [selectedEventId, setSelectedEventId] = useState<string>(camps[0]?.id || '');

  useEffect(() => {
    if (camps.length === 0) {
      setSelectedEventId('');
      return;
    }
    if (!camps.some((c) => c.id === selectedEventId)) {
      setSelectedEventId(camps[0].id);
    }
  }, [camps, selectedEventId]);

  const selectedEvent = useMemo(() => {
    const fromList = camps.find((c) => c.id === selectedEventId);
    if (!fromList) return null;
    // Toujours prendre la version fraîche depuis appState (métriques à jour)
    return appState.raceEvents.find((e) => e.id === fromList.id) || fromList;
  }, [camps, selectedEventId, appState.raceEvents]);

  const updateEvent = async (partial: Partial<RaceEvent>) => {
    if (!selectedEvent || !onSaveRaceEvent) return;
    await onSaveRaceEvent({ ...selectedEvent, ...partial });
  };

  if (camps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-sm font-medium text-gray-700">Aucun stage au calendrier</p>
        <p className="text-xs text-gray-500 mt-1">
          {lockedRiderId
            ? 'Vous n’êtes inscrit(e) sur aucun événement de type Stage pour le moment.'
            : 'Créez un événement de type « Stage » pour activer le suivi HRV, SpO₂, hydratation et le monitoring altitude.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 justify-between">
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Stage à suivre</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full max-w-xl text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              {camps.map((camp) => {
                const days = listEventDayDates(camp).length;
                const metricsCount = (camp.campAthleteDailyMetrics || []).length;
                return (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} · {formatEventDateRange(camp)}
                    {isAltitudeCamp(camp) ? ' · altitude' : ''}
                    {` · ${days} j`}
                    {metricsCount > 0 ? ` · ${metricsCount} saisies` : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedEvent && isAltitudeCamp(selectedEvent) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-100">
                Stage altitude
                {selectedEvent.altitudeCampMeta?.altitudeMeters
                  ? ` · ${selectedEvent.altitudeCampMeta.altitudeMeters} m`
                  : ''}
              </span>
            )}
            {onOpenEvent && selectedEvent && (
              <button
                type="button"
                onClick={() => onOpenEvent(selectedEvent.id)}
                className="text-xs font-medium text-sky-700 hover:underline px-2 py-1"
              >
                Ouvrir la fiche événement →
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {lockedRiderId
            ? 'Votre suivi quotidien et les graphiques de comparaison entre stages.'
            : 'Monitoring collectif : saisie journalière, graphiques athlète et comparaison entre stages.'}
        </p>
      </div>

      {selectedEvent && (
        <StageCampMonitoringTab
          event={selectedEvent}
          eventId={selectedEvent.id}
          appState={appState}
          updateEvent={updateEvent}
          readOnly={readOnly || !onSaveRaceEvent}
          lockedRiderId={lockedRiderId}
        />
      )}
    </div>
  );
};

export default StageCampPerformancePanel;

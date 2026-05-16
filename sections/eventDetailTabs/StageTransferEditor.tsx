import React, { useEffect, useState } from 'react';
import { AppState, RaceEvent, StageTransferLogistics } from '../../types';
import { saveData } from '../../services/firebaseService';
import { ensureStageRaceLogistics, formatStageDateLabel, isStageRace } from '../../utils/stageRaceUtils';
import { stageTransferFields } from './stageRaceFields';
import ActionButton from '../../components/ActionButton';
import { formatEventDateRange } from '../../utils/dateUtils';

interface StageTransferEditorProps {
  event: RaceEvent;
  eventId: string;
  updateEvent: (data: Partial<RaceEvent>) => void;
  appState: AppState;
  /** Afficher uniquement le transfert après cette étape (index 0 = après étape 1). */
  transferIndex?: number;
  /** Masquer l’en-tête global (intégration dans un sous-onglet étape). */
  embedded?: boolean;
}

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const StageTransferEditor: React.FC<StageTransferEditorProps> = ({
  event,
  eventId,
  updateEvent,
  appState,
  transferIndex,
  embedded = false,
}) => {
  const [formData, setFormData] = useState<RaceEvent>(() => ensureStageRaceLogistics(event));
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(ensureStageRaceLogistics(event));
  }, [event]);

  const transfers = formData.raceInfo?.transfers ?? [];
  const stageDays = formData.raceInfo?.stageDays ?? [];

  useEffect(() => {
    if (activeTab >= transfers.length && transfers.length > 0) {
      setActiveTab(transfers.length - 1);
    }
  }, [transfers.length, activeTab]);

  if (!isStageRace(formData)) {
    return (
      <p className="text-sm text-gray-500 italic py-6 text-center">
        Les transferts entre étapes sont disponibles pour les courses à étapes (date de fin différente du début).
      </p>
    );
  }

  if (transfers.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic py-6 text-center">
        Aucun transfert à planifier (une seule étape ou dates non définies).
      </p>
    );
  }

  const resolvedIndex =
    transferIndex !== undefined
      ? Math.min(Math.max(0, transferIndex), transfers.length - 1)
      : Math.min(Math.max(0, activeTab), transfers.length - 1);
  const safeIndex = resolvedIndex;
  const transfer = transfers[safeIndex];
  const fromStage = stageDays[safeIndex];
  const toStage = stageDays[safeIndex + 1];

  if (transferIndex !== undefined && transferIndex >= transfers.length) {
    return null;
  }

  const lightInputClass =
    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500';

  const handleTransferChange = (
    transferId: string,
    field: keyof StageTransferLogistics,
    value: string | number | undefined,
  ) => {
    setFormData(prev => ({
      ...prev,
      raceInfo: {
        ...prev.raceInfo,
        transfers: (prev.raceInfo.transfers || []).map(t =>
          t.id === transferId ? { ...t, [field]: value } : t,
        ),
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave = ensureStageRaceLogistics({ ...formData, id: eventId });
      if (appState.activeTeamId) {
        await saveData(appState.activeTeamId, 'raceEvents', toSave);
      }
      updateEvent(toSave);
      setFormData(toSave);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde des transferts.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-4 ${embedded ? 'mt-6' : ''}`}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-md px-3 py-2 flex-1">
            Transferts entre étapes — {formatEventDateRange(formData)}. Un onglet par liaison entre deux journées.
          </p>
          <ActionButton onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? 'Sauvegarde…' : 'Sauvegarder les transferts'}
          </ActionButton>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {transferIndex === undefined && (
          <nav className="flex overflow-x-auto border-b border-gray-200 bg-gray-50" aria-label="Transferts">
          {transfers.map((t, index) => {
            const isActive = index === safeIndex;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`flex-shrink-0 px-4 py-3 text-left border-b-2 transition-colors min-w-[8rem] focus:outline-none
                  ${isActive
                    ? 'border-sky-500 bg-white text-sky-900'
                    : 'border-transparent text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span className="block text-sm font-semibold">
                  Étape {index + 1} → {index + 2}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {shortDate(t.fromDate)} → {shortDate(t.toDate)}
                </span>
              </button>
            );
          })}
        </nav>
        )}

        <div className="p-4 sm:p-5">
          {embedded && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h4 className="text-sm font-semibold text-sky-900 uppercase tracking-wide">
                🚌 Transfert vers l&apos;étape {toStage?.stageNumber ?? safeIndex + 2}
              </h4>
              <ActionButton onClick={handleSave} disabled={isSaving} size="sm" variant="secondary">
                {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
              </ActionButton>
            </div>
          )}
          {!embedded && (
          <h4 className="text-sm font-semibold text-sky-900 uppercase tracking-wide mb-1">
            Transfert vers l&apos;étape {toStage?.stageNumber ?? safeIndex + 2}
          </h4>
          )}
          <p className="text-xs text-gray-500 mb-4">
            {formatStageDateLabel(transfer.fromDate)} → {formatStageDateLabel(transfer.toDate)}
            {fromStage?.arriveeLocation && toStage?.departLocation && (
              <> · {fromStage.arriveeLocation} → {toStage.departLocation}</>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            {stageTransferFields.map(({ key, label, type }) => (
              <div key={key} className={key === 'notes' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <input
                  type={type === 'number' ? 'number' : 'text'}
                  value={(transfer[key] as string | number) ?? ''}
                  onChange={e =>
                    handleTransferChange(
                      transfer.id,
                      key,
                      type === 'number'
                        ? e.target.value === ''
                          ? undefined
                          : parseFloat(e.target.value)
                        : e.target.value,
                    )
                  }
                  className={lightInputClass}
                  step={type === 'number' ? 'any' : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageTransferEditor;

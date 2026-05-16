import React, { useEffect, useState } from 'react';
import {
  AccommodationStatus,
  AppState,
  RaceEvent,
  StageDayAccommodation,
} from '../../types';
import { saveData } from '../../services/firebaseService';
import {
  ensureStageRaceLogistics,
  formatStageDateLabel,
  getAccommodationNightDate,
  isStageRace,
} from '../../utils/stageRaceUtils';
import { stageAccommodationFields } from './stageRaceFields';
import StageRaceSubTabs from './StageRaceSubTabs';
import ActionButton from '../../components/ActionButton';
import { formatEventDateRange } from '../../utils/dateUtils';

interface StageAccommodationEditorProps {
  event: RaceEvent;
  eventId: string;
  updateEvent: (data: Partial<RaceEvent>) => void;
  appState: AppState;
  canViewFinancialInfo?: boolean;
}

const StageAccommodationEditor: React.FC<StageAccommodationEditorProps> = ({
  event,
  eventId,
  updateEvent,
  appState,
  canViewFinancialInfo = false,
}) => {
  const [formData, setFormData] = useState<RaceEvent>(() => ensureStageRaceLogistics(event));
  const [activeStageTab, setActiveStageTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(ensureStageRaceLogistics(event));
  }, [event]);

  const stageDays = formData.raceInfo?.stageDays ?? [];
  const stageAccommodations = formData.raceInfo?.stageAccommodations ?? [];

  useEffect(() => {
    if (activeStageTab >= stageDays.length && stageDays.length > 0) {
      setActiveStageTab(stageDays.length - 1);
    }
  }, [stageDays.length, activeStageTab]);

  if (!isStageRace(formData)) {
    return null;
  }

  const lightInputClass =
    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500';

  const getAccoForStage = (stageDate: string, stageNumber: number): StageDayAccommodation | undefined =>
    stageAccommodations.find(a => a.stageDate === stageDate)
    ?? stageAccommodations.find(a => a.stageNumber === stageNumber)
    ?? stageAccommodations.find(a => a.date === stageDate);

  const handleAccoChange = (
    accoId: string,
    field: keyof StageDayAccommodation,
    value: string | number | boolean | undefined,
  ) => {
    setFormData(prev => ({
      ...prev,
      raceInfo: {
        ...prev.raceInfo,
        stageAccommodations: (prev.raceInfo.stageAccommodations || []).map(a =>
          a.id === accoId ? { ...a, [field]: value } : a,
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
      alert("Erreur lors de la sauvegarde de l'hébergement par étape.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderFields = (acco: StageDayAccommodation) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
      {stageAccommodationFields.map(({ key, label, type }) => {
        if (key === 'estimatedCost' && !canViewFinancialInfo) return null;
        if (type === 'checkbox') {
          return (
            <div key={key} className="flex items-center md:col-span-2">
              <input
                type="checkbox"
                id={`${acco.id}-${key}`}
                checked={Boolean(acco[key])}
                onChange={e => handleAccoChange(acco.id, key, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor={`${acco.id}-${key}`} className="ml-2 text-sm text-gray-700">
                {label}
              </label>
            </div>
          );
        }
        if (type === 'select' && key === 'status') {
          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <select
                value={acco.status}
                onChange={e => handleAccoChange(acco.id, key, e.target.value as AccommodationStatus)}
                className={lightInputClass}
              >
                {Object.values(AccommodationStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div key={key} className={key === 'address' || key === 'notes' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {key === 'address' ? (
              <textarea
                rows={2}
                value={(acco[key] as string) || ''}
                onChange={e => handleAccoChange(acco.id, key, e.target.value)}
                className={lightInputClass}
              />
            ) : (
              <input
                type={type === 'number' ? 'number' : 'text'}
                value={(acco[key] as string | number) ?? ''}
                onChange={e =>
                  handleAccoChange(
                    acco.id,
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
                min={type === 'number' ? 0 : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 mb-8 pb-8 border-b border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 flex-1">
          Hébergement par étape — {formatEventDateRange(formData)}. Chaque onglet correspond à la nuit de la veille avant le jour de course.
        </p>
        <ActionButton onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? 'Sauvegarde…' : 'Sauvegarder l\'hébergement par étape'}
        </ActionButton>
      </div>

      <StageRaceSubTabs
        stageDays={stageDays}
        transfers={[]}
        activeIndex={activeStageTab}
        onSelectTab={setActiveStageTab}
      >
        {stage => {
          const acco = getAccoForStage(stage.date, stage.stageNumber);
          const nightDate = acco?.nightDate ?? getAccommodationNightDate(stage.date);
          if (!acco) {
            return (
              <p className="text-sm text-gray-500 italic">
                Aucune donnée d&apos;hébergement pour la veille du {formatStageDateLabel(stage.date)}.
              </p>
            );
          }
          return (
            <section>
              <p className="text-xs text-gray-500 mb-2">
                Étape du {formatStageDateLabel(stage.date)}
                {stage.stageLabel ? ` — ${stage.stageLabel}` : ''}
              </p>
              <h4 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide mb-3">
                Hébergement — nuit du {formatStageDateLabel(nightDate)}
                <span className="font-normal normal-case text-gray-600 ml-1">
                  (veille avant l&apos;étape)
                </span>
              </h4>
              {renderFields(acco)}
            </section>
          );
        }}
      </StageRaceSubTabs>
    </div>
  );
};

export default StageAccommodationEditor;

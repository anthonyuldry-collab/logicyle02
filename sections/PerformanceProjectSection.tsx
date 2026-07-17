import React, { useState, useEffect } from 'react';
import { Rider, PerformanceFactorDetail, PerformanceActionItem, PerformanceProjectEntry } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { PERFORMANCE_PROJECT_FACTORS_CONFIG } from '../constants';
import LungsIcon from '../components/icons/LungsIcon';
import CyclingIcon from '../components/icons/CyclingIcon';
import BrainIcon from '../components/icons/BrainIcon';
import MountainIcon from '../components/icons/MountainIcon';
import TacticsIcon from '../components/icons/TacticsIcon';
import PerformanceActionItemsEditor from '../components/performance/PerformanceActionItemsEditor';
import PerformanceFieldItemsEditor from '../components/performance/PerformanceFieldItemsEditor';
import PerformanceProjectHistoryPanel from '../components/performance/PerformanceProjectHistoryPanel';
import { FIELD_KIND_CONFIG, PerformanceFieldKind, withPerformanceProjectHistory } from '../utils/performanceProjectUtils';

const iconComponents: Record<string, React.ElementType> = {
  LungsIcon,
  CyclingIcon,
  BrainIcon,
  MountainIcon,
  TacticsIcon,
};

interface PerformanceProjectSectionProps {
  rider: Rider | undefined;
  setRiders: (updater: React.SetStateAction<Rider[]>) => void;
  onSaveRider: (rider: Rider) => void;
}

export const PerformanceProjectSection: React.FC<PerformanceProjectSectionProps> = ({ rider, setRiders, onSaveRider }) => {
  const [formData, setFormData] = useState<Rider | null>(rider || null);

  useEffect(() => {
    setFormData(rider || null);
  }, [rider]);

  const handleSave = async () => {
    if (formData && rider) {
      try {
        const updated = withPerformanceProjectHistory(rider, formData);
        await onSaveRider(updated);
        setRiders(prevRiders => prevRiders.map(r => r.id === updated.id ? updated : r));
        setFormData(updated);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
    }
  };

  const handleActionItemsChange = (factorId: string, items: PerformanceActionItem[]) => {
    setFormData(prev => {
      if (!prev) return null;
      const current = (prev as unknown as Record<string, PerformanceFactorDetail>)[factorId];
      return {
        ...prev,
        [factorId]: { ...current, actionItems: items },
      };
    });
  };

  const handleFieldEntriesChange = (
    factorId: string,
    kind: PerformanceFieldKind,
    entries: PerformanceProjectEntry[]
  ) => {
    const entriesKey = FIELD_KIND_CONFIG[kind].entriesKey;
    setFormData(prev => {
      if (!prev) return null;
      const current = (prev as unknown as Record<string, PerformanceFactorDetail>)[factorId];
      return {
        ...prev,
        [factorId]: { ...current, [entriesKey]: entries },
      };
    });
  };

  const handleNotesChange = (factorId: string, notes: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const current = (prev as unknown as Record<string, PerformanceFactorDetail>)[factorId];
      return {
        ...prev,
        [factorId]: { ...current, besoinsActions: notes },
      };
    });
  };

  if (!formData) {
    return <SectionWrapper title="Mon Projet Performance"><p>Chargement des données...</p></SectionWrapper>;
  }
  
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";

  return (
    <SectionWrapper title="Mon Projet Performance" actionButton={<ActionButton onClick={handleSave}>Sauvegarder mon Projet</ActionButton>}>
      <p className="text-gray-600 mb-6">
        Décrivez vos forces et les axes de travail pour chaque grand domaine de la performance. Ce document servira de base de discussion avec votre entraîneur et le pôle performance.
      </p>
      <div className="space-y-6">
        {PERFORMANCE_PROJECT_FACTORS_CONFIG.map(({ id, label, icon, forcesPrompts }) => {
          const IconComponent = iconComponents[icon];
          const projectData = (formData as any)[id] as PerformanceFactorDetail | undefined;
          return (
            <div key={id} className="bg-white p-4 rounded-lg shadow-md border">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <IconComponent className="w-6 h-6 mr-3 text-blue-500" />
                {label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Forces</label>
                    <PerformanceFieldItemsEditor
                      factor={projectData || { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' }}
                      kind="forces"
                      isEditing
                      onChange={entries => handleFieldEntriesChange(id, 'forces', entries)}
                      placeholder={`Ex : ${forcesPrompts.join(', ')}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>À Optimiser (détails techniques, points faibles)</label>
                    <PerformanceFieldItemsEditor
                      factor={projectData || { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' }}
                      kind="aOptimiser"
                      isEditing
                      onChange={entries => handleFieldEntriesChange(id, 'aOptimiser', entries)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>À Développer (qualités à acquérir)</label>
                    <PerformanceFieldItemsEditor
                      factor={projectData || { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' }}
                      kind="aDevelopper"
                      isEditing
                      onChange={entries => handleFieldEntriesChange(id, 'aDevelopper', entries)}
                    />
                  </div>
                   <div className="md:col-span-2">
                    <label className={labelClass}>Besoins / Actions (objectifs datés)</label>
                    <PerformanceActionItemsEditor
                      factor={projectData || { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' }}
                      isEditing
                      onChange={items => handleActionItemsChange(id, items)}
                      onNotesChange={notes => handleNotesChange(id, notes)}
                    />
                  </div>
              </div>
            </div>
          );
        })}
      </div>
      <PerformanceProjectHistoryPanel history={formData.performanceProjectHistory ?? []} />
    </SectionWrapper>
  );
};
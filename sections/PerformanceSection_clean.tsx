import React, { useState, useMemo, useEffect } from 'react';
import { AppState, AppSection, TeamProduct, Rider, PowerProfile, RiderQualitativeProfile as RiderQualitativeProfileEnum, PerformanceEntry, RiderRating, RaceEvent, User, TeamRole, EventType, RiderEventStatus, ScoutingProfile, StaffRole, ContractType, Sex } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { RIDER_QUALITATIVE_PROFILE_COLORS, COGGAN_CATEGORY_COLORS, POWER_PROFILE_REFERENCE_TABLES, riderProfileKeyToRefTableKeyMap, POWER_ANALYSIS_DURATIONS_CONFIG, PERFORMANCE_SCORE_WEIGHTS, COLLECTIVE_SCORE_PENALTY_THRESHOLD, COLLECTIVE_SCORE_PENALTY_MULTIPLIER, CATEGORY_ID_TO_SCALE_MAP, EVENT_CATEGORY_POINTS_TABLE, RIDER_LEVEL_CATEGORIES } from '../constants';
import TrophyIcon from '../components/icons/TrophyIcon';
import StarIcon from '../components/icons/StarIcon';
import TrendingUpIcon from '../components/icons/TrendingUpIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import PerformanceProjectTab from '../components/riderDetailTabs/PerformanceProjectTab';
import { ResultsTab } from '../components/riderDetailTabs/ResultsTab';
import EyeIcon from '../components/icons/EyeIcon';
import EyeSlashIcon from '../components/icons/EyeSlashIcon';
import UsersIcon from '../components/icons/UsersIcon';
import CakeIcon from '../components/icons/CakeIcon';
import { getAgeCategory } from '../utils/ageUtils';
import { getRiderCharacteristicSafe } from '../utils/riderUtils';
import { RiderComparisonChart, RiderRadarChart, PerformanceTrendsChart, RiderComparisonRadarChart, RiderComparisonSelector } from '../components/PerformanceCharts';
import PowerAnalysisTable from '../components/PowerAnalysisTable';

// Type definitions for the new section
type PerformancePoleTab = 'global' | 'powerAnalysis' | 'charts' | 'comparison' | 'nutritionProducts' | 'planning';
type RiderPerformanceTab = 'ppr' | 'project' | 'results';
type ObjectiveCode = 'bleu' | 'vert' | 'orange';
type PowerDisplayMode = 'watts' | 'wattsPerKg';
type PowerDuration = '1s' | '5s' | '30s' | '1min' | '3min' | '5min' | '12min' | '20min' | 'cp';

// Helper function for ID generation
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

// Initial state for the nutrition product form
const initialProductFormState: Omit<TeamProduct, 'id'> = {
  name: '',
  type: 'gel',
  brand: '',
  carbs: 0,
  glucose: undefined,
  fructose: undefined,
  caffeine: undefined,
  sodium: undefined,
  notes: ''
};

const calculateWkg = (power?: number, weight?: number): string => {
  if (typeof power === 'number' && typeof weight === 'number' && weight > 0) {
    return (power / weight).toFixed(1);
  }
  return "-";
};

// Configuration des durées de puissance pour le tri et l'affichage
const POWER_DURATIONS_CONFIG: { key: PowerDuration; label: string; powerKey: keyof PowerProfile; unit: string; color: string }[] = [
  { key: '1s', label: '1 Seconde', powerKey: 'power1s', unit: 'W', color: 'bg-red-500' },
  { key: '5s', label: '5 Secondes', powerKey: 'power5s', unit: 'W', color: 'bg-orange-500' },
  { key: '30s', label: '30 Secondes', powerKey: 'power30s', unit: 'W', color: 'bg-yellow-500' },
  { key: '1min', label: '1 Minute', powerKey: 'power1min', unit: 'W', color: 'bg-lime-500' },
  { key: '3min', label: '3 Minutes', powerKey: 'power3min', unit: 'W', color: 'bg-green-500' },
  { key: '5min', label: '5 Minutes', powerKey: 'power5min', unit: 'W', color: 'bg-teal-500' },
  { key: '12min', label: '12 Minutes', powerKey: 'power12min', unit: 'W', color: 'bg-blue-500' },
  { key: '20min', label: '20 Minutes', powerKey: 'power20min', unit: 'W', color: 'bg-indigo-500' },
  { key: 'cp', label: 'CP/FTP', powerKey: 'criticalPower', unit: 'W', color: 'bg-purple-500' }
];

// Fonction pour obtenir la valeur de puissance d'un rider
const getRiderPowerValue = (rider: Rider, duration: PowerDuration, mode: PowerDisplayMode): number => {
  const config = POWER_DURATIONS_CONFIG.find(c => c.key === duration);
  if (!config) return 0;
  
  const powerProfile = rider.powerProfileFresh;
  if (!powerProfile) return 0;
  
  const powerValue = powerProfile[config.powerKey] as number;
  if (typeof powerValue !== 'number' || isNaN(powerValue)) return 0;
  
  if (mode === 'wattsPerKg' && rider.weightKg) {
    return powerValue / rider.weightKg;
  }
  
  return powerValue;
};

// Fonction pour obtenir la couleur de performance basée sur la valeur
const getPerformanceColor = (value: number, duration: PowerDuration, mode: PowerDisplayMode): string => {
  // Seuils de performance (à ajuster selon vos critères)
  const thresholds = {
    '1s': { excellent: mode === 'wattsPerKg' ? 18 : 1000, veryGood: mode === 'wattsPerKg' ? 16 : 900, good: mode === 'wattsPerKg' ? 14 : 800 },
    '5s': { excellent: mode === 'wattsPerKg' ? 16 : 900, veryGood: mode === 'wattsPerKg' ? 14 : 800, good: mode === 'wattsPerKg' ? 12 : 700 },
    '30s': { excellent: mode === 'wattsPerKg' ? 12 : 700, veryGood: mode === 'wattsPerKg' ? 10 : 600, good: mode === 'wattsPerKg' ? 8 : 500 },
    '1min': { excellent: mode === 'wattsPerKg' ? 10 : 600, veryGood: mode === 'wattsPerKg' ? 8 : 500, good: mode === 'wattsPerKg' ? 6 : 400 },
    '3min': { excellent: mode === 'wattsPerKg' ? 8 : 500, veryGood: mode === 'wattsPerKg' ? 6 : 400, good: mode === 'wattsPerKg' ? 5 : 300 },
    '5min': { excellent: mode === 'wattsPerKg' ? 7 : 400, veryGood: mode === 'wattsPerKg' ? 5 : 300, good: mode === 'wattsPerKg' ? 4 : 250 },
    '12min': { excellent: mode === 'wattsPerKg' ? 6 : 350, veryGood: mode === 'wattsPerKg' ? 4 : 250, good: mode === 'wattsPerKg' ? 3 : 200 },
    '20min': { excellent: mode === 'wattsPerKg' ? 5 : 300, veryGood: mode === 'wattsPerKg' ? 4 : 250, good: mode === 'wattsPerKg' ? 3 : 200 },
    'cp': { excellent: mode === 'wattsPerKg' ? 5 : 300, veryGood: mode === 'wattsPerKg' ? 4 : 250, good: mode === 'wattsPerKg' ? 3 : 200 }
  };
  
  const threshold = thresholds[duration];
  if (value >= threshold.excellent) return 'bg-blue-500 text-white';
  if (value >= threshold.veryGood) return 'bg-green-500 text-white';
  if (value >= threshold.good) return 'bg-yellow-500 text-white';
  return 'bg-gray-500 text-white';
};

// Fonction pour obtenir le label de performance
const getPerformanceLabel = (value: number, duration: PowerDuration, mode: PowerDisplayMode): string => {
  const thresholds = {
    '1s': { excellent: mode === 'wattsPerKg' ? 18 : 1000, veryGood: mode === 'wattsPerKg' ? 16 : 900, good: mode === 'wattsPerKg' ? 14 : 800 },
    '5s': { excellent: mode === 'wattsPerKg' ? 16 : 900, veryGood: mode === 'wattsPerKg' ? 14 : 800, good: mode === 'wattsPerKg' ? 12 : 700 },
    '30s': { excellent: mode === 'wattsPerKg' ? 12 : 700, veryGood: mode === 'wattsPerKg' ? 10 : 600, good: mode === 'wattsPerKg' ? 8 : 500 },
    '1min': { excellent: mode === 'wattsPerKg' ? 10 : 600, veryGood: mode === 'wattsPerKg' ? 8 : 500, good: mode === 'wattsPerKg' ? 6 : 400 },
    '3min': { excellent: mode === 'wattsPerKg' ? 8 : 500, veryGood: mode === 'wattsPerKg' ? 6 : 400, good: mode === 'wattsPerKg' ? 5 : 300 },
    '5min': { excellent: mode === 'wattsPerKg' ? 7 : 400, veryGood: mode === 'wattsPerKg' ? 5 : 300, good: mode === 'wattsPerKg' ? 4 : 250 },
    '12min': { excellent: mode === 'wattsPerKg' ? 6 : 350, veryGood: mode === 'wattsPerKg' ? 4 : 250, good: mode === 'wattsPerKg' ? 3 : 200 },
    '20min': { excellent: mode === 'wattsPerKg' ? 5 : 300, veryGood: mode === 'wattsPerKg' ? 4 : 250, good: mode === 'wattsPerKg' ? 3 : 200 },
    'cp': { excellent: mode === 'wattsPerKg' ? 5 : 300, veryGood: mode === 'wattsPerKg' ? 4 : 250, good: mode === 'wattsPerKg' ? 3 : 200 }
  };
  
  const threshold = thresholds[duration];
  if (value >= threshold.excellent) return 'Excellent';
  if (value >= threshold.veryGood) return 'Très Bon';
  if (value >= threshold.good) return 'Bon';
  return 'Modéré';
};

// Composant principal de la section des performances
export const PerformanceSection: React.FC<{ appState: AppState }> = ({ appState }) => {
  // Protection contre appState null/undefined
  if (!appState) {
    console.warn('⚠️ PerformanceSection: appState is null or undefined');
    return (
      <SectionWrapper title="Centre Stratégique des Performances">
        <div className="p-6 text-center text-gray-500">
          Chargement des données...
        </div>
      </SectionWrapper>
    );
  }
  const [activeTab, setActiveTab] = useState<PerformancePoleTab>('global');
  const [activeRiderTab, setActiveRiderTab] = useState<RiderPerformanceTab>('ppr');
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<PowerDisplayMode>('wattsPerKg');
  const [selectedDurations, setSelectedDurations] = useState<PowerDuration[]>(['1s']);

  const riders = appState.riders || [];
  const scoutingProfiles = appState.scoutingProfiles || [];

  const tabButtonStyle = (tabName: PerformancePoleTab) => 
    `px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeTab === tabName 
        ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <SectionWrapper title="Centre Stratégique des Performances">
      {/* Onglets principaux réorganisés */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('global')} className={tabButtonStyle('global')}>
            <UsersIcon className="w-4 h-4 inline mr-2" />
            Vue d'Ensemble
          </button>
          <button onClick={() => setActiveTab('powerAnalysis')} className={tabButtonStyle('powerAnalysis')}>
            <ChartBarIcon className="w-4 h-4 inline mr-2" />
            Analyse des Puissances
          </button>
          <button onClick={() => setActiveTab('charts')} className={tabButtonStyle('charts')}>
            <TrendingUpIcon className="w-4 h-4 inline mr-2" />
            Graphiques
          </button>
          <button onClick={() => setActiveTab('comparison')} className={tabButtonStyle('comparison')}>
            <ChartBarIcon className="w-4 h-4 inline mr-2" />
            Comparaison
          </button>
          <button onClick={() => setActiveTab('nutritionProducts')} className={tabButtonStyle('nutritionProducts')}>
            <StarIcon className="w-4 h-4 inline mr-2" />
            Produits Nutrition
          </button>
          <button onClick={() => setActiveTab('planning')} className={tabButtonStyle('planning')}>
            <TrophyIcon className="w-4 h-4 inline mr-2" />
            Planification
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Coureurs</p>
                  <p className="text-2xl font-bold text-gray-900">{riders.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <span className="text-pink-600 font-bold text-lg">F</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Femmes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {riders.filter(r => r.sex === Sex.FEMALE).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 font-bold text-lg">M</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Hommes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {riders.filter(r => r.sex === Sex.MALE).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUpIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Moyenne CP</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {riders.length > 0 
                      ? (riders.reduce((sum, r) => {
                          const cp = r.powerProfileFresh?.criticalPower || 0;
                          return sum + cp;
                        }, 0) / riders.length).toFixed(0)
                      : '0'} W
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition par catégorie d'âge */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Catégorie d'Âge</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {['U15', 'U17', 'U19', 'U23', 'Senior'].map(category => (
                <div key={category} className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {riders.filter(r => {
                      const { category: riderCategory } = getAgeCategory(r.birthDate);
                      return riderCategory === category;
                    }).length}
                  </div>
                  <div className="text-sm text-gray-500">{category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'powerAnalysis' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              📊 Analyse des Puissances
            </h3>
            <p className="text-blue-800 text-sm">
              Tableau complet d'analyse des performances de puissance avec filtres avancés, 
              tri par colonnes, et comparaison entre coureurs et scouts.
              Triez par durée spécifique, filtrez par sexe et catégorie d'âge, 
              et basculez entre watts bruts et watts par kilo pour optimiser vos stratégies.
            </p>
          </div>
          
          <PowerAnalysisTable riders={riders} scoutingProfiles={scoutingProfiles} />
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Graphiques de Performance</h3>
            <p className="text-gray-600">Graphiques et visualisations des performances des coureurs.</p>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparaison des Coureurs</h3>
            <p className="text-gray-600">Comparaison détaillée entre les coureurs.</p>
          </div>
        </div>
      )}

      {activeTab === 'nutritionProducts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Produits Nutrition</h3>
            <p className="text-gray-600">Gestion des produits nutritionnels de l'équipe.</p>
          </div>
        </div>
      )}

      {activeTab === 'planning' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Planification</h3>
            <p className="text-gray-600">Planification des entraînements et compétitions.</p>
          </div>
        </div>
      )}

      {/* Modal pour les détails du coureur */}
      {isRiderModalOpen && selectedRider && (
        <Modal
          isOpen={isRiderModalOpen}
          onClose={() => {
            setIsRiderModalOpen(false);
            setSelectedRider(null);
          }}
          title={`Détails - ${selectedRider.firstName} ${selectedRider.lastName}`}
        >
          <div className="space-y-6">
            {/* Onglets pour les détails du coureur */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveRiderTab('ppr')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeRiderTab === 'ppr'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  PPR
                </button>
                <button
                  onClick={() => setActiveRiderTab('project')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeRiderTab === 'project'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Projet
                </button>
                <button
                  onClick={() => setActiveRiderTab('results')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeRiderTab === 'results'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Résultats
                </button>
              </nav>
            </div>

            {/* Contenu des onglets du coureur */}
            {activeRiderTab === 'ppr' && (
              <PerformanceProjectTab rider={selectedRider} />
            )}
            {activeRiderTab === 'project' && (
              <div className="p-4">
                <p className="text-gray-600">Contenu du projet pour {selectedRider.firstName} {selectedRider.lastName}</p>
              </div>
            )}
            {activeRiderTab === 'results' && (
              <ResultsTab rider={selectedRider} />
            )}
          </div>
        </Modal>
      )}
    </SectionWrapper>
  );
};

// Export par défaut pour résoudre l'erreur d'import dans App.tsx
export default PerformanceSection;

import React, { useState, useMemo, useEffect } from 'react';
import { Rider, ScoutingProfile, Sex } from '../../types';
import { getAgeCategory } from '../../utils/ageUtils';
import {
  computeGroupAverages,
  getCellInsight,
  type PowerDurationKey,
  computePowerStatsReport,
  getPowerRowsWithData,
} from '../../utils/performanceInsights';
import { getCurrentSeasonYear } from '../../utils/seasonUtils';
import { ALL_TIME_STATS_SEASON } from '../../utils/performanceArchiveUtils';
import PowerStatsPanel from '../PowerStatsPanel';

interface PowerAnalysisTableProps {
  riders: Rider[];
  scoutingProfiles?: ScoutingProfile[];
  /** Titre du bloc (ex. mode archives) */
  title?: string;
  /** Afficher l'option scouts par défaut */
  defaultIncludeScouts?: boolean;
  /** Masquer complètement l'option scouts */
  hideScoutsOption?: boolean;
  /** IDs des coureuses retirées (badge dans le tableau archives) */
  removedRiderIds?: Set<string>;
  /** Panneau méthodo + min/moy/max (comme Pertes fatigue) */
  showStatsPanel?: boolean;
  /** Année affichée dans le panneau (défaut : saison courante) */
  season?: number;
  /** Référence gagnantes (victoires sur la saison) */
  winnerRiderIds?: Set<string>;
  /** Inclure tous les scouts sans case à cocher */
  alwaysIncludeScouts?: boolean;
  /** Libellé scope (ex. « All time ») */
  scopeLabel?: string;
}

const PowerAnalysisTable: React.FC<PowerAnalysisTableProps> = ({ 
  riders, 
  scoutingProfiles = [],
  title = 'Analyse des Puissances',
  defaultIncludeScouts = false,
  hideScoutsOption = false,
  removedRiderIds,
  showStatsPanel = true,
  season,
  winnerRiderIds = new Set(),
  alwaysIncludeScouts = false,
  scopeLabel,
}) => {
  const [displayMode, setDisplayMode] = useState<'watts' | 'wattsPerKg'>('wattsPerKg');
  const [sortBy, setSortBy] = useState<string>('cp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [genderFilter, setGenderFilter] = useState<'all' | Sex>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | string>('all');
  const [includeScouts, setIncludeScouts] = useState<boolean>(
    alwaysIncludeScouts || defaultIncludeScouts
  );
  const [fatigueProfile, setFatigueProfile] = useState<'fresh' | '15kj' | '30kj' | '45kj'>('fresh');

  useEffect(() => {
    if (alwaysIncludeScouts) setIncludeScouts(true);
  }, [alwaysIncludeScouts]);

  // Configuration des durées de puissance
  const powerDurations = [
    { key: '1s', label: '1s', field: 'power1s' },
    { key: '5s', label: '5s', field: 'power5s' },
    { key: '30s', label: '30s', field: 'power30s' },
    { key: '1min', label: '1min', field: 'power1min' },
    { key: '3min', label: '3min', field: 'power3min' },
    { key: '5min', label: '5min', field: 'power5min' },
    { key: '12min', label: '12min', field: 'power12min' },
    { key: '20min', label: '20min', field: 'power20min' },
    { key: 'cp', label: 'CP', field: 'criticalPower' }
  ];

  // Fonction pour obtenir la valeur de puissance selon le profil de fatigue
  const getPowerValue = (item: Rider | ScoutingProfile, duration: string, mode: 'watts' | 'wattsPerKg'): number => {
    let powerProfile;
    
    if ('powerProfileFresh' in item) {
      // C'est un Rider
      switch (fatigueProfile) {
        case 'fresh':
          powerProfile = item.powerProfileFresh;
          break;
        case '15kj':
          powerProfile = item.powerProfile15KJ;
          break;
        case '30kj':
          powerProfile = item.powerProfile30KJ;
          break;
        case '45kj':
          powerProfile = item.powerProfile45KJ;
          break;
        default:
          powerProfile = item.powerProfileFresh;
      }
    } else {
      // ScoutingProfile : profils fatigue si renseignés
      const scout = item as ScoutingProfile;
      switch (fatigueProfile) {
        case 'fresh':
          powerProfile = scout.powerProfileFresh;
          break;
        case '15kj':
          powerProfile = scout.powerProfile15KJ ?? scout.powerProfileFresh;
          break;
        case '30kj':
          powerProfile = scout.powerProfile30KJ ?? scout.powerProfileFresh;
          break;
        case '45kj':
          powerProfile = scout.powerProfile45KJ ?? scout.powerProfileFresh;
          break;
        default:
          powerProfile = scout.powerProfileFresh;
      }
    }

    if (!powerProfile) return 0;

    const durationConfig = powerDurations.find(d => d.key === duration);
    if (!durationConfig) return 0;

    const powerValue = (powerProfile as any)[durationConfig.field] || 0;
    
    if (mode === 'watts') {
      return powerValue;
    } else {
      // Mode W/kg
      const weight = item.weightKg || 70;
      return weight > 0 ? powerValue / weight : 0;
    }
  };

  // Moyennes équipe pour détection des valeurs intéressantes (vs profils)
  const groupAverages = useMemo(
    () => computeGroupAverages(riders, displayMode, fatigueProfile),
    [riders, displayMode, fatigueProfile]
  );

  const effectiveSeason = season ?? getCurrentSeasonYear();
  const isAllTime = effectiveSeason === ALL_TIME_STATS_SEASON;

  const subjectsForReport = useMemo(() => {
    const base = [...riders, ...(includeScouts ? scoutingProfiles : [])];
    return base.filter(item => {
      const genderMatch = genderFilter === 'all' || item.sex === genderFilter;
      const levelMatch =
        levelFilter === 'all' ||
        (!!item.qualitativeProfile && item.qualitativeProfile === levelFilter);
      return genderMatch && levelMatch;
    });
  }, [riders, scoutingProfiles, includeScouts, genderFilter, levelFilter]);

  const powerStatsReport = useMemo(() => {
    if (!showStatsPanel) return null;
    return computePowerStatsReport(subjectsForReport, effectiveSeason, {
      mode: displayMode,
      fatigue: fatigueProfile,
      winnerRiderIds,
      categoryFilter,
    });
  }, [
    showStatsPanel,
    subjectsForReport,
    effectiveSeason,
    displayMode,
    fatigueProfile,
    winnerRiderIds,
    categoryFilter,
  ]);

  const powerStatsRows = useMemo(
    () => (powerStatsReport ? getPowerRowsWithData(powerStatsReport.globalRows, 1) : []),
    [powerStatsReport]
  );

  const hasWinnerPowerMeasurements = useMemo(
    () => powerStatsRows.some(r => r.winnerCount > 0),
    [powerStatsRows]
  );

  // Filtrage des riders et scouts
  const filteredData = useMemo(() => {
    const filteredRiders = riders.filter(rider => {
      const genderMatch = genderFilter === 'all' || rider.sex === genderFilter;
      const { category } = getAgeCategory(rider.birthDate);
      const categoryMatch = categoryFilter === 'all' || category === categoryFilter;
      
      // Filtre par niveau (si disponible)
      const levelMatch = levelFilter === 'all' || 
        (rider.qualitativeProfile && rider.qualitativeProfile === levelFilter);
      
      return genderMatch && categoryMatch && levelMatch;
    });

    const filteredScouts = includeScouts ? scoutingProfiles.filter(scout => {
      const genderMatch = genderFilter === 'all' || scout.sex === genderFilter;
      const { category } = getAgeCategory(scout.birthDate);
      const categoryMatch = categoryFilter === 'all' || category === categoryFilter;
      
      const levelMatch = levelFilter === 'all' || 
        (scout.qualitativeProfile && scout.qualitativeProfile === levelFilter);
      
      return genderMatch && categoryMatch && levelMatch;
    }) : [];

    return [...filteredRiders, ...filteredScouts];
  }, [riders, scoutingProfiles, genderFilter, categoryFilter, levelFilter, includeScouts]);

  // Tri des données par performance
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = getPowerValue(a, sortBy, displayMode);
      const bValue = getPowerValue(b, sortBy, displayMode);
      
      if (sortDirection === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });
  }, [filteredData, sortBy, sortDirection, displayMode, fatigueProfile]);

  // Gestion du tri
  const handleSort = (duration: string) => {
    if (sortBy === duration) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(duration);
      setSortDirection('desc');
    }
  };

  // Fonction pour obtenir le nom d'affichage
  const getDisplayName = (item: Rider | ScoutingProfile): string => {
    if ('firstName' in item && 'lastName' in item) {
      return `${item.firstName} ${item.lastName}`;
    }
    return 'Inconnu';
  };

  // Fonction pour obtenir le type (Rider ou Scout)
  const getItemType = (item: Rider | ScoutingProfile): string => {
    return 'status' in item && 'potentialRating' in item ? 'Scout' : 'Coureur';
  };

  // Fonction pour obtenir la catégorie d'âge
  const getItemAgeCategory = (item: Rider | ScoutingProfile): string => {
    const { category } = getAgeCategory(item.birthDate);
    return category;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* En-tête avec contrôles */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        
        {/* Contrôles principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Mode d'affichage */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Affichage:</span>
            <div className="flex bg-blue-500 rounded-lg p-1">
              <button
                onClick={() => setDisplayMode('watts')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  displayMode === 'watts' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-400'
                }`}
              >
                Watts
              </button>
              <button
                onClick={() => setDisplayMode('wattsPerKg')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  displayMode === 'wattsPerKg' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-400'
                }`}
              >
                W/kg
              </button>
            </div>
          </div>

          {/* Profil de fatigue */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Fatigue:</span>
            <select
              value={fatigueProfile}
              onChange={(e) => setFatigueProfile(e.target.value as any)}
              className="px-2 py-1 rounded text-sm text-gray-800"
            >
              <option value="fresh">Frais</option>
              <option value="15kj">15 kJ/kg</option>
              <option value="30kj">30 kJ/kg</option>
              <option value="45kj">45 kJ/kg</option>
            </select>
          </div>

          {/* Inclure les scouts */}
          {alwaysIncludeScouts ? (
            <span className="text-sm text-green-100 font-medium">
              Scouts inclus automatiquement
            </span>
          ) : (
            !hideScoutsOption && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeScouts"
                  checked={includeScouts}
                  onChange={e => setIncludeScouts(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="includeScouts" className="text-sm font-medium">
                  Inclure scouts
                </label>
              </div>
            )
          )}

          {/* Statistiques */}
          <div className="text-sm">
            <span className="font-medium">{sortedData.length}</span>{' '}
            {includeScouts && sortedData.some(i => 'status' in i && 'potentialRating' in i)
              ? 'profils affichés'
              : 'coureurs affichés'}
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtre par sexe */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Sexe:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | Sex)}
              className="px-2 py-1 rounded text-sm text-gray-800"
            >
              <option value="all">Tous</option>
              <option value={Sex.MALE}>Hommes</option>
              <option value={Sex.FEMALE}>Femmes</option>
            </select>
          </div>

          {/* Filtre par catégorie d'âge */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Catégorie:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 rounded text-sm text-gray-800"
            >
              <option value="all">Toutes</option>
              <option value="U15">U15</option>
              <option value="U17">U17</option>
              <option value="U19">U19</option>
              <option value="U23">U23</option>
              <option value="Senior">Senior</option>
            </select>
          </div>

          {/* Filtre par niveau */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Niveau:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 rounded text-sm text-gray-800"
            >
              <option value="all">Tous</option>
              <option value="Elite">Elite</option>
              <option value="National">National</option>
              <option value="Regional">Régional</option>
              <option value="Amateur">Amateur</option>
            </select>
          </div>
        </div>
      </div>

      {scopeLabel && (
        <div className="px-4 py-2 bg-slate-800 text-white text-xs font-medium flex flex-wrap gap-2 items-center">
          <span>Portée : {scopeLabel}</span>
          {alwaysIncludeScouts && (
            <span className="bg-green-600/80 px-2 py-0.5 rounded">+ tous les scouts</span>
          )}
        </div>
      )}

      {showStatsPanel && powerStatsReport && subjectsForReport.length > 0 && (
        <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-3 py-3 sm:px-4">
          <PowerStatsPanel
            isAllTime={isAllTime}
            report={powerStatsReport}
            categoryFilter={categoryFilter}
            statsRows={powerStatsRows}
            hasWinnerMeasurements={hasWinnerPowerMeasurements}
          />
        </div>
      )}

      {/* Tableau des performances */}
      <div className="overflow-x-auto max-h-[min(70vh,52rem)] overflow-y-auto overscroll-contain">
        <table className="min-w-full">
          <thead className="sticky top-0 z-30 bg-gradient-to-b from-slate-100 to-slate-50 shadow-sm border-b border-slate-200">
            <tr>
              <th className="sticky left-0 z-40 bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200/80">
                Coureur
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Effectif
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Poids
              </th>
              {powerDurations.map(duration => (
                <th key={duration.key} className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  <button
                    onClick={() => handleSort(duration.key)}
                    className={`group flex flex-col items-center space-y-1 hover:bg-gray-100 rounded p-1 transition-colors ${
                      sortBy === duration.key ? 'bg-blue-100' : ''
                    }`}
                  >
                    <span>{duration.label}</span>
                    <span className="text-xs text-gray-500">
                      {displayMode === 'watts' ? 'W' : 'W/kg'}
                    </span>
                    {sortBy === duration.key && (
                      <span className="text-blue-600 font-bold">
                        {sortDirection === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.map((item, index) => {
              const isScout = 'status' in item && 'potentialRating' in item;
              const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80';
              const powerValues = powerDurations.map(duration => 
                getPowerValue(item, duration.key, displayMode)
              );
              const maxValue = Math.max(...powerValues);
              
              return (
                <tr
                  key={isScout ? `scout-${index}` : item.id}
                  className={`group ${rowBg} hover:bg-blue-50/45 transition-colors`}
                >
                  <td className={`sticky left-0 z-10 ${rowBg} group-hover:bg-blue-50/45 px-4 py-3.5 whitespace-nowrap border-r border-slate-100 transition-colors`}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {!isScout && (item as Rider).photoUrl ? (
                          <img className="h-8 w-8 rounded-full" src={(item as Rider).photoUrl} alt={getDisplayName(item)} />
                        ) : (
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            isScout ? 'bg-green-300' : 'bg-gray-300'
                          }`}>
                            <span className="text-xs font-medium text-gray-600">
                              {getDisplayName(item).split(' ').map(n => n.charAt(0)).join('')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {getDisplayName(item)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getItemAgeCategory(item)}
                          {!isScout && removedRiderIds?.has((item as Rider).id) && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Retirée
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isScout 
                        ? 'bg-green-100 text-green-800' 
                        : removedRiderIds?.has((item as Rider).id)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {removedRiderIds?.has((item as Rider).id) ? 'Archivée' : getItemType(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-center">
                    {!isScout ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (item as Rider).rosterRole === 'reserve' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {(item as Rider).rosterRole === 'reserve' ? 'Réserve' : 'Équipe 1'}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900">
                    {getItemAgeCategory(item)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900">
                    {item.weightKg || 'N/A'} kg
                  </td>
                  {powerDurations.map(duration => {
                    const value = getPowerValue(item, duration.key, displayMode);
                    const formattedValue = displayMode === 'watts' 
                      ? Math.round(value).toString() 
                      : value.toFixed(1);
                    
                    // Mise en évidence des meilleures performances
                    const isHighlighted = value === maxValue && value > 0;
                    const isSorted = sortBy === duration.key;
                    // Détection intelligente : au-dessus de la moyenne équipe ou catégorie
                    const cellInsight = getCellInsight(
                      item,
                      duration.key as PowerDurationKey,
                      groupAverages,
                      displayMode,
                      fatigueProfile
                    );
                    
                    return (
                      <td key={duration.key} className="px-3 py-3.5 whitespace-nowrap text-sm text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-medium ${
                            isSorted ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded' : 
                            isHighlighted ? 'text-green-600 bg-green-50 px-2 py-1 rounded' :
                            'text-gray-900'
                          }`}>
                            {formattedValue}
                          </span>
                          {(cellInsight.aboveTeam || cellInsight.aboveCategory) && (
                            <span className="text-xs text-green-600 font-medium" title="Au-dessus de la moyenne équipe ou catégorie">
                              {cellInsight.aboveTeam && cellInsight.percentAboveTeam != null && (
                                <span className="inline-block bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                  ↑ +{cellInsight.percentAboveTeam}%
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PowerAnalysisTable;

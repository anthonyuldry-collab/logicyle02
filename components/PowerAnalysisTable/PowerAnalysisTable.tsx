import React, { useState, useMemo } from 'react';
import { Rider, ScoutingProfile, Sex } from '../types';
import { getAgeCategory } from '../utils/ageUtils';

interface PowerAnalysisTableProps {
  riders: Rider[];
  scoutingProfiles?: ScoutingProfile[];
}

const PowerAnalysisTable: React.FC<PowerAnalysisTableProps> = ({ 
  riders, 
  scoutingProfiles = [] 
}) => {
  const [displayMode, setDisplayMode] = useState<'watts' | 'wattsPerKg'>('wattsPerKg');
  const [sortBy, setSortBy] = useState<string>('cp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [genderFilter, setGenderFilter] = useState<'all' | Sex>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | string>('all');
  const [includeScouts, setIncludeScouts] = useState<boolean>(false);
  const [fatigueProfile, setFatigueProfile] = useState<'fresh' | '15kj' | '30kj' | '45kj'>('fresh');

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
      // C'est un ScoutingProfile
      powerProfile = item.powerProfileFresh;
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
    return 'powerProfileFresh' in item ? 'Coureur' : 'Scout';
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
        <h2 className="text-xl font-bold mb-4">Analyse des Puissances</h2>
        
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
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeScouts"
              checked={includeScouts}
              onChange={(e) => setIncludeScouts(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="includeScouts" className="text-sm font-medium">
              Inclure scouts
            </label>
          </div>

          {/* Statistiques */}
          <div className="text-sm">
            <span className="font-medium">{sortedData.length}</span> coureurs affichés
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

      {/* Tableau des performances */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider z-10">
                Coureur
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Poids
              </th>
              {powerDurations.map(duration => (
                <th key={duration.key} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item, index) => {
              const isScout = !('powerProfileFresh' in item);
              const powerValues = powerDurations.map(duration => 
                getPowerValue(item, duration.key, displayMode)
              );
              const maxValue = Math.max(...powerValues);
              
              return (
                <tr key={isScout ? `scout-${index}` : item.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-3 whitespace-nowrap z-10">
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
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isScout 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getItemType(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {getItemAgeCategory(item)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
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
                    
                    return (
                      <td key={duration.key} className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`font-medium ${
                          isSorted ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded' : 
                          isHighlighted ? 'text-green-600 bg-green-50 px-2 py-1 rounded' :
                          'text-gray-900'
                        }`}>
                          {formattedValue}
                        </span>
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

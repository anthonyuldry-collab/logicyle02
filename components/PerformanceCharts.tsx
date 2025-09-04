import React from 'react';
import { Rider, PowerProfile, Sex } from '../types';
import { useState } from 'react';

type PowerDisplayMode = 'watts' | 'wattsPerKg';
type PowerDuration = '1s' | '5s' | '30s' | '1min' | '3min' | '5min' | '12min' | '20min' | 'cp';

interface PerformanceChartsProps {
  riders: Rider[];
  displayMode: PowerDisplayMode;
  selectedDurations: PowerDuration[];
}

// Configuration des durées de puissance
const POWER_DURATIONS_CONFIG: { key: PowerDuration; label: string; powerKey: keyof PowerProfile; color: string }[] = [
  { key: '1s', label: '1s', powerKey: 'power1s', color: '#ef4444' },
  { key: '5s', label: '5s', powerKey: 'power5s', color: '#f97316' },
  { key: '30s', label: '30s', powerKey: 'power30s', color: '#eab308' },
  { key: '1min', label: '1min', powerKey: 'power1min', color: '#84cc16' },
  { key: '3min', label: '3min', powerKey: 'power3min', color: '#22c55e' },
  { key: '5min', label: '5min', powerKey: 'power5min', color: '#14b8a6' },
  { key: '12min', label: '12min', powerKey: 'power12min', color: '#3b82f6' },
  { key: '20min', label: '20min', powerKey: 'power20min', color: '#6366f1' },
  { key: 'cp', label: 'CP/FTP', powerKey: 'criticalPower', color: '#a855f7' }
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

// Composant de graphique en barres pour comparer les riders
export const RiderComparisonChart: React.FC<PerformanceChartsProps> = ({ riders, displayMode, selectedDurations }) => {
  const filteredDurations = POWER_DURATIONS_CONFIG.filter(d => selectedDurations.includes(d.key));
  
  if (filteredDurations.length === 0) {
    return (
      <div className="bg-gray-50 p-8 text-center rounded-lg">
        <p className="text-gray-500">Sélectionnez au moins une durée de puissance pour afficher le graphique</p>
      </div>
    );
  }

  const maxValue = Math.max(
    ...riders.flatMap(rider =>
      filteredDurations.map(duration => getRiderPowerValue(rider, duration.key, displayMode))
    )
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Comparaison des Performances - {displayMode === 'wattsPerKg' ? 'Watts par Kilo' : 'Watts Bruts'}
      </h3>
      
      <div className="space-y-4">
        {filteredDurations.map(duration => {
          const ridersData = riders
            .map(rider => ({
              rider,
              value: getRiderPowerValue(rider, duration.key, displayMode)
            }))
            .filter(data => data.value > 0)
            .sort((a, b) => b.value - a.value);

          if (ridersData.length === 0) return null;

          return (
            <div key={duration.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-700">{duration.label}</h4>
                <span className="text-sm text-gray-500">
                  {displayMode === 'wattsPerKg' ? 'W/kg' : 'W'}
                </span>
              </div>
              
              <div className="space-y-2">
                {ridersData.map(({ rider, value }, index) => {
                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  const isTop3 = index < 3;
                  
                  return (
                    <div key={rider.id} className="flex items-center space-x-3">
                      {/* Position */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isTop3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      
                      {/* Photo et nom */}
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {rider.photoUrl ? (
                          <img src={rider.photoUrl} alt={rider.firstName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-xs">
                              {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {rider.firstName} {rider.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rider.sex === Sex.FEMALE ? 'F' : 'M'} • {rider.weightKg}kg
                          </div>
                        </div>
                      </div>
                      
                      {/* Barre de performance */}
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${duration.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-white drop-shadow-sm">
                            {value.toFixed(displayMode === 'wattsPerKg' ? 1 : 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Composant de graphique radar pour un rider spécifique
export const RiderRadarChart: React.FC<{ rider: Rider; displayMode: PowerDisplayMode }> = ({ rider, displayMode }) => {
  const data = POWER_DURATIONS_CONFIG.map(duration => ({
    axis: duration.label,
    value: getRiderPowerValue(rider, duration.key, displayMode)
  })).filter(d => d.value > 0);

  if (data.length < 3) {
    return (
      <div className="bg-gray-50 p-8 text-center rounded-lg">
        <p className="text-gray-500">Données insuffisantes pour le graphique radar</p>
      </div>
    );
  }

  const size = 200;
  const numAxes = data.length;
  const angleSlice = (Math.PI * 2) / numAxes;
  const radius = size / 3;
  const center = size / 2;
  const maxValue = Math.max(...data.map(d => d.value));

  const points = data.map((d, i) => {
    const value = Math.max(0, Math.min(d.value, maxValue));
    const x = center + radius * (value / maxValue) * Math.cos(angleSlice * i - Math.PI / 2);
    const y = center + radius * (value / maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  const axisLines = data.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    
    const x2 = center + radius * cosAngle;
    const y2 = center + radius * sinAngle;

    const labelOffset = 15;
    const lx = center + (radius + labelOffset) * cosAngle;
    const ly = center + (radius + labelOffset) * sinAngle;
    
    const anchorTolerance = 3;
    let textAnchor = "middle";
    if (lx > center + anchorTolerance) {
      textAnchor = "start";
    } else if (lx < center - anchorTolerance) {
      textAnchor = "end";
    }

    return { x1: center, y1: center, x2, y2, label: d.axis, lx, ly, textAnchor };
  });

  const gridLevels = 5;
  const concentricPolygons = Array.from({ length: gridLevels }).map((_, levelIndex) => {
    const levelRadius = radius * ((levelIndex + 1) / gridLevels);
    return data.map((d, i) => {
      const x = center + levelRadius * Math.cos(angleSlice * i - Math.PI / 2);
      const y = center + levelRadius * Math.sin(angleSlice * i - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        Profil de Performance - {rider.firstName} {rider.lastName}
      </h3>
      
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
          <g>
            {/* Grille concentrique */}
            {concentricPolygons.map((polyPoints, i) => (
              <polygon key={`grid-${i}`} points={polyPoints} fill="none" stroke="#e2e8f0" strokeOpacity="0.2" strokeWidth="1" />
            ))}
            
            {/* Lignes d'axes */}
            {axisLines.map((line, i) => (
              <line key={`axis-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#e2e8f0" strokeOpacity="0.3" strokeWidth="1" />
            ))}
            
            {/* Forme de performance */}
            <polygon points={points} fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="2" />
            
            {/* Points de données */}
            {data.map((d, i) => {
              const value = Math.max(0, Math.min(d.value, maxValue));
              const x = center + radius * (value / maxValue) * Math.cos(angleSlice * i - Math.PI / 2);
              const y = center + radius * (value / maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
              return <circle key={`point-${i}`} cx={x} cy={y} r="4" fill="#3b82f6" />;
            })}
            
            {/* Labels des axes */}
            {axisLines.map((line, i) => (
              <text
                key={`label-${i}`}
                x={line.lx}
                y={line.ly}
                fontSize="10"
                fill="#374151"
                fontWeight="bold"
                textAnchor={line.textAnchor as any}
                dominantBaseline="middle"
              >
                {line.label}
              </text>
            ))}
          </g>
        </svg>
      </div>
      
      {/* Légende des valeurs */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-gray-600">{d.axis}:</span>
            <span className="font-semibold text-gray-900">
              {d.value.toFixed(displayMode === 'wattsPerKg' ? 1 : 0)} {displayMode === 'wattsPerKg' ? 'W/kg' : 'W'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant de tendances de performance
export const PerformanceTrendsChart: React.FC<{ riders: Rider[]; displayMode: PowerDisplayMode }> = ({ riders, displayMode }) => {
  const selectedRiders = riders.slice(0, 5); // Limiter à 5 riders pour la lisibilité
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Tendances de Performance - {displayMode === 'wattsPerKg' ? 'Watts par Kilo' : 'Watts Bruts'}
      </h3>
      
      <div className="space-y-4">
        {POWER_DURATIONS_CONFIG.map(duration => {
          const ridersData = selectedRiders
            .map(rider => ({
              rider,
              value: getRiderPowerValue(rider, duration.key, displayMode)
            }))
            .filter(data => data.value > 0)
            .sort((a, b) => b.value - a.value);

          if (ridersData.length === 0) return null;

          return (
            <div key={duration.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-700">{duration.label}</h4>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: duration.color }}></div>
                  <span className="text-sm text-gray-500">
                    {displayMode === 'wattsPerKg' ? 'W/kg' : 'W'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {ridersData.map(({ rider, value }, index) => (
                  <div key={rider.id} className="flex-1 text-center">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {rider.firstName.charAt(0)}.{rider.lastName.charAt(0)}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {value.toFixed(displayMode === 'wattsPerKg' ? 1 : 0)}
                    </div>
                    {index === 0 && (
                      <div className="text-xs text-yellow-600 font-bold">🥇</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Composant de comparaison côte à côte entre 2 athlètes
export const RiderComparisonRadarChart: React.FC<{ 
  rider1: Rider; 
  rider2: Rider; 
  displayMode: PowerDisplayMode;
  title?: string;
}> = ({ rider1, rider2, displayMode, title }) => {
  const data1 = POWER_DURATIONS_CONFIG.map(duration => ({
    axis: duration.label,
    value: getRiderPowerValue(rider1, duration.key, displayMode)
  })).filter(d => d.value > 0);

  const data2 = POWER_DURATIONS_CONFIG.map(duration => ({
    axis: duration.label,
    value: getRiderPowerValue(rider2, duration.key, displayMode)
  })).filter(d => d.value > 0);

  // Utiliser toutes les durées disponibles pour la comparaison
  const allDurations = POWER_DURATIONS_CONFIG.filter(d => 
    data1.some(d1 => d1.axis === d.label) || data2.some(d2 => d2.axis === d.label)
  );

  if (allDurations.length < 3) {
    return (
      <div className="bg-gray-50 p-8 text-center rounded-lg">
        <p className="text-gray-500">Données insuffisantes pour la comparaison radar</p>
      </div>
    );
  }

  const size = 300; // Plus grand pour la comparaison
  const numAxes = allDurations.length;
  const angleSlice = (Math.PI * 2) / numAxes;
  const radius = size / 3;
  const center = size / 2;
  
  // Trouver la valeur maximale entre les deux riders pour normaliser
  const maxValue = Math.max(
    ...data1.map(d => d.value),
    ...data2.map(d => d.value)
  );

  // Créer les points pour chaque rider
  const createPoints = (data: typeof data1, color: string) => {
    return allDurations.map((duration, i) => {
      const dataPoint = data.find(d => d.axis === duration.label);
      const value = dataPoint ? dataPoint.value : 0;
      const normalizedValue = Math.max(0, Math.min(value, maxValue));
      const x = center + radius * (normalizedValue / maxValue) * Math.cos(angleSlice * i - Math.PI / 2);
      const y = center + radius * (normalizedValue / maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
      return { x, y, value, originalValue: value };
    });
  };

  const points1 = createPoints(data1, '#3b82f6'); // Bleu pour rider1
  const points2 = createPoints(data2, '#ef4444'); // Rouge pour rider2

  const axisLines = allDurations.map((duration, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    
    const x2 = center + radius * cosAngle;
    const y2 = center + radius * sinAngle;

    const labelOffset = 20;
    const lx = center + (radius + labelOffset) * cosAngle;
    const ly = center + (radius + labelOffset) * sinAngle;
    
    const anchorTolerance = 3;
    let textAnchor = "middle";
    if (lx > center + anchorTolerance) {
      textAnchor = "start";
    } else if (lx < center - anchorTolerance) {
      textAnchor = "end";
    }

    return { x1: center, y1: center, x2, y2, label: duration.label, lx, ly, textAnchor };
  });

  const gridLevels = 5;
  const concentricPolygons = Array.from({ length: gridLevels }).map((_, levelIndex) => {
    const levelRadius = radius * ((levelIndex + 1) / gridLevels);
    return allDurations.map((duration, i) => {
      const x = center + levelRadius * Math.cos(angleSlice * i - Math.PI / 2);
      const y = center + levelRadius * Math.sin(angleSlice * i - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
  });

  // Créer les polygones pour chaque rider
  const polygon1 = points1.map(p => `${p.x},${p.y}`).join(' ');
  const polygon2 = points2.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        {title || `Comparaison des Performances`}
      </h3>
      
      {/* Légende des riders */}
      <div className="flex justify-center space-x-6 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            {rider1.firstName} {rider1.lastName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            {rider2.firstName} {rider2.lastName}
          </span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
          <g>
            {/* Grille concentrique */}
            {concentricPolygons.map((polyPoints, i) => (
              <polygon key={`grid-${i}`} points={polyPoints} fill="none" stroke="#e2e8f0" strokeOpacity="0.2" strokeWidth="1" />
            ))}
            
            {/* Lignes d'axes */}
            {axisLines.map((line, i) => (
              <line key={`axis-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#e2e8f0" strokeOpacity="0.3" strokeWidth="1" />
            ))}
            
            {/* Forme de performance du rider 1 (bleu) */}
            <polygon points={polygon1} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
            
            {/* Forme de performance du rider 2 (rouge) */}
            <polygon points={polygon2} fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="2" />
            
            {/* Points de données du rider 1 */}
            {points1.map((point, i) => (
              <circle key={`point1-${i}`} cx={point.x} cy={point.y} r="4" fill="#3b82f6" />
            ))}
            
            {/* Points de données du rider 2 */}
            {points2.map((point, i) => (
              <circle key={`point2-${i}`} cx={point.x} cy={point.y} r="4" fill="#ef4444" />
            ))}
            
            {/* Labels des axes */}
            {axisLines.map((line, i) => (
              <text
                key={`label-${i}`}
                x={line.lx}
                y={line.ly}
                fontSize="10"
                fill="#374151"
                fontWeight="bold"
                textAnchor={line.textAnchor as any}
                dominantBaseline="middle"
              >
                {line.label}
              </text>
            ))}
          </g>
        </svg>
      </div>
      
      {/* Tableau de comparaison détaillé */}
      <div className="mt-6">
        <h4 className="text-md font-semibold text-gray-800 mb-3 text-center">Détail des Performances</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {rider1.firstName} {rider1.lastName}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {rider2.firstName} {rider2.lastName}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Différence</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avantage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allDurations.map((duration, i) => {
                const point1 = points1[i];
                const point2 = points2[i];
                const value1 = point1?.originalValue || 0;
                const value2 = point2?.originalValue || 0;
                const difference = value1 - value2;
                const advantage = difference > 0 ? rider1.firstName : rider2.firstName;
                const advantageValue = Math.abs(difference);
                
                return (
                  <tr key={duration.key} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{duration.label}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${value1 > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {value1 > 0 ? value1.toFixed(displayMode === 'wattsPerKg' ? 1 : 0) : '-'}
                      </span>
                      <div className="text-xs text-gray-500">
                        {displayMode === 'wattsPerKg' ? 'W/kg' : 'W'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${value2 > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {value2 > 0 ? value2.toFixed(displayMode === 'wattsPerKg' ? 1 : 0) : '-'}
                      </span>
                      <div className="text-xs text-gray-500">
                        {displayMode === 'wattsPerKg' ? 'W/kg' : 'W'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${
                        difference > 0 ? 'text-green-600' : 
                        difference < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {difference !== 0 ? (difference > 0 ? '+' : '') + difference.toFixed(displayMode === 'wattsPerKg' ? 1 : 0) : '0'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {difference !== 0 ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          advantage === rider1.firstName ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {advantage}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Égalité</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Résumé de la comparaison */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-2">Résumé de la Comparaison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {points1.filter(p => p.originalValue > 0).length}
            </div>
            <div className="text-gray-600">Durées mesurées</div>
            <div className="text-xs text-gray-500">{rider1.firstName}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {points2.filter(p => p.originalValue > 0).length}
            </div>
            <div className="text-gray-600">Durées mesurées</div>
            <div className="text-xs text-gray-500">{rider2.firstName}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">
              {allDurations.length}
            </div>
            <div className="text-gray-600">Total des durées</div>
            <div className="text-xs text-gray-500">Comparables</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant de sélection pour la comparaison
export const RiderComparisonSelector: React.FC<{ 
  riders: Rider[];
  onCompare: (rider1: Rider, rider2: Rider) => void;
}> = ({ riders, onCompare }) => {
  const [selectedRider1, setSelectedRider1] = useState<Rider | null>(null);
  const [selectedRider2, setSelectedRider2] = useState<Rider | null>(null);

  const handleCompare = () => {
    if (selectedRider1 && selectedRider2) {
      onCompare(selectedRider1, selectedRider2);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Sélectionner 2 Athlètes à Comparer</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Premier Athlète</label>
          <select
            value={selectedRider1?.id || ''}
            onChange={(e) => {
              const rider = riders.find(r => r.id === e.target.value);
              setSelectedRider1(rider || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choisir un athlète...</option>
            {riders.map(rider => (
              <option key={rider.id} value={rider.id}>
                {rider.firstName} {rider.lastName} ({rider.sex === 'FEMALE' ? 'F' : 'M'})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Deuxième Athlète</label>
          <select
            value={selectedRider2?.id || ''}
            onChange={(e) => {
              const rider = riders.find(r => r.id === e.target.value);
              setSelectedRider2(rider || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choisir un athlète...</option>
            {riders.map(rider => (
              <option key={rider.id} value={rider.id}>
                {rider.firstName} {rider.lastName} ({rider.sex === 'FEMALE' ? 'F' : 'M'})
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <button
        onClick={handleCompare}
        disabled={!selectedRider1 || !selectedRider2}
        className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
          selectedRider1 && selectedRider2
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {selectedRider1 && selectedRider2 
          ? `Comparer ${selectedRider1.firstName} vs ${selectedRider2.firstName}`
          : 'Sélectionnez 2 athlètes pour comparer'
        }
      </button>
    </div>
  );
};

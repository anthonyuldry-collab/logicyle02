import React, { useState, useMemo } from 'react';
import { Rider } from '../types';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface PerformanceOverviewEnhancedProps {
  riders: Rider[];
  onRiderSelect?: (rider: Rider) => void;
}

const PerformanceOverviewEnhanced: React.FC<PerformanceOverviewEnhancedProps> = ({
  riders,
  onRiderSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRiders = useMemo(() => {
    return riders.filter(rider => {
      const matchesSearch = searchTerm === '' || 
        `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rider.performanceGoals?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [riders, searchTerm]);

  const workAreas = [
    { key: 'physique', label: 'Physique', color: 'bg-red-50 text-red-700' },
    { key: 'technique', label: 'Technique', color: 'bg-blue-50 text-blue-700' },
    { key: 'mental', label: 'Mental', color: 'bg-purple-50 text-purple-700' },
    { key: 'environnement', label: 'Environnement', color: 'bg-green-50 text-green-700' },
    { key: 'tactique', label: 'Tactique', color: 'bg-orange-50 text-orange-700' }
  ];

  return (
    <div className="space-y-6">
      {/* Statistiques simples */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{riders.length}</div>
          <div className="text-sm text-gray-600">Athlètes</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {riders.filter(r => r.performanceGoals).length}
          </div>
          <div className="text-sm text-gray-600">Avec objectifs</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round((riders.filter(r => r.performanceGoals).length / riders.length) * 100) || 0}%
          </div>
          <div className="text-sm text-gray-600">Objectifs définis</div>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un athlète ou un objectif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des athlètes */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {filteredRiders.length} athlète{filteredRiders.length > 1 ? 's' : ''}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredRiders.map((rider) => (
            <div
              key={rider.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onRiderSelect?.(rider)}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-700 font-medium text-sm">
                    {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                  </span>
                </div>

                {/* Nom et profil */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-medium text-gray-900">
                    {rider.firstName} {rider.lastName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {rider.qualitativeProfile && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {rider.qualitativeProfile}
                      </span>
                    )}
                    {rider.performanceGoals && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                        ✓ Objectifs
                      </span>
                    )}
                  </div>
                </div>

                {/* Domaines de travail - tous affichés */}
                <div className="flex gap-2 flex-wrap">
                  {workAreas.map((area) => (
                    <span
                      key={area.key}
                      className={`px-2 py-1 rounded text-xs ${area.color}`}
                    >
                      {area.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Objectifs si présent */}
              {rider.performanceGoals && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 line-clamp-2">{rider.performanceGoals}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredRiders.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">Aucun athlète trouvé</p>
            <p className="text-sm text-gray-400 mt-1">
              Essayez de modifier votre recherche
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceOverviewEnhanced;
import React, { useState, useMemo } from 'react';
import { Rider } from '../types';
import { 
  UserGroupIcon, 
  StarIcon, 
  ArrowTrendingUpIcon,
  LightBulbIcon,
  CogIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface PerformanceProjectDetailsProps {
  riders: Rider[];
  onRiderSelect?: (rider: Rider) => void;
}

interface WorkAreaContent {
  area: string;
  riders: Rider[];
  forces: string[];
  optimizations: string[];
  developments: string[];
  actions: string[];
  color: string;
}

const PerformanceProjectDetails: React.FC<PerformanceProjectDetailsProps> = ({
  riders,
  onRiderSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(['Physique', 'Technique', 'Mental']));
  const [viewMode, setViewMode] = useState<'detailed' | 'summary' | 'grouped'>('detailed');

  // Fonction helper pour obtenir le projet par domaine
  const getProjectByArea = (rider: Rider, area: string) => {
    switch (area) {
      case 'Physique': return rider.physiquePerformanceProject;
      case 'Technique': return rider.techniquePerformanceProject;
      case 'Mental': return rider.mentalPerformanceProject;
      case 'Environnement': return rider.environnementPerformanceProject;
      case 'Tactique': return rider.tactiquePerformanceProject;
      default: return null;
    }
  };

  // Extraction du contenu des domaines de travail
  const workAreasContent = useMemo(() => {
    const areas = ['Physique', 'Technique', 'Mental', 'Environnement', 'Tactique'];
    const colors = ['#EF4444', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];
    
    return areas.map((area, index) => {
      const areaRiders = riders.filter(rider => {
        const project = getProjectByArea(rider, area);
        return project && (project.forces || project.aOptimiser || project.aDevelopper || project.besoinsActions);
      });

      const forces: string[] = [];
      const optimizations: string[] = [];
      const developments: string[] = [];
      const actions: string[] = [];

      areaRiders.forEach(rider => {
        const project = getProjectByArea(rider, area);
        if (project) {
          if (project.forces) forces.push(project.forces);
          if (project.aOptimiser) optimizations.push(project.aOptimiser);
          if (project.aDevelopper) developments.push(project.aDevelopper);
          if (project.besoinsActions) actions.push(project.besoinsActions);
        }
      });

      return {
        area,
        riders: areaRiders,
        forces: [...new Set(forces)],
        optimizations: [...new Set(optimizations)],
        developments: [...new Set(developments)],
        actions: [...new Set(actions)],
        color: colors[index]
      };
    });
  }, [riders]);

  // Filtrage des domaines
  const filteredAreas = useMemo(() => {
    return workAreasContent.filter(areaContent => {
      if (selectedArea !== 'all' && areaContent.area !== selectedArea) return false;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const hasMatch = areaContent.forces.some(f => f.toLowerCase().includes(searchLower)) ||
                        areaContent.optimizations.some(o => o.toLowerCase().includes(searchLower)) ||
                        areaContent.developments.some(d => d.toLowerCase().includes(searchLower)) ||
                        areaContent.actions.some(a => a.toLowerCase().includes(searchLower)) ||
                        areaContent.riders.some(r => 
                          `${r.firstName} ${r.lastName}`.toLowerCase().includes(searchLower)
                        );
        if (!hasMatch) return false;
      }

      if (selectedProfile !== 'all') {
        const hasProfileMatch = areaContent.riders.some(r => r.qualitativeProfile === selectedProfile);
        if (!hasProfileMatch) return false;
      }

      return areaContent.riders.length > 0;
    });
  }, [workAreasContent, searchTerm, selectedArea, selectedProfile]);

  const toggleAreaExpansion = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'Grimpeur': return 'bg-red-100 text-red-800 border-red-200';
      case 'Sprinteur': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rouleur': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Puncheur': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Complet': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderDetailedView = (areaContent: WorkAreaContent) => {
    const isExpanded = expandedAreas.has(areaContent.area);
    
    return (
      <div key={areaContent.area} className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* En-tête du domaine */}
        <div 
          className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleAreaExpansion(areaContent.area)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: areaContent.color }}
              ></div>
              <h3 className="text-lg font-semibold text-gray-900">{areaContent.area}</h3>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                {areaContent.riders.length} athlète{areaContent.riders.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {isExpanded ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Contenu détaillé */}
        {isExpanded && (
          <div className="p-4 space-y-6">
            {/* Athlètes impliqués */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <UserGroupIcon className="w-4 h-4 mr-2" />
                Athlètes impliqués
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {areaContent.riders.map((rider) => (
                  <div 
                    key={rider.id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => onRiderSelect?.(rider)}
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium text-sm">
                        {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {rider.firstName} {rider.lastName}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getProfileColor(rider.qualitativeProfile as string)}`}>
                        {rider.qualitativeProfile}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forces du groupe */}
            {areaContent.forces.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <StarIcon className="w-4 h-4 mr-2 text-green-500" />
                  Forces du groupe
                </h4>
                <div className="space-y-2">
                  {areaContent.forces.map((force, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-gray-800">{force}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* À optimiser */}
            {areaContent.optimizations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-2 text-yellow-500" />
                  À optimiser
                </h4>
                <div className="space-y-2">
                  {areaContent.optimizations.map((optimization, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-gray-800">{optimization}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* À développer */}
            {areaContent.developments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <LightBulbIcon className="w-4 h-4 mr-2 text-blue-500" />
                  À développer
                </h4>
                <div className="space-y-2">
                  {areaContent.developments.map((development, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-800">{development}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions mises en place */}
            {areaContent.actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <CogIcon className="w-4 h-4 mr-2 text-purple-500" />
                  Actions mises en place
                </h4>
                <div className="space-y-2">
                  {areaContent.actions.map((action, index) => (
                    <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-gray-800">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSummaryView = (areaContent: WorkAreaContent) => {
    return (
      <div key={areaContent.area} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: areaContent.color }}
            ></div>
            <h3 className="text-lg font-semibold text-gray-900">{areaContent.area}</h3>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              {areaContent.riders.length} athlètes
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{areaContent.forces.length}</div>
            <div className="text-xs text-green-700">Forces</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{areaContent.optimizations.length}</div>
            <div className="text-xs text-yellow-700">À optimiser</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{areaContent.developments.length}</div>
            <div className="text-xs text-blue-700">À développer</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{areaContent.actions.length}</div>
            <div className="text-xs text-purple-700">Actions</div>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedView = () => {
    const allForces = [...new Set(workAreasContent.flatMap(area => area.forces))];
    const allOptimizations = [...new Set(workAreasContent.flatMap(area => area.optimizations))];
    const allDevelopments = [...new Set(workAreasContent.flatMap(area => area.developments))];
    const allActions = [...new Set(workAreasContent.flatMap(area => area.actions))];

    return (
      <div className="space-y-6">
        {/* Forces globales */}
        {allForces.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <StarIcon className="w-5 h-5 mr-2 text-green-500" />
              Forces Globales du Groupe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allForces.map((force, index) => (
                <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-800">{force}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimisations globales */}
        {allOptimizations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-yellow-500" />
              Optimisations Globales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allOptimizations.map((optimization, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-800">{optimization}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Développements globaux */}
        {allDevelopments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <LightBulbIcon className="w-5 h-5 mr-2 text-blue-500" />
              Développements Globaux
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allDevelopments.map((development, index) => (
                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-800">{development}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions globales */}
        {allActions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CogIcon className="w-5 h-5 mr-2 text-purple-500" />
              Actions Globales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allActions.map((action, index) => (
                <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-gray-800">{action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Détails des Domaines de Travail</h2>
            <p className="text-gray-600">Analyse approfondie des forces, optimisations, développements et actions</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Recherche */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans le contenu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Filtre domaine */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les domaines</option>
              <option value="Physique">Physique</option>
              <option value="Technique">Technique</option>
              <option value="Mental">Mental</option>
              <option value="Environnement">Environnement</option>
              <option value="Tactique">Tactique</option>
            </select>

            {/* Filtre profil */}
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les profils</option>
              <option value="Grimpeur">Grimpeur</option>
              <option value="Sprinteur">Sprinteur</option>
              <option value="Rouleur">Rouleur</option>
              <option value="Puncheur">Puncheur</option>
              <option value="Complet">Complet</option>
            </select>

            {/* Mode d'affichage */}
            <div className="flex bg-gray-100 rounded-md">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md ${
                  viewMode === 'detailed' ? 'bg-blue-500 text-white' : 'text-gray-600'
                }`}
              >
                Détaillé
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'summary' ? 'bg-blue-500 text-white' : 'text-gray-600'
                }`}
              >
                Résumé
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md ${
                  viewMode === 'grouped' ? 'bg-blue-500 text-white' : 'text-gray-600'
                }`}
              >
                Groupé
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {workAreasContent.reduce((acc, area) => acc + area.forces.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Forces identifiées</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {workAreasContent.reduce((acc, area) => acc + area.optimizations.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Optimisations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">
            {workAreasContent.reduce((acc, area) => acc + area.developments.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Développements</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">
            {workAreasContent.reduce((acc, area) => acc + area.actions.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Actions</div>
        </div>
      </div>

      {/* Contenu selon le mode d'affichage */}
      {viewMode === 'grouped' ? (
        renderGroupedView()
      ) : (
        <div className="space-y-4">
          {filteredAreas.map(areaContent => 
            viewMode === 'detailed' ? renderDetailedView(areaContent) : renderSummaryView(areaContent)
          )}
        </div>
      )}

      {filteredAreas.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <UserGroupIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Aucun domaine trouvé avec les filtres sélectionnés</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceProjectDetails;

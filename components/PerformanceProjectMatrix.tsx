import React, { useState, useMemo } from 'react';
import { Rider } from '../types';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChartBarIcon,
  UserGroupIcon,
  TagIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface PerformanceProjectMatrixProps {
  riders: Rider[];
  onRiderSelect?: (rider: Rider) => void;
  onGroupCreate?: (riders: Rider[], theme: string) => void;
}

interface ProjectTheme {
  name: string;
  riders: Rider[];
  workAreas: string[];
  priority: 'high' | 'medium' | 'low';
  color: string;
}

const PerformanceProjectMatrix: React.FC<PerformanceProjectMatrixProps> = ({
  riders,
  onRiderSelect,
  onGroupCreate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'matrix'>('grid');
  const [selectedRiders, setSelectedRiders] = useState<Set<string>>(new Set());

  // Extraction des thèmes de performance
  const extractThemes = (rider: Rider): string[] => {
    const themes: string[] = [];
    
    const performanceAreas = [
      { area: 'Physique', data: rider.physiquePerformanceProject },
      { area: 'Technique', data: rider.techniquePerformanceProject },
      { area: 'Mental', data: rider.mentalPerformanceProject },
      { area: 'Environnement', data: rider.environnementPerformanceProject },
      { area: 'Tactique', data: rider.tactiquePerformanceProject }
    ];

    performanceAreas.forEach(({ area, data }) => {
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'string' && value.trim()) {
            // Extraction de thèmes spécifiques
            const text = value.toLowerCase();
            if (text.includes('endurance') || text.includes('résistance')) themes.push('Endurance');
            if (text.includes('force') || text.includes('puissance')) themes.push('Force/Puissance');
            if (text.includes('vitesse') || text.includes('sprint')) themes.push('Vitesse');
            if (text.includes('technique') || text.includes('geste')) themes.push('Technique');
            if (text.includes('mental') || text.includes('concentration')) themes.push('Mental');
            if (text.includes('tactique') || text.includes('stratégie')) themes.push('Tactique');
            if (text.includes('récupération') || text.includes('recovery')) themes.push('Récupération');
            if (text.includes('nutrition') || text.includes('alimentation')) themes.push('Nutrition');
            if (text.includes('équipement') || text.includes('matériel')) themes.push('Équipement');
            if (text.includes('course') || text.includes('compétition')) themes.push('Compétition');
          }
        });
      }
    });

    return [...new Set(themes)];
  };

  // Groupement par thèmes
  const projectThemes = useMemo(() => {
    const themeMap = new Map<string, Rider[]>();
    
    riders.forEach(rider => {
      const themes = extractThemes(rider);
      themes.forEach(theme => {
        if (!themeMap.has(theme)) {
          themeMap.set(theme, []);
        }
        themeMap.get(theme)!.push(rider);
      });
    });

    const themes: ProjectTheme[] = Array.from(themeMap.entries()).map(([name, riders]) => {
      const workAreas = [...new Set(riders.flatMap(r => {
        const areas = [];
        if (r.physiquePerformanceProject) areas.push('Physique');
        if (r.techniquePerformanceProject) areas.push('Technique');
        if (r.mentalPerformanceProject) areas.push('Mental');
        if (r.environnementPerformanceProject) areas.push('Environnement');
        if (r.tactiquePerformanceProject) areas.push('Tactique');
        return areas;
      }))];

      const priority = riders.length >= 3 ? 'high' : riders.length >= 2 ? 'medium' : 'low';
      const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
      const color = colors[Array.from(themeMap.keys()).indexOf(name) % colors.length];

      return {
        name,
        riders,
        workAreas,
        priority,
        color
      };
    });

    return themes.sort((a, b) => b.riders.length - a.riders.length);
  }, [riders]);

  // Filtrage des coureurs
  const filteredRiders = useMemo(() => {
    return riders.filter(rider => {
      const matchesSearch = searchTerm === '' || 
        `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rider.performanceGoals?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWorkArea = selectedWorkArea === 'all' || 
        (selectedWorkArea === 'physique' && rider.physiquePerformanceProject) ||
        (selectedWorkArea === 'technique' && rider.techniquePerformanceProject) ||
        (selectedWorkArea === 'mental' && rider.mentalPerformanceProject) ||
        (selectedWorkArea === 'environnement' && rider.environnementPerformanceProject) ||
        (selectedWorkArea === 'tactique' && rider.tactiquePerformanceProject);

      const matchesProfile = selectedProfile === 'all' || 
        rider.qualitativeProfile === selectedProfile;

      return matchesSearch && matchesWorkArea && matchesProfile;
    });
  }, [riders, searchTerm, selectedWorkArea, selectedProfile]);

  const handleRiderToggle = (riderId: string) => {
    const newSelected = new Set(selectedRiders);
    if (newSelected.has(riderId)) {
      newSelected.delete(riderId);
    } else {
      newSelected.add(riderId);
    }
    setSelectedRiders(newSelected);
  };

  const handleCreateGroup = () => {
    if (selectedRiders.size >= 2) {
      const selectedRidersList = riders.filter(r => selectedRiders.has(r.id));
      const commonThemes = [...new Set(selectedRidersList.flatMap(r => extractThemes(r)))];
      onGroupCreate?.(selectedRidersList, commonThemes.join(', '));
      setSelectedRiders(new Set());
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'Grimpeur': return 'bg-red-100 text-red-800';
      case 'Sprinteur': return 'bg-green-100 text-green-800';
      case 'Rouleur': return 'bg-blue-100 text-blue-800';
      case 'Puncheur': return 'bg-yellow-100 text-yellow-800';
      case 'Complet': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Matrice des Projets Performance</h2>
            <p className="text-gray-600">Visualisation et regroupement des projets par thèmes</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Recherche */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>

            {/* Filtre domaine de travail */}
            <select
              value={selectedWorkArea}
              onChange={(e) => setSelectedWorkArea(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les domaines</option>
              <option value="physique">Physique</option>
              <option value="technique">Technique</option>
              <option value="mental">Mental</option>
              <option value="environnement">Environnement</option>
              <option value="tactique">Tactique</option>
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
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                title="Grille"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                title="Liste"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`p-2 ${viewMode === 'matrix' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                title="Matrice"
              >
                <ChartBarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions de groupe */}
        {selectedRiders.size > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedRiders.size} athlète{selectedRiders.size > 1 ? 's' : ''} sélectionné{selectedRiders.size > 1 ? 's' : ''}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateGroup}
                  disabled={selectedRiders.size < 2}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Créer un groupe
                </button>
                <button
                  onClick={() => setSelectedRiders(new Set())}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vue par thèmes */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Groupement par Thèmes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectThemes.map((theme) => (
              <div key={theme.name} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{theme.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(theme.priority)}`}>
                      {theme.priority === 'high' ? 'Priorité haute' : theme.priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse'}
                    </span>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }}></div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <UserGroupIcon className="w-4 h-4 mr-1" />
                    {theme.riders.length} athlète{theme.riders.length > 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {theme.workAreas.map((area) => (
                      <span key={area} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {theme.riders.map((rider) => (
                    <div key={rider.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-medium">
                          {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-900 truncate">
                        {rider.firstName} {rider.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vue des athlètes */}
      {(viewMode === 'grid' || viewMode === 'list') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Athlètes ({filteredRiders.length})
          </h3>
          
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
            {filteredRiders.map((rider) => {
              const isSelected = selectedRiders.has(rider.id);
              const themes = extractThemes(rider);
              
              return (
                <div
                  key={rider.id}
                  className={`bg-white rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRiderToggle(rider.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {rider.firstName} {rider.lastName}
                          </h4>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getProfileColor(rider.qualitativeProfile as string)}`}>
                            {rider.qualitativeProfile}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>

                    {rider.performanceGoals && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {rider.performanceGoals}
                      </p>
                    )}

                    {themes.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Thèmes identifiés</h5>
                        <div className="flex flex-wrap gap-1">
                          {themes.slice(0, 3).map((theme, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {theme}
                            </span>
                          ))}
                          {themes.length > 3 && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                              +{themes.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredRiders.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <UserGroupIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Aucun athlète trouvé avec les filtres sélectionnés</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceProjectMatrix;

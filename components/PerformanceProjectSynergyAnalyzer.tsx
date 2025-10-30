import React, { useState, useMemo } from 'react';
import { Rider } from '../types';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SynergyGroup {
  id: string;
  name: string;
  riders: Rider[];
  commonKeywords: string[];
  keywordCount: number;
  similarityScore: number;
}

interface PerformanceProjectSynergyAnalyzerProps {
  riders: Rider[];
  onGroupSelect?: (group: SynergyGroup) => void;
}

const PerformanceProjectSynergyAnalyzer: React.FC<PerformanceProjectSynergyAnalyzerProps> = ({
  riders,
  onGroupSelect
}) => {
  const [minKeywords, setMinKeywords] = useState(2);
  const [searchTerm, setSearchTerm] = useState('');

  // Extraction de tous les mots-clés d'un athlète
  const extractKeywords = (rider: Rider): string[] => {
    const keywords = new Set<string>();
    const stopWords = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'et', 'ou', 'un', 'une', 'avec', 'dans', 'pour', 'sur', 'par', 'à', 'est', 'sont', 'être', 'avoir', 'faire', 'fait']);

    const performanceAreas = [
      rider.physiquePerformanceProject,
      rider.techniquePerformanceProject,
      rider.mentalPerformanceProject,
      rider.environnementPerformanceProject,
      rider.tactiquePerformanceProject
    ];

    performanceAreas.forEach(project => {
      if (!project) return;

      // Extraire des mots-clés de tous les champs texte
      const textFields = [
        project.forces,
        project.aOptimiser,
        project.aDevelopper,
        project.besoinsActions
      ];

      textFields.forEach(text => {
        if (!text || typeof text !== 'string') return;

        // Nettoyer et extraire les mots
        const words = text
          .toLowerCase()
          .replace(/[^\w\sàáâãäåèéêëìíîïòóôõöùúûüýÿ]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length >= 3 && !stopWords.has(word));

        words.forEach(word => keywords.add(word));
      });
    });

    return Array.from(keywords);
  };

  // Calcul de similarité entre deux listes de mots-clés
  const calculateSimilarity = (keywords1: string[], keywords2: string[]): string[] => {
    const common: string[] = [];
    
    keywords1.forEach(kw1 => {
      keywords2.forEach(kw2 => {
        // Correspondance exacte ou partielle (un mot contient l'autre)
        if (kw1 === kw2 || kw1.includes(kw2) || kw2.includes(kw1)) {
          if (!common.includes(kw1) && !common.includes(kw2)) {
            // Garder le mot le plus long
            common.push(kw1.length > kw2.length ? kw1 : kw2);
          }
        }
      });
    });

    return common;
  };

  // Détection des groupes avec mots-clés communs
  const synergyGroups = useMemo(() => {
    const groups: SynergyGroup[] = [];
    const processed = new Set<string>();

    riders.forEach(rider => {
      if (processed.has(rider.id)) return;

      const riderKeywords = extractKeywords(rider);
      if (riderKeywords.length === 0) return;

      // Trouver les athlètes avec des mots-clés similaires
      const similarRiders: Array<{ rider: Rider; keywords: string[]; commonKeywords: string[] }> = [];

      riders.forEach(otherRider => {
        if (otherRider.id === rider.id || processed.has(otherRider.id)) return;

        const otherKeywords = extractKeywords(otherRider);
        if (otherKeywords.length === 0) return;

        const commonKeywords = calculateSimilarity(riderKeywords, otherKeywords);
        
        if (commonKeywords.length >= minKeywords) {
          similarRiders.push({
            rider: otherRider,
            keywords: otherKeywords,
            commonKeywords
          });
        }
      });

      if (similarRiders.length > 0) {
        // Calculer les mots-clés communs à tous les membres du groupe
        let allCommonKeywords = similarRiders[0].commonKeywords;

        similarRiders.forEach(({ commonKeywords }) => {
          allCommonKeywords = allCommonKeywords.filter(kw =>
            commonKeywords.some(ckw => 
              kw === ckw || kw.includes(ckw) || ckw.includes(kw)
            )
          );
        });

        if (allCommonKeywords.length >= minKeywords) {
          const groupRiders = [rider, ...similarRiders.map(sr => sr.rider)];
          const totalKeywords = new Set<string>();
          
          groupRiders.forEach(r => {
            extractKeywords(r).forEach(kw => totalKeywords.add(kw));
          });

          // Score de similarité : nombre de mots-clés communs par rapport au total
          const similarityScore = Math.round((allCommonKeywords.length / totalKeywords.size) * 100);

          groups.push({
            id: `group-${rider.id}`,
            name: allCommonKeywords.slice(0, 3).join(', ') || `Groupe ${groups.length + 1}`,
            riders: groupRiders,
            commonKeywords: allCommonKeywords.slice(0, 10), // Limiter à 10 mots-clés
            keywordCount: allCommonKeywords.length,
            similarityScore
          });

          groupRiders.forEach(r => processed.add(r.id));
        }
      }
    });

    // Trier par score de similarité décroissant
    return groups.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }
      return b.keywordCount - a.keywordCount;
    });
  }, [riders, minKeywords]);

  // Filtrage par recherche
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return synergyGroups;

    const searchLower = searchTerm.toLowerCase();
    return synergyGroups.filter(group => {
      // Recherche dans le nom du groupe ou les mots-clés
      if (group.name.toLowerCase().includes(searchLower)) return true;
      if (group.commonKeywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
      // Recherche dans les noms des athlètes
      if (group.riders.some(r => 
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(searchLower)
      )) return true;
      return false;
    });
  }, [synergyGroups, searchTerm]);

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

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        {/* Recherche */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un groupe, un mot-clé ou un athlète..."
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

        {/* Seuil minimum de mots-clés */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Minimum de mots-clés communs :
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={minKeywords}
            onChange={(e) => setMinKeywords(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium text-blue-600 w-8">{minKeywords}</span>
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {filteredGroups.length} groupe{filteredGroups.length > 1 ? 's' : ''} identifié{filteredGroups.length > 1 ? 's' : ''}
          </span>
          <span className="text-blue-600 font-medium">
            {filteredGroups.reduce((acc, g) => acc + g.riders.length, 0)} athlète{filteredGroups.reduce((acc, g) => acc + g.riders.length, 0) > 1 ? 's' : ''} impliqué{filteredGroups.reduce((acc, g) => acc + g.riders.length, 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste des groupes */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="p-4">
              {/* En-tête */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900 mb-1">{group.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{group.riders.length} athlète{group.riders.length > 1 ? 's' : ''}</span>
                    <span className="text-blue-600 font-medium">
                      {group.keywordCount} mot{group.keywordCount > 1 ? 's' : ''}-clé{group.keywordCount > 1 ? 's' : ''} commun{group.keywordCount > 1 ? 's' : ''}
                    </span>
                    <span className="text-green-600 font-medium">
                      Score: {group.similarityScore}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onGroupSelect?.(group)}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Voir détails
                </button>
              </div>

              {/* Mots-clés communs */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {group.commonKeywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Athlètes */}
              <div className="flex flex-wrap gap-2">
                {group.riders.map((rider) => (
                  <div
                    key={rider.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {rider.firstName} {rider.lastName}
                    </span>
                    {rider.qualitativeProfile && (
                      <span className={`px-2 py-0.5 rounded text-xs ${getProfileColor(rider.qualitativeProfile)}`}>
                        {rider.qualitativeProfile}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 font-medium">Aucun groupe identifié</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchTerm 
              ? 'Essayez de modifier votre recherche'
              : `Réduisez le seuil minimum (actuellement ${minKeywords}) ou vérifiez que les projets contiennent des mots-clés similaires`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceProjectSynergyAnalyzer;
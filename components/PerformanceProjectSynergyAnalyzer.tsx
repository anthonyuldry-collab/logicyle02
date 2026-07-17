import React, { useMemo, useState } from 'react';
import { Rider } from '../types';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  commonKeywords,
  computeProjectPilotageStats,
  extractRiderKeywords,
  extractRiderThemes,
} from '../utils/performancePilotageUtils';

export interface SynergyGroup {
  id: string;
  name: string;
  riders: Rider[];
  commonKeywords: string[];
  keywordCount: number;
  similarityScore: number;
  themes: string[];
}

interface PerformanceProjectSynergyAnalyzerProps {
  riders: Rider[];
  onGroupSelect?: (group: SynergyGroup) => void;
  onCreateWorkGroup?: (group: SynergyGroup) => void;
}

const PerformanceProjectSynergyAnalyzer: React.FC<PerformanceProjectSynergyAnalyzerProps> = ({
  riders,
  onGroupSelect,
  onCreateWorkGroup,
}) => {
  const [minKeywords, setMinKeywords] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pilotage = useMemo(() => computeProjectPilotageStats(riders), [riders]);

  const keywordCache = useMemo(() => {
    const map = new Map<string, string[]>();
    riders.forEach((r) => map.set(r.id, extractRiderKeywords(r)));
    return map;
  }, [riders]);

  const synergyGroups = useMemo(() => {
    const groups: SynergyGroup[] = [];
    const processed = new Set<string>();

    riders.forEach((rider) => {
      if (processed.has(rider.id)) return;
      const riderKeywords = keywordCache.get(rider.id) || [];
      if (riderKeywords.length === 0) return;

      const similarRiders: Array<{ rider: Rider; commonKeywords: string[] }> = [];

      riders.forEach((otherRider) => {
        if (otherRider.id === rider.id || processed.has(otherRider.id)) return;
        const otherKeywords = keywordCache.get(otherRider.id) || [];
        if (otherKeywords.length === 0) return;
        const shared = commonKeywords(riderKeywords, otherKeywords);
        if (shared.length >= minKeywords) {
          similarRiders.push({ rider: otherRider, commonKeywords: shared });
        }
      });

      if (similarRiders.length === 0) return;

      let allCommon = similarRiders[0].commonKeywords;
      similarRiders.forEach(({ commonKeywords: ck }) => {
        allCommon = allCommon.filter((kw) =>
          ck.some((c) => kw === c || kw.includes(c) || c.includes(kw))
        );
      });

      if (allCommon.length < minKeywords) return;

      const groupRiders = [rider, ...similarRiders.map((s) => s.rider)];
      const union = new Set<string>();
      groupRiders.forEach((r) => (keywordCache.get(r.id) || []).forEach((kw) => union.add(kw)));
      const similarityScore =
        union.size > 0 ? Math.round((allCommon.length / union.size) * 100) : 0;

      const themeSet = new Set<string>();
      groupRiders.forEach((r) => extractRiderThemes(r).forEach((t) => themeSet.add(t)));

      groups.push({
        id: `group-${rider.id}`,
        name: allCommon.slice(0, 3).join(', ') || `Groupe ${groups.length + 1}`,
        riders: groupRiders,
        commonKeywords: allCommon.slice(0, 12),
        keywordCount: allCommon.length,
        similarityScore,
        themes: Array.from(themeSet).slice(0, 6),
      });

      groupRiders.forEach((r) => processed.add(r.id));
    });

    return groups.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
      return b.keywordCount - a.keywordCount;
    });
  }, [riders, keywordCache, minKeywords]);

  // Theme clusters (always useful even if keyword groups thin)
  const themeClusters = useMemo(() => {
    const map = new Map<string, Rider[]>();
    riders.forEach((rider) => {
      extractRiderThemes(rider).forEach((theme) => {
        if (!map.has(theme)) map.set(theme, []);
        map.get(theme)!.push(rider);
      });
    });
    return Array.from(map.entries())
      .map(([theme, themeRiders]) => ({ theme, riders: themeRiders }))
      .filter((c) => c.riders.length >= 2)
      .sort((a, b) => b.riders.length - a.riders.length);
  }, [riders]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return synergyGroups;
    const q = searchTerm.toLowerCase();
    return synergyGroups.filter((group) => {
      if (group.name.toLowerCase().includes(q)) return true;
      if (group.commonKeywords.some((kw) => kw.toLowerCase().includes(q))) return true;
      if (group.themes.some((t) => t.toLowerCase().includes(q))) return true;
      return group.riders.some((r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q)
      );
    });
  }, [synergyGroups, searchTerm]);

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'Grimpeur':
        return 'bg-red-100 text-red-800';
      case 'Sprinteur':
        return 'bg-green-100 text-green-800';
      case 'Rouleur':
        return 'bg-blue-100 text-blue-800';
      case 'Puncheur':
        return 'bg-yellow-100 text-yellow-800';
      case 'Complet':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const themeMax = Math.max(...themeClusters.map((c) => c.riders.length), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-xl font-bold text-indigo-700">{filteredGroups.length}</div>
          <div className="text-[11px] text-gray-500">Groupes similarité</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-xl font-bold text-sky-700">{themeClusters.length}</div>
          <div className="text-[11px] text-gray-500">Thèmes partagés</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-xl font-bold text-emerald-700">{pilotage.contentCoveragePct}%</div>
          <div className="text-[11px] text-gray-500">Couverture projets</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-xl font-bold text-amber-700">{pilotage.topKeywords.length}</div>
          <div className="text-[11px] text-gray-500">Mots-clés récurrents</div>
        </div>
      </div>

      {/* Thèmes chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Répartition des thèmes transverses</h3>
        {themeClusters.length === 0 ? (
          <p className="text-sm text-gray-500">
            Pas de thèmes partagés détectés. Complétez les projets (forces, axes, actions) pour
            activer les synergies.
          </p>
        ) : (
          <div className="space-y-2">
            {themeClusters.map((cluster) => {
              const pct = Math.round((cluster.riders.length / themeMax) * 100);
              return (
                <div key={cluster.theme}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-800">{cluster.theme}</span>
                    <span className="tabular-nums text-gray-500">
                      {cluster.riders.length} athlète{cluster.riders.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cluster.riders.slice(0, 8).map((r) => (
                      <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {r.firstName} {r.lastName}
                      </span>
                    ))}
                    {cluster.riders.length > 8 && (
                      <span className="text-[10px] text-gray-400">+{cluster.riders.length - 8}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un groupe, un mot-clé ou un athlète..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Seuil mots-clés communs
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={minKeywords}
            onChange={(e) => setMinKeywords(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-sm font-semibold text-blue-600 w-6">{minKeywords}</span>
        </div>
      </div>

      {/* Keyword groups */}
      <div className="space-y-3">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-semibold text-gray-900 mb-1 capitalize">{group.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span>{group.riders.length} athlètes</span>
                    <span className="text-blue-600 font-medium">{group.keywordCount} mots-clés</span>
                    <span className="text-emerald-600 font-medium">Score {group.similarityScore}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onCreateWorkGroup && (
                    <button
                      type="button"
                      onClick={() => onCreateWorkGroup(group)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                    >
                      Créer un groupe
                    </button>
                  )}
                  {onGroupSelect && (
                    <button
                      type="button"
                      onClick={() => onGroupSelect(group)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                    >
                      Voir
                    </button>
                  )}
                </div>
              </div>

              {group.themes.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {group.themes.map((theme) => (
                    <span key={theme} className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-medium">
                      {theme}
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-1.5">
                {group.commonKeywords.map((keyword) => (
                  <span key={keyword} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {group.riders.map((rider) => (
                  <div
                    key={rider.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
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
        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
          <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">Aucun groupe de similarité identifié</p>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            {searchTerm
              ? 'Modifiez votre recherche.'
              : themeClusters.length > 0
                ? 'Des thèmes partagés existent ci-dessus. Baissez le seuil ou enrichissez les projets pour affiner les groupes.'
                : 'Renseignez forces / axes / actions dans les projets performance pour activer la détection.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceProjectSynergyAnalyzer;

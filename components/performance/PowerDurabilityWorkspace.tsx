import React, { useMemo, useState } from 'react';
import { Rider, ScoutingProfile, Sex } from '../../types';
import { getCurrentSeasonYear } from '../../utils/seasonUtils';
import { getAgeCategory } from '../../utils/ageUtils';
import { countSeasonWins } from '../../utils/fatigueDurabilityUtils';
import ChartBarIcon from '../icons/ChartBarIcon';
import PowerAnalysisTable from '../PowerAnalysisTable/PowerAnalysisTable';
import DurabilityAnalysisTable from '../DurabilityAnalysisTable';
import { getRosterRole } from '../../utils/rosterRoleUtils';

type SubTab = 'powers' | 'durability';
type RoleFilter = 'both' | 'team1' | 'reserve';
type FatigueProfile = 'fresh' | '15kj' | '30kj' | '45kj';

interface PowerDurabilityWorkspaceProps {
  riders: Rider[];
  scoutingProfiles?: ScoutingProfile[];
}

const PowerDurabilityWorkspace: React.FC<PowerDurabilityWorkspaceProps> = ({
  riders,
  scoutingProfiles = [],
}) => {
  const currentSeason = getCurrentSeasonYear();

  const [subTab, setSubTab] = useState<SubTab>('powers');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('both');
  const [displayMode, setDisplayMode] = useState<'watts' | 'wattsPerKg'>('wattsPerKg');
  const [fatigueProfile, setFatigueProfile] = useState<FatigueProfile>('fresh');
  const [genderFilter, setGenderFilter] = useState<'all' | Sex>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [includeScouts, setIncludeScouts] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rosterCounts = useMemo(
    () => ({
      principal: riders.filter((r) => getRosterRole(r) === 'principal').length,
      reserve: riders.filter((r) => getRosterRole(r) === 'reserve').length,
    }),
    [riders],
  );

  const filteredRidersByRole = useMemo(() => {
    if (roleFilter === 'both') return riders;
    return riders.filter(
      (r) => getRosterRole(r) === (roleFilter === 'team1' ? 'principal' : 'reserve'),
    );
  }, [riders, roleFilter]);

  const winnerRiderIds = useMemo(() => {
    const ids = new Set<string>();
    filteredRidersByRole.forEach((r) => {
      if (countSeasonWins(r, currentSeason) > 0) ids.add(r.id);
    });
    return ids;
  }, [filteredRidersByRole, currentSeason]);

  const sharedFilters = useMemo(
    () => ({
      displayMode,
      fatigueProfile,
      genderFilter,
      categoryFilter,
      levelFilter,
      includeScouts,
    }),
    [displayMode, fatigueProfile, genderFilter, categoryFilter, levelFilter, includeScouts]
  );

  const durabilityFilters = useMemo(
    () => ({
      genderFilter,
      categoryFilter,
      levelFilter,
      includeScouts,
    }),
    [genderFilter, categoryFilter, levelFilter, includeScouts]
  );

  const shownCount = useMemo(() => {
    const match = (item: { sex?: Sex; birthDate?: string; qualitativeProfile?: string }) => {
      if (genderFilter !== 'all' && item.sex !== genderFilter) return false;
      if (categoryFilter !== 'all' && item.birthDate) {
        const { category } = getAgeCategory(item.birthDate);
        if (category !== categoryFilter) return false;
      }
      if (
        levelFilter !== 'all' &&
        (!item.qualitativeProfile || item.qualitativeProfile !== levelFilter)
      ) {
        return false;
      }
      return true;
    };
    const nRiders = filteredRidersByRole.filter(match).length;
    const nScouts = includeScouts ? scoutingProfiles.filter(match).length : 0;
    return nRiders + nScouts;
  }, [
    filteredRidersByRole,
    scoutingProfiles,
    genderFilter,
    categoryFilter,
    levelFilter,
    includeScouts,
  ]);

  const activeFilterCount =
    (genderFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (levelFilter !== 'all' ? 1 : 0) +
    (includeScouts ? 1 : 0) +
    (roleFilter !== 'both' ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Barre légère : onglets + actions essentielles */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-100">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={() => setSubTab('powers')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                subTab === 'powers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ChartBarIcon className="w-3.5 h-3.5" />
              Puissances
            </button>
            <button
              type="button"
              onClick={() => setSubTab('durability')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                subTab === 'durability'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Durabilité
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          {/* Effectif Équipe 1 / Réserve */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 p-0.5">
            {(
              [
                {
                  id: 'both' as const,
                  label: 'Tous',
                  count: rosterCounts.principal + rosterCounts.reserve,
                  active: 'bg-slate-800 text-white',
                  idle: 'text-gray-500 hover:text-gray-800',
                },
                {
                  id: 'team1' as const,
                  label: 'Équipe 1',
                  count: rosterCounts.principal,
                  active: 'bg-blue-600 text-white',
                  idle: 'text-blue-700 hover:bg-blue-50',
                },
                {
                  id: 'reserve' as const,
                  label: 'Réserve',
                  count: rosterCounts.reserve,
                  active: 'bg-amber-500 text-white',
                  idle: 'text-amber-800 hover:bg-amber-50',
                },
              ] as const
            ).map(({ id, label, count, active, idle }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRoleFilter(id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  roleFilter === id ? active : idle
                }`}
              >
                {label}
                <span
                  className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] ${
                    roleFilter === id ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {subTab === 'powers' && (
            <>
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                {(
                  [
                    { id: 'wattsPerKg' as const, label: 'W/kg' },
                    { id: 'watts' as const, label: 'W' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDisplayMode(opt.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                      displayMode === opt.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                value={fatigueProfile}
                onChange={(e) => setFatigueProfile(e.target.value as FatigueProfile)}
                className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700"
                title="Profil fatigue"
              >
                <option value="fresh">Frais</option>
                <option value="15kj">15 kJ</option>
                <option value="30kj">30 kJ</option>
                <option value="45kj">45 kJ</option>
              </select>
            </>
          )}

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
              filtersOpen || activeFilterCount > 0
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>

          <button
            type="button"
            onClick={() => setShowBenchmarks((v) => !v)}
            className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
              showBenchmarks
                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showBenchmarks ? 'Masquer repères' : 'Repères'}
          </button>

          <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
            {shownCount} · S{currentSeason}
          </span>
        </div>

        {/* Filtres secondaires — repliés par défaut */}
        {filtersOpen && (
          <div className="px-3 py-2.5 bg-slate-50/80 flex flex-wrap items-center gap-2 border-b border-gray-100">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | Sex)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px]"
            >
              <option value="all">Sexe · tous</option>
              <option value={Sex.MALE}>Hommes</option>
              <option value={Sex.FEMALE}>Femmes</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px]"
            >
              <option value="all">Catégorie · toutes</option>
              <option value="U15">U15</option>
              <option value="U17">U17</option>
              <option value="U19">U19</option>
              <option value="U23">U23</option>
              <option value="Senior">Senior</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px]"
            >
              <option value="all">Niveau · tous</option>
              <option value="Elite">Elite</option>
              <option value="National">National</option>
              <option value="Regional">Régional</option>
              <option value="Amateur">Amateur</option>
            </select>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeScouts}
                onChange={(e) => setIncludeScouts(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              />
              Scouts
            </label>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setGenderFilter('all');
                  setCategoryFilter('all');
                  setLevelFilter('all');
                  setIncludeScouts(false);
                  setRoleFilter('both');
                }}
                className="text-[11px] font-medium text-rose-600 hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {subTab === 'powers' ? (
        <PowerAnalysisTable
          riders={filteredRidersByRole}
          scoutingProfiles={scoutingProfiles}
          title="Tableau athlètes"
          season={currentSeason}
          winnerRiderIds={winnerRiderIds}
          defaultIncludeScouts={false}
          hideScoutsOption
          hideControls
          compactHeader
          showStatsPanel={showBenchmarks}
          controlledFilters={sharedFilters}
          groupByRosterRole={roleFilter === 'both'}
        />
      ) : (
        <DurabilityAnalysisTable
          riders={filteredRidersByRole}
          scoutingProfiles={scoutingProfiles}
          title="Pertes sous fatigue"
          subtitle="Δ% frais → 15 / 30 / 45 kJ/kg · clic sur un nom pour le suivi."
          season={currentSeason}
          winnerRiderIds={winnerRiderIds}
          showBenchmarkPanel={showBenchmarks}
          defaultIncludeScouts={false}
          hideScoutsOption
          hideControls
          compactHeader
          groupByRosterRole={roleFilter === 'both'}
          controlledFilters={durabilityFilters}
        />
      )}
    </div>
  );
};

export default PowerDurabilityWorkspace;

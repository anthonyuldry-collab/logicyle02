import React, { useMemo, useState, useEffect } from 'react';
import { Rider, ScoutingProfile, Sex } from '../types';
import { getAgeCategory } from '../utils/ageUtils';
import {
  POWER_DURATIONS,
  FatigueKjLevel,
  FatigueAnalysisSubject,
  getFatigueDropPercentages,
  getDropColorClass,
  isStrongFatigueDrop,
  hasFatigueProfiles,
  computeFatigueAnalysisReport,
  detectDurabilityPotentials,
  getBenchmarkForCell,
  compareToWinnerRef,
  getBenchmarksWithData,
} from '../utils/fatigueDurabilityUtils';
import { ALL_TIME_STATS_SEASON } from '../utils/performanceArchiveUtils';
import FatigueStatsPanel from './FatigueStatsPanel';

type DurabilityRow = (Rider | ScoutingProfile) & FatigueAnalysisSubject;

interface DurabilityAnalysisTableProps {
  riders: Rider[];
  scoutingProfiles?: ScoutingProfile[];
  title?: string;
  subtitle?: string;
  season?: number;
  winnerRiderIds?: Set<string>;
  removedRiderIds?: Set<string>;
  showBenchmarkPanel?: boolean;
  defaultIncludeScouts?: boolean;
  hideScoutsOption?: boolean;
  alwaysIncludeScouts?: boolean;
  scopeLabel?: string;
}

const DurabilityAnalysisTable: React.FC<DurabilityAnalysisTableProps> = ({
  riders,
  scoutingProfiles = [],
  title = 'Indicateurs de Durabilité',
  subtitle = 'Pourcentages de perte de puissance (W/kg) entre le profil frais et après 15, 30 et 45 kJ/kg',
  season,
  winnerRiderIds = new Set(),
  removedRiderIds,
  showBenchmarkPanel = true,
  defaultIncludeScouts = false,
  hideScoutsOption = false,
  alwaysIncludeScouts = false,
  scopeLabel,
}) => {
  const [genderFilter, setGenderFilter] = useState<'all' | Sex>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | string>('all');
  const [kjFilter, setKjFilter] = useState<'all' | '15kj' | '30kj' | '45kj'>('all');
  const [durationFilter, setDurationFilter] = useState<string[]>(POWER_DURATIONS.map(d => d.key));
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showPriorities, setShowPriorities] = useState(true);
  const [showPotentialsOnly, setShowPotentialsOnly] = useState(false);
  const [includeScouts, setIncludeScouts] = useState(
    alwaysIncludeScouts || defaultIncludeScouts
  );

  useEffect(() => {
    if (alwaysIncludeScouts) setIncludeScouts(true);
  }, [alwaysIncludeScouts]);

  const isAllTime = season === ALL_TIME_STATS_SEASON;

  const isScoutRow = (item: DurabilityRow): item is ScoutingProfile =>
    'status' in item && 'potentialRating' in item;

  const ridersWithFatigue = useMemo(
    () => riders.filter(r => hasFatigueProfiles(r)) as DurabilityRow[],
    [riders]
  );

  const scoutsWithFatigue = useMemo(
    () => scoutingProfiles.filter(s => hasFatigueProfiles(s)) as DurabilityRow[],
    [scoutingProfiles]
  );

  const fatigueReport = useMemo(() => {
    if (!showBenchmarkPanel || !season) return null;
    return computeFatigueAnalysisReport(ridersWithFatigue, season, winnerRiderIds);
  }, [ridersWithFatigue, season, winnerRiderIds, showBenchmarkPanel]);

  const benchmarks = useMemo(() => {
    if (!fatigueReport) return [];
    if (categoryFilter === 'all') return fatigueReport.globalBenchmarks;
    const cat = fatigueReport.byCategory.find(c => c.category === categoryFilter);
    return cat?.benchmarks ?? [];
  }, [fatigueReport, categoryFilter]);

  const categoryBenchmarkMap = useMemo(() => {
    const map = new Map<string, typeof benchmarks>();
    fatigueReport?.byCategory.forEach(c => map.set(c.category, c.benchmarks));
    return map;
  }, [fatigueReport]);

  const potentials = useMemo(() => {
    if (!fatigueReport) return [];
    return detectDurabilityPotentials(
      ridersWithFatigue,
      fatigueReport.globalBenchmarks,
      winnerRiderIds,
      categoryFilter,
      categoryBenchmarkMap
    );
  }, [ridersWithFatigue, fatigueReport, winnerRiderIds, categoryFilter, categoryBenchmarkMap]);

  const statsTableRows = useMemo(
    () => getBenchmarksWithData(benchmarks, 1),
    [benchmarks]
  );

  const potentialIds = useMemo(
    () => new Set(potentials.map(p => p.riderId)),
    [potentials]
  );

  const filteredData = useMemo(() => {
    const matchFilters = (item: DurabilityRow) => {
      if (genderFilter !== 'all' && item.sex !== genderFilter) return false;
      if (categoryFilter !== 'all') {
        const { category } = getAgeCategory(item.birthDate);
        if (category !== categoryFilter) return false;
      }
      if (
        levelFilter !== 'all' &&
        item.qualitativeProfile &&
        item.qualitativeProfile !== levelFilter
      ) {
        return false;
      }
      if (showPotentialsOnly && !potentialIds.has(item.id)) return false;
      return true;
    };

    const filteredRiders = ridersWithFatigue.filter(matchFilters);
    const filteredScouts = includeScouts ? scoutsWithFatigue.filter(matchFilters) : [];
    let filtered: DurabilityRow[] = [...filteredRiders, ...filteredScouts];

    if (sortColumn && kjFilter !== 'all') {
      const kjLevel: FatigueKjLevel =
        kjFilter === '15kj' ? 'd15' : kjFilter === '30kj' ? 'd30' : 'd45';
      filtered = [...filtered].sort((a, b) => {
        const aDrop = getFatigueDropPercentages(a)[sortColumn]?.[kjLevel] ?? -999;
        const bDrop = getFatigueDropPercentages(b)[sortColumn]?.[kjLevel] ?? -999;
        return sortDirection === 'asc' ? aDrop - bDrop : bDrop - aDrop;
      });
    }

    return filtered;
  }, [
    ridersWithFatigue,
    scoutsWithFatigue,
    includeScouts,
    genderFilter,
    categoryFilter,
    levelFilter,
    sortColumn,
    sortDirection,
    kjFilter,
    showPotentialsOnly,
    potentialIds,
  ]);

  const visibleDurations = POWER_DURATIONS.filter(d => durationFilter.includes(d.key));

  const handleSort = (durationKey: string) => {
    if (sortColumn === durationKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(durationKey);
      setSortDirection('asc');
    }
  };

  if (ridersWithFatigue.length === 0 && scoutsWithFatigue.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
        <p className="text-sm">
          Aucun profil de fatigue (15 / 30 / 45 kJ/kg). Complétez les PPR des coureuses ou activez
          « Inclure scouts » pour les données du module Scouting.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-sm text-indigo-100">{subtitle}</p>
      </div>

      {showBenchmarkPanel && season && fatigueReport && (
        <div className="bg-indigo-50/80 border-b border-indigo-100 px-3 py-3 sm:px-4">
          {scopeLabel && (
            <div className="mb-3 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg flex flex-wrap gap-2">
              <span>Portée : {scopeLabel}</span>
              {alwaysIncludeScouts && (
                <span className="bg-green-600/80 px-2 py-0.5 rounded">+ tous les scouts</span>
              )}
            </div>
          )}
          <FatigueStatsPanel
            report={fatigueReport}
            categoryFilter={categoryFilter}
            statsRows={statsTableRows}
            potentials={potentials}
            winnerCount={winnerRiderIds.size}
            isAllTime={isAllTime}
          />
        </div>
      )}

      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-gray-200">
          {alwaysIncludeScouts ? (
            <span className="text-sm text-green-700 font-medium">
              Scouts inclus ({scoutingProfiles.length})
            </span>
          ) : (
            !hideScoutsOption && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeScouts}
                  onChange={e => setIncludeScouts(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                Inclure scouts
                {scoutsWithFatigue.length > 0 && (
                  <span className="text-xs text-gray-500">
                    ({scoutsWithFatigue.length} avec PPR fatigue)
                  </span>
                )}
              </label>
            )
          )}
          <span className="text-sm text-gray-600">
            {filteredData.length} profil{filteredData.length !== 1 ? 's' : ''} affiché
            {filteredData.length !== 1 ? 's' : ''}
            {includeScouts && filteredData.some(isScoutRow) && (
              <span className="text-green-700 ml-1">· scouts inclus</span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sexe:</label>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value as 'all' | Sex)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous</option>
              <option value={Sex.MALE}>Hommes</option>
              <option value={Sex.FEMALE}>Femmes</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Catégorie:</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Toutes</option>
              <option value="U15">U15</option>
              <option value="U17">U17</option>
              <option value="U19">U19</option>
              <option value="U23">U23</option>
              <option value="Senior">Senior</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Niveau:</label>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous</option>
              <option value="Elite">Elite</option>
              <option value="National">National</option>
              <option value="Regional">Régional</option>
              <option value="Amateur">Amateur</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">kJ/kg:</label>
            <select
              value={kjFilter}
              onChange={e => setKjFilter(e.target.value as typeof kjFilter)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous (15/30/45 kJ)</option>
              <option value="15kj">15 kJ/kg</option>
              <option value="30kj">30 kJ/kg</option>
              <option value="45kj">45 kJ/kg</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Durées:</label>
            <select
              value={
                durationFilter.length === POWER_DURATIONS.length
                  ? 'all'
                  : durationFilter[0] || 'all'
              }
              onChange={e => {
                if (e.target.value === 'all') {
                  setDurationFilter(POWER_DURATIONS.map(d => d.key));
                } else {
                  setDurationFilter([e.target.value]);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Toutes</option>
              {POWER_DURATIONS.map(d => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-gray-600">
            {filteredData.length} athlète{filteredData.length !== 1 ? 's' : ''} affiché
            {filteredData.length !== 1 ? 's' : ''}
            {winnerRiderIds.size > 0 && (
              <span className="ml-2 text-green-700">
                · {winnerRiderIds.size} réf. gagnante{winnerRiderIds.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPotentialsOnly}
                onChange={e => setShowPotentialsOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Potentiel uniquement
            </label>
            <button
              type="button"
              onClick={() => setShowPriorities(!showPriorities)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                showPriorities ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-700'
              }`}
            >
              Priorités {showPriorities ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase z-10">
                Coureur
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                Profil
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                Palmarès
              </th>
              {visibleDurations.map(duration => {
                const colSpan = kjFilter === 'all' ? 3 : 1;
                const isSortable = kjFilter !== 'all';
                const isSorted = sortColumn === duration.key;
                return (
                  <th
                    key={duration.key}
                    colSpan={colSpan}
                    className={`px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-l border-gray-300 ${
                      isSortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${isSorted ? 'bg-blue-100' : ''}`}
                    onClick={() => isSortable && handleSort(duration.key)}
                  >
                    {duration.label}
                    {isSorted && (
                      <span className="ml-1 text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 z-10" />
              <th />
              <th />
              {visibleDurations.map(duration =>
                kjFilter === 'all' ? (
                  <React.Fragment key={duration.key}>
                    <th className="px-2 py-2 text-center text-xs text-gray-500 border-l border-gray-300">
                      Δ% 15
                    </th>
                    <th className="px-2 py-2 text-center text-xs text-gray-500">Δ% 30</th>
                    <th className="px-2 py-2 text-center text-xs text-gray-500">Δ% 45</th>
                  </React.Fragment>
                ) : (
                  <th
                    key={duration.key}
                    className="px-2 py-2 text-center text-xs text-gray-500 border-l border-gray-300"
                  >
                    Δ% {kjFilter.replace('kj', '')}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={99} className="px-6 py-8 text-center text-sm text-gray-500">
                  {scoutsWithFatigue.length > 0 && !includeScouts
                    ? 'Cochez « Inclure scouts » pour afficher les profils du module Scouting.'
                    : 'Aucun profil ne correspond aux filtres sélectionnés.'}
                </td>
              </tr>
            ) : filteredData.map(item => {
              const durability = getFatigueDropPercentages(item);
              const scout = isScoutRow(item);
              const isWinner = !scout && winnerRiderIds.has(item.id);
              const isRemoved = !scout && removedRiderIds?.has(item.id);
              const hasPotential = potentialIds.has(item.id);

              return (
                <tr
                  key={scout ? `scout-${item.id}` : item.id}
                  className={`hover:bg-gray-50 ${hasPotential ? 'bg-green-50/40' : ''} ${scout ? 'bg-green-50/20' : ''}`}
                >
                  <td className="sticky left-0 bg-white px-4 py-3 z-10">
                    <div className="text-sm font-medium text-gray-900">
                      {item.firstName} {item.lastName}
                      {scout && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Scout
                        </span>
                      )}
                      {isRemoved && (
                        <span className="ml-1 text-xs text-amber-700">(archivée)</span>
                      )}
                      {hasPotential && (
                        <span className="ml-1 text-xs text-green-700 font-semibold">★ potentiel</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getAgeCategory(item.birthDate).category}
                      {scout && 'potentialRating' in item && item.potentialRating != null && (
                        <span className="ml-1">· Potentiel {item.potentialRating}/5</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    <span className={`inline-flex px-2 py-0.5 rounded-full ${
                      scout ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {scout ? 'Prospect' : item.qualitativeProfile || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {isWinner ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                        Gagnante
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {visibleDurations.map(duration => {
                    const drops = durability[duration.key] || {};
                    const renderCell = (
                      drop: number | undefined,
                      kj: FatigueKjLevel
                    ) => {
                      const bench = getBenchmarkForCell(benchmarks, duration.key, kj);
                      const comparison = compareToWinnerRef(drop, bench);
                      const isPriority = showPriorities && isStrongFatigueDrop(drop);
                      return (
                        <td
                          className={`px-2 py-3 text-center text-sm border-l border-gray-100 ${
                            isPriority ? 'bg-red-100 font-bold' : ''
                          } ${
                            comparison === 'above'
                              ? 'ring-1 ring-inset ring-green-300'
                              : ''
                          }`}
                        >
                          <span className={getDropColorClass(drop)}>
                            {drop !== undefined ? `${drop.toFixed(0)}%` : '—'}
                          </span>
                          {comparison === 'above' && (
                            <div className="text-[10px] text-green-600 font-medium">↑ ref.</div>
                          )}
                        </td>
                      );
                    };

                    if (kjFilter === 'all') {
                      return (
                        <React.Fragment key={duration.key}>
                          {renderCell(drops.d15, 'd15')}
                          {renderCell(drops.d30, 'd30')}
                          {renderCell(drops.d45, 'd45')}
                        </React.Fragment>
                      );
                    }
                    const drop =
                      kjFilter === '15kj'
                        ? drops.d15
                        : kjFilter === '30kj'
                          ? drops.d30
                          : drops.d45;
                    const kj: FatigueKjLevel =
                      kjFilter === '15kj' ? 'd15' : kjFilter === '30kj' ? 'd30' : 'd45';
                    return (
                      <React.Fragment key={duration.key}>
                        {renderCell(drop, kj)}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 p-4 border-t text-xs text-gray-600 flex flex-wrap gap-4">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400 rounded" /> Δ ≥ -10%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-orange-400 rounded" /> -10% &gt; Δ &gt; -20%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-400 rounded" /> Δ ≤ -20% (priorité)
        </span>
        <span className="flex items-center gap-1">
          <span className="ring-1 ring-green-400 rounded px-1">↑ ref.</span> Meilleure que réf. gagnantes
        </span>
      </div>
    </div>
  );
};

export default DurabilityAnalysisTable;

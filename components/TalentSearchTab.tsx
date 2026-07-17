
import React, { useState, useMemo } from 'react';
import {
  AppState,
  DisciplinePracticed,
  Sex,
  User,
  UserRole,
  ScoutingRequestStatus,
  ScoutingDataScope,
  TeamMembershipStatus,
  TeamRecruitmentTarget,
} from '../types';
import { ALL_COUNTRIES, SPIDER_CHART_CHARACTERISTICS_CONFIG } from '../constants';
import {
  DEMO_TALENT_PROFILES,
  DISCIPLINE_FILTER_LABELS,
  isDemoTalentUser,
} from '../constants/demoTalentProfiles';
import {
  getTalentDiscipline,
  hasScoutingAccess,
  getTalentCharacteristics,
  getCharacteristicCellClass,
  getGeneralScoreCellClass,
  CHARACTERISTIC_SHORT_LABELS,
  getTalentDisplayGrade,
  getPrimaryCharacteristicKey,
  sortTalents,
  TALENT_PROFILE_GOAL_OPTIONS,
  TalentSearchProfileGoal,
  TalentSortKey,
} from '../utils/talentSearchUtils';
import {
  ALL_SCOUTING_DATA_SCOPES,
  SCOUTING_DATA_SCOPE_OPTIONS,
  isAthleteOnWatchlist,
} from '../utils/scoutingProspectUtils';
import ActionButton from './ActionButton';
import Modal from './Modal';
import TalentProfilePreviewModal from './TalentProfilePreviewModal';
import { hasActiveIndependentSubscription } from '../utils/subscriptionEntitlements';
import { useTranslations } from '../hooks/useTranslations';
import {
  canTeamScoutRider,
  getRecruitmentTargetsForTeam,
  getTeamMarketContext,
  RECRUITMENT_TARGET_OPTIONS,
  resolveRiderMarketSegmentFromUser,
  RIDER_SEGMENT_LABELS,
} from '../utils/riderTeamMarketSegment';

interface TalentSearchTabProps {
  appState: AppState;
  onProfileSelect: (user: User) => void;
  onAddWatchlistProspect: (user: User) => void;
  onRequestScoutingAccess: (user: User, requestedScopes: ScoutingDataScope[]) => Promise<void>;
  currentTeamId: string | null;
  onRecruitmentTargetChange?: (target: TeamRecruitmentTarget) => void;
}

const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const matchesTalentFilters = (
  user: User,
  appState: AppState,
  filters: {
    nameFilter: string;
    minAge: number;
    maxAge: number;
    nationalityFilter: string;
    sexFilter: 'all' | Sex;
    disciplineFilter: 'all' | DisciplinePracticed;
  }
): boolean => {
  const age = getAge(user.signupInfo?.birthDate);
  if (age === null || age < filters.minAge || age > filters.maxAge) return false;
  if (
    filters.nameFilter &&
    !`${user.firstName} ${user.lastName}`.toLowerCase().includes(filters.nameFilter.toLowerCase())
  ) {
    return false;
  }
  if (filters.sexFilter !== 'all' && user.signupInfo?.sex !== filters.sexFilter) return false;
  if (filters.nationalityFilter !== 'all' && user.signupInfo?.nationality !== filters.nationalityFilter) {
    return false;
  }
  if (filters.disciplineFilter !== 'all') {
    const discipline = getTalentDiscipline(user, appState.riders);
    if (discipline !== filters.disciplineFilter) return false;
  }
  return true;
};

const TalentSearchTab: React.FC<TalentSearchTabProps> = ({
  appState,
  onProfileSelect,
  onAddWatchlistProspect,
  onRequestScoutingAccess,
  currentTeamId,
  onRecruitmentTargetChange,
}) => {
  const { t } = useTranslations();

  const currentTeam = useMemo(
    () => (currentTeamId ? appState.teams?.find((team) => team.id === currentTeamId) : undefined),
    [appState.teams, currentTeamId],
  );

  const marketContext = useMemo(
    () =>
      getTeamMarketContext(currentTeam, appState.operationalSettings ?? currentTeam?.operationalSettings),
    [currentTeam, appState.operationalSettings],
  );

  const recruitmentTarget = marketContext.recruitmentTarget;

  const availableRecruitmentTargets = useMemo(
    () => getRecruitmentTargetsForTeam(marketContext),
    [marketContext],
  );
  const [nameFilter, setNameFilter] = useState('');
  const [sexFilter, setSexFilter] = useState<'all' | Sex>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<'all' | DisciplinePracticed>('all');
  const [minAge, setMinAge] = useState(19);
  const [maxAge, setMaxAge] = useState(40);
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [showDevExamples, setShowDevExamples] = useState(import.meta.env.DEV);
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [searchGoal, setSearchGoal] = useState<TalentSearchProfileGoal>('all');
  const [sortKey, setSortKey] = useState<TalentSortKey>('generalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [contactModalUser, setContactModalUser] = useState<User | null>(null);
  const [contactScopes, setContactScopes] = useState<ScoutingDataScope[]>(ALL_SCOUTING_DATA_SCOPES);

  const teamScoutingRequests = useMemo(() => {
    if (!currentTeamId || !appState.scoutingRequests) return [];
    return appState.scoutingRequests.filter(r => r.requesterTeamId === currentTeamId);
  }, [appState.scoutingRequests, currentTeamId]);

  const getRequestForUser = (userId: string) => teamScoutingRequests.find(r => r.athleteId === userId);

  const filterParams = useMemo(
    () => ({ nameFilter, minAge, maxAge, nationalityFilter, sexFilter, disciplineFilter }),
    [nameFilter, minAge, maxAge, nationalityFilter, sexFilter, disciplineFilter]
  );

  const filteredTalents = useMemo(() => {
    if (!currentTeamId || !appState.teamMemberships || !appState.users || !appState.scoutingRequests) {
      return showDevExamples
        ? DEMO_TALENT_PROFILES.filter(u => matchesTalentFilters(u, appState, filterParams))
        : [];
    }

    const currentTeamUserIds = new Set(
      appState.teamMemberships
        .filter(m => m.teamId === currentTeamId && m.status === TeamMembershipStatus.ACTIVE)
        .map(m => m.userId)
    );

    const realTalents = appState.users.filter(user => {
      if (user.userRole !== UserRole.COUREUR) return false;
      if (currentTeamUserIds.has(user.id)) return false;

      const riderProfile = appState.riders.find(r => r.email === user.email);
      const isIndependent = user.isIndependentProfile || user.signupMode === 'independent';
      const hasMarketplaceAccess = !isIndependent || hasActiveIndependentSubscription(user);
      const isVisible = hasMarketplaceAccess && (user.isSearchable || riderProfile?.isSearchable);
      const hasSharedData = hasScoutingAccess(user.id, teamScoutingRequests);

      if (!isVisible && !hasSharedData) return false;
      if (!matchesTalentFilters(user, appState, filterParams)) return false;

      const riderSegment = resolveRiderMarketSegmentFromUser(user, riderProfile);
      return canTeamScoutRider(marketContext, riderSegment);
    });

    if (!showDevExamples) return realTalents;

    const demoTalents = DEMO_TALENT_PROFILES.filter(u => matchesTalentFilters(u, appState, filterParams));
    return [...realTalents, ...demoTalents];
  }, [appState, filterParams, currentTeamId, showDevExamples, teamScoutingRequests, marketContext]);

  const sortedTalents = useMemo(
    () =>
      sortTalents(
        filteredTalents,
        appState.riders ?? [],
        teamScoutingRequests,
        searchGoal,
        sortKey,
        sortDirection,
      ),
    [filteredTalents, appState.riders, teamScoutingRequests, searchGoal, sortKey, sortDirection],
  );

  const primaryCriterionKey = getPrimaryCharacteristicKey(searchGoal);
  const primaryCriterionLabel =
    SPIDER_CHART_CHARACTERISTICS_CONFIG.find(c => c.key === primaryCriterionKey)?.label ?? 'Critère';

  const handleSort = (key: TalentSortKey) => {
    if (sortKey === key) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (key: TalentSortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const handleRequestAccess = async (user: User, scopes: ScoutingDataScope[]) => {
    setLoadingUserId(user.id);
    try {
      await onRequestScoutingAccess(user, scopes);
      alert(t('talentScoutingRequestSent'));
    } finally {
      setLoadingUserId(null);
      setContactModalUser(null);
    }
  };

  const handleWatchlistAdd = (user: User) => {
    if (isAthleteOnWatchlist(user.id, appState.scoutingProfiles ?? [])) {
      alert(t('talentWatchlistOnList'));
      return;
    }
    onAddWatchlistProspect(user);
    alert(t('talentWatchlistAdded'));
  };

  const handleTalentAction = async (user: User) => {
    if (isDemoTalentUser(user.id)) {
      setPreviewUser(user);
      return;
    }

    const existing = getRequestForUser(user.id);

    if (existing?.status === ScoutingRequestStatus.ACCEPTED || hasScoutingAccess(user.id, teamScoutingRequests)) {
      setPreviewUser(user);
      return;
    }
    if (existing?.status === ScoutingRequestStatus.PENDING) {
      alert(t('talentScoutingRequestPending'));
      return;
    }
    if (existing?.status === ScoutingRequestStatus.REJECTED) {
      alert(t('talentScoutingRequestRejected'));
      return;
    }

    setContactModalUser(user);
    setContactScopes(ALL_SCOUTING_DATA_SCOPES);
  };

  const getButtonLabel = (userId: string) => {
    if (isDemoTalentUser(userId)) return 'Voir exemple';
    const existing = getRequestForUser(userId);
    if (existing?.status === ScoutingRequestStatus.ACCEPTED) return t('talentScoutingViewProfile');
    if (existing?.status === ScoutingRequestStatus.PENDING) return t('talentScoutingStatusPending');
    return t('talentContactRequest');
  };

  const getStatusBadge = (userId: string) => {
    if (isDemoTalentUser(userId)) {
      return (
        <span className="text-[10px] font-medium text-violet-300 bg-violet-900/40 px-1.5 py-0.5 rounded">
          Exemple
        </span>
      );
    }
    const existing = getRequestForUser(userId);
    if (!existing) {
      if (isAthleteOnWatchlist(userId, appState.scoutingProfiles ?? [])) {
        return (
          <span className="text-[10px] font-medium text-slate-300 bg-slate-600/50 px-1.5 py-0.5 rounded">
            {t('talentWatchlistOnList')}
          </span>
        );
      }
      return (
        <span className="text-[10px] font-medium text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded">
          Non contacté
        </span>
      );
    }
    if (existing.status === ScoutingRequestStatus.ACCEPTED) {
      return (
        <span className="text-[10px] font-medium text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded">
          {t('talentScoutingStatusAccepted')}
        </span>
      );
    }
    if (existing.status === ScoutingRequestStatus.PENDING) {
      return (
        <span className="text-[10px] font-medium text-amber-300 bg-amber-900/40 px-1.5 py-0.5 rounded">
          {t('talentScoutingStatusPending')}
        </span>
      );
    }
    if (existing.status === ScoutingRequestStatus.REJECTED) {
      return (
        <span className="text-[10px] font-medium text-red-300 bg-red-900/40 px-1.5 py-0.5 rounded">
          Refusé
        </span>
      );
    }
    return null;
  };

  const renderCharacteristicCell = (user: User, key: string) => {
    const unlocked = hasScoutingAccess(user.id, teamScoutingRequests, ScoutingDataScope.PERFORMANCE_DATA);
    if (!unlocked) {
      return (
        <td key={key} className="px-1 py-2 text-center">
          <span className="inline-flex items-center justify-center w-8 h-7 rounded bg-slate-700/40 text-slate-500 text-[10px]">
            —
          </span>
        </td>
      );
    }
    const chars = getTalentCharacteristics(user, appState.riders ?? []);
    const val = chars[key];
    return (
      <td key={key} className="px-1 py-2 text-center">
        <span
          className={`inline-flex items-center justify-center w-8 h-7 rounded text-xs ${getCharacteristicCellClass(val)}`}
        >
          {val > 0 ? val : '—'}
        </span>
      </td>
    );
  };

  const demoCount = filteredTalents.filter(u => isDemoTalentUser(u.id)).length;
  const realCount = filteredTalents.length - demoCount;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-700/80 rounded-lg border border-slate-600 space-y-3">
        <p className="text-sm text-slate-200">
          <strong>Suivi discret</strong> : ajoutez un prospect en interne sans informer l&apos;athlète.
        </p>
        <p className="text-sm text-slate-200">
          <strong>Demande de contact</strong> : coordination, données performance et/ou projet sportif — l&apos;athlète choisit ce qu&apos;il partage.
          Seules les infos de base sont visibles avant acceptation.
        </p>
      </div>

      <div className="p-4 bg-slate-700 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="Rechercher par nom..."
            className="input-field-sm lg:col-span-2"
          />
          <div>
            <label className="block text-xs font-medium text-slate-300">Nationalité</label>
            <select
              value={nationalityFilter}
              onChange={e => setNationalityFilter(e.target.value)}
              className="input-field-sm"
            >
              <option value="all">Toutes Nationalités</option>
              {ALL_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Sexe</label>
            <select
              value={sexFilter}
              onChange={e => setSexFilter(e.target.value as 'all' | Sex)}
              className="input-field-sm"
            >
              <option value="all">Tous les Sexes</option>
              <option value={Sex.MALE}>{Sex.MALE}</option>
              <option value={Sex.FEMALE}>{Sex.FEMALE}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Discipline</label>
            <select
              value={disciplineFilter}
              onChange={e => setDisciplineFilter(e.target.value as 'all' | DisciplinePracticed)}
              className="input-field-sm"
            >
              <option value="all">Toutes disciplines</option>
              {Object.values(DisciplinePracticed).map(d => (
                <option key={d} value={d}>
                  {DISCIPLINE_FILTER_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-300">
              Tranche d&apos;âge : {minAge} - {maxAge} ans
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="number"
                value={minAge}
                onChange={e => setMinAge(Number(e.target.value))}
                className="input-field-sm w-full"
                placeholder="Min"
                min={16}
                max={50}
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={maxAge}
                onChange={e => setMaxAge(Number(e.target.value))}
                className="input-field-sm w-full"
                placeholder="Max"
                min={16}
                max={50}
              />
            </div>
          </div>
        </div>

        {import.meta.env.DEV && (
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showDevExamples}
              onChange={e => setShowDevExamples(e.target.checked)}
              className="rounded border-slate-500"
            />
            Afficher les profils exemples ({DEMO_TALENT_PROFILES.length} fictifs — données débloquées)
          </label>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-600">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Niveau recherché</label>
            <select
              value={recruitmentTarget}
              onChange={(e) => onRecruitmentTargetChange?.(e.target.value as TeamRecruitmentTarget)}
              className="input-field-sm w-full"
              disabled={!onRecruitmentTargetChange}
            >
              {RECRUITMENT_TARGET_OPTIONS.filter((opt) => availableRecruitmentTargets.includes(opt.id)).map(
                (opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ),
              )}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {RECRUITMENT_TARGET_OPTIONS.find((opt) => opt.id === recruitmentTarget)?.hint ??
                'Segmentation automatique selon le niveau de votre équipe'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Profil recherché</label>
            <select
              value={searchGoal}
              onChange={e => setSearchGoal(e.target.value as TalentSearchProfileGoal)}
              className="input-field-sm w-full"
            >
              {TALENT_PROFILE_GOAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Pondère la note générale selon le type de coureur recherché
              {searchGoal !== 'all' && ` · critère principal : ${primaryCriterionLabel}`}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Trier par</label>
            <select
              value={sortKey}
              onChange={e => {
                const key = e.target.value as TalentSortKey;
                setSortKey(key);
                setSortDirection(key === 'name' ? 'asc' : 'desc');
              }}
              className="input-field-sm w-full"
            >
              <option value="generalScore">Note générale</option>
              <option value="criterionScore">Critère principal ({primaryCriterionLabel})</option>
              <option value="name">Nom</option>
              <option value="age">Âge</option>
              <option value="charSprint">Sprint</option>
              <option value="charClimbing">Grimpe</option>
              <option value="charPuncher">Puncheur</option>
              <option value="charAnaerobic">Anaérobie</option>
              <option value="charRouleur">Rouleur</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
              className="text-[10px] text-slate-400 mt-1 hover:text-slate-200"
            >
              Ordre : {sortDirection === 'desc' ? 'décroissant ▼' : 'croissant ▲'} (cliquer pour inverser)
            </button>
          </div>
        </div>
      </div>

      {(realCount > 0 || demoCount > 0) && (
        <p className="text-xs text-slate-400">
          {realCount} profil(s) réel(s)
          {demoCount > 0 && ` · ${demoCount} exemple(s)`}
        </p>
      )}

      {filteredTalents.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-600">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th
                  className="px-3 py-2.5 sticky left-0 bg-slate-800 z-10 cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('name')}
                >
                  Nom{sortIndicator('name')}
                </th>
                <th className="px-2 py-2.5">Nat.</th>
                <th
                  className="px-2 py-2.5 cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('age')}
                >
                  Âge{sortIndicator('age')}
                </th>
                <th className="px-2 py-2.5">Discipline</th>
                <th className="px-2 py-2.5">Niveau</th>
                <th className="px-2 py-2.5">Statut</th>
                <th
                  className="px-2 py-2.5 text-center cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('generalScore')}
                  title="Note générale pondérée selon le profil recherché"
                >
                  Note{sortIndicator('generalScore')}
                </th>
                {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(c => (
                  <th
                    key={c.key}
                    className="px-1 py-2.5 text-center text-[10px] cursor-pointer hover:text-slate-200"
                    title={c.label}
                    onClick={() => handleSort(c.key as TalentSortKey)}
                  >
                    {CHARACTERISTIC_SHORT_LABELS[c.key]}
                    {sortIndicator(c.key as TalentSortKey)}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right sticky right-0 bg-slate-800 z-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedTalents.map(user => {
                const existing = getRequestForUser(user.id);
                const isPending = existing?.status === ScoutingRequestStatus.PENDING;
                const discipline = getTalentDiscipline(user, appState.riders);
                const nationalityCode = user.signupInfo?.nationality ?? '—';
                const unlocked = hasScoutingAccess(user.id, teamScoutingRequests, ScoutingDataScope.PERFORMANCE_DATA);
                const generalGrade = getTalentDisplayGrade(user, appState.riders ?? [], searchGoal, unlocked);
                const riderProfile = appState.riders.find((r) => r.email === user.email);
                const riderSegment = resolveRiderMarketSegmentFromUser(user, riderProfile);

                return (
                  <tr
                    key={user.id}
                    className={`bg-slate-800/80 hover:bg-slate-750 ${
                      isDemoTalentUser(user.id) ? 'border-l-2 border-violet-500/60' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-slate-100 sticky left-0 bg-inherit z-[1] whitespace-nowrap">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{nationalityCode}</td>
                    <td className="px-2 py-2 text-slate-300">{getAge(user.signupInfo?.birthDate) ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-300 text-xs">
                      {discipline ? (DISCIPLINE_FILTER_LABELS[discipline]?.replace(/^[^\s]+\s/, '') ?? discipline) : '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300 text-xs whitespace-nowrap">
                      {RIDER_SEGMENT_LABELS[riderSegment]}
                    </td>
                    <td className="px-2 py-2">{getStatusBadge(user.id)}</td>
                    <td className="px-2 py-2 text-center">
                      {unlocked && generalGrade !== null ? (
                        <span
                          className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-1.5 rounded text-xs ${getGeneralScoreCellClass(generalGrade)}`}
                          title={`Note générale (${searchGoal === 'all' ? 'moyenne' : TALENT_PROFILE_GOAL_OPTIONS.find(o => o.value === searchGoal)?.label})`}
                        >
                          {generalGrade}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-7 rounded bg-slate-700/40 text-slate-500 text-[10px]">
                          —
                        </span>
                      )}
                    </td>
                    {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(c => renderCharacteristicCell(user, c.key))}
                    <td className="px-3 py-2 text-right sticky right-0 bg-inherit z-[1]">
                      <div className="flex flex-col sm:flex-row gap-1 justify-end">
                        {!isDemoTalentUser(user.id) &&
                          existing?.status !== ScoutingRequestStatus.ACCEPTED &&
                          existing?.status !== ScoutingRequestStatus.PENDING && (
                          <ActionButton
                            onClick={() => handleWatchlistAdd(user)}
                            variant="secondary"
                            size="sm"
                            disabled={isAthleteOnWatchlist(user.id, appState.scoutingProfiles ?? [])}
                          >
                            {isAthleteOnWatchlist(user.id, appState.scoutingProfiles ?? [])
                              ? t('talentWatchlistOnList')
                              : t('talentWatchlistAdd')}
                          </ActionButton>
                        )}
                        <ActionButton
                          onClick={() => handleTalentAction(user)}
                          variant="primary"
                          size="sm"
                          disabled={loadingUserId === user.id || isPending}
                        >
                          {loadingUserId === user.id ? '...' : getButtonLabel(user.id)}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Aucun talent ne correspond à vos critères de recherche.</p>
          <div className="text-sm text-slate-500 space-y-1">
            <p>{appState.users?.filter(u => u.userRole === UserRole.COUREUR).length || 0} coureurs dans la base</p>
            <p>
              {appState.users?.filter(u => u.userRole === UserRole.COUREUR && u.isSearchable).length || 0} coureurs
              visibles en recrutement
            </p>
            {import.meta.env.DEV && (
              <p className="text-violet-300">
                Astuce : activez « profils exemples » ou élargissez les filtres (discipline, âge…)
              </p>
            )}
          </div>
        </div>
      )}

      {previewUser && (
        <TalentProfilePreviewModal
          user={previewUser}
          appState={appState}
          teamScoutingRequests={teamScoutingRequests}
          onClose={() => setPreviewUser(null)}
          onAddWatchlistProspect={user => {
            setPreviewUser(null);
            handleWatchlistAdd(user);
          }}
          onAddToProspects={user => {
            setPreviewUser(null);
            onProfileSelect(user);
          }}
          onRequestContact={(user, scopes) => {
            setPreviewUser(null);
            return handleRequestAccess(user, scopes);
          }}
        />
      )}

      {contactModalUser && (
        <Modal
          isOpen
          onClose={() => setContactModalUser(null)}
          title={t('talentContactRequestTitle')}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('talentContactRequestHint')}</p>
            <p className="text-sm font-medium text-gray-900">
              {contactModalUser.firstName} {contactModalUser.lastName}
            </p>
            <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
              {SCOUTING_DATA_SCOPE_OPTIONS.map(({ value, label, description }) => (
                <label key={value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactScopes.includes(value)}
                    onChange={() =>
                      setContactScopes(prev =>
                        prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value],
                      )
                    }
                    className="mt-1 rounded border-gray-300"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-gray-500">{description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <ActionButton variant="secondary" onClick={() => setContactModalUser(null)}>
                Annuler
              </ActionButton>
              <ActionButton
                variant="primary"
                disabled={contactScopes.length === 0 || loadingUserId === contactModalUser.id}
                onClick={() => handleRequestAccess(contactModalUser, contactScopes)}
              >
                {t('talentContactRequest')}
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TalentSearchTab;

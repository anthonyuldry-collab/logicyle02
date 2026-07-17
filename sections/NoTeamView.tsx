import React, { useMemo, useState, useEffect } from 'react';
import { User, Team, TeamLevel, UserRole, SubscriptionPlanId } from '../types';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import { ALL_COUNTRIES } from '../constants';
import {
  SUBSCRIPTION_PLANS,
  formatPriceEur,
  getDefaultPlanForTeamLevel,
  getRecommendedPlansForTeamLevel,
} from '../constants/subscriptionPlans';
import {
  canRiderApplyToTeam,
  getMarketMismatchMessage,
  resolveRiderMarketSegmentFromUser,
  RIDER_SEGMENT_LABELS,
} from '../utils/riderTeamMarketSegment';

interface NoTeamViewProps {
  currentUser: User;
  teams: Team[];
  onJoinTeam: (teamId: string, joinRole: UserRole) => void;
  onCreateTeam: (teamData: {
    name: string;
    level: TeamLevel;
    country: string;
    planId?: SubscriptionPlanId;
  }) => void;
  onActivateIndependent: () => void;
  onLogout: () => void;
}

const getCountryName = (code: string): string =>
  ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code;

const NoTeamView: React.FC<NoTeamViewProps> = ({
  currentUser,
  teams,
  onJoinTeam,
  onCreateTeam,
  onActivateIndependent,
  onLogout,
}) => {
  const isManager = currentUser.userRole === UserRole.MANAGER;
  const isStaff = currentUser.userRole === UserRole.STAFF;
  const isAthlete = currentUser.userRole === UserRole.COUREUR;
  const joinRole = isStaff ? UserRole.STAFF : UserRole.COUREUR;

  const riderSegment = useMemo(
    () => (isAthlete ? resolveRiderMarketSegmentFromUser(currentUser) : null),
    [currentUser, isAthlete],
  );

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLevel, setNewTeamLevel] = useState<TeamLevel>(TeamLevel.HORS_DN);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>(
    getDefaultPlanForTeamLevel(TeamLevel.HORS_DN)
  );
  const [newTeamCountry, setNewTeamCountry] = useState('FR');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t, language } = useTranslations();

  const recommendedPlans = useMemo(
    () => getRecommendedPlansForTeamLevel(newTeamLevel),
    [newTeamLevel]
  );

  const visiblePlans = useMemo(
    () => SUBSCRIPTION_PLANS.filter((p) => !p.contactSales || newTeamLevel === TeamLevel.FEDERATION),
    [newTeamLevel]
  );

  useEffect(() => {
    const defaultPlan = getDefaultPlanForTeamLevel(newTeamLevel);
    setSelectedPlanId(recommendedPlans.includes(defaultPlan) ? defaultPlan : recommendedPlans[0] ?? defaultPlan);
  }, [newTeamLevel, recommendedPlans]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return teams.filter((team) => {
      const matchesSearch =
        !query ||
        team.name.toLowerCase().includes(query) ||
        getCountryName(team.country).toLowerCase().includes(query);
      const matchesCountry = !countryFilter || team.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [teams, searchQuery, countryFilter]);

  const teamEligibility = useMemo(() => {
    const map = new Map<string, { eligible: boolean; reason?: string }>();
    if (!isAthlete || !riderSegment) {
      filteredTeams.forEach((team) => map.set(team.id, { eligible: true }));
      return map;
    }
    filteredTeams.forEach((team) => {
      const eligible = canRiderApplyToTeam(riderSegment, team, team.operationalSettings);
      map.set(team.id, {
        eligible,
        reason: eligible ? undefined : getMarketMismatchMessage(riderSegment, team),
      });
    });
    return map;
  }, [filteredTeams, isAthlete, riderSegment]);

  const eligibleTeams = useMemo(
    () => filteredTeams.filter((team) => teamEligibility.get(team.id)?.eligible !== false),
    [filteredTeams, teamEligibility],
  );

  useEffect(() => {
    if (selectedTeamId && !eligibleTeams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId('');
    }
  }, [eligibleTeams, selectedTeamId]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError(t('signupSelectTeamError'));
      return;
    }
    const selectedTeam = teams.find((team) => team.id === selectedTeamId);
    if (isAthlete && riderSegment && selectedTeam) {
      if (!canRiderApplyToTeam(riderSegment, selectedTeam, selectedTeam.operationalSettings)) {
        setError(getMarketMismatchMessage(riderSegment, selectedTeam));
        return;
      }
    }
    setError('');
    setIsSubmitting(true);
    try {
      onJoinTeam(selectedTeamId, joinRole);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setError(t('signupTeamNameError'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      onCreateTeam({
        name: newTeamName.trim(),
        level: newTeamLevel,
        country: newTeamCountry,
        planId: selectedPlanId,
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleIndependentSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      onActivateIndependent();
    } catch {
      setIsSubmitting(false);
    }
  };

  const pathTitle = isManager
    ? t('noTeamPathManager')
    : isStaff
      ? t('noTeamPathStaff')
      : t('noTeamPathAthlete');

  const pathDescription = isManager
    ? t('noTeamPathManagerDesc')
    : isStaff
      ? t('noTeamPathStaffDesc')
      : t('noTeamPathAthleteDesc');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        <div className="text-center space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
            {t('noTeamStep2')}
          </p>
          <h1 className="text-2xl font-bold text-slate-100">
            {t('noTeamWelcome')} {currentUser.firstName}
          </h1>
          <p className="text-slate-300">{t('noTeamMessage')}</p>
        </div>

        <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
          <p className="text-sm font-semibold text-slate-100">{pathTitle}</p>
          <p className="mt-1 text-sm text-slate-300">{pathDescription}</p>
        </div>

        {isManager ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <span>👑</span> {t('noTeamCreateAction')}
            </h3>
            <div>
              <label htmlFor="newTeamNameLobby" className="text-sm font-medium text-slate-300">
                {t('signupCreateNewTeamName')}
              </label>
              <input
                type="text"
                id="newTeamNameLobby"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
                className="input-field-sm w-full mt-1"
                placeholder={t('signupSearchTeamPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="newTeamLevelLobby" className="text-sm font-medium text-slate-300">
                  {t('signupCreateTeamLevel')}
                </label>
                <select
                  id="newTeamLevelLobby"
                  value={newTeamLevel}
                  onChange={(e) => setNewTeamLevel(e.target.value as TeamLevel)}
                  className="input-field-sm w-full mt-1"
                >
                  {Object.values(TeamLevel).map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="newTeamCountryLobby" className="text-sm font-medium text-slate-300">
                  {t('signupCreateTeamCountry')}
                </label>
                <select
                  id="newTeamCountryLobby"
                  value={newTeamCountry}
                  onChange={(e) => setNewTeamCountry(e.target.value)}
                  className="input-field-sm w-full mt-1"
                >
                  {ALL_COUNTRIES.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">{t('pricingSelectPlan')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visiblePlans.map((plan) => {
                  const isRec = recommendedPlans.includes(plan.id);
                  return (
                    <label
                      key={plan.id}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        selectedPlanId === plan.id
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlanId === plan.id}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="sr-only"
                      />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-100 text-sm">{plan.name[language]}</p>
                          <p className="text-xs text-slate-400">{plan.tagline[language]}</p>
                        </div>
                        {isRec && (
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                            {t('pricingRecommended')}
                          </span>
                        )}
                      </div>
                      {plan.monthlyPriceEur !== null && (
                        <p className="text-sm text-blue-300 mt-1">
                          {formatPriceEur(plan.monthlyPriceEur, language)}/{t('pricingMonth')}
                        </p>
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2">{t('billingTrialNote')}</p>
            </div>

            <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
              {t('noTeamCreateAction')}
            </ActionButton>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <span>{isStaff ? '👥' : '🚴'}</span>
              {isStaff ? t('noTeamJoinAsStaff') : t('noTeamJoinAsAthlete')}
            </h3>

            {isAthlete && riderSegment && (
              <div className="rounded-lg border border-slate-600 bg-slate-700/40 p-3 text-sm text-slate-300">
                Votre profil marché : <strong className="text-slate-100">{RIDER_SEGMENT_LABELS[riderSegment]}</strong>.
                Seules les équipes compatibles avec votre niveau sont sélectionnables.
              </div>
            )}

            <div>
              <label htmlFor="team-search" className="text-sm font-medium text-slate-300">
                {t('signupSearchTeam')}
              </label>
              <input
                id="team-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field-sm w-full mt-1"
                placeholder={t('signupSearchTeamPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="country-filter" className="text-sm font-medium text-slate-300">
                {t('signupCreateTeamCountry')}
              </label>
              <select
                id="country-filter"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="input-field-sm w-full mt-1"
              >
                <option value="">{t('all')}</option>
                {ALL_COUNTRIES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="team-select" className="text-sm font-medium text-slate-300">
                {t('signupSelectTeam')}
              </label>
              <select
                id="team-select"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="input-field-sm w-full mt-1"
                required
              >
                <option value="">{t('signupSelectTeamPlaceholder')}</option>
                {filteredTeams.map((team) => {
                  const eligibility = teamEligibility.get(team.id);
                  const isEligible = eligibility?.eligible !== false;
                  return (
                    <option key={team.id} value={team.id} disabled={!isEligible}>
                      {team.name} ({getCountryName(team.country)})
                      {!isEligible ? ' — incompatible' : ''}
                    </option>
                  );
                })}
              </select>
              {isAthlete && eligibleTeams.length === 0 && filteredTeams.length > 0 && (
                <p className="text-xs text-amber-300 mt-2">
                  Aucune équipe compatible avec votre niveau ({RIDER_SEGMENT_LABELS[riderSegment!]}).
                </p>
              )}
              {isAthlete && selectedTeamId && teamEligibility.get(selectedTeamId)?.reason && (
                <p className="text-xs text-red-300 mt-2">{teamEligibility.get(selectedTeamId)?.reason}</p>
              )}
            </div>

            <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
              {isStaff ? t('noTeamJoinAsStaff') : t('noTeamJoinAsAthlete')}
            </ActionButton>
          </form>
        )}

        {!isManager && (
          <div className="border-t border-slate-600 pt-4">
            <ActionButton
              onClick={handleIndependentSubmit}
              variant="secondary"
              className="w-full"
              disabled={isSubmitting}
            >
              {t('noTeamIndependentAction')}
            </ActionButton>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="text-center">
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-slate-400 hover:text-slate-200 underline"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoTeamView;

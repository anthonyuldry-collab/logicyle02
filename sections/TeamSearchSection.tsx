import React, { useMemo, useState } from 'react';
import {
  Team,
  TeamGender,
  TeamLevel,
  TeamMembership,
  TeamMembershipStatus,
  TeamRecruitmentOffer,
  User,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import UsersIcon from '../components/icons/UsersIcon';
import MapPinIcon from '../components/icons/MapPinIcon';
import { ALL_COUNTRIES } from '../constants';
import { useTranslations } from '../hooks/useTranslations';
import {
  canRiderApplyToTeam,
  getMarketMismatchMessage,
  resolveRiderMarketSegmentFromUser,
  RIDER_SEGMENT_LABELS,
  teamAcceptsRiderApplications,
} from '../utils/riderTeamMarketSegment';
import {
  buildDemoRecruitmentTeams,
  getDemoRecruitmentTeamExtra,
  isDemoRecruitmentTeam,
} from '../constants/demoRecruitmentTeams';
import { formatRecruitmentCriteriaSummary } from '../utils/recruitmentCampaignUtils';
import { getTeamGender, TEAM_GENDER_LABELS, teamMatchesGenderFilter } from '../utils/teamGenderUtils';

interface TeamSearchSectionProps {
  teams: Team[];
  teamMemberships: TeamMembership[];
  currentUser: User;
  currentTeamId?: string | null;
  openRecruitmentOffers?: import('../types').TeamRecruitmentOffer[];
  onApplyToTeam: (teamId: string) => Promise<void>;
}

type PortalTab = 'search' | 'applications';

const getCountryName = (code: string): string =>
  ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code;

const TeamCard: React.FC<{
  team: Team;
  canApply: boolean;
  mismatchReason?: string;
  applicationStatus?: TeamMembershipStatus | string;
  onApply: () => void;
  onDetails: () => void;
  isApplying: boolean;
  isDemo?: boolean;
  pitch?: string;
  recruitingLabel?: string;
}> = ({
  team,
  canApply,
  mismatchReason,
  applicationStatus,
  onApply,
  onDetails,
  isApplying,
  isDemo = false,
  pitch,
  recruitingLabel,
}) => {
  const hasApplied = applicationStatus === TeamMembershipStatus.PENDING;
  const isMember = applicationStatus === TeamMembershipStatus.ACTIVE;

  return (
    <div
      className={`bg-slate-800 rounded-lg border flex flex-col overflow-hidden transition-transform hover:scale-[1.01] ${
        isDemo ? 'border-violet-500/40 border-l-2 border-l-violet-500' : 'border-slate-600'
      }`}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase text-blue-400">{team.level}</p>
          <span className="text-[10px] font-medium text-slate-300 bg-slate-700/80 px-1.5 py-0.5 rounded">
            {TEAM_GENDER_LABELS[getTeamGender(team)].fr}
          </span>
          {isDemo && (
            <span className="text-[10px] font-medium text-violet-300 bg-violet-900/40 px-1.5 py-0.5 rounded">
              Exemple
            </span>
          )}
          {recruitingLabel && (
            <span className="text-[10px] font-medium text-emerald-300 bg-emerald-900/30 px-1.5 py-0.5 rounded">
              {recruitingLabel}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-100 mt-1">{team.name}</h3>
        <p className="text-sm text-slate-400">{getCountryName(team.country)}</p>
      </div>
      <div className="px-4 pb-4 space-y-2 text-sm flex-grow">
        <p className="flex items-center text-slate-300">
          <MapPinIcon className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
          {getCountryName(team.country)}
        </p>
        {pitch && <p className="text-xs text-slate-400 leading-relaxed">{pitch}</p>}
        {team.teamKind && team.teamKind !== 'standard' && (
          <p className="text-xs text-slate-400 capitalize">{team.teamKind}</p>
        )}
        {!canApply && mismatchReason && (
          <p className="text-xs text-amber-300 leading-relaxed">{mismatchReason}</p>
        )}
      </div>
      <div className="p-3 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-2">
        <ActionButton onClick={onDetails} variant="secondary" size="sm">
          Détails
        </ActionButton>
        <ActionButton
          onClick={onApply}
          variant="primary"
          size="sm"
          disabled={!canApply || hasApplied || isMember || isApplying}
        >
          {isMember ? 'Membre' : hasApplied ? 'Candidaté' : isApplying ? 'Envoi…' : 'Candidater'}
        </ActionButton>
      </div>
    </div>
  );
};

const TeamSearchSection: React.FC<TeamSearchSectionProps> = ({
  teams,
  teamMemberships,
  currentUser,
  currentTeamId,
  openRecruitmentOffers = [],
  onApplyToTeam,
}) => {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<PortalTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<TeamLevel | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<TeamGender | 'all'>('all');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [applyingTeamId, setApplyingTeamId] = useState<string | null>(null);
  const [demoAppliedTeamIds, setDemoAppliedTeamIds] = useState<Set<string>>(new Set());

  const riderSegment = useMemo(
    () => resolveRiderMarketSegmentFromUser(currentUser),
    [currentUser],
  );

  const myMemberships = useMemo(
    () => teamMemberships.filter((m) => m.userId === currentUser.id),
    [teamMemberships, currentUser.id],
  );

  const membershipByTeamId = useMemo(() => {
    const map = new Map<string, TeamMembership>();
    myMemberships.forEach((m) => map.set(m.teamId, m));
    return map;
  }, [myMemberships]);

  const activeTeamIds = useMemo(
    () =>
      new Set(
        myMemberships
          .filter((m) => m.status === TeamMembershipStatus.ACTIVE)
          .map((m) => m.teamId),
      ),
    [myMemberships],
  );

  const recruitingTeams = useMemo(() => {
    const real = teams.filter((team) => {
      if (!team.name?.trim()) return false;
      if (isDemoRecruitmentTeam(team.id)) return false;
      if (currentTeamId && team.id === currentTeamId) return false;
      if (activeTeamIds.has(team.id)) return false;
      return teamAcceptsRiderApplications(team, team.operationalSettings);
    });
    const demo = buildDemoRecruitmentTeams();
    const realIds = new Set(real.map((t) => t.id));
    return [...real, ...demo.filter((d) => !realIds.has(d.id))];
  }, [teams, currentTeamId, activeTeamIds]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return recruitingTeams.filter((team) => {
      const matchesSearch =
        !query ||
        team.name.toLowerCase().includes(query) ||
        getCountryName(team.country).toLowerCase().includes(query);
      const matchesCountry = !countryFilter || team.country === countryFilter;
      const matchesLevel = levelFilter === 'all' || team.level === levelFilter;
      const matchesGender = teamMatchesGenderFilter(team, genderFilter);
      return matchesSearch && matchesCountry && matchesLevel && matchesGender;
    });
  }, [recruitingTeams, searchQuery, countryFilter, levelFilter, genderFilter]);

  const pendingApplications = useMemo(() => {
    const real = myMemberships
      .filter((m) => m.status === TeamMembershipStatus.PENDING)
      .sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? ''));
    const demoPending: TeamMembership[] = [...demoAppliedTeamIds].map((teamId) => {
      const team =
        recruitingTeams.find((t) => t.id === teamId) ?? buildDemoRecruitmentTeams().find((t) => t.id === teamId);
      return {
        id: `demo_app_${teamId}`,
        email: currentUser.email,
        userId: currentUser.id,
        teamId,
        teamName: team?.name,
        status: TeamMembershipStatus.PENDING,
        requestedAt: new Date().toISOString(),
        source: 'demo_apply',
      };
    });
    return [...real, ...demoPending];
  }, [myMemberships, demoAppliedTeamIds, recruitingTeams, currentUser.email, currentUser.id]);

  const getApplicationStatus = (teamId: string) => {
    if (demoAppliedTeamIds.has(teamId)) return TeamMembershipStatus.PENDING;
    return membershipByTeamId.get(teamId)?.status;
  };

  const getTeamEligibility = (team: Team) => {
    const canApply = canRiderApplyToTeam(riderSegment, team, team.operationalSettings);
    return {
      canApply,
      reason: canApply ? undefined : getMarketMismatchMessage(riderSegment, team),
    };
  };

  const visibleOffers = useMemo(() => {
    return (openRecruitmentOffers ?? []).filter((offer) => {
      const team = teams.find((t) => t.id === offer.teamId);
      if (!team) return false;
      if (currentTeamId && team.id === currentTeamId) return false;
      if (!teamAcceptsRiderApplications(team, team.operationalSettings)) return false;
      return true;
    });
  }, [openRecruitmentOffers, teams, currentTeamId]);

  const handleApply = async (team: Team) => {
    const { canApply, reason } = getTeamEligibility(team);
    if (!canApply) {
      alert(reason);
      return;
    }
    setApplyingTeamId(team.id);
    try {
      if (isDemoRecruitmentTeam(team.id)) {
        setDemoAppliedTeamIds((prev) => new Set(prev).add(team.id));
        alert(`Candidature exemple envoyée à ${team.name} (simulation locale).`);
        setSelectedTeam(null);
        return;
      }
      await onApplyToTeam(team.id);
      alert(`Candidature envoyée à ${team.name}. L'équipe examinera votre demande.`);
      setSelectedTeam(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Impossible d\'envoyer la candidature.';
      alert(message);
    } finally {
      setApplyingTeamId(null);
    }
  };

  if (!currentUser?.id) {
    return (
      <SectionWrapper title={t('teamSearchTitle')}>
        <div className="text-center p-8 bg-slate-800 rounded-lg border border-slate-600">
          <p className="text-slate-300">Chargement du profil…</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title={t('teamSearchTitle')}>
      <p className="mb-4 text-sm text-slate-400">{t('teamSearchSubtitle')}</p>

      {currentTeamId && (
        <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-900/20 p-3 text-sm text-blue-100">
          Vous êtes actuellement rattaché à une équipe. Vous pouvez explorer d&apos;autres structures
          et envoyer des candidatures de transfert.
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-blue-500 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('teamSearchTabBrowse')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'applications'
              ? 'border-blue-500 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('teamSearchTabApplications')}
          {pendingApplications.length > 0 && (
            <span className="ml-2 text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
              {pendingApplications.length}
            </span>
          )}
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-slate-600 bg-slate-800/60 p-3 text-sm text-slate-300">
        Votre profil : <strong className="text-slate-100">{RIDER_SEGMENT_LABELS[riderSegment]}</strong>
      </div>

      {activeTab === 'search' ? (
        <>
          {visibleOffers.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">Offres de recrutement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleOffers.map((offer) => {
                  const team = teams.find((t) => t.id === offer.teamId)!;
                  const { canApply } = getTeamEligibility(team);
                  return (
                    <div
                      key={offer.id}
                      className="rounded-lg border border-emerald-600/40 bg-emerald-900/10 p-4 space-y-2"
                    >
                      <p className="text-xs text-emerald-400 uppercase font-semibold">Offre</p>
                      <p className="font-semibold text-slate-100">{offer.title}</p>
                      <p className="text-xs text-slate-400">{team.name}</p>
                      <p className="text-sm text-slate-300">{offer.description}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatRecruitmentCriteriaSummary(offer.criteria)}
                      </p>
                      <ActionButton
                        size="sm"
                        disabled={!canApply}
                        onClick={() => handleApply(team)}
                      >
                        Candidater
                      </ActionButton>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label htmlFor="team-search-query" className="block text-sm font-medium text-slate-300">
                  {t('signupSearchTeam')}
                </label>
                <input
                  id="team-search-query"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field-sm w-full mt-1"
                  placeholder={t('signupSearchTeamPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="team-country-filter" className="block text-sm font-medium text-slate-300">
                  {t('signupCreateTeamCountry')}
                </label>
                <select
                  id="team-country-filter"
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
                <label htmlFor="team-level-filter" className="block text-sm font-medium text-slate-300">
                  Niveau équipe
                </label>
                <select
                  id="team-level-filter"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as TeamLevel | 'all')}
                  className="input-field-sm w-full mt-1"
                >
                  <option value="all">Tous les niveaux</option>
                  {Object.values(TeamLevel).map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="team-gender-filter" className="block text-sm font-medium text-slate-300">
                  {t('teamSearchGenderFilter')}
                </label>
                <select
                  id="team-gender-filter"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as TeamGender | 'all')}
                  className="input-field-sm w-full mt-1"
                >
                  <option value="all">{t('teamSearchGenderAll')}</option>
                  <option value="men">{t('teamSearchGenderMen')}</option>
                  <option value="women">{t('teamSearchGenderWomen')}</option>
                </select>
              </div>
            </div>
          </div>

          <p className="mb-4 text-xs text-slate-400">
            {filteredTeams.filter((t) => !isDemoRecruitmentTeam(t.id)).length} équipe(s) réelle(s)
            {filteredTeams.some((t) => isDemoRecruitmentTeam(t.id)) &&
              ` · ${filteredTeams.filter((t) => isDemoRecruitmentTeam(t.id)).length} exemple(s)`}
          </p>

          {filteredTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map((team) => {
                const extra = getDemoRecruitmentTeamExtra(team.id);
                const { canApply, reason } = getTeamEligibility(team);
                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    canApply={canApply}
                    mismatchReason={reason}
                    applicationStatus={getApplicationStatus(team.id)}
                    onApply={() => handleApply(team)}
                    onDetails={() => setSelectedTeam(team)}
                    isApplying={applyingTeamId === team.id}
                    isDemo={isDemoRecruitmentTeam(team.id)}
                    pitch={extra?.pitch}
                    recruitingLabel={extra?.recruitingLabel}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-600">
              <UsersIcon className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-2 text-sm font-medium text-slate-200">Aucune équipe trouvée</h3>
              <p className="mt-1 text-sm text-slate-400">
                Ajustez vos filtres ou revenez plus tard — seules les équipes ouvertes aux candidatures sont listées.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {pendingApplications.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-600">
              <p className="text-slate-300">Aucune candidature en cours.</p>
              <ActionButton className="mt-4" onClick={() => setActiveTab('search')}>
                {t('teamSearchTabBrowse')}
              </ActionButton>
            </div>
          ) : (
            pendingApplications.map((membership) => {
              const team =
                recruitingTeams.find((t) => t.id === membership.teamId) ??
                teams.find((t) => t.id === membership.teamId);
              const isDemo = isDemoRecruitmentTeam(membership.teamId);
              return (
                <div
                  key={membership.id}
                  className={`rounded-lg border bg-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 ${
                    isDemo ? 'border-violet-500/40' : 'border-slate-600'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-100">
                      {team?.name ?? membership.teamName ?? 'Équipe'}
                      {isDemo && (
                        <span className="ml-2 text-[10px] font-medium text-violet-300">Exemple</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-400">
                      Envoyée le{' '}
                      {membership.requestedAt
                        ? new Date(membership.requestedAt).toLocaleDateString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-300 bg-amber-900/40 px-2 py-1 rounded">
                    {membership.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedTeam && (
        <Modal
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          title={selectedTeam.name}
        >
          <div className="space-y-3 text-sm">
            <p>
              <strong>Niveau :</strong> {selectedTeam.level}
            </p>
            <p>
              <strong>Sexe :</strong> {TEAM_GENDER_LABELS[getTeamGender(selectedTeam)].fr}
            </p>
            <p>
              <strong>Pays :</strong> {getCountryName(selectedTeam.country)}
            </p>
            {selectedTeam.teamKind && (
              <p>
                <strong>Type :</strong> {selectedTeam.teamKind}
              </p>
            )}
            {getDemoRecruitmentTeamExtra(selectedTeam.id)?.pitch && (
              <p className="text-gray-600 whitespace-pre-wrap">
                {getDemoRecruitmentTeamExtra(selectedTeam.id)?.pitch}
              </p>
            )}
            {(() => {
              const { canApply, reason } = getTeamEligibility(selectedTeam);
              return (
                <>
                  {!canApply && reason && (
                    <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{reason}</p>
                  )}
                  <div className="pt-3 flex justify-end">
                    <ActionButton
                      onClick={() => handleApply(selectedTeam)}
                      disabled={
                        !canApply ||
                        getApplicationStatus(selectedTeam.id) === TeamMembershipStatus.PENDING ||
                        applyingTeamId === selectedTeam.id
                      }
                    >
                      {getApplicationStatus(selectedTeam.id) === TeamMembershipStatus.PENDING
                        ? 'Candidaté'
                        : 'Candidater'}
                    </ActionButton>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </SectionWrapper>
  );
};

export default TeamSearchSection;

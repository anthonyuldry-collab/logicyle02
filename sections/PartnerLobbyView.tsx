import React, { useMemo, useState } from 'react';
import {
  User,
  PartnerMarketplaceProfile,
  TeamSponsorshipNeed,
  PartnershipMatchRequest,
} from '../types';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import {
  PARTNERSHIP_MARKETPLACE,
  formatPartnershipFeeLabel,
  computePartnershipCommissionEur,
} from '../constants/partnershipMarketplace';
import {
  buildDefaultPartnerProfile,
  formatBudgetRange,
  getMatchRequestsForPartner,
  getOpenSponsorshipNeeds,
  getPartnerProfileForUser,
  hasPendingMatchForNeed,
} from '../utils/partnershipMarketplaceUtils';
import { isDemoSponsorshipNeed } from '../constants/demoPartnershipMarketplace';

interface PartnerLobbyViewProps {
  currentUser: User;
  partnerProfiles: PartnerMarketplaceProfile[];
  sponsorshipNeeds: TeamSponsorshipNeed[];
  matchRequests: PartnershipMatchRequest[];
  onSaveProfile: (profile: PartnerMarketplaceProfile) => Promise<void>;
  onSubmitMatchRequest: (request: Omit<PartnershipMatchRequest, 'id' | 'createdAt'>) => Promise<void>;
  onLogout: () => void;
}

const PartnerLobbyView: React.FC<PartnerLobbyViewProps> = ({
  currentUser,
  partnerProfiles,
  sponsorshipNeeds,
  matchRequests,
  onSaveProfile,
  onSubmitMatchRequest,
  onLogout,
}) => {
  const { t, language } = useTranslations();
  const existingProfile = getPartnerProfileForUser(partnerProfiles, currentUser.id);
  const [profile, setProfile] = useState<PartnerMarketplaceProfile>(
    existingProfile ?? buildDefaultPartnerProfile(currentUser),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [submittingNeedId, setSubmittingNeedId] = useState<string | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState('');

  const openNeeds = useMemo(
    () => getOpenSponsorshipNeeds(sponsorshipNeeds),
    [sponsorshipNeeds],
  );
  const myRequests = useMemo(
    () => getMatchRequestsForPartner(matchRequests, currentUser.id),
    [matchRequests, currentUser.id],
  );

  const handleSaveProfile = async () => {
    if (!profile.companyName.trim()) {
      setError(t('partnerLobbyCompanyRequired'));
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await onSaveProfile({
        ...profile,
        updatedAt: new Date().toISOString(),
      });
      setFeedback(t('partnerLobbyProfileSaved'));
    } catch {
      setError(t('partnerLobbySaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpressInterest = async (need: TeamSponsorshipNeed) => {
    if (!profile.isVisible) {
      setError(t('partnerLobbyVisibilityRequired'));
      return;
    }
    if (hasPendingMatchForNeed(matchRequests, currentUser.id, need.teamId, need.id)) {
      setFeedback(t('partnerLobbyAlreadyRequested'));
      return;
    }
    setSubmittingNeedId(need.id);
    setError('');
    try {
      await onSubmitMatchRequest({
        partnerUserId: currentUser.id,
        partnerProfileId: profile.id,
        teamId: need.teamId,
        needId: isDemoSponsorshipNeed(need.id) ? undefined : need.id,
        status: 'pending',
        message: interestMessage.trim() || undefined,
        proposedBudgetEur: profile.budgetMaxEur,
        platformFeePercent: PARTNERSHIP_MARKETPLACE.standardTakeRatePercent,
      });
      setFeedback(t('partnerLobbyInterestSent'));
      setInterestMessage('');
    } catch {
      setError(t('partnerLobbyInterestError'));
    } finally {
      setSubmittingNeedId(null);
    }
  };

  const exampleCommission = computePartnershipCommissionEur(30000);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
            {t('partnerLobbyStep')}
          </p>
          <h1 className="text-2xl font-bold text-slate-100">
            {t('partnerLobbyWelcome')} {currentUser.firstName}
          </h1>
          <p className="text-slate-300">{t('partnerLobbyAwaitingInvite')}</p>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-5">
          <p className="text-sm font-semibold text-amber-200">{t('partnerLobbyStatusTitle')}</p>
          <p className="mt-2 text-sm text-amber-100/90">{t('partnerLobbyStatusDesc')}</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{t('partnerLobbyProfileTitle')}</h2>
            <p className="text-sm text-slate-400 mt-1">{t('partnerLobbyProfileDesc')}</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.isVisible}
              onChange={(e) => setProfile({ ...profile, isVisible: e.target.checked })}
              className="rounded border-slate-500"
            />
            <span className="text-sm text-slate-200">{t('partnerLobbyVisibleLabel')}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">{t('partnerLobbyCompanyName')}</label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className="input-field-sm w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">{t('partnerLobbySector')}</label>
              <input
                type="text"
                value={profile.sector ?? ''}
                onChange={(e) => setProfile({ ...profile, sector: e.target.value })}
                className="input-field-sm w-full mt-1"
                placeholder={t('partnerLobbySectorPlaceholder')}
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">{t('partnerLobbyBudgetMin')}</label>
              <input
                type="number"
                min={0}
                value={profile.budgetMinEur ?? ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    budgetMinEur: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="input-field-sm w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">{t('partnerLobbyBudgetMax')}</label>
              <input
                type="number"
                min={0}
                value={profile.budgetMaxEur ?? ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    budgetMaxEur: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="input-field-sm w-full mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300">{t('partnerLobbyObjectives')}</label>
            <textarea
              value={profile.objectives ?? ''}
              onChange={(e) => setProfile({ ...profile, objectives: e.target.value })}
              rows={3}
              className="input-field-sm w-full mt-1"
              placeholder={t('partnerLobbyObjectivesPlaceholder')}
            />
          </div>

          <ActionButton onClick={handleSaveProfile} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? t('saving') : t('partnerLobbySaveProfile')}
          </ActionButton>
        </div>

        <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/20 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-emerald-100">{t('partnerLobbyMarketplaceTitle')}</h2>
          <p className="text-sm text-emerald-200/80">{t('partnerLobbyMarketplaceDesc')}</p>
          <p className="text-xs text-emerald-300/70">{formatPartnershipFeeLabel(language)}</p>
          <p className="text-xs text-emerald-300/60">
            {t('partnerLobbyCommissionExample').replace('{amount}', exampleCommission.toLocaleString(language))}
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">{t('partnerLobbyTeamsTitle')}</h2>
          {openNeeds.length === 0 ? (
            <p className="text-sm text-slate-400">{t('partnerLobbyNoTeams')}</p>
          ) : (
            openNeeds.map((need) => {
              const isDemo = isDemoSponsorshipNeed(need.id);
              const alreadyRequested = hasPendingMatchForNeed(
                matchRequests,
                currentUser.id,
                need.teamId,
                need.id,
              );
              return (
                <div
                  key={need.id}
                  className="rounded-xl border border-slate-600 bg-slate-800 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100">{need.title}</p>
                      <p className="text-sm text-slate-400">{need.teamName}</p>
                    </div>
                    {isDemo && (
                      <span className="text-[10px] uppercase tracking-wide bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {t('partnerLobbyDemoBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{need.description}</p>
                  <p className="text-sm text-emerald-400">
                    {formatBudgetRange(need.budgetMinEur, need.budgetMaxEur, language)}
                  </p>
                  {need.objectives && (
                    <p className="text-xs text-slate-500">{need.objectives}</p>
                  )}
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    disabled={!profile.isVisible || alreadyRequested || submittingNeedId === need.id}
                    onClick={() => handleExpressInterest(need)}
                  >
                    {alreadyRequested
                      ? t('partnerLobbyInterestPending')
                      : submittingNeedId === need.id
                        ? '…'
                        : t('partnerLobbyExpressInterest')}
                  </ActionButton>
                </div>
              );
            })
          )}
        </div>

        {myRequests.length > 0 && (
          <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-100">{t('partnerLobbyMyRequests')}</h2>
            <ul className="space-y-2">
              {myRequests.map((req) => {
                const teamLabel =
                  openNeeds.find((n) => n.teamId === req.teamId)?.teamName
                  || sponsorshipNeeds.find((n) => n.teamId === req.teamId)?.teamName
                  || req.teamId;
                return (
                  <li key={req.id} className="text-sm text-slate-300 flex justify-between gap-2">
                    <span>{teamLabel}</span>
                    <span className="text-slate-400 capitalize">{req.status}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(feedback || error) && (
          <p className={`text-sm text-center ${error ? 'text-red-400' : 'text-emerald-400'}`}>
            {error || feedback}
          </p>
        )}

        <div className="text-center pt-2">
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

export default PartnerLobbyView;

import React, { useMemo, useState } from 'react';
import {
  PartnerMarketplaceProfile,
  PartnershipMatchRequest,
  TeamSponsorshipNeed,
  User,
} from '../types';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import {
  PARTNERSHIP_MARKETPLACE,
  formatPartnershipFeeLabel,
  computePartnershipCommissionEur,
} from '../constants/partnershipMarketplace';
import {
  formatBudgetRange,
  getMatchRequestsForTeam,
  getSponsorshipNeedsForTeam,
  getVisiblePartnerProfiles,
} from '../utils/partnershipMarketplaceUtils';

interface TeamSponsorshipMarketplacePanelProps {
  teamId: string;
  teamName: string;
  currentUserId?: string;
  canEdit: boolean;
  sponsorshipNeeds: TeamSponsorshipNeed[];
  partnerProfiles: PartnerMarketplaceProfile[];
  matchRequests: PartnershipMatchRequest[];
  users?: User[];
  onSaveNeed: (need: TeamSponsorshipNeed) => Promise<void>;
  onRespondMatchRequest: (
    requestId: string,
    status: 'accepted' | 'declined' | 'contracted',
    contractedAmountEur?: number,
  ) => Promise<void>;
}

const TeamSponsorshipMarketplacePanel: React.FC<TeamSponsorshipMarketplacePanelProps> = ({
  teamId,
  teamName,
  currentUserId,
  canEdit,
  sponsorshipNeeds,
  partnerProfiles,
  matchRequests,
  users = [],
  onSaveNeed,
  onRespondMatchRequest,
}) => {
  const { t, language } = useTranslations();
  const teamNeeds = useMemo(
    () => getSponsorshipNeedsForTeam(sponsorshipNeeds, teamId),
    [sponsorshipNeeds, teamId],
  );
  const teamRequests = useMemo(
    () => getMatchRequestsForTeam(matchRequests, teamId),
    [matchRequests, teamId],
  );
  const visibleProfiles = useMemo(
    () => getVisiblePartnerProfiles(partnerProfiles),
    [partnerProfiles],
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [objectives, setObjectives] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePublishNeed = async () => {
    if (!title.trim() || !description.trim()) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      await onSaveNeed({
        id: `tsn-${teamId}-${Date.now()}`,
        teamId,
        teamName,
        title: title.trim(),
        description: description.trim(),
        budgetMinEur: budgetMin ? Number(budgetMin) : undefined,
        budgetMaxEur: budgetMax ? Number(budgetMax) : undefined,
        objectives: objectives.trim() || undefined,
        isOpen: true,
        createdAt: now,
        createdByUserId: currentUserId,
      });
      setTitle('');
      setDescription('');
      setBudgetMin('');
      setBudgetMax('');
      setObjectives('');
      setFeedback(t('teamMarketplaceNeedPublished'));
    } finally {
      setIsSaving(false);
    }
  };

  const getProfileLabel = (profileId: string) => {
    const profile = partnerProfiles.find((p) => p.id === profileId);
    if (profile) return profile.companyName;
    return profileId;
  };

  const pendingRequests = teamRequests.filter((r) => r.status === 'pending');

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 space-y-5">
      <div>
        <h4 className="text-base font-semibold text-violet-950">{t('teamMarketplaceTitle')}</h4>
        <p className="text-sm text-violet-800 mt-1">{t('teamMarketplaceDesc')}</p>
        <p className="text-xs text-violet-700 mt-2">{formatPartnershipFeeLabel(language)}</p>
      </div>

      {canEdit && (
        <div className="rounded-md border border-violet-200 bg-white/80 p-4 space-y-3">
          <p className="text-sm font-medium text-violet-950">{t('teamMarketplacePublishTitle')}</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('teamMarketplaceNeedTitlePlaceholder')}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('teamMarketplaceNeedDescPlaceholder')}
            rows={3}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder={t('partnerLobbyBudgetMin')}
              className="rounded-md border border-violet-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder={t('partnerLobbyBudgetMax')}
              className="rounded-md border border-violet-200 px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            placeholder={t('partnerLobbyObjectivesPlaceholder')}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
          />
          <ActionButton size="sm" onClick={handlePublishNeed} disabled={isSaving || !title.trim()}>
            {isSaving ? '…' : t('teamMarketplacePublishAction')}
          </ActionButton>
        </div>
      )}

      {teamNeeds.length > 0 && (
        <div>
          <p className="text-sm font-medium text-violet-950 mb-2">{t('teamMarketplaceYourNeeds')}</p>
          <ul className="space-y-2">
            {teamNeeds.map((need) => (
              <li key={need.id} className="text-sm bg-white/70 rounded-md p-3 border border-violet-100">
                <p className="font-medium text-violet-950">{need.title}</p>
                <p className="text-violet-700 text-xs mt-1">
                  {formatBudgetRange(need.budgetMinEur, need.budgetMaxEur, language)}
                  {need.isOpen ? '' : ` — ${t('teamMarketplaceClosed')}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div>
          <p className="text-sm font-medium text-violet-950 mb-2">{t('teamMarketplaceIncoming')}</p>
          <ul className="space-y-3">
            {pendingRequests.map((req) => {
              const profile = partnerProfiles.find((p) => p.id === req.partnerProfileId);
              const commission = computePartnershipCommissionEur(
                req.proposedBudgetEur ?? profile?.budgetMaxEur ?? 20000,
              );
              return (
                <li key={req.id} className="bg-white/80 rounded-md p-3 border border-violet-200 space-y-2">
                  <p className="font-medium text-violet-950">{getProfileLabel(req.partnerProfileId)}</p>
                  {profile?.sector && (
                    <p className="text-xs text-violet-700">{profile.sector}</p>
                  )}
                  {req.message && <p className="text-sm text-violet-800">{req.message}</p>}
                  <p className="text-xs text-violet-600">
                    {t('teamMarketplaceCommissionHint').replace('{fee}', commission.toLocaleString(language))}
                    {' '}
                    ({PARTNERSHIP_MARKETPLACE.standardTakeRatePercent} %)
                  </p>
                  {canEdit && (
                    <div className="flex gap-2">
                      <ActionButton
                        size="sm"
                        onClick={() => onRespondMatchRequest(req.id, 'accepted')}
                      >
                        {t('teamMarketplaceAccept')}
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        variant="secondary"
                        onClick={() => onRespondMatchRequest(req.id, 'declined')}
                      >
                        {t('teamMarketplaceDecline')}
                      </ActionButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {visibleProfiles.length > 0 && (
        <div>
          <p className="text-sm font-medium text-violet-950 mb-2">{t('teamMarketplaceBrowsePartners')}</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {visibleProfiles.slice(0, 8).map((profile) => (
              <li key={profile.id} className="text-sm bg-white/60 rounded p-2 border border-violet-100">
                <span className="font-medium text-violet-950">{profile.companyName}</span>
                {profile.sector && (
                  <span className="text-violet-600 ml-2">— {profile.sector}</span>
                )}
                <span className="block text-xs text-violet-600 mt-0.5">
                  {formatBudgetRange(profile.budgetMinEur, profile.budgetMaxEur, language)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback && <p className="text-sm text-violet-900">{feedback}</p>}
    </div>
  );
};

export default TeamSponsorshipMarketplacePanel;

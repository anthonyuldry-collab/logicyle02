import React, { useMemo, useState } from 'react';
import {
  AppState,
  PeerRating,
  RaceEvent,
  RiderEventSelection,
  RiderSelfDebrief,
  User,
} from '../../types';
import EventTabHeader from '../../components/eventDetail/EventTabHeader';
import ActionButton from '../../components/ActionButton';
import ContributionRatingPicker from '../../components/eventDetail/ContributionRatingPicker';
import PeerReviewTab from './PeerReviewTab';
import { useTranslations } from '../../hooks/useTranslations';
import { getRiderProfileForUser, isRiderAbsentFromEvent } from '../../utils/eventRiderUtils';
import {
  buildRiderSelfDebriefId,
  getRiderSelfDebriefForEvent,
  isEventDebriefWindowOpen,
  isEventEndedForDebrief,
} from '../../utils/riderDebriefUtils';
import {
  getPerformanceRatingCriteria,
} from '../../utils/contributionRatingUtils';

interface RiderEventDebriefTabProps {
  event: RaceEvent;
  appState: AppState;
  currentUser: User;
  riderEventSelections: RiderEventSelection[];
  setPeerRatings: React.Dispatch<React.SetStateAction<PeerRating[]>>;
  onSaveRiderSelfDebrief: (debrief: RiderSelfDebrief) => Promise<void>;
}

const RiderEventDebriefTab: React.FC<RiderEventDebriefTabProps> = ({
  event,
  appState,
  currentUser,
  riderEventSelections,
  setPeerRatings,
  onSaveRiderSelfDebrief,
}) => {
  const { t } = useTranslations();
  const riderProfile = useMemo(
    () => getRiderProfileForUser(appState.riders, currentUser),
    [appState.riders, currentUser],
  );

  const existing = useMemo(
    () =>
      riderProfile
        ? getRiderSelfDebriefForEvent(appState.riderSelfDebriefs ?? [], event.id, riderProfile.id)
        : undefined,
    [appState.riderSelfDebriefs, event.id, riderProfile],
  );

  const [personalRanking, setPersonalRanking] = useState(existing?.personalRanking ?? '');
  const [selfSummary, setSelfSummary] = useState(existing?.selfSummary ?? '');
  const [selfHighlights, setSelfHighlights] = useState(existing?.selfHighlights ?? '');
  const [selfImprovements, setSelfImprovements] = useState(existing?.selfImprovements ?? '');
  const [selfPhysicalFeel, setSelfPhysicalFeel] = useState<number | undefined>(existing?.selfPhysicalFeel);
  const [selfTechnicalFeel, setSelfTechnicalFeel] = useState<number | undefined>(existing?.selfTechnicalFeel);
  const [didNotStart, setDidNotStart] = useState(existing?.didNotStart ?? false);
  const [didNotFinish, setDidNotFinish] = useState(existing?.didNotFinish ?? false);
  const [crashed, setCrashed] = useState(existing?.crashed ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!riderProfile) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
        {t('riderDebriefNoProfile')}
      </div>
    );
  }

  if (isRiderAbsentFromEvent(riderProfile.id, event.id, riderEventSelections)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-amber-900">{t('riderDebriefAbsent')}</p>
      </div>
    );
  }

  if (!isEventDebriefWindowOpen(event)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
        {isEventEndedForDebrief(event)
          ? t('riderDebriefWindowClosed')
          : t('riderDebriefNotYetAvailable')}
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const debrief: RiderSelfDebrief = {
        id: existing?.id ?? buildRiderSelfDebriefId(event.id, riderProfile.id),
        eventId: event.id,
        riderId: riderProfile.id,
        userId: currentUser.id,
        personalRanking: personalRanking.trim() || undefined,
        selfSummary: selfSummary.trim() || undefined,
        selfHighlights: selfHighlights.trim() || undefined,
        selfImprovements: selfImprovements.trim() || undefined,
        selfPhysicalFeel,
        selfTechnicalFeel,
        didNotStart,
        didNotFinish,
        crashed,
        submittedAt: new Date().toISOString(),
      };
      await onSaveRiderSelfDebrief(debrief);
      setSaved(true);
    } catch {
      setError(t('riderDebriefSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-6">
      <EventTabHeader
        title={t('riderDebriefTitle')}
        subtitle={t('riderDebriefSubtitle')}
      />

      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-blue-950">{t('riderDebriefSelfSection')}</h4>
        <p className="text-xs text-blue-800">{t('riderDebriefSelfHint')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600">{t('riderDebriefRanking')}</label>
            <input
              type="text"
              value={personalRanking}
              onChange={(e) => setPersonalRanking(e.target.value)}
              placeholder={t('riderDebriefRankingPlaceholder')}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4 pb-1">
            <label className="inline-flex items-center text-sm">
              <input type="checkbox" checked={didNotStart} onChange={(e) => setDidNotStart(e.target.checked)} className="rounded border-gray-300" />
              <span className="ml-2">DNS</span>
            </label>
            <label className="inline-flex items-center text-sm">
              <input type="checkbox" checked={didNotFinish} onChange={(e) => setDidNotFinish(e.target.checked)} className="rounded border-gray-300" />
              <span className="ml-2">DNF</span>
            </label>
            <label className="inline-flex items-center text-sm">
              <input type="checkbox" checked={crashed} onChange={(e) => setCrashed(e.target.checked)} className="rounded border-gray-300" />
              <span className="ml-2">{t('riderDebriefCrashed')}</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600">{t('riderDebriefSummary')}</label>
          <textarea
            value={selfSummary}
            onChange={(e) => setSelfSummary(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder={t('riderDebriefSummaryPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">{t('riderDebriefHighlights')}</label>
          <textarea
            value={selfHighlights}
            onChange={(e) => setSelfHighlights(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder={t('riderDebriefHighlightsPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">{t('riderDebriefImprovements')}</label>
          <textarea
            value={selfImprovements}
            onChange={(e) => setSelfImprovements(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder={t('riderDebriefImprovementsPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
            <ContributionRatingPicker
              compact
              scale="physical"
              allowAbsent={false}
              value={selfPhysicalFeel}
              onChange={(val) => setSelfPhysicalFeel(val)}
            />
            {selfPhysicalFeel != null && (
              <p className="text-[11px] text-gray-500 mt-1">
                {getPerformanceRatingCriteria('physical', selfPhysicalFeel)}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
            <ContributionRatingPicker
              compact
              scale="technical"
              allowAbsent={false}
              value={selfTechnicalFeel}
              onChange={(val) => setSelfTechnicalFeel(val)}
            />
            {selfTechnicalFeel != null && (
              <p className="text-[11px] text-gray-500 mt-1">
                {getPerformanceRatingCriteria('technical', selfTechnicalFeel)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? t('saving') : t('riderDebriefSave')}
          </ActionButton>
          {saved && !error && (
            <span className="text-xs text-emerald-700">{t('riderDebriefSaved')}</span>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-1">
        <PeerReviewTab
          event={event}
          appState={appState}
          setPeerRatings={setPeerRatings}
          currentUser={currentUser}
          riderEventSelections={riderEventSelections}
          raterUserId={currentUser.id}
        />
      </div>
    </div>
  );
};

export default RiderEventDebriefTab;

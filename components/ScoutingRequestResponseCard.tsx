import React, { useMemo, useState } from 'react';
import { ScoutingDataScope, ScoutingRequest, User } from '../types';
import ActionButton from './ActionButton';
import {
  ALL_SCOUTING_DATA_SCOPES,
  SCOUTING_DATA_SCOPE_OPTIONS,
  buildScoutingConsentNoticeText,
  canAthleteConsentToScouting,
  isContactScoutingRequest,
} from '../utils/scoutingProspectUtils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import { useTranslations } from '../hooks/useTranslations';

interface ScoutingRequestResponseCardProps {
  request: ScoutingRequest;
  teamName: string;
  currentUser: User;
  onRespond: (
    requestId: string,
    response: 'accepted' | 'rejected',
    grantedScopes?: ScoutingDataScope[],
    options?: { teamName?: string; language?: 'fr' | 'en' },
  ) => void | Promise<void>;
}

const ScoutingRequestResponseCard: React.FC<ScoutingRequestResponseCardProps> = ({
  request,
  teamName,
  currentUser,
  onRespond,
}) => {
  const { t, language } = useTranslations();
  const lang = language === 'en' ? 'en' : 'fr';

  const requestedScopes = useMemo(
    () => (request.requestedScopes?.length ? request.requestedScopes : ALL_SCOUTING_DATA_SCOPES),
    [request.requestedScopes],
  );

  const [grantedScopes, setGrantedScopes] = useState<ScoutingDataScope[]>(requestedScopes);
  const [noticeAck, setNoticeAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capacity = canAthleteConsentToScouting(currentUser);
  const noticeText = buildScoutingConsentNoticeText({
    teamName,
    scopes: grantedScopes.length ? grantedScopes : requestedScopes,
    language: lang,
  });

  const toggleScope = (scope: ScoutingDataScope) => {
    setGrantedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope],
    );
  };

  if (!isContactScoutingRequest(request)) return null;

  const handleAccept = async () => {
    if (!capacity.ok || !noticeAck || grantedScopes.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await onRespond(request.id, 'accepted', grantedScopes, { teamName, language: lang });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scoutingConsentError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onRespond(request.id, 'rejected', undefined, { teamName, language: lang });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scoutingConsentError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 bg-white rounded-md border border-blue-100 space-y-3">
      <div>
        <p className="text-sm text-gray-800">
          {t('scoutingConsentTeamWantsContact').replace('{team}', teamName)}
        </p>
        {request.message && <p className="text-sm text-gray-600 mt-1">{request.message}</p>}
        <p className="text-xs text-gray-500 mt-1">
          {t('scoutingConsentRequestDate')}{' '}
          {new Date(request.requestDate).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR')}
        </p>
      </div>

      {!capacity.ok && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {capacity.reason === 'minor_no_parental'
            ? t('scoutingConsentMinorBlocked')
            : t('scoutingConsentAgeUnknownBlocked')}
        </div>
      )}

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {t('scoutingConsentChooseScopes')}
        </p>
        {SCOUTING_DATA_SCOPE_OPTIONS.filter(o => requestedScopes.includes(o.value)).map(
          ({ value, label, labelEn, description, descriptionEn }) => (
            <label key={value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={grantedScopes.includes(value)}
                onChange={() => toggleScope(value)}
                className="mt-1 rounded border-gray-300"
                disabled={!capacity.ok || submitting}
              />
              <span className="text-sm">
                <span className="font-medium text-gray-800">{lang === 'en' ? labelEn : label}</span>
                <span className="block text-xs text-gray-500">
                  {lang === 'en' ? descriptionEn : description}
                </span>
              </span>
            </label>
          ),
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {t('scoutingConsentNoticeTitle')}
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">{noticeText}</p>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={noticeAck}
            onChange={e => setNoticeAck(e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
            disabled={!capacity.ok || submitting}
          />
          <span className="text-xs text-slate-800">{t('scoutingConsentNoticeAck')}</span>
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2 justify-end">
        <ActionButton
          onClick={() => void handleReject()}
          variant="danger"
          size="sm"
          icon={<XCircleIcon className="w-4 h-4" />}
          disabled={submitting}
        >
          {t('scoutingConsentReject')}
        </ActionButton>
        <ActionButton
          onClick={() => void handleAccept()}
          variant="primary"
          size="sm"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          disabled={
            !capacity.ok || !noticeAck || grantedScopes.length === 0 || submitting
          }
        >
          {t('scoutingConsentAccept')}
        </ActionButton>
      </div>
    </div>
  );
};

export default ScoutingRequestResponseCard;

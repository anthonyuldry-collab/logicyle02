import React from 'react';
import { ScoutingRequest } from '../types';
import ActionButton from './ActionButton';
import {
  getScoutingScopeLabel,
  isActiveScoutingConsent,
} from '../utils/scoutingProspectUtils';
import { useTranslations } from '../hooks/useTranslations';

interface ScoutingActiveConsentCardProps {
  request: ScoutingRequest;
  teamName: string;
  onWithdraw: (requestId: string) => void | Promise<void>;
}

const ScoutingActiveConsentCard: React.FC<ScoutingActiveConsentCardProps> = ({
  request,
  teamName,
  onWithdraw,
}) => {
  const { t, language } = useTranslations();
  const lang = language === 'en' ? 'en' : 'fr';

  if (!isActiveScoutingConsent(request)) return null;

  const scopes = request.grantedScopes?.length
    ? request.grantedScopes.map(s => getScoutingScopeLabel(s, lang)).join(', ')
    : t('scoutingConsentAllRequestedScopes');
  const recordedAt = request.consentRecordedAt || request.responseDate;

  return (
    <div className="p-3 bg-white rounded-md border border-emerald-100 space-y-2">
      <p className="text-sm text-gray-800">
        {t('scoutingActiveShareWith').replace('{team}', teamName)}
      </p>
      <p className="text-xs text-gray-600">
        {t('scoutingActiveScopes')}: {scopes}
      </p>
      {recordedAt && (
        <p className="text-xs text-gray-500">
          {t('scoutingActiveConsentDate')}{' '}
          {new Date(recordedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR')}
          {request.consentPrivacyVersion
            ? ` · privacy ${request.consentPrivacyVersion}`
            : ''}
          {request.consentNoticeVersion ? ` · notice ${request.consentNoticeVersion}` : ''}
        </p>
      )}
      <div className="flex justify-end">
        <ActionButton
          onClick={() => {
            if (window.confirm(t('scoutingWithdrawConfirm'))) {
              void onWithdraw(request.id);
            }
          }}
          variant="danger"
          size="sm"
        >
          {t('scoutingWithdrawCta')}
        </ActionButton>
      </div>
    </div>
  );
};

export default ScoutingActiveConsentCard;

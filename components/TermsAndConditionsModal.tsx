import React, { useState } from 'react';
import Modal from './Modal';
import ActionButton from './ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import { LEGAL_VERSIONS } from '../constants';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

const DPO_EMAIL = 'privacy@logicycle.fr';

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
}) => {
  const { t, language } = useTranslations();
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadNDA, setHasReadNDA] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);

  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const currentDate = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleAccept = () => {
    if (hasReadTerms && hasReadNDA && hasReadPrivacy) {
      onAccept();
    } else {
      alert(t('termsAlertAllRequired'));
    }
  };

  const isFr = language !== 'en';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('termsModalTitle')}>
      <div className="max-h-96 overflow-y-auto space-y-6 text-sm">
        <p className="text-xs text-gray-500">
          {t('termsVersionsLabel')}: CGU {LEGAL_VERSIONS.TERMS_VERSION} ·{' '}
          {t('termsPrivacyShort')} {LEGAL_VERSIONS.PRIVACY_POLICY_VERSION} · NDA{' '}
          {LEGAL_VERSIONS.NDA_VERSION}
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-800 mb-3">{t('termsNdaTitle')}</h3>
          <div className="text-red-700 space-y-3">
            <p>
              <strong>{t('termsEffectiveDate')}:</strong> {currentDate}
            </p>
            <p>
              {isFr
                ? "L'utilisateur s'engage à ne pas divulguer, reproduire ou exploiter commercialement les concepts, interfaces, algorithmes et données confidentielles de LogiCycle."
                : 'The user agrees not to disclose, reproduce or commercially exploit LogiCycle concepts, interfaces, algorithms and confidential data.'}
            </p>
            <p>
              {isFr
                ? 'Engagement valable 5 ans à compter de l’inscription, y compris après la fin d’utilisation. Toute violation pourra entraîner des poursuites.'
                : 'Commitment valid for 5 years from signup, including after ending use. Any breach may lead to legal action.'}
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-green-800 mb-3">{t('termsPrivacyTitle')}</h3>
          <div className="text-green-700 space-y-2">
            <p>
              {isFr
                ? 'Conformément au RGPD, LogiCycle traite vos données pour gérer votre compte, votre équipe, la logistique sportive et le suivi de performance que vous fournissez.'
                : 'Under GDPR, LogiCycle processes your data to manage your account, team, sports logistics and performance tracking you provide.'}
            </p>
            <p>
              {isFr
                ? 'Vous disposez d’un droit d’accès, de rectification, d’effacement et de portabilité via les Paramètres. Conservation pendant la durée du compte, puis suppression sous 30 jours.'
                : 'You have rights of access, rectification, erasure and portability via Settings. Data kept while the account is active, then deleted within 30 days.'}
            </p>
            <p>
              {t('termsDpoContact')}: <strong>{DPO_EMAIL}</strong>
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-800 mb-3">{t('termsCguTitle')}</h3>
          <div className="text-blue-700 space-y-3">
            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">1. {t('termsServiceTitle')}</h4>
              <p>
                {isFr
                  ? 'LogiCycle est un service professionnel de gestion d’équipes cyclistes. L’accès est conditionné à un compte valide et, selon le parcours, à un abonnement ou à l’appartenance à une équipe abonnée.'
                  : 'LogiCycle is a professional cycling-team management service. Access requires a valid account and, depending on the path, a subscription or membership in a subscribed team.'}
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">2. {t('termsAcceptedUseTitle')}</h4>
              <p>
                {isFr
                  ? 'Usage limité à la gestion d’équipe, au suivi de performance, à la planification d’événements et à l’administration / logistique sportive.'
                  : 'Use is limited to team management, performance tracking, event planning and sports administration / logistics.'}
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">3. {t('termsProhibitionsTitle')}</h4>
              <p>
                {isFr
                  ? 'Interdit : copier le code ou les concepts à des fins commerciales, partager des informations confidentielles, contourner la sécurité, ou toute activité illégale.'
                  : 'Prohibited: copying code or concepts for commercial purposes, sharing confidential information, bypassing security, or any illegal activity.'}
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">4. {t('termsIpTitle')}</h4>
              <p>
                {isFr
                  ? 'Tous les droits de propriété intellectuelle sur LogiCycle appartiennent à ses éditeurs.'
                  : 'All intellectual property rights in LogiCycle belong to its publishers.'}
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-blue-300">
              <h4 className="font-semibold mb-2">5. {t('termsLiabilityTitle')}</h4>
              <p>
                {isFr
                  ? 'Dans les limites autorisées par la loi, LogiCycle ne peut être tenu responsable des pertes de données, interruptions ou dommages indirects liés à l’usage du service.'
                  : 'To the extent permitted by law, LogiCycle is not liable for data loss, interruptions or indirect damages arising from use of the service.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="readTerms"
              checked={hasReadTerms}
              onChange={(e) => setHasReadTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="readTerms" className="text-sm text-gray-700">
              <strong>{t('termsCheckCgu')}</strong>
            </label>
          </div>
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="readNDA"
              checked={hasReadNDA}
              onChange={(e) => setHasReadNDA(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="readNDA" className="text-sm text-gray-700">
              <strong>{t('termsCheckNda')}</strong>
            </label>
          </div>
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="readPrivacy"
              checked={hasReadPrivacy}
              onChange={(e) => setHasReadPrivacy(e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="readPrivacy" className="text-sm text-gray-700">
              <strong>{t('termsCheckPrivacy')}</strong>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        <ActionButton onClick={onDecline} variant="danger">
          {t('termsDecline')}
        </ActionButton>
        <ActionButton
          onClick={handleAccept}
          variant="primary"
          disabled={!hasReadTerms || !hasReadNDA || !hasReadPrivacy}
        >
          {t('termsAccept')}
        </ActionButton>
      </div>
    </Modal>
  );
};

import React from 'react';
import Modal from './Modal';
import ActionButton from './ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import { LEGAL_VERSIONS } from '../constants';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslations();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('gdprPrivacyTitle')}>
      <div className="max-h-[70vh] overflow-y-auto space-y-4 text-sm text-gray-700">
        <p className="text-xs text-gray-500">
          {t('gdprPrivacyVersion')} {LEGAL_VERSIONS.PRIVACY_POLICY_VERSION}
        </p>

        <section>
          <h3 className="font-semibold text-gray-900 mb-2">{t('gdprSection1Title')}</h3>
          <p>{t('gdprSection1Text')}</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-2">{t('gdprSection2Title')}</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('gdprDataIdentity')}</li>
            <li>{t('gdprDataPerformance')}</li>
            <li>{t('gdprDataHealth')}</li>
            <li>{t('gdprDataLogistics')}</li>
            <li>{t('gdprDataTechnical')}</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-2">{t('gdprSection3Title')}</h3>
          <p>{t('gdprSection3Text')}</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-2">{t('gdprSection4Title')}</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('gdprRightAccess')}</li>
            <li>{t('gdprRightRectification')}</li>
            <li>{t('gdprRightErasure')}</li>
            <li>{t('gdprRightPortability')}</li>
            <li>{t('gdprRightObjection')}</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-2">{t('gdprSection5Title')}</h3>
          <p>{t('gdprSection5Text')}</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 mb-2">{t('gdprSection6Title')}</h3>
          <p>{t('gdprSection6Text')}</p>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-xs">{t('gdprContact')}</p>
        </section>
      </div>

      <div className="flex justify-end mt-4 pt-4 border-t">
        <ActionButton onClick={onClose} variant="secondary">
          {t('close')}
        </ActionButton>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;

import React from 'react';
import Modal from './Modal';
import ActionButton from './ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import { LEGAL_VERSIONS } from '../constants';
import { PRIVACY_DOCUMENT, pickLegalLocale, legalHashFor } from '../legal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslations();
  const locale = pickLegalLocale(language);
  const doc = PRIVACY_DOCUMENT;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc.title[locale]}>
      <div className="max-h-[70vh] overflow-y-auto space-y-4 text-sm text-gray-700">
        <p className="text-xs text-gray-500">
          {t('gdprPrivacyVersion')} {doc.version} · {doc.effectiveDate}
        </p>
        <p className="text-xs text-gray-600">{doc.summary[locale]}</p>

        {doc.sections.map((section) => {
          const blocks = section.blocks[locale];
          const prose = blocks.filter((b) => !b.startsWith('•'));
          const bullets = blocks.filter((b) => b.startsWith('•'));
          return (
            <section key={section.id}>
              <h3 className="font-semibold text-gray-900 mb-2">{section.title[locale]}</h3>
              <div className="space-y-2">
                {prose.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {bullets.length > 0 && (
                  <ul className="list-disc list-inside space-y-1">
                    {bullets.map((b, i) => (
                      <li key={i}>{b.replace(/^•\s*/, '')}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-blue-800 text-xs">{t('gdprContact')}</p>
          <a
            href={legalHashFor('privacy')}
            className="text-xs font-semibold text-indigo-700 hover:underline"
            onClick={() => {
              /* hash navigation handled by App */
            }}
          >
            /legal/privacy · pack {LEGAL_VERSIONS.PACK_VERSION}
          </a>
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

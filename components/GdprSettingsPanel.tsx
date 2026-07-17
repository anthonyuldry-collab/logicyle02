import React, { useState } from 'react';
import ActionButton from './ActionButton';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { useTranslations } from '../hooks/useTranslations';
import { exportUserPersonalData, downloadJsonExport, writeGdprAuditLog } from '../services/gdprService';
import { User } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface GdprSettingsPanelProps {
  currentUser: User;
}

const GdprSettingsPanel: React.FC<GdprSettingsPanelProps> = ({ currentUser }) => {
  const { t } = useTranslations();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const handleExport = async () => {
    setExportError('');
    setExportSuccess('');
    setIsExporting(true);
    try {
      const data = await exportUserPersonalData(currentUser.id);
      const date = new Date().toISOString().split('T')[0];
      downloadJsonExport(data, `logicyle-donnees-${currentUser.lastName}-${date}.json`);
      await writeGdprAuditLog({
        action: 'user_export',
        targetId: currentUser.id,
        performedBy: currentUser.id,
        method: 'client',
      });
      setExportSuccess(t('gdprExportSuccess'));
    } catch {
      setExportError(t('gdprExportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const consentDate = currentUser.gdprConsent?.privacyPolicyAcceptedAt
    ? new Date(currentUser.gdprConsent.privacyPolicyAcceptedAt).toLocaleDateString('fr-FR')
    : null;

  return (
    <>
      <div className="rounded-lg border border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-center mb-4">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-400 mr-2" />
          <h3 className="text-lg font-semibold text-white">{t('gdprPanelTitle')}</h3>
        </div>

        <p className="text-sm text-slate-300 mb-4">{t('gdprPanelDesc')}</p>

        {consentDate && (
          <p className="text-xs text-slate-400 mb-4">
            {t('gdprConsentDate')} {consentDate}
          </p>
        )}

        <div className="space-y-3">
          <ActionButton
            onClick={() => setShowPrivacy(true)}
            variant="secondary"
            className="w-full justify-start"
            icon={<DocumentTextIcon className="w-4 h-4" />}
          >
            {t('gdprViewPrivacy')}
          </ActionButton>

          <ActionButton
            onClick={handleExport}
            variant="secondary"
            className="w-full justify-start"
            disabled={isExporting}
            icon={<DownloadIcon className="w-4 h-4" />}
          >
            {isExporting ? t('gdprExporting') : t('gdprExportData')}
          </ActionButton>
        </div>

        <div className="mt-4 rounded-md border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300 space-y-1">
          <p><strong className="text-slate-200">{t('gdprRetentionTitle')}</strong> {t('gdprRetentionText')}</p>
          <p>{t('gdprRightsReminder')}</p>
        </div>

        {exportError && <p className="mt-3 text-sm text-red-300">{exportError}</p>}
        {exportSuccess && <p className="mt-3 text-sm text-emerald-300">{exportSuccess}</p>}
      </div>

      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
};

export default GdprSettingsPanel;

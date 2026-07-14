import React, { useEffect, useState } from 'react';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import { UserRole } from '../types';

interface PendingApprovalViewProps {
  userRole?: UserRole | string;
  onLogout: () => void;
  onCheckStatus: () => Promise<void>;
}

const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  userRole,
  onLogout,
  onCheckStatus,
}) => {
  const { t } = useTranslations();
  const [isChecking, setIsChecking] = useState(false);

  const roleLabel =
    userRole === UserRole.STAFF
      ? t('pendingRoleStaff')
      : userRole === UserRole.MANAGER
        ? t('pendingRoleManager')
        : t('pendingRoleAthlete');

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsChecking(true);
      try {
        await onCheckStatus();
      } finally {
        setIsChecking(false);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [onCheckStatus]);

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: 'var(--theme-primary-bg)' }}
    >
      <div className="w-full max-w-md p-8 space-y-6 text-center bg-slate-800 bg-opacity-80 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl">
        <div className="text-4xl" aria-hidden>
          ⏳
        </div>
        <h1 className="text-2xl font-bold text-slate-100">{t('pendingTitle')}</h1>
        <p className="text-slate-300">{t('pendingMessage')}</p>
        <p className="text-sm text-blue-300 font-medium">
          {t('pendingRoleLabel')}: {roleLabel}
        </p>
        <p className="text-sm text-slate-400">{t('pendingAutoRefresh')}</p>
        {isChecking && (
          <p className="text-xs text-slate-500 animate-pulse">{t('pendingChecking')}</p>
        )}
        <div className="pt-4 space-y-2">
          <ActionButton onClick={onCheckStatus} variant="secondary" className="w-full">
            {t('pendingRefreshNow')}
          </ActionButton>
          <ActionButton onClick={onLogout} variant="secondary" className="w-full">
            {t('sidebarLogout')}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalView;

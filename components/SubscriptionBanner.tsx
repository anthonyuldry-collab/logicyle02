import React from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import { getPlanById } from '../constants/subscriptionPlans';
import ActionButton from './ActionButton';

interface SubscriptionBannerProps {
  access: SubscriptionAccess;
  onManageBilling: () => void;
  onViewPricing: () => void;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  access,
  onManageBilling,
  onViewPricing,
}) => {
  const { t, language } = useTranslations();
  const plan = getPlanById(access.planId);

  if (access.isExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div>
          <p className="font-semibold">{t('billingExpiredTitle')}</p>
          <p className="text-sm text-red-100">{t('billingExpiredDesc')}</p>
        </div>
        <ActionButton onClick={onViewPricing} variant="secondary" size="sm">
          {t('billingChoosePlan')}
        </ActionButton>
      </div>
    );
  }

  if (access.isTrial || access.isPilot) {
    return (
      <div className="bg-indigo-700 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>
          {access.isPilot ? t('billingPilotBanner') : t('billingTrialBanner')} —{' '}
          <strong>{plan.name[language]}</strong>
          {access.daysRemaining !== null && (
            <> · {access.daysRemaining} {t('billingDaysLeft')}</>
          )}
        </span>
        <button
          type="button"
          onClick={onManageBilling}
          className="underline hover:no-underline font-medium"
        >
          {t('billingUpgradeNow')}
        </button>
      </div>
    );
  }

  if (access.isActive && access.planId !== 'federation') {
    return (
      <div className="bg-slate-700 text-slate-200 px-4 py-1.5 flex items-center justify-between text-xs">
        <span>
          {t('billingPlanActive')}: <strong>{plan.name[language]}</strong>
        </span>
        <button type="button" onClick={onManageBilling} className="underline hover:no-underline">
          {t('billingManage')}
        </button>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;

import React from 'react';
import { Rider } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import {
  buildRiderContractSummary,
  formatContractDuration,
} from '../utils/contractUtils';
import { formatFinancialAmount, formatFinancialDate } from '../utils/financialUtils';

interface RiderContractSummaryProps {
  rider: Rider;
  compact?: boolean;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const RiderContractSummary: React.FC<RiderContractSummaryProps> = ({ rider, compact = false }) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const summary = buildRiderContractSummary(rider);

  const hasContractData =
    summary.monthlySalary > 0 ||
    summary.contractStartDate ||
    summary.contractEndDate ||
    summary.contractType ||
    summary.contractClauses;

  if (!hasContractData) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        {t('contractNoData')}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'rounded-lg border border-gray-200 bg-white p-4 shadow-sm'}`}>
      {!compact && (
        <h4 className="text-md font-semibold text-gray-900">{t('contractDetailsTitle')}</h4>
      )}

      {summary.isExpiringSoon && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('contractExpiringSoon').replace('{days}', String(summary.daysRemaining ?? 0))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <InfoItem label={t('contractType')} value={summary.contractType || '—'} />
        <InfoItem
          label={t('contractDuration')}
          value={formatContractDuration(summary.durationMonths, language)}
        />
        <InfoItem
          label={t('contractMonthlySalary')}
          value={summary.monthlySalary > 0 ? formatFinancialAmount(summary.monthlySalary, locale) : '—'}
        />
        <InfoItem
          label={t('contractAnnualForecast')}
          value={summary.annualCost > 0 ? formatFinancialAmount(summary.annualCost, locale) : '—'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoItem
          label={t('formContractStart')}
          value={summary.contractStartDate ? formatFinancialDate(summary.contractStartDate, locale) : '—'}
        />
        <InfoItem
          label={t('formContractEnd')}
          value={summary.contractEndDate ? formatFinancialDate(summary.contractEndDate, locale) : '—'}
        />
      </div>

      {summary.signingBonus > 0 && (
        <InfoItem
          label={t('contractSigningBonus')}
          value={formatFinancialAmount(summary.signingBonus, locale)}
        />
      )}

      {summary.contractClauses && (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('contractClauses')}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{summary.contractClauses}</p>
        </div>
      )}

      {summary.performanceBonusNotes && (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('contractBonusClauses')}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{summary.performanceBonusNotes}</p>
        </div>
      )}
    </div>
  );
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

export default RiderContractSummary;

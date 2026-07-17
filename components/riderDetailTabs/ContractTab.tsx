import React from 'react';
import { Rider, ContractType } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import {
  buildRiderContractSummary,
  formatContractDuration,
  getDaysUntilContractEnd,
} from '../../utils/contractUtils';
import { formatFinancialAmount } from '../../utils/financialUtils';

interface ContractTabProps {
  formData: Rider;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  formFieldsEnabled: boolean;
  isEditable?: boolean;
  theme?: 'dark' | 'light';
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const ContractTab: React.FC<ContractTabProps> = ({
  formData,
  handleInputChange,
  formFieldsEnabled,
  isEditable = true,
  theme = 'dark',
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const canEdit = formFieldsEnabled && isEditable;
  const isLight = theme === 'light';

  const fieldClass = isLight
    ? 'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50 disabled:text-gray-500'
    : 'input-field-sm mt-1 w-full';

  const fieldsetClass = isLight
    ? 'space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4'
    : 'space-y-3 rounded-md border border-slate-600 p-4';

  const legendClass = isLight
    ? 'px-1 text-sm font-semibold text-gray-900'
    : 'px-1 text-md font-medium text-slate-200';

  const labelClass = isLight ? 'text-sm font-medium text-gray-700' : 'text-sm font-medium';

  const summary = buildRiderContractSummary(formData);
  const daysRemaining = getDaysUntilContractEnd(formData.contractEndDate);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t('contractMonthlySalary')}
          value={summary.monthlySalary > 0 ? formatFinancialAmount(summary.monthlySalary, locale) : '—'}
          light={isLight}
        />
        <SummaryCard
          label={t('contractAnnualForecast')}
          value={summary.annualCost > 0 ? formatFinancialAmount(summary.annualCost, locale) : '—'}
          light={isLight}
        />
        <SummaryCard
          label={t('contractDuration')}
          value={formatContractDuration(summary.durationMonths, language)}
          light={isLight}
        />
        <SummaryCard
          label={t('contractDaysRemaining')}
          value={
            daysRemaining === null
              ? '—'
              : daysRemaining < 0
                ? t('contractExpired')
                : `${daysRemaining} j`
          }
          highlight={summary.isExpiringSoon}
          light={isLight}
        />
      </div>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{t('contractDetailsTitle')}</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>{t('formContractStart')}</label>
            <input
              type="date"
              name="contractStartDate"
              value={formData.contractStartDate || ''}
              onChange={handleInputChange}
              className={fieldClass}
              style={isLight ? undefined : { colorScheme: 'dark' }}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className={labelClass}>{t('formContractEnd')}</label>
            <input
              type="date"
              name="contractEndDate"
              value={formData.contractEndDate || ''}
              onChange={handleInputChange}
              className={fieldClass}
              style={isLight ? undefined : { colorScheme: 'dark' }}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className={labelClass}>{t('contractType')}</label>
            <select
              name="contractType"
              value={formData.contractType || ''}
              onChange={handleInputChange}
              className={fieldClass}
              disabled={!canEdit}
            >
              <option value="">—</option>
              {Object.values(ContractType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('contractMonthlySalary')}</label>
            <input
              type="number"
              name="salary"
              value={formData.salary ?? ''}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={fieldClass}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className={labelClass}>{t('contractSigningBonus')}</label>
            <input
              type="number"
              name="signingBonus"
              value={formData.signingBonus ?? ''}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={fieldClass}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className={labelClass}>{t('contractNextSeasonTeam')}</label>
            <input
              type="text"
              name="nextSeasonTeam"
              value={formData.nextSeasonTeam || ''}
              onChange={handleInputChange}
              className={fieldClass}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('contractClauses')}</label>
          <textarea
            name="contractClauses"
            value={formData.contractClauses || ''}
            onChange={handleInputChange}
            rows={4}
            placeholder={t('contractClausesPlaceholder')}
            className={fieldClass}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className={labelClass}>{t('contractBonusClauses')}</label>
          <textarea
            name="performanceBonusNotes"
            value={formData.performanceBonusNotes || ''}
            onChange={handleInputChange}
            rows={3}
            placeholder={t('contractBonusClausesPlaceholder')}
            className={fieldClass}
            disabled={!canEdit}
          />
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{t('sepaBankDetailsTitle')}</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>{t('sepaBeneficiaryIban')}</label>
            <input
              type="text"
              name="bankDetails.iban"
              value={formData.bankDetails?.iban || ''}
              onChange={handleInputChange}
              className={`${fieldClass} font-mono`}
              disabled={!canEdit}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
            />
          </div>
          <div>
            <label className={labelClass}>{t('sepaBeneficiaryBic')}</label>
            <input
              type="text"
              name="bankDetails.bic"
              value={formData.bankDetails?.bic || ''}
              onChange={handleInputChange}
              className={`${fieldClass} font-mono`}
              disabled={!canEdit}
              placeholder="BNPAFRPP"
            />
          </div>
          <div>
            <label className={labelClass}>{t('sepaAccountHolderName')}</label>
            <input
              type="text"
              name="bankDetails.accountHolderName"
              value={formData.bankDetails?.accountHolderName || ''}
              onChange={handleInputChange}
              className={fieldClass}
              disabled={!canEdit}
            />
          </div>
        </div>
      </fieldset>

      {!canEdit && (
        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>{t('contractReadOnlyHint')}</p>
      )}
    </div>
  );
};

function SummaryCard({
  label,
  value,
  highlight = false,
  light = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  light?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        light
          ? highlight
            ? 'border-amber-200 bg-amber-50'
            : 'border-gray-200 bg-white'
          : highlight
            ? 'border-amber-500/50 bg-amber-900/20'
            : 'border-slate-600 bg-slate-700/40'
      }`}
    >
      <div className={`text-xs ${light ? 'text-gray-500' : 'text-slate-400'}`}>{label}</div>
      <div className={`text-lg font-semibold ${light ? (highlight ? 'text-amber-800' : 'text-gray-900') : (highlight ? 'text-amber-300' : 'text-white')}`}>{value}</div>
    </div>
  );
}

export default ContractTab;

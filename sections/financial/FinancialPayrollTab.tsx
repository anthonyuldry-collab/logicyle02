import React, { useMemo } from 'react';
import { RaceEvent, Rider, StaffEventSelection, StaffMember } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import {
  buildMonthlyPayrollForecast,
  buildTeamContractSummaries,
  calculatePayrollSummary,
  PayrollContext,
} from '../../utils/contractUtils';
import { exportPayrollCsv } from '../../utils/payrollExport';
import { formatFinancialAmount, formatFinancialDate } from '../../utils/financialUtils';

interface FinancialPayrollTabProps {
  riders: Rider[];
  staff: StaffMember[];
  teamName: string;
  canExport: boolean;
  raceEvents?: RaceEvent[];
  staffEventSelections?: StaffEventSelection[];
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialPayrollTab: React.FC<FinancialPayrollTabProps> = ({
  riders,
  staff,
  teamName,
  canExport,
  raceEvents = [],
  staffEventSelections = [],
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const payrollContext: PayrollContext = useMemo(
    () => ({ raceEvents, staffEventSelections }),
    [raceEvents, staffEventSelections]
  );

  const payroll = useMemo(
    () => calculatePayrollSummary(riders, staff, payrollContext),
    [riders, staff, payrollContext]
  );
  const contracts = useMemo(
    () => buildTeamContractSummaries(riders, staff, payrollContext),
    [riders, staff, payrollContext]
  );
  const forecast = useMemo(
    () => buildMonthlyPayrollForecast(riders, staff, 12, locale, payrollContext),
    [riders, staff, locale, payrollContext]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('financialPayrollTitle')}</h3>
          <p className="text-sm text-gray-500">{t('financialPayrollDesc')}</p>
        </div>
        {canExport && contracts.length > 0 && (
          <ActionButton variant="secondary" size="sm" onClick={() => exportPayrollCsv(teamName, contracts)}>
            {t('financialPayrollExport')}
          </ActionButton>
        )}
      </div>

      {!canExport && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('financialPayrollExportProHint')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PayrollCard label={t('financialPayrollMonthlyRiders')} value={formatFinancialAmount(payroll.monthlyRiderMass, locale)} />
        <PayrollCard label={t('financialPayrollStaffSalaried')} value={formatFinancialAmount(payroll.monthlyStaffSalariedMass, locale)} />
        <PayrollCard label={t('financialPayrollStaffVacataire')} value={formatFinancialAmount(payroll.monthlyStaffVacataireMass, locale)} />
        <PayrollCard label={t('financialPayrollMonthlyTotal')} value={formatFinancialAmount(payroll.monthlyTotal, locale)} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">{t('financialPayrollActiveRiders')}</div>
          <div className="text-2xl font-bold text-gray-900">{payroll.activeRiderCount}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">{t('financialPayrollActiveStaff')}</div>
          <div className="text-2xl font-bold text-gray-900">{payroll.activeStaffSalariedCount}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">{t('financialPayrollVacataireCount')}</div>
          <div className="text-2xl font-bold text-gray-900">{payroll.activeStaffVacataireCount}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-700">{t('financialPayrollExpiring')}</div>
          <div className="text-2xl font-bold text-amber-900">{payroll.expiringWithin90Days}</div>
        </div>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="text-sm text-indigo-700">{t('financialPayrollAnnualForecast')}</div>
        <div className="text-3xl font-bold text-indigo-900">{formatFinancialAmount(payroll.annualForecast, locale)}</div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h4 className="font-medium text-gray-900">{t('financialPayrollForecast')}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">{t('formDate')}</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">{t('financialPayrollRiders')}</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">{t('financialPayrollStaffSalaried')}</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">{t('financialPayrollStaffVacataire')}</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">{t('financialPayrollTotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forecast.map((row) => (
                <tr key={row.monthKey}>
                  <td className="px-4 py-2 capitalize text-gray-800">{row.label}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatFinancialAmount(row.riderCost, locale)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatFinancialAmount(row.staffSalariedCost, locale)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatFinancialAmount(row.staffVacataireCost, locale)}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{formatFinancialAmount(row.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h4 className="font-medium text-gray-900">{t('financialPayrollContractsList')}</h4>
        </div>
        {contracts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">{t('financialPayrollEmpty')}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {contracts.map((contract) => (
              <li key={`${contract.type}-${contract.id}`} className="px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{contract.name}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {contract.type === 'rider' ? t('financialPayrollRider') : t('financialPayrollStaffMember')}
                      </span>
                      {contract.staffStatus && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                          {contract.staffStatus}
                        </span>
                      )}
                      {contract.isEstimatedCost && (
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700">
                          {t('financialPayrollEstimated')}
                        </span>
                      )}
                      {contract.isExpiringSoon && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          {t('contractExpiringSoonShort')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contract.role || '—'}
                      {contract.contractType && ` • ${contract.contractType}`}
                      {contract.contractEndDate && ` → ${formatFinancialDate(contract.contractEndDate, locale)}`}
                    </div>
                    {contract.dailyRate && (
                      <div className="text-xs text-gray-500">
                        {t('financialPayrollDailyRate')} : {formatFinancialAmount(contract.dailyRate, locale)} / jour
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatFinancialAmount(contract.monthlySalary, locale)}
                      <span className="text-xs font-normal text-gray-500"> / {t('contractMonthlyShort')}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFinancialAmount(contract.annualCost, locale)} / {t('contractYearShort')}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

function PayrollCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'blue' | 'green';
}) {
  const tones = {
    default: 'border-gray-200 bg-white',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default FinancialPayrollTab;

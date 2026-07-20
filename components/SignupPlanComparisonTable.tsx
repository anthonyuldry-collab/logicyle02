import React, { useMemo } from 'react';
import {
  PlanDefinition,
  PLAN_RANK,
  formatPriceEur,
  buildCumulativeFeatureTiers,
  isPlanAtLeast,
} from '../constants/subscriptionPlans';
import { SubscriptionPlanId } from '../types';
import { TranslationKey } from '../translations';

type Lang = 'fr' | 'en';

interface SignupPlanComparisonTableProps {
  plans: PlanDefinition[];
  selectedPlanId?: SubscriptionPlanId;
  billingInterval?: 'month' | 'year';
  onSelect: (planId: SubscriptionPlanId) => void;
  language: Lang;
  t: (key: TranslationKey) => string;
}

export const SignupPlanComparisonTable: React.FC<SignupPlanComparisonTableProps> = ({
  plans,
  selectedPlanId,
  billingInterval = 'year',
  onSelect,
  language,
  t,
}) => {
  const lang: Lang = language === 'en' ? 'en' : 'fr';

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => PLAN_RANK[a.id] - PLAN_RANK[b.id]),
    [plans],
  );

  const featureTiers = useMemo(
    () => buildCumulativeFeatureTiers(sortedPlans),
    [sortedPlans],
  );

  const colCount = sortedPlans.length;
  const firstPlanId = sortedPlans[0]?.id;
  const planNameById = useMemo(
    () => Object.fromEntries(sortedPlans.map((p) => [p.id, p.name[lang]])) as Record<string, string>,
    [sortedPlans, lang],
  );

  const colTone = (planId: string, unlocksHere = false) => {
    if (selectedPlanId === planId) return 'bg-indigo-500/14';
    if (unlocksHere) return 'bg-emerald-500/[0.08]';
    return '';
  };

  const planColWidth = `${76 / Math.max(colCount, 1)}%`;

  return (
    <div className="space-y-3 w-full">
      {plans.length > 1 && (
        <p className="text-[11px] text-slate-500 leading-snug">{t('signupPlanLegend')}</p>
      )}

      <div className="w-full rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col style={{ width: '24%' }} />
            {sortedPlans.map((plan) => (
              <col key={plan.id} style={{ width: planColWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-white/10">
              <th className="bg-slate-950/80 px-3 sm:px-4 py-3 align-bottom">
                <span className="sr-only">{t('signupPlanCompareLabel')}</span>
              </th>
              {sortedPlans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                const recommended = Boolean(plan.highlighted);
                return (
                  <th
                    key={plan.id}
                    className={`px-1.5 sm:px-2 py-2.5 text-center align-bottom ${
                      selected ? 'bg-indigo-950/80' : 'bg-slate-950/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(plan.id)}
                      aria-pressed={selected}
                      className={`relative w-full rounded-xl border px-2 py-3 transition-colors text-center ${
                        selected
                          ? 'border-indigo-400/80 bg-indigo-500/30 ring-1 ring-indigo-400/50'
                          : recommended
                            ? 'border-sky-400/40 bg-sky-500/10 hover:border-sky-300/55'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                      }`}
                    >
                      {recommended && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-sky-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-950 whitespace-nowrap">
                          {t('signupPlanRecommended')}
                        </span>
                      )}
                      <span className="block text-sm sm:text-base font-bold text-white">
                        {plan.name[lang]}
                      </span>
                      <span className="mt-1 block text-base sm:text-lg font-black text-white tabular-nums leading-tight">
                        {billingInterval === 'month'
                          ? formatPriceEur(plan.monthlyPriceEur, language)
                          : formatPriceEur(
                              plan.annualPriceEur ?? plan.monthlyPriceEur,
                              language,
                            )}
                        <span className="text-[10px] font-medium text-slate-400">
                          /
                          {billingInterval === 'month'
                            ? t('pricingMonth')
                            : t('pricingYear')}
                        </span>
                      </span>
                      {billingInterval === 'year' && plan.monthlyPriceEur != null && (
                        <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                          {formatPriceEur(plan.monthlyPriceEur, language)}/{t('pricingMonth')}
                        </span>
                      )}
                      {billingInterval === 'month' && plan.annualPriceEur != null && (
                        <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                          {formatPriceEur(plan.annualPriceEur, language)}/{t('pricingYear')}
                        </span>
                      )}
                      <span className="mt-1.5 block text-[10px] font-normal leading-snug text-slate-400">
                        {plan.tagline[lang]}
                      </span>
                      <span
                        className={`mt-2.5 inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          selected
                            ? 'bg-indigo-400 text-slate-950'
                            : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        {selected ? t('signupPlanSelected') : t('signupPlanChoose')}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10 bg-slate-900">
              <td
                colSpan={colCount + 1}
                className="px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300/85"
              >
                {t('signupPlanLimits')}
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="bg-slate-950/40 px-3 sm:px-4 py-2.5 text-[13px] text-slate-200 font-medium">
                {t('signupPlanUsersLabel')}
              </td>
              {sortedPlans.map((plan) => (
                <td
                  key={`${plan.id}-u`}
                  className={`px-2 py-2.5 text-center font-semibold text-white tabular-nums ${colTone(plan.id)}`}
                >
                  {plan.maxUsers}
                </td>
              ))}
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="bg-slate-950/40 px-3 sm:px-4 py-2.5 text-[13px] text-slate-200 font-medium">
                {t('signupPlanEventsLabel')}
              </td>
              {sortedPlans.map((plan) => (
                <td
                  key={`${plan.id}-e`}
                  className={`px-2 py-2.5 text-center font-semibold text-white tabular-nums ${colTone(plan.id)}`}
                >
                  {plan.maxEventsPerSeason == null
                    ? t('signupPlanUnlimited')
                    : plan.maxEventsPerSeason}
                </td>
              ))}
            </tr>

            {featureTiers.map((tier, tierIndex) => {
              const introName = planNameById[tier.introducedBy] ?? '';
              const isBase = tier.introducedBy === firstPlanId || tierIndex === 0;
              const sectionLabel = isBase
                ? t('signupPlanIncludedFrom').replace('{plan}', introName)
                : t('signupPlanExtrasFrom').replace('{plan}', introName);

              return (
                <React.Fragment key={tier.introducedBy}>
                  <tr className="border-b border-white/10 bg-slate-900">
                    <td
                      colSpan={colCount + 1}
                      className="px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300/85"
                    >
                      {sectionLabel}
                    </td>
                  </tr>
                  {tier.features.map((feature) => (
                    <tr
                      key={`${tier.introducedBy}-${feature.fr}`}
                      className="border-b border-white/[0.045]"
                    >
                      <td className="bg-slate-950/40 px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] text-slate-300 leading-snug break-words">
                        {feature[lang]}
                      </td>
                      {sortedPlans.map((plan) => {
                        const included = isPlanAtLeast(plan.id, tier.introducedBy);
                        const unlocksHere = !isBase && plan.id === tier.introducedBy;
                        return (
                          <td
                            key={`${plan.id}-${feature.fr}`}
                            className={`px-2 py-2.5 text-center ${colTone(plan.id, unlocksHere)}`}
                          >
                            {included ? (
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold leading-none ${
                                  unlocksHere
                                    ? 'bg-emerald-400/20 text-emerald-300'
                                    : 'text-emerald-500/55'
                                }`}
                                aria-label={t('signupPlanIncluded')}
                              >
                                ✓
                              </span>
                            ) : (
                              <span
                                className="text-slate-600/80 text-sm"
                                aria-label={t('signupPlanNotIncluded')}
                              >
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

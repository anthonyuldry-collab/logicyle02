import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import {
  SUBSCRIPTION_PLANS,
  INDEPENDENT_PLANS,
  formatPriceEur,
  getRecommendedPlansForTeamLevel,
  getAnnualSavingsPercent,
  getReferralAnnualPrice,
  getIndependentPlanForUser,
  getIndependentPlanIdForRole,
  getPlanById,
  REFERRAL_DISCOUNT_PERCENT,
  PricingAudience,
  resolvePricingAudience,
  PlanDefinition,
} from '../constants/subscriptionPlans';
import { REFERRAL_LABELS } from '../constants/referralProgram';
import { getPendingReferralCode, validateReferralCode } from '../services/referralService';
import { SubscriptionPlanId, TeamLevel, UserRole } from '../types';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import ActionButton from '../components/ActionButton';

interface PricingSectionProps {
  currentPlanId?: SubscriptionPlanId;
  teamLevel?: TeamLevel;
  onSelectPlan?: (planId: SubscriptionPlanId, referralCode?: string) => void;
  isPublic?: boolean;
  isIndependent?: boolean;
  userRole?: UserRole | string;
  canManageTeamBilling?: boolean;
  subscriptionAccess?: SubscriptionAccess;
  teamName?: string;
  audience?: PricingAudience;
}

type BillingPeriod = 'monthly' | 'annual';

const PricingSection: React.FC<PricingSectionProps> = ({
  currentPlanId,
  teamLevel,
  onSelectPlan,
  isPublic = false,
  isIndependent = false,
  userRole,
  canManageTeamBilling = false,
  subscriptionAccess,
  teamName,
  audience: audienceProp,
}) => {
  const { t, language } = useTranslations();
  const recommended = teamLevel ? getRecommendedPlansForTeamLevel(teamLevel) : [];
  const [referralInput, setReferralInput] = useState('');
  const [referralValid, setReferralValid] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');

  const audience = useMemo(
    () =>
      audienceProp ??
      resolvePricingAudience({
        isPublic,
        isIndependent,
        userRole,
        canManageTeamBilling,
      }),
    [audienceProp, isPublic, isIndependent, userRole, canManageTeamBilling],
  );

  const plansToShow: PlanDefinition[] = useMemo(() => {
    if (audience === 'independent_rider' || audience === 'independent_staff') {
      return [getIndependentPlanForUser(userRole || UserRole.COUREUR)];
    }
    if (audience === 'team_member') return [];
    return SUBSCRIPTION_PLANS;
  }, [audience, userRole]);

  const showTeamPlans = audience === 'public' || audience === 'team_admin';
  const showIndependentCatalog = audience === 'public';
  const showReferralCheckout =
    audience === 'public' ||
    audience === 'team_admin' ||
    audience === 'independent_rider' ||
    audience === 'independent_staff';
  const canPurchase = audience !== 'team_member';

  useEffect(() => {
    const pending = getPendingReferralCode();
    if (pending) {
      setReferralInput(pending);
      validateReferralCode(pending).then((v) => {
        if (v.valid && v.referrerName) setReferralValid(v.referrerName);
      });
    }
  }, []);

  const handleReferralBlur = async () => {
    if (!referralInput.trim()) {
      setReferralValid(null);
      return;
    }
    const v = await validateReferralCode(referralInput.trim());
    setReferralValid(v.valid ? v.referrerName ?? t('referralValidGeneric') : null);
  };

  const title =
    audience === 'team_admin'
      ? t('pricingTeamAdminTitle')
      : audience === 'team_member'
        ? t('pricingTeamMemberTitle')
        : audience === 'independent_rider'
          ? t('pricingIndependentRiderTitle')
          : audience === 'independent_staff'
            ? t('pricingIndependentStaffTitle')
            : t('pricingTitle');

  const subtitle =
    audience === 'team_admin'
      ? t('pricingTeamAdminSubtitle')
      : audience === 'team_member'
        ? t('pricingTeamMemberSubtitle')
        : audience === 'independent_rider'
          ? t('pricingIndependentRiderSubtitle')
          : audience === 'independent_staff'
            ? t('pricingIndependentStaffSubtitle')
            : t('pricingSubtitle');

  const shellClass = isPublic
    ? 'lc-pricing relative text-white'
    : 'lc-pricing relative text-slate-900';

  const renderPlanCard = (plan: PlanDefinition, opts?: { independent?: boolean }) => {
    const isIndependentPlan = Boolean(opts?.independent) || audience.startsWith('independent');
    const isRecommended = recommended.includes(plan.id);
    const isCurrent = currentPlanId === plan.id;
    const savings = getAnnualSavingsPercent(plan);
    const referralAnnual = getReferralAnnualPrice(plan);
    const showAnnual = billingPeriod === 'annual' && plan.annualPriceEur != null;

    return (
      <div
        key={plan.id}
        className={`lc-pricing-rise relative flex flex-col rounded-3xl border p-6 backdrop-blur-xl transition duration-300 ${
          isPublic
            ? plan.highlighted
              ? 'border-indigo-400/50 bg-indigo-500/15 shadow-2xl shadow-indigo-950/40 ring-1 ring-indigo-400/30'
              : 'border-white/12 bg-white/[0.06] shadow-xl shadow-black/20 hover:border-white/25'
            : plan.highlighted
              ? 'border-indigo-500 bg-white shadow-xl ring-2 ring-indigo-200'
              : 'border-slate-200 bg-white shadow-lg hover:border-indigo-200'
        } ${isCurrent ? (isPublic ? 'ring-2 ring-emerald-400/60' : 'ring-2 ring-emerald-400') : ''}`}
      >
        {(plan.highlighted || isRecommended || isCurrent) && (
          <div className="absolute -top-3 left-0 right-0 flex justify-center gap-2 px-3">
            {plan.highlighted && (
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  isPublic ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'
                }`}
              >
                {t('pricingPopular')}
              </span>
            )}
            {isRecommended && !isCurrent && showTeamPlans && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500 text-white">
                {t('pricingRecommended')}
              </span>
            )}
            {isCurrent && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white">
                {t('billingCurrentPlan')}
              </span>
            )}
          </div>
        )}

        <h3
          className={`text-xl font-bold tracking-tight ${
            isPublic ? 'text-white' : 'text-slate-900'
          }`}
        >
          {plan.name[language]}
        </h3>
        <p className={`text-sm mt-1.5 leading-snug ${isPublic ? 'text-slate-400' : 'text-slate-500'}`}>
          {plan.tagline[language]}
        </p>

        <div className="mt-5 mb-5">
          {plan.contactSales ? (
            <p className={`text-2xl font-bold ${isPublic ? 'text-white' : 'text-slate-900'}`}>
              {t('pricingContactSales')}
            </p>
          ) : (
            <>
              <p className={`text-4xl font-black tracking-tight ${isPublic ? 'text-white' : 'text-slate-900'}`}>
                {formatPriceEur(
                  showAnnual ? Math.round((plan.annualPriceEur ?? 0) / 12) : plan.monthlyPriceEur,
                  language,
                )}
                <span
                  className={`text-base font-normal ml-1 ${
                    isPublic ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  /{t('pricingMonth')}
                </span>
              </p>
              {showAnnual ? (
                <p className={`text-sm mt-1 ${isPublic ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatPriceEur(plan.annualPriceEur, language)}/{t('pricingYear')}
                  {savings > 0 && (
                    <span className="text-emerald-400 font-medium ml-1.5">
                      ({t('pricingTwoMonthsFree')})
                    </span>
                  )}
                </p>
              ) : (
                <p className={`text-sm mt-1 ${isPublic ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatPriceEur(plan.annualPriceEur, language)}/{t('pricingYear')}{' '}
                  <span className="text-emerald-400 font-medium">({t('pricingTwoMonthsFree')})</span>
                </p>
              )}
              {referralAnnual !== null && referralValid && (
                <p className="text-sm text-indigo-300 font-medium mt-1.5">
                  {formatPriceEur(referralAnnual, language)}/{t('pricingYear')}{' '}
                  {t('referralWithCodeSuffix').replace('{percent}', String(REFERRAL_DISCOUNT_PERCENT))}
                </p>
              )}
            </>
          )}
        </div>

        <ul className={`space-y-2.5 flex-grow text-sm ${isPublic ? 'text-slate-300' : 'text-slate-700'}`}>
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 ${isPublic ? 'text-indigo-300' : 'text-emerald-500'}`}>
                ✓
              </span>
              <span>{f[language]}</span>
            </li>
          ))}
          {!isIndependentPlan && (
            <li
              className={`flex items-start gap-2.5 pt-1 border-t ${
                isPublic ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'
              }`}
            >
              <span className="mt-0.5">·</span>
              <span>
                {plan.maxEventsPerSeason === null
                  ? t('pricingUnlimitedEvents')
                  : `${plan.maxEventsPerSeason} ${t('pricingEventsSeason')}`}
                {' · '}
                {plan.maxUsers} {t('pricingUsers')}
              </span>
            </li>
          )}
        </ul>

        <div className="mt-6">
          {plan.contactSales ? (
            <a
              href="mailto:contact@logicyle.app?subject=LogiCycle%20F%C3%A9d%C3%A9ration"
              className={`block w-full text-center py-2.5 px-4 rounded-xl font-medium transition ${
                isPublic
                  ? 'border border-white/20 text-slate-200 hover:bg-white/10'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t('pricingContactUs')}
            </a>
          ) : onSelectPlan && canPurchase ? (
            <ActionButton
              onClick={() =>
                onSelectPlan(
                  isIndependentPlan && userRole
                    ? getIndependentPlanIdForRole(userRole)
                    : plan.id,
                  referralValid ? referralInput.trim() : undefined,
                )
              }
              variant={plan.highlighted ? 'primary' : 'secondary'}
              className="w-full"
              disabled={isCurrent}
            >
              {isCurrent ? t('billingCurrentPlan') : t('pricingSelectPlan')}
            </ActionButton>
          ) : isPublic ? (
            <p className="text-center text-sm text-slate-400">{t('pricingSignupToStart')}</p>
          ) : null}
        </div>
      </div>
    );
  };

  const periodToggle = (
    <div
      className={`inline-flex rounded-full p-1 ${
        isPublic ? 'bg-white/10 border border-white/10' : 'bg-slate-100 border border-slate-200'
      }`}
    >
      {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => setBillingPeriod(period)}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
            billingPeriod === period
              ? isPublic
                ? 'bg-indigo-500 text-white shadow'
                : 'bg-white text-slate-900 shadow'
              : isPublic
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {period === 'monthly' ? t('pricingBillingMonthly') : t('pricingBillingAnnual')}
        </button>
      ))}
    </div>
  );

  if (audience === 'team_member') {
    const plan = currentPlanId ? getPlanById(currentPlanId) : null;
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-slate-600 text-sm">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-6 space-y-3">
          <p className="text-sm font-semibold text-sky-900">
            {teamName
              ? t('pricingTeamMemberCoveredNamed').replace('{team}', teamName)
              : t('pricingTeamMemberCovered')}
          </p>
          {plan && (
            <div className="bg-white rounded-xl border border-sky-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                {t('billingCurrentPlan')}
              </p>
              <p className="text-lg font-bold text-slate-900 mt-1">{plan.name[language]}</p>
              {subscriptionAccess && (
                <p className="text-sm text-slate-600 mt-1">
                  {subscriptionAccess.statusLabel[language]}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">{plan.tagline[language]}</p>
            </div>
          )}
          <p className="text-xs text-sky-800/80">{t('pricingTeamMemberHint')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-1">{t('pricingTeamMemberIndependentTitle')}</p>
          <p>{t('pricingTeamMemberIndependentNote')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {isPublic && (
        <style>{`
          @keyframes lc-pricing-rise {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .lc-pricing-rise { animation: lc-pricing-rise 0.55s ease-out both; }
        `}</style>
      )}

      <div className="space-y-10">
        <div className="text-center max-w-3xl mx-auto lc-pricing-rise">
          {isPublic && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/90 mb-3">
              {t('pricingEyebrow')}
            </p>
          )}
          <h2
            className={`font-black tracking-tight ${
              isPublic ? 'text-4xl sm:text-5xl text-white' : 'text-3xl text-slate-900'
            }`}
            style={isPublic ? { letterSpacing: '-0.03em' } : undefined}
          >
            {title}
          </h2>
          <p
            className={`mt-4 leading-relaxed ${
              isPublic ? 'text-base sm:text-lg text-slate-300' : 'text-slate-600'
            }`}
          >
            {subtitle}
          </p>
          <div className="mt-6 flex justify-center">{periodToggle}</div>
        </div>

        {showReferralCheckout && (
          <div className="max-w-3xl mx-auto rounded-2xl border border-indigo-500/35 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-indigo-200">
              {REFERRAL_LABELS.programTitle[language]}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {REFERRAL_LABELS.programSubtitle[language]}
            </p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-950 p-3.5">
                <span className="font-semibold text-emerald-300">{t('referralForFriend')} :</span>{' '}
                <span className="text-emerald-50">{REFERRAL_LABELS.refereeDiscount[language]}</span>
              </div>
              <div className="rounded-xl border border-indigo-500/35 bg-indigo-950 p-3.5">
                <span className="font-semibold text-indigo-300">{t('referralForYou')} :</span>{' '}
                <span className="text-indigo-50">{REFERRAL_LABELS.referrerReward[language]}</span>
              </div>
            </div>
            {!isPublic && (
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-200">
                  {t('referralCodeCheckout')}
                </label>
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  onBlur={handleReferralBlur}
                  placeholder="LC-XXXXXX"
                  className="w-full max-w-xs rounded-xl border border-white/15 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500"
                />
                {referralValid && (
                  <p className="mt-1.5 text-sm text-emerald-300">
                    {t('referralValidPrefix')} {referralValid}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {showTeamPlans && (
          <>
            {audience === 'team_admin' && (
              <p className="text-center text-sm font-medium text-slate-600">
                {t('pricingTeamPlansLabel')}
              </p>
            )}
            <div
              className={`grid grid-cols-1 gap-5 ${
                plansToShow.length === 1
                  ? 'max-w-md mx-auto'
                  : plansToShow.length <= 2
                    ? 'md:grid-cols-2 max-w-3xl mx-auto'
                    : 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5'
              }`}
            >
              {plansToShow.map((p) => renderPlanCard(p))}
            </div>
          </>
        )}

        {(audience === 'independent_rider' || audience === 'independent_staff') && (
          <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
            {plansToShow.map((p) => renderPlanCard(p, { independent: true }))}
          </div>
        )}

        {showIndependentCatalog && (
          <div className="max-w-4xl mx-auto">
            <h3
              className={`text-lg font-bold text-center mb-2 ${
                isPublic ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t('pricingIndependentSectionTitle')}
            </h3>
            <p
              className={`text-sm text-center mb-6 ${
                isPublic ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {t('pricingIndependentPaidNote')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {INDEPENDENT_PLANS.map((p) => renderPlanCard(p, { independent: true }))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingSection;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  PUBLIC_PRIMARY_PLAN_IDS,
  PUBLIC_SECONDARY_PLAN_IDS,
} from '../constants/subscriptionPlans';
import { REFERRAL_LABELS } from '../constants/referralProgram';
import {
  getPendingReferralCode,
  getReferralStats,
  validateReferralCode,
} from '../services/referralService';
import { LEGAL_ENTITY } from '../legal/meta';
import { SubscriptionPlanId, TeamLevel, User, UserRole } from '../types';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import ActionButton from '../components/ActionButton';

export type BillingInterval = 'month' | 'year';

interface PricingSectionProps {
  currentUser?: User | null;
  currentPlanId?: SubscriptionPlanId;
  teamLevel?: TeamLevel;
  onSelectPlan?: (
    planId: SubscriptionPlanId,
    referralCode?: string,
    interval?: BillingInterval
  ) => void;
  isPublic?: boolean;
  isIndependent?: boolean;
  userRole?: UserRole | string;
  canManageTeamBilling?: boolean;
  subscriptionAccess?: SubscriptionAccess;
  teamName?: string;
  audience?: PricingAudience;
}

type BillingPeriod = 'monthly' | 'annual';

function periodToInterval(period: BillingPeriod): BillingInterval {
  return period === 'monthly' ? 'month' : 'year';
}

const PricingSection: React.FC<PricingSectionProps> = ({
  currentUser,
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
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [myShareUrl, setMyShareUrl] = useState<string | null>(null);
  const [myCodeLoading, setMyCodeLoading] = useState(false);
  const [copiedKind, setCopiedKind] = useState<'code' | 'link' | null>(null);
  /** Public : indépendants repliés — lien discret seulement (wedge clubs M1). */
  const [showIndependentPlans, setShowIndependentPlans] = useState(false);
  const [showSecondaryPlans, setShowSecondaryPlans] = useState(false);
  const [showReferralBox, setShowReferralBox] = useState(false);

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
    if (audience === 'public') {
      const rank = new Map(PUBLIC_PRIMARY_PLAN_IDS.map((id, i) => [id, i]));
      return SUBSCRIPTION_PLANS.filter((p) => rank.has(p.id)).sort(
        (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99),
      );
    }
    return SUBSCRIPTION_PLANS;
  }, [audience, userRole]);

  const secondaryPlans: PlanDefinition[] = useMemo(() => {
    if (audience !== 'public') return [];
    const rank = new Map(PUBLIC_SECONDARY_PLAN_IDS.map((id, i) => [id, i]));
    return SUBSCRIPTION_PLANS.filter((p) => rank.has(p.id)).sort(
      (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99),
    );
  }, [audience]);

  const showTeamPlans = audience === 'public' || audience === 'team_admin';
  const showIndependentTeaser = audience === 'public';
  const showReferralCheckout =
    audience === 'public' ||
    audience === 'team_admin' ||
    audience === 'independent_rider' ||
    audience === 'independent_staff';
  const canPurchase = audience !== 'team_member';

  useEffect(() => {
    if (audience !== 'public' || typeof window === 'undefined') return;
    if (window.location.hash === '#independants') setShowIndependentPlans(true);
  }, [audience]);

  useEffect(() => {
    const pending = getPendingReferralCode();
    if (pending) {
      setReferralInput(pending);
      validateReferralCode(pending).then((v) => {
        if (v.valid && v.referrerName) setReferralValid(v.referrerName);
      });
    }
  }, []);

  useEffect(() => {
    if (!currentUser || isPublic) {
      setMyReferralCode(null);
      setMyShareUrl(null);
      return;
    }
    let cancelled = false;
    setMyCodeLoading(true);
    getReferralStats(currentUser)
      .then((stats) => {
        if (cancelled) return;
        setMyReferralCode(stats.code);
        setMyShareUrl(stats.shareUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setMyReferralCode(null);
          setMyShareUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setMyCodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, isPublic]);

  const copyMyReferral = useCallback(
    async (kind: 'code' | 'link') => {
      const value = kind === 'code' ? myReferralCode : myShareUrl;
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedKind(kind);
        setTimeout(() => setCopiedKind(null), 2000);
      } catch {
        setCopiedKind(null);
      }
    },
    [myReferralCode, myShareUrl]
  );

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

  // L’app et la page publique sont toutes deux sur fond sombre.
  const shellClass = 'lc-pricing relative text-white';

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
          plan.highlighted
            ? 'border-indigo-400/50 bg-indigo-500/15 shadow-2xl shadow-indigo-950/40 ring-1 ring-indigo-400/30'
            : 'border-white/12 bg-slate-900 shadow-xl shadow-black/20 hover:border-white/25'
        } ${isCurrent ? 'ring-2 ring-emerald-400/60' : ''}`}
      >
        {(plan.highlighted || isRecommended || isCurrent) && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {plan.highlighted && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500 text-white">
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

        <h3 className="text-xl font-bold tracking-tight text-white">
          {plan.name[language]}
        </h3>
        <p className="text-sm mt-1.5 leading-snug text-slate-400">
          {plan.tagline[language]}
        </p>

        <div className="mt-5 mb-5">
          {plan.contactSales ? (
            <p className="text-2xl font-bold text-white">
              {t('pricingContactSales')}
            </p>
          ) : (
            <>
              <p className="text-4xl font-black tracking-tight text-white">
                {formatPriceEur(
                  showAnnual ? Math.round((plan.annualPriceEur ?? 0) / 12) : plan.monthlyPriceEur,
                  language,
                )}
                <span className="text-base font-normal ml-1 text-slate-400">
                  /{t('pricingMonth')}
                </span>
              </p>
              {showAnnual ? (
                <p className="text-sm mt-1 text-slate-400">
                  {formatPriceEur(plan.annualPriceEur, language)}/{t('pricingYear')}
                  {savings > 0 && (
                    <span className="text-emerald-400 font-medium ml-1.5">
                      ({t('pricingTwoMonthsFree')})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm mt-1 text-slate-400">
                  {t('pricingBilledMonthly')}
                  {plan.annualPriceEur != null && savings > 0 && (
                    <>
                      {' · '}
                      <span className="text-emerald-400 font-medium">
                        {formatPriceEur(plan.annualPriceEur, language)}/{t('pricingYear')} ({t('pricingTwoMonthsFree')})
                      </span>
                    </>
                  )}
                </p>
              )}
              {referralAnnual !== null && referralValid && showAnnual && (
                <p className="text-sm text-indigo-300 font-medium mt-1.5">
                  {formatPriceEur(referralAnnual, language)}/{t('pricingYear')}{' '}
                  {t('referralWithCodeSuffix').replace('{percent}', String(REFERRAL_DISCOUNT_PERCENT))}
                </p>
              )}
            </>
          )}
        </div>

        <ul className="space-y-2.5 flex-grow text-sm text-slate-300">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-indigo-300">✓</span>
              <span>{f[language]}</span>
            </li>
          ))}
          {!isIndependentPlan && (
            <li className="flex items-start gap-2.5 pt-1 border-t border-white/10 text-slate-400">
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
              href={`mailto:${LEGAL_ENTITY.contactEmail}?subject=${encodeURIComponent('Rovik Fédération')}`}
              className="block w-full text-center py-2.5 px-4 rounded-xl font-medium transition border border-white/20 text-slate-200 hover:bg-white/10"
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
                  periodToInterval(billingPeriod),
                )
              }
              variant={plan.highlighted ? 'primary' : 'secondary'}
              className="w-full !text-white"
              disabled={isCurrent}
            >
              {isCurrent
                ? t('billingCurrentPlan')
                : isPublic
                  ? billingPeriod === 'monthly'
                    ? t('pricingPublicStartMonthly')
                    : t('pricingPublicStartAnnual')
                  : billingPeriod === 'monthly'
                    ? t('pricingSelectPlanMonthly')
                    : t('pricingSelectPlanAnnual')}
            </ActionButton>
          ) : isPublic ? (
            <p className="text-center text-sm text-slate-400">{t('pricingSignupToStart')}</p>
          ) : null}
        </div>
      </div>
    );
  };

  const periodToggle = (
    <div className="inline-flex rounded-full p-1 bg-white/10 border border-white/10">
      {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => setBillingPeriod(period)}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
            billingPeriod === period
              ? 'bg-indigo-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
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
      <div className="space-y-6 max-w-2xl mx-auto text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-slate-400 text-sm">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-sky-400/35 bg-sky-950/60 p-6 space-y-3">
          <p className="text-sm font-semibold text-sky-200">
            {teamName
              ? t('pricingTeamMemberCoveredNamed').replace('{team}', teamName)
              : t('pricingTeamMemberCovered')}
          </p>
          {plan && (
            <div className="bg-slate-900 rounded-xl border border-sky-400/25 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                {t('billingCurrentPlan')}
              </p>
              <p className="text-lg font-bold text-white mt-1">{plan.name[language]}</p>
              {subscriptionAccess && (
                <p className="text-sm text-slate-300 mt-1">
                  {subscriptionAccess.statusLabel[language]}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-2">{plan.tagline[language]}</p>
            </div>
          )}
          <p className="text-xs text-sky-300/90">{t('pricingTeamMemberHint')}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-slate-900 p-4 text-sm text-slate-300">
          <p className="font-medium text-white mb-1">{t('pricingTeamMemberIndependentTitle')}</p>
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
            <div className="mb-6 flex flex-col items-center gap-4">
              <img
                src="/icons/rovik-mark.png"
                alt="rovik"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_28px_rgba(34,211,238,0.35)]"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                {t('pricingEyebrow')}
              </p>
            </div>
          )}
          <h2
            className="font-black tracking-tight text-4xl sm:text-5xl text-white"
            style={{ letterSpacing: '-0.03em' }}
          >
            {title}
          </h2>
          <p className="mt-4 leading-relaxed text-base sm:text-lg text-slate-300">
            {subtitle}
          </p>
          {isPublic && (
            <p className="mt-2 text-xs sm:text-sm text-slate-400">{t('pricingExclVatNote')}</p>
          )}
          {isPublic && (
            <p className="mt-1.5 text-xs text-indigo-300/80">{t('pricingFoundingNote')}</p>
          )}
          <div className="mt-6 flex justify-center">{periodToggle}</div>
        </div>

        {showReferralCheckout && isPublic && (
          <div className="max-w-md mx-auto text-center">
            {!showReferralBox ? (
              <button
                type="button"
                onClick={() => setShowReferralBox(true)}
                className="text-xs text-slate-500 hover:text-slate-300 underline-offset-4 hover:underline transition"
              >
                {t('pricingReferralTeaser')}
              </button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-left">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {REFERRAL_LABELS.programSubtitle[language]}
                </p>
                <label className="mt-3 mb-1.5 block text-xs font-medium text-slate-400">
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
                <button
                  type="button"
                  onClick={() => setShowReferralBox(false)}
                  className="mt-3 text-xs text-slate-500 hover:text-slate-300"
                >
                  {t('pricingIndependentHide')}
                </button>
              </div>
            )}
          </div>
        )}

        {showReferralCheckout && !isPublic && (
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
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200">
                  {t('referralYourCode')}
                </label>
                {myCodeLoading ? (
                  <p className="text-sm text-slate-400">{t('referralLoading')}</p>
                ) : myReferralCode ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-xl border border-indigo-300/50 bg-indigo-950 px-3 py-2.5 font-mono text-base font-bold tracking-wide text-white">
                        {myReferralCode}
                      </code>
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        className="!text-white"
                        onClick={() => copyMyReferral('code')}
                      >
                        {copiedKind === 'code' ? t('referralCodeCopied') : t('referralCopyCode')}
                      </ActionButton>
                      {myShareUrl && (
                        <ActionButton
                          variant="secondary"
                          size="sm"
                          className="!text-white"
                          onClick={() => copyMyReferral('link')}
                        >
                          {copiedKind === 'link' ? t('referralCopied') : t('referralCopyLink')}
                        </ActionButton>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">{t('referralShareHint')}</p>
                  </>
                ) : (
                  <p className="text-sm text-rose-300">{t('referralLoadError')}</p>
                )}
              </div>

              <div>
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
            </div>
          </div>
        )}

        {showTeamPlans && (
          <>
            {audience === 'team_admin' && (
              <p className="text-center text-sm font-medium text-slate-300">
                {t('pricingTeamPlansLabel')}
              </p>
            )}
            <div
              className={`grid grid-cols-1 gap-5 ${
                plansToShow.length === 1
                  ? 'max-w-md mx-auto'
                  : plansToShow.length <= 2
                    ? 'md:grid-cols-2 max-w-3xl mx-auto'
                    : 'md:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {plansToShow.map((p) => renderPlanCard(p))}
            </div>
            {audience === 'public' && secondaryPlans.length > 0 && (
              <div className="max-w-4xl mx-auto pt-2">
                {!showSecondaryPlans ? (
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowSecondaryPlans(true)}
                      className="text-sm text-slate-500 hover:text-slate-300 underline-offset-4 hover:underline transition"
                    >
                      {t('pricingSecondaryTeaser')}
                    </button>
                  </p>
                ) : (
                  <>
                    <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-500 mb-5">
                      {t('pricingSecondaryTitle')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {secondaryPlans.map((p) => renderPlanCard(p))}
                    </div>
                    <p className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => setShowSecondaryPlans(false)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition"
                      >
                        {t('pricingIndependentHide')}
                      </button>
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {(audience === 'independent_rider' || audience === 'independent_staff') && (
          <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
            {plansToShow.map((p) => renderPlanCard(p, { independent: true }))}
          </div>
        )}

        {showIndependentTeaser && (
          <div id="independants" className="max-w-4xl mx-auto scroll-mt-8">
            {!showIndependentPlans ? (
              <p className="text-center text-sm text-slate-500">
                <button
                  type="button"
                  onClick={() => setShowIndependentPlans(true)}
                  className="text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline transition"
                >
                  {t('pricingIndependentTeaser')}
                </button>
              </p>
            ) : (
              <>
                <h3 className="text-base font-semibold text-center mb-1 text-slate-200">
                  {t('pricingIndependentSectionTitle')}
                </h3>
                <p className="text-sm text-center mb-6 text-slate-500">
                  {t('pricingIndependentPaidNote')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {INDEPENDENT_PLANS.map((p) => renderPlanCard(p, { independent: true }))}
                </div>
                <p className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowIndependentPlans(false)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    {t('pricingIndependentHide')}
                  </button>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingSection;

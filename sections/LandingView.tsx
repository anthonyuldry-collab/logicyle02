import React, { useEffect, useRef } from 'react';
import SupportFaqPanel from '../components/SupportFaqPanel';
import { LANGUAGE_OPTIONS } from '../constants';
import {
  SUBSCRIPTION_PLANS,
  formatPriceEur,
  getPlanById,
} from '../constants/subscriptionPlans';
import { SubscriptionPlanId } from '../types';
import {
  FOUNDER_COHORT_SIZE,
  FOUNDER_DEMO_MAIL_SUBJECT,
  getFounderSeatsRemaining,
  getFounderYear1AnnualPrice,
  isFounderCohortOpen,
} from '../constants/founderOffer';
import { LEGAL_ENTITY } from '../legal/meta';
import BrandMark from '../components/BrandMark';
import { useTranslations } from '../hooks/useTranslations';
import type { LegalDocId } from '../legal';

interface LandingViewProps {
  onLogin: () => void;
  onSignup: () => void;
  onViewPricing: () => void;
  onViewLegal: (docId: LegalDocId) => void;
}

const LandingView: React.FC<LandingViewProps> = ({
  onLogin,
  onSignup,
  onViewPricing,
  onViewLegal,
}) => {
  const { t, language, setLanguage } = useTranslations();
  const heroRef = useRef<HTMLElement>(null);
  const heroPlan =
    SUBSCRIPTION_PLANS.find((p) => p.highlighted) ??
    getPlanById(SubscriptionPlanId.COMPETITION);
  const founderRemaining = getFounderSeatsRemaining();
  const founderOpen = isFounderCohortOpen();
  const founderYear1Price = getFounderYear1AnnualPrice(heroPlan.annualPriceEur);
  const founderBody = t('landingEarlyBody');
  const trustLine = t('landingTrustLine')
    .replace('{remaining}', String(founderRemaining))
    .replace('{total}', String(FOUNDER_COHORT_SIZE));
  const demoMailto = `mailto:${LEGAL_ENTITY.contactEmail}?subject=${encodeURIComponent(
    FOUNDER_DEMO_MAIL_SUBJECT[language],
  )}`;

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    el.classList.add('lc-landing-ready');
  }, []);

  return (
    <div className="lc-landing relative min-h-screen overflow-x-hidden text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .lc-landing {
          font-family: 'IBM Plex Sans', ui-sans-serif, sans-serif;
        }
        .lc-landing-brand,
        .lc-landing h1,
        .lc-landing h2,
        .lc-landing h3 {
          font-family: 'Space Grotesk', ui-sans-serif, sans-serif;
        }
        @keyframes lc-landing-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-landing-draw {
          to { stroke-dashoffset: 0; }
        }
        .lc-landing-ready .lc-landing-rise {
          animation: lc-landing-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lc-landing-ready .lc-landing-rise-2 { animation-delay: 0.08s; }
        .lc-landing-ready .lc-landing-rise-3 { animation-delay: 0.16s; }
        .lc-landing-ready .lc-landing-rise-4 { animation-delay: 0.24s; }
        .lc-landing-ready .lc-landing-rise-5 { animation-delay: 0.32s; }
        .lc-landing-ready .lc-landing-route {
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: lc-landing-draw 2.2s ease-out 0.3s forwards;
        }
        .lc-landing-ready .lc-landing-route-soft {
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: lc-landing-draw 2.6s ease-out 0.45s forwards;
        }
      `}</style>

      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 75% 8%, rgba(34,211,238,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 8% 88%, rgba(30,64,175,0.2), transparent 50%), linear-gradient(160deg, #05070a 0%, #0b0d10 48%, #10141c 100%)',
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.045]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-18deg, transparent, transparent 28px, #fff 28px, #fff 29px)',
        }}
      />

      <svg
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="lc-route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="75%" stopColor="#2563eb" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lc-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 640 C 180 620, 260 560, 380 540 C 520 510, 600 630, 740 600 C 880 568, 960 440, 1100 410 C 1220 385, 1320 450, 1440 430 L 1440 900 L 0 900 Z"
          fill="url(#lc-fill-grad)"
        />
        <path
          className="lc-landing-route-soft"
          d="M0 660 C 160 640, 250 580, 370 560 C 510 530, 590 650, 730 620 C 870 588, 950 460, 1090 430 C 1210 405, 1310 470, 1440 450"
          fill="none"
          stroke="rgba(148,163,184,0.2)"
          strokeWidth="1.5"
        />
        <path
          className="lc-landing-route"
          d="M0 640 C 180 620, 260 560, 380 540 C 520 510, 600 630, 740 600 C 880 568, 960 440, 1100 410 C 1220 385, 1320 450, 1440 430"
          fill="none"
          stroke="url(#lc-route-grad)"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>

      <header className="relative z-20 flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-8 py-4">
        <BrandMark variant="wordmark" size="sm" className="shrink-0" showTagline={false} />
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <a
            href="#fonctions"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition"
          >
            {t('landingNavFeatures')}
          </a>
          <a
            href="#offre"
            className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition"
          >
            {t('landingHeroPriceLabel')}
          </a>
          <select
            onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
            value={language}
            aria-label="Select language"
            className="rounded-lg border border-white/10 bg-transparent text-slate-300 text-xs sm:text-sm px-2 py-1.5 outline-none focus:ring-1 focus:ring-cyan-400/40 max-w-[4.5rem] sm:max-w-none"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition whitespace-nowrap touch-manipulation min-h-[36px] items-center"
          >
            {t('landingNavLogin')}
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition whitespace-nowrap touch-manipulation min-h-[36px] inline-flex items-center"
          >
            {t('landingNavCta')}
          </button>
        </div>
      </header>

      {/* Hero — une composition : marque, rêve, une phrase, CTAs */}
      <section
        ref={heroRef}
        className="relative z-10 min-h-[calc(100vh-4.5rem)] flex flex-col justify-center px-4 sm:px-8 pb-16 pt-6"
      >
        <div className="max-w-3xl mx-auto w-full text-center">
          <h1 className="lc-landing-rise flex justify-center">
            <BrandMark variant="lockup" size="hero" align="center" showTagline={false} />
          </h1>
          <p className="lc-landing-rise lc-landing-rise-2 mt-8 sm:mt-10 text-[1.35rem] sm:text-3xl text-white font-semibold tracking-tight max-w-2xl mx-auto leading-[1.25]">
            {t('landingHeadline')}
          </p>
          <p className="lc-landing-rise lc-landing-rise-3 mt-4 text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            {t('landingSubhead')}
          </p>
          <div className="lc-landing-rise lc-landing-rise-4 mt-9 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto w-full">
            <button
              type="button"
              onClick={onSignup}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 transition touch-manipulation"
            >
              {t('landingCtaTrial')}
            </button>
            <button
              type="button"
              onClick={onViewPricing}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/15 text-slate-100 font-medium hover:bg-white/[0.06] transition touch-manipulation tabular-nums"
            >
              {t('landingCtaPricing')}
            </button>
          </div>
          <p className="lc-landing-rise lc-landing-rise-5 mt-6 text-sm text-slate-400">
            <a
              href={demoMailto}
              className="hover:text-cyan-300 underline-offset-4 hover:underline transition"
            >
              {t('landingCtaTalk')}
            </a>
            <span className="text-slate-600 mx-2" aria-hidden>
              ·
            </span>
            <span className="text-slate-500">{t('landingTrialNote')}</span>
          </p>
          {founderOpen && (
            <p className="lc-landing-rise lc-landing-rise-5 mt-4 text-xs tracking-wide text-slate-500">
              {trustLine}
            </p>
          )}
        </div>
      </section>

      {/* Offre — prix + fondateurs + garantie, une section */}
      <section
        id="offre"
        className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10 scroll-mt-20"
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {t('landingFounderKicker')}
          </p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {t('landingPricingTitle')}
          </h2>
          <p className="mt-3 text-slate-400 leading-relaxed">{t('landingPricingSub')}</p>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-end gap-8 sm:gap-16">
            <div>
              <p className="text-5xl font-bold text-white tabular-nums tracking-tight">
                {formatPriceEur(heroPlan.annualPriceEur, language)}
                <span className="text-lg font-medium text-slate-500">
                  {t('landingPerYear')}
                </span>
              </p>
              {heroPlan.monthlyPriceEur != null && (
                <p className="mt-1.5 text-sm text-slate-500 tabular-nums">
                  {t('landingOrMonthly').replace(
                    '{monthly}',
                    formatPriceEur(heroPlan.monthlyPriceEur, language),
                  )}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-400">{heroPlan.tagline[language]}</p>
              {founderOpen && founderYear1Price != null && (
                <p className="mt-3 text-sm text-cyan-300/90 tabular-nums">
                  {language === 'fr'
                    ? `Fondateurs : ${formatPriceEur(founderYear1Price, language)}/an (−20 %)`
                    : `Founders: ${formatPriceEur(founderYear1Price, language)}/yr (−20%)`}
                </p>
              )}
            </div>
            {founderOpen && (
              <div className="sm:pb-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {language === 'fr' ? 'Places fondateurs' : 'Founding seats'}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                  {founderRemaining}
                  <span className="text-base font-medium text-slate-500">
                    {' '}
                    / {FOUNDER_COHORT_SIZE}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-500 max-w-xs leading-relaxed">
                  {founderBody}
                </p>
              </div>
            )}
          </div>

          <div className="mt-12 pt-10 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white">{t('landingGuaranteeTitle')}</h3>
            <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              {t('landingGuaranteeBody')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={onSignup}
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition"
              >
                {t('landingCtaTrial')} →
              </button>
              <button
                type="button"
                onClick={onViewPricing}
                className="text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                {t('landingPricingAll')} →
              </button>
              <button
                type="button"
                onClick={() => onViewLegal('cgv')}
                className="text-sm text-slate-500 hover:text-slate-300 transition"
              >
                {t('landingGuaranteeCta')} →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctions" className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {t('landingValueTitle')}
          </h2>
          <p className="mt-3 text-slate-400 max-w-xl leading-relaxed">{t('landingValueSub')}</p>
          <ul className="mt-12 space-y-10">
            {(
              [
                ['landingValue1Title', 'landingValue1Body'],
                ['landingValue2Title', 'landingValue2Body'],
                ['landingValue3Title', 'landingValue3Body'],
              ] as const
            ).map(([titleKey, bodyKey]) => (
              <li key={titleKey}>
                <h3 className="text-base font-semibold text-white">{t(titleKey)}</h3>
                <p className="mt-1.5 text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
                  {t(bodyKey)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <SupportFaqPanel tone="dark" />
        </div>
      </section>

      <footer className="relative z-10 px-4 sm:px-8 py-10 border-t border-white/10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <BrandMark variant="wordmark" size="sm" showTagline={false} />
            <p className="mt-1 text-xs text-slate-500">
              © {new Date().getFullYear()} {LEGAL_ENTITY.tradeName}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            {(
              [
                ['cgu', 'legalLinkCgu'],
                ['cgv', 'legalLinkCgv'],
                ['privacy', 'legalLinkPrivacy'],
                ['mentions', 'legalLinkMentions'],
              ] as const
            ).map(([id, key]) => (
              <button
                key={id}
                type="button"
                onClick={() => onViewLegal(id)}
                className="py-2 hover:text-slate-300 underline-offset-2 hover:underline touch-manipulation"
              >
                {t(key)}
              </button>
            ))}
            <a
              href={`mailto:${LEGAL_ENTITY.contactEmail}`}
              className="py-2 hover:text-slate-300 underline-offset-2 hover:underline touch-manipulation"
            >
              {LEGAL_ENTITY.contactEmail}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;

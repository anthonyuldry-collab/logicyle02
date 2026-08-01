import React, { useEffect, useRef } from 'react';
import SupportFaqPanel from '../components/SupportFaqPanel';
import { LANGUAGE_OPTIONS } from '../constants';
import {
  SUBSCRIPTION_PLANS,
  formatPriceEur,
} from '../constants/subscriptionPlans';
import { LEGAL_ENTITY } from '../legal/meta';
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
  const highlighted = SUBSCRIPTION_PLANS.find((p) => p.highlighted) ?? SUBSCRIPTION_PLANS[2];
  const entryPlan = SUBSCRIPTION_PLANS[0];

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
          --lc-ink: #071018;
          --lc-deep: #0b1c28;
          --lc-mist: #9fb4c4;
          --lc-line: #5eead4;
          --lc-accent: #38bdf8;
          --lc-cta: #0ea5e9;
          font-family: 'IBM Plex Sans', ui-sans-serif, sans-serif;
        }
        .lc-landing-brand,
        .lc-landing h1,
        .lc-landing h2,
        .lc-landing h3 {
          font-family: 'Space Grotesk', ui-sans-serif, sans-serif;
        }
        @keyframes lc-landing-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-landing-drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-1.5%, 2%, 0); }
        }
        @keyframes lc-landing-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes lc-landing-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .lc-landing-ready .lc-landing-rise {
          animation: lc-landing-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lc-landing-ready .lc-landing-rise-2 { animation-delay: 0.1s; }
        .lc-landing-ready .lc-landing-rise-3 { animation-delay: 0.2s; }
        .lc-landing-ready .lc-landing-rise-4 { animation-delay: 0.3s; }
        .lc-landing-ready .lc-landing-rise-5 { animation-delay: 0.4s; }
        .lc-landing-glow {
          animation: lc-landing-drift 22s ease-in-out infinite;
        }
        .lc-landing-ready .lc-landing-route {
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: lc-landing-draw 2.4s ease-out 0.35s forwards;
        }
        .lc-landing-ready .lc-landing-route-soft {
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: lc-landing-draw 2.8s ease-out 0.55s forwards;
        }
        .lc-landing-marker {
          animation: lc-landing-pulse 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Fond full-bleed — profondeur + atmosphère course */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 75% 15%, rgba(14,165,233,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 85%, rgba(45,212,191,0.12), transparent 50%), linear-gradient(165deg, var(--lc-ink) 0%, var(--lc-deep) 48%, #132532 100%)',
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="lc-landing-glow fixed -top-32 right-[-10%] -z-10 h-[75vh] w-[75vh] rounded-full bg-sky-500/15 blur-3xl" />
      <div className="lc-landing-glow fixed bottom-[-20%] left-[-15%] -z-10 h-[55vh] w-[55vh] rounded-full bg-teal-400/10 blur-3xl" style={{ animationDelay: '-8s' }} />

      {/* Profil de parcours — ancrage cyclisme, pas décor fintech */}
      <svg
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="lc-route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0" />
            <stop offset="35%" stopColor="#2dd4bf" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="lc-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 620 C 180 600, 260 540, 380 520 C 520 490, 600 610, 740 580 C 880 548, 960 420, 1100 390 C 1220 365, 1320 430, 1440 410 L 1440 900 L 0 900 Z"
          fill="url(#lc-fill-grad)"
        />
        <path
          className="lc-landing-route-soft"
          d="M0 640 C 160 620, 250 560, 370 540 C 510 510, 590 630, 730 600 C 870 568, 950 440, 1090 410 C 1210 385, 1310 450, 1440 430"
          fill="none"
          stroke="rgba(148,163,184,0.25)"
          strokeWidth="1.5"
        />
        <path
          className="lc-landing-route"
          d="M0 620 C 180 600, 260 540, 380 520 C 520 490, 600 610, 740 580 C 880 548, 960 420, 1100 390 C 1220 365, 1320 430, 1440 410"
          fill="none"
          stroke="url(#lc-route-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle className="lc-landing-marker" cx="740" cy="580" r="4.5" fill="#5eead4" />
        <circle className="lc-landing-marker" cx="1100" cy="390" r="5.5" fill="#38bdf8" style={{ animationDelay: '1.2s' }} />
      </svg>

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-8 py-3 sm:py-4">
        <span className="lc-landing-brand text-xs sm:text-sm font-bold tracking-[0.16em] sm:tracking-[0.2em] text-white/90 shrink-0">
          LOGICYCLE
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <a
            href="#fonctions"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            {t('landingNavFeatures')}
          </a>
          <select
            onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
            value={language}
            aria-label="Select language"
            className="rounded-lg border border-white/15 bg-slate-950/70 text-slate-200 text-xs sm:text-sm px-2 py-1.5 backdrop-blur-sm outline-none focus:ring-2 focus:ring-sky-500/40 max-w-[4.5rem] sm:max-w-none"
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
            className="inline-flex px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-200 hover:bg-white/10 transition whitespace-nowrap touch-manipulation min-h-[36px] items-center"
          >
            {t('landingNavLogin')}
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400 transition shadow-lg shadow-sky-950/40 whitespace-nowrap touch-manipulation min-h-[36px] inline-flex items-center"
          >
            {t('landingNavCta')}
          </button>
        </div>
      </header>

      {/* Hero — marque + promesse + CTAs */}
      <section
        ref={heroRef}
        className="relative z-10 min-h-[calc(100vh-4.5rem)] flex flex-col justify-center px-4 sm:px-8 pb-20 pt-8"
      >
        <div className="max-w-4xl mx-auto w-full text-center">
          <h1
            className="lc-landing-rise text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-none text-white"
            style={{ letterSpacing: '-0.04em' }}
          >
            LOGICYCLE
          </h1>
          <p className="lc-landing-rise lc-landing-rise-2 mt-5 sm:mt-6 text-lg sm:text-2xl text-slate-100 font-medium max-w-2xl mx-auto leading-snug">
            {t('landingHeadline')}
          </p>
          <p className="lc-landing-rise lc-landing-rise-3 mt-3 sm:mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            {t('landingSubhead')}
          </p>
          <div className="lc-landing-rise lc-landing-rise-4 mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto w-full">
            <button
              type="button"
              onClick={onSignup}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-3 rounded-xl bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 transition shadow-xl shadow-sky-950/40 touch-manipulation"
            >
              {t('landingCtaTrial')}
            </button>
            <button
              type="button"
              onClick={onViewPricing}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-3 rounded-xl border border-white/25 text-slate-100 font-medium hover:bg-white/10 transition touch-manipulation"
            >
              {t('landingCtaPricing')}
            </button>
          </div>
          <p className="lc-landing-rise lc-landing-rise-5 mt-5 text-sm">
            <a
              href={`mailto:${LEGAL_ENTITY.contactEmail}?subject=${encodeURIComponent('LogiCycle — démo / early access')}`}
              className="text-slate-400 hover:text-sky-300 underline-offset-4 hover:underline transition"
            >
              {t('landingCtaTalk')}
            </a>
          </p>
          <p className="lc-landing-rise lc-landing-rise-5 mt-3 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {t('landingTrialNote')}
          </p>
        </div>
      </section>

      {/* Early access */}
      <section className="relative z-10 px-4 sm:px-8 py-16 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            {t('landingEarlyTitle')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            {t('landingEarlyBody')}
          </p>
        </div>
      </section>

      {/* Fonctions */}
      <section id="fonctions" className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {t('landingValueTitle')}
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl leading-relaxed">{t('landingValueSub')}</p>
          <ul className="mt-10 space-y-8">
            {(
              [
                ['landingValue1Title', 'landingValue1Body'],
                ['landingValue2Title', 'landingValue2Body'],
                ['landingValue3Title', 'landingValue3Body'],
              ] as const
            ).map(([titleKey, bodyKey]) => (
              <li key={titleKey} className="max-w-2xl">
                <h3 className="text-lg font-semibold text-sky-200/90">{t(titleKey)}</h3>
                <p className="mt-1.5 text-sm sm:text-base text-slate-400 leading-relaxed">
                  {t(bodyKey)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tarifs */}
      <section className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {t('landingPricingTitle')}
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl leading-relaxed">{t('landingPricingSub')}</p>
          <div className="mt-10 grid sm:grid-cols-2 gap-8 sm:gap-12">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entryPlan.name[language]}</p>
              <p className="mt-2 text-4xl font-bold text-white tabular-nums">
                {formatPriceEur(entryPlan.monthlyPriceEur, language)}
                <span className="text-base font-medium text-slate-400">
                  {t('landingPerMonth')}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-400">{entryPlan.tagline[language]}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300/80">
                {highlighted.name[language]}
              </p>
              <p className="mt-2 text-4xl font-bold text-white tabular-nums">
                {formatPriceEur(highlighted.monthlyPriceEur, language)}
                <span className="text-base font-medium text-slate-400">
                  {t('landingPerMonth')}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-400">{highlighted.tagline[language]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewPricing}
            className="mt-10 text-sm font-semibold text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline"
          >
            {t('landingPricingAll')} →
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <SupportFaqPanel tone="dark" />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-8 py-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="lc-landing-brand text-sm font-bold tracking-[0.14em] text-white/80">LOGICYCLE</p>
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

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
        @keyframes lc-landing-rise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-landing-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-2%, 3%, 0) scale(1.04); }
        }
        @keyframes lc-landing-sweep {
          0% { transform: translateX(-40%) skewX(-14deg); opacity: 0; }
          30% { opacity: 0.45; }
          100% { transform: translateX(160%) skewX(-14deg); opacity: 0; }
        }
        .lc-landing-ready .lc-landing-rise {
          animation: lc-landing-rise 0.7s ease-out both;
        }
        .lc-landing-ready .lc-landing-rise-2 { animation-delay: 0.12s; }
        .lc-landing-ready .lc-landing-rise-3 { animation-delay: 0.24s; }
        .lc-landing-ready .lc-landing-rise-4 { animation-delay: 0.36s; }
        .lc-landing-glow {
          animation: lc-landing-drift 18s ease-in-out infinite;
        }
        .lc-landing-sweep {
          position: absolute;
          inset: -20% auto;
          width: 35%;
          background: linear-gradient(90deg, transparent, rgba(129,140,248,0.22), transparent);
          animation: lc-landing-sweep 7.5s ease-in-out infinite;
        }
      `}</style>

      {/* Fond full-bleed */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 70% 10%, rgba(79,70,229,0.45), transparent 55%), radial-gradient(ellipse 55% 45% at 10% 90%, rgba(14,165,233,0.2), transparent 50%), linear-gradient(155deg, #020617 0%, #0f172a 42%, #1e293b 100%)',
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-18deg, transparent, transparent 22px, #fff 22px, #fff 23px)',
        }}
      />
      <div className="lc-landing-glow fixed -top-24 -right-16 -z-10 h-[70vh] w-[70vh] rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="lc-landing-sweep -z-10 pointer-events-none" aria-hidden />

      {/* Nav minimale */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-8 py-4">
        <span className="text-sm font-bold tracking-[0.18em] text-white/90">LOGICYCLE</span>
        <div className="flex items-center gap-2 sm:gap-3">
          <select
            onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
            value={language}
            aria-label="Select language"
            className="rounded-lg border border-white/15 bg-slate-900/70 text-slate-200 text-sm px-2.5 py-1.5 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
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
            className="inline-flex px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 transition"
          >
            {t('landingNavLogin')}
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-400 transition shadow-lg shadow-indigo-950/40"
          >
            {t('landingNavCta')}
          </button>
        </div>
      </header>

      {/* Hero — marque + une promesse + CTAs */}
      <section
        ref={heroRef}
        className="relative z-10 min-h-[calc(100vh-4.5rem)] flex flex-col justify-center px-4 sm:px-8 pb-16 pt-6"
      >
        <div className="max-w-4xl mx-auto w-full text-center">
          <h1
            className="lc-landing-rise text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]"
            style={{ letterSpacing: '-0.045em' }}
          >
            LOGICYCLE
          </h1>
          <p className="lc-landing-rise lc-landing-rise-2 mt-5 sm:mt-6 text-lg sm:text-2xl text-slate-100 font-medium max-w-2xl mx-auto leading-snug">
            {t('landingHeadline')}
          </p>
          <p className="lc-landing-rise lc-landing-rise-3 mt-3 sm:mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            {t('landingSubhead')}
          </p>
          <div className="lc-landing-rise lc-landing-rise-4 mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onSignup}
              className="px-7 py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition shadow-xl shadow-indigo-950/50"
            >
              {t('landingCtaTrial')}
            </button>
            <button
              type="button"
              onClick={onViewPricing}
              className="px-7 py-3 rounded-xl border border-white/20 text-slate-100 font-medium hover:bg-white/10 transition"
            >
              {t('landingCtaPricing')}
            </button>
            <a
              href={`mailto:${LEGAL_ENTITY.contactEmail}?subject=${encodeURIComponent('LogiCycle — démo / early access')}`}
              className="px-7 py-3 rounded-xl border border-white/20 text-slate-100 font-medium hover:bg-white/10 transition"
            >
              {t('landingCtaTalk')}
            </a>
          </div>
          <p className="lc-landing-rise lc-landing-rise-4 mt-4 text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            {t('landingTrialNote')}
          </p>
        </div>
      </section>

      {/* Early access — honnête, sans faux logos */}
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

      {/* Une section = une idée : ce que ça change */}
      <section className="relative z-10 px-4 sm:px-8 py-20 border-t border-white/10">
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
                <h3 className="text-lg font-semibold text-indigo-200">{t(titleKey)}</h3>
                <p className="mt-1.5 text-sm sm:text-base text-slate-400 leading-relaxed">
                  {t(bodyKey)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tarifs — ancrage prix, pas un dashboard */}
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
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">
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
            className="mt-10 text-sm font-semibold text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline"
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
            <p className="text-sm font-bold tracking-[0.14em] text-white/80">LOGICYCLE</p>
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
                className="hover:text-slate-300 underline-offset-2 hover:underline"
              >
                {t(key)}
              </button>
            ))}
            <a
              href={`mailto:${LEGAL_ENTITY.contactEmail}`}
              className="hover:text-slate-300 underline-offset-2 hover:underline"
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

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { LANGUAGE_OPTIONS } from '../constants';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  onSwitchToSignup: () => void;
  onViewPricing?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSwitchToSignup, onViewPricing }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { t, language, setLanguage } = useTranslations();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.message || t('loginError'));
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      setResetMessage(
        `${t('loginResetSuccess')} ${forgotPasswordEmail}, ${t('loginResetSuccess2')}`,
      );
      setTimeout(() => {
        setIsForgotPasswordModalOpen(false);
        setResetMessage('');
      }, 4000);
    } catch {
      setResetError(t('loginResetError'));
    } finally {
      setIsResetting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/30 transition';

  return (
    <div className="lc-login relative min-h-screen overflow-hidden text-white">
      <style>{`
        @keyframes lc-login-sweep {
          0% { transform: translateX(-50%) skewX(-16deg); opacity: 0; }
          25% { opacity: 0.5; }
          100% { transform: translateX(180%) skewX(-16deg); opacity: 0; }
        }
        @keyframes lc-login-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-login-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lc-login-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .lc-login-rise { animation: lc-login-rise 0.65s ease-out both; }
        .lc-login-rise-delay { animation: lc-login-rise 0.7s ease-out 0.12s both; }
        .lc-login-sweep {
          position: absolute;
          inset: -30% auto;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(129,140,248,0.28), transparent);
          animation: lc-login-sweep 5.5s ease-in-out infinite;
          pointer-events: none;
        }
        .lc-login-wheel {
          animation: lc-login-spin 48s linear infinite;
        }
        .lc-login-float {
          animation: lc-login-float 5s ease-in-out infinite;
        }
      `}</style>

      {/* Fond plein écran */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 75% 20%, rgba(79,70,229,0.4), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 85%, rgba(14,165,233,0.18), transparent 50%), linear-gradient(155deg, #020617 0%, #0f172a 42%, #1e293b 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-18deg, transparent, transparent 22px, #fff 22px, #fff 23px)',
        }}
      />
      <div className="lc-login-sweep" />

      {/* Graphique roue / vitesse */}
      <svg
        className="lc-login-wheel absolute -right-24 top-1/2 -translate-y-1/2 w-[min(70vw,420px)] h-[min(70vw,420px)] opacity-[0.16] pointer-events-none"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <circle cx="100" cy="100" r="78" fill="none" stroke="#818cf8" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="52" fill="none" stroke="#6366f1" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="14" fill="#818cf8" />
        {Array.from({ length: 12 }).map((_, i) => {
          const deg = (i * 30 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 78 * Math.cos(deg)}
              y2={100 + 78 * Math.sin(deg)}
              stroke="#818cf8"
              strokeWidth="1.5"
              opacity={0.7}
            />
          );
        })}
      </svg>

      {/* Picto LC flottant */}
      <div className="lc-login-float absolute left-[8%] top-[18%] hidden lg:block pointer-events-none opacity-90">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 shadow-2xl">
          <img src="/icons/icon.svg" alt="" className="w-14 h-14 rounded-xl" />
        </div>
      </div>

      {/* Langue */}
      <div className="absolute top-4 right-4 z-20">
        <select
          onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
          value={language}
          aria-label="Select language"
          className="rounded-lg border border-white/15 bg-slate-900/70 text-slate-200 text-sm px-3 py-1.5 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-stretch">
        {/* Colonne marque (hero) */}
        <div className="lc-login-rise flex-1 flex flex-col justify-center items-center text-center px-6 sm:px-10 lg:px-16 py-12 lg:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/90">
            {t('loginEyebrow')}
          </p>
          <h1
            className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none text-white"
            style={{ letterSpacing: '-0.04em' }}
          >
            LOGICYCLE
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-md leading-relaxed">
            {t('loginSlogan')}
          </p>
        </div>

        {/* Panneau connexion (interaction) */}
        <div className="lc-login-rise-delay flex-1 flex items-center justify-center px-4 sm:px-8 pb-12 lg:pb-0 lg:pr-12">
          <div className="w-full max-w-md rounded-3xl border border-white/12 bg-slate-900/55 backdrop-blur-xl shadow-2xl shadow-black/40 p-7 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">{t('loginWelcome')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('loginSubtitle')}</p>
            </div>

            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  {t('loginEmailLabel')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder={t('loginEmailPlaceholder')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {t('loginPasswordLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMessage('');
                      setResetError('');
                      setForgotPasswordEmail('');
                      setIsForgotPasswordModalOpen(true);
                    }}
                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200 focus:outline-none focus:underline"
                  >
                    {t('loginForgotPassword')}
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-300 text-center bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 shadow-lg shadow-indigo-950/50 transition-colors"
              >
                {isLoading ? t('loginLoadingButton') : t('loginSubmitButton')}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 text-sm text-center text-slate-400 space-y-2.5">
              <p>
                {t('loginNoAccount')}{' '}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="font-semibold text-indigo-300 hover:text-indigo-200"
                >
                  {t('loginSignUpLink')}
                </button>
              </p>
              {onViewPricing && (
                <p>
                  <button
                    type="button"
                    onClick={onViewPricing}
                    className="font-medium text-slate-300 hover:text-white underline-offset-2 hover:underline"
                  >
                    {t('pricingViewPlans')}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        title={t('loginResetPasswordTitle')}
      >
        {resetMessage ? (
          <p className="text-center text-green-700 bg-green-100 p-4 rounded-md">{resetMessage}</p>
        ) : (
          <form className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
            <p className="text-sm text-gray-600">{t('loginResetPasswordDesc')}</p>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
                {t('loginEmailLabel')}
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full px-3 py-2 mt-1 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('loginEmailPlaceholder')}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-3">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setIsForgotPasswordModalOpen(false)}
              >
                {t('cancel')}
              </ActionButton>
              <ActionButton type="submit" disabled={isResetting}>
                {isResetting ? t('loginLoadingButton') : t('loginSendLink')}
              </ActionButton>
            </div>
            {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default LoginView;

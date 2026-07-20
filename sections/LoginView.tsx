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
    'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/30 transition';

  return (
    <div className="lc-login relative h-screen overflow-hidden text-white">
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
        @keyframes lc-login-spin-rev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes lc-login-mark-in {
          from { opacity: 0; transform: translate(-10%, 14%) scale(0.94); }
          to { opacity: 1; transform: translate(0, 0) scale(1); }
        }
        @keyframes lc-login-right-in {
          from { opacity: 0; transform: translate(8%, 6%); }
          to { opacity: 1; transform: translate(0, 0); }
        }
        @keyframes lc-login-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.55; }
        }
        .lc-login-rise { animation: lc-login-rise 0.65s ease-out both; }
        .lc-login-sweep {
          position: absolute;
          inset: -30% auto;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(129,140,248,0.28), transparent);
          animation: lc-login-sweep 5.5s ease-in-out infinite;
          pointer-events: none;
        }
        /* Filigrane bas-gauche — logo entier fixe (flèche figée) */
        .lc-login-mark-wrap {
          position: absolute;
          z-index: 0;
          left: -16%;
          bottom: -30vh;
          height: 132vh;
          width: auto;
          aspect-ratio: 1;
          pointer-events: none;
          opacity: 0;
          animation: lc-login-mark-in 1.05s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards;
        }
        .lc-login-mark-logo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.2;
          user-select: none;
          -webkit-user-drag: none;
        }
        /* Anneau orbital : mouvement propre, sans déformer le PNG */
        .lc-login-gear-crown {
          position: absolute;
          inset: 6%;
          width: 88%;
          height: 88%;
          margin: auto;
          opacity: 0.45;
          transform-origin: 50% 50%;
          animation: lc-login-spin 48s linear infinite;
          will-change: transform;
        }
        .lc-login-mark-glow {
          position: absolute;
          inset: 18%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%);
          filter: blur(28px);
          animation: lc-login-glow 5s ease-in-out infinite;
        }
        /* Équilibre droite */
        .lc-login-right {
          position: absolute;
          z-index: 0;
          right: -8%;
          top: 12%;
          width: min(52vw, 520px);
          height: min(52vw, 520px);
          pointer-events: none;
          opacity: 0;
          animation: lc-login-right-in 1.1s ease-out 0.35s forwards;
        }
        .lc-login-right-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(129, 140, 248, 0.22);
        }
        .lc-login-right-ring--spin {
          animation: lc-login-spin-rev 70s linear infinite;
        }
        .lc-login-right-ring--2 {
          inset: 12%;
          border-color: rgba(99, 102, 241, 0.16);
          border-style: dashed;
          animation: lc-login-spin 90s linear infinite;
        }
        .lc-login-right-ring--3 {
          inset: 26%;
          border-color: rgba(56, 189, 248, 0.12);
        }
        .lc-login-right-spoke {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 1px;
          height: 50%;
          background: linear-gradient(to top, transparent, rgba(129,140,248,0.28));
          transform-origin: bottom center;
        }
        @media (min-width: 1024px) {
          .lc-login-mark-wrap {
            left: -10%;
            bottom: -34vh;
            height: 138vh;
          }
          .lc-login-mark-logo { opacity: 0.22; }
          .lc-login-gear-crown { opacity: 0.5; }
          .lc-login-right {
            right: -4%;
            top: 8%;
            width: min(48vw, 560px);
            height: min(48vw, 560px);
          }
        }
        @media (max-width: 640px) {
          .lc-login-mark-wrap {
            left: -34%;
            bottom: -22vh;
            height: 110vh;
          }
          .lc-login-mark-logo { opacity: 0.14; }
          .lc-login-gear-crown { opacity: 0.3; }
          .lc-login-right {
            right: -28%;
            top: auto;
            bottom: -8%;
            width: 70vw;
            height: 70vw;
          }
        }
      `}</style>

      {/* Fond bleu */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 18% 70%, rgba(79,70,229,0.28), transparent 55%), radial-gradient(ellipse 50% 45% at 82% 35%, rgba(79,70,229,0.32), transparent 55%), radial-gradient(ellipse 40% 35% at 70% 80%, rgba(14,165,233,0.12), transparent 50%), linear-gradient(155deg, #020617 0%, #0f172a 42%, #1e293b 100%)',
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

      {/* Logo fixe (flèche figée) + orbite qui tourne autour */}
      <div className="lc-login-mark-wrap" aria-hidden>
        <div className="lc-login-mark-glow" />
        <svg className="lc-login-gear-crown" viewBox="0 0 200 200" fill="none">
          <circle
            cx="100"
            cy="100"
            r="92"
            stroke="rgba(129,140,248,0.55)"
            strokeWidth="1.4"
            strokeDasharray="7 11"
          />
          <circle
            cx="100"
            cy="100"
            r="84"
            stroke="rgba(99,102,241,0.28)"
            strokeWidth="1"
          />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const x1 = 100 + 88 * Math.cos(a);
            const y1 = 100 + 88 * Math.sin(a);
            const x2 = 100 + 96 * Math.cos(a);
            const y2 = 100 + 96 * Math.sin(a);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(165,180,252,0.7)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <img
          src="/icons/logicycle-logo.png"
          alt=""
          className="lc-login-mark-logo"
        />
      </div>

      {/* Contrepoids graphique à droite */}
      <div className="lc-login-right" aria-hidden>
        <div
          className="absolute inset-[-10%] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(14,165,233,0.06) 40%, transparent 70%)',
          }}
        />
        <div className="lc-login-right-ring lc-login-right-ring--spin">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="lc-login-right-spoke"
              style={{ transform: `rotate(${i * 45}deg)` }}
            />
          ))}
        </div>
        <div className="lc-login-right-ring lc-login-right-ring--2" />
        <div className="lc-login-right-ring lc-login-right-ring--3" />
        <div
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'rgba(129,140,248,0.45)', boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}
        />
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

      {/* Contenu centré — viewport fixe, pas de scroll */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 py-8 overflow-hidden">
        <div className="lc-login-rise flex flex-col items-center text-center w-full max-w-md">
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]"
            style={{ letterSpacing: '-0.045em' }}
          >
            LOGICYCLE
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300 max-w-sm leading-relaxed">
            {t('loginSlogan')}
          </p>

          <div className="mt-6 sm:mt-8 w-full rounded-3xl border border-white/12 bg-slate-900/65 backdrop-blur-xl shadow-2xl shadow-black/40 p-6 sm:p-8 text-left">
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl font-bold text-white">{t('loginWelcome')}</h2>
              <p className="mt-1 text-sm text-slate-300">{t('loginSubtitle')}</p>
            </div>

            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5"
                >
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
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
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
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-300 disabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:shadow-none text-white text-sm font-bold py-3.5 shadow-lg shadow-indigo-950/50 transition-colors"
              >
                {isLoading ? t('loginLoadingButton') : t('loginSubmitButton')}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 text-sm text-center text-slate-300 space-y-2.5">
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

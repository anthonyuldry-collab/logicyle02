import React, { useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { LANGUAGE_OPTIONS } from '../constants';
import { Sex, UserRole, SignupMode } from '../types';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  userRole: UserRole;
  birthDate: string;
  sex?: Sex | 'male' | 'female';
  acceptLegalConsent?: boolean;
  signupMode?: SignupMode;
}

interface SignupViewProps {
  onRegister: (data: SignupData) => Promise<{ success: boolean; message: string }>;
  onSwitchToLogin: () => void;
}

const ROLE_OPTIONS: {
  role: UserRole;
  emoji: string;
  titleKey: 'signupRoleAthlete' | 'signupStaffRoleLabel' | 'signupTabCreate' | 'signupRolePartner';
  descKey: 'signupRoleAthleteDesc' | 'signupRoleStaffDesc' | 'signupRoleManagerDesc' | 'signupRolePartnerDesc';
}[] = [
  {
    role: UserRole.COUREUR,
    emoji: '🚴',
    titleKey: 'signupRoleAthlete',
    descKey: 'signupRoleAthleteDesc',
  },
  {
    role: UserRole.STAFF,
    emoji: '👥',
    titleKey: 'signupStaffRoleLabel',
    descKey: 'signupRoleStaffDesc',
  },
  {
    role: UserRole.PARTNER,
    emoji: '🤝',
    titleKey: 'signupRolePartner',
    descKey: 'signupRolePartnerDesc',
  },
  {
    role: UserRole.MANAGER,
    emoji: '👑',
    titleKey: 'signupTabCreate',
    descKey: 'signupRoleManagerDesc',
  },
];

const SignupView: React.FC<SignupViewProps> = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    userRole: UserRole.COUREUR,
    birthDate: '',
    sex: undefined,
    signupMode: SignupMode.TEAM,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const { t, language, setLanguage } = useTranslations();

  const showPathChoice = formData.userRole !== UserRole.MANAGER && formData.userRole !== UserRole.PARTNER;

  const handleRoleSelect = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      userRole: role,
      signupMode: role === UserRole.MANAGER ? SignupMode.TEAM : prev.signupMode ?? SignupMode.TEAM,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'sex') {
      setFormData((prev) => ({ ...prev, sex: value === '' ? undefined : (value as Sex) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (formData.password !== confirmPassword) return t('signupPasswordsMismatch');
    if (formData.password.length < 6) return t('signupPasswordTooShort');
    if (!formData.birthDate) return t('signupBirthDateRequired');

    const birthDate = new Date(formData.birthDate);
    if (isNaN(birthDate.getTime())) return t('signupBirthDateInvalid');

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    if (age < 10 || age > 100) return t('signupAgeRange');
    return null;
  };

  const submitRegistration = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await onRegister({ ...formData, acceptLegalConsent: true });
      if (result && !result.success) {
        setError(result.message);
        setIsLoading(false);
      }
    } catch {
      setError(t('signupCreatingButton'));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    await submitRegistration();
  };

  const handleAcceptTerms = async () => {
    const validationError = validateForm();
    if (validationError) {
      setShowTermsModal(false);
      setError(validationError);
      return;
    }
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    setIsLoading(true);
    try {
      const result = await onRegister({ ...formData, acceptLegalConsent: true });
      if (result && !result.success) {
        setError(result.message);
        setIsLoading(false);
      }
    } catch {
      setError(t('signupCreatingButton'));
      setIsLoading(false);
    }
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setError(t('signupTermsRequired'));
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 transition';

  return (
    <div className="lc-signup relative min-h-screen overflow-hidden text-white">
      <style>{`
        @keyframes lc-signup-rise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-signup-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .lc-signup-rise { animation: lc-signup-rise 0.7s ease-out both; }
        .lc-signup-float { animation: lc-signup-float 6s ease-in-out infinite; }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 28% 42%, rgba(0,212,255,0.16), transparent 60%), radial-gradient(ellipse 45% 40% at 62% 58%, rgba(192,38,211,0.18), transparent 55%), radial-gradient(ellipse 35% 30% at 78% 28%, rgba(251,146,60,0.12), transparent 50%), linear-gradient(160deg, #05060f 0%, #0a0b1e 48%, #12081f 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-18deg, transparent, transparent 28px, #fff 28px, #fff 29px)',
        }}
      />

      <div className="absolute top-4 right-4 z-20">
        <select
          onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
          value={language}
          className="rounded-lg border border-white/10 bg-black/40 text-slate-300 text-sm px-3 py-1.5 backdrop-blur-sm outline-none focus:ring-2 focus:ring-cyan-500/30"
          aria-label="Select language"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-950">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-stretch">
        <div className="lc-signup-rise order-2 lg:order-1 flex-1 flex flex-col justify-center items-center lg:items-start text-center lg:text-left px-6 sm:px-10 lg:pl-20 lg:pr-8 py-10 lg:py-16">
          <div className="relative">
            <div
              className="absolute inset-[-18%] rounded-full blur-2xl opacity-60"
              style={{
                background:
                  'radial-gradient(circle, rgba(0,212,255,0.35) 0%, rgba(192,38,211,0.25) 45%, rgba(251,146,60,0.15) 70%, transparent 80%)',
              }}
              aria-hidden
            />
            <img
              src="/icons/logicycle-logo.png"
              alt="LogiCycle"
              className="lc-signup-float relative w-[min(72vw,260px)] sm:w-[280px] lg:w-[300px] h-auto drop-shadow-[0_0_40px_rgba(0,212,255,0.25)]"
            />
          </div>
          <h1
            className="mt-6 text-4xl sm:text-5xl lg:text-[3.25rem] font-black tracking-tight leading-none text-white"
            style={{ letterSpacing: '-0.045em' }}
          >
            LOGICYCLE
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300/90 max-w-sm leading-relaxed">
            {t('signupSlogan')}
          </p>
          <div
            className="mt-6 h-px w-24"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #c026d3, #fb923c)' }}
            aria-hidden
          />
        </div>

        <div className="order-1 lg:order-2 flex-1 flex items-start lg:items-center justify-center px-4 sm:px-8 pt-16 pb-12 lg:py-10 lg:pr-16">
          <div className="lc-signup-rise w-full max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">{t('signupWelcome')}</h2>
              <p className="mt-1.5 text-sm text-slate-400">{t('signupEyebrow')}</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">{t('signupUserRoleLabel')}</p>
                <div className="grid grid-cols-1 gap-2">
                  {ROLE_OPTIONS.map(({ role, emoji, titleKey, descKey }) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        formData.userRole === role
                          ? 'border-cyan-400/50 bg-cyan-500/10 ring-1 ring-cyan-400/30'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <span className="font-semibold text-slate-100">
                        {emoji} {t(titleKey)}
                      </span>
                      <span className="block text-xs text-slate-400 mt-0.5">{t(descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {showPathChoice && (
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">{t('signupPathLabel')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, signupMode: SignupMode.TEAM }))}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        formData.signupMode !== SignupMode.INDEPENDENT
                          ? 'border-cyan-400/50 bg-cyan-500/10 ring-1 ring-cyan-400/30'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <span className="font-semibold text-slate-100">🏁 {t('signupPathTeam')}</span>
                      <span className="block text-xs text-slate-400 mt-0.5">{t('signupPathTeamDesc')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, signupMode: SignupMode.INDEPENDENT }))}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        formData.signupMode === SignupMode.INDEPENDENT
                          ? 'border-emerald-400/60 bg-emerald-500/15 ring-1 ring-emerald-400/40'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <span className="font-semibold text-slate-100">🌟 {t('signupPathIndependent')}</span>
                      <span className="block text-xs text-slate-400 mt-0.5">{t('signupPathIndependentDesc')}</span>
                    </button>
                  </div>
                </div>
              )}

              <h3 className="text-base font-semibold text-slate-200">{t('signupYourInfo')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-firstName" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                    {t('signupFirstName')}
                  </label>
                  <input
                    id="signup-firstName"
                    type="text"
                    name="firstName"
                    placeholder={t('signupFirstName')}
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="signup-lastName" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                    {t('signupLastName')}
                  </label>
                  <input
                    id="signup-lastName"
                    type="text"
                    name="lastName"
                    placeholder={t('signupLastName')}
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                  {t('loginEmailLabel')}
                </label>
                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  placeholder={t('loginEmailPlaceholder')}
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="signup-birthDate" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                  {t('signupBirthDatePlaceholder')}
                </label>
                <input
                  id="signup-birthDate"
                  type="date"
                  name="birthDate"
                  required
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label htmlFor="signup-sex" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                  {t('sexMale')} / {t('sexFemale')}
                </label>
                <select
                  id="signup-sex"
                  name="sex"
                  value={formData.sex || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                >
                  <option value="" className="bg-slate-900">{t('sexMale')} / {t('sexFemale')} (optionnel)</option>
                  <option value={Sex.MALE} className="bg-slate-900">{t('sexMale')}</option>
                  <option value={Sex.FEMALE} className="bg-slate-900">{t('sexFemale')}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                    {t('signupPasswordPlaceholder')}
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    name="password"
                    placeholder={t('signupPasswordPlaceholder')}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="signup-confirmPassword" className="block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                    {t('signupConfirmPasswordPlaceholder')}
                  </label>
                  <input
                    id="signup-confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder={t('signupConfirmPasswordPlaceholder')}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-300 text-center bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl text-white text-sm font-bold py-3.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isLoading
                    ? undefined
                    : 'linear-gradient(135deg, #0891b2 0%, #7c3aed 55%, #c026d3 100%)',
                  boxShadow: isLoading ? undefined : '0 12px 32px rgba(124, 58, 237, 0.35)',
                }}
              >
                {isLoading ? t('signupCreatingButton') : t('signupCreateAccountButton')}
              </button>
            </form>

            <div className="pt-4 border-t border-white/[0.06] text-sm text-center text-slate-400">
              {t('signupAlreadyAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-fuchsia-300 hover:text-fuchsia-200"
              >
                {t('signupLoginLink')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    </div>
  );
};

export default SignupView;

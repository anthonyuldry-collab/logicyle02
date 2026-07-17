import React, { useState } from 'react';
import ActionButton from '../components/ActionButton';
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

  return (
    <div
      className="flex items-center justify-center min-h-screen relative"
      style={{ backgroundColor: 'var(--theme-primary-bg)' }}
    >
      <div className="absolute top-4 right-4">
        <select
          onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
          value={language}
          className="input-field-sm py-1"
          aria-label="Select language"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-700">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full max-w-lg p-6 sm:p-8 space-y-6 bg-slate-800 bg-opacity-80 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-400 mb-2">
            {t('signupStep1')}
          </p>
          <h1 className="text-3xl font-bold text-slate-100">🚴 {t('signupWelcome')}</h1>
          <p className="mt-2 text-sm text-slate-300">{t('signupSlogan')}</p>
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
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    formData.userRole === role
                      ? 'border-blue-400 bg-blue-900/30 ring-1 ring-blue-400'
                      : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
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
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    formData.signupMode !== SignupMode.INDEPENDENT
                      ? 'border-blue-400 bg-blue-900/30 ring-1 ring-blue-400'
                      : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
                  }`}
                >
                  <span className="font-semibold text-slate-100">🏁 {t('signupPathTeam')}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{t('signupPathTeamDesc')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, signupMode: SignupMode.INDEPENDENT }))}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    formData.signupMode === SignupMode.INDEPENDENT
                      ? 'border-emerald-400 bg-emerald-900/30 ring-1 ring-emerald-400'
                      : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
                  }`}
                >
                  <span className="font-semibold text-slate-100">🌟 {t('signupPathIndependent')}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{t('signupPathIndependentDesc')}</span>
                </button>
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold text-slate-200">{t('signupYourInfo')}</h3>

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
                className="input-field-sm w-full"
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
                className="input-field-sm w-full"
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
              className="input-field-sm w-full"
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
              className="input-field-sm w-full"
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
              className="input-field-sm w-full"
            >
              <option value="">{t('sexMale')} / {t('sexFemale')} (optionnel)</option>
              <option value={Sex.MALE}>{t('sexMale')}</option>
              <option value={Sex.FEMALE}>{t('sexFemale')}</option>
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
                className="input-field-sm w-full"
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
                className="input-field-sm w-full"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <ActionButton type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('signupCreatingButton') : t('signupCreateAccountButton')}
          </ActionButton>
        </form>

        <div className="text-sm text-center text-slate-400">
          {t('signupAlreadyAccount')}{' '}
          <button onClick={onSwitchToLogin} className="font-medium text-blue-400 hover:text-blue-300">
            {t('signupLoginLink')}
          </button>
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

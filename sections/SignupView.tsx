import React, { useMemo, useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { LANGUAGE_OPTIONS } from '../constants';
import { Sex, UserRole, SignupMode, StaffRole, SubscriptionPlanId } from '../types';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';
import { SignupPlanComparisonTable } from '../components/SignupPlanComparisonTable';
import { STAFF_ROLE_KEYS, getStaffRoleDisplayLabel, resolveStaffRole } from '../utils/staffRoleUtils';
import {
  SUBSCRIPTION_PLANS,
  INDEPENDENT_PLANS,
  getIndependentPlanIdForRole,
} from '../constants/subscriptionPlans';

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  userRole: UserRole;
  birthDate: string;
  sex?: Sex | 'male' | 'female';
  /** Obligatoire pour Manager — nom de l’équipe à créer */
  teamName?: string;
  /** Obligatoire pour Partner — nom de l’entreprise / sponsor */
  sponsorName?: string;
  /** Obligatoire pour Staff — fonction (DS, mécano, kiné…) */
  staffRole?: StaffRole | string;
  /** Formule choisie (Manager équipe ou Indépendant) — requis pour accéder à l’app */
  planId?: SubscriptionPlanId;
  /** Intervalle de facturation choisi à l’inscription (mensuel / annuel) */
  billingInterval?: 'month' | 'year';
  /** Mineurs : autorisation parentale / tuteur */
  parentalConsentAccepted?: boolean;
  acceptLegalConsent?: boolean;
  signupMode?: SignupMode;
}

interface SignupViewProps {
  onRegister: (data: SignupData) => Promise<{ success: boolean; message: string }>;
  onSwitchToLogin: () => void;
}

type StepId = 'role' | 'path' | 'plan' | 'account';

const ROLE_OPTIONS: {
  role: UserRole;
  titleKey: 'signupRoleAthlete' | 'signupRoleStaff' | 'signupTabCreate' | 'signupRolePartner';
  descKey: 'signupRoleAthleteDesc' | 'signupRoleStaffDesc' | 'signupRoleManagerDesc' | 'signupRolePartnerDesc';
}[] = [
  { role: UserRole.COUREUR, titleKey: 'signupRoleAthlete', descKey: 'signupRoleAthleteDesc' },
  { role: UserRole.STAFF, titleKey: 'signupRoleStaff', descKey: 'signupRoleStaffDesc' },
  { role: UserRole.PARTNER, titleKey: 'signupRolePartner', descKey: 'signupRolePartnerDesc' },
  { role: UserRole.MANAGER, titleKey: 'signupTabCreate', descKey: 'signupRoleManagerDesc' },
];

const TEAM_PLAN_OPTIONS = SUBSCRIPTION_PLANS.filter((p) => !p.contactSales);

const SignupView: React.FC<SignupViewProps> = ({ onRegister, onSwitchToLogin }) => {
  const [stepId, setStepId] = useState<StepId>('role');
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    userRole: UserRole.COUREUR,
    birthDate: '',
    sex: undefined,
    teamName: '',
    sponsorName: '',
    staffRole: undefined,
    planId: undefined,
    billingInterval: 'year',
    signupMode: SignupMode.TEAM,
  });
  const isManager = formData.userRole === UserRole.MANAGER;
  const isPartner = formData.userRole === UserRole.PARTNER;
  const isStaff = formData.userRole === UserRole.STAFF;
  const [confirmPassword, setConfirmPassword] = useState('');
  const [parentalConsent, setParentalConsent] = useState(false);
  const [error, setError] = useState('');
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const { t, language, setLanguage } = useTranslations();

  const needsPathChoice =
    formData.userRole !== UserRole.MANAGER && formData.userRole !== UserRole.PARTNER;
  const isIndependentPath =
    needsPathChoice && formData.signupMode === SignupMode.INDEPENDENT;
  const needsPlanChoice = isManager || isIndependentPath;

  const steps = useMemo((): StepId[] => {
    const list: StepId[] = ['role'];
    if (needsPathChoice) list.push('path');
    list.push('account');
    if (needsPlanChoice) list.push('plan');
    return list;
  }, [needsPathChoice, needsPlanChoice]);

  const stepIndex = Math.max(1, steps.indexOf(stepId) + 1);
  const totalSteps = steps.length;

  const availablePlans = useMemo(() => {
    if (isManager) return TEAM_PLAN_OPTIONS;
    if (isIndependentPath) {
      const id = getIndependentPlanIdForRole(formData.userRole);
      return INDEPENDENT_PLANS.filter((p) => p.id === id);
    }
    return [];
  }, [isManager, isIndependentPath, formData.userRole]);

  const handleRoleSelect = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      userRole: role,
      staffRole: role === UserRole.STAFF ? prev.staffRole : undefined,
      planId: undefined,
      signupMode: role === UserRole.MANAGER || role === UserRole.PARTNER
        ? SignupMode.TEAM
        : prev.signupMode ?? SignupMode.TEAM,
    }));
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const computeAge = (isoDate: string): number | null => {
    const birthDate = new Date(isoDate);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  };

  const validateAccountFields = (requirePlan: boolean): string | null => {
    if (!formData.firstName.trim()) return t('signupFirstNameRequired');
    if (!formData.lastName.trim()) return t('signupLastNameRequired');
    if (!formData.email.trim()) return t('signupEmailRequired');
    if (!formData.birthDate) return t('signupBirthDateRequired');

    const age = computeAge(formData.birthDate);
    if (age === null) return t('signupBirthDateInvalid');
    if (age < 10 || age > 100) return t('signupAgeRange');
    if (age < 18 && !parentalConsent) return t('signupParentalConsentRequired');

    if (formData.sex !== Sex.MALE && formData.sex !== Sex.FEMALE) {
      return t('signupSexRequired');
    }
    if (isManager && !formData.teamName?.trim()) {
      return t('signupTeamNameRequired');
    }
    if (isPartner && !formData.sponsorName?.trim()) {
      return t('signupSponsorNameRequired');
    }
    if (isStaff && !resolveStaffRole(formData.staffRole)) {
      return t('signupStaffRoleRequired');
    }
    if (requirePlan && needsPlanChoice) {
      if (!formData.planId) return t('signupPlanRequired');
      if (formData.billingInterval !== 'month' && formData.billingInterval !== 'year') {
        return t('signupPlanIntervalRequired');
      }
    }
    if (formData.password.length < 8) return t('signupPasswordTooShort');
    if (formData.password !== confirmPassword) return t('signupPasswordsMismatch');
    return null;
  };

  const validatePlanStep = (): string | null => {
    if (!formData.planId) return t('signupPlanRequired');
    if (formData.billingInterval !== 'month' && formData.billingInterval !== 'year') {
      return t('signupPlanIntervalRequired');
    }
    if (isIndependentPath) {
      const expected = getIndependentPlanIdForRole(formData.userRole);
      if (formData.planId !== expected) return t('signupPlanRequired');
    }
    if (isManager && !TEAM_PLAN_OPTIONS.some((p) => p.id === formData.planId)) {
      return t('signupPlanRequired');
    }
    return null;
  };

  const goNext = () => {
    setError('');
    if (stepId === 'path' && formData.signupMode === SignupMode.INDEPENDENT) {
      const autoPlan = getIndependentPlanIdForRole(formData.userRole);
      setFormData((prev) => ({ ...prev, planId: prev.planId ?? autoPlan }));
    }
    if (stepId === 'account' && isIndependentPath && !formData.planId) {
      const autoPlan = getIndependentPlanIdForRole(formData.userRole);
      setFormData((prev) => ({ ...prev, planId: autoPlan }));
    }
    const idx = steps.indexOf(stepId);
    if (idx >= 0 && idx < steps.length - 1) {
      setStepId(steps[idx + 1]);
    }
  };

  const goBack = () => {
    setError('');
    const idx = steps.indexOf(stepId);
    if (idx > 0) setStepId(steps[idx - 1]);
  };

  const submitRegistration = async () => {
    const validationError = validateAccountFields(needsPlanChoice);
    if (validationError) {
      setError(validationError);
      setShowLoginHint(false);
      return;
    }
    if (needsPlanChoice) {
      const planError = validatePlanStep();
      if (planError) {
        setError(planError);
        return;
      }
    }
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
      return;
    }

    const age = computeAge(formData.birthDate);
    setIsLoading(true);
    setShowLoginHint(false);
    try {
      const result = await onRegister({
        ...formData,
        billingInterval: formData.billingInterval ?? 'year',
        acceptLegalConsent: true,
        parentalConsentAccepted: age !== null && age < 18 ? parentalConsent : undefined,
      });
      if (result && !result.success) {
        setError(result.message);
        setShowLoginHint(result.message.includes('déjà utilisée') || result.message.toLowerCase().includes('already'));
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
    if (needsPlanChoice && stepId === 'account') {
      const validationError = validateAccountFields(false);
      if (validationError) {
        setError(validationError);
        setShowLoginHint(false);
        return;
      }
      if (!hasAcceptedTerms) {
        setShowTermsModal(true);
        return;
      }
      goNext();
      return;
    }
    await submitRegistration();
  };

  const handleAcceptTerms = async () => {
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    if (needsPlanChoice && stepId === 'account') {
      const validationError = validateAccountFields(false);
      if (validationError) {
        setError(validationError);
        return;
      }
      goNext();
      return;
    }
    await submitRegistration();
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setError(t('signupTermsRequired'));
  };

  const inputClass =
    'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/30 transition';

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1.5';

  const stepTitle =
    stepId === 'role'
      ? t('signupStepRole')
      : stepId === 'path'
        ? t('signupStepPath')
        : stepId === 'plan'
          ? t('signupStepPlan')
          : t('signupStepAccount');

  return (
    <div
      className={`lc-signup relative min-h-screen text-white ${
        stepId === 'plan' && needsPlanChoice ? 'overflow-x-hidden' : 'overflow-hidden'
      }`}
    >
      <style>{`
        @keyframes lc-signup-rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-signup-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lc-signup-spin-rev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes lc-signup-mark-in {
          from { opacity: 0; transform: translate(-8%, 12%) scale(0.96); }
          to { opacity: 1; transform: translate(0, 0) scale(1); }
        }
        @keyframes lc-signup-glow {
          0%, 100% { opacity: 0.32; }
          50% { opacity: 0.52; }
        }
        .lc-signup-rise { animation: lc-signup-rise 0.55s ease-out both; }
        .lc-signup-mark-wrap {
          position: absolute;
          z-index: 0;
          left: -18%;
          bottom: -28vh;
          height: 120vh;
          width: auto;
          aspect-ratio: 1;
          pointer-events: none;
          opacity: 0;
          animation: lc-signup-mark-in 1s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards;
        }
        .lc-signup-mark-logo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.16;
          user-select: none;
          -webkit-user-drag: none;
        }
        .lc-signup-gear-crown {
          position: absolute;
          inset: 6%;
          width: 88%;
          height: 88%;
          margin: auto;
          opacity: 0.4;
          transform-origin: 50% 50%;
          animation: lc-signup-spin 48s linear infinite;
        }
        .lc-signup-mark-glow {
          position: absolute;
          inset: 18%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.26) 0%, transparent 70%);
          filter: blur(28px);
          animation: lc-signup-glow 5s ease-in-out infinite;
        }
        .lc-signup-right {
          position: absolute;
          z-index: 0;
          right: -10%;
          top: 6%;
          width: min(48vw, 480px);
          height: min(48vw, 480px);
          pointer-events: none;
          opacity: 0.7;
        }
        .lc-signup-right-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(129, 140, 248, 0.2);
        }
        .lc-signup-right-ring--spin { animation: lc-signup-spin-rev 70s linear infinite; }
        .lc-signup-right-ring--2 {
          inset: 14%;
          border-color: rgba(99, 102, 241, 0.14);
          border-style: dashed;
          animation: lc-signup-spin 90s linear infinite;
        }
        @media (max-width: 640px) {
          .lc-signup-mark-wrap {
            left: -40%;
            bottom: -18vh;
            height: 95vh;
          }
          .lc-signup-mark-logo { opacity: 0.1; }
          .lc-signup-right { display: none; }
        }
      `}</style>

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

      <div className="lc-signup-mark-wrap" aria-hidden>
        <div className="lc-signup-mark-glow" />
        <svg className="lc-signup-gear-crown" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="92" stroke="rgba(129,140,248,0.55)" strokeWidth="1.4" strokeDasharray="7 11" />
          <circle cx="100" cy="100" r="84" stroke="rgba(99,102,241,0.28)" strokeWidth="1" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={100 + 88 * Math.cos(a)}
                y1={100 + 88 * Math.sin(a)}
                x2={100 + 96 * Math.cos(a)}
                y2={100 + 96 * Math.sin(a)}
                stroke="rgba(165,180,252,0.7)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <img src="/icons/logicycle-logo.png" alt="" className="lc-signup-mark-logo" />
      </div>

      <div className="lc-signup-right" aria-hidden>
        <div
          className="absolute inset-[-10%] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(14,165,233,0.06) 40%, transparent 70%)',
          }}
        />
        <div className="lc-signup-right-ring lc-signup-right-ring--spin" />
        <div className="lc-signup-right-ring lc-signup-right-ring--2" />
      </div>

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

      <div
        className={
          stepId === 'plan' && needsPlanChoice
            ? 'relative z-10 w-full px-3 sm:px-5 lg:px-8 py-5 sm:py-7'
            : 'relative z-10 min-h-screen flex flex-col items-center justify-center px-3 sm:px-6 py-8 sm:py-12'
        }
      >
        <div
          className={`lc-signup-rise w-full flex flex-col ${
            stepId === 'plan' && needsPlanChoice
              ? 'max-w-none items-stretch text-left'
              : 'max-w-xl items-center text-center'
          }`}
        >
          {!(stepId === 'plan' && needsPlanChoice && availablePlans.length > 1) && (
            <>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]"
                style={{ letterSpacing: '-0.045em' }}
              >
                LOGICYCLE
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-md leading-relaxed">
                {t('signupSlogan')}
              </p>
            </>
          )}

          <div
            className={
              stepId === 'plan' && needsPlanChoice
                ? 'mt-0 w-full rounded-2xl sm:rounded-3xl border border-white/12 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-black/40 text-left p-3 sm:p-5 lg:p-6'
                : 'mt-6 sm:mt-8 w-full rounded-3xl border border-white/12 bg-slate-900/65 backdrop-blur-xl shadow-2xl shadow-black/40 text-left p-5 sm:p-8'
            }
          >
            <div className="mb-5 sm:mb-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold text-white">{t('signupWelcome')}</h2>
                <span className="shrink-0 text-xs font-medium text-slate-400 tabular-nums">
                  {stepIndex}/{totalSteps}
                </span>
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < stepIndex ? 'bg-indigo-400' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm text-slate-400">{stepTitle}</p>
            </div>

            {/* Étape — Rôle */}
            {stepId === 'role' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ROLE_OPTIONS.map(({ role, titleKey, descKey }) => {
                    const selected = formData.userRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleSelect(role)}
                        className={`text-left rounded-2xl border p-3.5 transition-colors ${
                          selected
                            ? 'border-indigo-400/60 bg-indigo-500/15 ring-1 ring-indigo-400/35'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                        }`}
                      >
                        <span className="block font-semibold text-slate-100 text-sm">{t(titleKey)}</span>
                        <span className="block text-xs text-slate-400 mt-1 leading-snug">{t(descKey)}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold py-3.5 shadow-lg shadow-indigo-950/50 transition-colors"
                >
                  {t('signupContinue')}
                </button>
              </div>
            )}

            {/* Étape — Parcours */}
            {stepId === 'path' && needsPathChoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        signupMode: SignupMode.TEAM,
                        planId: undefined,
                      }))
                    }
                    className={`text-left rounded-2xl border p-4 transition-colors ${
                      formData.signupMode !== SignupMode.INDEPENDENT
                        ? 'border-indigo-400/60 bg-indigo-500/15 ring-1 ring-indigo-400/35'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}
                  >
                    <span className="block font-semibold text-slate-100">{t('signupPathTeam')}</span>
                    <span className="block text-xs text-slate-400 mt-1">{t('signupPathTeamDesc')}</span>
                    <span className="block text-xs text-indigo-300/90 mt-2">{t('signupPathTeamBillingNote')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const autoPlan = getIndependentPlanIdForRole(formData.userRole);
                      setFormData((prev) => ({
                        ...prev,
                        signupMode: SignupMode.INDEPENDENT,
                        planId: autoPlan,
                      }));
                    }}
                    className={`text-left rounded-2xl border p-4 transition-colors ${
                      formData.signupMode === SignupMode.INDEPENDENT
                        ? 'border-sky-400/55 bg-sky-500/12 ring-1 ring-sky-400/30'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}
                  >
                    <span className="block font-semibold text-slate-100">{t('signupPathIndependent')}</span>
                    <span className="block text-xs text-slate-400 mt-1">{t('signupPathIndependentDesc')}</span>
                    <span className="block text-xs text-sky-300/90 mt-2">{t('signupPathIndependentBillingNote')}</span>
                  </button>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-semibold py-3.5 transition-colors"
                  >
                    {t('signupBack')}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-[1.4] rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold py-3.5 shadow-lg shadow-indigo-950/50 transition-colors"
                  >
                    {t('signupContinue')}
                  </button>
                </div>
              </div>
            )}

            {/* Étape — Formule + paiement (étape finale Manager / Indépendant) */}
            {stepId === 'plan' && needsPlanChoice && (
              <div className="space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {t('signupPlanIntro')}
                </p>

                <div className="inline-flex rounded-xl border border-white/15 bg-white/[0.04] p-1 gap-1">
                  {(['month', 'year'] as const).map((interval) => {
                    const active = (formData.billingInterval ?? 'year') === interval;
                    return (
                      <button
                        key={interval}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, billingInterval: interval }))
                        }
                        className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                          active
                            ? 'bg-indigo-500 text-white shadow'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {interval === 'month'
                          ? t('pricingBillingMonthly')
                          : t('pricingBillingAnnual')}
                      </button>
                    );
                  })}
                </div>

                <SignupPlanComparisonTable
                  plans={availablePlans}
                  selectedPlanId={formData.planId}
                  billingInterval={formData.billingInterval ?? 'year'}
                  onSelect={(planId) => setFormData((prev) => ({ ...prev, planId }))}
                  language={language === 'en' ? 'en' : 'fr'}
                  t={t}
                />

                <p className="text-xs text-slate-400">{t('signupPlanTrialNote')}</p>
                <p className="text-xs text-slate-400">{t('signupPlanCardNote')}</p>

                {error && (
                  <p className="text-sm text-red-300 text-center bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2.5 max-w-lg mx-auto w-full pt-1">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isLoading}
                    className="flex-1 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-200 text-sm font-semibold py-3.5 transition-colors"
                  >
                    {t('signupBack')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitRegistration()}
                    disabled={isLoading}
                    className="flex-[1.6] rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-300 text-white text-sm font-bold py-3.5 shadow-lg shadow-indigo-950/50 transition-colors"
                  >
                    {isLoading ? t('signupCreatingButton') : t('signupPlanPayCta')}
                  </button>
                </div>
              </div>
            )}

            {/* Étape — Compte */}
            {stepId === 'account' && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-firstName" className={labelClass}>
                      {t('signupFirstName')} *
                    </label>
                    <input
                      id="signup-firstName"
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder={t('signupFirstName')}
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-lastName" className={labelClass}>
                      {t('signupLastName')} *
                    </label>
                    <input
                      id="signup-lastName"
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder={t('signupLastName')}
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className={labelClass}>
                    {t('loginEmailLabel')} *
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder={t('loginEmailPlaceholder')}
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={inputClass}
                  />
                </div>

                {isManager && (
                  <div>
                    <label htmlFor="signup-teamName" className={labelClass}>
                      {t('signupTeamNameLabel')} *
                    </label>
                    <input
                      id="signup-teamName"
                      type="text"
                      name="teamName"
                      autoComplete="organization"
                      placeholder={t('signupTeamNamePlaceholder')}
                      required
                      value={formData.teamName || ''}
                      onChange={handleInputChange}
                      className={inputClass}
                    />
                  </div>
                )}

                {isPartner && (
                  <div>
                    <label htmlFor="signup-sponsorName" className={labelClass}>
                      {t('signupSponsorNameLabel')} *
                    </label>
                    <input
                      id="signup-sponsorName"
                      type="text"
                      name="sponsorName"
                      autoComplete="organization"
                      placeholder={t('signupSponsorNamePlaceholder')}
                      required
                      value={formData.sponsorName || ''}
                      onChange={handleInputChange}
                      className={inputClass}
                    />
                  </div>
                )}

                {isStaff && (
                  <div>
                    <label htmlFor="signup-staffRole" className={labelClass}>
                      {t('signupStaffRoleLabel')} *
                    </label>
                    <select
                      id="signup-staffRole"
                      name="staffRole"
                      required
                      value={formData.staffRole || ''}
                      onChange={handleInputChange}
                      className={inputClass}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="" className="bg-slate-900">
                        {t('signupStaffRolePlaceholder')}
                      </option>
                      {STAFF_ROLE_KEYS.map((key) => (
                        <option key={key} value={key} className="bg-slate-900">
                          {getStaffRoleDisplayLabel(key)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-400">{t('signupStaffRoleHint')}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-birthDate" className={labelClass}>
                      {t('signupBirthDatePlaceholder')} *
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
                    <p id="signup-sex-label" className={labelClass}>
                      {t('signupSexLabel')} *
                    </p>
                    <div
                      role="radiogroup"
                      aria-labelledby="signup-sex-label"
                      className="grid grid-cols-2 gap-2"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={formData.sex === Sex.MALE}
                        onClick={() => setFormData((prev) => ({ ...prev, sex: Sex.MALE }))}
                        className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                          formData.sex === Sex.MALE
                            ? 'border-indigo-400/60 bg-indigo-500/20 text-white ring-1 ring-indigo-400/40'
                            : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {t('sexMale')}
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={formData.sex === Sex.FEMALE}
                        onClick={() => setFormData((prev) => ({ ...prev, sex: Sex.FEMALE }))}
                        className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                          formData.sex === Sex.FEMALE
                            ? 'border-indigo-400/60 bg-indigo-500/20 text-white ring-1 ring-indigo-400/40'
                            : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {t('sexFemale')}
                      </button>
                    </div>
                  </div>
                </div>

                {(() => {
                  const age = formData.birthDate ? computeAge(formData.birthDate) : null;
                  if (age === null || age >= 18) return null;
                  return (
                    <label className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                      <input
                        type="checkbox"
                        checked={parentalConsent}
                        onChange={(e) => setParentalConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300"
                      />
                      <span>{t('signupParentalConsentLabel')}</span>
                    </label>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-password" className={labelClass}>
                      {t('signupPasswordPlaceholder')} *
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-confirmPassword" className={labelClass}>
                      {t('signupConfirmPasswordPlaceholder')} *
                    </label>
                    <input
                      id="signup-confirmPassword"
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-300 text-center bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2 space-y-2">
                    <p>{error}</p>
                    {showLoginHint && (
                      <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="font-semibold text-indigo-300 hover:text-indigo-200 underline"
                      >
                        {t('signupGoToLogin')}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isLoading}
                    className="flex-1 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-200 text-sm font-semibold py-3.5 transition-colors"
                  >
                    {t('signupBack')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[1.6] rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 shadow-lg shadow-indigo-950/50 transition-colors"
                  >
                    {isLoading
                      ? t('signupCreatingButton')
                      : needsPlanChoice
                        ? t('signupContinue')
                        : t('signupCreateAccountButton')}
                  </button>
                </div>
              </form>
            )}

            {error && stepId !== 'account' && stepId !== 'plan' && (
              <p className="mt-4 text-sm text-red-300 text-center bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-6 pt-5 border-t border-white/10 text-sm text-center text-slate-300">
              {t('signupAlreadyAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-indigo-300 hover:text-indigo-200"
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

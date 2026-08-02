import React, { useState } from 'react';
import {
  User,
  UserRole,
  ScoutingRequest,
  ScoutingRequestStatus,
  Team,
  ScoutingDataScope,
  Sex,
  Address,
  StaffMember,
  IndependentBusinessProfile,
  IndependentLegalForm,
  IndependentVatRegime,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import ScoutingRequestResponseCard from '../components/ScoutingRequestResponseCard';
import ScoutingActiveConsentCard from '../components/ScoutingActiveConsentCard';
import StaffCareerProfileTab from '../components/staffDetailTabs/StaffCareerProfileTab';
import { isContactScoutingRequest, isActiveScoutingConsent } from '../utils/scoutingProspectUtils';
import { useTranslations } from '../hooks/useTranslations';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import { ALL_COUNTRIES } from '../constants';
import { userToStaffProfile } from '../utils/independentUtils';
import {
  getStaffRoleDisplayLabel,
  isStaffRoleAutre,
  STAFF_ROLE_KEYS,
} from '../utils/staffRoleUtils';
import {
  CvExtractError,
  extractProfileFromCv,
  isCvExtractSupported,
} from '../services/cvProfileExtractService';
import {
  mergeCvExtractIntoStaff,
  summarizeCvExtract,
} from '../utils/cvProfileMergeUtils';
import {
  isMissionMarketplacePaymentsEnabled,
  MISSION_COMMISSION_LABELS,
} from '../constants/missionMarketplace';
import { startMissionConnectOnboarding, createMissionConnectAccount } from '../services/missionConnectService';

const LEGAL_FORM_OPTIONS: { value: IndependentLegalForm; label: string }[] = [
  { value: 'micro', label: 'Micro-entreprise' },
  { value: 'ei', label: 'Entreprise individuelle (EI)' },
  { value: 'eurl', label: 'EURL' },
  { value: 'sarl', label: 'SARL' },
  { value: 'sasu', label: 'SASU' },
  { value: 'sas', label: 'SAS' },
  { value: 'other', label: 'Autre forme' },
];

const VAT_REGIME_OPTIONS: { value: IndependentVatRegime; label: string }[] = [
  { value: 'franchise_293b', label: 'Franchise en base (art. 293 B CGI)' },
  { value: 'tva_reelle', label: 'Assujetti TVA (régime réel)' },
  { value: 'unknown', label: 'Je ne sais pas encore' },
];

const emptyBusiness = (): IndependentBusinessProfile => ({
  legalName: '',
  tradeName: '',
  legalForm: undefined,
  siret: '',
  vatNumber: '',
  addressLine: '',
  postalCode: '',
  city: '',
  country: 'FR',
  vatRegime: 'unknown',
  notes: '',
});

interface IndependentSpaceSectionProps {
  currentUser: User;
  teams: Team[];
  scoutingRequests: ScoutingRequest[];
  subscriptionAccess?: SubscriptionAccess;
  onUpgradePlan?: () => void;
  onManageBilling?: () => void;
  onUpdateProfile: (updates: Partial<User>) => Promise<void>;
  onRespondToScoutingRequest: (
    requestId: string,
    response: 'accepted' | 'rejected',
    grantedScopes?: ScoutingDataScope[],
    options?: { teamName?: string; language?: 'fr' | 'en' },
  ) => Promise<void>;
  onWithdrawScoutingConsent?: (requestId: string) => Promise<void>;
  onGoToLobby: () => void;
}

const IndependentSpaceSection: React.FC<IndependentSpaceSectionProps> = ({
  currentUser,
  teams,
  scoutingRequests,
  subscriptionAccess,
  onUpgradePlan,
  onManageBilling,
  onUpdateProfile,
  onRespondToScoutingRequest,
  onWithdrawScoutingConsent,
  onGoToLobby,
}) => {
  const { t, language } = useTranslations();
  const isRider =
    currentUser.userRole === UserRole.COUREUR ||
    String(currentUser.userRole).toLowerCase() === 'coureur';
  const hasActiveSub = subscriptionAccess?.isActive ?? false;
  const isExpired = subscriptionAccess?.isExpired ?? false;
  const [professionalSummary, setProfessionalSummary] = useState(currentUser.professionalSummary || '');
  const [careerAspirations, setCareerAspirations] = useState(currentUser.careerAspirations || '');
  const [skillsText, setSkillsText] = useState((currentUser.skills || []).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchable, setIsSearchable] = useState(currentUser.isSearchable ?? false);
  const [openToMissions, setOpenToMissions] = useState(currentUser.openToExternalMissions ?? false);
  const [careerForm, setCareerForm] = useState<StaffMember>(() => userToStaffProfile(currentUser));
  const [careerSaving, setCareerSaving] = useState(false);
  const [careerFeedback, setCareerFeedback] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string>(
    currentUser.staffRole || careerForm.role || 'AUTRE',
  );
  const [staffRoleOtherLabel, setStaffRoleOtherLabel] = useState(
    currentUser.staffRoleOtherLabel || '',
  );
  const [business, setBusiness] = useState<IndependentBusinessProfile>(() => ({
    ...emptyBusiness(),
    ...(currentUser.business || {}),
  }));
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessFeedback, setBusinessFeedback] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectFeedback, setConnectFeedback] = useState<string | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(
    Boolean(currentUser.stripeConnectPayoutsEnabled),
  );

  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [birthDate, setBirthDate] = useState(currentUser.birthDate || currentUser.signupInfo?.birthDate || '');
  const [sex, setSex] = useState(currentUser.sex || currentUser.signupInfo?.sex || '');
  const [nationality, setNationality] = useState(
    currentUser.nationality || currentUser.signupInfo?.nationality || ''
  );
  const [address, setAddress] = useState<Address>(currentUser.address || {});
  const [emergencyContactName, setEmergencyContactName] = useState(currentUser.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(currentUser.emergencyContactPhone || '');
  const [cvFileName, setCvFileName] = useState(currentUser.cvFileName || '');
  const [cvMimeType, setCvMimeType] = useState(currentUser.cvMimeType || '');
  const [cvFileBase64, setCvFileBase64] = useState(currentUser.cvFileBase64 || '');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [cvExtractStatus, setCvExtractStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cvExtractMessage, setCvExtractMessage] = useState<string | null>(null);

  const myRequests = scoutingRequests.filter(
    (r) =>
      r.athleteId === currentUser.id &&
      r.status === ScoutingRequestStatus.PENDING &&
      isContactScoutingRequest(r),
  );

  const myActiveConsents = scoutingRequests.filter(
    (r) => r.athleteId === currentUser.id && isActiveScoutingConsent(r),
  );

  const getTeamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name || teamId;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile({
        professionalSummary,
        careerAspirations,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCareer = async (options?: { includeCv?: boolean; silent?: boolean }) => {
    setCareerSaving(true);
    setCareerFeedback(null);
    try {
      const payload: Partial<User> = {
        professionalSummary: careerForm.professionalSummary,
        defaultApplicationMessage: careerForm.defaultApplicationMessage,
        experienceYears: careerForm.experienceYears,
        certifications: careerForm.certifications || [],
        skills: careerForm.skills || [],
        workHistory: careerForm.workHistory || [],
        education: careerForm.education || [],
        languages: careerForm.languages || [],
        staffRole: careerForm.role || staffRole,
      };
      if (options?.includeCv !== false) {
        payload.cvFileName = cvFileName || undefined;
        payload.cvMimeType = cvMimeType || undefined;
        payload.cvFileBase64 = cvFileBase64 || undefined;
      }
      await onUpdateProfile(payload);
      if (!options?.silent) {
        setCareerFeedback('Profil professionnel enregistré.');
      }
    } finally {
      setCareerSaving(false);
    }
  };

  const handleCareerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCareerForm((prev) => ({ ...prev, [name]: value === '' ? undefined : value }));
  };

  const handleSaveAdmin = async () => {
    setAdminSaving(true);
    setAdminFeedback(null);
    try {
      if (!isRider && isStaffRoleAutre(staffRole) && !staffRoleOtherLabel.trim()) {
        setAdminFeedback('Précisez la fonction « Autre » (obligatoire).');
        setAdminSaving(false);
        return;
      }
      await onUpdateProfile({
        firstName,
        lastName,
        phone,
        birthDate: birthDate || undefined,
        sex: (sex as Sex) || undefined,
        nationality: nationality || undefined,
        address,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        cvFileName: cvFileName || undefined,
        cvMimeType: cvMimeType || undefined,
        cvFileBase64: cvFileBase64 || undefined,
        ...(!isRider
          ? {
              staffRole: staffRole || careerForm.role,
              staffRoleOtherLabel: isStaffRoleAutre(staffRole)
                ? staffRoleOtherLabel.trim() || undefined
                : undefined,
            }
          : {}),
      });
      if (!isRider) {
        setCareerForm((prev) => ({
          ...prev,
          role: staffRole || prev.role,
          customRole: isStaffRoleAutre(staffRole) ? staffRoleOtherLabel.trim() : undefined,
        }));
      }
      setAdminFeedback('Informations enregistrées.');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    setBusinessSaving(true);
    setBusinessFeedback(null);
    try {
      const cleaned: IndependentBusinessProfile = {
        legalName: business.legalName?.trim() || undefined,
        tradeName: business.tradeName?.trim() || undefined,
        legalForm: business.legalForm,
        siret: business.siret?.replace(/\s/g, '') || undefined,
        vatNumber: business.vatNumber?.trim() || undefined,
        addressLine: business.addressLine?.trim() || undefined,
        postalCode: business.postalCode?.trim() || undefined,
        city: business.city?.trim() || undefined,
        country: business.country?.trim() || 'FR',
        vatRegime: business.vatRegime || 'unknown',
        notes: business.notes?.trim() || undefined,
      };
      await onUpdateProfile({ business: cleaned });
      setBusinessFeedback('Dossier société enregistré — utilisé pour vos factures missions.');
    } finally {
      setBusinessSaving(false);
    }
  };

  const handleCvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      window.alert('Le CV doit faire moins de 4 Mo.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const mime = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      const base64 = result.substring(result.indexOf(',') + 1);
      setCvFileName(file.name);
      setCvMimeType(mime);
      setCvFileBase64(base64);

      if (!isRider) {
        if (!isCvExtractSupported(mime, file.name)) {
          setCvExtractStatus('error');
          setCvExtractMessage(
            'CV enregistré. Pour remplir automatiquement le profil pro, utilisez un PDF ou une image.'
          );
          return;
        }
        setCvExtractStatus('loading');
        setCvExtractMessage('Lecture du CV en cours…');
        void extractProfileFromCv({ fileName: file.name, mimeType: mime, base64 })
          .then(async (extracted) => {
            const merged = {
              ...careerForm,
              ...mergeCvExtractIntoStaff(careerForm, extracted),
            };
            setCareerForm(merged);
            setCvExtractStatus('success');
            setCvExtractMessage(
              `${summarizeCvExtract(extracted)} Profil + CV enregistrés automatiquement.`
            );
            try {
              await onUpdateProfile({
                professionalSummary: merged.professionalSummary,
                defaultApplicationMessage: merged.defaultApplicationMessage,
                experienceYears: merged.experienceYears,
                certifications: merged.certifications || [],
                skills: merged.skills || [],
                workHistory: merged.workHistory || [],
                education: merged.education || [],
                languages: merged.languages || [],
                cvFileName: file.name,
                cvMimeType: mime,
                cvFileBase64: base64,
              });
              setCareerFeedback('Profil enrichi depuis le CV et enregistré.');
              setAdminFeedback('CV enregistré avec le profil professionnel.');
            } catch {
              setCareerFeedback(
                'Profil enrichi localement — enregistrez manuellement dossier + profil pro.'
              );
            }
          })
          .catch((err) => {
            setCvExtractStatus('error');
            setCvExtractMessage(
              err instanceof CvExtractError
                ? err.message
                : 'Échec de la lecture automatique du CV.'
            );
          });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVisibilityToggle = async () => {
    if (!hasActiveSub) return;
    if (isRider) {
      const next = !isSearchable;
      setIsSearchable(next);
      await onUpdateProfile({ isSearchable: next });
    } else {
      const next = !openToMissions;
      setOpenToMissions(next);
      await onUpdateProfile({ openToExternalMissions: next });
    }
  };

  const handleConnectOnboarding = async () => {
    setConnectBusy(true);
    setConnectFeedback(null);
    try {
      await startMissionConnectOnboarding();
    } catch (err) {
      setConnectFeedback(
        err instanceof Error ? err.message : 'Impossible de démarrer l’onboarding Stripe Connect.',
      );
      setConnectBusy(false);
    }
  };

  const handleRefreshConnectStatus = async () => {
    setConnectBusy(true);
    setConnectFeedback(null);
    try {
      const { payoutsEnabled: ready } = await createMissionConnectAccount();
      setPayoutsEnabled(ready);
      setConnectFeedback(
        ready
          ? MISSION_COMMISSION_LABELS.connectReady[language]
          : 'Onboarding incomplet — reprenez l’activation Stripe.',
      );
    } catch (err) {
      setConnectFeedback(
        err instanceof Error ? err.message : 'Impossible de vérifier le statut Connect.',
      );
    } finally {
      setConnectBusy(false);
    }
  };

  return (
    <SectionWrapper title={t('independentHubTitle')}>
      <div className="space-y-6">
        {subscriptionAccess && (
          <div
            className={`rounded-lg border p-5 ${
              isExpired
                ? 'border-amber-500/40 bg-amber-950 text-slate-100'
                : subscriptionAccess.isTrial
                  ? 'border-blue-500/40 bg-slate-900 text-slate-100'
                  : 'border-emerald-500/40 bg-slate-900 text-slate-100'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-100">{t('independentSubscriptionTitle')}</p>
                <p className="text-sm text-slate-300 mt-1">
                  {subscriptionAccess.statusLabel[language]}
                  {subscriptionAccess.daysRemaining !== null && subscriptionAccess.daysRemaining <= 7 && (
                    <span className="ml-1 font-medium text-amber-300">
                      — {t('independentSubscriptionEndingSoon')}
                    </span>
                  )}
                </p>
                {isExpired && (
                  <p className="text-sm text-amber-200 mt-2">{t('independentSubscriptionExpired')}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {isExpired && onUpgradePlan && (
                  <ActionButton onClick={onUpgradePlan}>{t('independentSubscribeCta')}</ActionButton>
                )}
                {hasActiveSub && currentUser.subscription?.stripeCustomerId && onManageBilling && (
                  <ActionButton onClick={onManageBilling} variant="secondary">
                    {t('billingManagePortal')}
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        )}

        {!isRider && isMissionMarketplacePaymentsEnabled() && (
          <div className="rounded-lg border border-emerald-500/40 bg-slate-900 p-5 text-slate-100 space-y-3">
            <div>
              <h3 className="font-semibold text-slate-100">
                {MISSION_COMMISSION_LABELS.connectOnboardingCta[language]}
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                {MISSION_COMMISSION_LABELS.connectOnboardingDesc[language]}
              </p>
            </div>
            {payoutsEnabled || currentUser.stripeConnectPayoutsEnabled ? (
              <p className="text-sm text-emerald-300">{MISSION_COMMISSION_LABELS.connectReady[language]}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={handleConnectOnboarding} disabled={connectBusy}>
                  {connectBusy ? '…' : MISSION_COMMISSION_LABELS.connectOnboardingCta[language]}
                </ActionButton>
                {currentUser.stripeConnectAccountId && (
                  <ActionButton
                    onClick={handleRefreshConnectStatus}
                    variant="secondary"
                    disabled={connectBusy}
                  >
                    Vérifier le statut
                  </ActionButton>
                )}
              </div>
            )}
            {connectFeedback && (
              <p className="text-sm text-slate-300">{connectFeedback}</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-blue-500/40 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-slate-100">{t('independentHubWelcome')}</h2>
          <p className="mt-1 text-sm text-slate-300">{t('independentHubDesc')}</p>
          <ActionButton onClick={onGoToLobby} variant="secondary" className="mt-4">
            {t('independentJoinTeamCta')}
          </ActionButton>
        </div>

        {!isRider && (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-slate-100">Dossier administratif</h3>
              <p className="text-sm text-slate-400 mt-1">
                Informations de base et CV visibles par les équipes lors du recrutement.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sexe</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  <option value={Sex.MALE}>Homme</option>
                  <option value={Sex.FEMALE}>Femme</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nationalité</label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                >
                  <option value="">— Nationalité —</option>
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Fonction *</label>
                <select
                  value={staffRole}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStaffRole(value);
                    setCareerForm((prev) => ({ ...prev, role: value }));
                    if (!isStaffRoleAutre(value)) setStaffRoleOtherLabel('');
                  }}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                >
                  {STAFF_ROLE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getStaffRoleDisplayLabel(key)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Alimente le matching missions, le dashboard et les libellés facture. Choisissez la
                  fonction la plus proche ; « Autre » si absente de la liste.
                </p>
              </div>
              {isStaffRoleAutre(staffRole) && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Préciser la fonction *
                  </label>
                  <input
                    type="text"
                    value={staffRoleOtherLabel}
                    onChange={(e) => setStaffRoleOtherLabel(e.target.value)}
                    placeholder="Ex. Agent UCI, Interprète, Électricien vélo…"
                    className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Affiché aux équipes : « Autre — {staffRoleOtherLabel.trim() || '…'} ».
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Adresse</label>
                <input
                  type="text"
                  value={address.streetName || ''}
                  onChange={(e) => setAddress((a) => ({ ...a, streetName: e.target.value }))}
                  placeholder="Rue"
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={address.postalCode || ''}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    placeholder="Code postal"
                    className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={address.city || ''}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    placeholder="Ville"
                    className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Contact d&apos;urgence</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tél. urgence</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">CV (PDF, Word ou image)</label>
                <p className="mb-1 text-[11px] text-slate-400">
                  PDF ou image : remplissage automatique du profil professionnel (compétences, expériences…).
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*,application/pdf"
                  onChange={handleCvUpload}
                  disabled={cvExtractStatus === 'loading'}
                  className="block w-full text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-200"
                />
                {cvFileName && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <span className="truncate font-medium">{cvFileName}</span>
                    <button
                      type="button"
                      className="text-rose-300 text-xs hover:underline"
                      onClick={() => {
                        setCvFileName('');
                        setCvMimeType('');
                        setCvFileBase64('');
                        setCvExtractStatus('idle');
                        setCvExtractMessage(null);
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
                {cvExtractMessage && (
                  <p
                    className={`mt-2 text-xs rounded-md border px-3 py-2 ${
                      cvExtractStatus === 'loading'
                        ? 'border-blue-500/40 bg-slate-900 text-slate-200'
                        : cvExtractStatus === 'success'
                          ? 'border-emerald-500/40 bg-emerald-950 text-emerald-200'
                          : 'border-amber-500/40 bg-amber-950 text-amber-100'
                    }`}
                  >
                    {cvExtractMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {adminFeedback && <p className="text-sm text-emerald-400">{adminFeedback}</p>}
              <ActionButton onClick={handleSaveAdmin} disabled={adminSaving}>
                {adminSaving ? 'Enregistrement…' : 'Enregistrer le dossier'}
              </ActionButton>
            </div>
          </div>
        )}

        {!isRider && (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-slate-100">Ma société / micro</h3>
              <p className="text-sm text-slate-400 mt-1">
                Préremplit vos factures missions (émetteur) et facilite vos déclarations URSSAF.
                Visible uniquement pour la facturation — pas exposé publiquement aux équipes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Raison sociale *</label>
                <input
                  type="text"
                  value={business.legalName || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, legalName: e.target.value }))}
                  placeholder="Nom légal ou micro"
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nom commercial</label>
                <input
                  type="text"
                  value={business.tradeName || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, tradeName: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Forme juridique</label>
                <select
                  value={business.legalForm || ''}
                  onChange={(e) =>
                    setBusiness((b) => ({
                      ...b,
                      legalForm: (e.target.value || undefined) as IndependentLegalForm | undefined,
                    }))
                  }
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  {LEGAL_FORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">SIRET</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={business.siret || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, siret: e.target.value }))}
                  placeholder="14 chiffres"
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">N° TVA (si assujetti)</label>
                <input
                  type="text"
                  value={business.vatNumber || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, vatNumber: e.target.value }))}
                  placeholder="FR…"
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Régime TVA</label>
                <select
                  value={business.vatRegime || 'unknown'}
                  onChange={(e) =>
                    setBusiness((b) => ({
                      ...b,
                      vatRegime: e.target.value as IndependentVatRegime,
                    }))
                  }
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                >
                  {VAT_REGIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Adresse professionnelle</label>
                <input
                  type="text"
                  value={business.addressLine || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, addressLine: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Code postal</label>
                <input
                  type="text"
                  value={business.postalCode || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, postalCode: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Ville</label>
                <input
                  type="text"
                  value={business.city || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, city: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes (RC pro, URSSAF…)</label>
                <textarea
                  value={business.notes || ''}
                  onChange={(e) => setBusiness((b) => ({ ...b, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-white/15 bg-slate-950 text-slate-100 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {businessFeedback && <p className="text-sm text-emerald-400">{businessFeedback}</p>}
              <ActionButton onClick={() => void handleSaveBusiness()} disabled={businessSaving}>
                {businessSaving ? 'Enregistrement…' : 'Enregistrer ma société'}
              </ActionButton>
            </div>
          </div>
        )}

        {isRider ? (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-100 mb-4">Profil professionnel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Présentation</label>
                <textarea
                  value={professionalSummary}
                  onChange={(e) => setProfessionalSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="Décrivez votre parcours, vos expériences..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Objectifs sportifs</label>
                <textarea
                  value={careerAspirations}
                  onChange={(e) => setCareerAspirations(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="Vos ambitions pour la saison..."
                />
              </div>
              <ActionButton onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer le profil'}
              </ActionButton>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-slate-100">Profil professionnel</h3>
              <p className="text-sm text-slate-400 mt-1">
                Présentation, message de candidature, compétences, expérience, certifications et
                langues.
              </p>
            </div>
            <StaffCareerProfileTab
              formData={careerForm}
              handleInputChange={handleCareerInputChange}
              formFieldsEnabled
              theme="dark"
              onPatch={(patch) => setCareerForm((prev) => ({ ...prev, ...patch }))}
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              {careerFeedback && <p className="text-sm text-emerald-400">{careerFeedback}</p>}
              <ActionButton onClick={() => void handleSaveCareer()} disabled={careerSaving}>
                {careerSaving ? 'Enregistrement…' : 'Enregistrer le profil pro'}
              </ActionButton>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-100">
                {isRider ? t('independentVisibilityRider') : t('independentVisibilityStaff')}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {hasActiveSub
                  ? isRider
                    ? 'Les équipes vous verront avec des infos limitées. Vos données détaillées ne sont partagées qu\'après acceptation d\'une demande.'
                    : 'Les équipes pourront vous contacter pour des missions ponctuelles.'
                  : t('independentVisibilityPaywall')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleVisibilityToggle}
              disabled={!hasActiveSub}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                !hasActiveSub
                  ? 'cursor-not-allowed bg-slate-700 opacity-60'
                  : (isRider ? isSearchable : openToMissions)
                    ? 'cursor-pointer bg-green-500'
                    : 'cursor-pointer bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  (isRider ? isSearchable : openToMissions) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {!hasActiveSub && onUpgradePlan && (
            <ActionButton onClick={onUpgradePlan} className="mt-4">
              {t('independentSubscribeCta')}
            </ActionButton>
          )}
        </div>

        {isRider && (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-100 mb-3">{t('independentScoutingRequests')}</h3>
            {!hasActiveSub ? (
              <p className="text-sm text-slate-400">{t('independentScoutingRequiresSub')}</p>
            ) : myRequests.length === 0 && myActiveConsents.length === 0 ? (
              <p className="text-sm text-slate-400">{t('independentNoScoutingRequests')}</p>
            ) : (
              <div className="space-y-4">
                {myRequests.length > 0 && (
                  <ul className="space-y-3">
                    {myRequests.map((req) => (
                      <li key={req.id}>
                        <ScoutingRequestResponseCard
                          request={req}
                          teamName={getTeamName(req.requesterTeamId)}
                          currentUser={currentUser}
                          onRespond={onRespondToScoutingRequest}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {myActiveConsents.length > 0 && onWithdrawScoutingConsent && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
                      {t('independentScoutingActiveConsents')}
                    </p>
                    <ul className="space-y-3">
                      {myActiveConsents.map((req) => (
                        <li key={req.id}>
                          <ScoutingActiveConsentCard
                            request={req}
                            teamName={getTeamName(req.requesterTeamId)}
                            onWithdraw={onWithdrawScoutingConsent}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default IndependentSpaceSection;

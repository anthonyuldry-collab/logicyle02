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
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import ScoutingRequestResponseCard from '../components/ScoutingRequestResponseCard';
import StaffCareerProfileTab from '../components/staffDetailTabs/StaffCareerProfileTab';
import { isContactScoutingRequest } from '../utils/scoutingProspectUtils';
import { useTranslations } from '../hooks/useTranslations';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import { ALL_COUNTRIES } from '../constants';
import { userToStaffProfile } from '../utils/independentUtils';
import { getStaffRoleDisplayLabel, STAFF_ROLE_KEYS } from '../utils/staffRoleUtils';
import {
  CvExtractError,
  extractProfileFromCv,
  isCvExtractSupported,
} from '../services/cvProfileExtractService';
import {
  mergeCvExtractIntoStaff,
  summarizeCvExtract,
} from '../utils/cvProfileMergeUtils';

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
  ) => Promise<void>;
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
        ...(!isRider ? { staffRole: staffRole || careerForm.role } : {}),
      });
      if (!isRider) {
        setCareerForm((prev) => ({ ...prev, role: staffRole || prev.role }));
      }
      setAdminFeedback('Informations enregistrées.');
    } finally {
      setAdminSaving(false);
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

  return (
    <SectionWrapper title={t('independentHubTitle')}>
      <div className="space-y-6">
        {subscriptionAccess && (
          <div
            className={`rounded-lg border p-5 ${
              isExpired
                ? 'border-amber-300 bg-amber-50'
                : subscriptionAccess.isTrial
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{t('independentSubscriptionTitle')}</p>
                <p className="text-sm text-gray-700 mt-1">
                  {subscriptionAccess.statusLabel[language]}
                  {subscriptionAccess.daysRemaining !== null && subscriptionAccess.daysRemaining <= 7 && (
                    <span className="ml-1 font-medium text-amber-700">
                      — {t('independentSubscriptionEndingSoon')}
                    </span>
                  )}
                </p>
                {isExpired && (
                  <p className="text-sm text-amber-800 mt-2">{t('independentSubscriptionExpired')}</p>
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

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-semibold text-blue-900">{t('independentHubWelcome')}</h2>
          <p className="mt-1 text-sm text-blue-800">{t('independentHubDesc')}</p>
          <ActionButton onClick={onGoToLobby} variant="secondary" className="mt-4">
            {t('independentJoinTeamCta')}
          </ActionButton>
        </div>

        {!isRider && (
          <div className="rounded-lg border bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800">Dossier administratif</h3>
              <p className="text-sm text-gray-500 mt-1">
                Informations de base et CV visibles par les équipes lors du recrutement.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sexe</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  <option value={Sex.MALE}>Homme</option>
                  <option value={Sex.FEMALE}>Femme</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nationalité</label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Fonction *</label>
                <select
                  value={staffRole}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStaffRole(value);
                    setCareerForm((prev) => ({ ...prev, role: value }));
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {STAFF_ROLE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getStaffRoleDisplayLabel(key)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  Poste affiché aux équipes qui recrutent (DS, mécano, kiné…).
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
                <input
                  type="text"
                  value={address.streetName || ''}
                  onChange={(e) => setAddress((a) => ({ ...a, streetName: e.target.value }))}
                  placeholder="Rue"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={address.postalCode || ''}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    placeholder="Code postal"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={address.city || ''}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    placeholder="Ville"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Contact d&apos;urgence</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tél. urgence</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">CV (PDF, Word ou image)</label>
                <p className="mb-1 text-[11px] text-gray-400">
                  PDF ou image : remplissage automatique du profil professionnel (compétences, expériences…).
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*,application/pdf"
                  onChange={handleCvUpload}
                  disabled={cvExtractStatus === 'loading'}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
                />
                {cvFileName && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <span className="truncate font-medium">{cvFileName}</span>
                    <button
                      type="button"
                      className="text-rose-600 text-xs hover:underline"
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
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : cvExtractStatus === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    {cvExtractMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {adminFeedback && <p className="text-sm text-emerald-600">{adminFeedback}</p>}
              <ActionButton onClick={handleSaveAdmin} disabled={adminSaving}>
                {adminSaving ? 'Enregistrement…' : 'Enregistrer le dossier'}
              </ActionButton>
            </div>
          </div>
        )}

        {isRider ? (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Profil professionnel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Présentation</label>
                <textarea
                  value={professionalSummary}
                  onChange={(e) => setProfessionalSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Décrivez votre parcours, vos expériences..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs sportifs</label>
                <textarea
                  value={careerAspirations}
                  onChange={(e) => setCareerAspirations(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Vos ambitions pour la saison..."
                />
              </div>
              <ActionButton onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer le profil'}
              </ActionButton>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800">Profil professionnel</h3>
              <p className="text-sm text-gray-500 mt-1">
                Présentation, message de candidature, compétences, expérience, certifications et
                langues.
              </p>
            </div>
            <StaffCareerProfileTab
              formData={careerForm}
              handleInputChange={handleCareerInputChange}
              formFieldsEnabled
              theme="light"
              onPatch={(patch) => setCareerForm((prev) => ({ ...prev, ...patch }))}
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              {careerFeedback && <p className="text-sm text-emerald-600">{careerFeedback}</p>}
              <ActionButton onClick={() => void handleSaveCareer()} disabled={careerSaving}>
                {careerSaving ? 'Enregistrement…' : 'Enregistrer le profil pro'}
              </ActionButton>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">
                {isRider ? t('independentVisibilityRider') : t('independentVisibilityStaff')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
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
                  ? 'cursor-not-allowed bg-gray-200 opacity-60'
                  : (isRider ? isSearchable : openToMissions)
                    ? 'cursor-pointer bg-green-500'
                    : 'cursor-pointer bg-gray-300'
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
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">{t('independentScoutingRequests')}</h3>
            {!hasActiveSub ? (
              <p className="text-sm text-gray-500">{t('independentScoutingRequiresSub')}</p>
            ) : myRequests.length === 0 ? (
              <p className="text-sm text-gray-500">{t('independentNoScoutingRequests')}</p>
            ) : (
              <ul className="space-y-3">
                {myRequests.map((req) => (
                  <li key={req.id}>
                    <ScoutingRequestResponseCard
                      request={req}
                      teamName={getTeamName(req.requesterTeamId)}
                      onRespond={onRespondToScoutingRequest}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default IndependentSpaceSection;

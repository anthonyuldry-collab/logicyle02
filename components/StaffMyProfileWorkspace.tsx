import React, { useEffect, useMemo, useState } from 'react';
import { StaffMember, User, UserRole } from '../types';
import SectionWrapper from './SectionWrapper';
import StaffAdminTab from './staffDetailTabs/StaffAdminTab';
import StaffCareerProfileTab from './staffDetailTabs/StaffCareerProfileTab';
import ActionButton from './ActionButton';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';
import { buildStaffDossierCompletion } from '../utils/staffDossierUtils';
import { buildDefaultStaffMember } from '../utils/defaultTeamMemberProfiles';
import { getStaffRoleDisplayLabel, STAFF_ROLE_KEYS } from '../utils/staffRoleUtils';
import { useTranslations } from '../hooks/useTranslations';
import {
  CvExtractedProfile,
  mergeCvExtractIntoStaff,
} from '../utils/cvProfileMergeUtils';

interface StaffMyProfileWorkspaceProps {
  staff: StaffMember[];
  currentUser: User;
  onSaveStaff: (staff: StaffMember) => void | Promise<void>;
  /** Titre de section (défaut : Mon Profil) */
  title?: string;
}

const StaffMyProfileWorkspace: React.FC<StaffMyProfileWorkspaceProps> = ({
  staff,
  currentUser,
  onSaveStaff,
  title = 'Mon Profil',
}) => {
  const { t, language } = useTranslations();
  const staffProfile = getStaffMemberForUser(currentUser, staff);
  const [staffForm, setStaffForm] = useState<StaffMember | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [dossierTab, setDossierTab] = useState<'admin' | 'career'>('admin');

  useEffect(() => {
    if (staffProfile) {
      setStaffForm(structuredClone(staffProfile));
      return;
    }
    if (
      currentUser.userRole === UserRole.STAFF ||
      currentUser.userRole === UserRole.MANAGER
    ) {
      setStaffForm(
        buildDefaultStaffMember({
          id: currentUser.id,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
        })
      );
      return;
    }
    setStaffForm(null);
  }, [staffProfile, currentUser]);

  const staffDossier = useMemo(
    () => (staffForm ? buildStaffDossierCompletion(staffForm) : null),
    [staffForm]
  );

  const handleStaffInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setStaffForm((prev) => {
      if (!prev) return prev;
      const keys = name.split('.');
      const updated = structuredClone(prev);
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] || {}) };
        current = current[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      current[lastKey] = type === 'checkbox' ? checked : value === '' ? undefined : value;
      return updated;
    });
  };

  const handleSaveStaff = async () => {
    if (!staffForm) return;
    setSavingStaff(true);
    setSaveFeedback(null);
    try {
      await onSaveStaff(staffForm);
      setSaveFeedback('Profil enregistré.');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleCvProfileExtracted = (extracted: CvExtractedProfile) => {
    setStaffForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...mergeCvExtractIntoStaff(prev, extracted),
      };
    });
    setDossierTab('career');
    setSaveFeedback('Profil professionnel enrichi depuis le CV — pensez à enregistrer.');
  };

  if (!staffForm) {
    return (
      <SectionWrapper title={title}>
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.04] p-10 text-center">
          <p className="text-lg font-medium text-white">Profil staff non trouvé</p>
          <p className="mt-2 text-sm text-slate-400">
            Aucune fiche staff associée à votre compte. Contactez l&apos;encadrement.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  const missingChecks = staffDossier?.checks.filter((c) => !c.ok && !c.warning) ?? [];

  return (
    <SectionWrapper
      title={title}
      subtitle={t('adminDossierSubtitleStaff')}
      variant="hub"
      hideTitleOnMobile
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-lg">
          <div className="flex flex-wrap items-start gap-4">
            {staffForm.photoUrl ? (
              <img
                src={staffForm.photoUrl}
                alt={`${staffForm.firstName} ${staffForm.lastName}`}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-md">
                {staffForm.firstName?.[0] || 'S'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white">
                {staffForm.firstName} {staffForm.lastName}
              </h2>
              <p className="text-sm text-slate-300">
                {getStaffRoleDisplayLabel(staffForm.role)}
                {staffForm.customRole ? ` · ${staffForm.customRole}` : ''}
                {staffForm.status ? ` · ${staffForm.status}` : ''}
              </p>
              <div className="mt-3 max-w-sm">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Fonction
                </label>
                <select
                  name="role"
                  value={staffForm.role || 'AUTRE'}
                  onChange={handleStaffInputChange}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {STAFF_ROLE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getStaffRoleDisplayLabel(key)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Poste affiché pour le recrutement et le tableau de bord.
                </p>
              </div>
              {staffDossier && (
                <div className="mt-3 max-w-md">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{t('adminDossierCompletion')}</span>
                    <span className="font-semibold text-white">{staffDossier.percent}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-indigo-400 transition-all"
                      style={{ width: `${staffDossier.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {staffDossier.done}/{staffDossier.total} {t('adminDossierBlocksDone')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {missingChecks.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium text-amber-50">{t('adminDossierMissingTitle')}</p>
            <ul className="mt-1 list-inside list-disc text-xs text-amber-100">
              {missingChecks.map((c) => (
                <li key={c.key}>{language === 'fr' ? c.labelFr : c.labelEn}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-slate-300">{t('adminDossierHelpStaff')}</p>

        <div className="flex gap-1 border-b border-white/10">
          <button
            type="button"
            onClick={() => setDossierTab('admin')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              dossierTab === 'admin'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Administratif & CV
          </button>
          <button
            type="button"
            onClick={() => setDossierTab('career')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              dossierTab === 'career'
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Profil professionnel
          </button>
        </div>

        {dossierTab === 'admin' ? (
          <StaffAdminTab
            formData={staffForm}
            handleInputChange={handleStaffInputChange}
            formFieldsEnabled
            theme="dark"
            onCvUpdate={({ fileName, mimeType, base64 }) => {
              setStaffForm((prev) =>
                prev
                  ? {
                      ...prev,
                      cvFileName: fileName,
                      cvMimeType: mimeType,
                      cvFileBase64: base64,
                    }
                  : prev
              );
            }}
            onCvProfileExtracted={handleCvProfileExtracted}
            onLicenseUpdate={(base64, mimeType) => {
              setStaffForm((prev) =>
                prev
                  ? {
                      ...prev,
                      licenseImageBase64: base64,
                      licenseImageMimeType: mimeType,
                    }
                  : prev
              );
            }}
          />
        ) : (
          <StaffCareerProfileTab
            formData={staffForm}
            handleInputChange={handleStaffInputChange}
            formFieldsEnabled
            theme="dark"
            onPatch={(patch) => {
              setStaffForm((prev) => (prev ? { ...prev, ...patch } : prev));
            }}
          />
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
          {saveFeedback && <p className="text-sm text-emerald-300">{saveFeedback}</p>}
          <ActionButton onClick={handleSaveStaff} disabled={savingStaff}>
            {savingStaff ? 'Enregistrement…' : 'Enregistrer mon profil'}
          </ActionButton>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default StaffMyProfileWorkspace;

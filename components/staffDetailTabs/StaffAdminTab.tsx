import React, { useMemo, useState } from 'react';
import { Sex, StaffMember } from '../../types';
import ActionButton from '../ActionButton';
import TrashIcon from '../icons/TrashIcon';
import { ALL_COUNTRIES } from '../../constants';
import { buildStaffCvDataUrl, buildStaffDossierCompletion } from '../../utils/staffDossierUtils';
import {
  CvExtractError,
  extractProfileFromCv,
  isCvExtractSupported,
} from '../../services/cvProfileExtractService';
import {
  CvExtractedProfile,
  summarizeCvExtract,
} from '../../utils/cvProfileMergeUtils';

interface StaffAdminTabProps {
  formData: StaffMember | Omit<StaffMember, 'id'>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  formFieldsEnabled?: boolean;
  onCvUpdate: (payload: { fileName?: string; mimeType?: string; base64?: string }) => void;
  /** Appelé après analyse IA du CV (compétences, expériences, etc.). */
  onCvProfileExtracted?: (profile: CvExtractedProfile) => void;
  /** Si false, stocke le CV sans lancer l’extraction auto. */
  autoExtractProfileFromCv?: boolean;
  onLicenseUpdate: (base64?: string, mimeType?: string) => void;
  /** Thème clair (dossier personnel) ou sombre (modale staff équipe) */
  theme?: 'light' | 'dark';
}

type CheckStatus = 'ok' | 'missing' | 'warning';

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean; theme: 'light' | 'dark' }> = ({
  children,
  required,
  theme,
}) => (
  <label
    className={`mb-1 block text-xs font-medium uppercase tracking-wide ${
      theme === 'light' ? 'text-gray-500' : 'text-slate-400'
    }`}
  >
    {children}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </label>
);

const StaffAdminTab: React.FC<StaffAdminTabProps> = ({
  formData,
  handleInputChange,
  formFieldsEnabled = true,
  onCvUpdate,
  onCvProfileExtracted,
  autoExtractProfileFromCv = true,
  onLicenseUpdate,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const [cvExtractStatus, setCvExtractStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cvExtractMessage, setCvExtractMessage] = useState<string | null>(null);
  const inputClass = isLight
    ? `mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`
    : `mt-0.5 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60`;

  const cardClass = isLight
    ? 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
    : 'rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg';
  const titleClass = isLight ? 'mb-3 text-sm font-semibold text-gray-900' : 'mb-3 text-sm font-semibold text-white';

  const dossier = useMemo(() => buildStaffDossierCompletion(formData as StaffMember), [formData]);
  const cvUrl = buildStaffCvDataUrl(formData);
  const licenseSrc =
    formData.licenseImageBase64 && formData.licenseImageMimeType
      ? `data:${formData.licenseImageMimeType};base64,${formData.licenseImageBase64}`
      : undefined;

  const handleLicenseUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      const base64Data = result.substring(result.indexOf(',') + 1);
      onLicenseUpdate(base64Data, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const runCvExtraction = async (payload: { fileName?: string; mimeType?: string; base64?: string }) => {
    if (!autoExtractProfileFromCv || !onCvProfileExtracted || !payload.base64) return;
    if (!isCvExtractSupported(payload.mimeType, payload.fileName)) {
      setCvExtractStatus('error');
      setCvExtractMessage(
        'CV enregistré. Pour remplir automatiquement le profil pro, utilisez un PDF ou une image.'
      );
      return;
    }
    setCvExtractStatus('loading');
    setCvExtractMessage('Lecture du CV en cours… compétences, expériences, langues…');
    try {
      const extracted = await extractProfileFromCv(payload);
      onCvProfileExtracted(extracted);
      setCvExtractStatus('success');
      setCvExtractMessage(summarizeCvExtract(extracted));
    } catch (err) {
      setCvExtractStatus('error');
      if (err instanceof CvExtractError) {
        setCvExtractMessage(err.message);
      } else {
        setCvExtractMessage('Échec de la lecture automatique du CV.');
      }
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
      const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      const base64Data = result.substring(result.indexOf(',') + 1);
      const payload = { fileName: file.name, mimeType, base64: base64Data };
      onCvUpdate(payload);
      void runCvExtraction(payload);
    };
    reader.readAsDataURL(file);
  };

  const handleReExtractCv = () => {
    if (!formData.cvFileBase64) return;
    void runCvExtraction({
      fileName: formData.cvFileName,
      mimeType: formData.cvMimeType,
      base64: formData.cvFileBase64,
    });
  };

  const statusStyle = (status: CheckStatus) => {
    if (status === 'ok') {
      return isLight
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-emerald-600/50 bg-emerald-950 text-emerald-200';
    }
    if (status === 'warning') {
      return isLight
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-amber-600/50 bg-amber-950 text-amber-200';
    }
    return isLight
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-rose-600/50 bg-rose-950 text-rose-200';
  };

  return (
    <div className="space-y-4">
      <div
        className={
          isLight
            ? 'rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4'
            : 'rounded-xl border border-indigo-500/30 bg-slate-800 p-4'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${isLight ? 'text-blue-600' : 'text-indigo-300'}`}>
              Dossier administratif
            </p>
            <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-300'}`}>
              Identité, coordonnées, CV et documents pour les missions et le recrutement.
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums ${isLight ? 'text-blue-700' : 'text-indigo-200'}`}>
              {dossier.percent}%
            </p>
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
              {dossier.done}/{dossier.total} blocs
            </p>
          </div>
        </div>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${isLight ? 'bg-blue-100' : 'bg-white/10'}`}>
          <div
            className={`h-full rounded-full ${isLight ? 'bg-blue-600' : 'bg-indigo-400'} transition-all`}
            style={{ width: `${dossier.percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {dossier.checks.map((check) => {
          const status: CheckStatus = check.ok ? 'ok' : check.warning ? 'warning' : 'missing';
          return (
            <div key={check.key} className={`rounded-lg border px-3 py-2 ${statusStyle(status)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide">{check.labelFr}</p>
              <p className="mt-0.5 text-sm font-medium">
                {status === 'ok' ? '✓' : status === 'warning' ? '!' : '○'}{' '}
                {check.detailFr ?? (status === 'ok' ? 'Complet' : 'À compléter')}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={cardClass}>
          <h3 className={titleClass}>Informations de base</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required theme={theme}>
                Prénom
              </FieldLabel>
              <input
                type="text"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel required theme={theme}>
                Nom
              </FieldLabel>
              <input
                type="text"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel required theme={theme}>
                Date de naissance
              </FieldLabel>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
                style={isLight ? undefined : { colorScheme: 'dark' }}
              />
            </div>
            <div>
              <FieldLabel required theme={theme}>
                Sexe
              </FieldLabel>
              <select
                name="sex"
                value={formData.sex || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              >
                <option value="">— Sélectionner —</option>
                <option value={Sex.MALE}>Homme</option>
                <option value={Sex.FEMALE}>Femme</option>
              </select>
            </div>
            <div>
              <FieldLabel theme={theme}>Nationalité</FieldLabel>
              <select
                name="nationality"
                value={formData.nationality || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
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
              <FieldLabel theme={theme}>N° sécurité sociale</FieldLabel>
              <input
                type="text"
                name="socialSecurityNumber"
                value={formData.socialSecurityNumber || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h3 className={titleClass}>Coordonnées</h3>
          <div className="space-y-3">
            <div>
              <FieldLabel required theme={theme}>
                Email
              </FieldLabel>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel theme={theme}>Téléphone</FieldLabel>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel theme={theme}>Adresse</FieldLabel>
              <input
                type="text"
                name="address.streetName"
                value={formData.address?.streetName || ''}
                onChange={handleInputChange}
                placeholder="Rue"
                className={`${inputClass} mb-2`}
                disabled={!formFieldsEnabled}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="address.postalCode"
                  value={formData.address?.postalCode || ''}
                  onChange={handleInputChange}
                  placeholder="Code postal"
                  className={inputClass}
                  disabled={!formFieldsEnabled}
                />
                <input
                  type="text"
                  name="address.city"
                  value={formData.address?.city || ''}
                  onChange={handleInputChange}
                  placeholder="Ville"
                  className={inputClass}
                  disabled={!formFieldsEnabled}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel theme={theme}>Contact d&apos;urgence</FieldLabel>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                  disabled={!formFieldsEnabled}
                />
              </div>
              <div>
                <FieldLabel theme={theme}>Tél. urgence</FieldLabel>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                  disabled={!formFieldsEnabled}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h3 className={titleClass}>CV fichier</h3>
          <div className="space-y-3">
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
              Au téléversement d’un PDF ou d’une image, le profil professionnel (compétences, expériences,
              formations, langues, présentation) est enrichi automatiquement.
            </p>
            <div>
              <FieldLabel required theme={theme}>
                Fichier CV
              </FieldLabel>
              {formFieldsEnabled && (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*,application/pdf"
                  onChange={handleCvUpload}
                  disabled={cvExtractStatus === 'loading'}
                  className={
                    isLight
                      ? 'mt-1 block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100'
                      : 'block w-full text-xs text-slate-400 file:mr-2 file:rounded-full file:border-0 file:bg-slate-600 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-500'
                  }
                />
              )}
              {formData.cvFileName && (
                <div
                  className={`mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                    isLight ? 'border-gray-200 bg-gray-50 text-gray-800' : 'border-slate-600 bg-slate-800 text-slate-200'
                  }`}
                >
                  <span className="truncate font-medium">{formData.cvFileName}</span>
                  <div className="flex items-center gap-2">
                    {formFieldsEnabled && formData.cvFileBase64 && onCvProfileExtracted && (
                      <button
                        type="button"
                        onClick={handleReExtractCv}
                        disabled={cvExtractStatus === 'loading'}
                        className={`text-xs font-medium hover:underline disabled:opacity-50 ${
                          isLight ? 'text-blue-700' : 'text-blue-300'
                        }`}
                      >
                        {cvExtractStatus === 'loading' ? 'Analyse…' : 'Relire le CV'}
                      </button>
                    )}
                    {cvUrl && (
                      <a
                        href={cvUrl}
                        download={formData.cvFileName}
                        className={`text-xs font-medium hover:underline ${isLight ? 'text-blue-700' : 'text-blue-300'}`}
                      >
                        Télécharger
                      </a>
                    )}
                    {formFieldsEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          onCvUpdate({});
                          setCvExtractStatus('idle');
                          setCvExtractMessage(null);
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${
                          isLight ? 'text-rose-600' : 'text-rose-300'
                        }`}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              )}
              {cvExtractMessage && (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                    cvExtractStatus === 'loading'
                      ? isLight
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-blue-700/40 bg-blue-900/30 text-blue-100'
                      : cvExtractStatus === 'success'
                        ? isLight
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-emerald-700/40 bg-emerald-900/30 text-emerald-100'
                        : isLight
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-amber-700/40 bg-amber-900/30 text-amber-100'
                  }`}
                >
                  {cvExtractMessage}
                </div>
              )}
              <p className={`mt-1 text-[11px] ${isLight ? 'text-gray-400' : 'text-slate-500'}`}>
                PDF ou image recommandé · max. 4 Mo. Word est stocké mais non lu automatiquement.
              </p>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h3 className={titleClass}>Licence & documents</h3>
          <div className="space-y-3">
            <div>
              <FieldLabel theme={theme}>N° UCI</FieldLabel>
              <input
                type="text"
                name="uciId"
                value={formData.uciId || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel theme={theme}>N° de licence</FieldLabel>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber || ''}
                onChange={handleInputChange}
                className={inputClass}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel theme={theme}>Scan licence</FieldLabel>
              {formFieldsEnabled && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLicenseUpload}
                  className={
                    isLight
                      ? 'mt-1 block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100'
                      : 'block w-full text-xs text-slate-400 file:mr-2 file:rounded-full file:border-0 file:bg-slate-600 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-500'
                  }
                />
              )}
              {licenseSrc && (
                <img
                  src={licenseSrc}
                  alt="Licence"
                  className={`mt-2 max-h-28 rounded-lg border shadow-sm ${isLight ? 'border-gray-200' : 'border-slate-500'}`}
                />
              )}
              {formFieldsEnabled && licenseSrc && (
                <ActionButton
                  type="button"
                  onClick={() => onLicenseUpdate(undefined, undefined)}
                  variant="danger"
                  size="sm"
                  className="mt-2"
                >
                  <TrashIcon className="mr-1 h-3 w-3" /> Supprimer l&apos;image
                </ActionButton>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StaffAdminTab;

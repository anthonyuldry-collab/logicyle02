import React, { useMemo } from 'react';
import { Rider, StaffMember, Sex } from '../../types';
import ActionButton from '../ActionButton';
import TrashIcon from '../icons/TrashIcon';
import RiderContractSummary from '../RiderContractSummary';
import { ALL_COUNTRIES } from '../../constants';
import { getAgeCategory } from '../../utils/ageUtils';
import { buildRiderContractSummary } from '../../utils/contractUtils';
import { buildRiderDossierCompletion } from '../../utils/riderDossierUtils';
import { useTranslations } from '../../hooks/useTranslations';

interface AdminTabProps {
  formData: Rider | StaffMember | Omit<Rider, 'id'> | Omit<StaffMember, 'id'>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  formFieldsEnabled: boolean;
  handleLicenseUpdate: (base64?: string, mimeType?: string) => void;
  isContractEditable?: boolean;
  /** Admin encadrement : peut modifier équipe, SS, etc. */
  canEditRestrictedFields?: boolean;
  /** Profil du coureur connecté (consultation tarif en lecture seule) */
  isOwnProfile?: boolean;
}

type CheckStatus = 'ok' | 'missing' | 'warning';

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
    {children}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </label>
);

const inputClass = (disabled: boolean) =>
  `mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`;

const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <section className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
    <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
    {children}
  </section>
);

const StatusPill: React.FC<{ label: string; status: CheckStatus; detail?: string }> = ({
  label,
  status,
  detail,
}) => {
  const styles =
    status === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';
  const icon = status === 'ok' ? '✓' : status === 'warning' ? '!' : '○';
  return (
    <div className={`rounded-lg border px-3 py-2 ${styles}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm font-medium">
        {icon} {detail ?? (status === 'ok' ? 'Complet' : 'À compléter')}
      </p>
    </div>
  );
};

const AdminTab: React.FC<AdminTabProps> = ({
  formData,
  handleInputChange,
  formFieldsEnabled,
  handleLicenseUpdate,
  isContractEditable = true,
  canEditRestrictedFields = false,
  isOwnProfile = false,
}) => {
  const { t, language } = useTranslations();
  const isRider = 'qualitativeProfile' in formData;
  const riderData = isRider ? (formData as Rider) : null;
  const canEditTeam = formFieldsEnabled && canEditRestrictedFields;

  const handleLicenseUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      handleLicenseUpdate(result, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLicense = () => {
    handleLicenseUpdate(undefined, undefined);
    const fileInput = document.getElementById('licenseImageUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const licenseImageSrc =
    formData.licenseImageBase64 && formData.licenseImageMimeType
      ? `data:${formData.licenseImageMimeType};base64,${formData.licenseImageBase64}`
      : isRider && riderData?.licenseImageUrl
      ? riderData.licenseImageUrl
      : undefined;

  const { category, age } = getAgeCategory(formData.birthDate);
  const contractSummary = riderData ? buildRiderContractSummary(riderData) : null;

  const dossierChecks = useMemo(() => {
    if (!riderData) return null;
    const completion = buildRiderDossierCompletion(riderData, { hasLicenseImage: !!licenseImageSrc });
    const contractSummary = buildRiderContractSummary(riderData);
    return {
      ...completion,
      contractSummary,
    };
  }, [riderData, licenseImageSrc]);

  const completionPct = dossierChecks?.percent ?? 0;
  const showEditableContract = isRider && isContractEditable && !isOwnProfile;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Dossier administratif</p>
            <p className="mt-1 text-sm text-gray-600">
              {isRider
                ? 'Identité, licences, mutuelle, agent et éléments contractuels.'
                : 'Identité, coordonnées et documents administratifs.'}
            </p>
            {formData.birthDate && (
              <p className="mt-2 text-xs text-gray-500">
                {age != null ? `${age} ans` : 'Âge inconnu'}
                {category !== 'N/A' && ` · Catégorie ${category}`}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-blue-700">{completionPct}%</p>
            <p className="text-xs text-gray-500">
              {dossierChecks?.done}/{dossierChecks?.total} blocs complétés
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {dossierChecks?.checks.map((check) => (
          <StatusPill
            key={check.key}
            label={language === 'fr' ? check.labelFr : check.labelEn}
            status={check.ok ? 'ok' : check.warning ? 'warning' : 'missing'}
            detail={language === 'fr' ? check.detailFr : check.detailEn}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Identité">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Prénom</FieldLabel>
              <input
                type="text"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel required>Nom</FieldLabel>
              <input
                type="text"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Date de naissance</FieldLabel>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <FieldLabel required>Sexe</FieldLabel>
              <select
                name="sex"
                value={formData.sex || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              >
                <option value="">— Sélectionner —</option>
                <option value={Sex.MALE}>Homme</option>
                <option value={Sex.FEMALE}>Femme</option>
              </select>
            </div>
          </div>
          {isRider && (
            <div className="mt-3">
              <FieldLabel>Équipe</FieldLabel>
              <input
                type="text"
                name="teamName"
                value={riderData?.teamName || ''}
                onChange={handleInputChange}
                className={inputClass(!canEditTeam)}
                disabled={!canEditTeam}
                placeholder={canEditTeam ? 'Nom de l\'équipe' : 'Modifiable par l\'encadrement'}
              />
              {!canEditTeam && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Le nom d&apos;équipe est géré par l&apos;encadrement (transfert, fin de contrat).
                </p>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Coordonnées">
          <div className="space-y-3">
            <div>
              <FieldLabel required>Email</FieldLabel>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel>Téléphone</FieldLabel>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel>Adresse</FieldLabel>
              <input
                type="text"
                name="address.streetName"
                value={formData.address?.streetName || ''}
                onChange={handleInputChange}
                placeholder="Rue"
                className={`${inputClass(!formFieldsEnabled)} mb-2`}
                disabled={!formFieldsEnabled}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="address.postalCode"
                  value={formData.address?.postalCode || ''}
                  onChange={handleInputChange}
                  placeholder="Code postal"
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                />
                <input
                  type="text"
                  name="address.city"
                  value={formData.address?.city || ''}
                  onChange={handleInputChange}
                  placeholder="Ville"
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="address.region"
                  value={formData.address?.region || ''}
                  onChange={handleInputChange}
                  placeholder="Région / département"
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                />
                <select
                  name="address.country"
                  value={formData.address?.country || ''}
                  onChange={handleInputChange}
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                >
                  <option value="">— Pays —</option>
                  {ALL_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Licences & fédérations">
          <div className="space-y-3">
            <div>
              <FieldLabel>N° UCI</FieldLabel>
              <input
                type="text"
                name="uciId"
                value={formData.uciId || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel>N° licence FFC</FieldLabel>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber || ''}
                onChange={handleInputChange}
                className={inputClass(!formFieldsEnabled)}
                disabled={!formFieldsEnabled}
              />
            </div>
            <div>
              <FieldLabel>Scan licence</FieldLabel>
              {formFieldsEnabled && (
                <input
                  type="file"
                  id="licenseImageUpload"
                  accept="image/*"
                  onChange={handleLicenseUpload}
                  className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              )}
              {licenseImageSrc && (
                <img
                  src={licenseImageSrc}
                  alt="Licence"
                  className="mt-2 max-h-28 rounded-lg border border-gray-200 shadow-sm"
                />
              )}
              {formFieldsEnabled && licenseImageSrc && (
                <ActionButton
                  type="button"
                  onClick={handleRemoveLicense}
                  variant="danger"
                  size="sm"
                  className="mt-2"
                >
                  <TrashIcon className="mr-1 h-3 w-3" /> Supprimer l&apos;image
                </ActionButton>
              )}
            </div>
          </div>
        </SectionCard>

        {isRider && (
          <SectionCard title="Social & représentation">
            <div className="space-y-3">
              <div>
                <FieldLabel>N° sécurité sociale</FieldLabel>
                <input
                  type="text"
                  name="socialSecurityNumber"
                  value={riderData?.socialSecurityNumber || ''}
                  onChange={handleInputChange}
                  className={inputClass(!formFieldsEnabled || !canEditRestrictedFields)}
                  disabled={!formFieldsEnabled || !canEditRestrictedFields}
                />
              </div>
              <div>
                <FieldLabel>Mutuelle</FieldLabel>
                <input
                  type="text"
                  name="healthInsurance.name"
                  value={riderData?.healthInsurance?.name || ''}
                  onChange={handleInputChange}
                  placeholder="Nom de la mutuelle"
                  className={`${inputClass(!formFieldsEnabled)} mb-2`}
                  disabled={!formFieldsEnabled}
                />
                <input
                  type="text"
                  name="healthInsurance.policyNumber"
                  value={riderData?.healthInsurance?.policyNumber || ''}
                  onChange={handleInputChange}
                  placeholder="N° de police"
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                />
              </div>
              <div>
                <FieldLabel>Agence / agent</FieldLabel>
                <input
                  type="text"
                  name="agency.name"
                  value={riderData?.agency?.name || ''}
                  onChange={handleInputChange}
                  placeholder="Agence"
                  className={`${inputClass(!formFieldsEnabled)} mb-2`}
                  disabled={!formFieldsEnabled}
                />
                <input
                  type="text"
                  name="agency.agentName"
                  value={riderData?.agency?.agentName || ''}
                  onChange={handleInputChange}
                  placeholder="Nom de l'agent"
                  className={`${inputClass(!formFieldsEnabled)} mb-2`}
                  disabled={!formFieldsEnabled}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="tel"
                    name="agency.agentPhone"
                    value={riderData?.agency?.agentPhone || ''}
                    onChange={handleInputChange}
                    placeholder="Téléphone agent"
                    className={inputClass(!formFieldsEnabled)}
                    disabled={!formFieldsEnabled}
                  />
                  <input
                    type="email"
                    name="agency.agentEmail"
                    value={riderData?.agency?.agentEmail || ''}
                    onChange={handleInputChange}
                    placeholder="Email agent"
                    className={inputClass(!formFieldsEnabled)}
                    disabled={!formFieldsEnabled}
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {isRider && (
          <SectionCard title="Contact d'urgence">
            <div className="space-y-3">
              <div>
                <FieldLabel required>Nom du contact</FieldLabel>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={riderData?.emergencyContactName || ''}
                  onChange={handleInputChange}
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                />
              </div>
              <div>
                <FieldLabel required>Téléphone</FieldLabel>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={riderData?.emergencyContactPhone || ''}
                  onChange={handleInputChange}
                  className={inputClass(!formFieldsEnabled)}
                  disabled={!formFieldsEnabled}
                />
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {isRider && riderData && (
        <SectionCard title={isOwnProfile && !isContractEditable ? t('adminDossierPaySection') : 'Contrat — synthèse'}>
          <RiderContractSummary rider={riderData} compact />
          {isOwnProfile && !isContractEditable ? (
            <p className="mt-3 text-xs text-gray-500">{t('adminDossierPayManagerHint')}</p>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              Détails complets (dates, clauses, primes) dans l&apos;onglet « Contrat ».
            </p>
          )}
          {showEditableContract && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 md:grid-cols-3">
              <div>
                <FieldLabel>Salaire mensuel brut (€)</FieldLabel>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary ?? ''}
                  onChange={handleInputChange}
                  step="0.01"
                  className={inputClass(!formFieldsEnabled || !isContractEditable)}
                  disabled={!formFieldsEnabled || !isContractEditable}
                />
              </div>
              <div>
                <FieldLabel>Fin de contrat</FieldLabel>
                <input
                  type="date"
                  name="contractEndDate"
                  value={formData.contractEndDate || ''}
                  onChange={handleInputChange}
                  className={inputClass(!formFieldsEnabled || !isContractEditable)}
                  disabled={!formFieldsEnabled || !isContractEditable}
                />
              </div>
              <div>
                <FieldLabel>Équipe saison prochaine</FieldLabel>
                <input
                  type="text"
                  name="nextSeasonTeam"
                  value={riderData.nextSeasonTeam || ''}
                  onChange={handleInputChange}
                  className={inputClass(!formFieldsEnabled || !isContractEditable)}
                  disabled={!formFieldsEnabled || !isContractEditable}
                />
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};

export default AdminTab;

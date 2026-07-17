import { StaffMember } from '../types';

export type StaffDossierCheckKey =
  | 'identity'
  | 'contact'
  | 'address'
  | 'emergency'
  | 'cv'
  | 'profile'
  | 'languages'
  | 'license'
  | 'bank';

export interface StaffDossierCheck {
  key: StaffDossierCheckKey;
  ok: boolean;
  warning?: boolean;
  labelFr: string;
  labelEn: string;
  detailFr?: string;
  detailEn?: string;
}

export interface StaffDossierCompletion {
  checks: StaffDossierCheck[];
  done: number;
  total: number;
  percent: number;
}

export function buildStaffDossierCompletion(staff: StaffMember): StaffDossierCompletion {
  const identityOk = Boolean(staff.firstName && staff.lastName && staff.birthDate && staff.sex);
  const contactOk = Boolean(staff.email && staff.phone);
  const addressOk = Boolean(staff.address?.city && staff.address?.postalCode);
  const emergencyOk = Boolean(staff.emergencyContactName && staff.emergencyContactPhone);
  const cvOk = Boolean(
    (staff.cvFileBase64 && staff.cvFileName) ||
      (staff.professionalSummary && staff.professionalSummary.trim().length >= 40)
  );
  const profileOk = Boolean(
    staff.professionalSummary &&
      (staff.skills?.length || 0) > 0 &&
      ((staff.experienceYears != null && staff.experienceYears > 0) ||
        (staff.workHistory?.length || 0) > 0)
  );
  const languagesOk = Boolean((staff.languages?.length || 0) > 0);
  const licenseOk = Boolean(staff.licenseNumber || staff.licenseImageBase64);
  const bankOk = Boolean(staff.bankDetails?.iban);

  const checks: StaffDossierCheck[] = [
    { key: 'identity', ok: identityOk, labelFr: 'Identité', labelEn: 'Identity' },
    { key: 'contact', ok: contactOk, labelFr: 'Coordonnées', labelEn: 'Contact' },
    { key: 'address', ok: addressOk, labelFr: 'Adresse', labelEn: 'Address' },
    { key: 'emergency', ok: emergencyOk, labelFr: 'Urgence', labelEn: 'Emergency' },
    {
      key: 'cv',
      ok: cvOk,
      labelFr: 'CV',
      labelEn: 'CV',
      detailFr: staff.cvFileName
        ? 'Fichier déposé'
        : staff.professionalSummary
          ? 'Résumé seulement'
          : 'À compléter',
      detailEn: staff.cvFileName
        ? 'File uploaded'
        : staff.professionalSummary
          ? 'Summary only'
          : 'To complete',
      warning: Boolean(staff.professionalSummary && !staff.cvFileName),
    },
    {
      key: 'profile',
      ok: profileOk,
      labelFr: 'Profil pro',
      labelEn: 'Pro profile',
      detailFr: profileOk ? 'Complet' : 'Présentation / compétences',
      detailEn: profileOk ? 'Complete' : 'Summary / skills',
    },
    {
      key: 'languages',
      ok: languagesOk,
      labelFr: 'Langues',
      labelEn: 'Languages',
    },
    { key: 'license', ok: licenseOk, labelFr: 'Licence', labelEn: 'License' },
    { key: 'bank', ok: bankOk, labelFr: 'IBAN', labelEn: 'IBAN' },
  ];

  const done = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return {
    checks,
    done,
    total,
    percent: Math.round((done / total) * 100),
  };
}

export function buildStaffCvDataUrl(staff: Pick<StaffMember, 'cvFileBase64' | 'cvMimeType'>): string | null {
  if (!staff.cvFileBase64 || !staff.cvMimeType) return null;
  if (staff.cvFileBase64.startsWith('data:')) return staff.cvFileBase64;
  return `data:${staff.cvMimeType};base64,${staff.cvFileBase64}`;
}

import { Rider } from '../types';
import { buildRiderContractSummary } from './contractUtils';

export type DossierCheckKey =
  | 'identity'
  | 'contact'
  | 'uci'
  | 'license'
  | 'emergency'
  | 'contract'
  | 'bank';

export interface RiderDossierCheck {
  key: DossierCheckKey;
  ok: boolean;
  warning?: boolean;
  labelFr: string;
  labelEn: string;
  detailFr?: string;
  detailEn?: string;
}

export interface RiderDossierCompletion {
  checks: RiderDossierCheck[];
  done: number;
  total: number;
  percent: number;
}

export function buildRiderDossierCompletion(
  rider: Rider,
  options?: { hasLicenseImage?: boolean }
): RiderDossierCompletion {
  const hasLicenseImage = options?.hasLicenseImage ?? Boolean(
    rider.licenseImageBase64 || rider.licenseImageUrl
  );
  const contractSummary = buildRiderContractSummary(rider);

  const identityOk = Boolean(rider.firstName && rider.lastName && rider.birthDate && rider.sex);
  const contactOk = Boolean(rider.email && rider.phone);
  const uciOk = Boolean(rider.uciId);
  const licenseOk = Boolean(rider.licenseNumber || hasLicenseImage);
  const emergencyOk = Boolean(rider.emergencyContactName && rider.emergencyContactPhone);
  const contractOk = Boolean(
    rider.contractEndDate || (rider.salary != null && rider.salary > 0)
  );
  const bankOk = Boolean(rider.bankDetails?.iban);

  const checks: RiderDossierCheck[] = [
    { key: 'identity', ok: identityOk, labelFr: 'Identité', labelEn: 'Identity' },
    { key: 'contact', ok: contactOk, labelFr: 'Coordonnées', labelEn: 'Contact' },
    {
      key: 'uci',
      ok: uciOk && licenseOk,
      warning: uciOk !== licenseOk,
      labelFr: 'UCI / Licence',
      labelEn: 'UCI / License',
      detailFr:
        uciOk && licenseOk
          ? 'Complet'
          : uciOk
          ? 'Licence manquante'
          : licenseOk
          ? 'N° UCI manquant'
          : 'À compléter',
      detailEn:
        uciOk && licenseOk
          ? 'Complete'
          : uciOk
          ? 'License missing'
          : licenseOk
          ? 'UCI ID missing'
          : 'To complete',
    },
    { key: 'emergency', ok: emergencyOk, labelFr: 'Urgence', labelEn: 'Emergency' },
    {
      key: 'contract',
      ok: contractOk && !contractSummary.isExpiringSoon,
      warning: contractOk && contractSummary.isExpiringSoon,
      labelFr: 'Contrat',
      labelEn: 'Contract',
      detailFr: contractSummary.isExpiringSoon
        ? `Expire dans ${contractSummary.daysRemaining ?? 0} j`
        : undefined,
      detailEn: contractSummary.isExpiringSoon
        ? `Expires in ${contractSummary.daysRemaining ?? 0} d`
        : undefined,
    },
    { key: 'bank', ok: bankOk, labelFr: 'IBAN paie', labelEn: 'Payroll IBAN' },
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

import { BikeFitMeasurements } from '../types';

/** Règlement UCI Part I — art. 1.3.023 (modifié 01.01.2026) */
export const UCI_REGULATION_VERSION = '2026-01-01';

export type UciHeightCategoryId = 1 | 2 | 3;
export type UciEffectiveCategory = UciHeightCategoryId | 'default';

export interface UciCategoryLimits {
  E: number;
  H: number;
  SMin: number;
  label: string;
  heightRange: string;
}

export const UCI_HEIGHT_CATEGORY_LIMITS: Record<UciHeightCategoryId, UciCategoryLimits> = {
  1: { E: 800, H: 100, SMin: 50, label: 'Taille 1', heightRange: '< 180 cm' },
  2: { E: 830, H: 120, SMin: 50, label: 'Taille 2', heightRange: '180 – 189 cm' },
  3: { E: 850, H: 140, SMin: 50, label: 'Taille 3', heightRange: '≥ 190 cm' },
};

export const UCI_DEFAULT_CATEGORY_LIMITS = {
  E: 750,
  label: 'Catégorie par défaut',
  description: 'Coureur ≥ 180 cm non inscrit sur la liste UCI, ou cotes S/E non conformes à sa catégorie nominale',
};

/** Limites coussinets d'avant-bras (art. 1.3.023, 01.01.2026) */
export const UCI_FOREARM_SUPPORT_LIMITS = {
  maxWidthMm: 125,
  maxLengthMm: 125,
  minLengthMm: 60,
  maxHeightMm: 85,
  maxInclinationDeg: 30,
  baseBarMinWidthMm: 350,
} as const;

/** Délai d'inscription liste UCI cat. 2/3 avant un événement */
export const UCI_LIST_ATTESTATION_DAYS = 15;

export type UciCheckStatus = 'ok' | 'warning' | 'error' | 'missing';

export interface UciMeasurementCheck {
  key: 'S' | 'E' | 'H';
  label: string;
  value?: number;
  limitLabel: string;
  status: UciCheckStatus;
  message: string;
}

export interface UciTtComplianceResult {
  heightCategory: UciHeightCategoryId | null;
  effectiveCategory: UciEffectiveCategory;
  limits: UciCategoryLimits;
  effectiveLimits: { E: number; H: number; SMin: number };
  checks: UciMeasurementCheck[];
  hasErrors: boolean;
  hasWarnings: boolean;
  categoryReason: string;
}

export interface UciRoadComplianceResult {
  checks: Array<{
    key: 'S';
    label: string;
    value?: number;
    status: UciCheckStatus;
    message: string;
  }>;
  hasErrors: boolean;
}

export function parseMm(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const n = parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Catégorie de taille UCI déduite de la taille du coureur (art. 1.3.023) */
export function getUciHeightCategory(heightCm?: number): UciHeightCategoryId | null {
  if (heightCm == null || heightCm <= 0) return null;
  if (heightCm < 180) return 1;
  if (heightCm < 190) return 2;
  return 3;
}

export function getUciHeightCategoryLabel(heightCm?: number): string {
  const cat = getUciHeightCategory(heightCm);
  if (!cat) return 'Taille non renseignée';
  return `${UCI_HEIGHT_CATEGORY_LIMITS[cat].label} (${UCI_HEIGHT_CATEGORY_LIMITS[cat].heightRange})`;
}

interface TtComplianceInput {
  cotes: BikeFitMeasurements;
  heightCm?: number;
  uciHeightListRegistered?: boolean;
}

function buildCheck(
  key: 'S' | 'E' | 'H',
  label: string,
  value: number | undefined,
  test: (v: number) => boolean,
  limitLabel: string,
  okMsg: string,
  failMsg: string,
): UciMeasurementCheck {
  if (value == null) {
    return { key, label, limitLabel, status: 'missing', message: 'Mesure non renseignée' };
  }
  const ok = test(value);
  return {
    key,
    label,
    value,
    limitLabel,
    status: ok ? 'ok' : 'error',
    message: ok ? okMsg : failMsg,
  };
}

/** Vérifie si les cotes S et E respectent la catégorie nominale (hors catégorie par défaut) */
function nominalSAndECompliant(
  cotes: BikeFitMeasurements,
  limits: UciCategoryLimits,
): boolean {
  const s = parseMm(cotes.reculSelle);
  const e = parseMm(cotes.distanceExtensionE);
  if (s == null || e == null) return true;
  return s >= limits.SMin && e <= limits.E;
}

/**
 * Conformité UCI vélo CLM (art. 1.3.023 — en vigueur 01.01.2026).
 * E : distance horizontale axe pédalier → extrémité prolongateurs.
 * H : différence verticale milieu coussinet ↔ point haut/bas des prolongateurs.
 * S : distance horizontale bec de selle → plan vertical de l'axe pédalier.
 */
export function checkUciTtCompliance(input: TtComplianceInput): UciTtComplianceResult {
  const heightCategory = getUciHeightCategory(input.heightCm);
  const nominalLimits = heightCategory
    ? UCI_HEIGHT_CATEGORY_LIMITS[heightCategory]
    : UCI_HEIGHT_CATEGORY_LIMITS[1];

  const registered = !!input.uciHeightListRegistered;
  const height = input.heightCm ?? 0;

  let effectiveCategory: UciEffectiveCategory = heightCategory ?? 1;
  let categoryReason = heightCategory
    ? `Catégorie déduite de la taille du coureur (${input.heightCm} cm)`
    : 'Taille non renseignée — limites Taille 1 appliquées par défaut';

  const needsDefault =
    (height >= 180 && !registered) ||
    (heightCategory != null && !nominalSAndECompliant(input.cotes, nominalLimits));

  if (needsDefault) {
    effectiveCategory = 'default';
    if (height >= 180 && !registered) {
      categoryReason = `Coureur ≥ 180 cm non inscrit sur la liste UCI (attestation J-${UCI_LIST_ATTESTATION_DAYS}) → catégorie par défaut`;
    } else {
      categoryReason = 'Recul selle (S) ou portée prolongateurs (E) non conformes à la catégorie nominale → catégorie par défaut';
    }
  }

  const hLimit = nominalLimits.H;
  const effectiveLimits = effectiveCategory === 'default'
    ? { E: UCI_DEFAULT_CATEGORY_LIMITS.E, H: hLimit, SMin: 0 }
    : { E: nominalLimits.E, H: nominalLimits.H, SMin: nominalLimits.SMin };

  const sVal = parseMm(input.cotes.reculSelle);
  const eVal = parseMm(input.cotes.distanceExtensionE);
  const hVal = parseMm(input.cotes.hauteurProlongateursH);

  const checks: UciMeasurementCheck[] = [
    buildCheck(
      'S',
      'Recul selle (S)',
      sVal,
      v => v >= effectiveLimits.SMin,
      effectiveLimits.SMin > 0
        ? `≥ ${effectiveLimits.SMin} mm (bec → axe pédalier)`
        : 'Art. 1.3.013 — bec derrière l\'axe pédalier (≥ 0 mm)',
      'Recul selle conforme',
      effectiveLimits.SMin > 0
        ? `Recul insuffisant (min. ${effectiveLimits.SMin} mm entre bec de selle et axe pédalier)`
        : 'Le bec de selle ne doit pas passer devant l\'axe de pédalier (art. 1.3.013)',
    ),
    buildCheck(
      'E',
      'Portée prolongateurs (E)',
      eVal,
      v => v <= effectiveLimits.E,
      `≤ ${effectiveLimits.E} mm (axe pédalier → extrémité)`,
      'Portée prolongateurs conforme',
      `Dépassement de ${eVal != null && eVal > effectiveLimits.E ? eVal - effectiveLimits.E : '—'} mm (max. ${effectiveLimits.E} mm)`,
    ),
    buildCheck(
      'H',
      'Hauteur prolongateurs (H)',
      hVal,
      v => v <= effectiveLimits.H,
      `≤ ${effectiveLimits.H} mm (coussinet ↔ prolongateurs)`,
      'Hauteur prolongateurs conforme',
      `Dépassement de ${hVal != null && hVal > effectiveLimits.H ? hVal - effectiveLimits.H : '—'} mm (max. ${effectiveLimits.H} mm)`,
    ),
  ];

  if (effectiveCategory === 'default' && height >= 180 && !registered) {
    checks.forEach(c => {
      if (c.status === 'ok' && c.key === 'E') {
        c.status = 'warning';
        c.message += ` — inscrivez-vous sur la liste UCI (formulaire J-${UCI_LIST_ATTESTATION_DAYS}) pour E > 750 mm`;
      }
    });
  }

  if (heightCategory != null && heightCategory >= 2 && registered) {
    checks.forEach(c => {
      if (c.status === 'ok' && (c.key === 'E' || c.key === 'H')) {
        c.message += ` — liste UCI cat. ${heightCategory} requise`;
      }
    });
  }

  const hasErrors = checks.some(c => c.status === 'error');
  const hasWarnings = checks.some(c => c.status === 'warning');

  return {
    heightCategory,
    effectiveCategory,
    limits: nominalLimits,
    effectiveLimits,
    checks,
    hasErrors,
    hasWarnings,
    categoryReason,
  };
}

/** Conformité recul selle route (art. 1.3.013 — bec de selle derrière l'axe pédalier) */
export function checkUciRoadCompliance(cotes: BikeFitMeasurements): UciRoadComplianceResult {
  const sVal = parseMm(cotes.reculSelle);
  const check = sVal == null
    ? { key: 'S' as const, label: 'Recul selle (S)', status: 'missing' as UciCheckStatus, message: 'Mesure non renseignée' }
    : sVal < 0
      ? { key: 'S' as const, label: 'Recul selle (S)', value: sVal, status: 'error' as UciCheckStatus, message: 'Art. 1.3.013 : le bec de selle ne doit pas passer devant l\'axe de pédalier' }
      : { key: 'S' as const, label: 'Recul selle (S)', value: sVal, status: 'ok' as UciCheckStatus, message: sVal < 50 ? 'Conforme art. 1.3.013 (recul ≥ 0 mm)' : 'Recul selle conforme' };

  return {
    checks: [check],
    hasErrors: check.status === 'error',
  };
}

export function countUciTtErrors(result: UciTtComplianceResult): number {
  return result.checks.filter(c => c.status === 'error').length;
}

/**
 * Règles métier nutrition course cycliste (consensus ACSM / Jeukendrup).
 */

export type UldryCarbBand = {
  minGPerHour: number;
  maxGPerHour: number;
  defaultGPerHour: number;
  defaultHighGPerHour: number;
  note: string;
};

/**
 * Types de séance cyclisme → cible glucides (logique « chaque séance son carburant »).
 */
export type NutritionPlanSessionType =
  | 'endurance' // Z2 — intestin bien perfusé, idéal pour entraîner le ventre
  | 'tempo' // Z3 / LT1 — oxyde plus de glucides
  | 'vo2' // Z5 — digestion difficile, peu/pas d’apport pendant
  | 'race' // compétition / course
  | 'chrono'; // CLM — liquides / gels fluides uniquement

export const NUTRITION_SESSION_OPTIONS: {
  value: NutritionPlanSessionType;
  label: string;
  hint: string;
}[] = [
  { value: 'endurance', label: 'Endurance (Z2)', hint: 'Sortie longue — liquides, gels, solides possibles' },
  { value: 'tempo', label: 'Tempo / seuil (Z3)', hint: '1 bidon + 1 gel/h ; 90 g/h si > 2 h' },
  { value: 'vo2', label: 'VO2 max (Z5)', hint: 'Peu ou rien pendant les blocs intenses' },
  { value: 'race', label: 'Course / compétition', hint: 'Haut de fourchette, liquides + gels' },
  { value: 'chrono', label: 'Chrono / CLM', hint: 'Liquides et gels fluides uniquement' },
];

export function suggestedCarbsForSession(
  sessionType: NutritionPlanSessionType,
  hours: number
): { carbsPerHour: number; min: number; max: number; note: string; allowBars: boolean; fuelDuring: boolean } {
  switch (sessionType) {
    case 'vo2':
      return {
        carbsPerHour: hours > 1.25 ? 20 : 0,
        min: 0,
        max: 30,
        note: 'VO2 max : sang prioritaire aux muscles — rien ou léger entre les blocs ; recharger après (1–1,2 g/kg + protéines).',
        allowBars: false,
        fuelDuring: hours > 1.25,
      };
    case 'tempo': {
      const high = hours > 2;
      return {
        carbsPerHour: high ? 90 : 60,
        min: 60,
        max: high ? 90 : 70,
        note: high
          ? 'Tempo > 2 h : viser ~90 g/h pour épargner le glycogène / répéter la stratégie course.'
          : 'Tempo / LT1 : ~60 g/h (bidon + gel) suffit sur 1–2 h.',
        allowBars: false,
        fuelDuring: true,
      };
    }
    case 'endurance': {
      const band = carbBandForDurationHours(hours);
      const carbs = Math.min(90, Math.max(60, band.defaultGPerHour));
      return {
        carbsPerHour: hours < 2 ? Math.max(45, band.defaultGPerHour) : carbs,
        min: hours < 2 ? 30 : 60,
        max: 90,
        note: 'Endurance Z2 : intestin bien irrigué — moment idéal pour pousser la tolérance (liquides + gels + solides).',
        allowBars: hours >= 2,
        fuelDuring: true,
      };
    }
    case 'chrono': {
      if (hours < 1) {
        return {
          carbsPerHour: 30,
          min: 0,
          max: 40,
          note: 'CLM court : rinçage / ~30 g/h + caféine éventuelle — le gros du carburant est avant le départ.',
          allowBars: false,
          fuelDuring: true,
        };
      }
      return {
        carbsPerHour: hours >= 2 ? 80 : 60,
        min: 30,
        max: 90,
        note: 'CLM long : 60–90 g/h en liquides / gels fluides uniquement (zéro solide).',
        allowBars: false,
        fuelDuring: true,
      };
    }
    case 'race':
    default: {
      const band = carbBandForDurationHours(hours);
      return {
        carbsPerHour: band.defaultHighGPerHour,
        min: band.minGPerHour,
        max: band.maxGPerHour,
        note: `Course : ${band.note}`,
        allowBars: false,
        fuelDuring: true,
      };
    }
  }
}

/** Consensus durée → g glucides / h (cyclisme) */
export function carbBandForDurationHours(hours: number): UldryCarbBand {
  if (hours < 1) {
    return {
      minGPerHour: 0,
      maxGPerHour: 0,
      defaultGPerHour: 0,
      defaultHighGPerHour: 0,
      note: 'Effort court à vélo : rien à avaler, ou rinçage de bouche. Les réserves glycogène suffisent.',
    };
  }
  if (hours < 2) {
    return {
      minGPerHour: 30,
      maxGPerHour: 60,
      defaultGPerHour: 45,
      defaultHighGPerHour: 60,
      note: 'Sortie / course 1–2 h : une seule source (boisson ou gel) suffit.',
    };
  }
  if (hours < 2.5) {
    return {
      minGPerHour: 60,
      maxGPerHour: 90,
      defaultGPerHour: 70,
      defaultHighGPerHour: 90,
      note: 'Passer aux glucides multi-transporteurs (glucose + fructose).',
    };
  }
  if (hours <= 4) {
    return {
      minGPerHour: 60,
      maxGPerHour: 90,
      defaultGPerHour: 75,
      defaultHighGPerHour: 90,
      note: 'Course / sortie longue à vélo (≈ 2h30–4 h) : 60–90 g/h. Haut de fourchette si intestin entraîné.',
    };
  }
  return {
    minGPerHour: 60,
    maxGPerHour: 120,
    defaultGPerHour: 90,
    defaultHighGPerHour: 100,
    note: 'Très longue sortie / étape : 60–120 g/h. Au-delà de 90 g/h, ventre entraîné obligatoire — 120 g/h ne s’improvise pas.',
  };
}

export function targetGlucoseFructoseRatio(carbsPerHour: number): { glucose: number; fructose: number; label: string } {
  if (carbsPerHour > 90) {
    return { glucose: 1, fructose: 0.8, label: '1:0.8' };
  }
  return { glucose: 2, fructose: 1, label: '2:1' };
}

export function hydrationMlPerHour(
  carbsPerHour: number,
  conditions: 'cold' | 'mild' | 'hot'
): { min: number; max: number; target: number; note: string } {
  let min = 400;
  let max = 550;
  if (carbsPerHour >= 90) {
    min = 500;
    max = 750;
  } else if (carbsPerHour >= 45) {
    min = 400;
    max = 500;
  } else if (carbsPerHour > 0) {
    min = 300;
    max = 400;
  }

  if (conditions === 'hot') {
    min = Math.max(min, 500);
    max = Math.max(max, 750);
  } else if (conditions === 'cold') {
    max = Math.min(max, 500);
    min = Math.min(min, 400);
  }

  const target = conditions === 'hot' ? max : conditions === 'cold' ? min : Math.round((min + max) / 2);
  return {
    min,
    max,
    target,
    note:
      conditions === 'hot'
        ? 'Chaleur : viser le haut de fourchette et renforcer le sodium dans la boisson.'
        : conditions === 'cold'
          ? 'Froid : boire régulièrement sans forcer le volume.'
          : 'Tempéré : 1 bidon/h en moyenne, par petites gorgées.',
  };
}

export function concreteComboHint(carbsPerHour: number): string {
  if (carbsPerHour <= 0) return 'Rien à avaler (éventuel rinçage de bouche).';
  if (carbsPerHour <= 35) return '1 bidon énergétique (~30–40 g) OU 1 gel.';
  if (carbsPerHour <= 65) return '1 bidon (~40 g) + 1 gel (~22 g) OU 2 gels.';
  if (carbsPerHour <= 95) return '1 bidon high-carb (~60 g) + 1 gel (~30 g).';
  return '1 bidon high-carb (~80 g) + 1 gel high-carb (~40 g), ratio 1:0.8.';
}

export const NUTRITION_GOLDEN_RULES = [
  'Ne jamais tester un produit neuf le jour J.',
  'Toujours du sodium — idéalement dans la boisson.',
  'Progresser par paliers : 45 → 60 → 90 → 120 g/h.',
  'Reproduire les conditions de course (allure, chaleur, produits).',
  'Noter g/h, symptômes et sensations.',
] as const;

/** @deprecated alias */
export const ULDRY_GOLDEN_RULES = NUTRITION_GOLDEN_RULES;

export const NUTRITION_PLAN_ATTRIBUTION =
  'Plan cyclisme — débit glucidique, multi-transporteurs, sodium (≥ 300 mg/h en boisson).';

/** @deprecated alias */
export const ULDRY_GUIDE_ATTRIBUTION = NUTRITION_PLAN_ATTRIBUTION;

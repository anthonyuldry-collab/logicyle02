import { BudgetItemCategory } from '../types';
import { IncomeCategory } from '../types';

export interface AccountingCodeEntry {
  code: string;
  label: { fr: string; en: string };
  journal: string;
}

/** Plan comptable simplifié (PCG) — mapping catégorie métier → compte. */
export const BUDGET_CATEGORY_ACCOUNTING: Record<BudgetItemCategory, AccountingCodeEntry> = {
  [BudgetItemCategory.TRANSPORT]: {
    code: '625100',
    label: { fr: 'Frais de déplacement', en: 'Travel expenses' },
    journal: 'OD',
  },
  [BudgetItemCategory.HEBERGEMENT]: {
    code: '625600',
    label: { fr: 'Frais de mission — hébergement', en: 'Mission expenses — accommodation' },
    journal: 'OD',
  },
  [BudgetItemCategory.REPAS]: {
    code: '625700',
    label: { fr: 'Réceptions et déplacements — repas', en: 'Meals & hospitality' },
    journal: 'OD',
  },
  [BudgetItemCategory.VOITURE_EQUIPE]: {
    code: '613500',
    label: { fr: 'Locations de véhicules', en: 'Vehicle rentals' },
    journal: 'OD',
  },
  [BudgetItemCategory.FRAIS_COURSE]: {
    code: '623000',
    label: { fr: 'Publicité, publications — frais de course', en: 'Race fees & publicity' },
    journal: 'OD',
  },
  [BudgetItemCategory.MATERIEL]: {
    code: '606300',
    label: { fr: 'Fournitures d\'entretien et petit équipement', en: 'Maintenance supplies & small equipment' },
    journal: 'OD',
  },
  [BudgetItemCategory.POLE_PERFORMANCE]: {
    code: '611000',
    label: { fr: 'Sous-traitance — pôle performance', en: 'Subcontracting — performance' },
    journal: 'OD',
  },
  [BudgetItemCategory.SALAIRES]: {
    code: '641100',
    label: { fr: 'Rémunérations du personnel', en: 'Staff remuneration' },
    journal: 'OD',
  },
  [BudgetItemCategory.FRAIS_DIVERS]: {
    code: '658000',
    label: { fr: 'Charges diverses de gestion courante', en: 'Miscellaneous operating charges' },
    journal: 'OD',
  },
};

export function resolveAccountingCode(
  category: BudgetItemCategory,
  language: 'fr' | 'en' = 'fr'
): { code: string; label: string; journal: string } {
  const entry = BUDGET_CATEGORY_ACCOUNTING[category] ?? BUDGET_CATEGORY_ACCOUNTING[BudgetItemCategory.FRAIS_DIVERS];
  return {
    code: entry.code,
    label: entry.label[language],
    journal: entry.journal,
  };
}

/** Catégorie suggérée selon le mode de transport planifié. */
export function suggestCategoryFromTransportMode(mode?: string): BudgetItemCategory {
  const m = (mode || '').toLowerCase();
  if (m.includes('train') || m.includes('avion') || m.includes('bus') || m.includes('voiture')) {
    return BudgetItemCategory.TRANSPORT;
  }
  if (m.includes('repas') || m.includes('restaurant')) {
    return BudgetItemCategory.REPAS;
  }
  return BudgetItemCategory.TRANSPORT;
}

/** Plan comptable simplifié (PCG) — mapping catégorie revenu → compte produit. */
export const INCOME_CATEGORY_ACCOUNTING: Record<IncomeCategory, AccountingCodeEntry> = {
  [IncomeCategory.SPONSORING]: {
    code: '706100',
    label: { fr: 'Prestations de services — sponsoring', en: 'Services — sponsorship' },
    journal: 'VE',
  },
  [IncomeCategory.SUBVENTIONS]: {
    code: '740000',
    label: { fr: 'Subventions d\'exploitation', en: 'Operating grants' },
    journal: 'VE',
  },
  [IncomeCategory.MECENAT]: {
    code: '740100',
    label: { fr: 'Mécénat et dons en nature', en: 'Patronage & in-kind donations' },
    journal: 'VE',
  },
  [IncomeCategory.DONS]: {
    code: '754000',
    label: { fr: 'Dons et libéralités reçus', en: 'Donations received' },
    journal: 'VE',
  },
  [IncomeCategory.ACTIVITES_COMMERCIALES]: {
    code: '706000',
    label: { fr: 'Prestations de services', en: 'Services rendered' },
    journal: 'VE',
  },
  [IncomeCategory.AUTRE]: {
    code: '708000',
    label: { fr: 'Produits des activités annexes', en: 'Ancillary income' },
    journal: 'VE',
  },
};

export function resolveIncomeAccountingCode(
  category: IncomeCategory,
  language: 'fr' | 'en' = 'fr'
): { code: string; label: string; journal: string } {
  const entry = INCOME_CATEGORY_ACCOUNTING[category] ?? INCOME_CATEGORY_ACCOUNTING[IncomeCategory.AUTRE];
  return {
    code: entry.code,
    label: entry.label[language],
    journal: entry.journal,
  };
}

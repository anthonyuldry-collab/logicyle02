import { TeamProduct } from '../types';

/**
 * Catalogue d’exemples (Top ULDRY guide 2026) pour démontrer / générer un plan
 * quand le coureur n’a pas encore renseigné ses produits.
 * Specs approximatives fabricant — à remplacer par les produits réels du coureur.
 */
export const ULDRY_EXAMPLE_PRODUCTS: TeamProduct[] = [
  // ——— Boissons ———
  {
    id: 'ex-drink-nduranz-90',
    name: 'Nrgy Drink 90',
    type: 'drink',
    brand: 'Nduranz',
    carbs: 90,
    glucose: 50,
    fructose: 40,
    sodium: 500,
    notes: 'High-carb 1:0.8 · électrolytes complets · ~500 ml',
  },
  {
    id: 'ex-drink-sis-beta',
    name: 'Beta Fuel Drink',
    type: 'drink',
    brand: 'SiS',
    carbs: 80,
    glucose: 44,
    fructose: 36,
    sodium: 0,
    notes: 'High-carb 1:0.8 · 0 mg Na (ajouter sel) · ~500 ml',
  },
  {
    id: 'ex-drink-aptonia-iso',
    name: 'Iso+',
    type: 'drink',
    brand: 'Aptonia',
    carbs: 30,
    glucose: 20,
    fructose: 10,
    sodium: 350,
    notes: 'Isotonique 2:1 · entrée de gamme · ~500 ml',
  },
  {
    id: 'ex-drink-tailwind',
    name: 'Endurance Fuel',
    type: 'drink',
    brand: 'Tailwind',
    carbs: 25,
    glucose: 17,
    fructose: 8,
    sodium: 300,
    notes: '2:1 · all-in-one doux · ~500 ml',
  },
  // ——— Gels ———
  {
    id: 'ex-gel-nduranz-45',
    name: 'Nrgy Gel 45',
    type: 'gel',
    brand: 'Nduranz',
    carbs: 45,
    glucose: 25,
    fructose: 20,
    sodium: 200,
    notes: '1:0.8 · électrolytes · vegan',
  },
  {
    id: 'ex-gel-sis-beta',
    name: 'Beta Fuel Gel',
    type: 'gel',
    brand: 'SiS',
    carbs: 40,
    glucose: 22,
    fructose: 18,
    sodium: 100,
    notes: '1:0.8 · isotonique (sans eau obligatoire)',
  },
  {
    id: 'ex-gel-powerbar',
    name: 'PowerGel',
    type: 'gel',
    brand: 'PowerBar',
    carbs: 27,
    glucose: 18,
    fructose: 9,
    sodium: 200,
    notes: '2:1 C2MAX · classique abordable',
  },
  {
    id: 'ex-gel-maurten-caf',
    name: 'Gel 100 Caf',
    type: 'gel',
    brand: 'Maurten',
    carbs: 25,
    glucose: 14,
    fructose: 11,
    caffeine: 100,
    sodium: 40,
    notes: 'Hydrogel + 100 mg caféine · prendre ~90–120 min avant l’arrivée (pic ≈ 1 h)',
  },
  // ——— Barres / solides ———
  {
    id: 'ex-bar-powerbar-energize',
    name: 'Energize',
    type: 'bar',
    brand: 'PowerBar',
    carbs: 40,
    glucose: 27,
    fructose: 13,
    sodium: 150,
    notes: '2:1 · faible fibre · bon rapport perf/prix',
  },
  {
    id: 'ex-bar-decathlon-pdf',
    name: 'Pâte de fruits 1:0.8',
    type: 'bar',
    brand: 'Decathlon',
    carbs: 30,
    glucose: 17,
    fructose: 13,
    sodium: 50,
    notes: '1:0.8 · faible fibre · gamme World Tour',
  },
  {
    id: 'ex-bar-maurten-solid',
    name: 'Solid 160',
    type: 'bar',
    brand: 'Maurten',
    carbs: 40,
    glucose: 22,
    fructose: 18,
    sodium: 40,
    notes: '1:0.8 · avoine/riz · sans gluten',
  },
];

export function isUldryExampleProductId(id: string): boolean {
  return id.startsWith('ex-');
}

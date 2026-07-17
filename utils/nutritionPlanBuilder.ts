import { AllergyItem, PredefinedAllergen, Rider, TeamProduct } from '../types';
import { PREDEFINED_ALLERGEN_INFO } from '../constants';
import { formatGlucoseFructoseRatio } from './nutritionProductUtils';

export type NutritionPlanIntensity = 'moderate' | 'high';
export type NutritionPlanConditions = 'cold' | 'mild' | 'hot';

export interface NutritionPlanRequest {
  raceDurationHours: number;
  intensity: NutritionPlanIntensity;
  conditions: NutritionPlanConditions;
}

export interface NutritionPlanTimelineEntry {
  minute: number;
  label: string;
}

export interface NutritionPlanProductQty {
  productId: string;
  quantity: number;
}

export interface GeneratedNutritionPlan {
  carbsPerHourTarget: number;
  hydrationNotes: string;
  strategyNotes: string;
  timeline: NutritionPlanTimelineEntry[];
  selectedGels: NutritionPlanProductQty[];
  selectedBars: NutritionPlanProductQty[];
  selectedDrinks: NutritionPlanProductQty[];
  source: 'ai' | 'expert';
}

export interface NutritionPlanContext {
  rider: Pick<Rider, 'allergies' | 'dietaryRegimen' | 'foodPreferences' | 'weightKg' | 'performanceNutrition'>;
  products: TeamProduct[];
}

export function isProductCompatibleWithAllergies(product: TeamProduct, allergies: AllergyItem[]): boolean {
  const productText = [product.notes, product.composition].filter(Boolean).join(' ').toLowerCase();
  if (!productText || allergies.length === 0) return true;

  return !allergies.some(allergy => {
    if (allergy.allergenKey === 'CUSTOM') {
      return allergy.customAllergenName && productText.includes(allergy.customAllergenName.toLowerCase());
    }
    const info = PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergen];
    if (!info) return false;
    return info.commonSources.some(source => productText.includes(source.toLowerCase()));
  });
}

function productCarbs(p: TeamProduct): number {
  return p.carbs ?? (((p.glucose ?? 0) + (p.fructose ?? 0)) || 25);
}

function scoreGel(p: TeamProduct): number {
  const carbs = productCarbs(p);
  const ratio = formatGlucoseFructoseRatio(p.glucose, p.fructose);
  let score = carbs;
  if (ratio === '2:1' || ratio === '1:0.5') score += 15;
  if (p.sodium && p.sodium > 0) score += 5;
  return score;
}

function distributeQuantity(total: number, product: TeamProduct, maxPerHour: number, durationHours: number): number {
  const perUnit = productCarbs(product) || 1;
  const maxTotal = Math.ceil(maxPerHour * durationHours / perUnit);
  const needed = Math.ceil(total / perUnit);
  return Math.min(Math.max(needed, 1), maxTotal);
}

export function buildNutritionPlanContext(
  rider: Rider,
  teamProducts: TeamProduct[]
): NutritionPlanContext {
  const custom = rider.performanceNutrition?.customProducts ?? [];
  const merged = [...teamProducts, ...custom];
  const byId = new Map<string, TeamProduct>();
  merged.forEach(p => byId.set(p.id, p));

  const pn = rider.performanceNutrition;
  const selectedIds = new Set([
    ...(pn?.selectedGels ?? pn?.gels ?? []).map(s => s.productId),
    ...(pn?.selectedBars ?? pn?.bars ?? []).map(s => s.productId),
    ...(pn?.selectedDrinks ?? pn?.drinks ?? []).map(s => s.productId),
  ]);

  const products = selectedIds.size > 0
    ? [...byId.values()].filter(p => selectedIds.has(p.id))
    : [...byId.values()];

  return {
    rider: {
      allergies: rider.allergies ?? [],
      dietaryRegimen: rider.dietaryRegimen,
      foodPreferences: rider.foodPreferences,
      weightKg: rider.weightKg,
      performanceNutrition: rider.performanceNutrition,
    },
    products,
  };
}

export function generateNutritionPlanExpert(
  context: NutritionPlanContext,
  request: NutritionPlanRequest
): GeneratedNutritionPlan {
  const { rider, products } = context;
  const allergies = rider.allergies ?? [];
  const safe = (list: TeamProduct[]) =>
    list.filter(p => isProductCompatibleWithAllergies(p, allergies));

  const gels = safe(products.filter(p => p.type === 'gel'));
  const bars = safe(products.filter(p => p.type === 'bar'));
  const drinks = safe(products.filter(p => p.type === 'drink'));

  const weight = rider.weightKg ?? 70;
  let carbsPerHour = request.intensity === 'high' ? 90 : 65;
  if (weight > 78) carbsPerHour += 5;
  if (weight < 62) carbsPerHour -= 5;

  const hydrationMlPerHour = request.conditions === 'hot' ? 750 : request.conditions === 'cold' ? 400 : 550;
  const totalCarbs = Math.round(carbsPerHour * request.raceDurationHours);
  const gelCarbs = Math.round(totalCarbs * 0.65);
  const drinkCarbs = Math.round(totalCarbs * 0.25);
  const barCarbs = Math.round(totalCarbs * 0.1);

  const bestGel = [...gels].sort((a, b) => scoreGel(b) - scoreGel(a))[0];
  const bestBar = [...bars].sort((a, b) => productCarbs(b) - productCarbs(a))[0];
  const bestDrink = [...drinks].sort((a, b) => productCarbs(b) - productCarbs(a))[0];

  const selectedGels: NutritionPlanProductQty[] = bestGel
    ? [{ productId: bestGel.id, quantity: distributeQuantity(gelCarbs, bestGel, 2.5, request.raceDurationHours) }]
    : [];
  const selectedBars: NutritionPlanProductQty[] = bestBar
    ? [{ productId: bestBar.id, quantity: distributeQuantity(barCarbs, bestBar, 0.5, request.raceDurationHours) }]
    : [];
  const selectedDrinks: NutritionPlanProductQty[] = bestDrink
    ? [{ productId: bestDrink.id, quantity: distributeQuantity(drinkCarbs, bestDrink, 1.5, request.raceDurationHours) }]
    : [];

  const durationMin = Math.round(request.raceDurationHours * 60);
  const gelInterval = request.intensity === 'high' ? 20 : 25;
  const timeline: NutritionPlanTimelineEntry[] = [];

  timeline.push({ minute: 0, label: 'Petit-déjeuner riche en glucides complexes 3h avant le départ' });
  timeline.push({ minute: -60, label: 'Dernière collation légère (banane / barre) 1h avant' });

  for (let m = 15; m < durationMin; m += gelInterval) {
    const gelName = bestGel?.name ?? 'gel';
    timeline.push({ minute: m, label: `1 ${gelName}${bestGel?.caffeine ? ' (caféine)' : ''}` });
  }

  if (bestBar && durationMin >= 90) {
    timeline.push({ minute: Math.round(durationMin / 2), label: `1 ${bestBar.name} à mi-parcours` });
  }

  const drinkEvery = request.conditions === 'hot' ? 25 : 35;
  for (let m = drinkEvery; m < durationMin; m += drinkEvery) {
    timeline.push({ minute: m, label: `Boisson : ${Math.round(hydrationMlPerHour * (drinkEvery / 60))} ml` });
  }

  timeline.sort((a, b) => a.minute - b.minute);

  const productLines = [
    ...selectedGels.map(s => {
      const p = products.find(x => x.id === s.productId);
      return p ? `${s.quantity}× ${p.name} (${productCarbs(p)}g glucides/unté)` : null;
    }),
    ...selectedBars.map(s => {
      const p = products.find(x => x.id === s.productId);
      return p ? `${s.quantity}× ${p.name}` : null;
    }),
    ...selectedDrinks.map(s => {
      const p = products.find(x => x.id === s.productId);
      return p ? `${s.quantity}× ${p.name}` : null;
    }),
  ].filter(Boolean);

  const warnings: string[] = [];
  if (gels.length === 0 && bars.length === 0 && drinks.length === 0) {
    warnings.push('Aucun produit compatible trouvé — ajoutez des gels, barres ou boissons.');
  }
  if (allergies.length > 0) {
    warnings.push(`Plan filtré selon ${allergies.length} allergie(s) déclarée(s).`);
  }

  const strategyNotes = [
    `Objectif : ${carbsPerHour} g glucides/heure sur ${request.raceDurationHours}h (${totalCarbs} g total).`,
    `Hydratation cible : ~${hydrationMlPerHour} ml/h (${request.conditions === 'hot' ? 'conditions chaudes' : request.conditions === 'cold' ? 'conditions froides' : 'conditions tempérées'}).`,
    productLines.length ? `Produits recommandés : ${productLines.join(', ')}.` : '',
    rider.dietaryRegimen ? `Régime : ${rider.dietaryRegimen}.` : '',
    ...warnings,
  ].filter(Boolean).join('\n');

  const hydrationNotes = [
    `${Math.round(hydrationMlPerHour)} ml/h minimum`,
    request.conditions === 'hot' ? 'Électrolytes / sodium renforcés (chaleur)' : '1 bidon par heure en moyenne',
    bestDrink ? `Boisson type : ${bestDrink.name}` : 'Alterner eau et boisson isotonique',
  ].join('. ') + '.';

  return {
    carbsPerHourTarget: carbsPerHour,
    hydrationNotes,
    strategyNotes,
    timeline,
    selectedGels,
    selectedBars,
    selectedDrinks,
    source: 'expert',
  };
}

export function formatTimelineForDisplay(timeline: NutritionPlanTimelineEntry[]): string {
  return timeline
    .map(entry => {
      if (entry.minute <= 0) return `J${entry.minute === 0 ? '0' : entry.minute} min : ${entry.label}`;
      const h = Math.floor(entry.minute / 60);
      const m = entry.minute % 60;
      const time = h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
      return `${time} : ${entry.label}`;
    })
    .join('\n');
}

export function serializeProductsForAi(products: TeamProduct[]): string {
  return products.map(p => {
    const ratio = formatGlucoseFructoseRatio(p.glucose, p.fructose);
    return [
      `- id:${p.id} | ${p.type} | ${p.name} (${p.brand ?? '?'})`,
      `  glucides:${p.carbs ?? '?'}g glucose:${p.glucose ?? '?'}g fructose:${p.fructose ?? '?'}g`,
      ratio ? `  ratio G:F ${ratio}` : '',
      p.sodium ? `  sodium:${p.sodium}mg` : '',
      p.caffeine ? `  caféine:${p.caffeine}mg` : '',
      p.composition ? `  composition: ${p.composition.slice(0, 120)}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n');
}

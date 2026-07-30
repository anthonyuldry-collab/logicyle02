import { AllergyItem, PredefinedAllergen, Rider, TeamProduct } from '../types';
import { PREDEFINED_ALLERGEN_INFO } from '../constants';
import { ULDRY_EXAMPLE_PRODUCTS, isUldryExampleProductId } from '../constants/uldryExampleProducts';
import {
  NUTRITION_PLAN_ATTRIBUTION,
  NutritionPlanSessionType,
  concreteComboHint,
  hydrationMlPerHour,
  suggestedCarbsForSession,
  targetGlucoseFructoseRatio,
} from '../constants/uldryGutGuide';
import { formatGlucoseFructoseRatio } from './nutritionProductUtils';

export type NutritionPlanIntensity = 'moderate' | 'high';
export type { NutritionPlanSessionType };
export type NutritionPlanConditions = 'cold' | 'mild' | 'hot';
/** Priorité de construction du combo horaire */
export type NutritionPlanFuelPriority = 'balanced' | 'drink' | 'gel';

export const NUTRITION_FUEL_PRIORITY_OPTIONS: {
  value: NutritionPlanFuelPriority;
  label: string;
  hint: string;
}[] = [
  { value: 'balanced', label: 'Équilibré', hint: 'Boisson = base + sodium ; gel = complément' },
  { value: 'drink', label: 'Priorité boisson', hint: 'Maximum via le bidon ; peu de gels' },
  { value: 'gel', label: 'Priorité gels', hint: 'Boisson plus légère + gels pour les glucides' },
];

export interface NutritionPlanRequest {
  raceDurationHours: number;
  /** @deprecated préférer sessionType */
  intensity?: NutritionPlanIntensity;
  sessionType?: NutritionPlanSessionType;
  conditions: NutritionPlanConditions;
  /** Si renseigné, prime sur la suggestion durée / type de séance */
  carbsPerHourTarget?: number;
  fuelPriority?: NutritionPlanFuelPriority;
}

function resolveSessionType(request: NutritionPlanRequest): NutritionPlanSessionType {
  if (request.sessionType) return request.sessionType;
  return request.intensity === 'moderate' ? 'endurance' : 'race';
}

export interface NutritionPlanTimelineEntry {
  minute: number;
  label: string;
  /** Style hint for UI */
  kind?: 'pre' | 'start' | 'fuel' | 'caffeine' | 'hydrate' | 'finish';
}

export interface NutritionPlanProductQty {
  productId: string;
  quantity: number;
}

export interface NutritionPlanHourItem {
  role: string;
  productId?: string;
  label: string;
  carbsG?: number;
  caffeineMg?: number;
}

export interface NutritionPlanHourSlot {
  hourIndex: number; // 1-based
  fromMinute: number;
  toMinute: number;
  items: string[];
  entries: NutritionPlanHourItem[];
  carbsG: number;
  sodiumMg: number;
  fluidMl: number;
  hasCaffeine?: boolean;
}

export interface GeneratedNutritionPlan {
  carbsPerHourTarget: number;
  /** true si l’objectif vient du champ coureur / saisie, pas de la grille durée */
  targetFromUser: boolean;
  hydrationNotes: string;
  strategyNotes: string;
  timeline: NutritionPlanTimelineEntry[];
  hourlyPlan: NutritionPlanHourSlot[];
  selectedGels: NutritionPlanProductQty[];
  selectedBars: NutritionPlanProductQty[];
  selectedDrinks: NutritionPlanProductQty[];
  achievedCarbsPerHour: number;
  achievedSodiumPerHour: number;
  usedExampleCatalog: boolean;
  source: 'uldry' | 'ai' | 'expert';
}

export interface NutritionPlanContext {
  rider: Pick<Rider, 'allergies' | 'dietaryRegimen' | 'foodPreferences' | 'weightKg' | 'performanceNutrition'>;
  products: TeamProduct[];
  usedExampleCatalog: boolean;
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

function productLabel(p: TeamProduct): string {
  return p.brand ? `${p.brand} ${p.name}` : p.name;
}

function formatMinuteClock(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h00`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/** Écart au ratio cible (2:1 ≤90 g/h, 1:0.8 au-delà) */
function ratioDistance(p: TeamProduct, carbsPerHour: number): number {
  const g = p.glucose ?? 0;
  const f = p.fructose ?? 0;
  if (g <= 0 && f <= 0) return 2;
  if (g <= 0) return 1.5;
  const target = targetGlucoseFructoseRatio(carbsPerHour);
  const actual = f / g;
  const wanted = target.fructose / target.glucose;
  return Math.abs(actual - wanted);
}

function scoreProduct(
  p: TeamProduct,
  carbsPerHour: number,
  role: 'drink' | 'gel' | 'bar' | 'caffeine',
  fuelPriority: NutritionPlanFuelPriority = 'balanced'
): number {
  const carbs = productCarbs(p);
  let score = 0;
  const dist = ratioDistance(p, carbsPerHour);
  const sodium = p.sodium ?? 0;
  const hasFructose = (p.fructose ?? 0) > 0;

  if (role === 'drink') {
    if (carbs >= 30) score += 25;
    else if (carbs >= 25) score += 8;
    else score -= 40;

    if (sodium >= 300) score += 45;
    else if (sodium >= 200) score += 18;
    else if (sodium > 0) score += 5;
    else score -= 35;

    const coverage = carbsPerHour > 0 ? carbs / carbsPerHour : 0;

    if (fuelPriority === 'drink') {
      // Couvrir l’essentiel de la cible avec le bidon
      if (coverage >= 0.85 && coverage <= 1.15) score += 60;
      else if (coverage >= 0.7 && coverage < 0.85) score += 40;
      else if (coverage > 1.15 && coverage <= 1.35) score += 30;
      else if (coverage < 0.5) score -= 35;
    } else if (fuelPriority === 'gel') {
      // Boisson légère : sodium + hydratation, laisse la place aux gels (~25–45 % de la cible)
      if (coverage >= 0.25 && coverage <= 0.5) score += 55;
      else if (carbs >= 25 && carbs <= 40) score += 40;
      else if (carbs >= 70) score -= 40;
      else if (coverage > 0.7) score -= 25;
    } else if (carbsPerHour <= 50) {
      if (coverage >= 0.7 && coverage <= 1.15) score += 50;
      else if (carbs >= 28 && carbs <= 45) score += 35;
      else if (carbs >= 70) score -= 25;
    } else if (carbsPerHour <= 75) {
      if (coverage >= 0.4 && coverage <= 0.7) score += 50;
      else if (coverage >= 0.7 && coverage <= 1.05) score += 40;
      else if (coverage < 0.35) score -= 20;
      else if (coverage > 1.2) score -= 10;
    } else {
      if (coverage >= 0.75 && coverage <= 1.1) score += 55;
      else if (coverage >= 0.45 && coverage < 0.75) score += 30;
      else if (coverage > 1.1 && coverage <= 1.3) score += 25;
      else if (coverage < 0.4) score -= 30;
    }

    if (hasFructose && carbsPerHour >= 60) score += 12;
    if (dist < 0.15 && hasFructose) score += 10;
  }

  if (role === 'gel') {
    if (carbs >= 20 && carbs <= 50) score += 22;
    if (carbsPerHour >= 80 && carbs >= 35) score += 15;
    const typicalDrinkShare =
      fuelPriority === 'gel' ? 0.35 : fuelPriority === 'drink' ? 0.9 : 0.45;
    const typicalDrink = Math.min(
      fuelPriority === 'drink' ? carbsPerHour : 40,
      Math.max(30, carbsPerHour * typicalDrinkShare)
    );
    const gap = Math.max(0, carbsPerHour - typicalDrink);
    if (gap > 0 && Math.abs(carbs - gap) <= 12) score += 28;
    if (fuelPriority === 'gel') {
      if (carbs >= 35) score += 25;
      if (Math.abs(carbs - carbsPerHour * 0.5) <= 12) score += 20;
    }
    if (fuelPriority === 'drink') score -= 15;
    if ((p.caffeine ?? 0) > 0) score -= 45;
    if (sodium >= 100) score += 10;
    else if (sodium >= 50) score += 4;
    if (hasFructose && carbsPerHour >= 60) score += 10;
  }

  if (role === 'caffeine') {
    score += (p.caffeine ?? 0);
    if ((p.caffeine ?? 0) >= 80) score += 20;
    if (carbs <= 30) score += 15;
  }

  if (role === 'bar') {
    if (carbs >= 25 && carbs <= 45) score += 18;
    if ((p.notes ?? '').toLowerCase().includes('fibre')) score -= 10;
  }

  return score;
}

function pickBest(
  products: TeamProduct[],
  carbsPerHour: number,
  role: 'drink' | 'gel' | 'bar' | 'caffeine',
  fuelPriority: NutritionPlanFuelPriority = 'balanced'
): TeamProduct | undefined {
  if (products.length === 0) return undefined;
  return [...products].sort(
    (a, b) => scoreProduct(b, carbsPerHour, role, fuelPriority) - scoreProduct(a, carbsPerHour, role, fuelPriority)
  )[0];
}

function addQty(map: Map<string, number>, id: string, n = 1) {
  map.set(id, (map.get(id) ?? 0) + n);
}

function toQtyList(map: Map<string, number>, type: TeamProduct['type'], catalog: TeamProduct[]): NutritionPlanProductQty[] {
  return [...map.entries()]
    .filter(([id]) => catalog.find(p => p.id === id)?.type === type)
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}

export function buildNutritionPlanContext(
  rider: Rider,
  teamProducts: TeamProduct[],
  options?: { allowExampleCatalog?: boolean }
): NutritionPlanContext {
  const allowExamples = options?.allowExampleCatalog === true;
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

  let products = selectedIds.size > 0
    ? [...byId.values()].filter(p => selectedIds.has(p.id))
    : [...byId.values()];

  let usedExampleCatalog = false;
  if (products.length === 0 && allowExamples) {
    products = ULDRY_EXAMPLE_PRODUCTS;
    usedExampleCatalog = true;
  } else if (products.length > 0 && products.every(p => isUldryExampleProductId(p.id))) {
    usedExampleCatalog = true;
  }

  return {
    rider: {
      allergies: rider.allergies ?? [],
      dietaryRegimen: rider.dietaryRegimen,
      foodPreferences: rider.foodPreferences,
      weightKg: rider.weightKg,
      performanceNutrition: rider.performanceNutrition,
    },
    products,
    usedExampleCatalog,
  };
}

/**
 * Construit le combo horaire selon la priorité boisson / gels / équilibré.
 */
function buildHourlyCombo(
  targetG: number,
  drink: TeamProduct | undefined,
  gel: TeamProduct | undefined,
  bar: TeamProduct | undefined,
  allowBar: boolean,
  fluidTargetMl: number,
  fuelPriority: NutritionPlanFuelPriority = 'balanced'
): { items: { product: TeamProduct; role: string }[]; carbsG: number; sodiumMg: number; fluidMl: number } {
  const items: { product: TeamProduct; role: string }[] = [];
  let carbs = 0;
  let sodium = 0;

  const push = (product: TeamProduct, role: string) => {
    items.push({ product, role });
    carbs += productCarbs(product);
    sodium += product.sodium ?? 0;
  };

  if (targetG <= 0) {
    return { items, carbsG: 0, sodiumMg: 0, fluidMl: Math.round(fluidTargetMl * 0.5) };
  }

  const under = () => targetG - carbs > 8;
  const wouldFit = (extra: number) => carbs + extra <= targetG + 15;

  if (fuelPriority === 'gel') {
    // Gels d’abord pour les glucides ; boisson légère pour Na + fluide
    if (gel) push(gel, 'gel');
    if (gel && under() && wouldFit(productCarbs(gel))) push(gel, 'gel');
    if (drink) {
      // Toujours un bidon (sodium / hydratation), même si on dépasse un peu la cible glucides
      push(drink, 'bidon');
    }
    if (allowBar && bar && under() && wouldFit(productCarbs(bar))) push(bar, 'solide');
  } else if (fuelPriority === 'drink') {
    if (drink) push(drink, 'bidon');
    // Un gel seulement si vraiment sous la cible
    if (gel && targetG - carbs > 18 && wouldFit(productCarbs(gel))) {
      push(gel, 'gel');
    }
    if (allowBar && bar && under() && wouldFit(productCarbs(bar))) push(bar, 'solide');
  } else {
    if (drink) push(drink, 'bidon');
    if (gel && under() && (wouldFit(productCarbs(gel)) || carbs < targetG * 0.7)) {
      push(gel, 'gel');
    } else if (gel && under() && productCarbs(gel) <= 30 && targetG - carbs <= 25) {
      push(gel, 'gel');
    }
    if (allowBar && bar && under() && wouldFit(productCarbs(bar))) push(bar, 'solide');
    if (gel && under() && targetG >= 85 && wouldFit(productCarbs(gel))) {
      push(gel, 'gel');
    }
  }

  return {
    items,
    carbsG: Math.round(carbs),
    sodiumMg: Math.round(sodium),
    fluidMl: fluidTargetMl,
  };
}

/**
 * Plan nutritionnel expert cyclisme + catalogue produits (réels ou démo).
 */
export function generateNutritionPlanExpert(
  context: NutritionPlanContext,
  request: NutritionPlanRequest
): GeneratedNutritionPlan {
  const { rider, products, usedExampleCatalog } = context;
  const allergies = rider.allergies ?? [];
  const safe = (list: TeamProduct[]) =>
    list.filter(p => isProductCompatibleWithAllergies(p, allergies));

  const gels = safe(products.filter(p => p.type === 'gel'));
  const bars = safe(products.filter(p => p.type === 'bar'));
  const drinks = safe(products.filter(p => p.type === 'drink'));

  const sessionType = resolveSessionType(request);
  const session = suggestedCarbsForSession(sessionType, request.raceDurationHours);
  const suggestedCarbs = session.carbsPerHour;

  const userTargetRaw =
    request.carbsPerHourTarget ??
    rider.performanceNutrition?.carbsPerHourTarget;
  const userTarget =
    typeof userTargetRaw === 'number' && Number.isFinite(userTargetRaw) && userTargetRaw >= 0
      ? Math.round(userTargetRaw)
      : undefined;
  const targetFromUser = userTarget != null;

  let carbsPerHour = targetFromUser ? userTarget! : suggestedCarbs;

  if (!targetFromUser) {
    const weight = rider.weightKg ?? 70;
    if (carbsPerHour > 0 && sessionType !== 'vo2') {
      if (weight > 80 && carbsPerHour < session.max) {
        carbsPerHour = Math.min(session.max, carbsPerHour + 5);
      }
      if (weight < 58 && carbsPerHour > session.min) {
        carbsPerHour = Math.max(session.min, carbsPerHour - 5);
      }
    }
  } else {
    carbsPerHour = Math.min(150, Math.max(0, carbsPerHour));
  }

  const ratioTarget = targetGlucoseFructoseRatio(carbsPerHour);
  const hydration = hydrationMlPerHour(carbsPerHour, request.conditions);
  const sodiumTargetMin = request.conditions === 'hot' ? 500 : 300;
  const sodiumTargetMax = request.conditions === 'hot' ? 700 : 500;

  const fuelPriority: NutritionPlanFuelPriority = request.fuelPriority ?? 'balanced';

  const bestDrink = pickBest(drinks, carbsPerHour, 'drink', fuelPriority);
  const gelPool = gels.filter(g => !(g.caffeine && g.caffeine > 0));
  const bestGel = pickBest(gelPool.length ? gelPool : gels, carbsPerHour, 'gel', fuelPriority);
  const caffeineGel = pickBest(
    gels.filter(g => (g.caffeine ?? 0) >= 50),
    carbsPerHour,
    'caffeine',
    fuelPriority
  );
  const allowBars = session.allowBars;
  const bestBar = allowBars ? pickBest(bars, carbsPerHour, 'bar', fuelPriority) : undefined;

  const durationMin = Math.round(request.raceDurationHours * 60);
  const hourCount = Math.max(1, Math.ceil(request.raceDurationHours));
  // Caféine : pas en VO2 (effort déjà stimulé) ; sinon ~90–120 min avant la fin
  const caffeineHourIndex =
    caffeineGel &&
    carbsPerHour > 0 &&
    sessionType !== 'vo2' &&
    request.raceDurationHours >= 2.5
      ? Math.max(0, hourCount - 2)
      : -1;

  const qtyMap = new Map<string, number>();
  const hourlyPlan: NutritionPlanHourSlot[] = [];
  const timeline: NutritionPlanTimelineEntry[] = [];

  // Pré-course + chronologie claire (évite le bruit « gorgées » à chaque heure)
  if (carbsPerHour > 0) {
    timeline.push({
      minute: -180,
      kind: 'pre',
      label: 'Repas glucides (riz / pâtes)',
    });
    timeline.push({
      minute: -60,
      kind: 'pre',
      label: bestDrink
        ? `500 ml ${productLabel(bestDrink)}`
        : '500 ml boisson glucidée',
    });
    timeline.push({
      minute: 0,
      kind: 'start',
      label: 'Gorgées dès 15–20 min — 1 bidon étalé sur ~1 h',
    });
  } else {
    timeline.push({ minute: -60, kind: 'pre', label: 'Glycogène chargé' });
    timeline.push({ minute: 0, kind: 'start', label: 'Rien à avaler' });
  }

  let totalCarbs = 0;
  let totalSodium = 0;
  let totalFluid = 0;

  for (let h = 0; h < hourCount; h++) {
    const fromMinute = h * 60;
    const toMinute = Math.min(durationMin, (h + 1) * 60);
    const hourFraction = (toMinute - fromMinute) / 60;
    const hourTarget = Math.round(carbsPerHour * hourFraction);
    const isCaffeineHour = h === caffeineHourIndex;

    const useSolidThisHour = allowBars && !!bestBar && h % 2 === 1;
    const combo = buildHourlyCombo(
      hourTarget,
      bestDrink,
      useSolidThisHour ? undefined : bestGel,
      useSolidThisHour ? bestBar : undefined,
      useSolidThisHour,
      Math.round(hydration.target * hourFraction),
      fuelPriority
    );

    // Compléter un petit écart (sauf priorité boisson stricte)
    if (
      fuelPriority !== 'drink' &&
      !isCaffeineHour &&
      combo.carbsG < hourTarget - 8
    ) {
      const need = hourTarget - combo.carbsG;
      const filler = gelPool
        .map(g => ({ g, c: productCarbs(g) }))
        .filter(({ c }) => {
          const after = combo.carbsG + c;
          return after <= hourTarget + 12 && Math.abs(after - hourTarget) <= Math.abs(need);
        })
        .sort((a, b) => Math.abs(a.c - need) - Math.abs(b.c - need))[0];
      if (filler) {
        combo.items.push({ product: filler.g, role: 'gel' });
        combo.carbsG = Math.round(combo.carbsG + filler.c);
        combo.sodiumMg = Math.round(combo.sodiumMg + (filler.g.sodium ?? 0));
      }
    }

    if (allowBars && combo.carbsG < hourTarget - 12) {
      if (useSolidThisHour && bestBar && !combo.items.some(i => i.role === 'solide')) {
        combo.items.push({ product: bestBar, role: 'solide' });
        combo.carbsG = Math.round(combo.carbsG + productCarbs(bestBar));
        combo.sodiumMg = Math.round(combo.sodiumMg + (bestBar.sodium ?? 0));
      } else if (!useSolidThisHour && bestGel && !combo.items.some(i => i.role === 'gel')) {
        combo.items.push({ product: bestGel, role: 'gel' });
        combo.carbsG = Math.round(combo.carbsG + productCarbs(bestGel));
        combo.sodiumMg = Math.round(combo.sodiumMg + (bestGel.sodium ?? 0));
      }
    }

    if (isCaffeineHour && caffeineGel) {
      const withoutGels = combo.items.filter(i => i.role === 'bidon' || i.role === 'solide');
      combo.items = [...withoutGels, { product: caffeineGel, role: 'gel caféiné' }];
      combo.carbsG = Math.round(combo.items.reduce((s, i) => s + productCarbs(i.product), 0));
      combo.sodiumMg = Math.round(combo.items.reduce((s, i) => s + (i.product.sodium ?? 0), 0));
    }

    const entries: NutritionPlanHourItem[] = combo.items.map(i => ({
      role: i.role,
      productId: i.product.id,
      label: productLabel(i.product),
      carbsG: productCarbs(i.product),
      caffeineMg: i.product.caffeine || undefined,
    }));

    const itemLabels = entries.map(e => {
      addQty(qtyMap, e.productId!, 1);
      const p = products.find(x => x.id === e.productId);
      const ratio = p ? formatGlucoseFructoseRatio(p.glucose, p.fructose) : null;
      const caf = e.caffeineMg ? ` · ${e.caffeineMg}mg caféine` : '';
      return `${e.role} : ${e.label} (${e.carbsG}g${ratio ? ` · ${ratio}` : ''}${caf})`;
    });

    if (carbsPerHour <= 0) {
      itemLabels.push('Eau selon soif · éventuel rinçage glucidique');
    }

    hourlyPlan.push({
      hourIndex: h + 1,
      fromMinute,
      toMinute,
      items: itemLabels,
      entries,
      carbsG: combo.carbsG,
      sodiumMg: combo.sodiumMg,
      fluidMl: combo.fluidMl,
      hasCaffeine: isCaffeineHour && !!caffeineGel,
    });

    totalCarbs += combo.carbsG;
    totalSodium += combo.sodiumMg;
    totalFluid += combo.fluidMl;

    // Chronologie : bidon étalé sur l’heure ; gels à mi-parcours de l’heure
    if (carbsPerHour <= 0) {
      if (h === 0) {
        timeline.push({
          minute: Math.round((fromMinute + toMinute) / 2),
          kind: 'hydrate',
          label: 'Boire selon soif',
        });
      }
    } else {
      const hourLen = Math.max(20, toMinute - fromMinute);
      const drinkStart = h === 0 ? fromMinute + 15 : fromMinute + 5;
      const drinkEnd = fromMinute + Math.round(hourLen * 0.9);
      const gelAt = fromMinute + Math.round(hourLen * 0.55);

      for (const item of combo.items) {
        const isCaf = (item.product.caffeine ?? 0) >= 50 || item.role.includes('caféiné');
        if (isCaf) {
          timeline.push({
            minute: fromMinute + 10,
            kind: 'caffeine',
            label: `${productLabel(item.product)} · ${item.product.caffeine}mg caf (pic ≈ 1 h)`,
          });
        } else if (item.role === 'bidon') {
          timeline.push({
            minute: drinkStart,
            kind: 'fuel',
            label: `Début bidon ${productLabel(item.product)} (~${productCarbs(item.product)}g) — gorgées jusqu’à ~${formatMinuteClock(drinkEnd)}`,
          });
        } else if (item.role === 'solide') {
          timeline.push({
            minute: gelAt,
            kind: 'fuel',
            label: `${productLabel(item.product)} · ~${productCarbs(item.product)}g`,
          });
        } else {
          timeline.push({
            minute: gelAt,
            kind: 'fuel',
            label: `Gel ${productLabel(item.product)} · ~${productCarbs(item.product)}g`,
          });
        }
      }
    }
  }

  if (carbsPerHour > 0 && durationMin >= 30) {
    timeline.push({
      minute: durationMin,
      kind: 'finish',
      label: 'Récupération (glucides + protéines)',
    });
  }

  timeline.sort((a, b) => a.minute - b.minute || (a.kind === 'caffeine' ? -1 : 0));

  const hoursEffective = Math.max(request.raceDurationHours, 0.5);
  const achievedCarbsPerHour = Math.round(totalCarbs / hoursEffective);
  const achievedSodiumPerHour = Math.round(totalSodium / hoursEffective);

  const selectedGels = toQtyList(qtyMap, 'gel', products);
  const selectedBars = toQtyList(qtyMap, 'bar', products);
  const selectedDrinks = toQtyList(qtyMap, 'drink', products);

  const warnings: string[] = [];
  if (usedExampleCatalog) {
    warnings.push('Produits démo — remplacez par vos références testées à l’entraînement avant le jour J.');
  }
  if (gels.length === 0 && bars.length === 0 && drinks.length === 0) {
    warnings.push('Aucun produit disponible.');
  }
  if (allergies.length > 0) {
    warnings.push(`Filtré selon ${allergies.length} allergie(s).`);
  }
  if (carbsPerHour > 90) {
    warnings.push('Cible > 90 g/h : réservée aux ventres entraînés (paliers 45→60→90→120).');
  }
  if (bestDrink && (bestDrink.sodium ?? 0) === 0) {
    warnings.push(`« ${productLabel(bestDrink)} » : 0 mg sodium — ajoutez ~0,5–0,7 g de sel / bidon.`);
  }
  if (achievedSodiumPerHour < sodiumTargetMin && carbsPerHour > 0) {
    warnings.push(
      `Sodium réalisé ~${achievedSodiumPerHour} mg/h < cible ${sodiumTargetMin}–${sodiumTargetMax} mg/h — renforcez la boisson.`
    );
  }
  if (caffeineHourIndex >= 0 && caffeineGel) {
    warnings.push(
      `Caféine placée en H${caffeineHourIndex + 1} (~${caffeineHourIndex * 60 + 10} min) : absorption ≈ 1 h, pour cibler la dernière heure.`
    );
  }
  if (Math.abs(achievedCarbsPerHour - carbsPerHour) > 15 && carbsPerHour > 0) {
    warnings.push(
      `Écart objectif : réalisé ${achievedCarbsPerHour} g/h vs cible ${carbsPerHour} g/h — ajustez les produits (densité glucidique).`
    );
  }
  const hasMulti = [...gels, ...drinks].some(p => (p.fructose ?? 0) > 0 && (p.glucose ?? 0) > 0);
  if (carbsPerHour >= 60 && !hasMulti && (gels.length > 0 || drinks.length > 0)) {
    warnings.push(`Au-delà de 60 g/h, viser ratio ${ratioTarget.label} (SGLT1 sature ~60 g glucose/h).`);
  }

  const strategyNotes = [
    NUTRITION_PLAN_ATTRIBUTION,
    targetFromUser
      ? `Objectif saisi : ${carbsPerHour} g/h (prioritaire sur la suggestion séance ≈ ${suggestedCarbs} g/h).`
      : `Séance ${sessionType} : suggestion ${carbsPerHour} g/h (${session.min}–${session.max}).`,
    `Réalisé avec vos produits ≈ ${achievedCarbsPerHour} g/h (${totalCarbs} g total sur ${request.raceDurationHours} h).`,
    session.note,
    `Boisson / gels : ${
      fuelPriority === 'drink'
        ? 'priorité boisson'
        : fuelPriority === 'gel'
          ? 'priorité gels (bidon surtout pour Na + fluide)'
          : 'équilibré (boisson = base + sodium ; gel = complément)'
    }.`,
    `Ratio glucides : ${ratioTarget.label}. Combo type : ${concreteComboHint(carbsPerHour)}`,
    `Hydratation : ${hydration.min}–${hydration.max} ml/h (cible ${hydration.target}) — ${hydration.note}`,
    `Sodium : viser ${sodiumTargetMin}–${sodiumTargetMax} mg/h (réalisé ≈ ${achievedSodiumPerHour} mg/h).`,
    allowBars
      ? 'Endurance : solides possibles (satiété).'
      : sessionType === 'chrono'
        ? 'CLM : liquides et gels fluides uniquement.'
        : 'Priorité liquides + gels.',
    rider.dietaryRegimen ? `Régime : ${rider.dietaryRegimen}.` : '',
    ...warnings,
  ].filter(Boolean).join('\n');

  const hydrationNotes = [
    `${hydration.target} ml/h (${hydration.min}–${hydration.max})`,
    `Sodium ${sodiumTargetMin}–${sodiumTargetMax} mg/h`,
    bestDrink ? `Boisson base : ${productLabel(bestDrink)}` : 'Prévoir une boisson avec Na (≥ 300 mg/h)',
    hydration.note,
  ].join('. ') + '.';

  return {
    carbsPerHourTarget: carbsPerHour,
    targetFromUser,
    hydrationNotes,
    strategyNotes,
    timeline,
    hourlyPlan,
    selectedGels,
    selectedBars,
    selectedDrinks,
    achievedCarbsPerHour,
    achievedSodiumPerHour,
    usedExampleCatalog,
    source: 'uldry',
  };
}

export function formatTimelineTime(minute: number): string {
  if (minute < 0) return `J−${Math.abs(minute)} min`;
  if (minute === 0) return 'Départ';
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  if (h > 0 && m === 0) return `${h}h00`;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m} min`;
}

export function formatTimelineForDisplay(timeline: NutritionPlanTimelineEntry[]): string {
  return timeline
    .map(entry => `${formatTimelineTime(entry.minute)} — ${entry.label}`)
    .join('\n');
}

export function formatHourlyPlanForDisplay(hourlyPlan: NutritionPlanHourSlot[]): string {
  return hourlyPlan
    .map(slot => {
      const caf = slot.hasCaffeine ? ' · caféine' : '';
      const header = `Heure ${slot.hourIndex} (${slot.fromMinute}–${slot.toMinute} min) · ${slot.carbsG} g · ${slot.fluidMl} ml · ${slot.sodiumMg} mg Na${caf}`;
      const lines = slot.entries?.length
        ? slot.entries.map(e => {
            const cafMg = e.caffeineMg ? ` · ${e.caffeineMg}mg caf` : '';
            return `  • ${e.role} : ${e.label}${e.carbsG != null ? ` (${e.carbsG}g${cafMg})` : ''}`;
          })
        : slot.items.map(i => `  • ${i}`);
      return [header, ...lines].join('\n');
    })
    .join('\n\n');
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
      isUldryExampleProductId(p.id) ? '  [exemple guide]' : '',
    ].filter(Boolean).join('\n');
  }).join('\n');
}

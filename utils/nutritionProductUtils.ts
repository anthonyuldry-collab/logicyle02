import { TeamProduct } from '../types';

export const EMPTY_CUSTOM_PRODUCT: Omit<TeamProduct, 'id'> = {
  name: '',
  type: 'gel',
  brand: '',
  barcode: '',
  carbs: 0,
  glucose: 0,
  fructose: 0,
  caffeine: 0,
  sodium: 0,
  composition: '',
  notes: '',
};

export function createEmptyCustomProduct(type: TeamProduct['type'] = 'gel'): Omit<TeamProduct, 'id'> {
  return { ...EMPTY_CUSTOM_PRODUCT, type };
}

/** Ratio glucose:fructose (ex. "2:1") */
export function formatGlucoseFructoseRatio(glucose?: number, fructose?: number): string | null {
  const g = glucose ?? 0;
  const f = fructose ?? 0;
  if (g <= 0 && f <= 0) return null;
  if (f <= 0) return `${g}:0`;
  if (g <= 0) return `0:${f}`;

  const gcd = (a: number, b: number): number => (b < 0.01 ? a : gcd(b, a % b));
  const scale = 10;
  const gi = Math.round(g * scale);
  const fi = Math.round(f * scale);
  const d = gcd(gi, fi);
  return `${gi / d}:${fi / d}`;
}

export function syncCarbsFromSugars(product: Omit<TeamProduct, 'id'>): Omit<TeamProduct, 'id'> {
  const glucose = product.glucose ?? 0;
  const fructose = product.fructose ?? 0;
  const sugarSum = glucose + fructose;
  if (sugarSum > 0 && (!product.carbs || product.carbs < sugarSum)) {
    return { ...product, carbs: Math.round(sugarSum * 10) / 10 };
  }
  return product;
}

export function formatProductNutritionSummary(product: TeamProduct): string {
  const parts: string[] = [];
  if (product.carbs) parts.push(`${product.carbs}g glucides`);
  const ratio = formatGlucoseFructoseRatio(product.glucose, product.fructose);
  if (ratio) parts.push(`ratio ${ratio}`);
  if (product.caffeine) parts.push(`${product.caffeine}mg caféine`);
  if (product.sodium) parts.push(`${product.sodium}mg sodium`);
  return parts.join(' • ');
}

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  serving_size?: string;
  nutriments?: {
    carbohydrates_serving?: number;
    carbohydrates_100g?: number;
    sugars_serving?: number;
    sugars_100g?: number;
    caffeine_serving?: number;
    caffeine_100g?: number;
    sodium_serving?: number;
    sodium_100g?: number;
  };
}

export interface ScannedProductData {
  barcode: string;
  name: string;
  brand: string;
  composition: string;
  carbs?: number;
  caffeine?: number;
  sodium?: number;
}

function pickNutrient(serving?: number, per100g?: number): number | undefined {
  if (typeof serving === 'number' && serving > 0) return Math.round(serving * 10) / 10;
  if (typeof per100g === 'number' && per100g > 0) return Math.round(per100g * 10) / 10;
  return undefined;
}

export async function fetchProductByBarcode(barcode: string): Promise<ScannedProductData | null> {
  const clean = barcode.replace(/\D/g, '');
  if (!clean) return null;

  const urls = [
    `https://world.openfoodfacts.org/api/v2/product/${clean}.json`,
    `https://world.openfoodfacts.org/api/v0/product/${clean}.json`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const product = data.product ?? data;
      if (data.status !== 1 && data.status !== 'success' && !product?.product_name) continue;

      const p = product as OpenFoodFactsProduct;
      const name = (p.product_name || '').trim();
      if (!name) continue;

      return {
        barcode: clean,
        name,
        brand: (p.brands || '').split(',')[0]?.trim() || '',
        composition: (p.ingredients_text || '').trim(),
        carbs: pickNutrient(p.nutriments?.carbohydrates_serving, p.nutriments?.carbohydrates_100g),
        caffeine: pickNutrient(p.nutriments?.caffeine_serving, p.nutriments?.caffeine_100g),
        sodium: pickNutrient(p.nutriments?.sodium_serving, p.nutriments?.sodium_100g),
      };
    } catch {
      // Essayer l'API suivante
    }
  }

  return null;
}

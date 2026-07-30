import { Rider } from '../types';
import {
  GeneratedNutritionPlan,
  NutritionPlanContext,
  NutritionPlanRequest,
  generateNutritionPlanExpert,
} from '../utils/nutritionPlanBuilder';

/**
 * Génère un plan nutritionnel cyclisme localement (règles métier).
 */
export async function generateNutritionPlan(
  _rider: Rider,
  context: NutritionPlanContext,
  request: NutritionPlanRequest
): Promise<GeneratedNutritionPlan> {
  return generateNutritionPlanExpert(context, request);
}

/** @deprecated Conservé pour compat UI — le plan est toujours local. */
export function isNutritionAiConfigured(): boolean {
  return false;
}

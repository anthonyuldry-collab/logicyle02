import { Rider } from '../types';
import {
  GeneratedNutritionPlan,
  NutritionPlanContext,
  NutritionPlanRequest,
  generateNutritionPlanExpert,
  serializeProductsForAi,
} from '../utils/nutritionPlanBuilder';

const GEMINI_MODEL = 'gemini-2.0-flash';

function parseAiJson(text: string): Partial<GeneratedNutritionPlan> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<GeneratedNutritionPlan>;
  } catch {
    return null;
  }
}

async function callGemini(prompt: string): Promise<string> {
  // Clé client uniquement en DEV local — en prod, basculer sur une Cloud Function (GEMINI_API_KEY).
  const apiKey =
    import.meta.env.DEV
      ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
      : undefined;
  if (!apiKey?.trim()) {
    throw new Error('NO_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Réponse IA vide');
  return text;
}

function buildPrompt(context: NutritionPlanContext, request: NutritionPlanRequest, rider: Rider): string {
  const allergies = (rider.allergies ?? [])
    .map(a => a.customAllergenName || a.allergenKey)
    .join(', ') || 'aucune';

  return `Tu es un nutritionniste du sport spécialisé cyclisme. Génère un plan nutritionnel de course en JSON strict.

COUREUR:
- Poids: ${rider.weightKg ?? 'inconnu'} kg
- Allergies: ${allergies}
- Régime: ${rider.dietaryRegimen || 'non précisé'}
- Préférences: ${rider.foodPreferences || 'non précisées'}

COURSE:
- Durée: ${request.raceDurationHours} heures
- Intensité: ${request.intensity === 'high' ? 'élevée (compétition)' : 'modérée'}
- Conditions: ${request.conditions}

PRODUITS DISPONIBLES (utiliser UNIQUEMENT ces productId):
${serializeProductsForAi(context.products) || 'Aucun produit — propose des quantités vides'}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
{
  "carbsPerHourTarget": number,
  "hydrationNotes": "string en français",
  "strategyNotes": "string détaillée en français avec justification",
  "timeline": [{"minute": number, "label": "string en français"}],
  "selectedGels": [{"productId": "string", "quantity": number}],
  "selectedBars": [{"productId": "string", "quantity": number}],
  "selectedDrinks": [{"productId": "string", "quantity": number}]
}

Règles:
- Respecter les allergies (exclure produits incompatibles)
- Privilégier ratio glucose:fructose 2:1 pour les gels si possible
- ${request.intensity === 'high' ? '90' : '60-70'} g glucides/heure environ
- Timeline minute par minute pendant la course (pas avant départ sauf -60 et 0)
- Quantités réalistes pour la durée`;
}

function mergeAiWithExpert(
  ai: Partial<GeneratedNutritionPlan>,
  expert: GeneratedNutritionPlan,
  validProductIds: Set<string>
): GeneratedNutritionPlan {
  const sanitize = (items?: { productId: string; quantity: number }[]) =>
    (items ?? []).filter(i => validProductIds.has(i.productId) && i.quantity > 0);

  return {
    carbsPerHourTarget: ai.carbsPerHourTarget ?? expert.carbsPerHourTarget,
    hydrationNotes: ai.hydrationNotes ?? expert.hydrationNotes,
    strategyNotes: ai.strategyNotes ?? expert.strategyNotes,
    timeline: (ai.timeline?.length ? ai.timeline : expert.timeline),
    selectedGels: sanitize(ai.selectedGels).length ? sanitize(ai.selectedGels) : expert.selectedGels,
    selectedBars: sanitize(ai.selectedBars).length ? sanitize(ai.selectedBars) : expert.selectedBars,
    selectedDrinks: sanitize(ai.selectedDrinks).length ? sanitize(ai.selectedDrinks) : expert.selectedDrinks,
    source: 'ai',
  };
}

export async function generateNutritionPlan(
  rider: Rider,
  context: NutritionPlanContext,
  request: NutritionPlanRequest
): Promise<GeneratedNutritionPlan> {
  const expert = generateNutritionPlanExpert(context, request);
  const validIds = new Set(context.products.map(p => p.id));

  if (!import.meta.env.DEV || !import.meta.env.VITE_GEMINI_API_KEY) {
    return expert;
  }

  try {
    const raw = await callGemini(buildPrompt(context, request, rider));
    const parsed = parseAiJson(raw);
    if (!parsed) return expert;
    return mergeAiWithExpert(parsed, expert, validIds);
  } catch (err) {
    if ((err as Error).message === 'NO_API_KEY') return expert;
    console.warn('Nutrition plan AI fallback:', err);
    return { ...expert, strategyNotes: expert.strategyNotes + '\n\n(IA indisponible — plan expert appliqué.)' };
  }
}

export function isNutritionAiConfigured(): boolean {
  return Boolean(import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY?.trim());
}

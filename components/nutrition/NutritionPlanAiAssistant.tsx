import React, { useMemo, useState } from 'react';
import { Rider, TeamProduct } from '../../types';
import ActionButton from '../ActionButton';
import {
  GeneratedNutritionPlan,
  NutritionPlanConditions,
  NutritionPlanIntensity,
  NutritionPlanRequest,
  buildNutritionPlanContext,
  formatTimelineForDisplay,
} from '../../utils/nutritionPlanBuilder';
import { generateNutritionPlan, isNutritionAiConfigured } from '../../services/nutritionPlanAiService';

interface NutritionPlanAiAssistantProps {
  rider: Rider;
  teamProducts: TeamProduct[];
  onApply: (plan: GeneratedNutritionPlan) => void;
  variant?: 'light' | 'dark';
}

const NutritionPlanAiAssistant: React.FC<NutritionPlanAiAssistantProps> = ({
  rider,
  teamProducts,
  onApply,
  variant = 'light',
}) => {
  const [durationHours, setDurationHours] = useState('4');
  const [intensity, setIntensity] = useState<NutritionPlanIntensity>('high');
  const [conditions, setConditions] = useState<NutritionPlanConditions>('mild');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeneratedNutritionPlan | null>(null);

  const context = useMemo(
    () => buildNutritionPlanContext(rider, teamProducts),
    [rider, teamProducts]
  );

  const productCount = context.products.length;
  const aiConfigured = isNutritionAiConfigured();

  const inputClass = variant === 'dark'
    ? 'block w-full px-3 py-2 border border-slate-500 rounded-md bg-slate-800 text-slate-100 text-sm'
    : 'block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm';

  const labelClass = variant === 'dark'
    ? 'block text-xs font-medium text-slate-300 mb-1'
    : 'block text-xs font-medium text-gray-700 mb-1';

  const boxClass = variant === 'dark'
    ? 'p-4 rounded-lg border border-violet-500/40 bg-violet-950/30'
    : 'p-4 rounded-lg border border-violet-200 bg-violet-50';

  const handleGenerate = async () => {
    const hours = parseFloat(durationHours);
    if (!hours || hours <= 0 || hours > 24) {
      setError('Durée invalide (entre 0.5 et 24 h).');
      return;
    }
    if (productCount === 0) {
      setError('Ajoutez d\'abord des produits (gels, barres ou boissons).');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const request: NutritionPlanRequest = {
        raceDurationHours: hours,
        intensity,
        conditions,
      };
      const result = await generateNutritionPlan(rider, context, request);
      setPlan(result);
    } catch {
      setError('Impossible de générer le plan. Réessayez.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resolveProductName = (id: string) =>
    context.products.find(p => p.id === id)?.name ?? id;

  return (
    <div className={boxClass}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h4 className={`font-semibold text-sm ${variant === 'dark' ? 'text-violet-200' : 'text-violet-900'}`}>
            ✨ Assistant Plan Nutritionnel
          </h4>
          <p className={`text-xs mt-0.5 ${variant === 'dark' ? 'text-slate-400' : 'text-violet-700'}`}>
            {aiConfigured
              ? (variant === 'dark' ? 'IA Gemini + analyse de vos produits' : 'IA Gemini + analyse de vos produits (ratios, glucides, allergies)')
              : 'Plan expert automatique à partir de vos produits — l\'IA cloud est optionnelle'}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${variant === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-white text-gray-600'}`}>
          {productCount} produit{productCount > 1 ? 's' : ''} analysé{productCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className={labelClass}>Durée course (h)</label>
          <input
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={durationHours}
            onChange={e => setDurationHours(e.target.value)}
            className={inputClass}
            placeholder="4"
          />
        </div>
        <div>
          <label className={labelClass}>Intensité</label>
          <select
            value={intensity}
            onChange={e => setIntensity(e.target.value as NutritionPlanIntensity)}
            className={inputClass}
          >
            <option value="moderate">Modérée</option>
            <option value="high">Élevée (compétition)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Conditions</label>
          <select
            value={conditions}
            onChange={e => setConditions(e.target.value as NutritionPlanConditions)}
            className={inputClass}
          >
            <option value="cold">Froid</option>
            <option value="mild">Tempéré</option>
            <option value="hot">Chaud</option>
          </select>
        </div>
      </div>

      <ActionButton
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || productCount === 0}
        className="w-full sm:w-auto"
      >
        {isGenerating ? 'Génération en cours…' : '✨ Proposer un plan nutritionnel'}
      </ActionButton>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>
      )}

      {plan && (
        <div className={`mt-4 p-3 rounded-lg border ${variant === 'dark' ? 'bg-slate-800/60 border-slate-600' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className={`text-xs font-medium ${variant === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
              {plan.source === 'ai' ? '🤖 Plan généré par IA' : '📋 Plan expert (règles métier)'}
            </span>
            <ActionButton type="button" size="sm" onClick={() => onApply(plan)}>
              Appliquer ce plan
            </ActionButton>
          </div>

          <div className={`text-sm space-y-2 ${variant === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
            <p><strong>Glucides/h :</strong> {plan.carbsPerHourTarget} g</p>
            <p><strong>Hydratation :</strong> {plan.hydrationNotes}</p>
            <p className="whitespace-pre-wrap text-xs opacity-90">{plan.strategyNotes}</p>

            {(plan.selectedGels.length > 0 || plan.selectedBars.length > 0 || plan.selectedDrinks.length > 0) && (
              <div className="text-xs">
                <strong>Quantités :</strong>
                <ul className="list-disc list-inside mt-1">
                  {plan.selectedGels.map(s => (
                    <li key={s.productId}>{s.quantity}× {resolveProductName(s.productId)} (gel)</li>
                  ))}
                  {plan.selectedBars.map(s => (
                    <li key={s.productId}>{s.quantity}× {resolveProductName(s.productId)} (barre)</li>
                  ))}
                  {plan.selectedDrinks.map(s => (
                    <li key={s.productId}>{s.quantity}× {resolveProductName(s.productId)} (boisson)</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <strong className="text-xs">Timeline :</strong>
              <pre className={`text-xs mt-1 whitespace-pre-wrap font-sans ${variant === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                {formatTimelineForDisplay(plan.timeline)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionPlanAiAssistant;

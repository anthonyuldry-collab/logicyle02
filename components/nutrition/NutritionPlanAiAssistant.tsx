import React, { useMemo, useState } from 'react';
import { Rider, TeamProduct } from '../../types';
import ActionButton from '../ActionButton';
import {
  GeneratedNutritionPlan,
  NutritionPlanConditions,
  NutritionPlanFuelPriority,
  NutritionPlanRequest,
  NutritionPlanSessionType,
  NUTRITION_FUEL_PRIORITY_OPTIONS,
  buildNutritionPlanContext,
  formatTimelineTime,
} from '../../utils/nutritionPlanBuilder';
import { generateNutritionPlan } from '../../services/nutritionPlanAiService';
import { ULDRY_EXAMPLE_PRODUCTS } from '../../constants/uldryExampleProducts';
import { NUTRITION_SESSION_OPTIONS } from '../../constants/uldryGutGuide';
import { formatGlucoseFructoseRatio } from '../../utils/nutritionProductUtils';

interface NutritionPlanAiAssistantProps {
  rider: Rider;
  teamProducts: TeamProduct[];
  onApply: (plan: GeneratedNutritionPlan) => void;
  variant?: 'light' | 'dark';
  /** Produits d’illustration — réservé à Horizon Atlantique / présentation. */
  allowDemoExamples?: boolean;
}

const NutritionPlanAiAssistant: React.FC<NutritionPlanAiAssistantProps> = ({
  rider,
  teamProducts,
  onApply,
  variant = 'light',
  allowDemoExamples = false,
}) => {
  const [durationHours, setDurationHours] = useState('4');
  const [sessionType, setSessionType] = useState<NutritionPlanSessionType>('race');
  const [fuelPriority, setFuelPriority] = useState<NutritionPlanFuelPriority>('balanced');
  const [conditions, setConditions] = useState<NutritionPlanConditions>('mild');
  const [carbsTarget, setCarbsTarget] = useState(
    () => String(rider.performanceNutrition?.carbsPerHourTarget ?? '')
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeneratedNutritionPlan | null>(null);
  const [forceExamples, setForceExamples] = useState(false);

  // Resync si l’objectif profil change (ex. champ sous l’assistant)
  React.useEffect(() => {
    const v = rider.performanceNutrition?.carbsPerHourTarget;
    if (v != null && Number.isFinite(v)) {
      setCarbsTarget(String(v));
    }
  }, [rider.performanceNutrition?.carbsPerHourTarget]);

  const context = useMemo(() => {
    if (allowDemoExamples && forceExamples) {
      return buildNutritionPlanContext(
        {
          ...rider,
          performanceNutrition: {
            ...rider.performanceNutrition,
            selectedGels: [],
            selectedBars: [],
            selectedDrinks: [],
            gels: [],
            bars: [],
            drinks: [],
          },
        },
        ULDRY_EXAMPLE_PRODUCTS,
        { allowExampleCatalog: true }
      );
    }
    return buildNutritionPlanContext(rider, teamProducts, {
      allowExampleCatalog: allowDemoExamples,
    });
  }, [rider, teamProducts, forceExamples, allowDemoExamples]);

  const productCount = context.products.length;
  const usingExamples = allowDemoExamples && (context.usedExampleCatalog || forceExamples);

  const isDark = variant === 'dark';
  const inputClass = isDark
    ? 'block w-full px-3 py-2 border border-slate-500 rounded-md bg-slate-800 text-slate-100 text-sm'
    : 'block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm';
  const labelClass = isDark
    ? 'block text-xs font-medium text-slate-300 mb-1'
    : 'block text-xs font-medium text-gray-700 mb-1';
  const boxClass = isDark
    ? 'p-4 rounded-lg border border-slate-600 bg-slate-900/50'
    : 'p-4 rounded-lg border border-slate-200 bg-slate-50';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-800';
  const cardClass = isDark
    ? 'rounded-lg border border-slate-600 bg-slate-800/80 p-3'
    : 'rounded-lg border border-slate-200 bg-white p-3';
  const metricClass = isDark
    ? 'rounded-md bg-slate-800 border border-slate-600 px-3 py-2'
    : 'rounded-md bg-white border border-slate-200 px-3 py-2';

  const resolveProduct = (id: string) => context.products.find(p => p.id === id);

  const handleGenerate = async () => {
    const hours = parseFloat(durationHours);
    if (!hours || hours <= 0 || hours > 24) {
      setError('Durée invalide (entre 0.5 et 24 h).');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const parsedTarget = parseFloat(carbsTarget);
      const request: NutritionPlanRequest = {
        raceDurationHours: hours,
        sessionType,
        fuelPriority,
        conditions,
        ...(Number.isFinite(parsedTarget) && parsedTarget >= 0
          ? { carbsPerHourTarget: parsedTarget }
          : {}),
      };
      const result = await generateNutritionPlan(rider, context, request);
      setPlan(result);
    } catch {
      setError('Impossible de générer le plan. Réessayez.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={boxClass}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h4 className={`font-semibold text-base ${textMain}`}>Plan nutrition course — cyclisme</h4>
          <p className={`text-xs mt-0.5 ${muted}`}>
            Objectif g/h respecté · boisson (Na ≥ 300 mg) + gels · caféine ~1 h avant la fin
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}>
          {productCount} produit{productCount > 1 ? 's' : ''}
        </span>
      </div>

      <details className="mb-3">
        <summary className={`text-xs cursor-pointer ${muted}`}>
          Produits analysés ({productCount})
          {usingExamples ? ' · démo' : ''}
        </summary>
        <ul className={`mt-2 text-xs space-y-1 ${muted} max-h-36 overflow-y-auto`}>
          {context.products.map(p => {
            const ratio = formatGlucoseFructoseRatio(p.glucose, p.fructose);
            return (
              <li key={p.id} className="flex flex-wrap gap-x-2">
                <span className={`uppercase tracking-wide text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {p.type}
                </span>
                <span>{p.brand ? `${p.brand} ` : ''}{p.name}</span>
                {p.carbs != null && <span>{p.carbs}g</span>}
                {ratio && <span>{ratio}</span>}
                {p.sodium != null && p.sodium > 0 && <span>{p.sodium}mg Na</span>}
                {p.caffeine ? <span>{p.caffeine}mg caf</span> : null}
              </li>
            );
          })}
        </ul>
      </details>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <label className={labelClass}>Durée (h)</label>
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
          <label className={labelClass}>Objectif glucides (g/h)</label>
          <input
            type="number"
            min="0"
            max="150"
            step="5"
            value={carbsTarget}
            onChange={e => setCarbsTarget(e.target.value)}
            className={inputClass}
            placeholder="auto"
          />
          <p className={`text-[10px] mt-0.5 ${muted}`}>Vide = selon type de séance</p>
        </div>
        <div>
          <label className={labelClass}>Type de séance</label>
          <select
            value={sessionType}
            onChange={e => setSessionType(e.target.value as NutritionPlanSessionType)}
            className={inputClass}
          >
            {NUTRITION_SESSION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className={`text-[10px] mt-0.5 ${muted}`}>
            {NUTRITION_SESSION_OPTIONS.find(o => o.value === sessionType)?.hint}
          </p>
        </div>
        <div>
          <label className={labelClass}>Priorité carburant</label>
          <select
            value={fuelPriority}
            onChange={e => setFuelPriority(e.target.value as NutritionPlanFuelPriority)}
            className={inputClass}
          >
            {NUTRITION_FUEL_PRIORITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className={`text-[10px] mt-0.5 ${muted}`}>
            {NUTRITION_FUEL_PRIORITY_OPTIONS.find(o => o.value === fuelPriority)?.hint}
          </p>
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

      {allowDemoExamples && (
        <label className={`flex items-center gap-2 text-xs mb-3 ${muted}`}>
          <input
            type="checkbox"
            checked={forceExamples}
            onChange={e => setForceExamples(e.target.checked)}
          />
          Utiliser des produits d’illustration (démo)
        </label>
      )}

      <ActionButton
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full sm:w-auto"
      >
        {isGenerating ? 'Génération…' : 'Proposer un plan'}
      </ActionButton>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>
      )}

      {plan && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className={`text-sm font-semibold ${textMain}`}>Votre plan</h5>
            <ActionButton type="button" size="sm" onClick={() => onApply(plan)}>
              Appliquer ce plan
            </ActionButton>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={metricClass}>
              <div className={`text-[10px] uppercase tracking-wide ${muted}`}>
                Cible{plan.targetFromUser ? ' (saisie)' : ''}
              </div>
              <div className={`text-lg font-semibold tabular-nums ${textMain}`}>{plan.carbsPerHourTarget}<span className="text-xs font-normal ml-0.5">g/h</span></div>
            </div>
            <div className={metricClass}>
              <div className={`text-[10px] uppercase tracking-wide ${muted}`}>Réalisé</div>
              <div className={`text-lg font-semibold tabular-nums ${textMain}`}>{plan.achievedCarbsPerHour}<span className="text-xs font-normal ml-0.5">g/h</span></div>
            </div>
            <div className={metricClass}>
              <div className={`text-[10px] uppercase tracking-wide ${muted}`}>Sodium</div>
              <div className={`text-lg font-semibold tabular-nums ${textMain}`}>~{plan.achievedSodiumPerHour}<span className="text-xs font-normal ml-0.5">mg/h</span></div>
            </div>
            <div className={metricClass}>
              <div className={`text-[10px] uppercase tracking-wide ${muted}`}>Fluide</div>
              <div className={`text-sm font-semibold leading-snug ${textMain}`}>
                {plan.hydrationNotes.split('.')[0]}
              </div>
            </div>
          </div>

          {(plan.selectedGels.length > 0 || plan.selectedBars.length > 0 || plan.selectedDrinks.length > 0) && (
            <div className={cardClass}>
              <div className={`text-[10px] uppercase tracking-wide font-semibold mb-2 ${muted}`}>À emporter</div>
              <ul className={`text-xs space-y-1 ${muted}`}>
                {plan.selectedDrinks.map(s => {
                  const p = resolveProduct(s.productId);
                  return (
                    <li key={s.productId}>
                      <span className={`font-semibold ${textMain}`}>{s.quantity}×</span>{' '}
                      bidon {p ? `${p.brand ? `${p.brand} ` : ''}${p.name}` : s.productId}
                      {p?.carbs != null ? ` (${p.carbs}g)` : ''}
                    </li>
                  );
                })}
                {plan.selectedGels.map(s => {
                  const p = resolveProduct(s.productId);
                  return (
                    <li key={s.productId}>
                      <span className={`font-semibold ${textMain}`}>{s.quantity}×</span>{' '}
                      gel {p ? `${p.brand ? `${p.brand} ` : ''}${p.name}` : s.productId}
                      {p?.carbs != null ? ` (${p.carbs}g)` : ''}
                      {p?.caffeine ? ` · caf ${p.caffeine}mg` : ''}
                    </li>
                  );
                })}
                {plan.selectedBars.map(s => {
                  const p = resolveProduct(s.productId);
                  return (
                    <li key={s.productId}>
                      <span className={`font-semibold ${textMain}`}>{s.quantity}×</span>{' '}
                      barre {p ? `${p.brand ? `${p.brand} ` : ''}${p.name}` : s.productId}
                      {p?.carbs != null ? ` (${p.carbs}g)` : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className={cardClass}>
            <div className={`text-[10px] uppercase tracking-wide font-semibold mb-3 ${muted}`}>
              Déroulement
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={muted}>
                    <th className="pb-2 pr-3 font-medium w-20">Quand</th>
                    <th className="pb-2 font-medium">Quoi</th>
                    <th className="pb-2 pl-3 font-medium text-right w-16">g</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.timeline.map((entry, idx) => {
                    const highlight = entry.kind === 'caffeine';
                    return (
                      <tr
                        key={`${entry.minute}-${idx}`}
                        className={`${isDark ? 'border-t border-slate-700/70' : 'border-t border-slate-100'} ${highlight ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50') : ''}`}
                      >
                        <td className={`py-2 pr-3 align-top tabular-nums font-semibold whitespace-nowrap ${textMain}`}>
                          {formatTimelineTime(entry.minute)}
                        </td>
                        <td className={`py-2 align-top ${muted}`}>
                          {entry.label}
                        </td>
                        <td className={`py-2 pl-3 align-top text-right tabular-nums ${muted}`}>
                          {entry.kind === 'fuel' || entry.kind === 'caffeine'
                            ? (entry.label.match(/~?(\d+)\s*g/)?.[1] ?? '')
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionPlanAiAssistant;

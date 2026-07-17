import React from 'react';
import { Rider, PredefinedAllergen as PredefinedAllergenEnum } from '../types';
import { PREDEFINED_ALLERGEN_INFO } from '../constants';

interface NutritionSummaryForAssistantsProps {
  rider: Rider;
  highlightCarbStrategy?: boolean;
}

const NutritionSummaryForAssistants: React.FC<NutritionSummaryForAssistantsProps> = ({
  rider,
  highlightCarbStrategy = false,
}) => {
  const allergies = rider.allergies || [];
  const criticalAllergies = allergies.filter(
    (allergy) =>
      allergy.allergenKey === PredefinedAllergenEnum.GLUTEN_CELIAC ||
      allergy.isCeliacDisease ||
      (allergy.allergenKey !== 'CUSTOM' &&
        PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity ===
          'CRITIQUE'),
  );

  const highSeverityAllergies = allergies.filter(
    (allergy) =>
      !criticalAllergies.includes(allergy) &&
      allergy.allergenKey !== 'CUSTOM' &&
      PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity ===
        'ELEVEE',
  );

  const moderateAllergies = allergies.filter(
    (allergy) =>
      !criticalAllergies.includes(allergy) &&
      !highSeverityAllergies.includes(allergy) &&
      allergy.allergenKey !== 'CUSTOM' &&
      PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity ===
        'MODEREE',
  );

  return (
    <div className="rounded-xl border border-white/15 bg-slate-900 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">
          🍎 Résumé Nutrition — {rider.firstName} {rider.lastName}
        </h3>
        <div className="shrink-0 text-sm text-slate-400">Guide pour assistants</div>
      </div>

      {criticalAllergies.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/60 p-4">
          <h4 className="mb-2 flex items-center text-sm font-bold text-red-100">
            🚨 ALERTES CRITIQUES — ATTENTION MAXIMALE REQUISE
          </h4>
          <div className="space-y-2">
            {criticalAllergies.map((allergy, idx) => {
              const allergenInfo =
                allergy.allergenKey !== 'CUSTOM'
                  ? PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]
                  : null;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-red-500/30 bg-red-950/80 p-3"
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-lg font-bold text-red-300">⚠️</span>
                    <div className="flex-1">
                      <div className="font-bold text-red-100">
                        {allergy.allergenKey === 'CUSTOM'
                          ? allergy.customAllergenName
                          : allergenInfo?.displayName}
                        {allergy.isCeliacDisease && ' (MALADIE CŒLIAQUE)'}
                      </div>
                      <div className="mt-1 text-sm text-red-200/90">
                        <strong>Actions d&apos;urgence :</strong> {allergenInfo?.emergencyActions}
                      </div>
                      <div className="mt-1 text-sm text-red-200/80">
                        <strong>Régime :</strong> {allergy.regimeDetails}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {highSeverityAllergies.length > 0 && (
        <div className="mb-4 rounded-xl border border-orange-500/40 bg-orange-950/50 p-4">
          <h4 className="mb-2 flex items-center text-sm font-bold text-orange-100">
            ⚠️ ALLERGIES HAUTE SÉVÉRITÉ
          </h4>
          <div className="space-y-2">
            {highSeverityAllergies.map((allergy, idx) => {
              const allergenInfo =
                PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum];
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-orange-500/30 bg-orange-950/70 p-2"
                >
                  <div className="font-semibold text-orange-100">{allergenInfo?.displayName}</div>
                  <div className="mt-1 text-sm text-orange-200/90">{allergy.regimeDetails}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {moderateAllergies.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4">
          <h4 className="mb-2 flex items-center text-sm font-bold text-amber-100">
            ⚡ ALLERGIES MODÉRÉES
          </h4>
          <div className="space-y-1">
            {moderateAllergies.map((allergy, idx) => {
              const allergenInfo =
                PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum];
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-amber-500/25 bg-amber-950/50 p-2 text-sm"
                >
                  <span className="font-semibold text-amber-100">{allergenInfo?.displayName}</span>
                  <span className="ml-2 text-amber-200/90">{allergy.regimeDetails}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(rider.snack1 || rider.snack2 || rider.snack3 || rider.snackPreferences) && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 md:col-span-2">
            <h4 className="mb-2 text-sm font-bold text-emerald-100">🍌 Collations préférées</h4>
            <ul className="space-y-0.5 text-sm text-emerald-200/90">
              {rider.snack1 && <li>1 — {rider.snack1}</li>}
              {rider.snack2 && <li>2 — {rider.snack2}</li>}
              {rider.snack3 && <li>3 — {rider.snack3}</li>}
              {!rider.snack1 && rider.snackPreferences && <li>{rider.snackPreferences}</li>}
            </ul>
          </div>
        )}

        {rider.assistantInstructions && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/40 p-3">
            <h4 className="mb-2 text-sm font-bold text-sky-100">📋 Instructions Spéciales</h4>
            <p className="text-sm text-sky-200/90">{rider.assistantInstructions}</p>
          </div>
        )}

        {rider.snackSchedule && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/40 p-3">
            <h4 className="mb-2 text-sm font-bold text-violet-100">⏰ Horaires Collations</h4>
            <p className="text-sm text-violet-200/90">{rider.snackSchedule}</p>
          </div>
        )}

        {rider.dietaryRegimen && (
          <div className="rounded-xl border border-white/15 bg-slate-800 p-3">
            <h4 className="mb-2 text-sm font-bold text-slate-100">🥗 Régime Alimentaire</h4>
            <p className="text-sm text-slate-300">{rider.dietaryRegimen}</p>
          </div>
        )}
      </div>

      {rider.performanceNutrition && (
        <div
          className={`mt-4 rounded-xl border p-3 ${
            highlightCarbStrategy
              ? 'border-fuchsia-500/40 bg-fuchsia-950/45'
              : 'border-white/15 bg-slate-800'
          }`}
        >
          <h4
            className={`mb-2 text-sm font-bold ${
              highlightCarbStrategy ? 'text-fuchsia-100' : 'text-slate-100'
            }`}
          >
            🚴 {highlightCarbStrategy ? 'Stratégie glucidique' : 'Plan course'}
          </h4>
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {rider.performanceNutrition.carbsPerHourTarget != null && (
              <div>
                <span
                  className={`font-semibold ${
                    highlightCarbStrategy ? 'text-fuchsia-100' : 'text-slate-200'
                  }`}
                >
                  Objectif glucides/heure :
                </span>
                <span
                  className={`ml-1 ${
                    highlightCarbStrategy ? 'text-fuchsia-200/90' : 'text-slate-300'
                  }`}
                >
                  {rider.performanceNutrition.carbsPerHourTarget} g/h
                </span>
              </div>
            )}
            {rider.performanceNutrition.hydrationNotes && (
              <div>
                <span
                  className={`font-semibold ${
                    highlightCarbStrategy ? 'text-fuchsia-100' : 'text-slate-200'
                  }`}
                >
                  Hydratation :
                </span>
                <span
                  className={`ml-1 ${
                    highlightCarbStrategy ? 'text-fuchsia-200/90' : 'text-slate-300'
                  }`}
                >
                  {rider.performanceNutrition.hydrationNotes}
                </span>
              </div>
            )}
            {rider.performanceNutrition.preRaceMeal && (
              <div className="md:col-span-2">
                <span className="font-semibold text-slate-200">Repas pré-course :</span>
                <span className="ml-1 text-slate-300">
                  {rider.performanceNutrition.preRaceMeal}
                </span>
              </div>
            )}
            {rider.performanceNutrition.duringRaceNutrition && (
              <div className="md:col-span-2">
                <span className="font-semibold text-slate-200">Pendant la course :</span>
                <span className="ml-1 text-slate-300">
                  {rider.performanceNutrition.duringRaceNutrition}
                </span>
              </div>
            )}
            {rider.performanceNutrition.recoveryNutrition && (
              <div className="md:col-span-2">
                <span className="font-semibold text-slate-200">Récupération :</span>
                <span className="ml-1 text-slate-300">
                  {rider.performanceNutrition.recoveryNutrition}
                </span>
              </div>
            )}
            {rider.performanceNutrition.notes && (
              <div className="md:col-span-2">
                <span className="font-semibold text-slate-200">Notes :</span>
                <span className="ml-1 text-slate-300">{rider.performanceNutrition.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {allergies.length === 0 && (
        <div className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-950/45 p-4 text-center">
          <div className="font-semibold text-emerald-100">✅ Aucune allergie déclarée</div>
          <div className="mt-1 text-sm text-emerald-200/90">
            Préparation des rations sans restriction particulière
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionSummaryForAssistants;

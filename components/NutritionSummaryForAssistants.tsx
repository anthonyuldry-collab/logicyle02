import React from 'react';
import { Rider, AllergyItem, PredefinedAllergen as PredefinedAllergenEnum } from '../types';
import { PREDEFINED_ALLERGEN_INFO } from '../constants';

interface NutritionSummaryForAssistantsProps {
    rider: Rider;
}

const NutritionSummaryForAssistants: React.FC<NutritionSummaryForAssistantsProps> = ({ rider }) => {
    const allergies = rider.allergies || [];
    const criticalAllergies = allergies.filter(allergy => 
        allergy.allergenKey === PredefinedAllergenEnum.GLUTEN_CELIAC || 
        allergy.isCeliacDisease ||
        (allergy.allergenKey !== 'CUSTOM' && PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity === 'CRITIQUE')
    );

    const highSeverityAllergies = allergies.filter(allergy => 
        !criticalAllergies.includes(allergy) &&
        allergy.allergenKey !== 'CUSTOM' && 
        PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity === 'ELEVEE'
    );

    const moderateAllergies = allergies.filter(allergy => 
        !criticalAllergies.includes(allergy) &&
        !highSeverityAllergies.includes(allergy) &&
        allergy.allergenKey !== 'CUSTOM' && 
        PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity === 'MODEREE'
    );

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">🍎 Résumé Nutrition - {rider.firstName} {rider.lastName}</h3>
                <div className="text-sm text-gray-500">
                    Guide pour assistants
                </div>
            </div>

            {/* Alertes critiques */}
            {criticalAllergies.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center">
                        🚨 ALERTES CRITIQUES - ATTENTION MAXIMALE REQUISE
                    </h4>
                    <div className="space-y-2">
                        {criticalAllergies.map((allergy, idx) => {
                            const allergenInfo = allergy.allergenKey !== 'CUSTOM' ? PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum] : null;
                            return (
                                <div key={idx} className="p-3 bg-red-100 border border-red-300 rounded">
                                    <div className="flex items-start space-x-2">
                                        <span className="text-red-600 font-bold text-lg">⚠️</span>
                                        <div className="flex-1">
                                            <div className="font-bold text-red-800">
                                                {allergy.allergenKey === 'CUSTOM' ? allergy.customAllergenName : allergenInfo?.displayName}
                                                {allergy.isCeliacDisease && " (MALADIE CŒLIAQUE)"}
                                            </div>
                                            <div className="text-sm text-red-700 mt-1">
                                                <strong>Actions d'urgence :</strong> {allergenInfo?.emergencyActions}
                                            </div>
                                            <div className="text-sm text-red-600 mt-1">
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

            {/* Allergies de haute sévérité */}
            {highSeverityAllergies.length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="text-sm font-bold text-orange-800 mb-2 flex items-center">
                        ⚠️ ALLERGIES HAUTE SÉVÉRITÉ
                    </h4>
                    <div className="space-y-2">
                        {highSeverityAllergies.map((allergy, idx) => {
                            const allergenInfo = PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum];
                            return (
                                <div key={idx} className="p-2 bg-orange-100 border border-orange-300 rounded">
                                    <div className="font-semibold text-orange-800">
                                        {allergenInfo?.displayName}
                                    </div>
                                    <div className="text-sm text-orange-700 mt-1">
                                        {allergy.regimeDetails}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Allergies modérées */}
            {moderateAllergies.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-bold text-yellow-800 mb-2 flex items-center">
                        ⚡ ALLERGIES MODÉRÉES
                    </h4>
                    <div className="space-y-1">
                        {moderateAllergies.map((allergy, idx) => {
                            const allergenInfo = PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum];
                            return (
                                <div key={idx} className="p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                                    <span className="font-semibold text-yellow-800">{allergenInfo?.displayName}</span>
                                    <span className="text-yellow-700 ml-2">{allergy.regimeDetails}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Préférences et instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Collations préférées */}
                {rider.snackPreferences && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="text-sm font-bold text-green-800 mb-2">🍌 Collations Préférées</h4>
                        <p className="text-sm text-green-700">{rider.snackPreferences}</p>
                    </div>
                )}

                {/* Instructions spéciales */}
                {rider.assistantInstructions && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-bold text-blue-800 mb-2">📋 Instructions Spéciales</h4>
                        <p className="text-sm text-blue-700">{rider.assistantInstructions}</p>
                    </div>
                )}

                {/* Horaires de collations */}
                {rider.snackSchedule && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="text-sm font-bold text-purple-800 mb-2">⏰ Horaires Collations</h4>
                        <p className="text-sm text-purple-700">{rider.snackSchedule}</p>
                    </div>
                )}

                {/* Régime alimentaire */}
                {rider.dietaryRegimen && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="text-sm font-bold text-gray-800 mb-2">🥗 Régime Alimentaire</h4>
                        <p className="text-sm text-gray-700">{rider.dietaryRegimen}</p>
                    </div>
                )}
            </div>

            {/* Plan nutritionnel course */}
            {rider.performanceNutrition && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">🚴 Plan Course</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {rider.performanceNutrition.carbsPerHourTarget && (
                            <div>
                                <span className="font-semibold text-slate-700">Objectif glucides/heure :</span>
                                <span className="text-slate-600 ml-1">{rider.performanceNutrition.carbsPerHourTarget}g</span>
                            </div>
                        )}
                        {rider.performanceNutrition.hydrationNotes && (
                            <div>
                                <span className="font-semibold text-slate-700">Hydratation :</span>
                                <span className="text-slate-600 ml-1">{rider.performanceNutrition.hydrationNotes}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Aucune allergie */}
            {allergies.length === 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="text-green-800 font-semibold">✅ Aucune allergie déclarée</div>
                    <div className="text-green-600 text-sm mt-1">Préparation des rations sans restriction particulière</div>
                </div>
            )}
        </div>
    );
};

export default NutritionSummaryForAssistants;

import React, { useState } from 'react';
import { Rider, AllergyItem, AllergySeverity as AllergySeverityEnum, PredefinedAllergen as PredefinedAllergenEnum, TeamProduct, SelectedProduct } from '../../types';
import ActionButton from '../ActionButton';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TrashIcon from '../icons/TrashIcon';
import Modal from '../Modal';
import NutritionSummaryForAssistants from '../NutritionSummaryForAssistants';
import { PREDEFINED_ALLERGEN_INFO } from '../../constants';

interface NutritionTabProps {
    formData: Rider | Omit<Rider, 'id'>;
    setFormData: React.Dispatch<React.SetStateAction<Rider | Omit<Rider, 'id'>>>;
    formFieldsEnabled: boolean;
    teamProducts: TeamProduct[];
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const NutritionTab: React.FC<NutritionTabProps> = ({
    formData,
    setFormData,
    formFieldsEnabled,
    teamProducts,
}) => {
    // Modal state for product selection
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'gel' | 'bar' | 'drink'>('gel');

    // State for custom product form
    const [customProduct, setCustomProduct] = useState<Omit<TeamProduct, 'id'>>({ name: '', type: 'gel' });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const parts = name.split('.');

        setFormData(prevRider => {
            if (!prevRider) return null;
            let updatedRider = { ...prevRider };

            if (parts[0] === 'allergies') {
                const allergyIndex = parseInt(parts[1], 10);
                const subField = parts[2];
                const updatedAllergies = [...(updatedRider.allergies || [])];
                if (updatedAllergies[allergyIndex]) {
                    updatedAllergies[allergyIndex] = { ...updatedAllergies[allergyIndex] }; // copy the specific allergy object
                    if (subField === 'allergenKey') {
                        const newAllergenKey = value as PredefinedAllergenEnum | 'CUSTOM';
                        updatedAllergies[allergyIndex].allergenKey = newAllergenKey;
                        if (newAllergenKey !== 'CUSTOM' && PREDEFINED_ALLERGEN_INFO[newAllergenKey]) {
                            updatedAllergies[allergyIndex].regimeDetails = PREDEFINED_ALLERGEN_INFO[newAllergenKey].defaultRegimeDetails;
                            updatedAllergies[allergyIndex].isCeliacDisease = !!PREDEFINED_ALLERGEN_INFO[newAllergenKey].isCeliac;
                        } else if (newAllergenKey === 'CUSTOM') {
                            updatedAllergies[allergyIndex].isCeliacDisease = false;
                        }
                    } else if (subField === 'isCeliacDisease') {
                        updatedAllergies[allergyIndex].isCeliacDisease = (e.target as HTMLInputElement).checked;
                        if (updatedAllergies[allergyIndex].isCeliacDisease && updatedAllergies[allergyIndex].allergenKey === PredefinedAllergenEnum.GLUTEN_CELIAC) {
                            updatedAllergies[allergyIndex].regimeDetails = PREDEFINED_ALLERGEN_INFO[PredefinedAllergenEnum.GLUTEN_CELIAC].defaultRegimeDetails;
                        }
                    } else {
                        (updatedAllergies[allergyIndex] as any)[subField] = value;
                    }
                    updatedRider.allergies = updatedAllergies;
                }
            } else if (parts[0] === 'performanceNutrition') {
                const perfNutrition = { ...(updatedRider.performanceNutrition || {}) };
                const finalKey = parts[1];
                const isNumeric = ['carbsPerHourTarget', 'estimatedRaceDurationInHours'].includes(finalKey);
                (perfNutrition as any)[finalKey] = isNumeric ? (value === '' ? undefined : parseFloat(value)) : value;
                updatedRider.performanceNutrition = perfNutrition;
            } else {
                (updatedRider as any)[name] = value;
            }
            return updatedRider;
        });
    };
    
    const handleAddAllergy = () => {
        setFormData(prev => ({
            ...prev,
            allergies: [
                ...(prev.allergies || []),
                { 
                    id: generateId(), 
                    allergenKey: 'CUSTOM', 
                    customAllergenName: '',
                    severity: AllergySeverityEnum.FAIBLE, 
                    regimeDetails: '',
                    isCeliacDisease: false,
                    notes: ''
                }
            ]
        }));
    };

    const handleRemoveAllergy = (id: string) => {
        if(window.confirm("Supprimer cette allergie ?")){
            setFormData(prev => ({
                ...prev,
                allergies: (prev.allergies || []).filter(allergy => allergy.id !== id)
            }));
        }
    };

    const handleQuantityChange = (type: 'selectedGels' | 'selectedBars' | 'selectedDrinks', productId: string, newQuantity: number) => {
        setFormData(prev => {
            if (!prev) return null;
            let perfNutrition = { ...(prev.performanceNutrition || {}) };
            let selectionArray = [...(perfNutrition[type] || [])];
            const itemIndex = selectionArray.findIndex(item => item.productId === productId);

            if (itemIndex > -1) {
                if (newQuantity > 0) {
                    selectionArray[itemIndex] = { ...selectionArray[itemIndex], quantity: newQuantity };
                } else {
                    selectionArray.splice(itemIndex, 1);
                }
            }
            
            return { ...prev, performanceNutrition: { ...perfNutrition, [type]: selectionArray }};
        });
    };
  
    const handleSelectProduct = (product: TeamProduct) => {
        const typeKey = product.type === 'gel' ? 'selectedGels' : product.type === 'bar' ? 'selectedBars' : 'selectedDrinks';
        
        setFormData(prev => {
            if (!prev) return null;
            let perfNutrition = { ...(prev.performanceNutrition || {}) };
            let selectionArray: SelectedProduct[] = [...(perfNutrition[typeKey] || [])];
            
            if (!selectionArray.some(p => p.productId === product.id)) {
                selectionArray.push({ productId: product.id, quantity: 1 });
            }
            
            return { ...prev, performanceNutrition: { ...perfNutrition, [typeKey]: selectionArray } };
        });
        setIsProductModalOpen(false);
    };
  
    const handleAddCustomProduct = () => {
        if (!customProduct.name) {
            alert("Veuillez donner un nom au produit personnalisé.");
            return;
        }
        const newProduct: TeamProduct = { ...customProduct, id: `custom-${generateId()}`, type: modalMode };
        
        setFormData(prev => {
          if (!prev) return null;
          let perfNutrition = { ...(prev.performanceNutrition || {}) };
          const customProducts = [...(perfNutrition.customProducts || []), newProduct];
          return { ...prev, performanceNutrition: { ...perfNutrition, customProducts }};
        });
        
        // Auto-select the newly created product
        handleSelectProduct(newProduct);
        setCustomProduct({ name: '', type: 'gel' }); // Reset form
    };

    const allProducts = [...teamProducts, ...(formData.performanceNutrition?.customProducts || [])];
    const inputClass = "input-field-sm w-full";
    const selectClass = "input-field-sm w-full";
    const checkboxClass = "checkbox-field";

    // Fonction pour vérifier la compatibilité d'un produit avec les allergies
    const checkProductCompatibility = (product: TeamProduct, allergies: AllergyItem[]): boolean => {
        if (!product.notes) return true; // Si pas de notes, on considère compatible
        
        const productNotes = product.notes.toLowerCase();
        
        return !allergies.some(allergy => {
            if (allergy.allergenKey === 'CUSTOM') {
                return productNotes.includes(allergy.customAllergenName?.toLowerCase() || '');
            }
            
            const allergenInfo = PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum];
            if (!allergenInfo) return false;
            
            // Vérifier les sources communes et risques de contamination
            const allergenKeywords = [
                ...allergenInfo.commonSources.map(s => s.toLowerCase()),
                ...allergenInfo.crossContaminationRisks.map(r => r.toLowerCase()),
                allergy.allergenKey.toLowerCase()
            ];
            
            return allergenKeywords.some(keyword => productNotes.includes(keyword));
        });
    };
    
    return (
        <div className="space-y-6">
            {/* Résumé pour les assistants */}
            <NutritionSummaryForAssistants rider={formData as Rider} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne 1: Préférences et Régimes */}
                <div className="space-y-4">
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">🍽️ Préférences et Régimes</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Régime Spécifique (hors allergies)</label>
                                <textarea name="dietaryRegimen" value={formData.dietaryRegimen || ''} onChange={handleInputChange} rows={3} className={`${inputClass} text-sm`} placeholder="Ex: Végétarien, sans porc..." disabled={!formFieldsEnabled} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Préférences / Aversions</label>
                                <textarea name="foodPreferences" value={formData.foodPreferences || ''} onChange={handleInputChange} rows={3} className={`${inputClass} text-sm`} placeholder="Ex: J'adore les pâtes, je n'aime pas les betteraves..." disabled={!formFieldsEnabled}/>
                            </div>
                        </div>
                    </div>

                    {/* Section Collations */}
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">🍎 Collations & Rations</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Collations Préférées</label>
                                <textarea 
                                    name="snackPreferences" 
                                    value={formData.snackPreferences || ''} 
                                    onChange={handleInputChange} 
                                    rows={3} 
                                    className={`${inputClass} text-sm`} 
                                    placeholder="Ex: Bananes, barres énergétiques sans gluten, fruits secs, biscuits salés..." 
                                    disabled={!formFieldsEnabled}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Horaires de Collations</label>
                                <textarea 
                                    name="snackSchedule" 
                                    value={formData.snackSchedule || ''} 
                                    onChange={handleInputChange} 
                                    rows={2} 
                                    className={`${inputClass} text-sm`} 
                                    placeholder="Ex: Collation 1h avant départ, gel toutes les 45min, barre à mi-parcours..." 
                                    disabled={!formFieldsEnabled}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Instructions pour Assistants</label>
                                <textarea 
                                    name="assistantInstructions" 
                                    value={formData.assistantInstructions || ''} 
                                    onChange={handleInputChange} 
                                    rows={3} 
                                    className={`${inputClass} text-sm`} 
                                    placeholder="Ex: Toujours vérifier les étiquettes, éviter les contaminations croisées, préparer les rations à l'avance..." 
                                    disabled={!formFieldsEnabled}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Colonnes 2 et 3: Allergies et Plan Nutritionnel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">🚨 Allergies & Régimes d'Éviction</h3>
                    
                    {/* Alertes critiques pour les assistants */}
                    {(formData.allergies || []).some(allergy => 
                        allergy.allergenKey === PredefinedAllergenEnum.GLUTEN_CELIAC || 
                        allergy.isCeliacDisease ||
                        (allergy.allergenKey !== 'CUSTOM' && PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity === 'CRITIQUE')
                    ) && (
                        <div className="mb-4 p-4 bg-red-900/40 border-2 border-red-500 rounded-lg shadow-red-500/20 shadow-lg">
                            <div className="flex items-center space-x-2 mb-3">
                                <span className="text-2xl">🚨</span>
                                <h4 className="text-lg font-bold text-red-200">ALERTE CRITIQUE - ATTENTION ASSISTANTS</h4>
                            </div>
                            <div className="space-y-3">
                                {(formData.allergies || []).filter(allergy => 
                                    allergy.allergenKey === PredefinedAllergenEnum.GLUTEN_CELIAC || 
                                    allergy.isCeliacDisease ||
                                    (allergy.allergenKey !== 'CUSTOM' && PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum]?.severity === 'CRITIQUE')
                                ).map((allergy, idx) => {
                                    const allergenInfo = allergy.allergenKey !== 'CUSTOM' ? PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum] : null;
                                    return (
                                        <div key={idx} className="p-3 bg-red-800/30 border border-red-400 rounded-lg">
                                            <div className="flex items-start space-x-3">
                                                <span className="text-red-300 font-bold text-lg mt-0.5">⚠️</span>
                                                <div className="flex-1">
                                                    <div className="font-bold text-red-200 text-sm mb-2">
                                                        {allergy.allergenKey === 'CUSTOM' ? allergy.customAllergenName : allergenInfo?.displayName}
                                                        {allergy.isCeliacDisease && " (MALADIE CŒLIAQUE)"}
                                                    </div>
                                                    <div className="text-red-100 text-xs leading-relaxed">
                                                        {allergenInfo?.emergencyActions}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {(formData.allergies || []).map((allergy, index) => {
                            const allergenInfo = allergy.allergenKey !== 'CUSTOM' ? PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum] : null;
                            const isCritical = allergenInfo?.severity === 'CRITIQUE' || allergy.isCeliacDisease;
                            const isHigh = allergenInfo?.severity === 'ELEVEE';
                            
                            return (
                                <div key={allergy.id} className={`p-4 rounded-lg border-2 ${
                                    isCritical ? 'bg-red-900/30 border-red-500 shadow-red-500/20 shadow-lg' : 
                                    isHigh ? 'bg-orange-900/30 border-orange-500 shadow-orange-500/20 shadow-lg' : 
                                    'bg-slate-800/50 border-slate-600'
                                }`}>
                                    {/* En-tête avec sélection d'allergène et sévérité */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1">Allergène</label>
                                            <select name={`allergies.${index}.allergenKey`} value={allergy.allergenKey} onChange={handleInputChange} className={`${selectClass} text-sm`} disabled={!formFieldsEnabled}>
                                        <option value="CUSTOM">Personnalisé</option>
                                        {Object.keys(PREDEFINED_ALLERGEN_INFO).map(key => <option key={key} value={key}>{PREDEFINED_ALLERGEN_INFO[key as PredefinedAllergenEnum].displayName}</option>)}
                                    </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1">Sévérité</label>
                                            <select name={`allergies.${index}.severity`} value={allergy.severity} onChange={handleInputChange} className={`${selectClass} text-sm ${
                                                allergy.severity === 'SÉVÈRE' ? 'bg-red-900/50 border-red-400' : 
                                                allergy.severity === 'MODÉRÉE' ? 'bg-orange-900/50 border-orange-400' : 
                                                'bg-green-900/50 border-green-400'
                                            }`} disabled={!formFieldsEnabled}>
                                        {Object.values(AllergySeverityEnum).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                    </div>

                                    {/* Nom d'allergène personnalisé */}
                                {allergy.allergenKey === 'CUSTOM' && (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-slate-300 mb-1">Nom de l'allergène</label>
                                            <input type="text" name={`allergies.${index}.customAllergenName`} value={allergy.customAllergenName || ''} onChange={handleInputChange} placeholder="Nom de l'allergène" className={`${inputClass} text-sm`} disabled={!formFieldsEnabled} />
                                        </div>
                                    )}

                                    {/* Régime d'éviction détaillé */}
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Régime d'éviction détaillé</label>
                                        <textarea 
                                            name={`allergies.${index}.regimeDetails`} 
                                            value={allergy.regimeDetails} 
                                            onChange={handleInputChange} 
                                            placeholder="Décrivez le régime d'éviction en détail..." 
                                            rows={4} 
                                            className={`${inputClass} text-sm resize-none`} 
                                            disabled={!formFieldsEnabled}
                                        />
                                    </div>

                                    {/* Notes sur la réaction */}
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Notes sur la réaction</label>
                                        <textarea 
                                            name={`allergies.${index}.notes`} 
                                            value={allergy.notes || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="Décrivez les symptômes, réactions observées..." 
                                            rows={3} 
                                            className={`${inputClass} text-sm resize-none`} 
                                            disabled={!formFieldsEnabled}
                                        />
                                    </div>
                                    
                                    {/* Informations détaillées pour les assistants */}
                                    {allergenInfo && (
                                        <div className="mb-3 p-3 bg-slate-900/60 rounded-lg border border-slate-600">
                                            <h5 className="text-xs font-semibold text-slate-300 mb-2">📋 Informations détaillées pour assistants</h5>
                                            <div className="grid grid-cols-1 gap-3 text-xs">
                                                <div>
                                                    <span className="font-semibold text-slate-300">Sources communes :</span>
                                                    <div className="text-slate-400 mt-1 leading-relaxed">{allergenInfo.commonSources.join(', ')}</div>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-300">Risques de contamination :</span>
                                                    <div className="text-slate-400 mt-1 leading-relaxed">{allergenInfo.crossContaminationRisks.join(', ')}</div>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-300">Actions d'urgence :</span>
                                                    <div className="text-slate-400 mt-1 leading-relaxed">{allergenInfo.emergencyActions}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Checkbox maladie cœliaque et bouton supprimer */}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id={`isCeliac-${index}`} 
                                                name={`allergies.${index}.isCeliacDisease`} 
                                                checked={allergy.isCeliacDisease || false} 
                                                onChange={handleInputChange} 
                                                className={`${checkboxClass} ${allergy.isCeliacDisease ? 'ring-red-500' : ''}`} 
                                                disabled={!formFieldsEnabled} 
                                            />
                                            <label htmlFor={`isCeliac-${index}`} className={`ml-2 text-sm font-medium ${allergy.isCeliacDisease ? 'text-red-300 font-bold' : 'text-slate-300'}`}>
                                                {allergy.isCeliacDisease ? '🚨 MALADIE CŒLIAQUE' : 'Maladie Cœliaque ?'}
                                            </label>
                                        </div>
                                        {formFieldsEnabled && (
                                            <ActionButton 
                                                type="button" 
                                                onClick={() => handleRemoveAllergy(allergy.id)} 
                                                variant="danger" 
                                                size="sm" 
                                                icon={<TrashIcon className="w-4 h-4"/>}
                                                className="hover:bg-red-600"
                                            >
                                                <span className="sr-only">Supprimer cette allergie</span>
                                            </ActionButton>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {formFieldsEnabled && (
                        <ActionButton type="button" onClick={handleAddAllergy} variant="secondary" size="sm" icon={<PlusCircleIcon className="w-4 h-4"/>} className="mt-2 text-xs">
                            Ajouter une allergie
                        </ActionButton>
                    )}
                    </div>

                    {/* Plan Nutritionnel Course */}
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">🚴 Plan Nutritionnel Course</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Objectif Glucides/Heure (g)</label>
                                    <input type="number" name="performanceNutrition.carbsPerHourTarget" value={formData.performanceNutrition?.carbsPerHourTarget ?? ''} onChange={handleInputChange} placeholder="Ex: 90" className={`${inputClass} text-sm`} disabled={!formFieldsEnabled}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Notes Hydratation</label>
                                    <textarea name="performanceNutrition.hydrationNotes" value={formData.performanceNutrition?.hydrationNotes || ''} onChange={handleInputChange} rows={2} className={`${inputClass} text-sm`} placeholder="Ex: 1 bidon par heure..." disabled={!formFieldsEnabled}/>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-3">Produits en Course</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(['selectedGels', 'selectedBars', 'selectedDrinks'] as const).map(typeKey => {
                                        const title = typeKey === 'selectedGels' ? 'Gels' : typeKey === 'selectedBars' ? 'Barres' : 'Boissons';
                                        const modalType = typeKey === 'selectedGels' ? 'gel' : typeKey === 'selectedBars' ? 'bar' : 'drink';
                                        return (
                                        <div key={typeKey} className="bg-slate-800/50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="font-semibold text-sm text-slate-300">{title}</h5>
                                                {formFieldsEnabled && <ActionButton size="sm" variant="secondary" onClick={() => { setModalMode(modalType); setIsProductModalOpen(true); }}><PlusCircleIcon className="w-3 h-3 mr-1"/>Ajouter</ActionButton>}
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                {(formData.performanceNutrition?.[typeKey] || []).map(item => {
                                                    const product = allProducts.find(p => p.id === item.productId);
                                                    if (!product) return null;
                                                    return (
                                                        <div key={item.productId} className="flex items-center justify-between bg-slate-700/50 p-2 rounded">
                                                            <span className="text-slate-300">{product.name}</span>
                                                            <input type="number" value={item.quantity} min="0" onChange={e => handleQuantityChange(typeKey, item.productId, parseInt(e.target.value))} className={`${inputClass} !mt-0 !text-xs w-16 py-1`} disabled={!formFieldsEnabled}/>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isProductModalOpen && (
                <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={`Ajouter un(e) ${modalMode}`}>
                    <div className="space-y-4">
                        {/* Filtrage par allergies */}
                        {(formData.allergies || []).length > 0 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Filtrage par Allergies</h4>
                                <div className="text-xs text-yellow-700">
                                    <p className="mb-1">Produits filtrés selon les allergies du coureur :</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {(formData.allergies || []).map((allergy, idx) => {
                                            const allergenInfo = allergy.allergenKey !== 'CUSTOM' ? PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum] : null;
                                            return (
                                                <li key={idx} className="font-medium">
                                                    {allergy.allergenKey === 'CUSTOM' ? allergy.customAllergenName : allergenInfo?.displayName}
                                                    {allergy.isCeliacDisease && " (MALADIE CŒLIAQUE)"}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold">Choisir un produit de l'équipe</h4>
                            <div className="max-h-40 overflow-y-auto space-y-1 p-2 border rounded-md bg-gray-50">
                                {allProducts.filter(p => p.type === modalMode).map(p => {
                                    // Vérifier la compatibilité avec les allergies
                                    const isCompatible = checkProductCompatibility(p, formData.allergies || []);
                                    return (
                                        <button 
                                            key={p.id} 
                                            onClick={() => handleSelectProduct(p)} 
                                            className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                                                !isCompatible ? 'bg-red-100 border border-red-300 text-red-700' : ''
                                            }`}
                                            disabled={!isCompatible}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span>{p.name} ({p.brand})</span>
                                                {!isCompatible && <span className="text-xs font-bold">⚠️ INCOMPATIBLE</span>}
                                            </div>
                                            {p.notes && <div className="text-xs text-gray-500 mt-1">{p.notes}</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="text-center text-sm text-gray-500">ou</div>
                        <div>
                            <h4 className="font-semibold">Ajouter un produit personnel</h4>
                            <div className="p-3 bg-gray-50 rounded-md border mt-1 space-y-2">
                                <input type="text" value={customProduct.name} onChange={e => setCustomProduct(p => ({...p, name: e.target.value, type: modalMode}))} placeholder="Nom du produit" className="mt-1 block w-full px-3 py-2 border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                                <input type="text" value={customProduct.brand || ''} onChange={e => setCustomProduct(p => ({...p, brand: e.target.value}))} placeholder="Marque" className="mt-1 block w-full px-3 py-2 border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                                <textarea value={customProduct.notes || ''} onChange={e => setCustomProduct(p => ({...p, notes: e.target.value}))} placeholder="Notes (allergènes, composition...)" rows={2} className="mt-1 block w-full px-3 py-2 border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                                <ActionButton onClick={handleAddCustomProduct}>Ajouter et Sélectionner</ActionButton>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default NutritionTab;
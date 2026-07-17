import React, { useState, useMemo } from 'react';
import { Rider, AllergyItem, AllergySeverity as AllergySeverityEnum, PredefinedAllergen as PredefinedAllergenEnum, TeamProduct, SelectedProduct } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import TrashIcon from '../components/icons/TrashIcon';
import Modal from '../components/Modal';
import NutritionSummaryForAssistants from '../components/NutritionSummaryForAssistants';
import CustomProductForm from '../components/nutrition/CustomProductForm';
import NutritionPlanAiAssistant from '../components/nutrition/NutritionPlanAiAssistant';
import { PREDEFINED_ALLERGEN_INFO } from '../constants';
import { useTranslations } from '../hooks/useTranslations';
import { createEmptyCustomProduct, formatProductNutritionSummary, formatGlucoseFructoseRatio } from '../utils/nutritionProductUtils';
import { GeneratedNutritionPlan, formatTimelineForDisplay } from '../utils/nutritionPlanBuilder';

interface NutritionSectionProps {
  rider: Rider | undefined;
  setRiders: (updater: React.SetStateAction<Rider[]>) => void;
  onSaveRider: (rider: Rider) => void;
  teamProducts: TeamProduct[];
  setTeamProducts: (updater: React.SetStateAction<TeamProduct[]>) => void;
}

type NutritionTab = 'profile' | 'allergies' | 'race' | 'assistants';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const NutritionSection: React.FC<NutritionSectionProps> = ({ rider, setRiders, onSaveRider, teamProducts }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'gel' | 'bar' | 'drink'>('gel');
  const [customProduct, setCustomProduct] = useState<Omit<TeamProduct, 'id'>>(createEmptyCustomProduct());
  const [activeTab, setActiveTab] = useState<NutritionTab>('profile');
  const { t } = useTranslations();
  
  const updateRiderProperty = async (updateFn: (riderToUpdate: Rider) => Rider) => {
      if (!rider) return;
      const updatedRider = updateFn(rider);
      
      try {
        // Sauvegarder dans Firebase
        await onSaveRider(updatedRider);
        
        // Mettre à jour l'état local
        setRiders(prevRiders =>
            prevRiders.map(r => (r.id === rider.id ? updatedRider : r))
        );
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const parts = name.split('.');

    updateRiderProperty(currentRider => {
        const updatedRider = structuredClone(currentRider);

        if (parts[0] === 'allergies') {
            const allergyIndex = parseInt(parts[1], 10);
            const subField = parts[2];
            const updatedAllergies = [...(updatedRider.allergies || [])];
            if (updatedAllergies[allergyIndex]) {
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
             if (!updatedRider.performanceNutrition) updatedRider.performanceNutrition = {};
             const perfNutrition = updatedRider.performanceNutrition;
             const finalKey = parts[1];
             const isNumeric = ['carbsPerHourTarget', 'estimatedRaceDurationInHours'].includes(finalKey);
             (perfNutrition as any)[finalKey] = isNumeric ? (value === '' ? undefined : parseFloat(value)) : value;
        } else {
            (updatedRider as any)[name] = value;
        }
        return updatedRider;
    });
  };

  const handleAddAllergy = () => {
    updateRiderProperty(currentRider => ({
        ...currentRider,
        allergies: [
            ...(currentRider.allergies || []),
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
    if(window.confirm(t('nutritionConfirmDeleteAllergy'))){
      updateRiderProperty(currentRider => ({
          ...currentRider,
          allergies: (currentRider.allergies || []).filter(allergy => allergy.id !== id)
      }));
    }
  };

  const handleQuantityChange = (type: 'selectedGels' | 'selectedBars' | 'selectedDrinks', productId: string, newQuantity: number) => {
    updateRiderProperty(currentRider => {
      let perfNutrition = { ...(currentRider.performanceNutrition || {}) };
      let selectionArray = [...(perfNutrition[type] || [])];
      const itemIndex = selectionArray.findIndex(item => item.productId === productId);

      if (itemIndex > -1) {
          if (newQuantity > 0) {
              selectionArray[itemIndex] = { ...selectionArray[itemIndex], quantity: newQuantity };
          } else {
              selectionArray.splice(itemIndex, 1);
          }
      }
      return { ...currentRider, performanceNutrition: { ...perfNutrition, [type]: selectionArray }};
    });
  };
  
  const handleSelectProduct = (product: TeamProduct) => {
    const typeKey = product.type === 'gel' ? 'selectedGels' : product.type === 'bar' ? 'selectedBars' : 'selectedDrinks';
    
    updateRiderProperty(currentRider => {
        let perfNutrition = { ...(currentRider.performanceNutrition || {}) };
        let selectionArray: SelectedProduct[] = [...(perfNutrition[typeKey] || [])];
        if (!selectionArray.some(p => p.productId === product.id)) {
            selectionArray.push({ productId: product.id, quantity: 1 });
        }
        return { ...currentRider, performanceNutrition: { ...perfNutrition, [typeKey]: selectionArray } };
    });
    setIsProductModalOpen(false);
  };
  
  const handleAddCustomProduct = () => {
    if (!customProduct.name) {
        alert(t('nutritionAddCustomProductError'));
        return;
    }
    const newProduct: TeamProduct = { ...customProduct, id: `custom-${generateId()}`, type: modalMode };
    
    updateRiderProperty(currentRider => {
      let perfNutrition = { ...(currentRider.performanceNutrition || {}) };
      const customProducts = [...(perfNutrition.customProducts || []), newProduct];
      return { ...currentRider, performanceNutrition: { ...perfNutrition, customProducts }};
    });
    
    handleSelectProduct(newProduct);
    setCustomProduct(createEmptyCustomProduct(modalMode));
  };

  const handleApplyAiPlan = (plan: GeneratedNutritionPlan) => {
    updateRiderProperty(currentRider => ({
      ...currentRider,
      performanceNutrition: {
        ...(currentRider.performanceNutrition || {}),
        carbsPerHourTarget: plan.carbsPerHourTarget,
        hydrationNotes: plan.hydrationNotes,
        notes: `${plan.strategyNotes}\n\n--- Timeline ---\n${formatTimelineForDisplay(plan.timeline)}`,
        selectedGels: plan.selectedGels,
        selectedBars: plan.selectedBars,
        selectedDrinks: plan.selectedDrinks,
      },
    }));
  };

  const allProducts = useMemo(
    () => (rider ? [...teamProducts, ...(rider.performanceNutrition?.customProducts || [])] : []),
    [rider, teamProducts],
  );

  const summary = useMemo(() => {
    if (!rider) {
      return { allergyCount: 0, criticalAllergies: 0, hasRegimen: false, carbsPerHour: undefined as number | undefined, productCount: 0 };
    }
    const perf = rider.performanceNutrition;
    const productCount =
      (perf?.selectedGels?.length || 0)
      + (perf?.selectedBars?.length || 0)
      + (perf?.selectedDrinks?.length || 0);
    const criticalAllergies = (rider.allergies || []).filter((a) => {
      const info = a.allergenKey !== 'CUSTOM' ? PREDEFINED_ALLERGEN_INFO[a.allergenKey as PredefinedAllergenEnum] : null;
      return a.isCeliacDisease || info?.severity === 'CRITIQUE';
    }).length;
    return {
      allergyCount: rider.allergies?.length || 0,
      criticalAllergies,
      hasRegimen: Boolean(rider.dietaryRegimen?.trim() || rider.foodPreferences?.trim()),
      carbsPerHour: perf?.carbsPerHourTarget,
      productCount,
    };
  }, [rider]);

  if (!rider) {
    return (
      <SectionWrapper title="Mes Préférences Nutritionnelles">
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-5 space-y-2">
          <p className="text-sm font-semibold text-amber-100">
            Profil coureur introuvable
          </p>
          <p className="text-sm text-slate-300">
            Impossible de charger vos préférences nutritionnelles. Vérifiez que votre compte
            est bien lié à une fiche athlète (même e-mail ou même identité dans l’effectif),
            puis rechargez la page.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  const inputClass = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900 placeholder-gray-400";
  const selectClass = "block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900";
  const checkboxClass = "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500";
  const cardClass = "bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const tabs: { id: NutritionTab; label: string; badge?: string | number }[] = [
    { id: 'profile', label: t('nutritionTabProfile') },
    { id: 'allergies', label: t('nutritionTabAllergies'), badge: summary.allergyCount || undefined },
    { id: 'race', label: t('nutritionTabRace'), badge: summary.productCount || undefined },
    { id: 'assistants', label: t('nutritionTabAssistants') },
  ];

  const renderAllergyCard = (allergy: AllergyItem, index: number) => {
    const allergenInfo = allergy.allergenKey !== 'CUSTOM' ? PREDEFINED_ALLERGEN_INFO[allergy.allergenKey as PredefinedAllergenEnum] : null;
    const isCritical = allergenInfo?.severity === 'CRITIQUE' || allergy.isCeliacDisease;
    const isHigh = allergenInfo?.severity === 'ELEVEE';

    return (
      <div
        key={allergy.id}
        className={`p-4 rounded-xl border-2 ${
          isCritical ? 'bg-red-50 border-red-400' : isHigh ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Allergène</label>
            <select name={`allergies.${index}.allergenKey`} value={allergy.allergenKey} onChange={handleInputChange} className={selectClass}>
              <option value="CUSTOM">Personnalisé</option>
              {Object.keys(PREDEFINED_ALLERGEN_INFO).map(key => (
                <option key={key} value={key}>{PREDEFINED_ALLERGEN_INFO[key as PredefinedAllergenEnum].displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sévérité</label>
            <select
              name={`allergies.${index}.severity`}
              value={allergy.severity}
              onChange={handleInputChange}
              className={`${selectClass} ${
                allergy.severity === 'SÉVÈRE' ? 'bg-red-50 border-red-300' :
                allergy.severity === 'MODÉRÉE' ? 'bg-orange-50 border-orange-300' :
                'bg-green-50 border-green-300'
              }`}
            >
              {Object.values(AllergySeverityEnum).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {allergy.allergenKey === 'CUSTOM' && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l'allergène</label>
            <input type="text" name={`allergies.${index}.customAllergenName`} value={allergy.customAllergenName || ''} onChange={handleInputChange} placeholder="Ex: Fruits à coque" className={inputClass} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Régime d'éviction</label>
            <textarea name={`allergies.${index}.regimeDetails`} value={allergy.regimeDetails} onChange={handleInputChange} placeholder="Aliments à exclure…" rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Notes réaction</label>
            <textarea name={`allergies.${index}.notes`} value={allergy.notes || ''} onChange={handleInputChange} placeholder="Symptômes observés…" rows={2} className={`${inputClass} resize-none`} />
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-gray-200/80">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" id={`isCeliac-${index}`} name={`allergies.${index}.isCeliacDisease`} checked={allergy.isCeliacDisease || false} onChange={handleInputChange} className={checkboxClass} />
            <span className={allergy.isCeliacDisease ? 'text-red-700 font-semibold' : 'text-gray-700'}>
              {allergy.isCeliacDisease ? 'Maladie cœliaque confirmée' : 'Maladie cœliaque ?'}
            </span>
          </label>
          <ActionButton type="button" onClick={() => handleRemoveAllergy(allergy.id)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4" />}>
            Supprimer
          </ActionButton>
        </div>
      </div>
    );
  };

  const renderProductColumn = (typeKey: 'selectedGels' | 'selectedBars' | 'selectedDrinks') => {
    const title = typeKey === 'selectedGels' ? 'Gels' : typeKey === 'selectedBars' ? 'Barres' : 'Boissons';
    const modalType = typeKey === 'selectedGels' ? 'gel' : typeKey === 'selectedBars' ? 'bar' : 'drink';
    const items = rider.performanceNutrition?.[typeKey] || [];

    return (
      <div key={typeKey} className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
        <div className="flex justify-between items-center mb-2">
          <h5 className="font-semibold text-sm text-gray-800">{title}</h5>
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => { setModalMode(modalType); setCustomProduct(createEmptyCustomProduct(modalType)); setIsProductModalOpen(true); }}
          >
            <PlusCircleIcon className="w-3 h-3 mr-1" />Ajouter
          </ActionButton>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Aucun produit</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const product = allProducts.find(p => p.id === item.productId);
              if (!product) return null;
              const productSummary = formatProductNutritionSummary(product);
              const ratio = formatGlucoseFructoseRatio(product.glucose, product.fructose);
              return (
                <div key={item.productId} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-gray-800 block truncate">{product.name}</span>
                    {(productSummary || ratio) && (
                      <span className="text-[10px] text-gray-500 block truncate">{productSummary}{ratio ? ` • G:F ${ratio}` : ''}</span>
                    )}
                  </div>
                  <input type="number" value={item.quantity} min="0" onChange={e => handleQuantityChange(typeKey, item.productId, parseInt(e.target.value, 10) || 0)} className={`${inputClass} !mt-0 w-14 py-1 text-center text-sm shrink-0`} aria-label={`Quantité ${product.name}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <SectionWrapper title="Mes Préférences Nutritionnelles">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className={`${cardClass} !p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('nutritionKpiAllergies')}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {summary.allergyCount}
            {summary.criticalAllergies > 0 && (
              <span className="ml-1 text-xs font-semibold text-red-600">({summary.criticalAllergies} crit.)</span>
            )}
          </p>
        </div>
        <div className={`${cardClass} !p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('nutritionKpiRegimen')}</p>
          <p className={`text-xl font-bold mt-0.5 ${summary.hasRegimen ? 'text-emerald-600' : 'text-gray-400'}`}>
            {summary.hasRegimen ? t('nutritionYes') : t('nutritionNo')}
          </p>
        </div>
        <div className={`${cardClass} !p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('nutritionKpiCarbs')}</p>
          <p className="text-xl font-bold text-indigo-700 mt-0.5">
            {summary.carbsPerHour != null ? `${summary.carbsPerHour} g` : t('nutritionNotSet')}
          </p>
        </div>
        <div className={`${cardClass} !p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('nutritionKpiProducts')}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{summary.productCount}</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Sections nutrition">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge !== 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Profil alimentaire */}
      {activeTab === 'profile' && (
        <div className="space-y-4 max-w-3xl">
          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Préférences et régimes</h3>
            <p className="text-xs text-gray-500 mb-4">Hors allergies — complétez l'onglet Allergies pour les alertes sécurité.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="dietaryRegimen" className={labelClass}>Régime spécifique</label>
                <textarea id="dietaryRegimen" name="dietaryRegimen" value={rider.dietaryRegimen || ''} onChange={handleInputChange} rows={2} className={inputClass} placeholder="Ex: Végétarien, sans porc…" />
              </div>
              <div>
                <label htmlFor="foodPreferences" className={labelClass}>Préférences / aversions</label>
                <textarea id="foodPreferences" name="foodPreferences" value={rider.foodPreferences || ''} onChange={handleInputChange} rows={2} className={inputClass} placeholder="Ex: Pâtes OK, pas de betteraves…" />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Collations préférées</h3>
            <p className="text-xs text-gray-500 mb-4">{t('nutritionSnacksHint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { name: 'snack1' as const, label: 'Collation 1 (préférée)', placeholder: 'Salade de riz', value: rider.snack1 },
                { name: 'snack2' as const, label: 'Collation 2', placeholder: 'Wrap', value: rider.snack2 },
                { name: 'snack3' as const, label: 'Collation 3', placeholder: 'Casse-croûte', value: rider.snack3 },
              ]).map(({ name, label, placeholder, value }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" name={name} value={value || ''} onChange={handleInputChange} className={inputClass} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Allergies */}
      {activeTab === 'allergies' && (
        <div className="space-y-4 max-w-3xl">
          {(rider.allergies || []).length === 0 ? (
            <div className={`${cardClass} text-center py-10`}>
              <p className="text-4xl mb-3" aria-hidden>🚨</p>
              <h3 className="text-base font-semibold text-gray-900">{t('nutritionAllergiesEmptyTitle')}</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{t('nutritionAllergiesEmptyDesc')}</p>
              <ActionButton type="button" onClick={handleAddAllergy} className="mt-5" icon={<PlusCircleIcon className="w-4 h-4" />}>
                {t('nutritionTabAllergies')} — ajouter
              </ActionButton>
            </div>
          ) : (
            <div className="space-y-3">
              {(rider.allergies || []).map((allergy, index) => renderAllergyCard(allergy, index))}
            </div>
          )}
          {(rider.allergies || []).length > 0 && (
            <ActionButton type="button" onClick={handleAddAllergy} variant="secondary" size="sm" icon={<PlusCircleIcon className="w-4 h-4" />}>
              Ajouter une allergie
            </ActionButton>
          )}
        </div>
      )}

      {/* Plan course */}
      {activeTab === 'race' && (
        <div className="space-y-4">
          <NutritionPlanAiAssistant rider={rider} teamProducts={allProducts} onApply={handleApplyAiPlan} />

          <div className={`${cardClass} grid grid-cols-1 lg:grid-cols-2 gap-4`}>
            <div>
              <label className={labelClass}>Objectif glucides / heure (g)</label>
              <input type="number" name="performanceNutrition.carbsPerHourTarget" value={rider.performanceNutrition?.carbsPerHourTarget ?? ''} onChange={handleInputChange} placeholder="90" className={inputClass} min={0} />
            </div>
            <div>
              <label className={labelClass}>Notes hydratation</label>
              <textarea name="performanceNutrition.hydrationNotes" value={rider.performanceNutrition?.hydrationNotes || ''} onChange={handleInputChange} rows={2} className={inputClass} placeholder="1 bidon/h, électrolytes si chaleur…" />
            </div>
            <div className="lg:col-span-2">
              <label className={labelClass}>Stratégie / notes course</label>
              <textarea name="performanceNutrition.notes" value={rider.performanceNutrition?.notes || ''} onChange={handleInputChange} rows={4} className={inputClass} placeholder="Plan généré par l'assistant ou notes personnalisées…" />
            </div>
          </div>

          <div className={cardClass}>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Produits en course</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['selectedGels', 'selectedBars', 'selectedDrinks'] as const).map(renderProductColumn)}
            </div>
          </div>
        </div>
      )}

      {/* Assistants */}
      {activeTab === 'assistants' && (
        <div className="space-y-4">
          <div className={`${cardClass} max-w-3xl space-y-4`}>
            <div>
              <label className={labelClass}>Horaires de collations</label>
              <textarea name="snackSchedule" value={rider.snackSchedule || ''} onChange={handleInputChange} rows={3} className={inputClass} placeholder="Ex: Collation 1 h avant départ, gel toutes les 45 min…" />
            </div>
            <div>
              <label className={labelClass}>Instructions pour les assistants</label>
              <textarea name="assistantInstructions" value={rider.assistantInstructions || ''} onChange={handleInputChange} rows={3} className={inputClass} placeholder="Ex: Vérifier les étiquettes, éviter contaminations croisées…" />
            </div>
          </div>
          <NutritionSummaryForAssistants rider={rider} highlightCarbStrategy />
        </div>
      )}
      
      {isProductModalOpen && (
        <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={`Ajouter un(e) ${modalMode}`}>
          <div className="space-y-4">
            <div>
                <h4 className="font-semibold">Choisir un produit de l'équipe</h4>
                <div className="max-h-48 overflow-y-auto space-y-1 p-2 border rounded-md">
                    {allProducts.filter(p => p.type === modalMode).map(p => {
                      const summary = formatProductNutritionSummary(p);
                      const ratio = formatGlucoseFructoseRatio(p.glucose, p.fructose);
                      return (
                        <button key={p.id} onClick={() => handleSelectProduct(p)} className="w-full text-left p-3 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200">
                          <div className="font-medium">{p.name} {p.brand ? `(${p.brand})` : ''}</div>
                          {(summary || ratio) && (
                            <div className="text-xs text-gray-600 mt-1">
                              {summary}
                              {ratio && ` • ratio G:F ${ratio}`}
                            </div>
                          )}
                          {p.composition && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.composition}</div>
                          )}
                        </button>
                      );
                    })}
                </div>
            </div>
             <div className="text-center text-sm text-gray-500">ou</div>
            <div>
                <h4 className="font-semibold">Ajouter un produit personnel</h4>
                <div className="p-3 bg-gray-50 rounded-md border mt-1">
                    <CustomProductForm
                      product={customProduct}
                      onChange={setCustomProduct}
                      onSubmit={handleAddCustomProduct}
                      productType={modalMode}
                      inputClass={inputClass}
                    />
                </div>
            </div>
          </div>
        </Modal>
      )}
    </SectionWrapper>
  );
};

export default NutritionSection;
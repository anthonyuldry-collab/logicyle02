import React, { useState, useMemo } from 'react';
import { Rider, User, TeamProduct, AllergyItem } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import BeakerIcon from '../components/icons/BeakerIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import TrashIcon from '../components/icons/TrashIcon';

interface MyNutritionSectionProps {
  riders: Rider[];
  currentUser: User;
  teamProducts: TeamProduct[];
  onSaveRider: (rider: Rider) => void;
}

const MyNutritionSection: React.FC<MyNutritionSectionProps> = ({
  riders,
  currentUser,
  teamProducts,
  onSaveRider
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'allergies' | 'preferences' | 'products'>('overview');
  const [editingAllergies, setEditingAllergies] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);

  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  const nutritionSummary = useMemo(() => {
    if (!riderProfile) return null;
    
    const allergies = riderProfile.allergies || [];
    const performanceNutrition = riderProfile.performanceNutrition;
    
    return {
      allergiesCount: allergies.length,
      hasAllergies: allergies.length > 0,
      allergies: allergies,
      snackPreferences: riderProfile.snack1 || riderProfile.snack2 || riderProfile.snack3,
      assistantInstructions: riderProfile.assistantInstructions,
      snackSchedule: riderProfile.snackSchedule,
      dietaryRegimen: riderProfile.dietaryRegimen,
      foodPreferences: riderProfile.foodPreferences,
      performanceNutrition: performanceNutrition
    };
  }, [riderProfile]);

  const handleAllergyAdd = (allergen: string, severity: string, notes?: string) => {
    if (!riderProfile) return;
    
    const newAllergy: AllergyItem = {
      id: `allergy_${Date.now()}`,
      allergen,
      severity: severity as any,
      notes: notes || ''
    };
    
    const updatedRider = {
      ...riderProfile,
      allergies: [...(riderProfile.allergies || []), newAllergy]
    };
    
    onSaveRider(updatedRider);
  };

  const handleAllergyRemove = (allergyId: string) => {
    if (!riderProfile) return;
    
    const updatedRider = {
      ...riderProfile,
      allergies: (riderProfile.allergies || []).filter(a => a.id !== allergyId)
    };
    
    onSaveRider(updatedRider);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Résumé des allergies */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Allergies et Restrictions</h3>
        {nutritionSummary?.hasAllergies ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {nutritionSummary.allergiesCount} allergie(s) déclarée(s)
            </p>
            <div className="flex flex-wrap gap-2">
              {nutritionSummary.allergies.map((allergy, index) => (
                <div key={index} className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  <span>{allergy.allergen}</span>
                  <span className="text-xs">({allergy.severity})</span>
                  <button
                    onClick={() => handleAllergyRemove(allergy.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Aucune allergie déclarée</p>
        )}
      </div>

      {/* Préférences alimentaires */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Préférences Alimentaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Régime alimentaire</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {nutritionSummary?.dietaryRegimen || "Aucun régime spécifique"}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Collations préférées</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {nutritionSummary?.snackPreferences || "Aucune préférence définie"}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions pour assistants */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions pour Assistants</h3>
        {nutritionSummary?.assistantInstructions ? (
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {nutritionSummary.assistantInstructions}
          </p>
        ) : (
          <p className="text-gray-500">Aucune instruction spécifique</p>
        )}
      </div>
    </div>
  );

  const renderAllergiesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Gestion des Allergies</h3>
          <ActionButton onClick={() => setEditingAllergies(!editingAllergies)}>
            {editingAllergies ? 'Annuler' : 'Ajouter une allergie'}
          </ActionButton>
        </div>

        {/* Liste des allergies */}
        {nutritionSummary?.allergies && nutritionSummary.allergies.length > 0 ? (
          <div className="space-y-3">
            {nutritionSummary.allergies.map((allergy, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <span className="font-medium text-red-800">{allergy.allergen}</span>
                  <span className="ml-2 text-sm text-red-600">({allergy.severity})</span>
                  {allergy.notes && (
                    <p className="text-sm text-red-600 mt-1">{allergy.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAllergyRemove(allergy.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Aucune allergie déclarée</p>
        )}

        {/* Formulaire d'ajout */}
        {editingAllergies && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Ajouter une allergie</h4>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const allergen = formData.get('allergen') as string;
              const severity = formData.get('severity') as string;
              const notes = formData.get('notes') as string;
              
              if (allergen && severity) {
                handleAllergyAdd(allergen, severity, notes);
                setEditingAllergies(false);
                e.currentTarget.reset();
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergène</label>
                  <input
                    type="text"
                    name="allergen"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Gluten, Lactose..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sévérité</label>
                  <select
                    name="severity"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="LEGERE">Légère</option>
                    <option value="MODEREE">Modérée</option>
                    <option value="SEVERE">Sévère</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    name="notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Informations supplémentaires..."
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <ActionButton type="submit">Ajouter</ActionButton>
                <ActionButton 
                  type="button" 
                  onClick={() => setEditingAllergies(false)}
                  variant="secondary"
                >
                  Annuler
                </ActionButton>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Préférences Alimentaires</h3>
          <ActionButton onClick={() => setEditingPreferences(!editingPreferences)}>
            {editingPreferences ? 'Annuler' : 'Modifier'}
          </ActionButton>
        </div>

        {editingPreferences ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            // Ici on sauvegarderait les préférences
            setEditingPreferences(false);
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Régime alimentaire</label>
                <input
                  type="text"
                  defaultValue={nutritionSummary?.dietaryRegimen || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Végétarien, Végan, Sans gluten..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Préférences alimentaires</label>
                <textarea
                  defaultValue={nutritionSummary?.foodPreferences || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Décrivez vos préférences alimentaires..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collations préférées</label>
                <input
                  type="text"
                  defaultValue={nutritionSummary?.snackPreferences || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Banane, Barre énergétique..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions pour assistants</label>
                <textarea
                  defaultValue={nutritionSummary?.assistantInstructions || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Instructions spéciales pour les assistants..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton type="submit">Sauvegarder</ActionButton>
              <ActionButton 
                type="button" 
                onClick={() => setEditingPreferences(false)}
                variant="secondary"
              >
                Annuler
              </ActionButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Régime alimentaire</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {nutritionSummary?.dietaryRegimen || "Aucun régime spécifique"}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Préférences alimentaires</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {nutritionSummary?.foodPreferences || "Aucune préférence définie"}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Collations préférées</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {nutritionSummary?.snackPreferences || "Aucune préférence définie"}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Instructions pour assistants</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {nutritionSummary?.assistantInstructions || "Aucune instruction spécifique"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProductsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Produits de l'Équipe</h3>
        {teamProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamProducts.map(product => (
              <div key={product.id} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900">{product.name}</h4>
                <p className="text-sm text-gray-600">{product.brand}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {product.type} • {product.carbs}g glucides
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Aucun produit disponible</p>
        )}
      </div>
    </div>
  );

  if (!riderProfile) {
    return (
      <SectionWrapper title="Ma Nutrition">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <BeakerIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Ma Nutrition">
      <div className="space-y-6">
        {/* Navigation par onglets */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Vue d\'ensemble' },
              { id: 'allergies', label: 'Allergies' },
              { id: 'preferences', label: 'Préférences' },
              { id: 'products', label: 'Produits Équipe' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu de l'onglet actif */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'allergies' && renderAllergiesTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
        {activeTab === 'products' && renderProductsTab()}
      </div>
    </SectionWrapper>
  );
};

export default MyNutritionSection;

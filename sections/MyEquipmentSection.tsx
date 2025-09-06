import React, { useState, useMemo } from 'react';
import { Rider, User, EquipmentItem, ClothingItem } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import WrenchScrewdriverIcon from '../components/icons/WrenchScrewdriverIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import TrashIcon from '../components/icons/TrashIcon';

interface MyEquipmentSectionProps {
  riders: Rider[];
  currentUser: User;
  onSaveRider: (rider: Rider) => void;
}

const MyEquipmentSection: React.FC<MyEquipmentSectionProps> = ({
  riders,
  currentUser,
  onSaveRider
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bikes' | 'clothing' | 'equipment'>('overview');
  const [editingBike, setEditingBike] = useState<string | null>(null);
  const [editingClothing, setEditingClothing] = useState<string | null>(null);

  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  const equipmentSummary = useMemo(() => {
    if (!riderProfile) return null;
    
    return {
      roadBike: riderProfile.roadBikeSetup,
      ttBike: riderProfile.ttBikeSetup,
      clothing: riderProfile.clothing || [],
      equipment: riderProfile.equipment || [],
      bikeFit: riderProfile.bikeFitMeasurements,
      bikeSpecific: riderProfile.bikeSpecificMeasurements
    };
  }, [riderProfile]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Vélos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vélos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Vélo de Route</h4>
            {equipmentSummary?.roadBike ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Modèle:</span> {equipmentSummary.roadBike.name}</p>
                <p><span className="text-gray-600">Marque:</span> {equipmentSummary.roadBike.brand}</p>
                <p><span className="text-gray-600">Taille:</span> {equipmentSummary.roadBike.size}</p>
              </div>
            ) : (
              <p className="text-gray-500">Aucun vélo de route configuré</p>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Vélo de CLM</h4>
            {equipmentSummary?.ttBike ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Modèle:</span> {equipmentSummary.ttBike.name}</p>
                <p><span className="text-gray-600">Marque:</span> {equipmentSummary.ttBike.brand}</p>
                <p><span className="text-gray-600">Taille:</span> {equipmentSummary.ttBike.size}</p>
              </div>
            ) : (
              <p className="text-gray-500">Aucun vélo de CLM configuré</p>
            )}
          </div>
        </div>
      </div>

      {/* Vêtements */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vêtements</h3>
        {equipmentSummary?.clothing && equipmentSummary.clothing.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentSummary.clothing.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700">{item.name}</h4>
                <p className="text-sm text-gray-600">{item.brand}</p>
                <p className="text-xs text-gray-500">Taille: {item.size}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Aucun vêtement enregistré</p>
        )}
      </div>

      {/* Équipement */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipement</h3>
        {equipmentSummary?.equipment && equipmentSummary.equipment.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentSummary.equipment.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700">{item.name}</h4>
                <p className="text-sm text-gray-600">{item.brand}</p>
                <p className="text-xs text-gray-500">Type: {item.type}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Aucun équipement enregistré</p>
        )}
      </div>
    </div>
  );

  const renderBikesTab = () => (
    <div className="space-y-6">
      {/* Vélo de Route */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vélo de Route</h3>
          <ActionButton onClick={() => setEditingBike(editingBike === 'road' ? null : 'road')}>
            {editingBike === 'road' ? 'Annuler' : 'Modifier'}
          </ActionButton>
        </div>

        {editingBike === 'road' ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            // Ici on sauvegarderait les modifications
            setEditingBike(null);
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                <input
                  type="text"
                  defaultValue={equipmentSummary?.roadBike?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                <input
                  type="text"
                  defaultValue={equipmentSummary?.roadBike?.brand || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                <input
                  type="text"
                  defaultValue={equipmentSummary?.roadBike?.size || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <input
                  type="number"
                  defaultValue={equipmentSummary?.roadBike?.year || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton type="submit">Sauvegarder</ActionButton>
              <ActionButton 
                type="button" 
                onClick={() => setEditingBike(null)}
                variant="secondary"
              >
                Annuler
              </ActionButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {equipmentSummary?.roadBike ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Informations générales</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Modèle:</span> {equipmentSummary.roadBike.name}</p>
                    <p><span className="text-gray-600">Marque:</span> {equipmentSummary.roadBike.brand}</p>
                    <p><span className="text-gray-600">Taille:</span> {equipmentSummary.roadBike.size}</p>
                    <p><span className="text-gray-600">Année:</span> {equipmentSummary.roadBike.year || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Groupe:</span> {equipmentSummary.roadBike.groupset || 'N/A'}</p>
                    <p><span className="text-gray-600">Roues:</span> {equipmentSummary.roadBike.wheels || 'N/A'}</p>
                    <p><span className="text-gray-600">Poids:</span> {equipmentSummary.roadBike.weight ? `${equipmentSummary.roadBike.weight}kg` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Aucun vélo de route configuré</p>
            )}
          </div>
        )}
      </div>

      {/* Vélo de CLM */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vélo de CLM</h3>
          <ActionButton onClick={() => setEditingBike(editingBike === 'tt' ? null : 'tt')}>
            {editingBike === 'tt' ? 'Annuler' : 'Modifier'}
          </ActionButton>
        </div>

        {editingBike === 'tt' ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            setEditingBike(null);
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                <input
                  type="text"
                  defaultValue={equipmentSummary?.ttBike?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                <input
                  type="text"
                  defaultValue={equipmentSummary?.ttBike?.brand || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                <input
                  type="text"
                  defaultValue={equipmentSummary?.ttBike?.size || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <input
                  type="number"
                  defaultValue={equipmentSummary?.ttBike?.year || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton type="submit">Sauvegarder</ActionButton>
              <ActionButton 
                type="button" 
                onClick={() => setEditingBike(null)}
                variant="secondary"
              >
                Annuler
              </ActionButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {equipmentSummary?.ttBike ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Informations générales</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Modèle:</span> {equipmentSummary.ttBike.name}</p>
                    <p><span className="text-gray-600">Marque:</span> {equipmentSummary.ttBike.brand}</p>
                    <p><span className="text-gray-600">Taille:</span> {equipmentSummary.ttBike.size}</p>
                    <p><span className="text-gray-600">Année:</span> {equipmentSummary.ttBike.year || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Groupe:</span> {equipmentSummary.ttBike.groupset || 'N/A'}</p>
                    <p><span className="text-gray-600">Roues:</span> {equipmentSummary.ttBike.wheels || 'N/A'}</p>
                    <p><span className="text-gray-600">Poids:</span> {equipmentSummary.ttBike.weight ? `${equipmentSummary.ttBike.weight}kg` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Aucun vélo de CLM configuré</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderClothingTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vêtements</h3>
          <ActionButton onClick={() => setEditingClothing('add')}>
            <PlusCircleIcon className="w-4 h-4 mr-2" />
            Ajouter un vêtement
          </ActionButton>
        </div>

        {equipmentSummary?.clothing && equipmentSummary.clothing.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentSummary.clothing.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <button
                    onClick={() => {
                      // Supprimer le vêtement
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">{item.brand}</p>
                <p className="text-xs text-gray-500">Taille: {item.size}</p>
                <p className="text-xs text-gray-500">Type: {item.type}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Aucun vêtement enregistré</p>
        )}
      </div>
    </div>
  );

  const renderEquipmentTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Équipement</h3>
          <ActionButton onClick={() => setEditingClothing('add')}>
            <PlusCircleIcon className="w-4 h-4 mr-2" />
            Ajouter un équipement
          </ActionButton>
        </div>

        {equipmentSummary?.equipment && equipmentSummary.equipment.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentSummary.equipment.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <button
                    onClick={() => {
                      // Supprimer l'équipement
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">{item.brand}</p>
                <p className="text-xs text-gray-500">Type: {item.type}</p>
                <p className="text-xs text-gray-500">Statut: {item.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Aucun équipement enregistré</p>
        )}
      </div>
    </div>
  );

  if (!riderProfile) {
    return (
      <SectionWrapper title="Mon Matériel">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <WrenchScrewdriverIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Mon Matériel">
      <div className="space-y-6">
        {/* Navigation par onglets */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Vue d\'ensemble' },
              { id: 'bikes', label: 'Vélos' },
              { id: 'clothing', label: 'Vêtements' },
              { id: 'equipment', label: 'Équipement' }
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
        {activeTab === 'bikes' && renderBikesTab()}
        {activeTab === 'clothing' && renderClothingTab()}
        {activeTab === 'equipment' && renderEquipmentTab()}
      </div>
    </SectionWrapper>
  );
};

export default MyEquipmentSection;

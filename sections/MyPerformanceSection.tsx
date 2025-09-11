import React, { useState } from 'react';
import { Rider, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import PencilIcon from '../components/icons/PencilIcon';
import CheckIcon from '../components/icons/CheckIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import { LoadingOverlay } from '../components/LoadingIndicator';
import { isValidRidersArray, findRiderByEmail } from '../utils/riderUtils';

interface MyPerformanceSectionProps {
  riders: Rider[];
  currentUser: User;
  onSaveRider: (rider: Rider) => void;
}

const MyPerformanceSection: React.FC<MyPerformanceSectionProps> = ({
  riders,
  currentUser,
  onSaveRider
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Rider>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Vérification de sécurité pour riders
  if (!isValidRidersArray(riders)) {
    return (
      <SectionWrapper title="Mes Performances (PPR)">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement des données...</p>
          <p className="mt-2 text-gray-500">Veuillez patienter pendant le chargement de vos informations.</p>
        </div>
      </SectionWrapper>
    );
  }

  // Trouver le profil du coureur
  const riderProfile = findRiderByEmail(riders, currentUser.email);

  if (!riderProfile) {
    return (
      <SectionWrapper title="Mes Performances (PPR)">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <PencilIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  // Fonctions pour gérer l'édition
  const handleEdit = () => {
    setEditedData(riderProfile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedRider = { ...riderProfile, ...editedData } as Rider;
      
      // S'assurer que les profils de pré-fatigue sont correctement fusionnés
      if (editedData.powerProfile15KJ) {
        updatedRider.powerProfile15KJ = { ...riderProfile.powerProfile15KJ, ...editedData.powerProfile15KJ };
      }
      if (editedData.powerProfile30KJ) {
        updatedRider.powerProfile30KJ = { ...riderProfile.powerProfile30KJ, ...editedData.powerProfile30KJ };
      }
      if (editedData.powerProfile45KJ) {
        updatedRider.powerProfile45KJ = { ...riderProfile.powerProfile45KJ, ...editedData.powerProfile45KJ };
      }
      
      await onSaveRider(updatedRider);
      setIsEditing(false);
      setEditedData({});
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleInputChange = (field: keyof Rider, value: string | number) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (profileKey: keyof Pick<Rider, 'powerProfileFresh' | 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'>, powerKey: string, value: number) => {
    setEditedData(prev => {
      const updated = { ...prev };
      if (!updated[profileKey]) {
        updated[profileKey] = {};
      }
      (updated[profileKey] as any)[powerKey] = value;
      return updated;
    });
  };

  const powerFields = [
    { key: 'power1s', label: '1 seconde', unit: 'W' },
    { key: 'power5s', label: '5 secondes', unit: 'W' },
    { key: 'power30s', label: '30 secondes', unit: 'W' },
    { key: 'power1min', label: '1 minute', unit: 'W' },
    { key: 'power3min', label: '3 minutes', unit: 'W' },
    { key: 'power5min', label: '5 minutes', unit: 'W' },
    { key: 'power12min', label: '12 minutes', unit: 'W' },
    { key: 'power20min', label: '20 minutes', unit: 'W' },
    { key: 'criticalPower', label: 'Puissance Critique', unit: 'W' }
  ];

  // Ordre croissant des puissances pour l'affichage
  const powerFieldsOrdered = [
    { key: 'criticalPower', label: 'Puissance Critique', unit: 'W' },
    { key: 'power1s', label: '1 seconde', unit: 'W' },
    { key: 'power3min', label: '3 minutes', unit: 'W' },
    { key: 'power30s', label: '30 secondes', unit: 'W' },
    { key: 'power20min', label: '20 minutes', unit: 'W' },
    { key: 'power1min', label: '1 minute', unit: 'W' },
    { key: 'power12min', label: '12 minutes', unit: 'W' },
    { key: 'power5min', label: '5 minutes', unit: 'W' },
    { key: 'power5s', label: '5 secondes', unit: 'W' }
  ];

  return (
    <SectionWrapper title="Mes Performances (PPR)">
      <LoadingOverlay isLoading={isSaving} message="Sauvegarde en cours...">
        <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Profils de Puissance Relatifs</h3>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Modifier</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Sauvegarder</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span>Annuler</span>
                </button>
              </div>
            )}
          </div>

          {/* Grille 2x2 des profils de puissance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profil Frais - Haut gauche */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Profil Frais</h4>
              <div className="space-y-2">
                {powerFieldsOrdered.map((field) => (
                  <div key={field.key} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={editedData[field.key as keyof Rider] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof Rider, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">{field.unit}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {riderProfile[field.key as keyof Rider] || '-'} {field.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profil 15kJ - Haut droite */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Profil 15kJ</h4>
              <div className="space-y-2">
                {powerFieldsOrdered.map((field) => (
                  <div key={`15kj-${field.key}`} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={editedData.powerProfile15KJ?.[field.key as keyof typeof editedData.powerProfile15KJ] || ''}
                          onChange={(e) => handleNestedInputChange('powerProfile15KJ', field.key, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">{field.unit}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {riderProfile.powerProfile15KJ?.[field.key as keyof typeof riderProfile.powerProfile15KJ] || '-'} {field.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profil 30kJ - Bas gauche */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Profil 30kJ</h4>
              <div className="space-y-2">
                {powerFieldsOrdered.map((field) => (
                  <div key={`30kj-${field.key}`} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={editedData.powerProfile30KJ?.[field.key as keyof typeof editedData.powerProfile30KJ] || ''}
                          onChange={(e) => handleNestedInputChange('powerProfile30KJ', field.key, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">{field.unit}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {riderProfile.powerProfile30KJ?.[field.key as keyof typeof riderProfile.powerProfile30KJ] || '-'} {field.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profil 45kJ - Bas droite */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Profil 45kJ</h4>
              <div className="space-y-2">
                {powerFieldsOrdered.map((field) => (
                  <div key={`45kj-${field.key}`} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={editedData.powerProfile45KJ?.[field.key as keyof typeof editedData.powerProfile45KJ] || ''}
                          onChange={(e) => handleNestedInputChange('powerProfile45KJ', field.key, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">{field.unit}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {riderProfile.powerProfile45KJ?.[field.key as keyof typeof riderProfile.powerProfile45KJ] || '-'} {field.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Informations sur le poids et la taille */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Informations physiques</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Poids (kg)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.weight || ''}
                    onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{riderProfile.weight || 'Non défini'} kg</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Taille (cm)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.height || ''}
                    onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{riderProfile.height || 'Non défini'} cm</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </LoadingOverlay>
    </SectionWrapper>
  );
};

export default MyPerformanceSection;
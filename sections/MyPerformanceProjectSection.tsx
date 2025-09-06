import React, { useState } from 'react';
import { Rider, User, PerformanceFactorDetail } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import LungsIcon from '../components/icons/LungsIcon';
import { PencilIcon, CheckCircleIcon, XCircleIcon } from '../components/icons';

interface MyPerformanceProjectSectionProps {
  riders: Rider[];
  currentUser: User;
  onSaveRider: (rider: Rider) => void;
}

const MyPerformanceProjectSection: React.FC<MyPerformanceProjectSectionProps> = ({
  riders,
  currentUser,
  onSaveRider
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Rider>>({});

  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  if (!riderProfile) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border">
        <LungsIcon className="w-12 h-12 mx-auto text-gray-400" />
        <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
        <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
      </div>
    );
  }

  const handleEdit = () => {
    setEditedData(riderProfile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const updatedRider = { ...riderProfile, ...editedData } as Rider;
      await onSaveRider(updatedRider);
      setIsEditing(false);
      setEditedData({});
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleInputChange = (field: keyof Rider, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (field: keyof Rider, subField: keyof PerformanceFactorDetail, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] as PerformanceFactorDetail || {}),
        [subField]: value
      }
    }));
  };

  const renderPerformanceFactor = (
    title: string,
    data: PerformanceFactorDetail,
    field: keyof Rider,
    icon: React.ReactNode
  ) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center mb-4">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900 ml-3">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Forces</label>
          {isEditing ? (
            <textarea
              value={editedData[field]?.forces || data.forces || ''}
              onChange={(e) => handleNestedInputChange(field, 'forces', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          ) : (
            <p className="text-gray-600 bg-gray-50 p-3 rounded-md min-h-[80px]">
              {data.forces || 'Non renseigné'}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">À Optimiser</label>
          {isEditing ? (
            <textarea
              value={editedData[field]?.aOptimiser || data.aOptimiser || ''}
              onChange={(e) => handleNestedInputChange(field, 'aOptimiser', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          ) : (
            <p className="text-gray-600 bg-gray-50 p-3 rounded-md min-h-[80px]">
              {data.aOptimiser || 'Non renseigné'}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">À Développer</label>
          {isEditing ? (
            <textarea
              value={editedData[field]?.aDevelopper || data.aDevelopper || ''}
              onChange={(e) => handleNestedInputChange(field, 'aDevelopper', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          ) : (
            <p className="text-gray-600 bg-gray-50 p-3 rounded-md min-h-[80px]">
              {data.aDevelopper || 'Non renseigné'}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Besoins & Actions</label>
          {isEditing ? (
            <textarea
              value={editedData[field]?.besoinsActions || data.besoinsActions || ''}
              onChange={(e) => handleNestedInputChange(field, 'besoinsActions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          ) : (
            <p className="text-gray-600 bg-gray-50 p-3 rounded-md min-h-[80px]">
              {data.besoinsActions || 'Non renseigné'}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête avec boutons d'édition */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mon Projet Performance</h2>
          <p className="text-gray-600 mt-1">Définissez vos objectifs et axes d'amélioration</p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Modifier
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Sauvegarder
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {/* Objectifs généraux */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Objectifs de Performance</h3>
        {isEditing ? (
          <textarea
            value={editedData.performanceGoals || riderProfile.performanceGoals || ''}
            onChange={(e) => handleInputChange('performanceGoals', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Décrivez vos objectifs de performance pour cette saison..."
          />
        ) : (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md min-h-[100px]">
            {riderProfile.performanceGoals || 'Aucun objectif défini'}
          </p>
        )}
      </div>

      {/* Souhaits généraux et objectifs de saison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Souhaits Généraux</h3>
          {isEditing ? (
            <textarea
              value={editedData.globalWishes || riderProfile.globalWishes || ''}
              onChange={(e) => handleInputChange('globalWishes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Vos souhaits généraux pour la saison..."
            />
          ) : (
            <p className="text-gray-600 bg-gray-50 p-4 rounded-md min-h-[100px]">
              {riderProfile.globalWishes || 'Non renseigné'}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Objectifs de Saison</h3>
          {isEditing ? (
            <textarea
              value={editedData.seasonObjectives || riderProfile.seasonObjectives || ''}
              onChange={(e) => handleInputChange('seasonObjectives', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Vos objectifs spécifiques pour cette saison..."
            />
          ) : (
            <p className="text-gray-600 bg-gray-50 p-4 rounded-md min-h-[100px]">
              {riderProfile.seasonObjectives || 'Non renseigné'}
            </p>
          )}
        </div>
      </div>

      {/* Facteurs de performance */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Analyse des Facteurs de Performance</h2>
        
        {renderPerformanceFactor(
          "Physique",
          riderProfile.physiquePerformanceProject,
          'physiquePerformanceProject',
          <LungsIcon className="w-6 h-6 text-red-500" />
        )}
        
        {renderPerformanceFactor(
          "Technique",
          riderProfile.techniquePerformanceProject,
          'techniquePerformanceProject',
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        
        {renderPerformanceFactor(
          "Mental",
          riderProfile.mentalPerformanceProject,
          'mentalPerformanceProject',
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
        
        {renderPerformanceFactor(
          "Environnement",
          riderProfile.environnementPerformanceProject,
          'environnementPerformanceProject',
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        
        {renderPerformanceFactor(
          "Tactique",
          riderProfile.tactiquePerformanceProject,
          'tactiquePerformanceProject',
          <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default MyPerformanceProjectSection;

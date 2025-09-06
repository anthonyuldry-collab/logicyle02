import React from 'react';
import { Rider, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import Cog6ToothIcon from '../components/icons/Cog6ToothIcon';

interface BikeSetupSectionProps {
  riders: Rider[];
  currentUser: User;
}

const BikeSetupSection: React.FC<BikeSetupSectionProps> = ({
  riders,
  currentUser
}) => {
  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  if (!riderProfile) {
    return (
      <SectionWrapper title="Cotes Vélo">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <Cog6ToothIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Cotes Vélo">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration des Vélos</h3>
          <div className="text-center py-8">
            <Cog6ToothIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            <p className="text-lg font-medium text-gray-700">Cotes et Réglages</p>
            <p className="text-gray-500 mt-2">
              Cette section contiendra les cotes, réglages et configurations de vos vélos.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Fonctionnalité en développement - Intégration avec les données de bike fit
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default BikeSetupSection;

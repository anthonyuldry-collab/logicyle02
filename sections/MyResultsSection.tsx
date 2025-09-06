import React from 'react';
import { Rider, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import TrophyIcon from '../components/icons/TrophyIcon';

interface MyResultsSectionProps {
  riders: Rider[];
  currentUser: User;
}

const MyResultsSection: React.FC<MyResultsSectionProps> = ({
  riders,
  currentUser
}) => {
  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  if (!riderProfile) {
    return (
      <SectionWrapper title="Mon Palmarès">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <TrophyIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Mon Palmarès">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résultats et Palmarès</h3>
          <div className="text-center py-8">
            <TrophyIcon className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <p className="text-lg font-medium text-gray-700">Section Palmarès</p>
            <p className="text-gray-500 mt-2">
              Cette section contiendra vos résultats de course, classements et palmarès.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Fonctionnalité en développement - Intégration avec les données de course
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default MyResultsSection;

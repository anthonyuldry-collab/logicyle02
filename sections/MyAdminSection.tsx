import React from 'react';
import { Rider, User, RaceEvent, RiderEventSelection, AppState, PermissionLevel } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import { RiderDetailModal } from '../components/RiderDetailModal';
import ShieldCheckIcon from '../components/icons/ShieldCheckIcon';

interface MyAdminSectionProps {
  riders: Rider[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  onSaveRider: (rider: Rider) => void;
  onUpdateRiderPreference: (riderId: string, eventId: string, isSelected: boolean) => void;
  appState: AppState;
  effectivePermissions: Record<string, PermissionLevel[]>;
}

const MyAdminSection: React.FC<MyAdminSectionProps> = ({
  riders,
  currentUser,
  raceEvents,
  riderEventSelections,
  onSaveRider,
  onUpdateRiderPreference,
  appState,
  effectivePermissions
}) => {
  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  if (!riderProfile) {
    return (
      <SectionWrapper title="Admin">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <ShieldCheckIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  const handleUpdateRiderPreference = (riderId: string, eventId: string, isSelected: boolean) => {
    onUpdateRiderPreference(riderId, eventId, isSelected);
  };

  return (
    <SectionWrapper title="Admin">
      <div className="space-y-6">
        {/* Header avec informations du coureur */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center space-x-4">
            {riderProfile.photoUrl ? (
              <img src={riderProfile.photoUrl} alt={`${riderProfile.firstName} ${riderProfile.lastName}`} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md" />
            ) : (
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {riderProfile.firstName?.[0] || 'C'}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{riderProfile.firstName} {riderProfile.lastName}</h2>
              <p className="text-blue-100">{riderProfile.teamName || 'Équipe Inconnue'}</p>
              <p className="text-sm text-blue-200">Dossier Administratif Complet</p>
            </div>
          </div>
        </div>

        {/* Dossier Administratif avec tous les onglets */}
        <div className="bg-white rounded-lg shadow-sm border">
          <RiderDetailModal
            rider={riderProfile}
            isOpen={true}
            onClose={() => {}} // Pas de fermeture possible, c'est la vue principale
            onSaveRider={onSaveRider}
            onUpdateRiderPreference={handleUpdateRiderPreference}
            raceEvents={raceEvents}
            riderEventSelections={riderEventSelections}
            performanceEntries={[]}
            powerDurationsConfig={[
              { key: 'power1s', label: '1s', unit: 'W', sortable: true },
              { key: 'power5s', label: '5s', unit: 'W', sortable: true },
              { key: 'power30s', label: '30s', unit: 'W', sortable: true },
              { key: 'power1min', label: '1min', unit: 'W', sortable: true },
              { key: 'power3min', label: '3min', unit: 'W', sortable: true },
              { key: 'power5min', label: '5min', unit: 'W', sortable: true },
              { key: 'power12min', label: '12min', unit: 'W', sortable: true },
              { key: 'power20min', label: '20min', unit: 'W', sortable: true },
              { key: 'criticalPower', label: 'CP', unit: 'W', sortable: true }
            ]}
            calculateWkg={(power?: number, weight?: number) => {
              if (!power || !weight) return '-';
              return (power / weight).toFixed(1);
            }}
            appState={appState}
            currentUser={currentUser}
            effectivePermissions={effectivePermissions}
          />
        </div>
      </div>
    </SectionWrapper>
  );
};

export default MyAdminSection;

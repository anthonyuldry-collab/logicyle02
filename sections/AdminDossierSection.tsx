import React, { useState, useEffect } from 'react';
import { Rider, User, UserRole, StaffMember, Team, RaceEvent, RiderEventSelection, AppState, RiderEventPreference } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import XCircleIcon from '../components/icons/XCircleIcon';
import { useTranslations } from '../hooks/useTranslations';
import { updateUserProfile } from '../services/firebaseService';

interface AdminDossierSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  setRiders: (updater: React.SetStateAction<Rider[]>) => void;
  onSaveRider: (rider: Rider) => void;
  setStaff: (updater: React.SetStateAction<StaffMember[]>) => void;
  onUpdateUser?: (user: User) => void;
  currentTeam?: Team; // Ajout de l'équipe actuelle pour synchroniser le teamName
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
  appState: AppState;
}

const AdminDossierSection: React.FC<AdminDossierSectionProps> = ({ 
  riders, 
  staff, 
  currentUser, 
  setRiders, 
  onSaveRider, 
  setStaff, 
  onUpdateUser, 
  currentTeam,
  raceEvents,
  riderEventSelections,
  setRiderEventSelections,
  appState
}) => {
  const [profileData, setProfileData] = useState<Rider | StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    // Protection contre currentUser undefined
    if (!currentUser || !currentUser.userRole || !currentUser.email) {
      setIsLoading(false);
      return;
    }

    let userProfile: Rider | StaffMember | undefined;

    if (currentUser.userRole === UserRole.COUREUR) {
        userProfile = riders.find(r => r.email === currentUser.email);
    } else if (currentUser.userRole === UserRole.STAFF || currentUser.userRole === UserRole.MANAGER) {
        userProfile = staff.find(s => s.email === currentUser.email);
    }
    
    if (userProfile) {
        // Synchroniser les informations personnelles du profil avec l'utilisateur si elles sont vides
        const profileWithUserInfo = structuredClone(userProfile);
        if (currentUser.firstName && !profileWithUserInfo.firstName) {
            profileWithUserInfo.firstName = currentUser.firstName;
        }
        if (currentUser.lastName && !profileWithUserInfo.lastName) {
            profileWithUserInfo.lastName = currentUser.lastName;
        }
        
        // Pour les coureurs, synchroniser aussi la date de naissance, le genre et le nom de l'équipe
        if (currentUser.userRole === UserRole.COUREUR) {
            const riderProfile = profileWithUserInfo as Rider;
            if (currentUser.signupInfo?.birthDate && !riderProfile.birthDate) {
                riderProfile.birthDate = currentUser.signupInfo.birthDate;
            }
            if (currentUser.signupInfo?.sex && !riderProfile.sex) {
                riderProfile.sex = currentUser.signupInfo.sex;
            }
            // Synchroniser le nom de l'équipe depuis l'équipe actuelle
            if (currentTeam?.name && !riderProfile.teamName) {
                riderProfile.teamName = currentTeam.name;
            }
        }
        
        setProfileData(profileWithUserInfo);
    }

    setIsLoading(false);
  }, [riders, staff, currentUser, currentTeam]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setProfileData(prev => {
        if (!prev) return null;
        
        const newFormData = structuredClone(prev);
        const keys = name.split('.');
        
        let currentLevel: any = newFormData;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            currentLevel[key] = { ...(currentLevel[key] || {}) };
            currentLevel = currentLevel[key];
        }
        const lastKey = keys[keys.length - 1];
        currentLevel[lastKey] = value;
        
        return newFormData;
    });
  };
  
  const handleLicenseUpdate = (base64?: string, mimeType?: string) => {
    setProfileData(prev => {
        if (!prev) return null;
        const updated = structuredClone(prev);
        if (base64 && mimeType) {
            updated.licenseImageBase64 = base64.split(',')[1];
            updated.licenseImageMimeType = mimeType;
        } else {
            updated.licenseImageBase64 = undefined;
            updated.licenseImageMimeType = undefined;
        }
        return updated;
    });
  };

  // Fonction pour gérer la mise à jour des préférences de course
  const handleUpdateRiderPreference = (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => {
    const existingSelection = riderEventSelections.find(sel => sel.eventId === eventId && sel.riderId === riderId);
    
    if (existingSelection) {
      // Mettre à jour la sélection existante
      setRiderEventSelections(prev => prev.map(sel => 
        sel.eventId === eventId && sel.riderId === riderId
          ? { ...sel, riderPreference: preference, riderObjectives: objectives || sel.riderObjectives }
          : sel
      ));
    } else {
      // Créer une nouvelle sélection
      const newSelection = {
        id: `selection_${Date.now()}`,
        eventId,
        riderId,
        status: 'EN_ATTENTE' as any,
        riderPreference: preference,
        riderObjectives: objectives || '',
        notes: ''
      };
      setRiderEventSelections(prev => [...prev, newSelection]);
    }
  };

  const handleSave = async () => {
    console.log('🔧 DEBUG - handleSave appelé', { profileData, currentUser });
    
    if (!profileData || !currentUser?.userRole) {
      console.log('❌ DEBUG - Conditions non remplies', { profileData: !!profileData, currentUser: !!currentUser });
      return;
    }
    
    if (currentUser.userRole === UserRole.COUREUR) {
      console.log('🔧 DEBUG - Sauvegarde coureur', { riderId: (profileData as Rider).id, firstName: (profileData as Rider).firstName, lastName: (profileData as Rider).lastName });
      
      try {
        // Sauvegarder dans Firebase
        await onSaveRider(profileData as Rider);
        
        // Mettre à jour l'état local
        setRiders(prevRiders => {
          const updatedRiders = prevRiders.map(r => r.id === (profileData as Rider).id ? (profileData as Rider) : r);
          console.log('🔧 DEBUG - Riders mis à jour', updatedRiders.find(r => r.id === (profileData as Rider).id));
          return updatedRiders;
        });
        
        // Synchroniser les informations personnelles avec le profil utilisateur
        if (onUpdateUser && (profileData as Rider).firstName && (profileData as Rider).lastName) {
          const updatedUser: User = {
            ...currentUser,
            firstName: (profileData as Rider).firstName,
            lastName: (profileData as Rider).lastName,
            signupInfo: {
              ...currentUser.signupInfo,
              birthDate: (profileData as Rider).birthDate || currentUser.signupInfo?.birthDate,
              sex: (profileData as Rider).sex || currentUser.signupInfo?.sex,
            }
          };
          console.log('🔧 DEBUG - Mise à jour utilisateur', updatedUser);
          
          // Sauvegarder dans Firebase
          try {
            await updateUserProfile(currentUser.id, {
              firstName: (profileData as Rider).firstName,
              lastName: (profileData as Rider).lastName,
              signupInfo: {
                birthDate: (profileData as Rider).birthDate || currentUser.signupInfo?.birthDate,
                sex: (profileData as Rider).sex || currentUser.signupInfo?.sex,
              }
            });
            console.log('✅ DEBUG - Utilisateur sauvegardé dans Firebase');
          } catch (userError) {
            console.error('❌ DEBUG - Erreur sauvegarde utilisateur:', userError);
          }
          
          // Mettre à jour l'état local
          onUpdateUser(updatedUser);
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
    } else {
      console.log('🔧 DEBUG - Sauvegarde staff', { staffId: (profileData as StaffMember).id });
      
      setStaff(prevStaff => {
        const updatedStaff = prevStaff.map(s => s.id === (profileData as StaffMember).id ? (profileData as StaffMember) : s);
        console.log('🔧 DEBUG - Staff mis à jour', updatedStaff.find(s => s.id === (profileData as StaffMember).id));
        return updatedStaff;
      });
      
      // Synchroniser les informations personnelles avec le profil utilisateur pour le staff
      if (onUpdateUser && (profileData as StaffMember).firstName && (profileData as StaffMember).lastName) {
        const updatedUser: User = {
          ...currentUser,
          firstName: (profileData as StaffMember).firstName,
          lastName: (profileData as StaffMember).lastName,
          // Le staff n'a pas de birthDate ni sex, on garde les valeurs existantes
          signupInfo: {
            ...currentUser.signupInfo,
          }
        };
        console.log('🔧 DEBUG - Mise à jour utilisateur staff', updatedUser);
        
        // Sauvegarder dans Firebase
        try {
          await updateUserProfile(currentUser.id, {
            firstName: (profileData as StaffMember).firstName,
            lastName: (profileData as StaffMember).lastName,
            // Le staff n'a pas de birthDate ni sex, on garde les valeurs existantes
            signupInfo: {
              ...currentUser.signupInfo,
            }
          });
          console.log('✅ DEBUG - Utilisateur staff sauvegardé dans Firebase');
        } catch (userError) {
          console.error('❌ DEBUG - Erreur sauvegarde utilisateur staff:', userError);
        }
        
        // Mettre à jour l'état local
        onUpdateUser(updatedUser);
      }
    }
    
    console.log('✅ DEBUG - Sauvegarde terminée');
    alert(t('saveSuccess'));
  };

  if (isLoading) {
    return <SectionWrapper title={t('titleMyAdminFile')}><p>{t('loading')}</p></SectionWrapper>;
  }

  if (!profileData) {
    return (
      <SectionWrapper title={t('titleMyAdminFile')}>
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
            <XCircleIcon className="w-12 h-12 mx-auto text-red-400" />
            <p className="mt-4 text-lg font-medium text-gray-700">Profil non trouvé</p>
            <p className="mt-2 text-gray-500">Impossible de charger votre dossier administratif. Veuillez contacter le support.</p>
        </div>
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title={t('titleMyAdminFile')}>
      <div className="space-y-6">
        {/* Section principale */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-lg text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Mon Dossier Personnel</h3>
            <p className="text-blue-100 mb-6 text-lg">
              Accédez à votre profil complet avec le nouveau tableau de bord optimisé
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ActionButton 
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 text-lg font-semibold"
              >
                🚀 Ouvrir Mon Profil Complet
              </ActionButton>
            </div>
          </div>
        </div>

        {/* Nouvelles fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Tableau de Bord</h4>
              <p className="text-gray-600 text-sm">
                Vue d'ensemble complète avec statistiques de performance et prochains événements
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Calendrier Prévisionnel</h4>
              <p className="text-gray-600 text-sm">
                Consultez tous les événements de l'équipe et exprimez vos préférences
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Objectifs de Saison</h4>
              <p className="text-gray-600 text-sm">
                Définissez vos souhaits et objectifs pour la saison en cours
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="ml-3">
              <h4 className="text-lg font-semibold text-yellow-800 mb-2">Comment accéder aux nouvelles fonctionnalités</h4>
              <ol className="text-yellow-700 space-y-1">
                <li>1. Cliquez sur "Ouvrir Mon Profil Complet" ci-dessus</li>
                <li>2. Vous verrez le nouvel onglet "Tableau de Bord" en premier</li>
                <li>3. Naviguez entre les sections : Vue d'ensemble, Calendrier, Performance, etc.</li>
                <li>4. Tous les onglets existants sont toujours disponibles</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Modal avec tous les onglets */}
      {currentUser.userRole === UserRole.COUREUR && (
        <RiderDetailModal
          rider={profileData as Rider}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
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
          effectivePermissions={appState.effectivePermissions}
          isEditMode={true}
        />
      )}
    </SectionWrapper>
  );
};

export default AdminDossierSection;
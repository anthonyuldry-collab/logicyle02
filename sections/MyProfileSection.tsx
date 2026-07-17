import React, { useState, useEffect, useMemo } from 'react';
import { Rider, User, UserRole, StaffMember, Team, RaceEvent, RiderEventSelection, AppState, RiderEventPreference } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import XCircleIcon from '../components/icons/XCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import CheckIcon from '../components/icons/CheckIcon';
import { useTranslations } from '../hooks/useTranslations';
import { updateUserProfile } from '../services/firebaseService';
import RiderDashboardTab from '../components/riderDetailTabs/RiderDashboardTab';
import RiderContractSummary from '../components/RiderContractSummary';
import StaffMyProfileWorkspace from '../components/StaffMyProfileWorkspace';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';
import { getRiderProfileForUser } from '../utils/eventRiderUtils';
import { isIndependentUser, userToRiderProfile } from '../utils/independentUtils';

interface MyProfileSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  setRiders: (updater: React.SetStateAction<Rider[]>) => void;
  onSaveRider: (rider: Rider) => void;
  onSaveStaff?: (staff: StaffMember) => void | Promise<void>;
  setStaff: (updater: React.SetStateAction<StaffMember[]>) => void;
  onUpdateUser?: (user: User) => void;
  currentTeam?: Team;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
  appState: AppState;
}

const MyProfileSection: React.FC<MyProfileSectionProps> = ({ 
  riders, 
  staff, 
  currentUser, 
  setRiders, 
  onSaveRider,
  onSaveStaff,
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Rider>>({});
  const { t } = useTranslations();

  const isCoureur =
    currentUser.userRole === UserRole.COUREUR ||
    String(currentUser.userRole).toLowerCase() === 'coureur';

  const resolvedRider = useMemo(() => {
    if (!isCoureur) return undefined;
    const fromRoster = getRiderProfileForUser(riders, currentUser);
    if (fromRoster) return fromRoster;
    // Indépendant, ou fiche équipe pas encore liée : profil à partir du compte User
    if (isIndependentUser(currentUser) || !currentTeam) {
      return userToRiderProfile(currentUser);
    }
    // Équipe sans match email/id : fallback User pour ne pas bloquer l'écran
    return userToRiderProfile(currentUser);
  }, [isCoureur, riders, currentUser, currentTeam]);

  useEffect(() => {
    if (!currentUser || !currentUser.userRole) {
      setProfileData(null);
      setIsLoading(false);
      return;
    }

    if (isCoureur) {
      if (resolvedRider) {
        const profileWithUserInfo = structuredClone(resolvedRider);
        if (currentUser.firstName && !profileWithUserInfo.firstName) {
          profileWithUserInfo.firstName = currentUser.firstName;
        }
        if (currentUser.lastName && !profileWithUserInfo.lastName) {
          profileWithUserInfo.lastName = currentUser.lastName;
        }
        if (currentUser.email && !profileWithUserInfo.email) {
          profileWithUserInfo.email = currentUser.email;
        }
        if (currentUser.signupInfo?.birthDate && !profileWithUserInfo.birthDate) {
          profileWithUserInfo.birthDate = currentUser.signupInfo.birthDate;
        }
        if (currentUser.signupInfo?.sex && !profileWithUserInfo.sex) {
          profileWithUserInfo.sex = currentUser.signupInfo.sex;
        }
        if (currentTeam?.name && !profileWithUserInfo.teamName) {
          profileWithUserInfo.teamName = currentTeam.name;
        }
        setProfileData(profileWithUserInfo);
      } else {
        setProfileData(null);
      }
      setIsLoading(false);
      return;
    }

    if (currentUser.userRole === UserRole.STAFF || currentUser.userRole === UserRole.MANAGER) {
      const userProfile = getStaffMemberForUser(currentUser, staff);
      if (userProfile) {
        const profileWithUserInfo = structuredClone(userProfile);
        if (currentUser.firstName && !profileWithUserInfo.firstName) {
          profileWithUserInfo.firstName = currentUser.firstName;
        }
        if (currentUser.lastName && !profileWithUserInfo.lastName) {
          profileWithUserInfo.lastName = currentUser.lastName;
        }
        setProfileData(profileWithUserInfo);
      } else {
        setProfileData(null);
      }
    } else {
      setProfileData(null);
    }

    setIsLoading(false);
  }, [resolvedRider, staff, currentUser, currentTeam, isCoureur]);

  // Fonction pour gérer la mise à jour des préférences de course
  const handleUpdateRiderPreference = (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => {
    const existingSelection = riderEventSelections.find(sel => sel.eventId === eventId && sel.riderId === riderId);
    
    if (existingSelection) {
      setRiderEventSelections(prev => prev.map(sel => 
        sel.eventId === eventId && sel.riderId === riderId
          ? { ...sel, riderPreference: preference, riderObjectives: objectives || sel.riderObjectives }
          : sel
      ));
    } else {
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

  // Fonctions pour gérer l'édition du profil
  const handleEdit = () => {
    if (profileData) {
      setEditedData(profileData as Rider);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (profileData && editedData) {
      try {
        const updatedRider = { ...profileData, ...editedData } as Rider;
        await onSaveRider(updatedRider);
        setProfileData(updatedRider);
        setIsEditing(false);
        setEditedData({});
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleInputChange = (field: keyof Rider, value: string | number) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <SectionWrapper title="Mon Profil"><p>Chargement...</p></SectionWrapper>;
  }

  // Staff uniquement (fiche staff), ou manager présent dans l’effectif staff
  const staffMember = getStaffMemberForUser(currentUser, staff);
  const isStaffAccount =
    currentUser.userRole === UserRole.STAFF ||
    (currentUser.userRole === UserRole.MANAGER && Boolean(staffMember));

  if (isStaffAccount && !isCoureur) {
    if (!onSaveStaff) {
      return (
        <SectionWrapper title="Mon Profil">
          <p className="text-sm text-slate-400">Sauvegarde staff indisponible.</p>
        </SectionWrapper>
      );
    }
    return (
      <StaffMyProfileWorkspace
        staff={staff}
        currentUser={currentUser}
        onSaveStaff={onSaveStaff}
        title="Mon Profil"
      />
    );
  }

  if (!profileData) {
    return (
      <SectionWrapper title="Mon Profil">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-8 text-center">
            <XCircleIcon className="w-12 h-12 mx-auto text-rose-400" />
            <p className="mt-4 text-lg font-medium text-white">Profil non trouvé</p>
            <p className="mt-2 text-slate-400">
              Impossible de charger votre profil. Vérifiez que votre compte est bien lié à une fiche athlète (même email ou même nom), ou contactez le support.
            </p>
        </div>
      </SectionWrapper>
    );
  }

  // Si c'est un coureur, afficher les informations de base du profil
  if (isCoureur) {
    return (
      <SectionWrapper title="Mon Profil">
        <div className="space-y-6">
          {/* Header avec informations du coureur */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg text-white">
            <div className="flex items-center space-x-4">
              {profileData.photoUrl ? (
                <img src={profileData.photoUrl} alt={`${profileData.firstName} ${profileData.lastName}`} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(profileData as Rider).firstName?.[0] || 'C'}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{profileData.firstName} {profileData.lastName}</h2>
                <p className="text-blue-100">{(profileData as Rider).teamName || 'Équipe Inconnue'}</p>
                <p className="text-sm text-blue-200">Informations générales</p>
              </div>
            </div>
          </div>

          {/* Informations du profil */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>
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
            
            {/* Informations de base */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Informations de base</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prénom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.firstName || ''}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.lastName || ''}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.lastName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{profileData.email}</p>
                  <p className="text-xs text-gray-500">L'email ne peut pas être modifié</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.phone || 'Non défini'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedData.birthDate || ''}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.birthDate || 'Non définie'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sexe</label>
                  {isEditing ? (
                    <select
                      value={editedData.sex || ''}
                      onChange={(e) => handleInputChange('sex', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.sex || 'Non défini'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nationalité</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.nationality || ''}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.nationality || 'Non définie'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle</label>
                  <p className="mt-1 text-sm text-gray-900">{currentUser.userRole}</p>
                </div>
              </div>
            </div>

            {/* Informations d'équipe */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Informations d'équipe</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Équipe actuelle</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.teamName || ''}
                      onChange={(e) => handleInputChange('teamName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{(profileData as Rider).teamName || 'Non définie'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Équipe suivante</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.nextSeasonTeam || ''}
                      onChange={(e) => handleInputChange('nextSeasonTeam', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{(profileData as Rider).nextSeasonTeam || 'Non définie'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID UCI</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.uciId || ''}
                      onChange={(e) => handleInputChange('uciId', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.uciId || 'Non défini'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Numéro de licence</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.licenseNumber || ''}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.licenseNumber || 'Non défini'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Informations physiques */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Informations physiques</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Taille (cm)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedData.heightCm || ''}
                      onChange={(e) => handleInputChange('heightCm', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.heightCm || 'Non définie'} cm</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Poids (kg)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedData.weightKg || ''}
                      onChange={(e) => handleInputChange('weightKg', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.weightKg || 'Non défini'} kg</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact d'urgence */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Contact d'urgence</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom du contact</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.emergencyContactName || ''}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.emergencyContactName || 'Non défini'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Téléphone du contact</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedData.emergencyContactPhone || ''}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profileData.emergencyContactPhone || 'Non défini'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Informations contractuelles */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('contractDetailsTitle')}</h4>
              {profileData && 'qualitativeProfile' in profileData ? (
                <RiderContractSummary rider={profileData as Rider} />
              ) : (
                <p className="text-sm text-gray-500">{t('contractNoData')}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">{t('contractReadOnlyHint')}</p>
            </div>

            {/* Objectifs de saison */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Objectifs de saison</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Objectifs généraux</label>
                {isEditing ? (
                  <textarea
                    value={editedData.seasonObjectives || ''}
                    onChange={(e) => handleInputChange('seasonObjectives', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez vos objectifs pour cette saison..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{profileData.seasonObjectives || 'Non définis'}</p>
                )}
              </div>
            </div>

            {/* Souhaits généraux */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Souhaits généraux</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Souhaits et préférences</label>
                {isEditing ? (
                  <textarea
                    value={editedData.globalWishes || ''}
                    onChange={(e) => handleInputChange('globalWishes', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez vos souhaits et préférences..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{profileData.globalWishes || 'Non définis'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Mon Profil">
      <div className="text-center p-8 bg-gray-50 rounded-lg border">
        <XCircleIcon className="w-12 h-12 mx-auto text-red-400" />
        <p className="mt-4 text-lg font-medium text-gray-700">Profil non trouvé</p>
        <p className="mt-2 text-gray-500">Impossible de charger votre profil.</p>
      </div>
    </SectionWrapper>
  );
};

export default MyProfileSection;

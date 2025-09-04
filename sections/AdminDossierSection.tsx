import React, { useState, useEffect } from 'react';
import { Rider, User, UserRole, StaffMember } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import AdminTab from '../components/riderDetailTabs/AdminTab';
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
}

const AdminDossierSection: React.FC<AdminDossierSectionProps> = ({ riders, staff, currentUser, setRiders, onSaveRider, setStaff, onUpdateUser }) => {
  const [profileData, setProfileData] = useState<Rider | StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        
        // Pour les coureurs, synchroniser aussi la date de naissance et le genre depuis le profil utilisateur
        if (currentUser.userRole === UserRole.COUREUR) {
            const riderProfile = profileWithUserInfo as Rider;
            if (currentUser.signupInfo?.birthDate && !riderProfile.birthDate) {
                riderProfile.birthDate = currentUser.signupInfo.birthDate;
            }
            if (currentUser.signupInfo?.sex && !riderProfile.sex) {
                riderProfile.sex = currentUser.signupInfo.sex;
            }
        }
        
        setProfileData(profileWithUserInfo);
    }

    setIsLoading(false);
  }, [riders, staff, currentUser]);

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
    <SectionWrapper title={t('titleMyAdminFile')} actionButton={<ActionButton onClick={handleSave}>Sauvegarder</ActionButton>}>
      <div className="bg-slate-800 text-white p-4 rounded-lg shadow-md">
        <AdminTab
          formData={profileData}
          handleInputChange={handleInputChange}
          formFieldsEnabled={true}
          handleLicenseUpdate={handleLicenseUpdate}
          isContractEditable={false}
        />
      </div>
    </SectionWrapper>
  );
};

export default AdminDossierSection;
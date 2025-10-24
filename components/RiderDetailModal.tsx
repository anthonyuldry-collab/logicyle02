import React, { useState, useMemo, useEffect } from 'react';
import { 
    Rider, RaceEvent, RiderEventSelection, PerformanceEntry, PowerProfile, FavoriteRace, 
    PerformanceFactorDetail, RiderRating, AllergyItem, BikeSetup, BikeSpecificMeasurements, 
    BikeFitMeasurements, RiderQualitativeProfile, Address, PerformanceNutrition, 
    SelectedProduct, TeamProduct, ClothingItem, AppState,
    RiderEventStatus, FormeStatus, MoralStatus, HealthCondition,
    DisciplinePracticed, DisciplinePracticed as DisciplinePracticedEnum,
    ClothingType, ClothingType as ClothingTypeEnum,
    AllergySeverity as AllergySeverityEnum,
    PredefinedAllergen, PredefinedAllergen as PredefinedAllergenEnum,
    ResultItem, User, AppSection, PermissionLevel, RiderEventPreference,
    Sex
} from '../types';
import { PERFORMANCE_PROJECT_FACTORS_CONFIG, defaultRiderCharCap } from '../constants';
import Modal from './Modal';
import ActionButton from './ActionButton';

// Import new tab components
import ProfileInfoTab from './riderDetailTabs/ProfileInfoTab';
import PowerPPRTab from './riderDetailTabs/PowerPPRTab';
import NutritionTab from './riderDetailTabs/NutritionTab';
import EquipmentTab from './riderDetailTabs/EquipmentTab';
import BikeSetupTab from './riderDetailTabs/BikeSetupTab';
import PerformanceProjectTab from './riderDetailTabs/PerformanceProjectTab';
import InterviewTab from './riderDetailTabs/InterviewTab';
import AdminTab from './riderDetailTabs/AdminTab';
import { ResultsTab } from './riderDetailTabs/ResultsTab';
import CalendarTab from './riderDetailTabs/CalendarTab';
import SettingsTab from './riderDetailTabs/SettingsTab';
import RiderDashboardTab from './riderDetailTabs/RiderDashboardTab';
import { calculateRiderCharacteristics } from '../utils/performanceCalculations';
import { uploadFile } from '../services/firebaseService';
import { getAgeCategory } from '../utils/ageUtils';


interface RiderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider?: Rider | null; 
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  performanceEntries: PerformanceEntry[];
  powerDurationsConfig: { key: keyof PowerProfile; label: string; unit: string; sortable: boolean; }[];
  calculateWkg: (power?: number, weight?: number) => string;
  isEditMode?: boolean;
  onSaveRider?: (riderData: Rider) => void;
  initialFormData?: Omit<Rider, 'id'> | Rider; 
  appState: AppState;
  currentUser?: User | null;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  initialTab?: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const getInitialPerformanceFactorDetail = (factorId: keyof Pick<Rider, 'physiquePerformanceProject' | 'techniquePerformanceProject' | 'mentalPerformanceProject' | 'environnementPerformanceProject' | 'tactiquePerformanceProject'>): PerformanceFactorDetail => {
    return {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    };
};

const createNewRiderState = (): Omit<Rider, 'id'> => {
    // Générer des données de référence automatiques basées sur un poids moyen
    const defaultWeight = 70; // kg
    const defaultSex = 'M'; // Masculin par défaut
    
    // Référence pour un coureur "Modéré" selon les tables de référence
    const referenceValues = {
        power1s: 21.1 * defaultWeight, // 21.1 W/kg * 70kg = 1477W
        power5s: 14.4 * defaultWeight, // 14.4 W/kg * 70kg = 1008W
        power30s: 8.4 * defaultWeight,  // 8.4 W/kg * 70kg = 588W
        power1min: 6.2 * defaultWeight, // 6.2 W/kg * 70kg = 434W
        power3min: 5.0 * defaultWeight, // 5.0 W/kg * 70kg = 350W
        power5min: 4.7 * defaultWeight, // 4.7 W/kg * 70kg = 329W
        power12min: 4.0 * defaultWeight, // 4.0 W/kg * 70kg = 280W
        power20min: 3.8 * defaultWeight, // 3.8 W/kg * 70kg = 266W
        criticalPower: 3.8 * defaultWeight, // CP = 20min power
    };

    return {
    firstName: '',
    lastName: '',
    charSprint: 0,
    charAnaerobic: 0,
    charPuncher: 0,
    charClimbing: 0,
    charRouleur: 0,
    generalPerformanceScore: 0,
    fatigueResistanceScore: 0,
    categories: [],
    photoUrl: undefined,
    nationality: undefined,
    teamName: undefined,
    qualitativeProfile: RiderQualitativeProfile.AUTRE,
    disciplines: [],
    forme: FormeStatus.INCONNU,
    moral: MoralStatus.INCONNU,
    healthCondition: HealthCondition.INCONNU,
    favoriteRaces: [],
    resultsHistory: [],
    address: {},
    healthInsurance: {},
    agency: {},
    performanceGoals: '',
    physiquePerformanceProject: getInitialPerformanceFactorDetail('physiquePerformanceProject'),
    techniquePerformanceProject: getInitialPerformanceFactorDetail('techniquePerformanceProject'),
    mentalPerformanceProject: getInitialPerformanceFactorDetail('mentalPerformanceProject'),
    environnementPerformanceProject: getInitialPerformanceFactorDetail('environnementPerformanceProject'),
    tactiquePerformanceProject: getInitialPerformanceFactorDetail('tactiquePerformanceProject'),
    allergies: [],
    performanceNutrition: { selectedGels: [], selectedBars: [], selectedDrinks: [] },
    roadBikeSetup: { specifics: {}, cotes: {} },
    ttBikeSetup: { specifics: {}, cotes: {} },
    clothing: [],
    powerProfileFresh: referenceValues,
    powerProfile15KJ: {
        power1s: Math.round(referenceValues.power1s * 0.95), // 5% de baisse
        power5s: Math.round(referenceValues.power5s * 0.95),
        power30s: Math.round(referenceValues.power30s * 0.95),
        power1min: Math.round(referenceValues.power1min * 0.95),
        power3min: Math.round(referenceValues.power3min * 0.95),
        power5min: Math.round(referenceValues.power5min * 0.95),
        power12min: Math.round(referenceValues.power12min * 0.95),
        power20min: Math.round(referenceValues.power20min * 0.95),
        criticalPower: Math.round(referenceValues.criticalPower * 0.95),
    },
    powerProfile30KJ: {
        power1s: Math.round(referenceValues.power1s * 0.90), // 10% de baisse
        power5s: Math.round(referenceValues.power5s * 0.90),
        power30s: Math.round(referenceValues.power30s * 0.90),
        power1min: Math.round(referenceValues.power1min * 0.90),
        power3min: Math.round(referenceValues.power3min * 0.90),
        power5min: Math.round(referenceValues.power5min * 0.90),
        power12min: Math.round(referenceValues.power12min * 0.90),
        power20min: Math.round(referenceValues.power20min * 0.90),
        criticalPower: Math.round(referenceValues.criticalPower * 0.90),
    },
    powerProfile45KJ: {
        power1s: Math.round(referenceValues.power1s * 0.85), // 15% de baisse
        power5s: Math.round(referenceValues.power5s * 0.85),
        power30s: Math.round(referenceValues.power30s * 0.85),
        power1min: Math.round(referenceValues.power1min * 0.85),
        power3min: Math.round(referenceValues.power3min * 0.85),
        power5min: Math.round(referenceValues.power5min * 0.85),
        power12min: Math.round(referenceValues.power12min * 0.85),
        power20min: Math.round(referenceValues.power20min * 0.85),
        criticalPower: Math.round(referenceValues.criticalPower * 0.85),
    },
    profilePRR: 'Profil de référence généré automatiquement',
    profile15KJ: 'Profil 15kJ généré automatiquement',
    profile30KJ: 'Profil 30kJ généré automatiquement',
    profile45KJ: 'Profil 45kJ généré automatiquement',
    
    // Global Preferences
    globalWishes: '',
    seasonObjectives: '',
    
    // Interview & Motivation
    cyclingMotivation: '',
    shortTermGoals: '',
    mediumTermGoals: '',
    longTermGoals: '',
    careerAspirations: '',
    personalValues: '',
    challengesFaced: '',
    supportNeeds: '',
};
};

export const RiderDetailModal: React.FC<RiderDetailModalProps> = ({
  isOpen,
  onClose,
  rider,
  isEditMode: initialIsEditMode = false,
  onSaveRider,
  appState,
  raceEvents,
  riderEventSelections,
  performanceEntries,
  powerDurationsConfig,
  currentUser,
  effectivePermissions,
  initialTab = 'info',
}: RiderDetailModalProps) => {
  const isNew = !rider;
  const [formData, setFormData] = useState<Rider | Omit<Rider, 'id'>>(() =>
    isNew ? createNewRiderState() : structuredClone(rider)
  );
  const [activeTab, setActiveTab] = useState(initialTab);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newLicenseData, setNewLicenseData] = useState<{base64: string, mimeType: string} | null>(null);
  const [newPhotoData, setNewPhotoData] = useState<{base64: string, mimeType: string} | null>(null);

  const [isEditMode, setIsEditMode] = useState(isNew || initialIsEditMode);
  const [profileReliabilityLevel, setProfileReliabilityLevel] = useState(1);

  // Fonction pour mettre à jour les préférences des coureurs
  const onUpdateRiderPreference = (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => {
    // Cette fonction sera implémentée dans le composant parent (RosterSection)
    // Pour l'instant, on ne fait rien car les permissions sont gérées côté parent
    console.log('onUpdateRiderPreference appelé:', { eventId, riderId, preference, objectives });
  };

  useEffect(() => {
    if (isOpen) {
      let initialData = isNew ? createNewRiderState() : structuredClone(rider);
      
      setFormData(initialData);
      setPhotoPreview((initialData as Rider).photoUrl || null);
      setNewLicenseData(null);
      setNewPhotoData(null);
      setActiveTab(initialTab);
      setIsEditMode(isNew || initialIsEditMode);
    }
  }, [isOpen, rider, isNew, initialIsEditMode]);

  // Réinitialiser l'onglet actif si on passe d'un profil utilisateur à un autre
  useEffect(() => {
    const isCurrentUserProfile = currentUser && formData && currentUser.id === (formData as Rider).id;
    if (activeTab === 'settings' && !isCurrentUserProfile) {
      setActiveTab('info');
    }
  }, [currentUser, formData, activeTab]);

  useEffect(() => {
    const { powerProfileFresh, powerProfile15KJ, powerProfile30KJ, powerProfile45KJ } = formData as Rider;
    const hasData = (profile?: PowerProfile) => profile && Object.keys(profile).length > 0 && Object.values(profile).some(v => v !== undefined && v !== null && v > 0);
    
    let level = 1;
    if (hasData(powerProfile45KJ)) level = 4;
    else if (hasData(powerProfile30KJ)) level = 3;
    else if (hasData(powerProfile15KJ)) level = 2;
    setProfileReliabilityLevel(level);

    const updatedCharacteristics = calculateRiderCharacteristics(formData as Rider);
    
    const currentChars = formData as Rider;
    const charKeys = Object.keys(updatedCharacteristics) as Array<keyof typeof updatedCharacteristics>;

    const hasChanged = charKeys.some(charKey => {
        const updatedValue = updatedCharacteristics[charKey];
        const currentValue = currentChars[charKey];
        return Math.round(updatedValue || 0) !== Math.round(Number(currentValue) || 0);
    });

    if (hasChanged) {
              setFormData((prev: Rider | Omit<Rider, 'id'>) => ({ 
            ...prev, 
            ...updatedCharacteristics
        }));
    }

  }, [formData]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Log pour les changements PPR
    if (name.includes('powerProfile') || name === 'weightKg') {
      console.log('🔧 DEBUG - Changement PPR détecté:', { name, value, type });
    }

    setFormData((prev: Rider | Omit<Rider, 'id'>) => {
        if (!prev) return prev;
        
        const newFormData = structuredClone(prev); // Use structuredClone for safe deep copy
        const keys = name.split('.');
        
        let currentLevel: any = newFormData;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!currentLevel[key]) currentLevel[key] = {};
            currentLevel = currentLevel[key];
        }

        const lastKey = keys[keys.length - 1];
        let processedValue: any = value;
        if (type === 'checkbox') {
            processedValue = checked;
        } else if (type === 'number') {
            processedValue = value === '' ? undefined : parseFloat(value);
        }

        // Special handling for array properties like disciplines, categories
        if (type === 'checkbox' && (name === 'disciplines' || name === 'categories')) {
            const list = (newFormData as any)[name] as string[] || [];
            if (checked) {
                if (!list.includes(value)) {
                    (newFormData as any)[name] = [...list, value];
                }
            } else {
                (newFormData as any)[name] = list.filter(item => item !== value);
            }
        } else {
            currentLevel[lastKey] = processedValue;
        }

        // Gestion automatique des catégories d'âge lors du changement de date de naissance
        if (name === 'birthDate' && value) {
            const { category } = getAgeCategory(value);
            if (category && category !== 'N/A') {
                // S'assurer que categories est un tableau
                if (!newFormData.categories) {
                    newFormData.categories = [];
                }
                
                // Retirer l'ancienne catégorie d'âge si elle existe
                const ageCategories = ['U15', 'U17', 'U19', 'U23', 'Senior'];
                newFormData.categories = newFormData.categories.filter(cat => !ageCategories.includes(cat));
                
                // Ajouter la nouvelle catégorie d'âge
                newFormData.categories.push(category);
                
                console.log(`✅ Catégorie d'âge mise à jour automatiquement: ${category}`);
            }
        }

        // Log pour les changements PPR après mise à jour
        if (name.includes('powerProfile') || name === 'weightKg') {
          console.log('🔧 DEBUG - formData mis à jour avec PPR:', {
            powerProfileFresh: newFormData.powerProfileFresh,
            powerProfile15KJ: newFormData.powerProfile15KJ,
            powerProfile30KJ: newFormData.powerProfile30KJ,
            powerProfile45KJ: newFormData.powerProfile45KJ,
            weightKg: newFormData.weightKg
          });
        }

        return newFormData;
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
        setNewPhotoData({ base64: result, mimeType });
        setPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev: Rider | Omit<Rider, 'id'>) => {
        if (!prev) return prev;
        const updated = structuredClone(prev);
        updated.photoUrl = undefined;
        return updated;
    });
    setNewPhotoData(null);
    setPhotoPreview(null);
  };

  const handleGlobalPreferencesUpdate = (riderId: string, globalWishes: string, seasonObjectives: string) => {
    setFormData(prev => ({
      ...prev,
      globalWishes,
      seasonObjectives
    }));
  };
  
  const handleSave = async () => {
    console.log('🔧 DEBUG - handleSave appelé dans RiderDetailModal');
    console.log('🔧 DEBUG - formData:', formData);
    console.log('🔧 DEBUG - onSaveRider existe:', !!onSaveRider);
    console.log('🔧 DEBUG - Données PPR dans formData:', {
      powerProfileFresh: formData.powerProfileFresh,
      powerProfile15KJ: formData.powerProfile15KJ,
      powerProfile30KJ: formData.powerProfile30KJ,
      powerProfile45KJ: formData.powerProfile45KJ,
      weightKg: formData.weightKg
    });
    
    if (!onSaveRider) {
      console.warn('⚠️ onSaveRider n\'est pas défini - sauvegarde impossible');
      alert('⚠️ Fonction de sauvegarde non disponible. Veuillez contacter l\'administrateur.');
      return;
    }
    
    let dataToSave: Rider = {
        ...(formData as Omit<Rider, 'id'>),
        id: (formData as Rider).id || `rider_${generateId()}`
    };
    
    // Ajouter automatiquement la catégorie d'âge calculée
    if (dataToSave.birthDate) {
        const { category } = getAgeCategory(dataToSave.birthDate);
        if (category && category !== 'N/A') {
            // S'assurer que categories est un tableau
            if (!dataToSave.categories) {
                dataToSave.categories = [];
            }
            
            // Retirer l'ancienne catégorie d'âge si elle existe
            const ageCategories = ['U15', 'U17', 'U19', 'U23', 'Senior'];
            dataToSave.categories = dataToSave.categories.filter(cat => !ageCategories.includes(cat));
            
            // Ajouter la nouvelle catégorie d'âge
            dataToSave.categories.push(category);
            
            console.log(`✅ Catégorie d'âge automatiquement ajoutée: ${category}`);
        }
    }
    
    console.log('dataToSave avant uploads:', dataToSave);

    if (newPhotoData && appState.activeTeamId) {
        console.log('Upload de la photo...');
        const path = `teams/${appState.activeTeamId}/riders/${dataToSave.id}/photo`;
        const url = await uploadFile(newPhotoData.base64, path, newPhotoData.mimeType);
        dataToSave.photoUrl = url;
        console.log('Photo uploadée:', url);
    }

    if (newLicenseData && appState.activeTeamId) {
        console.log('Upload de la licence...');
        const path = `teams/${appState.activeTeamId}/riders/${dataToSave.id}/license`;
        const url = await uploadFile(newLicenseData.base64, path, newLicenseData.mimeType);
        dataToSave.licenseImageUrl = url;
        dataToSave.licenseImageBase64 = undefined;
        dataToSave.licenseImageMimeType = undefined;
        console.log('Licence uploadée:', url);
    }
    
    console.log('Appel de onSaveRider avec:', dataToSave);
    onSaveRider(dataToSave);
  };
  
  const setFormDataForChild = (updater: React.SetStateAction<Rider | Omit<Rider, 'id'>>) => {
      setFormData(updater);
  };
  
  const handleLicenseUpdate = (base64?: string, mimeType?: string) => {
    if (base64 && mimeType) {
        setNewLicenseData({ base64, mimeType });
        setFormData((prev: Rider | Omit<Rider, 'id'>) => {
            if (!prev) return prev;
            const updated = structuredClone(prev);
            updated.licenseImageBase64 = base64.split(',')[1];
            updated.licenseImageMimeType = mimeType;
            updated.licenseImageUrl = undefined;
            return updated;
        });
    } else {
        setNewLicenseData(null);
        setFormData((prev: Rider | Omit<Rider, 'id'>) => {
            if (!prev) return prev;
            const updated = structuredClone(prev);
            updated.licenseImageUrl = undefined;
            updated.licenseImageBase64 = undefined;
            updated.licenseImageMimeType = undefined;
            return updated;
        });
    }
  };
  
  // Vérifier si c'est le profil de l'utilisateur connecté
  const isCurrentUserProfile = currentUser && formData && currentUser.id === (formData as Rider).id;
  
  // Debug logs
  console.log('🔍 DEBUG Settings Tab:', {
    currentUserId: currentUser?.id,
    riderId: (formData as Rider)?.id,
    isCurrentUserProfile,
    currentUserRole: currentUser?.userRole,
    currentUserEmail: currentUser?.email,
    riderEmail: (formData as Rider)?.email
  });
  
  // TEMPORAIRE : Toujours afficher l'onglet paramètres pour debug
  const shouldShowSettings = true; // isCurrentUserProfile;
  
  const tabs = [
    { id: 'dashboard', label: 'Tableau de Bord' },
    { id: 'info', label: 'Profil' },
    { id: 'ppr', label: 'PPR' },
    { id: 'project', label: 'Projet Perf.' },
    { id: 'interview', label: 'Entretiens' },
    { id: 'results', label: 'Palmarès' },
    { id: 'calendar', label: 'Calendrier' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'equipment', label: 'Équipement' },
    { id: 'bikeSetup', label: 'Cotes Vélo' },
    { id: 'admin', label: 'Admin' },
    // Afficher l'onglet paramètres (temporairement toujours visible pour debug)
    ...(shouldShowSettings ? [{ id: 'settings', label: 'Paramètres' }] : []),
  ];

  // Debug: Afficher les onglets dans la console
  console.log('🔍 DEBUG - Onglets disponibles:', tabs.map(t => t.label));

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <RiderDashboardTab
            formData={formData}
            raceEvents={raceEvents}
            riderEventSelections={riderEventSelections}
            onUpdateRiderPreference={onUpdateRiderPreference}
            onUpdateGlobalPreferences={handleGlobalPreferencesUpdate}
            currentUser={currentUser}
            effectivePermissions={effectivePermissions}
            teamProducts={appState.teamProducts || []}
          />
        );
      case 'info':
        return (
          <ProfileInfoTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
            photoPreview={photoPreview}
            handlePhotoUpload={handlePhotoUpload}
            handleRemovePhoto={handleRemovePhoto}
            profileReliabilityLevel={profileReliabilityLevel}
          />
        );
      case 'ppr':
        return (
          <PowerPPRTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
            powerDurationsConfig={powerDurationsConfig}
            profileReliabilityLevel={profileReliabilityLevel}
          />
        );
      case 'project':
        return (
          <PerformanceProjectTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
          />
        );
      case 'interview':
        return (
          <InterviewTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
          />
        );
      case 'results':
        return (
          <ResultsTab
            formData={formData}
            setFormData={setFormData}
            formFieldsEnabled={isEditMode}
          />
        );
      case 'calendar':
        return (
          <CalendarTab
            formData={formData}
            raceEvents={raceEvents}
            riderEventSelections={riderEventSelections}
            onUpdateRiderPreference={onUpdateRiderPreference}
            onUpdateGlobalPreferences={handleGlobalPreferencesUpdate}
            currentUser={currentUser}
            effectivePermissions={effectivePermissions}
          />
        );
      case 'nutrition':
        return (
          <NutritionTab
            formData={formData}
            setFormData={setFormData}
            formFieldsEnabled={isEditMode}
            teamProducts={appState.teamProducts || []}
          />
        );
      case 'equipment':
        return (
          <EquipmentTab
            formData={formData}
            setFormData={setFormData}
            formFieldsEnabled={isEditMode}
          />
        );
      case 'bikeSetup':
        return (
          <BikeSetupTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
          />
        );
      case 'admin':
        return (
          <AdminTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
            handleLicenseUpdate={handleLicenseUpdate}
            isContractEditable={true}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
          />
        );
      default:
        return (
          <ProfileInfoTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled={isEditMode}
            photoPreview={photoPreview}
            handlePhotoUpload={handlePhotoUpload}
            handleRemovePhoto={handleRemovePhoto}
            profileReliabilityLevel={profileReliabilityLevel}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Nouveau Coureur" : `${formData.firstName} ${formData.lastName}`}>
      <div className="bg-slate-800 text-white -m-6 p-4 rounded-lg">
        {/* Barre de fiabilité du profil supprimée - seules les étoiles sous la photo restent */}
        
        <div className="flex justify-between items-center mb-4">
            <nav className="flex space-x-1 border-b border-slate-600 w-full overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-t-md whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
            {onSaveRider && (
                <div className="flex-shrink-0 ml-4">
                    {!isEditMode ? (
                        <ActionButton onClick={() => setIsEditMode(true)}>Modifier</ActionButton>
                    ) : (
                        <div className="flex space-x-2">
                           <ActionButton variant="secondary" onClick={() => {
                                if (!isNew) {
                                    setIsEditMode(false);
                                    setFormData(structuredClone(rider)); // Reset changes
                                } else {
                                    onClose();
                                }
                           }}>
                               Annuler
                           </ActionButton>
                           <ActionButton onClick={handleSave}>Sauvegarder</ActionButton>
                        </div>
                    )}
                </div>
            )}
        </div>
        <div className="max-h-[calc(85vh - 120px)] overflow-y-auto p-1 pr-3">
          {renderActiveTab()}
        </div>
      </div>
    </Modal>
  );
};
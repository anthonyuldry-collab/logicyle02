import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  DEFAULT_THEME_ACCENT_COLOR,
  DEFAULT_THEME_PRIMARY_COLOR,
  getInitialGlobalState,
  getInitialTeamState,
} from "./constants";
import {
  AppSection,
  AppState,
  ChecklistTemplate,
  ChecklistRole,
  EquipmentItem,
  IncomeItem,
  PerformanceEntry,
  EventTransportLeg,
  EventAccommodation,
  EventRaceDocument,
  EventRadioEquipment,
  EventRadioAssignment,
  EventBudgetItem,
  EventChecklistItem,
  PeerRating,
  RaceEvent,
  Rider,
  RiderEventSelection,
  ScoutingProfile,
  StaffMember,
  StaffRole,
  StaffStatus,
  StaffEventSelection,
  MeetingReport,
  StockItem,
  TeamProduct,
  TeamLevel,
  TeamMembershipStatus,
  TeamRole,
  TeamState,
  User,
  UserRole,
  Vehicle,
  // Enums pour les coureurs
  DisciplinePracticed,
  FormeStatus,
  MoralStatus,
  HealthCondition,
  BikeType,
  // Types pour l'historique PPR
  PowerProfileHistoryEntry,
  PowerProfileHistory,
  PowerProfile,
} from "./types";

// Firebase imports
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import * as firebaseService from "./services/firebaseService";


import Sidebar from "./components/Sidebar";
import { LanguageProvider } from "./contexts/LanguageContext";
import EventDetailView from "./EventDetailView";
import { useTranslations } from "./hooks/useTranslations";
import AdminDossierSection from "./sections/AdminDossierSection";
import AdminDashboardSection from "./sections/AdminDashboardSection";
import SuperAdminSection from "./sections/SuperAdminSection";
import { AutomatedPerformanceProfileSection } from "./sections/AutomatedPerformanceProfileSection";
import CareerSection from "./sections/CareerSection";
import ChecklistSection from "./sections/ChecklistSection";
import EquipmentSection from "./sections/EquipmentSection";
import { EventsSection } from "./sections/EventsSection";
import { FinancialSection } from "./sections/FinancialSection";
import LoginView from "./sections/LoginView";
import MissionSearchSection from "./sections/MissionSearchSection";
import MyPerformanceSectionNew from "./sections/MyPerformanceSection_new";
import MyTripsSection from "./sections/MyTripsSection";
import NoTeamView from "./sections/NoTeamView";
import NutritionSection from "./sections/NutritionSection";
import PendingApprovalView from "./sections/PendingApprovalView";
import { PerformanceProjectSection } from "./sections/PerformanceProjectSection";
import PerformanceSection from "./sections/PerformanceSection";
import PerformancePoleSection from "./sections/PerformancePoleSection";
import PermissionsSection from "./sections/PermissionsSection";
import RiderEquipmentSection from "./sections/RiderEquipmentSection";
import RosterSection from "./sections/RosterSection";
import SeasonPlanningSection from "./sections/SeasonPlanningSection";
import ScoutingSection from "./sections/ScoutingSection";
import SettingsSection from "./sections/SettingsSection";
import SignupView, { SignupData } from "./sections/SignupView";
import StaffSection from "./sections/StaffSection";
import StocksSection from "./sections/StocksSection";
import UserManagementSection from "./sections/UserManagementSection";
import UserSettingsSection from "./sections/UserSettingsSection";
import VehiclesSection from "./sections/VehiclesSection";

// Nouvelles sections pour le back-office coureur
import MyDashboardSection from "./sections/MyDashboardSection";
import MyProfileSection from "./sections/MyProfileSection";
import MyCalendarSection from "./sections/MyCalendarSection";
import MyResultsSection from "./sections/MyResultsSection";
import BikeSetupSection from "./sections/BikeSetupSection";
import MyCareerSection from "./sections/MyCareerSection";
import MyAdminSection from "./sections/MyAdminSection";
import TalentAvailabilitySection from "./sections/TalentAvailabilitySection";
import SeasonTransitionManager from "./components/SeasonTransitionManager";

// Helper functions for dynamic theming
function getContrastYIQ(hexcolor: string): string {
  if (!hexcolor) return "#FFFFFF";
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) {
    hexcolor = hexcolor
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hexcolor.length !== 6) return "#FFFFFF";

  const r = parseInt(hexcolor.substring(0, 2), 16);
  const g = parseInt(hexcolor.substring(2, 4), 16);
  const b = parseInt(hexcolor.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

// Helper function for generating unique IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Fonction de sécurité pour StaffRole et StaffStatus
function getSafeStaffRole(role: string): string {
  try {
    // Vérifier si StaffRole est disponible
    if (typeof StaffRole !== 'undefined' && StaffRole.AUTRE) {
      return StaffRole.AUTRE;
    }
  } catch (error) {
    // StaffRole non disponible
  }
  return "Autre";
}

function getSafeStaffStatus(status: string): string {
  try {
    // Vérifier si StaffStatus est disponible
    if (typeof StaffStatus !== 'undefined' && StaffStatus.VACATAIRE) {
      return StaffStatus.VACATAIRE;
    }
  } catch (error) {
    // StaffStatus non disponible
  }
  return "Vacataire";
}

// Fonctions de sécurité pour les enums des coureurs
function getSafeDisciplinePracticed(discipline: string): string {
  try {
    if (typeof DisciplinePracticed !== 'undefined' && DisciplinePracticed.ROUTE) {
      return DisciplinePracticed.ROUTE;
    }
  } catch (error) {
    // DisciplinePracticed non disponible
  }
  return "Route";
}

function getSafeFormeStatus(status: string): string {
  try {
    if (typeof FormeStatus !== 'undefined' && FormeStatus.BON) {
      return FormeStatus.BON;
    }
  } catch (error) {
    // FormeStatus non disponible
  }
  return "Bon";
}

function getSafeMoralStatus(status: string): string {
  try {
    if (typeof MoralStatus !== 'undefined' && MoralStatus.BON) {
      return MoralStatus.BON;
    }
  } catch (error) {
    // MoralStatus non disponible
  }
  return "Bon";
}

function getSafeHealthCondition(condition: string): string {
  try {
    if (typeof HealthCondition !== 'undefined' && HealthCondition.PRET_A_COURIR) {
      return HealthCondition.PRET_A_COURIR;
    }
  } catch (error) {
    // HealthCondition non disponible
  }
  return "Prêt(e) à courir";
}

function getSafeBikeType(type: string): string {
  try {
    if (typeof BikeType !== 'undefined' && BikeType.ROUTE) {
      return BikeType.ROUTE;
    }
  } catch (error) {
    // BikeType non disponible
  }
  return "Route";
}

function lightenDarkenColor(col: string, amt: number): string {
  if (!col) return "#000000";
  col = col.replace("#", "");
  if (col.length === 3) {
    col = col
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (col.length !== 6) return "#000000";

  let num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  let green = ((num >> 8) & 0x00ff) + amt;
  if (green > 255) green = 255;
  else if (green < 0) green = 0;
  let blue = (num & 0x0000ff) + amt;
  if (blue > 255) blue = 255;
  else if (blue < 0) blue = 0;

  const rHex = r.toString(16).padStart(2, "0");
  const gHex = green.toString(16).padStart(2, "0");
  const bHex = blue.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    ...getInitialGlobalState(),
    ...getInitialTeamState(),
    activeEventId: null,
    activeTeamId: null,
  });

  const [currentSection, setCurrentSection] = useState<AppSection>("myDashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<
    "login" | "signup" | "app" | "pending" | "no_team"
  >("login");
  const [pendingSignupData, setPendingSignupData] = useState<SignupData | null>(null); // Nouvel état pour stocker les données d'inscription
  const pendingSignupDataRef = useRef<SignupData | null>(null); // Référence pour éviter les problèmes de closure

  const [language, setLanguageState] = useState<"fr" | "en">("fr");

  const { t } = useTranslations();

  const loadDataForUser = useCallback(async (user: User) => {
    setIsLoading(true);
    try {
      const globalData = await firebaseService.getGlobalData();
      const userMemberships = (globalData.teamMemberships || []).filter(
        (m) => m.userId === user.id
      );
      const activeMembership = userMemberships.find(
        (m) => m.status === TeamMembershipStatus.ACTIVE
      );

      let teamData: Partial<TeamState> = getInitialTeamState();
      let finalActiveTeamId: string | null = null;

      // Vérifier d'abord le membership actif
      if (activeMembership) {
        finalActiveTeamId = activeMembership.teamId;
      } 
      // Si pas de membership mais l'utilisateur a un teamId (cas après création d'équipe)
      else if (user.teamId) {
        finalActiveTeamId = user.teamId;
      }

      if (finalActiveTeamId) {
        teamData = await firebaseService.getTeamData(finalActiveTeamId);
        setView("app");
      } else if (
        userMemberships.some((m) => m.status === TeamMembershipStatus.PENDING)
      ) {
        setView("pending");
      } else {
        setView("no_team");
      }

      setAppState({
        ...getInitialGlobalState(),
        ...getInitialTeamState(),
        ...globalData,
        ...teamData,
        activeEventId: null, // Reset event detail view on user/team change
        activeTeamId: finalActiveTeamId,
      });

      setLanguageState(teamData.language || "fr");
    } catch (error) {
      console.error("Erreur lors du chargement des données utilisateur:", error);
      setView("no_team");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        setIsLoading(true);
        let userProfile = await firebaseService.getUserProfile(
          firebaseUser.uid
        );

        // If profile doesn't exist (e.g., first login after signup), create it. This makes the app more robust.
        if (!userProfile) {
          try {
            // Utiliser les données d'inscription stockées si disponibles (via ref pour éviter les problèmes de closure)
            const signupData = pendingSignupDataRef.current;
            if (signupData) {
              await firebaseService.createUserProfile(
                firebaseUser.uid,
                signupData
              );
              // Nettoyer les données temporaires après utilisation
              setPendingSignupData(null);
              pendingSignupDataRef.current = null;
            } else {
              // Fallback pour les utilisateurs existants sans données d'inscription
              const { email } = firebaseUser;
              const emailPrefix = email?.split("@")[0] || "utilisateur";
              const firstName = emailPrefix;
              const lastName = "";
              const newProfileData: SignupData = {
                email: email || "",
                firstName,
                lastName,
                password: "",
                userRole: UserRole.COUREUR, // Rôle par défaut pour les utilisateurs existants
                birthDate: "1990-01-01", // Date par défaut pour les utilisateurs existants
                sex: undefined, // Genre non défini par défaut
              };
              await firebaseService.createUserProfile(
                firebaseUser.uid,
                newProfileData
              );
            }
            userProfile = await firebaseService.getUserProfile(
              firebaseUser.uid
            ); // Re-fetch the newly created profile
          } catch (profileError: any) {
            console.error("Erreur lors de la création du profil utilisateur:", profileError);
            
            // Nettoyer les données temporaires en cas d'erreur
            setPendingSignupData(null);
            pendingSignupDataRef.current = null;
            
            // Déconnecter l'utilisateur pour éviter un état incohérent
            try {
              await signOut(auth);
            } catch (signOutError) {
              // Erreur de déconnexion silencieuse
            }
            
            // Afficher un message d'erreur plus détaillé selon le type d'erreur
            let errorMessage = "Erreur lors de la création du profil. Veuillez contacter l'administrateur.";
            
            if (profileError?.code === 'permission-denied') {
              errorMessage = "Erreur de permissions Firestore. Les règles de sécurité ne permettent pas la création de votre profil. Veuillez contacter l'administrateur.";
            } else if (profileError?.code === 'unavailable') {
              errorMessage = "Service Firestore indisponible. Vérifiez votre connexion internet et réessayez.";
            } else if (profileError?.code === 'failed-precondition') {
              errorMessage = "Condition préalable non remplie. Veuillez réessayer ou contacter l'administrateur.";
            } else if (profileError?.code === 'already-exists') {
              errorMessage = "Un profil existe déjà pour cet utilisateur. Veuillez vous connecter.";
            } else if (profileError?.message) {
              // Utiliser le message d'erreur amélioré si disponible
              errorMessage = profileError.message.includes("Données d'inscription incomplètes") 
                ? profileError.message
                : `Erreur lors de la création du profil: ${profileError.message}`;
            }
            
            alert(errorMessage);
            setIsLoading(false);
            return; // Sortir de la fonction pour éviter de continuer
          }
        }

        if (userProfile) {
          setCurrentUser(userProfile);
          await loadDataForUser(userProfile); // This will set loading to false
          
          // Redirection automatique vers le tableau de bord administrateur pour les admins
          if (userProfile.permissionRole === TeamRole.ADMIN || userProfile.userRole === UserRole.MANAGER) {
            setCurrentSection("myDashboard"); // myDashboard affichera automatiquement AdminDashboardSection
          }
        } else {
          // This case should ideally not be reached if profile creation is successful.
          signOut(auth); // Log out to prevent inconsistent state
        }
      } else {
        setCurrentUser(null);
        setAppState({
          ...getInitialGlobalState(),
          ...getInitialTeamState(),
          activeEventId: null,
          activeTeamId: null,
        });
        setView("login");
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [loadDataForUser]);

  const primaryColor =
    appState.themePrimaryColor || DEFAULT_THEME_PRIMARY_COLOR;
  const accentColor = appState.themeAccentColor || DEFAULT_THEME_ACCENT_COLOR;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary-bg", primaryColor);
    root.style.setProperty(
      "--theme-primary-hover-bg",
      lightenDarkenColor(primaryColor, 20)
    );
    root.style.setProperty(
      "--theme-primary-text",
      getContrastYIQ(primaryColor)
    );
    root.style.setProperty("--theme-accent-color", accentColor);
    document.body.style.backgroundColor = lightenDarkenColor(primaryColor, -20);
  }, [primaryColor, accentColor]);

  // Fonction utilitaire pour comparer deux profils de puissance
  const hasPowerProfileChanged = (oldProfile?: PowerProfile, newProfile?: PowerProfile): boolean => {
    if (!oldProfile && !newProfile) return false;
    if (!oldProfile || !newProfile) {
      const profileToCheck = newProfile || oldProfile;
      return profileToCheck ? Object.values(profileToCheck).some(val => val != null && val !== 0) : false;
    }
    const keys: (keyof PowerProfile)[] = ['power1s', 'power5s', 'power30s', 'power1min', 'power3min', 'power5min', 'power12min', 'power20min', 'criticalPower', 'power45min'];
    for (const key of keys) {
      const oldVal = oldProfile[key] ?? null;
      const newVal = newProfile[key] ?? null;
      if (oldVal !== newVal) return true;
    }
    return false;
  };

  // Fonction pour obtenir la date de début de saison (1er novembre de l'année en cours ou précédente)
  const getCurrentSeasonStartDate = (): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Si on est après le 1er novembre, la saison a commencé le 1er novembre de l'année en cours
    // Sinon, la saison a commencé le 1er novembre de l'année précédente
    const seasonYear = currentMonth >= 11 ? currentYear : currentYear - 1;
    return `${seasonYear}-11-01T00:00:00.000Z`;
  };

  // Fonction pour comparer deux valeurs de puissance et retourner la meilleure
  const getBetterPowerValue = (val1?: number, val2?: number): number | undefined => {
    if (!val1 && !val2) return undefined;
    if (!val1) return val2;
    if (!val2) return val1;
    return Math.max(val1, val2);
  };

  // Fonction pour mettre à jour un PowerProfile avec les meilleures valeurs
  const updatePowerProfileWithBest = (current?: PowerProfile, newValues?: PowerProfile): PowerProfile | undefined => {
    if (!current && !newValues) return undefined;
    if (!current) return newValues ? { ...newValues } : undefined;
    if (!newValues) return current ? { ...current } : undefined;
    
    return {
      power1s: getBetterPowerValue(current.power1s, newValues.power1s),
      power5s: getBetterPowerValue(current.power5s, newValues.power5s),
      power30s: getBetterPowerValue(current.power30s, newValues.power30s),
      power1min: getBetterPowerValue(current.power1min, newValues.power1min),
      power3min: getBetterPowerValue(current.power3min, newValues.power3min),
      power5min: getBetterPowerValue(current.power5min, newValues.power5min),
      power12min: getBetterPowerValue(current.power12min, newValues.power12min),
      power20min: getBetterPowerValue(current.power20min, newValues.power20min),
      criticalPower: getBetterPowerValue(current.criticalPower, newValues.criticalPower),
      power45min: getBetterPowerValue(current.power45min, newValues.power45min),
    };
  };

  // --- DATA HANDLERS ---
  const onSaveRider = useCallback(async (item: Rider) => {
    if (!appState.activeTeamId) {
      console.error('Sauvegarde impossible : aucune équipe sélectionnée (activeTeamId manquant)');
      throw new Error('Aucune équipe sélectionnée. Veuillez sélectionner une équipe pour sauvegarder.');
    }
    
    if (!item.id) {
      console.error('Sauvegarde impossible : le coureur n\'a pas d\'ID');
      throw new Error('Impossible de sauvegarder : identifiant du coureur manquant.');
    }
    
    try {
      // Récupérer le rider existant pour comparer les valeurs
      const existingRider = appState.riders.find(r => r.id === item.id);
      
      // Calculer la date de début de saison actuelle
      const currentSeasonStartDate = getCurrentSeasonStartDate();
      
      // Vérifier si on doit réinitialiser les PPR de la saison
      const shouldResetSeason = existingRider?.currentSeasonStartDate && 
        existingRider.currentSeasonStartDate < currentSeasonStartDate;
      
      // Utiliser l'historique existant du rider (depuis l'état ou depuis l'item)
      let updatedHistory: PowerProfileHistory | undefined = existingRider?.powerProfileHistory || item.powerProfileHistory;
      
      // Gérer la réinitialisation des PPR de saison et la mise à jour du PPR all-time
      let updatedItem = { ...item };
      let updatedAllTime = existingRider?.powerProfileAllTime || item.powerProfileAllTime;
      
      if (shouldResetSeason) {
        // Sauvegarder les valeurs de la saison précédente dans l'historique avant réinitialisation
        if (existingRider) {
          const seasonEndEntry: PowerProfileHistoryEntry = {
            id: generateId(),
            date: currentSeasonStartDate,
            powerProfileFresh: existingRider.powerProfileFresh ? { ...existingRider.powerProfileFresh } : undefined,
            powerProfile15KJ: existingRider.powerProfile15KJ ? { ...existingRider.powerProfile15KJ } : undefined,
            powerProfile30KJ: existingRider.powerProfile30KJ ? { ...existingRider.powerProfile30KJ } : undefined,
            powerProfile45KJ: existingRider.powerProfile45KJ ? { ...existingRider.powerProfile45KJ } : undefined,
            weightKg: existingRider.weightKg,
            notes: 'Fin de saison - Réinitialisation PPR',
          };
          
          if (!updatedHistory) {
            updatedHistory = { entries: [] };
          }
          updatedHistory.entries = [seasonEndEntry, ...updatedHistory.entries];
        }
        
        // Mettre à jour le PPR all-time avec les meilleures valeurs de la saison précédente
        if (existingRider) {
          updatedAllTime = {
            powerProfileFresh: updatePowerProfileWithBest(
              updatedAllTime?.powerProfileFresh,
              existingRider.powerProfileFresh
            ),
            powerProfile15KJ: updatePowerProfileWithBest(
              updatedAllTime?.powerProfile15KJ,
              existingRider.powerProfile15KJ
            ),
            powerProfile30KJ: updatePowerProfileWithBest(
              updatedAllTime?.powerProfile30KJ,
              existingRider.powerProfile30KJ
            ),
            powerProfile45KJ: updatePowerProfileWithBest(
              updatedAllTime?.powerProfile45KJ,
              existingRider.powerProfile45KJ
            ),
            lastUpdated: new Date().toISOString(),
          };
        }
        
        // Réinitialiser les PPR de la saison en cours - SAUF si l'utilisateur a saisi de nouvelles données
        // (évite d'effacer les modifications PPR que l'utilisateur vient d'entrer pour la nouvelle saison)
        const hasUserProvidedNewPPR = item.powerProfileFresh || item.powerProfile15KJ || item.powerProfile30KJ || item.powerProfile45KJ;
        updatedItem = {
          ...updatedItem,
          powerProfileFresh: hasUserProvidedNewPPR ? item.powerProfileFresh : undefined,
          powerProfile15KJ: hasUserProvidedNewPPR ? item.powerProfile15KJ : undefined,
          powerProfile30KJ: hasUserProvidedNewPPR ? item.powerProfile30KJ : undefined,
          powerProfile45KJ: hasUserProvidedNewPPR ? item.powerProfile45KJ : undefined,
          currentSeasonStartDate: currentSeasonStartDate,
        };
      } else {
        // Mettre à jour le PPR all-time avec les meilleures valeurs actuelles
        if (item.powerProfileFresh || item.powerProfile15KJ || item.powerProfile30KJ || item.powerProfile45KJ) {
          updatedAllTime = {
            powerProfileFresh: updatePowerProfileWithBest(
              updatedAllTime?.powerProfileFresh,
              item.powerProfileFresh
            ),
            powerProfile15KJ: updatePowerProfileWithBest(
              updatedAllTime?.powerProfile15KJ,
              item.powerProfile15KJ
            ),
            powerProfile30KJ: updatePowerProfileWithBest(
              updatedAllTime?.powerProfile30KJ,
              item.powerProfile30KJ
            ),
            powerProfile45KJ: updatePowerProfileWithBest(
              updatedAllTime?.powerProfile45KJ,
              item.powerProfile45KJ
            ),
            lastUpdated: new Date().toISOString(),
          };
        }
        
        // S'assurer que currentSeasonStartDate est défini
        if (!updatedItem.currentSeasonStartDate) {
          updatedItem.currentSeasonStartDate = currentSeasonStartDate;
        }
      }
      
      // Vérifier si les valeurs de puissance ont changé (seulement si un rider existant existe et si on ne réinitialise pas)
      // Priorité à l'historique déjà calculé dans le modal (item.powerProfileHistory) pour éviter les doublons
      updatedHistory = item.powerProfileHistory || updatedHistory;
      if (existingRider && !shouldResetSeason) {
        const powerChanged = 
          hasPowerProfileChanged(existingRider.powerProfileFresh, updatedItem.powerProfileFresh) ||
          hasPowerProfileChanged(existingRider.powerProfile15KJ, updatedItem.powerProfile15KJ) ||
          hasPowerProfileChanged(existingRider.powerProfile30KJ, updatedItem.powerProfile30KJ) ||
          hasPowerProfileChanged(existingRider.powerProfile45KJ, updatedItem.powerProfile45KJ) ||
          existingRider.weightKg !== updatedItem.weightKg;
        
        // Si les valeurs ont changé et que l'historique n'a pas déjà été mis à jour (par le modal)
        const lastEntryDate = updatedHistory?.entries?.[0]?.date;
        const alreadyAddedByModal = lastEntryDate && (Date.now() - new Date(lastEntryDate).getTime()) < 5000;
        if (powerChanged && !alreadyAddedByModal) {
          const historyEntry: PowerProfileHistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            powerProfileFresh: existingRider.powerProfileFresh ? { ...existingRider.powerProfileFresh } : undefined,
            powerProfile15KJ: existingRider.powerProfile15KJ ? { ...existingRider.powerProfile15KJ } : undefined,
            powerProfile30KJ: existingRider.powerProfile30KJ ? { ...existingRider.powerProfile30KJ } : undefined,
            powerProfile45KJ: existingRider.powerProfile45KJ ? { ...existingRider.powerProfile45KJ } : undefined,
            weightKg: existingRider.weightKg,
          };
          
          if (!updatedHistory) {
            updatedHistory = { entries: [] };
          }
          updatedHistory.entries = [historyEntry, ...updatedHistory.entries];
        }
      }
      
      // Enrichir automatiquement les données du coureur avec les informations du profil utilisateur
      const enrichedItem: Rider = {
        ...updatedItem,
        // S'assurer que la date de naissance est présente
        birthDate: updatedItem.birthDate || currentUser?.signupInfo?.birthDate || "1990-01-01",
        // S'assurer que le genre est présent
        sex: updatedItem.sex || currentUser?.signupInfo?.sex || undefined,
        // S'assurer que l'email est présent
        email: updatedItem.email || currentUser?.email || "",
        // Ajouter l'historique mis à jour
        powerProfileHistory: updatedHistory || updatedItem.powerProfileHistory,
        // Ajouter le PPR all-time mis à jour
        powerProfileAllTime: updatedAllTime,
        // S'assurer que currentSeasonStartDate est défini
        currentSeasonStartDate: updatedItem.currentSeasonStartDate || currentSeasonStartDate,
      };
      
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "riders",
        enrichedItem
      );
      
      const finalItem = { ...enrichedItem, id: enrichedItem.id || savedId };

      setAppState((prev: AppState) => {
        const collection = prev.riders;
        const exists = collection.some((i: Rider) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: Rider) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        
        return { ...prev, riders: newCollection };
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rider:', error);
      throw error;
    }
  }, [appState.activeTeamId, appState.riders, currentUser]);

  const onDeleteRider = useCallback(async (item: Rider) => {
    if (!appState.activeTeamId || !item.id) {
      return;
    }
    
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "riders",
        item.id
      );

      setAppState((prev: AppState) => {
        const collection = prev.riders;
        const newRiders = collection.filter((i: Rider) => i.id !== item.id);
        return {
          ...prev,
          riders: newRiders,
        };
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw error;
    }
  }, [appState.activeTeamId]);

  const onSaveStaff = useCallback(async (item: StaffMember) => {
    if (!appState.activeTeamId) {
      return;
    }
    
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "staff",
        item
      );
      
      const finalItem = { ...item, id: item.id || savedId };

      setAppState((prev: AppState) => {
        const collection = prev.staff;
        const exists = collection.some((i: StaffMember) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: StaffMember) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        
        return { ...prev, staff: newCollection };
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du staff:', error);
    }
  }, [appState.activeTeamId]);

  const onDeleteStaff = useCallback(async (item: StaffMember) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "staff",
      item.id
    );

    setAppState((prev: AppState) => {
      const collection = prev.staff;
      return {
        ...prev,
        staff: collection.filter((i: StaffMember) => i.id !== item.id),
      };
    });
  }, [appState.activeTeamId]);

  const onSaveMeetingReport = useCallback(async (item: MeetingReport) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "meetingReports",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.meetingReports || [];
      const exists = collection.some((i: MeetingReport) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: MeetingReport) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, meetingReports: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteMeetingReport = useCallback(async (item: MeetingReport) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "meetingReports",
      item.id
    );

    setAppState((prev: AppState) => {
      const collection = prev.meetingReports || [];
      return {
        ...prev,
        meetingReports: collection.filter((i: MeetingReport) => i.id !== item.id),
      };
    });
  }, [appState.activeTeamId]);

  const onSaveVehicle = useCallback(async (item: Vehicle) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "vehicles",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };

    setAppState((prev: AppState) => {
      const collection = prev.vehicles;
      const exists = collection.some((i: Vehicle) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: Vehicle) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, vehicles: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteVehicle = useCallback(async (item: Vehicle) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "vehicles",
      item.id
    );

    setAppState((prev: AppState) => {
      const collection = prev.vehicles;
      return {
        ...prev,
        vehicles: collection.filter((i: Vehicle) => i.id !== item.id),
      };
    });
  }, [appState.activeTeamId]);

  const onSaveEquipment = useCallback(async (item: EquipmentItem) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "equipment",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };

    setAppState((prev: AppState) => {
      const collection = prev.equipment;
      const exists = collection.some((i: EquipmentItem) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: EquipmentItem) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, equipment: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteEquipment = useCallback(async (item: EquipmentItem) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "equipment",
      item.id
    );

    setAppState((prev: AppState) => {
      const collection = prev.equipment;
      return {
        ...prev,
        equipment: collection.filter((i: EquipmentItem) => i.id !== item.id),
      };
    });
  }, [appState.activeTeamId]);

  const onSaveRaceEvent = useCallback(async (item: RaceEvent) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "raceEvents",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };

    setAppState((prev: AppState) => {
      const collection = prev.raceEvents;
      const exists = collection.some((i: RaceEvent) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: RaceEvent) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, raceEvents: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteRaceEvent = useCallback(async (item: RaceEvent) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "raceEvents",
      item.id
    );

    setAppState((prev: AppState) => {
      const collection = prev.raceEvents;
      return {
        ...prev,
        raceEvents: collection.filter((i: RaceEvent) => i.id !== item.id),
      };
    });
  }, [appState.activeTeamId]);

  // Handlers pour les autres types
  const onSavePerformanceEntry = useCallback(async (item: PerformanceEntry) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "performanceEntries",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.performanceEntries;
      const exists = collection.some((i: PerformanceEntry) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: PerformanceEntry) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, performanceEntries: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeletePerformanceEntry = useCallback(async (item: PerformanceEntry) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "performanceEntries",
      item.id
    );
    setAppState((prev: AppState) => ({
      ...prev,
      performanceEntries: prev.performanceEntries.filter((i: PerformanceEntry) => i.id !== item.id),
    }));
  }, [appState.activeTeamId]);


  const onSaveIncomeItem = useCallback(async (item: IncomeItem) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "incomeItems",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.incomeItems;
      const exists = collection.some((i: IncomeItem) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: IncomeItem) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, incomeItems: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteIncomeItem = useCallback(async (item: IncomeItem) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "incomeItems",
      item.id
    );
    setAppState((prev: AppState) => ({
      ...prev,
      incomeItems: prev.incomeItems.filter((i: IncomeItem) => i.id !== item.id),
    }));
  }, [appState.activeTeamId]);

  const onSaveBudgetItem = useCallback(async (item: EventBudgetItem) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "eventBudgetItems",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.eventBudgetItems;
      const exists = collection.some((i: EventBudgetItem) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: EventBudgetItem) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, eventBudgetItems: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteBudgetItem = useCallback(async (item: EventBudgetItem) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "eventBudgetItems",
      item.id
    );
    setAppState((prev: AppState) => ({
      ...prev,
      eventBudgetItems: prev.eventBudgetItems.filter((i: EventBudgetItem) => i.id !== item.id),
    }));
  }, [appState.activeTeamId]);

  const onSaveScoutingProfile = useCallback(async (item: ScoutingProfile) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "scoutingProfiles",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.scoutingProfiles;
      const exists = collection.some((i: ScoutingProfile) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: ScoutingProfile) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, scoutingProfiles: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteScoutingProfile = useCallback(async (item: ScoutingProfile | string) => {
    if (!appState.activeTeamId) return;
    
    const profileId = typeof item === 'string' ? item : item.id;
    if (!profileId) return;
    
    await firebaseService.deleteData(
      appState.activeTeamId,
      "scoutingProfiles",
      profileId
    );
    setAppState((prev: AppState) => ({
      ...prev,
      scoutingProfiles: prev.scoutingProfiles.filter((i: ScoutingProfile) => i.id !== profileId),
    }));
  }, [appState.activeTeamId]);

  const onSaveStockItem = useCallback(async (item: StockItem) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "stockItems",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.stockItems;
      const exists = collection.some((i: StockItem) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: StockItem) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, stockItems: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteStockItem = useCallback(async (item: StockItem) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "stockItems",
      item.id
    );
    setAppState((prev: AppState) => ({
      ...prev,
      stockItems: prev.stockItems.filter((i: StockItem) => i.id !== item.id),
    }));
  }, [appState.activeTeamId]);

  const onSaveChecklistTemplate = useCallback(async (item: ChecklistTemplate) => {
    if (!appState.activeTeamId) return;
    const role = item.role ?? ChecklistRole.DS;
    const toSave = { ...item, id: item.id || '', name: item.name, role, kind: item.kind || 'task', eventType: item.eventType, timing: item.timing, timingLabel: item.timingLabel };
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "checklistTemplates",
      toSave
    );
    const finalItem = { ...toSave, id: toSave.id || savedId };
    setAppState((prev: AppState) => {
      const record = prev.checklistTemplates || {};
      const arr = record[role] || [];
      const exists = arr.some((i: ChecklistTemplate) => i.id === finalItem.id);
      const newArr = exists
        ? arr.map((i: ChecklistTemplate) => (i.id === finalItem.id ? finalItem : i))
        : [...arr, finalItem];
      return { ...prev, checklistTemplates: { ...record, [role]: newArr } };
    });
  }, [appState.activeTeamId]);

  const onDeleteChecklistTemplate = useCallback(async (item: ChecklistTemplate) => {
    if (!appState.activeTeamId || !item.id) return;
    const role = item.role ?? ChecklistRole.DS;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "checklistTemplates",
      item.id
    );
    setAppState((prev: AppState) => {
      const record = prev.checklistTemplates || {};
      const arr = (record[role] || []).filter((i: ChecklistTemplate) => i.id !== item.id);
      return { ...prev, checklistTemplates: { ...record, [role]: arr } };
    });
  }, [appState.activeTeamId]);

  // Handlers pour TeamProduct
  const onSaveTeamProduct = useCallback(async (item: TeamProduct) => {
    if (!appState.activeTeamId) return;
    const savedId = await firebaseService.saveData(
      appState.activeTeamId,
      "teamProducts",
      item
    );
    const finalItem = { ...item, id: item.id || savedId };
    setAppState((prev: AppState) => {
      const collection = prev.teamProducts;
      const exists = collection.some((i: TeamProduct) => i.id === finalItem.id);
      const newCollection = exists
        ? collection.map((i: TeamProduct) => (i.id === finalItem.id ? finalItem : i))
        : [...collection, finalItem];
      return { ...prev, teamProducts: newCollection };
    });
  }, [appState.activeTeamId]);

  const onDeleteTeamProduct = useCallback(async (item: TeamProduct) => {
    if (!appState.activeTeamId || !item.id) return;
    await firebaseService.deleteData(
      appState.activeTeamId,
      "teamProducts",
      item.id
    );
    setAppState((prev: AppState) => ({
      ...prev,
      teamProducts: prev.teamProducts.filter((i: TeamProduct) => i.id !== item.id),
    }));
  }, [appState.activeTeamId]);

  // Fonction utilitaire pour remplacer createBatchSetHandler
  const createBatchSetHandler = <T,>(
    collectionName: keyof TeamState
  ): React.Dispatch<React.SetStateAction<T[]>> =>
    (updater: React.SetStateAction<T[]>) => {
      setAppState((prev: AppState) => {
        const currentItems = prev[collectionName] as T[];
        const newItems =
          typeof updater === "function"
            ? (updater as (prevState: T[]) => T[])(currentItems)
            : updater;

        return { ...prev, [collectionName]: newItems };
      });
    };



  // --- AUTH & ONBOARDING HANDLERS ---

  const handleLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, message: "" };
    } catch (error: any) {
      // Gestion spécifique des erreurs Firebase Auth
      switch (error.code) {
        case "auth/user-not-found":
          return {
            success: false,
            message: "Aucun utilisateur trouvé avec cette adresse email.",
          };
        case "auth/wrong-password":
          return { success: false, message: "Mot de passe incorrect." };
        case "auth/invalid-email":
          return {
            success: false,
            message: "L'adresse email n'est pas valide.",
          };
        case "auth/user-disabled":
          return { success: false, message: "Ce compte a été désactivé." };
        case "auth/too-many-requests":
          return {
            success: false,
            message:
              "Trop de tentatives de connexion. Veuillez réessayer plus tard.",
          };
        case "auth/network-request-failed":
          return {
            success: false,
            message:
              "Erreur de connexion réseau. Vérifiez votre connexion internet.",
          };
        default:
          console.error("Erreur Firebase Auth:", error);
          return {
            success: false,
            message: "Erreur de connexion. Veuillez réessayer.",
          };
      }
    }
  };

  const handleRegister = async (
    data: SignupData
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Stocker les données d'inscription temporairement (état et ref)
      setPendingSignupData(data);
      pendingSignupDataRef.current = data;
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      // The onAuthStateChanged listener will now handle creating the user profile.
      // This prevents race conditions and centralizes profile creation logic.
      return { success: true, message: "" };
    } catch (error: any) {
      // En cas d'erreur, nettoyer les données temporaires
      setPendingSignupData(null);
      pendingSignupDataRef.current = null;
      if (error.code === "auth/email-already-in-use") {
        return {
          success: false,
          message: "Cette adresse email est déjà utilisée par un autre compte.",
        };
      }
      if (error.code === "auth/weak-password") {
        return { success: false, message: t("signupPasswordTooShort") };
      }
      if (error.code === "auth/invalid-email") {
        return { success: false, message: "L'adresse email n'est pas valide." };
      }
      return {
        success: false,
        message: `Erreur d'inscription: ${error.message}`,
      };
    }
  };

  const handleJoinTeamRequest = async (teamId: string) => {
    if (!currentUser) {
      alert("Vous devez être connecté pour rejoindre une équipe.");
      return;
    }
    try {
      await firebaseService.requestToJoinTeam(
        currentUser.id,
        teamId,
        currentUser.userRole
      );
      setView("pending");
      // Recharger les données pour mettre à jour les memberships
      await loadDataForUser(currentUser);
    } catch (error: any) {
      console.error("❌ Échec de la demande pour rejoindre l'équipe:", error);
      const errorMessage = error?.message || t("errorJoinTeam");
      alert(errorMessage);
    }
  };

  const handleCreateTeam = async (teamData: {
    name: string;
    level: TeamLevel;
    country: string;
  }) => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      // Forcer le rôle Manager lors de la création d'équipe
      await firebaseService.createTeamForUser(
        currentUser.id,
        teamData,
        UserRole.MANAGER // Forcer le rôle Manager
      );
      
      // Attendre un peu plus pour s'assurer que toutes les données sont propagées
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh user profile to pick up new roles (Admin/Manager) avec retry
      let refreshedProfile = await firebaseService.getUserProfile(currentUser.id);
      let retries = 0;
      while (!refreshedProfile && retries < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
        refreshedProfile = await firebaseService.getUserProfile(currentUser.id);
        retries++;
      }
      
      if (refreshedProfile) {
        setCurrentUser(refreshedProfile);
        await loadDataForUser(refreshedProfile);
        
        // Redirection automatique vers le tableau de bord administrateur pour les managers/admins
        if (refreshedProfile.permissionRole === TeamRole.ADMIN || refreshedProfile.userRole === UserRole.MANAGER) {
          setCurrentSection("myDashboard");
        }
      } else {
        // Essayer de recharger avec l'utilisateur actuel
        await loadDataForUser(currentUser);
      }
    } catch (error) {
      console.error("Failed to create team:", error);
      alert(t("errorCreateTeam") + (error instanceof Error ? `: ${error.message}` : ''));
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };



  const navigateTo = (section: AppSection, eventId?: string) => {
    if (section === "eventDetail" && eventId) {
      setAppState((prev: AppState) => ({ ...prev, activeEventId: eventId }));
    } else {
      setAppState((prev: AppState) => ({ ...prev, activeEventId: null }));
    }
    setCurrentSection(section);
  };

  if (isLoading) {
    return (
              <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          {t("loading")}
        </div>
    );
  }

  const renderContent = () => {
    // Protection globale contre appState undefined
    if (!appState) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg border">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Chargement de l'application...</h3>
            <p className="text-gray-500 mb-4">Initialisation de l'état de l'application...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      );
    }

    if (view === "login") {
      return (
        <LoginView
          onLogin={handleLogin}
          onSwitchToSignup={() => setView("signup")}
        />
      );
    }
    if (view === "signup") {
      return (
        <SignupView
          onRegister={handleRegister}
          onSwitchToLogin={() => setView("login")}
          teams={appState.teams}
        />
      );
    }
    if (view === "pending") {
      return <PendingApprovalView onLogout={handleLogout} />;
    }
    if (view === "no_team" && currentUser) {
      return (
        <NoTeamView
          currentUser={currentUser}
          teams={appState.teams}
          onJoinTeam={handleJoinTeamRequest}
          onCreateTeam={handleCreateTeam}
          onLogout={handleLogout}
        />
      );
    }
    // Fallback : no_team sans currentUser (ex. erreur au chargement) → retour login
    if (view === "no_team") {
      return (
        <LoginView
          onLogin={handleLogin}
          onSwitchToSignup={() => setView("signup")}
        />
      );
    }

    if (view === "app" && currentUser && appState.activeTeamId) {
      // SOLUTION DE CONTOURNEMENT : Forcer les permissions Manager si l'utilisateur est Manager/Admin
      let effectivePermissions = firebaseService.getEffectivePermissions(
        currentUser,
        appState.permissions,
        appState.staff
      );
      
      // FORCER les permissions si l'utilisateur est Manager/Admin
      if (currentUser.userRole === UserRole.MANAGER || currentUser.permissionRole === TeamRole.ADMIN) {
        effectivePermissions = {
          events: ['view', 'edit'],
          financial: ['view', 'edit'],
          performance: ['view', 'edit'],
          staff: ['view', 'edit'],
          roster: ['view', 'edit'],
          vehicles: ['view', 'edit'],
          equipment: ['view', 'edit'],
          stocks: ['view', 'edit'],
          scouting: ['view', 'edit'],
          userManagement: ['view', 'edit'],
          permissions: ['view', 'edit'],
          checklist: ['view', 'edit'],
          settings: ['view', 'edit'],
          // Exclure les sections "Mon Espace"
        };
      }
      const activeEvent = appState.activeEventId
        ? appState.raceEvents.find((e) => e.id === appState.activeEventId)
        : null;
      const userTeams = appState.teams.filter((team) =>
        appState.teamMemberships.some(
          (m) =>
            m.teamId === team.id &&
            m.userId === currentUser.id &&
            m.status === TeamMembershipStatus.ACTIVE
        )
      );

      return (
        <LanguageProvider
          language={language}
          setLanguage={(lang) => {
            if (lang) setLanguageState(lang);
          }}
        >
          <div className="flex min-h-screen">
            {appState && (
              <Sidebar
                currentSection={currentSection}
                onSelectSection={navigateTo}
                teamLogoUrl={appState.teamLogoUrl}
                onLogout={handleLogout}
                currentUser={currentUser}
                effectivePermissions={effectivePermissions}
                staff={appState.staff}
                permissionRoles={appState.permissionRoles}
                userTeams={userTeams}
                currentTeamId={appState.activeTeamId}
                onTeamSwitch={() => {
                  /* TODO */
                }}
                isIndependent={false}
                onGoToLobby={() => setView("no_team")}
              />
            )}
            <main className="main-content p-6 bg-gray-100 min-h-screen ml-72">

              
              {activeEvent ? (
                <EventDetailView
                  event={activeEvent}
                  eventId={activeEvent.id}
                  appState={appState as AppState}
                  navigateTo={navigateTo}
                  deleteRaceEvent={(eventId) => {
                    onDeleteRaceEvent({ id: eventId } as RaceEvent);
                    navigateTo("events");
                  }}
                  currentUser={currentUser}
                  setRaceEvents={createBatchSetHandler<RaceEvent>("raceEvents")}
                  onSaveRaceEvent={onSaveRaceEvent}
                  setEventTransportLegs={createBatchSetHandler<EventTransportLeg>(
                    "eventTransportLegs"
                  )}
                  setEventAccommodations={createBatchSetHandler<EventAccommodation>(
                    "eventAccommodations"
                  )}
                  setEventDocuments={createBatchSetHandler<EventRaceDocument>(
                    "eventDocuments"
                  )}
                  setEventRadioEquipments={createBatchSetHandler<EventRadioEquipment>(
                    "eventRadioEquipments"
                  )}
                  setEventRadioAssignments={createBatchSetHandler<EventRadioAssignment>(
                    "eventRadioAssignments"
                  )}
                  setEventBudgetItems={createBatchSetHandler<EventBudgetItem>(
                    "eventBudgetItems"
                  )}
                  setEventChecklistItems={createBatchSetHandler<EventChecklistItem>(
                    "eventChecklistItems"
                  )}
                  setPerformanceEntries={createBatchSetHandler<PerformanceEntry>(
                    "performanceEntries"
                  )}
                  setPeerRatings={createBatchSetHandler<PeerRating>(
                    "peerRatings"
                  )}
                  onSavePerformanceEntry={onSavePerformanceEntry}
                />
              ) : (
                <div>
                  {/* Protection globale contre l'état non initialisé */}
                  {(!appState || !appState.riders || !appState.staff || !appState.incomeItems || !appState.teams || !appState.teamMemberships) ? (
                    <div className="flex items-center justify-center min-h-screen bg-gray-50">
                      <div className="text-center p-8 bg-white rounded-lg shadow-lg border">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Chargement de l'application...</h3>
                        <p className="text-gray-500 mb-4">Initialisation des données...</p>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {currentSection === "myDashboard" && currentUser && (
                        <>
                          {/* Gestionnaire de basculement sur 2026 */}
                          <SeasonTransitionManager
                            riders={appState.riders}
                            staff={appState.staff}
                            raceEvents={appState.raceEvents}
                            performanceEntries={appState.performanceEntries}
                          />
                          
                          {/* Redirection automatique pour les administrateurs */}
                          {currentUser.permissionRole === TeamRole.ADMIN || currentUser.userRole === UserRole.MANAGER ? (
                            <AdminDashboardSection
                              riders={appState.riders}
                              staff={appState.staff}
                              currentUser={currentUser}
                              raceEvents={appState.raceEvents}
                              riderEventSelections={appState.riderEventSelections}
                              appState={appState}
                              navigateTo={navigateTo}
                            />
                          ) : (
                            <MyDashboardSection
                              riders={appState.riders}
                              staff={appState.staff}
                              currentUser={currentUser}
                              raceEvents={appState.raceEvents}
                              riderEventSelections={appState.riderEventSelections}
                              appState={appState}
                              navigateTo={navigateTo}
                            />
                          )}
                        </>
                      )}
                      {currentSection === "adminDashboard" && currentUser && (
                        <AdminDashboardSection
                          riders={appState.riders}
                          staff={appState.staff}
                          currentUser={currentUser}
                          raceEvents={appState.raceEvents}
                          riderEventSelections={appState.riderEventSelections}
                          appState={appState}
                          navigateTo={navigateTo}
                        />
                      )}
                  {currentSection === "events" && (
                    <EventsSection
                      raceEvents={appState.raceEvents}
                      setRaceEvents={onSaveRaceEvent}
                      setEventDocuments={createBatchSetHandler<EventRaceDocument>(
                        "eventDocuments"
                      )}
                      navigateToEventDetail={(eventId) =>
                        navigateTo("eventDetail", eventId)
                      }
                      eventTransportLegs={appState.eventTransportLegs}
                      riderEventSelections={appState.riderEventSelections}
                      deleteRaceEvent={(eventId) =>
                        onDeleteRaceEvent({ id: eventId } as RaceEvent)
                      }
                      riders={appState.riders}
                      staff={appState.staff}
                      teamLevel={appState.teamLevel}
                      currentUser={currentUser}
                    />
                  )}
                  {currentSection === "roster" && appState.riders && (
                    <RosterSection
                      riders={appState.riders}
                      onSaveRider={onSaveRider}
                      onDeleteRider={onDeleteRider}
                      raceEvents={appState.raceEvents}
                      setRaceEvents={createBatchSetHandler<RaceEvent>("raceEvents")}
                      riderEventSelections={appState.riderEventSelections}
                      setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                      performanceEntries={appState.performanceEntries}
                      scoutingProfiles={appState.scoutingProfiles}
                      teamProducts={appState.teamProducts}
                      currentUser={currentUser}
                      appState={appState}
                    />
                  )}
                  {currentSection === "season-planning" && appState.riders && (
                    <SeasonPlanningSection
                      riders={appState.riders}
                      onSaveRider={onSaveRider}
                      onDeleteRider={onDeleteRider}
                      raceEvents={appState.raceEvents}
                      setRaceEvents={createBatchSetHandler<RaceEvent>("raceEvents")}
                      riderEventSelections={appState.riderEventSelections}
                      setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                      performanceEntries={appState.performanceEntries}
                      scoutingProfiles={appState.scoutingProfiles}
                      teamProducts={appState.teamProducts}
                      currentUser={currentUser}
                      appState={appState}
                      onSaveRaceEvent={onSaveRaceEvent}
                      navigateTo={navigateTo}
                    />
                  )}
                  {currentSection === "staff" && appState.staff && currentUser && (
                    <StaffSection
                      staff={appState.staff}
                      onSave={onSaveStaff}
                      onDelete={onDeleteStaff}
                      onSaveMeetingReport={onSaveMeetingReport}
                      onDeleteMeetingReport={onDeleteMeetingReport}
                      onStaffTransition={(archive, transition) => {
                        // TODO: Implémenter la sauvegarde des archives et transitions
                      }}
                      staffEventSelections={appState.staffEventSelections || []}
                      setStaffEventSelections={createBatchSetHandler<StaffEventSelection>("staffEventSelections")}
                      effectivePermissions={effectivePermissions}
                      raceEvents={appState.raceEvents}
                      eventStaffAvailabilities={appState.eventStaffAvailabilities}
                      eventBudgetItems={appState.eventBudgetItems}
                      setEventBudgetItems={createBatchSetHandler<EventBudgetItem>("eventBudgetItems")}
                      currentUser={currentUser}
                      team={appState.teams.find(t => t.id === appState.activeTeamId)}
                      performanceEntries={appState.performanceEntries}
                      missions={appState.missions}
                      teams={appState.teams}
                      users={appState.users}
                      permissionRoles={appState.permissionRoles}
                      vehicles={appState.vehicles}
                      eventTransportLegs={appState.eventTransportLegs}
                      onSaveRaceEvent={onSaveRaceEvent}
                      navigateTo={navigateTo}
                      appState={appState}
                    />
                  )}
                  {currentSection === "vehicles" && (
                    <VehiclesSection
                      vehicles={appState.vehicles}
                      onSave={onSaveVehicle}
                      onDelete={onDeleteVehicle}
                      effectivePermissions={effectivePermissions}
                      staff={appState.staff}
                      eventTransportLegs={appState.eventTransportLegs}
                      raceEvents={appState.raceEvents}
                      navigateTo={navigateTo}
                    />
                  )}
                  {currentSection === "equipment" && (
                    <EquipmentSection
                      equipment={appState.equipment}
                      onSave={onSaveEquipment}
                      onDelete={onDeleteEquipment}
                      effectivePermissions={effectivePermissions}
                      equipmentStockItems={appState.equipmentStockItems}
                      currentUser={currentUser}
                    />
                  )}
                  {currentSection === "performance" && appState.riders && currentUser && (
                    <PerformancePoleSection
                      appState={appState}
                      effectivePermissions={effectivePermissions}
                      currentUser={currentUser}
                    />
                  )}
                  {currentSection === "settings" && (
                    <SettingsSection
                      appState={appState}
                      onSaveTeamSettings={async (settings) => {
                        if (appState.activeTeamId) {
                          await firebaseService.saveTeamSettings(
                            appState.activeTeamId,
                            settings
                          );
                          setAppState((prev) => ({ ...prev, ...settings }));
                        }
                      }}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "financial" && appState.incomeItems && appState.eventBudgetItems && (
                    <FinancialSection
                      incomeItems={appState.incomeItems}
                      budgetItems={appState.eventBudgetItems}
                      onSaveIncomeItem={onSaveIncomeItem}
                      onDeleteIncomeItem={onDeleteIncomeItem}
                      onSaveBudgetItem={onSaveBudgetItem}
                      onDeleteBudgetItem={onDeleteBudgetItem}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "scouting" && (
                    <ScoutingSection
                      scoutingProfiles={appState.scoutingProfiles}
                      riders={appState.riders}
                      onSaveScoutingProfile={onSaveScoutingProfile}
                      onDeleteScoutingProfile={onDeleteScoutingProfile}
                      onSaveRider={onSaveRider}
                      effectivePermissions={effectivePermissions}
                      appState={appState}
                      currentTeamId={appState.activeTeamId}
                    />
                  )}
                  {currentSection === "userManagement" && appState.users && appState.teamMemberships && (
                    <UserManagementSection
                      appState={appState}
                      currentTeamId={appState.activeTeamId || ''}
                      onApprove={async (membership) => {
                        try {
                          // Vérifier que membership est valide
                          if (!membership || !membership.id || !membership.email || !membership.teamId) {
                            alert('Erreur: Données d\'adhésion invalides');
                            return;
                          }
                          
                          // Vérifier les permissions
                          if (!currentUser || !effectivePermissions) {
                            alert('Erreur: Permissions non définies. Veuillez vous reconnecter.');
                            return;
                          }

                          // Vérifier si l'utilisateur a le droit d'approuver des adhésions
                          const canApproveMemberships = (effectivePermissions && effectivePermissions['userManagement'] && Array.isArray(effectivePermissions['userManagement']) && effectivePermissions['userManagement'].includes('edit')) || 
                                                      currentUser.permissionRole === TeamRole.ADMIN ||
                                                      currentUser.userRole === UserRole.MANAGER;
                          
                          if (!canApproveMemberships) {
                            alert('Erreur: Vous n\'avez pas les permissions nécessaires pour approuver des adhésions.');
                            return;
                          }

                          // Mettre à jour le statut de l'adhésion
                          const membershipRef = doc(db, 'teamMemberships', membership.id);
                          await updateDoc(membershipRef, {
                            status: TeamMembershipStatus.ACTIVE,
                            approvedAt: new Date().toISOString(),
                            approvedBy: currentUser.id
                          });

                          // Mettre à jour l'état local
                          setAppState((prev: AppState) => ({
                            ...prev,
                            teamMemberships: prev.teamMemberships.map(m => 
                              m.id === membership.id 
                                ? { ...m, status: TeamMembershipStatus.ACTIVE, approvedAt: new Date().toISOString(), approvedBy: currentUser.id }
                                : m
                            )
                          }));

                          // Créer un profil utilisateur si nécessaire
                          const existingUser = appState.users.find(u => u.email === membership.email);
                          
                          if (!existingUser) {
                            const newUserId = generateId();
                            
                            const newUser: User = {
                              id: newUserId,
                              email: membership.email,
                              firstName: membership.firstName || '',
                              lastName: membership.lastName || '',
                              userRole: UserRole.COUREUR,
                              teamId: membership.teamId,
                              permissionRole: TeamRole.MEMBER,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              isActive: true
                            };
                            
                            await setDoc(doc(db, 'users', newUser.id), newUser);
                            
                            setAppState((prev: AppState) => ({
                              ...prev,
                              users: [...prev.users, newUser]
                            }));

                            // 🎯 AJOUTER L'UTILISATEUR AUX COLLECTIONS CORRESPONDANTES
                            
                            if (membership.userRole === UserRole.COUREUR) {
                              // Créer le profil coureur
                              const newRider: Rider = {
                                id: newUserId,
                                firstName: newUser.firstName,
                                lastName: newUser.lastName,
                                email: newUser.email,
                                // Propriétés obligatoires avec valeurs par défaut
                                qualitativeProfile: {
                                  sprint: 0,
                                  anaerobic: 0,
                                  puncher: 0,
                                  climbing: 0,
                                  rouleur: 0,
                                  generalPerformance: 0,
                                  fatigueResistance: 0
                                },
                                                              disciplines: [getSafeDisciplinePracticed("Route")],
                              categories: ['Senior'],
                              forme: getSafeFormeStatus("Bonne"),
                              moral: getSafeMoralStatus("Bon"),
                              healthCondition: getSafeHealthCondition("Bon"),
                                // Autres propriétés avec valeurs par défaut
                                resultsHistory: [],
                                favoriteRaces: [],
                                performanceGoals: '',
                                physiquePerformanceProject: { score: 0, notes: '' },
                                techniquePerformanceProject: { score: 0, notes: '' },
                                mentalPerformanceProject: { score: 0, notes: '' },
                                environnementPerformanceProject: { score: 0, notes: '' },
                                tactiquePerformanceProject: { score: 0, notes: '' },
                                allergies: [],
                                performanceNutrition: {
                                  hydrationStrategy: '',
                                  preRaceMeal: '',
                                  duringRaceNutrition: '',
                                  recoveryNutrition: ''
                                },
                                                              roadBikeSetup: { bikeType: getSafeBikeType("Route"), size: '', brand: '', model: '' },
                              ttBikeSetup: { bikeType: getSafeBikeType("Contre-la-montre"), size: '', brand: '', model: '' },
                                clothing: [],
                                charSprint: 0,
                                charAnaerobic: 0,
                                charPuncher: 0,
                                charClimbing: 0,
                                charRouleur: 0,
                                generalPerformanceScore: 0,
                                fatigueResistanceScore: 0
                              };

                              // Sauvegarder en Firebase
                              await setDoc(doc(db, 'teams', membership.teamId, 'riders', newUserId), newRider);

                              // Mettre à jour l'état local
                              setAppState((prev: AppState) => ({
                                ...prev,
                                riders: [...prev.riders, newRider]
                              }));

                            } else if (membership.userRole === UserRole.STAFF) {
                              // Créer le profil staff
                              const newStaffMember: StaffMember = {
                                id: newUserId,
                                firstName: newUser.firstName,
                                lastName: newUser.lastName,
                                email: newUser.email,
                                role: StaffRole.AUTRE,
                                status: StaffStatus.VACATAIRE,
                                openToExternalMissions: false,
                                skills: [],
                                availability: []
                              };

                              // Sauvegarder en Firebase
                              await setDoc(doc(db, 'teams', membership.teamId, 'staff', newUserId), newStaffMember);

                              // Mettre à jour l'état local
                              setAppState((prev: AppState) => ({
                                ...prev,
                                staff: [...prev.staff, newStaffMember]
                              }));
                            }
                            
                            // Message de confirmation pour l'utilisateur
                            const roleText = membership.userRole === UserRole.COUREUR ? 'coureurs' : 'staff';
                            alert(`✅ ${newUser.firstName} ${newUser.lastName} a été approuvé et ajouté aux ${roleText} !`);
                          }
                        } catch (error) {
                          let errorMessage = 'Erreur lors de l\'approbation de l\'adhésion';
                          
                          if (error instanceof Error) {
                            if (error.message.includes('permission-denied')) {
                              errorMessage = 'Permission refusée. Vérifiez vos droits d\'administrateur.';
                            } else if (error.message.includes('not-found')) {
                              errorMessage = 'Adhésion introuvable. Elle a peut-être été supprimée.';
                            } else if (error.message.includes('unavailable')) {
                              errorMessage = 'Service temporairement indisponible. Réessayez plus tard.';
                            } else {
                              errorMessage = `Erreur: ${error.message}`;
                            }
                          }
                          
                          alert(errorMessage);
                        }
                      }}
                      onDeny={async (membership) => {
                        try {
                          // Vérifier les permissions
                          if (!currentUser || !effectivePermissions) {
                            alert('Erreur: Permissions non définies. Veuillez vous reconnecter.');
                            return;
                          }

                          // Vérifier si l'utilisateur a le droit de refuser des adhésions
                          const canDenyMemberships = (effectivePermissions && effectivePermissions['userManagement'] && Array.isArray(effectivePermissions['userManagement']) && effectivePermissions['userManagement'].includes('edit')) || 
                                                   currentUser.permissionRole === TeamRole.ADMIN ||
                                                   currentUser.userRole === UserRole.MANAGER;
                          
                          if (!canDenyMemberships) {
                            alert('Erreur: Vous n\'avez pas les permissions nécessaires pour refuser des adhésions.');
                            return;
                          }

                          if (window.confirm(`Refuser l'adhésion de ${membership.email} ?`)) {
                            // Supprimer l'adhésion refusée
                            const membershipRef = doc(db, 'teamMemberships', membership.id);
                            await deleteDoc(membershipRef);

                            // Mettre à jour l'état local
                            setAppState((prev: AppState) => ({
                              ...prev,
                              teamMemberships: prev.teamMemberships.filter(m => m.id !== membership.id)
                            }));
                          }
                        } catch (error) {
                          console.error('Erreur lors du refus:', error);
                          let errorMessage = 'Erreur lors du refus de l\'adhésion';
                          
                          if (error instanceof Error) {
                            if (error.message.includes('permission-denied')) {
                              errorMessage = 'Permission refusée. Vérifiez vos droits d\'administrateur.';
                            } else if (error.message.includes('not-found')) {
                              errorMessage = 'Adhésion introuvable. Elle a peut-être été supprimée.';
                            } else {
                              errorMessage = `Erreur: ${error.message}`;
                            }
                          }
                          
                          alert(errorMessage);
                        }
                      }}
                      onInvite={async (email, teamId, userRole = UserRole.COUREUR) => {
                        try {
                          // Vérifier les permissions
                          if (!currentUser || !effectivePermissions) {
                            alert('Erreur: Permissions non définies. Veuillez vous reconnecter.');
                            return;
                          }

                          // Vérifier si l'utilisateur a le droit d'inviter des membres
                          const canInviteMembers = (effectivePermissions && effectivePermissions['userManagement'] && Array.isArray(effectivePermissions['userManagement']) && effectivePermissions['userManagement'].includes('edit')) || 
                                                 currentUser.permissionRole === TeamRole.ADMIN ||
                                                 currentUser.userRole === UserRole.MANAGER;
                          
                          if (!canInviteMembers) {
                            alert('Erreur: Vous n\'avez pas les permissions nécessaires pour inviter des membres.');
                            return;
                          }

                          // Vérifier si l'utilisateur existe déjà
                          const existingUser = appState.users.find(u => u.email === email);
                          if (existingUser) {
                            alert('Un utilisateur avec cet email existe déjà');
                            return;
                          }

                          // Créer une nouvelle adhésion en attente
                          const newMembership: TeamMembership = {
                            id: generateId(),
                            email,
                            teamId,
                            status: TeamMembershipStatus.PENDING,
                            requestedUserRole: userRole, // Rôle demandé lors de l'invitation
                            requestedAt: new Date().toISOString(),
                            requestedBy: currentUser.id,
                            firstName: '',
                            lastName: '',
                            message: ''
                          };

                          // Sauvegarder dans Firestore
                          await addDoc(collection(db, 'teamMemberships'), newMembership);

                          // Mettre à jour l'état local
                          setAppState((prev: AppState) => ({
                            ...prev,
                            teamMemberships: [...prev.teamMemberships, newMembership]
                          }));

                          alert(`Invitation envoyée à ${email}`);
                        } catch (error) {
                          console.error('Erreur lors de l\'invitation:', error);
                          alert('Erreur lors de l\'envoi de l\'invitation');
                        }
                      }}
                      onRemove={async (userId, teamId) => {
                        try {
                          const user = appState.users.find(u => u.id === userId);
                          if (!user) return;

                          if (window.confirm(`Retirer ${user.firstName} ${user.lastName} de l'équipe ?`)) {
                            // Supprimer l'adhésion
                            const membership = appState.teamMemberships.find(m => m.userId === userId && m.teamId === teamId);
                            if (membership) {
                              await deleteDoc(doc(db, 'teamMemberships', membership.id));
                            }

                            // Mettre à jour l'utilisateur
                            const userRef = doc(db, 'users', userId);
                            await updateDoc(userRef, {
                              teamId: null,
                              permissionRole: null,
                              updatedAt: new Date().toISOString()
                            });

                            // Mettre à jour l'état local
                            setAppState((prev: AppState) => ({
                              ...prev,
                              users: prev.users.map(u => 
                                u.id === userId 
                                  ? { ...u, teamId: null, permissionRole: null }
                                  : u
                              ),
                              teamMemberships: prev.teamMemberships.filter(m => m.id !== membership?.id)
                            }));
                          }
                        } catch (error) {
                          console.error('Erreur lors de la suppression:', error);
                          alert('Erreur lors de la suppression du membre');
                        }
                      }}
                      onUpdateRole={async (userId, teamId, newUserRole) => {
                        try {
                          
                          const user = appState.users.find(u => u.id === userId);
                          
                          if (!user) {
                            alert('Utilisateur non trouvé');
                            return;
                          }

                          // Mettre à jour le rôle utilisateur
                          const userRef = doc(db, 'users', userId);
                          await updateDoc(userRef, {
                            userRole: newUserRole,
                            updatedAt: new Date().toISOString()
                          });

                          // CORRECTION: Mettre à jour aussi le userRole dans teamMemberships
                          const membership = appState.teamMemberships.find(m => m.userId === userId && m.teamId === teamId);
                          if (membership && membership.id) {
                            const membershipRef = doc(db, 'teamMemberships', membership.id);
                            await updateDoc(membershipRef, {
                              userRole: newUserRole,
                              updatedAt: new Date().toISOString()
                            });
                          }

                          // Mettre à jour l'état local des utilisateurs
                          setAppState((prev: AppState) => ({
                            ...prev,
                            users: prev.users.map(u => 
                              u.id === userId 
                                ? { ...u, userRole: newUserRole }
                                : u
                            ),
                            // CORRECTION: Mettre à jour aussi teamMemberships
                            teamMemberships: prev.teamMemberships.map(m => 
                              m.userId === userId && m.teamId === teamId
                                ? { ...m, userRole: newUserRole }
                                : m
                            )
                          }));

                          // Ajouter l'utilisateur aux bonnes collections selon son nouveau rôle
                          if (newUserRole === UserRole.COUREUR) {
                            // Ajouter aux riders
                            const newRider: Rider = {
                              id: userId,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              email: user.email,
                              // Propriétés obligatoires avec valeurs par défaut
                              qualitativeProfile: {
                                sprint: 0,
                                anaerobic: 0,
                                puncher: 0,
                                climbing: 0,
                                rouleur: 0,
                                generalPerformance: 0,
                                fatigueResistance: 0
                              },
                              disciplines: [getSafeDisciplinePracticed("Route")],
                              categories: ['Senior'],
                              forme: getSafeFormeStatus("Bonne"),
                              moral: getSafeMoralStatus("Bon"),
                              healthCondition: getSafeHealthCondition("Bon"),
                              // Autres propriétés avec valeurs par défaut
                              resultsHistory: [],
                              favoriteRaces: [],
                              performanceGoals: '',
                              physiquePerformanceProject: { score: 0, notes: '' },
                              techniquePerformanceProject: { score: 0, notes: '' },
                              mentalPerformanceProject: { score: 0, notes: '' },
                              environnementPerformanceProject: { score: 0, notes: '' },
                              tactiquePerformanceProject: { score: 0, notes: '' },
                              allergies: [],
                              performanceNutrition: {
                                hydrationStrategy: '',
                                preRaceMeal: '',
                                duringRaceNutrition: '',
                                recoveryNutrition: ''
                              },
                              roadBikeSetup: { bikeType: getSafeBikeType("Route"), size: '', brand: '', model: '' },
                              ttBikeSetup: { bikeType: getSafeBikeType("Contre-la-montre"), size: '', brand: '', model: '' },
                              clothing: [],
                              charSprint: 0,
                              charAnaerobic: 0,
                              charPuncher: 0,
                              charClimbing: 0,
                              charRouleur: 0,
                              generalPerformanceScore: 0,
                              fatigueResistanceScore: 0
                            };

                            // Sauvegarder en Firebase
                            await setDoc(doc(db, 'teams', teamId, 'riders', userId), newRider);

                            // Mettre à jour l'état local
                            setAppState((prev: AppState) => ({
                              ...prev,
                              riders: [...prev.riders, newRider]
                            }));

                          } else if (newUserRole === UserRole.STAFF) {
                            // Ajouter aux staff
                            const newStaffMember: StaffMember = {
                              id: userId,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              email: user.email,
                              role: getSafeStaffRole("Autre"),
                              status: getSafeStaffStatus("Vacataire"),
                              openToExternalMissions: false,
                              skills: [],
                              availability: []
                            };

                            // Sauvegarder en Firebase
                            await setDoc(doc(db, 'teams', teamId, 'staff', userId), newStaffMember);

                            // Mettre à jour l'état local
                            setAppState((prev: AppState) => ({
                              ...prev,
                              staff: [...prev.staff, newStaffMember]
                            }));
                          }

                          alert(`Rôle utilisateur mis à jour avec succès. ${user.firstName} ${user.lastName} a été ajouté aux ${newUserRole === UserRole.COUREUR ? 'coureurs' : 'staff'}.`);
                        } catch (error) {
                          let errorMessage = 'Erreur lors de la mise à jour du rôle';
                          
                          if (error instanceof Error) {
                            if (error.message.includes('permission-denied')) {
                              errorMessage = 'Permission refusée. Vérifiez vos droits d\'administrateur.';
                            } else if (error.message.includes('not-found')) {
                              errorMessage = 'Utilisateur introuvable.';
                            } else {
                              errorMessage = `Erreur: ${error.message}`;
                            }
                          }
                          
                          alert(errorMessage);
                        }
                      }}
                      onUpdatePermissionRole={async (userId, newPermissionRole) => {
                        try {
                          // Mettre à jour le rôle de permission
                          const userRef = doc(db, 'users', userId);
                          await updateDoc(userRef, {
                            permissionRole: newPermissionRole,
                            updatedAt: new Date().toISOString()
                          });

                          // Mettre à jour l'état local
                          setAppState((prev: AppState) => ({
                            ...prev,
                            users: prev.users.map(u => 
                              u.id === userId 
                                ? { ...u, permissionRole: newPermissionRole }
                                : u
                            )
                          }));

                          alert('Rôle de permission mis à jour avec succès');
                        } catch (error) {
                          console.error('Erreur lors de la mise à jour des permissions:', error);
                          alert('Erreur lors de la mise à jour des permissions');
                        }
                      }}
                      onUpdateUserCustomPermissions={async (userId, newEffectivePermissions) => {
                        const userDocRef = doc(db, "users", userId);
                        await setDoc(
                          userDocRef,
                          { customPermissions: newEffectivePermissions },
                          { merge: true }
                        );
                        setAppState((prev) => ({
                          ...prev,
                          users: prev.users.map((u) =>
                            u.id === userId
                              ? { ...u, customPermissions: newEffectivePermissions }
                              : u
                          ),
                        }));
                      }}
                      onTransferUser={async (userId, fromTeamId, toTeamId) => {
                        try {
                          const user = appState.users.find(u => u.id === userId);
                          if (!user) return;

                          if (window.confirm(`Transférer ${user.firstName} ${user.lastName} vers l'autre équipe ?`)) {
                            // Mettre à jour l'utilisateur
                            const userRef = doc(db, 'users', userId);
                            await updateDoc(userRef, {
                              teamId: toTeamId,
                              updatedAt: new Date().toISOString()
                            });

                            // Supprimer l'ancienne adhésion
                            const oldMembership = appState.teamMemberships.find(m => m.userId === userId && m.teamId === fromTeamId);
                            if (oldMembership) {
                              await deleteDoc(doc(db, 'teamMemberships', oldMembership.id));
                            }

                            // Créer la nouvelle adhésion
                            const newMembership: TeamMembership = {
                              id: generateId(),
                              userId,
                              email: user.email,
                              teamId: toTeamId,
                              status: TeamMembershipStatus.ACTIVE,
                              requestedAt: new Date().toISOString(),
                              requestedBy: currentUser.id,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              message: 'Transfert automatique'
                            };

                            await addDoc(collection(db, 'teamMemberships'), newMembership);

                            // Mettre à jour l'état local
                            setAppState((prev: AppState) => ({
                              ...prev,
                              users: prev.users.map(u => 
                                u.id === userId 
                                  ? { ...u, teamId: toTeamId }
                                  : u
                              ),
                              teamMemberships: [
                                ...prev.teamMemberships.filter(m => m.id !== oldMembership?.id),
                                newMembership
                              ]
                            }));

                            alert('Utilisateur transféré avec succès');
                          }
                        } catch (error) {
                          console.error('Erreur lors du transfert:', error);
                          alert('Erreur lors du transfert de l\'utilisateur');
                        }
                      }}
                    />
                  )}
                  {currentSection === "permissions" && (
                    <PermissionsSection
                      permissions={appState.permissions}
                      permissionRoles={appState.permissionRoles}
                      onSavePermissions={async (permissions) => {
                        const permissionsDocRef = doc(
                          db,
                          "permissions",
                          "default"
                        );
                        await setDoc(permissionsDocRef, permissions);
                        setAppState((prev) => ({ ...prev, permissions }));
                      }}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "career" && currentUser && (
                    <CareerSection
                      riders={appState.riders}
                      staff={appState.staff}
                      currentUser={currentUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      setStaff={createBatchSetHandler<StaffMember>("staff")}
                      teams={appState.teams}
                      currentTeamId={appState.activeTeamId}
                      teamMemberships={appState.teamMemberships || []}
                      onRequestTransfer={async (destinationTeamId: string) => {
                        // TODO: Implémenter la logique de demande de transfert
                      }}
                      scoutingRequests={appState.scoutingRequests || []}
                      onRespondToScoutingRequest={async (requestId: string, response: 'accepted' | 'rejected') => {
                        // TODO: Implémenter la logique de réponse aux demandes de suivi
                      }}
                      onUpdateVisibility={async (updates: { isSearchable?: boolean; openToMissions?: boolean; }) => {
                        try {
                          if (!currentUser) return;
                          
                          // Mettre à jour l'utilisateur dans la collection globale
                          if (updates.isSearchable !== undefined) {
                            const userRef = doc(db, 'users', currentUser.id);
                            await updateDoc(userRef, {
                              isSearchable: updates.isSearchable,
                              updatedAt: new Date().toISOString()
                            });
                            
                            // Mettre à jour l'état local des utilisateurs
                            setAppState((prev: AppState) => ({
                              ...prev,
                              users: prev.users.map(u => 
                                u.id === currentUser.id 
                                  ? { ...u, isSearchable: updates.isSearchable }
                                  : u
                              )
                            }));
                          }
                          
                          // Mettre à jour le profil coureur si c'est un coureur
                          if (currentUser.userRole === UserRole.COUREUR && updates.isSearchable !== undefined) {
                            const riderProfile = appState.riders.find(r => r.email === currentUser.email);
                            if (riderProfile) {
                              const riderRef = doc(db, 'teams', appState.activeTeamId!, 'riders', riderProfile.id);
                              await updateDoc(riderRef, {
                                isSearchable: updates.isSearchable,
                                updatedAt: new Date().toISOString()
                              });
                              
                              // Mettre à jour l'état local des coureurs
                              setAppState((prev: AppState) => ({
                                ...prev,
                                riders: prev.riders.map(r => 
                                  r.id === riderProfile.id 
                                    ? { ...r, isSearchable: updates.isSearchable }
                                    : r
                                )
                              }));
                            }
                          }
                          
                          // Mettre à jour le profil staff si c'est un membre du staff
                          if (currentUser.userRole !== UserRole.COUREUR && updates.openToMissions !== undefined) {
                            const staffProfile = appState.staff.find(s => s.email === currentUser.email);
                            if (staffProfile) {
                              const staffRef = doc(db, 'teams', appState.activeTeamId!, 'staff', staffProfile.id);
                              await updateDoc(staffRef, {
                                openToExternalMissions: updates.openToMissions,
                                updatedAt: new Date().toISOString()
                              });
                              
                              // Mettre à jour l'état local du staff
                              setAppState((prev: AppState) => ({
                                ...prev,
                                staff: prev.staff.map(s => 
                                  s.id === staffProfile.id 
                                    ? { ...s, openToExternalMissions: updates.openToMissions }
                                    : s
                                )
                              }));
                            }
                          }
                          
                        } catch (error) {
                          console.error("❌ Erreur lors de la mise à jour de la visibilité:", error);
                          alert("Erreur lors de la mise à jour de la visibilité. Veuillez réessayer.");
                        }
                      }}
                    />
                  )}
                  {currentSection === "nutrition" && (
                    <NutritionSection
                      rider={appState.riders.find((r) => r.email === currentUser.email)}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={onSaveRider}
                      teamProducts={appState.teamProducts}
                      setTeamProducts={createBatchSetHandler<TeamProduct>("teamProducts")}
                    />
                  )}
                  {currentSection === "userSettings" && currentUser && (
                    <UserSettingsSection
                      currentUser={currentUser}
                      riderProfile={appState.riders.find((r) => r.email === currentUser.email)}
                      staffProfile={appState.staff.find((s) => s.email === currentUser.email)}
                    />
                  )}
                  {currentSection === "riderEquipment" && (
                    <RiderEquipmentSection
                      riders={appState.riders}
                      equipment={appState.equipment}
                      currentUser={currentUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                    />
                  )}
                  
                  {/* Nouvelles sections pour le back-office coureur */}
                  {currentSection === "myProfile" && currentUser && (
                    <MyProfileSection
                      riders={appState.riders}
                      staff={appState.staff}
                      currentUser={currentUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={onSaveRider}
                      setStaff={createBatchSetHandler<StaffMember>("staff")}
                      onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
                      currentTeam={appState.teams.find(team => team.id === appState.activeTeamId)}
                      raceEvents={appState.raceEvents}
                      riderEventSelections={appState.riderEventSelections}
                      setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                      appState={appState}
                    />
                  )}
                  {currentSection === "myCalendar" && currentUser && (
                    <MyCalendarSection
                      riders={appState.riders}
                      currentUser={currentUser}
                      raceEvents={appState.raceEvents}
                      riderEventSelections={appState.riderEventSelections}
                      setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                      effectivePermissions={appState.effectivePermissions}
                      navigateTo={navigateTo}
                    />
                  )}
                  {currentSection === "talentAvailability" && currentUser && (
                    <TalentAvailabilitySection
                      riders={appState.riders}
                      raceEvents={appState.raceEvents}
                      riderEventSelections={appState.riderEventSelections}
                      currentUser={currentUser}
                      effectivePermissions={appState.effectivePermissions}
                    />
                  )}
                  {currentSection === "myResults" && currentUser && (
                    <MyResultsSection
                      riders={appState.riders}
                      currentUser={currentUser}
                    />
                  )}
                  {currentSection === "bikeSetup" && currentUser && (
                    <BikeSetupSection
                      riders={appState.riders}
                      currentUser={currentUser}
                    />
                  )}
                  {currentSection === "myCareer" && currentUser && (
                    <MyCareerSection
                      riders={appState.riders}
                      currentUser={currentUser}
                      onSaveRider={onSaveRider}
                      teams={appState.teams}
                      raceEvents={appState.raceEvents}
                      scoutingProfiles={appState.scoutingProfiles}
                      onUpdateScoutingProfile={createBatchSetHandler<ScoutingProfile>("scoutingProfiles")}
                    />
                  )}
                  {currentSection === "adminDossier" && currentUser && (
                    <MyAdminSection
                      riders={appState.riders}
                      currentUser={currentUser}
                      raceEvents={appState.raceEvents}
                      riderEventSelections={appState.riderEventSelections}
                      onSaveRider={onSaveRider}
                      onUpdateRiderPreference={handleUpdateRiderPreference}
                      appState={appState}
                      effectivePermissions={appState.effectivePermissions}
                    />
                  )}
                  {currentSection === "superAdmin" && currentUser && (
                    <SuperAdminSection
                      riders={appState.riders}
                      staff={appState.staff}
                      currentUser={currentUser}
                      onDeleteRider={onDeleteRider}
                      onDeleteStaff={onDeleteStaff}
                      appState={appState}
                    />
                  )}
                  {currentSection === "myTrips" && (
                    <MyTripsSection
                      riders={appState.riders}
                      staff={appState.staff}
                      eventTransportLegs={appState.eventTransportLegs}
                      raceEvents={appState.raceEvents}
                      currentUser={currentUser}
                    />
                  )}
                  {currentSection === "stocks" && appState.stockItems && (
                    <StocksSection
                      stockItems={appState.stockItems}
                      onSaveStockItem={onSaveStockItem}
                      onDeleteStockItem={onDeleteStockItem}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "checklist" && (
                    <ChecklistSection
                      checklistTemplates={appState.checklistTemplates}
                      onSaveChecklistTemplate={onSaveChecklistTemplate}
                      onDeleteChecklistTemplate={onDeleteChecklistTemplate}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "missionSearch" && (
                    <MissionSearchSection
                      riders={appState.riders}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "automatedPerformanceProfile" && (
                    <AutomatedPerformanceProfileSection
                      rider={appState.riders.find((r) => r.email === currentUser.email)}
                    />
                  )}
                  {currentSection === "performanceProject" && (
                    <PerformanceProjectSection
                      rider={appState.riders.find((r) => r.email === currentUser.email)}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={onSaveRider}
                    />
                  )}
                    </>
                  )}
                </div>
              )}
            </main>
          </div>
        </LanguageProvider>
      );
    }
    // Fallback final : éviter l'écran blanc (ex. état incohérent)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8">
          <p className="text-gray-600 mb-4">Chargement de l'application...</p>
          <button
            type="button"
            onClick={() => { setView("login"); setCurrentUser(null); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  };

  return <>{renderContent()}</>;
};

export default App;


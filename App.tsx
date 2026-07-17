import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type EventDetailTab } from "./EventDetailView";
import {
  DEFAULT_THEME_ACCENT_COLOR,
  DEFAULT_THEME_PRIMARY_COLOR,
  getInitialGlobalState,
  getInitialTeamState,
  LANGUAGE_OPTIONS,
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
  ExpenseReceipt,
  TeamSepaSettings,
  TeamInvoiceSettings,
  EventChecklistItem,
  PeerRating,
  RiderSelfDebrief,
  RaceEvent,
  Rider,
  RiderEventSelection,
  RiderEventPreference,
  RiderEventStatus,
  ScoutingProfile,
  RiderQualitativeProfile,
  DisciplinePracticed,
  StaffMember,
  StaffRole,
  StaffStatus,
  StaffEventSelection,
  MeetingReport,
  StockItem,
  EquipmentStockItem,
  ClientRecord,
  SupplierInvoice,
  SepaBatch,
  BankTransaction,
  Organization,
  OrganizerContact,
  PartnerAccess,
  PartnerMarketplaceProfile,
  TeamSponsorshipNeed,
  PartnershipMatchRequest,
  PartnershipMatchStatus,
  PartnerNewsletter,
  Quote,
  TeamProduct,
  Mission,
  TeamLevel,
  TeamOperationalSettings,
  TeamRecruitmentTarget,
  SubscriptionPlanId,
  TeamMembershipStatus,
  TeamMembership,
  TeamRole,
  TeamState,
  User,
  UserRole,
  Vehicle,
  PermissionLevel,
  // Enums pour les coureurs
  FormeStatus,
  MoralStatus,
  HealthCondition,
  BikeType,
  PerformanceFactorDetail,
  BikeSetup,
  // Types pour l'historique PPR
  PowerProfileHistoryEntry,
  PowerProfileHistory,
  PowerProfile,
  ScoutingRequestStatus,
  ProspectLevel,
  ScoutingDataScope,
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
import { addRiderToSeasonArchive } from "./utils/performanceArchiveUtils";
import { getCurrentSeasonYear } from "./utils/seasonUtils";
import {
  getRecommendedOperationalSettings,
  normalizeOperationalSettings,
} from "./utils/teamOperationalUtils";
import {
  canRiderApplyToTeam,
  getMarketMismatchMessage,
  resolveRiderMarketSegmentFromUser,
  teamAcceptsRiderApplications,
} from "./utils/riderTeamMarketSegment";
import { buildDefaultRider, buildDefaultStaffMember } from "./utils/defaultTeamMemberProfiles";
import { getStaffMemberForUser } from "./utils/staffMemberUtils";


import MobileShell from "./components/mobile/MobileShell";
import { useUserNotifications } from "./hooks/useUserNotifications";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import SectionWrapper from "./components/SectionWrapper";
import { isSponsorshipIncome } from "./utils/financialUtils";
import { LanguageProvider } from "./contexts/LanguageContext";
import { translations, TranslationKey } from "./translations";
import LoginView from "./sections/LoginView";
import NoTeamView from "./sections/NoTeamView";
import PartnerLobbyView from "./sections/PartnerLobbyView";
import PendingApprovalView from "./sections/PendingApprovalView";
import SignupView, { SignupData } from "./sections/SignupView";
import {
  SectionSuspense,
  LazyEventDetailView,
  LazyAdminDossierSection,
  LazyAdminDashboardSection,
  LazySuperAdminSection,
  LazyAutomatedPerformanceProfileSection,
  LazyCareerSection,
  LazyChecklistSection,
  LazyEquipmentSection,
  LazyEventsSection,
  LazyFinancialSection,
  LazyExpenseReceiptsSection,
  LazyMissionSearchSection,
  LazyTeamSearchSection,
  LazyMyTripsSection,
  LazyNutritionSection,
  LazyPerformanceProjectSection,
  LazyPerformanceSection,
  LazyMyPerformanceSection,
  LazyPerformancePoleSection,
  LazyTeamAccessSection,
  LazyRiderEquipmentSection,
  LazyRosterSection,
  LazySeasonPlanningSection,
  LazyScoutingSection,
  LazyStaffSection,
  LazyStocksSection,
  LazyAccommodationHistorySection,
  LazyUserSettingsSection,
  LazyVehiclesSection,
  LazyMyDashboardSection,
  LazyMyProfileSection,
  LazyMyCalendarSection,
  LazyIndependentStaffCalendarSection,
  LazyIndependentAthleteCalendarSection,
  LazyMyResultsSection,
  LazyMyCareerSection,
  LazyMyAdminSection,
  LazyIndependentSpaceSection,
  LazyIndependentDashboardSection,
  LazyPricingSection,
  LazyOrganizationDashboardSection,
  LazyPartnerPortalSection,
} from "./sections/lazySections";
import { getContrastYIQ, generateId, lightenDarkenColor } from "./utils/themeUtils";
import { isIndependentUser, userToRiderProfile, userToStaffProfile, resolveRiderForUser, riderProfileToUserUpdates, resolveStaffForUser, staffProfileToUserUpdates } from "./utils/independentUtils";
import { buildDemoAcceptedMissionsForUser } from "./constants/demoMissions";
import { isSuperAdminUser, resolveSuperAdminTeamId } from "./utils/superAdminUtils";
import StageCampPerformancePanel from "./components/performance/StageCampPerformancePanel";
import { enrichIncomeWithAccounting } from "./utils/invoiceUtils";
import { enrichBudgetWithAccounting } from "./utils/accountingEntryUtils";
import { persistActiveTeamId, restoreActiveTeamId, resolveOrganizationForUser, canViewOrgDashboard } from "./utils/organizationUtils";
import { resolvePartnerPortalSession, resolvePartnerTeamId, getPartnerUserTeamPatch, isPartnerUser, isSectionAllowedForPartner } from "./utils/partnerAccessUtils";
import { prepareDemoPartnerInstall } from "./utils/demoPartnerUtils";
import {
  installDemoPresentationTeam,
  teamAlreadyHasDemoPresentation,
} from "./utils/demoTeamSeedUtils";
import {
  DEMO_PRES_LEVEL,
  DEMO_PRES_TEAM_NAME,
} from "./constants/demoPresentationTeam";
import {
  isCoureurUser,
  isSectionAllowedForCoureur,
  resolveScopedAppStateForUser,
  scopeAppStateForCoureur,
  getOwnRider,
} from "./utils/riderAccessUtils";
import { consumeNolioOAuthState, exchangeNolioCode } from "./services/nolioService";
import {
  buildPreviewUser,
  loadSuperAdminPreview,
  normalizeSuperAdminPreview,
  saveSuperAdminPreview,
  SuperAdminPreviewConfig,
  DEFAULT_SUPER_ADMIN_PREVIEW,
  canAccessHoldingDashboard,
  isIndependentPreviewMode,
} from "./utils/superAdminPreview";
import { activateIndependentProfile, saveIndependentProfile } from "./services/independentProfileService";
import SeasonTransitionManager from "./components/SeasonTransitionManager";
import {
  buildOrganizerContactsFromEvents,
  mergeOrganizerContactDirectories,
  mergeOrganizerContactList,
  upsertOrganizerContactFromEvent,
} from "./utils/organizerContactUtils";
import { mergeDemoOrganizerContacts } from "./constants/demoOrganizerContacts";
import SubscriptionBanner from "./components/SubscriptionBanner";
import { getDefaultPlanForTeamLevel, getIndependentPlanIdForRole } from "./constants/subscriptionPlans";
import {
  canAccessSection,
  getIndependentSubscriptionAccess,
  getLockedSections,
  getSubscriptionAccess,
  hasActiveIndependentSubscription,
} from "./utils/subscriptionEntitlements";
import {
  requestPlanUpgrade,
  createBillingPortalSession,
  requestIndependentPlanUpgrade,
  createIndependentBillingPortalSession,
} from "./services/billingService";
import { captureReferralFromUrl, getPendingReferralCode } from "./services/referralService";
import { processPendingInvitesOnLogin } from "./services/inviteService";

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
function getSafeDisciplinePracticed(discipline: string): DisciplinePracticed {
  try {
    if (discipline === "Route" && DisciplinePracticed.ROUTE) {
      return DisciplinePracticed.ROUTE;
    }
  } catch {
    // ignore
  }
  return DisciplinePracticed.ROUTE;
}

function getSafeFormeStatus(status: string): FormeStatus {
  try {
    if (status === "Bonne" && FormeStatus.BON) return FormeStatus.BON;
  } catch {
    // ignore
  }
  return FormeStatus.BON;
}

function getSafeMoralStatus(status: string): MoralStatus {
  try {
    if (status === "Bon" && MoralStatus.BON) return MoralStatus.BON;
  } catch {
    // ignore
  }
  return MoralStatus.BON;
}

function getSafeHealthCondition(condition: string): HealthCondition {
  try {
    if (typeof HealthCondition !== 'undefined' && HealthCondition.PRET_A_COURIR) {
      return HealthCondition.PRET_A_COURIR;
    }
  } catch {
    // ignore
  }
  return HealthCondition.PRET_A_COURIR;
}

function getSafeBikeType(type: string): BikeType {
  try {
    if (type === "Route" && BikeType.ROUTE) return BikeType.ROUTE;
    if (type === "Contre-la-montre" && BikeType.CONTRE_LA_MONTRE) return BikeType.CONTRE_LA_MONTRE;
  } catch {
    // ignore
  }
  return BikeType.ROUTE;
}

const emptyPerformanceFactor = (): PerformanceFactorDetail => ({
  forces: '',
  aOptimiser: '',
  aDevelopper: '',
  besoinsActions: '',
});

const emptyBikeSetup = (bikeType: BikeType): BikeSetup => ({
  specifics: {},
  cotes: {},
  bikeType,
  size: '',
  brand: '',
  model: '',
});

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
    "login" | "signup" | "app" | "pending" | "no_team" | "partner_lobby" | "load_error" | "pricing"
  >("login");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingSignupData, setPendingSignupData] = useState<SignupData | null>(null); // Nouvel état pour stocker les données d'inscription
  const pendingSignupDataRef = useRef<SignupData | null>(null); // Référence pour éviter les problèmes de closure
  const isMountedRef = useRef(true);

  const [language, setLanguageState] = useState<"fr" | "en">(() => {
    try {
      const saved = localStorage.getItem("logicycle_lang");
      if (saved === "en" || saved === "fr") return saved;
    } catch {
      /* ignore */
    }
    return "fr";
  });
  const [superAdminPreview, setSuperAdminPreview] = useState<SuperAdminPreviewConfig>(loadSuperAdminPreview);
  const [receiptScanDefaults, setReceiptScanDefaults] = useState<{
    eventId?: string;
    transportLegId?: string;
    openScanner?: boolean;
  }>({});
  const [partnerPortalPreviewIncomeId, setPartnerPortalPreviewIncomeId] = useState<string | null>(null);

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.en || key;
  };

  const setLanguage = (lang?: "fr" | "en") => {
    if (!lang) return;
    setLanguageState(lang);
    setAppState((prev) => (prev ? { ...prev, language: lang } : prev));
    try {
      localStorage.setItem("logicycle_lang", lang);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { completeMagicLinkSignInIfPresent } = await import('./services/inviteService');
        await completeMagicLinkSignInIfPresent();
      } catch (err) {
        console.warn('Lien magique invitation:', err);
      }
    })();
  }, []);

  useEffect(() => {
    saveSuperAdminPreview(superAdminPreview);
  }, [superAdminPreview]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !currentUser) return;

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    if (!consumeNolioOAuthState(state)) return;

    void (async () => {
      try {
        await exchangeNolioCode(code, redirectUri);
        window.history.replaceState({}, '', window.location.pathname);
        setCurrentSection('myCareer');
      } catch (err) {
        console.error('Nolio OAuth:', err);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isSuperAdminUser(currentUser)) return;
    setSuperAdminPreview((prev) =>
      normalizeSuperAdminPreview(prev, appState.riders, appState.staff, appState.incomeItems || [])
    );
  }, [appState.activeTeamId, appState.riders, appState.staff, appState.incomeItems, currentUser]);

  useEffect(() => {
    if (!currentUser || !isSuperAdminUser(currentUser)) return;
    if (superAdminPreview.mode !== 'partenaire' || view !== 'app') return;
    setCurrentSection('partnerPortal');
  }, [superAdminPreview.mode, view, currentUser]);

  useEffect(() => {
    if (!currentUser || !isSuperAdminUser(currentUser)) return;
    if (!isIndependentPreviewMode(superAdminPreview.mode) || view !== 'app') return;
    setCurrentSection('myDashboard');
  }, [superAdminPreview.mode, view, currentUser]);

  useEffect(() => {
    if (view !== 'app' || !currentUser) return;
    if (currentSection !== 'adminDossier') return;
    const isStaffNav =
      currentUser.userRole === UserRole.STAFF ||
      currentUser.userRole === UserRole.MANAGER ||
      Boolean(getStaffMemberForUser(currentUser, appState.staff));
    if (isStaffNav && currentUser.userRole !== UserRole.COUREUR) {
      setCurrentSection('myProfile');
    }
  }, [view, currentUser, currentSection, appState.staff]);

  useEffect(() => {
    if (view !== 'app' || !currentUser || currentUser.userRole !== UserRole.PARTNER) return;
    if (currentSection === 'partnerPortal') return;
    const session = resolvePartnerPortalSession({
      partnerAccesses: appState.partnerAccesses || [],
      userId: currentUser.id,
      userEmail: currentUser.email,
      teamId: appState.activeTeamId,
      incomeItems: appState.incomeItems || [],
      userRole: currentUser.userRole,
      permissionRole: currentUser.permissionRole,
    });
    if (session.access) {
      setCurrentSection('partnerPortal');
    }
  }, [
    view,
    currentUser,
    currentSection,
    appState.activeTeamId,
    appState.partnerAccesses,
    appState.incomeItems,
  ]);

  const displayUser = useMemo(() => {
    if (!currentUser) return null;
    if (!isSuperAdminUser(currentUser) || superAdminPreview.mode === "full") {
      return currentUser;
    }
    return buildPreviewUser(currentUser, superAdminPreview, {
      riders: appState.riders,
      staff: appState.staff,
      users: appState.users,
      incomeItems: appState.incomeItems || [],
    });
  }, [currentUser, superAdminPreview, appState.riders, appState.staff, appState.users, appState.incomeItems]);

  const loadDataForUser = useCallback(async (user: User) => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const globalData = await firebaseService.getGlobalData();
      if (!isMountedRef.current) return;
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
        const storedTeamId = restoreActiveTeamId();
        if (
          storedTeamId &&
          userMemberships.some(
            (m) => m.teamId === storedTeamId && m.status === TeamMembershipStatus.ACTIVE
          )
        ) {
          finalActiveTeamId = storedTeamId;
        }
      } 
      // Si pas de membership mais l'utilisateur a un teamId (cas après création d'équipe)
      else if (user.teamId) {
        finalActiveTeamId = user.teamId;
      }
      // Compte partenaire invité : charger l'équipe liée au partenariat
      else if (user.userRole === UserRole.PARTNER) {
        const partnerTeamId = resolvePartnerTeamId({
          partnerAccesses: globalData.partnerAccesses || [],
          userId: user.id,
          userEmail: user.email,
        });
        if (partnerTeamId) {
          finalActiveTeamId = partnerTeamId;
        }
      }

      if (isSuperAdminUser(user)) {
        finalActiveTeamId = resolveSuperAdminTeamId(
          user,
          globalData.teams || [],
          finalActiveTeamId
        );
      }

      let activeUser = user;
      if (
        finalActiveTeamId
        && user.userRole === UserRole.PARTNER
        && user.teamId !== finalActiveTeamId
      ) {
        const teamPatch = getPartnerUserTeamPatch(user, finalActiveTeamId);
        if (teamPatch) {
          try {
            await firebaseService.updateUserProfile(user.id, teamPatch);
            activeUser = { ...user, ...teamPatch };
          } catch (syncError) {
            console.warn('Synchronisation teamId partenaire:', syncError);
          }
        }
      }

      if (finalActiveTeamId) {
        teamData = await firebaseService.getTeamData(finalActiveTeamId, activeUser);
        if (!isMountedRef.current) return;
        setView("app");
        if (user.userRole === UserRole.PARTNER) {
          setCurrentSection("partnerPortal");
        }
      } else if (
        userMemberships.some((m) => m.status === TeamMembershipStatus.PENDING)
      ) {
        setView("pending");
      } else if (isSuperAdminUser(user)) {
        if (!isMountedRef.current) return;
        setView("app");
      } else if (isIndependentUser(user)) {
        const globalMissions = await firebaseService.getOpenMissionsGlobal();
        teamData = { ...getInitialTeamState(), missions: globalMissions };
        if (!isMountedRef.current) return;
        setView("app");
        setCurrentSection("myDashboard");
      } else if (user.userRole === UserRole.PARTNER) {
        setView("partner_lobby");
      } else {
        setView("no_team");
      }

      if (activeUser.id === user.id && activeUser.teamId !== user.teamId) {
        setCurrentUser(activeUser);
      }

      const openRecruitmentOffers = await firebaseService.getOpenRecruitmentOffersGlobal();

      setAppState({
        ...getInitialGlobalState(),
        ...getInitialTeamState(),
        ...globalData,
        ...teamData,
        openRecruitmentOffers,
        operationalSettings: normalizeOperationalSettings(
          teamData.teamLevel as TeamLevel | undefined,
          teamData.operationalSettings as TeamOperationalSettings | undefined
        ),
        activeEventId: null, // Reset event detail view on user/team change
        activeTeamId: finalActiveTeamId,
        users: (globalData.users || []).map((u) =>
          u.id === activeUser.id ? { ...u, ...activeUser } : u,
        ),
      });

      setLanguageState(teamData.language || "fr");
    } catch (error: unknown) {
      console.error("Erreur lors du chargement des données utilisateur:", error);
      const message = error instanceof Error ? error.message : "Erreur de chargement. Vérifiez votre connexion et réessayez.";
      if (isMountedRef.current) {
        setLoadError(message);
        setView("load_error");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (!isMountedRef.current) return;
      try {
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
              return;
            }
          }

          if (userProfile) {
            if (firebaseUser.email) {
              try {
                const activated = await processPendingInvitesOnLogin(
                  firebaseUser.uid,
                  firebaseUser.email
                );
                if (activated > 0) {
                  userProfile = await firebaseService.getUserProfile(firebaseUser.uid);
                }
              } catch (inviteError) {
                console.warn('Traitement des invitations:', inviteError);
              }
            }

            if (!userProfile) return;
            setCurrentUser(userProfile);
            await loadDataForUser(userProfile); // This will set loading to false
            if (!isMountedRef.current) return;
            // Redirection automatique vers le tableau de bord administrateur pour les admins
            if (userProfile.permissionRole === TeamRole.ADMIN || userProfile.userRole === UserRole.MANAGER) {
              setCurrentSection("myDashboard"); // myDashboard affichera automatiquement LazyAdminDashboardSection
            }
          } else {
            // This case should ideally not be reached if profile creation is successful.
            await signOut(auth); // Log out to prevent inconsistent state
          }
        } else {
          if (!isMountedRef.current) return;
          setCurrentUser(null);
          setAppState({
            ...getInitialGlobalState(),
            ...getInitialTeamState(),
            activeEventId: null,
            activeTeamId: null,
          });
          setView("login");
        }
      } catch (error: unknown) {
        console.error("Erreur lors de la vérification de l'authentification:", error);
        const message = error instanceof Error
          ? error.message
          : "Erreur de connexion. Vérifiez votre connexion et réessayez.";
        alert(message);
        try {
          await signOut(auth);
        } catch {
          // ignore
        }
        if (isMountedRef.current) {
          setCurrentUser(null);
          setView("login");
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
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
    document.body.style.backgroundColor = '#020617';
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
        const collection = prev.riders || [];
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
      const season = getCurrentSeasonYear();
      const updatedArchives = addRiderToSeasonArchive(
        appState.performanceArchives || [],
        item,
        appState.performanceEntries || [],
        season
      );
      const archiveToSave = updatedArchives.find(a => a.season === season);
      if (archiveToSave) {
        await firebaseService.saveData(
          appState.activeTeamId,
          'performanceArchives',
          archiveToSave
        );
      }

      await firebaseService.deleteData(
        appState.activeTeamId,
        "riders",
        item.id
      );

      setAppState((prev: AppState) => {
        const collection = prev.riders || [];
        const newRiders = collection.filter((i: Rider) => i.id !== item.id);
        return {
          ...prev,
          riders: newRiders,
          performanceArchives: updatedArchives,
        };
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw error;
    }
  }, [appState.activeTeamId, appState.performanceArchives, appState.performanceEntries]);

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
        const collection = prev.staff || [];
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
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "staff",
        item.id
      );

      setAppState((prev: AppState) => {
        const collection = prev.staff || [];
        return {
          ...prev,
          staff: collection.filter((i: StaffMember) => i.id !== item.id),
        };
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du staff:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveMeetingReport = useCallback(async (item: MeetingReport) => {
    if (!appState.activeTeamId) return;
    try {
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
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du compte rendu:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onDeleteMeetingReport = useCallback(async (item: MeetingReport) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
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
    } catch (error) {
      console.error("Erreur lors de la suppression du compte rendu:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveVehicle = useCallback(async (item: Vehicle) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "vehicles",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };

      setAppState((prev: AppState) => {
        const collection = prev.vehicles || [];
        const exists = collection.some((i: Vehicle) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: Vehicle) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, vehicles: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du véhicule:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onDeleteVehicle = useCallback(async (item: Vehicle) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "vehicles",
        item.id
      );

      setAppState((prev: AppState) => {
        const collection = prev.vehicles || [];
        return {
          ...prev,
          vehicles: collection.filter((i: Vehicle) => i.id !== item.id),
        };
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du véhicule:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveEquipment = useCallback(async (item: EquipmentItem) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "equipment",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };

      setAppState((prev: AppState) => {
        const collection = prev.equipment || [];
        const exists = collection.some((i: EquipmentItem) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: EquipmentItem) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, equipment: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'équipement:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onDeleteEquipment = useCallback(async (item: EquipmentItem) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "equipment",
        item.id
      );

      setAppState((prev: AppState) => {
        const collection = prev.equipment || [];
        return {
          ...prev,
          equipment: collection.filter((i: EquipmentItem) => i.id !== item.id),
        };
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'équipement:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveRaceEvent = useCallback(async (item: RaceEvent) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "raceEvents",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };

      setAppState((prev: AppState) => {
        const collection = prev.raceEvents || [];
        const exists = collection.some((i: RaceEvent) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: RaceEvent) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];

        let organizerContacts = prev.organizerContacts || [];
        const upserted = upsertOrganizerContactFromEvent(finalItem, organizerContacts);
        if (upserted) {
          organizerContacts = mergeOrganizerContactList(organizerContacts, upserted);
          firebaseService
            .saveData(appState.activeTeamId!, "organizerContacts", upserted)
            .catch((err) => console.warn("Sync contact organisateur:", err));
        }

        return { ...prev, raceEvents: newCollection, organizerContacts };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'événement:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveOrganizerContact = useCallback(async (contact: OrganizerContact) => {
    if (!appState.activeTeamId) return;
    try {
      await firebaseService.saveData(appState.activeTeamId, "organizerContacts", contact);
      setAppState((prev: AppState) => ({
        ...prev,
        organizerContacts: mergeOrganizerContactList(prev.organizerContacts || [], contact),
      }));
    } catch (error) {
      console.error("Erreur sauvegarde contact organisateur:", error);
    }
  }, [appState.activeTeamId]);

  const onSyncOrganizerContactsFromEvents = useCallback(async () => {
    if (!appState.activeTeamId) return;
    try {
      const fromEvents = buildOrganizerContactsFromEvents(appState.raceEvents || []);
      const merged = mergeOrganizerContactDirectories(
        appState.organizerContacts || [],
        fromEvents
      );
      for (const contact of merged) {
        await firebaseService.saveData(appState.activeTeamId, "organizerContacts", contact);
      }
      setAppState((prev: AppState) => ({
        ...prev,
        organizerContacts: merged,
      }));
    } catch (error) {
      console.error("Erreur sync contacts organisateurs:", error);
      alert("Erreur lors de la synchronisation des contacts organisateurs.");
    }
  }, [appState.activeTeamId, appState.raceEvents]);

  const onLoadDemoOrganizerExamples = useCallback(async () => {
    if (!appState.activeTeamId) return;
    try {
      const merged = mergeDemoOrganizerContacts(appState.organizerContacts || []);
      const existingIds = new Set((appState.organizerContacts || []).map((c) => c.id));
      for (const contact of merged) {
        if (!existingIds.has(contact.id)) {
          await firebaseService.saveData(appState.activeTeamId, "organizerContacts", contact);
        }
      }
      setAppState((prev: AppState) => ({
        ...prev,
        organizerContacts: merged,
      }));
    } catch (error) {
      console.error("Erreur chargement exemples candidatures:", error);
      alert("Impossible de charger les exemples de candidatures.");
    }
  }, [appState.activeTeamId, appState.organizerContacts]);

  const onDeleteRaceEvent = useCallback(async (item: RaceEvent) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "raceEvents",
        item.id
      );

      setAppState((prev: AppState) => {
        const collection = prev.raceEvents || [];
        return {
          ...prev,
          raceEvents: collection.filter((i: RaceEvent) => i.id !== item.id),
        };
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'événement:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSavePerformanceEntry = useCallback(async (item: PerformanceEntry) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "performanceEntries",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.performanceEntries || [];
        const exists = collection.some((i: PerformanceEntry) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: PerformanceEntry) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, performanceEntries: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la performance:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveRiderSelfDebrief = useCallback(async (item: RiderSelfDebrief) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        'riderSelfDebriefs',
        item,
      );
      const finalItem = { ...item, id: item.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.riderSelfDebriefs || [];
        const exists = collection.some((i) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, riderSelfDebriefs: newCollection };
      });
    } catch (error) {
      console.error('Erreur sauvegarde débriefing coureur:', error);
      throw error;
    }
  }, [appState.activeTeamId]);

  const onDeletePerformanceEntry = useCallback(async (item: PerformanceEntry) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "performanceEntries",
        item.id
      );
      setAppState((prev: AppState) => ({
        ...prev,
        performanceEntries: prev.performanceEntries.filter((i: PerformanceEntry) => i.id !== item.id),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression de la performance:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);


  const onSaveIncomeItem = useCallback(async (item: IncomeItem) => {
    if (!appState.activeTeamId) return;
    try {
      const enriched = enrichIncomeWithAccounting(
        item,
        appState.language || 'fr',
        appState.invoiceSettings?.defaultVatRate
      );
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "incomeItems",
        enriched
      );
      const finalItem = { ...enriched, id: enriched.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.incomeItems || [];
        const exists = collection.some((i: IncomeItem) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: IncomeItem) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, incomeItems: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du revenu:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId, appState.language, appState.invoiceSettings?.defaultVatRate]);

  const onDeleteIncomeItem = useCallback(async (item: IncomeItem) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "incomeItems",
        item.id
      );
      setAppState((prev: AppState) => ({
        ...prev,
        incomeItems: (prev.incomeItems || []).filter((i: IncomeItem) => i.id !== item.id),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression du revenu:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSavePartnerNewsletter = useCallback(async (newsletter: PartnerNewsletter) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        'partnerNewsletters',
        newsletter,
      );
      const finalNewsletter = { ...newsletter, id: newsletter.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.partnerNewsletters || [];
        const exists = collection.some((n) => n.id === finalNewsletter.id);
        const next = exists
          ? collection.map((n) => (n.id === finalNewsletter.id ? finalNewsletter : n))
          : [...collection, finalNewsletter];
        return { ...prev, partnerNewsletters: next };
      });
    } catch (error) {
      console.error('Erreur sauvegarde newsletter partenaire:', error);
      throw error;
    }
  }, [appState.activeTeamId]);

  const onSavePartnerAccess = useCallback(async (access: PartnerAccess) => {
    try {
      const payload = {
        ...access,
        id: access.id?.startsWith('preview-') ? undefined : access.id,
      };
      const savedId = await firebaseService.saveGlobalData('partnerAccesses', payload);
      const finalAccess = { ...access, id: savedId };
      setAppState((prev: AppState) => {
        const existing = prev.partnerAccesses || [];
        const withoutDup = existing.filter(
          (a) => !(a.userId === finalAccess.userId && a.incomeItemId === finalAccess.incomeItemId),
        );
        return {
          ...prev,
          partnerAccesses: [...withoutDup.filter((a) => a.id !== savedId), finalAccess],
        };
      });
      const invitedUser = (appState.users || []).find((u) => u.id === finalAccess.userId);
      if (invitedUser && invitedUser.teamId !== finalAccess.teamId) {
        try {
          await firebaseService.updateUserProfile(finalAccess.userId, { teamId: finalAccess.teamId });
          setAppState((prev: AppState) => ({
            ...prev,
            users: (prev.users || []).map((u) =>
              u.id === finalAccess.userId ? { ...u, teamId: finalAccess.teamId } : u,
            ),
          }));
        } catch (linkError) {
          console.warn('Liaison teamId partenaire invité:', linkError);
        }
      }
      return savedId;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'accès partenaire:', error);
      throw error;
    }
  }, [appState.users]);

  const onRevokePartnerAccess = useCallback(async (accessId: string) => {
    try {
      await firebaseService.deleteGlobalData('partnerAccesses', accessId);
      setAppState((prev: AppState) => ({
        ...prev,
        partnerAccesses: (prev.partnerAccesses || []).filter((a) => a.id !== accessId),
      }));
    } catch (error) {
      console.error('Erreur lors de la révocation de l\'accès partenaire:', error);
      throw error;
    }
  }, []);

  const onSavePartnerMarketplaceProfile = useCallback(async (profile: PartnerMarketplaceProfile) => {
    const savedId = await firebaseService.saveGlobalData('partnerMarketplaceProfiles', profile);
    const finalProfile = { ...profile, id: savedId };
    setAppState((prev: AppState) => {
      const existing = prev.partnerMarketplaceProfiles || [];
      return {
        ...prev,
        partnerMarketplaceProfiles: [
          ...existing.filter((p) => p.userId !== finalProfile.userId && p.id !== savedId),
          finalProfile,
        ],
      };
    });
  }, []);

  const onSubmitPartnershipMatchRequest = useCallback(
    async (request: Omit<PartnershipMatchRequest, 'id' | 'createdAt'>) => {
      const payload: PartnershipMatchRequest = {
        ...request,
        id: `pmr-${request.partnerUserId}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const savedId = await firebaseService.saveGlobalData('partnershipMatchRequests', payload);
      const finalRequest = { ...payload, id: savedId };
      setAppState((prev: AppState) => ({
        ...prev,
        partnershipMatchRequests: [
          ...(prev.partnershipMatchRequests || []).filter((r) => r.id !== savedId),
          finalRequest,
        ],
      }));
    },
    [],
  );

  const onSaveTeamSponsorshipNeed = useCallback(async (need: TeamSponsorshipNeed) => {
    const savedId = await firebaseService.saveGlobalData('teamSponsorshipNeeds', need);
    const finalNeed = { ...need, id: savedId };
    setAppState((prev: AppState) => ({
      ...prev,
      teamSponsorshipNeeds: [
        ...(prev.teamSponsorshipNeeds || []).filter((n) => n.id !== savedId),
        finalNeed,
      ],
    }));
  }, []);

  const onRespondPartnershipMatchRequest = useCallback(
    async (
      requestId: string,
      status: Extract<PartnershipMatchStatus, 'accepted' | 'declined' | 'contracted'>,
      contractedAmountEur?: number,
    ) => {
      const existing = (appState.partnershipMatchRequests || []).find((r) => r.id === requestId);
      if (!existing) return;
      const updated: PartnershipMatchRequest = {
        ...existing,
        status,
        respondedAt: new Date().toISOString(),
        contractedAmountEur: contractedAmountEur ?? existing.contractedAmountEur,
      };
      await firebaseService.saveGlobalData('partnershipMatchRequests', updated);
      setAppState((prev: AppState) => ({
        ...prev,
        partnershipMatchRequests: (prev.partnershipMatchRequests || []).map((r) =>
          r.id === requestId ? updated : r,
        ),
      }));
    },
    [appState.partnershipMatchRequests],
  );

  const onInstallDemoPartnerExample = useCallback(async (): Promise<{
    partnerUserFound: boolean;
    incomeItemId: string;
  }> => {
    if (!appState.activeTeamId) {
      throw new Error('no team');
    }
    const teamName =
      appState.teams?.find((t) => t.id === appState.activeTeamId)?.name
      || 'équipe';
    const pack = prepareDemoPartnerInstall({
      teamId: appState.activeTeamId,
      teamName,
      language: appState.language === 'en' ? 'en' : 'fr',
      users: appState.users || [],
      grantedByUserId: currentUser?.id,
    });

    const hasIncome = (appState.incomeItems || []).some((i) => i.id === pack.income.id);
    if (!hasIncome) {
      await onSaveIncomeItem(pack.income);
    }

    const hasNewsletter = (appState.partnerNewsletters || []).some((n) => n.id === pack.newsletter.id);
    if (!hasNewsletter) {
      await onSavePartnerNewsletter(pack.newsletter);
    }

    if (pack.access) {
      const existingAccess = (appState.partnerAccesses || []).some(
        (a) => a.userId === pack.access!.userId && a.incomeItemId === pack.access!.incomeItemId && a.isActive,
      );
      if (!existingAccess) {
        await onSavePartnerAccess(pack.access);
      }
    }

    return {
      partnerUserFound: pack.partnerUserFound,
      incomeItemId: pack.income.id,
    };
  }, [
    appState.activeTeamId,
    appState.incomeItems,
    appState.partnerNewsletters,
    appState.partnerAccesses,
    appState.teams,
    appState.language,
    appState.users,
    currentUser?.id,
    onSaveIncomeItem,
    onSavePartnerNewsletter,
    onSavePartnerAccess,
  ]);

  const onSaveBudgetItem = useCallback(async (item: EventBudgetItem) => {
    if (!appState.activeTeamId) return;
    try {
      const enriched = enrichBudgetWithAccounting(item, appState.language || 'fr');
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "eventBudgetItems",
        enriched
      );
      const finalItem = { ...enriched, id: enriched.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.eventBudgetItems || [];
        const exists = collection.some((i: EventBudgetItem) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: EventBudgetItem) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, eventBudgetItems: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du budget:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onInstallPresentationDemo = useCallback(async () => {
    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté.');
    }

    const existingDemoTeam = (appState.teams || []).find(
      (t) =>
        t.name === DEMO_PRES_TEAM_NAME ||
        (t as { isPresentationDemo?: boolean }).isPresentationDemo === true
    );

    let teamId = existingDemoTeam?.id;

    if (!teamId) {
      const created = await firebaseService.createTeamForUser(
        currentUser.id,
        {
          name: DEMO_PRES_TEAM_NAME,
          level: DEMO_PRES_LEVEL,
          country: 'France',
          planId: SubscriptionPlanId.CONTINENTAL,
        },
        UserRole.MANAGER
      );
      teamId = created.teamId;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    const globalData = await firebaseService.getGlobalData();
    const teamData = await firebaseService.getTeamData(teamId, currentUser);
    persistActiveTeamId(teamId);

    setAppState((prev) => ({
      ...prev,
      ...globalData,
      ...teamData,
      activeTeamId: teamId,
      activeEventId: null,
    }));
    setLanguageState(teamData.language || 'fr');

    if (currentUser.teamId !== teamId) {
      setCurrentUser({ ...currentUser, teamId, userRole: UserRole.MANAGER, permissionRole: TeamRole.ADMIN });
    }

    const upsertLocal = <T extends { id?: string }>(
      collectionName: keyof TeamState,
      item: T
    ) => {
      setAppState((prev) => {
        const collection = ((prev[collectionName] as T[]) || []) as T[];
        const exists = collection.some((i) => i.id === item.id);
        const next = exists
          ? collection.map((i) => (i.id === item.id ? item : i))
          : [...collection, item];
        return { ...prev, [collectionName]: next };
      });
    };

    const saveInTeam =
      <T extends { id?: string }>(collectionName: string, stateKey: keyof TeamState) =>
      async (item: T) => {
        const savedId = await firebaseService.saveData(teamId!, collectionName, item);
        const finalItem = { ...item, id: item.id || savedId } as T;
        upsertLocal(stateKey, finalItem);
      };

    return installDemoPresentationTeam({
      saveRider: saveInTeam<Rider>('riders', 'riders'),
      saveStaff: saveInTeam<StaffMember>('staff', 'staff'),
      saveVehicle: saveInTeam<Vehicle>('vehicles', 'vehicles'),
      saveRaceEvent: saveInTeam<RaceEvent>('raceEvents', 'raceEvents'),
      saveRiderEventSelection: saveInTeam<RiderEventSelection>(
        'riderEventSelections',
        'riderEventSelections'
      ),
      saveBudgetItem: saveInTeam<EventBudgetItem>('eventBudgetItems', 'eventBudgetItems'),
      saveIncomeItem: saveInTeam<IncomeItem>('incomeItems', 'incomeItems'),
      savePerformanceEntry: saveInTeam<PerformanceEntry>(
        'performanceEntries',
        'performanceEntries'
      ),
      applyTeamIdentity: async (patch) => {
        await firebaseService.saveTeamSettings(teamId!, {
          name: patch.name,
          level: patch.level,
          themePrimaryColor: patch.primaryColor,
          themeAccentColor: patch.accentColor,
          address: patch.address,
          isPresentationDemo: true,
          language: 'fr',
        });
        setAppState((prev) => ({
          ...prev,
          teamLevel: patch.level,
          themePrimaryColor: patch.primaryColor,
          themeAccentColor: patch.accentColor,
          teams: (prev.teams || []).map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  name: patch.name,
                  level: patch.level,
                  address: patch.address || t.address,
                  country: patch.address?.country || t.country || 'France',
                }
              : t
          ),
        }));
      },
    });
  }, [currentUser, appState.teams]);

  const onDeleteBudgetItem = useCallback(async (item: EventBudgetItem) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "eventBudgetItems",
        item.id
      );
      setAppState((prev: AppState) => ({
        ...prev,
        eventBudgetItems: prev.eventBudgetItems.filter((i: EventBudgetItem) => i.id !== item.id),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression du budget:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const createTeamCollectionSaver = useCallback(
    <T extends { id?: string }>(collectionName: keyof TeamState) =>
      async (item: T) => {
        if (!appState.activeTeamId) return;
        const savedId = await firebaseService.saveData(
          appState.activeTeamId,
          collectionName as string,
          item
        );
        const finalItem = { ...item, id: item.id || savedId } as T;
        setAppState((prev: AppState) => {
          const collection = (prev[collectionName] as T[]) || [];
          const exists = collection.some((i) => i.id === finalItem.id);
          const newCollection = exists
            ? collection.map((i) => (i.id === finalItem.id ? finalItem : i))
            : [...collection, finalItem];
          return { ...prev, [collectionName]: newCollection };
        });
      },
    [appState.activeTeamId]
  );

  const createTeamCollectionDeleter = useCallback(
    <T extends { id?: string }>(collectionName: keyof TeamState) =>
      async (item: T) => {
        if (!appState.activeTeamId || !item.id) return;
        await firebaseService.deleteData(appState.activeTeamId, collectionName as string, item.id);
        setAppState((prev: AppState) => ({
          ...prev,
          [collectionName]: ((prev[collectionName] as T[]) || []).filter((i) => i.id !== item.id),
        }));
      },
    [appState.activeTeamId]
  );

  const onSaveClientRecord = useMemo(
    () => createTeamCollectionSaver<ClientRecord>('clientRecords'),
    [createTeamCollectionSaver]
  );
  const onDeleteClientRecord = useMemo(
    () => createTeamCollectionDeleter<ClientRecord>('clientRecords'),
    [createTeamCollectionDeleter]
  );
  const onSaveSupplierInvoice = useMemo(
    () => createTeamCollectionSaver<SupplierInvoice>('supplierInvoices'),
    [createTeamCollectionSaver]
  );
  const onDeleteSupplierInvoice = useMemo(
    () => createTeamCollectionDeleter<SupplierInvoice>('supplierInvoices'),
    [createTeamCollectionDeleter]
  );
  const onSaveBankTransaction = useMemo(
    () => createTeamCollectionSaver<BankTransaction>('bankTransactions'),
    [createTeamCollectionSaver]
  );
  const onSaveSepaBatch = useMemo(
    () => createTeamCollectionSaver<SepaBatch>('sepaBatches'),
    [createTeamCollectionSaver]
  );
  const onSaveQuote = useMemo(
    () => createTeamCollectionSaver<Quote>('quotes'),
    [createTeamCollectionSaver]
  );
  const onDeleteQuote = useMemo(
    () => createTeamCollectionDeleter<Quote>('quotes'),
    [createTeamCollectionDeleter]
  );

  const onImportBankTransactions = useCallback(
    async (txs: BankTransaction[]) => {
      for (const tx of txs) {
        await onSaveBankTransaction(tx);
      }
    },
    [onSaveBankTransaction]
  );

  const onMarkSalariesPaid = useCallback(
    async (sourceIds: string[]) => {
      if (!appState.activeTeamId) return;
      const paidAt = new Date().toISOString();
      await Promise.all(
        sourceIds.map(async (id) => {
          const rider = appState.riders.find((r) => r.id === id);
          if (rider) {
            await onSaveRider({ ...rider, sepaLastPaidAt: paidAt });
            return;
          }
          const member = appState.staff.find((s) => s.id === id);
          if (member) await onSaveStaff({ ...member, sepaLastPaidAt: paidAt });
        })
      );
    },
    [appState.activeTeamId, appState.riders, appState.staff, onSaveRider, onSaveStaff]
  );

  const handleTeamSwitch = useCallback(
    async (teamId: string) => {
      if (!currentUser || teamId === appState.activeTeamId) return;
      setIsLoading(true);
      try {
        const teamData = await firebaseService.getTeamData(teamId, currentUser);
        persistActiveTeamId(teamId);
        setAppState((prev: AppState) => ({
          ...prev,
          ...teamData,
          activeTeamId: teamId,
          activeEventId: null,
        }));
        setLanguageState(teamData.language || 'fr');
      } catch (error) {
        console.error('Erreur lors du changement d\'équipe:', error);
        alert('Impossible de charger cette équipe.');
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, appState.activeTeamId]
  );

  const onSaveExpenseReceipt = useCallback(async (receipt: ExpenseReceipt) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "expenseReceipts",
        receipt
      );
      const finalItem = { ...receipt, id: receipt.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.expenseReceipts || [];
        const exists = collection.some((i: ExpenseReceipt) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: ExpenseReceipt) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, expenseReceipts: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du justificatif:", error);
      alert("Erreur lors de la sauvegarde du justificatif. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveSepaSettings = useCallback(async (settings: TeamSepaSettings) => {
    if (!appState.activeTeamId) return;
    try {
      await firebaseService.saveTeamSettings(appState.activeTeamId, { sepaSettings: settings });
      setAppState((prev: AppState) => ({ ...prev, sepaSettings: settings }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres SEPA:', error);
      throw error;
    }
  }, [appState.activeTeamId]);

  const onSaveInvoiceSettings = useCallback(async (settings: TeamInvoiceSettings) => {
    if (!appState.activeTeamId) return;
    try {
      await firebaseService.saveTeamSettings(appState.activeTeamId, { invoiceSettings: settings });
      setAppState((prev: AppState) => ({ ...prev, invoiceSettings: settings }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres de facturation:', error);
      throw error;
    }
  }, [appState.activeTeamId]);

  const onConvertQuote = useCallback(
    async (quote: Quote, income: IncomeItem, settings: TeamInvoiceSettings) => {
      await onSaveQuote(quote);
      await onSaveIncomeItem(income);
      await onSaveInvoiceSettings(settings);
    },
    [onSaveQuote, onSaveIncomeItem, onSaveInvoiceSettings]
  );

  const onSaveScoutingProfile = useCallback(async (item: ScoutingProfile) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "scoutingProfiles",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.scoutingProfiles || [];
        const exists = collection.some((i: ScoutingProfile) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: ScoutingProfile) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, scoutingProfiles: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du profil scouting:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onDeleteScoutingProfile = useCallback(async (item: ScoutingProfile | string) => {
    if (!appState.activeTeamId) return;
    
    const profileId = typeof item === 'string' ? item : item.id;
    if (!profileId) return;
    
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "scoutingProfiles",
        profileId
      );
      setAppState((prev: AppState) => ({
        ...prev,
        scoutingProfiles: prev.scoutingProfiles.filter((i: ScoutingProfile) => i.id !== profileId),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression du profil scouting:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveStockItem = useCallback(async (item: StockItem) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "stockItems",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.stockItems || [];
        const exists = collection.some((i: StockItem) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: StockItem) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, stockItems: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du stock:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onDeleteStockItem = useCallback(async (item: StockItem) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "stockItems",
        item.id
      );
      setAppState((prev: AppState) => ({
        ...prev,
        stockItems: (prev.stockItems || []).filter((i: StockItem) => i.id !== item.id),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression du stock:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onSaveChecklistTemplate = useCallback(async (item: ChecklistTemplate) => {
    if (!appState.activeTeamId) return;
    try {
      const role = item.role ?? ChecklistRole.DS;
      const toSave = { ...item, id: item.id || '', name: item.name, role, kind: item.kind || 'task', eventType: item.eventType, timing: item.timing, timingLabel: item.timingLabel };
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "checklistTemplates",
        toSave
      );
      const finalItem = { ...toSave, id: toSave.id || savedId };
      setAppState((prev: AppState) => {
        const record = (prev.checklistTemplates ?? {}) as TeamState['checklistTemplates'];
        const arr = record[role] || [];
        const exists = arr.some((i: ChecklistTemplate) => i.id === finalItem.id);
        const newArr = exists
          ? arr.map((i: ChecklistTemplate) => (i.id === finalItem.id ? finalItem : i))
          : [...arr, finalItem];
        return { ...prev, checklistTemplates: { ...record, [role]: newArr } };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du modèle checklist:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onImportChecklistTemplates = useCallback(async (items: ChecklistTemplate[]) => {
    if (!appState.activeTeamId || items.length === 0) return 0;
    try {
      const toSave = items.map((item) => ({
        ...item,
        id: item.id || '',
        role: item.role ?? ChecklistRole.DS,
        kind: item.kind || 'task',
      }));
      const savedIds = await firebaseService.saveDataBatch(
        appState.activeTeamId,
        'checklistTemplates',
        toSave
      );
      const finalItems = toSave.map((item, index) => ({ ...item, id: item.id || savedIds[index] }));
      setAppState((prev: AppState) => {
        const record = { ...(prev.checklistTemplates ?? {}) } as TeamState['checklistTemplates'];
        finalItems.forEach((item) => {
          const role = item.role ?? ChecklistRole.DS;
          const arr = record[role] || [];
          const dupKey = `${(item.name || '').trim().toLowerCase()}|${item.eventType || ''}|${item.timingLabel || ''}`;
          if (arr.some((t) => `${(t.name || '').trim().toLowerCase()}|${t.eventType || ''}|${t.timingLabel || ''}` === dupKey)) {
            return;
          }
          record[role] = [...arr, item];
        });
        return { ...prev, checklistTemplates: record };
      });
      return finalItems.length;
    } catch (error) {
      console.error('Erreur lors de l\'import des modèles checklist:', error);
      throw error;
    }
  }, [appState.activeTeamId]);

  const onDeleteChecklistTemplate = useCallback(async (item: ChecklistTemplate) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      const role = item.role ?? ChecklistRole.DS;
      await firebaseService.deleteData(
        appState.activeTeamId,
        "checklistTemplates",
        item.id
      );
      setAppState((prev: AppState) => {
        const record = (prev.checklistTemplates ?? {}) as TeamState['checklistTemplates'];
        const arr = (record[role] || []).filter((i: ChecklistTemplate) => i.id !== item.id);
        return { ...prev, checklistTemplates: { ...record, [role]: arr } };
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du modèle checklist:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  // Handlers pour TeamProduct
  const onSaveTeamProduct = useCallback(async (item: TeamProduct) => {
    if (!appState.activeTeamId) return;
    try {
      const savedId = await firebaseService.saveData(
        appState.activeTeamId,
        "teamProducts",
        item
      );
      const finalItem = { ...item, id: item.id || savedId };
      setAppState((prev: AppState) => {
        const collection = prev.teamProducts || [];
        const exists = collection.some((i: TeamProduct) => i.id === finalItem.id);
        const newCollection = exists
          ? collection.map((i: TeamProduct) => (i.id === finalItem.id ? finalItem : i))
          : [...collection, finalItem];
        return { ...prev, teamProducts: newCollection };
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du produit:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  const onDeleteTeamProduct = useCallback(async (item: TeamProduct) => {
    if (!appState.activeTeamId || !item.id) return;
    try {
      await firebaseService.deleteData(
        appState.activeTeamId,
        "teamProducts",
        item.id
      );
      setAppState((prev: AppState) => ({
        ...prev,
        teamProducts: (prev.teamProducts || []).filter((i: TeamProduct) => i.id !== item.id),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression du produit:", error);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  }, [appState.activeTeamId]);

  // Fonction utilitaire pour remplacer createBatchSetHandler
  const createBatchSetHandler = <T,>(
    collectionName: keyof TeamState
  ): React.Dispatch<React.SetStateAction<T[]>> =>
    (updater: React.SetStateAction<T[]>) => {
      setAppState((prev: AppState) => {
        const currentItems = (prev[collectionName] as T[]) || [];
        const newItems =
          typeof updater === "function"
            ? (updater as (prevState: T[]) => T[])(currentItems)
            : updater;

        return { ...prev, [collectionName]: newItems };
      });
    };

  const persistCollectionDiff = async <T extends { id?: string }>(
    teamId: string,
    collectionName: string,
    oldItems: T[],
    newItems: T[],
  ) => {
    try {
      const oldMap = new Map(
        oldItems.filter((item) => item.id).map((item) => [item.id!, item]),
      );
      const newMap = new Map(
        newItems.filter((item) => item.id).map((item) => [item.id!, item]),
      );

      for (const item of newItems) {
        const oldItem = item.id ? oldMap.get(item.id) : undefined;
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          await firebaseService.saveData(teamId, collectionName, item);
        }
      }
      for (const [id] of oldMap) {
        if (!newMap.has(id)) {
          await firebaseService.deleteData(teamId, collectionName, id);
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la persistance de ${collectionName}:`, error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  };

  const createPersistedBatchSetHandler = <T extends { id?: string }>(
    collectionName: keyof TeamState,
  ): React.Dispatch<React.SetStateAction<T[]>> =>
    (updater: React.SetStateAction<T[]>) => {
      setAppState((prev: AppState) => {
        const currentItems = (prev[collectionName] as T[]) || [];
        const newItems =
          typeof updater === "function"
            ? (updater as (prevState: T[]) => T[])(currentItems)
            : updater;

        if (prev.activeTeamId) {
          void persistCollectionDiff(
            prev.activeTeamId,
            collectionName as string,
            currentItems,
            newItems,
          );
        }

        return { ...prev, [collectionName]: newItems };
      });
    };

  const handleUpdateRiderPreference = useCallback(async (
    eventId: string,
    riderId: string,
    preference: RiderEventPreference,
    objectives?: string,
  ) => {
    if (!appState.activeTeamId) return;
    try {
      const existing = appState.riderEventSelections.find(
        (sel) => sel.eventId === eventId && sel.riderId === riderId,
      );
      if (existing) {
        const updated: RiderEventSelection = {
          ...existing,
          riderPreference: preference,
          riderObjectives: objectives ?? existing.riderObjectives,
        };
        await firebaseService.saveData(appState.activeTeamId, "riderEventSelections", updated);
        setAppState((prev) => ({
          ...prev,
          riderEventSelections: prev.riderEventSelections.map((sel) =>
            sel.id === existing.id ? updated : sel,
          ),
        }));
      } else {
        const newSelection: RiderEventSelection = {
          id: `selection_${Date.now()}`,
          eventId,
          riderId,
          status: RiderEventStatus.EN_ATTENTE,
          riderPreference: preference,
          riderObjectives: objectives || "",
          notes: "",
        };
        const savedId = await firebaseService.saveData(
          appState.activeTeamId,
          "riderEventSelections",
          newSelection,
        );
        const finalItem = { ...newSelection, id: savedId };
        setAppState((prev) => ({
          ...prev,
          riderEventSelections: [...prev.riderEventSelections, finalItem],
        }));
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      alert("Erreur lors de la mise à jour. Veuillez réessayer.");
    }
  }, [appState.activeTeamId, appState.riderEventSelections]);



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

  const handleActivateIndependentProfile = async () => {
    if (!currentUser) return;
    if (currentUser.userRole === UserRole.MANAGER) {
      alert("Les managers créent une équipe. Utilisez le parcours « Créer mon équipe ».");
      return;
    }
    try {
      setIsLoading(true);
      await activateIndependentProfile(currentUser.id, currentUser.userRole as UserRole);
      const refreshedProfile = await firebaseService.getUserProfile(currentUser.id);
      if (refreshedProfile) {
        setCurrentUser(refreshedProfile);
        await loadDataForUser(refreshedProfile);
      }
    } catch (error: unknown) {
      console.error("Erreur activation profil indépendant:", error);
      alert(error instanceof Error ? error.message : "Impossible d'activer le profil indépendant.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIndependentProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    if (isSuperAdminUser(currentUser) && superAdminPreview.mode !== "full") {
      alert("En mode aperçu, les modifications ne sont pas enregistrées.");
      return;
    }
    const gatedUpdates = { ...updates };
    if (
      !hasActiveIndependentSubscription(currentUser) &&
      (gatedUpdates.isSearchable !== undefined || gatedUpdates.openToExternalMissions !== undefined)
    ) {
      alert("Abonnement actif requis pour activer la visibilité scouting ou marketplace.");
      return;
    }
    try {
      await saveIndependentProfile(currentUser.id, gatedUpdates);
      const merged = { ...currentUser, ...gatedUpdates };
      setCurrentUser(merged);
      setAppState((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) => (u.id === currentUser.id ? { ...u, ...gatedUpdates } : u)),
      }));
    } catch (error) {
      console.error("Erreur sauvegarde profil indépendant:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le profil. Réessayez.",
      );
      throw error;
    }
  };

  const onSaveIndependentRider = useCallback(
    async (rider: Rider) => {
      if (!currentUser) return;
      await handleSaveIndependentProfile(riderProfileToUserUpdates(rider));
    },
    [currentUser, superAdminPreview.mode],
  );

  const onSaveIndependentStaff = useCallback(
    async (member: StaffMember) => {
      if (!currentUser) return;
      await handleSaveIndependentProfile(staffProfileToUserUpdates(member));
    },
    [currentUser, superAdminPreview.mode],
  );

  const onSaveIndependentExpenseReceipt = useCallback(
    async (receipt: ExpenseReceipt) => {
      if (!currentUser) return;
      const existing = currentUser.personalExpenseReceipts || [];
      const finalItem = { ...receipt, id: receipt.id || generateId() };
      const updated = existing.some((r) => r.id === finalItem.id)
        ? existing.map((r) => (r.id === finalItem.id ? finalItem : r))
        : [...existing, finalItem];
      await handleSaveIndependentProfile({ personalExpenseReceipts: updated });
    },
    [currentUser, superAdminPreview.mode],
  );

  const handleJoinTeamRequest = async (teamId: string, joinRole: UserRole) => {
    if (!currentUser) {
      alert("Vous devez être connecté pour rejoindre une équipe.");
      return;
    }

    if (joinRole === UserRole.COUREUR) {
      const team = appState.teams?.find((t) => t.id === teamId);
      const riderSegment = resolveRiderMarketSegmentFromUser(currentUser);
      if (!canRiderApplyToTeam(riderSegment, team, team?.operationalSettings)) {
        alert(getMarketMismatchMessage(riderSegment, team));
        return;
      }
    }

    try {
      await firebaseService.requestToJoinTeam(
        currentUser.id,
        teamId,
        joinRole,
        {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
        }
      );
      setView("pending");
      await loadDataForUser(currentUser);
    } catch (error: unknown) {
      console.error("❌ Échec de la demande pour rejoindre l'équipe:", error);
      const errorMessage = error instanceof Error ? error.message : t("errorJoinTeam");
      alert(errorMessage);
    }
  };

  const handleTeamPortalApply = async (teamId: string) => {
    if (!currentUser) return;
    const team = appState.teams?.find((t) => t.id === teamId);
    const riderSegment = resolveRiderMarketSegmentFromUser(currentUser);
    if (!teamAcceptsRiderApplications(team, team?.operationalSettings)) {
      throw new Error(`${team?.name ?? 'Cette équipe'} n'accepte pas les candidatures pour le moment.`);
    }
    if (!canRiderApplyToTeam(riderSegment, team, team?.operationalSettings)) {
      throw new Error(getMarketMismatchMessage(riderSegment, team));
    }
    await firebaseService.requestToJoinTeam(currentUser.id, teamId, UserRole.COUREUR, {
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
    });
    const globalData = await firebaseService.getGlobalData();
    setAppState((prev) => ({
      ...prev,
      teamMemberships: globalData.teamMemberships ?? prev.teamMemberships,
    }));
  };

  const handleCreateTeam = async (teamData: {
    name: string;
    level: TeamLevel;
    country: string;
    planId?: SubscriptionPlanId;
  }) => {
    if (!currentUser) return;
    if (currentUser.userRole !== UserRole.MANAGER) {
      alert("Seuls les comptes Manager peuvent créer une équipe. Inscrivez-vous avec le parcours Manager.");
      return;
    }
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



  const [sectionTabHint, setSectionTabHint] = useState<string | undefined>();

  const VEHICLE_TAB_HINTS = new Set(['list', 'assignmentCalendar', 'gps']);
  const FINANCIAL_TAB_HINTS = new Set(['payroll', 'accounting', 'sepa']);
  const EVENT_DETAIL_TAB_HINTS = new Set([
    'logisticsSummary', 'info', 'participants', 'opLogistics', 'transport', 'accommodation',
    'accommodationHistory', 'documents', 'budget', 'checklist', 'peerReview', 'performance',
    'riderDebrief', 'staffMission', 'campMonitoring',
  ]);

  const navigateTo = (section: AppSection, eventIdOrTab?: string, tabHint?: string) => {
    let eventId = eventIdOrTab;
    let resolvedTabHint = tabHint;
    if (!tabHint && eventIdOrTab) {
      if (section === 'vehicles' && VEHICLE_TAB_HINTS.has(eventIdOrTab)) {
        resolvedTabHint = eventIdOrTab;
        eventId = undefined;
      } else if (section === 'financial' && FINANCIAL_TAB_HINTS.has(eventIdOrTab)) {
        resolvedTabHint = eventIdOrTab;
        eventId = undefined;
      } else if (section === 'eventDetail' && EVENT_DETAIL_TAB_HINTS.has(eventIdOrTab)) {
        resolvedTabHint = eventIdOrTab;
        eventId = undefined;
      }
    }
    if (section === 'bikeSetup') section = 'riderEquipment';
    if (section === 'talentAvailability') section = 'season-planning';
    const accessUser = displayUser ?? currentUser;
    if (accessUser && isCoureurUser(accessUser) && !isSectionAllowedForCoureur(section)) {
      setCurrentSection("myCareer");
      return;
    }
    if (accessUser && isPartnerUser(accessUser) && !isSectionAllowedForPartner(section)) {
      setAppState((prev: AppState) => ({ ...prev, activeEventId: null }));
      setCurrentSection("partnerPortal");
      setSectionTabHint(undefined);
      return;
    }
    if (currentUser && appState?.activeTeamId && !isIndependentUser(displayUser ?? currentUser)) {
      const fallbackPlan = getDefaultPlanForTeamLevel(appState.teamLevel ?? TeamLevel.HORS_DN);
      if (!canAccessSection(section, appState.subscription, fallbackPlan)) {
        setCurrentSection("pricing");
        if (section === "eventDetail" && eventId) {
          setAppState((prev: AppState) => ({ ...prev, activeEventId: null }));
        }
        return;
      }
    }
    if (section === "eventDetail" && eventId) {
      setAppState((prev: AppState) => ({ ...prev, activeEventId: eventId }));
    } else {
      setAppState((prev: AppState) => ({ ...prev, activeEventId: null }));
    }
    setCurrentSection(section);
    if (resolvedTabHint) {
      setSectionTabHint(resolvedTabHint);
    } else if (section !== 'vehicles' && section !== 'financial' && section !== 'eventDetail') {
      setSectionTabHint(undefined);
    }
  };

  const handleOpenPartnerPortal = useCallback((incomeItemId?: string) => {
    if (incomeItemId) {
      setPartnerPortalPreviewIncomeId(incomeItemId);
    }
    setAppState((prev: AppState) => ({ ...prev, activeEventId: null }));
    setCurrentSection('partnerPortal');
  }, []);

  const handleOpenConvocationNotification = useCallback(
    (eventId: string) => {
      navigateTo('eventDetail', eventId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, appState?.activeTeamId, appState?.subscription, appState?.teamLevel],
  );

  const {
    notifications: userNotifications,
    unreadCount: notificationUnreadCount,
    pushPermission,
    pushSupported,
    enablePush,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  } = useUserNotifications({
    userId: currentUser?.id,
    enabled: !!currentUser && view === 'app',
    onNavigateToConvocation: handleOpenConvocationNotification,
  });

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
          onViewPricing={() => setView("pricing")}
        />
      );
    }
    if (view === "pricing") {
      return (
        <div className="relative min-h-screen overflow-hidden text-white">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 75% 20%, rgba(79,70,229,0.4), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 85%, rgba(14,165,233,0.18), transparent 50%), linear-gradient(155deg, #020617 0%, #0f172a 42%, #1e293b 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-18deg, transparent, transparent 22px, #fff 22px, #fff 23px)",
            }}
          />
          <div className="absolute top-4 right-4 z-20">
            <select
              onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
              value={language}
              aria-label="Select language"
              className="rounded-lg border border-white/15 bg-slate-900/70 text-slate-200 text-sm px-3 py-1.5 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <SectionSuspense>
              <LazyPricingSection isPublic />
            </SectionSuspense>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setView("signup")}
                className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition shadow-lg shadow-indigo-950/40"
              >
                {t("loginSignUpLink")}
              </button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="px-6 py-2.5 rounded-xl border border-white/20 text-slate-200 font-medium hover:bg-white/10 transition"
              >
                {t("loginSubmitButton")}
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (view === "signup") {
      return (
        <SignupView
          onRegister={handleRegister}
          onSwitchToLogin={() => setView("login")}
        />
      );
    }
    if (view === "pending") {
      return (
        <PendingApprovalView
          userRole={currentUser?.userRole}
          onLogout={handleLogout}
          onCheckStatus={async () => {
            if (currentUser) {
              await loadDataForUser(currentUser);
            }
          }}
        />
      );
    }
    if (view === "load_error" && currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border p-6 text-center">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Erreur de chargement</h2>
            <p className="text-gray-600 mb-4">{loadError ?? "Impossible de charger les données. Vérifiez votre connexion."}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  loadDataForUser(currentUser);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (view === "no_team" && currentUser) {
      return (
        <NoTeamView
          currentUser={currentUser}
          teams={appState.teams}
          onJoinTeam={handleJoinTeamRequest}
          onCreateTeam={handleCreateTeam}
          onActivateIndependent={handleActivateIndependentProfile}
          onLogout={handleLogout}
        />
      );
    }
    if (view === "partner_lobby" && currentUser) {
      return (
        <PartnerLobbyView
          currentUser={currentUser}
          partnerProfiles={appState.partnerMarketplaceProfiles || []}
          sponsorshipNeeds={appState.teamSponsorshipNeeds || []}
          matchRequests={appState.partnershipMatchRequests || []}
          onSaveProfile={onSavePartnerMarketplaceProfile}
          onSubmitMatchRequest={onSubmitPartnershipMatchRequest}
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

    if (view === "app" && currentUser && (appState.activeTeamId || isIndependentUser(currentUser) || isSuperAdminUser(currentUser))) {
      const uiUser = displayUser ?? currentUser;
      const userIsIndependent = isIndependentUser(uiUser);
      const userIsSuperAdmin = isSuperAdminUser(currentUser);
      const fallbackPlan = getDefaultPlanForTeamLevel(appState.teamLevel ?? TeamLevel.HORS_DN);
      const subscriptionAccess = userIsIndependent
        ? getIndependentSubscriptionAccess(uiUser)
        : getSubscriptionAccess(appState.subscription, fallbackPlan);
      const lockedSections = [
        ...(userIsIndependent
          ? (subscriptionAccess?.isActive
              ? []
              : uiUser.userRole === UserRole.STAFF
                ? (['missionSearch'] as AppSection[])
                : (['teamSearch'] as AppSection[]))
          : getLockedSections(appState.subscription, fallbackPlan)),
      ];

      const handleUpgradePlan = async (planId: SubscriptionPlanId, referralCode?: string) => {
        try {
          const code = referralCode ?? getPendingReferralCode();
          if (userIsIndependent) {
            await requestIndependentPlanUpgrade(planId, "year", code);
            return;
          }
          if (!appState.activeTeamId) return;
          await requestPlanUpgrade(appState.activeTeamId, planId, "year", code);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          alert(message.includes('Stripe') ? message : 'Impossible de lancer le paiement. Réessayez ou contactez le support.');
        }
      };

      const handleBillingPortal = async () => {
        try {
          if (userIsIndependent) {
            const { url } = await createIndependentBillingPortalSession();
            window.location.href = url;
            return;
          }
          if (!appState.activeTeamId) return;
          const { url } = await createBillingPortalSession(appState.activeTeamId);
          window.location.href = url;
        } catch {
          setCurrentSection("pricing");
        }
      };

      let effectivePermissions = firebaseService.getEffectivePermissions(
        uiUser,
        appState.permissions,
        appState.staff,
        userIsSuperAdmin && superAdminPreview.mode !== "full"
          ? { skipSuperAdminBypass: true }
          : undefined
      );

      const canAccessHoldingView = canAccessHoldingDashboard(uiUser, {
        realUser: userIsSuperAdmin ? currentUser : undefined,
        previewMode: superAdminPreview.mode,
      });

      const partnerPreviewIncomeId =
        superAdminPreview.mode === 'partenaire'
          ? superAdminPreview.subjectId ?? null
          : partnerPortalPreviewIncomeId;

      const partnerPortalSession = resolvePartnerPortalSession({
        partnerAccesses: appState.partnerAccesses || [],
        userId: currentUser.id,
        userEmail: uiUser.email,
        teamId: appState.activeTeamId,
        incomeItems: appState.incomeItems || [],
        userRole: uiUser.userRole,
        permissionRole: uiUser.permissionRole,
        previewIncomeItemId: partnerPreviewIncomeId,
      });

      if (partnerPortalSession.access) {
        effectivePermissions = {
          ...effectivePermissions,
          partnerPortal: effectivePermissions.partnerPortal || ['view'],
        };
      }

      const viewAppState =
        !userIsIndependent
          ? resolveScopedAppStateForUser(appState, uiUser)
          : appState;
      const saveRiderForUiUser = userIsIndependent ? onSaveIndependentRider : onSaveRider;
      const saveStaffForUiUser = userIsIndependent ? onSaveIndependentStaff : onSaveStaff;
      const resolvedUiRider =
        userIsIndependent && (uiUser.userRole === UserRole.COUREUR || String(uiUser.userRole).toLowerCase() === 'coureur')
          ? resolveRiderForUser(viewAppState.riders || appState.riders || [], uiUser) ??
            userToRiderProfile(uiUser)
          : resolveRiderForUser(viewAppState.riders || appState.riders || [], uiUser);
      const ridersForUi =
        userIsIndependent && resolvedUiRider
          ? [
              resolvedUiRider,
              ...(viewAppState.riders || appState.riders || []).filter(
                (r) => r.id !== resolvedUiRider.id,
              ),
            ]
          : viewAppState.riders?.length
            ? viewAppState.riders
            : appState.riders || [];
      const staffForUi =
        userIsIndependent &&
        (uiUser.userRole === UserRole.STAFF ||
          String(uiUser.userRole).toLowerCase() === 'staff')
          ? [resolveStaffForUser(appState.staff, uiUser) ?? userToStaffProfile(uiUser)]
          : appState.staff;
      const isIndependentRiderUi =
        userIsIndependent &&
        (uiUser.userRole === UserRole.COUREUR ||
          String(uiUser.userRole).toLowerCase() === 'coureur');
      const isIndependentStaffUi =
        userIsIndependent &&
        (uiUser.userRole === UserRole.STAFF ||
          String(uiUser.userRole).toLowerCase() === 'staff');
      const activeEvent = viewAppState.activeEventId
        ? viewAppState.raceEvents.find((e) => e.id === viewAppState.activeEventId)
        : null;
      const userTeams = userIsSuperAdmin
        ? appState.teams
        : appState.teams.filter((team) =>
        appState.teamMemberships.some(
          (m) =>
            m.teamId === team.id &&
            m.userId === currentUser.id &&
            m.status === TeamMembershipStatus.ACTIVE
        )
      );

      const resolvedOrganization = canAccessHoldingView
        ? resolveOrganizationForUser({
            organizations: appState.organizations || [],
            teams: appState.teams,
            activeTeamId: appState.activeTeamId,
            currentUser,
            memberships: appState.teamMemberships,
            userTeams,
            isHoldingSuperAdmin: true,
          })
        : null;

      const canViewOrganization =
        canAccessHoldingView &&
        !!resolvedOrganization &&
        canViewOrgDashboard({
          isHoldingSuperAdmin: true,
        });

      const resolvedPartnerAccess = partnerPortalSession.access;

      if (!canViewOrganization) {
        lockedSections.push('organizationDashboard');
      }
      if (!resolvedPartnerAccess) {
        lockedSections.push('partnerPortal');
      }

      return (
          <MobileShell
            currentSection={currentSection}
            onSelectSection={navigateTo}
            teamLogoUrl={appState.teamLogoUrl}
            onLogout={handleLogout}
            currentUser={uiUser}
            effectivePermissions={effectivePermissions}
            staff={appState.staff}
            permissionRoles={appState.permissionRoles}
            userTeams={userTeams}
            currentTeamId={appState.activeTeamId}
            onTeamSwitch={handleTeamSwitch}
            isIndependent={userIsIndependent}
            onGoToLobby={() => setView("no_team")}
            lockedSections={lockedSections}
            realUser={userIsSuperAdmin ? currentUser : undefined}
            superAdminPreview={userIsSuperAdmin ? superAdminPreview : undefined}
            onSuperAdminPreviewChange={
              userIsSuperAdmin
                ? (config) =>
                    setSuperAdminPreview(
                      normalizeSuperAdminPreview(
                        config,
                        appState.riders,
                        appState.staff,
                        appState.incomeItems || [],
                      ),
                    )
                : undefined
            }
            riders={appState.riders}
            incomeItems={appState.incomeItems || []}
            onExitSuperAdminPreview={
              userIsSuperAdmin
                ? () => setSuperAdminPreview(DEFAULT_SUPER_ADMIN_PREVIEW)
                : undefined
            }
            notifications={userNotifications}
            notificationUnreadCount={notificationUnreadCount}
            pushPermission={pushPermission}
            pushSupported={pushSupported}
            onEnablePush={enablePush}
            onMarkNotificationRead={markNotificationRead}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onOpenConvocation={handleOpenConvocationNotification}
            subscriptionBanner={
              subscriptionAccess ? (
                <SubscriptionBanner
                  access={subscriptionAccess}
                  onManageBilling={() => setCurrentSection("pricing")}
                  onViewPricing={() => setCurrentSection("pricing")}
                />
              ) : null
            }
          >
              <SectionErrorBoundary
                sectionName="le contenu principal"
                onRetry={() => navigateTo("myDashboard")}
              >
              {activeEvent ? (
                <SectionSuspense>
                <LazyEventDetailView
                  event={activeEvent}
                  eventId={activeEvent.id}
                  appState={viewAppState as AppState}
                  navigateTo={navigateTo}
                  deleteRaceEvent={(eventId) => {
                    onDeleteRaceEvent({ id: eventId } as RaceEvent);
                    navigateTo("events");
                  }}
                  currentUser={uiUser}
                  effectivePermissions={effectivePermissions}
                  setRaceEvents={createBatchSetHandler<RaceEvent>("raceEvents")}
                  onSaveRaceEvent={onSaveRaceEvent}
                  setEventTransportLegs={createBatchSetHandler<EventTransportLeg>(
                    "eventTransportLegs"
                  )}
                  setVehicles={createBatchSetHandler<Vehicle>("vehicles")}
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
                  setPeerRatings={createPersistedBatchSetHandler<PeerRating>(
                    "peerRatings"
                  )}
                  riderEventSelections={appState.riderEventSelections}
                  setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                  onSavePerformanceEntry={onSavePerformanceEntry}
                  onSaveRiderSelfDebrief={onSaveRiderSelfDebrief}
                  initialTab={
                    sectionTabHint && EVENT_DETAIL_TAB_HINTS.has(sectionTabHint)
                      ? (sectionTabHint as EventDetailTab)
                      : undefined
                  }
                />
                </SectionSuspense>
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
                    <SectionSuspense>
                    <>
                      {currentSection === "myDashboard" && uiUser && (
                        <>
                          {userIsIndependent ? (
                            <LazyIndependentDashboardSection
                              currentUser={uiUser}
                              riders={ridersForUi}
                              staff={staffForUi}
                              missions={appState.missions || []}
                              teams={appState.teams}
                              subscriptionAccess={subscriptionAccess}
                              onNavigateTo={navigateTo}
                              includeDemoMissions={
                                userIsSuperAdmin &&
                                isIndependentPreviewMode(superAdminPreview.mode)
                              }
                            />
                          ) : (
                            <>
                          {/* Gestionnaire de basculement sur 2026 */}
                          <SeasonTransitionManager
                            riders={appState.riders}
                            staff={appState.staff}
                            raceEvents={appState.raceEvents}
                            performanceEntries={appState.performanceEntries}
                          />
                          
                          {/* Redirection automatique pour les administrateurs */}
                          {uiUser.permissionRole === TeamRole.ADMIN || uiUser.userRole === UserRole.MANAGER ? (
                            <LazyAdminDashboardSection
                              riders={appState.riders}
                              staff={appState.staff}
                              currentUser={uiUser}
                              raceEvents={appState.raceEvents}
                              riderEventSelections={appState.riderEventSelections}
                              appState={appState}
                              navigateTo={navigateTo}
                            />
                          ) : (
                            <LazyMyDashboardSection
                              riders={viewAppState.riders}
                              staff={viewAppState.staff}
                              currentUser={uiUser}
                              raceEvents={viewAppState.raceEvents}
                              riderEventSelections={viewAppState.riderEventSelections}
                              eventTransportLegs={viewAppState.eventTransportLegs}
                              eventChecklistItems={viewAppState.eventChecklistItems}
                              effectivePermissions={effectivePermissions}
                              appState={viewAppState}
                              navigateTo={navigateTo}
                              onUpdateRiderPreference={handleUpdateRiderPreference}
                              onSaveRider={onSaveRider}
                            />
                          )}
                            </>
                          )}
                        </>
                      )}
                      {currentSection === "adminDashboard" && uiUser && (
                        <LazyAdminDashboardSection
                          riders={appState.riders}
                          staff={appState.staff}
                          currentUser={uiUser}
                          raceEvents={appState.raceEvents}
                          riderEventSelections={appState.riderEventSelections}
                          appState={appState}
                          navigateTo={navigateTo}
                        />
                      )}
                      {currentSection === "organizationDashboard" && uiUser && canViewOrganization && (() => {
                        if (!resolvedOrganization) {
                          return (
                            <SectionWrapper title={t('orgDashboardTitle')}>
                              <p className="text-sm text-gray-500">{t('orgDashboardEmpty')}</p>
                            </SectionWrapper>
                          );
                        }
                        return (
                          <LazyOrganizationDashboardSection
                            organization={resolvedOrganization}
                            teams={appState.teams}
                            riders={appState.riders}
                            staff={appState.staff}
                            raceEvents={appState.raceEvents}
                            currentUser={uiUser}
                            memberships={appState.teamMemberships}
                            activeTeamId={appState.activeTeamId}
                            isHoldingSuperAdmin={canAccessHoldingView}
                            onSelectTeam={handleTeamSwitch}
                            onNavigate={navigateTo}
                            vehicles={appState.vehicles}
                            vehiclePositions={appState.vehiclePositions || []}
                            eventTransportLegs={appState.eventTransportLegs}
                          />
                        );
                      })()}
                      {currentSection === "partnerPortal" && uiUser && (() => {
                        const { access, incomeItem, isPreview } = partnerPortalSession;
                        if (!access) {
                          return (
                            <SectionWrapper title={t('partnerPortalTitle')}>
                              <p className="text-sm text-gray-500">{t('partnerPortalNoAccess')}</p>
                            </SectionWrapper>
                          );
                        }
                        if (!incomeItem) {
                          return (
                            <SectionWrapper title={t('partnerPortalTitle')}>
                              <p className="text-sm text-gray-500">{t('partnerPortalNoSponsor')}</p>
                            </SectionWrapper>
                          );
                        }
                        return (
                          <LazyPartnerPortalSection
                            access={access}
                            incomeItem={incomeItem}
                            teamName={appState.teams.find((tm) => tm.id === access.teamId)?.name || 'Équipe'}
                            raceEvents={appState.raceEvents}
                            invoiceSettings={appState.invoiceSettings}
                            partnerNewsletters={appState.partnerNewsletters || []}
                            themePrimaryColor={appState.themePrimaryColor}
                            isPreview={isPreview}
                          />
                        );
                      })()}
                  {currentSection === "events" && (
                    <LazyEventsSection
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
                      currentUser={uiUser}
                      teamName={appState.teams.find((tm) => tm.id === appState.activeTeamId)?.name}
                      organizerContacts={viewAppState.organizerContacts || []}
                      onSaveOrganizerContact={onSaveOrganizerContact}
                      onSyncOrganizerContactsFromEvents={onSyncOrganizerContactsFromEvents}
                      onLoadDemoOrganizerExamples={onLoadDemoOrganizerExamples}
                    />
                  )}
                  {currentSection === "roster" && appState.riders && (
                    <LazyRosterSection
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
                      currentUser={uiUser}
                      appState={appState}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "season-planning" && appState.riders && (
                    <LazySeasonPlanningSection
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
                      currentUser={uiUser}
                      appState={appState}
                      onSaveRaceEvent={onSaveRaceEvent}
                      navigateTo={navigateTo}
                    />
                  )}
                  {currentSection === "staff" && appState.staff && uiUser && (
                    <LazyStaffSection
                      staff={appState.staff}
                      onSave={onSaveStaff}
                      onDelete={onDeleteStaff}
                      onSaveMeetingReport={onSaveMeetingReport}
                      onDeleteMeetingReport={onDeleteMeetingReport}
                      onStaffTransition={(archive, transition) => {
                        // TODO: Implémenter la sauvegarde des archives et transitions
                      }}
                      staffEventSelections={appState.staffEventSelections || []}
                      setStaffEventSelections={createPersistedBatchSetHandler<StaffEventSelection>("staffEventSelections")}
                      effectivePermissions={effectivePermissions}
                      raceEvents={appState.raceEvents}
                      eventStaffAvailabilities={appState.eventStaffAvailabilities}
                      eventBudgetItems={appState.eventBudgetItems}
                      setEventBudgetItems={createBatchSetHandler<EventBudgetItem>("eventBudgetItems")}
                      currentUser={uiUser}
                      team={appState.teams.find(t => t.id === appState.activeTeamId)}
                      performanceEntries={appState.performanceEntries}
                      missions={appState.missions}
                      setMissions={createPersistedBatchSetHandler<Mission>("missions")}
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
                  {currentSection === "vehicles" && effectivePermissions?.vehicles?.includes('view') && (
                    <LazyVehiclesSection
                      vehicles={appState.vehicles}
                      onSave={onSaveVehicle}
                      onDelete={(vehicleId) => {
                        const vehicle = appState.vehicles.find((v) => v.id === vehicleId);
                        if (vehicle) void onDeleteVehicle(vehicle);
                      }}
                      effectivePermissions={effectivePermissions}
                      staff={appState.staff}
                      eventTransportLegs={appState.eventTransportLegs}
                      raceEvents={appState.raceEvents}
                      navigateTo={navigateTo}
                      vehiclePositions={appState.vehiclePositions || []}
                      teamId={appState.activeTeamId || undefined}
                      teamName={
                        appState.teams.find((t) => t.id === appState.activeTeamId)?.name || 'team'
                      }
                      gpsWebhookKey={appState.gpsWebhookKey}
                      onGpsWebhookKeyUpdated={(key) =>
                        setAppState((prev) => ({ ...prev, gpsWebhookKey: key }))
                      }
                      initialTab={
                        currentSection === 'vehicles' && sectionTabHint === 'gps'
                          ? 'gps'
                          : currentSection === 'vehicles' && sectionTabHint === 'assignmentCalendar'
                            ? 'assignmentCalendar'
                            : undefined
                      }
                      onVehiclePositionsUpdate={(positions) =>
                        setAppState((prev) => ({ ...prev, vehiclePositions: positions }))
                      }
                    />
                  )}
                  {currentSection === "equipment" && effectivePermissions?.equipment?.includes('view') && (
                    <LazyEquipmentSection
                      equipment={appState.equipment}
                      onSave={onSaveEquipment}
                      onDelete={(itemId) => {
                        const item = appState.equipment.find((e) => e.id === itemId);
                        if (item) void onDeleteEquipment(item);
                      }}
                      effectivePermissions={effectivePermissions}
                      equipmentStockItems={appState.equipmentStockItems}
                      setEquipmentStockItems={createPersistedBatchSetHandler<EquipmentStockItem>("equipmentStockItems")}
                      riders={appState.riders}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={onSaveRider}
                      currentUser={uiUser}
                    />
                  )}
                  {currentSection === "accommodationHistory" && (
                    <LazyAccommodationHistorySection
                      appState={appState}
                      setEventAccommodations={createBatchSetHandler<EventAccommodation>(
                        "eventAccommodations"
                      )}
                      currentUser={uiUser}
                      navigateTo={navigateTo}
                    />
                  )}
                  {currentSection === "performance" && appState.riders && uiUser && (
                    <LazyPerformancePoleSection
                      appState={appState}
                      effectivePermissions={effectivePermissions}
                      currentUser={uiUser}
                      onSaveRaceEvent={onSaveRaceEvent}
                      navigateTo={navigateTo}
                    />
                  )}
                  {(currentSection === "settings" ||
                    currentSection === "userSettings" ||
                    currentSection === "pricing") &&
                    currentUser && (
                    <LazyUserSettingsSection
                      currentUser={uiUser}
                      initialTab={
                        currentSection === "pricing"
                          ? "abonnement"
                          : currentSection === "settings"
                            ? "equipe"
                            : "compte"
                      }
                      canManageTeam={
                        Boolean(appState.activeTeamId) &&
                        (uiUser.userRole === UserRole.MANAGER ||
                          uiUser.permissionRole === TeamRole.ADMIN)
                      }
                      showSubscriptionTab={true}
                      currentPlanId={subscriptionAccess?.planId}
                      onSelectPlan={handleUpgradePlan}
                      isIndependent={userIsIndependent}
                      userRole={uiUser.userRole}
                      canManageTeamBilling={
                        Boolean(appState.activeTeamId) &&
                        !userIsIndependent &&
                        (uiUser.userRole === UserRole.MANAGER ||
                          uiUser.permissionRole === TeamRole.ADMIN)
                      }
                      teamName={
                        appState.teams.find((t) => t.id === appState.activeTeamId)?.name
                      }
                      teamLogoBase64={appState.teamLogoUrl}
                      teamLogoMimeType={undefined}
                      setTeamLogoBase64={() => {}}
                      setTeamLogoMimeType={() => {}}
                      themePrimaryColor={appState.themePrimaryColor}
                      setThemePrimaryColor={(color) => {
                        setAppState((prev) => ({ ...prev, themePrimaryColor: color }));
                      }}
                      themeAccentColor={appState.themeAccentColor}
                      setThemeAccentColor={(color) => {
                        setAppState((prev) => ({ ...prev, themeAccentColor: color }));
                      }}
                      teamLevel={appState.teamLevel}
                      setTeamLevel={(level) => {
                        setAppState((prev) => ({ ...prev, teamLevel: level }));
                      }}
                      operationalSettings={appState.operationalSettings}
                      setOperationalSettings={(settings) => {
                        setAppState((prev) => ({ ...prev, operationalSettings: settings }));
                      }}
                      onSaveOperationalSettings={async () => {
                        if (!appState.activeTeamId) return;
                        await firebaseService.saveTeamSettings(appState.activeTeamId, {
                          level: appState.teamLevel,
                          operationalSettings: appState.operationalSettings,
                          themePrimaryColor: appState.themePrimaryColor,
                          themeAccentColor: appState.themeAccentColor,
                          language: appState.language,
                          ...(appState.operationalSettings?.gender
                            ? { gender: appState.operationalSettings.gender }
                            : {}),
                        });
                        setAppState((prev) => ({
                          ...prev,
                          teams: (prev.teams || []).map((t) =>
                            t.id === appState.activeTeamId
                              ? {
                                  ...t,
                                  gender: appState.operationalSettings?.gender ?? t.gender,
                                  operationalSettings: appState.operationalSettings,
                                }
                              : t
                          ),
                        }));
                      }}
                      onTeamLevelChanged={async (level) => {
                        const nextOps = getRecommendedOperationalSettings(level);
                        setAppState((prev) => ({
                          ...prev,
                          operationalSettings: nextOps,
                        }));
                        if (appState.activeTeamId) {
                          await firebaseService.saveTeamSettings(appState.activeTeamId, {
                            level,
                            operationalSettings: nextOps,
                          });
                        }
                      }}
                      onNavigateToChecklist={() => navigateTo('checklist')}
                      raceEvents={appState.raceEvents}
                      language={language}
                      setLanguage={(lang) => setLanguage(lang)}
                      team={appState.teams.find((t) => t.id === appState.activeTeamId)}
                      onUpdateTeam={async (team) => {
                        if (!appState.activeTeamId) return;
                        await firebaseService.saveTeamSettings(appState.activeTeamId, {
                          level: appState.teamLevel,
                          operationalSettings: appState.operationalSettings,
                          themePrimaryColor: appState.themePrimaryColor,
                          themeAccentColor: appState.themeAccentColor,
                          language: appState.language,
                        });
                        setAppState((prev) => ({
                          ...prev,
                          teams: prev.teams.map((t) => (t.id === team.id ? team : t)),
                        }));
                      }}
                      canDeleteTeam={
                        uiUser.userRole === UserRole.MANAGER ||
                        uiUser.permissionRole === TeamRole.ADMIN
                      }
                      onDeleteTeam={async (password) => {
                        if (!appState.activeTeamId) return;
                        const deletedTeamId = appState.activeTeamId;
                        await firebaseService.deleteTeamWithAuth(deletedTeamId, password);
                        setAppState((prev) => ({
                          ...prev,
                          teams: prev.teams.filter((t) => t.id !== deletedTeamId),
                          teamMemberships: prev.teamMemberships.filter((m) => m.teamId !== deletedTeamId),
                          activeTeamId: null,
                          riders: [],
                          staff: [],
                          raceEvents: [],
                        }));
                        if (currentUser) {
                          setCurrentUser({ ...currentUser, teamId: undefined });
                          setView("no_team");
                        }
                      }}
                      subscriptionAccess={subscriptionAccess ?? undefined}
                      onUpgradePlan={handleUpgradePlan}
                      onManageBillingPortal={handleBillingPortal}
                      onInstallPresentationDemo={
                        uiUser.userRole === UserRole.MANAGER ||
                        uiUser.permissionRole === TeamRole.ADMIN
                          ? onInstallPresentationDemo
                          : undefined
                      }
                      presentationDemoAlreadyInstalled={teamAlreadyHasDemoPresentation({
                        riders: appState.riders,
                        staff: appState.staff,
                        raceEvents: appState.raceEvents,
                        teams: appState.teams,
                      })}
                    />
                  )}
                  {currentSection === "financial" && appState.incomeItems && appState.eventBudgetItems && (
                    <LazyFinancialSection
                      incomeItems={appState.incomeItems}
                      budgetItems={appState.eventBudgetItems}
                      onSaveIncomeItem={onSaveIncomeItem}
                      onDeleteIncomeItem={onDeleteIncomeItem}
                      onSaveBudgetItem={onSaveBudgetItem}
                      onDeleteBudgetItem={onDeleteBudgetItem}
                      effectivePermissions={effectivePermissions}
                      raceEvents={appState.raceEvents}
                      teamName={appState.teams.find((t) => t.id === appState.activeTeamId)?.name ?? 'equipe'}
                      riders={appState.riders}
                      staff={appState.staff}
                      staffEventSelections={appState.staffEventSelections}
                      expenseReceipts={appState.expenseReceipts || []}
                      eventTransportLegs={appState.eventTransportLegs}
                      currentUser={uiUser}
                      teamId={appState.activeTeamId || ''}
                      onSaveExpenseReceipt={onSaveExpenseReceipt}
                      onSaveSepaSettings={onSaveSepaSettings}
                      onSaveInvoiceSettings={onSaveInvoiceSettings}
                      sepaSettings={appState.sepaSettings}
                      invoiceSettings={appState.invoiceSettings}
                      subscription={appState.subscription}
                      fallbackPlanId={getDefaultPlanForTeamLevel(appState.teamLevel ?? TeamLevel.HORS_DN)}
                      clientRecords={appState.clientRecords || []}
                      supplierInvoices={appState.supplierInvoices || []}
                      sepaBatches={appState.sepaBatches || []}
                      bankTransactions={appState.bankTransactions || []}
                      onSaveClientRecord={onSaveClientRecord}
                      onDeleteClientRecord={onDeleteClientRecord}
                      onSaveSupplierInvoice={onSaveSupplierInvoice}
                      onDeleteSupplierInvoice={onDeleteSupplierInvoice}
                      onSaveBankTransaction={onSaveBankTransaction}
                      onImportBankTransactions={onImportBankTransactions}
                      onSaveSepaBatch={onSaveSepaBatch}
                      onMarkSalariesPaid={onMarkSalariesPaid}
                      users={appState.users}
                      partnerAccesses={appState.partnerAccesses || []}
                      onSavePartnerAccess={onSavePartnerAccess}
                      onRevokePartnerAccess={onRevokePartnerAccess}
                      onOpenPartnerPortal={handleOpenPartnerPortal}
                      partnerNewsletters={appState.partnerNewsletters || []}
                      onSavePartnerNewsletter={onSavePartnerNewsletter}
                      onInstallDemoPartnerExample={onInstallDemoPartnerExample}
                      partnerMarketplaceProfiles={appState.partnerMarketplaceProfiles || []}
                      teamSponsorshipNeeds={appState.teamSponsorshipNeeds || []}
                      partnershipMatchRequests={appState.partnershipMatchRequests || []}
                      onSaveTeamSponsorshipNeed={onSaveTeamSponsorshipNeed}
                      onRespondPartnershipMatchRequest={onRespondPartnershipMatchRequest}
                      quotes={appState.quotes || []}
                      onSaveQuote={onSaveQuote}
                      onDeleteQuote={onDeleteQuote}
                      onConvertQuote={onConvertQuote}
                    />
                  )}
                  {currentSection === "expenseReceipts" && currentUser && (
                    isIndependentStaffUi ? (
                    <LazyExpenseReceiptsSection
                      receipts={uiUser.personalExpenseReceipts || []}
                      raceEvents={[]}
                      transportLegs={[]}
                      currentUser={uiUser}
                      staff={staffForUi}
                      teamId={uiUser.id}
                      teamName="Espace vacataire"
                      effectivePermissions={effectivePermissions}
                      onSaveReceipt={onSaveIndependentExpenseReceipt}
                      defaultEventId={receiptScanDefaults.eventId}
                      defaultTransportLegId={receiptScanDefaults.transportLegId}
                      autoOpenScanner={receiptScanDefaults.openScanner}
                      onScannerOpened={() => setReceiptScanDefaults({})}
                    />
                    ) : appState.activeTeamId ? (
                    <LazyExpenseReceiptsSection
                      receipts={appState.expenseReceipts || []}
                      raceEvents={appState.raceEvents}
                      transportLegs={appState.eventTransportLegs}
                      currentUser={uiUser}
                      staff={appState.staff}
                      teamId={appState.activeTeamId}
                      teamName={appState.teams.find((t) => t.id === appState.activeTeamId)?.name ?? 'equipe'}
                      effectivePermissions={effectivePermissions}
                      onSaveReceipt={onSaveExpenseReceipt}
                      onSaveBudgetItem={onSaveBudgetItem}
                      defaultEventId={receiptScanDefaults.eventId}
                      defaultTransportLegId={receiptScanDefaults.transportLegId}
                      autoOpenScanner={receiptScanDefaults.openScanner}
                      onScannerOpened={() => setReceiptScanDefaults({})}
                    />
                    ) : null
                  )}
                  {currentSection === "scouting" && (
                    <LazyScoutingSection
                      scoutingProfiles={appState.scoutingProfiles}
                      riders={appState.riders}
                      onSaveScoutingProfile={onSaveScoutingProfile}
                      onDeleteScoutingProfile={onDeleteScoutingProfile}
                      onSaveRider={onSaveRider}
                      onCreateScoutingRequest={async (athleteId, message, requestedScopes) => {
                        const teamId =
                          appState.activeTeamId ||
                          resolveSuperAdminTeamId(currentUser, appState.teams);
                        if (!teamId) throw new Error('Aucune équipe disponible pour le scouting');
                        const requestId = await firebaseService.createScoutingRequest({
                          requesterTeamId: teamId,
                          athleteId,
                          message,
                          requestedScopes,
                          prospectLevel: ProspectLevel.CONTACT_REQUEST,
                        });
                        setAppState((prev) => ({
                          ...prev,
                          scoutingRequests: [
                            ...(prev.scoutingRequests || []),
                            {
                              id: requestId,
                              requesterTeamId: teamId,
                              athleteId,
                              status: ScoutingRequestStatus.PENDING,
                              prospectLevel: ProspectLevel.CONTACT_REQUEST,
                              requestedScopes: requestedScopes ?? [],
                              requestDate: new Date().toISOString(),
                              message: message || '',
                            },
                          ],
                        }));
                        return requestId;
                      }}
                      effectivePermissions={effectivePermissions}
                      appState={appState}
                      currentTeamId={
                        appState.activeTeamId ||
                        resolveSuperAdminTeamId(currentUser, appState.teams)
                      }
                      onRecruitmentTargetChange={async (target: TeamRecruitmentTarget) => {
                        const teamId =
                          appState.activeTeamId ||
                          resolveSuperAdminTeamId(currentUser, appState.teams);
                        if (!teamId) return;
                        const nextOps: TeamOperationalSettings = {
                          ...(appState.operationalSettings ?? {}),
                          recruitmentTarget: target,
                        };
                        setAppState((prev) => ({ ...prev, operationalSettings: nextOps }));
                        await firebaseService.saveTeamSettings(teamId, { operationalSettings: nextOps });
                      }}
                      setRecruitmentOffers={createPersistedBatchSetHandler("recruitmentOffers")}
                      setRecruitmentCampaigns={createPersistedBatchSetHandler("recruitmentCampaigns")}
                      onReviewRiderApplication={async (membership, action) => {
                        if (action === "deny") {
                          if (!window.confirm(`Refuser la candidature de ${membership.email} ?`)) return;
                          await deleteDoc(doc(db, "teamMemberships", membership.id));
                          setAppState((prev) => ({
                            ...prev,
                            teamMemberships: prev.teamMemberships.filter((m) => m.id !== membership.id),
                          }));
                          return;
                        }
                        const existingUser =
                          appState.users.find((u) => u.id === membership.userId) ||
                          appState.users.find((u) => u.email === membership.email);
                        const userId = membership.userId || existingUser?.id;
                        const email = membership.email || existingUser?.email;
                        if (!userId || !email || !membership.teamId) {
                          alert("Utilisateur introuvable pour cette candidature.");
                          return;
                        }
                        const approvedRole = (membership.userRole || UserRole.COUREUR) as UserRole;
                        const { riderCreated } = await firebaseService.approveTeamMembership(
                          {
                            membershipId: membership.id,
                            userId,
                            teamId: membership.teamId,
                            userRole: approvedRole,
                            email,
                            firstName: membership.firstName || existingUser?.firstName,
                            lastName: membership.lastName || existingUser?.lastName,
                          },
                          currentUser!.id,
                          existingUser,
                        );
                        setAppState((prev) => {
                          const updatedUsers = prev.users.map((u) =>
                            u.id === userId
                              ? { ...u, teamId: membership.teamId, userRole: approvedRole, permissionRole: TeamRole.MEMBER }
                              : u,
                          );
                          let riders = prev.riders;
                          if (riderCreated) {
                            riders = [
                              ...riders,
                              buildDefaultRider(
                                {
                                  id: userId,
                                  firstName: membership.firstName || existingUser?.firstName || "",
                                  lastName: membership.lastName || existingUser?.lastName || "",
                                  email,
                                },
                                existingUser?.signupInfo,
                              ),
                            ];
                          }
                          return {
                            ...prev,
                            users: updatedUsers,
                            riders,
                            teamMemberships: prev.teamMemberships.map((m) =>
                              m.id === membership.id
                                ? { ...m, status: TeamMembershipStatus.ACTIVE, approvedAt: new Date().toISOString() }
                                : m,
                            ),
                          };
                        });
                        alert("Candidature acceptée.");
                      }}
                    />
                  )}
                  {(currentSection === "userManagement" || currentSection === "permissions") &&
                    appState.users &&
                    appState.teamMemberships && (
                    <LazyTeamAccessSection
                      initialTab={currentSection === "permissions" ? "roles" : "membres"}
                      appState={appState}
                      currentTeamId={appState.activeTeamId || ''}
                      permissions={appState.permissions}
                      setPermissions={(updater) => {
                        setAppState((prev) => ({
                          ...prev,
                          permissions: typeof updater === 'function' ? updater(prev.permissions) : updater,
                        }));
                      }}
                      permissionRoles={appState.permissionRoles}
                      setPermissionRoles={(updater) => {
                        setAppState((prev) => ({
                          ...prev,
                          permissionRoles: typeof updater === 'function' ? updater(prev.permissionRoles) : updater,
                        }));
                      }}
                      users={appState.users}
                      onSave={async (permissions, permissionRoles) => {
                        await firebaseService.savePermissionsConfig(permissions, permissionRoles);
                        setAppState((prev) => ({ ...prev, permissions, permissionRoles }));
                      }}
                      onApprove={async (membership) => {
                        try {
                          if (!membership?.id || !membership.teamId) {
                            alert('Erreur: Données d\'adhésion invalides');
                            return;
                          }

                          if (!currentUser || !effectivePermissions) {
                            alert('Erreur: Permissions non définies. Veuillez vous reconnecter.');
                            return;
                          }

                          const canApproveMemberships =
                            isSuperAdminUser(currentUser) ||
                            (effectivePermissions?.userManagement?.includes('edit')) ||
                            currentUser.permissionRole === TeamRole.ADMIN ||
                            currentUser.userRole === UserRole.MANAGER;

                          if (!canApproveMemberships) {
                            alert('Erreur: Vous n\'avez pas les permissions nécessaires pour approuver des adhésions.');
                            return;
                          }

                          const existingUser =
                            appState.users.find((u) => u.id === membership.userId) ||
                            appState.users.find((u) => u.email === membership.email);

                          const userId = membership.userId || existingUser?.id;
                          const email = membership.email || existingUser?.email;

                          if (!userId || !email) {
                            alert('Erreur: Utilisateur introuvable pour cette demande.');
                            return;
                          }

                          const approvedRole = (membership.userRole || membership.requestedUserRole || UserRole.COUREUR) as UserRole;

                          const { riderCreated, staffCreated } = await firebaseService.approveTeamMembership(
                            {
                              membershipId: membership.id,
                              userId,
                              teamId: membership.teamId,
                              userRole: approvedRole,
                              email,
                              firstName: membership.firstName || existingUser?.firstName,
                              lastName: membership.lastName || existingUser?.lastName,
                            },
                            currentUser.id,
                            existingUser
                          );

                          const now = new Date().toISOString();
                          setAppState((prev: AppState) => {
                            const updatedUsers = prev.users.map((u) =>
                              u.id === userId
                                ? { ...u, teamId: membership.teamId, userRole: approvedRole, permissionRole: TeamRole.MEMBER }
                                : u
                            );

                            let riders = prev.riders;
                            let staff = prev.staff;

                            if (riderCreated && approvedRole === UserRole.COUREUR) {
                              riders = [...riders, buildDefaultRider(
                                {
                                  id: userId,
                                  firstName: membership.firstName || existingUser?.firstName || '',
                                  lastName: membership.lastName || existingUser?.lastName || '',
                                  email,
                                },
                                existingUser?.signupInfo
                              )];
                            }

                            if (staffCreated && approvedRole === UserRole.STAFF) {
                              staff = [...staff, buildDefaultStaffMember({
                                id: userId,
                                firstName: membership.firstName || existingUser?.firstName || '',
                                lastName: membership.lastName || existingUser?.lastName || '',
                                email,
                              })];
                            }

                            return {
                              ...prev,
                              users: updatedUsers,
                              riders,
                              staff,
                              teamMemberships: prev.teamMemberships.map((m) =>
                                m.id === membership.id
                                  ? { ...m, status: TeamMembershipStatus.ACTIVE, approvedAt: now, approvedBy: currentUser.id }
                                  : m
                              ),
                            };
                          });

                          const displayName = `${membership.firstName || existingUser?.firstName || ''} ${membership.lastName || existingUser?.lastName || ''}`.trim();
                          const roleText = approvedRole === UserRole.STAFF ? 'staff' : 'effectif';
                          alert(`✅ ${displayName || email} a été approuvé et ajouté à l'${roleText} !`);
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
                          const canDenyMemberships =
                            isSuperAdminUser(currentUser) ||
                            (effectivePermissions && effectivePermissions['userManagement'] && Array.isArray(effectivePermissions['userManagement']) && effectivePermissions['userManagement'].includes('edit')) ||
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
                          if (!currentUser || !effectivePermissions) {
                            alert('Erreur: Permissions non définies. Veuillez vous reconnecter.');
                            return;
                          }

                          const canInviteMembers =
                            effectivePermissions?.userManagement?.includes('edit') ||
                            currentUser.permissionRole === TeamRole.ADMIN ||
                            currentUser.userRole === UserRole.MANAGER;

                          if (!canInviteMembers) {
                            alert('Erreur: Vous n\'avez pas les permissions nécessaires pour inviter des membres.');
                            return;
                          }

                          const team = appState.teams.find((t) => t.id === teamId);
                          const existingUser = appState.users.find(
                            (u) => u.email.toLowerCase() === email.trim().toLowerCase()
                          );

                          const { sendTeamInvitation } = await import('./services/inviteService');
                          const result = await sendTeamInvitation({
                            email: email.trim(),
                            teamId,
                            teamName: team?.name || 'Équipe',
                            userRole,
                            invitedBy: currentUser.id,
                            existingUserId: existingUser?.id,
                          });

                          setAppState((prev: AppState) => ({
                            ...prev,
                            teamMemberships: [
                              ...prev.teamMemberships,
                              {
                                id: result.membershipId,
                                email: email.trim().toLowerCase(),
                                teamId,
                                teamName: team?.name,
                                status: TeamMembershipStatus.PENDING,
                                userRole,
                                requestedUserRole: userRole,
                                userId: existingUser?.id,
                                invitedBy: currentUser.id,
                                invitedAt: new Date().toISOString(),
                                source: 'email_invite',
                              },
                            ],
                          }));

                          alert(result.message);
                        } catch (error) {
                          console.error('Erreur lors de l\'invitation:', error);
                          const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'invitation';
                          alert(message);
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
                              users: (prev.users || []).map(u => 
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
                            users: (prev.users || []).map(u => 
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
                              qualitativeProfile: RiderQualitativeProfile.ROULEUR,
                              disciplines: [getSafeDisciplinePracticed("Route")],
                              categories: ['Senior'],
                              forme: getSafeFormeStatus("Bonne"),
                              moral: getSafeMoralStatus("Bon"),
                              healthCondition: getSafeHealthCondition("Bon"),
                              // Autres propriétés avec valeurs par défaut
                              resultsHistory: [],
                              favoriteRaces: [],
                              performanceGoals: '',
                              physiquePerformanceProject: emptyPerformanceFactor(),
                              techniquePerformanceProject: emptyPerformanceFactor(),
                              mentalPerformanceProject: emptyPerformanceFactor(),
                              environnementPerformanceProject: emptyPerformanceFactor(),
                              tactiquePerformanceProject: emptyPerformanceFactor(),
                              allergies: [],
                              performanceNutrition: {
                                hydrationStrategy: '',
                                preRaceMeal: '',
                                duringRaceNutrition: '',
                                recoveryNutrition: ''
                              },
                              roadBikeSetup: emptyBikeSetup(getSafeBikeType("Route")),
                              ttBikeSetup: emptyBikeSetup(getSafeBikeType("Contre-la-montre")),
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
                            users: (prev.users || []).map(u => 
                              u.id === userId 
                                ? { ...u, permissionRole: newPermissionRole as TeamRole }
                                : u
                            )
                          }));

                          alert('Rôle de permission mis à jour avec succès');
                        } catch (error) {
                          console.error('Erreur lors de la mise à jour des permissions:', error);
                          alert('Erreur lors de la mise à jour des permissions');
                        }
                      }}
                      onUpdateUserCustomPermissions={async (userId, customDeltas) => {
                        const userDocRef = doc(db, "users", userId);
                        const payload =
                          Object.keys(customDeltas).length > 0
                            ? { customPermissions: customDeltas, updatedAt: new Date().toISOString() }
                            : { customPermissions: null, updatedAt: new Date().toISOString() };
                        await setDoc(userDocRef, payload, { merge: true });
                        setAppState((prev) => ({
                          ...prev,
                          users: (prev.users || []).map((u) =>
                            u.id === userId
                              ? {
                                  ...u,
                                  customPermissions:
                                    Object.keys(customDeltas).length > 0 ? customDeltas : undefined,
                                }
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
                              users: (prev.users || []).map(u => 
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
                  {currentSection === "independentHub" && currentUser && userIsIndependent && (
                    <LazyIndependentSpaceSection
                      currentUser={uiUser}
                      teams={appState.teams}
                      scoutingRequests={appState.scoutingRequests || []}
                      subscriptionAccess={subscriptionAccess ?? undefined}
                      onUpgradePlan={() =>
                        handleUpgradePlan(getIndependentPlanIdForRole(uiUser.userRole))
                      }
                      onManageBilling={handleBillingPortal}
                      onUpdateProfile={handleSaveIndependentProfile}
                      onRespondToScoutingRequest={async (requestId, response, grantedScopes) => {
                        await firebaseService.respondToScoutingRequest(requestId, response, grantedScopes);
                        setAppState((prev) => ({
                          ...prev,
                          scoutingRequests: (prev.scoutingRequests || []).map((r) =>
                            r.id === requestId
                              ? {
                                  ...r,
                                  status: response === 'accepted' ? ScoutingRequestStatus.ACCEPTED : ScoutingRequestStatus.REJECTED,
                                  responseDate: new Date().toISOString(),
                                  ...(response === 'accepted' && grantedScopes?.length
                                    ? { grantedScopes }
                                    : {}),
                                }
                              : r
                          ),
                        }));
                      }}
                      onGoToLobby={() => setView("no_team")}
                    />
                  )}
                  {currentSection === "career" && currentUser && (
                    <LazyCareerSection
                      riders={appState.riders}
                      staff={appState.staff}
                      currentUser={uiUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      setStaff={createBatchSetHandler<StaffMember>("staff")}
                      teams={appState.teams}
                      currentTeamId={appState.activeTeamId}
                      teamMemberships={appState.teamMemberships || []}
                      onRequestTransfer={async (destinationTeamId: string) => {
                        // TODO: Implémenter la logique de demande de transfert
                      }}
                      scoutingRequests={appState.scoutingRequests || []}
                      onRespondToScoutingRequest={async (requestId: string, response: 'accepted' | 'rejected', grantedScopes) => {
                        await firebaseService.respondToScoutingRequest(requestId, response, grantedScopes);
                        setAppState((prev) => ({
                          ...prev,
                          scoutingRequests: (prev.scoutingRequests || []).map((r) =>
                            r.id === requestId
                              ? {
                                  ...r,
                                  status: response === 'accepted' ? ScoutingRequestStatus.ACCEPTED : ScoutingRequestStatus.REJECTED,
                                  responseDate: new Date().toISOString(),
                                  ...(response === 'accepted' && grantedScopes?.length
                                    ? { grantedScopes }
                                    : {}),
                                }
                              : r
                          ),
                        }));
                      }}
                      onSaveIndependentProfile={userIsIndependent ? handleSaveIndependentProfile : undefined}
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
                            
                            setCurrentUser((prev) => prev ? { ...prev, isSearchable: updates.isSearchable } : prev);
                            setAppState((prev: AppState) => ({
                              ...prev,
                              users: (prev.users || []).map(u => 
                                u.id === currentUser.id 
                                  ? { ...u, isSearchable: updates.isSearchable }
                                  : u
                              )
                            }));
                          }

                          if (updates.openToMissions !== undefined) {
                            const userRef = doc(db, 'users', currentUser.id);
                            await updateDoc(userRef, {
                              openToExternalMissions: updates.openToMissions,
                              updatedAt: new Date().toISOString()
                            });
                            setCurrentUser((prev) => prev ? { ...prev, openToExternalMissions: updates.openToMissions } : prev);
                            setAppState((prev: AppState) => ({
                              ...prev,
                              users: (prev.users || []).map(u =>
                                u.id === currentUser.id
                                  ? { ...u, openToExternalMissions: updates.openToMissions }
                                  : u
                              ),
                            }));
                          }
                          
                          // Mettre à jour le profil coureur si membre d'une équipe
                          if (!userIsIndependent && currentUser.userRole === UserRole.COUREUR && updates.isSearchable !== undefined) {
                            if (!appState.activeTeamId) {
                              alert('Aucune équipe active. Impossible de mettre à jour la visibilité.');
                              return;
                            }
                            const riderProfile = (appState.riders || []).find(r => r.email === currentUser.email);
                            if (riderProfile) {
                              const riderRef = doc(db, 'teams', appState.activeTeamId, 'riders', riderProfile.id);
                              await updateDoc(riderRef, {
                                isSearchable: updates.isSearchable,
                                updatedAt: new Date().toISOString()
                              });
                              
                              // Mettre à jour l'état local des coureurs
                              setAppState((prev: AppState) => ({
                                ...prev,
                                riders: (prev.riders || []).map(r => 
                                  r.id === riderProfile.id 
                                    ? { ...r, isSearchable: updates.isSearchable }
                                    : r
                                )
                              }));
                            }
                          }
                          
                          // Mettre à jour le profil staff si membre d'une équipe
                          if (!userIsIndependent && currentUser.userRole !== UserRole.COUREUR && updates.openToMissions !== undefined) {
                            if (!appState.activeTeamId) {
                              alert('Aucune équipe active. Impossible de mettre à jour la disponibilité.');
                              return;
                            }
                            const staffProfile = (appState.staff || []).find(s => s.email === currentUser.email);
                            if (staffProfile) {
                              const staffRef = doc(db, 'teams', appState.activeTeamId, 'staff', staffProfile.id);
                              await updateDoc(staffRef, {
                                openToExternalMissions: updates.openToMissions,
                                updatedAt: new Date().toISOString()
                              });
                              
                              // Mettre à jour l'état local du staff
                              setAppState((prev: AppState) => ({
                                ...prev,
                                staff: (prev.staff || []).map(s => 
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
                    <LazyNutritionSection
                      rider={
                        resolvedUiRider ||
                        (uiUser.userRole === UserRole.COUREUR
                          ? userToRiderProfile(uiUser)
                          : undefined)
                      }
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={saveRiderForUiUser}
                      teamProducts={
                        viewAppState.teamProducts?.length
                          ? viewAppState.teamProducts
                          : appState.teamProducts
                      }
                      setTeamProducts={createBatchSetHandler<TeamProduct>("teamProducts")}
                    />
                  )}
                  {currentSection === "riderEquipment" && (
                    <LazyRiderEquipmentSection
                      riders={ridersForUi}
                      equipment={
                        viewAppState.equipment?.length
                          ? viewAppState.equipment
                          : appState.equipment
                      }
                      currentUser={uiUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={saveRiderForUiUser}
                    />
                  )}
                  {currentSection === "myProfile" && currentUser && (
                    <LazyMyProfileSection
                      riders={ridersForUi}
                      staff={staffForUi}
                      currentUser={uiUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={saveRiderForUiUser}
                      onSaveStaff={saveStaffForUiUser}
                      setStaff={createBatchSetHandler<StaffMember>("staff")}
                      onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
                      currentTeam={
                        userIsIndependent
                          ? undefined
                          : appState.teams.find(team => team.id === appState.activeTeamId)
                      }
                      raceEvents={appState.raceEvents}
                      riderEventSelections={appState.riderEventSelections}
                      setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                      appState={appState}
                    />
                  )}
                  {currentSection === "myCalendar" && currentUser && (
                    isIndependentStaffUi ? (
                    <LazyIndependentStaffCalendarSection
                      currentUser={uiUser}
                      missions={[
                        ...(appState.missions || []),
                        ...buildDemoAcceptedMissionsForUser(uiUser.id),
                      ]}
                      teams={appState.teams}
                      raceEvents={appState.raceEvents}
                      onNavigateToMissions={() => navigateTo('missionSearch')}
                      onOpenEvent={(eventId) => navigateTo('eventDetail', eventId)}
                    />
                    ) : isIndependentRiderUi ? (
                    <LazyIndependentAthleteCalendarSection
                      currentUser={uiUser}
                      includeDemo={
                        userIsSuperAdmin &&
                        isIndependentPreviewMode(superAdminPreview.mode)
                      }
                      readOnly={
                        userIsSuperAdmin &&
                        isIndependentPreviewMode(superAdminPreview.mode)
                      }
                      onSaveCalendar={async (entries) => {
                        await handleSaveIndependentProfile({ personalRaceCalendar: entries });
                      }}
                      onNavigateToTeamSearch={() => navigateTo('teamSearch')}
                    />
                    ) : (
                    <LazyMyCalendarSection
                      riders={ridersForUi}
                      currentUser={uiUser}
                      raceEvents={appState.raceEvents}
                      riderEventSelections={appState.riderEventSelections}
                      setRiderEventSelections={createBatchSetHandler<RiderEventSelection>("riderEventSelections")}
                      effectivePermissions={effectivePermissions}
                      navigateTo={navigateTo}
                      convocationNotifications={userNotifications}
                      onMarkConvocationRead={markNotificationRead}
                    />
                    )
                  )}
                  {currentSection === "myResults" && currentUser && (
                    <LazyMyResultsSection
                      riders={ridersForUi}
                      currentUser={uiUser}
                      onSaveRider={saveRiderForUiUser}
                    />
                  )}
                  {currentSection === "myPerformance" && currentUser && isIndependentRiderUi && (
                    <LazyMyPerformanceSection
                      riders={ridersForUi}
                      currentUser={uiUser}
                      onSaveRider={saveRiderForUiUser}
                    />
                  )}
                  
                  {/* Nouvelles sections pour le back-office coureur */}
                  {currentSection === "myCareer" && currentUser && userIsIndependent && (
                    <LazyCareerSection
                      riders={ridersForUi}
                      staff={staffForUi}
                      currentUser={uiUser}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      setStaff={createBatchSetHandler<StaffMember>("staff")}
                      teams={appState.teams}
                      currentTeamId={null}
                      teamMemberships={appState.teamMemberships || []}
                      onRequestTransfer={async () => {}}
                      scoutingRequests={appState.scoutingRequests || []}
                      onRespondToScoutingRequest={async (requestId, response, grantedScopes) => {
                        await firebaseService.respondToScoutingRequest(requestId, response, grantedScopes);
                        setAppState((prev) => ({
                          ...prev,
                          scoutingRequests: (prev.scoutingRequests || []).map((r) =>
                            r.id === requestId
                              ? {
                                  ...r,
                                  status: response === 'accepted' ? ScoutingRequestStatus.ACCEPTED : ScoutingRequestStatus.REJECTED,
                                  responseDate: new Date().toISOString(),
                                  ...(response === 'accepted' && grantedScopes?.length
                                    ? { grantedScopes }
                                    : {}),
                                }
                              : r
                          ),
                        }));
                      }}
                      onUpdateVisibility={async (updates) => {
                        await handleSaveIndependentProfile({
                          ...(updates.isSearchable !== undefined ? { isSearchable: updates.isSearchable } : {}),
                          ...(updates.openToMissions !== undefined ? { openToExternalMissions: updates.openToMissions } : {}),
                        });
                      }}
                      onSaveIndependentProfile={handleSaveIndependentProfile}
                    />
                  )}
                  {currentSection === "myCareer" && currentUser && !userIsIndependent && (
                    <LazyMyCareerSection
                      riders={viewAppState.riders}
                      currentUser={uiUser}
                      onSaveRider={onSaveRider}
                      teams={appState.teams}
                      appState={viewAppState as AppState}
                      teamBenchmarks={{
                        riders: appState.riders,
                        performanceArchives: appState.performanceArchives ?? [],
                      }}
                      onSaveRaceEvent={onSaveRaceEvent}
                      navigateTo={navigateTo}
                    />
                  )}
                  {currentSection === "myStages" && currentUser && (
                    <SectionSuspense>
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <h2 className="text-lg font-bold text-gray-900">Mes Stages</h2>
                          <p className="text-sm text-gray-500 mt-1">
                            Suivi quotidien (HRV, SpO₂, hydratation…) et monitoring graphique de vos camps.
                          </p>
                        </div>
                        <StageCampPerformancePanel
                          appState={viewAppState as AppState}
                          onSaveRaceEvent={onSaveRaceEvent}
                          lockedRiderId={getOwnRider(viewAppState.riders, uiUser)?.id}
                          readOnly={false}
                          onOpenEvent={(eventId) => navigateTo('eventDetail', eventId)}
                        />
                      </div>
                    </SectionSuspense>
                  )}
                  {currentSection === "adminDossier" && currentUser && (
                    <LazyMyAdminSection
                      riders={viewAppState.riders}
                      staff={viewAppState.staff}
                      currentUser={uiUser}
                      raceEvents={viewAppState.raceEvents}
                      riderEventSelections={viewAppState.riderEventSelections}
                      onSaveRider={onSaveRider}
                      onSaveStaff={onSaveStaff}
                      onUpdateRiderPreference={handleUpdateRiderPreference}
                      appState={viewAppState}
                      effectivePermissions={effectivePermissions}
                    />
                  )}
                  {currentSection === "superAdmin" && currentUser && (
                    <LazySuperAdminSection
                      riders={appState.riders}
                      staff={appState.staff}
                      currentUser={currentUser}
                      onDeleteRider={onDeleteRider}
                      onDeleteStaff={onDeleteStaff}
                      appState={appState}
                    />
                  )}
                  {currentSection === "myTrips" && (
                    <LazyMyTripsSection
                      riders={appState.riders}
                      staff={staffForUi}
                      eventTransportLegs={appState.eventTransportLegs}
                      raceEvents={appState.raceEvents}
                      eventDocuments={appState.eventDocuments}
                      teams={appState.teams}
                      activeTeamId={userIsIndependent ? null : appState.activeTeamId}
                      teamLevel={appState.teamLevel}
                      riderEventSelections={appState.riderEventSelections}
                      currentUser={uiUser}
                      onNavigateToReceipts={(eventId, transportLegId) => {
                        setReceiptScanDefaults({ eventId, transportLegId, openScanner: true });
                        setCurrentSection('expenseReceipts');
                      }}
                      onOpenEvent={(eventId) => navigateTo('eventDetail', eventId)}
                      onOpenEventDocuments={(eventId) => navigateTo('eventDetail', eventId)}
                      onUpdateEventDocument={(doc) => {
                        createBatchSetHandler<EventRaceDocument>('eventDocuments')(
                          prev => prev.map(d => (d.id === doc.id ? doc : d)),
                        );
                      }}
                      onEnsureUciDocuments={(docs) => {
                        createBatchSetHandler<EventRaceDocument>('eventDocuments')(
                          prev => [...prev, ...docs],
                        );
                      }}
                      vehicles={appState.vehicles}
                      teamId={appState.activeTeamId || undefined}
                      onDriverGpsRecorded={({
                        staffId,
                        latitude,
                        longitude,
                        speedKmh,
                        recordedAt,
                        vehicleIds,
                      }) => {
                        setAppState((prev) => ({
                          ...prev,
                          staff: prev.staff.map((s) =>
                            s.id === staffId
                              ? {
                                  ...s,
                                  lastLatitude: latitude,
                                  lastLongitude: longitude,
                                  lastPositionAt: recordedAt,
                                  lastSpeedKmh: speedKmh,
                                }
                              : s,
                          ),
                          vehicles: prev.vehicles.map((v) =>
                            vehicleIds.includes(v.id)
                              ? {
                                  ...v,
                                  lastLatitude: latitude,
                                  lastLongitude: longitude,
                                  lastPositionAt: recordedAt,
                                  lastSpeedKmh: speedKmh,
                                  gpsSource: 'driver_app' as const,
                                  gpsTrackingEnabled: true,
                                }
                              : v,
                          ),
                          vehiclePositions: [
                            {
                              id: `driver-${staffId}-${recordedAt}`,
                              vehicleId: vehicleIds[0] || '',
                              latitude,
                              longitude,
                              speedKmh,
                              recordedAt,
                              source: 'driver_app' as const,
                            },
                            ...(prev.vehiclePositions || []),
                          ].slice(0, 200),
                        }));
                      }}
                    />
                  )}
                  {currentSection === "stocks" && appState.stockItems && effectivePermissions?.stocks?.includes('view') && (
                    <LazyStocksSection
                      stockItems={appState.stockItems}
                      setStockItems={createPersistedBatchSetHandler<StockItem>("stockItems")}
                      staff={appState.staff}
                      warehouses={appState.warehouses}
                      setWarehouses={createPersistedBatchSetHandler("warehouses")}
                      stockMovements={appState.stockMovements || []}
                      setStockMovements={createPersistedBatchSetHandler("stockMovements")}
                      teamName={appState.teams.find((tm) => tm.id === appState.activeTeamId)?.name}
                    />
                  )}
                  {currentSection === "checklist" && (
                    <LazyChecklistSection
                      checklistTemplates={appState.checklistTemplates}
                      onSaveChecklistTemplate={onSaveChecklistTemplate}
                      onDeleteChecklistTemplate={onDeleteChecklistTemplate}
                      onImportChecklistTemplates={onImportChecklistTemplates}
                      effectivePermissions={effectivePermissions}
                      teamLevel={appState.teamLevel}
                      operationalSettings={appState.operationalSettings}
                      raceEvents={appState.raceEvents}
                      onNavigateToSettings={() => navigateTo('settings')}
                    />
                  )}
                  {currentSection === "missionSearch" && currentUser && (
                    <LazyMissionSearchSection
                      missions={appState.missions}
                      teams={appState.teams}
                      currentUser={uiUser}
                      setMissions={userIsIndependent
                        ? (updater) => {
                            setAppState((prev) => ({
                              ...prev,
                              missions: typeof updater === 'function' ? updater(prev.missions) : updater,
                            }));
                          }
                        : createPersistedBatchSetHandler<Mission>("missions")}
                      onApplyToMission={async (mission) => {
                        await firebaseService.applyToMission(mission.teamId, mission.id, currentUser.id, {
                          firstName: currentUser.firstName,
                          lastName: currentUser.lastName,
                          email: currentUser.email,
                          phone: currentUser.phone,
                        });
                      }}
                    />
                  )}
                  {currentSection === "teamSearch" && currentUser && (
                    <LazyTeamSearchSection
                      teams={appState.teams ?? []}
                      teamMemberships={appState.teamMemberships ?? []}
                      currentUser={uiUser}
                      currentTeamId={appState.activeTeamId}
                      openRecruitmentOffers={appState.openRecruitmentOffers ?? []}
                      onApplyToTeam={handleTeamPortalApply}
                    />
                  )}
                  {currentSection === "automatedPerformanceProfile" && (
                    <LazyAutomatedPerformanceProfileSection
                      rider={resolvedUiRider}
                    />
                  )}
                  {currentSection === "performanceProject" && (
                    <LazyPerformanceProjectSection
                      rider={resolvedUiRider}
                      setRiders={createBatchSetHandler<Rider>("riders")}
                      onSaveRider={saveRiderForUiUser}
                    />
                  )}
                    </>
                    </SectionSuspense>
                  )}
                </div>
              )}
              </SectionErrorBoundary>
          </MobileShell>
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

  return (
    <LanguageProvider language={language} setLanguage={setLanguage}>
      {renderContent()}
    </LanguageProvider>
  );
};

export default App;


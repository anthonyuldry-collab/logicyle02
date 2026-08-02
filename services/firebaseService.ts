import { db, storage, auth, app } from '../firebaseConfig';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  updateDoc,
  runTransaction,
  query,
  where,
  collectionGroup,
  onSnapshot,
  orderBy,
  limit,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { 
  updatePassword, 
  deleteUser, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  signOut
} from 'firebase/auth';
import { buildEmptyChecklistTemplatesRecord } from '../utils/checklistRoleUtils';
import { getRecommendedOperationalSettings } from '../utils/teamOperationalUtils';
import { 
  TeamState,
  GlobalState, 
  User, 
  Team, 
  TeamMembership, 
  AppPermissions,
  AppSection,
  PermissionLevel,
  TeamRole,
  UserRole,
  TeamMembershipStatus,
  TeamLevel,
  StaffMember,
  StaffStatus,
  StaffRole,
  Sex,
  SignupInfo,
  ChecklistRole,
  ChecklistTemplate,
  PowerProfile,
  PowerProfileHistory,
  Mission,
  MissionStatus,
  MissionApplication,
  MissionApplicationStatus,
  ScoutingRequest,
  ScoutingRequestStatus,
  ScoutingDataScope,
  ProspectLevel,
  SignupMode,
  PermissionRole,
  Organization,
  PartnerAccess,
  PartnerMarketplaceProfile,
  TeamSponsorshipNeed,
  PartnershipMatchRequest,
  PartnershipMatchStatus,
  RaceEvent,
  Rider,
  VehiclePosition,
  IncomeItem,
  EventBudgetItem,
  TeamRecruitmentOffer,
  TeamRecruitmentOfferStatus,
  TeamInvoiceSettings,
  TeamSepaSettings,
} from '../types';
import { SignupData } from '../sections/SignupView';
import {
    SECTIONS,
    TEAM_STATE_COLLECTIONS,
    TEAM_STATE_PRIORITY_COLLECTIONS,
    TEAM_STATE_DEFERRED_COLLECTIONS,
    getInitialGlobalState,
    LEGAL_VERSIONS,
} from '../constants';
import { resolveDocumentSequence } from '../utils/invoiceSequenceUtils';
import {
  DEFAULT_ROLE_PERMISSIONS,
  mergeConfiguredPermissions,
  MY_SPACE_SECTIONS,
  resolveRolePermissions,
  mergeSectionGrants,
  getStaffMemberSectionGrants,
  getStaffMemberSectionDenials,
} from '../utils/permissionUtils';
import { buildCoureurPermissions, scopeTeamStateForCoureur, isCoureurUser } from '../utils/riderAccessUtils';
import { isSuperAdminUser } from '../utils/superAdminUtils';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';
import { getDefaultPlanForTeamLevel, PILOT_DAYS } from '../constants/subscriptionPlans';
import { buildInitialIndependentSubscription, buildInitialSubscription } from './billingService';
import { buildDefaultRider, buildDefaultStaffMember } from '../utils/defaultTeamMemberProfiles';
import { resolveStaffRole, resolveStaffRoleOrDefault, getStaffRoleKey, isManagerEquivalentStaffRole } from '../utils/staffRoleUtils';
import {
  canRiderApplyToTeam,
  canTeamScoutRider,
  getMarketMismatchMessage,
  getTeamMarketContext,
  resolveRiderMarketSegmentFromUser,
} from '../utils/riderTeamMarketSegment';
import { buildScoutingConsentProof, canAthleteConsentToScouting } from '../utils/scoutingProspectUtils';
import { writeGdprAuditLog } from './gdprService';
import { purgeUserPersonalDataSecure, deleteTeamAndAllDataSecure } from './gdprCloudService';
import { GdprConsent } from '../types';
// Accès marketplace missions : tout compte staff (équipe ou vacataire).
const hasAccessToMissions = (user: User, staff: StaffMember[]): boolean => {
    if (user.userRole === UserRole.STAFF) return true;
    const staffMember = getStaffMemberForUser(user, staff);
    return Boolean(staffMember && staffMember.status === StaffStatus.VACATAIRE);
};

// Reasonable default permissions when no permissions document is configured in Firestore
export { DEFAULT_ROLE_PERMISSIONS };

// Helper function to remove undefined properties from an object recursively
// Firestore n'accepte pas les valeurs undefined - elles doivent être supprimées
const cleanDataForFirebase = (data: any): any => {
    // Retour rapide pour les types primitifs
    if (data === null || typeof data !== 'object') {
        return data;
    }

    // Firestore handles Date objects automatically
    if (data instanceof Date) {
        return data;
    }

    // Gestion des tableaux
    if (Array.isArray(data)) {
        return data
            .filter(item => item !== undefined)
            .map(item => cleanDataForFirebase(item));
    }
    
    // Objets : toujours nettoyer récursivement (les undefined peuvent être dans des objets imbriqués)
    if (data.constructor !== Object) {
        return data;
    }

    const cleaned: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
        const value = data[key];
        if (value !== undefined) {
            cleaned[key] = cleanDataForFirebase(value);
        }
    }
    return cleaned;
};


// --- FILE UPLOAD ---
export const extractBase64Data = (base64: string): string => {
    const commaIndex = base64.indexOf(',');
    return commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
};

export const uploadFile = async (base64: string, path: string, mimeType: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const base64Data = extractBase64Data(base64);
    const snapshot = await uploadString(storageRef, base64Data, 'base64', { contentType: mimeType });
    return getDownloadURL(snapshot.ref);
};

// --- AUTH & USER ---
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return { id: userDocSnap.id, ...userDocSnap.data() } as User;
    }
    return null;
};

export const createUserProfile = async (uid: string, signupData: SignupData) => {
    try {
        const { email, firstName, lastName, userRole, birthDate, sex } = signupData;
        const teamName = signupData.teamName?.trim() || '';
        const sponsorName = signupData.sponsorName?.trim() || '';

        // Validation des données requises
        if (!email || !firstName || !lastName) {
            const missingFields = [];
            if (!email) missingFields.push('email');
            if (!firstName) missingFields.push('firstName');
            if (!lastName) missingFields.push('lastName');
            throw new Error(`Données d'inscription incomplètes: ${missingFields.join(', ')} sont requis.`);
        }

        if (!userRole) {
            throw new Error("Le rôle utilisateur est requis.");
        }

        // Validation de la date de naissance (inscription complète)
        const isFullSignup = Boolean(signupData.acceptLegalConsent || signupData.password);
        if (!birthDate && isFullSignup) {
            throw new Error("La date de naissance est requise pour l'inscription.");
        }

        // Normalisation du sex avec gestion améliorée
        let normalizedSex: Sex | undefined = undefined;
        if (sex !== undefined && sex !== null && String(sex).trim() !== '') {
            const sexStr = String(sex);
            const maleValues = new Set<string>(['male', Sex.MALE, Sex.MALE_SHORT]);
            const femaleValues = new Set<string>(['female', Sex.FEMALE, Sex.FEMALE_SHORT, Sex.FEMALE_EN]);
            if (maleValues.has(sexStr)) {
                normalizedSex = Sex.MALE;
            } else if (femaleValues.has(sexStr)) {
                normalizedSex = Sex.FEMALE;
            }
        }

        // Nouvelle inscription : sexe Homme/Femme obligatoire
        if (isFullSignup && normalizedSex === undefined) {
            throw new Error("Le sexe (Homme ou Femme) est requis pour l'inscription.");
        }

        if (isFullSignup && userRole === UserRole.MANAGER && !teamName) {
            throw new Error("Le nom de l'équipe est requis pour créer un compte Manager.");
        }

        if (isFullSignup && userRole === UserRole.PARTNER && !sponsorName) {
            throw new Error("Le nom du sponsor / entreprise est requis pour créer un compte Partenaire.");
        }

        let normalizedStaffRole: StaffRole | undefined;
        if (userRole === UserRole.STAFF) {
            normalizedStaffRole = resolveStaffRole(signupData.staffRole);
            if (isFullSignup && !normalizedStaffRole) {
                throw new Error("La fonction staff (DS, mécano, kiné…) est requise pour l'inscription.");
            }
        }

        const signupInfo: SignupInfo = {};
        if (birthDate) {
            signupInfo.birthDate = birthDate;
        }
        if (normalizedSex !== undefined) {
            signupInfo.sex = normalizedSex;
        }

        const now = new Date().toISOString();
        let gdprConsent: GdprConsent | undefined;
        if (signupData.acceptLegalConsent) {
            gdprConsent = {
                termsAcceptedAt: now,
                termsVersion: LEGAL_VERSIONS.TERMS_VERSION,
                privacyPolicyAcceptedAt: now,
                privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY_VERSION,
                ndaAcceptedAt: now,
                ndaVersion: LEGAL_VERSIONS.NDA_VERSION,
                ...(signupData.parentalConsentAccepted
                    ? { parentalConsentAcceptedAt: now }
                    : {}),
            };
        }

        const isIndependentSignup =
            signupData.signupMode === SignupMode.INDEPENDENT &&
            userRole !== UserRole.MANAGER;

        if (isFullSignup && isIndependentSignup && !signupData.planId) {
            throw new Error("Une formule d'abonnement est requise pour le profil indépendant.");
        }

        if (isFullSignup && userRole === UserRole.MANAGER && !signupData.planId) {
            throw new Error("Une formule d'abonnement est requise pour créer une équipe.");
        }

        const newUser: Omit<User, 'id'> = {
            email,
            firstName,
            lastName,
            permissionRole: TeamRole.VIEWER,
            userRole: userRole,
            isSearchable: false,
            openToExternalMissions: false,
            signupInfo: Object.keys(signupInfo).length > 0 ? signupInfo : undefined,
            gdprConsent,
            ...(userRole === UserRole.MANAGER && teamName ? { teamName } : {}),
            ...(userRole === UserRole.MANAGER && signupData.planId
                ? {
                      pendingPlanId: signupData.planId,
                      ...(signupData.billingInterval === 'month' || signupData.billingInterval === 'year'
                          ? { pendingBillingInterval: signupData.billingInterval }
                          : { pendingBillingInterval: 'year' as const }),
                  }
                : {}),
            ...(isIndependentSignup &&
            (signupData.billingInterval === 'month' || signupData.billingInterval === 'year')
                ? { pendingBillingInterval: signupData.billingInterval }
                : {}),
            ...(userRole === UserRole.STAFF && normalizedStaffRole
                ? { staffRole: normalizedStaffRole }
                : {}),
            ...(isIndependentSignup
                ? {
                      signupMode: SignupMode.INDEPENDENT,
                      isIndependentProfile: true,
                      independentActivatedAt: now,
                      subscription: buildInitialIndependentSubscription(
                          userRole,
                          signupData.planId,
                      ),
                  }
                : {}),
            createdAt: now,
            updatedAt: now,
        };
        
        const cleanedNewUser = cleanDataForFirebase(newUser);
        const userDocRef = doc(db, 'users', uid);
        
        // Vérifier si le document existe déjà
        const existingDoc = await getDoc(userDocRef);
        if (existingDoc.exists()) {
            await setDoc(userDocRef, cleanedNewUser, { merge: true });
        } else {
            await setDoc(userDocRef, cleanedNewUser);
        }

        // Partenaire : créer le profil marketplace avec le nom sponsor dès l'inscription
        if (userRole === UserRole.PARTNER && sponsorName) {
            const contactName = `${firstName} ${lastName}`.trim();
            const partnerProfile: PartnerMarketplaceProfile = {
                id: `pmp-${uid}`,
                userId: uid,
                companyName: sponsorName,
                contactName: contactName || sponsorName,
                contactEmail: email,
                isVisible: false,
                createdAt: now,
                updatedAt: now,
            };
            await setDoc(
                doc(db, 'partnerMarketplaceProfiles', partnerProfile.id),
                cleanDataForFirebase(partnerProfile),
                { merge: true },
            );
        }

    } catch (error: any) {
        console.error("Erreur lors de la création du profil:", error);
        
        // Améliorer le message d'erreur selon le type d'erreur
        if (error?.code === 'permission-denied') {
            const enhancedError = new Error("Erreur de permissions Firestore. Vérifiez que les règles de sécurité permettent la création de documents dans la collection 'users'.");
            (enhancedError as any).code = error.code;
            (enhancedError as any).originalError = error;
            throw enhancedError;
        } else if (error?.code === 'unavailable') {
            const enhancedError = new Error("Service Firestore indisponible. Vérifiez votre connexion internet.");
            (enhancedError as any).code = error.code;
            (enhancedError as any).originalError = error;
            throw enhancedError;
        }
        
        throw error;
    }
};

export const requestToJoinTeam = async (
    userId: string,
    teamId: string,
    userRole: UserRole,
    userInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      staffRole?: string;
    }
) => {
    try {
        // Self-join : uniquement Coureur ou Staff (jamais Manager / Partenaire)
        const safeRole =
            userRole === UserRole.STAFF ? UserRole.STAFF : UserRole.COUREUR;
        if (userRole !== UserRole.COUREUR && userRole !== UserRole.STAFF) {
            throw new Error("Seuls les athlètes et le staff peuvent demander à rejoindre une équipe.");
        }

        let resolvedStaffRole: ReturnType<typeof resolveStaffRole> | undefined;
        if (safeRole === UserRole.STAFF) {
            const userDocForRole = await getDoc(doc(db, 'users', userId));
            const profileStaffRole = userDocForRole.exists()
                ? (userDocForRole.data() as User).staffRole
                : undefined;
            resolvedStaffRole = resolveStaffRole(userInfo?.staffRole || profileStaffRole);
            if (!resolvedStaffRole) {
                throw new Error("Votre fonction staff est requise pour rejoindre une équipe. Complétez votre profil.");
            }
        }

        // Vérifier si l'utilisateur a déjà un membership pour cette équipe
        const membershipsColRef = collection(db, 'teamMemberships');
        const existingMemberships = await getDocs(
            query(
                membershipsColRef,
                where('userId', '==', userId),
                where('teamId', '==', teamId)
            )
        );
        
        if (!existingMemberships.empty) {
            const existingMembership = existingMemberships.docs[0].data();
            const status = existingMembership.status;
            
            if (status === TeamMembershipStatus.ACTIVE) {
                throw new Error("Vous êtes déjà membre actif de cette équipe.");
            }
            
            if (status === TeamMembershipStatus.PENDING) {
                throw new Error("Vous avez déjà une demande en attente pour cette équipe.");
            }
        }
        
        // Vérifier que l'équipe existe
        const teamDocRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamDocRef);
        
        if (!teamDoc.exists()) {
            throw new Error("Cette équipe n'existe pas.");
        }
        
        const teamData = teamDoc.data() as Team;

        // Athlète : candidatures ouvertes + segment marché compatible
        if (safeRole === UserRole.COUREUR) {
            if (teamData.operationalSettings?.acceptRiderApplications === false) {
                throw new Error("Cette équipe n'accepte pas les candidatures pour le moment.");
            }
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("Profil utilisateur introuvable.");
            }
            const userData = userDoc.data() as User;
            const riderSegment = resolveRiderMarketSegmentFromUser(userData);
            if (!canRiderApplyToTeam(riderSegment, teamData, teamData.operationalSettings)) {
                throw new Error(getMarketMismatchMessage(riderSegment, teamData));
            }
        }
        
        // Créer la demande PENDING — aucun accès équipe tant qu'un manager n'approuve pas
        await addDoc(membershipsColRef, {
            userId,
            teamId,
            status: TeamMembershipStatus.PENDING,
            userRole: safeRole,
            firstName: userInfo?.firstName ?? '',
            lastName: userInfo?.lastName ?? '',
            email: userInfo?.email ?? '',
            teamName: teamData.name,
            source: 'self_join',
            requestedAt: new Date().toISOString(),
            ...(resolvedStaffRole ? { staffRole: resolvedStaffRole } : {}),
        });
    } catch (error: unknown) {
        console.error("Erreur lors de la demande pour rejoindre l'équipe:", error);
        throw error;
    }
};

export interface ApproveMembershipInput {
    membershipId: string;
    userId: string;
    teamId: string;
    userRole: UserRole;
    email: string;
    firstName?: string;
    lastName?: string;
    staffRole?: string;
}

export const approveTeamMembership = async (
    input: ApproveMembershipInput,
    approvedBy: string,
    existingUser?: User | null
): Promise<{ riderCreated: boolean; staffCreated: boolean }> => {
    const { membershipId, userId, teamId, email, firstName, lastName } = input;
    // Jamais d'élévation Manager via une demande d'adhésion
    const userRole =
        input.userRole === UserRole.STAFF ? UserRole.STAFF : UserRole.COUREUR;
    const now = new Date().toISOString();

    const membershipRef = doc(db, 'teamMemberships', membershipId);
    const membershipSnap = await getDoc(membershipRef);
    if (!membershipSnap.exists()) {
        throw new Error("Demande d'adhésion introuvable.");
    }
    const membershipData = membershipSnap.data();
    if (membershipData.status === TeamMembershipStatus.ACTIVE) {
        throw new Error("Cette demande a déjà été approuvée.");
    }
    if (membershipData.teamId !== teamId || (membershipData.userId && membershipData.userId !== userId)) {
        throw new Error("Données d'adhésion incohérentes.");
    }

    const resolvedStaffRole =
        userRole === UserRole.STAFF
            ? resolveStaffRoleOrDefault(
                  input.staffRole ??
                    membershipData.staffRole ??
                    existingUser?.staffRole,
              )
            : undefined;

    await updateDoc(membershipRef, {
        status: TeamMembershipStatus.ACTIVE,
        userRole,
        approvedAt: now,
        approvedBy,
        ...(resolvedStaffRole ? { staffRole: resolvedStaffRole } : {}),
    });

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const currentUserData = userDoc.exists() ? (userDoc.data() as User) : null;

    await setDoc(
        userDocRef,
        cleanDataForFirebase({
            teamId,
            isActive: true,
            email: email || currentUserData?.email || '',
            firstName: firstName || currentUserData?.firstName || '',
            lastName: lastName || currentUserData?.lastName || '',
            userRole,
            permissionRole:
              userRole === UserRole.COUREUR ? TeamRole.VIEWER : TeamRole.MEMBER,
            ...(resolvedStaffRole ? { staffRole: resolvedStaffRole } : {}),
            updatedAt: now,
        }),
        { merge: true }
    );

    let riderCreated = false;
    let staffCreated = false;

    if (userRole === UserRole.COUREUR) {
        const riderRef = doc(db, 'teams', teamId, 'riders', userId);
        const riderSnap = await getDoc(riderRef);
        if (!riderSnap.exists()) {
            const signupInfo = existingUser?.signupInfo ?? currentUserData?.signupInfo;
            const rider = buildDefaultRider(
                {
                    id: userId,
                    firstName: firstName || currentUserData?.firstName || '',
                    lastName: lastName || currentUserData?.lastName || '',
                    email: email || currentUserData?.email || '',
                },
                signupInfo
            );
            await setDoc(riderRef, cleanDataForFirebase(rider));
            riderCreated = true;
        }
    } else if (userRole === UserRole.STAFF) {
        const staffRef = doc(db, 'teams', teamId, 'staff', userId);
        const staffSnap = await getDoc(staffRef);
        if (!staffSnap.exists()) {
            const staffMember = buildDefaultStaffMember(
                {
                    id: userId,
                    firstName: firstName || currentUserData?.firstName || '',
                    lastName: lastName || currentUserData?.lastName || '',
                    email: email || currentUserData?.email || '',
                    staffRole: resolvedStaffRole,
                },
                resolvedStaffRole,
            );
            await setDoc(staffRef, cleanDataForFirebase(staffMember));
            staffCreated = true;
        } else if (resolvedStaffRole) {
            // Mettre à jour le rôle si la fiche existe déjà avec Autre / vide
            const existing = staffSnap.data() as StaffMember;
            if (!existing.role || existing.role === StaffRole.AUTRE) {
                await updateDoc(staffRef, { role: resolvedStaffRole });
            }
        }
    }

    return { riderCreated, staffCreated };
};

export const userHasActiveMembership = async (userId: string): Promise<boolean> => {
    const membershipsColRef = collection(db, 'teamMemberships');
    const activeMemberships = await getDocs(
        query(
            membershipsColRef,
            where('userId', '==', userId),
            where('status', '==', TeamMembershipStatus.ACTIVE)
        )
    );
    return !activeMemberships.empty;
};

export const createTeamForUser = async (
    userId: string,
    teamData: { name: string; level: TeamLevel; country: string; planId?: import('../types').SubscriptionPlanId; },
    _userRole: UserRole,
) => {
    try {
        // Création privilégiée côté serveur (membership ACTIVE + élévation Manager).
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { FIREBASE_FUNCTIONS_REGION } = await import('../constants/firebaseRegions');
        const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
        const fn = httpsCallable<
            { name: string; level: string; country: string; planId?: string },
            { teamId: string }
        >(functions, 'createTeamForUser');
        const result = await fn({
            name: teamData.name,
            level: teamData.level,
            country: teamData.country,
            planId: teamData.planId,
        });
        const teamId = result.data?.teamId;
        if (!teamId) {
            throw new Error('Réponse createTeamForUser invalide (teamId manquant).');
        }
        // Délai court pour la propagation Firestore
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { teamId };
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'équipe:', error);
        const message =
            error && typeof error === 'object' && 'message' in error
                ? String((error as { message: string }).message)
                : 'Erreur inconnue';
        throw new Error(`Échec de la création de l'équipe: ${message}`);
    }
};

async function safeLoadGlobalCollection<T>(collName: string): Promise<T[]> {
    try {
        const snap = await getDocs(collection(db, collName));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
    } catch (error) {
        console.warn(`Chargement ${collName} ignoré:`, error);
        return [];
    }
}

const loadOrganizations = () => safeLoadGlobalCollection<Organization>('organizations');
const loadPartnerAccesses = () => safeLoadGlobalCollection<PartnerAccess>('partnerAccesses');
const loadPartnerMarketplaceProfiles = () =>
  safeLoadGlobalCollection<PartnerMarketplaceProfile>('partnerMarketplaceProfiles');
const loadTeamSponsorshipNeeds = () =>
  safeLoadGlobalCollection<TeamSponsorshipNeed>('teamSponsorshipNeeds');
const loadPartnershipMatchRequests = () =>
  safeLoadGlobalCollection<PartnershipMatchRequest>('partnershipMatchRequests');

export const getOrgTeamLightData = async (
    teamId: string
): Promise<{
    riders: Rider[];
    staff: StaffMember[];
    events: RaceEvent[];
    incomeItems: IncomeItem[];
    budgetItems: EventBudgetItem[];
}> => {
    const teamDocRef = doc(db, 'teams', teamId);
    const [ridersSnap, staffSnap, eventsSnap, incomeSnap, budgetSnap] = await Promise.all([
        getDocs(collection(teamDocRef, 'riders')),
        getDocs(collection(teamDocRef, 'staff')),
        getDocs(collection(teamDocRef, 'raceEvents')),
        getDocs(collection(teamDocRef, 'incomeItems')),
        getDocs(collection(teamDocRef, 'eventBudgetItems')),
    ]);
    const mapDocs = <T,>(snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) =>
        snap.docs
            .filter((d) => d.id !== '_init_')
            .map((d) => ({ id: d.id, ...d.data() } as T));
    return {
        riders: mapDocs<Rider>(ridersSnap),
        staff: mapDocs<StaffMember>(staffSnap),
        events: mapDocs<RaceEvent>(eventsSnap),
        incomeItems: mapDocs<IncomeItem>(incomeSnap),
        budgetItems: mapDocs<EventBudgetItem>(budgetSnap),
    };
};

export async function recordManualVehiclePosition(
    teamId: string,
    vehicleId: string,
    latitude: number,
    longitude: number,
    speedKmh?: number,
): Promise<void> {
    const recordedAt = new Date().toISOString();
    const positionRef = doc(collection(doc(db, 'teams', teamId), 'vehiclePositions'));
    await setDoc(positionRef, {
        vehicleId,
        latitude,
        longitude,
        speedKmh: speedKmh ?? 0,
        recordedAt,
        source: 'manual',
    });
    const vehicleRef = doc(db, 'teams', teamId, 'vehicles', vehicleId);
    await setDoc(
        vehicleRef,
        {
            lastLatitude: latitude,
            lastLongitude: longitude,
            lastPositionAt: recordedAt,
            lastSpeedKmh: speedKmh ?? 0,
            gpsSource: 'manual',
        },
        { merge: true },
    );
}

export async function saveGpsWebhookKey(teamId: string, key: string): Promise<void> {
    // Secret hors du doc équipe public — managers uniquement (rules privateConfig).
    const gpsRef = doc(db, 'teams', teamId, 'privateConfig', 'gps');
    await setDoc(
        gpsRef,
        { webhookKey: key, updatedAt: new Date().toISOString() },
        { merge: true },
    );
    // Nettoyer l’ancienne clé sur le doc équipe si présente.
    await updateDoc(doc(db, 'teams', teamId), { gpsWebhookKey: deleteField() }).catch(async () => {
        await setDoc(doc(db, 'teams', teamId), { gpsWebhookKey: deleteField() }, { merge: true });
    });
}

export async function loadGpsWebhookKey(teamId: string): Promise<string | undefined> {
    try {
        const gpsSnap = await getDoc(doc(db, 'teams', teamId, 'privateConfig', 'gps'));
        if (gpsSnap.exists()) {
            const key = gpsSnap.data()?.webhookKey;
            if (typeof key === 'string' && key.length >= 8) return key;
        }
        // Migration lecture: ancienne clé sur le doc équipe
        const teamSnap = await getDoc(doc(db, 'teams', teamId));
        const legacy = teamSnap.data()?.gpsWebhookKey;
        if (typeof legacy === 'string' && legacy.length >= 8) {
            await saveGpsWebhookKey(teamId, legacy);
            return legacy;
        }
    } catch (error) {
        console.warn('Lecture clé GPS webhook refusée ou indisponible:', error);
    }
    return undefined;
}

/** Paramètres SEPA (IBAN / ICS) hors doc équipe public — managers + finance readers. */
export async function saveSepaSettings(teamId: string, settings: TeamSepaSettings): Promise<void> {
    const sepaRef = doc(db, 'teams', teamId, 'privateConfig', 'sepa');
    await setDoc(
        sepaRef,
        cleanDataForFirebase({
            ...settings,
            updatedAt: new Date().toISOString(),
        }),
        { merge: true },
    );
    // Retirer les secrets bancaires du doc équipe lisible par tous les membres.
    await updateDoc(doc(db, 'teams', teamId), { sepaSettings: deleteField() }).catch(async () => {
        await setDoc(doc(db, 'teams', teamId), { sepaSettings: deleteField() }, { merge: true });
    });
}

export async function loadSepaSettings(teamId: string): Promise<TeamSepaSettings | undefined> {
    try {
        const sepaSnap = await getDoc(doc(db, 'teams', teamId, 'privateConfig', 'sepa'));
        if (sepaSnap.exists()) {
            const data = sepaSnap.data();
            if (data && typeof data.debtorIban === 'string') {
                const { updatedAt: _u, ...rest } = data;
                return rest as TeamSepaSettings;
            }
        }
        // Migration : ancienne copie sur le doc équipe
        const teamSnap = await getDoc(doc(db, 'teams', teamId));
        const legacy = teamSnap.data()?.sepaSettings as TeamSepaSettings | undefined;
        if (legacy?.debtorIban) {
            await saveSepaSettings(teamId, legacy);
            return legacy;
        }
    } catch (error) {
        console.warn('Lecture paramètres SEPA refusée ou indisponible:', error);
    }
    return undefined;
}

export interface DriverGpsContext {
    eventId?: string;
    transportLegId?: string;
}

export async function recordDriverVehiclePosition(
    teamId: string,
    staffId: string,
    vehicleIds: string[],
    latitude: number,
    longitude: number,
    speedKmh?: number,
    heading?: number,
    context: DriverGpsContext = {},
): Promise<void> {
    const recordedAt = new Date().toISOString();
    const teamRef = doc(db, 'teams', teamId);

    await setDoc(
        doc(teamRef, 'staff', staffId),
        {
            lastLatitude: latitude,
            lastLongitude: longitude,
            lastPositionAt: recordedAt,
            lastSpeedKmh: speedKmh ?? 0,
        },
        { merge: true },
    );

    for (const vehicleId of vehicleIds) {
        const positionRef = doc(collection(teamRef, 'vehiclePositions'));
        await setDoc(positionRef, {
            vehicleId,
            latitude,
            longitude,
            speedKmh: speedKmh ?? 0,
            heading: heading ?? null,
            recordedAt,
            source: 'driver_app',
            ...(context.eventId ? { eventId: context.eventId } : {}),
            ...(context.transportLegId ? { transportLegId: context.transportLegId } : {}),
        });
        await setDoc(
            doc(teamRef, 'vehicles', vehicleId),
            {
                lastLatitude: latitude,
                lastLongitude: longitude,
                lastPositionAt: recordedAt,
                lastSpeedKmh: speedKmh ?? 0,
                gpsSource: 'driver_app',
                gpsTrackingEnabled: true,
            },
            { merge: true },
        );
    }
}

function sanitizeTeamForDirectory(raw: Team & {
    sepaSettings?: unknown;
    gpsWebhookKey?: unknown;
    invoiceSettings?: unknown;
}): Team {
    const { sepaSettings: _s, gpsWebhookKey: _g, invoiceSettings: _i, ...safe } = raw;
    return safe as Team;
}

async function loadPermissionsBundle(): Promise<{
    permissions: AppPermissions;
    permissionRoles: PermissionRole[];
}> {
    try {
        const [permissionsSnap, permissionRolesSnap] = await Promise.all([
            getDocs(collection(db, 'permissions')),
            getDocs(collection(db, 'permissionRoles')),
        ]);
        const permissionsDoc = permissionsSnap.empty ? undefined : permissionsSnap.docs[0];
        const fallbackPermissionRoles = getInitialGlobalState().permissionRoles;
        const loadedRoles =
            permissionRolesSnap.size > 0
                ? permissionRolesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PermissionRole))
                : fallbackPermissionRoles;
        // Assure Comptable / Trésorier (et autres rôles seed) même sur équipes déjà configurées.
        const roleById = new Map(loadedRoles.map((r) => [r.id, r]));
        for (const seed of fallbackPermissionRoles) {
            if (!roleById.has(seed.id)) roleById.set(seed.id, seed);
        }
        const permissionRoles = Array.from(roleById.values());
        return {
            permissions: mergeConfiguredPermissions(
                permissionsDoc ? (permissionsDoc.data() as AppPermissions) : {},
            ),
            permissionRoles,
        };
    } catch (error) {
        console.warn('Chargement permissions ignoré:', error);
        return {
            permissions: mergeConfiguredPermissions({}),
            permissionRoles: getInitialGlobalState().permissionRoles,
        };
    }
}

/** Charge les données globales en respectant les règles Firestore (pas de listes collection entières). */
async function getScopedGlobalData(viewer: User): Promise<Partial<GlobalState>> {
    const uid = viewer.id;
    const email = (viewer.email || '').trim().toLowerCase();

    const membershipById = new Map<string, TeamMembership>();
    const mergeMemberships = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
        for (const d of docs) {
            membershipById.set(d.id, { id: d.id, ...d.data() } as TeamMembership);
        }
    };

    try {
        const byUser = await getDocs(
            query(collection(db, 'teamMemberships'), where('userId', '==', uid)),
        );
        mergeMemberships(byUser.docs);
    } catch (error) {
        console.warn('Chargement memberships (userId) ignoré:', error);
    }

    if (email) {
        try {
            const byEmail = await getDocs(
                query(collection(db, 'teamMemberships'), where('email', '==', email)),
            );
            mergeMemberships(byEmail.docs);
        } catch (error) {
            console.warn('Chargement memberships (email) ignoré:', error);
        }
    }

    const teamIds = new Set<string>();
    for (const m of membershipById.values()) {
        if (m.teamId) teamIds.add(m.teamId);
    }
    if (viewer.teamId) teamIds.add(viewer.teamId);

    // Memberships de l'équipe (candidatures / roster) — managers uniquement côté rules
    for (const teamId of [...teamIds]) {
        try {
            const byTeam = await getDocs(
                query(collection(db, 'teamMemberships'), where('teamId', '==', teamId)),
            );
            mergeMemberships(byTeam.docs);
        } catch {
            /* non-manager : ignoré */
        }
    }

    const teamsById = new Map<string, Team>();
    await Promise.all(
        [...teamIds].map(async (teamId) => {
            try {
                const snap = await getDoc(doc(db, 'teams', teamId));
                if (snap.exists()) {
                    teamsById.set(
                        teamId,
                        sanitizeTeamForDirectory({ id: snap.id, ...snap.data() } as Team),
                    );
                }
            } catch (error) {
                console.warn(`Lecture équipe ${teamId} ignorée:`, error);
            }
        }),
    );

    // Annuaire : équipes ouvertes aux candidatures (requête alignée sur les rules)
    // Désactivé si la requête échoue — ne doit jamais bloquer le login.
    try {
        const openTeamsSnap = await getDocs(
            query(
                collection(db, 'teams'),
                where('operationalSettings.acceptRiderApplications', '==', true),
            ),
        );
        for (const d of openTeamsSnap.docs) {
            if (!teamsById.has(d.id)) {
                teamsById.set(d.id, sanitizeTeamForDirectory({ id: d.id, ...d.data() } as Team));
            }
        }
    } catch (error) {
        console.warn('Annuaire équipes ouvertes ignoré:', error);
    }

    const usersById = new Map<string, User>();
    try {
        const selfSnap = await getDoc(doc(db, 'users', uid));
        if (selfSnap.exists()) {
            usersById.set(uid, { id: selfSnap.id, ...selfSnap.data() } as User);
        }
    } catch (error) {
        console.warn('Lecture profil courant ignorée:', error);
    }

    // Membres de l’équipe uniquement si le profil a bien ce teamId (évite permission-denied)
    const readableTeamIds = new Set<string>();
    const selfTeamId = usersById.get(uid)?.teamId || viewer.teamId;
    if (selfTeamId) readableTeamIds.add(selfTeamId);
    for (const teamId of readableTeamIds) {
        try {
            const teammates = await getDocs(
                query(collection(db, 'users'), where('teamId', '==', teamId)),
            );
            for (const d of teammates.docs) {
                usersById.set(d.id, { id: d.id, ...d.data() } as User);
            }
        } catch (error) {
            console.warn(`Lecture membres équipe ${teamId} ignorée:`, error);
        }
    }

    try {
        const searchable = await getDocs(
            query(collection(db, 'users'), where('isSearchable', '==', true)),
        );
        for (const d of searchable.docs) {
            if (!usersById.has(d.id)) {
                usersById.set(d.id, { id: d.id, ...d.data() } as User);
            }
        }
    } catch (error) {
        console.warn('Annuaire profils searchable ignoré:', error);
    }

    let scoutingRequests: ScoutingRequest[] = [];
    try {
        const asAthlete = await getDocs(
            query(collection(db, 'scoutingRequests'), where('athleteId', '==', uid)),
        );
        scoutingRequests = asAthlete.docs.map((d) => ({ id: d.id, ...d.data() } as ScoutingRequest));
    } catch {
        /* ignore */
    }
    for (const teamId of teamIds) {
        try {
            const asManager = await getDocs(
                query(collection(db, 'scoutingRequests'), where('requesterTeamId', '==', teamId)),
            );
            const seen = new Set(scoutingRequests.map((r) => r.id));
            for (const d of asManager.docs) {
                if (!seen.has(d.id)) {
                    scoutingRequests.push({ id: d.id, ...d.data() } as ScoutingRequest);
                }
            }
        } catch {
            /* ignore */
        }
    }

    const { permissions, permissionRoles } = await loadPermissionsBundle();

    return {
        users: [...usersById.values()],
        teams: [...teamsById.values()],
        teamMemberships: [...membershipById.values()],
        permissions,
        permissionRoles,
        scoutingRequests,
        organizations: await loadOrganizations(),
        partnerAccesses: await loadPartnerAccesses(),
        partnerMarketplaceProfiles: await loadPartnerMarketplaceProfiles(),
        teamSponsorshipNeeds: await loadTeamSponsorshipNeeds(),
        partnershipMatchRequests: await loadPartnershipMatchRequests(),
    };
}

// --- GLOBAL DATA ---
export const getGlobalData = async (viewer?: User): Promise<Partial<GlobalState>> => {
    try {
        let effectiveViewer = viewer;
        if (!effectiveViewer && auth.currentUser) {
            const selfSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (selfSnap.exists()) {
                effectiveViewer = { id: selfSnap.id, ...selfSnap.data() } as User;
            }
        }

        // Super Admin : lecture large (cockpit plateforme)
        if (effectiveViewer && isSuperAdminUser(effectiveViewer)) {
            const [usersSnap, teamsSnap, membershipsSnap, scoutingRequestsSnap, bundle] =
                await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'teams')),
                    getDocs(collection(db, 'teamMemberships')),
                    getDocs(collection(db, 'scoutingRequests')),
                    loadPermissionsBundle(),
                ]);

            return {
                users: usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)),
                teams: teamsSnap.docs.map((d) =>
                    sanitizeTeamForDirectory({ id: d.id, ...d.data() } as Team),
                ),
                teamMemberships: membershipsSnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as TeamMembership),
                ),
                permissions: bundle.permissions,
                permissionRoles: bundle.permissionRoles,
                scoutingRequests: scoutingRequestsSnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as ScoutingRequest),
                ),
                organizations: await loadOrganizations(),
                partnerAccesses: await loadPartnerAccesses(),
                partnerMarketplaceProfiles: await loadPartnerMarketplaceProfiles(),
                teamSponsorshipNeeds: await loadTeamSponsorshipNeeds(),
                partnershipMatchRequests: await loadPartnershipMatchRequests(),
            };
        }

        if (effectiveViewer) {
            try {
                return await getScopedGlobalData(effectiveViewer);
            } catch (scopedErr) {
                console.error('getScopedGlobalData a échoué, fallback minimal:', scopedErr);
                const bundle = await loadPermissionsBundle().catch(() => ({
                    permissions: mergeConfiguredPermissions({}),
                    permissionRoles: getInitialGlobalState().permissionRoles,
                }));
                return {
                    users: [effectiveViewer],
                    teams: [],
                    teamMemberships: [],
                    permissions: bundle.permissions,
                    permissionRoles: bundle.permissionRoles,
                    scoutingRequests: [],
                    organizations: [],
                    partnerAccesses: [],
                    partnerMarketplaceProfiles: [],
                    teamSponsorshipNeeds: [],
                    partnershipMatchRequests: [],
                };
            }
        }

        // Fallback minimal (pas de viewer résolu)
        const bundle = await loadPermissionsBundle();
        return {
            users: [],
            teams: [],
            teamMemberships: [],
            permissions: bundle.permissions,
            permissionRoles: bundle.permissionRoles,
            scoutingRequests: [],
            organizations: await loadOrganizations(),
            partnerAccesses: await loadPartnerAccesses(),
            partnerMarketplaceProfiles: await loadPartnerMarketplaceProfiles(),
            teamSponsorshipNeeds: await loadTeamSponsorshipNeeds(),
            partnershipMatchRequests: await loadPartnershipMatchRequests(),
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des données globales:', error);
        throw error;
    }
};

const PERMISSIONS_DOC_ID = 'default';

export const savePermissionsConfig = async (
    permissions: AppPermissions,
    permissionRoles: PermissionRole[]
): Promise<void> => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'permissions', PERMISSIONS_DOC_ID), cleanDataForFirebase(permissions), { merge: true });

    permissionRoles.forEach((role) => {
        batch.set(doc(db, 'permissionRoles', role.id), cleanDataForFirebase(role), { merge: true });
    });

    await batch.commit();
};

/** Missions ouvertes publiées par toutes les équipes (collection group). */
export const getOpenMissionsGlobal = async (): Promise<Mission[]> => {
    try {
        const missionsSnap = await getDocs(
            query(collectionGroup(db, 'missions'), where('status', '==', MissionStatus.OPEN))
        );
        return missionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Mission));
    } catch (error) {
        console.warn('getOpenMissionsGlobal:', error);
        return [];
    }
};

/** Missions où l’utilisateur figure dans applicants (candidatures + factures post-paiement). */
export const getMyAppliedMissionsGlobal = async (userId: string): Promise<Mission[]> => {
    if (!userId) return [];
    try {
        const missionsSnap = await getDocs(
            query(collectionGroup(db, 'missions'), where('applicants', 'array-contains', userId))
        );
        return missionsSnap.docs.map((d) => {
            const data = d.data() as Mission;
            const teamId = d.ref.parent.parent?.id || data.teamId;
            return { ...data, id: d.id, teamId } as Mission;
        });
    } catch (error) {
        console.warn('getMyAppliedMissionsGlobal:', error);
        return [];
    }
};

/** Offres coureur ouvertes (toutes équipes). */
export const getOpenRecruitmentOffersGlobal = async (): Promise<TeamRecruitmentOffer[]> => {
    try {
        const snap = await getDocs(
            query(
                collectionGroup(db, 'recruitmentOffers'),
                where('status', '==', TeamRecruitmentOfferStatus.OPEN),
            ),
        );
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamRecruitmentOffer));
    } catch (error) {
        console.warn('getOpenRecruitmentOffersGlobal:', error);
        return [];
    }
};

export const applyToMission = async (
    teamId: string,
    missionId: string,
    userId: string,
    applicant?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        message?: string;
    }
): Promise<void> => {
    const missionRef = doc(db, 'teams', teamId, 'missions', missionId);
    const missionSnap = await getDoc(missionRef);
    if (!missionSnap.exists()) throw new Error('Mission introuvable');
    const data = missionSnap.data();
    const applicants = (data.applicants as string[]) || [];
    const applications = (data.applications as MissionApplication[]) || [];
    if (applicants.includes(userId) || applications.some((a) => a.userId === userId)) return;

    const newApp: MissionApplication = {
        id: `app_${Date.now().toString(36)}`,
        userId,
        firstName: applicant?.firstName || '',
        lastName: applicant?.lastName || '',
        email: applicant?.email || '',
        phone: applicant?.phone || '',
        message: applicant?.message || '',
        appliedAt: new Date().toISOString(),
        status: MissionApplicationStatus.RECEIVED,
    };

    await updateDoc(missionRef, cleanDataForFirebase({
        applicants: [...applicants, userId],
        applications: [...applications, newApp],
        updatedAt: new Date().toISOString(),
    }));
};

export const createScoutingRequest = async (params: {
    requesterTeamId: string;
    athleteId: string;
    message?: string;
    prospectLevel?: ProspectLevel;
    requestedScopes?: ScoutingDataScope[];
}): Promise<string> => {
    const existingSnap = await getDocs(
        query(
            collection(db, 'scoutingRequests'),
            where('requesterTeamId', '==', params.requesterTeamId),
            where('athleteId', '==', params.athleteId)
        )
    );
    const activeRequest = existingSnap.docs.find((d) => {
        const data = d.data();
        const status = data.status as ScoutingRequestStatus;
        const level = data.prospectLevel as ProspectLevel | undefined;
        if (level === ProspectLevel.WATCHLIST) return false;
        return (
            status === ScoutingRequestStatus.PENDING ||
            status === ScoutingRequestStatus.ACCEPTED
        );
    });
    if (activeRequest) return activeRequest.id;

    const teamDoc = await getDoc(doc(db, 'teams', params.requesterTeamId));
    if (!teamDoc.exists()) {
        throw new Error("Équipe demandeuse introuvable.");
    }
    const teamData = teamDoc.data() as Team;

    const athleteDoc = await getDoc(doc(db, 'users', params.athleteId));
    if (!athleteDoc.exists()) {
        throw new Error("Profil athlète introuvable.");
    }
    const athleteData = athleteDoc.data() as User;
    const riderSegment = resolveRiderMarketSegmentFromUser(athleteData);
    const marketCtx = getTeamMarketContext(teamData, teamData.operationalSettings);
    if (!canTeamScoutRider(marketCtx, riderSegment)) {
        throw new Error(getMarketMismatchMessage(riderSegment, teamData));
    }

    const ref = await addDoc(collection(db, 'scoutingRequests'), {
        requesterTeamId: params.requesterTeamId,
        athleteId: params.athleteId,
        status: ScoutingRequestStatus.PENDING,
        prospectLevel: params.prospectLevel ?? ProspectLevel.CONTACT_REQUEST,
        requestedScopes: params.requestedScopes ?? [],
        message: params.message || '',
        requestDate: new Date().toISOString(),
    });
    return ref.id;
};

export const respondToScoutingRequest = async (
    requestId: string,
    response: 'accepted' | 'rejected',
    grantedScopes?: ScoutingDataScope[],
    options?: { teamName?: string; language?: 'fr' | 'en' },
): Promise<void> => {
    const requestRef = doc(db, 'scoutingRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
        throw new Error('Demande de scouting introuvable.');
    }
    const requestData = requestSnap.data() as ScoutingRequest;
    const athleteId = requestData.athleteId;

    const athleteSnap = await getDoc(doc(db, 'users', athleteId));
    if (!athleteSnap.exists()) {
        throw new Error('Profil athlète introuvable.');
    }
    const athlete = { id: athleteId, ...athleteSnap.data() } as User;

    if (response === 'accepted') {
        const capacity = canAthleteConsentToScouting(athlete);
        if (!capacity.ok) {
            throw new Error(
                capacity.reason === 'minor_no_parental'
                    ? 'Un mineur ne peut accepter un partage scouting sans autorisation parentale enregistrée. Contactez privacy@logicycle.app.'
                    : 'Date de naissance manquante : impossible de valider la capacité à consentir. Complétez votre profil ou contactez privacy@logicycle.app.',
            );
        }
        if (!grantedScopes?.length) {
            throw new Error('Sélectionnez au moins un périmètre à partager.');
        }
    }

    let teamName = options?.teamName;
    if (!teamName) {
        const teamSnap = await getDoc(doc(db, 'teams', requestData.requesterTeamId));
        teamName = teamSnap.exists()
            ? ((teamSnap.data() as Team).name || 'Équipe')
            : 'Équipe';
    }
    const language = options?.language ?? 'fr';
    const now = new Date().toISOString();
    const status =
        response === 'accepted' ? ScoutingRequestStatus.ACCEPTED : ScoutingRequestStatus.REJECTED;
    const payload: Record<string, unknown> = {
        status,
        responseDate: now,
        updatedAt: now,
    };
    if (response === 'accepted' && grantedScopes?.length) {
        Object.assign(
            payload,
            buildScoutingConsentProof({
                grantedScopes,
                teamName,
                language,
            }),
        );
    }
    await updateDoc(requestRef, cleanDataForFirebase(payload));

    await writeGdprAuditLog({
        action: response === 'accepted' ? 'scouting_consent_accepted' : 'scouting_consent_rejected',
        targetId: athleteId,
        performedBy: athleteId,
        method: 'client',
        metadata: {
            requestId,
            requesterTeamId: requestData.requesterTeamId,
            grantedScopes: grantedScopes ?? [],
            privacyVersion: LEGAL_VERSIONS.PRIVACY_POLICY_VERSION,
        },
    });
};

/** Retrait du consentement scouting (art. 7.3) — coupe l'accès, conserve la preuve. */
export const withdrawScoutingConsent = async (
    requestId: string,
    athleteUserId: string,
): Promise<void> => {
    const now = new Date().toISOString();
    await updateDoc(
        doc(db, 'scoutingRequests', requestId),
        cleanDataForFirebase({
            status: ScoutingRequestStatus.WITHDRAWN,
            grantedScopes: [],
            consentWithdrawnAt: now,
            consentWithdrawnBy: athleteUserId,
            responseDate: now,
            updatedAt: now,
        }),
    );
    await writeGdprAuditLog({
        action: 'scouting_consent_withdrawn',
        targetId: athleteUserId,
        performedBy: athleteUserId,
        method: 'client',
        metadata: { requestId },
    });
};

export const getIndependentPermissions = (
    user: User
): Partial<Record<AppSection, PermissionLevel[]>> => {
    const base: Partial<Record<AppSection, PermissionLevel[]>> = {
        myDashboard: ['view', 'edit'],
        independentHub: ['view', 'edit'],
        myCareer: ['view', 'edit'],
        career: ['view', 'edit'],
        userSettings: ['view', 'edit'],
        myProfile: ['view', 'edit'],
    };
    if (user.userRole === UserRole.STAFF) {
        base.missionSearch = ['view', 'edit'];
        base.myProfile = ['view', 'edit'];
        base.myCareer = ['view', 'edit'];
        base.myCalendar = ['view', 'edit'];
        base.myTrips = ['view', 'edit'];
        base.expenseReceipts = ['view', 'edit'];
        base.pricing = ['view', 'edit'];
    }
    if (user.userRole === UserRole.COUREUR) {
        base.teamSearch = ['view', 'edit'];
        base.myCareer = ['view', 'edit'];
        base.myProfile = ['view', 'edit'];
        base.myResults = ['view', 'edit'];
        base.myPerformance = ['view', 'edit'];
        base.performanceProject = ['view', 'edit'];
        base.riderEquipment = ['view', 'edit'];
        base.nutrition = ['view', 'edit'];
        base.myCalendar = ['view', 'edit'];
        base.pricing = ['view', 'edit'];
    }
    return base;
};

export const getEffectivePermissions = (
    user: User,
    basePermissions: AppPermissions,
    staff: StaffMember[] = [],
    options?: { skipSuperAdminBypass?: boolean }
): Partial<Record<AppSection, PermissionLevel[]>> => {
    // Super Admin plateforme : toujours avant le profil indépendant (sinon l’espace SA disparaît).
    if (!options?.skipSuperAdminBypass && isSuperAdminUser(user)) {
        const allPermissions: Partial<Record<AppSection, PermissionLevel[]>> = {};
        SECTIONS.forEach((section) => {
            const id = section.id as AppSection;
            if (id === 'eventDetail') return;
            allPermissions[id] = ['view', 'edit'];
        });
        return allPermissions;
    }

    if (user.signupMode === SignupMode.INDEPENDENT || user.isIndependentProfile) {
        return getIndependentPermissions(user);
    }

    if (user.userRole === UserRole.COUREUR) {
        return buildCoureurPermissions();
    }

    if (user.userRole === UserRole.PARTNER) {
        return {
            partnerPortal: ['view'],
            userSettings: ['view', 'edit'],
        };
    }

    const staffMemberEarly = getStaffMemberForUser(user, staff);
    const isManagerLevelAccess =
        user.permissionRole === TeamRole.ADMIN ||
        user.userRole === UserRole.MANAGER ||
        isManagerEquivalentStaffRole(staffMemberEarly?.role);

    if (isManagerLevelAccess) {
        const allPermissions: Partial<Record<AppSection, PermissionLevel[]>> = {};
        SECTIONS.forEach((section) => {
            const id = section.id as AppSection;
            if (id === 'eventDetail') return;
            if (MY_SPACE_SECTIONS.includes(id)) return;
            if (id === 'superAdmin') return;
            allPermissions[id] = ['view', 'edit'];
        });
        // Les managers / admins / présidence présents dans l’effectif staff gardent leur dossier perso.
        const staffMember = staffMemberEarly;
        Object.assign(allPermissions, getStaffMemberSectionGrants(staffMember));
        if (staffMember || user.userRole === UserRole.STAFF) {
            allPermissions.myProfile = ['view', 'edit'];
            allPermissions.myDashboard = allPermissions.myDashboard || ['view'];
            allPermissions.userSettings = allPermissions.userSettings || ['view', 'edit'];
        }
        return allPermissions;
    }

    const mergedBase = mergeConfiguredPermissions(basePermissions);
    const effectiveRoleKey = user.permissionRole || TeamRole.VIEWER;
    const effectivePerms: Partial<Record<AppSection, PermissionLevel[]>> = structuredClone(
        resolveRolePermissions(effectiveRoleKey, mergedBase)
    );

    MY_SPACE_SECTIONS.forEach((section) => delete effectivePerms[section]);

    const staffMember = staffMemberEarly;
    Object.assign(
      effectivePerms,
      mergeSectionGrants(effectivePerms, getStaffMemberSectionGrants(staffMember)),
    );

    if (user.userRole === UserRole.STAFF) {
        const staffRoleKey = getStaffRoleKey(staffMember?.role);
        const permRole = String(user.permissionRole || '');
        const keepFinancial =
            permRole === 'comptable' ||
            permRole === 'tresorier' ||
            staffRoleKey === 'TRESORIER' ||
            Boolean(user.customPermissions?.financial?.length);
        if (!keepFinancial) {
            delete effectivePerms.financial;
        }
        effectivePerms.myProfile = effectivePerms.myProfile || ['view', 'edit'];
        delete effectivePerms.adminDossier;
    }

    if (hasAccessToMissions(user, staff)) {
        effectivePerms.missionSearch = effectivePerms.missionSearch || ['view', 'edit'];
    } else {
        delete effectivePerms.missionSearch;
    }

    if (user.customPermissions) {
        for (const sectionKey in user.customPermissions) {
            const section = sectionKey as AppSection;
            const custom = user.customPermissions[section];
            if (custom && custom.length > 0) {
                effectivePerms[section] = custom;
            } else {
                delete effectivePerms[section];
            }
        }
    }

    getStaffMemberSectionDenials(staffMember).forEach((section) => {
        delete effectivePerms[section];
    });

    if (!effectivePerms || Object.keys(effectivePerms).length === 0) {
        return DEFAULT_ROLE_PERMISSIONS[TeamRole.VIEWER] || {};
    }

    return effectivePerms;
};

// --- TEAM DATA ---

/** Limite la concurrence Firestore : trop de getDocs en parallèle saturent le réseau mobile. */
const TEAM_COLLECTION_FETCH_CONCURRENCY = 6;

async function mapInBatches<T, R>(
    items: readonly T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        results.push(...(await Promise.all(batch.map(mapper))));
    }
    return results;
}

type TeamCollectionDoc = { id: string } & Record<string, unknown>;

async function fetchTeamCollectionDocs(
    teamDocRef: ReturnType<typeof doc>,
    teamId: string,
    collections: readonly string[],
): Promise<Array<{ coll: string; docs: TeamCollectionDoc[] }>> {
    return mapInBatches(collections, TEAM_COLLECTION_FETCH_CONCURRENCY, async (coll) => {
        try {
            const snapshot = await getDocs(collection(teamDocRef, coll));
            return {
                coll,
                docs: snapshot.docs
                    .filter((d) => d.id !== '_init_')
                    .map((d) => ({ id: d.id, ...d.data() })),
            };
        } catch (error) {
            console.warn(`Chargement teams/${teamId}/${coll} ignoré:`, error);
            return { coll, docs: [] as TeamCollectionDoc[] };
        }
    });
}

export type GetTeamDataOptions = {
    /** `priority` = collections critiques seulement (1er paint mobile). Défaut : `full`. */
    mode?: 'priority' | 'full';
};

export const getTeamData = async (
    teamId: string,
    viewer?: User,
    options?: GetTeamDataOptions,
): Promise<Partial<TeamState>> => {
    const mode = options?.mode ?? 'full';
    const teamDocRef = doc(db, 'teams', teamId);
    
    const teamState: Partial<TeamState> = {};
    try {
        const teamDocSnap = await getDoc(teamDocRef);
        if(teamDocSnap.exists()) {
            const teamData = teamDocSnap.data();
            if (teamData) {
                Object.assign(teamState, {
                    teamLevel: teamData.level,
                    subscription: teamData.subscription ?? {
                        planId: getDefaultPlanForTeamLevel(teamData.level as TeamLevel),
                        status: 'pilot',
                        pilotEndsAt: new Date(Date.now() + PILOT_DAYS * 86400000).toISOString(),
                    },
                    operationalSettings: teamData.operationalSettings,
                    themePrimaryColor: teamData.themePrimaryColor,
                    themeAccentColor: teamData.themeAccentColor,
                    language: teamData.language,
                    teamLogoUrl: teamData.teamLogoUrl,
                    categoryBudgets: teamData.categoryBudgets,
                    // sepaSettings chargé depuis privateConfig (pas le doc public)
                    invoiceSettings: teamData.invoiceSettings,
                    // gpsWebhookKey chargé séparément (privateConfig) — pas depuis le doc public
                });
            }
        }
    } catch (error) {
        console.warn(`Lecture doc équipe ${teamId} refusée:`, error);
        // Continuer avec un état vide plutôt que de bloquer tout le login
    }

    // Clé GPS : uniquement si le viewer est manager (sinon rules refusent privateConfig)
    if (viewer && (viewer.userRole === UserRole.MANAGER || viewer.permissionRole === TeamRole.ADMIN)) {
        teamState.gpsWebhookKey = await loadGpsWebhookKey(teamId);
    } else if (!viewer) {
        // Appels internes sans viewer : tenter lecture (échouera silencieusement si non manager)
        teamState.gpsWebhookKey = await loadGpsWebhookKey(teamId);
    }

    // SEPA : managers + finance readers (rules privateConfig/sepa)
    const canLoadSepa =
        !viewer ||
        viewer.userRole === UserRole.MANAGER ||
        viewer.permissionRole === TeamRole.ADMIN ||
        viewer.permissionRole === 'comptable' ||
        viewer.permissionRole === 'tresorier';
    if (canLoadSepa) {
        teamState.sepaSettings = await loadSepaSettings(teamId);
    }

    // Charger les modèles de checklist depuis la sous-collection et grouper par rôle
    const checklistByRole = buildEmptyChecklistTemplatesRecord();
    try {
        const checklistCollRef = collection(teamDocRef, 'checklistTemplates');
        const checklistSnap = await getDocs(checklistCollRef);
        const checklistDocs = checklistSnap.docs
            .filter(d => d.id !== '_init_')
            .map(d => ({ id: d.id, ...d.data() } as ChecklistTemplate & { role?: string }));
        for (const t of checklistDocs) {
            const role = (t.role as ChecklistRole) || ChecklistRole.DS;
            if (checklistByRole[role]) checklistByRole[role].push({ id: t.id, name: t.name, role, kind: t.kind, eventType: t.eventType, timing: t.timing, timingLabel: t.timingLabel });
        }
    } catch (error) {
        console.warn(`Chargement checklistTemplates ${teamId} ignoré:`, error);
    }
    teamState.checklistTemplates = checklistByRole;

    const collectionsToLoad =
        mode === 'priority' ? TEAM_STATE_PRIORITY_COLLECTIONS : TEAM_STATE_COLLECTIONS;

    // Lots de 6 : évite de saturer la 4G / le client Firestore avec ~40 getDocs d’un coup.
    // Chaque collection est isolée : un refus rules ne bloque pas tout le chargement.
    const collectionSnapshots = await fetchTeamCollectionDocs(
        teamDocRef,
        teamId,
        collectionsToLoad,
    );
    for (const { coll, docs } of collectionSnapshots) {
        (teamState as any)[coll] = docs;
    }

    // S'assurer que toutes les collections sont des tableaux (même si vides)
    for (const coll of TEAM_STATE_COLLECTIONS) {
        if (!(teamState as any)[coll]) {
            (teamState as any)[coll] = [];
        }
    }
    
    if (viewer && isCoureurUser(viewer)) {
        return scopeTeamStateForCoureur(teamState, viewer);
    }

    return teamState;
};

/**
 * Charge les collections secondaires après le 1er paint (logistique, finance, etc.).
 * À fusionner dans l’état app sans rebloquer l’UI.
 * Ne renvoie que les clés différées (ne pas écraser riders/staff déjà chargés).
 */
export const getDeferredTeamCollections = async (
    teamId: string,
    viewer?: User,
): Promise<Partial<TeamState>> => {
    const teamDocRef = doc(db, 'teams', teamId);
    const teamState: Partial<TeamState> = {};
    const collectionSnapshots = await fetchTeamCollectionDocs(
        teamDocRef,
        teamId,
        TEAM_STATE_DEFERRED_COLLECTIONS,
    );
    for (const { coll, docs } of collectionSnapshots) {
        (teamState as any)[coll] = docs;
    }
    for (const coll of TEAM_STATE_DEFERRED_COLLECTIONS) {
        if (!(teamState as any)[coll]) {
            (teamState as any)[coll] = [];
        }
    }

    if (viewer && isCoureurUser(viewer)) {
        // Filtrage coureur limité aux collections différées (ne pas vider riders/staff).
        return {
            ...teamState,
            scoutingProfiles: [],
            performanceArchives: [],
            sepaBatches: [],
            bankTransactions: [],
            quotes: [],
            clientRecords: [],
            supplierInvoices: [],
            recruitmentOffers: [],
            recruitmentCampaigns: [],
        };
    }
    return teamState;
};

// --- DATA MODIFICATION ---

/**
 * Met à jour les champs PPR et l'historique d'un coureur (sauvegarde directe)
 * Utilisé pour garantir que les modifications PPR et l'historique sont bien persistées
 */
const PPR_PROFILE_KEYS = ['powerProfileFresh', 'powerProfile15KJ', 'powerProfile30KJ', 'powerProfile45KJ'] as const;

export const updateRiderPowerProfiles = async (
  teamId: string,
  riderId: string,
  powerProfiles: {
    powerProfileFresh?: PowerProfile;
    powerProfile15KJ?: PowerProfile;
    powerProfile30KJ?: PowerProfile;
    powerProfile45KJ?: PowerProfile;
    profilePRR?: string;
    profile15KJ?: string;
    profile30KJ?: string;
    profile45KJ?: string;
    powerProfileHistory?: PowerProfileHistory;
  }
): Promise<void> => {
  let cleanedData = cleanDataForFirebase(powerProfiles) as Record<string, unknown>;
  for (const key of PPR_PROFILE_KEYS) {
    if (key in cleanedData && typeof cleanedData[key] === 'object' && cleanedData[key] !== null && !Array.isArray(cleanedData[key])) {
      const obj = cleanedData[key] as Record<string, unknown>;
      if (Object.keys(obj).length === 0) {
        cleanedData = { ...cleanedData, [key]: null };
      }
    }
  }
  if (Object.keys(cleanedData).length === 0) return;
  const docRef = doc(db, 'teams', teamId, 'riders', riderId);
  await setDoc(docRef, cleanedData, { merge: true });
};

/** Enregistrement dans une collection racine Firestore (hors équipe). */
export const saveGlobalData = async <T extends { id?: string }>(
  collectionName: string,
  data: T,
): Promise<string> => {
  const { id, ...dataToSave } = data;
  const cleanedData = cleanDataForFirebase(dataToSave);
  const rootCollectionRef = collection(db, collectionName);

  if (id) {
    const docRef = doc(rootCollectionRef, id);
    await setDoc(docRef, cleanedData, { merge: true });
    return id;
  }

  const docRef = await addDoc(rootCollectionRef, cleanedData);
  return docRef.id;
};

export const deleteGlobalData = async (collectionName: string, id: string): Promise<void> => {
  await deleteDoc(doc(db, collectionName, id));
};

export const saveData = async <T extends { id?: string }>(teamId: string, collectionName: string, data: T): Promise<string> => {
    const { id, ...dataToSave } = data;
    const cleanedData = cleanDataForFirebase(dataToSave);
    const subCollectionRef = collection(db, 'teams', teamId, collectionName);
    
    if (id) {
        const docRef = doc(subCollectionRef, id);
        await setDoc(docRef, cleanedData, { merge: true });
        return id;
    } else {
        const docRef = await addDoc(subCollectionRef, cleanedData);
        return docRef.id;
    }
};

/**
 * Sauvegarde multiple éléments en une seule opération par lot (batch)
 * Beaucoup plus rapide que plusieurs appels individuels
 */
export const saveDataBatch = async <T extends { id?: string }>(
    teamId: string, 
    collectionName: string, 
    items: T[]
): Promise<string[]> => {
    if (items.length === 0) return [];
    
    const batch = writeBatch(db);
    const subCollectionRef = collection(db, 'teams', teamId, collectionName);
    const savedIds: string[] = [];
    
    for (const item of items) {
        const { id, ...dataToSave } = item;
        const cleanedData = cleanDataForFirebase(dataToSave);
        
        if (id) {
            // Mise à jour d'un document existant
            const docRef = doc(subCollectionRef, id);
            batch.set(docRef, cleanedData, { merge: true });
            savedIds.push(id);
        } else {
            // Création d'un nouveau document
            const docRef = doc(subCollectionRef);
            batch.set(docRef, cleanedData);
            savedIds.push(docRef.id);
        }
    }
    
    await batch.commit();
    return savedIds;
};

export const deleteData = async (teamId: string, collectionName: string, docId: string) => {
    const docRef = doc(db, 'teams', teamId, collectionName, docId);
    await deleteDoc(docRef);
};

export const saveTeamSettings = async (teamId: string, settings: Record<string, unknown>) => {
    const teamDocRef = doc(db, 'teams', teamId);
    await setDoc(teamDocRef, cleanDataForFirebase(settings), { merge: true });
};

export type InvoiceSequenceField = 'nextInvoiceNumber' | 'nextQuoteNumber';

/**
 * Alloue atomiquement un numéro de facture ou de devis via transaction Firestore.
 * Les trous de séquence sont acceptés si l'écriture métier échoue ensuite ;
 * les doublons sont interdits.
 */
export const allocateDocumentSequence = async (
    teamId: string,
    field: InvoiceSequenceField,
): Promise<{ sequence: number; invoiceSettings: TeamInvoiceSettings }> => {
    const teamDocRef = doc(db, 'teams', teamId);
    return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(teamDocRef);
        const data = snap.exists() ? snap.data() : undefined;
        const currentSettings = (data?.invoiceSettings || {}) as TeamInvoiceSettings;
        const sequence = resolveDocumentSequence(currentSettings[field]);
        const invoiceSettings: TeamInvoiceSettings = {
            ...currentSettings,
            issuerName: currentSettings.issuerName || '',
            [field]: sequence + 1,
        };
        transaction.set(
            teamDocRef,
            cleanDataForFirebase({ invoiceSettings }),
            { merge: true },
        );
        return { sequence, invoiceSettings };
    });
};

// Fonctions pour la gestion des paramètres utilisateur
export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Aucun utilisateur connecté');
    }

    try {
        // Réauthentifier l'utilisateur avec son mot de passe actuel
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Mettre à jour le mot de passe
        await updatePassword(user, newPassword);
        
        return { success: true, message: 'Mot de passe mis à jour avec succès' };
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        
        let errorMessage = 'Erreur lors de la mise à jour du mot de passe';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Mot de passe actuel incorrect';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Le nouveau mot de passe est trop faible';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Veuillez vous reconnecter avant de changer votre mot de passe';
        }
        
        throw new Error(errorMessage);
    }
};

export const deleteUserAccount = async (currentPassword: string) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Aucun utilisateur connecté');
    }

    try {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);

        await purgeUserPersonalDataSecure(user.uid, user.uid);

        await deleteUser(user);
        await signOut(auth);

        return { success: true, message: 'Compte et données personnelles supprimés avec succès' };
    } catch (error: unknown) {
        console.error('Erreur lors de la suppression du compte:', error);

        let errorMessage = 'Erreur lors de la suppression du compte';
        const err = error as { code?: string };
        if (err.code === 'auth/wrong-password') {
            errorMessage = 'Mot de passe incorrect';
        } else if (err.code === 'auth/requires-recent-login') {
            errorMessage = 'Veuillez vous reconnecter avant de supprimer votre compte';
        }

        throw new Error(errorMessage);
    }
};

export const deleteTeamWithAuth = async (teamId: string, currentPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Aucun utilisateur connecté');
    }

    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);

    await deleteTeamAndAllDataSecure(teamId, user.uid);

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
        userDocRef,
        { teamId: null, updatedAt: new Date().toISOString() },
        { merge: true }
    );
};

/** Suppression d’équipe réservée au Super Admin (sans re-saisie du mot de passe). */
export const deleteTeamAsSuperAdmin = async (teamId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error('Aucun utilisateur connecté');
    }
    const email = user.email.trim().toLowerCase();
    if (email !== 'anthony.uldry@hotmail.fr') {
        throw new Error('Accès Super Admin requis pour supprimer une équipe.');
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    const prev = userSnap.exists() ? userSnap.data() : {};
    const alreadyManager =
        prev.teamId === teamId &&
        (prev.userRole === 'Manager' || prev.permissionRole === 'Administrateur');

    // Élévation temporaire : les règles / Cloud Function exigent un manager d’équipe
    // tant que le déploiement Super Admin n’est pas propagé.
    if (!alreadyManager) {
        await setDoc(
            userDocRef,
            {
                teamId,
                userRole: 'Manager',
                permissionRole: 'Administrateur',
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );
    }

    try {
        await deleteTeamAndAllDataSecure(teamId, user.uid);
    } finally {
        if (!alreadyManager) {
            await setDoc(
                userDocRef,
                {
                    teamId: prev.teamId === teamId ? null : (prev.teamId ?? null),
                    userRole: prev.userRole ?? null,
                    permissionRole: prev.permissionRole ?? null,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );
        }
    }
};

export const updateUserProfile = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const updateData = cleanDataForFirebase({
        ...updatedData,
        updatedAt: new Date().toISOString(),
    });
    if (Object.keys(updateData).length === 0) return;
    await updateDoc(userRef, updateData);
};

export function subscribeVehiclePositions(
    teamId: string,
    onUpdate: (positions: VehiclePosition[]) => void
): () => void {
    const collRef = collection(doc(db, 'teams', teamId), 'vehiclePositions');
    const q = query(collRef, orderBy('recordedAt', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
        onUpdate(
            snapshot.docs
                .filter((d) => d.id !== '_init_')
                .map((d) => ({ id: d.id, ...d.data() } as VehiclePosition))
        );
    });
}
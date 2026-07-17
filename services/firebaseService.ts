import { db, storage, auth } from '../firebaseConfig';
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
} from '../types';
import { SignupData } from '../sections/SignupView';
import { SECTIONS, TEAM_STATE_COLLECTIONS, getInitialGlobalState, LEGAL_VERSIONS } from '../constants';
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
import { getDefaultPlanForTeamLevel } from '../constants/subscriptionPlans';
import { buildInitialIndependentSubscription, buildInitialSubscription } from './billingService';
import { buildDefaultRider, buildDefaultStaffMember } from '../utils/defaultTeamMemberProfiles';
import { purgeUserPersonalDataSecure, deleteTeamAndAllDataSecure } from './gdprCloudService';
import { GdprConsent } from '../types';
import {
  canRiderApplyToTeam,
  canTeamScoutRider,
  getMarketMismatchMessage,
  getTeamMarketContext,
  resolveRiderMarketSegmentFromUser,
} from '../utils/riderTeamMarketSegment';

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

        // Validation de la date de naissance (peut être optionnelle pour les utilisateurs existants)
        if (!birthDate && signupData.password) {
            // Si c'est une nouvelle inscription (avec mot de passe), birthDate est requis
            throw new Error("La date de naissance est requise pour l'inscription.");
        }

        // Normalisation du sex avec gestion améliorée
        let normalizedSex: Sex | undefined = undefined;
        if (sex !== undefined && sex !== null) {
            const sexStr = String(sex);
            const maleValues = new Set<string>(['male', Sex.MALE, Sex.MALE_SHORT]);
            const femaleValues = new Set<string>(['female', Sex.FEMALE, Sex.FEMALE_SHORT, Sex.FEMALE_EN]);
            if (maleValues.has(sexStr)) {
                normalizedSex = Sex.MALE;
            } else if (femaleValues.has(sexStr)) {
                normalizedSex = Sex.FEMALE;
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
            };
        }

        const isIndependentSignup =
            signupData.signupMode === SignupMode.INDEPENDENT &&
            userRole !== UserRole.MANAGER;

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
            ...(isIndependentSignup
                ? {
                      signupMode: SignupMode.INDEPENDENT,
                      isIndependentProfile: true,
                      independentActivatedAt: now,
                      subscription: buildInitialIndependentSubscription(userRole),
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
    userInfo?: { firstName?: string; lastName?: string; email?: string }
) => {
    try {
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
        
        if (userRole === UserRole.COUREUR) {
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
        
        // Créer la demande de membership
        await addDoc(membershipsColRef, {
            userId,
            teamId,
            status: TeamMembershipStatus.PENDING,
            userRole,
            firstName: userInfo?.firstName ?? '',
            lastName: userInfo?.lastName ?? '',
            email: userInfo?.email ?? '',
            teamName: teamData.name,
            source: 'self_join',
            requestedAt: new Date().toISOString(),
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
}

export const approveTeamMembership = async (
    input: ApproveMembershipInput,
    approvedBy: string,
    existingUser?: User | null
): Promise<{ riderCreated: boolean; staffCreated: boolean }> => {
    const { membershipId, userId, teamId, userRole, email, firstName, lastName } = input;
    const now = new Date().toISOString();

    const membershipRef = doc(db, 'teamMemberships', membershipId);
    await updateDoc(membershipRef, {
        status: TeamMembershipStatus.ACTIVE,
        approvedAt: now,
        approvedBy,
    });

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const currentUserData = userDoc.exists() ? (userDoc.data() as User) : null;

    await setDoc(
        userDocRef,
        {
            teamId,
            isActive: true,
            email: email || currentUserData?.email,
            firstName: firstName || currentUserData?.firstName || '',
            lastName: lastName || currentUserData?.lastName || '',
            userRole,
            permissionRole: TeamRole.MEMBER,
            updatedAt: now,
        },
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
            await setDoc(riderRef, rider);
            riderCreated = true;
        }
    } else if (userRole === UserRole.STAFF) {
        const staffRef = doc(db, 'teams', teamId, 'staff', userId);
        const staffSnap = await getDoc(staffRef);
        if (!staffSnap.exists()) {
            const staffMember = buildDefaultStaffMember({
                id: userId,
                firstName: firstName || currentUserData?.firstName || '',
                lastName: lastName || currentUserData?.lastName || '',
                email: email || currentUserData?.email || '',
            });
            await setDoc(staffRef, staffMember);
            staffCreated = true;
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

export const createTeamForUser = async (userId: string, teamData: { name: string; level: TeamLevel; country: string; planId?: import('../types').SubscriptionPlanId; }, userRole: UserRole) => {
    try {
        const subscription = buildInitialSubscription(teamData.level, teamData.planId);
        const teamsColRef = collection(db, 'teams');
        const newTeamRef = await addDoc(teamsColRef, {
            name: teamData.name,
            level: teamData.level,
            country: teamData.country,
            subscription,
            operationalSettings: getRecommendedOperationalSettings(teamData.level),
            createdAt: new Date().toISOString(),
        });
        
        // 2. Utiliser une transaction pour garantir l'atomicité des opérations critiques
        await runTransaction(db, async (transaction) => {
            // Lire le document utilisateur pour préserver les données existantes
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await transaction.get(userDocRef);
            const currentUserData = userDoc.exists() ? userDoc.data() : {};
            
            // 3. Créer le membership actif pour le créateur
            const membershipsColRef = collection(db, 'teamMemberships');
            const membershipRef = doc(membershipsColRef);
            transaction.set(membershipRef, {
                userId: userId,
                teamId: newTeamRef.id,
                status: TeamMembershipStatus.ACTIVE,
                userRole: UserRole.MANAGER,
                startDate: new Date().toISOString().split('T')[0],
            });

            // 4. Mettre à jour le profil utilisateur avec les permissions admin et le teamId
            transaction.set(
                userDocRef,
                { 
                    ...currentUserData,
                    permissionRole: TeamRole.ADMIN, 
                    userRole: UserRole.MANAGER,
                    teamId: newTeamRef.id
                },
                { merge: true }
            );
        });

        // 3. Initialiser les sous-collections de l'équipe avec un batch (après la transaction)
        const batch = writeBatch(db);
        for (const collName of TEAM_STATE_COLLECTIONS) {
            const subCollRef = doc(db, 'teams', newTeamRef.id, collName, '_init_');
            batch.set(subCollRef, { createdAt: new Date().toISOString() });
        }
        await batch.commit();

        // Attendre un court délai pour s'assurer que Firestore a propagé les changements
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return { teamId: newTeamRef.id };
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'équipe:', error);
        throw new Error(`Échec de la création de l'équipe: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
    await setDoc(doc(db, 'teams', teamId), { gpsWebhookKey: key }, { merge: true });
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

// --- GLOBAL DATA ---
export const getGlobalData = async (): Promise<Partial<GlobalState>> => {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const membershipsSnap = await getDocs(collection(db, 'teamMemberships'));
        const permissionsSnap = await getDocs(collection(db, 'permissions'));
        const permissionRolesSnap = await getDocs(collection(db, 'permissionRoles'));
        const scoutingRequestsSnap = await getDocs(collection(db, 'scoutingRequests'));
    
    const permissionsDoc = permissionsSnap.empty ? undefined : permissionsSnap.docs[0];
    const fallbackPermissionRoles = getInitialGlobalState().permissionRoles;
    const permissionRoles = permissionRolesSnap.size > 0
        ? permissionRolesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        : fallbackPermissionRoles;

        return {
            users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
            teams: teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Team)),
            teamMemberships: membershipsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMembership)),
            permissions: mergeConfiguredPermissions(
                permissionsDoc ? (permissionsDoc.data() as AppPermissions) : {}
            ),
            permissionRoles,
            scoutingRequests: scoutingRequestsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ScoutingRequest)),
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
        phone: applicant?.phone,
        message: applicant?.message,
        appliedAt: new Date().toISOString(),
        status: MissionApplicationStatus.RECEIVED,
    };

    await updateDoc(missionRef, {
        applicants: [...applicants, userId],
        applications: [...applications, newApp],
        updatedAt: new Date().toISOString(),
    });
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
): Promise<void> => {
    const status =
        response === 'accepted' ? ScoutingRequestStatus.ACCEPTED : ScoutingRequestStatus.REJECTED;
    const payload: Record<string, unknown> = {
        status,
        responseDate: new Date().toISOString(),
    };
    if (response === 'accepted' && grantedScopes?.length) {
        payload.grantedScopes = grantedScopes;
    }
    await updateDoc(doc(db, 'scoutingRequests', requestId), payload);
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
    if (user.signupMode === SignupMode.INDEPENDENT || user.isIndependentProfile) {
        return getIndependentPermissions(user);
    }

    if (!options?.skipSuperAdminBypass && isSuperAdminUser(user)) {
        const allPermissions: Partial<Record<AppSection, PermissionLevel[]>> = {};
        SECTIONS.forEach((section) => {
            const id = section.id as AppSection;
            if (id === 'eventDetail') return;
            allPermissions[id] = ['view', 'edit'];
        });
        return allPermissions;
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

    if (user.permissionRole === TeamRole.ADMIN || user.userRole === UserRole.MANAGER) {
        const allPermissions: Partial<Record<AppSection, PermissionLevel[]>> = {};
        SECTIONS.forEach((section) => {
            const id = section.id as AppSection;
            if (id === 'eventDetail') return;
            if (MY_SPACE_SECTIONS.includes(id)) return;
            if (id === 'superAdmin') return;
            allPermissions[id] = ['view', 'edit'];
        });
        // Les managers / admins présents dans l’effectif staff gardent leur dossier perso.
        const staffMember = getStaffMemberForUser(user, staff);
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

    const staffMember = getStaffMemberForUser(user, staff);
    Object.assign(
      effectivePerms,
      mergeSectionGrants(effectivePerms, getStaffMemberSectionGrants(staffMember)),
    );

    if (user.userRole === UserRole.STAFF) {
        delete effectivePerms.financial;
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
export const getTeamData = async (
    teamId: string,
    viewer?: User
): Promise<Partial<TeamState>> => {
    const teamDocRef = doc(db, 'teams', teamId);
    
    const teamState: Partial<TeamState> = {};
    const teamDocSnap = await getDoc(teamDocRef);
    if(teamDocSnap.exists()) {
        const teamData = teamDocSnap.data();
        if (teamData) {
            Object.assign(teamState, {
                teamLevel: teamData.level,
                subscription: teamData.subscription ?? {
                    planId: getDefaultPlanForTeamLevel(teamData.level as TeamLevel),
                    status: 'pilot',
                    pilotEndsAt: new Date(Date.now() + 90 * 86400000).toISOString(),
                },
                operationalSettings: teamData.operationalSettings,
                themePrimaryColor: teamData.themePrimaryColor,
                themeAccentColor: teamData.themeAccentColor,
                language: teamData.language,
                teamLogoUrl: teamData.teamLogoUrl,
                categoryBudgets: teamData.categoryBudgets,
                sepaSettings: teamData.sepaSettings,
                invoiceSettings: teamData.invoiceSettings,
                gpsWebhookKey: teamData.gpsWebhookKey,
            });
        }
    }

    // Charger les modèles de checklist depuis la sous-collection et grouper par rôle
    const checklistCollRef = collection(teamDocRef, 'checklistTemplates');
    const checklistSnap = await getDocs(checklistCollRef);
    const checklistDocs = checklistSnap.docs
        .filter(d => d.id !== '_init_')
        .map(d => ({ id: d.id, ...d.data() } as ChecklistTemplate & { role?: string }));
    const checklistByRole = buildEmptyChecklistTemplatesRecord();
    for (const t of checklistDocs) {
        const role = (t.role as ChecklistRole) || ChecklistRole.DS;
        if (checklistByRole[role]) checklistByRole[role].push({ id: t.id, name: t.name, role, kind: t.kind, eventType: t.eventType, timing: t.timing, timingLabel: t.timingLabel });
    }
    teamState.checklistTemplates = checklistByRole;

    for (const coll of TEAM_STATE_COLLECTIONS) {
        const collRef = collection(teamDocRef, coll);
        const snapshot = await getDocs(collRef);
        (teamState as any)[coll] = snapshot.docs
            .filter(d => d.id !== '_init_')
            .map(d => ({ id: d.id, ...d.data() }));
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
    await setDoc(teamDocRef, settings, { merge: true });
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

export const updateUserProfile = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const updateData = {
        ...updatedData,
        updatedAt: new Date().toISOString()
    };
    
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
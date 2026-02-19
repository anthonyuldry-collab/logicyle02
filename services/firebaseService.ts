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
  where
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { 
  updatePassword, 
  deleteUser, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  signOut
} from 'firebase/auth';
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
  StaffRole,
  Sex,
  SignupInfo,
} from '../types';
import { SignupData } from '../sections/SignupView';
import { SECTIONS, TEAM_STATE_COLLECTIONS, getInitialGlobalState } from '../constants';

// Helper function to check if user has access to mission search based on staff role
const hasAccessToMissions = (user: User, staff: StaffMember[]): boolean => {
    // Find the staff member associated with this user
    const staffMember = staff.find(s => s.email === user.email);
    
    // If no staff member found, no access to missions
    if (!staffMember) return false;
    
    // Check if the staff role is one of the allowed roles for mission search
    const allowedRoles = [StaffRole.DS, StaffRole.ENTRAINEUR, StaffRole.ASSISTANT, StaffRole.MECANO];
    return allowedRoles.includes(staffMember.role);
};

// Reasonable default permissions when no permissions document is configured in Firestore
const DEFAULT_ROLE_PERMISSIONS: AppPermissions = {
    [TeamRole.VIEWER]: {
        // Sections de base accessibles à tous
        events: ['view'],
        myDashboard: ['view'],
        
        // Note: Sections logistiques (véhicules, matériel, stocks) exclues des athlètes
        // Note: Section Scouting exclue des athlètes (TeamRole.VIEWER)
        // Note: Sections "Mon Espace" ajoutées dynamiquement pour les coureurs uniquement
    },
    [TeamRole.MEMBER]: {
        // Sections de base
        events: ['view'],
        myDashboard: ['view'],
        
        // Sections logistiques étendues
        roster: ['view'],
        vehicles: ['view'],
        equipment: ['view'],
        stocks: ['view'],
        scouting: ['view'],
        
        // Accès limité au staff (lecture seule)
        staff: ['view'],
    },
    [TeamRole.EDITOR]: {
        // Sections de base
        events: ['view', 'edit'],
        myDashboard: ['view'],
        
        // Sections logistiques complètes
        roster: ['view', 'edit'],
        staff: ['view', 'edit'],
        vehicles: ['view', 'edit'],
        equipment: ['view', 'edit'],
        stocks: ['view', 'edit'],
        scouting: ['view', 'edit'],
        checklist: ['view', 'edit'],
        
        // Accès au pôle performance (Entraîneur/DS)
        performance: ['view', 'edit'],
    },
    // TeamRole.ADMIN handled as full access elsewhere
};

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
export const uploadFile = async (base64: string, path: string, mimeType: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const base64Data = base64.split(',')[1];
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
            if (sex === 'male' || sex === Sex.MALE) {
                normalizedSex = Sex.MALE;
            } else if (sex === 'female' || sex === Sex.FEMALE) {
                normalizedSex = Sex.FEMALE;
            } else if (sex === Sex.MALE || sex === Sex.FEMALE) {
                normalizedSex = sex;
            }
        }

        const signupInfo: SignupInfo = {};
        if (birthDate) {
            signupInfo.birthDate = birthDate;
        }
        if (normalizedSex !== undefined) {
            signupInfo.sex = normalizedSex;
        }

        const newUser: Omit<User, 'id'> = {
            email,
            firstName,
            lastName,
            permissionRole: TeamRole.VIEWER,
            userRole: userRole, // Utiliser le rôle sélectionné lors de l'inscription
            isSearchable: false,
            openToExternalMissions: false,
            signupInfo: Object.keys(signupInfo).length > 0 ? signupInfo : undefined,
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

export const requestToJoinTeam = async (userId: string, teamId: string, userRole: UserRole) => {
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
        
        // Créer la demande de membership
        await addDoc(membershipsColRef, {
            userId: userId,
            teamId: teamId,
            status: TeamMembershipStatus.PENDING,
            userRole: userRole,
            requestedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Erreur lors de la demande pour rejoindre l'équipe:", error);
        throw error;
    }
};

export const createTeamForUser = async (userId: string, teamData: { name: string; level: TeamLevel; country: string; }, userRole: UserRole) => {
    try {
        // 1. Créer l'équipe d'abord (hors transaction car addDoc génère un ID)
        const teamsColRef = collection(db, 'teams');
        const newTeamRef = await addDoc(teamsColRef, teamData);
        
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

// --- GLOBAL DATA ---
export const getGlobalData = async (): Promise<Partial<GlobalState>> => {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const membershipsSnap = await getDocs(collection(db, 'teamMemberships'));
        const permissionsSnap = await getDocs(collection(db, 'permissions'));
        const permissionRolesSnap = await getDocs(collection(db, 'permissionRoles'));
    
    const permissionsDoc = permissionsSnap.docs[0];
    const fallbackPermissionRoles = getInitialGlobalState().permissionRoles;
    const permissionRoles = permissionRolesSnap.size > 0
        ? permissionRolesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        : fallbackPermissionRoles;

        return {
            users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
            teams: teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Team)),
            teamMemberships: membershipsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMembership)),
            permissions: permissionsDoc ? (permissionsDoc.data() as AppPermissions) : {},
            permissionRoles
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des données globales:', error);
        throw error;
    }
};

export const getEffectivePermissions = (user: User, basePermissions: AppPermissions, staff: StaffMember[] = []): Partial<Record<AppSection, PermissionLevel[]>> => {
    // SOLUTION DE CONTOURNEMENT : Forcer les permissions Manager pour tous les utilisateurs avec teamId
    // ou pour les utilisateurs qui ont créé une équipe
    
    // Vérifier si l'utilisateur est admin (via permissionRole) OU manager (via userRole)
    if (user.permissionRole === TeamRole.ADMIN || user.userRole === UserRole.MANAGER) {
        const allPermissions: Partial<Record<AppSection, PermissionLevel[]>> = {};
        SECTIONS.forEach(section => {
            // Exclure TOUJOURS les sections "Mon Espace" pour les managers/admins
            const isMySpaceSection = [
                'career', 'nutrition', 'riderEquipment', 'adminDossier', 
                'myTrips', 'myPerformance', 'performanceProject', 'automatedPerformanceProfile',
                'myProfile', 'myCalendar', 'myCareer', 'myResults', 'bikeSetup'
            ].includes(section.id);
            
            // Seules les sections NON "Mon Espace" sont accessibles aux managers/admins
            if (!isMySpaceSection) {
                allPermissions[section.id as AppSection] = ['view', 'edit'];
            }
        });
        return allPermissions;
    }
    
    // SOLUTION AGGRESSIVE : Si l'utilisateur a un teamId OU s'il a accès à certaines sections admin,
    // on le considère comme manager et on lui donne toutes les permissions
    if (user.teamId || 
        user.permissionRole === TeamRole.EDITOR || 
        user.permissionRole === TeamRole.MEMBER) {
        
        const managerPermissions: Partial<Record<AppSection, PermissionLevel[]>> = {};
        SECTIONS.forEach(section => {
            // Exclure les sections "Mon Espace"
            const isMySpaceSection = [
                'career', 'nutrition', 'riderEquipment', 'adminDossier', 
                'myTrips', 'myPerformance', 'performanceProject', 'automatedPerformanceProfile',
                'myProfile', 'myCalendar', 'myCareer', 'myResults', 'bikeSetup'
            ].includes(section.id);
            
            if (!isMySpaceSection) {
                managerPermissions[section.id as AppSection] = ['view', 'edit'];
            }
        });
        return managerPermissions;
    }

    const effectiveRoleKey = user.permissionRole || TeamRole.VIEWER;
    let rolePerms = basePermissions[effectiveRoleKey] || DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey] || {};
    
    // Si aucune permission n'est trouvée, utiliser les permissions par défaut du rôle
    if (!rolePerms || Object.keys(rolePerms).length === 0) {
        rolePerms = DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey] || DEFAULT_ROLE_PERMISSIONS[TeamRole.VIEWER] || {};
    }
    
    const effectivePerms: Partial<Record<AppSection, PermissionLevel[]>> = structuredClone(rolePerms);
    
    // Vérification supplémentaire : supprimer TOUJOURS les sections "Mon Espace" pour les non-coureurs
    if (user.userRole !== UserRole.COUREUR) {
        // Supprimer explicitement toutes les sections "Mon Espace" pour les non-coureurs
        delete effectivePerms.career;
        delete effectivePerms.nutrition;
        delete effectivePerms.riderEquipment;
        delete effectivePerms.adminDossier;
        delete effectivePerms.myTrips;
        delete effectivePerms.myPerformance;
        delete effectivePerms.performanceProject;
        delete effectivePerms.automatedPerformanceProfile;
        delete effectivePerms.myProfile;
        delete effectivePerms.myCalendar;
        delete effectivePerms.myResults;
        delete effectivePerms.bikeSetup;
        delete effectivePerms.myCareer;
    }
    
    // Logique spéciale pour les coureurs (UserRole.COUREUR) - PRIORITAIRE sur les autres rôles
    if (user.userRole === UserRole.COUREUR) {
        // Réinitialiser les permissions pour les coureurs
        Object.keys(effectivePerms).forEach(key => delete effectivePerms[key as AppSection]);
        
        // Sections de base accessibles à tous
        effectivePerms.events = ['view'];
        effectivePerms.myDashboard = ['view'];
        
        // Coureurs ont accès exclusif aux sections "Mon Espace"
        effectivePerms.career = ['view', 'edit'];
        effectivePerms.nutrition = ['view', 'edit'];
        effectivePerms.riderEquipment = ['view', 'edit'];
        effectivePerms.adminDossier = ['view', 'edit'];
        effectivePerms.myTrips = ['view', 'edit'];
        effectivePerms.myPerformance = ['view', 'edit'];
        effectivePerms.performanceProject = ['view', 'edit'];
        effectivePerms.automatedPerformanceProfile = ['view', 'edit'];
        
        // Nouvelles sections pour le back-office coureur
        effectivePerms.myProfile = ['view', 'edit'];
        effectivePerms.myCalendar = ['view', 'edit'];
        effectivePerms.myResults = ['view', 'edit'];
        effectivePerms.bikeSetup = ['view', 'edit'];
        effectivePerms.myCareer = ['view', 'edit'];
        
        // Coureurs n'ont PAS accès aux sections administratives et générales
        delete effectivePerms.financial;
        delete effectivePerms.staff;
        delete effectivePerms.userManagement;
        delete effectivePerms.permissions;
        delete effectivePerms.missionSearch; // Missions pas pour les coureurs
        delete effectivePerms.roster; // Pas d'accès à l'effectif (back-office coureurs)
        delete effectivePerms.vehicles; // Pas d'accès aux véhicules
        delete effectivePerms.equipment; // Pas d'accès au matériel
        delete effectivePerms.stocks; // Pas d'accès aux stocks
        delete effectivePerms.scouting; // Pas d'accès au scouting
        delete effectivePerms.performance; // Pas d'accès au Pôle Performance global
    }
    
    // Logique pour les Staff (UserRole.STAFF) - pas d'accès aux finances ni aux sections "Mon Espace"
    if (user.userRole === UserRole.STAFF) {
        delete effectivePerms.financial;
        
        // Staff n'a pas accès aux sections "Mon Espace" réservées aux coureurs
        delete effectivePerms.career;
        delete effectivePerms.nutrition;
        delete effectivePerms.riderEquipment;
        delete effectivePerms.adminDossier;
        delete effectivePerms.myTrips;
        delete effectivePerms.myPerformance;
        delete effectivePerms.performanceProject;
        delete effectivePerms.automatedPerformanceProfile;
        delete effectivePerms.myProfile;
        delete effectivePerms.myCalendar;
        delete effectivePerms.myResults;
        delete effectivePerms.bikeSetup;
        delete effectivePerms.myCareer;
    }
    
    // Logique spéciale pour les missions : uniquement DS, Entraîneur, Assistant et Mécano
    if (hasAccessToMissions(user, staff)) {
        effectivePerms.missionSearch = ['view'];
    } else {
        delete effectivePerms.missionSearch;
    }
    
    if (user.customPermissions) {
        for (const sectionKey in user.customPermissions) {
            const section = sectionKey as AppSection;
            effectivePerms[section] = user.customPermissions[section];
        }
    }
    
    // Final safety fallback: if still empty, grant minimal viewer access
    if (!effectivePerms || Object.keys(effectivePerms).length === 0) {
        return DEFAULT_ROLE_PERMISSIONS[TeamRole.VIEWER] || {};
    }
    
    return effectivePerms;
};

// --- TEAM DATA ---
export const getTeamData = async (teamId: string): Promise<Partial<TeamState>> => {
    const teamDocRef = doc(db, 'teams', teamId);
    
    const teamState: Partial<TeamState> = {};
    const teamDocSnap = await getDoc(teamDocRef);
    if(teamDocSnap.exists()) {
        const teamData = teamDocSnap.data();
        if (teamData) {
            Object.assign(teamState, {
                teamLevel: teamData.level,
                themePrimaryColor: teamData.themePrimaryColor,
                themeAccentColor: teamData.themeAccentColor,
                language: teamData.language,
                teamLogoUrl: teamData.teamLogoUrl,
                categoryBudgets: teamData.categoryBudgets,
                checklistTemplates: teamData.checklistTemplates,
            });
        }
    }

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
    
    return teamState;
};

// --- DATA MODIFICATION ---

/**
 * Met à jour les champs PPR et l'historique d'un coureur (sauvegarde directe)
 * Utilisé pour garantir que les modifications PPR et l'historique sont bien persistées
 */
export const updateRiderPowerProfiles = async (
  teamId: string,
  riderId: string,
  powerProfiles: {
    powerProfileFresh?: Record<string, number | undefined>;
    powerProfile15KJ?: Record<string, number | undefined>;
    powerProfile30KJ?: Record<string, number | undefined>;
    powerProfile45KJ?: Record<string, number | undefined>;
    profilePRR?: string;
    profile15KJ?: string;
    profile30KJ?: string;
    profile45KJ?: string;
    powerProfileHistory?: { entries: Array<Record<string, unknown>> };
  }
): Promise<void> => {
  const cleanedData = cleanDataForFirebase(powerProfiles);
  if (Object.keys(cleanedData).length === 0) return;
  const docRef = doc(db, 'teams', teamId, 'riders', riderId);
  // setDoc avec merge: true fonctionne pour documents existants ET nouveaux (updateDoc échoue si le doc n'existe pas)
  await setDoc(docRef, cleanedData, { merge: true });
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

export const saveTeamSettings = async (teamId: string, settings: Partial<Team>) => {
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
        // Réauthentifier l'utilisateur avec son mot de passe actuel
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Supprimer le document utilisateur de Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await deleteDoc(userDocRef);
        
        // Supprimer le compte Firebase Authentication
        await deleteUser(user);
        
        // Déconnecter l'utilisateur
        await signOut(auth);
        
        return { success: true, message: 'Compte supprimé avec succès' };
    } catch (error: any) {
        console.error('Erreur lors de la suppression du compte:', error);
        
        let errorMessage = 'Erreur lors de la suppression du compte';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Mot de passe incorrect';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Veuillez vous reconnecter avant de supprimer votre compte';
        }
        
        throw new Error(errorMessage);
    }
};

export const updateUserProfile = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const updateData = {
        ...updatedData,
        updatedAt: new Date().toISOString()
    };
    
    await updateDoc(userRef, updateData);
};
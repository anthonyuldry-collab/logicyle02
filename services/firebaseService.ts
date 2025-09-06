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
  updateDoc
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
        dashboard: ['view'],
        events: ['view'],
        
        // Note: Sections logistiques (véhicules, matériel, stocks) exclues des athlètes
        // Note: Section Scouting exclue des athlètes (TeamRole.VIEWER)
        // Note: Sections "Mon Espace" ajoutées dynamiquement pour les coureurs uniquement
    },
    [TeamRole.MEMBER]: {
        // Sections de base
        dashboard: ['view'],
        events: ['view'],
        
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
        dashboard: ['view'],
        events: ['view', 'edit'],
        
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
const cleanDataForFirebase = (data: any): any => {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    // Firestore handles Date objects automatically, so we should not convert them to empty objects.
    if (data instanceof Date) {
        return data;
    }

    // Only recurse into plain arrays. For objects, we check if they are plain objects.
    if (Array.isArray(data)) {
        // Firestore doesn't allow `undefined` in arrays, so we filter them out.
        return data.filter(item => item !== undefined).map(item => cleanDataForFirebase(item));
    }
    
    // This check for plain objects avoids recursing into class instances (like Firebase internals)
    // which may contain circular references or methods not suitable for Firestore.
    if (data.constructor !== Object) {
        return data;
    }

    const cleaned: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
        const value = data[key];
        if (value !== undefined) {
            const cleanedValue = cleanDataForFirebase(value);
            cleaned[key] = cleanedValue;
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

        const newUser: Omit<User, 'id'> = {
            email,
            firstName,
            lastName,
            permissionRole: TeamRole.VIEWER,
            userRole: userRole, // Utiliser le rôle sélectionné lors de l'inscription
            isSearchable: false,
            openToExternalMissions: false,
            signupInfo: {
                birthDate: birthDate, // Inclure la date de naissance
                sex: sex, // Inclure le genre si fourni
            },
        };
        
        const cleanedNewUser = cleanDataForFirebase(newUser);
        const userDocRef = doc(db, 'users', uid);
        
        await setDoc(userDocRef, cleanedNewUser);

    } catch (error) {
        console.warn("⚠️ FIRESTORE WRITE ERROR:", error);
        throw error;
    }
};

export const requestToJoinTeam = async (userId: string, teamId: string, userRole: UserRole) => {
    const membershipsColRef = collection(db, 'teamMemberships');
    await addDoc(membershipsColRef, {
        userId: userId,
        teamId: teamId,
        status: TeamMembershipStatus.PENDING,
        userRole: userRole,
    });
};

export const createTeamForUser = async (userId: string, teamData: { name: string; level: TeamLevel; country: string; }, userRole: UserRole) => {
    // Create the team
    const teamsColRef = collection(db, 'teams');
    const newTeamRef = await addDoc(teamsColRef, teamData);
    
    // Initialize team subcollections using a batch write
    const batch = writeBatch(db);
    for (const collName of TEAM_STATE_COLLECTIONS) {
        const subCollRef = doc(db, 'teams', newTeamRef.id, collName, '_init_');
        batch.set(subCollRef, { createdAt: new Date().toISOString() });
    }
    await batch.commit();

    // Make the creator an active admin
    const membershipsColRef = collection(db, 'teamMemberships');
    await addDoc(membershipsColRef, {
        userId: userId,
        teamId: newTeamRef.id,
        status: TeamMembershipStatus.ACTIVE,
        userRole: UserRole.MANAGER,
        startDate: new Date().toISOString().split('T')[0],
    });

    // Update user permission role AND teamId
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
        userDocRef,
        { 
            permissionRole: TeamRole.ADMIN, 
            userRole: UserRole.MANAGER,
            teamId: newTeamRef.id  // AJOUTER le teamId !
        },
        { merge: true }
    );
};

// --- GLOBAL DATA ---
export const getGlobalData = async (): Promise<Partial<GlobalState>> => {
    try {
        console.log('🔍 DEBUG: Tentative de connexion à Firestore...');
        const usersSnap = await getDocs(collection(db, 'users'));
        console.log('✅ DEBUG: Collection users récupérée');
        const teamsSnap = await getDocs(collection(db, 'teams'));
        console.log('✅ DEBUG: Collection teams récupérée');
        const membershipsSnap = await getDocs(collection(db, 'teamMemberships'));
        console.log('✅ DEBUG: Collection teamMemberships récupérée');
        const permissionsSnap = await getDocs(collection(db, 'permissions'));
        console.log('✅ DEBUG: Collection permissions récupérée');
        const permissionRolesSnap = await getDocs(collection(db, 'permissionRoles'));
        console.log('✅ DEBUG: Collection permissionRoles récupérée');
    
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
        console.error('❌ DEBUG: Erreur lors de la récupération des données globales:', error);
        console.error('❌ DEBUG: Type d\'erreur:', typeof error);
        console.error('❌ DEBUG: Message d\'erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
        console.error('❌ DEBUG: Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
        throw error;
    }
};

export const getEffectivePermissions = (user: User, basePermissions: AppPermissions, staff: StaffMember[] = []): Partial<Record<AppSection, PermissionLevel[]>> => {
    console.log('🔍 DEBUG - getEffectivePermissions appelé avec:', { 
        userId: user.id, 
        userRole: user.userRole, 
        permissionRole: user.permissionRole,
        teamId: user.teamId,
        email: user.email
    });
    console.log('🔍 DEBUG - UserRole.COUREUR:', UserRole.COUREUR, 'Comparaison:', user.userRole === UserRole.COUREUR);
    
    // SOLUTION DE CONTOURNEMENT : Forcer les permissions Manager pour tous les utilisateurs avec teamId
    // ou pour les utilisateurs qui ont créé une équipe
    
    // Vérifier si l'utilisateur est admin (via permissionRole) OU manager (via userRole)
    if (user.permissionRole === TeamRole.ADMIN || user.userRole === UserRole.MANAGER) {
        console.log('✅ DEBUG - Utilisateur identifié comme Admin/Manager');
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
    
    console.log('⚠️ DEBUG - Utilisateur NOT Admin/Manager, utilisation des permissions par défaut');

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
        console.log('🏃‍♂️ DEBUG - Utilisateur identifié comme COUREUR, ajout des permissions "Mon Espace"');
        
        // Réinitialiser les permissions pour les coureurs
        Object.keys(effectivePerms).forEach(key => delete effectivePerms[key as AppSection]);
        
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
        
        console.log('✅ DEBUG - Permissions "Mon Espace" ajoutées:', effectivePerms);
        
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
    
    return teamState;
};

// --- DATA MODIFICATION ---
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
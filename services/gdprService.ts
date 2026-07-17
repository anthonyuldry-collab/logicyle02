import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  writeBatch,
  addDoc,
  query,
  where,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { TEAM_STATE_COLLECTIONS } from '../constants';
import { User, Rider, StaffMember } from '../types';
import {
  deleteStorageFileFromUrl,
  purgeTeamStorage,
  purgeUserStorageInTeam,
} from './storageService';

const BATCH_SIZE = 400;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function deleteAllDocsInCollection(collRef: CollectionReference): Promise<void> {
  const snapshot = await getDocs(collRef);
  if (snapshot.empty) return;

  for (const docs of chunk(snapshot.docs, BATCH_SIZE)) {
    const batch = writeBatch(db);
    docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteDocsByField(
  collRef: CollectionReference,
  field: string,
  value: string
): Promise<void> {
  const snapshot = await getDocs(query(collRef, where(field, '==', value)));
  if (snapshot.empty) return;

  for (const docs of chunk(snapshot.docs, BATCH_SIZE)) {
    const batch = writeBatch(db);
    docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function safeDeleteDoc(ref: DocumentReference): Promise<void> {
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) await deleteDoc(ref);
  } catch {
    // Document may not exist or rules may block — continue cascade
  }
}

export async function collectUserTeamIds(userId: string): Promise<Set<string>> {
  const teamIds = new Set<string>();
  const membershipsSnap = await getDocs(
    query(collection(db, 'teamMemberships'), where('userId', '==', userId))
  );
  membershipsSnap.docs.forEach((d) => {
    const teamId = d.data().teamId as string | undefined;
    if (teamId) teamIds.add(teamId);
  });

  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const teamId = userDoc.data().teamId as string | undefined;
    if (teamId) teamIds.add(teamId);
  }

  return teamIds;
}

async function purgeUserDataInTeam(teamId: string, userId: string): Promise<void> {
  const teamRef = collection(db, 'teams', teamId);

  const riderRef = doc(db, 'teams', teamId, 'riders', userId);
  const staffRef = doc(db, 'teams', teamId, 'staff', userId);
  const riderSnap = await getDoc(riderRef);
  const staffSnap = await getDoc(staffRef);

  if (riderSnap.exists()) {
    const rider = riderSnap.data() as Rider;
    await deleteStorageFileFromUrl(rider.photoUrl);
    await deleteStorageFileFromUrl(rider.licenseImageUrl);
  }
  if (staffSnap.exists()) {
    const staff = staffSnap.data() as StaffMember;
    await deleteStorageFileFromUrl(staff.photoUrl);
  }

  await purgeUserStorageInTeam(teamId, userId);

  await safeDeleteDoc(riderRef);
  await safeDeleteDoc(staffRef);
  await safeDeleteDoc(doc(db, 'teams', teamId, 'scoutingProfiles', userId));

  await deleteDocsByField(collection(teamRef, 'riderEventSelections'), 'riderId', userId);
  await deleteDocsByField(collection(teamRef, 'peerRatings'), 'raterRiderId', userId);
  await deleteDocsByField(collection(teamRef, 'peerRatings'), 'ratedRiderId', userId);
  await deleteDocsByField(collection(teamRef, 'staffEventSelections'), 'staffId', userId);
}

export async function purgeUserPersonalData(userId: string, performedBy?: string): Promise<void> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const userData = userDoc.data() as User;
    await deleteStorageFileFromUrl(userData.photoUrl);
    await deleteStorageFileFromUrl(userData.licenseImageUrl);
  }

  const teamIds = await collectUserTeamIds(userId);

  const membershipsSnap = await getDocs(
    query(collection(db, 'teamMemberships'), where('userId', '==', userId))
  );
  for (const docs of chunk(membershipsSnap.docs, BATCH_SIZE)) {
    const batch = writeBatch(db);
    docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  for (const teamId of teamIds) {
    await purgeUserDataInTeam(teamId, userId);
  }

  await safeDeleteDoc(doc(db, 'users', userId));

  await writeGdprAuditLog({
    action: 'user_purge',
    targetId: userId,
    performedBy: performedBy ?? userId,
    method: 'client',
  });
}

export async function writeGdprAuditLog(entry: {
  action: 'user_purge' | 'team_purge' | 'user_export';
  targetId: string;
  performedBy: string;
  method: 'client' | 'cloud_function';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'gdprAuditLogs'), {
      ...entry,
      performedAt: new Date().toISOString(),
    });
  } catch {
    // Ne pas bloquer la suppression si le journal échoue
  }
}

export async function exportUserPersonalData(userId: string): Promise<Record<string, unknown>> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const membershipsSnap = await getDocs(
    query(collection(db, 'teamMemberships'), where('userId', '==', userId))
  );

  const teamIds = await collectUserTeamIds(userId);
  const teamProfiles: Record<string, unknown> = {};

  for (const teamId of teamIds) {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    const riderDoc = await getDoc(doc(db, 'teams', teamId, 'riders', userId));
    const staffDoc = await getDoc(doc(db, 'teams', teamId, 'staff', userId));
    const selectionsSnap = await getDocs(
      query(collection(db, 'teams', teamId, 'riderEventSelections'), where('riderId', '==', userId))
    );
    const peerGivenSnap = await getDocs(
      query(collection(db, 'teams', teamId, 'peerRatings'), where('raterRiderId', '==', userId))
    );
    const peerReceivedSnap = await getDocs(
      query(collection(db, 'teams', teamId, 'peerRatings'), where('ratedRiderId', '==', userId))
    );

    teamProfiles[teamId] = {
      team: teamDoc.exists() ? { id: teamId, ...teamDoc.data() } : null,
      riderProfile: riderDoc.exists() ? riderDoc.data() : null,
      staffProfile: staffDoc.exists() ? staffDoc.data() : null,
      eventSelections: selectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      peerRatingsGiven: peerGivenSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      peerRatingsReceived: peerReceivedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  const userData = userDoc.exists() ? userDoc.data() as User : null;
  const sanitizedUser = userData
    ? {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userRole: userData.userRole,
        permissionRole: userData.permissionRole,
        teamId: userData.teamId,
        signupInfo: userData.signupInfo,
        gdprConsent: userData.gdprConsent,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        phone: userData.phone,
        address: userData.address,
        photoUrl: userData.photoUrl,
      }
    : null;

  return {
    exportedAt: new Date().toISOString(),
    format: 'LogiCycle-RGPD-Export-v1',
    gdprArticle: 'Article 20 RGPD — Droit à la portabilité',
    user: sanitizedUser,
    memberships: membershipsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    teamProfiles,
  };
}

export function downloadJsonExport(data: Record<string, unknown>, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function deleteTeamAndAllData(teamId: string, performedBy?: string): Promise<void> {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (teamDoc.exists()) {
    const teamData = teamDoc.data() as { teamLogoUrl?: string };
    await deleteStorageFileFromUrl(
      typeof teamData.teamLogoUrl === 'string' ? teamData.teamLogoUrl : undefined
    );
  }

  await purgeTeamStorage(teamId);

  for (const collName of TEAM_STATE_COLLECTIONS) {
    await deleteAllDocsInCollection(collection(db, 'teams', teamId, collName));
  }
  await deleteAllDocsInCollection(collection(db, 'teams', teamId, 'checklistTemplates'));

  const membershipsSnap = await getDocs(
    query(collection(db, 'teamMemberships'), where('teamId', '==', teamId))
  );

  for (const m of membershipsSnap.docs) {
    const userId = m.data().userId as string | undefined;
    await deleteDoc(m.ref);
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          teamId: null,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // User doc may not exist
      }
    }
  }

  await safeDeleteDoc(doc(db, 'teams', teamId));

  await writeGdprAuditLog({
    action: 'team_purge',
    targetId: teamId,
    performedBy: performedBy ?? 'unknown',
    method: 'client',
  });
}

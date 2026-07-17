import { storage } from '../firebaseConfig';
import {
  ref,
  listAll,
  deleteObject,
} from 'firebase/storage';

function storagePathFromUrl(fileUrl: string): string | null {
  try {
    const match = fileUrl.match(/\/o\/([^?]+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function deleteStorageRef(storageRef: ReturnType<typeof ref>): Promise<void> {
  try {
    await deleteObject(storageRef);
  } catch {
    // Fichier déjà absent ou accès refusé
  }
}

/** Supprime récursivement un dossier Storage (préfixe). */
export async function deleteStorageFolder(folderPath: string): Promise<void> {
  const folderRef = ref(storage, folderPath);
  let result;
  try {
    result = await listAll(folderRef);
  } catch {
    return;
  }

  await Promise.all(result.items.map((itemRef) => deleteStorageRef(itemRef)));
  await Promise.all(
    result.prefixes.map((subFolderRef) => deleteStorageFolder(subFolderRef.fullPath))
  );
}

/** Supprime un fichier à partir de son URL Firebase Storage. */
export async function deleteStorageFileFromUrl(fileUrl: string | undefined): Promise<void> {
  if (!fileUrl || !fileUrl.includes('firebasestorage.googleapis.com')) return;
  const path = storagePathFromUrl(fileUrl);
  if (!path) return;
  await deleteStorageRef(ref(storage, path));
}

/** Supprime les fichiers Storage d'un membre dans une équipe. */
export async function purgeUserStorageInTeam(teamId: string, userId: string): Promise<void> {
  await deleteStorageFolder(`teams/${teamId}/riders/${userId}`);
  await deleteStorageFolder(`teams/${teamId}/staff/${userId}`);
  await deleteStorageFolder(`users/${userId}`);
}

/** Supprime tous les fichiers Storage d'une équipe. */
export async function purgeTeamStorage(teamId: string): Promise<void> {
  await deleteStorageFolder(`teams/${teamId}`);
}

/** Supprime les fichiers Storage référencés dans un profil (URLs). */
export async function purgeStorageUrls(urls: (string | undefined)[]): Promise<void> {
  await Promise.all(urls.filter(Boolean).map((url) => deleteStorageFileFromUrl(url)));
}

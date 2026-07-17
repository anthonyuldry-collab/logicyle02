import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';
import {
  purgeUserPersonalData as clientPurgeUser,
  deleteTeamAndAllData as clientDeleteTeam,
} from './gdprService';

async function callCloudFunction<T>(name: string, data: Record<string, unknown>): Promise<T | null> {
  try {
    const functions = getFunctions(app);
    const callable = httpsCallable<Record<string, unknown>, T>(functions, name);
    const result = await callable(data);
    return result.data;
  } catch (error) {
    console.warn(`Cloud Function ${name} indisponible, repli client:`, error);
    return null;
  }
}

/** Suppression utilisateur : Cloud Function en priorité, repli client. */
export async function purgeUserPersonalDataSecure(
  userId: string,
  performedBy: string
): Promise<void> {
  const cloudResult = await callCloudFunction<{ success: boolean }>('gdprPurgeUser', {
    userId,
    performedBy,
  });

  if (cloudResult?.success) {
    return;
  }

  await clientPurgeUser(userId, performedBy);
}

/** Suppression équipe : Cloud Function en priorité, repli client. */
export async function deleteTeamAndAllDataSecure(
  teamId: string,
  performedBy: string
): Promise<void> {
  const cloudResult = await callCloudFunction<{ success: boolean }>('gdprPurgeTeam', {
    teamId,
    performedBy,
  });

  if (cloudResult?.success) {
    return;
  }

  await clientDeleteTeam(teamId, performedBy);
}

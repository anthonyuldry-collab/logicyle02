import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SignupMode, User, UserRole } from '../types';

export async function activateIndependentProfile(
  userId: string,
  userRole: UserRole
): Promise<void> {
  const now = new Date().toISOString();
  const userRef = doc(db, 'users', userId);

  await updateDoc(userRef, {
    signupMode: SignupMode.INDEPENDENT,
    isIndependentProfile: true,
    independentActivatedAt: now,
    isSearchable: userRole === UserRole.COUREUR,
    openToExternalMissions: userRole === UserRole.STAFF,
    teamId: null,
    updatedAt: now,
  });
}

export async function saveIndependentProfile(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

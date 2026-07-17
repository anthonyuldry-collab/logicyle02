import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SignupMode, User, UserRole } from '../types';
import { buildInitialIndependentSubscription } from './billingService';

/** Firestore refuse les `undefined` — on les retire avant updateDoc. */
function stripUndefined<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      cleaned[key] = stripUndefined(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter((item) => item !== undefined)
        .map((item) =>
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? stripUndefined(item as Record<string, unknown>)
            : item,
        );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function activateIndependentProfile(
  userId: string,
  userRole: UserRole
): Promise<void> {
  const now = new Date().toISOString();
  const userRef = doc(db, 'users', userId);
  const subscription = buildInitialIndependentSubscription(userRole);

  await updateDoc(
    userRef,
    stripUndefined({
      signupMode: SignupMode.INDEPENDENT,
      isIndependentProfile: true,
      independentActivatedAt: now,
      isSearchable: false,
      openToExternalMissions: false,
      teamId: null,
      subscription,
      updatedAt: now,
    }),
  );
}

export async function saveIndependentProfile(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(
    userRef,
    stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    }),
  );
}

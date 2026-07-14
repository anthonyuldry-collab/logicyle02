import { auth } from '../firebaseConfig';
import { sendSignInLinkToEmail } from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TeamMembershipStatus, UserRole } from '../types';
import { approveTeamMembership } from './firebaseService';

const EMAIL_FOR_SIGN_IN_KEY = 'logicyleEmailForSignIn';
const PENDING_INVITE_KEY = 'logicylePendingInvite';

export interface InviteResult {
  membershipId: string;
  emailSent: boolean;
  message: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getInviteContinueUrl(membershipId: string, teamId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?invite=${membershipId}&team=${teamId}`;
}

/** Envoie une invitation par lien magique Firebase Auth. */
export async function sendTeamInvitation(params: {
  email: string;
  teamId: string;
  teamName: string;
  userRole: UserRole;
  invitedBy: string;
  existingUserId?: string;
}): Promise<InviteResult> {
  const normalizedEmail = normalizeEmail(params.email);

  const existingInvites = await getDocs(
    query(collection(db, 'teamMemberships'), where('email', '==', normalizedEmail))
  );
  const duplicate = existingInvites.docs.find(
    (d) =>
      d.data().teamId === params.teamId &&
      d.data().status === TeamMembershipStatus.PENDING
  );
  if (duplicate) {
    throw new Error('Une invitation est déjà en attente pour cet email sur cette équipe.');
  }

  const membershipRef = await addDoc(collection(db, 'teamMemberships'), {
    email: normalizedEmail,
    teamId: params.teamId,
    teamName: params.teamName,
    status: TeamMembershipStatus.PENDING,
    userRole: params.userRole,
    requestedUserRole: params.userRole,
    userId: params.existingUserId ?? null,
    invitedBy: params.invitedBy,
    invitedAt: new Date().toISOString(),
    source: 'email_invite',
  });

  let emailSent = false;
  try {
    const actionCodeSettings = {
      url: getInviteContinueUrl(membershipRef.id, params.teamId),
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);
    window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, normalizedEmail);
    window.localStorage.setItem(PENDING_INVITE_KEY, membershipRef.id);
    emailSent = true;
  } catch (error) {
    console.warn('Envoi email invitation:', error);
  }

  return {
    membershipId: membershipRef.id,
    emailSent,
    message: emailSent
      ? `Invitation envoyée à ${normalizedEmail}. Un lien de connexion a été expédié.`
      : `Invitation enregistrée pour ${normalizedEmail}. L'email n'a pas pu être envoyé — partagez le lien d'inscription manuellement.`,
  };
}

/** Lie les invitations en attente à un compte après inscription/connexion. */
export async function processPendingInvitesOnLogin(
  userId: string,
  email: string
): Promise<number> {
  const normalizedEmail = normalizeEmail(email);
  const invitesSnap = await getDocs(
    query(collection(db, 'teamMemberships'), where('email', '==', normalizedEmail))
  );

  let activated = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const data = inviteDoc.data();
    if (data.status !== TeamMembershipStatus.PENDING) continue;

    if (!data.userId) {
      await updateDoc(inviteDoc.ref, { userId });
    }

    if (data.source === 'email_invite') {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;

      await approveTeamMembership(
        {
          membershipId: inviteDoc.id,
          userId,
          teamId: data.teamId as string,
          userRole: (data.userRole || data.requestedUserRole || UserRole.COUREUR) as UserRole,
          email: normalizedEmail,
          firstName: userData?.firstName as string | undefined,
          lastName: userData?.lastName as string | undefined,
        },
        (data.invitedBy as string) || userId,
        userData ? { id: userId, ...userData } as import('../types').User : null
      );
      activated++;
    }
  }

  window.localStorage.removeItem(PENDING_INVITE_KEY);
  return activated;
}

export function storeEmailForSignIn(email: string): void {
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, normalizeEmail(email));
}

export function getStoredEmailForSignIn(): string | null {
  return window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
}

export function clearStoredEmailForSignIn(): void {
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
}

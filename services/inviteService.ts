import { auth } from '../firebaseConfig';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TeamMembershipStatus, UserRole } from '../types';

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
  staffRole?: string;
}): Promise<InviteResult> {
  const normalizedEmail = normalizeEmail(params.email);

  const existingInvites = await getDocs(
    query(collection(db, 'teamMemberships'), where('email', '==', normalizedEmail))
  );
  const duplicate = existingInvites.docs.find((d) => {
    const data = d.data();
    return (
      data.teamId === params.teamId &&
      (data.status === TeamMembershipStatus.PENDING ||
        data.status === TeamMembershipStatus.ACTIVE)
    );
  });
  if (duplicate) {
    const status = duplicate.data().status;
    if (status === TeamMembershipStatus.ACTIVE) {
      throw new Error('Cet email est déjà membre actif de cette équipe.');
    }
    throw new Error('Une invitation est déjà en attente pour cet email sur cette équipe.');
  }

  if (params.userRole === UserRole.STAFF && !params.staffRole) {
    throw new Error('Veuillez préciser la fonction du staff invité (DS, mécano, kiné…).');
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
    ...(params.userRole === UserRole.STAFF && params.staffRole
      ? { staffRole: params.staffRole }
      : {}),
  });

  let emailSent = false;
  try {
    const actionCodeSettings = {
      url: getInviteContinueUrl(membershipRef.id, params.teamId),
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);
    // Stocké pour le destinataire s’il ouvre le lien sur le même navigateur ;
    // le handler magic link redemandera l’email sinon.
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
      ? `Invitation envoyée à ${normalizedEmail}. Un lien de connexion a été expédié. L’accès sera actif après validation manager si besoin.`
      : `Invitation enregistrée pour ${normalizedEmail}. L'email n'a pas pu être envoyé — partagez le lien d'inscription manuellement.`,
  };
}

/**
 * Lie les invitations en attente à un compte après inscription/connexion.
 * N’auto-approuve plus : le statut reste PENDING jusqu’à validation manager
 * (évite l’auto-join via memberships forgés).
 */
export async function processPendingInvitesOnLogin(
  userId: string,
  email: string
): Promise<number> {
  const normalizedEmail = normalizeEmail(email);
  const invitesSnap = await getDocs(
    query(collection(db, 'teamMemberships'), where('email', '==', normalizedEmail))
  );

  let linked = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const data = inviteDoc.data();
    if (data.status !== TeamMembershipStatus.PENDING) continue;

    if (!data.userId || data.userId !== userId) {
      await updateDoc(inviteDoc.ref, { userId });
      linked++;
    }
  }

  window.localStorage.removeItem(PENDING_INVITE_KEY);
  return linked;
}

/** Finalise une connexion par lien magique si l’URL courante en est un. */
export async function completeMagicLinkSignInIfPresent(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return false;

  let email = getStoredEmailForSignIn();
  if (!email) {
    email = window.prompt('Confirmez votre email pour finaliser la connexion') || '';
  }
  if (!email) {
    throw new Error('Email requis pour finaliser le lien magique.');
  }

  await signInWithEmailLink(auth, normalizeEmail(email), href);
  clearStoredEmailForSignIn();

  const url = new URL(href);
  url.searchParams.delete('apiKey');
  url.searchParams.delete('oobCode');
  url.searchParams.delete('mode');
  url.searchParams.delete('lang');
  window.history.replaceState({}, document.title, url.pathname + url.search);
  return true;
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

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  increment,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { REFERRAL_PROGRAM, formatReferralCode } from '../constants/referralProgram';
import { User } from '../types';

const REFERRAL_STORAGE_KEY = 'logicyle_pending_referral';
const REFERRAL_URL_PARAM = 'ref';

export interface ReferralValidation {
  valid: boolean;
  referrerUserId?: string;
  referrerName?: string;
  code?: string;
}

export interface ReferralStats {
  code: string;
  totalReferrals: number;
  convertedReferrals: number;
  pendingCredits: number;
  shareUrl: string;
}

function hashToCode(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const base = Math.abs(h).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `${REFERRAL_PROGRAM.codePrefix}-${base}`;
}

export function buildReferralShareUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://logicyle.app';
  return `${origin}/?${REFERRAL_URL_PARAM}=${encodeURIComponent(code)}`;
}

export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  const ref = new URLSearchParams(window.location.search).get(REFERRAL_URL_PARAM);
  if (ref?.trim()) {
    localStorage.setItem(REFERRAL_STORAGE_KEY, formatReferralCode(ref.trim()));
  }
}

export function getPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

export function clearPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

export async function getOrCreateReferralCode(user: User): Promise<string> {
  if (user.referralCode) return user.referralCode;

  const code = hashToCode(user.id);
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, { referralCode: code, updatedAt: new Date().toISOString() }, { merge: true });
  return code;
}

export async function validateReferralCode(code: string): Promise<ReferralValidation> {
  const normalized = formatReferralCode(code);
  if (!normalized || normalized.length < 5) {
    return { valid: false };
  }

  const q = query(collection(db, 'users'), where('referralCode', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) {
    return { valid: false };
  }

  const referrer = snap.docs[0];
  const data = referrer.data();
  return {
    valid: true,
    referrerUserId: referrer.id,
    referrerName: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email,
    code: normalized,
  };
}

export async function getReferralStats(user: User): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(user);
  const userSnap = await getDoc(doc(db, 'users', user.id));
  const data = userSnap.data() || {};

  return {
    code,
    totalReferrals: data.referralTotalCount ?? 0,
    convertedReferrals: data.referralConvertedCount ?? 0,
    pendingCredits: data.referralPendingCredits ?? 0,
    shareUrl: buildReferralShareUrl(code),
  };
}

export async function attachReferralToTeam(teamId: string, referralCode: string): Promise<ReferralValidation> {
  const validation = await validateReferralCode(referralCode);
  if (!validation.valid || !validation.referrerUserId) {
    return validation;
  }

  await setDoc(
    doc(db, 'teams', teamId),
    {
      subscription: {
        pendingReferralCode: validation.code,
        referredByUserId: validation.referrerUserId,
      },
    },
    { merge: true }
  );

  return validation;
}

export async function incrementReferrerOnConversion(referrerUserId: string): Promise<void> {
  const userRef = doc(db, 'users', referrerUserId);
  const userSnap = await getDoc(userRef);
  const data = userSnap.data() || {};
  const currentCredits = data.referralPendingCredits ?? 0;
  const newCredits = Math.min(
    currentCredits + REFERRAL_PROGRAM.referrerCreditMonthsPerReferral,
    REFERRAL_PROGRAM.maxStackedReferrerCredits
  );

  await updateDoc(userRef, {
    referralTotalCount: increment(1),
    referralConvertedCount: increment(1),
    referralPendingCredits: newCredits,
    updatedAt: new Date().toISOString(),
  });
}

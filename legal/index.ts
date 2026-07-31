import type { LegalDocId, LegalDocument, LegalLocale } from './types';
import { CGU_DOCUMENT } from './cgu';
import { CGV_DOCUMENT } from './cgv';
import { PRIVACY_DOCUMENT } from './privacy';
import { DPA_DOCUMENT } from './dpa';
import { MENTIONS_DOCUMENT } from './mentions';
import { COOKIES_DOCUMENT } from './cookies';
import { LEGAL_DISCLAIMER, LEGAL_PACK_VERSION, LEGAL_EFFECTIVE_DATE } from './meta';

export * from './types';
export * from './meta';
export { CGU_DOCUMENT, CGV_DOCUMENT, PRIVACY_DOCUMENT, DPA_DOCUMENT, MENTIONS_DOCUMENT, COOKIES_DOCUMENT };

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  CGU_DOCUMENT,
  CGV_DOCUMENT,
  PRIVACY_DOCUMENT,
  DPA_DOCUMENT,
  MENTIONS_DOCUMENT,
  COOKIES_DOCUMENT,
];

export const LEGAL_DOC_BY_ID: Record<LegalDocId, LegalDocument> = {
  cgu: CGU_DOCUMENT,
  cgv: CGV_DOCUMENT,
  privacy: PRIVACY_DOCUMENT,
  dpa: DPA_DOCUMENT,
  mentions: MENTIONS_DOCUMENT,
  cookies: COOKIES_DOCUMENT,
};

export const LEGAL_DOC_ORDER: LegalDocId[] = [
  'cgu',
  'cgv',
  'privacy',
  'dpa',
  'mentions',
  'cookies',
];

export function isLegalDocId(value: string | null | undefined): value is LegalDocId {
  return !!value && value in LEGAL_DOC_BY_ID;
}

export function getLegalDocument(id: LegalDocId): LegalDocument {
  return LEGAL_DOC_BY_ID[id];
}

export function pickLegalLocale(language: string | undefined): LegalLocale {
  return language === 'en' ? 'en' : 'fr';
}

/** Hash public : `#/legal/cgu` */
export function legalHashFor(id: LegalDocId): string {
  return `#/legal/${id}`;
}

export function parseLegalHash(hash: string): LegalDocId | null {
  const match = hash.match(/^#\/?legal\/([a-z]+)/i);
  if (!match) return null;
  return isLegalDocId(match[1].toLowerCase()) ? (match[1].toLowerCase() as LegalDocId) : null;
}

export { LEGAL_DISCLAIMER, LEGAL_PACK_VERSION, LEGAL_EFFECTIVE_DATE };

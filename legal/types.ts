export type LegalLocale = 'fr' | 'en';

export type LegalDocId = 'cgu' | 'cgv' | 'privacy' | 'dpa' | 'mentions' | 'cookies';

export interface LegalSection {
  id: string;
  title: Record<LegalLocale, string>;
  /** Paragraphs or bullet blocks (markdown-lite: plain text; lines starting with • are bullets). */
  blocks: Record<LegalLocale, string[]>;
}

export interface LegalDocument {
  id: LegalDocId;
  version: string;
  effectiveDate: string;
  title: Record<LegalLocale, string>;
  shortTitle: Record<LegalLocale, string>;
  summary: Record<LegalLocale, string>;
  sections: LegalSection[];
}

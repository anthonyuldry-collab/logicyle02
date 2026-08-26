/**
 * Identité commerciale rovik.
 * Les IDs techniques (Firebase, e-mails @logicycle.app, clés env) restent stables
 * tant que le domaine et le projet cloud n’ont pas été migrés.
 */

export const BRAND_NAME = 'rovik';
export const BRAND_NAME_LEGAL = 'Rovik';
export const BRAND_TAGLINE = 'Cycling Performance Systems';
export const BRAND_TAGLINE_SHORT = {
  fr: 'Systèmes de performance cycliste',
  en: 'Cycling Performance Systems',
} as const;

export const BRAND_COLORS = {
  background: '#0B0D10',
  carbon: '#121417',
  text: '#FFFFFF',
  muted: '#A8B4C0',
  blue: '#1E4ED8',
  cyan: '#22D3EE',
} as const;

export const BRAND_LOCKUP_SRC = '/icons/rovik-lockup.png';
export const BRAND_MARK_SRC = '/icons/icon.svg';

export const BRAND_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const BRAND_PWA_NAME = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const BRAND_PWA_SHORT = BRAND_NAME;

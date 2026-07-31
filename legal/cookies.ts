import type { LegalDocument } from './types';
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, LEGAL_PACK_VERSION } from './meta';

export const COOKIES_DOCUMENT: LegalDocument = {
  id: 'cookies',
  version: LEGAL_PACK_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  title: {
    fr: 'Politique cookies',
    en: 'Cookie Policy',
  },
  shortTitle: { fr: 'Cookies', en: 'Cookies' },
  summary: {
    fr: 'Cookies et traceurs utilisés sur LogiCycle — essentiels vs optionnels.',
    en: 'Cookies and similar technologies on LogiCycle — essential vs optional.',
  },
  sections: [
    {
      id: 'what',
      title: { fr: '1. Qu’est-ce qu’un cookie ?', en: '1. What is a cookie?' },
      blocks: {
        fr: [
          'Un cookie est un petit fichier déposé sur votre terminal lors de la visite d’un site ou de l’usage d’une application. Des technologies similaires (localStorage, pixels) peuvent être utilisées.',
        ],
        en: [
          'A cookie is a small file stored on your device when you visit a site or use an app. Similar technologies (localStorage, pixels) may be used.',
        ],
      },
    },
    {
      id: 'essential',
      title: { fr: '2. Cookies strictement nécessaires', en: '2. Strictly necessary cookies' },
      blocks: {
        fr: [
          'Ils permettent l’authentification, la sécurité, le maintien de session, le choix de langue (ex. logicycle_lang) et le fonctionnement du paiement Stripe. Ils ne requièrent pas de consentement au sens de la réglementation cookies française / ePrivacy.',
        ],
        en: [
          'They enable authentication, security, session continuity, language preference (e.g. logicycle_lang) and Stripe payment flows. They do not require consent under French cookie / ePrivacy rules.',
        ],
      },
    },
    {
      id: 'optional',
      title: { fr: '3. Cookies optionnels', en: '3. Optional cookies' },
      blocks: {
        fr: [
          'Mesure d’audience, marketing ou cookies tiers non essentiels : uniquement après consentement, s’ils sont activés. À ce jour, LogiCycle n’active aucun cookie publicitaire ni outil d’audience.',
          'Observabilité technique (Sentry, erreurs application) : activée uniquement si configurée côté serveur/build, sans finalité marketing ; elle ne remplace pas un bandeau de consentement analytics.',
          'Un avis de transparence « cookies essentiels » peut s’afficher à la première visite. Tout ajout de cookies non essentiels sera reflété ici et via un bandeau de consentement dédié.',
        ],
        en: [
          'Analytics, marketing or non-essential third-party cookies: only after consent, if enabled. LogiCycle currently runs no advertising or audience cookies.',
          'Technical observability (Sentry, application errors): only if configured at build/server level, not for marketing; it does not replace an analytics consent banner.',
          'A transparency notice about essential cookies may appear on first visit. Any non-essential cookies will be reflected here and via a dedicated consent banner.',
        ],
      },
    },
    {
      id: 'manage',
      title: { fr: '4. Gérer vos choix', en: '4. Managing your choices' },
      blocks: {
        fr: [
          'Vous pouvez supprimer ou bloquer les cookies via les paramètres de votre navigateur. Le blocage des cookies nécessaires peut empêcher la connexion.',
          'Questions : ' + LEGAL_ENTITY.privacyEmail + ' · Politique de confidentialité : /legal/privacy · Version ' + LEGAL_PACK_VERSION + ' (' + LEGAL_EFFECTIVE_DATE + ').',
        ],
        en: [
          'You can delete or block cookies in your browser settings. Blocking necessary cookies may prevent sign-in.',
          'Questions: ' + LEGAL_ENTITY.privacyEmail + ' · Privacy Policy: /legal/privacy · Version ' + LEGAL_PACK_VERSION + ' (' + LEGAL_EFFECTIVE_DATE + ').',
        ],
      },
    },
  ],
};

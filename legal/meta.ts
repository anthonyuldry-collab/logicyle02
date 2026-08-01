/**
 * Identité éditeur & versions légales.
 * Remplacer les crochets [À COMPLÉTER] dès le K-bis (voir juridique/04-decisions-a-trancher.md).
 * Tant que ces champs restent des placeholders, les Mentions légales affichent clairement
 * « en cours de constitution » — ne pas publier commercialement sans les remplir.
 */
export const LEGAL_PACK_VERSION = '2026-08.1' as const;

export const LEGAL_EFFECTIVE_DATE = '2026-08-01' as const;

export const LEGAL_ENTITY = {
  tradeName: 'LogiCycle',
  legalFormPlaceholder: {
    fr: 'SASU LogiCycle (en cours de constitution — à mettre à jour post K-bis)',
    en: 'LogiCycle SASU (in formation — update after company registration)',
  },
  /**
   * Identifiants éditeur — BLOQUANTS go-live commercial.
   * Remplir uniquement avec des valeurs officielles (pas d’invention).
   */
  siren: '[SIREN À COMPLÉTER — obligatoire post immatriculation]',
  siret: '[SIRET À COMPLÉTER — obligatoire post immatriculation]',
  vatNumber: '[N° TVA À COMPLÉTER — si assujetti]',
  registeredOffice: '[Adresse du siège social À COMPLÉTER]',
  publicationDirector: 'Anthony Uldry',
  country: { fr: 'France', en: 'France' },
  privacyEmail: 'privacy@logicycle.app',
  contactEmail: 'contact@logicycle.app',
  supportEmail: 'support@logicycle.app',
  dpoEmail: 'privacy@logicycle.app',
  website: 'https://logicycle.app',
  governingLaw: {
    fr: 'droit français',
    en: 'French law',
  },
  courts: {
    fr: 'tribunaux compétents du ressort du siège social de LogiCycle',
    en: 'courts with jurisdiction over LogiCycle’s registered office',
  },
  host: {
    name: 'Google Cloud / Firebase',
    operator: 'Google Ireland Limited / Google LLC',
    note: {
      fr: 'Hébergement cloud (Firebase / Google Cloud). Transferts hors UE encadrés par les clauses contractuelles types de la Commission européenne et/ou le Data Privacy Framework le cas échéant.',
      en: 'Cloud hosting (Firebase / Google Cloud). Transfers outside the EU are covered by the European Commission’s Standard Contractual Clauses and/or the Data Privacy Framework where applicable.',
    },
  },
  paymentProcessor: {
    name: 'Stripe',
    entity: 'Stripe Payments Europe, Limited / Stripe, Inc.',
  },
} as const;

/** True tant que l’identité éditeur n’est pas renseignée (K-bis). */
export function isLegalEntityIncomplete(): boolean {
  return (
    LEGAL_ENTITY.siren.includes('À COMPLÉTER') ||
    LEGAL_ENTITY.registeredOffice.includes('À COMPLÉTER') ||
    LEGAL_ENTITY.publicationDirector.includes('À COMPLÉTER')
  );
}

/** Disclaimer produit — pas un avis d’avocat. */
export const LEGAL_DISCLAIMER: Record<'fr' | 'en', string> = {
  fr: 'Documents modèles destinés à la commercialisation SaaS LogiCycle. Ils ne constituent pas un avis juridique. Faites-les relire par un avocat (droit des affaires / RGPD) avant publication définitive et signature client.',
  en: 'Template documents for LogiCycle SaaS go-to-market. They are not legal advice. Have counsel (commercial / GDPR) review them before final publication and customer signature.',
};

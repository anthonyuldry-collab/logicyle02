import type { LegalDocument } from './types';
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, LEGAL_PACK_VERSION } from './meta';

export const MENTIONS_DOCUMENT: LegalDocument = {
  id: 'mentions',
  version: LEGAL_PACK_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  title: {
    fr: 'Mentions légales',
    en: 'Legal notice',
  },
  shortTitle: { fr: 'Mentions', en: 'Legal notice' },
  summary: {
    fr: 'Éditeur, hébergeur, contact et propriété intellectuelle — obligations LCEN.',
    en: 'Publisher, host, contact and IP — French LCEN-style disclosures.',
  },
  sections: [
    {
      id: 'publisher',
      title: { fr: '1. Éditeur du site / de la plateforme', en: '1. Publisher' },
      blocks: {
        fr: [
          'Nom commercial : ' + LEGAL_ENTITY.tradeName,
          'Raison sociale : ' + LEGAL_ENTITY.legalFormPlaceholder.fr,
          'Siège social : ' + LEGAL_ENTITY.registeredOffice,
          'SIREN : ' + LEGAL_ENTITY.siren,
          'SIRET : ' + LEGAL_ENTITY.siret,
          'N° TVA intracommunautaire : ' + LEGAL_ENTITY.vatNumber,
          'Directeur de la publication : ' + LEGAL_ENTITY.publicationDirector,
          'Contact : ' + LEGAL_ENTITY.contactEmail,
          'Privacy / DPO : ' + LEGAL_ENTITY.dpoEmail,
          'Support : ' + LEGAL_ENTITY.supportEmail,
        ],
        en: [
          'Trade name: ' + LEGAL_ENTITY.tradeName,
          'Legal entity: ' + LEGAL_ENTITY.legalFormPlaceholder.en,
          'Registered office: ' + LEGAL_ENTITY.registeredOffice,
          'SIREN: ' + LEGAL_ENTITY.siren,
          'SIRET: ' + LEGAL_ENTITY.siret,
          'EU VAT number: ' + LEGAL_ENTITY.vatNumber,
          'Publication director: ' + LEGAL_ENTITY.publicationDirector,
          'Contact: ' + LEGAL_ENTITY.contactEmail,
          'Privacy / DPO: ' + LEGAL_ENTITY.dpoEmail,
          'Support: ' + LEGAL_ENTITY.supportEmail,
        ],
      },
    },
    {
      id: 'host',
      title: { fr: '2. Hébergement', en: '2. Hosting' },
      blocks: {
        fr: [
          'Hébergeur technique : ' + LEGAL_ENTITY.host.name + ' — ' + LEGAL_ENTITY.host.operator + '.',
          LEGAL_ENTITY.host.note.fr,
          'Pour toute question relative à l’hébergement : ' + LEGAL_ENTITY.contactEmail + '.',
        ],
        en: [
          'Technical host: ' + LEGAL_ENTITY.host.name + ' — ' + LEGAL_ENTITY.host.operator + '.',
          LEGAL_ENTITY.host.note.en,
          'Hosting questions: ' + LEGAL_ENTITY.contactEmail + '.',
        ],
      },
    },
    {
      id: 'ip',
      title: { fr: '3. Propriété intellectuelle', en: '3. Intellectual property' },
      blocks: {
        fr: [
          '© ' +
            new Date().getFullYear() +
            ' Rovik — tous droits réservés. Marques, logos, textes, interfaces et logiciels sont protégés. Toute reproduction non autorisée est interdite.',
        ],
        en: [
          '© ' +
            new Date().getFullYear() +
            ' Rovik — all rights reserved. Trademarks, logos, texts, interfaces and software are protected. Unauthorised reproduction is prohibited.',
        ],
      },
    },
    {
      id: 'docs',
      title: { fr: '4. Documents contractuels', en: '4. Contract documents' },
      blocks: {
        fr: [
          'CGU · CGV · Politique de confidentialité · DPA · Cookies — accessibles sous /legal/* (version ' +
            LEGAL_PACK_VERSION +
            ', ' +
            LEGAL_EFFECTIVE_DATE +
            ').',
        ],
        en: [
          'ToU · ToS · Privacy Policy · DPA · Cookies — available under /legal/* (version ' +
            LEGAL_PACK_VERSION +
            ', ' +
            LEGAL_EFFECTIVE_DATE +
            ').',
        ],
      },
    },
  ],
};

import type { LegalDocument } from './types';
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, LEGAL_PACK_VERSION } from './meta';

/**
 * DPA art. 28 RGPD — à annexer / signer pour Clients (surtout Continental+ / WT / Enterprise).
 * Placeholders société à compléter post K-bis.
 */
export const DPA_DOCUMENT: LegalDocument = {
  id: 'dpa',
  version: LEGAL_PACK_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  title: {
    fr: 'Accord de sous-traitance des données (DPA) — art. 28 RGPD',
    en: 'Data Processing Agreement (DPA) — GDPR Art. 28',
  },
  shortTitle: { fr: 'DPA', en: 'DPA' },
  summary: {
    fr: 'Cadre contractuel lorsque Rovik traite des données personnelles pour le compte du Client Équipe.',
    en: 'Contractual framework when Rovik processes personal data on behalf of the Customer Team.',
  },
  sections: [
    {
      id: 'parties',
      title: { fr: '1. Parties et objet', en: '1. Parties and purpose' },
      blocks: {
        fr: [
          'Le présent Accord de sous-traitance (« DPA ») est conclu entre le Client (responsable de traitement) et Rovik (sous-traitant) pour les traitements réalisés via la Plateforme sur instruction du Client.',
          'Il s’applique automatiquement aux Clients abonnés dès acceptation des CGU/CGV référençant ce DPA, et peut être signé séparément (Enterprise).',
          'Éditeur / sous-traitant : ' +
            LEGAL_ENTITY.legalFormPlaceholder.fr +
            ' · ' +
            LEGAL_ENTITY.registeredOffice +
            ' · ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
        en: [
          'This Data Processing Agreement (“DPA”) is between the Customer (controller) and Rovik (processor) for processing via the Platform on the Customer’s instructions.',
          'It applies automatically to subscribed Customers upon acceptance of ToU/ToS referencing this DPA, and may be signed separately (Enterprise).',
          'Publisher / processor: ' +
            LEGAL_ENTITY.legalFormPlaceholder.en +
            ' · ' +
            LEGAL_ENTITY.registeredOffice +
            ' · ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
      },
    },
    {
      id: 'scope',
      title: { fr: '2. Description du traitement (annexe A)', en: '2. Processing description (Annex A)' },
      blocks: {
        fr: [
          'Objet : hébergement et fourniture des modules Rovik (gestion d’équipe, performance, logistique, finances, partenariats, scouting, marketplace liée à l’équipe).',
          'Durée : durée du contrat SaaS + période de purge (indicative 30 jours) sauf conservation légale.',
          'Nature / finalité : stockage, affichage, sauvegarde, export, support, sécurité, pour permettre au Client d’utiliser la Plateforme.',
          'Types de données : identité sportive et administrative des membres ; performances ; logistique/GPS ; documents ; données financières d’équipe ; le cas échéant allergies/santé et données de mineurs saisies par le Client ; logs techniques.',
          'Catégories de personnes : coureurs, staff, dirigeants, partenaires invités, vacataires liés aux missions de l’Équipe, prospects scouting gérés par l’Équipe.',
        ],
        en: [
          'Subject matter: hosting and provision of Rovik modules (team management, performance, logistics, finance, partnerships, scouting, team-related marketplace).',
          'Duration: SaaS term + purge period (indicative 30 days) except legal retention.',
          'Nature / purpose: storage, display, backup, export, support, security, to enable the Customer to use the Platform.',
          'Data types: members’ sporting and admin identity; performance; logistics/GPS; documents; team financial data; where entered by the Customer, allergies/health and minors’ data; technical logs.',
          'Data subjects: riders, staff, executives, invited partners, freelancers on Team missions, scouting prospects managed by the Team.',
        ],
      },
    },
    {
      id: 'instructions',
      title: { fr: '3. Instructions du Client', en: '3. Customer instructions' },
      blocks: {
        fr: [
          'Rovik ne traite les Données Client que sur instruction documentée du Client : usage de la Plateforme, CGU/CGV/DPA, et demandes écrites (email) compatibles avec le service.',
          'Si une instruction paraît illicite au regard du RGPD, Rovik en informe le Client sans exécuter l’instruction contestée, sauf obligation légale contraire.',
          'Le Client garantit qu’il dispose d’une base légale pour les traitements qu’il configure (y compris santé, mineurs, scouting) et qu’il informe les personnes concernées.',
        ],
        en: [
          'Rovik processes Customer Data only on documented Customer instructions: Platform use, ToU/ToS/DPA, and written requests (email) compatible with the service.',
          'If an instruction appears unlawful under the GDPR, Rovik will inform the Customer and will not execute the contested instruction unless legally required otherwise.',
          'The Customer warrants it has a lawful basis for the processing it configures (including health, minors, scouting) and informs data subjects.',
        ],
      },
    },
    {
      id: 'security',
      title: { fr: '4. Sécurité (art. 32)', en: '4. Security (Art. 32)' },
      blocks: {
        fr: [
          'Mesures : contrôle d’accès, chiffrement transit/repos (selon fournisseur cloud), cloisonnement par équipe, journalisation, sauvegardes, procédures d’incident, export/purge.',
          'Rovik notifie le Client sans délai injustifié après avoir pris connaissance d’une violation de données personnelles affectant les Données Client, avec les informations raisonnablement disponibles pour permettre au Client de respecter l’art. 33/34.',
        ],
        en: [
          'Measures: access control, encryption in transit/at rest (per cloud provider), team isolation, logging, backups, incident procedures, export/purge.',
          'Rovik notifies the Customer without undue delay after becoming aware of a personal-data breach affecting Customer Data, with information reasonably available to help the Customer meet Art. 33/34 duties.',
        ],
      },
    },
    {
      id: 'subprocessors',
      title: { fr: '5. Sous-traitants ultérieurs (annexe B)', en: '5. Sub-processors (Annex B)' },
      blocks: {
        fr: [
          'Sous-traitants autorisés à la date du DPA :',
          '• Google Ireland Limited / Google LLC — Firebase / Google Cloud (hébergement, auth, base, fonctions) ;',
          '• Stripe Payments Europe, Limited / Stripe, Inc. — paiements abonnement et, le cas échéant, Connect marketplace (données de paiement nécessaires).',
          'Rovik peut ajouter un sous-traitant en informant le Client (email ou page /legal/dpa) avec un préavis de 15 jours. Objection motivée : le Client peut résilier le module concerné ou l’abonnement si l’objection est raisonnable et qu’aucune alternative n’est trouvée.',
          'Rovik impose à ses sous-traitants des obligations de protection équivalentes.',
        ],
        en: [
          'Authorised sub-processors as of the DPA date:',
          '• Google Ireland Limited / Google LLC — Firebase / Google Cloud (hosting, auth, database, functions);',
          '• Stripe Payments Europe, Limited / Stripe, Inc. — subscription payments and, where enabled, marketplace Connect (necessary payment data).',
          'Rovik may add a sub-processor by notifying the Customer (email or /legal/dpa) with 15 days’ notice. Motivated objection: the Customer may terminate the affected module or subscription if the objection is reasonable and no alternative is found.',
          'Rovik imposes equivalent protection obligations on its sub-processors.',
        ],
      },
    },
    {
      id: 'assistance',
      title: { fr: '6. Assistance aux droits et conformité', en: '6. Assistance with rights and compliance' },
      blocks: {
        fr: [
          'Rovik assiste le Client, dans la mesure du raisonnable et via les fonctions produit, pour : demandes des personnes, sécurité, notifications de violation, analyses d’impact (AIPD) lorsque le traitement le justifie, et audits.',
          'Audits : le Client peut demander une fois par an des informations / rapports raisonnables (y compris rapports fournisseurs cloud). Un audit sur site n’est possible que sur motif légitime, avec préavis de 30 jours, sous NDA, aux frais du Client, sans perturber le service ni les autres clients.',
        ],
        en: [
          'Rovik assists the Customer, reasonably and via product features, with: data-subject requests, security, breach notices, DPIAs when warranted, and audits.',
          'Audits: the Customer may once per year request reasonable information / reports (including cloud-vendor reports). On-site audit only for legitimate cause, 30 days’ notice, under NDA, at Customer’s cost, without disrupting the service or other customers.',
        ],
      },
    },
    {
      id: 'international',
      title: { fr: '7. Transferts internationaux', en: '7. International transfers' },
      blocks: {
        fr: [
          'Tout transfert hors EEE s’appuie sur un mécanisme valide (clauses contractuelles types, décision d’adéquation, Data Privacy Framework, etc.). Sur demande, Rovik fournit les références des CCT applicables avec Google / Stripe.',
        ],
        en: [
          'Any transfer outside the EEA relies on a valid mechanism (SCCs, adequacy decision, Data Privacy Framework, etc.). On request, Rovik provides references to applicable SCCs with Google / Stripe.',
        ],
      },
    },
    {
      id: 'return',
      title: { fr: '8. Restitution et suppression', en: '8. Return and deletion' },
      blocks: {
        fr: [
          'À la fin du service, le Client peut exporter ses données. Ensuite, Rovik supprime ou anonymise les Données Client personnelles dans un délai indicatif de 30 jours, sauf conservation imposée par la loi ou nécessaire à la défense d’un droit en justice (durée limitée).',
          'Certification de suppression disponible sur demande écrite raisonnable.',
        ],
        en: [
          'At service end, the Customer may export its data. Rovik then deletes or anonymises personal Customer Data within an indicative 30 days, except retention required by law or needed to establish/defend legal claims (limited period).',
          'Deletion certificate available on reasonable written request.',
        ],
      },
    },
    {
      id: 'liability',
      title: { fr: '9. Responsabilité', en: '9. Liability' },
      blocks: {
        fr: [
          'La responsabilité au titre du DPA suit les plafonds et exclusions des CGU/CGV, sans préjudice des droits des personnes concernées ni des amendes administratives qui ne sont pas « plafonnables » contractuellement entre les parties au détriment de la loi.',
          'Chaque partie assume les conséquences de ses propres manquements au RGPD.',
        ],
        en: [
          'Liability under the DPA follows the ToU/ToS caps and exclusions, without prejudice to data-subject rights or administrative fines that cannot be contractually capped contrary to law.',
          'Each party bears the consequences of its own GDPR breaches.',
        ],
      },
    },
    {
      id: 'law',
      title: { fr: '10. Droit applicable', en: '10. Governing law' },
      blocks: {
        fr: [
          'Droit français · juridiction : ' +
            LEGAL_ENTITY.courts.fr +
            ' · Version ' +
            LEGAL_PACK_VERSION +
            ' (' +
            LEGAL_EFFECTIVE_DATE +
            ').',
        ],
        en: [
          'French law · courts: ' +
            LEGAL_ENTITY.courts.en +
            ' · Version ' +
            LEGAL_PACK_VERSION +
            ' (' +
            LEGAL_EFFECTIVE_DATE +
            ').',
        ],
      },
    },
  ],
};

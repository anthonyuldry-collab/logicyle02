import type { LegalDocument } from './types';
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, LEGAL_PACK_VERSION } from './meta';

export const PRIVACY_DOCUMENT: LegalDocument = {
  id: 'privacy',
  version: LEGAL_PACK_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  title: {
    fr: 'Politique de confidentialité (RGPD)',
    en: 'Privacy Policy (GDPR)',
  },
  shortTitle: { fr: 'Confidentialité', en: 'Privacy' },
  summary: {
    fr: 'Traitements, bases légales, droits, sous-traitants, cookies et transferts — FR/UE.',
    en: 'Processing, legal bases, rights, processors, cookies and transfers — FR/EU.',
  },
  sections: [
    {
      id: 'controller',
      title: { fr: '1. Qui est responsable ?', en: '1. Who is the controller?' },
      blocks: {
        fr: [
          LEGAL_ENTITY.legalFormPlaceholder.fr +
            ' — siège : ' +
            LEGAL_ENTITY.registeredOffice +
            ' — contact privacy / DPO : ' +
            LEGAL_ENTITY.dpoEmail +
            '.',
          'Rovik agit selon deux rôles distincts :',
          '• Responsable de traitement pour : comptes utilisateurs, authentification, facturation abonnement, sécurité plateforme, support, statistiques agrégées, prospection B2B limitée, cookies essentiels / mesure d’audience le cas échéant.',
          '• Sous-traitant (art. 28 RGPD) pour : données métier saisies et gérées par l’Équipe Client (roster, performance, logistique, allergies/santé renseignées par l’équipe, GPS flotte, documents, budgets, partenariats, scouting opéré par l’équipe). Dans ce cas, le Client est responsable de traitement ; le DPA s’applique.',
          'Les utilisateurs finaux d’une Équipe doivent exercer certains droits d’abord via leur Équipe (administrateur), et/ou auprès de Rovik pour les données de compte plateforme.',
        ],
        en: [
          LEGAL_ENTITY.legalFormPlaceholder.en +
            ' — registered office: ' +
            LEGAL_ENTITY.registeredOffice +
            ' — privacy / DPO contact: ' +
            LEGAL_ENTITY.dpoEmail +
            '.',
          'Rovik acts in two distinct roles:',
          '• Controller for: user accounts, authentication, subscription billing, platform security, support, aggregated statistics, limited B2B prospecting, essential cookies / analytics where applicable.',
          '• Processor (GDPR Art. 28) for: operational data entered and managed by the Customer Team (roster, performance, logistics, allergies/health entered by the team, fleet GPS, documents, budgets, partnerships, team-operated scouting). In that case the Customer is the controller; the DPA applies.',
          'Team end users should exercise certain rights first via their Team (admin) and/or with Rovik for platform account data.',
        ],
      },
    },
    {
      id: 'data',
      title: { fr: '2. Données collectées', en: '2. Data we collect' },
      blocks: {
        fr: [
          'Selon votre usage :',
          '• Identité & compte : nom, email, rôle, photo, préférences langue, logs de consentement (versions CGU / privacy / NDA).',
          '• Professionnel sportif : profil coureur/staff, contrats, disponibilités, documents administratifs uploadés.',
          '• Performance : profils de puissance, débriefs, indicateurs saisis par l’équipe ou l’athlète.',
          '• Santé / allergies (catégorie particulière) : uniquement si renseignées ; traitement sur consentement explicite et/ou nécessité pour obligations du Client dans le cadre sportif, avec accès restreint. Jamais partagées via les scopes scouting inter-équipes.',
          '• Logistique & GPS : adresses, trajets, véhicules, hébergements liés aux événements.',
          '• Financier : données de facturation abonnement (via Stripe), budgets équipe, et le cas échéant paiements / commissions marketplace (compte Connect vacataire, montants mission, facturation MoR) lorsque le paiement in-app est activé.',
          '• Scouting / indépendants : profils de visibilité, demandes de contact, consentements granulaires (scopes), horodatages et snapshots de notice ; hors données de santé / allergies / n° de sécurité sociale / contacts d’urgence.',
          '• Technique : logs, adresse IP, device, diagnostics (sécurité et stabilité).',
          '• Mineurs : données avec autorisation parentale / tuteur ; partage scouting inter-équipes interdit sans autorisation parentale enregistrée.',
        ],
        en: [
          'Depending on use:',
          '• Identity & account: name, email, role, photo, language preferences, consent logs (ToU / privacy / NDA versions).',
          '• Sporting professional: rider/staff profile, contracts, availability, uploaded admin documents.',
          '• Performance: power profiles, debriefs, metrics entered by the team or athlete.',
          '• Health / allergies (special category): only if provided; processed on explicit consent and/or necessity for the Customer’s sporting obligations, with restricted access. Never shared via inter-team scouting scopes.',
          '• Logistics & GPS: addresses, trips, vehicles, event accommodations.',
          '• Financial: subscription billing data (via Stripe), team budgets, and marketplace payments / fees (freelancer Connect account, mission amounts, MoR invoicing) when in-app payments are enabled.',
          '• Scouting / independents: visibility profiles, contact requests, granular consents (scopes), timestamps and notice snapshots; excluding health / allergies / social security numbers / emergency contacts.',
          '• Technical: logs, IP address, device, diagnostics (security and stability).',
          '• Minors: data with parental / guardian authorisation; inter-team scouting share blocked without recorded parental authorisation.',
        ],
      },
    },
    {
      id: 'purposes',
      title: { fr: '3. Finalités et bases légales', en: '3. Purposes and legal bases' },
      blocks: {
        fr: [
          '• Fourniture du service SaaS et exécution du contrat (art. 6.1.b) ;',
          '• Facturation, lutte antifraude, sécurité (intérêt légitime et/ou obligation légale) ;',
          '• Consentement (art. 6.1.a) : cookies non essentiels, communications marketing optionnelles, données de santé optionnelles, partage scouting inter-équipes (scopes choisis in-app, retrait à tout moment) ;',
          '• Intérêt légitime (art. 6.1.f) : suivi discret (watchlist) interne à une Équipe sur profils déjà visibles / recherchables — sans notification ni partage vers l’athlète ; balancing test documenté en interne ;',
          '• Obligations légales (comptabilité, réponses autorités) ;',
          '• Intérêt légitime : amélioration produit sur données agrégées / anonymisées, prévention des abus.',
          'Lorsque Rovik est sous-traitant, la base légale est déterminée par le Client responsable.',
        ],
        en: [
          '• Providing the SaaS and performing the contract (Art. 6.1.b);',
          '• Billing, fraud prevention, security (legitimate interest and/or legal obligation);',
          '• Consent (Art. 6.1.a): non-essential cookies, optional marketing, optional health data, inter-team scouting shares (in-app scopes, withdraw anytime);',
          '• Legitimate interest (Art. 6.1.f): internal team watchlist on already visible/searchable profiles — no athlete notification or outbound share; balancing test documented internally;',
          '• Legal obligations (accounting, authority requests);',
          '• Legitimate interest: product improvement on aggregated / anonymised data, abuse prevention.',
          'When Rovik is a processor, the legal basis is determined by the Customer controller.',
        ],
      },
    },
    {
      id: 'recipients',
      title: { fr: '4. Destinataires et sous-traitants', en: '4. Recipients and processors' },
      blocks: {
        fr: [
          'Données accessibles : vous, les membres autorisés de votre Équipe, le support Rovik (besoin d’en connaître), et nos sous-traitants :',
          '• ' +
            LEGAL_ENTITY.host.name +
            ' — hébergement / auth / base de données ;',
          '• ' +
            LEGAL_ENTITY.paymentProcessor.name +
            ' — paiements abonnement (et Connect lorsque le paiement marketplace in-app est activé) ;',
          '• Outils d’email transactionnel / monitoring éventuellement ajoutés (liste tenue à jour sur demande et en annexe DPA).',
          'Pas de vente de données personnelles. Partage sponsor / partenaire uniquement si l’Équipe l’active et dans le périmètre configuré.',
        ],
        en: [
          'Data may be accessed by: you, authorised Team members, Rovik support (need-to-know), and our processors:',
          '• ' +
            LEGAL_ENTITY.host.name +
            ' — hosting / auth / database;',
          '• ' +
            LEGAL_ENTITY.paymentProcessor.name +
            ' — subscription payments (and Connect when in-app marketplace payments are enabled);',
          '• Transactional email / monitoring tools that may be added (list kept updated on request and in the DPA annex).',
          'We do not sell personal data. Sponsor / partner sharing only if enabled by the Team and within the configured scope.',
        ],
      },
    },
    {
      id: 'transfers',
      title: { fr: '5. Transferts hors UE', en: '5. Transfers outside the EU' },
      blocks: {
        fr: [
          LEGAL_ENTITY.host.note.fr,
          'Des garanties équivalentes (CCT, DPF, décisions d’adéquation) sont mises en place avec les fournisseurs. Des détails peuvent être fournis sur demande à ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
        en: [
          LEGAL_ENTITY.host.note.en,
          'Equivalent safeguards (SCCs, DPF, adequacy decisions) are implemented with vendors. Details are available on request at ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
      },
    },
    {
      id: 'retention',
      title: { fr: '6. Durées de conservation', en: '6. Retention' },
      blocks: {
        fr: [
          '• Compte actif : durée de la relation ;',
          '• Après suppression de compte / fin d’abonnement Équipe : effacement ou anonymisation des données personnelles sous 30 jours, sauf obligations légales (factures : jusqu’à 10 ans en France) ou litige ;',
          '• Preuves de consentement scouting (horodatages, scopes, snapshot de notice) : conservées jusqu’à 3 ans après retrait ou fin de relation pour démontrer le respect de l’art. 7 RGPD ;',
          '• Logs sécurité : durée limitée nécessaire à la détection d’incidents ;',
          '• Données anonymisées / agrégées : peuvent être conservées sans limite pour statistiques produit.',
        ],
        en: [
          '• Active account: for the relationship;',
          '• After account deletion / Team subscription end: erasure or anonymisation of personal data within 30 days, except legal duties (invoices: up to 10 years in France) or disputes;',
          '• Scouting consent evidence (timestamps, scopes, notice snapshot): kept up to 3 years after withdrawal or end of relationship to demonstrate Art. 7 GDPR compliance;',
          '• Security logs: limited period needed for incident detection;',
          '• Anonymised / aggregated data: may be kept indefinitely for product statistics.',
        ],
      },
    },
    {
      id: 'rights',
      title: { fr: '7. Vos droits', en: '7. Your rights' },
      blocks: {
        fr: [
          'Conformément au RGPD : accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement, directives post-mortem (droit français).',
          'Exercice : Paramètres → panneau RGPD (export) ou email ' +
            LEGAL_ENTITY.privacyEmail +
            '. Réponse sous 30 jours (prolongeable selon complexité).',
          'Réclamation : CNIL (www.cnil.fr) ou autorité de votre pays de résidence UE/EEE.',
        ],
        en: [
          'Under the GDPR: access, rectification, erasure, restriction, objection, portability, withdrawal of consent, and French post-mortem directives where applicable.',
          'How to exercise: Settings → GDPR panel (export) or email ' +
            LEGAL_ENTITY.privacyEmail +
            '. Response within 30 days (extendable if complex).',
          'Complaint: CNIL (www.cnil.fr) or your EU/EEA supervisory authority.',
        ],
      },
    },
    {
      id: 'security',
      title: { fr: '8. Sécurité', en: '8. Security' },
      blocks: {
        fr: [
          'Chiffrement en transit (TLS) et au repos selon les contrôles Firebase / Google Cloud, contrôle d’accès par rôles, journalisation, procédures d’export et de purge.',
          'Aucun système n’est infaillible. Signalez tout incident suspect à ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
        en: [
          'Encryption in transit (TLS) and at rest per Firebase / Google Cloud controls, role-based access, logging, export and purge procedures.',
          'No system is perfect. Report suspected incidents to ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
      },
    },
    {
      id: 'cookies',
      title: { fr: '9. Cookies', en: '9. Cookies' },
      blocks: {
        fr: [
          'Voir la Politique cookies (/legal/cookies). Les cookies strictement nécessaires au fonctionnement (session, langue, sécurité) ne requièrent pas de consentement. Les cookies de mesure / marketing éventuels nécessitent votre accord.',
        ],
        en: [
          'See the Cookie Policy (/legal/cookies). Strictly necessary cookies (session, language, security) do not require consent. Any analytics / marketing cookies require your agreement.',
        ],
      },
    },
    {
      id: 'changes',
      title: { fr: '10. Modifications', en: '10. Changes' },
      blocks: {
        fr: [
          'Version ' +
            LEGAL_PACK_VERSION +
            ' · entrée en vigueur ' +
            LEGAL_EFFECTIVE_DATE +
            '. Les mises à jour matérielles seront notifiées. La version publiée sur /legal/privacy fait foi.',
        ],
        en: [
          'Version ' +
            LEGAL_PACK_VERSION +
            ' · effective ' +
            LEGAL_EFFECTIVE_DATE +
            '. Material updates will be notified. The version at /legal/privacy prevails.',
        ],
      },
    },
  ],
};

import type { LegalDocument } from './types';
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, LEGAL_PACK_VERSION } from './meta';

export const CGV_DOCUMENT: LegalDocument = {
  id: 'cgv',
  version: LEGAL_PACK_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  title: {
    fr: 'Conditions générales de vente — Contrat SaaS (CGV)',
    en: 'Terms of Sale — SaaS Agreement (ToS)',
  },
  shortTitle: { fr: 'CGV', en: 'Terms of Sale' },
  summary: {
    fr: 'Abonnements Stripe, essai, renouvellement, résiliation, SLA indicatifs et commissions marketplace (lorsque le paiement in-app est activé).',
    en: 'Stripe subscriptions, trial, renewal, termination, indicative SLAs and marketplace fees (when in-app payments are enabled).',
  },
  sections: [
    {
      id: 'scope',
      title: { fr: '1. Objet', en: '1. Purpose' },
      blocks: {
        fr: [
          'Les présentes Conditions générales de vente (« CGV ») régissent la souscription et la fourniture des services SaaS payants LogiCycle au Client professionnel (club, équipe, fédération, organisation ou indépendant abonné).',
          'Elles complètent les CGU. En cas de conflit sur le prix, la durée, le paiement ou la résiliation d’abonnement, les CGV prévalent.',
        ],
        en: [
          'These Terms of Sale (“ToS”) govern subscription to and provision of paid LogiCycle SaaS services to the professional Customer (club, team, federation, organisation or subscribed independent).',
          'They supplement the Terms of Use. On price, term, payment or subscription termination, the ToS prevail.',
        ],
      },
    },
    {
      id: 'plans',
      title: { fr: '2. Offres et commandes', en: '2. Plans and orders' },
      blocks: {
        fr: [
          'Les plans (ex. Club, Compétition, Continental, Pro, Fédération, indépendant athlète / staff) et leurs fonctionnalités sont décrits sur la page tarifs. LogiCycle peut faire évoluer le catalogue avec un préavis raisonnable pour les Clients en cours.',
          'La commande est formée lorsque le Client valide un parcours Stripe Checkout / Customer Portal ou signe un devis / contrat Enterprise.',
          'Sauf mention contraire, les prix sont en euros, hors taxes. La TVA applicable est ajoutée selon le statut du Client (UE / hors UE) et la réglementation en vigueur.',
        ],
        en: [
          'Plans (e.g. Club, Competition, Continental, Pro, Federation, independent athlete / staff) and features are described on the pricing page. LogiCycle may update the catalogue with reasonable notice for existing Customers.',
          'An order is formed when the Customer completes Stripe Checkout / Customer Portal or signs an Enterprise quote / agreement.',
          'Unless stated otherwise, prices are in euros, exclusive of tax. Applicable VAT is added based on the Customer’s status (EU / non-EU) and current rules.',
        ],
      },
    },
    {
      id: 'trial',
      title: { fr: '3. Essai et pilote', en: '3. Trial and pilot' },
      blocks: {
        fr: [
          'Essai gratuit indicatif : 14 jours pour certains plans Club / Compétition / indépendants, sous réserve d’enregistrement d’un moyen de paiement via Stripe. Le premier prélèvement intervient à l’issue de l’essai sauf résiliation avant échéance.',
          'Pilote indicatif : jusqu’à 90 jours pour certains parcours Continental / Pro, selon conditions commerciales écrites.',
          'LogiCycle peut refuser, raccourcir ou retirer un essai en cas d’abus (multi-comptes, fraude). Les fonctionnalités d’essai peuvent être limitées.',
        ],
        en: [
          'Indicative free trial: 14 days for certain Club / Competition / independent plans, subject to registering a payment method via Stripe. The first charge occurs when the trial ends unless cancelled beforehand.',
          'Indicative pilot: up to 90 days for certain Continental / Pro paths, per written commercial terms.',
          'LogiCycle may refuse, shorten or withdraw a trial in case of abuse (multi-accounts, fraud). Trial features may be limited.',
        ],
      },
    },
    {
      id: 'billing',
      title: { fr: '4. Facturation et paiement (Stripe)', en: '4. Billing and payment (Stripe)' },
      blocks: {
        fr: [
          'Les abonnements sont facturés à l’avance, au cycle mensuel ou annuel choisi, via Stripe. Le Client autorise les prélèvements récurrents sur le moyen de paiement enregistré.',
          'LogiCycle ne stocke pas les numéros de carte complets ; le traitement paiement est assuré par ' +
            LEGAL_ENTITY.paymentProcessor.name +
            ' (' +
            LEGAL_ENTITY.paymentProcessor.entity +
            ').',
          'En cas d’échec de paiement, LogiCycle peut relancer, suspendre l’accès après notification, puis résilier l’abonnement. Les sommes échues restent dues.',
          'Les codes parrain / réductions s’appliquent uniquement dans les conditions annoncées (ex. −10 % première année) et ne sont pas cumulables sauf mention contraire.',
        ],
        en: [
          'Subscriptions are billed in advance on the chosen monthly or yearly cycle via Stripe. The Customer authorises recurring charges on the registered payment method.',
          'LogiCycle does not store full card numbers; payment processing is handled by ' +
            LEGAL_ENTITY.paymentProcessor.name +
            ' (' +
            LEGAL_ENTITY.paymentProcessor.entity +
            ').',
          'On payment failure, LogiCycle may retry, suspend access after notice, then terminate the subscription. Amounts due remain payable.',
          'Referral / discount codes apply only as advertised (e.g. −10% first year) and are not stackable unless stated otherwise.',
        ],
      },
    },
    {
      id: 'renewal',
      title: { fr: '5. Durée, renouvellement et résiliation', en: '5. Term, renewal and termination' },
      blocks: {
        fr: [
          'Sauf contrat Enterprise à durée ferme, l’abonnement se renouvelle tacitement à chaque échéance pour une période égale, jusqu’à résiliation.',
          'Le Client peut résilier via le portail Stripe / paramètres de facturation, au plus tard avant la date de renouvellement. La résiliation prend effet à la fin de la période déjà payée ; aucun remboursement au prorata sauf obligation légale ou geste commercial écrit.',
          'LogiCycle peut résilier pour manquement grave non réparé sous 15 jours après mise en demeure (ou immédiatement en cas de fraude / risque sécurité), ou pour cessation du service avec préavis de 30 jours et remboursement au prorata de la période non consommée.',
        ],
        en: [
          'Unless a fixed-term Enterprise contract applies, the subscription auto-renews at each term for an equal period until cancelled.',
          'The Customer may cancel via the Stripe portal / billing settings before the renewal date. Cancellation takes effect at the end of the paid period; no pro-rata refund unless required by law or agreed in writing.',
          'LogiCycle may terminate for material breach uncured within 15 days of notice (or immediately for fraud / security risk), or if discontinuing the service with 30 days’ notice and a pro-rata refund for unused prepaid time.',
        ],
      },
    },
    {
      id: 'sla',
      title: { fr: '6. Niveaux de service (indicatifs)', en: '6. Service levels (indicative)' },
      blocks: {
        fr: [
          'Sauf SLA Enterprise signé :',
          '• disponibilité cible : 99 % mensuelle hors maintenance planifiée et force majeure ;',
          '• support : email ' +
            LEGAL_ENTITY.supportEmail +
            ' · délai de première réponse indicatif 2 jours ouvrés (plans standard) ;',
          '• sauvegardes : selon les mécanismes Firebase / Google Cloud ; restauration best effort.',
          'Les crédits de service éventuels (Enterprise) constituent l’unique recours pour indisponibilité, à l’exclusion de dommages-intérêts complémentaires sauf faute lourde.',
        ],
        en: [
          'Unless a signed Enterprise SLA applies:',
          '• target availability: 99% monthly excluding planned maintenance and force majeure;',
          '• support: email ' +
            LEGAL_ENTITY.supportEmail +
            ' · indicative first response within 2 business days (standard plans);',
          '• backups: per Firebase / Google Cloud mechanisms; restore on a best-effort basis.',
          'Any Enterprise service credits are the sole remedy for downtime, excluding further damages except for gross negligence.',
        ],
      },
    },
    {
      id: 'marketplace-fees',
      title: { fr: '7. Commissions marketplace', en: '7. Marketplace commissions' },
      blocks: {
        fr: [
          'À ce jour, la marketplace missions est en mode mise en relation : aucun paiement in-app ni commission LogiCycle n’est prélevé sur les missions.',
          'Lorsque le paiement via Stripe Connect sera activé, LogiCycle pourra facturer une commission sur le GMV vacataire : 12 % (Compétition / Continental), 10 % (Pro), sous réserve de minimum / plafond publiés. La commission sera alors due dès paiement effectif de la mission ; les frais Stripe seront distincts.',
          'LogiCycle émettra, le cas échéant, les documents de facturation de commission conformes à la TVA applicable.',
        ],
        en: [
          'Today the mission marketplace is matching-only: no in-app payment and no LogiCycle commission is charged on missions.',
          'When Stripe Connect payments are enabled, LogiCycle may charge a commission on freelancer GMV: 12% (Competition / Continental), 10% (Pro), subject to published minimums / caps. Commission will then be due upon effective mission payment; Stripe fees remain separate.',
          'LogiCycle will issue commission invoices as required under applicable VAT rules.',
        ],
      },
    },
    {
      id: 'data-exit',
      title: { fr: '8. Données et réversibilité', en: '8. Data and exit' },
      blocks: {
        fr: [
          'Pendant l’abonnement et pendant une période raisonnable après résiliation, le Client peut exporter ses données via les fonctions prévues (export JSON / modules concernés).',
          'Le traitement des données personnelles suit la Politique de confidentialité et le DPA. Après purge, la récupération n’est plus garantie.',
        ],
        en: [
          'During the subscription and for a reasonable period after termination, the Customer may export data via available features (JSON export / relevant modules).',
          'Personal data processing follows the Privacy Policy and DPA. After purge, recovery is no longer guaranteed.',
        ],
      },
    },
    {
      id: 'liability',
      title: { fr: '9. Responsabilité et assurances', en: '9. Liability and insurance' },
      blocks: {
        fr: [
          'Le plafond de responsabilité des CGU s’applique aux CGV. LogiCycle recommande au Client de souscrire ses propres assurances (RC, cyber) adaptées à son activité sportive.',
          'Force majeure : événements imprévisibles et irrésistibles (panne majeure cloud fournisseur, catastrophe, guerre, pandémie bloquante, décision administrative) suspendent les obligations affectées sans indemnité.',
        ],
        en: [
          'The ToU liability cap applies to the ToS. LogiCycle recommends the Customer maintain its own insurance (liability, cyber) suited to its sporting activity.',
          'Force majeure: unforeseeable and irresistible events (major cloud-provider outage, disaster, war, blocking pandemic, administrative order) suspend affected obligations without compensation.',
        ],
      },
    },
    {
      id: 'law',
      title: { fr: '10. Droit applicable', en: '10. Governing law' },
      blocks: {
        fr: [
          'Droit français · litiges : ' +
            LEGAL_ENTITY.courts.fr +
            ' · Contact commercial : ' +
            LEGAL_ENTITY.contactEmail +
            '.',
        ],
        en: [
          'French law · disputes: ' +
            LEGAL_ENTITY.courts.en +
            ' · Commercial contact: ' +
            LEGAL_ENTITY.contactEmail +
            '.',
        ],
      },
    },
  ],
};

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
          'Les présentes Conditions générales de vente (« CGV ») régissent la souscription et la fourniture des services SaaS payants Rovik au Client professionnel (club, équipe, fédération, organisation ou indépendant abonné).',
          'Elles complètent les CGU. En cas de conflit sur le prix, la durée, le paiement ou la résiliation d’abonnement, les CGV prévalent.',
        ],
        en: [
          'These Terms of Sale (“ToS”) govern subscription to and provision of paid Rovik SaaS services to the professional Customer (club, team, federation, organisation or subscribed independent).',
          'They supplement the Terms of Use. On price, term, payment or subscription termination, the ToS prevail.',
        ],
      },
    },
    {
      id: 'plans',
      title: { fr: '2. Offres et commandes', en: '2. Plans and orders' },
      blocks: {
        fr: [
          'Les plans (ex. Club, Compétition, Continental, Pro, Fédération, indépendant athlète / staff) et leurs fonctionnalités sont décrits sur la page tarifs. Rovik peut faire évoluer le catalogue avec un préavis raisonnable pour les Clients en cours.',
          'La commande est formée lorsque le Client valide un parcours Stripe Checkout / Customer Portal ou signe un devis / contrat Enterprise.',
          'Sauf mention contraire sur un devis Enterprise, les prix publics d’abonnement sont indiqués en euros TTC (prix final prélevé). Cela convient notamment aux structures non assujetties à la TVA. Si Rovik est assujetti à la TVA, la facture précise le cas échéant le détail de TVA conformément à la réglementation.',
        ],
        en: [
          'Plans (e.g. Club, Competition, Continental, Pro, Federation, independent athlete / staff) and features are described on the pricing page. Rovik may update the catalogue with reasonable notice for existing Customers.',
          'An order is formed when the Customer completes Stripe Checkout / Customer Portal or signs an Enterprise quote / agreement.',
          'Unless otherwise stated on an Enterprise quote, public subscription prices are shown in euros as final all-in amounts charged. This suits organisations not VAT-registered. If Rovik is VAT-registered, invoices show VAT detail as required by law.',
        ],
      },
    },
    {
      id: 'trial',
      title: { fr: '3. Essai et pilote', en: '3. Trial and pilot' },
      blocks: {
        fr: [
          'Essai gratuit indicatif : 14 jours pour Club / Compétition / indépendants, et 30 jours pour Élite / Performance, sous réserve d’enregistrement d’un moyen de paiement via Stripe. Le premier prélèvement intervient à l’issue de l’essai sauf résiliation avant échéance.',
          'Toute extension d’essai au-delà de ces durées relève d’un accord commercial écrit.',
          'Rovik peut refuser, raccourcir ou retirer un essai en cas d’abus (multi-comptes, fraude). Les fonctionnalités d’essai peuvent être limitées.',
        ],
        en: [
          'Indicative free trial: 14 days for Club / Competition / independents, and 30 days for Elite / Performance, subject to registering a payment method via Stripe. The first charge occurs when the trial ends unless cancelled beforehand.',
          'Any trial extension beyond these periods requires a written commercial agreement.',
          'Rovik may refuse, shorten or withdraw a trial in case of abuse (multi-accounts, fraud). Trial features may be limited.',
        ],
      },
    },
    {
      id: 'first-race-guarantee',
      title: {
        fr: '3.1 Garantie commerciale — première course',
        en: '3.1 Commercial guarantee — first race',
      },
      blocks: {
        fr: [
          'Pendant le soft-launch, Rovik propose une garantie commerciale « première course » aux Clients qui souscrivent un abonnement annuel d’équipe (Club, Compétition, Élite ou Performance). Elle ne s’applique pas aux profils indépendants.',
          'Condition d’activation : le Client renseigne dans Rovik une épreuve réelle de son calendrier (effectif convoqué, au moins un élément de logistique transport ou hébergement, et une checklist opérationnelle).',
          'Si, dans les 14 jours suivant la fin de cette épreuve, le Client notifie par écrit à ' +
            LEGAL_ENTITY.contactEmail +
            ' qu’il a dû reprendre un tableur pour la logistique de cette même épreuve, Rovik rembourse l’intégralité de la période annuelle en cours (montant TTC effectivement prélevé).',
          'La garantie est limitée à une fois par structure. Elle ne s’applique pas si l’épreuve n’a pas été renseignée comme prévu, ni aux clubs sans calendrier de course compétitive.',
          'Cette garantie commerciale s’ajoute aux droits légaux (conformité, éventuelle rétractation) et constitue une exception à l’absence de remboursement au prorata prévue à l’article 5.',
        ],
        en: [
          'During soft launch, Rovik offers a “first race” commercial guarantee to Customers who take out an annual team plan (Club, Competition, Elite or Performance). It does not apply to independent profiles.',
          'Activation condition: the Customer records a real event from their calendar in Rovik (called-up roster, at least one transport or accommodation logistics item, and an operational checklist).',
          'If, within 14 days after that event ends, the Customer notifies ' +
            LEGAL_ENTITY.contactEmail +
            ' in writing that they had to revert to a spreadsheet for that same event’s logistics, Rovik refunds the current annual period in full (all-in amount actually charged).',
          'The guarantee is limited to once per organisation. It does not apply if the event was not recorded as required, nor to clubs without a competitive race calendar.',
          'This commercial guarantee is in addition to statutory rights (conformity, any cooling-off period) and is an exception to the no pro-rata refund rule in section 5.',
        ],
      },
    },
    {
      id: 'billing',
      title: { fr: '4. Facturation et paiement (Stripe)', en: '4. Billing and payment (Stripe)' },
      blocks: {
        fr: [
          'Les abonnements sont facturés à l’avance, au cycle mensuel ou annuel choisi, via Stripe. Le Client autorise les prélèvements récurrents sur le moyen de paiement enregistré.',
          'Rovik ne stocke pas les numéros de carte complets ; le traitement paiement est assuré par ' +
            LEGAL_ENTITY.paymentProcessor.name +
            ' (' +
            LEGAL_ENTITY.paymentProcessor.entity +
            ').',
          'En cas d’échec de paiement, Rovik peut relancer, suspendre l’accès après notification, puis résilier l’abonnement. Les sommes échues restent dues.',
          'Les codes parrain / réductions s’appliquent uniquement dans les conditions annoncées (ex. −10 % première année) et ne sont pas cumulables sauf mention contraire.',
        ],
        en: [
          'Subscriptions are billed in advance on the chosen monthly or yearly cycle via Stripe. The Customer authorises recurring charges on the registered payment method.',
          'Rovik does not store full card numbers; payment processing is handled by ' +
            LEGAL_ENTITY.paymentProcessor.name +
            ' (' +
            LEGAL_ENTITY.paymentProcessor.entity +
            ').',
          'On payment failure, Rovik may retry, suspend access after notice, then terminate the subscription. Amounts due remain payable.',
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
          'Le Client peut résilier via le portail Stripe / paramètres de facturation, au plus tard avant la date de renouvellement. La résiliation prend effet à la fin de la période déjà payée ; aucun remboursement au prorata sauf obligation légale, garantie première course (art. 3.1), ou geste commercial écrit.',
          'Rovik peut résilier pour manquement grave non réparé sous 15 jours après mise en demeure (ou immédiatement en cas de fraude / risque sécurité), ou pour cessation du service avec préavis de 30 jours et remboursement au prorata de la période non consommée.',
        ],
        en: [
          'Unless a fixed-term Enterprise contract applies, the subscription auto-renews at each term for an equal period until cancelled.',
          'The Customer may cancel via the Stripe portal / billing settings before the renewal date. Cancellation takes effect at the end of the paid period; no pro-rata refund unless required by law, the first-race guarantee (section 3.1), or agreed in writing.',
          'Rovik may terminate for material breach uncured within 15 days of notice (or immediately for fraud / security risk), or if discontinuing the service with 30 days’ notice and a pro-rata refund for unused prepaid time.',
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
      title: { fr: '7. Commissions marketplace & facturation missions', en: '7. Marketplace fees & mission invoicing' },
      blocks: {
        fr: [
          'Soft-launch : tant que le paiement in-app n’est pas activé (flags produit), la marketplace reste en mise en relation : aucun prélèvement de commission mission ni facture mission Rovik.',
          'Lorsque Stripe Connect est activé, seuls les missions en régime prestation indépendante (types « Vacataire (Facture) » / « Montant fixe ») peuvent être payées in-app. Les missions salariales (CDD, CDI, stage, apprentissage, bénévolat) sont exclues du paiement Connect.',
          'Commission Rovik sur le GMV vacataire : 12 % (Compétition / Continental / Élite), 10 % (Pro / Performance), minimum 15 €, plafond 450 € par mission, due dès paiement effectif. Les frais de traitement Stripe sont distincts et supportés selon le modèle Connect (destination charges).',
          'Chaîne de facturation (régime indépendant / merchant of record) : (a) Rovik émet à l’Équipe une facture (ou document équivalent conforme) pour le montant mission (GMV), avec détail de la commission le cas échéant ; (b) le vacataire émet à Rovik une facture pour le net perçu (GMV moins commission), nécessaire à sa comptabilité et à ses déclarations (URSSAF, TVA selon son régime). Les reçus Stripe documentent le paiement mais ne se substituent pas à ces factures.',
          'TVA : tant que Rovik relève de la franchise en base ou n’est pas assujetti, les factures portent la mention légale applicable ; après assujettissement, la TVA est détaillée conformément à la réglementation. Le vacataire reste seul responsable de son régime fiscal.',
          'L’Équipe reconnaît qu’un paiement Connect ne constitue ni un salaire ni une prise en charge des cotisations employeur. Tout recours au CDD d’usage ou au salariat s’effectue hors flux Connect, sous sa responsabilité exclusive.',
        ],
        en: [
          'Soft-launch: while in-app payment is off (product flags), the marketplace remains matching-only: no mission commission or Rovik mission invoice.',
          'When Stripe Connect is enabled, only independent-contractor missions (“Freelancer invoice” / “Fixed amount”) may be paid in-app. Employment-type missions (fixed-term, permanent, internship, apprenticeship, volunteer) are excluded from Connect payouts.',
          'Rovik fee on freelancer GMV: 12% (Competition / Continental / Elite), 10% (Pro / Performance), €15 minimum, €450 cap per mission, due upon effective payment. Stripe processing fees are separate under the Connect destination-charge model.',
          'Invoice chain (independent regime / merchant of record): (a) Rovik issues the Team an invoice (or equivalent compliant document) for the mission amount (GMV), with fee detail where applicable; (b) the freelancer issues Rovik an invoice for the net received (GMV minus fee), for their accounting and filings (social security, VAT per their regime). Stripe receipts evidence payment but do not replace those invoices.',
          'VAT: while Rovik is under a small-business exemption or not VAT-registered, invoices carry the applicable legal wording; after VAT registration, VAT is shown as required. The freelancer alone remains responsible for their tax regime.',
          'The Team acknowledges that a Connect payment is neither wages nor employer social contributions. Any fixed-term employment or payroll path runs outside Connect, under the Team’s sole responsibility.',
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
          'Le plafond de responsabilité des CGU s’applique aux CGV. Rovik recommande au Client de souscrire ses propres assurances (RC, cyber) adaptées à son activité sportive.',
          'Force majeure : événements imprévisibles et irrésistibles (panne majeure cloud fournisseur, catastrophe, guerre, pandémie bloquante, décision administrative) suspendent les obligations affectées sans indemnité.',
        ],
        en: [
          'The ToU liability cap applies to the ToS. Rovik recommends the Customer maintain its own insurance (liability, cyber) suited to its sporting activity.',
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

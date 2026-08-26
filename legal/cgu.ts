import type { LegalDocument } from './types';
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY, LEGAL_PACK_VERSION } from './meta';

export const CGU_DOCUMENT: LegalDocument = {
  id: 'cgu',
  version: LEGAL_PACK_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  title: {
    fr: 'Conditions générales d’utilisation (CGU)',
    en: 'Terms of Use (ToU)',
  },
  shortTitle: { fr: 'CGU', en: 'Terms of Use' },
  summary: {
    fr: 'Règles d’accès et d’usage de la plateforme Rovik pour équipes, indépendants, staff, partenaires et vacataires.',
    en: 'Rules governing access to and use of the Rovik platform for teams, independents, staff, partners and freelancers.',
  },
  sections: [
    {
      id: 'object',
      title: { fr: '1. Objet et champ d’application', en: '1. Purpose and scope' },
      blocks: {
        fr: [
          'Les présentes Conditions générales d’utilisation (« CGU ») régissent l’accès et l’utilisation de la plateforme SaaS Rovik (logiciel de gestion d’équipes cyclistes, logistique, performance, partenariats, scouting et marketplace de missions), accessible via le site et les applications associés (ci-après la « Plateforme »).',
          'L’éditeur est désigné « Rovik », « nous ». L’utilisateur est désigné « Utilisateur », « vous ». Le client abonné (club, équipe, fédération ou organisation) est désigné « Client » ou « Équipe ».',
          'L’utilisation de la Plateforme implique l’acceptation sans réserve des présentes CGU, de la Politique de confidentialité et, le cas échéant, des Conditions générales de vente (CGV) et du Contrat de sous-traitance (DPA).',
          'En cas de contradiction : (i) le DPA prévaut sur les questions de données personnelles traitées pour le compte du Client ; (ii) les CGV prévalent sur les questions tarifaires et d’abonnement ; (iii) un contrat Enterprise signé prévaut sur les CGU/CGV standard.',
        ],
        en: [
          'These Terms of Use (“ToU”) govern access to and use of the Rovik SaaS platform (cycling-team management, logistics, performance, partnerships, scouting and mission marketplace), available via the related website and apps (the “Platform”).',
          'The publisher is referred to as “Rovik” or “we”. The end user is the “User” or “you”. The subscribing customer (club, team, federation or organisation) is the “Customer” or “Team”.',
          'Use of the Platform implies full acceptance of these ToU, the Privacy Policy and, where applicable, the Terms of Sale (ToS) and the Data Processing Agreement (DPA).',
          'In case of conflict: (i) the DPA prevails on personal data processed on the Customer’s behalf; (ii) the ToS prevail on pricing and subscription; (iii) a signed Enterprise agreement prevails over standard ToU/ToS.',
        ],
      },
    },
    {
      id: 'accounts',
      title: { fr: '2. Compte, éligibilité et mineurs', en: '2. Account, eligibility and minors' },
      blocks: {
        fr: [
          'L’accès nécessite un compte valide (email vérifié) et, selon le parcours : un abonnement Client, l’appartenance à une Équipe abonnée, un abonnement indépendant, ou un accès partenaire / vacataire selon les droits attribués.',
          'Vous garantissez l’exactitude des informations fournies et la confidentialité de vos identifiants. Toute activité sous votre compte est réputée effectuée par vous, sauf preuve contraire de compromission signalée sans délai à ' +
            LEGAL_ENTITY.supportEmail +
            '.',
          'La Plateforme est destinée à un usage professionnel / sportif organisé. Les Utilisateurs mineurs ne peuvent s’inscrire qu’avec l’autorisation préalable du titulaire de l’autorité parentale ou du tuteur légal, qui demeure responsable de l’usage.',
          'Rovik peut suspendre ou clôturer un compte en cas de fausse identité, de violation des CGU, de risque sécurité, ou sur demande légitime du Client administrateur de l’Équipe.',
        ],
        en: [
          'Access requires a valid account (verified email) and, depending on the path: a Customer subscription, membership in a subscribed Team, an independent subscription, or partner / freelancer access as granted.',
          'You warrant that the information you provide is accurate and that you keep credentials confidential. Activity under your account is deemed yours unless you promptly report compromise to ' +
            LEGAL_ENTITY.supportEmail +
            '.',
          'The Platform is intended for professional / organised sporting use. Minors may register only with prior authorisation from a parent or legal guardian, who remains responsible for use.',
          'Rovik may suspend or close an account for false identity, ToU breach, security risk, or upon legitimate request from the Team’s Customer administrator.',
        ],
      },
    },
    {
      id: 'roles',
      title: { fr: '3. Rôles et responsabilités', en: '3. Roles and responsibilities' },
      blocks: {
        fr: [
          'Le Client (Équipe) configure les accès, rôles et permissions de ses membres (coureurs, staff, dirigeants, partenaires invités). Il est responsable du respect du droit du travail, du droit sportif et des règles fédérales applicables à son organisation.',
          'Rovik fournit un outil technique. Rovik n’est pas l’employeur des Utilisateurs, ni le donneur d’ordre des vacataires marketplace, ni le conseiller juridique, médical ou fiscal du Client.',
          'Les données saisies par l’Équipe (roster, performances, allergies, GPS, documents, budgets, partenariats, scouting) appartiennent au Client, sous réserve des droits de tiers et des licences nécessaires. Voir aussi Politique de confidentialité et DPA.',
          'L’Utilisateur s’engage à n’utiliser la Plateforme que dans le cadre de ses fonctions légitimes au sein de l’Équipe ou de son activité indépendante déclarée.',
        ],
        en: [
          'The Customer (Team) configures access, roles and permissions for its members (riders, staff, executives, invited partners). It is responsible for complying with employment, sports and federation rules applicable to its organisation.',
          'Rovik provides a technical tool. Rovik is not the Users’ employer, not the contracting principal of marketplace freelancers, and not the Customer’s legal, medical or tax adviser.',
          'Data entered by the Team (roster, performance, allergies, GPS, documents, budgets, partnerships, scouting) belongs to the Customer, subject to third-party rights and required licences. See also Privacy Policy and DPA.',
          'The User agrees to use the Platform only within legitimate Team duties or their declared independent activity.',
        ],
      },
    },
    {
      id: 'acceptable-use',
      title: { fr: '4. Usage acceptable et interdictions', en: '4. Acceptable use and prohibitions' },
      blocks: {
        fr: [
          'Il est interdit de :',
          '• contourner les mesures de sécurité, d’accès ou de facturation ;',
          '• scrapeur, recopier ou extraire massivement le contenu, les modèles d’interface, les algorithmes ou les bases sans autorisation écrite ;',
          '• introduire virus, malware ou charges excessives visant à dégrader le service ;',
          '• usurper l’identité d’autrui ou créer des comptes fictifs à des fins frauduleuses ;',
          '• traiter des données de santé, de mineurs ou de scouting sans base légale et, le cas échéant, sans consentement requis ; le scouting inter-équipes ne peut inclure de données de santé (art. 9) ;',
          '• utiliser la Plateforme pour harceler, discriminer, diffamer ou violer des droits de tiers ;',
          '• revendre, sous-licencier ou mettre à disposition concurrente le service hors contrat Enterprise.',
          'Le scouting et les profils indépendants doivent reposer sur des informations loyales ; le retrait du consentement (lorsqu’applicable) doit être respecté immédiatement. Le suivi discret (watchlist) reste interne à l’Équipe et ne constitue pas un partage vers l’athlète.',
        ],
        en: [
          'You must not:',
          '• bypass security, access or billing controls;',
          '• scrape, copy or bulk-extract content, UI models, algorithms or databases without written permission;',
          '• introduce malware or excessive load intended to degrade the service;',
          '• impersonate others or create fake accounts for fraud;',
          '• process health, minor or scouting data without a lawful basis and any required consent; inter-team scouting must not include health data (Art. 9);',
          '• use the Platform to harass, discriminate, defame or infringe third-party rights;',
          '• resell, sublicense or competitively redistribute the service outside an Enterprise agreement.',
          'Scouting and independent profiles must be based on fair information; withdrawal of consent (where applicable) must be honoured immediately. Watchlist remains internal to the Team and is not a share toward the athlete.',
        ],
      },
    },
    {
      id: 'marketplace',
      title: { fr: '5. Marketplace missions (vacataires)', en: '5. Mission marketplace (freelancers)' },
      blocks: {
        fr: [
          'La marketplace met en relation des Équipes et des vacataires. Deux régimes distincts s’appliquent.',
          'Régime A — Prestation indépendante : le vacataire agit en travailleur indépendant (micro-entreprise, EI, société…). Lorsqu’un paiement in-app Stripe Connect est activé, Rovik agit comme intermédiaire de paiement (merchant of record) : l’Équipe paie Rovik ; Rovik reverse le net au vacataire après commission. Chaîne de facturation cible : (1) facture Rovik → Équipe pour le montant mission (GMV) ; (2) facture vacataire → Rovik pour le net (GMV moins commission). Les reçus Stripe ne remplacent pas ces factures.',
          'Régime B — Emploi (CDD d’usage, CDI, apprentissage, stage…) : l’Équipe demeure seule employeur. Le paiement Connect est interdit ; seuls le matching et le suivi sont proposés. Contrat de travail, bulletins de paie et déclarations sociales restent à la charge exclusive de l’Équipe.',
          'Aucun lien de subordination n’est créé entre Rovik et le vacataire. L’Équipe et le vacataire restent responsables de la qualification juridique exacte de la relation et du respect du droit du travail, du sport et des obligations fiscales / URSSAF. Un usage détourné du régime A pour masquer un salariat engage leur responsabilité ; Rovik peut suspendre l’accès Connect.',
          'Commission indicative lorsque le paiement in-app est actif : 12 % du GMV (Compétition / Continental / Élite), 10 % (Pro / Performance), sous réserve de minimum / plafond publiés — détail en CGV. Soft-launch : matching only si les flags paiement ne sont pas activés ; les règlements se font alors hors plateforme.',
          'Les litiges d’exécution (qualité, horaires, annulation) sont d’abord traités entre Équipe et vacataire. Rovik peut, sans obligation, faciliter une médiation.',
          'Doctrine détaillée : documentation interne Marketplace missions — cadre fiscal & social (à valider avocat).',
        ],
        en: [
          'The marketplace matches Teams and freelancers. Two distinct regimes apply.',
          'Regime A — Independent contracting: the freelancer acts as an independent worker (sole trader, company, etc.). When in-app Stripe Connect payment is enabled, Rovik acts as payment intermediary (merchant of record): the Team pays Rovik; Rovik pays out the net to the freelancer after the platform fee. Target invoice chain: (1) Rovik → Team for the mission amount (GMV); (2) freelancer → Rovik for the net (GMV minus fee). Stripe receipts are not substitutes for those invoices.',
          'Regime B — Employment (fixed-term / permanent / apprenticeship / internship…): the Team alone remains the employer. Connect payouts are forbidden; only matching and tracking are offered. Employment contracts, payslips and social filings remain solely the Team’s responsibility.',
          'No employment relationship is created between Rovik and the freelancer. Team and freelancer remain responsible for the correct legal characterisation and for labour, sports, tax and social-security compliance. Misusing Regime A to disguise employment engages their liability; Rovik may suspend Connect access.',
          'Indicative platform fee when in-app payment is on: 12% of GMV (Competition / Continental / Elite), 10% (Pro / Performance), subject to published minimums / caps — see Terms of Sale. Soft-launch: matching-only if payment flags are off; settlements then occur off-platform.',
          'Performance disputes (quality, hours, cancellation) are primarily between Team and freelancer. Rovik may, without obligation, facilitate mediation.',
          'Detailed doctrine: internal Marketplace missions — tax & labour framework (to be counsel-reviewed).',
        ],
      },
    },
    {
      id: 'ip',
      title: { fr: '6. Propriété intellectuelle', en: '6. Intellectual property' },
      blocks: {
        fr: [
          'La Plateforme, son code, interfaces, marques, logos, documentation, modèles et savoir-faire restent la propriété exclusive de Rovik ou de ses concédants. Aucune cession de droits n’est opérée hors licence d’usage limitée, non exclusive, non cessible, pour la durée de l’accès autorisé.',
          'Les contenus et données Client restent la propriété du Client. Le Client concède à Rovik une licence mondiale, limitée, pour héberger, traiter, sauvegarder et afficher ces contenus uniquement afin de fournir le service.',
          'Les modèles de conventions / CERFA générés sont des aides à la rédaction ; ils ne remplacent pas un conseil juridique. Le Client doit les faire valider avant signature.',
        ],
        en: [
          'The Platform, its code, interfaces, trademarks, logos, documentation, templates and know-how remain the exclusive property of Rovik or its licensors. No IP assignment occurs beyond a limited, non-exclusive, non-transferable licence for the duration of authorised access.',
          'Customer content and data remain Customer property. The Customer grants Rovik a worldwide, limited licence to host, process, back up and display that content solely to provide the service.',
          'Generated agreement / CERFA templates are drafting aids only; they are not legal advice. The Customer must have them reviewed before signing.',
        ],
      },
    },
    {
      id: 'confidentiality',
      title: { fr: '7. Confidentialité (NDA utilisateur)', en: '7. Confidentiality (user NDA)' },
      blocks: {
        fr: [
          'L’Utilisateur s’engage à ne pas divulguer, reproduire ou exploiter commercialement les informations non publiques de Rovik (interfaces non publiées, algorithmes, roadmap, tarifs non publics, données techniques, contenus d’autres équipes auxquels il n’a pas droit).',
          'Cet engagement dure pendant l’utilisation et cinq (5) ans après la fin de l’accès, sauf secrets d’affaires pour lesquels la protection légale plus longue s’applique.',
          'Les obligations ne portent pas sur les informations déjà publiques, reçues licitement d’un tiers sans devoir de confidentialité, ou exigées par la loi / une autorité (avec information préalable de Rovik lorsque cela est légalement possible).',
        ],
        en: [
          'The User agrees not to disclose, reproduce or commercially exploit Rovik’s non-public information (unpublished interfaces, algorithms, roadmap, non-public pricing, technical data, or other teams’ content without entitlement).',
          'This obligation lasts during use and for five (5) years after access ends, except for trade secrets protected for a longer statutory period.',
          'It does not cover information that is already public, lawfully received from a third party without a duty of confidence, or required by law / authority (with prior notice to Rovik where legally permitted).',
        ],
      },
    },
    {
      id: 'availability',
      title: { fr: '8. Disponibilité, maintenance et évolutions', en: '8. Availability, maintenance and changes' },
      blocks: {
        fr: [
          'Rovik s’efforce d’assurer une disponibilité raisonnable de la Plateforme (objectif indicatif 99 % hors maintenance planifiée et cas de force majeure), sans garantie absolue de continuité ininterrompue sauf SLA Enterprise écrit.',
          'Des maintenances peuvent être programmées ; des évolutions de fonctionnalités peuvent intervenir. Les fonctionnalités beta sont fournies « en l’état », sans engagement de disponibilité.',
          'Rovik peut modifier les présentes CGU. La version applicable est celle affichée sur /legal/cgu avec son numéro de version. Les changements matériels seront notifiés (email ou in-app) avec un préavis raisonnable lorsque la loi l’exige.',
        ],
        en: [
          'Rovik endeavours to provide reasonable Platform availability (indicative 99% target excluding planned maintenance and force majeure), without an absolute uptime warranty unless a written Enterprise SLA applies.',
          'Maintenance may be scheduled; features may evolve. Beta features are provided “as is”, with no availability commitment.',
          'Rovik may amend these ToU. The applicable version is the one shown at /legal/cgu with its version number. Material changes will be notified (email or in-app) with reasonable notice where required by law.',
        ],
      },
    },
    {
      id: 'liability',
      title: { fr: '9. Responsabilité', en: '9. Liability' },
      blocks: {
        fr: [
          'La Plateforme est un outil d’aide à la décision. Les décisions sportives, médicales, logistiques, financières ou juridiques restent de la responsabilité exclusive du Client et des Utilisateurs.',
          'Dans les limites permises par la loi, Rovik n’est pas responsable des dommages indirects (perte de chance, manque à gagner, perte de données non imputable à une faute grave de Rovik, atteinte à l’image).',
          'La responsabilité totale de Rovik au titre des CGU, pour tout fait générateur, est plafonnée au montant des redevances effectivement payées par le Client à Rovik au cours des douze (12) mois précédant le fait générateur (ou, pour un Utilisateur sans abonnement propre, à 100 €).',
          'Rien dans les CGU n’exclut la responsabilité pour faute lourde ou dolosive, atteinte à la vie / intégrité physique, ou autres responsabilités d’ordre public non limitables.',
        ],
        en: [
          'The Platform is a decision-support tool. Sporting, medical, logistics, financial and legal decisions remain the sole responsibility of the Customer and Users.',
          'To the fullest extent permitted by law, Rovik is not liable for indirect damages (loss of opportunity, lost profits, data loss not caused by Rovik’s gross negligence, reputational harm).',
          'Rovik’s aggregate liability under the ToU for any claim is capped at the fees actually paid by the Customer to Rovik in the twelve (12) months preceding the claim (or, for a User without their own subscription, €100).',
          'Nothing in the ToU excludes liability for wilful misconduct or gross negligence, death / personal injury, or other non-excludable mandatory liabilities.',
        ],
      },
    },
    {
      id: 'termination',
      title: { fr: '10. Suspension et fin d’accès', en: '10. Suspension and end of access' },
      blocks: {
        fr: [
          'L’Utilisateur peut cesser d’utiliser la Plateforme à tout moment. La résiliation d’abonnement suit les CGV.',
          'En cas de violation grave, Rovik peut suspendre immédiatement l’accès et, après notification, supprimer le compte.',
          'À la fin de l’accès, le Client dispose des fonctionnalités d’export prévues ; la purge des données suit la Politique de confidentialité et le DPA (délai indicatif 30 jours après clôture effective, sous réserve d’obligations légales de conservation).',
        ],
        en: [
          'The User may stop using the Platform at any time. Subscription termination follows the Terms of Sale.',
          'For serious breach, Rovik may immediately suspend access and, after notice, delete the account.',
          'On access end, the Customer may use available export features; data purge follows the Privacy Policy and DPA (indicative 30 days after effective closure, subject to legal retention duties).',
        ],
      },
    },
    {
      id: 'law',
      title: { fr: '11. Droit applicable et litiges', en: '11. Governing law and disputes' },
      blocks: {
        fr: [
          'Les CGU sont régies par le ' +
            LEGAL_ENTITY.governingLaw.fr +
            '. En cas de litige, les parties recherchent une solution amiable. À défaut, compétence exclusive des ' +
            LEGAL_ENTITY.courts.fr +
            ', sous réserve des règles impératives de protection du consommateur le cas échéant (la Plateforme étant principalement B2B).',
          'Contact : ' +
            LEGAL_ENTITY.contactEmail +
            ' · Privacy : ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
        en: [
          'These ToU are governed by ' +
            LEGAL_ENTITY.governingLaw.en +
            '. Parties will seek an amicable resolution. Failing that, exclusive jurisdiction lies with the ' +
            LEGAL_ENTITY.courts.en +
            ', subject to any mandatory consumer-protection rules (the Platform is primarily B2B).',
          'Contact: ' +
            LEGAL_ENTITY.contactEmail +
            ' · Privacy: ' +
            LEGAL_ENTITY.privacyEmail +
            '.',
        ],
      },
    },
  ],
};

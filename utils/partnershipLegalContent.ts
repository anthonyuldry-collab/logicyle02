import { IncomeCategory } from '../types';
import {
  CerfaReceiptData,
  PartnershipConventionData,
  getConventionType,
} from './partnershipDocumentUtils';
import { formatFinancialDate } from './financialUtils';
import { formatPdfAmount, sanitizePdfText } from './pdfLayoutUtils';

export interface LegalArticle {
  number: number;
  title: string;
  paragraphs: string[];
}

export interface CerfaField {
  label: string;
  value: string;
  fullWidth?: boolean;
}

export interface CerfaSection {
  title: string;
  intro?: string;
  fields: CerfaField[];
  paragraphs?: string[];
  checkboxes?: { label: string; checked: boolean }[];
}

const PLACEHOLDER = '……………………………………………………';

function fmt(amount: number, locale = 'fr-FR'): string {
  return formatPdfAmount(amount, locale);
}

function fmtDate(date?: string, locale = 'fr-FR'): string {
  if (!date) return PLACEHOLDER;
  return formatFinancialDate(date, locale);
}

function partyLine(value?: string): string {
  return value?.trim() || PLACEHOLDER;
}

export function buildTeamPartyLines(data: PartnershipConventionData): string[] {
  return [
    data.team.name,
    data.team.address,
    data.team.siret ? `SIRET : ${data.team.siret}` : undefined,
    data.team.rna ? `RNA : ${data.team.rna}` : undefined,
    data.team.representative
      ? `${data.team.representative}${data.team.representativeTitle ? `, ${data.team.representativeTitle}` : ''}`
      : undefined,
  ].filter((l): l is string => Boolean(l)).map(sanitizePdfText);
}

export function buildPartnerPartyLines(data: PartnershipConventionData): string[] {
  return [
    data.partner.companyName,
    data.partner.legalForm,
    data.partner.address,
    data.partner.siret ? `SIRET : ${data.partner.siret}` : undefined,
    data.partner.representative ? `Représentant : ${data.partner.representative}` : undefined,
    data.partner.email,
    data.partner.phone,
  ].filter((l): l is string => Boolean(l)).map(sanitizePdfText);
}

export function buildConventionPreamble(
  data: PartnershipConventionData,
  category: IncomeCategory,
  locale: string
): string[] {
  const type = getConventionType(category);
  const partner = data.partner.companyName;
  const team = data.team.name;

  if (type === 'mecenat') {
    return [
      `Considérant que ${team} exerce une activité d'intérêt général au sens de l'article 200 du code général des impôts et de l'article 238 bis du code général des impôts ;`,
      `Considérant que ${partner} souhaite soutenir cette activité par un acte de mécénat sans contrepartie directe et disproportionnée, dans les conditions prévues par la loi n° 2003-709 du 1er août 2003 relative au mécénat, à la générosité publique et à la vie associative ;`,
      'Il a été convenu ce qui suit :',
    ];
  }

  if (type === 'subvention') {
    return [
      `Considérant que ${partner} a accepté d'accorder une aide financière à ${team} pour le projet « ${data.partnership.description} » ;`,
      'Considérant que les Parties souhaitent définir les modalités de versement, d\'utilisation et de contrôle de cette subvention ;',
      'Il a été convenu ce qui suit :',
    ];
  }

  return [
    `Considérant l'intérêt mutuel des Parties à établir un partenariat sportif et commercial au titre de la période du ${fmtDate(data.partnership.startDate, locale)} au ${fmtDate(data.partnership.endDate, locale)} ;`,
    `Considérant que ${partner} souhaite associer son image à celle de ${team} et soutenir ses activités sportives ;`,
    'Il a été convenu ce qui suit :',
  ];
}

export function buildConventionArticles(
  data: PartnershipConventionData,
  category: IncomeCategory,
  locale = 'fr-FR'
): LegalArticle[] {
  const type = getConventionType(category);
  if (type === 'mecenat') return buildMecenatArticles(data, locale);
  if (type === 'subvention') return buildSubventionArticles(data, locale);
  return buildSponsoringArticles(data, locale);
}

function buildSponsoringArticles(data: PartnershipConventionData, locale: string): LegalArticle[] {
  const counterparts = data.partnership.counterparts ||
    '- Logo du Partenaire sur les maillots de l\'équipe (placement défini en annexe)\n- Visibilité sur le site internet et les réseaux sociaux de l\'Équipe\n- Invitation à un minimum d\'un événement officiel par trimestre\n- Mention « Partenaire officiel » sur les communiqués de presse';

  return [
    {
      number: 1,
      title: 'Objet',
      paragraphs: [
        `La présente convention a pour objet de définir les conditions dans lesquelles ${data.partner.companyName} (ci-après « le Partenaire ») apporte son soutien financier et sa visibilité à ${data.team.name} (ci-après « l'Équipe ») dans le cadre de : ${data.partnership.description}.`,
        'Le Partenariat s\'inscrit dans le cadre des activités sportives, de communication et de représentation de l\'Équipe pour la durée définie à l\'article 8.',
      ],
    },
    {
      number: 2,
      title: 'Engagements financiers du Partenaire',
      paragraphs: [
        `Le Partenaire s'engage à verser à l'Équipe une contribution financière d'un montant total de ${fmt(data.partnership.amount, locale)} TTC, payable selon les modalités suivantes :`,
        data.partnership.paymentTerms ||
          '— 50 % à la signature de la présente convention ;\n— 50 % au plus tard à mi-période contractuelle, sur présentation de la facture correspondante.',
        'Le versement sera effectué par virement bancaire sur le compte de l\'Équipe, dont les coordonnées seront communiquées par l\'Équipe. Tout retard de paiement supérieur à trente (30) jours pourra entraîner la suspension des contreparties, sans préjudice des intérêts de retard au taux légal.',
      ],
    },
    {
      number: 3,
      title: 'Contreparties accordées au Partenaire',
      paragraphs: [
        'En contrepartie de sa contribution, l\'Équipe s\'engage à fournir au Partenaire les prestations suivantes :',
        counterparts,
        'Le détail des emplacements logo, formats graphiques et planning de publication figure en Annexe 1. Toute modification substantielle devra faire l\'objet d\'un avenant écrit signé par les Parties.',
      ],
    },
    {
      number: 4,
      title: 'Obligations de l\'Équipe',
      paragraphs: [
        'L\'Équipe s\'engage à :',
        '— Utiliser la contribution exclusivement pour le financement de ses activités sportives et de fonctionnement liées au partenariat ;',
        '— Fournir les contreparties dans les délais convenus et conformément aux standards de qualité habituels de l\'Équipe ;',
        '— Informer le Partenaire de tout événement majeur (résultats sportifs, changement d\'effectif, course médiatisée) dans un délai raisonnable ;',
        '— Transmettre un rapport semestriel d\'exécution du partenariat (visibilité réalisée, événements, captation photo).',
      ],
    },
    {
      number: 5,
      title: 'Propriété intellectuelle et droit à l\'image',
      paragraphs: [
        'Chaque Partie conserve l\'entière propriété de ses signes distinctifs (marques, logos, noms commerciaux). Les Parties s\'accordent mutuellement une licence non exclusive, gratuite et limitée à la durée de la convention, pour l\'utilisation de leurs logos respectifs dans le cadre strict du partenariat.',
        'L\'Équipe autorise le Partenaire à utiliser des visuels officiels de l\'Équipe (photos d\'équipe, logo) pour sa communication interne et externe liée au partenariat. Toute utilisation à des fins publicitaires payantes nécessite l\'accord préalable écrit de l\'Équipe.',
        'Le Partenaire s\'interdit toute utilisation de l\'image des coureurs ou du staff en dehors du cadre défini aux présentes, conformément aux dispositions du code civil relatives au droit à l\'image.',
      ],
    },
    {
      number: 6,
      title: 'Validation des supports de communication',
      paragraphs: [
        'Les supports de communication intégrant le logo du Partenaire (maillots, véhicules, bannières, publications) seront soumis à validation préalable du Partenaire dans un délai de dix (10) jours ouvrés suivant leur transmission. L\'absence de réponse dans ce délai vaudra acceptation tacite.',
        'L\'Équipe s\'engage à respecter le guide de charte graphique fourni par le Partenaire. Le Partenaire ne pourra refuser une validation pour des motifs non liés à l\'image de marque ou à la conformité réglementaire.',
      ],
    },
    {
      number: 7,
      title: 'Exclusivité',
      paragraphs: [
        'Sauf stipulation contraire en Annexe, le présent partenariat ne confère pas au Partenaire d\'exclusivité sectorielle. L\'Équipe demeure libre de conclure d\'autres partenariats, sous réserve de ne pas porter atteinte aux engagements de visibilité du Partenaire.',
        'Si une exclusivité sectorielle est convenue, ses termes (secteur, zone géographique, durée) seront précisés en Annexe 2.',
      ],
    },
    {
      number: 8,
      title: 'Durée',
      paragraphs: [
        data.partnership.startDate && data.partnership.endDate
          ? `La présente convention est conclue pour une durée déterminée du ${fmtDate(data.partnership.startDate, locale)} au ${fmtDate(data.partnership.endDate, locale)} inclus.`
          : 'La présente convention est conclue pour une durée d\'une (1) saison sportive, sauf résiliation anticipée dans les conditions de l\'article 9.',
        'À l\'expiration de la durée initiale, la convention pourra être renouvelée par avenant signé par les deux Parties, au plus tard trente (30) jours avant l\'échéance.',
      ],
    },
    {
      number: 9,
      title: 'Résiliation',
      paragraphs: [
        'En cas de manquement grave de l\'une des Parties à ses obligations, l\'autre Partie pourra résilier la convention de plein droit quinze (15) jours après l\'envoi d\'une mise en demeure restée sans effet, par lettre recommandée avec accusé de réception.',
        'Constitue notamment un manquement grave : le non-paiement de la contribution à l\'échéance convenue, la non-exécution répétée des contreparties, ou l\'atteinte grave à l\'image de l\'autre Partie.',
        'En cas de résiliation anticipée imputable au Partenaire, les sommes déjà versées restent acquises à l\'Équipe au prorata des contreparties exécutées. En cas de résiliation imputable à l\'Équipe, les sommes non justifiées par des prestations exécutées seront restituées au Partenaire.',
      ],
    },
    {
      number: 10,
      title: 'Confidentialité',
      paragraphs: [
        'Les Parties s\'engagent à garder confidentielles les informations échangées dans le cadre de la présente convention, notamment les conditions financières, pendant toute la durée de la convention et pendant une période de deux (2) ans après son expiration.',
        'Ne sont pas considérées comme confidentielles les informations déjà publiques ou dont la divulgation est imposée par la loi ou une autorité judiciaire.',
      ],
    },
    {
      number: 11,
      title: 'Protection des données personnelles (RGPD)',
      paragraphs: [
        'Chaque Partie traite les données personnelles échangées dans le cadre du partenariat conformément au Règlement (UE) 2016/679 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée.',
        'Les données sont collectées pour la gestion du partenariat, la facturation et la communication. Les personnes concernées disposent d\'un droit d\'accès, de rectification, d\'effacement, de limitation, d\'opposition et de portabilité, exerçable auprès de la Partie responsable du traitement.',
      ],
    },
    {
      number: 12,
      title: 'Responsabilité',
      paragraphs: [
        'Chaque Partie est responsable des dommages causés à l\'autre du fait d\'un manquement à ses obligations contractuelles. La responsabilité de l\'Équipe est limitée au montant total de la contribution versée au titre de la présente convention, sauf faute lourde ou dolosive.',
        'Aucune Partie ne pourra être tenue responsable des conséquences d\'un événement de force majeure au sens de l\'article 1218 du Code civil.',
      ],
    },
    {
      number: 13,
      title: 'Force majeure',
      paragraphs: [
        'La force majeure suspend les obligations des Parties pour la durée de l\'événement. Si l\'événement se prolonge au-delà de soixante (60) jours, chaque Partie pourra résilier la convention sans indemnité, par notification écrite.',
        'Sont notamment considérés comme cas de force majeure : catastrophe naturelle, pandémie, décision administrative empêchant la tenue d\'épreuves sportives, grève générale affectant les moyens de transport.',
      ],
    },
    {
      number: 14,
      title: 'Droit applicable et litiges',
      paragraphs: [
        'La présente convention est soumise au droit français.',
        'Les Parties s\'engagent à rechercher une solution amiable en cas de différend. À défaut d\'accord dans un délai de trente (30) jours, le litige sera soumis à la compétence exclusive des tribunaux du ressort du siège social de l\'Équipe, sauf règles impératives contraires.',
      ],
    },
    {
      number: 15,
      title: 'Dispositions diverses',
      paragraphs: [
        'La nullité d\'une clause n\'affectera pas la validité des autres dispositions. Toute modification de la convention devra faire l\'objet d\'un avenant signé par les deux Parties.',
        'La présente convention, incluant le cas échéant ses annexes, constitue l\'intégralité de l\'accord entre les Parties et remplace tout accord antérieur portant sur le même objet.',
        data.partnership.notes ? `Observations particulières : ${data.partnership.notes}` : 'Fait en deux exemplaires originaux, dont un remis à chaque Partie.',
      ],
    },
  ];
}

function buildMecenatArticles(data: PartnershipConventionData, locale: string): LegalArticle[] {
  return [
    {
      number: 1,
      title: 'Objet du mécénat',
      paragraphs: [
        `La présente convention a pour objet de définir les conditions dans lesquelles ${data.partner.companyName} (ci-après « le Mécène ») apporte un soutien financier à ${data.team.name} (ci-après « l'Organisme bénéficiaire ») au titre du mécénat d'entreprise, conformément à l'article 238 bis du code général des impôts.`,
        `Le soutien est accordé pour : ${data.partnership.description}.`,
      ],
    },
    {
      number: 2,
      title: 'Montant et modalités du versement',
      paragraphs: [
        `Le Mécène s'engage à verser la somme de ${fmt(data.partnership.amount, locale)} au profit de l'Organisme bénéficiaire.`,
        data.partnership.paymentTerms ||
          'Le versement sera effectué en une seule fois dans un délai de trente (30) jours suivant la signature de la présente convention, par virement bancaire.',
        'L\'Organisme bénéficiaire adressera au Mécène un reçu fiscal conforme au modèle CERFA n° 16216*01 dans les conditions de l\'article 238 bis du CGI.',
      ],
    },
    {
      number: 3,
      title: 'Affectation des fonds',
      paragraphs: [
        'Les fonds versés seront affectés exclusivement au financement des activités de l\'Organisme bénéficiaire conformes à son objet social',
        data.team.object ? `, à savoir : ${data.team.object}` : '.',
        'L\'Organisme bénéficiaire s\'engage à ne pas utiliser les fonds à des fins de distribution de dividendes, de rémunération disproportionnée de dirigeants, ou d\'activités à but lucratif incompatible avec son statut associatif.',
      ],
    },
    {
      number: 4,
      title: 'Contreparties et conformité fiscale',
      paragraphs: [
        'Conformément à la réglementation fiscale applicable au mécénat, les contreparties accordées au Mécène doivent rester proportionnées au montant du versement et ne pas constituer une contrepartie directe et disproportionnée au sens de l\'administration fiscale.',
        data.partnership.counterparts
          ? `Les contreparties convenues sont les suivantes :\n${data.partnership.counterparts}`
          : 'Les contreparties se limitent à la reconnaissance du mécénat sur les supports de communication de l\'Organisme bénéficiaire, dans une proportion conforme aux usages du secteur associatif et sportif.',
        'Le Mécène reconnaît que le bénéfice de la réduction d\'impôt prévue à l\'article 238 bis du CGI est subordonné au respect de ces conditions et à la remise du reçu fiscal.',
      ],
    },
    {
      number: 5,
      title: 'Obligations de l\'Organisme bénéficiaire',
      paragraphs: [
        'L\'Organisme bénéficiaire s\'engage à :',
        '— Établir et remettre au Mécène un reçu fiscal (CERFA n° 16216*01) attestant du versement ;',
        '— Fournir un rapport d\'utilisation des fonds dans les six (6) mois suivant la clôture de l\'exercice ou de la période couverte ;',
        '— Informer le Mécène de toute modification affectant sa qualité d\'organisme d\'intérêt général ;',
        '— Conserver les justificatifs d\'emploi des fonds pendant une durée de six (6) ans à compter du versement.',
      ],
    },
    {
      number: 6,
      title: 'Qualité d\'organisme d\'intérêt général',
      paragraphs: [
        `L'Organisme bénéficiaire déclare être un organisme d'intérêt général au sens des articles 200 et 238 bis du code général des impôts${data.team.object ? `, poursuivant l'objet suivant : ${data.team.object}` : ''}.`,
        data.team.rna
          ? `Il est enregistré au Répertoire National des Associations sous le n° ${data.team.rna}.`
          : 'Il s\'engage à fournir au Mécène toute attestation justifiant de cette qualité sur demande.',
      ],
    },
    {
      number: 7,
      title: 'Durée',
      paragraphs: [
        data.partnership.startDate && data.partnership.endDate
          ? `La présente convention couvre la période du ${fmtDate(data.partnership.startDate, locale)} au ${fmtDate(data.partnership.endDate, locale)}.`
          : 'La convention prend effet à sa date de signature pour la durée de l\'exercice en cours.',
        'Les obligations de reporting et de conservation des pièces subsistent après l\'expiration de la convention.',
      ],
    },
    {
      number: 8,
      title: 'Résiliation',
      paragraphs: [
        'En cas de non-respect par l\'Organisme bénéficiaire de ses obligations, notamment l\'affectation des fonds ou la délivrance du reçu fiscal, le Mécène pourra suspendre tout versement complémentaire et demander la restitution des sommes non employées conformément à leur destination.',
        'La résiliation ne remet pas en cause les reçus fiscaux déjà délivrés pour des versements effectivement reçus, sous réserve de conformité avec la réglementation fiscale.',
      ],
    },
    {
      number: 9,
      title: 'Transparence et obligations déclaratives',
      paragraphs: [
        'Les Parties déclarent ne pas être dans une situation interdisant les conventions prévues par la loi n° 2016-1691 du 9 décembre 2016 (loi Sapin II) et ses textes d\'application.',
        'Le Mécène déclare le versement dans les conditions prévues par l\'article 238 bis du CGI et conserve le reçu fiscal pour justifier de la réduction d\'impôt.',
      ],
    },
    {
      number: 10,
      title: 'Protection des données et confidentialité',
      paragraphs: [
        'Les données personnelles échangées sont traitées conformément au RGPD. Les conditions financières de la convention sont confidentielles, sauf obligation légale de publication.',
      ],
    },
    {
      number: 11,
      title: 'Droit applicable',
      paragraphs: [
        'La convention est soumise au droit français. Les tribunaux du ressort du siège de l\'Organisme bénéficiaire sont seuls compétents, sauf disposition impérative contraire.',
        data.partnership.notes ? `Observations : ${data.partnership.notes}` : 'Fait en deux exemplaires originaux.',
      ],
    },
  ];
}

function buildSubventionArticles(data: PartnershipConventionData, locale: string): LegalArticle[] {
  return [
    {
      number: 1,
      title: 'Objet de la subvention',
      paragraphs: [
        `Le Financeur accorde au Bénéficiaire une subvention d'un montant de ${fmt(data.partnership.amount, locale)} pour le projet : ${data.partnership.description}.`,
        'La subvention est accordée à titre de soutien à une activité d\'intérêt général et ne constitue pas une rémunération de prestations commerciales.',
      ],
    },
    {
      number: 2,
      title: 'Versement',
      paragraphs: [
        data.partnership.paymentTerms ||
          'Le versement sera effectué en une ou deux tranches selon calendrier convenu entre les Parties, sur présentation des documents justificatifs requis.',
        'Le Bénéficiaire adressera une demande de paiement accompagnée de la présente convention signée et, le cas échéant, du budget prévisionnel du projet.',
      ],
    },
    {
      number: 3,
      title: 'Utilisation des fonds',
      paragraphs: [
        'Les fonds de la subvention sont affectés exclusivement au projet désigné à l\'article 1. Toute modification d\'affectation supérieure à 10 % du montant total doit être approuvée par écrit par le Financeur.',
        'Le Bénéficiaire s\'engage à tenir une comptabilité distincte ou des pièces justificatives permettant de suivre l\'emploi de la subvention.',
      ],
    },
    {
      number: 4,
      title: 'Obligations de reporting',
      paragraphs: [
        data.partnership.counterparts ||
          '— Rapport d\'activité à mi-parcours et en fin de projet ;\n— État récapitulatif des dépenses engagées ;\n— Justificatifs comptables (factures, relevés bancaires) sur demande du Financeur.',
        'Les rapports seront transmis dans un délai de trente (30) jours suivant la fin de la période couverte.',
      ],
    },
    {
      number: 5,
      title: 'Visibilité du Financeur',
      paragraphs: [
        'Le Bénéficiaire mentionnera le Financeur sur les supports de communication relatifs au projet financé, selon les modalités définies en Annexe ou dans le dossier de demande initial.',
      ],
    },
    {
      number: 6,
      title: 'Durée',
      paragraphs: [
        data.partnership.startDate && data.partnership.endDate
          ? `Du ${fmtDate(data.partnership.startDate, locale)} au ${fmtDate(data.partnership.endDate, locale)}.`
          : 'Pour la durée nécessaire à la réalisation du projet, dans la limite de douze (12) mois à compter de la signature.',
      ],
    },
    {
      number: 7,
      title: 'Révocation et restitution',
      paragraphs: [
        'En cas de non-respect des obligations, de cessation d\'activité du Bénéficiaire, ou d\'emploi non conforme des fonds, le Financeur pourra exiger la restitution totale ou partielle de la subvention versée, après mise en demeure restée infructueuse pendant trente (30) jours.',
        'Les sommes à restituer seront majorées des intérêts légaux à compter de la date du versement initial.',
      ],
    },
    {
      number: 8,
      title: 'Contrôle',
      paragraphs: [
        'Le Financeur se réserve le droit de procéder à tout contrôle utile sur l\'emploi de la subvention, sur pièces et sur place, moyennant un préavis raisonnable.',
        'Le Bénéficiaire s\'engage à faciliter ces contrôles et à répondre à toute demande d\'information dans un délai de quinze (15) jours.',
      ],
    },
    {
      number: 9,
      title: 'Droit applicable',
      paragraphs: [
        'Droit français. Tribunal compétent : ressort du siège du Financeur.',
        data.partnership.notes ? `Observations : ${data.partnership.notes}` : 'Fait en deux exemplaires originaux.',
      ],
    },
  ];
}

export function buildCerfa16216Sections(data: CerfaReceiptData, locale = 'fr-FR'): CerfaSection[] {
  const b = data.beneficiary;
  const d = data.donor;
  const v = data.donation;

  return [
    {
      title: 'A — Organisme bénéficiaire du mécénat',
      intro: 'Organisme d\'intérêt général au sens de l\'article 238 bis du code général des impôts',
      fields: [
        { label: 'Dénomination ou raison sociale', value: partyLine(b.name), fullWidth: true },
        { label: 'Adresse du siège social', value: partyLine(b.address), fullWidth: true },
        { label: 'N° SIRET / SIREN', value: partyLine(b.siret) },
        { label: 'N° RNA (association)', value: partyLine(b.rna) },
        { label: 'Objet statutaire / activité', value: partyLine(b.object), fullWidth: true },
        { label: 'Nom et qualité du signataire', value: `${partyLine(b.representative)} — ${partyLine(b.representativeTitle)}`, fullWidth: true },
      ],
      checkboxes: [
        { label: 'Organisme d\'intérêt général (article 200 / 238 bis CGI)', checked: b.isGeneralInterest },
        { label: 'Organisme ayant pour objet la défense de l\'environnement (article 238 bis-0 A CGI)', checked: false },
      ],
      paragraphs: b.decree ? [`Référence agrément / arrêté : ${b.decree}`] : undefined,
    },
    {
      title: 'B — Entreprise donatrice (Mécène)',
      fields: [
        { label: 'Dénomination ou raison sociale', value: partyLine(d.companyName), fullWidth: true },
        { label: 'Adresse du siège social', value: partyLine(d.address), fullWidth: true },
        { label: 'N° SIREN / SIRET', value: partyLine(d.siret) },
        { label: 'Nom et qualité du représentant', value: partyLine(d.representative), fullWidth: true },
      ],
    },
    {
      title: 'C — Versement effectué',
      fields: [
        { label: 'Montant du versement (en euros)', value: fmt(v.amount, locale) },
        { label: 'Date du versement', value: fmtDate(v.date, locale) },
        { label: 'Forme du mécénat', value: v.form },
        { label: 'Mode de paiement', value: v.form === 'numéraire' ? 'Virement bancaire / chèque' : v.form },
        { label: 'Objet / affectation du versement', value: partyLine(v.purpose), fullWidth: true },
      ],
    },
    {
      title: 'D — Attestation de l\'organisme bénéficiaire',
      fields: [],
      paragraphs: [
        `Je soussigné(e), ${partyLine(b.representative)}, agissant en qualité de ${partyLine(b.representativeTitle)} de l'organisme ${partyLine(b.name)}, certifie sur l'honneur que :`,
        '1° L\'organisme dont je relève est un organisme d\'intérêt général au sens de l\'article 238 bis du code général des impôts ;',
        '2° L\'organisme poursuit des activités non lucratives et ne distribue pas de bénéfices à des tiers ;',
        `3° Un versement d'un montant de ${fmt(v.amount, locale)} a été reçu le ${fmtDate(v.date, locale)} de l'entreprise ${partyLine(d.companyName)} ;`,
        '4° Ce versement a été effectué sans contrepartie directe et disproportionnée de la part de l\'organisme bénéficiaire ;',
        `5° Le présent reçu est remis en vue de permettre au mécène de bénéficier de la réduction d'impôt prévue à l'article 238 bis du CGI, dans la limite du plafond de 0,5 % du chiffre d'affaires hors taxes (ou 10 000 € minimum).`,
        `Montant ouvrant droit à réduction d'impôt au taux de ${v.taxReductionRate} % : ${fmt(v.taxReductionAmount, locale)}.`,
      ],
    },
    {
      title: 'E — Certification du représentant légal de l\'entreprise donatrice',
      fields: [],
      paragraphs: [
        `Je soussigné(e), ${partyLine(d.representative)}, représentant légal de ${partyLine(d.companyName)}, certifie exacts les renseignements figurant sur le présent reçu et reconnais avoir effectué le versement déclaré au profit de l'organisme bénéficiaire désigné.`,
        'Le présent reçu est conservé par l\'entreprise donatrice pour justifier de la réduction d\'impôt sur le revenu ou l\'impôt sur les sociétés, selon le cas.',
      ],
    },
    {
      title: 'Mentions légales',
      fields: [],
      paragraphs: [
        'Article 238 bis du code général des impôts : les entreprises soumises à l\'impôt sur les sociétés ou à l\'impôt sur le revenu selon le régime réel peuvent bénéficier d\'une réduction d\'impôt égale à 60 % du montant du versement, dans la limite de 0,5 % du chiffre d\'affaires hors taxes.',
        'Ce reçu ne peut être utilisé qu\'une seule fois. En cas de versement partiel, un reçu complémentaire pourra être établi.',
        'Conservation : le reçu doit être conservé par le donateur pendant six (6) ans à compter de la date du versement.',
      ],
    },
  ];
}

export function buildCerfa11580Sections(data: CerfaReceiptData, locale = 'fr-FR'): CerfaSection[] {
  const b = data.beneficiary;
  const d = data.donor;
  const v = data.donation;

  return [
    {
      title: 'Cadre réservé à l\'organisme bénéficiaire du don',
      fields: [
        { label: 'Dénomination', value: partyLine(b.name), fullWidth: true },
        { label: 'Adresse', value: partyLine(b.address), fullWidth: true },
        { label: 'N° SIRET', value: partyLine(b.siret) },
        { label: 'N° RNA', value: partyLine(b.rna) },
        { label: 'Objet', value: partyLine(b.object), fullWidth: true },
      ],
      checkboxes: [
        { label: 'Organisme d\'intérêt général (art. 200 CGI — dons des particuliers)', checked: b.isGeneralInterest },
        { label: 'Organisme d\'intérêt général (art. 238 bis CGI — dons des entreprises)', checked: b.isGeneralInterest },
        { label: 'Organisme d\'aide aux personnes en difficulté (art. 238 bis CGI)', checked: false },
      ],
    },
    {
      title: 'Cadre réservé au donateur',
      fields: [
        { label: 'Nom / Raison sociale du donateur', value: partyLine(d.companyName), fullWidth: true },
        { label: 'Adresse', value: partyLine(d.address), fullWidth: true },
        { label: 'N° SIRET (personne morale)', value: partyLine(d.siret) },
        { label: 'Représentant légal', value: partyLine(d.representative) },
      ],
      checkboxes: [
        { label: 'Don manuel (virement, chèque, espèces)', checked: v.form === 'numéraire' },
        { label: 'Don par prélèvement automatique', checked: false },
        { label: 'Don en nature', checked: v.form === 'nature' },
        { label: 'Mise à disposition gratuite de personnel ou de biens', checked: v.form === 'mise à disposition' },
      ],
    },
    {
      title: 'Montant du don ou versement',
      fields: [
        { label: 'Montant total (€)', value: fmt(v.amount, locale) },
        { label: 'Date du don / versement', value: fmtDate(v.date, locale) },
        { label: 'Affectation du don', value: partyLine(v.purpose), fullWidth: true },
      ],
      paragraphs: [
        v.form === 'nature'
          ? 'Le don porte sur des biens ou prestations en nature dont la valeur a été estimée contradictoirement entre les parties.'
          : v.form === 'mise à disposition'
            ? 'Le don prend la forme d\'une mise à disposition gratuite de biens ou de personnel.'
            : 'Le don a été effectué sous forme numéraire.',
      ],
    },
    {
      title: 'Attestation de l\'organisme bénéficiaire',
      fields: [],
      paragraphs: [
        `L'organisme ${partyLine(b.name)} certifie avoir reçu de ${partyLine(d.companyName)} un don / versement d'un montant de ${fmt(v.amount, locale)} en date du ${fmtDate(v.date, locale)}.`,
        'Ce don a été effectué sans contrepartie directe ou indirecte au sens des articles 200 et 238 bis du code général des impôts.',
        `Il ouvre droit à une réduction d'impôt calculée conformément à ${v.legalBasis}.`,
        `Montant éligible à réduction d'impôt (${v.taxReductionRate} %) : ${fmt(v.taxReductionAmount, locale)}.`,
        `Le présent reçu est délivré par ${partyLine(b.representative)}, ${partyLine(b.representativeTitle)}, pour servir et valoir ce que de droit.`,
      ],
    },
    {
      title: 'Mentions légales',
      fields: [],
      paragraphs: [
        'Article 200 CGI : réduction d\'impôt de 66 % du montant du don pour les contribuables personnes physiques, dans la limite de 20 % du revenu imposable.',
        'Article 238 bis CGI : réduction d\'impôt de 60 % pour les entreprises, plafonnée à 0,5 % du chiffre d\'affaires hors taxes (minimum 10 000 €).',
        'Le donateur doit conserver le présent reçu pendant six (6) ans. Ce reçu est incessible et ne peut être utilisé qu\'à une seule reprise.',
      ],
    },
  ];
}

export function buildConventionAnnexes(
  data: PartnershipConventionData,
  category: IncomeCategory
): { title: string; content: string[] }[] {
  const annexes: { title: string; content: string[] }[] = [];

  if (category === IncomeCategory.SPONSORING) {
    annexes.push({
      title: 'Annexe 1 — Plan de visibilité et emplacements logo',
      content: [
        'Emplacements prévus : maillot (poitrine / manche), véhicule équipe, site web, réseaux sociaux.',
        'Formats graphiques : vectoriel (AI, EPS, SVG) ou PNG haute définition fournis par le Partenaire.',
        'Planning de publication : minimum 2 publications dédiées par mois sur les réseaux sociaux de l\'Équipe.',
        data.partnership.counterparts || 'Détail des contreparties tel que défini à l\'article 3.',
      ],
    });
    annexes.push({
      title: 'Annexe 2 — Calendrier des événements partenaires',
      content: [
        'Présentation d\'équipe en début de saison.',
        'Invitation VIP à une course sélectionnée par le Partenaire.',
        'Hospitality : accueil du Partenaire sur une étape de course (si applicable).',
      ],
    });
  }

  if (category === IncomeCategory.MECENAT) {
    annexes.push({
      title: 'Annexe — Rapport d\'utilisation des fonds (modèle)',
      content: [
        `Projet financé : ${data.partnership.description}`,
        `Montant total du mécénat : ${fmt(data.partnership.amount)}`,
        'Répartition prévisionnelle : frais sportifs, déplacements, équipement, fonctionnement associatif.',
        'Le rapport définitif sera transmis au Mécène dans les six (6) mois suivant la clôture de l\'exercice.',
      ],
    });
  }

  return annexes;
}

export function buildSignatureBlocks(data: PartnershipConventionData): {
  team: string[];
  partner: string[];
} {
  return {
    team: [
      `Pour ${data.team.name}`,
      partyLine(data.team.representative),
      partyLine(data.team.representativeTitle),
      'Date : ____/____/________',
      'Signature et cachet :',
    ],
    partner: [
      `Pour ${data.partner.companyName}`,
      partyLine(data.partner.representative),
      data.partner.legalForm || 'Représentant légal',
      'Date : ____/____/________',
      'Signature et cachet :',
    ],
  };
}

export function buildCerfaSignatureBlocks(data: CerfaReceiptData): {
  beneficiary: string[];
  donor: string[];
} {
  return {
    beneficiary: [
      'Cachet de l\'organisme bénéficiaire',
      partyLine(data.beneficiary.name),
      partyLine(data.beneficiary.representative),
      partyLine(data.beneficiary.representativeTitle),
      `Fait à : ${PLACEHOLDER}`,
      `Le : ${fmtDate(data.issueDate.slice(0, 10))}`,
      'Signature :',
    ],
    donor: [
      'Le donateur (pour attestation le cas échéant)',
      partyLine(data.donor.companyName),
      partyLine(data.donor.representative),
      'Date : ____/____/________',
      'Signature :',
    ],
  };
}

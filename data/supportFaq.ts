/** FAQ support publique + in-app (FR/EN). */
export type SupportFaqItem = {
  id: string;
  question: { fr: string; en: string };
  answer: { fr: string; en: string };
};

export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  {
    id: 'trial',
    question: {
      fr: 'Comment fonctionne l’essai gratuit ?',
      en: 'How does the free trial work?',
    },
    answer: {
      fr: 'À l’inscription, vous choisissez une formule et enregistrez une carte via Stripe. L’essai démarre immédiatement (14 jours sur Club/Compétition, 30 jours sur Élite/Performance). Le premier prélèvement a lieu à la fin de l’essai si vous ne résiliez pas.',
      en: 'At signup you pick a plan and save a card via Stripe. The trial starts immediately (14 days on Club/Competition, 30 days on Elite/Performance). The first charge happens after the trial unless you cancel.',
    },
  },
  {
    id: 'pricing',
    question: {
      fr: 'Quels sont les tarifs ?',
      en: 'What are the prices?',
    },
    answer: {
      fr: 'Pack héros : Compétition 2 490 €/an (249 €/mois). Club 990 €/an pour démarrer ops. Annuel = 2 mois offerts. 20 fondateurs : −20 % an 1. Autres formules (Élite, Performance, Fédération, Athlète/Staff) sur la page tarifs, en secondaire.',
      en: 'Hero pack: Competition €2,490/yr (€249/mo). Club €990/yr to start ops. Annual = 2 months free. 20 founders: 20% off year one. Other plans (Elite, Performance, Federation, Athlete/Staff) on the pricing page, secondary.',
    },
  },
  {
    id: 'who',
    question: {
      fr: 'Pour qui est Rovik ?',
      en: 'Who is Rovik for?',
    },
    answer: {
      fr: 'DS et clubs de compétition : effectif, calendrier, logistique de course (+ performance dès Compétition).',
      en: 'Race directors and competition clubs: roster, calendar, race logistics (+ performance from Competition).',
    },
  },
  {
    id: 'billing',
    question: {
      fr: 'Comment gérer mon abonnement ou ma facture ?',
      en: 'How do I manage my subscription or invoice?',
    },
    answer: {
      fr: 'Dans Paramètres → Abonnement, utilisez « Gérer la facturation » pour ouvrir le portail Stripe (carte, factures, résiliation). Les membres d’équipe sans droit billing doivent passer par un manager.',
      en: 'In Settings → Subscription, use “Manage billing” to open the Stripe portal (card, invoices, cancellation). Team members without billing rights should ask a manager.',
    },
  },
  {
    id: 'team',
    question: {
      fr: 'Puis-je rejoindre une équipe existante ?',
      en: 'Can I join an existing team?',
    },
    answer: {
      fr: 'Oui : à l’inscription choisissez « Rejoindre une équipe », ou acceptez une invitation par e-mail / lien magique. L’abonnement est alors géré par la structure.',
      en: 'Yes: at signup choose “Join a team”, or accept an email / magic-link invite. Billing is then handled by the organisation.',
    },
  },
  {
    id: 'guarantee',
    question: {
      fr: 'Comment marche la garantie première course ?',
      en: 'How does the first-race guarantee work?',
    },
    answer: {
      fr: 'Abonnement annuel d’équipe : vous renseignez une épreuve réelle (effectif, transport ou hébergement, checklist). Si dans les 14 jours après l’épreuve vous devez reprendre un tableur pour cette même logistique, nous remboursons l’année. Une fois par structure · pas pour les clubs sans calendrier course. Détail : CGV art. 3.1.',
      en: 'Annual team plan: you record a real event (roster, transport or lodging, checklist). If within 14 days after the event you had to revert to a spreadsheet for that same logistics, we refund the year. Once per organisation · not for clubs without a race calendar. Details: Terms of Sale §3.1.',
    },
  },
  {
    id: 'founders',
    question: {
      fr: 'C’est quoi les 20 fondateurs ?',
      en: 'What are the 20 founding teams?',
    },
    answer: {
      fr: 'Les 20 premières structures en abonnement annuel avant juin 2027 ont −20 % la première année, puis la grille publique. Ce n’est pas un early access ouvert ni un prix figé 24 mois : quand les 20 places sont prises, la grille s’applique dès l’an 1.',
      en: 'The first 20 organisations on an annual plan before June 2027 get 20% off year one, then public pricing. This is not open-ended early access or a 24-month lock: when the 20 seats are gone, list price applies from year one.',
    },
  },
  {
    id: 'data',
    question: {
      fr: 'Mes données sont-elles exportables / supprimables (RGPD) ?',
      en: 'Can I export or delete my data (GDPR)?',
    },
    answer: {
      fr: 'Oui. Dans Paramètres → Mon compte vous pouvez exporter vos données et demander la suppression. Pour le détail des traitements, consultez la politique de confidentialité et le DPA.',
      en: 'Yes. In Settings → My account you can export your data and request deletion. For processing details, see the privacy policy and DPA.',
    },
  },
  {
    id: 'support',
    question: {
      fr: 'Comment contacter le support ?',
      en: 'How do I contact support?',
    },
    answer: {
      fr: 'Écrivez à support@logicycle.app (réponse sous 2 jours ouvrés en période beta). Indiquez votre e-mail de compte et une description courte du problème.',
      en: 'Email support@logicycle.app (reply within 2 business days during beta). Include your account email and a short description of the issue.',
    },
  },
];

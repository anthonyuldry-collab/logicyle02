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
      fr: 'À l’inscription, vous choisissez une formule et enregistrez une carte via Stripe. L’essai démarre immédiatement (14 jours sur Club/Compétition, 90 jours pilote sur Élite/Performance). Le premier prélèvement a lieu à la fin de l’essai si vous ne résiliez pas.',
      en: 'At signup you pick a plan and save a card via Stripe. The trial starts immediately (14 days on Club/Competition, 90-day pilot on Elite/Performance). The first charge happens after the trial unless you cancel.',
    },
  },
  {
    id: 'who',
    question: {
      fr: 'Pour qui est LogiCycle ?',
      en: 'Who is LogiCycle for?',
    },
    answer: {
      fr: 'Équipes et clubs cyclistes (effectif, calendrier, logistique course, budget, performance), athlètes et staff indépendants, et structures qui publient des missions vacataires.',
      en: 'Cycling teams and clubs (roster, calendar, race logistics, budget, performance), independent athletes and staff, and organisations posting freelance missions.',
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
      fr: 'Écrivez à support@logicycle.fr (réponse sous 2 jours ouvrés en période beta). Indiquez votre e-mail de compte et une description courte du problème.',
      en: 'Email support@logicycle.fr (reply within 2 business days during beta). Include your account email and a short description of the issue.',
    },
  },
];

/**
 * Pilotage PDG — checklist J-90 (sept.–nov. 2026) + objectifs ARR Dual-Track M1–M24.
 * Sources : business-plan/projections-leader-100M.csv · calendrier-lancement.md · portail-organisateur.md
 */

export type CeoChecklistPhase = 'sept' | 'oct' | 'nov' | 'ongoing';
export type CeoChecklistCategory = 'produit' | 'legal' | 'commercial' | 'ops' | 'finance';

export interface CeoChecklistItem {
  id: string;
  phase: CeoChecklistPhase;
  category: CeoChecklistCategory;
  titleFr: string;
  titleEn: string;
  detailFr: string;
  detailEn: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface CeoArrTargetMonth {
  month: number;
  dateLabel: string;
  teams: number;
  independents: number;
  mrr: number;
  arr: number;
  milestoneFr?: string;
  milestoneEn?: string;
}

/** Checklist pré-lancement · M1 = déc. 2026 → J-90 = sept.–nov. 2026 */
export const CEO_PRELAUNCH_CHECKLIST: CeoChecklistItem[] = [
  // ——— Septembre 2026 ———
  {
    id: 'sept-stripe',
    phase: 'sept',
    category: 'ops',
    titleFr: 'Stripe live (FR + EN) · produits abo',
    titleEn: 'Stripe live (FR + EN) · subscription products',
    detailFr: 'Plans Club→Pro · essai 14 j · webhooks · TVA UE.',
    detailEn: 'Club→Pro plans · 14-day trial · webhooks · EU VAT.',
    priority: 'P0',
  },
  {
    id: 'sept-statuts',
    phase: 'sept',
    category: 'legal',
    titleFr: 'Statuts SAS/SASU + clause PI (avocat)',
    titleEn: 'SAS/SASU articles + IP clause (counsel)',
    detailFr: 'Objet SaaS · PI cédée à la société · pouvoirs · greffe/Kbis. Voir dossier-avocat lot B.',
    detailEn: 'SaaS object · IP assigned to company · powers · registry/Kbis. Counsel lot B.',
    priority: 'P0',
  },
  {
    id: 'sept-legal-pack',
    phase: 'sept',
    category: 'legal',
    titleFr: 'Pack legal FR+EN (CGU · CGV · privacy · DPA)',
    titleEn: 'Legal pack FR+EN (ToS · privacy · DPA)',
    detailFr: 'Rédaction avocat lot C · pages #/legal · marketplace 12 % · mentions.',
    detailEn: 'Counsel lot C · #/legal pages · 12% marketplace · notices.',
    priority: 'P0',
  },
  {
    id: 'sept-marque',
    phase: 'sept',
    category: 'legal',
    titleFr: 'Marque INPI + domaines verrouillés',
    titleEn: 'INPI trademark + locked domains',
    detailFr: 'Recherche antériorité · dépôt classes 9/42/35 · logicycle.com/.fr/.eu.',
    detailEn: 'Prior art search · file classes 9/42/35 · domains locked.',
    priority: 'P0',
  },
  {
    id: 'sept-pipeline-fr',
    phase: 'sept',
    category: 'commercial',
    titleFr: 'Pipeline FR · 50 prospects Continental / DN',
    titleEn: 'FR pipeline · 50 Continental / DN prospects',
    detailFr: 'CRM simple · 15 RDV bookés · 5 pilotes ciblés.',
    detailEn: 'Simple CRM · 15 meetings booked · 5 pilot targets.',
    priority: 'P0',
  },
  {
    id: 'sept-i18n',
    phase: 'sept',
    category: 'produit',
    titleFr: 'UI + landing EN 100 % (voie WT)',
    titleEn: 'UI + landing EN 100% (WT track)',
    detailFr: 'Pas de chaîne FR orpheline sur parcours vente EN.',
    detailEn: 'No orphan FR strings on EN sales journey.',
    priority: 'P0',
  },
  {
    id: 'sept-camp',
    phase: 'sept',
    category: 'produit',
    titleFr: 'Camp / wellness / altitude démo-ready',
    titleEn: 'Camp / wellness / altitude demo-ready',
    detailFr: 'Script démo 12 min · PDF stage · différenciateur vs Ippogee.',
    detailEn: '12-min demo script · stage PDF · vs Ippogee wedge.',
    priority: 'P1',
  },

  // ——— Octobre 2026 ———
  {
    id: 'oct-wt-wedge',
    phase: 'oct',
    category: 'commercial',
    titleFr: 'Pipeline EN/WT · 10 cibles Pro/WT',
    titleEn: 'EN/WT pipeline · 10 Pro/WT targets',
    detailFr: 'Pitch wedge EN · 3 RDV · 1 pilote 90 j en discussion.',
    detailEn: 'EN wedge pitch · 3 meetings · 1× 90-day pilot in talk.',
    priority: 'P0',
  },
  {
    id: 'oct-rgpd',
    phase: 'oct',
    category: 'legal',
    titleFr: 'Registre RGPD + scouting consent documenté',
    titleEn: 'GDPR register + documented scouting consent',
    detailFr: 'Sous-traitants Firebase/Stripe · procédure export/purge.',
    detailEn: 'Firebase/Stripe processors · export/purge procedure.',
    priority: 'P0',
  },
  {
    id: 'oct-pwa',
    phase: 'oct',
    category: 'produit',
    titleFr: 'PWA + push FCM stables (iOS/Android)',
    titleEn: 'Stable PWA + FCM push (iOS/Android)',
    detailFr: 'Convocations · alertes abonnement · test 5 devices.',
    detailEn: 'Call-ups · sub alerts · test on 5 devices.',
    priority: 'P1',
  },
  {
    id: 'oct-marketplace',
    phase: 'oct',
    category: 'produit',
    titleFr: 'Marketplace missions · Stripe Connect test',
    titleEn: 'Mission marketplace · Stripe Connect test',
    detailFr: 'Flux publication → matching → paiement test · commission 12 %.',
    detailEn: 'Publish → match → test payout · 12% take rate.',
    priority: 'P1',
  },
  {
    id: 'oct-erp',
    phase: 'oct',
    category: 'produit',
    titleFr: 'ERP lean · devis / facture / SEPA smoke test',
    titleEn: 'Lean ERP · quote / invoice / SEPA smoke test',
    detailFr: 'Parcours Continental démo sans bug bloquant.',
    detailEn: 'Continental demo path without blockers.',
    priority: 'P1',
  },
  {
    id: 'oct-support',
    phase: 'oct',
    category: 'ops',
    titleFr: 'Support · inbox + FAQ + runbook incident',
    titleEn: 'Support · inbox + FAQ + incident runbook',
    detailFr: 'Adresse support@ · SLA essai 14 j · 1 page Notion.',
    detailEn: 'support@ · 14-day trial SLA · 1-page Notion.',
    priority: 'P1',
  },

  // ——— Novembre 2026 ———
  {
    id: 'nov-go-live-checklist',
    phase: 'nov',
    category: 'ops',
    titleFr: 'Go / No-Go commercial (checklist signée)',
    titleEn: 'Commercial Go / No-Go (signed checklist)',
    detailFr: 'Stripe · statuts/Kbis · CGU/CGV live · EN · 3 clients prêts · backup Firebase.',
    detailEn: 'Stripe · articles/Kbis · ToS live · EN · 3 ready-to-pay · Firebase backup.',
    priority: 'P0',
  },
  {
    id: 'nov-pricing-page',
    phase: 'nov',
    category: 'commercial',
    titleFr: 'Page tarifs publique + CTA essai 14 j',
    titleEn: 'Public pricing page + 14-day trial CTA',
    detailFr: 'FR+EN · comparaison Ippogee factuelle · parrainage.',
    detailEn: 'FR+EN · factual Ippogee compare · referral.',
    priority: 'P0',
  },
  {
    id: 'nov-first-invoices',
    phase: 'nov',
    category: 'finance',
    titleFr: '3 équipes prêtes à facturer au M1',
    titleEn: '3 teams ready to bill at M1',
    detailFr: 'Devis signés ou cartes Stripe prêtes · pas de démo « gratis forever ».',
    detailEn: 'Signed quotes or Stripe cards ready · no forever-free demos.',
    priority: 'P0',
  },
  {
    id: 'nov-monitoring',
    phase: 'nov',
    category: 'ops',
    titleFr: 'Monitoring prod · Sentry / uptime / budgets Firebase',
    titleEn: 'Prod monitoring · Sentry / uptime / Firebase budgets',
    detailFr: 'Alertes fondateur · plafond coûts · plan rollback.',
    detailEn: 'Founder alerts · cost caps · rollback plan.',
    priority: 'P1',
  },
  {
    id: 'nov-pitch-seed',
    phase: 'nov',
    category: 'finance',
    titleFr: 'Deck Seed v0 (données Dual-Track)',
    titleEn: 'Seed deck v0 (Dual-Track numbers)',
    detailFr: 'ARR M12/M24 · TAM réel · orga M24 · pas de triathlon avant orga.',
    detailEn: 'ARR M12/M24 · real TAM · org portal M24 · no triathlon before org.',
    priority: 'P2',
  },
  {
    id: 'nov-battlecard',
    phase: 'nov',
    category: 'commercial',
    titleFr: 'Battlecard Ippogee à jour',
    titleEn: 'Updated Ippogee battlecard',
    detailFr: 'Camp/wellness · prix · EN · réseau indép. — 1 page.',
    detailEn: 'Camp/wellness · price · EN · indie network — 1-pager.',
    priority: 'P1',
  },

  // ——— Ongoing build (rappel stratégique) ———
  {
    id: 'ong-focus',
    phase: 'ongoing',
    category: 'produit',
    titleFr: 'Focus : pas d’orga / tri / run avant M24 / M36',
    titleEn: 'Focus: no org / tri / run before M24 / M36',
    detailFr: 'Ordre figé : cyclisme → organisateur M24 → tri M36 → run M60.',
    detailEn: 'Fixed order: cycling → organizer M24 → tri M36 → run M60.',
    priority: 'P0',
  },
  {
    id: 'ong-cash',
    phase: 'ongoing',
    category: 'finance',
    titleFr: 'Trésorerie runway ≥ 8 mois burn',
    titleEn: 'Cash runway ≥ 8 months burn',
    detailFr: 'Suivi mensuel · seuil avant dividendes / embauches.',
    detailEn: 'Monthly tracking · threshold before dividends / hires.',
    priority: 'P0',
  },
];

/** Objectifs Dual-Track M1–M24 (projections-leader-100M.csv) */
export const CEO_ARR_TARGETS_M1_M24: CeoArrTargetMonth[] = [
  { month: 1, dateLabel: 'déc. 2026', teams: 4, independents: 22, mrr: 477, arr: 5725, milestoneFr: 'Go-live', milestoneEn: 'Go-live' },
  { month: 2, dateLabel: 'jan. 2027', teams: 8, independents: 44, mrr: 950, arr: 11404 },
  { month: 3, dateLabel: 'fév. 2027', teams: 12, independents: 65, mrr: 1420, arr: 17037 },
  { month: 4, dateLabel: 'mars 2027', teams: 16, independents: 87, mrr: 1897, arr: 22764 },
  { month: 5, dateLabel: 'avr. 2027', teams: 20, independents: 109, mrr: 2381, arr: 28570 },
  { month: 6, dateLabel: 'mai 2027', teams: 24, independents: 131, mrr: 2871, arr: 34453, milestoneFr: 'UI EN · 1 Pro/WT', milestoneEn: 'EN UI · 1 Pro/WT' },
  { month: 7, dateLabel: 'juin 2027', teams: 31, independents: 190, mrr: 3903, arr: 46839 },
  { month: 8, dateLabel: 'juil. 2027', teams: 39, independents: 249, mrr: 4948, arr: 59377, milestoneFr: 'Point mort société', milestoneEn: 'Company break-even' },
  { month: 9, dateLabel: 'août 2027', teams: 46, independents: 309, mrr: 6005, arr: 72064 },
  { month: 10, dateLabel: 'sept. 2027', teams: 54, independents: 369, mrr: 7075, arr: 84902 },
  { month: 11, dateLabel: 'oct. 2027', teams: 61, independents: 430, mrr: 8157, arr: 97888 },
  { month: 12, dateLabel: 'nov. 2027', teams: 69, independents: 492, mrr: 9252, arr: 111023, milestoneFr: 'Fin Y1 · salaire 2 K€', milestoneEn: 'End Y1 · €2k salary' },
  { month: 13, dateLabel: 'déc. 2027', teams: 77, independents: 554, mrr: 10423, arr: 125070 },
  { month: 14, dateLabel: 'jan. 2028', teams: 85, independents: 617, mrr: 11619, arr: 139423 },
  { month: 15, dateLabel: 'fév. 2028', teams: 92, independents: 680, mrr: 12840, arr: 154085 },
  { month: 16, dateLabel: 'mars 2028', teams: 100, independents: 744, mrr: 14088, arr: 169057, milestoneFr: 'Salaire 2,5 K€', milestoneEn: '€2.5k salary' },
  { month: 17, dateLabel: 'avr. 2028', teams: 108, independents: 808, mrr: 15362, arr: 184343 },
  { month: 18, dateLabel: 'mai 2028', teams: 116, independents: 873, mrr: 16662, arr: 199946, milestoneFr: 'Marketplace live', milestoneEn: 'Marketplace live' },
  { month: 19, dateLabel: 'juin 2028', teams: 129, independents: 977, mrr: 18668, arr: 224011, milestoneFr: 'Marge nette ≥20 %', milestoneEn: 'Net margin ≥20%' },
  { month: 20, dateLabel: 'juil. 2028', teams: 141, independents: 1083, mrr: 20742, arr: 248905 },
  { month: 21, dateLabel: 'août 2028', teams: 153, independents: 1191, mrr: 22887, arr: 274644 },
  { month: 22, dateLabel: 'sept. 2028', teams: 166, independents: 1301, mrr: 25103, arr: 301242 },
  { month: 23, dateLabel: 'oct. 2028', teams: 179, independents: 1413, mrr: 27393, arr: 328715 },
  {
    month: 24,
    dateLabel: 'nov. 2028',
    teams: 192,
    independents: 1527,
    mrr: 29757,
    arr: 357078,
    milestoneFr: 'Seed 750 K€ · portail orga Solo',
    milestoneEn: 'Seed €750k · org portal Solo',
  },
];

export const CEO_LAUNCH_M1 = { year: 2026, month: 12 }; // décembre 2026

export const CHECKLIST_PHASE_LABEL: Record<
  CeoChecklistPhase,
  { fr: string; en: string }
> = {
  sept: { fr: 'Septembre 2026 (J-90)', en: 'September 2026 (D-90)' },
  oct: { fr: 'Octobre 2026', en: 'October 2026' },
  nov: { fr: 'Novembre 2026 (Go-live)', en: 'November 2026 (Go-live)' },
  ongoing: { fr: 'Règles PDG (permanentes)', en: 'CEO standing rules' },
};

export const CHECKLIST_CATEGORY_LABEL: Record<
  CeoChecklistCategory,
  { fr: string; en: string }
> = {
  produit: { fr: 'Produit', en: 'Product' },
  legal: { fr: 'Legal', en: 'Legal' },
  commercial: { fr: 'Commercial', en: 'Sales' },
  ops: { fr: 'Ops', en: 'Ops' },
  finance: { fr: 'Finance', en: 'Finance' },
};

const CHECKLIST_STORAGE_KEY = 'logicycle.ceo.prelaunchChecklist.v1';

export function loadChecklistDone(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveChecklistDone(done: Record<string, boolean>): void {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(done));
  } catch {
    /* ignore quota */
  }
}

/** Mois projeté courant (1 = déc. 2026). Avant lancement → 0. */
export function getCurrentProjectionMonth(now = new Date()): number {
  const launch = new Date(CEO_LAUNCH_M1.year, CEO_LAUNCH_M1.month - 1, 1);
  if (now < launch) return 0;
  return (
    (now.getFullYear() - launch.getFullYear()) * 12 +
    (now.getMonth() - launch.getMonth()) +
    1
  );
}

export function getTargetForMonth(month: number): CeoArrTargetMonth | undefined {
  return CEO_ARR_TARGETS_M1_M24.find((row) => row.month === month);
}

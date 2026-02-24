import { EventType } from '../types';
import type { ChecklistTiming } from '../types';

/**
 * Fiche de poste Assistant Sportif – calquée strictement sur le PDF.
 * Chaque tâche = une ligne du PDF, sous le titre en gras (timingLabel) indiqué.
 */
export interface FichePosteTask {
  name: string;
  eventType: EventType;
  kind?: 'task' | 'a_prevoir';
  timing?: ChecklistTiming;
  /** Titre en gras du PDF sous lequel la tâche figure (exact) */
  timingLabel?: string;
}

// ─── STAGE – Structure exacte du PDF page 1 ─────────────────────────────────
// Titres en gras : Avant départ | Pendant un stage > Arrivée à l'hôtel | Matin avant la sortie | Matin pendant la sortie | Après-midi / soir

export const FICHE_POSTE_ASSISTANT_STAGE: FichePosteTask[] = [
  // Avant départ
  { name: 'Caisse petit-déjeuner', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Provision en eau', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Provision en ravitaillement (barres, gels…)', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Bidons', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Table(s) de massage + huile', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Voir avec hôtel pour repas', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  // Pendant un stage — Arrivée à l'hôtel
  { name: "Récupérer les cartes de chambre", eventType: EventType.STAGE, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  { name: 'Envoyer la répartition des chambres sur groupe WhatsApp', eventType: EventType.STAGE, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  { name: 'Voir avec hôtel pour horaires des repas', eventType: EventType.STAGE, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  { name: 'Voir avec hôtel pour local dédié', eventType: EventType.STAGE, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  // Pendant un stage — Matin avant la sortie
  { name: 'Préparation des bidons', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Préparation des œufs/féculents si besoin', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Préparation des ravitos dans la voiture DS (bidons + gels + rice cake)', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  // Pendant un stage — Matin pendant la sortie
  { name: 'Provisions', eventType: EventType.STAGE, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
  { name: 'Lessive (fonction organisation)', eventType: EventType.STAGE, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
  { name: 'Préparation des ravitaillements (type rice cake) pour le lendemain', eventType: EventType.STAGE, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
  { name: 'Envoyer les horaires des massages sur groupe WhatsApp', eventType: EventType.STAGE, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
  { name: 'Attendre les coureurs pour récupérer les bidons à laver (se fier au message de la voiture DS – heure d\'arrivée)', eventType: EventType.STAGE, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
  // Pendant un stage — Après-midi / soir (ordre PDF)
  { name: 'Massage', eventType: EventType.STAGE, timing: 'apres', timingLabel: 'Après-midi / soir' },
  { name: 'Lessive (fonction organisation)', eventType: EventType.STAGE, timing: 'apres', timingLabel: 'Après-midi / soir' },
  { name: 'Lavage des bidons', eventType: EventType.STAGE, timing: 'apres', timingLabel: 'Après-midi / soir' },
  { name: 'Déposer les filets de linge au niveau de la table repas', eventType: EventType.STAGE, timing: 'apres', timingLabel: 'Après-midi / soir' },
];

// ─── COMPÉTITION – Structure exacte PDF pages 2 et 3 ────────────────────────
// "Pour une course d'un jour" et "Pour une course par étape" : mêmes titres en gras
// Veille de course | Matin avant la course | Avant la course | Après course
// Course par étape : "Rangement des valises" sous Matin avant la course ; Après course = Route hôtel + Envoyer horaires massage + Massages + Lessive

export const FICHE_POSTE_ASSISTANT_COMPETITION: FichePosteTask[] = [
  // Veille de course (ordre PDF)
  { name: "Récupérer les cartes de chambre à l'hôtel", eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Envoyer la répartition des chambres sur groupe WhatsApp', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Voir avec hôtel pour horaires des repas', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Voir avec hôtel pour local dédié', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Fixer les points ravito avec DS', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Demander aux coureurs les souhaits bidons (avant course et départ)', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Demander aux coureurs les souhaits boissons et collations d\'après course', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: "S'assurer que les oreillettes sont chargées", eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'En cas de forte chaleur, voir avec l\'hôtel pour avoir de la glace', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Veille de course' },
  // Matin avant la course (ordre PDF)
  { name: 'Préparation des bidons, boissons et collations d\'après course', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Préparation des œufs/féculents si besoin', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Préparation des ravitos dans la voiture DS (bidons + gels + rice cake)', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Préparation des ravitos dans les voitures assistants', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Préparation des bas de glace à mettre en glacière dans les voitures (DS + assistants)', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  // Course par étape : Rangement des valises sous "Matin avant la course"
  { name: 'Rangement des valises', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  // Avant la course (ordre PDF)
  { name: 'Mettre les bidons d\'avant course sur les vélos', eventType: EventType.COMPETITION, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Massages d\'avant course', eventType: EventType.COMPETITION, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Mettre les bidons de course sur les vélos juste avant le départ', eventType: EventType.COMPETITION, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Aller chercher les vestes au départ', eventType: EventType.COMPETITION, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Partir en avance sur le 1er ravito si course en ligne', eventType: EventType.COMPETITION, timing: 'pendant', timingLabel: 'Avant la course' },
  // Après course – course d'un jour (Route retour) + course par étape (Route hôtel, Envoyer horaires, Massages, Lessive) – ordre PDF
  { name: 'Récupérer les bidons sur les vélos', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Récupérer les oreillettes', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Route retour', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Route hôtel', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Envoyer les horaires de massage', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Massages', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Lessive', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  // Remarques (page 4 PDF)
  { name: 'Si 2 assistants : l\'assistant 2 part à l\'hôtel suivant avec mécano 2 avec camion atelier + valises pour préparer l\'installation : récupération des cartes de chambres, répartition, horaires des repas… + préparation des ravitos si timing suffisant', eventType: EventType.COMPETITION, kind: 'a_prevoir', timing: 'apres', timingLabel: 'Après course' },
  { name: 'Possibilité de conserver les bidons non utilisés conservés au frais de la veille pour le lendemain', eventType: EventType.COMPETITION, kind: 'a_prevoir', timing: 'apres', timingLabel: 'Après course' },
];

export const FICHE_POSTE_ASSISTANT_ALL: FichePosteTask[] = [
  ...FICHE_POSTE_ASSISTANT_STAGE,
  ...FICHE_POSTE_ASSISTANT_COMPETITION,
];

/** Ordre strict des sections (titres en gras) pour l'affichage – Stage */
export const TIMING_LABEL_ORDER_STAGE: string[] = [
  'Avant départ',
  "Arrivée à l'hôtel",
  'Matin avant la sortie',
  'Matin pendant la sortie',
  'Après-midi / soir',
];

/** Ordre strict des sections (titres en gras) pour l'affichage – Compétition */
export const TIMING_LABEL_ORDER_COMPETITION: string[] = [
  'Veille de course',
  'Matin avant la course',
  'Avant la course',
  'Après course',
];

/** Retourne le timingLabel de la fiche Assistant pour une tâche (nom + eventType). Permet d'afficher les sous-sections même si le modèle n'a pas timingLabel en base. */
export function getTimingLabelFromFiche(name: string, eventType?: string): string | undefined {
  if (!name?.trim()) return undefined;
  const key = name.trim().toLowerCase();
  const task = FICHE_POSTE_ASSISTANT_ALL.find(
    t => t.name.trim().toLowerCase() === key && (!eventType || t.eventType === eventType)
  );
  return task?.timingLabel;
}

/** Index de tri pour une tâche (ordre fiche de poste) ; sans timingLabel = à la fin */
export function sortIndexForTask(t: { timing?: string; timingLabel?: string; eventType?: string }, orderStage: string[], orderCompetition: string[]): number {
  const order = t.eventType === EventType.STAGE ? orderStage : orderCompetition;
  const label = t.timingLabel || '';
  const idx = order.indexOf(label);
  if (idx >= 0) return idx;
  const timingOrder = { avant: 0, pendant: 1, apres: 2 };
  const tIdx = t.timing ? timingOrder[t.timing as keyof typeof timingOrder] ?? 99 : 99;
  return 1000 + tIdx * 100; // sans label, après les sections connues
}

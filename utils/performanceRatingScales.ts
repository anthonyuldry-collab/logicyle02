/** Barèmes objectifs de notation post-course (1–10). */

export type PerformanceRatingScaleId = 'contribution' | 'technical' | 'physical';

export interface PerformanceRatingLevel {
  label: string;
  criteria: string;
}

export interface PerformanceRatingScale {
  id: PerformanceRatingScaleId;
  title: string;
  intro: string;
  levels: Record<number, PerformanceRatingLevel>;
}

export const CONTRIBUTION_SCALE: PerformanceRatingScale = {
  id: 'contribution',
  title: 'Apport au résultat',
  intro: 'Évalue le mérite et l\'apport de chaque coureur au résultat collectif de l\'équipe aujourd\'hui.',
  levels: {
    10: { label: 'Excellent apport', criteria: 'A déterminé le résultat ou a permis la stratégie gagnante.' },
    9: { label: 'Très bon apport', criteria: 'Rôle clé exécuté à un niveau élevé, impact direct sur le classement.' },
    8: { label: 'Bon apport', criteria: 'A rempli son mission et a aidé l\'équipe à atteindre ses objectifs.' },
    7: { label: 'Apport satisfaisant', criteria: 'Mission globalement réussie avec un impact positif modéré.' },
    6: { label: 'Apport suffisant', criteria: 'A fait le job sans plus, contribution neutre à positive.' },
    5: { label: 'Apport insuffisant', criteria: 'Mission partiellement remplie, impact limité sur le résultat.' },
    4: { label: 'Apport médiocre', criteria: 'Écart notable entre le rôle demandé et la contribution réelle.' },
    3: { label: 'Mauvais apport', criteria: 'N\'a pas rempli son rôle, a pénalisé le plan d\'équipe.' },
    2: { label: 'Très mauvais apport', criteria: 'Contribution clairement négative pour le collectif.' },
    1: { label: 'Apport nul', criteria: 'Aucun apport au résultat malgré la présence sur la course.' },
  },
};

/** Technique : gestion du vélo, placement, exécution tactique observable. */
export const TECHNICAL_SCALE: PerformanceRatingScale = {
  id: 'technical',
  title: 'Niveau technique',
  intro: 'Évalue les compétences techniques observables : placement, gestion du vélo, exécution du plan tactique et prise de risque maîtrisée.',
  levels: {
    10: {
      label: 'Maîtrise exceptionnelle',
      criteria: 'Placement optimal en permanence, gestion du peloton exemplaire, zéro faute, exécution tactique parfaite (relances, rotations, protégé).',
    },
    9: {
      label: 'Très haut niveau',
      criteria: 'Excellente lecture de course, positionnement efficace dans les moments clés, 1–2 micro-erreurs sans conséquence.',
    },
    8: {
      label: 'Bon niveau',
      criteria: 'Respect du plan tactique, bonnes prises de roues, gestion correcte des descentes/virages, peu d\'erreurs.',
    },
    7: {
      label: 'Niveau satisfaisant',
      criteria: 'Exécution globalement conforme, quelques erreurs de placement ou de timing sans impact majeur.',
    },
    6: {
      label: 'Niveau suffisant',
      criteria: 'Assure les bases (tenir la roue, rester dans le groupe) mais manque de précision dans les phases décisives.',
    },
    5: {
      label: 'Niveau insuffisant',
      criteria: 'Erreurs récurrentes de placement ou de gestion (mauvaise roue, gap évitable, mauvaise ligne).',
    },
    4: {
      label: 'Niveau médiocre',
      criteria: 'Mauvaise lecture de course, positionnement dangereux ou inefficace, non-respect du plan.',
    },
    3: {
      label: 'Niveau faible',
      criteria: 'Nombreuses fautes techniques, perte de contact due à des erreurs évitables, désorganisation.',
    },
    2: {
      label: 'Très faible',
      criteria: 'Incapacité à exécuter le rôle technique demandé, chutes ou quasi-chutes imputables au coureur.',
    },
    1: {
      label: 'Niveau nul',
      criteria: 'Contribution technique néfaste : a compromis la sécurité ou le plan par des fautes graves répétées.',
    },
  },
};

/** Physique : niveau par rapport aux exigences de la course. */
export const PHYSICAL_SCALE: PerformanceRatingScale = {
  id: 'physical',
  title: 'Niveau physique',
  intro: 'Évalue la forme physique du jour par rapport aux exigences de la course : intensité, durée, dénivelé et capacité à répondre aux efforts clés.',
  levels: {
    10: {
      label: 'Forme exceptionnelle',
      criteria: 'Au-dessus du niveau requis : moteur de l\'équipe, répond à toutes les accélérations, marge en fin de course.',
    },
    9: {
      label: 'Très bon niveau',
      criteria: 'Tient sans difficulté le rythme imposé, présent sur les efforts décisifs, bonne récupération entre les phases durs.',
    },
    8: {
      label: 'Bon niveau',
      criteria: 'Suit les accélérations clés, tient le rôle physique demandé, légère baisse seulement en fin de course.',
    },
    7: {
      label: 'Niveau satisfaisant',
      criteria: 'Honore le rôle physique avec une marge limitée, décroché bref sur 1–2 moments sans conséquence grave.',
    },
    6: {
      label: 'Niveau suffisant',
      criteria: 'Termine dans le groupe prévu mais limite sur les efforts clés, fatigue visible en fin de course.',
    },
    5: {
      label: 'Niveau insuffisant',
      criteria: 'Décroché sur un ou plusieurs moments importants, incapacité à soutenir le rythme aux points clés.',
    },
    4: {
      label: 'Niveau médiocre',
      criteria: 'Difficulté à suivre le rythme imposé, écart significatif sur les exigences du rôle.',
    },
    3: {
      label: 'Niveau faible',
      criteria: 'Lâché tôt ou incapable de répondre aux accélérations de référence du peloton.',
    },
    2: {
      label: 'Très faible',
      criteria: 'Abandon physique (DNF lié à la forme) ou très large décrochage dès les premières difficultés.',
    },
    1: {
      label: 'Niveau nul',
      criteria: 'Niveau physique incompatible avec les exigences de la course (DNS ou DNF dès le départ des efforts).',
    },
  },
};

export const PERFORMANCE_RATING_SCALES: Record<PerformanceRatingScaleId, PerformanceRatingScale> = {
  contribution: CONTRIBUTION_SCALE,
  technical: TECHNICAL_SCALE,
  physical: PHYSICAL_SCALE,
};

export function getPerformanceRatingScale(scaleId: PerformanceRatingScaleId): PerformanceRatingScale {
  return PERFORMANCE_RATING_SCALES[scaleId];
}

export function getPerformanceRatingLabel(
  scaleId: PerformanceRatingScaleId,
  score: number | undefined | null
): string {
  if (score == null || score < 1 || score > 10) return '—';
  return PERFORMANCE_RATING_SCALES[scaleId].levels[score]?.label ?? `${score}/10`;
}

export function getPerformanceRatingCriteria(
  scaleId: PerformanceRatingScaleId,
  score: number | undefined | null
): string {
  if (score == null || score < 1 || score > 10) return '';
  return PERFORMANCE_RATING_SCALES[scaleId].levels[score]?.criteria ?? '';
}

export function getPerformanceRatingBadgeClass(score: number): string {
  if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (score >= 7) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (score >= 5) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (score >= 3) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

export function getPerformanceRatingAccentRing(scaleId: PerformanceRatingScaleId): string {
  switch (scaleId) {
    case 'technical':
      return 'ring-purple-400';
    case 'physical':
      return 'ring-teal-400';
    default:
      return 'ring-blue-400';
  }
}

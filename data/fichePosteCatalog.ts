import { ChecklistRole, EventType } from '../types';
import type { FichePosteTask } from './fichePosteAssistant';
import {
  FICHE_POSTE_ASSISTANT_ALL,
  FICHE_POSTE_ASSISTANT_COMPETITION,
  FICHE_POSTE_ASSISTANT_STAGE,
} from './fichePosteAssistant';
import {
  FICHE_COMM_CLUB,
  FICHE_COMM_COMPETITION,
  FICHE_COMM_PRO,
  FICHE_COUREUR_CLUB,
  FICHE_COUREUR_COMPETITION,
  FICHE_COUREUR_PRO,
  FICHE_DS_CLUB,
  FICHE_DS_COMPETITION,
  FICHE_DS_PRO,
  FICHE_MANAGER_CLUB,
  FICHE_MANAGER_COMPETITION,
  FICHE_MANAGER_PRO,
  FICHE_MECANO_CLUB,
  FICHE_MECANO_COMPETITION,
  FICHE_MECANO_PRO,
  FICHE_ENTRAINEUR_CLUB,
  FICHE_ENTRAINEUR_COMPETITION,
  FICHE_ENTRAINEUR_PRO,
  FICHE_KINE_CLUB,
  FICHE_KINE_COMPETITION,
  FICHE_KINE_PRO,
  FICHE_MEDECIN_CLUB,
  FICHE_MEDECIN_COMPETITION,
  FICHE_MEDECIN_PRO,
} from './fichePosteRoles';

export type FichePosteStructureLevel = 'club' | 'competition' | 'pro';

export type { FichePosteTask } from './fichePosteAssistant';

export interface FichePosteRoleDefinition {
  role: ChecklistRole;
  title: string;
  summaries: Record<FichePosteStructureLevel, string>;
  tasks: Record<FichePosteStructureLevel, FichePosteTask[]>;
}

export const FICHE_STRUCTURE_LABELS: Record<FichePosteStructureLevel, string> = {
  club: 'Club / régional',
  competition: 'National (N1–N3)',
  pro: 'Professionnel (DN / WT)',
};

const ASSISTANT_CLUB: FichePosteTask[] = [
  { name: 'Préparation bidons', eventType: EventType.COMPETITION, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Récupérer bidons après course', eventType: EventType.COMPETITION, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Voir avec hôtel pour repas', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Lavage des bidons', eventType: EventType.STAGE, timing: 'apres', timingLabel: 'Après-midi / soir' },
  { name: 'Caisse petit-déjeuner', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Provision en eau', eventType: EventType.STAGE, timing: 'avant', timingLabel: 'Avant départ' },
];

const ASSISTANT_COMPETITION: FichePosteTask[] = [
  ...ASSISTANT_CLUB,
  ...FICHE_POSTE_ASSISTANT_COMPETITION,
  ...FICHE_POSTE_ASSISTANT_STAGE.filter((t) =>
    ['Avant départ', 'Matin avant la sortie', 'Après-midi / soir'].includes(t.timingLabel || '')
  ),
];

export const FICHE_POSTE_CATALOG: FichePosteRoleDefinition[] = [
  {
    role: ChecklistRole.DS,
    title: 'Directeur Sportif',
    summaries: {
      club: 'Piloter la course : briefing, présences, ravitos, coordination staff et débriefing.',
      competition: 'Direction sportive nationale : tactique, staff multi-rôles et logistique course.',
      pro: 'Direction sportive complète : UCI, multi-véhicules, données performance et protocole pro.',
    },
    tasks: { club: FICHE_DS_CLUB, competition: FICHE_DS_COMPETITION, pro: FICHE_DS_PRO },
  },
  {
    role: ChecklistRole.ASSISTANT,
    title: 'Assistant',
    summaries: {
      club: 'Soutien logistique essentiel : bidons, repas, petit-déjeuner, lavage.',
      competition: 'Fiche assistant courses nationales (bidons, ravitos, hôtel, massages).',
      pro: 'Fiche complète Assistant Sportif (stage + compétition, modèle PDF).',
    },
    tasks: { club: ASSISTANT_CLUB, competition: ASSISTANT_COMPETITION, pro: FICHE_POSTE_ASSISTANT_ALL },
  },
  {
    role: ChecklistRole.MECANO,
    title: 'Mécanicien',
    summaries: {
      club: 'Contrôle et entretien des vélos, kit réparation et lavage post-course.',
      competition: 'Préparation matériel renforcée, roues de rechange et assistance en course.',
      pro: 'Camion atelier, conformité UCI et coordination multi-étapes.',
    },
    tasks: { club: FICHE_MECANO_CLUB, competition: FICHE_MECANO_COMPETITION, pro: FICHE_MECANO_PRO },
  },
  {
    role: ChecklistRole.MANAGER,
    title: 'Manager',
    summaries: {
      club: 'Organisation administrative, budget, contacts organisateur et suivi staff.',
      competition: 'Pilotage staff, véhicules, partenaires et arbitrage inter-pôles.',
      pro: 'Coordination globale, sponsors, protocole UCI et pilotage budget course.',
    },
    tasks: { club: FICHE_MANAGER_CLUB, competition: FICHE_MANAGER_COMPETITION, pro: FICHE_MANAGER_PRO },
  },
  {
    role: ChecklistRole.COMMUNICATION,
    title: 'Communication',
    summaries: {
      club: 'Valoriser les résultats et l\'activité du club sur les réseaux.',
      competition: 'Contenus avant/après course, couverture live et visibilité équipe.',
      pro: 'Presse, partenaires, communiqués et obligations sponsors.',
    },
    tasks: { club: FICHE_COMM_CLUB, competition: FICHE_COMM_COMPETITION, pro: FICHE_COMM_PRO },
  },
  {
    role: ChecklistRole.COUREUR,
    title: 'Coureur',
    summaries: {
      club: 'Préparer son matériel, respecter le protocole équipe et récupérer.',
      competition: 'Discipline de course, nutrition, débriefing et saisie des sensations.',
      pro: 'Conformité UCI, données performance, récupération structurée et obligations média.',
    },
    tasks: { club: FICHE_COUREUR_CLUB, competition: FICHE_COUREUR_COMPETITION, pro: FICHE_COUREUR_PRO },
  },
  {
    role: ChecklistRole.ENTRAINEUR,
    title: 'Entraîneur',
    summaries: {
      club: 'Planifier les séances, suivre la charge et préparer les coureurs.',
      competition: 'Charge, échauffement et analyse post-course sur calendrier dense.',
      pro: 'Tapering, data performance et coordination avec le pôle performance.',
    },
    tasks: { club: FICHE_ENTRAINEUR_CLUB, competition: FICHE_ENTRAINEUR_COMPETITION, pro: FICHE_ENTRAINEUR_PRO },
  },
  {
    role: ChecklistRole.KINE,
    title: 'Kinésithérapeute',
    summaries: {
      club: 'Massages, suivi musculaire et récupération post-effort.',
      competition: 'Planning soins, triage douleurs et récupération entre étapes.',
      pro: 'Coordination médicale et protocoles de traitement en compétition.',
    },
    tasks: { club: FICHE_KINE_CLUB, competition: FICHE_KINE_COMPETITION, pro: FICHE_KINE_PRO },
  },
  {
    role: ChecklistRole.MEDECIN,
    title: 'Médecin',
    summaries: {
      club: 'Aptitude, kit médical et suivi santé des coureurs.',
      competition: 'Coordination secours, autorisations et suivi sur stage.',
      pro: 'Protocole UCI, anti-dopage et couverture médicale complète.',
    },
    tasks: { club: FICHE_MEDECIN_CLUB, competition: FICHE_MEDECIN_COMPETITION, pro: FICHE_MEDECIN_PRO },
  },
];

export const FICHE_POSTE_ALL_TASKS: FichePosteTask[] = FICHE_POSTE_CATALOG.flatMap((def) =>
  Object.values(def.tasks).flat()
);

import { EventType } from '../types';
import type { FichePosteTask } from './fichePosteAssistant';

const C = EventType.COMPETITION;
const S = EventType.STAGE;

// ─── DIRECTEUR SPORTIF ─────────────────────────────────────────────────────────

export const FICHE_DS_CLUB: FichePosteTask[] = [
  { name: 'Briefing coureurs (objectifs, consignes sécurité)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Valider présences et feuille de départ', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Point ravitos avec organisateur et assistants', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Coordonner départ véhicules équipe', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Présence briefing commissaires', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Suivre la course (radio / contact staff)', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Débriefing rapide post-course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Briefing étape du jour (objectifs, météo, parcours)', eventType: S, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Valider horaires départ et convois', eventType: S, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Point logistique arrivée hôtel', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
];

export const FICHE_DS_COMPETITION: FichePosteTask[] = [
  ...FICHE_DS_CLUB,
  { name: 'Valider sélection partants et remplaçants', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Stratégie tactique et consignes individuelles', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Coordination staff (assistants, mécano, communication)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Contrôle dossards / transpondeurs', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Ajuster tactique en course (radio)', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Débriefing performance avec staff', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Planifier ravitos DS + assistants (multi-véhicules)', eventType: S, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Ajuster stratégie en cours d\'étape (radio)', eventType: S, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
];

export const FICHE_DS_PRO: FichePosteTask[] = [
  ...FICHE_DS_COMPETITION,
  { name: 'Interface commissaires / protocole UCI', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Validation conformité matériel UCI (pesée, dimensions)', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Coordination véhicules course (DS, assistants, mécano, comm.)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Briefing presse / partenaires si requis', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Analyse données post-course (capteurs, RPE)', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Arbitrage transfert matériel vers étape suivante', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
];

// ─── MÉCANICIEN ──────────────────────────────────────────────────────────────

export const FICHE_MECANO_CLUB: FichePosteTask[] = [
  { name: 'Contrôle freins, pneus et transmission', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Vérifier pression pneus et jeu de direction', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Préparer kit réparation (chambre, dériveur, multi-outil)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Assistance au départ (derniers réglages)', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Lavage vélos après course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Contrôle vélos de rechange', eventType: S, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Vérifier état chaînes et lubrification', eventType: S, timing: 'avant', timingLabel: 'Avant départ' },
];

export const FICHE_MECANO_COMPETITION: FichePosteTask[] = [
  ...FICHE_MECANO_CLUB,
  { name: 'Préparer roues de rechange et pneus course', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Organiser stock pièces (câbles, patins, chaînes)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Assistance technique en course (voiture suivante)', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Contrôle conformité cadres / composants', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Coordonner transfert vélos vers étape suivante', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
];

export const FICHE_MECANO_PRO: FichePosteTask[] = [
  ...FICHE_MECANO_COMPETITION,
  { name: 'Organiser camion atelier (outillage, stock, inventaire)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Préparer vélos CLM / roues spécifiques par coureur', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Contrôle UCI (pesée, dimensions, transpondeurs)', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Gestion roues carbone / patins selon météo', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Coordonner mécano 2 + camion sur étape suivante', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  { name: 'Inventaire matériel fin d\'étape', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
];

// ─── MANAGER ─────────────────────────────────────────────────────────────────

export const FICHE_MANAGER_CLUB: FichePosteTask[] = [
  { name: 'Valider budget et frais de déplacement', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Contact organisateur (engagements, assurances, licences)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Point staff présent sur la course', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Valider moyens logistiques (véhicules, hébergement)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Suivi administratif post-course (justificatifs)', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Valider planning staff sur le stage', eventType: S, timing: 'avant', timingLabel: 'Avant départ' },
];

export const FICHE_MANAGER_COMPETITION: FichePosteTask[] = [
  ...FICHE_MANAGER_CLUB,
  { name: 'Valider effectif staff et véhicules affectés', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Coordonner partenaires et visibilité locale', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Arbitrage logistique inter-pôles (perf, mécano, admin)', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  { name: 'Point budget consommation mi-stage', eventType: S, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
];

export const FICHE_MANAGER_PRO: FichePosteTask[] = [
  ...FICHE_MANAGER_COMPETITION,
  { name: 'Suivi visibilité sponsors / partenaires', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Validation protocole UCI (engagements, quotas)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Coordination presse et hospitality', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Pilotage budget course (frais, primes, pénalités)', eventType: C, timing: 'apres', timingLabel: 'Après course' },
];

// ─── COMMUNICATION ───────────────────────────────────────────────────────────

export const FICHE_COMM_CLUB: FichePosteTask[] = [
  { name: 'Préparer post partants (réseaux club)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Photos et résultats réseaux sociaux', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Remonter résultats et classements au club', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Contenus stage (photos entraînement, coulisses)', eventType: S, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
];

export const FICHE_COMM_COMPETITION: FichePosteTask[] = [
  ...FICHE_COMM_CLUB,
  { name: 'Préparer contenus avant course (partants, objectifs)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Couverture live (stories, communiqué mi-course)', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Interview coureurs / staff si résultat', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Coordination calendrier média avec DS', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Visibilité équipe sur épreuve (banderoles, maillots)', eventType: S, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
];

export const FICHE_COMM_PRO: FichePosteTask[] = [
  ...FICHE_COMM_COMPETITION,
  { name: 'Coordination presse / médias partenaires', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Briefing contenus sponsors (obligations visibilité)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Couverture zone technique / podium', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Communiqué de presse post-course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Contenus partenaires étape par étape', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
];

// ─── COUREUR ─────────────────────────────────────────────────────────────────

export const FICHE_COUREUR_CLUB: FichePosteTask[] = [
  { name: 'Consulter briefing tactique équipe', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Vérifier matériel personnel (casque, chaussures, tenue)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Respecter horaires briefing et départ', eventType: C, timing: 'avant', timingLabel: 'Avant la course' },
  { name: 'Échauffement selon protocole équipe', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Hydratation et nutrition selon consignes', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Récupération active post-course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Préparer tenue et matériel étape suivante', eventType: S, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Respecter horaires convoi et repas', eventType: S, timing: 'avant', timingLabel: 'Avant départ' },
];

export const FICHE_COUREUR_COMPETITION: FichePosteTask[] = [
  ...FICHE_COUREUR_CLUB,
  { name: 'Valider nutrition veille (plan équipe)', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Signer feuille de présence / départ', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Massage d\'avant course si prévu', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Récupérer bidons et collations au départ', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Respecter consignes tactiques DS (radio)', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Débriefing avec DS post-course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Saisir sensations / RPE dans l\'app', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Rangement valises et matériel (course par étapes)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Récupération structurée (étirements, nutrition)', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
];

export const FICHE_COUREUR_PRO: FichePosteTask[] = [
  ...FICHE_COUREUR_COMPETITION,
  { name: 'Contrôle UCI (pesée, licence, matériel)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Protocole anti-dopage / whereabouts si applicable', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Vérifier capteur puissance et synchronisation', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Débriefing tactique et données (capteur, RPE, HR)', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Obligations média / sponsors si convoqué', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Préparer valises et matériel étape suivante', eventType: S, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Respecter protocole récupération (home trainer, massage)', eventType: S, timing: 'apres', timingLabel: "Arrivée à l'hôtel" },
];

// ─── ENTRAÎNEUR ────────────────────────────────────────────────────────────────

export const FICHE_ENTRAINEUR_CLUB: FichePosteTask[] = [
  { name: 'Planifier la séance du jour (objectif, durée, intensité)', eventType: S, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Briefing coureurs avant sortie', eventType: S, timing: 'avant', timingLabel: 'Matin avant la sortie' },
  { name: 'Suivre les consignes de charge sur la sortie', eventType: S, timing: 'pendant', timingLabel: 'Matin pendant la sortie' },
  { name: 'Recueillir sensations / RPE post-séance', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
  { name: 'Préparer échauffement course', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Débriefing charge et récupération post-course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
];

export const FICHE_ENTRAINEUR_COMPETITION: FichePosteTask[] = [
  ...FICHE_ENTRAINEUR_CLUB,
  { name: 'Ajuster plan de charge selon calendrier course', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Valider protocole échauffement individuel', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Analyser données post-course (puissance, RPE)', eventType: C, timing: 'apres', timingLabel: 'Après course' },
  { name: 'Coordonner récupération entre étapes', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
];

export const FICHE_ENTRAINEUR_PRO: FichePosteTask[] = [
  ...FICHE_ENTRAINEUR_COMPETITION,
  { name: 'Aligner préparation avec staff performance / data', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Protocole pic de forme et tapering', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Exporter données pour analyse staff', eventType: C, timing: 'apres', timingLabel: 'Après course' },
];

// ─── KINÉSITHÉRAPEUTE ─────────────────────────────────────────────────────────

export const FICHE_KINE_CLUB: FichePosteTask[] = [
  { name: 'Évaluer état musculaire des coureurs', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
  { name: 'Planifier créneaux massage / soins', eventType: S, timing: 'avant', timingLabel: 'Avant départ' },
  { name: 'Massages post-sortie', eventType: S, timing: 'apres', timingLabel: 'Après-midi / soir' },
  { name: 'Massage d\'avant course si prévu', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Suivi récupération post-course', eventType: C, timing: 'apres', timingLabel: 'Après course' },
];

export const FICHE_KINE_COMPETITION: FichePosteTask[] = [
  ...FICHE_KINE_CLUB,
  { name: 'Triage douleurs / alertes avant départ', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Coordonner planning massages avec assistants', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Protocole récupération entre étapes', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
];

export const FICHE_KINE_PRO: FichePosteTask[] = [
  ...FICHE_KINE_COMPETITION,
  { name: 'Liaison staff médical et encadrement', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Suivi traitements en cours (autorisations)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
];

// ─── MÉDECIN ─────────────────────────────────────────────────────────────────

export const FICHE_MEDECIN_CLUB: FichePosteTask[] = [
  { name: 'Vérifier aptitudes et traitements déclarés', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Kit médical course prêt (pharmacie, immobilisation)', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Point santé coureurs avant départ', eventType: C, timing: 'avant', timingLabel: 'Matin avant la course' },
  { name: 'Prise en charge incident en course si besoin', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
  { name: 'Bilan post-course (coups, chaleur, hydratation)', eventType: C, timing: 'apres', timingLabel: 'Après course' },
];

export const FICHE_MEDECIN_COMPETITION: FichePosteTask[] = [
  ...FICHE_MEDECIN_CLUB,
  { name: 'Coordination avec organisateur / secouristes', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Vérifier autorisations TUE / déclarations', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Suivi coureurs sur stage (fatigue, pathologies)', eventType: S, timing: 'pendant', timingLabel: "Arrivée à l'hôtel" },
];

export const FICHE_MEDECIN_PRO: FichePosteTask[] = [
  ...FICHE_MEDECIN_COMPETITION,
  { name: 'Interface protocole UCI / commissaires médicaux', eventType: C, timing: 'pendant', timingLabel: 'Avant la course' },
  { name: 'Protocole anti-dopage / whereabouts équipe', eventType: C, timing: 'avant', timingLabel: 'Veille de course' },
  { name: 'Couverture médicale multi-véhicules', eventType: C, timing: 'pendant', timingLabel: 'Pendant la course' },
];

import { AppSection } from '../types';
import { StaffRoleKeyString } from '../utils/staffRoleUtils';

export interface StaffDashboardAction {
  section: AppSection;
  label: string;
  description?: string;
}

export interface StaffDashboardConfig {
  missionTitle: string;
  missionSummary: string;
  /** Priorités opérationnelles issues des fiches de poste */
  focusAreas: string[];
  /** Raccourcis recommandés pour ce poste */
  quickActions: StaffDashboardAction[];
}

const BASE_LOGISTICS: StaffDashboardAction[] = [
  { section: 'myTrips', label: 'Mes déplacements', description: 'Trajets et transports planifiés' },
  { section: 'myCalendar', label: 'Mon calendrier', description: 'Disponibilités et convocations' },
];

export const STAFF_DASHBOARD_BY_ROLE: Record<StaffRoleKeyString, StaffDashboardConfig> = {
  DS: {
    missionTitle: 'Direction sportive',
    missionSummary:
      'Piloter la stratégie de course, coordonner staff et déplacements, valider les sélections et planifier la logistique de chaque épreuve.',
    focusAreas: [
      'Valider sélections coureurs et candidatures staff',
      'Planifier transports, véhicules et hébergements',
      'Organiser ravitos et logistique opérationnelle',
      'Suivre justificatifs et débriefings de course',
    ],
    quickActions: [
      { section: 'season-planning', label: 'Planning saison', description: 'Choix coureurs & dispo staff' },
      { section: 'staff', label: 'Staff & planning', description: 'Valider candidatures et effectif' },
      { section: 'scouting', label: 'Scouting & recrutement', description: 'Campagnes et profils' },
      { section: 'events', label: 'Calendrier courses', description: 'Logistique, transports, participants' },
      { section: 'vehicles', label: 'Véhicules', description: 'Flotte et affectations' },
      { section: 'checklist', label: 'Checklists', description: 'Fiches de poste et tâches' },
      { section: 'roster', label: 'Effectif', description: 'État de forme et sélections' },
      { section: 'expenseReceipts', label: 'Justificatifs', description: 'Frais de déplacement' },
      ...BASE_LOGISTICS,
    ],
  },
  ASSISTANT: {
    missionTitle: 'Assistanat sportif',
    missionSummary:
      'Assurer le confort et la performance des coureurs : bidons, ravitaillement, massages, hôtel et logistique quotidienne.',
    focusAreas: [
      'Préparer bidons et ravitos (veille & matin)',
      'Organiser massages et horaires sur WhatsApp',
      'Gérer chambres, repas et local dédié à l\'hôtel',
      'Lessive, lavage bidons et route retour',
    ],
    quickActions: [
      { section: 'missionSearch', label: 'Offres & missions', description: 'Postuler aux missions vacataires' },
      { section: 'events', label: 'Prochaines courses', description: 'Onglet « Mission assistant » (nutrition, massages)' },
      { section: 'checklist', label: 'Fiches de poste', description: 'Tâches Assistant (PDF)' },
      { section: 'expenseReceipts', label: 'Justificatifs', description: 'Frais de mission' },
      ...BASE_LOGISTICS,
    ],
  },
  MECANO: {
    missionTitle: 'Mécanique',
    missionSummary:
      'Garantir la fiabilité du matériel : préparation des vélos, camion atelier et suivi équipement en course.',
    focusAreas: [
      'Contrôler vélos et roues avant départ',
      'Gérer le camion atelier et les pièces',
      'Anticiper les besoins spécifiques par course',
      'Coordonner avec les assistants sur les déplacements',
    ],
    quickActions: [
      { section: 'missionSearch', label: 'Offres & missions', description: 'Postuler aux missions vacataires' },
      { section: 'equipment', label: 'Matériel', description: 'Vélos et équipement' },
      { section: 'vehicles', label: 'Véhicules', description: 'Flotte et camions' },
      { section: 'events', label: 'Calendrier', description: 'Courses assignées' },
      ...BASE_LOGISTICS,
    ],
  },
  ENTRAINEUR: {
    missionTitle: 'Entraînement',
    missionSummary:
      'Construire la préparation des coureurs : charge, qualité des sorties et alignement avec le calendrier compétition.',
    focusAreas: [
      'Suivre la charge et la forme de l\'effectif',
      'Ajuster la préparation selon le calendrier',
      'Contribuer aux choix de sélection',
      'Préparer les objectifs par course',
    ],
    quickActions: [
      { section: 'performance', label: 'Performance', description: 'PPR et analyses' },
      { section: 'roster', label: 'Effectif', description: 'Profils coureurs' },
      { section: 'season-planning', label: 'Planning saison', description: 'Calendrier cible' },
      { section: 'scouting', label: 'Scouting & recrutement', description: 'Campagnes et profils' },
      { section: 'events', label: 'Courses', description: 'Échéances à venir' },
      ...BASE_LOGISTICS,
    ],
  },
  RESP_PERF: {
    missionTitle: 'Performance',
    missionSummary:
      'Piloter les indicateurs de performance, les tests et l\'optimisation collective du niveau de l\'équipe.',
    focusAreas: [
      'Analyser les données de puissance et forme',
      'Identifier les axes de progression',
      'Alimenter le planning et les sélections',
      'Suivre les débriefings post-course',
    ],
    quickActions: [
      { section: 'performance', label: 'Pôle performance', description: 'Analyses et archives' },
      { section: 'roster', label: 'Effectif', description: 'Profils et suivi' },
      { section: 'season-planning', label: 'Planning saison', description: 'Vision saison' },
      { section: 'events', label: 'Courses', description: 'Échéances' },
    ],
  },
  PREPA_PHYSIQUE: {
    missionTitle: 'Préparation physique',
    missionSummary:
      'Optimiser la condition physique, la récupération et la disponibilité des athlètes sur la saison.',
    focusAreas: [
      'Monitorer fatigue et état de santé',
      'Adapter les protocoles de récupération',
      'Collaborer avec le staff médical',
      'Préparer les pics de forme',
    ],
    quickActions: [
      { section: 'performance', label: 'Performance', description: 'Suivi physiologique' },
      { section: 'roster', label: 'Effectif', description: 'État des coureurs' },
      { section: 'events', label: 'Courses', description: 'Calendrier' },
      ...BASE_LOGISTICS,
    ],
  },
  DATA_ANALYST: {
    missionTitle: 'Data',
    missionSummary:
      'Fournir des analyses objectives pour éclairer les décisions sportives et tactiques.',
    focusAreas: [
      'Produire des rapports avant/après course',
      'Croiser puissance, résultats et scouting',
      'Automatiser les indicateurs clés',
    ],
    quickActions: [
      { section: 'performance', label: 'Analyses', description: 'Données performance' },
      { section: 'scouting', label: 'Scouting', description: 'Profils et comparaisons' },
      { section: 'events', label: 'Courses', description: 'Contexte compétition' },
    ],
  },
  KINE: {
    missionTitle: 'Kinésithérapie',
    missionSummary:
      'Prévenir et traiter les blessures, assurer le suivi récupération en stage et en compétition.',
    focusAreas: [
      'Évaluer l\'état musculaire des coureurs',
      'Planifier les soins en étape',
      'Coordonner avec le staff médical',
    ],
    quickActions: [
      { section: 'roster', label: 'Effectif', description: 'Suivi santé' },
      { section: 'events', label: 'Courses', description: 'Missions à venir' },
      ...BASE_LOGISTICS,
    ],
  },
  MEDECIN: {
    missionTitle: 'Médecine du sport',
    missionSummary:
      'Garantir la sécurité sanitaire des athlètes et le respect des protocoles médicaux en course.',
    focusAreas: [
      'Valider l\'aptitude à la compétition',
      'Gérer les traitements et autorisations',
      'Assurer la couverture médicale sur les épreuves',
    ],
    quickActions: [
      { section: 'roster', label: 'Effectif', description: 'État de santé' },
      { section: 'events', label: 'Courses', description: 'Échéances' },
      ...BASE_LOGISTICS,
    ],
  },
  COMMUNICATION: {
    missionTitle: 'Communication',
    missionSummary:
      'Valoriser les résultats, gérer les contenus et soutenir l\'image de l\'équipe sur les épreuves.',
    focusAreas: [
      'Préparer les contenus avant course',
      'Couvrir les résultats en direct',
      'Coordonner avec la direction sportive',
    ],
    quickActions: [
      { section: 'events', label: 'Calendrier', description: 'Courses à couvrir' },
      { section: 'partnerPortal', label: 'Espace partenaire', description: 'Photos, résultats, newsletters' },
      { section: 'checklist', label: 'Checklists', description: 'Tâches média par rôle' },
      { section: 'myCalendar', label: 'Mon calendrier', description: 'Dispos & convocations' },
      ...BASE_LOGISTICS,
    ],
  },
  MANAGER: {
    missionTitle: 'Management',
    missionSummary: 'Piloter l\'organisation globale de l\'équipe, les ressources et la coordination inter-pôles.',
    focusAreas: [
      'Superviser budgets et effectifs',
      'Valider les décisions structurantes',
      'Anticiper les besoins de la saison',
    ],
    quickActions: [
      { section: 'myDashboard', label: 'Tableau de bord équipe', description: 'Vue globale' },
      { section: 'financial', label: 'Finances', description: 'Budgets' },
      { section: 'staff', label: 'Staff', description: 'Organisation' },
    ],
  },
  PRESIDENT: {
    missionTitle: 'Présidence',
    missionSummary:
      'Représenter l’association, valider les décisions stratégiques et superviser l’ensemble des pôles (mêmes droits que le Manager).',
    focusAreas: [
      'Valider les décisions structurantes et les engagements',
      'Superviser budgets, effectifs et gouvernance',
      'Représenter le club auprès des partenaires et institutions',
    ],
    quickActions: [
      { section: 'myDashboard', label: 'Tableau de bord équipe', description: 'Vue globale' },
      { section: 'financial', label: 'Finances', description: 'Budgets & trésorerie' },
      { section: 'staff', label: 'Staff', description: 'Organisation' },
      { section: 'settings', label: 'Paramètres', description: 'Structure & légal' },
    ],
  },
  VICE_PRESIDENT: {
    missionTitle: 'Vice-présidence',
    missionSummary:
      'Seconder le président et assurer la continuité de direction (mêmes droits d’accès que le Manager).',
    focusAreas: [
      'Assurer l’intérim de présidence si besoin',
      'Coordonner les pôles et le bureau',
      'Suivre les dossiers structurants',
    ],
    quickActions: [
      { section: 'myDashboard', label: 'Tableau de bord équipe', description: 'Vue globale' },
      { section: 'financial', label: 'Finances', description: 'Budgets' },
      { section: 'staff', label: 'Staff', description: 'Organisation' },
    ],
  },
  SECRETAIRE: {
    missionTitle: 'Secrétariat',
    missionSummary:
      'Assurer le suivi administratif de l’association : convocations, PV, licences, correspondance et organisation interne.',
    focusAreas: [
      'Gérer convocations, PV et documents associatifs',
      'Tenir à jour effectif staff et licences',
      'Coordonner l’agenda et la communication interne',
    ],
    quickActions: [
      { section: 'staff', label: 'Staff', description: 'Effectif & organisation' },
      { section: 'roster', label: 'Effectif', description: 'Licences & coureurs' },
      { section: 'events', label: 'Calendrier', description: 'Événements' },
      { section: 'checklist', label: 'Checklists', description: 'Suivi tâches' },
      ...BASE_LOGISTICS,
    ],
  },
  TRESORIER: {
    missionTitle: 'Trésorerie',
    missionSummary:
      'Piloter la trésorerie et le suivi financier de l’association : budgets, justificatifs, factures et exports comptables.',
    focusAreas: [
      'Suivre budgets, encaissements et décaissements',
      'Valider justificatifs et factures missions',
      'Préparer les exports pour le comptable',
    ],
    quickActions: [
      { section: 'financial', label: 'Finances', description: 'Budgets & facturation' },
      { section: 'expenseReceipts', label: 'Justificatifs', description: 'Notes de frais' },
      { section: 'myDashboard', label: 'Tableau de bord', description: 'Vue d’ensemble' },
    ],
  },
  AUTRE: {
    missionTitle: 'Staff',
    missionSummary: 'Contribuer aux missions de l\'équipe selon votre rôle et vos disponibilités.',
    focusAreas: [
      'Consulter vos convocations',
      'Préparer vos déplacements',
      'Tenir à jour vos disponibilités',
    ],
    quickActions: [
      { section: 'events', label: 'Calendrier', description: 'Événements équipe' },
      ...BASE_LOGISTICS,
    ],
  },
  SOIGNEUR: {
    missionTitle: 'Soins / soigneur',
    missionSummary:
      'Assurer le confort des coureurs en course et en stage : soins, récupération, logistique quotidienne.',
    focusAreas: [
      'Préparer soins et matériel soigneur',
      'Coordonner massages et récupération',
      'Appuyer l’assistant sur le terrain',
    ],
    quickActions: [
      { section: 'missionSearch', label: 'Offres & missions', description: 'Postuler' },
      { section: 'events', label: 'Courses', description: 'Missions assignées' },
      ...BASE_LOGISTICS,
    ],
  },
  MATERIAL: {
    missionTitle: 'Matériel',
    missionSummary: 'Gérer stock pièces, roues et organisation atelier / camion.',
    focusAreas: ['Inventaire pièces', 'Préparer le camion atelier', 'Coordonner avec le mécano course'],
    quickActions: [
      { section: 'equipment', label: 'Matériel', description: 'Stock & vélos' },
      { section: 'vehicles', label: 'Véhicules', description: 'Camions' },
      ...BASE_LOGISTICS,
    ],
  },
  PHOTO_VIDEO: {
    missionTitle: 'Photo / vidéo',
    missionSummary: 'Couvrir les épreuves et produire les contenus image de l’équipe.',
    focusAreas: ['Couverture course', 'Livraison médias partenaires', 'Archivage contenus'],
    quickActions: [
      { section: 'events', label: 'Calendrier', description: 'Courses à couvrir' },
      { section: 'partnerPortal', label: 'Espace partenaire', description: 'Médias' },
      ...BASE_LOGISTICS,
    ],
  },
  OSTEOPATHE: {
    missionTitle: 'Ostéopathie',
    missionSummary: 'Prévenir et traiter les troubles musculo-squelettiques en stage et en compétition.',
    focusAreas: ['Bilans ostéo', 'Soins en étape', 'Coordination médicale'],
    quickActions: [
      { section: 'roster', label: 'Effectif', description: 'Suivi santé' },
      { section: 'events', label: 'Courses', description: 'Missions' },
      ...BASE_LOGISTICS,
    ],
  },
  NUTRITIONNISTE: {
    missionTitle: 'Nutrition',
    missionSummary: 'Piloter l’alimentation, les collations et la stratégie glucidique des athlètes.',
    focusAreas: ['Plans nutrition', 'Collations course', 'Coordination assistant'],
    quickActions: [
      { section: 'events', label: 'Courses', description: 'Mission nutrition' },
      { section: 'roster', label: 'Effectif', description: 'Régimes & allergies' },
      ...BASE_LOGISTICS,
    ],
  },
  CHAUFFEUR: {
    missionTitle: 'Conduite',
    missionSummary: 'Assurer les transferts coureurs / staff en sécurité selon le planning transports.',
    focusAreas: ['Trajets planifiés', 'Véhicules affectés', 'Horaires aéroport / hôtel'],
    quickActions: [
      { section: 'myTrips', label: 'Mes déplacements', description: 'Trajets' },
      { section: 'vehicles', label: 'Véhicules', description: 'Affectations' },
      ...BASE_LOGISTICS,
    ],
  },
  LOGISTICIEN: {
    missionTitle: 'Logistique',
    missionSummary: 'Coordonner flux matériel, stocks et organisation terrain hors mécanique pure.',
    focusAreas: ['Flux matériel', 'Stocks course', 'Coordination staff'],
    quickActions: [
      { section: 'stocks', label: 'Stocks', description: 'Inventaires' },
      { section: 'events', label: 'Courses', description: 'Logistique' },
      ...BASE_LOGISTICS,
    ],
  },
  CUISINIER: {
    missionTitle: 'Restauration',
    missionSummary: 'Préparer repas et collations adaptés aux besoins nutritionnels en stage / course.',
    focusAreas: ['Menus stage', 'Allergies & régimes', 'Coordination nutritionniste'],
    quickActions: [
      { section: 'events', label: 'Courses / stages', description: 'Planning repas' },
      ...BASE_LOGISTICS,
    ],
  },
  HOSPITALITY: {
    missionTitle: 'Hospitalité',
    missionSummary: 'Accueil VIP, partenaires et organisation côté hospitalité sur les épreuves.',
    focusAreas: ['Accueil partenaires', 'Zones VIP', 'Coordination communication'],
    quickActions: [
      { section: 'events', label: 'Calendrier', description: 'Épreuves' },
      { section: 'partnerPortal', label: 'Partenaires', description: 'Hospitalité' },
      ...BASE_LOGISTICS,
    ],
  },
};

export function getStaffDashboardConfig(roleKey: StaffRoleKeyString | null): StaffDashboardConfig {
  if (roleKey && STAFF_DASHBOARD_BY_ROLE[roleKey]) {
    return STAFF_DASHBOARD_BY_ROLE[roleKey];
  }
  return STAFF_DASHBOARD_BY_ROLE.AUTRE;
}

import {
  Mission,
  MissionApplication,
  MissionApplicationStatus,
  MissionCompensationType,
  MissionStatus,
  StaffRole,
} from '../types';

/** Équipes fictives pour l’affichage marketplace (demos). */
export const DEMO_MISSION_TEAMS: Record<string, string> = {
  team_demo_wwt_f: 'Canyon–SRAM Racing (demo)',
  team_demo_continental_f: 'FDJ–Suez Conti (demo)',
  team_demo_pro_h: 'TotalEnergies ProTeam (demo)',
  team_demo_club: 'VC Nantes Atlantique (demo)',
};

type DemoMission = Omit<Mission, 'teamId'> & { demoTeamKey: keyof typeof DEMO_MISSION_TEAMS };

function demoApp(partial: MissionApplication): MissionApplication {
  return partial;
}

/** Offre phare avec pipeline de candidatures fictives (suivi recrutement). */
export const DEMO_MISSION_WITH_PIPELINE_ID = 'demo_mission_assistant_lorient_suivi';

/**
 * Offres d’emploi / missions vacataires d’exemple —
 * alignées sur le calendrier UCI Women’s WorldTour 2026 (+ quelques courses H / stages).
 */
export const DEMO_MISSIONS: DemoMission[] = [
  {
    id: DEMO_MISSION_WITH_PIPELINE_ID,
    demoTeamKey: 'team_demo_club',
    title: 'Assistant(e) — Classic Lorient Agglomération',
    role: StaffRole.ASSISTANT,
    startDate: '2026-08-28',
    endDate: '2026-08-30',
    location: 'Lorient, France',
    description:
      'Renfort J-1 / jour J sur Classic Lorient CERATIZIT (29 août 2026). Bidons, ravitaillement, organisation vestiaires. Offre d’exemple avec suivi candidatures.',
    requirements: ['Permis B', 'Disponibilité week-end', 'Statut vacataire ou bénévole'],
    compensationType: MissionCompensationType.VOLUNTEER,
    compensation: 'Bénévolat — logement & repas pris en charge',
    status: MissionStatus.OPEN,
    applicants: [
      'demo_cand_lea',
      'demo_cand_marie',
      'demo_cand_hugo',
      'demo_cand_sofia',
      'demo_cand_paul',
    ],
    applications: [
      demoApp({
        id: 'app_lea',
        userId: 'demo_cand_lea',
        firstName: 'Léa',
        lastName: 'Martin',
        email: 'lea.martin.vacataire.demo@logicycle.fr',
        phone: '06 12 34 56 01',
        roleLabel: 'Assistant(e)',
        city: 'Lorient',
        dailyRate: 140,
        message: 'Habite Lorient, dispo le week-end. 4 saisons Elite.',
        appliedAt: '2026-07-10T09:15:00.000Z',
        status: MissionApplicationStatus.INTERVIEW,
        internalNote: 'Entretien prévu 18/07 · très locale',
      }),
      demoApp({
        id: 'app_marie',
        userId: 'demo_cand_marie',
        firstName: 'Marie',
        lastName: 'Fontaine',
        email: 'marie.fontaine.vacataire.demo@logicycle.fr',
        phone: '06 12 34 56 13',
        roleLabel: 'Assistant(e)',
        city: 'Hennebont',
        dailyRate: 125,
        message: 'Déjà faite Classic Lorient l’an passé — motivée pour recommencer.',
        appliedAt: '2026-07-11T14:30:00.000Z',
        status: MissionApplicationStatus.SHORTLISTED,
        internalNote: 'Bonne référence 2025',
      }),
      demoApp({
        id: 'app_hugo',
        userId: 'demo_cand_hugo',
        firstName: 'Hugo',
        lastName: 'Lefèvre',
        email: 'hugo.lefevre.vacataire.demo@logicycle.fr',
        phone: '06 12 34 56 08',
        roleLabel: 'Préparateur physique',
        city: 'Saint-Nazaire',
        dailyRate: 165,
        message: 'Profil prépa mais je peux aussi assurer assistant polyvalent.',
        appliedAt: '2026-07-12T08:00:00.000Z',
        status: MissionApplicationStatus.REVIEWING,
      }),
      demoApp({
        id: 'app_sofia',
        userId: 'demo_cand_sofia',
        firstName: 'Sofia',
        lastName: 'Rossi',
        email: 'sofia.rossi.vacataire.demo@logicycle.fr',
        phone: '06 12 34 56 15',
        roleLabel: 'Kinésithérapeute',
        city: 'Nice',
        dailyRate: 230,
        message: 'Passage en Bretagne début septembre — dispo ce week-end si besoin kiné/assistant.',
        appliedAt: '2026-07-13T16:45:00.000Z',
        status: MissionApplicationStatus.RECEIVED,
      }),
      demoApp({
        id: 'app_paul',
        userId: 'demo_cand_paul',
        firstName: 'Paul',
        lastName: 'Garcia',
        email: 'paul.garcia.vacataire.demo@logicycle.fr',
        phone: '06 12 34 56 12',
        roleLabel: 'Mécanicien',
        city: 'Auray',
        dailyRate: 175,
        message: 'Candidature exploratoire — je préfère un poste mécano.',
        appliedAt: '2026-07-09T11:20:00.000Z',
        status: MissionApplicationStatus.REJECTED,
        internalNote: 'Hors cible rôle · à recontacter si besoin mécano',
      }),
    ],
  },
  {
    id: 'demo_mission_assistant_vuelta_f',
    demoTeamKey: 'team_demo_wwt_f',
    title: 'Assistant(e) — Vuelta España Femenina',
    role: StaffRole.ASSISTANT,
    startDate: '2026-05-02',
    endDate: '2026-05-11',
    location: 'Espagne (8 étapes)',
    description:
      'Renfort assistant sportif sur la Vuelta Femenina 2026 (3–10 mai). Bidons, ravitos voiture DS, massages, coordination hôtel et transferts étapes.',
    requirements: ['Expérience course UCI', 'Permis B', 'Disponibilité complète sur 10 jours'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '160 € / jour + frais',
    dailyRate: 160,
    status: MissionStatus.OPEN,
    applicants: [],
    applications: [],
  },
  {
    id: 'demo_mission_mecano_giro_f',
    demoTeamKey: 'team_demo_wwt_f',
    title: 'Mécanicien(ne) — Giro d’Italia Women',
    role: StaffRole.MECANO,
    startDate: '2026-05-29',
    endDate: '2026-06-08',
    location: 'Italie (9 étapes)',
    description:
      'Mécano atelier / course sur le Giro Women 2026 (30 mai–7 juin). Montage roues, SAV j+1, assistance neutre, gestion stocks pièces.',
    requirements: ['Expérience WorldTour ou Conti', 'Outillage personnel', 'Anglais ou italien apprécié'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '200 € / jour + logement',
    dailyRate: 200,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_kine_tdf_f',
    demoTeamKey: 'team_demo_wwt_f',
    title: 'Kinésithérapeute — Tour de France Femmes',
    role: StaffRole.KINE,
    startDate: '2026-07-31',
    endDate: '2026-08-10',
    location: 'Lausanne → Nice',
    description:
      'Suivi kiné quotidien sur le Tour de France Femmes 2026 (1–9 août). Soins récupération, strapping, coordination médecin / coach.',
    requirements: ['Diplôme kiné', 'Expérience sport de haut niveau', 'Disponibilité Grand Tour'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '220 € / jour + logement & repas',
    dailyRate: 220,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_comm_paris_roubaix_f',
    demoTeamKey: 'team_demo_continental_f',
    title: 'Communication — Paris-Roubaix Femmes',
    role: StaffRole.COMMUNICATION,
    startDate: '2026-04-11',
    endDate: '2026-04-13',
    location: 'Denain → Roubaix',
    description:
      'Couverture réseaux et contenus live autour de Paris-Roubaix Femmes (12 avril 2026). Stories, photos pavés, interviews arrivée.',
    requirements: ['Portfolio réseaux sociaux', 'Matériel photo / vidéo', 'Anglais apprécié'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '180 € / jour',
    dailyRate: 180,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_ds_itzulia_f',
    demoTeamKey: 'team_demo_continental_f',
    title: 'Directeur(trice) sportif(ve) vacataire — Itzulia Women',
    role: StaffRole.DS,
    startDate: '2026-05-14',
    endDate: '2026-05-18',
    location: 'Pays Basque (3 étapes)',
    description:
      'DS vacataire sur Itzulia Women 2026 (15–17 mai). Briefs stratégiques, radio course, coordination voiture suiveuse.',
    requirements: ['Expérience DS Conti / Elite', 'Permis B', 'Licence fédérale à jour'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '250 € / jour + véhicule fourni',
    dailyRate: 250,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_medecin_suisse_f',
    demoTeamKey: 'team_demo_wwt_f',
    title: 'Médecin — Tour de Suisse Women',
    role: StaffRole.MEDECIN,
    startDate: '2026-06-16',
    endDate: '2026-06-22',
    location: 'Suisse (5 étapes)',
    description:
      'Couverture médicale Tour de Suisse Women 2026 (17–21 juin). Visites à l’effort, urgences course, liaison hôpital locale.',
    requirements: ['Diplôme médecine du sport', 'Assurance RC pro', 'Anglais ou allemand'],
    compensationType: MissionCompensationType.FIXED_AMOUNT,
    compensation: 'Montant fixe 1 400 € + frais',
    dailyRate: 200,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_mecano_britain_f',
    demoTeamKey: 'team_demo_continental_f',
    title: 'Mécanicien(ne) — Tour of Britain Women',
    role: StaffRole.MECANO,
    startDate: '2026-08-19',
    endDate: '2026-08-24',
    location: 'Grande-Bretagne (4 étapes)',
    description:
      'Assistance mécanique Lloyds Tour of Britain Women 2026 (20–23 août). Atelier mobile, roues de secours, SAV soir.',
    requirements: ['Expérience UCI 2.x / WWT', 'Permis B', 'Anglais courant'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '190 € / jour + logement',
    dailyRate: 190,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_prepa_stage_altitude',
    demoTeamKey: 'team_demo_pro_h',
    title: 'Préparateur(trice) physique — Stage altitude',
    role: StaffRole.PREPA_PHYSIQUE,
    startDate: '2026-05-10',
    endDate: '2026-05-17',
    location: 'Sierra Nevada, Espagne',
    description:
      'Encadrement charge d’entraînement / récupération sur stage altitude 8 jours. Tests terrain, suivi RPE, liaison coachs.',
    requirements: ['Diplôme STAPS / diplôme prépa', 'Expérience pro cyclisme', 'Espagnol basique'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '170 € / jour + logement',
    dailyRate: 170,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_data_tdf_f',
    demoTeamKey: 'team_demo_wwt_f',
    title: 'Data analyste — Tour de France Femmes',
    role: StaffRole.DATA_ANALYST,
    startDate: '2026-07-31',
    endDate: '2026-08-10',
    location: 'Remote + présentiel étapes clés',
    description:
      'Analyses live puissance / stratégie GC sur TdFF 2026. Dashboards étape, brief DS, post-course reports.',
    requirements: ['Python / Excel avancé', 'Connaissance données cyclisme', 'Anglais'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '210 € / jour',
    dailyRate: 210,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_entraineur_simac',
    demoTeamKey: 'team_demo_continental_f',
    title: 'Entraîneur(se) — Simac Ladies Tour',
    role: StaffRole.ENTRAINEUR,
    startDate: '2026-09-08',
    endDate: '2026-09-14',
    location: 'Pays-Bas (5 étapes)',
    description:
      'Suivi entraînement et tactique sur Simac Ladies Tour 2026 (9–13 sept.). Briefs matinal, analyse vidéo, liaison coureuses.',
    requirements: ['Diplôme entraînement cyclisme', 'Expérience Elite / Conti F', 'Néerlandais ou anglais'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '190 € / jour + frais',
    dailyRate: 190,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_comm_podium_avenir',
    demoTeamKey: 'team_demo_pro_h',
    title: 'Communication — Podium Tour de l’Avenir',
    role: StaffRole.COMMUNICATION,
    startDate: '2026-08-22',
    endDate: '2026-08-24',
    location: 'Super-Besse, France',
    description:
      'Prise de parole podium, interviews coureurs, coordination presse locale pour l’étape reine du Tour de l’Avenir.',
    requirements: ['Aisance micro / caméra', 'Connaissance milieu cycliste'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '200 € / jour',
    dailyRate: 200,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_assistant_limousin',
    demoTeamKey: 'team_demo_club',
    title: 'Assistant(e) vacataire — Tour du Limousin',
    role: StaffRole.ASSISTANT,
    startDate: '2026-05-14',
    endDate: '2026-05-18',
    location: 'Limoges / Corrèze (3 étapes)',
    description:
      'Assistance logistique sur Tour du Limousin UCI 2.1. Bidons, lessive, suivi hôtel, appui mécanique léger.',
    requirements: ['Statut vacataire', 'Permis B', 'Disponibilité 5 jours'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '140 € / jour + logement',
    dailyRate: 140,
    status: MissionStatus.OPEN,
    applicants: [],
  },
  {
    id: 'demo_mission_resp_perf_romandie',
    demoTeamKey: 'team_demo_wwt_f',
    title: 'Responsable performance — Tour de Romandie Féminin',
    role: StaffRole.RESP_PERF,
    startDate: '2026-09-03',
    endDate: '2026-09-07',
    location: 'Suisse romande (3 étapes)',
    description:
      'Pilotage perf / data terrain sur Romandie Féminin 2026 (4–6 sept.). Tests avant course, feedback coureuses, synthèse DS.',
    requirements: ['Profil performance / physiologie', 'Expérience UCI', 'Anglais ou allemand'],
    compensationType: MissionCompensationType.FREELANCE,
    compensation: '230 € / jour',
    dailyRate: 230,
    status: MissionStatus.OPEN,
    applicants: [],
  },
];

export function isDemoMission(id: string): boolean {
  return id.startsWith('demo_mission_');
}

export function getDemoMissionTeamName(teamId: string): string | undefined {
  return DEMO_MISSION_TEAMS[teamId];
}

export function getMissionApplications(mission: Mission): MissionApplication[] {
  if (mission.applications?.length) return mission.applications;
  return [];
}

export function countMissionApplications(mission: Mission): number {
  const fromApps = mission.applications?.length || 0;
  if (fromApps > 0) return fromApps;
  return mission.applicants?.length || 0;
}

/** Lie une candidature démo au profil vacataire marketplace (fiche détaillée). */
export const DEMO_CANDIDATE_TO_VACATAIRE: Record<string, string> = {
  demo_cand_lea: 'demo_vac_assistant_lea',
  demo_cand_marie: 'demo_vac_assistant_marie',
  demo_cand_hugo: 'demo_vac_prepa_hugo',
  demo_cand_sofia: 'demo_vac_kine_sofia',
  demo_cand_paul: 'demo_vac_mecano_paul',
};

export const DEMO_CANDIDATE_EMAIL_TO_VACATAIRE: Record<string, string> = {
  'lea.martin.vacataire.demo@logicycle.fr': 'demo_vac_assistant_lea',
  'marie.fontaine.vacataire.demo@logicycle.fr': 'demo_vac_assistant_marie',
  'hugo.lefevre.vacataire.demo@logicycle.fr': 'demo_vac_prepa_hugo',
  'sofia.rossi.vacataire.demo@logicycle.fr': 'demo_vac_kine_sofia',
  'paul.garcia.vacataire.demo@logicycle.fr': 'demo_vac_mecano_paul',
};

export function resolveVacataireIdForApplicant(userId: string, email?: string): string | undefined {
  if (DEMO_CANDIDATE_TO_VACATAIRE[userId]) return DEMO_CANDIDATE_TO_VACATAIRE[userId];
  if (email) {
    const key = email.trim().toLowerCase();
    if (DEMO_CANDIDATE_EMAIL_TO_VACATAIRE[key]) return DEMO_CANDIDATE_EMAIL_TO_VACATAIRE[key];
  }
  return undefined;
}

export function buildDemoMissionsForTeam(_fallbackTeamId?: string): Mission[] {
  return DEMO_MISSIONS.map(({ demoTeamKey, ...mission }) => ({
    ...mission,
    teamId: demoTeamKey,
  }));
}

/**
 * Missions déjà acceptées pour un vacataire (calendrier indépendant / aperçu Super Admin).
 * Les dates correspondent à des week-ends / courses d’exemple.
 */
export function buildDemoAcceptedMissionsForUser(userId: string): Mission[] {
  if (!userId) return [];
  const acceptedApp = (partial: Omit<MissionApplication, 'userId' | 'status'>): MissionApplication => ({
    ...partial,
    userId,
    status: MissionApplicationStatus.ACCEPTED,
  });

  return [
    {
      id: `demo_accepted_weekend_${userId.slice(0, 8)}`,
      teamId: 'team_demo_club',
      title: 'Assistant(e) — Classic Lorient (confirmé)',
      role: StaffRole.ASSISTANT,
      startDate: '2026-08-28',
      endDate: '2026-08-30',
      location: 'Lorient, France',
      description:
        'Mission week-end confirmée : vous êtes intégré(e) à l’événement. Visible dans votre calendrier.',
      requirements: ['Permis B'],
      compensationType: MissionCompensationType.VOLUNTEER,
      compensation: 'Bénévolat — logement & repas',
      status: MissionStatus.FILLED,
      applicants: [userId],
      applications: [
        acceptedApp({
          id: `app_accepted_${userId}`,
          firstName: 'Vous',
          lastName: '',
          email: '',
          appliedAt: '2026-07-12T10:00:00.000Z',
          roleLabel: 'Assistant(e)',
        }),
      ],
    },
    {
      id: `demo_accepted_stage_${userId.slice(0, 8)}`,
      teamId: 'team_demo_continental_f',
      title: 'Mécano vacataire — Stage pré-saison',
      role: StaffRole.MECANO,
      startDate: '2026-09-12',
      endDate: '2026-09-14',
      location: 'Quiberon, France',
      description: 'Intégration week-end stage équipe Conti — atelier mobile et SAV.',
      requirements: [],
      compensationType: MissionCompensationType.FREELANCE,
      compensation: '180 € / jour',
      dailyRate: 180,
      status: MissionStatus.FILLED,
      applicants: [userId],
      applications: [
        acceptedApp({
          id: `app_accepted_stage_${userId}`,
          firstName: 'Vous',
          lastName: '',
          email: '',
          appliedAt: '2026-07-15T10:00:00.000Z',
          roleLabel: 'Mécano',
        }),
      ],
    },
  ];
}

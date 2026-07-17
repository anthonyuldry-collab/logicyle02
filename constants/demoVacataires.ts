import {
  Address,
  LanguageProficiency,
  Sex,
  StaffMember,
  StaffRole,
  StaffStatus,
} from '../types';

/** Adresse de repli si le club n’a pas renseigné sa base (filtre distance). */
export const DEMO_RECRUITMENT_BASE_ADDRESS: Address = {
  streetName: '1 avenue de la Base',
  postalCode: '56100',
  city: 'Lorient',
  country: 'France',
};

export interface VacataireReview {
  id: string;
  teamName: string;
  rating: number;
  comment: string;
  date: string;
  eventName?: string;
}

export interface DemoVacataireProfile {
  experienceYears: number;
  certifications: string[];
  languages: { language: string; proficiency: LanguageProficiency }[];
  availabilityNote: string;
  reviews: VacataireReview[];
}

type DemoVacataire = StaffMember & { demoDistanceKm: number };

function rev(
  id: string,
  teamName: string,
  rating: number,
  comment: string,
  date: string,
  eventName?: string
): VacataireReview {
  return { id, teamName, rating, comment, date, eventName };
}

/**
 * Profils vacataires d’exemple pour l’onglet Recrutement (Staff).
 */
export const DEMO_VACATAIRES: DemoVacataire[] = [
  {
    id: 'demo_vac_assistant_lea',
    firstName: 'Léa',
    lastName: 'Martin',
    email: 'lea.martin.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 01',
    role: StaffRole.ASSISTANT,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Bidons & ravitos', 'Massages', 'Logistique hôtel', 'Permis B'],
    professionalSummary:
      'Assistante sportive vacataire — 4 saisons Elite / Conti. Disponible week-ends et stages.',
    address: { city: 'Lorient', postalCode: '56100', country: 'France' },
    dailyRate: 140,
    availability: [],
    demoDistanceKm: 8,
  },
  {
    id: 'demo_vac_mecano_thomas',
    firstName: 'Thomas',
    lastName: 'Bernard',
    email: 'thomas.bernard.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 02',
    role: StaffRole.MECANO,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['SAV course', 'Atelier mobile', 'Roues carbone', 'Di2 / eTap'],
    professionalSummary:
      'Mécanicien UCI 2.x / WWT F. Camion atelier autonome. Ouvert aux courses à étapes.',
    address: { city: 'Vannes', postalCode: '56000', country: 'France' },
    dailyRate: 190,
    availability: [],
    demoDistanceKm: 55,
  },
  {
    id: 'demo_vac_comm_sarah',
    firstName: 'Sarah',
    lastName: 'Dupont',
    email: 'sarah.dupont.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 03',
    role: StaffRole.COMMUNICATION,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Réseaux sociaux', 'Photo / vidéo', 'Interviews', 'Anglais'],
    professionalSummary:
      'Chargée de communication freelance cyclisme. Couverture live classiques & tours femmes.',
    address: { city: 'Nantes', postalCode: '44000', country: 'France' },
    dailyRate: 170,
    availability: [],
    demoDistanceKm: 130,
  },
  {
    id: 'demo_vac_kine_amine',
    firstName: 'Amine',
    lastName: 'Benali',
    email: 'amine.benali.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 04',
    role: StaffRole.KINE,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Récupération', 'Strapping', 'Therapie manuelle', 'Sport santé'],
    professionalSummary:
      'Kinésithérapeute du sport — missions Grand Tour et stages altitude.',
    address: { city: 'Quimper', postalCode: '29000', country: 'France' },
    dailyRate: 210,
    availability: [],
    demoDistanceKm: 70,
  },
  {
    id: 'demo_vac_ds_claire',
    firstName: 'Claire',
    lastName: 'Moreau',
    email: 'claire.moreau.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 05',
    role: StaffRole.DS,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Stratégie course', 'Radio', 'Lecture parcours', 'Licence DS'],
    professionalSummary:
      'Directrice sportive vacataire Elite / Conti F. Expérience Itzulia, TdFF, circuits FFC.',
    address: { city: 'Rennes', postalCode: '35000', country: 'France' },
    dailyRate: 240,
    availability: [],
    demoDistanceKm: 150,
  },
  {
    id: 'demo_vac_med_julien',
    firstName: 'Julien',
    lastName: 'Petit',
    email: 'julien.petit.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 06',
    role: StaffRole.MEDECIN,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Médecine du sport', 'Urgences terrain', 'Anti-dopage', 'Anglais'],
    professionalSummary:
      'Médecin du sport — couverture courses UCI et stages collectifs.',
    address: { city: 'Brest', postalCode: '29200', country: 'France' },
    dailyRate: 280,
    availability: [],
    demoDistanceKm: 120,
  },
  {
    id: 'demo_vac_assistant_nina',
    firstName: 'Nina',
    lastName: 'Rousseau',
    email: 'nina.rousseau.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 07',
    role: StaffRole.ASSISTANT,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Nutrition course', 'Lessive', 'Gestion chambres', 'Espagnol'],
    professionalSummary:
      'Assistante vacataire spécialisée stages altitude et courses à étapes Espagne.',
    address: { city: 'Lanester', postalCode: '56600', country: 'France' },
    dailyRate: 135,
    availability: [],
    demoDistanceKm: 4,
  },
  {
    id: 'demo_vac_prepa_hugo',
    firstName: 'Hugo',
    lastName: 'Lefèvre',
    email: 'hugo.lefevre.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 08',
    role: StaffRole.PREPA_PHYSIQUE,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Charge entraînement', 'Tests terrain', 'Récupération', 'Data'],
    professionalSummary:
      'Préparateur physique freelance — renforts stage et suivi perf ponctuel.',
    address: { city: 'Saint-Nazaire', postalCode: '44600', country: 'France' },
    dailyRate: 165,
    availability: [],
    demoDistanceKm: 95,
  },
  {
    id: 'demo_vac_entraineur_emma',
    firstName: 'Emma',
    lastName: 'Girard',
    email: 'emma.girard.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 09',
    role: StaffRole.ENTRAINEUR,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Planification', 'Analyse vidéo', 'Tactique course', 'Anglais'],
    professionalSummary:
      'Entraîneuse vacataire Conti F / Elite — renforts TdFF, Simac Ladies Tour, stages hiver.',
    address: { city: 'Angers', postalCode: '49000', country: 'France' },
    dailyRate: 185,
    availability: [],
    demoDistanceKm: 175,
  },
  {
    id: 'demo_vac_data_lucas',
    firstName: 'Lucas',
    lastName: 'Nguyen',
    email: 'lucas.nguyen.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 10',
    role: StaffRole.DATA_ANALYST,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Python', 'Puissance', 'Dashboards live', 'WKO / GoldenCheetah'],
    professionalSummary:
      'Data analyste cyclisme — missions remote + présentiel étapes clés Grand Tours F.',
    address: { city: 'Paris', postalCode: '75011', country: 'France' },
    dailyRate: 200,
    availability: [],
    demoDistanceKm: 450,
  },
  {
    id: 'demo_vac_resp_perf_ines',
    firstName: 'Inès',
    lastName: 'Lambert',
    email: 'ines.lambert.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 11',
    role: StaffRole.RESP_PERF,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Physiologie', 'Tests lactiques', 'Coordination coachs', 'Allemand'],
    professionalSummary:
      'Responsable perf freelance — missions Romandie, Suisse Women, stages altitude.',
    address: { city: 'Lyon', postalCode: '69003', country: 'France' },
    dailyRate: 220,
    availability: [],
    demoDistanceKm: 680,
  },
  {
    id: 'demo_vac_mecano_paul',
    firstName: 'Paul',
    lastName: 'Garcia',
    email: 'paul.garcia.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 12',
    role: StaffRole.MECANO,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['TT setup', 'Roulements', 'Pressions pneus', 'Camion atelier'],
    professionalSummary:
      'Mécano spécialisé chronos et stages TT. Dispo Classics Ardennes & Espagne.',
    address: { city: 'Auray', postalCode: '56400', country: 'France' },
    dailyRate: 175,
    availability: [],
    demoDistanceKm: 35,
  },
  {
    id: 'demo_vac_assistant_marie',
    firstName: 'Marie',
    lastName: 'Fontaine',
    email: 'marie.fontaine.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 13',
    role: StaffRole.ASSISTANT,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Permis B', 'Cuisine course', 'Massage', 'Organisation vestiaires'],
    professionalSummary:
      'Assistante polyvalente — week-ends Coupe de France et Classique Lorient.',
    address: { city: 'Hennebont', postalCode: '56700', country: 'France' },
    dailyRate: 125,
    availability: [],
    demoDistanceKm: 12,
  },
  {
    id: 'demo_vac_comm_antoine',
    firstName: 'Antoine',
    lastName: 'Marchand',
    email: 'antoine.marchand.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 14',
    role: StaffRole.COMMUNICATION,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Drone', 'Montage vidéo', 'TikTok / IG', 'Presse locale'],
    professionalSummary:
      'Vidéaste / community manager — couverture live Paris-Roubaix Femmes & Lorient.',
    address: { city: 'Ploemeur', postalCode: '56270', country: 'France' },
    dailyRate: 160,
    availability: [],
    demoDistanceKm: 10,
  },
  {
    id: 'demo_vac_kine_sofia',
    firstName: 'Sofia',
    lastName: 'Rossi',
    email: 'sofia.rossi.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 15',
    role: StaffRole.KINE,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Ostéo soft', 'Cryothérapie', 'Récup étape', 'Italien / Français'],
    professionalSummary:
      'Kinésithérapeute italienne — missions Giro Women, Vuelta Femenina, stages IT.',
    address: { city: 'Nice', postalCode: '06000', country: 'France' },
    dailyRate: 230,
    availability: [],
    demoDistanceKm: 980,
  },
  {
    id: 'demo_vac_manager_olivier',
    firstName: 'Olivier',
    lastName: 'Carrel',
    email: 'olivier.carrel.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 16',
    role: StaffRole.MANAGER,
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Budget course', 'Hébergements', 'Coordination staff', 'Contrats'],
    professionalSummary:
      'Manager opérationnel vacataire — organisation logistique courses à étapes.',
    address: { city: 'Bordeaux', postalCode: '33000', country: 'France' },
    dailyRate: 195,
    availability: [],
    demoDistanceKm: 520,
  },
  {
    id: 'demo_vac_autre_chloe',
    firstName: 'Chloé',
    lastName: 'Pasquier',
    email: 'chloe.pasquier.vacataire.demo@logicycle.fr',
    phone: '06 12 34 56 17',
    role: StaffRole.AUTRE,
    customRole: 'Chauffeuse / logistique',
    status: StaffStatus.VACATAIRE,
    openToExternalMissions: true,
    skills: ['Permis D', 'Conduite bus', 'Transferts étapes', 'Chargement matériel'],
    professionalSummary:
      'Chauffeuse bus équipe — transferts Grands Tours et stages collectifs.',
    address: { city: 'Pontivy', postalCode: '56300', country: 'France' },
    dailyRate: 150,
    availability: [],
    demoDistanceKm: 60,
  },
];

/** Fiches détaillées + avis (notation marketplace). */
export const DEMO_VACATAIRE_PROFILES: Record<string, DemoVacataireProfile> = {
  demo_vac_assistant_lea: {
    experienceYears: 4,
    certifications: ['PSC1', 'Permis B'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Dispo week-ends et stages 5–10 jours · préavis 10 jours.',
    reviews: [
      rev('r1', 'FDJ–Suez Conti', 5, 'Très pro sur Lorient, excellente organisation bidons.', '2025-08-30', 'Classic Lorient'),
      rev('r2', 'VC Nantes', 4, 'Bonne énergie, massages soignés le soir.', '2025-06-15', 'Tour du Limousin'),
      rev('r3', 'Canyon–SRAM (renfort)', 5, 'Intégration rapide sur Vuelta Femenina.', '2025-05-12', 'Vuelta Femenina'),
    ],
  },
  demo_vac_mecano_thomas: {
    experienceYears: 8,
    certifications: ['Technicien SRAM Eagle', 'Shimano Di2'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.ADVANCED },
    ],
    availabilityNote: 'Camion atelier autonome · missions 3–12 jours.',
    reviews: [
      rev('r1', 'Canyon–SRAM Racing', 5, 'SAV irréprochable, atelier toujours prêt.', '2025-08-10', 'Tour de France Femmes'),
      rev('r2', 'TotalEnergies', 5, 'Expert Di2, zéro incident mécanique.', '2025-04-20', 'Paris-Roubaix'),
      rev('r3', 'Equipe Conti F', 4, 'Très bon mais un peu cher — mérité.', '2025-03-08', 'Omloop'),
    ],
  },
  demo_vac_comm_sarah: {
    experienceYears: 5,
    certifications: ['Adobe Premiere', 'Meta Business'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.FLUENT },
    ],
    availabilityNote: 'Couverture J-1 / Jour J / J+1 · matériel photo fourni.',
    reviews: [
      rev('r1', 'ASO partenaire media', 4, 'Stories très bonnes, besoin d’un brief plus tôt.', '2025-04-13', 'Paris-Roubaix Femmes'),
      rev('r2', 'FDJ–Suez', 5, 'Contenus live excellents.', '2025-08-29', 'Classic Lorient'),
    ],
  },
  demo_vac_kine_amine: {
    experienceYears: 10,
    certifications: ['DE Kinésithérapeute', 'DU Sport'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Arabe', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Grand Tours et stages altitude prioritaires.',
    reviews: [
      rev('r1', 'Canyon–SRAM', 5, 'Récup exceptionnelle sur TdFF.', '2025-08-09', 'Tour de France Femmes'),
      rev('r2', 'Team Conti', 4, 'Très bon suivi, dispo le soir limitée.', '2025-06-20', 'Tour de Suisse Women'),
    ],
  },
  demo_vac_ds_claire: {
    experienceYears: 12,
    certifications: ['Licence DS FFC', 'UCI Commissaire niveau 1'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.ADVANCED },
      { language: 'Espagnol', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Courses à étapes 3–9 jours · voiture DS fournie ou équipe.',
    reviews: [
      rev('r1', 'Equipe Elite F', 5, 'Briefs clairs, radio impeccable.', '2025-05-17', 'Itzulia Women'),
      rev('r2', 'Conti F', 4, 'Bonne lecture de course.', '2025-08-05', 'TdFF'),
    ],
  },
  demo_vac_med_julien: {
    experienceYears: 15,
    certifications: ['Médecine du sport', 'DIU Traumatologie'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.ADVANCED },
    ],
    availabilityNote: 'RC pro à jour · couverture courses UCI.',
    reviews: [
      rev('r1', 'ASO medical pool', 4, 'Réactif, très pro.', '2025-06-21', 'Tour de Suisse Women'),
    ],
  },
  demo_vac_assistant_nina: {
    experienceYears: 3,
    certifications: ['Permis B', 'PSC1'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Espagnol', proficiency: LanguageProficiency.ADVANCED },
    ],
    availabilityNote: 'Spéciale Espagne / Sierra Nevada.',
    reviews: [
      rev('r1', 'Team Conti', 4, 'Très bonne sur stage altitude.', '2025-05-16', 'Sierra Nevada'),
      rev('r2', 'Club Elite', 4, 'Polyvalente et discrète.', '2025-03-01', 'Stage hiver'),
    ],
  },
  demo_vac_prepa_hugo: {
    experienceYears: 6,
    certifications: ['STAPS', 'Certificat entraînement'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Stages 7–14 jours · suivi remote possible.',
    reviews: [
      rev('r1', 'ProTeam H', 4, 'Bon dosage charge / récup.', '2025-05-17', 'Stage altitude'),
    ],
  },
  demo_vac_entraineur_emma: {
    experienceYears: 7,
    certifications: ['BEES 1 Cyclisme', 'Licence entraîneur FFC'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.FLUENT },
      { language: 'Néerlandais', proficiency: LanguageProficiency.BASIC },
    ],
    availabilityNote: 'Missions 5–10 jours Pays-Bas / France.',
    reviews: [
      rev('r1', 'Conti F', 5, 'Excellente lecture tactique Simac.', '2025-09-13', 'Simac Ladies Tour'),
      rev('r2', 'Elite Nat', 4, 'Très pédagogique avec les jeunes.', '2025-04-01', 'Stage printemps'),
    ],
  },
  demo_vac_data_lucas: {
    experienceYears: 5,
    certifications: ['Data Science', 'GoldenCheetah advanced'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.FLUENT },
    ],
    availabilityNote: 'Remote + 2–3 jours présentiels / Grand Tour.',
    reviews: [
      rev('r1', 'WWT team', 5, 'Dashboards live ultra utiles.', '2025-08-08', 'TdFF'),
      rev('r2', 'Conti', 4, 'Rapports clairs post-étape.', '2025-05-10', 'Vuelta Femenina'),
    ],
  },
  demo_vac_resp_perf_ines: {
    experienceYears: 9,
    certifications: ['PhD Sciences du sport', 'Tests VO2'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Allemand', proficiency: LanguageProficiency.ADVANCED },
      { language: 'Anglais', proficiency: LanguageProficiency.FLUENT },
    ],
    availabilityNote: 'Suisse / France · préavis 3 semaines.',
    reviews: [
      rev('r1', 'WWT', 5, 'Synthèses DS impeccables.', '2025-09-06', 'Romandie Féminin'),
    ],
  },
  demo_vac_mecano_paul: {
    experienceYears: 6,
    certifications: ['Technicien TT', 'Sram Force'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Espagnol', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Spécialiste chronos · Bretagne / Espagne.',
    reviews: [
      rev('r1', 'Club Brittany', 4, 'Setups TT propres.', '2025-06-01', 'Chrono régional'),
      rev('r2', 'Conti', 5, 'Pressions pneus au top.', '2025-04-12', 'Classique'),
      rev('r3', 'Elite', 4, 'Rapide et soigneux.', '2025-02-20', 'Stage hiver'),
    ],
  },
  demo_vac_assistant_marie: {
    experienceYears: 2,
    certifications: ['Permis B', 'PSC1'],
    languages: [{ language: 'Français', proficiency: LanguageProficiency.NATIVE }],
    availabilityNote: 'Week-ends locaux Morbihan prioritaire.',
    reviews: [
      rev('r1', 'VC local', 4, 'Toujours à l’heure, très fiable.', '2025-08-29', 'Classic Lorient'),
      rev('r2', 'Club CDF', 4, 'Bonne gestion vestiaires.', '2025-06-14', 'CDF N2'),
    ],
  },
  demo_vac_comm_antoine: {
    experienceYears: 4,
    certifications: ['Drone DJI', 'DaVinci Resolve'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Matériel drone + caméras fournis.',
    reviews: [
      rev('r1', 'Team media', 5, 'Images drone spectaculaires.', '2025-04-12', 'Paris-Roubaix Femmes'),
      rev('r2', 'Club', 4, 'Montages rapides pour IG.', '2025-08-29', 'Lorient'),
    ],
  },
  demo_vac_kine_sofia: {
    experienceYears: 11,
    certifications: ['Laurea Fisioterapia', 'Sport physio IT'],
    languages: [
      { language: 'Italien', proficiency: LanguageProficiency.NATIVE },
      { language: 'Français', proficiency: LanguageProficiency.ADVANCED },
      { language: 'Anglais', proficiency: LanguageProficiency.INTERMEDIATE },
    ],
    availabilityNote: 'Giro / Vuelta F · Italia–France.',
    reviews: [
      rev('r1', 'RCS pool', 5, 'Indispensable sur Giro Women.', '2025-06-07', "Giro d'Italia Women"),
      rev('r2', 'WWT', 5, 'Récup étapes montagne top.', '2025-05-10', 'Vuelta Femenina'),
    ],
  },
  demo_vac_manager_olivier: {
    experienceYears: 14,
    certifications: ['Gestion sportive', 'Excel / budgets'],
    languages: [
      { language: 'Français', proficiency: LanguageProficiency.NATIVE },
      { language: 'Anglais', proficiency: LanguageProficiency.ADVANCED },
    ],
    availabilityNote: 'Organisation complète courses à étapes.',
    reviews: [
      rev('r1', 'ProTeam', 4, 'Hôtels et transferts carrés.', '2025-05-17', 'Limousin'),
    ],
  },
  demo_vac_autre_chloe: {
    experienceYears: 8,
    certifications: ['Permis D', 'FCO transport'],
    languages: [{ language: 'Français', proficiency: LanguageProficiency.NATIVE }],
    availabilityNote: 'Bus 20–30 places · Grand Tours.',
    reviews: [
      rev('r1', 'WWT', 5, 'Conduite impeccable, transferts ponctuels.', '2025-08-09', 'TdFF'),
      rev('r2', 'Conti', 4, 'Aide aussi au chargement matériel.', '2025-06-21', 'Suisse Women'),
      rev('r3', 'Elite', 5, 'Toujours souriante, très pro.', '2025-04-06', 'Stage'),
    ],
  },
};

export function isDemoVacataire(id: string): boolean {
  return id.startsWith('demo_vac_');
}

export function getDemoVacataireDistanceKm(id: string): number | undefined {
  return DEMO_VACATAIRES.find((v) => v.id === id)?.demoDistanceKm;
}

export function getDemoVacataireProfile(id: string): DemoVacataireProfile | undefined {
  return DEMO_VACATAIRE_PROFILES[id];
}

export function buildDemoVacataires(): StaffMember[] {
  return DEMO_VACATAIRES.map(({ demoDistanceKm: _d, ...member }, index) => {
    const profile = DEMO_VACATAIRE_PROFILES[member.id];
    const year = 1988 + (index % 12);
    const month = String((index % 8) + 1).padStart(2, '0');
    return {
      ...member,
      birthDate: member.birthDate || `${year}-${month}-15`,
      sex: member.sex || (index % 2 === 0 ? Sex.FEMALE : Sex.MALE),
      nationality: member.nationality || 'FR',
      emergencyContactName: member.emergencyContactName || 'Contact urgence',
      emergencyContactPhone: member.emergencyContactPhone || '06 00 00 00 00',
      cvFileName: member.cvFileName || `CV_${member.lastName}_${member.firstName}.pdf`,
      cvMimeType: member.cvMimeType || 'application/pdf',
      experienceYears: member.experienceYears ?? profile?.experienceYears,
      certifications: member.certifications || profile?.certifications || [],
      defaultApplicationMessage:
        member.defaultApplicationMessage ||
        (member.address?.city
          ? `Habite ${member.address.city}, disponible selon planning. ${profile?.availabilityNote || ''}`.trim()
          : profile?.availabilityNote),
      languages: profile?.languages.map((l, i) => ({
        id: `${member.id}_lang_${i}`,
        language: l.language,
        proficiency: l.proficiency,
      })),
      workHistory:
        member.workHistory ||
        (profile
          ? [
              {
                id: `${member.id}_exp_1`,
                position: member.customRole || String(member.role),
                company: 'Missions vacataires / clubs',
                startDate: `${year + 5}-01`,
                description: member.professionalSummary,
              },
            ]
          : undefined),
    };
  });
}

/** Agrégat notes depuis les avis démo. */
export function getDemoVacataireRating(id: string): { average: number; count: number } {
  const reviews = DEMO_VACATAIRE_PROFILES[id]?.reviews || [];
  if (reviews.length === 0) return { average: 0, count: 0 };
  const average = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return { average: Math.round(average * 10) / 10, count: reviews.length };
}

/** @deprecated Utiliser getDemoVacataireRating */
export const DEMO_VACATAIRE_RATINGS: Record<string, { average: number; count: number }> = Object.fromEntries(
  Object.keys(DEMO_VACATAIRE_PROFILES).map((id) => [id, getDemoVacataireRating(id)])
);

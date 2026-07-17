// --- Enums ---

export enum TeamLevel {
    FEDERATION = "Fédération",
    JEUNES = "Club Formateur Jeunes",
    HORS_DN = "Hors DN (Club/Comité)",
    N1_N3 = "Équipe Nationale/N1-N3",
    PRO = "Équipe Professionnelle",
}

export enum SubscriptionPlanId {
    CLUB = 'club',
    COMPETITION = 'competition',
    CONTINENTAL = 'continental',
    PRO = 'pro',
    FEDERATION = 'federation',
    INDEPENDENT_RIDER = 'independent_rider',
    INDEPENDENT_STAFF = 'independent_staff',
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'pilot';

export interface TeamSubscription {
    planId: SubscriptionPlanId;
    status: SubscriptionStatus;
    trialEndsAt?: string;
    pilotEndsAt?: string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    billingInterval?: 'month' | 'year';
    pendingReferralCode?: string;
    referredByUserId?: string;
}

export enum Sex {
    MALE = "Homme",
    FEMALE = "Femme",
    /** Valeurs legacy */
    MALE_SHORT = "male",
    FEMALE_SHORT = "female",
    FEMALE_EN = "FEMALE",
}

export enum StaffRole {
  MANAGER = "Manager",
  DS = "Directeur Sportif",
  ASSISTANT = "Assistant(e)",
  MECANO = "Mécanicien",
  COMMUNICATION = "Communication",
  MEDECIN = "Médecin",
  KINE = "Kinésithérapeute",
  RESP_PERF = "Responsable Performance",
  ENTRAINEUR = "Entraîneur",
  DATA_ANALYST = "Data Analyste",
  PREPA_PHYSIQUE = "Préparateur Physique",
  AUTRE = "Autre",
}

export enum ChecklistRole {
  DS = "Directeur Sportif",
  ASSISTANT = "Assistant",
  MECANO = "Mécanicien",
  MANAGER = "Manager",
  COMMUNICATION = "Communication",
  ENTRAINEUR = "Entraîneur",
  KINE = "Kinésithérapeute",
  MEDECIN = "Médecin",
  COUREUR = "Coureur",
}

/** Profil de fiches de poste : auto = déduit du niveau structure */
export type TeamFicheProfile = 'auto' | 'club' | 'competition' | 'pro';

/** Focus calendrier pour les fiches et missions */
export type TeamEventFocus = 'auto' | 'mixed' | 'stage' | 'competition';

/** Cible de recrutement sur le marché talents (segmentation coureur ↔ équipe). */
export type TeamRecruitmentTarget =
  | 'auto'
  | 'pro_conti'
  | 'elite_n1'
  | 'open_amateur'
  | 'youth_u19'
  | 'regional_club';

/** Catégorie de sexe de l’équipe (calendrier / recrutement). */
export type TeamGender = 'men' | 'women' | 'mixed';

export interface TeamOperationalSettings {
  /** Rôles actifs dans les checklists et fiches de poste */
  enabledChecklistRoles?: ChecklistRole[];
  /** Niveau des fiches importées (auto ou forcé) */
  ficheProfile?: TeamFicheProfile;
  /** Priorité stage vs compétition (auto = déduit du calendrier) */
  eventFocus?: TeamEventFocus;
  /** Cible de recrutement sur le marché talents (segmentation) */
  recruitmentTarget?: TeamRecruitmentTarget;
  /** Accepter les candidatures spontanées de coureurs sur le portail */
  acceptRiderApplications?: boolean;
  /** Sexe de l’équipe (Homme / Femme / Mixte) — filtre portail « Chercher une équipe » */
  gender?: TeamGender;
}

export enum StaffStatus { 
  BENEVOLE = "Bénévole",
  VACATAIRE = "Vacataire",
  SALARIE = "Salarié(e)",
}

export enum ContractType {
  CDI = "CDI (Contrat à Durée Indéterminée)",
  CDD = "CDD (Contrat à Durée Déterminée)",
}

export enum AvailabilityStatus {
  DISPONIBLE = "Disponible",
  NON_DISPONIBLE = "Non Disponible",
  PARTIEL = "Partiellement Disponible",
}

export enum TransportDirection {
  ALLER = "Aller",
  RETOUR = "Retour",
  JOUR_J = "Transport Jour J",
}

export enum TransportMode {
  VOL = "Vol",
  MINIBUS = "Minibus",
  VOITURE_EQUIPE = "Voiture équipes",
  VOITURE_PERSO = "Voiture Personnelle",
  TRAIN = "Train",
  AUTRE = "Autre",
}

export enum AccommodationStatus {
  A_RESERVER = "À Réserver",
  RESERVE = "Réservé",
  PAYE = "Payé",
  CONFIRME = "Confirmé",
}

export enum MealDay {
  VENDREDI = "Vendredi",
  SAMEDI = "Samedi",
  DIMANCHE = "Dimanche",
  LUNDI = "Lundi",
  MARDI = "Mardi",
  MERCREDI = "Mercredi",
  JEUDI = "Jeudi",
  AUTRE = "Autre Jour",
}

export enum DocumentStatus {
  EN_ATTENTE = "En attente",
  FAIT = "Fait",
  EN_COURS = "En cours",
}

/** Type de document course (formulaires UCI, roadbook, etc.) */
export enum EventDocumentKind {
  UCI_ENGAGEMENT_J20 = 'UCI_ENGAGEMENT_J20',
  UCI_ENGAGEMENT_J3 = 'UCI_ENGAGEMENT_J3',
  UCI_HEIGHT_ATTESTATION = 'UCI_HEIGHT_ATTESTATION',
  UCI_BIKE_COMPLIANCE = 'UCI_BIKE_COMPLIANCE',
  UCI_CONFIRMATION_PARTANTS = 'UCI_CONFIRMATION_PARTANTS',
  ROADBOOK = 'ROADBOOK',
  LICENSES = 'LICENSES',
  OTHER = 'OTHER',
}

export type UciFormStepStatus = 'pending' | 'due_soon' | 'overdue' | 'in_progress' | 'done' | 'not_applicable';

export enum BudgetItemCategory {
  TRANSPORT = "Transport",
  HEBERGEMENT = "Hébergement",
  REPAS = "Repas",
  VOITURE_EQUIPE = "Voiture Équipe",
  FRAIS_COURSE = "Frais de Course",
  MATERIEL = "Matériel",
  POLE_PERFORMANCE = "Pôle Performance",
  SALAIRES = "Salaires & Staff",
  FRAIS_DIVERS = "Frais Divers",
}

export enum ExpenseReceiptStatus {
  DRAFT = "Brouillon",
  SUBMITTED = "Soumis",
  VALIDATED = "Validé",
  REJECTED = "Refusé",
  SYNCED = "Comptabilisé",
}

export enum ExpenseOcrStatus {
  PENDING = "pending",
  DONE = "done",
  FAILED = "failed",
  MANUAL = "manual",
}

export enum ChecklistItemStatus {
  A_FAIRE = "À Faire",
  EN_COURS = "En Cours",
  FAIT = "Fait",
}

export enum EventType {
    COMPETITION = "Compétition",
    STAGE = "Stage",
    COURSE = "Course",
    ENTRAINEMENT = "Entraînement",
}

export enum RiderEventStatus {
  TITULAIRE = "Titulaire",
  REMPLACANT = "Remplaçant(e)",
  PRE_SELECTION = "Pré-sélectionné(e)",
  NON_RETENU = "Non Retenu(e)",
  INDISPONIBLE = "Indisponible",
  ABSENT = "Absent(e)",
  EN_ATTENTE = "En Attente",
  NE_PAS_ENGAGER = "Ne Pas Engager",
  INFO = "Info",
}

export enum RiderEventPreference {
  VEUT_PARTICIPER = "Veut participer",
  OBJECTIFS_SPECIFIQUES = "Objectifs spécifiques",
  ABSENT = "Absent(e)",
  NE_VEUT_PAS = "Ne veut pas participer",
  EN_ATTENTE = "En attente de décision",
}

export enum SeasonYear {
  SEASON_2024 = "Saison 2024",
  SEASON_2025 = "Saison 2025",
  SEASON_2026 = "Saison 2026",
  SEASON_2027 = "Saison 2027",
  SEASON_2028 = "Saison 2028",
}

export enum TalentAvailability {
  DISPONIBLE = "Disponible",
  PAS_DISPONIBLE = "Pas disponible",
  OBJECTIFS = "Objectifs",
}

export enum FormeStatus {
  EXCELLENT = "Excellent",
  BON = "Bon",
  MOYEN = "Moyen",
  PASSABLE = "Passable",
  FATIGUE = "Fatigué(e)",
  INCONNU = "?",
  /** Valeurs legacy utilisées dans certaines vues */
  EXCELLENTE = "EXCELLENTE",
  BONNE = "BONNE",
  MOYENNE = "MOYENNE",
  MAUVAIS = "MAUVAIS",
}

export enum MoralStatus {
  ELEVEE = "Élevé",
  BON = "Bon",
  NEUTRE = "Neutre",
  BAS = "Bas",
  INCONNU = "?",
  /** Valeurs legacy utilisées dans certaines vues */
  EXCELLENT = "EXCELLENT",
  MOYEN = "MOYEN",
  MAUVAIS = "MAUVAIS",
}

export enum HealthCondition {
  PRET_A_COURIR = "Prêt(e) à courir",
  REPOS_PRECAUTION = "Repos précaution",
  BLESSURE_LEGERE = "Blessure légère",
  BLESSURE_MODEREE = "Blessure modérée",
  BLESSURE_SERIEUSE = "Blessure sérieuse",
  MALADE = "Malade",
  EN_RECUPERATION = "En récupération",
  INDISPONIBLE_AUTRE = "Indisponible (autre)",
  INCONNU = "-",
}

export enum RiderQualitativeProfile {
  GRIMPEUR = "Grimpeur",
  SPRINTEUR = "Sprinteur",
  ROULEUR = "Rouleur",
  PUNCHEUR = "Puncheur",
  COMPLET = "Complet",
  CLASSIQUE = "Flahute/Classique",
  BAROUDEUR_PROFIL = "Baroudeur",
  AUTRE = "Autre",
}

export enum VehicleType {
  VOITURE = "Voiture",
  MINIBUS = "Minibus",
  CAMION = "Camion",
  MOTO = "Moto",
  UTILITAIRE = "Utilitaire Léger",
  BUS = "Bus",
  AUTRE = "Autre",
}

export enum ClothingType {
  CUISSARD = "Cuissard",
  MAILLOT = "Maillot",
  CASQUE = "Casque",
  LUNETTES = "Lunettes",
  CHAUSSURES = "Chaussures",
  GANTS = "Gants",
  CHAUSSETTES = "Chaussettes",
  VESTE = "Veste",
  SURVETEMENT = "Survêtement",
  POLO = "Polo",
  TSHIRT = "T-Shirt",
  SHORT = "Short",
  PANTALON = "Pantalon",
  SWEAT = "Sweat",
  HOODIE = "Hoodie / Capuche",
  CASQUETTE = "Casquette / Bonnet",
  BRASSARD = "Brassard",
  AUTRE = "Autre",
}

export enum EquipmentType {
  VELO_ROUTE = "Vélo de Route",
  VELO_CLM = "Vélo de CLM",
  ROUES_AVANT = "Roue Avant",
  ROUES_ARRIERE = "Roue Arrière",
  PAIRE_ROUES = "Paire de Roues",
  CADRE = "Cadre",
  CAPTEUR_PUISSANCE = "Capteur de Puissance",
  COMPTEUR_GPS = "Compteur GPS",
  HOME_TRAINER = "Home Trainer",
  CASQUE = "Casque",
  TEXTILE = "Textile",
  CHAUSSURES = "Chaussures",
  AUTRE = "Autre Matériel",
}

export enum BikeType {
  ROUTE = "Route",
  CONTRE_LA_MONTRE = "Contre-la-montre",
  VTT = "VTT",
  PISTE = "Piste",
  BMX = "BMX",
  AUTRE = "Autre",
}

export enum EquipmentStatus {
  DISPONIBLE = "Disponible",
  EN_MAINTENANCE = "En Maintenance",
  ASSIGNE = "Assigné",
  HORS_SERVICE = "Hors Service",
  ARCHIVE = "Archivé",
}

export enum PredefinedAllergen {
  LAIT = "LAIT",
  OEUFS = "OEUFS",
  ARACHIDE = "ARACHIDE",
  FRUITS_A_COQUE = "FRUITS_A_COQUE",
  SOJA = "SOJA",
  BLE_ALLERGIE = "BLE_ALLERGIE",
  POISSON = "POISSON",
  CRUSTACES = "CRUSTACES",
  GLUTEN_CELIAC = "GLUTEN_CELIAC",
  SESAME = "SESAME",
  CELERI = "CELERI",
  MOUTARDE = "MOUTARDE",
  LUPIN = "LUPIN",
  MOLLUSQUES = "MOLLUSQUES",
  SULFITES = "SULFITES"
}

export enum DisciplinePracticed {
    ROUTE = "Route",
    PISTE = "Piste",
    CYCLO_CROSS = "Cyclo-cross",
    VTT = "VTT",
    GRAVEL = "Gravel",
    AUTRE = "Autre",
}

export enum IncomeCategory {
    SPONSORING = "Sponsoring",
    SUBVENTIONS = "Subventions",
    MECENAT = "Mécénat",
    DONS = "Dons",
    ACTIVITES_COMMERCIALES = "Activités Commerciales",
    AUTRE = "Autre",
}

export enum AllergySeverity {
    FAIBLE = "Faible",
    MODEREE = "Modérée",
    SEVERE = "Sévère",
    LEGERE = "LÉGÈRE",
    SEVERE_ALT = "SÉVÈRE",
    MODEREE_ALT = "MODÉRÉE",
}

export enum ScoutingStatus {
    TO_WATCH = "À Surveiller",
    CONTACTED = "Contacté",
    IN_DISCUSSION = "En Discussion",
    REJECTED = "Refusé",
    SIGNED = "Signé",
    AWAITING_APPROVAL = "En attente d'approbation",
    DATA_SHARED = "Données partagées"
}

/** Niveau de suivi prospect : discret (interne) ou avec demande à l'athlète */
export enum ProspectLevel {
    WATCHLIST = "WATCHLIST",
    CONTACT_REQUEST = "CONTACT_REQUEST",
}

export enum TeamRecruitmentOfferStatus {
    OPEN = 'Ouvert',
    CLOSED = 'Fermé',
}

export enum TeamRecruitmentCampaignStatus {
    DRAFT = 'Brouillon',
    OPEN = 'En cours',
    CLOSED = 'Clôturée',
}

/** Critères de recherche pour une campagne ou une offre coureur */
export interface TeamRecruitmentCriteria {
    minAge?: number;
    maxAge?: number;
    riderSegments?: string[];
    disciplines?: DisciplinePracticed[];
    recruitmentTarget?: TeamRecruitmentTarget;
    qualitativeProfiles?: RiderQualitativeProfile[];
    notes?: string;
}

/** Offre de recrutement coureur publiée par l'équipe */
export interface TeamRecruitmentOffer {
    id: string;
    teamId: string;
    title: string;
    description: string;
    status: TeamRecruitmentOfferStatus;
    criteria?: TeamRecruitmentCriteria;
    campaignId?: string;
    createdAt: string;
    updatedAt?: string;
    publishedAt?: string;
}

/** Campagne de recrutement avec critères de ciblage */
export interface TeamRecruitmentCampaign {
    id: string;
    teamId: string;
    title: string;
    description: string;
    status: TeamRecruitmentCampaignStatus;
    criteria?: TeamRecruitmentCriteria;
    linkedOfferId?: string;
    createdAt: string;
    updatedAt?: string;
    openedAt?: string;
    closedAt?: string;
}

/** Périmètres que l'équipe peut demander — l'athlète choisit ce qu'il accorde */
export enum ScoutingDataScope {
    COORDINATION = "COORDINATION",
    PERFORMANCE_DATA = "PERFORMANCE_DATA",
    PERFORMANCE_PROJECT = "PERFORMANCE_PROJECT",
}

export enum Discipline {
    ROUTE = "Route",
    PISTE = "Piste",
    CYCLO_CROSS = "Cyclo-cross",
    VTT = "VTT",
    GRAVEL = "Gravel",
    TOUS = "Tous",
}

export enum UserRole {
    MANAGER = "Manager",
    STAFF = "Staff",
    COUREUR = "Coureur",
    INVITE = "Invité",
    PARTNER = "Partenaire",
    ORG_ADMIN = "Admin Organisation",
}

export enum TeamMembershipStatus {
    ACTIVE = "Actif",
    INACTIVE = "Inactif",
    PENDING = "En Attente",
}

export enum MissionStatus {
    OPEN = "Ouvert",
    CLOSED = "Fermé",
    FILLED = "Pourvu",
    ARCHIVED = "Archivé",
}

export enum MissionCompensationType {
    VOLUNTEER = "Bénévolat",
    FREELANCE = "Vacataire (Facture)",
    FIXED_AMOUNT = "Montant Fixe",
    CDD = "CDD",
    CDI = "CDI",
    APPRENTICESHIP = "Apprentissage",
    INTERNSHIP = "Stage",
}

/** Suivi pipeline recrutement missions / vacations */
export enum MissionApplicationStatus {
    RECEIVED = "Reçue",
    REVIEWING = "En examen",
    SHORTLISTED = "Présélectionné(e)",
    INTERVIEW = "Entretien",
    ACCEPTED = "Accepté(e)",
    REJECTED = "Refusé(e)",
    WITHDRAWN = "Retiré(e)",
}

export interface MissionApplication {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    roleLabel?: string;
    city?: string;
    dailyRate?: number;
    message?: string;
    appliedAt: string;
    status: MissionApplicationStatus;
    /** Note interne équipe (non visible candidat) */
    internalNote?: string;
}

export enum LanguageProficiency {
    BASIC = 'Basique',
    INTERMEDIATE = 'Intermédiaire',
    ADVANCED = 'Avancé',
    FLUENT = 'Courant',
    NATIVE = 'Natif',
}


// --- Type Aliases ---
export type AppSection = 
  | 'events' | 'roster' | 'season-planning' | 'staff' | 'vehicles' | 'equipment'
  | 'stocks'
  | 'accommodationHistory'
  | 'financial' | 'performance' | 'scouting' | 'settings' | 'eventDetail'
  | 'userManagement' | 'permissions' | 'checklist' | 'superAdmin'
  | 'career' | 'nutrition' | 'riderEquipment' | 'adminDossier' | 'myTrips' | 'myPerformance' | 'performanceProject' | 'automatedPerformanceProfile'
  | 'missionSearch' | 'teamSearch' | 'userSettings' | 'myCalendar' | 'talentAvailability' | 'talentSearch' | 'myDashboard' | 'myProfile' | 'adminDashboard'
  | 'myResults' | 'bikeSetup' | 'myCareer' | 'myStages' | 'independentHub' | 'pricing' | 'expenseReceipts'
  | 'organizationDashboard' | 'partnerPortal';

export type PermissionLevel = 'view' | 'edit';
export type StaffRoleKey =
  | 'managerId'
  | 'directeurSportifId'
  | 'assistantId'
  | 'mecanoId'
  | 'kineId'
  | 'medecinId'
  | 'respPerfId'
  | 'entraineurId'
  | 'dataAnalystId'
  | 'prepaPhysiqueId'
  | 'communicationId';
export type PowerZoneKey = 'z1' | 'z2' | 'z3' | 'z4' | 'z5' | 'z6' | 'z7';

// --- Interfaces ---

export interface Address {
    streetName?: string;
    postalCode?: string;
    city?: string;
    region?: string;
    country?: string;
}

export interface MaintenanceRecord {
    id: string;
    date: string;
    description: string;
    cost?: number;
    mileage?: number;
    garage?: string;
}

export type GpsTrackingSource = 'manual' | 'driver_app' | 'geotab' | 'traccar' | 'tomtom';

export interface VehiclePosition {
    id: string;
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number;
    heading?: number;
    recordedAt: string;
    source: GpsTrackingSource;
    eventId?: string;
    transportLegId?: string;
}

export interface Vehicle {
    id: string;
    name: string;
    licensePlate: string;
    driverId?: string;
    notes?: string;
    vehicleType: VehicleType;
    seats?: number;
    estimatedDailyCost?: number;
    purchaseDate?: string;
    nextMaintenanceDate?: string;
    maintenanceNotes?: string;
    maintenanceHistory: MaintenanceRecord[];
    /** Kilométrage courant */
    currentMileage?: number;
    /** Identifiant boîtier GPS / télématique */
    gpsDeviceId?: string;
    /** Dernière position connue */
    lastLatitude?: number;
    lastLongitude?: number;
    lastPositionAt?: string;
    lastSpeedKmh?: number;
    gpsTrackingEnabled?: boolean;
    gpsSource?: GpsTrackingSource;
}

export interface PeripheralComponent {
    id: string;
    name: string;
    type: string;
    brand?: string;
    model?: string;
    notes?: string;
}

export interface EquipmentItem {
    id: string;
    name: string;
    type: EquipmentType;
    status: EquipmentStatus;
    assignedToRiderId?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    lastMaintenanceDate?: string;
    notes?: string;
    photoUrl?: string;
    size?: string;
    components?: PeripheralComponent[];
}

export type WarehouseType = 'base' | 'camion' | 'hotel' | 'course' | 'atelier';

export interface Warehouse {
    id: string;
    name: string;
    type: WarehouseType;
    eventId?: string;
    vehicleId?: string;
    address?: string;
    isDefault?: boolean;
    notes?: string;
}

export type StockMovementReason =
    | 'scan_in'
    | 'scan_out'
    | 'inventory'
    | 'transfer'
    | 'event_consumption'
    | 'manual_adjustment';

export interface StockMovement {
    id: string;
    itemId: string;
    itemName: string;
    warehouseId: string;
    warehouseName: string;
    delta: number;
    quantityAfter: number;
    reason: StockMovementReason;
    userId?: string;
    userName?: string;
    eventId?: string;
    scannedBarcode?: string;
    transferToWarehouseId?: string;
    notes?: string;
    createdAt: string;
}

export interface StockItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    category: StockCategory;
    /** Code-barres EAN/GTIN pour scan rapide */
    barcode?: string;
    notes?: string;
    /** Quantités par entrepôt (warehouseId → qty) */
    quantities?: Record<string, number>;
}

export enum StockCategory {
    BOISSONS = "Boissons",
    NUTRITION_SOLIDE = "Nutrition Solide",
    COMPLEMENTS = "Compléments",
    PREMIERS_SOINS = "Premiers Soins",
    RECUPERATION = "Récupération",
    HYGIENE = "Hygiène",
    DIVERS = "Divers",
}

export interface ClothingItem {
    id: string;
    type: ClothingType;
    quantity: number;
    name?: string;
    brand?: string;
    reference?: string;
    size?: string;
    unitCost?: number;
    notes?: string;
}

export interface EquipmentStockItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    category: EquipmentStockCategory;
    reference?: string;
    brand?: string;
    /** Code-barres EAN/GTIN pour scan rapide */
    barcode?: string;
    notes?: string;
}
export enum EquipmentStockCategory {
    CONSOMMABLES = "Consommables", // pneu, chaîne, guidoline
    PIECES = "Pièces détachées", // dérailleur, cintre
    OUTILLAGE = "Outillage",
    NETTOYAGE = "Nettoyage",
    DIVERS = "Divers",
}

export interface OperationalTiming {
    id: string;
    time: string;
    description: string;
    isAutoGenerated?: boolean;
    isOverridden?: boolean;
    category: OperationalTimingCategory;
    personId?: string; // For massage, the rider being massaged
    masseurId?: string; // For massage, the staff member doing it
    order?: number; // Order for massages
}

export enum OperationalTimingCategory {
    TRANSPORT = 'Transport',
    COURSE = 'Course',
    REPAS = 'Repas',
    MASSAGE = 'Massage',
    DIVERS = 'Divers'
}

export interface OperationalLogisticsDay {
    id: string;
    dayName: MealDay;
    keyTimings: OperationalTiming[];
}

/** Départ individuel (contre-la-montre) pour une coureuse. */
export interface StageRiderStartTime {
    riderId: string;
    departTime: string;
    startOrder?: number;
}

/** Logistique course pour une journée d'étape (départ / arrivée peuvent être à des lieux différents). */
export interface StageDayLogistics {
    id: string;
    date: string;
    stageNumber: number;
    stageLabel?: string;
    departLocation: string;
    arriveeLocation: string;
    permanenceAddress: string;
    permanenceTime: string;
    permanenceDate: string;
    reunionDSTime: string;
    reunionDSDate?: string;
    presentationTime: string;
    departFictifTime: string;
    departReelTime: string;
    arriveePrevueTime: string;
    distanceKm: number;
    radioFrequency: string;
    /** Contre-la-montre : départs échelonnés, pas de départ fictif. */
    isTimeTrial?: boolean;
    /** Heure du premier départ (chrono) — sert au calcul d'arrivée sur site (1h30 avant). */
    premierDepartTime?: string;
    riderStartTimes?: StageRiderStartTime[];
    /** Véhicules ravito et points d'approvisionnement le jour de l'étape. */
    ravitoVehicles?: StageRavitoVehicle[];
    /** Staff présent uniquement sur cette étape (vacataires, renforts d'une journée). */
    additionalStaffIds?: string[];
}

/** Hébergement prévu pour une nuit d'étape. */
export interface StageDayAccommodation {
    id: string;
    /** Jour de course (étape). */
    stageDate: string;
    /** Nuit d'hébergement (veille avant l'étape). */
    nightDate: string;
    /** @deprecated Utiliser stageDate / nightDate — conservé pour données existantes. */
    date?: string;
    stageNumber: number;
    hotelName: string;
    address: string;
    numberOfNights: number;
    numberOfPeople?: number;
    status: AccommodationStatus;
    estimatedCost?: number;
    distanceFromStartKm?: number;
    travelTimeToStart?: string;
    reservationConfirmed: boolean;
    confirmationDetails: string;
    notes?: string;
    isStopover?: boolean;
}

/** Véhicule assigné à un transfert inter-étapes. */
export interface StageTransferVehicle {
    id: string;
    roleLabel?: string;
    vehicleId?: string;
    driverId?: string;
    notes?: string;
}

/** Point ravito (lieu + horaire d'arrivée du véhicule). */
export interface StageRavitoPoint {
    id: string;
    label?: string;
    location: string;
    arrivalTime: string;
    departureTime?: string;
    notes?: string;
}

/** Type de véhicule pendant la course (coureuses sur le vélo, staff en voiture). */
export enum StageRaceVehicleKind {
  /** Suiveur course : DS + mécanicien obligatoires à bord. */
  RACE_FOLLOWER = 'race_follower',
  /** Ravito : points d'approvisionnement sur le parcours. */
  RAVITO = 'ravito',
  /** Autre véhicule staff (assistants, kiné, etc.). */
  STAFF_SUPPORT = 'staff_support',
}

/** Véhicule en course (suiveur, ravito, staff) — occupants staff uniquement. */
export interface StageRavitoVehicle {
    id: string;
    kind?: StageRaceVehicleKind;
    roleLabel?: string;
    vehicleId?: string;
    driverId?: string;
    /** Staff à bord (pas de coureuses : elles sont sur le vélo). */
    staffOccupantIds?: string[];
    /** Suiveur course : directeur sportif obligatoire. */
    directeurSportifStaffId?: string;
    /** Suiveur course : mécanicien obligatoire. */
    mecanoStaffId?: string;
    points: StageRavitoPoint[];
    notes?: string;
}

/** Transfert entre deux étapes consécutives. */
export interface StageTransferLogistics {
    id: string;
    fromDate: string;
    toDate: string;
    departLocation: string;
    arriveeLocation: string;
    departTime: string;
    arriveePrevueTime: string;
    distanceKm?: number;
    duration?: string;
    notes: string;
    /** Véhicules du convoi de transfert (bus, camion, voitures staff…). */
    vehicles?: StageTransferVehicle[];
}

export interface RaceInformation {
    permanenceAddress: string;
    permanenceTime: string;
    permanenceDate: string;
    reunionDSTime: string;
    reunionDSDate?: string;
    presentationTime: string;
    departFictifTime: string;
    departReelTime: string;
    arriveePrevueTime: string;
    distanceKm: number;
    radioFrequency: string;
    isTimeTrial?: boolean;
    /** Heure du premier départ (chrono) — sert au calcul d'arrivée sur site (1h30 avant). */
    premierDepartTime?: string;
    riderStartTimes?: StageRiderStartTime[];
    /** Renseigné pour les courses à étapes (plusieurs jours). */
    stageDays?: StageDayLogistics[];
    /** Transferts entre étapes (N-1 transferts pour N étapes). */
    transfers?: StageTransferLogistics[];
    /** Hébergement par nuit d'étape. */
    stageAccommodations?: StageDayAccommodation[];
}

export interface EligibleCategory {
    id: string;
    label: string;
}

export interface RaceEventOrganizerContact {
    organizingEntity?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
}

export type OrganizerApplicationStatus = 'pending' | 'sent' | 'accepted' | 'declined';

export interface OrganizerApplicationRecord {
    year: number;
    status: OrganizerApplicationStatus;
    sentAt?: string;
}

/** Contact organisateur conservé pour candidatures saison N+1 */
export interface OrganizerContact {
    id: string;
    eventName: string;
    organizingEntity?: string;
    contactName?: string;
    contactEmail: string;
    contactPhone?: string;
    location?: string;
    uciClass?: string;
    category?: string;
    discipline?: Discipline | string;
    lastEventDate?: string;
    lastEventId?: string;
    /** Mois habituel (1-12) déduit de la dernière édition */
    typicalMonth?: number;
    /** Jour habituel (1-31) déduit de la dernière édition */
    typicalDay?: number;
    /** Date de fin de la dernière édition (course à étapes) */
    lastEventEndDate?: string;
    /** Mois de fin habituel (1-12) */
    typicalEndMonth?: number;
    /** Jour de fin habituel (1-31) */
    typicalEndDay?: number;
    /** Nombre d'étapes (course à étapes) */
    stageCount?: number;
    /** Type d'épreuve (Stage, etc.) */
    eventType?: EventType;
    participationYears: number[];
    applications?: OrganizerApplicationRecord[];
    notes?: string;
    updatedAt: string;
    /** Référence ELIGIBLE_CATEGORIES_CONFIG (ex. uci.pro, elite.nat) */
    categoryId?: string;
    /** Segment calendrier */
    genderSegment?: 'men' | 'women' | 'mixed' | 'youth';
    circuitTier?: string;
    competitionLevel?: 'pro' | 'elite' | 'amateur' | 'youth';
    federationScope?: 'uci' | 'ffc' | 'regional' | 'international';
}

/** Protocole d'exposition altitude / hypoxie (stages). */
export type AltitudeCampProtocol =
  | 'live_high_train_high'
  | 'live_high_train_low'
  | 'intermittent_hypoxia'
  | 'none'
  | 'other';

/** Métadonnées spécifiques aux stages (altitude / hypoxie / chaleur). */
export interface AltitudeCampMeta {
  isAltitudeCamp: boolean;
  /** Stage / protocole d’acclimatation chaleur (seul ou combiné altitude) */
  isHeatCamp?: boolean;
  /** Altitude du site / séances (m) */
  altitudeMeters?: number;
  /** Altitude de sommeil si différente (LH/TL) */
  sleepingAltitudeMeters?: number;
  protocol?: AltitudeCampProtocol;
  /** Protocole chaleur du stage */
  heatProtocol?: HeatCampProtocol;
  /** Température cible ambiante / chambre (°C) */
  targetTemperatureC?: number;
  /** Humidité relative cible (%) */
  targetHumidityPercent?: number;
  /** Durée type d’exposition chaleur par séance (min) */
  heatSessionMinutes?: number;
  /** Jours depuis l'arrivée (suivi acclimatation) — saisie libre / notes */
  hypoxiaNotes?: string;
  /** Notes acclimatation chaleur */
  heatNotes?: string;
  focusNotes?: string;
}

/** Protocole d’exposition chaleur (stages). */
export type HeatCampProtocol =
  | 'passive_sauna'
  | 'active_heat_training'
  | 'heat_chamber'
  | 'hot_water_immersion'
  | 'combined_heat_altitude'
  | 'none'
  | 'other';

/** Dispositif d’exposition hypoxique individuel. */
export type HypoxicSetupType =
  | 'natural'
  | 'tent'
  | 'chamber'
  | 'mask'
  | 'other';

/** Dispositif d’exposition chaleur individuel. */
export type HeatSetupType =
  | 'none'
  | 'sauna'
  | 'chamber'
  | 'hot_room'
  | 'outdoor'
  | 'bath'
  | 'other';

/**
 * Références environnementales par athlète sur un stage
 * (altitude / tente hypoxique et/ou protocole chaleur).
 */
export interface CampAthleteAltitudeRef {
  riderId: string;
  /** Altitude équivalente de référence (m) */
  referenceAltitudeMeters?: number;
  hypoxicSetup?: HypoxicSetupType;
  /** Protocole chaleur individuel */
  heatSetup?: HeatSetupType;
  /** Température cible individuelle (°C) */
  heatTargetTemperatureC?: number;
  /** Exposition chaleur type (min / séance) */
  heatExposureMinutes?: number;
  notes?: string;
}

export type StageCampSessionType =
  | 'rest'
  | 'recovery'
  | 'endurance'
  | 'intensity'
  | 'test'
  | 'other';

/**
 * Suivi quotidien athlète pendant un stage (HRV, SpO₂, hydratation, etc.).
 * Une entrée = un athlète × un jour.
 */
export interface StageDayAthleteMetrics {
  id: string;
  riderId: string;
  date: string;
  /**
   * Altitude équivalente exposée ce jour (m) — tente / chambre / override
   * de la référence athlète du stage.
   */
  referenceAltitudeMeters?: number;
  /** Température ambiante / chambre chaleur ce jour (°C) */
  ambientTemperatureC?: number;
  /** Exposition chaleur du jour (min) */
  heatExposureMinutes?: number;
  /** HRV matin (ms, ex. rMSSD) */
  hrvMs?: number;
  restingHrBpm?: number;
  /** Saturation pulsée (%) */
  spo2Percent?: number;
  weightKg?: number;
  /** Volume hydrique journalier (L) */
  hydrationLiters?: number;
  /** Échelle couleur urine 1 (clair) → 8 (foncé) */
  urineColor?: number;
  /**
   * Densité spécifique urinaire (USG) — réfractomètre.
   * Référence eau distillée = 1.000 (ex. 1.012).
   */
  urineSpecificGravity?: number;
  sleepHours?: number;
  sleepQuality?: number;
  fatigue?: number;
  mood?: number;
  muscleSoreness?: number;
  headache?: boolean;
  appetite?: number;
  sessionType?: StageCampSessionType;
  /** Charge (TSS / points internes) */
  trainingLoad?: number;
  rpe?: number;
  sessionNotes?: string;
  coachNotes?: string;
  updatedAt?: string;
}

/** Nature du stage (hors / avec altitude). */
export type CampStageKind = 'altitude' | 'preseason' | 'training' | 'recovery' | 'other';

/** Colonnes de monitoring quotidien sélectionnables. */
export type CampMonitorColumnKey =
  | 'referenceAltitudeMeters'
  | 'ambientTemperatureC'
  | 'heatExposureMinutes'
  | 'hrvMs'
  | 'restingHrBpm'
  | 'spo2Percent'
  | 'weightKg'
  | 'hydrationLiters'
  | 'urineColor'
  | 'urineSpecificGravity'
  | 'sleepHours'
  | 'sleepQuality'
  | 'fatigue'
  | 'mood'
  | 'muscleSoreness'
  | 'headache'
  | 'appetite'
  | 'sessionType'
  | 'trainingLoad'
  | 'rpe'
  | 'notes';

/** Configuration du monitoring pour un stage non-altitude (colonnes choisies). */
export interface CampMonitoringConfig {
  stageKind?: CampStageKind;
  /** Métriques affichées dans la grille quotidienne */
  visibleMetrics?: CampMonitorColumnKey[];
}

/** Type de test terrain / labo saisi sur un stage. */
export type CampTestType = 'power' | 'lactate' | 'field' | 'lab' | 'custom';

/**
 * Test individuel (puissance, lactate, ou protocole libre).
 * Une entrée = un athlète × une date × un test.
 */
export interface CampAthleteTest {
  id: string;
  riderId: string;
  date: string;
  testType: CampTestType;
  /** Libellé libre (ex. PMA 5', Seuil lactate, Jump CMJ…) */
  label: string;
  /** Puissance moyenne / cible (W) */
  powerWatts?: number;
  /** Durée totale du test (secondes — saisie UI en min + s) */
  durationSec?: number;
  /** Protocole : continu, paliers, autre */
  protocolKind?: 'continuous' | 'steps' | 'other';
  /** Nombre de paliers (protocole par paliers) */
  stepCount?: number;
  /** Durée d’un palier (secondes) */
  stepDurationSec?: number;
  /** Durée de récupération entre paliers (secondes) */
  recoveryDurationSec?: number;
  /** Incrément de puissance entre paliers (W), optionnel */
  stepIncrementWatts?: number;
  /** Puissance normalisée (W) */
  normalizedPower?: number;
  /** Lactate sanguin ponctuel / pic (mmol/L) */
  lactateMmol?: number;
  /** Lactate de repos / baseline avant test (mmol/L) */
  lactateRestMmol?: number;
  /** Seuil lactate 1 / LT1 / AeT (mmol/L) */
  lt1Mmol?: number;
  /** Puissance au LT1 (W) */
  lt1PowerWatts?: number;
  /** FC au LT1 (bpm) */
  lt1HeartRateBpm?: number;
  /** Seuil lactate 2 / LT2 / AnT (mmol/L) */
  lt2Mmol?: number;
  /** Puissance au LT2 (W) */
  lt2PowerWatts?: number;
  /** FC au LT2 (bpm) */
  lt2HeartRateBpm?: number;
  /**
   * V̇La_max — taux max de production de lactate (mmol·L⁻¹·s⁻¹).
   */
  vlMax?: number;
  /**
   * Clairance lactate — ex. % de baisse en récup, ou mmol·L⁻¹·min⁻¹.
   */
  lactateClearance?: number;
  /** Unité clairance (ex. %, mmol/L/min) */
  lactateClearanceUnit?: string;
  /** FC associée (puissance) ou FC max du test lactate (bpm) */
  heartRateBpm?: number;
  /** FC de repos avant test (bpm) */
  restingHeartRateBpm?: number;
  /** Valeur générique (ex. temps, distance, score) */
  value?: number;
  unit?: string;
  protocolNotes?: string;
  resultNotes?: string;
  /** Champs libres pour tests non prévus */
  customFields?: { key: string; value: string }[];
  updatedAt?: string;
}

export interface RaceEvent {
    id: string;
    name: string;
    date: string;
    endDate?: string;
    startDate?: string;
    location: string;
    eventType: EventType;
    type?: string;
    eligibleCategory: string;
    discipline: Discipline;
    raceInfo: RaceInformation;
    operationalLogistics: OperationalLogisticsDay[];
    selectedRiderIds: string[];
    selectedStaffIds: string[];
    selectedVehicleIds: string[];
    checklistEmailSimulated: boolean;
    isLogisticsValidated?: boolean;
    logisticsValidationDate?: string;
    logisticsSummaryNotes?: string;

    /** Contexte stage altitude / hypoxie (type Stage) */
    altitudeCampMeta?: AltitudeCampMeta;
    /** Altitude de référence individuelle (tente / chambre hypoxique) */
    campAthleteAltitudeRefs?: CampAthleteAltitudeRef[];
    /** Suivi quotidien athlètes sur le stage */
    campAthleteDailyMetrics?: StageDayAthleteMetrics[];
    /** Colonnes de monitoring (stages hors altitude) */
    campMonitoringConfig?: CampMonitoringConfig;
    /** Tests puissance / lactate / custom sur le stage */
    campAthleteTests?: CampAthleteTest[];
    
    // Limites de sélection des athlètes
    minRiders?: number;
    maxRiders?: number;

    /** Contact organisateur (conservé pour demandes participation N+1) */
    organizerContact?: RaceEventOrganizerContact;

    // Staff roles
    managerId?: string[];
    directeurSportifId?: string[];
    assistantId?: string[];
    mecanoId?: string[];
    kineId?: string[];
    medecinId?: string[];
    respPerfId?: string[];
    entraineurId?: string[];
    dataAnalystId?: string[];
    prepaPhysiqueId?: string[];
    communicationId?: string[];
}

export interface WorkExperience {
    id: string;
    position: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
}

export interface EducationOrCertification {
    id: string;
    degree: string;
    institution: string;
    year?: number;
    startDate?: string;
    endDate?: string;
    description?: string;
}
export interface SpokenLanguage {
    id: string;
    language: string;
    proficiency: LanguageProficiency;
}

export interface WeeklyAvailability {
    [day: string]: {
        morning: boolean;
        afternoon: boolean;
        evening: boolean;
    }
}
export interface AvailabilityPeriod {
    id: string;
    startDate: string;
    endDate: string;
    status: AvailabilityStatus;
    notes?: string;
}

export interface StaffMember {
    id: string;
    /** Lien compte utilisateur Firebase (si différent de id) */
    userId?: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
    phone?: string;
    role: StaffRole | string;
    customRole?: string;
    status: StaffStatus | string;
    openToExternalMissions?: boolean;
    skills: string[];
    professionalSummary?: string;
    /** Message type / pitch de candidature (missions) */
    defaultApplicationMessage?: string;
    /** Années d'expérience (aperçu recrutement) */
    experienceYears?: number;
    /** Certifications / titres courts */
    certifications?: string[];
    address?: Address;
    weeklyAvailability?: WeeklyAvailability;
    availability?: AvailabilityPeriod[];
    workHistory?: WorkExperience[];
    education?: EducationOrCertification[];
    assignedEvents?: string[];
    
    // Gestion des saisons
    currentSeason?: number; // Saison active du membre du staff
    isActive?: boolean; // Si le membre du staff est actif dans l'effectif actuel
    languages?: SpokenLanguage[];
    sportswear?: any[];
    notesGeneral?: string;
    dailyRate?: number;
    salary?: number;
    contractType?: ContractType;
    contractEndDate?: string;
    bankDetails?: BankDetails;
    /** Dernier virement SEPA salaire */
    sepaLastPaidAt?: string;
    /** Position GPS partagée depuis l'app (chauffeur) */
    lastLatitude?: number;
    lastLongitude?: number;
    lastPositionAt?: string;
    lastSpeedKmh?: number;
    birthDate?: string;
    nationality?: string;
    photoUrl?: string;
    uciId?: string;
    licenseNumber?: string;
    licenseImageBase64?: string;
    licenseImageMimeType?: string;
    /** CV / dossier de candidature (PDF, Word ou image) */
    cvFileName?: string;
    cvMimeType?: string;
    cvFileBase64?: string;
    socialSecurityNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    heightCm?: number;
    weightKg?: number;
    sex?: Sex;
    seasonObjectives?: string;
    globalWishes?: string;
}
export enum TransportStopType {
    PICKUP = "Récupération",
    DROPOFF = "Dépose",
    WAYPOINT = "Étape intermédiaire",
    AIRPORT_ARRIVAL = "Arrivée aéroport",
    AIRPORT_DEPARTURE = "Départ aéroport",
    TRAIN_STATION_ARRIVAL = "Arrivée gare",
    TRAIN_STATION_DEPARTURE = "Départ gare",
    HOTEL_PICKUP = "Récupération hôtel",
    HOTEL_DROPOFF = "Dépose hôtel",
    RACE_START = "Départ course",
    RACE_FINISH = "Arrivée course",
    MEETING_POINT = "Lieu de rendez-vous",
    HOME_PICKUP = "Récupération domicile",
    HOME_DROPOFF = "Dépose domicile",
    TRAIN_PICKUP = "Récupération gare",
    TRAIN_DROPOFF = "Dépose gare",
    AIRPORT_PICKUP = "Récupération aéroport",
    AIRPORT_DROPOFF = "Dépose aéroport"
}

export interface TransportStop {
    id: string;
    location: string;
    address?: string; // Adresse précise pour les lieux de rendez-vous
    date: string;
    time: string;
    stopType: TransportStopType | string;
    persons: { id: string, type: 'rider' | 'staff' }[];
    notes?: string;
    isTimingCritical?: boolean; // Pour les horaires d'avion/train
    estimatedDuration?: number; // Durée estimée en minutes
    contactPerson?: string; // Personne de contact sur place
    contactPhone?: string; // Téléphone de contact
    isPickupRequired?: boolean; // Marque si une récupération est obligatoire
    isDropoffRequired?: boolean; // Marque si une dépose est obligatoire
    reminderMinutes?: number; // Minutes avant pour rappel
}

/** Onglet logistique d'origine (évite qu'un aller s'affiche en « pendant »). */
export type EventTransportLogisticsPhase = 'aller_course' | 'pendant' | 'retour';

export interface EventTransportLeg {
  id: string;
  eventId: string;
  direction: TransportDirection | string;
  mode: TransportMode | string;
  /** Phase logistique : aller sur l'étape, pendant la course, ou retour. */
  logisticsPhase?: EventTransportLogisticsPhase;
  /** Date de l'étape concernée (course à étapes, transports jour J). */
  stageDate?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureLocation?: string;
  arrivalLocation?: string;
  /** Adresses textuelles ; lat/lng optionnels (géocodés auto pour ETA GPS flotte) */
  departureLatitude?: number;
  departureLongitude?: number;
  arrivalLatitude?: number;
  arrivalLongitude?: number;
  details?: string;
  personName?: string; // Legacy/simple mode
  isAuroreFlight?: boolean;
  occupants: { id: string; type: 'rider' | 'staff' }[];
  assignedVehicleId?: string;
  driverId?: string;
  intermediateStops?: TransportStop[];
}

export interface EventAccommodation {
  id: string;
  eventId: string;
  hotelName: string;
  address: string;
  checkInDate?: string;
  checkOutDate?: string;
  roomType?: string;
  reservationConfirmed: boolean;
  status: AccommodationStatus;
  confirmationDetails: string;
  numberOfNights: number;
  numberOfPeople?: number;
  estimatedCost?: number;
  distanceFromStartKm?: number;
  travelTimeToStart?: string;
  isStopover?: boolean;
  /** Retour d'expérience (pour retrouver d'une année sur l'autre) */
  reviewOutcome?: 'good' | 'neutral' | 'bad';
  reviewNote?: string;
  /** Coordonnées optionnelles (carte par lieux) */
  latitude?: number;
  longitude?: number;
}

export interface EventRaceDocument {
  id: string;
  eventId: string;
  name: string;
  status: DocumentStatus;
  fileLinkOrPath: string;
  notes?: string;
  /** Catégorie pour workflow UCI / documents standards */
  kind?: EventDocumentKind | string;
  /** Échéance réglementaire (ISO date) */
  dueDate?: string;
}

export interface EventRadioEquipment {
  id: string;
  eventId: string;
  hasEquipment: boolean;
  details: string;
  channelFrequency?: string;
}

export interface EventRadioAssignment {
  id: string;
  eventId: string;
  assignedTo: string;
  radioIdOrNotes: string;
}

export interface EventBudgetItem {
  id: string;
  eventId: string;
  category: BudgetItemCategory;
  description: string;
  estimatedCost: number;
  actualCost?: number;
  notes?: string;
  isAutoGenerated?: boolean;
  sourceVehicleId?: string;
  sourceStaffId?: string;
  proofDocumentId?: string;
  accountingCode?: string;
  accountingLabel?: string;
  expenseReceiptId?: string;
  receiptDate?: string;
}

export interface ExpenseReceipt {
  id: string;
  eventId?: string;
  transportLegId?: string;
  submittedByUserId: string;
  submittedByName?: string;
  staffRole?: string;
  imageUrl: string;
  imageMimeType?: string;
  status: ExpenseReceiptStatus;
  budgetCategory: BudgetItemCategory;
  accountingCode: string;
  accountingLabel: string;
  amount: number;
  receiptDate: string;
  merchant?: string;
  description?: string;
  ocrStatus?: ExpenseOcrStatus | string;
  ocrRawText?: string;
  ocrConfidence?: number;
  budgetItemId?: string;
  createdAt: string;
  validatedAt?: string;
  validatedByUserId?: string;
  notes?: string;
  /** Date d'export / paiement SEPA */
  sepaPaidAt?: string;
}

export interface EventChecklistItem {
  id: string;
  eventId: string;
  itemName: string;
  responsiblePerson?: string;
  assignedRole?: ChecklistRole;
  status: ChecklistItemStatus;
  notes?: string;
  /** Hérité du modèle : affiche un indicateur "Remarque" */
  templateKind?: ChecklistTemplateKind;
  /** Moment : avant / pendant / après (hérité du modèle) */
  timing?: ChecklistTiming;
  /** Libellé de moment (ex. "Avant départ", "Matin avant la sortie") – hérité du modèle */
  timingLabel?: string;
}

export interface PeerRating {
    id: string;
    eventId: string;
    raterRiderId: string;
    /** UID Firebase — règles Firestore & anonymat côté client */
    raterUserId?: string;
    ratedRiderId: string;
    /** Apport au résultat / collaboration (1–10) */
    rating?: number;
    /** Niveau technique observable (1–10) */
    technicalScore?: number;
    /** Niveau physique du jour (1–10) */
    physicalScore?: number;
}

/** Débriefing personnel d'un coureur après un événement (visible staff + auteur). */
export interface RiderSelfDebrief {
    id: string;
    eventId: string;
    riderId: string;
    userId: string;
    personalRanking?: string;
    selfSummary?: string;
    selfHighlights?: string;
    selfImprovements?: string;
    selfPhysicalFeel?: number;
    selfTechnicalFeel?: number;
    didNotStart?: boolean;
    didNotFinish?: boolean;
    crashed?: boolean;
    submittedAt?: string;
}

export interface RiderRating {
    riderId: string;
    classification?: string;
    didNotStart?: boolean;
    didNotFinish?: boolean;
    crashed?: boolean;
    dsFeedback?: string;
    collectiveScore?: number;
    technicalScore?: number;
    physicalScore?: number;
    /** Coureur absent — exclu des moyennes (barème X) */
    isAbsent?: boolean;
}

export interface StaffRating {
    staffId: string;
    rating: number; // 1-5
    comment?: string;
    eventId: string;
}

export interface PerformanceEntry {
  id: string;
  eventId: string;
  date?: string;
  generalObjectives: string;
  resultsSummary: string;
  keyLearnings: string;
  raceOverallRanking?: string;
  teamRiderRankings?: string;
  dsGeneralFeedback?: string;
  riderRatings?: RiderRating[];
  staffRatings?: StaffRating[];
}

export interface PerformanceArchive {
  id: string;
  season: number;
  archiveDate: string;
  groupAverages: GroupAverageArchive;
  riderQualityNotes: RiderQualityArchive[];
  staffQualityNotes: StaffQualityArchive[];
  teamMetrics: TeamMetricsArchive;
}

export interface GroupAverageArchive {
  season: number;
  totalRiders: number;
  averageAge: number;
  ageDistribution: {
    category: string;
    count: number;
    averageAge: number;
    powerAverages: {
      cp: number;
      power20min: number;
      power12min: number;
      power5min: number;
      power1min: number;
      power30s: number;
    };
  }[];
  overallPowerAverages: {
    cp: number;
    power20min: number;
    power12min: number;
    power5min: number;
    power1min: number;
    power30s: number;
  };
  powerCoverage: number; // Pourcentage de coureurs avec profil de puissance
}

export interface RiderQualityArchive {
  riderId: string;
  season: number;
  averageCollectiveScore: number;
  averageTechnicalScore: number;
  averagePhysicalScore: number;
  // Caractéristiques détaillées
  charSprint: number;
  charAnaerobic: number;
  charPuncher: number;
  charClimbing: number;
  charRouleur: number;
  generalPerformanceScore: number;
  fatigueResistanceScore: number;
  totalEvents: number;
  eventsWithRatings: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  lastRatingDate: string;
  // Identité figée pour les coureuses retirées de l'effectif
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: Sex;
  isRemovedFromRoster?: boolean;
  removedAt?: string;
  // Profils de puissance figés (pour le tableau archives)
  weightKg?: number;
  qualitativeProfile?: RiderQualitativeProfile;
  rosterRole?: 'principal' | 'reserve';
  powerProfileFresh?: PowerProfile;
  powerProfile15KJ?: PowerProfile;
  powerProfile30KJ?: PowerProfile;
  powerProfile45KJ?: PowerProfile;
  seasonWins?: number;
  seasonPodiums?: number;
}

export interface StaffQualityArchive {
  staffId: string;
  season: number;
  averageRating: number;
  totalEvents: number;
  eventsWithRatings: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  lastRatingDate: string;
}

export interface TeamMetricsArchive {
  season: number;
  totalEvents: number;
  averageRanking: number;
  bestRanking: number;
  worstRanking: number;
  eventsWithDebriefings: number;
  completionRate: number; // Pourcentage de débriefings complétés
}

// Types pour l'archivage des effectifs par saison
export interface RosterArchive {
  season: number;
  riders: Rider[];
  staff: StaffMember[];
  archivedAt: string;
  totalRiders: number;
  totalStaff: number;
  activeRiders: number; // Nombre de coureurs actifs
  inactiveRiders: number; // Nombre de coureurs inactifs
}

export interface RosterTransition {
  fromSeason: number;
  toSeason: number;
  transitionDate: string;
  ridersAdded: string[]; // IDs des coureurs ajoutés
  ridersRemoved: string[]; // IDs des coureurs retirés
  ridersKept: string[]; // IDs des coureurs conservés
  staffAdded: string[]; // IDs du staff ajouté
  staffRemoved: string[]; // IDs du staff retiré
  staffKept: string[]; // IDs du staff conservé
}

// Types pour l'archivage des effectifs du staff par saison
export interface StaffArchive {
  season: number;
  staff: StaffMember[];
  archivedAt: string;
  totalStaff: number;
  activeStaff: number; // Nombre de membres du staff actifs
  inactiveStaff: number; // Nombre de membres du staff inactifs
}

export interface StaffTransition {
  fromSeason: number;
  toSeason: number;
  transitionDate: string;
  staffAdded: string[]; // IDs du staff ajouté
  staffRemoved: string[]; // IDs du staff retiré
  staffKept: string[]; // IDs du staff conservé
}

// Types pour le planning de saison du staff
export interface StaffEventSelection {
  id: string;
  eventId: string;
  staffId: string;
  status: StaffEventStatus | null;
  staffPreference: StaffEventPreference;
  staffAvailability: StaffAvailability;
  staffObjectives: string;
  notes: string;
  /** Date de candidature du staff */
  candidatureAt?: string;
  /** Validation par DS / manager */
  validatedAt?: string;
  validatedByUserId?: string;
  validatedByName?: string;
}

export enum StaffEventStatus {
  PRE_SELECTION = 'PRE_SELECTION',
  SELECTIONNE = 'SELECTIONNE',
  EN_ATTENTE = 'EN_ATTENTE',
  NON_SELECTIONNE = 'NON_SELECTIONNE',
  REFUSE = 'REFUSE'
}

export enum StaffEventPreference {
  VEUT_PARTICIPER = 'VEUT_PARTICIPER',
  OBJECTIFS_SPECIFIQUES = 'OBJECTIFS_SPECIFIQUES',
  EN_ATTENTE = 'EN_ATTENTE',
  NE_VEUT_PAS = 'NE_VEUT_PAS',
  ABSENT = 'ABSENT'
}

export enum StaffAvailability {
  DISPONIBLE = 'DISPONIBLE',
  PARTIELLEMENT_DISPONIBLE = 'PARTIELLEMENT_DISPONIBLE',
  INDISPONIBLE = 'INDISPONIBLE',
  A_CONFIRMER = 'A_CONFIRMER'
}

export interface BankDetails {
    iban: string;
    bic?: string;
    accountHolderName?: string;
}

export interface TeamSepaSettings {
    debtorName: string;
    debtorIban: string;
    debtorBic?: string;
    /** Identifiant Créancier SEPA (ICS) pour prélèvements */
    creditorIdentifier?: string;
}

export type SepaPaymentType = 'salary' | 'reimbursement';

export interface SepaPaymentOrder {
    id: string;
    type: SepaPaymentType;
    beneficiaryName: string;
    beneficiaryIban: string;
    beneficiaryBic?: string;
    amount: number;
    reference: string;
    /** ID coureur/staff ou justificatif */
    sourceId: string;
    sourceLabel?: string;
    hasValidIban: boolean;
}

export enum InvoiceStatus {
  DRAFT = 'Brouillon',
  ISSUED = 'Émise',
  PAID = 'Payée',
  CANCELLED = 'Annulée',
}

export interface TeamInvoiceSettings {
  issuerName: string;
  issuerAddress?: string;
  issuerSiret?: string;
  issuerVatNumber?: string;
  issuerIban?: string;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  nextQuoteNumber?: number;
  defaultVatRate?: number;
  /** Association / documents partenariat & CERFA */
  legalRepresentative?: string;
  legalRepresentativeTitle?: string;
  rnaNumber?: string;
  associationObject?: string;
  isGeneralInterest?: boolean;
  prefecturalDecree?: string;
  cerfaReceiptPrefix?: string;
  nextCerfaNumber?: number;
  conventionPrefix?: string;
  nextConventionNumber?: number;
}

export type DonationForm = 'numéraire' | 'nature' | 'mise à disposition';

export interface IncomeItem {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: IncomeCategory;
    notes?: string;
    sponsorshipContactName?: string;
    sponsorshipContactEmail?: string;
    sponsorshipContactPhone?: string;
    sponsorshipContractStart?: string;
    sponsorshipContractEnd?: string;
    /** Partenaire / sponsor */
    sponsorCompanyName?: string;
    sponsorSiret?: string;
    sponsorRepresentative?: string;
    sponsorLegalForm?: string;
    partnershipCounterparts?: string;
    partnershipDeliverables?: PartnerCounterpartDeliverable[];
    donationForm?: DonationForm | string;
    conventionNumber?: string;
    conventionGeneratedAt?: string;
    cerfaReceiptNumber?: string;
    cerfaGeneratedAt?: string;
    /** Code comptable PCG (auto depuis la catégorie) */
    accountingCode?: string;
    accountingLabel?: string;
    accountingJournal?: string;
    /** Facturation */
    invoiceNumber?: string;
    invoiceStatus?: InvoiceStatus | string;
    issuedAt?: string;
    paidAt?: string;
    clientName?: string;
    clientAddress?: string;
    clientVatNumber?: string;
    vatRate?: number;
    amountHT?: number;
    /** Lien carnet client */
    clientId?: string;
    /** Devis source */
    quoteId?: string;
    /** Avoir lié (ID revenu d'avoir) */
    creditNoteForInvoiceId?: string;
    /** URL archivage PDF facture */
    invoicePdfUrl?: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';

export interface Quote {
    id: string;
    quoteNumber: string;
    clientId?: string;
    clientName: string;
    clientAddress?: string;
    description: string;
    amount: number;
    vatRate: number;
    amountHT: number;
    status: QuoteStatus;
    validUntil: string;
    createdAt: string;
    convertedInvoiceId?: string;
    notes?: string;
}

export interface ClientRecord {
    id: string;
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    siret?: string;
    vatNumber?: string;
    iban?: string;
    paymentTermsDays?: number;
    notes?: string;
    createdAt: string;
}

export type SupplierInvoiceStatus = 'received' | 'validated' | 'paid' | 'disputed';

export interface SupplierInvoice {
    id: string;
    supplierName: string;
    supplierSiret?: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    amountHT: number;
    vatRate: number;
    amountTTC: number;
    accountingCode?: string;
    accountingLabel?: string;
    budgetItemId?: string;
    expenseReceiptId?: string;
    status: SupplierInvoiceStatus;
    paidAt?: string;
    sepaBatchId?: string;
    notes?: string;
    attachmentUrl?: string;
}

export interface SepaBatch {
    id: string;
    batchReference: string;
    executionDate: string;
    totalAmount: number;
    orderCount: number;
    exportedAt: string;
    exportedByUserId?: string;
    exportedByName?: string;
    orderIds: string[];
    salarySourceIds: string[];
    reimbursementReceiptIds: string[];
    xmlFileName?: string;
}

export type BankTransactionType = 'credit' | 'debit';

export interface BankTransaction {
    id: string;
    date: string;
    label: string;
    amount: number;
    type: BankTransactionType;
    iban?: string;
    reference?: string;
    /** Liens rapprochement */
    matchedIncomeItemId?: string;
    matchedSupplierInvoiceId?: string;
    matchedSepaBatchId?: string;
    matchedExpenseReceiptId?: string;
    isReconciled: boolean;
    importedAt: string;
}

export interface AccountingEntry {
    id: string;
    date: string;
    journal: string;
    accountCode: string;
    accountLabel: string;
    pieceRef: string;
    label: string;
    debit: number;
    credit: number;
    sourceType: 'income' | 'expense' | 'supplier' | 'sepa' | 'bank';
    sourceId: string;
}

export interface RiderEventSelection {
  id: string;
  eventId: string;
  riderId: string;
  status: RiderEventStatus;
  riderPreference?: RiderEventPreference;
  talentAvailability?: TalentAvailability;
  riderObjectives?: string;
  notes?: string;
}

export interface EventStaffAvailability {
  id: string;
  eventId: string;
  staffId: string;
  availability: AvailabilityStatus;
  notes?: string;
}

/** Type d'entrée de checklist modèle : tâche à faire ou remarque */
export type ChecklistTemplateKind = 'task' | 'a_prevoir';

/** Moment / timing dans le déroulé de l'événement */
export type ChecklistTiming = 'avant' | 'pendant' | 'apres';

export interface ChecklistTemplate {
    id: string;
    name: string;
    role?: ChecklistRole;
    /** 'task' = tâche, 'a_prevoir' = remarque (note / rappel) */
    kind?: ChecklistTemplateKind;
    /** Type d'événement : tâches différentes pour Stage vs Compétition. Absent = s'applique aux deux */
    eventType?: EventType;
    /** Moment dans le déroulé : avant / pendant / après l'événement */
    timing?: ChecklistTiming;
    /** Libellé issu de la fiche de poste (ex. "Avant départ", "Matin avant la sortie") – affiché à la place du timing générique */
    timingLabel?: string;
}

export interface TeamProduct {
    id: string;
    name: string;
    type: 'gel' | 'bar' | 'drink';
    brand?: string;
    barcode?: string;
    carbs?: number; // Total carbs, auto-calculated
    glucose?: number;
    fructose?: number;
    caffeine?: number; // in mg
    sodium?: number; // in mg
    composition?: string; // Liste des ingrédients
    notes?: string;
}

export interface PowerProfile {
    power1s?: number;
    power5s?: number;
    power30s?: number;
    power1min?: number;
    power3min?: number;
    power5min?: number;
    power12min?: number;
    power20min?: number;
    criticalPower?: number; // FTP
    power45min?: number;
}

// Historique des valeurs de puissance pour suivi longitudinal
export interface PowerProfileHistoryEntry {
    id: string;
    date: string; // Date ISO de l'enregistrement
    powerProfileFresh?: PowerProfile;
    powerProfile15KJ?: PowerProfile;
    powerProfile30KJ?: PowerProfile;
    powerProfile45KJ?: PowerProfile;
    weightKg?: number; // Poids au moment de l'enregistrement
    notes?: string; // Notes optionnelles
}

export interface PowerProfileHistory {
    entries: PowerProfileHistoryEntry[]; // Entrées triées par date (plus récent en premier)
}

export interface ResultItem {
  id: string;
  date: string;
  eventName: string;
  category: string;
  rank: string | number;
  team?: string;
  discipline?: DisciplinePracticed;
  raceName?: string;
  position?: number;
  season?: string;
  notes?: string;
}

export interface TeamHistory {
  teamName: string;
  startDate: string;
  endDate?: string;
  role?: string;
  status?: 'Actif' | 'Inactif' | 'Ancien';
  achievements?: string[];
}

export interface FavoriteRace {
  id: string;
  name: string;
  notes: string;
}

/** Entrée calendrier courses (athlète indépendant) */
export type AthleteCalendarEntryStatus = 'planned' | 'confirmed' | 'done' | 'cancelled';

export interface AthleteCalendarEntry {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location?: string;
  discipline?: DisciplinePracticed | string;
  notes?: string;
  status: AthleteCalendarEntryStatus;
  source?: 'manual' | 'result' | 'demo';
}

export interface PerformanceProjectEntry {
  id: string;
  content: string;
  /** Date de revue ou objectif (YYYY-MM-DD) */
  targetDate?: string;
  status: 'active' | 'achieved';
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceActionItem {
  id: string;
  title: string;
  description?: string;
  /** Date cible (YYYY-MM-DD) */
  targetDate?: string;
  status: 'planned' | 'in_progress' | 'done' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PerformanceProjectHistoryEntry {
  id: string;
  savedAt: string;
  label: string;
  performanceGoals?: string;
  /** Snapshot des 5 facteurs au moment de la sauvegarde */
  factors: Partial<Record<string, PerformanceFactorDetail>>;
}

export interface PerformanceFactorDetail {
    forces: string;
    aOptimiser: string;
    aDevelopper: string;
    besoinsActions: string;
    /** Entrées datées — document vivant */
    forcesEntries?: PerformanceProjectEntry[];
    aOptimiserEntries?: PerformanceProjectEntry[];
    aDevelopperEntries?: PerformanceProjectEntry[];
    /** Actions datées avec suivi d'avancement */
    actionItems?: PerformanceActionItem[];
    score?: number;
    objective?: string;
    actions?: string;
    deadline?: string;
    notes?: string;
}

export interface AllergyItem {
    id: string;
    allergenKey: PredefinedAllergen | 'CUSTOM';
    allergen?: string;
    customAllergenName?: string;
    severity: AllergySeverity;
    regimeDetails: string;
    isCeliacDisease: boolean;
    notes?: string;
}
export interface SelectedProduct {
    productId: string;
    quantity: number;
}
export interface PerformanceNutrition {
    carbsPerHourTarget?: number;
    hydrationNotes?: string;
    selectedGels?: SelectedProduct[];
    selectedBars?: SelectedProduct[];
    selectedDrinks?: SelectedProduct[];
    customProducts?: TeamProduct[];
    /** Champs legacy */
    gels?: SelectedProduct[];
    bars?: SelectedProduct[];
    drinks?: SelectedProduct[];
    caloricGoal?: string | number;
    hydrationGoal?: string | number;
    notes?: string;
    hydrationStrategy?: string;
    preRaceMeal?: string;
    duringRaceNutrition?: string;
    recoveryNutrition?: string;
}

export interface BikeComponentWear {
  currentKm: number;
  maxKm: number;
  installedAt?: string;
  brand?: string;
  model?: string;
  notes?: string;
}

export interface BikeWearTracking {
  chain?: BikeComponentWear;
  tireFront?: BikeComponentWear;
  tireRear?: BikeComponentWear;
  brakePads?: BikeComponentWear;
}

export interface BikeFitMeasurements {
  hauteurSelle?: string;
  reculSelle?: string;
  longueurBecSelleAxeCintre?: string;
  hauteurGuidonAxeRoueCentreCintre?: string;
  /** CLM — distance horizontale axe pédalier → extrémité prolongateurs (E) */
  distanceExtensionE?: string;
  /** CLM — distance verticale support avant-bras → point haut/bas prolongateurs (H) */
  hauteurProlongateursH?: string;
}

/** Pression pneu AV/AR pour une combinaison route × météo */
export interface TirePressureCell {
  front?: string;
  rear?: string;
}

/** Grille de pressions — clé `${surface}_${weather}` (ex. dry_mild) */
export interface BikeTirePressureGrid {
  cells?: Record<string, TirePressureCell>;
}

export interface BikeSpecificMeasurements {
  tailleCadre?: string;
  cintre?: string;
  potence?: string;
  plateau?: string;
  manivelle?: string;
  capteurPuissance?: string;
}

export interface BikeSetup {
    specifics: BikeSpecificMeasurements;
    cotes: BikeFitMeasurements;
    /** Pressions pneus selon type de route et météo */
    tirePressures?: BikeTirePressureGrid;
    wear?: BikeWearTracking;
    bikeType?: string;
    name?: string;
    brand?: string;
    size?: string;
    year?: string | number;
    groupset?: string;
    wheels?: string;
    weight?: string | number;
    model?: string;
    /** Inscrit sur la liste UCI catégories de taille 2 ou 3 */
    uciHeightListRegistered?: boolean;
}

export interface PprData {
    fresh: PowerProfile;
    kj15: PowerProfile;
    kj30: PowerProfile;
    kj45: PowerProfile;
}

export interface Rider {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    sex?: Sex;
    nationality?: string;
    address?: Address;
    heightCm?: number;
    weightKg?: number;
    uciId?: string;
    licenseNumber?: string;
    photoUrl?: string;
    licenseImageUrl?: string;
    licenseImageBase64?: string;
    licenseImageMimeType?: string;
    socialSecurityNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    teamName?: string;
    isSearchable?: boolean; // For talent search
    salary?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    contractType?: ContractType;
    contractClauses?: string;
    signingBonus?: number;
    performanceBonusNotes?: string;
    nextSeasonTeam?: string;
    bankDetails?: BankDetails;
    /** Dernier virement SEPA salaire */
    sepaLastPaidAt?: string;
    
    // Gestion des saisons
    currentSeason?: number; // Saison active du coureur
    isActive?: boolean; // Si le coureur est actif dans l'effectif actuel
    rosterRole?: 'principal' | 'reserve'; // Équipe principale ou réserve

    // Performance Profile
    qualitativeProfile: RiderQualitativeProfile;
    disciplines: DisciplinePracticed[];
    categories: string[];
    forme: FormeStatus;
    moral: MoralStatus;
    healthCondition: HealthCondition;

    // Career
    favoriteRaces: FavoriteRace[];
    resultsHistory: ResultItem[];
    teamsHistory?: TeamHistory[];
    /** URL profil ProCyclingStats */
    pcsUrl?: string;
    /** URL profil DirectVélo */
    directVeloUrl?: string;
    agency?: { name?: string; agentName?: string; agentPhone?: string; agentEmail?: string; };

    // Performance Project
    performanceGoals: string;
    physiquePerformanceProject: PerformanceFactorDetail;
    techniquePerformanceProject: PerformanceFactorDetail;
    mentalPerformanceProject: PerformanceFactorDetail;
    environnementPerformanceProject: PerformanceFactorDetail;
    tactiquePerformanceProject: PerformanceFactorDetail;
    /** Historique des versions du projet (document vivant) */
    performanceProjectHistory?: PerformanceProjectHistoryEntry[];
    
    // Global Preferences
    globalWishes?: string; // Souhaits généraux pour la saison
    seasonObjectives?: string; // Objectifs de saison
    
    // Interview & Motivation
    cyclingMotivation?: string; // Pourquoi fait-il du vélo
    shortTermGoals?: string; // Objectifs à court terme (saison suivante)
    mediumTermGoals?: string; // Objectifs à moyen terme (2-3 ans)
    longTermGoals?: string; // Objectifs à long terme (5+ ans)
    careerAspirations?: string; // Aspirations de carrière
    personalValues?: string; // Valeurs personnelles
    challengesFaced?: string; // Défis rencontrés
    supportNeeds?: string; // Besoins de soutien

    // Nutrition
    dietaryRegimen?: string; // e.g., vegetarian
    foodPreferences?: string; // likes/dislikes
    allergies: AllergyItem[];
    performanceNutrition: PerformanceNutrition;
    
    // Nutrition pour assistants
    snackPreferences?: string; // collations préférées (legacy)
    snack1?: string; // collation 1 préférée
    snack2?: string; // collation 2 alternative
    snack3?: string; // collation 3 alternative
    assistantInstructions?: string; // instructions spéciales pour assistants
    snackSchedule?: string; // horaires de collations

    // Bike & Equipment
    roadBikeSetup: BikeSetup;
    ttBikeSetup: BikeSetup;
    clothing: ClothingItem[];
    /** Alias legacy pour certaines vues coureur */
    equipment?: EquipmentItem[];
    bikeFitMeasurements?: BikeFitMeasurements;
    bikeSpecificMeasurements?: BikeSpecificMeasurements;
    
    // Power Data - Saison en cours (réinitialisé chaque 1er novembre)
    powerProfileFresh?: PowerProfile;
    powerProfile15KJ?: PowerProfile;
    powerProfile30KJ?: PowerProfile;
    powerProfile45KJ?: PowerProfile;
    profilePRR?: string;
    profile15KJ?: string;
    profile30KJ?: string;
    profile45KJ?: string;
    
    // Power Data - All-time (meilleures valeurs jamais atteintes, jamais réinitialisé)
    powerProfileAllTime?: {
        powerProfileFresh?: PowerProfile;
        powerProfile15KJ?: PowerProfile;
        powerProfile30KJ?: PowerProfile;
        powerProfile45KJ?: PowerProfile;
        lastUpdated?: string; // Date ISO de la dernière mise à jour
    };
    
    // Date de début de la saison en cours (1er novembre de l'année en cours ou précédente)
    currentSeasonStartDate?: string;
    
    // Historique des valeurs de puissance pour suivi longitudinal
    powerProfileHistory?: PowerProfileHistory;
    
    // Auto-calculated fields
    charSprint: number;
    charAnaerobic: number;
    charPuncher: number;
    charClimbing: number;
    charRouleur: number;
    generalPerformanceScore: number;
    fatigueResistanceScore: number;
    
    // Admin
    healthInsurance?: { name?: string; policyNumber?: string; };
}

export interface ScoutingProfile {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  sex?: Sex;
  nationality?: string;
  heightCm?: number;
  weightKg?: number;
  email?: string;
  phone?: string;
  currentTeam?: string;
  uciId?: string;
  /** Numéro de licence (souvent connu pour les athlètes, parfois inconnu pour les recrues) */
  licenseNumber?: string;

  /** Références externes (liens/IDs) pour faciliter la recherche de résultats */
  pcsUrl?: string;
  directVeloUrl?: string;

  status: ScoutingStatus | string;
  potentialRating: number; // 1-5
  discipline: DisciplinePracticed;
  categories: string[];
  photoUrl?: string;
  qualitativeProfile?: RiderQualitativeProfile;
  qualitativeNotes?: string;
  powerProfileFresh?: PowerProfile;
  powerProfile15KJ?: PowerProfile;
  powerProfile30KJ?: PowerProfile;
  powerProfile45KJ?: PowerProfile;
  allergies: AllergyItem[];
  charSprint?: number;
  charAnaerobic?: number;
  charPuncher?: number;
  charClimbing?: number;
  charRouleur?: number;
  generalPerformanceScore?: number;
  fatigueResistanceScore?: number;
  
  // Career / Résultats (optionnel pour un prospect)
  favoriteRaces?: FavoriteRace[];
  resultsHistory?: ResultItem[];
  teamsHistory?: TeamHistory[];

  // Performance Project
  performanceGoals?: string;
  physiquePerformanceProject?: PerformanceFactorDetail;
  techniquePerformanceProject?: PerformanceFactorDetail;
  mentalPerformanceProject?: PerformanceFactorDetail;
  environnementPerformanceProject?: PerformanceFactorDetail;
  tactiquePerformanceProject?: PerformanceFactorDetail;
  
  // Interview & Motivation
  cyclingMotivation?: string;
  shortTermGoals?: string;
  mediumTermGoals?: string;
  longTermGoals?: string;
  careerAspirations?: string;
  personalValues?: string;
  challengesFaced?: string;
  supportNeeds?: string;

  /** Suivi discret ou demande de contact (recrutement plateforme) */
  prospectLevel?: ProspectLevel;
  /** Lien vers le compte coureur si prospect issu de la recherche talents */
  linkedAthleteUserId?: string;
  internalWatchNotes?: string;
}
export enum ScoutingRequestStatus {
    PENDING = "En attente",
    ACCEPTED = "Accepté",
    REJECTED = "Refusé",
}

export interface ScoutingRequest {
    id: string;
    requesterTeamId: string;
    athleteId: string;
    status: ScoutingRequestStatus;
    requestDate: string;
    responseDate?: string;
    message?: string;
    prospectLevel?: ProspectLevel;
    /** Périmètres demandés par l'équipe (niveau contact) */
    requestedScopes?: ScoutingDataScope[];
    /** Périmètres accordés par l'athlète à l'acceptation */
    grantedScopes?: ScoutingDataScope[];
}


// --- AUTH & TEAM STRUCTURE ---
export enum TeamRole {
    ADMIN = 'Administrateur',
    EDITOR = 'Editeur',
    MEMBER = 'Membre',
    VIEWER = 'Athlète',
}

export type AppPermissions = Partial<Record<string, Partial<Record<AppSection, PermissionLevel[]>>>>;

export interface PermissionRole {
    id: string | TeamRole;
    name: string;
    isDeletable: boolean;
}

export interface SignupInfo {
  birthDate?: string;
  sex?: Sex;
  nationality?: string;
  heightCm?: number;
  weightKg?: number;
  phone?: string;
  allergies?: string;
}

export interface GdprConsent {
  termsAcceptedAt: string;
  termsVersion: string;
  privacyPolicyAcceptedAt: string;
  privacyPolicyVersion: string;
  ndaAcceptedAt?: string;
  ndaVersion?: string;
}

export enum SignupMode {
  TEAM = 'team',
  INDEPENDENT = 'independent',
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    permissionRole: TeamRole;
    customPermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
    userRole: UserRole | string;
    /** Aperçu super-admin : profil staff ou coureur simulé */
    previewSubjectId?: string;
    previewSubjectKind?: 'staff' | 'rider' | 'partner';
    teamId?: string;
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
    phone?: string;
    address?: Address;
    disciplines?: DisciplinePracticed[];
    categories?: string[];
    forme?: FormeStatus | string;
    moral?: MoralStatus | string;
    healthCondition?: HealthCondition | string;
    powerProfile?: PowerProfile;
    characteristics?: RiderQualitativeProfile;
    performanceData?: unknown;
    resultsHistory?: ResultItem[];
    favoriteRaces?: FavoriteRace[];
    teamsHistory?: TeamHistory[];
    /** Données athlète indépendant (matériel, perf., nutrition…) */
    allergies?: AllergyItem[];
    performanceNutrition?: Rider['performanceNutrition'];
    roadBikeSetup?: BikeSetup;
    ttBikeSetup?: BikeSetup;
    clothing?: ClothingItem[];
    weightKg?: number;
    heightCm?: number;
    powerProfileFresh?: PowerProfile;
    powerProfile15KJ?: PowerProfile;
    powerProfile30KJ?: PowerProfile;
    powerProfile45KJ?: PowerProfile;
    physiquePerformanceProject?: PerformanceFactorDetail;
    techniquePerformanceProject?: PerformanceFactorDetail;
    mentalPerformanceProject?: PerformanceFactorDetail;
    environnementPerformanceProject?: PerformanceFactorDetail;
    tactiquePerformanceProject?: PerformanceFactorDetail;
    pcsUrl?: string;
    directVeloUrl?: string;
    /** Notes de frais personnelles (staff indépendant) */
    personalExpenseReceipts?: ExpenseReceipt[];
    /** Calendrier courses personnelles (athlète indépendant) */
    personalRaceCalendar?: AthleteCalendarEntry[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    socialSecurityNumber?: string;
    licenseNumber?: string;
    uciId?: string;
    photoUrl?: string;
    licenseImageUrl?: string;
    licenseImageBase64?: string;
    licenseImageMimeType?: string;
    teamName?: string;
    salary?: number;
    contractEndDate?: string;
    nextSeasonTeam?: string;
    isSearchable?: boolean;
    openToExternalMissions?: boolean;
    signupInfo?: SignupInfo;
    qualitativeProfile?: RiderQualitativeProfile;
    gdprConsent?: GdprConsent;
    /** Parcours sans équipe : profil visible pour le recrutement */
    signupMode?: SignupMode | string;
    isIndependentProfile?: boolean;
    independentActivatedAt?: string;
    /** Profil sportif / pro sur le document User (mode indépendant) */
    professionalSummary?: string;
    skills?: string[];
    careerAspirations?: string;
    /** Pitch de candidature (staff indépendant) */
    defaultApplicationMessage?: string;
    /** Fonction / poste (staff indépendant) — DS, mécano, kiné… */
    staffRole?: StaffRole | string;
    experienceYears?: number;
    certifications?: string[];
    workHistory?: WorkExperience[];
    education?: EducationOrCertification[];
    languages?: SpokenLanguage[];
    /** CV (profil staff indépendant) */
    cvFileName?: string;
    cvMimeType?: string;
    cvFileBase64?: string;
    birthDate?: string;
    nationality?: string;
    sex?: Sex;
    /** Compte Nolio lié (tokens côté serveur uniquement) */
    nolioConnected?: boolean;
    nolioConnectedAt?: string;
    /** Parrainage — code unique partageable */
    referralCode?: string;
    referralTotalCount?: number;
    referralConvertedCount?: number;
    referralPendingCredits?: number;
    /** Tokens FCM / Web Push pour notifications mobiles */
    pushTokens?: string[];
    /** Préférences notifications */
    pushNotificationsEnabled?: boolean;
    /** Abonnement profil indépendant (coureur/staff sans équipe) */
    subscription?: TeamSubscription;
}

export enum UserNotificationType {
    CONVOCATION = 'CONVOCATION',
    SYSTEM = 'SYSTEM',
}

export type ConvocationDispatchMode = 'athlete' | 'staff' | 'general';

export interface UserNotification {
    id: string;
    userId: string;
    teamId: string;
    type: UserNotificationType;
    title: string;
    body: string;
    eventId: string;
    eventName: string;
    convocationMode?: ConvocationDispatchMode;
    read: boolean;
    createdAt: string;
    sentByUserId?: string;
    /** Lien navigation in-app */
    targetSection?: AppSection;
}

export type ConvocationResponseStatus = 'pending' | 'accepted' | 'declined';

export interface ConvocationResponse {
    id: string;
    eventId: string;
    teamId: string;
    userId: string;
    status: ConvocationResponseStatus;
    respondedAt: string;
    comment?: string;
}

export type TeamKind = 'root' | 'worldtour' | 'development' | 'espoirs' | 'femmes' | 'standard';

export interface Organization {
    id: string;
    name: string;
    country: string;
    teamIds: string[];
    adminUserIds: string[];
    billingEmail?: string;
    siret?: string;
    notes?: string;
    createdAt: string;
}

export interface PartnerAccess {
    id: string;
    userId: string;
    teamId: string;
    incomeItemId: string;
    sponsorCompanyName: string;
    scopes: PartnerScope[];
    grantedAt: string;
    grantedByUserId?: string;
    expiresAt?: string;
    isActive: boolean;
}

export type PartnershipMatchStatus =
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'contracted'
    | 'cancelled';

/** Profil sponsor visible sur la marketplace LogiCycle (partenaires sans équipe). */
export interface PartnerMarketplaceProfile {
    id: string;
    userId: string;
    companyName: string;
    sector?: string;
    contactName?: string;
    contactEmail?: string;
    budgetMinEur?: number;
    budgetMaxEur?: number;
    objectives?: string;
    targetDisciplines?: string[];
    targetRegions?: string[];
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}

/** Besoin de sponsoring publié par une équipe / club. */
export interface TeamSponsorshipNeed {
    id: string;
    teamId: string;
    teamName: string;
    title: string;
    description: string;
    budgetMinEur?: number;
    budgetMaxEur?: number;
    objectives?: string;
    disciplines?: string[];
    isOpen: boolean;
    createdAt: string;
    createdByUserId?: string;
}

/** Demande de mise en relation sponsor ↔ équipe (commission LogiCycle si contractualisation). */
export interface PartnershipMatchRequest {
    id: string;
    partnerUserId: string;
    partnerProfileId: string;
    teamId: string;
    needId?: string;
    status: PartnershipMatchStatus;
    message?: string;
    proposedBudgetEur?: number;
    platformFeePercent: number;
    contractedAmountEur?: number;
    createdAt: string;
    respondedAt?: string;
    respondedByUserId?: string;
}

export type PartnerScope =
    | 'view_budget'
    | 'view_counterparts'
    | 'view_documents'
    | 'view_payment_status'
    | 'view_events'
    | 'view_comms';

export type PartnerNewsletterStatus = 'draft' | 'published' | 'archived';

export type PartnerNewsletterBlockType =
    | 'heading'
    | 'paragraph'
    | 'highlight'
    | 'eventList'
    | 'results'
    | 'cta'
    | 'quote'
    | 'interview'
    | 'sponsorSpotlight';

export interface PartnerNewsletterBlock {
    id: string;
    type: PartnerNewsletterBlockType;
    content: string;
}

export interface PartnerNewsletter {
    id: string;
    teamId: string;
    /** Si défini, visible uniquement pour ce partenariat */
    incomeItemId?: string;
    title: string;
    subject: string;
    previewText?: string;
    blocks: PartnerNewsletterBlock[];
    status: PartnerNewsletterStatus;
    createdAt: string;
    publishedAt?: string;
    createdByUserId?: string;
}

export enum CounterpartDeliverableStatus {
    PLANNED = 'planned',
    IN_PROGRESS = 'in_progress',
    DELIVERED = 'delivered',
    VALIDATED = 'validated',
}

export interface PartnerCounterpartDeliverable {
    id: string;
    label: string;
    dueDate?: string;
    status: CounterpartDeliverableStatus;
    notes?: string;
}

export interface Team {
    id: string;
    name: string;
    country: string;
    level: TeamLevel;
    address?: Address;
    subscription?: TeamSubscription;
    organizationId?: string;
    parentTeamId?: string;
    teamKind?: TeamKind;
    /** @deprecated Préférer operationalSettings.gender */
    gender?: TeamGender;
    operationalSettings?: TeamOperationalSettings;
}

export interface TeamMembership {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    userId?: string;
    teamId: string;
    teamName?: string;
    teamLevel?: string;
    teamCountry?: string;
    status: TeamMembershipStatus | string;
    userRole?: UserRole | string;
    requestedUserRole?: UserRole; // Rôle demandé lors de l'invitation
    startDate?: string;
    endDate?: string;
    requestedAt?: string;
    requestedBy?: string;
    approvedAt?: string;
    approvedBy?: string;
    message?: string;
    /** Origine de la demande : inscription, invitation email, etc. */
    source?: 'self_join' | 'email_invite' | string;
    invitedBy?: string;
    invitedAt?: string;
}

export interface Mission {
    id: string;
    teamId: string;
    title: string;
    role: StaffRole;
    startDate: string;
    endDate: string;
    location: string;
    description: string;
    requirements: string[];
    compensationType: MissionCompensationType;
    compensation: string; // "Logement et repas pris en charge"
    dailyRate?: number; // 150
    status: MissionStatus;
    /** Course / événement équipe lié (week-end) — alimente le calendrier du vacataire accepté */
    eventId?: string;
    /** @deprecated Préférer applications — IDs utilisateur candidats */
    applicants?: string[];
    /** Candidatures avec suivi de statut */
    applications?: MissionApplication[];
}

// --- APP STATE ---

export interface GlobalState {
    users: User[];
    teams: Team[];
    teamMemberships: TeamMembership[];
    permissions: AppPermissions;
    permissionRoles: PermissionRole[];
    scoutingRequests: ScoutingRequest[];
    userNotifications?: UserNotification[];
    organizations?: Organization[];
    partnerAccesses?: PartnerAccess[];
    partnerMarketplaceProfiles?: PartnerMarketplaceProfile[];
    teamSponsorshipNeeds?: TeamSponsorshipNeed[];
    partnershipMatchRequests?: PartnershipMatchRequest[];
}

export enum MeetingRecurrence {
    NONE = "Aucune",
    DAILY = "Quotidienne",
    WEEKLY = "Hebdomadaire",
    BIWEEKLY = "Bihebdomadaire",
    MONTHLY = "Mensuelle",
    QUARTERLY = "Trimestrielle",
    YEARLY = "Annuelle"
}

/** Listes de diffusion pour la visibilité des comptes rendus de réunion */
export enum MeetingReportAudience {
    COMITE_DIRECTEUR = "COMITE_DIRECTEUR",
    DIRECTION_SPORTIVE = "DIRECTION_SPORTIVE",
    STAFF_PERFORMANCE = "STAFF_PERFORMANCE",
    STAFF_LOGISTIQUE = "STAFF_LOGISTIQUE",
    STAFF_COMMUNICATION = "STAFF_COMMUNICATION",
    STAFF_MEDICAL = "STAFF_MEDICAL",
    VACATAIRES = "VACATAIRES",
    PARTICIPANTS = "PARTICIPANTS",
}

export interface MeetingReport {
    id: string;
    title: string;
    date: string; // Date de la réunion (ISO string)
    time?: string; // Heure de la réunion (HH:mm)
    endTime?: string; // Heure de fin (HH:mm)
    location?: string;
    organizerId: string; // ID du membre du staff qui organise
    participantIds: string[]; // IDs des membres du staff participants
    agenda?: string; // Ordre du jour
    content: string; // Contenu du compte rendu
    actionItems?: {
        id: string;
        description: string;
        assignedToId?: string; // ID du membre du staff assigné
        dueDate?: string;
        status: 'pending' | 'in_progress' | 'completed';
    }[];
    attachments?: {
        name: string;
        url: string;
        type: string;
    }[];
    createdAt: string;
    updatedAt: string;
    createdBy: string; // ID de l'utilisateur qui a créé le compte rendu
    emailSent: boolean;
    emailSentAt?: string;
    // Nouveaux champs pour la planification et la récurrence
    recurrence?: MeetingRecurrence;
    recurrenceEndDate?: string; // Date de fin de la récurrence (ISO string)
    recurrenceCount?: number; // Nombre d'occurrences
    nextMeetingDate?: string; // Date de la prochaine réunion planifiée (ISO string)
    isScheduled?: boolean; // Si la réunion est planifiée dans le calendrier
    meetingSeriesId?: string; // ID pour regrouper les réunions récurrentes
    previousMeetingReportId?: string; // ID du compte rendu de la réunion précédente
    /** Qui peut consulter le compte rendu (listes éditables par réunion) */
    visibilityAudiences?: MeetingReportAudience[];
}

export interface TeamState {
    teamLevel?: TeamLevel;
    operationalSettings?: TeamOperationalSettings;
    subscription?: TeamSubscription;
    themePrimaryColor?: string;
    themeAccentColor?: string;
    language?: 'fr' | 'en';
    teamLogoUrl?: string;

    riders: Rider[];
    staff: StaffMember[];
    vehicles: Vehicle[];
    equipment: EquipmentItem[];
    raceEvents: RaceEvent[];
    eventTransportLegs: EventTransportLeg[];
    eventAccommodations: EventAccommodation[];
    eventDocuments: EventRaceDocument[];
    eventRadioEquipments: EventRadioEquipment[];
    eventRadioAssignments: EventRadioAssignment[];
    eventBudgetItems: EventBudgetItem[];
    expenseReceipts: ExpenseReceipt[];
    eventChecklistItems: EventChecklistItem[];
    performanceEntries: PerformanceEntry[];
    riderEventSelections: RiderEventSelection[];
    staffEventSelections: StaffEventSelection[];
    eventStaffAvailabilities: EventStaffAvailability[];
    incomeItems: IncomeItem[];
    checklistTemplates: Record<ChecklistRole, ChecklistTemplate[]>;
    categoryBudgets: Partial<Record<BudgetItemCategory, number>>;
    sepaSettings?: TeamSepaSettings;
    invoiceSettings?: TeamInvoiceSettings;
    /** Clé webhook Traccar / télématique (doc team Firestore) */
    gpsWebhookKey?: string;
    scoutingProfiles: ScoutingProfile[];
    teamProducts: TeamProduct[];
    stockItems: StockItem[];
    equipmentStockItems: EquipmentStockItem[];
    warehouses: Warehouse[];
    stockMovements: StockMovement[];
    vehiclePositions: VehiclePosition[];
    partnerNewsletters: PartnerNewsletter[];
    clientRecords: ClientRecord[];
    supplierInvoices: SupplierInvoice[];
    sepaBatches: SepaBatch[];
    bankTransactions: BankTransaction[];
    quotes: Quote[];
    convocationResponses: ConvocationResponse[];
    peerRatings: PeerRating[];
    riderSelfDebriefs: RiderSelfDebrief[];
    teamEventReviews: any[];
    debriefings: any[];
    dietaryPlans: any[];
    missions: Mission[];
    recruitmentOffers: TeamRecruitmentOffer[];
    recruitmentCampaigns: TeamRecruitmentCampaign[];
    performanceArchives: PerformanceArchive[];
    meetingReports: MeetingReport[];
    organizerContacts: OrganizerContact[];
}

export interface AppState extends GlobalState, TeamState {
    activeEventId: string | null;
    activeTeamId: string | null;
    /** Offres coureur ouvertes (toutes équipes) pour le portail recherche */
    openRecruitmentOffers?: TeamRecruitmentOffer[];
}
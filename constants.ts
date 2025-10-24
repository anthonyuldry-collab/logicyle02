

import { 
    PerformanceFactorDetail, StaffMember, Vehicle, EquipmentItem, RaceEvent, 
    EventTransportLeg, EventBudgetItem, PowerProfile, Rider, EventAccommodation, 
    EventRadioEquipment, PerformanceEntry, ScoutingProfile, TeamProduct,
    TeamLevel, StaffRole, ChecklistRole, StaffStatus, ContractType, AvailabilityStatus,
    TransportDirection, TransportMode, AccommodationStatus, MealDay, DocumentStatus,
    BudgetItemCategory, ChecklistItemStatus, EventType, RiderEventStatus, RiderEventPreference,
    FormeStatus, MoralStatus, HealthCondition, RiderQualitativeProfile, VehicleType,
    ClothingType, EquipmentType, EquipmentStatus, PredefinedAllergen,
    DisciplinePracticed, IncomeCategory, AllergySeverity, ScoutingStatus, Discipline,
    RaceInformation,
    EligibleCategory,
    AppSection,
    GlobalState,
    TeamState,
    AppPermissions,
    PermissionRole,
    Address,
    UserRole,
    Sex,
    TeamMembershipStatus,
    Mission,
    MissionStatus,
    MissionCompensationType,
    TeamRole,
    BikeFitMeasurements,
    BikeSpecificMeasurements,
    PowerZoneKey,
    TransportStopType,
    SeasonYear,
    TalentAvailability,
    StaffEventSelection
} from './types';


export const ALL_COUNTRIES: { code: string; name: string }[] = [
    { "code": "AF", "name": "Afghanistan" },
    { "code": "ZA", "name": "Afrique du Sud" },
    { "code": "AX", "name": "Îles Åland" },
    { "code": "AL", "name": "Albanie" },
    { "code": "DZ", "name": "Algérie" },
    { "code": "DE", "name": "Allemagne" },
    { "code": "AD", "name": "Andorre" },
    { "code": "AO", "name": "Angola" },
    { "code": "AI", "name": "Anguilla" },
    { "code": "AQ", "name": "Antarctique" },
    { "code": "AG", "name": "Antigua-et-Barbuda" },
    { "code": "SA", "name": "Arabie saoudite" },
    { "code": "AR", "name": "Argentine" },
    { "code": "AM", "name": "Arménie" },
    { "code": "AW", "name": "Aruba" },
    { "code": "AU", "name": "Australie" },
    { "code": "AT", "name": "Autriche" },
    { "code": "AZ", "name": "Azerbaïdjan" },
    { "code": "BS", "name": "Bahamas" },
    { "code": "BH", "name": "Bahreïn" },
    { "code": "BD", "name": "Bangladesh" },
    { "code": "BB", "name": "Barbade" },
    { "code": "BE", "name": "Belgique" },
    { "code": "BZ", "name": "Belize" },
    { "code": "BJ", "name": "Bénin" },
    { "code": "BM", "name": "Bermudes" },
    { "code": "BT", "name": "Bhoutan" },
    { "code": "BY", "name": "Biélorussie" },
    { "code": "MM", "name": "Birmanie" },
    { "code": "BO", "name": "Bolivie" },
    { "code": "BA", "name": "Bosnie-Herzégovine" },
    { "code": "BW", "name": "Botswana" },
    { "code": "BR", "name": "Brésil" },
    { "code": "BN", "name": "Brunei Darussalam" },
    { "code": "BG", "name": "Bulgarie" },
    { "code": "BF", "name": "Burkina Faso" },
    { "code": "BI", "name": "Burundi" },
    { "code": "KH", "name": "Cambodge" },
    { "code": "CM", "name": "Cameroun" },
    { "code": "CA", "name": "Canada" },
    { "code": "CV", "name": "Cap-Vert" },
    { "code": "CL", "name": "Chili" },
    { "code": "CN", "name": "Chine" },
    { "code": "CY", "name": "Chypre" },
    { "code": "CO", "name": "Colombie" },
    { "code": "KM", "name": "Comores" },
    { "code": "CG", "name": "Congo" },
    { "code": "CD", "name": "Congo (Rép. dém.)" },
    { "code": "KP", "name": "Corée du Nord" },
    { "code": "KR", "name": "Corée du Sud" },
    { "code": "CR", "name": "Costa Rica" },
    { "code": "CI", "name": "Côte d'Ivoire" },
    { "code": "HR", "name": "Croatie" },
    { "code": "CU", "name": "Cuba" },
    { "code": "CW", "name": "Curaçao" },
    { "code": "DK", "name": "Danemark" },
    { "code": "DJ", "name": "Djibouti" },
    { "code": "DM", "name": "Dominique" },
    { "code": "EG", "name": "Égypte" },
    { "code": "AE", "name": "Émirats arabes unis" },
    { "code": "EC", "name": "Équateur" },
    { "code": "ER", "name": "Érythrée" },
    { "code": "ES", "name": "Espagne" },
    { "code": "EE", "name": "Estonie" },
    { "code": "SZ", "name": "Eswatini" },
    { "code": "US", "name": "États-Unis" },
    { "code": "ET", "name": "Éthiopie" },
    { "code": "FJ", "name": "Fidji" },
    { "code": "FI", "name": "Finlande" },
    { "code": "FR", "name": "France" },
    { "code": "GA", "name": "Gabon" },
    { "code": "GM", "name": "Gambie" },
    { "code": "GE", "name": "Géorgie" },
    { "code": "GS", "name": "Géorgie du Sud-et-les îles Sandwich du Sud" },
    { "code": "GH", "name": "Ghana" },
    { "code": "GI", "name": "Gibraltar" },
    { "code": "GR", "name": "Grèce" },
    { "code": "GD", "name": "Grenade" },
    { "code": "GL", "name": "Groenland" },
    { "code": "GP", "name": "Guadeloupe" },
    { "code": "GU", "name": "Guam" },
    { "code": "GT", "name": "Guatemala" },
    { "code": "GG", "name": "Guernesey" },
    { "code": "GN", "name": "Guinée" },
    { "code": "GQ", "name": "Guinée équatoriale" },
    { "code": "GW", "name": "Guinée-Bissau" },
    { "code": "GY", "name": "Guyana" },
    { "code": "GF", "name": "Guyane" },
    { "code": "HT", "name": "Haïti" },
    { "code": "HN", "name": "Honduras" },
    { "code": "HK", "name": "Hong Kong" },
    { "code": "HU", "name": "Hongrie" },
    { "code": "IM", "name": "Île de Man" },
    { "code": "UM", "name": "Îles mineures éloignées des États-Unis" },
    { "code": "NF", "name": "Île Norfolk" },
    { "code": "CX", "name": "Île Christmas" },
    { "code": "BV", "name": "Île Bouvet" },
    { "code": "HM", "name": "Îles Heard-et-MacDonald" },
    { "code": "CC", "name": "Îles Cocos" },
    { "code": "CK", "name": "Îles Cook" },
    { "code": "FO", "name": "Îles Féroé" },
    { "code": "FK", "name": "Malouines" },
    { "code": "MP", "name": "Îles Mariannes du Nord" },
    { "code": "MH", "name": "Îles Marshall" },
    { "code": "PN", "name": "Îles Pitcairn" },
    { "code": "SB", "name": "Îles Salomon" },
    { "code": "VG", "name": "Îles Vierges britanniques" },
    { "code": "VI", "name": "Îles Vierges des États-Unis" },
    { "code": "IN", "name": "Inde" },
    { "code": "ID", "name": "Indonésie" },
    { "code": "IR", "name": "Iran" },
    { "code": "IQ", "name": "Irak" },
    { "code": "IE", "name": "Irlande" },
    { "code": "IS", "name": "Islande" },
    { "code": "IL", "name": "Israël" },
    { "code": "IT", "name": "Italie" },
    { "code": "JM", "name": "Jamaïque" },
    { "code": "JP", "name": "Japon" },
    { "code": "JE", "name": "Jersey" },
    { "code": "JO", "name": "Jordanie" },
    { "code": "KZ", "name": "Kazakhstan" },
    { "code": "KE", "name": "Kenya" },
    { "code": "KG", "name": "Kirghizistan" },
    { "code": "KI", "name": "Kiribati" },
    { "code": "KW", "name": "Koweït" },
    { "code": "LA", "name": "Laos" },
    { "code": "LS", "name": "Lesotho" },
    { "code": "LV", "name": "Lettonie" },
    { "code": "LB", "name": "Liban" },
    { "code": "LR", "name": "Libéria" },
    { "code": "LY", "name": "Libye" },
    { "code": "LI", "name": "Liechtenstein" },
    { "code": "LT", "name": "Lituanie" },
    { "code": "LU", "name": "Luxembourg" },
    { "code": "MO", "name": "Macao" },
    { "code": "MK", "name": "Macédoine du Nord" },
    { "code": "MG", "name": "Madagascar" },
    { "code": "MY", "name": "Malaisie" },
    { "code": "MW", "name": "Malawi" },
    { "code": "MV", "name": "Maldives" },
    { "code": "ML", "name": "Mali" },
    { "code": "MT", "name": "Malte" },
    { "code": "MA", "name": "Maroc" },
    { "code": "MQ", "name": "Martinique" },
    { "code": "MU", "name": "Maurice" },
    { "code": "MR", "name": "Mauritanie" },
    { "code": "YT", "name": "Mayotte" },
    { "code": "MX", "name": "Mexique" },
    { "code": "FM", "name": "Micronésie" },
    { "code": "MD", "name": "Moldavie" },
    { "code": "MC", "name": "Monaco" },
    { "code": "MN", "name": "Mongolie" },
    { "code": "ME", "name": "Monténégro" },
    { "code": "MS", "name": "Montserrat" },
    { "code": "MZ", "name": "Mozambique" },
    { "code": "NA", "name": "Namibie" },
    { "code": "NR", "name": "Nauru" },
    { "code": "NP", "name": "Népal" },
    { "code": "NI", "name": "Nicaragua" },
    { "code": "NE", "name": "Niger" },
    { "code": "NG", "name": "Nigéria" },
    { "code": "NU", "name": "Niue" },
    { "code": "NO", "name": "Norvège" },
    { "code": "NC", "name": "Nouvelle-Calédonie" },
    { "code": "NZ", "name": "Nouvelle-Zélande" },
    { "code": "OM", "name": "Oman" },
    { "code": "UG", "name": "Ouganda" },
    { "code": "UZ", "name": "Ouzbékistan" },
    { "code": "PK", "name": "Pakistan" },
    { "code": "PW", "name": "Palaos" },
    { "code": "PS", "name": "Palestine" },
    { "code": "PA", "name": "Panama" },
    { "code": "PG", "name": "Papouasie-Nouvelle-Guinée" },
    { "code": "PY", "name": "Paraguay" },
    { "code": "NL", "name": "Pays-Bas" },
    { "code": "PE", "name": "Pérou" },
    { "code": "PH", "name": "Philippines" },
    { "code": "PL", "name": "Pologne" },
    { "code": "PF", "name": "Polynésie française" },
    { "code": "PR", "name": "Porto Rico" },
    { "code": "PT", "name": "Portugal" },
    { "code": "QA", "name": "Qatar" },
    { "code": "RE", "name": "La Réunion" },
    { "code": "RO", "name": "Roumanie" },
    { "code": "GB", "name": "Royaume-Uni" },
    { "code": "RU", "name": "Russie" },
    { "code": "RW", "name": "Rwanda" },
    { "code": "EH", "name": "Sahara occidental" },
    { "code": "BL", "name": "Saint-Barthélemy" },
    { "code": "KN", "name": "Saint-Christophe-et-Niévès" },
    { "code": "SM", "name": "Saint-Marin" },
    { "code": "MF", "name": "Saint-Martin (partie française)" },
    { "code": "SX", "name": "Saint-Martin (partie néerlandaise)" },
    { "code": "PM", "name": "Saint-Pierre-et-Miquelon" },
    { "code": "VC", "name": "Saint-Vincent-et-les-Grenadines" },
    { "code": "SH", "name": "Sainte-Hélène, Ascension et Tristan da Cunha" },
    { "code": "LC", "name": "Sainte-Lucie" },
    { "code": "SV", "name": "Salvador" },
    { "code": "WS", "name": "Samoa" },
    { "code": "AS", "name": "Samoa américaines" },
    { "code": "ST", "name": "Sao Tomé-et-Principe" },
    { "code": "SN", "name": "Sénégal" },
    { "code": "RS", "name": "Serbie" },
    { "code": "SC", "name": "Seychelles" },
    { "code": "SL", "name": "Sierra Leone" },
    { "code": "SG", "name": "Singapour" },
    { "code": "SK", "name": "Slovaquie" },
    { "code": "SI", "name": "Slovénie" },
    { "code": "SO", "name": "Somalie" },
    { "code": "SD", "name": "Soudan" },
    { "code": "SS", "name": "Soudan du Sud" },
    { "code": "LK", "name": "Sri Lanka" },
    { "code": "SE", "name": "Suède" },
    { "code": "CH", "name": "Suisse" },
    { "code": "SR", "name": "Suriname" },
    { "code": "SJ", "name": "Svalbard et Jan Mayen" },
    { "code": "SY", "name": "Syrie" },
    { "code": "TJ", "name": "Tadjikistan" },
    { "code": "TW", "name": "Taïwan" },
    { "code": "TZ", "name": "Tanzanie" },
    { "code": "TD", "name": "Tchad" },
    { "code": "CZ", "name": "Tchéquie" },
    { "code": "TF", "name": "Terres australes et antarctiques françaises" },
    { "code": "IO", "name": "Territoire britannique de l'océan Indien" },
    { "code": "TH", "name": "Thaïlande" },
    { "code": "TL", "name": "Timor oriental" },
    { "code": "TG", "name": "Togo" },
    { "code": "TK", "name": "Tokelau" },
    { "code": "TO", "name": "Tonga" },
    { "code": "TT", "name": "Trinité-et-Tobago" },
    { "code": "TN", "name": "Tunisie" },
    { "code": "TM", "name": "Turkménistan" },
    { "code": "TR", "name": "Turquie" },
    { "code": "TV", "name": "Tuvalu" },
    { "code": "UA", "name": "Ukraine" },
    { "code": "UY", "name": "Uruguay" },
    { "code": "VU", "name": "Vanuatu" },
    { "code": "VA", "name": "Vatican" },
    { "code": "VE", "name": "Venezuela" },
    { "code": "VN", "name": "Viêt Nam" },
    { "code": "WF", "name": "Wallis-et-Futuna" },
    { "code": "YE", "name": "Yémen" },
    { "code": "ZM", "name": "Zambie" },
    { "code": "ZW", "name": "Zimbabwe" }
];

export const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
];

export const DEFAULT_THEME_PRIMARY_COLOR = '#1e293b'; // slate-800
export const DEFAULT_THEME_ACCENT_COLOR = '#4f46e5'; // indigo-600

export const SECTIONS: Array<{ id: string; labels: Record<'fr' | 'en', string>; icon: string; group: Record<'fr' | 'en', string> }> = [
    // Tableau de Bord Principal - Toujours en premier
    { id: 'myDashboard', labels: { fr: 'Tableau de Bord', en: 'Dashboard' }, icon: 'HomeIcon', group: { fr: 'Tableau de Bord', en: 'Dashboard' } },
    { id: 'events', labels: { fr: 'Calendrier', en: 'Calendar' }, icon: 'CalendarDaysIcon', group: { fr: 'Tableau de Bord', en: 'Dashboard' } },
    
    // Navigation Principale - Actions quotidiennes du coureur
    { id: 'myCalendar', labels: { fr: 'Mon Calendrier', en: 'My Calendar' }, icon: 'CalendarDaysIcon', group: { fr: 'Navigation Principale', en: 'Main Navigation' } },
    { id: 'myProfile', labels: { fr: 'Mon Profil', en: 'My Profile' }, icon: 'IdentificationIcon', group: { fr: 'Navigation Principale', en: 'Main Navigation' } },
    { id: 'myResults', labels: { fr: 'Mon Palmarès', en: 'My Results' }, icon: 'TrophyIcon', group: { fr: 'Navigation Principale', en: 'Main Navigation' } },
    { id: 'myTrips', labels: { fr: 'Mes Déplacements', en: 'My Trips' }, icon: 'PaperAirplaneIcon', group: { fr: 'Navigation Principale', en: 'Main Navigation' } },
    
    // Performance & Santé - Regroupement logique (sections les plus utilisées)
    { id: 'performance', labels: { fr: 'Pôle Performance', en: 'Performance Hub' }, icon: 'ChartBarIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'roster', labels: { fr: 'Effectif', en: 'Roster' }, icon: 'UsersIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'season-planning', labels: { fr: 'Planning de Saison', en: 'Season Planning' }, icon: 'CalendarDaysIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'staff', labels: { fr: 'Staff', en: 'Staff' }, icon: 'UserGroupIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'myCareer', labels: { fr: 'Ma Carrière', en: 'My Career' }, icon: 'TrophyIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'nutrition', labels: { fr: 'Ma Nutrition', en: 'My Nutrition' }, icon: 'BeakerIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'scouting', labels: { fr: 'Scouting', en: 'Scouting' }, icon: 'EyeIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    { id: 'talentAvailability', labels: { fr: 'Disponibilités Talents', en: 'Talent Availability' }, icon: 'UserGroupIcon', group: { fr: 'Performance & Santé', en: 'Performance & Health' } },
    
    // Logistique & Équipement - Regroupement technique et logistique
    { id: 'riderEquipment', labels: { fr: 'Mon Matériel', en: 'My Equipment' }, icon: 'WrenchScrewdriverIcon', group: { fr: 'Logistique & Équipement', en: 'Logistics & Equipment' } },
    { id: 'bikeSetup', labels: { fr: 'Cotes Vélo', en: 'Bike Setup' }, icon: 'Cog6ToothIcon', group: { fr: 'Logistique & Équipement', en: 'Logistics & Equipment' } },
    { id: 'equipment', labels: { fr: 'Matériel', en: 'Equipment' }, icon: 'WrenchScrewdriverIcon', group: { fr: 'Logistique & Équipement', en: 'Logistics & Equipment' } },
    { id: 'vehicles', labels: { fr: 'Véhicules', en: 'Vehicles' }, icon: 'TruckIcon', group: { fr: 'Logistique & Équipement', en: 'Logistics & Equipment' } },
    { id: 'stocks', labels: { fr: 'Stocks', en: 'Stocks' }, icon: 'CircleStackIcon', group: { fr: 'Logistique & Équipement', en: 'Logistics & Equipment' } },
    { id: 'financial', labels: { fr: 'Finances', en: 'Financials' }, icon: 'BanknotesIcon', group: { fr: 'Logistique & Équipement', en: 'Logistics & Equipment' } },
    
    // Administration - Fonctions administratives avancées
    { id: 'adminDashboard', labels: { fr: 'Tableau de Bord Admin', en: 'Admin Dashboard' }, icon: 'ChartBarIcon', group: { fr: 'Administration', en: 'Administration' } },
    { id: 'adminDossier', labels: { fr: 'Admin', en: 'Admin' }, icon: 'ShieldCheckIcon', group: { fr: 'Administration', en: 'Administration' } },
    { id: 'userSettings', labels: { fr: 'Paramètres', en: 'Settings' }, icon: 'Cog6ToothIcon', group: { fr: 'Administration', en: 'Administration' } },
    { id: 'userManagement', labels: { fr: 'Gestion Utilisateurs', en: 'User Management' }, icon: 'UserPlusIcon', group: { fr: 'Administration', en: 'Administration' } },
    { id: 'permissions', labels: { fr: 'Rôles & Permissions', en: 'Roles & Permissions' }, icon: 'KeyIcon', group: { fr: 'Administration', en: 'Administration' } },
    { id: 'checklist', labels: { fr: 'Modèles Checklist', en: 'Checklist Templates' }, icon: 'ClipboardListIcon', group: { fr: 'Administration', en: 'Administration' } },
    { id: 'superAdmin', labels: { fr: '🔧 Super Admin', en: '🔧 Super Admin' }, icon: 'ShieldExclamationIcon', group: { fr: 'Administration', en: 'Administration' } },
];

export const TEAM_STATE_COLLECTIONS = [
    'riders', 'staff', 'vehicles', 'equipment', 'raceEvents', 'eventTransportLegs', 
    'eventAccommodations', 'eventDocuments', 'eventRadioEquipments', 'eventRadioAssignments', 
    'eventBudgetItems', 'eventChecklistItems', 'performanceEntries', 'riderEventSelections', 
    'eventStaffAvailabilities', 'incomeItems', 'scoutingProfiles', 'teamProducts', 
    'stockItems', 'equipmentStockItems', 'peerRatings', 'teamEventReviews', 'debriefings', 'missions'
];

export const emptyRaceInformation: RaceInformation = {
    permanenceAddress: '',
    permanenceTime: '',
    permanenceDate: '',
    reunionDSTime: '',
    presentationTime: '',
    departFictifTime: '',
    departReelTime: '',
    arriveePrevueTime: '',
    distanceKm: 0,
    radioFrequency: '',
};

export const emptyEventRadioEquipment = (eventId: string, id: string): EventRadioEquipment => ({
    id: id,
    eventId: eventId,
    hasEquipment: false,
    details: '',
    channelFrequency: '',
});

export const emptyPerformanceEntry = (eventId: string, id: string): PerformanceEntry => ({
    id: id,
    eventId: eventId,
    generalObjectives: '',
    resultsSummary: '',
    keyLearnings: '',
    raceOverallRanking: '',
    teamRiderRankings: '',
    dsGeneralFeedback: '',
    riderRatings: [],
    staffRatings: [],
});


export const getInitialGlobalState = (): GlobalState => ({
  users: [],
  teams: [],
  teamMemberships: [],
  permissions: {},
  permissionRoles: [
    { id: TeamRole.ADMIN, name: 'Administrateur', isDeletable: false },
    { id: TeamRole.EDITOR, name: 'Editeur', isDeletable: false },
    { id: TeamRole.MEMBER, name: 'Membre', isDeletable: false },
    { id: TeamRole.VIEWER, name: 'Athlète', isDeletable: false },
  ],
  scoutingRequests: [],
});

export const getInitialTeamState = (): TeamState => ({
    riders: [],
    staff: [],
    vehicles: [],
    equipment: [],
    raceEvents: [],
    eventTransportLegs: [],
    eventAccommodations: [],
    eventDocuments: [],
    eventRadioEquipments: [],
    eventRadioAssignments: [],
    eventBudgetItems: [],
    eventChecklistItems: [],
    performanceEntries: [],
    riderEventSelections: [],
    staffEventSelections: [],
    eventStaffAvailabilities: [],
    incomeItems: [],
    checklistTemplates: {
        [ChecklistRole.DS]: [],
        [ChecklistRole.ASSISTANT]: [],
        [ChecklistRole.MECANO]: [],
        [ChecklistRole.MANAGER]: [],
        [ChecklistRole.COMMUNICATION]: [],
        [ChecklistRole.COUREUR]: [],
    },
    categoryBudgets: {},
    scoutingProfiles: [],
    teamProducts: [],
    stockItems: [],
    equipmentStockItems: [],
    peerRatings: [],
    teamEventReviews: [],
    debriefings: [],
    dietaryPlans: [],
    missions: [],
});

export const initialEquipmentFormState: Omit<EquipmentItem, 'id'> = {
  name: '',
  type: EquipmentType.VELO_ROUTE,
  status: EquipmentStatus.DISPONIBLE,
  assignedToRiderId: undefined,
  brand: '',
  model: '',
  serialNumber: '',
  purchaseDate: '',
  purchasePrice: undefined,
  lastMaintenanceDate: '',
  notes: '',
  photoUrl: '',
  size: '',
  components: [],
};

export const initialStaffFormState: Omit<StaffMember, 'id'> = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: StaffRole.ASSISTANT,
  status: StaffStatus.BENEVOLE,
  openToExternalMissions: false,
  skills: [],
  professionalSummary: '',
  address: {},
  weeklyAvailability: {},
  availability: [],
  workHistory: [],
  education: [],
  languages: [],
  sportswear: [],
  notesGeneral: '',
};

export const initialScoutingProfileFormState: Omit<ScoutingProfile, 'id'> = {
    firstName: '',
    lastName: '',
    email: '',
    status: ScoutingStatus.TO_WATCH,
    potentialRating: 3,
    discipline: DisciplinePracticed.ROUTE,
    categories: [],
    allergies: [],
    
    // Performance Project
    performanceGoals: '',
    physiquePerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    },
    techniquePerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    },
    mentalPerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    },
    environnementPerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    },
    tactiquePerformanceProject: {
        forces: '',
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    },
    
    // Interview & Motivation
    cyclingMotivation: '',
    shortTermGoals: '',
    mediumTermGoals: '',
    longTermGoals: '',
    careerAspirations: '',
    personalValues: '',
    challengesFaced: '',
    supportNeeds: '',
};

export const RIDER_EVENT_STATUS_COLORS: Record<RiderEventStatus, string> = {
  [RiderEventStatus.TITULAIRE]: 'bg-green-100 text-green-800',
  [RiderEventStatus.REMPLACANT]: 'bg-blue-100 text-blue-800',
  [RiderEventStatus.PRE_SELECTION]: 'bg-yellow-100 text-yellow-800',
  [RiderEventStatus.NON_RETENU]: 'bg-gray-100 text-gray-800',
  [RiderEventStatus.INDISPONIBLE]: 'bg-red-100 text-red-800',
  [RiderEventStatus.ABSENT]: 'bg-purple-100 text-purple-800',
  [RiderEventStatus.EN_ATTENTE]: 'bg-orange-100 text-orange-800',
  [RiderEventStatus.NE_PAS_ENGAGER]: 'bg-red-200 text-red-900 font-bold',
  [RiderEventStatus.INFO]: 'bg-cyan-100 text-cyan-800'
};

export const RIDER_EVENT_PREFERENCE_COLORS: Record<RiderEventPreference, string> = {
  [RiderEventPreference.VEUT_PARTICIPER]: 'bg-green-100 text-green-800',
  [RiderEventPreference.OBJECTIFS_SPECIFIQUES]: 'bg-blue-100 text-blue-800',
  [RiderEventPreference.ABSENT]: 'bg-red-100 text-red-800',
  [RiderEventPreference.NE_VEUT_PAS]: 'bg-gray-100 text-gray-800',
  [RiderEventPreference.EN_ATTENTE]: 'bg-yellow-100 text-yellow-800'
};

export const SEASON_YEAR_COLORS: Record<SeasonYear, string> = {
  [SeasonYear.SEASON_2024]: 'bg-blue-100 text-blue-800',
  [SeasonYear.SEASON_2025]: 'bg-green-100 text-green-800',
  [SeasonYear.SEASON_2026]: 'bg-purple-100 text-purple-800',
  [SeasonYear.SEASON_2027]: 'bg-orange-100 text-orange-800',
  [SeasonYear.SEASON_2028]: 'bg-pink-100 text-pink-800',
};

export const TALENT_AVAILABILITY_COLORS: Record<TalentAvailability, string> = {
  [TalentAvailability.DISPONIBLE]: 'bg-green-100 text-green-800',
  [TalentAvailability.PAS_DISPONIBLE]: 'bg-red-100 text-red-800',
  [TalentAvailability.OBJECTIFS]: 'bg-blue-100 text-blue-800',
};

export const TRANSPORT_STOP_TYPE_COLORS: Record<TransportStopType, string> = {
  [TransportStopType.PICKUP]: 'bg-blue-100 text-blue-800',
  [TransportStopType.DROPOFF]: 'bg-green-100 text-green-800',
  [TransportStopType.WAYPOINT]: 'bg-gray-100 text-gray-800',
  [TransportStopType.AIRPORT_ARRIVAL]: 'bg-purple-100 text-purple-800',
  [TransportStopType.AIRPORT_DEPARTURE]: 'bg-purple-200 text-purple-900',
  [TransportStopType.TRAIN_STATION_ARRIVAL]: 'bg-orange-100 text-orange-800',
  [TransportStopType.TRAIN_STATION_DEPARTURE]: 'bg-orange-200 text-orange-900',
  [TransportStopType.HOTEL_PICKUP]: 'bg-indigo-100 text-indigo-800',
  [TransportStopType.HOTEL_DROPOFF]: 'bg-indigo-200 text-indigo-900',
  [TransportStopType.RACE_START]: 'bg-red-100 text-red-800',
  [TransportStopType.RACE_FINISH]: 'bg-red-200 text-red-900',
  [TransportStopType.MEETING_POINT]: 'bg-yellow-100 text-yellow-800',
  [TransportStopType.HOME_PICKUP]: 'bg-teal-100 text-teal-800',
  [TransportStopType.HOME_DROPOFF]: 'bg-teal-200 text-teal-900',
  [TransportStopType.TRAIN_PICKUP]: 'bg-orange-100 text-orange-800',
  [TransportStopType.TRAIN_DROPOFF]: 'bg-orange-200 text-orange-900',
  [TransportStopType.AIRPORT_PICKUP]: 'bg-purple-100 text-purple-800',
  [TransportStopType.AIRPORT_DROPOFF]: 'bg-purple-200 text-purple-900'
};

export const STAFF_ROLE_COLORS: Record<StaffRole, string> = {
  [StaffRole.MANAGER]: 'bg-red-200 text-red-800',
  [StaffRole.DS]: 'bg-blue-200 text-blue-800',
  [StaffRole.ASSISTANT]: 'bg-green-200 text-green-800',
  [StaffRole.MECANO]: 'bg-yellow-200 text-yellow-800',
  [StaffRole.COMMUNICATION]: 'bg-purple-200 text-purple-800',
  [StaffRole.MEDECIN]: 'bg-pink-200 text-pink-800',
  [StaffRole.KINE]: 'bg-teal-200 text-teal-800',
  [StaffRole.RESP_PERF]: 'bg-indigo-200 text-indigo-800',
  [StaffRole.ENTRAINEUR]: 'bg-cyan-200 text-cyan-800',
  [StaffRole.DATA_ANALYST]: 'bg-gray-300 text-gray-800',
  [StaffRole.PREPA_PHYSIQUE]: 'bg-orange-200 text-orange-800',
  [StaffRole.AUTRE]: 'bg-gray-200 text-gray-700',
};

export const STAFF_STATUS_COLORS: Record<StaffStatus, string> = {
    [StaffStatus.BENEVOLE]: 'bg-green-100 text-green-800',
    [StaffStatus.VACATAIRE]: 'bg-blue-100 text-blue-800',
    [StaffStatus.SALARIE]: 'bg-indigo-100 text-indigo-800',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  [EventType.COMPETITION]: 'bg-blue-100 text-blue-800',
  [EventType.STAGE]: 'bg-yellow-100 text-yellow-800',
};

export const INCOME_CATEGORY_COLORS: Record<IncomeCategory, string> = {
    [IncomeCategory.SPONSORING]: 'bg-blue-100 text-blue-800',
    [IncomeCategory.SUBVENTIONS]: 'bg-green-100 text-green-800',
    [IncomeCategory.MECENAT]: 'bg-purple-100 text-purple-800',
    [IncomeCategory.DONS]: 'bg-pink-100 text-pink-800',
    [IncomeCategory.ACTIVITES_COMMERCIALES]: 'bg-orange-100 text-orange-800',
    [IncomeCategory.AUTRE]: 'bg-gray-100 text-gray-800',
};

export const BUDGET_CATEGORY_COLORS: Record<BudgetItemCategory, string> = {
    [BudgetItemCategory.TRANSPORT]: 'bg-blue-100 text-blue-800',
    [BudgetItemCategory.HEBERGEMENT]: 'bg-green-100 text-green-800',
    [BudgetItemCategory.REPAS]: 'bg-yellow-100 text-yellow-800',
    [BudgetItemCategory.VOITURE_EQUIPE]: 'bg-purple-100 text-purple-800',
    [BudgetItemCategory.FRAIS_COURSE]: 'bg-red-100 text-red-800',
    [BudgetItemCategory.MATERIEL]: 'bg-indigo-100 text-indigo-800',
    [BudgetItemCategory.POLE_PERFORMANCE]: 'bg-teal-100 text-teal-800',
    [BudgetItemCategory.SALAIRES]: 'bg-pink-100 text-pink-800',
    [BudgetItemCategory.FRAIS_DIVERS]: 'bg-gray-100 text-gray-800',
};

export const RIDER_QUALITATIVE_PROFILE_COLORS: Record<RiderQualitativeProfile, string> = {
    [RiderQualitativeProfile.GRIMPEUR]: 'bg-red-100 text-red-800',
    [RiderQualitativeProfile.SPRINTEUR]: 'bg-green-100 text-green-800',
    [RiderQualitativeProfile.ROULEUR]: 'bg-blue-100 text-blue-800',
    [RiderQualitativeProfile.PUNCHEUR]: 'bg-yellow-100 text-yellow-800',
    [RiderQualitativeProfile.COMPLET]: 'bg-purple-100 text-purple-800',
    [RiderQualitativeProfile.CLASSIQUE]: 'bg-orange-100 text-orange-800',
    [RiderQualitativeProfile.BAROUDEUR_PROFIL]: 'bg-teal-100 text-teal-800',
    [RiderQualitativeProfile.AUTRE]: 'bg-gray-100 text-gray-800',
};

export const EQUIPMENT_TYPE_COLORS: Record<EquipmentType, string> = {
    [EquipmentType.VELO_ROUTE]: 'bg-blue-100 text-blue-800',
    [EquipmentType.VELO_CLM]: 'bg-indigo-100 text-indigo-800',
    [EquipmentType.ROUES_AVANT]: 'bg-gray-200 text-gray-800',
    [EquipmentType.ROUES_ARRIERE]: 'bg-gray-200 text-gray-800',
    [EquipmentType.PAIRE_ROUES]: 'bg-gray-200 text-gray-800',
    [EquipmentType.CADRE]: 'bg-purple-100 text-purple-800',
    [EquipmentType.CAPTEUR_PUISSANCE]: 'bg-red-100 text-red-800',
    [EquipmentType.COMPTEUR_GPS]: 'bg-yellow-100 text-yellow-800',
    [EquipmentType.HOME_TRAINER]: 'bg-green-100 text-green-800',
    [EquipmentType.CASQUE]: 'bg-orange-100 text-orange-800',
    [EquipmentType.TEXTILE]: 'bg-pink-100 text-pink-800',
    [EquipmentType.CHAUSSURES]: 'bg-teal-100 text-teal-800',
    [EquipmentType.AUTRE]: 'bg-gray-100 text-gray-700',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
    [EquipmentStatus.DISPONIBLE]: 'bg-green-100 text-green-800',
    [EquipmentStatus.EN_MAINTENANCE]: 'bg-yellow-100 text-yellow-800',
    [EquipmentStatus.ASSIGNE]: 'bg-blue-100 text-blue-800',
    [EquipmentStatus.HORS_SERVICE]: 'bg-red-100 text-red-800',
    [EquipmentStatus.ARCHIVE]: 'bg-gray-100 text-gray-700',
};

export const SCOUTING_STATUS_COLORS: Record<ScoutingStatus, string> = {
    [ScoutingStatus.TO_WATCH]: 'bg-blue-100 text-blue-800',
    [ScoutingStatus.CONTACTED]: 'bg-yellow-100 text-yellow-800',
    [ScoutingStatus.IN_DISCUSSION]: 'bg-orange-100 text-orange-800',
    [ScoutingStatus.REJECTED]: 'bg-red-100 text-red-800',
    [ScoutingStatus.SIGNED]: 'bg-green-100 text-green-800',
    [ScoutingStatus.AWAITING_APPROVAL]: 'bg-purple-100 text-purple-800',
    [ScoutingStatus.DATA_SHARED]: 'bg-teal-100 text-teal-800',
};

export const POWER_ZONE_COLORS: Record<PowerZoneKey, string> = {
    z1: '#d4edda',
    z2: '#cce5ff',
    z3: '#fff3cd',
    z4: '#f8d7da',
    z5: '#e2e3e5',
    z6: '#d1ecf1',
    z7: '#d6d8db',
};

export const RIDER_ALLERGY_SEVERITY_COLORS: Record<AllergySeverity, string> = {
    [AllergySeverity.FAIBLE]: 'bg-green-100 text-green-800',
    [AllergySeverity.MODEREE]: 'bg-yellow-100 text-yellow-800',
    [AllergySeverity.SEVERE]: 'bg-red-100 text-red-800',
};

export const COGGAN_CATEGORY_COLORS: Record<string, string> = {
    "Classe Mondiale": "bg-purple-200 text-purple-800",
    "Exceptionnel": "bg-purple-200 text-purple-800",
    "Excellent": "bg-blue-200 text-blue-800",
    "Très Bon": "bg-teal-200 text-teal-800",
    "Bon": "bg-green-200 text-green-800",
    "Modéré": "bg-lime-200 text-lime-800",
    "Entraîné": "bg-yellow-200 text-yellow-800",
    "Débutant": "bg-orange-200 text-orange-800",
    "Novice": "bg-red-200 text-red-800",
    "Inf. Novice": "bg-gray-200 text-gray-700",
    "N/A": "bg-gray-100 text-gray-500",
};

export const PERFORMANCE_PROJECT_FACTORS_CONFIG = [
    { id: 'physiquePerformanceProject', label: 'Physique', icon: 'LungsIcon', forcesPrompts: ['Endurance', 'PMA', 'Force Max'] },
    { id: 'techniquePerformanceProject', label: 'Technique', icon: 'CyclingIcon', forcesPrompts: ['Agilité', 'Positionnement', 'Descendeur'] },
    { id: 'tactiquePerformanceProject', label: 'Tactique', icon: 'TacticsIcon', forcesPrompts: ['Sens de la course', 'Prise de décision', 'Gestion de l\'effort'] },
    { id: 'mentalPerformanceProject', label: 'Mental', icon: 'BrainIcon', forcesPrompts: ['Motivation', 'Gestion du stress', 'Confiance en soi'] },
    { id: 'environnementPerformanceProject', label: 'Environnement', icon: 'MountainIcon', forcesPrompts: ['Soutien familial', 'Équilibre de vie'] },
];

export const SPIDER_CHART_CHARACTERISTICS_CONFIG = [
    { key: 'charSprint', label: 'Sprint' },
    { key: 'charAnaerobic', label: 'Anaérobie' },
    { key: 'charPuncher', label: 'Puncheur' },
    { key: 'charClimbing', label: 'Grimpeur' },
    { key: 'charRouleur', label: 'Rouleur' },
];

export const defaultRiderCharCap = {
    charSprint: 50,
    charAnaerobic: 50,
    charPuncher: 50,
    charClimbing: 50,
    charRouleur: 50
};

export const BIKE_SETUP_SPECIFIC_FIELDS: Array<{ key: keyof BikeSpecificMeasurements; label: string }> = [
  { key: 'tailleCadre', label: 'Taille cadre' },
  { key: 'cintre', label: 'Cintre' },
  { key: 'potence', label: 'Potence' },
  { key: 'plateau', label: 'Plateau' },
  { key: 'manivelle', label: 'Manivelle' },
  { key: 'capteurPuissance', label: 'Capteur de puissance' },
];

export const BIKE_SETUP_COTES_FIELDS: Array<{ key: keyof BikeFitMeasurements; label: string }> = [
  { key: 'hauteurSelle', label: 'Hauteur de Selle' },
  { key: 'reculSelle', label: 'Recul de Selle' },
  { key: 'longueurBecSelleAxeCintre', label: 'Longueur (Bec selle/ Axe cintre)' },
  { key: 'hauteurGuidonAxeRoueCentreCintre', label: 'Hauteur guidon (Axe roue/ centre cintre)' },
];

export const POWER_ZONES_CONFIG: any = {};
export const emptyEventAccommodation = (eventId: string, id: string): EventAccommodation => ({
    id,
    eventId,
    hotelName: '',
    address: '',
    reservationConfirmed: false,
    status: AccommodationStatus.A_RESERVER,
    confirmationDetails: '',
    numberOfNights: 1,
});

export const RIDER_LEVEL_CATEGORIES: string[] = ["Elite", "Pro", "Open 1", "Open 2", "Open 3", "Handisport"];

// Nouvelles constantes pour les catégories d'âge (calculées automatiquement)
export const RIDER_AGE_CATEGORIES: string[] = ["U15", "U17", "U19", "U23", "Senior"];

// Nouvelles constantes pour les catégories de niveau (sélectionnables manuellement)
export const RIDER_PERFORMANCE_LEVELS: string[] = ["Elite", "Pro", "Open 1", "Open 2", "Open 3", "Handisport"];

export const POWER_ANALYSIS_DURATIONS_CONFIG: { key: keyof PowerProfile; label: string; unit: string; sortable: boolean; }[] = [
    { key: 'power1s', label: '1s', unit: 'W', sortable: true },
    { key: 'power5s', label: '5s', unit: 'W', sortable: true },
    { key: 'power30s', label: '30s', unit: 'W', sortable: true },
    { key: 'power1min', label: '1min', unit: 'W', sortable: true },
    { key: 'power3min', label: '3min', unit: 'W', sortable: true },
    { key: 'power5min', label: '5min', unit: 'W', sortable: true },
    { key: 'power12min', label: '12min', unit: 'W', sortable: true },
    { key: 'power20min', label: '20min', unit: 'W', sortable: true },
    { key: 'criticalPower', label: 'CP/FTP', unit: 'W', sortable: true },
];

// --- POWER PROFILE REFERENCE TABLES (W/kg) ---
const powerChartWkg = {
    men: [
        { category: "Classe Mondiale", power1s: 29.5, power5s: 24.5, power30s: 16.8, power1min: 11.8, power3min: 9.0, power5min: 8.1, power12min: 7.4, power20min: 7.2, power45min: 6.8 },
        { category: "Exceptionnel", power1s: 27.8, power5s: 22.5, power30s: 15.1, power1min: 10.6, power3min: 8.2, power5min: 7.4, power12min: 6.7, power20min: 6.5, power45min: 6.2 },
        { category: "Excellent", power1s: 26.1, power5s: 20.5, power30s: 13.4, power1min: 9.5, power3min: 7.4, power5min: 6.7, power12min: 6.0, power20min: 5.8, power45min: 5.5 },
        { category: "Très Bon", power1s: 24.4, power5s: 18.5, power30s: 11.8, power1min: 8.4, power3min: 6.6, power5min: 6.0, power12min: 5.4, power20min: 5.2, power45min: 4.8 },
        { category: "Bon", power1s: 22.7, power5s: 16.5, power30s: 10.1, power1min: 7.3, power3min: 5.8, power5min: 5.4, power12min: 4.7, power20min: 4.5, power45min: 4.1 },
        { category: "Modéré", power1s: 21.1, power5s: 14.4, power30s: 8.4, power1min: 6.2, power3min: 5.0, power5min: 4.7, power12min: 4.0, power20min: 3.8, power45min: 3.5 },
        { category: "Entraîné", power1s: 19.4, power5s: 12.4, power30s: 6.7, power1min: 5.0, power3min: 4.3, power5min: 4.0, power12min: 3.4, power20min: 3.1, power45min: 2.8 },
        { category: "Débutant", power1s: 17.7, power5s: 10.4, power30s: 5.0, power1min: 3.9, power3min: 3.5, power5min: 3.4, power12min: 2.7, power20min: 2.5, power45min: 2.1 },
        { category: "Novice", power1s: 16.0, power5s: 8.4, power30s: 3.4, power1min: 2.8, power3min: 2.7, power5min: 2.7, power12min: 2.0, power20min: 1.8, power45min: 1.5 },
    ],
    women: [
        { category: "Classe Mondiale", power1s: 25.8, power5s: 21.3, power30s: 14.6, power1min: 10.3, power3min: 7.8, power5min: 7.1, power12min: 6.5, power20min: 6.2, power45min: 5.8 },
        { category: "Exceptionnel", power1s: 24.1, power5s: 19.6, power30s: 13.2, power1min: 9.3, power3min: 7.2, power5min: 6.5, power12min: 5.9, power20min: 5.6, power45min: 5.3 },
        { category: "Excellent", power1s: 22.4, power5s: 17.9, power30s: 11.9, power1min: 8.3, power3min: 6.5, power5min: 5.9, power12min: 5.4, power20min: 5.0, power45min: 4.7 },
        { category: "Très Bon", power1s: 20.7, power5s: 16.2, power30s: 10.5, power1min: 7.3, power3min: 5.8, power5min: 5.4, power12min: 4.8, power20min: 4.5, power45min: 4.1 },
        { category: "Bon", power1s: 19.0, power5s: 14.6, power30s: 9.2, power1min: 6.3, power3min: 5.2, power5min: 4.8, power12min: 4.3, power20min: 3.9, power45min: 3.6 },
        { category: "Modéré", power1s: 17.4, power5s: 12.9, power30s: 7.8, power1min: 5.3, power3min: 4.5, power5min: 4.3, power12min: 3.7, power20min: 3.4, power45min: 3.0 },
        { category: "Entraîné", power1s: 15.7, power5s: 11.2, power30s: 6.5, power1min: 4.3, power3min: 3.8, power5min: 3.7, power12min: 3.1, power20min: 2.8, power45min: 2.5 },
        { category: "Débutant", power1s: 14.0, power5s: 9.5, power30s: 5.2, power1min: 3.2, power3min: 3.1, power5min: 3.1, power12min: 2.6, power20min: 2.2, power45min: 1.9 },
        { category: "Novice", power1s: 12.3, power5s: 7.8, power30s: 3.8, power1min: 2.2, power3min: 2.5, power5min: 2.6, power12min: 2.0, power20min: 1.7, power45min: 1.3 },
    ]
};
export const POWER_PROFILE_REFERENCE_TABLES = powerChartWkg;

const createWattsTable = (wkgTable: typeof powerChartWkg.men, weight: number, durationKey: keyof PowerProfile) => 
    wkgTable.map(row => ({
        category: row.category,
        [durationKey]: Math.round((row[durationKey] as number) * weight)
    }));
    
export const POWER_PROFILE_REFERENCE_TABLES_1S_WATTS = {
    men: createWattsTable(powerChartWkg.men, 70, 'power1s'),
    women: createWattsTable(powerChartWkg.women, 58, 'power1s')
};
export const POWER_PROFILE_REFERENCE_TABLES_5S_WATTS = {
    men: createWattsTable(powerChartWkg.men, 70, 'power5s'),
    women: createWattsTable(powerChartWkg.women, 58, 'power5s')
};
export const POWER_PROFILE_REFERENCE_TABLES_1MIN_WATTS = {
    men: createWattsTable(powerChartWkg.men, 70, 'power1min'),
    women: createWattsTable(powerChartWkg.women, 58, 'power1min')
};
export const POWER_PROFILE_REFERENCE_TABLES_5MIN_WATTS = {
    men: createWattsTable(powerChartWkg.men, 70, 'power5min'),
    women: createWattsTable(powerChartWkg.women, 58, 'power5min')
};
export const POWER_PROFILE_REFERENCE_TABLES_WATTS = {
    men: createWattsTable(powerChartWkg.men, 70, 'power20min'),
    women: createWattsTable(powerChartWkg.women, 58, 'power20min')
};

export const riderProfileKeyToRefTableKeyMap: Record<keyof PowerProfile, string> = {
  power1s: 'power1s',
  power5s: 'power5s',
  power30s: 'power30s',
  power1min: 'power1min',
  power3min: 'power3min',
  power5min: 'power5min',
  power12min: 'power12min',
  power20min: 'power20min',
  criticalPower: 'power20min', // Often mapped to 20min power
  power45min: 'power45min',
};

export const PREDEFINED_ALLERGEN_INFO: Record<PredefinedAllergen, {
  displayName: string;
  defaultRegimeDetails: string;
  isCeliac: boolean;
  severity: 'CRITIQUE' | 'ELEVEE' | 'MODEREE';
  commonSources: string[];
  crossContaminationRisks: string[];
  emergencyActions: string;
}> = {
  [PredefinedAllergen.LAIT]: {
    displayName: "Lait & Produits Laitiers",
    defaultRegimeDetails: "Éviter tous les produits laitiers : lait, fromage, yaourt, beurre, crème, glaces. Vérifier les étiquettes pour les traces de lait dans les produits transformés.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Lait de vache", "Fromage", "Yaourt", "Beurre", "Crème", "Glaces", "Chocolat au lait"],
    crossContaminationRisks: ["Charcuterie", "Biscuits", "Pains", "Sauces", "Soupes industrielles"],
    emergencyActions: "En cas d'ingestion accidentelle, surveiller les symptômes digestifs et respiratoires. Consulter un médecin si réaction sévère."
  },
  [PredefinedAllergen.OEUFS]: {
    displayName: "Œufs",
    defaultRegimeDetails: "Éviter les œufs sous toutes leurs formes : entiers, blancs, jaunes, poudre d'œuf. Attention aux produits de boulangerie, pâtes, mayonnaises.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Œufs entiers", "Blancs d'œufs", "Jaunes d'œufs", "Poudre d'œuf", "Mayonnaise", "Pâtes fraîches"],
    crossContaminationRisks: ["Pâtisseries", "Pâtes", "Sauces", "Glaces", "Meringues"],
    emergencyActions: "Surveiller les réactions cutanées et digestives. En cas de réaction sévère, administrer un antihistaminique et consulter un médecin."
  },
  [PredefinedAllergen.ARACHIDE]: {
    displayName: "Arachides",
    defaultRegimeDetails: "Éviter strictement les arachides et tous les produits contenant des traces d'arachides. Vérifier systématiquement les étiquettes.",
    isCeliac: false,
    severity: 'CRITIQUE',
    commonSources: ["Cacahuètes", "Beurre de cacahuète", "Huile d'arachide", "Snacks", "Confiseries"],
    crossContaminationRisks: ["Chocolat", "Glaces", "Biscuits", "Céréales", "Sauces", "Plats préparés"],
    emergencyActions: "RÉACTION CRITIQUE POSSIBLE. En cas d'ingestion, administrer immédiatement l'auto-injecteur d'adrénaline si disponible et appeler les secours (15)."
  },
  [PredefinedAllergen.FRUITS_A_COQUE]: {
    displayName: "Fruits à Coque",
    defaultRegimeDetails: "Éviter tous les fruits à coque : noix, amandes, noisettes, pistaches, noix de cajou, noix du Brésil, noix de macadamia, noix de pécan.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Noix", "Amandes", "Noisettes", "Pistaches", "Noix de cajou", "Noix du Brésil", "Noix de macadamia"],
    crossContaminationRisks: ["Chocolat", "Pâtisseries", "Céréales", "Granola", "Huiles", "Lait végétal"],
    emergencyActions: "Surveiller les réactions allergiques. En cas de réaction sévère, consulter immédiatement un médecin."
  },
  [PredefinedAllergen.SOJA]: {
    displayName: "Soja",
    defaultRegimeDetails: "Éviter le soja et ses dérivés : tofu, tempeh, sauce soja, huile de soja, lécithine de soja. Attention aux produits transformés.",
    isCeliac: false,
    severity: 'MODEREE',
    commonSources: ["Tofu", "Tempeh", "Sauce soja", "Huile de soja", "Lécithine de soja", "Miso", "Edamame"],
    crossContaminationRisks: ["Charcuterie", "Sauces", "Plats préparés", "Biscuits", "Chocolat"],
    emergencyActions: "Surveiller les symptômes digestifs. Consulter un médecin si réaction importante."
  },
  [PredefinedAllergen.BLE_ALLERGIE]: {
    displayName: "Blé (Allergie)",
    defaultRegimeDetails: "Éviter le blé et tous ses dérivés : farine de blé, semoule, boulgour, épeautre, kamut. Attention aux produits de boulangerie et pâtes.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Pain", "Pâtes", "Biscuits", "Gâteaux", "Semoule", "Boulgour", "Épeautre"],
    crossContaminationRisks: ["Sauces", "Soupes", "Charcuterie", "Plats préparés", "Bières"],
    emergencyActions: "Surveiller les réactions allergiques. Différencier de l'intolérance au gluten (maladie cœliaque)."
  },
  [PredefinedAllergen.POISSON]: {
    displayName: "Poisson",
    defaultRegimeDetails: "Éviter tous les poissons : saumon, thon, cabillaud, sole, etc. Attention aux sauces et plats préparés contenant du poisson.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Saumon", "Thon", "Cabillaud", "Sole", "Truite", "Sardines", "Anchois"],
    crossContaminationRisks: ["Sauces", "Plats préparés", "Soupes", "Pizzas", "Sushis"],
    emergencyActions: "Surveiller les réactions allergiques. En cas de réaction sévère, consulter un médecin."
  },
  [PredefinedAllergen.CRUSTACES]: {
    displayName: "Crustacés",
    defaultRegimeDetails: "Éviter tous les crustacés : crevettes, langoustes, crabes, homards, écrevisses. Attention aux sauces et plats préparés.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Crevettes", "Langoustes", "Crabes", "Homards", "Écrevisses", "Langoustines"],
    crossContaminationRisks: ["Sauces", "Plats préparés", "Soupes", "Pizzas", "Sushis"],
    emergencyActions: "Surveiller les réactions allergiques. En cas de réaction sévère, consulter un médecin."
  },
  [PredefinedAllergen.GLUTEN_CELIAC]: {
    displayName: "Gluten (Maladie Cœliaque)",
    defaultRegimeDetails: "RÉGIME SANS GLUTEN STRICT OBLIGATOIRE. Éviter blé, orge, seigle, avoine (sauf certifiée sans gluten). Attention aux traces et contaminations croisées. Vérifier systématiquement les étiquettes et les certifications.",
    isCeliac: true,
    severity: 'CRITIQUE',
    commonSources: ["Blé", "Orge", "Seigle", "Avoine (non certifiée)", "Épeautre", "Kamut", "Triticale"],
    crossContaminationRisks: ["Usines de transformation", "Restaurants", "Épiceries", "Produits transformés", "Médicaments", "Cosmétiques"],
    emergencyActions: "MALADIE CŒLIAQUE - RÉGIME STRICT OBLIGATOIRE. En cas d'ingestion accidentelle, surveiller les symptômes digestifs et consulter un gastro-entérologue. Éviter toute contamination croisée."
  },
  [PredefinedAllergen.SESAME]: {
    displayName: "Sésame",
    defaultRegimeDetails: "Éviter le sésame sous toutes ses formes : graines, huile, tahini, halva. Attention aux produits de boulangerie et cosmétiques.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Graines de sésame", "Huile de sésame", "Tahini", "Halva", "Pain aux graines"],
    crossContaminationRisks: ["Boulangeries", "Restaurants", "Cosmétiques", "Produits transformés"],
    emergencyActions: "Surveiller les réactions allergiques. En cas de réaction sévère, consulter un médecin."
  },
  [PredefinedAllergen.CELERI]: {
    displayName: "Céleri",
    defaultRegimeDetails: "Éviter le céleri sous toutes ses formes : racine, feuilles, graines. Attention aux épices et assaisonnements.",
    isCeliac: false,
    severity: 'MODEREE',
    commonSources: ["Céleri-rave", "Feuilles de céleri", "Graines de céleri", "Sel de céleri"],
    crossContaminationRisks: ["Épices", "Assaisonnements", "Soupes", "Plats préparés"],
    emergencyActions: "Surveiller les symptômes allergiques. Consulter un médecin si réaction importante."
  },
  [PredefinedAllergen.MOUTARDE]: {
    displayName: "Moutarde",
    defaultRegimeDetails: "Éviter la moutarde sous toutes ses formes : graines, poudre, condiments. Attention aux sauces et plats préparés.",
    isCeliac: false,
    severity: 'MODEREE',
    commonSources: ["Moutarde", "Graines de moutarde", "Poudre de moutarde", "Condiments"],
    crossContaminationRisks: ["Sauces", "Plats préparés", "Charcuterie", "Épiceries"],
    emergencyActions: "Surveiller les symptômes allergiques. Consulter un médecin si réaction importante."
  },
  [PredefinedAllergen.LUPIN]: {
    displayName: "Lupin",
    defaultRegimeDetails: "Éviter le lupin et ses dérivés : farine de lupin, graines de lupin. Attention aux produits sans gluten et pâtisseries.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Farine de lupin", "Graines de lupin", "Produits sans gluten"],
    crossContaminationRisks: ["Pâtisseries", "Produits sans gluten", "Snacks"],
    emergencyActions: "Surveiller les réactions allergiques. En cas de réaction sévère, consulter un médecin."
  },
  [PredefinedAllergen.MOLLUSQUES]: {
    displayName: "Mollusques",
    defaultRegimeDetails: "Éviter tous les mollusques : moules, huîtres, coquilles Saint-Jacques, escargots, calamars, poulpes.",
    isCeliac: false,
    severity: 'ELEVEE',
    commonSources: ["Moules", "Huîtres", "Coquilles Saint-Jacques", "Escargots", "Calamars", "Poulpes"],
    crossContaminationRisks: ["Restaurants", "Plats préparés", "Sauces", "Soupes"],
    emergencyActions: "Surveiller les réactions allergiques. En cas de réaction sévère, consulter un médecin."
  },
  [PredefinedAllergen.SULFITES]: {
    displayName: "Sulfites",
    defaultRegimeDetails: "Éviter les sulfites (E220-E228) : vins, fruits secs, charcuterie, produits transformés. Vérifier les étiquettes.",
    isCeliac: false,
    severity: 'MODEREE',
    commonSources: ["Vins", "Fruits secs", "Charcuterie", "Produits transformés", "Conserves"],
    crossContaminationRisks: ["Restaurants", "Produits industriels", "Boissons"],
    emergencyActions: "Surveiller les symptômes respiratoires et digestifs. Consulter un médecin si réaction importante."
  }
};
export const PERFORMANCE_SCORE_WEIGHTS = { COLLECTIVE: 0.25, TECHNICAL: 0.25, PHYSICAL: 0.25, RESULT: 0.25 };
export const COLLECTIVE_SCORE_PENALTY_THRESHOLD = 2;
export const COLLECTIVE_SCORE_PENALTY_MULTIPLIER = 0.8;
export const CATEGORY_ID_TO_SCALE_MAP: Record<string, string> = {
  // Add category mappings here
  'uci.wwt': 'A', 'uci.pro': 'A', 'uci.1': 'B', 'uci.2': 'C', 'cdf.n1': 'C', 'elite.nat': 'D'
};
export const EVENT_CATEGORY_POINTS_TABLE: any = {
  A: { rank1: 100, rank2: 95, rank3: 90, rankTop10: 80, rankTop20: 70, finished: 50, dnf: 20 },
  B: { rank1: 90, rank2: 85, rank3: 80, rankTop10: 70, rankTop20: 60, finished: 40, dnf: 15 },
  C: { rank1: 80, rank2: 75, rank3: 70, rankTop10: 60, rankTop20: 50, finished: 30, dnf: 10 },
  D: { rank1: 70, rank2: 65, rank3: 60, rankTop10: 50, rankTop20: 40, finished: 20, dnf: 5 },
  E: { rank1: 60, rank2: 55, rank3: 50, rankTop10: 40, rankTop20: 30, finished: 15, dnf: 5 },
};
export const PROFILE_WEIGHTS: any = {
    [RiderQualitativeProfile.SPRINTEUR]: { charSprint: 0.4, charAnaerobic: 0.3, charPuncher: 0.15, charClimbing: 0.05, charRouleur: 0.1 },
    [RiderQualitativeProfile.GRIMPEUR]: { charSprint: 0.05, charAnaerobic: 0.1, charPuncher: 0.2, charClimbing: 0.5, charRouleur: 0.15 },
    [RiderQualitativeProfile.ROULEUR]: { charSprint: 0.1, charAnaerobic: 0.15, charPuncher: 0.2, charClimbing: 0.2, charRouleur: 0.35 },
    [RiderQualitativeProfile.PUNCHEUR]: { charSprint: 0.15, charAnaerobic: 0.25, charPuncher: 0.4, charClimbing: 0.15, charRouleur: 0.05 },
    [RiderQualitativeProfile.COMPLET]: { charSprint: 0.2, charAnaerobic: 0.2, charPuncher: 0.2, charClimbing: 0.2, charRouleur: 0.2 },
    [RiderQualitativeProfile.CLASSIQUE]: { charSprint: 0.2, charAnaerobic: 0.2, charPuncher: 0.25, charClimbing: 0.1, charRouleur: 0.25 },
    [RiderQualitativeProfile.BAROUDEUR_PROFIL]: { charSprint: 0.1, charAnaerobic: 0.15, charPuncher: 0.25, charClimbing: 0.2, charRouleur: 0.3 },
    [RiderQualitativeProfile.AUTRE]: { charSprint: 0.2, charAnaerobic: 0.2, charPuncher: 0.2, charClimbing: 0.2, charRouleur: 0.2 },
};

export const STAFF_ROLES_CONFIG = [
  {
    group: "Direction Sportive",
    roles: [
      { key: "directeurSportifId", label: "Directeur(s) Sportif(s)" },
      { key: "assistantId", label: "Assistant(s)" },
    ],
  },
  {
    group: "Performance",
    roles: [
      { key: "entraineurId", label: "Entraîneur(s)" },
      { key: "respPerfId", label: "Resp. Performance" },
      { key: "prepaPhysiqueId", label: "Prép. Physique" },
      { key: "dataAnalystId", label: "Data Analyste" },
    ],
  },
  {
    group: "Technique & Soin",
    roles: [
      { key: "mecanoId", label: "Mécanicien(s)" },
      { key: "kineId", label: "Kinésithérapeute(s)" },
      { key: "medecinId", label: "Médecin" },
    ],
  },
  {
    group: "Support",
    roles: [
        { key: "managerId", label: "Manager" },
        { key: "communicationId", label: "Communication" },
    ]
  }
];

export const ELIGIBLE_CATEGORIES_CONFIG: { group: string; categories: EligibleCategory[] }[] = [
    {
        group: "UCI - Hommes",
        categories: [
            { id: "uci.m.wwt", label: "UCI WorldTour" },
            { id: "uci.pro", label: "UCI ProSeries" },
            { id: "uci.1", label: "UCI Classe 1" },
            { id: "uci.2", label: "UCI Classe 2" },
            { id: "uci.ncup", label: "Coupe des Nations U23" },
        ]
    },
    {
        group: "UCI - Femmes",
        categories: [
            { id: "uci.wwt", label: "UCI Women's WorldTour" },
            { id: "uci.w.pro", label: "UCI Women's ProSeries" },
            { id: "uci.w.1", label: "UCI Women's Classe 1" },
            { id: "uci.w.2", label: "UCI Women's Classe 2" },
            { id: "uci.w.ncup", label: "Coupe des Nations U23 F" },
            { id: "uci.w.ncup.jun", label: "Coupe des Nations Juniors F" },
        ]
    },
    {
        group: "Championnats Internationaux",
        categories: [
            { id: "jo", label: "Jeux Olympiques" },
            { id: "cm", label: "Championnats du Monde" },
            { id: "cc", label: "Championnats Continentaux/Europe" },
        ]
    },
    {
        group: "FFC - National Hommes",
        categories: [
            { id: "cdf.n1", label: "Coupe de France N1" },
            { id: "cdf.n2", label: "Coupe de France N2" },
            { id: "cdf.n3", label: "Coupe de France N3" },
            { id: "elite.nat", label: "Élite Nationale" },
            { id: "cf.elite", label: "Championnat de France Élite" },
            { id: "cf.amateur", label: "Championnat de France Amateur" },
        ]
    },
     {
        group: "FFC - National Femmes",
        categories: [
            { id: "cdf.w", label: "Coupe de France Femmes N1" },
            { id: "cf.elite.w", label: "Championnat de France Élite Femmes" },
        ]
    },
     {
        group: "FFC - Fédéral Jeunes",
        categories: [
            { id: "fed.u19", label: "Fédérale U19 (Juniors)" },
            { id: "cf.u19", label: "Championnat de France U19" },
            { id: "fed.u17", label: "Fédérale U17 (Cadets)" },
            { id: "cf.u17", label: "Championnat de France U17" },
        ]
    },
    {
        group: "FFC - Régional & Départemental",
        categories: [
            { id: "open.1", label: "Open 1" },
            { id: "open.2", label: "Open 2" },
            { id: "open.3", label: "Open 3" },
            { id: "access.1", label: "Access 1" },
            { id: "access.2", label: "Access 2" },
            { id: "access.3", label: "Access 3" },
            { id: "access.4", label: "Access 4" },
            { id: "cyclo", label: "Cyclosportive" },
        ]
    },
    {
        group: "Autres Disciplines",
        categories: [
            { id: "piste.cl1", label: "Piste CL1" },
            { id: "piste.cl2", label: "Piste CL2" },
            { id: "piste.cf", label: "Piste - Ch. de France" },
            { id: "cx.cpe.monde", label: "Cyclo-cross - Coupe du Monde" },
            { id: "cx.cf", label: "Cyclo-cross - Ch. de France" },
            { id: "vtt.cpe.monde", label: "VTT - Coupe du Monde" },
        ]
    }
];
/**
 * Enrichissements Horizon Atlantique — logistique, scouting, matériel, finances.
 */
import {
  AccommodationStatus,
  BudgetItemCategory,
  ChecklistItemStatus,
  ChecklistRole,
  DisciplinePracticed,
  EquipmentItem,
  EquipmentStatus,
  EquipmentType,
  EventAccommodation,
  EventChecklistItem,
  EventTransportLeg,
  ExpenseReceipt,
  ExpenseReceiptStatus,
  PartnerNewsletter,
  PeerRating,
  ProspectLevel,
  RiderQualitativeProfile,
  RiderSelfDebrief,
  ScoutingProfile,
  ScoutingStatus,
  Sex,
  StaffAvailability,
  StaffEventPreference,
  StaffEventSelection,
  StaffEventStatus,
  StockCategory,
  StockItem,
  TransportDirection,
  TransportMode,
  Warehouse,
} from '../types';

export const DEMO_PRES_X_PREFIX = 'demo_pres_';

export type DemoPresentationExtrasContext = {
  season: number;
  teamId?: string;
  eventClassicId: string;
  eventStageId: string;
  eventTrainId: string;
  eventClmId: string;
  eventEarlyId: string;
  eventMeetingId: string;
  startSix: string[];
  principalIds: string[];
  riderIds: string[];
  staffIds: {
    manager: string;
    ds: string;
    assistant: string;
    mecano: string;
    kine: string;
    perf: string;
    coach: string;
    com: string;
  };
  vehicleIds: { ds: string; bus: string; truck: string };
};

export interface DemoPresentationExtras {
  eventTransportLegs: EventTransportLeg[];
  eventAccommodations: EventAccommodation[];
  eventChecklistItems: EventChecklistItem[];
  staffEventSelections: StaffEventSelection[];
  scoutingProfiles: ScoutingProfile[];
  equipment: EquipmentItem[];
  expenseReceipts: ExpenseReceipt[];
  warehouses: Warehouse[];
  stockItems: StockItem[];
  peerRatings: PeerRating[];
  riderSelfDebriefs: RiderSelfDebrief[];
  partnerNewsletters: PartnerNewsletter[];
  categoryBudgets: Partial<Record<BudgetItemCategory, number>>;
}

function buildScoutingProfiles(season: number): ScoutingProfile[] {
  const P = DEMO_PRES_X_PREFIX;
  const seeds = [
    {
      id: `${P}scout_01`, firstName: 'Chloé', lastName: 'Maréchal', birthDate: '2004-02-18',
      nationality: 'France', heightCm: 166, weightKg: 52, profile: RiderQualitativeProfile.GRIMPEUR,
      status: ScoutingStatus.IN_DISCUSSION, potential: 5, currentTeam: 'VC Nantes Atlantique U23',
      notes: 'Très bonne grimpeuse · stage test prévu pour 2027.',
      power: { criticalPower: 228, power5s: 790, power5min: 275 },
      chars: { sprint: 48, ana: 62, punch: 70, climb: 91, roul: 64 },
    },
    {
      id: `${P}scout_02`, firstName: 'Jade', lastName: 'Lefèvre', birthDate: '2003-11-05',
      nationality: 'France', heightCm: 170, weightKg: 60, profile: RiderQualitativeProfile.SPRINTEUR,
      status: ScoutingStatus.CONTACTED, potential: 4, currentTeam: 'Team Pays de la Loire Espoirs',
      notes: 'Pointe de vitesse solide · lead-out à former.',
      power: { criticalPower: 218, power5s: 1080, power5min: 255 },
      chars: { sprint: 90, ana: 78, punch: 66, climb: 52, roul: 58 },
    },
    {
      id: `${P}scout_03`, firstName: 'Nora', lastName: 'Van Dijk', birthDate: '2002-06-29',
      nationality: 'Belgique', heightCm: 168, weightKg: 55, profile: RiderQualitativeProfile.PUNCHEUR,
      status: ScoutingStatus.TO_WATCH, potential: 4, currentTeam: 'Lotto Dstny Ladies Dev.',
      notes: 'Profil puncheur idéal Classic Atlantique.',
      power: { criticalPower: 232, power5s: 880, power5min: 290 },
      chars: { sprint: 68, ana: 84, punch: 92, climb: 74, roul: 70 },
    },
    {
      id: `${P}scout_04`, firstName: 'Sarah', lastName: 'Oliveira', birthDate: '2005-01-12',
      nationality: 'Portugal', heightCm: 164, weightKg: 51, profile: RiderQualitativeProfile.ROULEUR,
      status: ScoutingStatus.TO_WATCH, potential: 3, currentTeam: 'Club Lisbonne',
      notes: 'Jeune rouleuse · données PPR partielles.',
      power: { criticalPower: 210, power5s: 720, power5min: 250 },
      chars: { sprint: 50, ana: 58, punch: 60, climb: 68, roul: 86 },
    },
    {
      id: `${P}scout_05`, firstName: 'Emma', lastName: 'Roussel', birthDate: '2001-09-08',
      nationality: 'France', heightCm: 172, weightKg: 58, profile: RiderQualitativeProfile.COMPLET,
      status: ScoutingStatus.DATA_SHARED, potential: 5, currentTeam: 'Arkéa Women Conti. (fin contrat)',
      notes: 'Libre fin de saison · priorité recrutement.',
      power: { criticalPower: 240, power5s: 920, power5min: 300 },
      chars: { sprint: 72, ana: 76, punch: 80, climb: 78, roul: 82 },
    },
    {
      id: `${P}scout_06`, firstName: 'Lisa', lastName: 'Hoffmann', birthDate: '2003-04-21',
      nationality: 'Allemagne', heightCm: 169, weightKg: 57, profile: RiderQualitativeProfile.BAROUDEUR_PROFIL,
      status: ScoutingStatus.CONTACTED, potential: 3, currentTeam: 'Canyon Generation',
      notes: 'Baroudeuse combative · bonne tête de course.',
      power: { criticalPower: 225, power5s: 850, power5min: 270 },
      chars: { sprint: 60, ana: 72, punch: 78, climb: 70, roul: 74 },
    },
  ] as const;

  return seeds.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    birthDate: s.birthDate,
    sex: Sex.FEMALE,
    nationality: s.nationality,
    heightCm: s.heightCm,
    weightKg: s.weightKg,
    email: `${s.firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${s.lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '')}@prospect.demo`,
    phone: '06 98 76 54 32',
    currentTeam: s.currentTeam,
    status: s.status,
    potentialRating: s.potential,
    discipline: DisciplinePracticed.ROUTE,
    categories: ['Elite', 'U23'],
    qualitativeProfile: s.profile,
    qualitativeNotes: s.notes,
    prospectLevel:
      s.status === ScoutingStatus.IN_DISCUSSION || s.status === ScoutingStatus.DATA_SHARED
        ? ProspectLevel.CONTACT_REQUEST
        : ProspectLevel.WATCHLIST,
    powerProfileFresh: {
      power5s: s.power.power5s,
      power1min: Math.round(s.power.criticalPower * 1.55),
      power5min: s.power.power5min,
      criticalPower: s.power.criticalPower,
      power20min: Math.round(s.power.criticalPower * 0.97),
    },
    powerProfile15KJ: {
      power5s: Math.round(s.power.power5s * 0.92),
      power5min: Math.round(s.power.power5min * 0.93),
      criticalPower: Math.round(s.power.criticalPower * 0.94),
    },
    allergies: [],
    charSprint: s.chars.sprint,
    charAnaerobic: s.chars.ana,
    charPuncher: s.chars.punch,
    charClimbing: s.chars.climb,
    charRouleur: s.chars.roul,
    generalPerformanceScore: 55 + s.potential * 8,
    fatigueResistanceScore: 60 + Math.round(s.chars.roul / 5),
    performanceGoals: `Intégrer un effectif N1 en ${season + 1}`,
    shortTermGoals: 'Confirmer en Elite / Coupe de France',
    mediumTermGoals: 'Contrat continental',
    longTermGoals: 'Calendrier UCI Women',
    resultsHistory: [
      {
        id: `${s.id}_res1`,
        date: `${season - 1}-06-15`,
        eventName: 'Championnat régional Elite',
        category: 'Elite',
        rank: String(2 + (s.potential % 3)),
      },
    ],
  }));
}

export function buildDemoPresentationExtras(ctx: DemoPresentationExtrasContext): DemoPresentationExtras {
  const P = DEMO_PRES_X_PREFIX;
  const { season, staffIds, vehicleIds, startSix, riderIds } = ctx;
  const now = `${season}-04-15T10:00:00.000Z`;
  const staffOnClassic = [staffIds.ds, staffIds.assistant, staffIds.mecano, staffIds.kine, staffIds.com];

  const staffEventSelections: StaffEventSelection[] = [
    ...staffOnClassic.map((staffId, i) => ({
      id: `${P}ssel_classic_${i}`,
      eventId: ctx.eventClassicId,
      staffId,
      status: StaffEventStatus.SELECTIONNE,
      staffPreference: StaffEventPreference.VEUT_PARTICIPER,
      staffAvailability: StaffAvailability.DISPONIBLE,
      staffObjectives: 'Dispositif course Classic Atlantique',
      notes: '',
      validatedAt: `${season}-04-01`,
      validatedByName: 'Claire Armand',
    })),
    ...[staffIds.ds, staffIds.assistant, staffIds.mecano, staffIds.kine, staffIds.perf, staffIds.com, staffIds.manager].map(
      (staffId, i) => ({
        id: `${P}ssel_stage_${i}`,
        eventId: ctx.eventStageId,
        staffId,
        status: StaffEventStatus.SELECTIONNE,
        staffPreference: StaffEventPreference.VEUT_PARTICIPER,
        staffAvailability: StaffAvailability.DISPONIBLE,
        staffObjectives: 'Tour de Bretagne — 3 étapes',
        notes: '',
        validatedAt: `${season}-05-10`,
        validatedByName: 'Claire Armand',
      })
    ),
    ...[staffIds.ds, staffIds.assistant, staffIds.mecano, staffIds.kine, staffIds.perf, staffIds.coach].map(
      (staffId, i) => ({
        id: `${P}ssel_train_${i}`,
        eventId: ctx.eventTrainId,
        staffId,
        status: StaffEventStatus.SELECTIONNE,
        staffPreference: StaffEventPreference.VEUT_PARTICIPER,
        staffAvailability: StaffAvailability.DISPONIBLE,
        staffObjectives: 'Stage altitude Font-Romeu',
        notes: '',
      })
    ),
  ];

  const eventTransportLegs: EventTransportLeg[] = [
    {
      id: `${P}tr_classic_aller`,
      eventId: ctx.eventClassicId,
      direction: TransportDirection.ALLER,
      mode: TransportMode.MINIBUS,
      logisticsPhase: 'aller_course',
      departureDate: `${season}-04-11`,
      departureTime: '14:00',
      arrivalDate: `${season}-04-11`,
      arrivalTime: '16:30',
      departureLocation: 'Siège Nantes — Quai de la Fosse',
      arrivalLocation: 'Hôtel Oceania La Baule',
      details: 'Convoyage équipe + bagages',
      occupants: [
        ...startSix.map((id) => ({ id, type: 'rider' as const })),
        ...staffOnClassic.map((id) => ({ id, type: 'staff' as const })),
      ],
      assignedVehicleId: vehicleIds.bus,
      driverId: staffIds.assistant,
    },
    {
      id: `${P}tr_classic_jj`,
      eventId: ctx.eventClassicId,
      direction: TransportDirection.JOUR_J,
      mode: TransportMode.VOITURE_EQUIPE,
      logisticsPhase: 'pendant',
      stageDate: `${season}-04-12`,
      departureDate: `${season}-04-12`,
      departureTime: '08:20',
      arrivalDate: `${season}-04-12`,
      arrivalTime: '08:50',
      departureLocation: 'Hôtel Oceania',
      arrivalLocation: 'Parking départ La Baule',
      details: 'Transfert hôtel → départ',
      occupants: startSix.map((id) => ({ id, type: 'rider' as const })),
      assignedVehicleId: vehicleIds.ds,
      driverId: staffIds.ds,
    },
    {
      id: `${P}tr_classic_retour`,
      eventId: ctx.eventClassicId,
      direction: TransportDirection.RETOUR,
      mode: TransportMode.MINIBUS,
      logisticsPhase: 'retour',
      departureDate: `${season}-04-12`,
      departureTime: '18:30',
      arrivalDate: `${season}-04-12`,
      arrivalTime: '21:00',
      departureLocation: 'La Baule',
      arrivalLocation: 'Nantes HQ',
      details: 'Retour post-course + matériel',
      occupants: [
        ...startSix.map((id) => ({ id, type: 'rider' as const })),
        ...staffOnClassic.map((id) => ({ id, type: 'staff' as const })),
      ],
      assignedVehicleId: vehicleIds.bus,
      driverId: staffIds.assistant,
    },
    {
      id: `${P}tr_bzh_aller`,
      eventId: ctx.eventStageId,
      direction: TransportDirection.ALLER,
      mode: TransportMode.MINIBUS,
      logisticsPhase: 'aller_course',
      departureDate: `${season}-05-19`,
      departureTime: '09:00',
      arrivalDate: `${season}-05-19`,
      arrivalTime: '12:30',
      departureLocation: 'Nantes HQ',
      arrivalLocation: 'Saint-Brieuc — Vélodrome',
      details: 'Aller permanence + hôtel',
      occupants: ctx.principalIds.slice(0, 7).map((id) => ({ id, type: 'rider' as const })),
      assignedVehicleId: vehicleIds.bus,
      driverId: staffIds.assistant,
    },
    {
      id: `${P}tr_font_aller`,
      eventId: ctx.eventTrainId,
      direction: TransportDirection.ALLER,
      mode: TransportMode.VOITURE_EQUIPE,
      logisticsPhase: 'aller_course',
      departureDate: `${season}-07-04`,
      departureTime: '07:00',
      arrivalDate: `${season}-07-04`,
      arrivalTime: '16:30',
      departureLocation: 'Nantes',
      arrivalLocation: 'Font-Romeu — résidence altitude',
      details: 'Convoyage stage altitude',
      occupants: riderIds.slice(0, 8).map((id) => ({ id, type: 'rider' as const })),
      assignedVehicleId: vehicleIds.bus,
      driverId: staffIds.coach,
    },
  ];

  const eventAccommodations: EventAccommodation[] = [
    {
      id: `${P}acc_classic`,
      eventId: ctx.eventClassicId,
      hotelName: 'Hôtel Oceania La Baule',
      address: '1 Av. de la République, 44500 La Baule',
      checkInDate: `${season}-04-11`,
      checkOutDate: `${season}-04-12`,
      roomType: 'Chambres doubles + 2 singles staff',
      reservationConfirmed: true,
      status: AccommodationStatus.CONFIRME,
      confirmationDetails: 'Résa #HA-LB-4412 · petit-déj inclus · parking bus OK',
      numberOfNights: 1,
      numberOfPeople: 12,
      estimatedCost: 2760,
      distanceFromStartKm: 4.2,
      travelTimeToStart: '12 min',
      reviewOutcome: 'good',
      reviewNote: 'Calme, petit-déj adapté course, parking camion OK.',
      latitude: 47.286,
      longitude: -2.393,
      proofDocumentName: 'Confirmation Oceania La Baule',
      proofDocumentUrl: 'https://example.com/horizon-atlantique/confirmation-oceania.pdf',
      expenseReceiptIds: [`${P}exp_1`],
    },
    {
      id: `${P}acc_bzh`,
      eventId: ctx.eventStageId,
      hotelName: 'Ibis Styles Saint-Brieuc',
      address: 'Centre-ville Saint-Brieuc',
      checkInDate: `${season}-05-19`,
      checkOutDate: `${season}-05-22`,
      roomType: 'Doubles + twin staff',
      reservationConfirmed: true,
      status: AccommodationStatus.PAYE,
      confirmationDetails: 'Bloc 14 chambres · petit-déj 06:30',
      numberOfNights: 3,
      numberOfPeople: 14,
      estimatedCost: 4100,
      distanceFromStartKm: 3.5,
      travelTimeToStart: '10 min',
      reviewOutcome: 'neutral',
      reviewNote: 'Correct · bruit rue le soir J1.',
      proofDocumentName: 'Facture Ibis Styles Saint-Brieuc',
      proofDocumentUrl: 'https://example.com/horizon-atlantique/facture-ibis-bzh.pdf',
      expenseReceiptIds: [`${P}exp_hotel_bzh`],
    },
    {
      id: `${P}acc_font`,
      eventId: ctx.eventTrainId,
      hotelName: 'Résidence Altitude Font-Romeu',
      address: 'Avenue Emmanuel Brousse, Font-Romeu',
      checkInDate: `${season}-07-04`,
      checkOutDate: `${season}-07-18`,
      roomType: 'Appartements 4/6 · cuisine équipée',
      reservationConfirmed: true,
      status: AccommodationStatus.RESERVE,
      confirmationDetails: 'Résa stage altitude · salle soin + laundry',
      numberOfNights: 14,
      numberOfPeople: 16,
      estimatedCost: 9800,
      distanceFromStartKm: 0,
      travelTimeToStart: 'sur site',
    },
  ];

  const eventChecklistItems: EventChecklistItem[] = [
    { id: `${P}chk_c1`, eventId: ctx.eventClassicId, itemName: 'Licences + licences course validées', assignedRole: ChecklistRole.MANAGER, responsiblePerson: 'Claire Armand', status: ChecklistItemStatus.FAIT, timing: 'avant', timingLabel: 'Avant départ' },
    { id: `${P}chk_c2`, eventId: ctx.eventClassicId, itemName: 'Radio DS testée + fréquences', assignedRole: ChecklistRole.DS, responsiblePerson: 'Marc Delorme', status: ChecklistItemStatus.FAIT, timing: 'avant' },
    { id: `${P}chk_c3`, eventId: ctx.eventClassicId, itemName: 'Parc vélos + roues de secours chargés', assignedRole: ChecklistRole.MECANO, responsiblePerson: 'Julien Faure', status: ChecklistItemStatus.FAIT, timing: 'avant' },
    { id: `${P}chk_c4`, eventId: ctx.eventClassicId, itemName: 'Nutrition course préparée', assignedRole: ChecklistRole.ASSISTANT, responsiblePerson: 'Sophie Nguyen', status: ChecklistItemStatus.FAIT, timing: 'avant' },
    { id: `${P}chk_c5`, eventId: ctx.eventClassicId, itemName: 'Posts réseaux J-1 + live course', assignedRole: ChecklistRole.COMMUNICATION, responsiblePerson: 'Hugo Blanc', status: ChecklistItemStatus.FAIT, timing: 'pendant' },
    { id: `${P}chk_c6`, eventId: ctx.eventClassicId, itemName: 'Kit soin / recovery post-course', assignedRole: ChecklistRole.KINE, responsiblePerson: 'Élise Morel', status: ChecklistItemStatus.FAIT, timing: 'apres' },
    { id: `${P}chk_b1`, eventId: ctx.eventStageId, itemName: 'Roadbook 3 étapes + GPS flotte', assignedRole: ChecklistRole.DS, status: ChecklistItemStatus.FAIT, timing: 'avant' },
    { id: `${P}chk_b2`, eventId: ctx.eventStageId, itemName: 'Hôtel confirmé + planning repas', assignedRole: ChecklistRole.ASSISTANT, status: ChecklistItemStatus.FAIT, timing: 'avant' },
    { id: `${P}chk_f1`, eventId: ctx.eventTrainId, itemName: 'Protocole altitude / SpO₂ briefé', assignedRole: ChecklistRole.ENTRAINEUR, status: ChecklistItemStatus.EN_COURS, timing: 'avant' },
    { id: `${P}chk_f2`, eventId: ctx.eventTrainId, itemName: 'Matériel tests PPR + lactate', assignedRole: ChecklistRole.ENTRAINEUR, responsiblePerson: 'Thomas Girard', status: ChecklistItemStatus.A_FAIRE, timing: 'avant' },
  ];

  const equipment: EquipmentItem[] = riderIds.slice(0, 8).flatMap((riderId, i) => {
    const n = String(i + 1).padStart(2, '0');
    return [
      {
        id: `${P}eq_road_${n}`,
        name: `Vélo route #${n}`,
        type: EquipmentType.VELO_ROUTE,
        status: EquipmentStatus.ASSIGNE,
        assignedToRiderId: riderId,
        brand: 'Canyon',
        model: i % 2 === 0 ? 'Ultimate CF SLX' : 'Aeroad CFR',
        serialNumber: `HA-RD-${season}-${n}`,
        purchaseDate: `${season - 1}-11-15`,
        purchasePrice: 6200,
        lastMaintenanceDate: `${season}-03-20`,
        size: i < 4 ? 'S' : 'M',
        notes: 'Groupe SRAM Force AXS · Assioma Duo',
      },
      {
        id: `${P}eq_gps_${n}`,
        name: `Compteur GPS #${n}`,
        type: EquipmentType.COMPTEUR_GPS,
        status: EquipmentStatus.ASSIGNE,
        assignedToRiderId: riderId,
        brand: 'Garmin',
        model: 'Edge 1040',
        serialNumber: `HA-GPS-${n}`,
        purchaseDate: `${season}-01-10`,
        purchasePrice: 590,
      },
    ];
  });
  equipment.push(
    { id: `${P}eq_clm_01`, name: 'Vélo CLM #01', type: EquipmentType.VELO_CLM, status: EquipmentStatus.DISPONIBLE, brand: 'Canyon', model: 'Speedmax CFR', serialNumber: `HA-TT-${season}-01`, purchaseDate: `${season}-02-01`, purchasePrice: 8900, notes: 'Pool CLM' },
    { id: `${P}eq_wheels_01`, name: 'Paire roues carbone 50 mm', type: EquipmentType.PAIRE_ROUES, status: EquipmentStatus.DISPONIBLE, brand: 'Zipp', model: '404 Firecrest', purchasePrice: 2400 },
    { id: `${P}eq_ht_01`, name: 'Home trainer smart #1', type: EquipmentType.HOME_TRAINER, status: EquipmentStatus.DISPONIBLE, brand: 'Wahoo', model: 'Kickr Core', purchasePrice: 700 }
  );

  const expenseReceipts: ExpenseReceipt[] = [
    {
      id: `${P}exp_1`,
      eventId: ctx.eventClassicId,
      accommodationId: `${P}acc_classic`,
      submittedByUserId: staffIds.assistant,
      submittedByName: 'Sophie Nguyen',
      staffRole: 'Assistant',
      imageUrl: '',
      status: ExpenseReceiptStatus.VALIDATED,
      budgetCategory: BudgetItemCategory.HEBERGEMENT,
      accountingCode: '6256',
      accountingLabel: 'Hébergement mission',
      amount: 2760,
      receiptDate: `${season}-04-11`,
      merchant: 'Hôtel Oceania La Baule',
      description: 'Facture hôtel Classic Atlantique',
      createdAt: now,
      validatedAt: `${season}-04-14T09:00:00.000Z`,
      validatedByUserId: staffIds.manager,
    },
    {
      id: `${P}exp_2`,
      eventId: ctx.eventClassicId,
      submittedByUserId: staffIds.ds,
      submittedByName: 'Marc Delorme',
      staffRole: 'DS',
      imageUrl: '',
      status: ExpenseReceiptStatus.VALIDATED,
      budgetCategory: BudgetItemCategory.TRANSPORT,
      accountingCode: '6251',
      accountingLabel: 'Carburant',
      amount: 98.2,
      receiptDate: `${season}-04-12`,
      merchant: 'TotalEnergies',
      description: 'Plein voiture DS',
      createdAt: now,
      validatedAt: `${season}-04-14T09:05:00.000Z`,
      validatedByUserId: staffIds.manager,
    },
    {
      id: `${P}exp_3`,
      eventId: ctx.eventStageId,
      submittedByUserId: staffIds.mecano,
      submittedByName: 'Julien Faure',
      staffRole: 'Mécano',
      imageUrl: '',
      status: ExpenseReceiptStatus.SUBMITTED,
      budgetCategory: BudgetItemCategory.MATERIEL,
      accountingCode: '6063',
      accountingLabel: 'Fournitures atelier',
      amount: 142,
      receiptDate: `${season}-05-20`,
      merchant: 'Probikeshop',
      description: 'Chaînes + plaquettes',
      createdAt: `${season}-05-20T20:00:00.000Z`,
    },
    {
      id: `${P}exp_4`,
      eventId: ctx.eventStageId,
      submittedByUserId: staffIds.kine,
      submittedByName: 'Élise Morel',
      staffRole: 'Kiné',
      imageUrl: '',
      status: ExpenseReceiptStatus.VALIDATED,
      budgetCategory: BudgetItemCategory.POLE_PERFORMANCE,
      accountingCode: '6068',
      accountingLabel: 'Consommables soin',
      amount: 67.5,
      receiptDate: `${season}-05-21`,
      merchant: 'Pharmacie Saint-Brieuc',
      description: 'Bandes + glace',
      createdAt: `${season}-05-21T18:00:00.000Z`,
      validatedAt: `${season}-05-25T10:00:00.000Z`,
      validatedByUserId: staffIds.manager,
    },
    {
      id: `${P}exp_5`,
      submittedByUserId: staffIds.com,
      submittedByName: 'Hugo Blanc',
      staffRole: 'Communication',
      imageUrl: '',
      status: ExpenseReceiptStatus.SUBMITTED,
      budgetCategory: BudgetItemCategory.FRAIS_DIVERS,
      accountingCode: '623',
      accountingLabel: 'Communication',
      amount: 49.9,
      receiptDate: `${season}-03-28`,
      merchant: 'Canva Pro',
      description: 'Abonnement design',
      createdAt: `${season}-03-28T12:00:00.000Z`,
    },
    {
      id: `${P}exp_6`,
      eventId: ctx.eventTrainId,
      submittedByUserId: staffIds.coach,
      submittedByName: 'Anna Keller',
      staffRole: 'Entraîneur',
      imageUrl: '',
      status: ExpenseReceiptStatus.DRAFT,
      budgetCategory: BudgetItemCategory.REPAS,
      accountingCode: '6256',
      accountingLabel: 'Repas mission',
      amount: 0,
      receiptDate: `${season}-07-05`,
      merchant: '',
      description: 'Courses alimentaires J1 (à compléter)',
      createdAt: `${season}-07-05T21:00:00.000Z`,
    },
    {
      id: `${P}exp_hotel_bzh`,
      eventId: ctx.eventStageId,
      accommodationId: `${P}acc_bzh`,
      submittedByUserId: staffIds.assistant,
      submittedByName: 'Sophie Nguyen',
      staffRole: 'Assistant',
      imageUrl: '',
      status: ExpenseReceiptStatus.VALIDATED,
      budgetCategory: BudgetItemCategory.HEBERGEMENT,
      accountingCode: '6256',
      accountingLabel: 'Hébergement mission',
      amount: 4100,
      receiptDate: `${season}-05-22`,
      merchant: 'Ibis Styles Saint-Brieuc',
      description: 'Facture 3 nuits Bretagne',
      createdAt: `${season}-05-22T19:00:00.000Z`,
      validatedAt: `${season}-05-25T10:00:00.000Z`,
      validatedByUserId: staffIds.manager,
    },
  ];

  const warehouses: Warehouse[] = [
    { id: `${P}wh_base`, name: 'Entrepôt Nantes HQ', type: 'base', address: '12 Quai de la Fosse, 44000 Nantes', isDefault: true, notes: 'Stock principal' },
    { id: `${P}wh_truck`, name: 'Camion atelier', type: 'camion', vehicleId: vehicleIds.truck, notes: 'Stock mobile course' },
  ];

  const stockItems: StockItem[] = [
    { id: `${P}stk_gels`, name: 'Gels énergétiques (boîte 24)', quantity: 18, unit: 'boîte', lowStockThreshold: 6, category: StockCategory.NUTRITION_SOLIDE, barcode: '3760123456001', quantities: { [warehouses[0].id]: 12, [warehouses[1].id]: 6 } },
    { id: `${P}stk_bidons`, name: 'Bidons 750 ml équipe', quantity: 48, unit: 'pièce', lowStockThreshold: 20, category: StockCategory.BOISSONS, quantities: { [warehouses[0].id]: 30, [warehouses[1].id]: 18 } },
    { id: `${P}stk_bars`, name: 'Barres énergétiques', quantity: 120, unit: 'pièce', lowStockThreshold: 40, category: StockCategory.NUTRITION_SOLIDE, quantities: { [warehouses[0].id]: 80, [warehouses[1].id]: 40 } },
    { id: `${P}stk_soin`, name: 'Kit premiers soins course', quantity: 4, unit: 'kit', lowStockThreshold: 2, category: StockCategory.PREMIERS_SOINS, quantities: { [warehouses[0].id]: 2, [warehouses[1].id]: 2 } },
    { id: `${P}stk_recup`, name: 'Boissons récupération', quantity: 36, unit: 'dose', lowStockThreshold: 12, category: StockCategory.RECUPERATION, quantities: { [warehouses[0].id]: 24, [warehouses[1].id]: 12 } },
  ];

  const peerRatings: PeerRating[] = [
    { id: `${P}peer_1`, eventId: ctx.eventClassicId, raterRiderId: startSix[0], ratedRiderId: startSix[1], rating: 9, technicalScore: 8, physicalScore: 9 },
    { id: `${P}peer_2`, eventId: ctx.eventClassicId, raterRiderId: startSix[1], ratedRiderId: startSix[0], rating: 8, technicalScore: 9, physicalScore: 8 },
    { id: `${P}peer_3`, eventId: ctx.eventClassicId, raterRiderId: startSix[2], ratedRiderId: startSix[1], rating: 9, technicalScore: 8, physicalScore: 9 },
  ];

  const riderSelfDebriefs: RiderSelfDebrief[] = [
    { id: `${P}debrief_1`, eventId: ctx.eventClassicId, riderId: startSix[0], userId: startSix[0], personalRanking: '7e', selfSummary: 'Bonne journée · positionnée sur la côte finale.', selfHighlights: 'Travail d’équipe · sensations en montée.', selfImprovements: 'Manger un peu plus tôt avant le final.', selfPhysicalFeel: 8, selfTechnicalFeel: 7, submittedAt: `${season}-04-12T20:00:00.000Z` },
    { id: `${P}debrief_2`, eventId: ctx.eventClassicId, riderId: startSix[1], userId: startSix[1], personalRanking: '2e', selfSummary: 'Sprint très bon · lead-out un peu tôt.', selfHighlights: 'Pointe de vitesse OK.', selfImprovements: 'Attendre 50 m de plus avant le lancement.', selfPhysicalFeel: 9, selfTechnicalFeel: 8, submittedAt: `${season}-04-12T20:15:00.000Z` },
  ];

  const partnerNewsletters: PartnerNewsletter[] = [
    {
      id: `${P}nl_ae_1`,
      teamId: ctx.teamId || 'pending_team',
      incomeItemId: `${P}inc_sponsor`,
      title: `Horizon Atlantique × Atlantique Énergies — Bilan Classic ${season}`,
      subject: `Bilan Classic Atlantique ${season} — 2e place au sprint`,
      previewText: 'Présence collective forte · contreparties livrées',
      status: 'published',
      createdAt: `${season}-04-14T11:00:00.000Z`,
      publishedAt: `${season}-04-14T11:00:00.000Z`,
      blocks: [
        { id: `${P}nl_b1`, type: 'heading', content: 'Résultat de la course' },
        { id: `${P}nl_b2`, type: 'paragraph', content: 'Bernard 2e · Moreau 7e · 6 coureuses à l’arrivée. Belle journée collective pour Horizon Atlantique.' },
        { id: `${P}nl_b3`, type: 'heading', content: 'Contreparties livrées' },
        { id: `${P}nl_b4`, type: 'paragraph', content: 'Logo maillot visible · 3 posts Instagram · hospitality pour 4 invités partenaires.' },
      ],
    },
  ];

  const categoryBudgets: Partial<Record<BudgetItemCategory, number>> = {
    [BudgetItemCategory.TRANSPORT]: 28000,
    [BudgetItemCategory.HEBERGEMENT]: 45000,
    [BudgetItemCategory.REPAS]: 22000,
    [BudgetItemCategory.VOITURE_EQUIPE]: 18000,
    [BudgetItemCategory.FRAIS_COURSE]: 12000,
    [BudgetItemCategory.MATERIEL]: 35000,
    [BudgetItemCategory.POLE_PERFORMANCE]: 15000,
    [BudgetItemCategory.SALAIRES]: 420000,
    [BudgetItemCategory.FRAIS_DIVERS]: 8000,
  };

  return {
    eventTransportLegs,
    eventAccommodations,
    eventChecklistItems,
    staffEventSelections,
    scoutingProfiles: buildScoutingProfiles(season),
    equipment,
    expenseReceipts,
    warehouses,
    stockItems,
    peerRatings,
    riderSelfDebriefs,
    partnerNewsletters,
    categoryBudgets,
  };
}

export function countDemoPresentationExtras(extras: DemoPresentationExtras): number {
  return (
    extras.eventTransportLegs.length +
    extras.eventAccommodations.length +
    extras.eventChecklistItems.length +
    extras.staffEventSelections.length +
    extras.scoutingProfiles.length +
    extras.equipment.length +
    extras.expenseReceipts.length +
    extras.warehouses.length +
    extras.stockItems.length +
    extras.peerRatings.length +
    extras.riderSelfDebriefs.length +
    extras.partnerNewsletters.length +
    Object.keys(extras.categoryBudgets).length
  );
}

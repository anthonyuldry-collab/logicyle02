import React, { useMemo, useState } from "react";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import ChevronDownIcon from "../../components/icons/ChevronDownIcon";
import PencilIcon from "../../components/icons/PencilIcon";
import PlusCircleIcon from "../../components/icons/PlusCircleIcon";
import TrashIcon from "../../components/icons/TrashIcon";

import { saveData, deleteData } from "../../services/firebaseService";
import {
  AppState,
  BudgetItemCategory,
  EventBudgetItem,
  EventTransportLeg,
  RaceEvent,
  StaffMember,
  StaffStatus,
  TransportDirection,
  TransportMode,
  TransportStop,
  TransportStopType,
  Vehicle,
  VehicleType,
  User,
  AppSection,
  PermissionLevel,
} from "../../types";
import { Sex } from "../../types";

interface EventTransportTabProps {
  event: RaceEvent;
  eventId: string;
  appState: AppState;
  setEventTransportLegs: React.Dispatch<
    React.SetStateAction<EventTransportLeg[]>
  >;
  setEventBudgetItems: React.Dispatch<React.SetStateAction<EventBudgetItem[]>>;
  currentUser?: User | null;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
}

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const initialTransportFormStateFactory = (
  eventId: string
): Omit<EventTransportLeg, "id"> => ({
  eventId: eventId,
  direction: TransportDirection.ALLER,
  mode: TransportMode.MINIBUS,
  departureDate: "",
  departureTime: "",
  departureLocation: "",
  arrivalDate: "",
  arrivalTime: "",
  arrivalLocation: "",
  details: "",
  personName: "", // Will be auto-generated
  isAuroreFlight: false,
  occupants: [],
  assignedVehicleId: undefined,
  driverId: undefined,
  intermediateStops: [],
});

const lightInputBaseClasses =
  "bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500";
const lightInputClasses = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm ${lightInputBaseClasses}`;
const lightSelectClasses = `mt-1 block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm sm:text-sm ${lightInputBaseClasses}`;

const datesOverlap = (
  startAStr?: string,
  endAStr?: string,
  startBStr?: string,
  endBStr?: string
): boolean => {
  if (!startAStr || !startBStr) return false;

  const sA = new Date(startAStr + "T00:00:00Z");
  const eA = endAStr
    ? new Date(endAStr + "T23:59:59Z")
    : new Date(startAStr + "T23:59:59Z");
  const sB = new Date(startBStr + "T00:00:00Z");
  const eB = endBStr
    ? new Date(endBStr + "T23:59:59Z")
    : new Date(startBStr + "T23:59:59Z");

  return sA <= eB && eA >= sB;
};

const checkVehicleAvailability = (
  vehicle: Vehicle,
  checkStartDate: string | undefined,
  checkEndDate: string | undefined,
  allGlobalTransportLegs: EventTransportLeg[],
  currentLegIdToExclude?: string,
  currentLegContext?: Pick<EventTransportLeg, "eventId" | "direction">
): { status: "available" | "maintenance" | "assigned"; reason: string } => {
  if (!checkStartDate) return { status: "available", reason: "" };

  // Check for maintenance
  if (vehicle.nextMaintenanceDate) {
    if (
      datesOverlap(
        checkStartDate,
        checkEndDate,
        vehicle.nextMaintenanceDate,
        vehicle.nextMaintenanceDate
      )
    ) {
      return { status: "maintenance", reason: "(Indisponible - Entretien)" };
    }
  }

  // Check for assignment
  for (const leg of allGlobalTransportLegs) {
    if (leg.id === currentLegIdToExclude) continue;
    if (leg.assignedVehicleId === vehicle.id) {
      // Autoriser explicitement le même véhicule sur Aller + Retour du MÊME événement.
      // Cas typique : aller/retour dans la journée (ou même déplacement multi-jours),
      // où le véhicule doit être sélectionnable sur les deux trajets.
      if (
        currentLegContext &&
        leg.eventId === currentLegContext.eventId &&
        leg.direction !== currentLegContext.direction
      ) {
        continue;
      }
      if (
        datesOverlap(
          checkStartDate,
          checkEndDate,
          leg.departureDate,
          leg.arrivalDate
        )
      ) {
        return { status: "assigned", reason: "(Indisponible - Assigné)" };
      }
    }
  }
  return { status: "available", reason: "" };
};

export const EventTransportTab: React.FC<EventTransportTabProps> = ({
  event,
  eventId,
  appState,
  setEventTransportLegs,
  setEventBudgetItems,
  currentUser,
  effectivePermissions,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransportLeg, setCurrentTransportLeg] = useState<
    Omit<EventTransportLeg, "id"> | EventTransportLeg
  >(initialTransportFormStateFactory(eventId));
  const [isEditing, setIsEditing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeSubTab, setActiveSubTab] = useState<'aller' | 'jourj' | 'retour'>('aller');

  // Vérification des permissions pour l'accès aux informations financières
  const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;

  const transportLegsForEvent = useMemo(() => {
    return appState.eventTransportLegs.filter((leg) => leg.eventId === eventId);
  }, [appState.eventTransportLegs, eventId]);

  const allAvailablePeople = useMemo(() => {
    const eventParticipantIds = new Set([
      ...(event.selectedRiderIds || []),
      ...(event.selectedStaffIds || []),
    ]);

    const allPeople = [
      ...appState.riders.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        type: "rider" as "rider" | "staff",
        isParticipant: eventParticipantIds.has(r.id),
      })),
      ...appState.staff.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        type: "staff" as "rider" | "staff",
        isParticipant: eventParticipantIds.has(s.id),
      })),
    ];

    // Sort participants first, then by name
    return allPeople.sort((a, b) => {
      if (a.isParticipant !== b.isParticipant) {
        return a.isParticipant ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    appState.riders,
    appState.staff,
    event.selectedRiderIds,
    event.selectedStaffIds,
  ]);

  const calculateVehicleBudgetItems = (
    legsForEvent: EventTransportLeg[]
  ): EventBudgetItem[] => {
    const budgetItems: EventBudgetItem[] = [];
    legsForEvent.forEach((leg) => {
      const vehicle = leg.assignedVehicleId
        ? appState.vehicles.find((v) => v.id === leg.assignedVehicleId)
        : undefined;
      if (
        vehicle?.estimatedDailyCost &&
        vehicle.estimatedDailyCost > 0 &&
        leg.departureDate
      ) {
        const startDate = new Date(leg.departureDate + "T12:00:00Z");
        const endDate = leg.arrivalDate
          ? new Date(leg.arrivalDate + "T12:00:00Z")
          : startDate;
        const durationInDays = Math.max(
          1,
          Math.round(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1
        );
        const totalCost = vehicle.estimatedDailyCost * durationInDays;

        budgetItems.push({
          id: `auto-vehicle-${leg.id}`,
          eventId: eventId,
          category: BudgetItemCategory.VOITURE_EQUIPE,
          description: `Coût estimé: ${vehicle.name}`,
          estimatedCost: totalCost,
          notes: `Véhicule: ${vehicle.name}\nDurée: ${durationInDays} jour${durationInDays > 1 ? 's' : ''}\nCalcul: ${vehicle.estimatedDailyCost}€ × ${durationInDays} jour${durationInDays > 1 ? 's' : ''} = ${totalCost}€`,
          isAutoGenerated: true,
          sourceVehicleId: vehicle.id,
        });
      }
    });
    return budgetItems;
  };

  const calculateVacataireBudgetItems = (
    legsForEvent: EventTransportLeg[]
  ): EventBudgetItem[] => {
    const vacataireCosts = new Map<
      string,
      { minDate: Date; maxDate: Date; staff: StaffMember }
    >();
    const allStaffInEvent = appState.staff.filter((s) =>
      event.selectedStaffIds.includes(s.id)
    );

    allStaffInEvent.forEach((staffMember) => {
      if (
        staffMember?.status === StaffStatus.VACATAIRE &&
        staffMember.dailyRate
      ) {
        const staffLegs = legsForEvent.filter((leg) =>
          leg.occupants.some(
            (occ) => occ.id === staffMember.id && occ.type === "staff"
          )
        );

        if (staffLegs.length > 0) {
          let minDate: Date | null = null;
          let maxDate: Date | null = null;

          staffLegs.forEach((leg) => {
            const depDate = leg.departureDate
              ? new Date(leg.departureDate + "T12:00:00Z")
              : null;
            const arrDate = leg.arrivalDate
              ? new Date(leg.arrivalDate + "T12:00:00Z")
              : depDate;

            if (depDate) {
              if (!minDate || depDate < minDate) minDate = depDate;
            }
            if (arrDate) {
              if (!maxDate || arrDate > maxDate) maxDate = arrDate;
            }
          });

          if (minDate && maxDate) {
            vacataireCosts.set(staffMember.id, {
              minDate,
              maxDate,
              staff: staffMember,
            });
          }
        }
      }
    });

    const budgetItems: EventBudgetItem[] = [];
    vacataireCosts.forEach((data, staffId) => {
      const durationDays = Math.max(
        1,
        Math.round(
          (data.maxDate.getTime() - data.minDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );
      const totalCost = durationDays * data.staff.dailyRate!;
      budgetItems.push({
        id: `auto-vacataire-${eventId}-${staffId}`,
        eventId: eventId,
        category: BudgetItemCategory.SALAIRES,
        description: `Prestation vacataire: ${data.staff.firstName} ${data.staff.lastName}`,
        estimatedCost: totalCost,
        actualCost: undefined,
        notes: `Vacataire: ${data.staff.firstName} ${data.staff.lastName}\nDurée: ${durationDays} jour${durationDays > 1 ? 's' : ''}\nCalcul: ${data.staff.dailyRate}€ × ${durationDays} jour${durationDays > 1 ? 's' : ''} = ${totalCost}€\nBasé sur les dates de transport.`,
        isAutoGenerated: true,
        sourceStaffId: staffId,
      });
    });
    return budgetItems;
  };

  const updateCostsForEvent = async (allLegsForEvent: EventTransportLeg[]) => {
    const vacataireBudgetItems = calculateVacataireBudgetItems(allLegsForEvent);
    const vehicleBudgetItems = calculateVehicleBudgetItems(allLegsForEvent);

    // Sauvegarder les nouveaux éléments de budget dans Firebase
    if (appState.activeTeamId) {
      try {
        // Sauvegarder les éléments de budget des vacataires
        for (const budgetItem of vacataireBudgetItems) {
          await saveData(
            appState.activeTeamId,
            "eventBudgetItems",
            budgetItem
          );
        }
        
        // Sauvegarder les éléments de budget des véhicules
        for (const budgetItem of vehicleBudgetItems) {
          await saveData(
            appState.activeTeamId,
            "eventBudgetItems",
            budgetItem
          );
        }
        
        console.log('✅ Éléments de budget des déplacements sauvegardés dans Firebase');
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des éléments de budget:', error);
      }
    }

    setEventBudgetItems((prevBudget) => {
      const manualBudgetItemsForEvent = prevBudget.filter(
        (item) => item.eventId === eventId && !item.isAutoGenerated
      );
      const otherEventsBudgetItems = prevBudget.filter(
        (item) => item.eventId !== eventId
      );

      // Récupérer les coûts réels existants pour les préserver
      const existingActualCosts = new Map<string, number>();
      prevBudget
        .filter(item => item.eventId === eventId && item.isAutoGenerated)
        .forEach(item => {
          if (item.actualCost !== undefined) {
            existingActualCosts.set(item.id, item.actualCost);
          }
        });

      // Préserver les coûts réels existants
      const preservedVacataireItems = vacataireBudgetItems.map(item => ({
        ...item,
        actualCost: existingActualCosts.get(item.id) || item.actualCost
      }));
      
      const preservedVehicleItems = vehicleBudgetItems.map(item => ({
        ...item,
        actualCost: existingActualCosts.get(item.id) || item.actualCost
      }));

      return [
        ...otherEventsBudgetItems,
        ...manualBudgetItemsForEvent,
        ...preservedVacataireItems,
        ...preservedVehicleItems,
      ];
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "departureDate" || name === "arrivalDate") {
      setCurrentTransportLeg((prev) => ({
        ...prev,
        [name]: value === "" ? undefined : value,
      }));
      return;
    }

    if (name === "assignedVehicleId") {
      const vehicleId = value;
      const vehicle = appState.vehicles.find((v) => v.id === vehicleId);

      let newMode = (currentTransportLeg as EventTransportLeg).mode;
      if (vehicleId === "perso") {
        newMode = TransportMode.VOITURE_PERSO;
      } else if (vehicle) {
        if (
          [VehicleType.MINIBUS, VehicleType.VOITURE, VehicleType.BUS].includes(
            vehicle.vehicleType
          )
        ) {
          newMode = TransportMode.MINIBUS;
        } else {
          newMode = TransportMode.AUTRE;
        }
      }

      // Vérifier la capacité du nouveau véhicule
      const currentOccupants = (currentTransportLeg as EventTransportLeg).occupants?.length || 0;
      let maxCapacity = Infinity;
      
      if (vehicle && vehicle.seats) {
        maxCapacity = vehicle.seats;
      } else if (vehicleId === "perso") {
        maxCapacity = 5;
      }
      
      // Si le nouveau véhicule a une capacité insuffisante, demander confirmation
      if (maxCapacity !== Infinity && currentOccupants > maxCapacity) {
        const confirmMessage = `Le véhicule sélectionné a une capacité de ${maxCapacity} personne${maxCapacity > 1 ? 's' : ''}, mais ${currentOccupants} occupant${currentOccupants > 1 ? 's' : ''} ${currentOccupants > 1 ? 'sont' : 'est'} déjà sélectionné${currentOccupants > 1 ? 's' : ''}. Voulez-vous continuer et ajuster les occupants ?`;
        
        if (!window.confirm(confirmMessage)) {
          return; // Annuler le changement de véhicule
        }
        
        // Réduire le nombre d'occupants à la capacité maximale
        const updatedOccupants = (currentTransportLeg as EventTransportLeg).occupants?.slice(0, maxCapacity) || [];
        
        setCurrentTransportLeg((prev) => ({
          ...(prev as EventTransportLeg),
          mode: newMode,
          assignedVehicleId: value === "" ? undefined : value,
          // Ne pas assigner automatiquement le chauffeur, laisser l'utilisateur choisir
          occupants: updatedOccupants,
        }));
        return;
      }

      setCurrentTransportLeg((prev) => ({
        ...(prev as EventTransportLeg),
        mode: newMode,
        assignedVehicleId: value === "" ? undefined : value,
        // Ne pas assigner automatiquement le chauffeur, laisser l'utilisateur choisir
      }));
      return;
    }

    // Gestion spéciale pour le changement de mode de transport
    if (name === "mode") {
      setCurrentTransportLeg((prev) => {
        const updated = { ...prev, [name]: value };
        
        // Si on passe en mode vol ou train, réinitialiser le véhicule assigné
        if (value === TransportMode.VOL || value === TransportMode.TRAIN) {
          updated.assignedVehicleId = undefined;
          updated.driverId = undefined;
        }
        
        return updated;
      });
      return;
    }

    setCurrentTransportLeg((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOccupantChange = (
    personId: string,
    personType: "rider" | "staff"
  ) => {
    setCurrentTransportLeg((prev) => {
      const updated = structuredClone(prev);
      if (!updated.occupants) updated.occupants = [];
      const isSelected = updated.occupants.some(
        (occ) => occ.id === personId && occ.type === personType
      );

      if (isSelected) {
        // Retirer l'occupant
        updated.occupants = updated.occupants.filter(
          (occ) => !(occ.id === personId && occ.type === personType)
        );
      } else {
        // Vérifier la capacité du véhicule avant d'ajouter
        const vehicle = updated.assignedVehicleId 
          ? appState.vehicles.find(v => v.id === updated.assignedVehicleId)
          : null;
        
        let maxCapacity = Infinity; // Capacité illimitée par défaut
        
        if (vehicle && vehicle.seats) {
          maxCapacity = vehicle.seats;
        } else if (updated.assignedVehicleId === "perso") {
          maxCapacity = 5; // Capacité par défaut pour véhicule personnel
        }
        
        // Vérifier si on peut ajouter un occupant
        if (updated.occupants.length >= maxCapacity) {
          alert(`Impossible d'ajouter plus d'occupants. Capacité maximale du véhicule : ${maxCapacity} personne${maxCapacity > 1 ? 's' : ''}.`);
          return prev; // Ne pas modifier l'état
        }
        
        updated.occupants.push({ id: personId, type: personType });
      }
      return updated;
    });
  };

  const handleAddStop = () => {
    const newStop: TransportStop = {
      id: generateId(),
      location: "",
      date: (currentTransportLeg as EventTransportLeg).departureDate || event.date,
      time: "",
      stopType: TransportStopType.PICKUP,
      persons: [],
      notes: "",
      isTimingCritical: false,
      estimatedDuration: 0,
    };
    setCurrentTransportLeg((prev) => {
      const updated = structuredClone(prev);
      if (!updated.intermediateStops) updated.intermediateStops = [];
      updated.intermediateStops.push(newStop);
      return updated;
    });
  };

  const handleRemoveStop = (stopId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette étape ?")) {
      setCurrentTransportLeg((prev) => {
        const updated = structuredClone(prev);
        updated.intermediateStops = (updated.intermediateStops || []).filter(
          (stop) => stop.id !== stopId
        );
        return updated;
      });
    }
  };

  const handleStopChange = (
    index: number,
    field: keyof Omit<TransportStop, "id" | "persons">,
    value: string
  ) => {
    setCurrentTransportLeg((prev) => {
      const updated = structuredClone(prev);
      if (updated.intermediateStops && updated.intermediateStops[index]) {
        (updated.intermediateStops[index] as any)[field] = value;
      }
      return updated;
    });
  };

  const handleStopPersonChange = (
    stopIndex: number,
    personId: string,
    personType: "rider" | "staff"
  ) => {
    setCurrentTransportLeg((prev) => {
      const updated = structuredClone(prev);
      const stop = updated.intermediateStops?.[stopIndex];
      if (stop) {
        if (!stop.persons) stop.persons = [];
        const personIndex = stop.persons.findIndex(
          (p: any) => p.id === personId && p.type === personType
        );
        
        if (personIndex > -1) {
          // Retirer la personne de l'étape
          stop.persons.splice(personIndex, 1);
          
          // Retirer la personne des occupants du véhicule
          if (updated.occupants) {
            updated.occupants = updated.occupants.filter(
              (occ) => !(occ.id === personId && occ.type === personType)
            );
          }
        } else {
          // Ajouter la personne à l'étape
          stop.persons.push({ id: personId, type: personType });
          
          // Ajouter la personne aux occupants du véhicule si elle n'y est pas déjà
          if (!updated.occupants) updated.occupants = [];
          const isAlreadyOccupant = updated.occupants.some(
            (occ) => occ.id === personId && occ.type === personType
          );
          if (!isAlreadyOccupant) {
            updated.occupants.push({ id: personId, type: personType });
          }
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let legData = { ...currentTransportLeg };

    // Ensure empty dates are undefined
    if (legData.departureDate === "") legData.departureDate = undefined;
    if (legData.arrivalDate === "") legData.arrivalDate = undefined;

    const legToSave: EventTransportLeg = {
      ...(legData as Omit<EventTransportLeg, "id">),
      eventId: eventId,
      id: (legData as EventTransportLeg).id || generateId(),
    };

    try {
      // Sauvegarder dans Firebase si on a un teamId
      if (appState.activeTeamId) {
        const savedId = await saveData(
          appState.activeTeamId,
          "eventTransportLegs",
          legToSave
        );
        legToSave.id = savedId;
        console.log('✅ Trajet sauvegardé dans Firebase avec l\'ID:', savedId);
      } else {
        console.warn('⚠️ Aucun teamId actif, sauvegarde locale uniquement');
      }

      // Mettre à jour l'état local APRÈS la sauvegarde réussie
      setEventTransportLegs((prevLegs) => {
      if (isEditing) {
          // Mode édition : remplacer le trajet existant
          return prevLegs.map((leg) =>
          leg.id === legToSave.id ? legToSave : leg
        );
      } else {
          // Mode création : ajouter le nouveau trajet
          return [...prevLegs, legToSave];
      }
      });

      // Update budget items after the state update
      setTimeout(async () => {
        const legsForThisEvent = appState.eventTransportLegs.filter(
          (leg) => leg.eventId === eventId
        );
        const updatedLegsForEvent = isEditing 
          ? legsForThisEvent.map((leg) => leg.id === legToSave.id ? legToSave : leg)
          : [...legsForThisEvent, legToSave];
        await updateCostsForEvent(updatedLegsForEvent);
      }, 0);

    setIsModalOpen(false);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du trajet:', error);
      alert('Erreur lors de la sauvegarde du trajet. Veuillez réessayer.');
    }
  };

  const openAddModal = () => {
    setCurrentTransportLeg(initialTransportFormStateFactory(eventId));
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (leg: EventTransportLeg) => {
    setCurrentTransportLeg(structuredClone(leg));
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (legId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce trajet ?")) {
      try {
        // Supprimer de Firebase si on a un teamId
        if (appState.activeTeamId) {
          await deleteData(
            appState.activeTeamId,
            "eventTransportLegs",
            legId
          );
          console.log('✅ Trajet supprimé de Firebase avec l\'ID:', legId);
        } else {
          console.warn('⚠️ Aucun teamId actif, suppression locale uniquement');
        }

        // Mettre à jour l'état local
      setEventTransportLegs((prevLegs) => {
        const updatedLegs = prevLegs.filter((leg) => leg.id !== legId);
        const legsForThisEvent = updatedLegs.filter(
          (leg) => leg.eventId === eventId
        );
        // Mettre à jour les coûts de manière asynchrone
        updateCostsForEvent(legsForThisEvent);
        return updatedLegs;
      });
      } catch (error) {
        console.error('❌ Erreur lors de la suppression du trajet:', error);
        alert('Erreur lors de la suppression du trajet. Veuillez réessayer.');
      }
    }
  };

  const toggleRowExpansion = (legId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(legId)) {
        newSet.delete(legId);
      } else {
        newSet.add(legId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString?: string, timeString?: string, departureLocation?: string) => {
    if (!dateString) return departureLocation || "N/A";
    try {
      const date = new Date(`${dateString}T${timeString || "00:00:00"}`);
      if (isNaN(date.getTime())) return "Date invalide";
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        month: "long",
      };
      let formatted = date.toLocaleDateString("fr-FR", options);
      if (timeString) {
        formatted += ` à ${timeString}`;
      }
      return formatted;
    } catch {
      return "Date Invalide";
    }
  };

  const getOccupantPickupTime = (leg: EventTransportLeg, personId: string, personType: "rider" | "staff") => {
    if (!leg.intermediateStops) return null;
    
    for (const stop of leg.intermediateStops) {
      if (stop.persons && stop.persons.some(p => p.id === personId && p.type === personType)) {
        if (stop.date && stop.time) {
          return `${stop.date} à ${stop.time}`;
        } else if (stop.time) {
          return stop.time;
        }
      }
    }
    return null;
  };

  const getAssignedPeople = () => {
    const assignedPeople = new Set<string>();
    
    // Parcourir tous les trajets de l'événement
    transportLegsForEvent.forEach(leg => {
      // Ajouter les occupants directs
      leg.occupants.forEach(occ => {
        assignedPeople.add(`${occ.id}-${occ.type}`);
      });
      
      // Ajouter les personnes récupérées aux étapes
      leg.intermediateStops?.forEach(stop => {
        stop.persons?.forEach(person => {
          assignedPeople.add(`${person.id}-${person.type}`);
        });
      });
    });
    
    return assignedPeople;
  };

  const getRiderRoleLabel = (riderId: string): string => {
    const rider = appState.riders.find(r => r.id === riderId);
    return rider?.sex === Sex.FEMALE ? 'coureuse' : 'coureur';
  };

  const getPersonAssignments = (personId: string, personType: "rider" | "staff") => {
    const assignments: string[] = [];
    
    transportLegsForEvent.forEach(leg => {
      // Vérifier les occupants directs
      const isDirectOccupant = leg.occupants.some(occ => occ.id === personId && occ.type === personType);
      if (isDirectOccupant) {
        const direction = leg.direction === TransportDirection.ALLER ? 'Aller' : 
                         leg.direction === TransportDirection.RETOUR ? 'Retour' : 'Jour J';
        const vehicle = leg.assignedVehicleId === 'perso' ? 'Véhicule personnel' :
                       leg.assignedVehicleId ? 
                         (appState.vehicles.find(v => v.id === leg.assignedVehicleId)?.name || 'Transport') :
                         'Transport';
        assignments.push(`${direction} - ${vehicle}`);
      }
      
      // Vérifier les étapes intermédiaires
      leg.intermediateStops?.forEach(stop => {
        const isInStop = stop.persons?.some(p => p.id === personId && p.type === personType);
        if (isInStop) {
          const direction = leg.direction === TransportDirection.ALLER ? 'Aller' : 
                           leg.direction === TransportDirection.RETOUR ? 'Retour' : 'Jour J';
          assignments.push(`${direction} - Récupération à ${stop.location}`);
        }
      });
    });
    
    return assignments;
  };

  const getUnassignedPeople = () => {
    const assignedPeople = getAssignedPeople();
    const eventParticipantIds = new Set([
      ...(event.selectedRiderIds || []),
      ...(event.selectedStaffIds || []),
    ]);

    const unassignedRiders = appState.riders.filter(rider => 
      eventParticipantIds.has(rider.id) && !assignedPeople.has(`${rider.id}-rider`)
    );

    const unassignedStaff = appState.staff.filter(staff => 
      eventParticipantIds.has(staff.id) && !assignedPeople.has(`${staff.id}-staff`)
    );

    return [...unassignedRiders, ...unassignedStaff];
  };

  const getUnassignedPeopleForTab = (tabType: 'aller' | 'jourj' | 'retour') => {
    const eventParticipantIds = new Set([
      ...(event.selectedRiderIds || []),
      ...(event.selectedStaffIds || []),
    ]);

    let assignedPeople = new Set<string>();
    
    // Récupérer les personnes assignées selon le type d'onglet
    if (tabType === 'aller') {
      allerLegs.forEach(leg => {
        leg.occupants.forEach(occ => assignedPeople.add(`${occ.id}-${occ.type}`));
        leg.intermediateStops?.forEach(stop => {
          stop.persons?.forEach(person => assignedPeople.add(`${person.id}-${person.type}`));
        });
      });
    } else if (tabType === 'jourj') {
      jourJLegs.forEach(leg => {
        leg.occupants.forEach(occ => assignedPeople.add(`${occ.id}-${occ.type}`));
        leg.intermediateStops?.forEach(stop => {
          stop.persons?.forEach(person => assignedPeople.add(`${person.id}-${person.type}`));
        });
      });
    } else if (tabType === 'retour') {
      retourLegs.forEach(leg => {
        leg.occupants.forEach(occ => assignedPeople.add(`${occ.id}-${occ.type}`));
        leg.intermediateStops?.forEach(stop => {
          stop.persons?.forEach(person => assignedPeople.add(`${person.id}-${person.type}`));
        });
      });
    }

    const unassignedRiders = appState.riders.filter(rider => 
      eventParticipantIds.has(rider.id) && !assignedPeople.has(`${rider.id}-rider`)
    );

    const unassignedStaff = appState.staff.filter(staff => 
      eventParticipantIds.has(staff.id) && !assignedPeople.has(`${staff.id}-staff`)
    );

    return [...unassignedRiders, ...unassignedStaff];
  };

  const renderUnassignedAlert = (tabType: 'aller' | 'jourj' | 'retour') => {
    const unassignedPeople = getUnassignedPeopleForTab(tabType);
    
    if (unassignedPeople.length === 0) return null;

    const tabLabels = {
      'aller': 'trajets aller',
      'jourj': 'trajets du jour J',
      'retour': 'trajets retour'
    };

                return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Personnes non assignées pour les {tabLabels[tabType]}
            </h3>
            <p className="text-yellow-700 mb-3">
              {unassignedPeople.length} personne{unassignedPeople.length > 1 ? 's' : ''} participant{unassignedPeople.length > 1 ? 's' : ''} à l'événement n'{unassignedPeople.length > 1 ? 'ont' : 'a'} pas encore été assignée{unassignedPeople.length > 1 ? 's' : ''} aux {tabLabels[tabType]} :
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedPeople.map((person) => {
                const isRider = appState.riders.some(r => r.id === (person as any).id);
                const roleLabel = isRider ? getRiderRoleLabel((person as any).id) : 'staff';
                const badgeClass = isRider ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700';
                return (
                  <span key={`${person.id}-${isRider ? 'rider' : 'staff'}`} 
                        className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    {person.firstName} {person.lastName}
                    <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${badgeClass}`}>
                      {roleLabel}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubTabs = () => {
    const tabs = [
      { id: 'aller' as const, label: 'Trajets Aller', icon: '✈️', count: allerLegs.length, color: 'blue' },
      { id: 'jourj' as const, label: 'Jour J', icon: '🏁', count: jourJLegs.length, color: 'green' },
      { id: 'retour' as const, label: 'Trajets Retour', icon: '🏠', count: retourLegs.length, color: 'orange' }
    ];

                return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
                        <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeSubTab === tab.id
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeSubTab === tab.id
                  ? `bg-${tab.color}-100 text-${tab.color}-800`
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {tab.count}
              </span>
                        </button>
          ))}
        </nav>
                        </div>
    );
  };

  const renderAllerTab = () => (
    <div className="space-y-4">
      {allerLegs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-6xl mb-4 block">✈️</span>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun trajet aller planifié</h3>
          <p className="text-gray-500 mb-6">Ajoutez des trajets pour organiser les départs vers l'événement</p>
          <ActionButton
            onClick={openAddModal}
            icon={<PlusCircleIcon className="w-5 h-5" />}
          >
            Ajouter un Trajet Aller
          </ActionButton>
                        </div>
      ) : (
        <div className="space-y-4">
          {allerLegs.map((leg) => (
            <div key={leg.id} className="border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">
                          {leg.mode === TransportMode.VOL ? '✈️' : '🚗'}
                        </span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">
                            {leg.mode === TransportMode.VOL ? 'Vol' : (
                              leg.assignedVehicleId === 'perso' ? 'Véhicule personnel' :
                              leg.assignedVehicleId ? 
                                (appState.vehicles.find(v => v.id === leg.assignedVehicleId)?.name || 'Transport terrestre') :
                                'Transport terrestre'
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatDate(leg.departureDate, leg.departureTime, leg.departureLocation)} → {formatDate(leg.arrivalDate, leg.arrivalTime)} {leg.arrivalLocation}
                          </p>
                        </div>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-3">
                        Trajet
                      </h5>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Départ:</strong> {leg.departureLocation}<br/>
                          <strong>Arrivée:</strong> {leg.arrivalLocation}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700 mb-3">
                        Participants
                      </h5>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        {leg.occupants.length > 0 ? (
                          <ul className="space-y-2">
                                            {leg.occupants.map((occ) => {
                  const person = occ.type === "rider" 
                    ? appState.riders.find(r => r.id === occ.id)
                    : appState.staff.find(s => s.id === occ.id);
                  const pickupTime = getOccupantPickupTime(leg, occ.id, occ.type);
                  
                  return (
                    <li key={occ.id + occ.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{person ? `${person.firstName} ${person.lastName}` : 'Inconnu'}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          occ.type === 'rider' 
                            ? 'bg-pink-100 text-pink-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {occ.type === 'rider' ? getRiderRoleLabel(occ.id) : 'staff'}
                        </span>
                      </div>
                      {pickupTime && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          Récupéré à {pickupTime}
                        </span>
                      )}
                    </li>
                  );
                })}
                          </ul>
                        ) : (
                          <p className="text-gray-400 text-sm">Aucun participant assigné</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {leg.mode === TransportMode.VOL && leg.details && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">🎫</span> Détails du vol
                      </h5>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">{leg.details}</p>
                      </div>
                    </div>
                  )}

                  {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">🚌</span> Récupérations/Déposes
                      </h5>
                      <div className="space-y-2">
                        {leg.intermediateStops.map((stop) => {
                          const person = stop.persons && stop.persons.length > 0 
                            ? (stop.persons[0].type === "rider" 
                                ? appState.riders.find(r => r.id === stop.persons[0].id)
                                : appState.staff.find(s => s.id === stop.persons[0].id))
                            : null;
                          
                          return (
                            <div key={stop.id} className="bg-blue-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-blue-600 font-medium">{stop.time}</span>
                                  <span className="font-medium">{stop.location}</span>
                                  {person && (
                                    <span className="text-sm text-gray-600">
                                      → {person.firstName} {person.lastName}
                                    </span>
                                  )}
                                </div>
                                {stop.notes && (
                                  <span className="text-xs text-gray-500 italic">
                                    {stop.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-6">
                        <ActionButton
                          onClick={() => openEditModal(leg)}
                          variant="secondary"
                          size="sm"
                          icon={<PencilIcon className="w-4 h-4" />}
                        />
                        <ActionButton
                          onClick={() => handleDelete(leg.id)}
                          variant="danger"
                          size="sm"
                          icon={<TrashIcon className="w-4 h-4" />}
                        />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderJourJTab = () => (
    <div className="space-y-4">
      {jourJLegs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-6xl mb-4 block">🏁</span>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun transport jour J planifié</h3>
          <p className="text-gray-500 mb-6">Ajoutez des trajets pour organiser les déplacements du jour de l'événement</p>
          <ActionButton
            onClick={openAddModal}
            icon={<PlusCircleIcon className="w-5 h-5" />}
          >
            Ajouter un Transport Jour J
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-4">
          {jourJLegs.map((leg) => (
            <div key={leg.id} className="border border-green-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">🚗</span>
                            <div>
                          <h4 className="text-lg font-semibold text-gray-800">
                            {leg.assignedVehicleId === 'perso' ? 'Véhicule personnel' :
                             leg.assignedVehicleId ? 
                               (appState.vehicles.find(v => v.id === leg.assignedVehicleId)?.name || 'Transport Jour J') :
                               'Transport Jour J'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {leg.departureTime} → {leg.arrivalTime}
                          </p>
                        </div>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">📍</span> Trajet
                              </h5>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Départ:</strong> {leg.departureLocation}<br/>
                          <strong>Arrivée:</strong> {leg.arrivalLocation}
                              </p>
                            </div>
                    </div>
                    
                            <div>
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">🚗</span> Véhicule
                              </h5>
                      <div className="bg-green-50 p-3 rounded-lg">
                        {leg.assignedVehicleId ? (
                          <div className="text-sm text-gray-700 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">🚗 Véhicule:</span>
                              <span>{
                                leg.assignedVehicleId === 'perso' ? 'Véhicule personnel' :
                                appState.vehicles.find(v => v.id === leg.assignedVehicleId)?.name || 'Inconnu'
                              }</span>
                            </div>
                            {leg.driverId ? (
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">👨‍💼 Chauffeur:</span>
                                <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs">
                                  {appState.staff.find(s => s.id === leg.driverId)?.firstName} {appState.staff.find(s => s.id === leg.driverId)?.lastName}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">👨‍💼 Chauffeur:</span>
                                <span className="text-orange-600 text-xs">Non assigné</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">Aucun véhicule assigné</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="mr-2">👥</span> Passagers
                    </h5>
                    <div className="bg-green-50 p-3 rounded-lg">
                      {leg.occupants.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                                {leg.occupants.map((occ) => {
                            const person = occ.type === "rider" 
                              ? appState.riders.find(r => r.id === occ.id)
                              : appState.staff.find(s => s.id === occ.id);
                                  return (
                              <span key={occ.id + occ.type} className={`px-3 py-1 rounded-full text-sm ${
                                occ.type === 'rider' 
                                  ? 'bg-pink-200 text-pink-800' 
                                  : 'bg-blue-200 text-blue-800'
                              }`}>
                                {person ? `${person.firstName} ${person.lastName}` : 'Inconnu'}
                              </span>
                                  );
                                })}
                            </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Aucun passager assigné</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-6">
                  <ActionButton
                    onClick={() => openEditModal(leg)}
                    variant="secondary"
                    size="sm"
                    icon={<PencilIcon className="w-4 h-4" />}
                  />
                  <ActionButton
                    onClick={() => handleDelete(leg.id)}
                    variant="danger"
                    size="sm"
                    icon={<TrashIcon className="w-4 h-4" />}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRetourTab = () => (
    <div className="space-y-4">
      {retourLegs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-6xl mb-4 block">🏠</span>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun trajet retour planifié</h3>
          <p className="text-gray-500 mb-6">Ajoutez des trajets pour organiser les retours après l'événement</p>
          <ActionButton
            onClick={openAddModal}
            icon={<PlusCircleIcon className="w-5 h-5" />}
          >
            Ajouter un Trajet Retour
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-4">
          {retourLegs.map((leg) => (
            <div key={leg.id} className="border border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">
                          {leg.mode === TransportMode.VOL ? '✈️' : '🚗'}
                        </span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">
                            {leg.mode === TransportMode.VOL ? 'Vol retour' : (
                              leg.assignedVehicleId === 'perso' ? 'Véhicule personnel' :
                              leg.assignedVehicleId ? 
                                (appState.vehicles.find(v => v.id === leg.assignedVehicleId)?.name || 'Transport terrestre') :
                                'Transport terrestre'
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatDate(leg.departureDate, leg.departureTime, leg.departureLocation)} → {formatDate(leg.arrivalDate, leg.arrivalTime)} {leg.arrivalLocation}
                          </p>
                                      </div>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-3">
                        Trajet
                      </h5>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Départ:</strong> {leg.departureLocation}<br/>
                          <strong>Arrivée:</strong> {leg.arrivalLocation}
                              </p>
                            </div>
                    </div>
                    
                            <div>
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">👥</span> Participants
                              </h5>
                      <div className="bg-orange-50 p-3 rounded-lg">
                                                {leg.occupants.length > 0 ? (
                          <ul className="space-y-2">
                                {leg.occupants.map((occ) => {
                              const person = occ.type === "rider" 
                                ? appState.riders.find(r => r.id === occ.id)
                                : appState.staff.find(s => s.id === occ.id);
                              const pickupTime = getOccupantPickupTime(leg, occ.id, occ.type);
                              
                                                                    return (
                                <li key={occ.id + occ.type} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">{person ? `${person.firstName} ${person.lastName}` : 'Inconnu'}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      occ.type === 'rider' 
                                        ? 'bg-pink-100 text-pink-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {occ.type === 'rider' ? getRiderRoleLabel(occ.id) : 'staff'}
                                    </span>
                                  </div>
                                  {pickupTime && (
                                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                      Récupéré à {pickupTime}
                                    </span>
                                  )}
                                </li>
                                  );
                                })}
                              </ul>
                        ) : (
                          <p className="text-gray-400 text-sm">Aucun participant assigné</p>
                                          )}
                                        </div>
                                        </div>
                                          </div>

                  {leg.mode === TransportMode.VOL && leg.details && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">🎫</span> Détails du vol retour
                              </h5>
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <p className="text-sm text-orange-800">{leg.details}</p>
                                      </div>
                                          </div>
                                      )}

                                    {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">🚌</span> Déposes
                      </h5>
                      <div className="space-y-2">
                        {leg.intermediateStops.map((stop) => {
                          const person = stop.persons && stop.persons.length > 0 
                            ? (stop.persons[0].type === "rider" 
                                ? appState.riders.find(r => r.id === stop.persons[0].id)
                                : appState.staff.find(s => s.id === stop.persons[0].id))
                            : null;
                          
                          return (
                            <div key={stop.id} className="bg-orange-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-orange-600 font-medium">{stop.time}</span>
                                  <span className="font-medium">{stop.location}</span>
                                  {person && (
                                    <span className="text-sm text-gray-600">
                                      → {person.firstName} {person.lastName}
                                        </span>
                                        )}
                                      </div>
                                      {stop.notes && (
                                  <span className="text-xs text-gray-500 italic">
                                          {stop.notes}
                                  </span>
                                      )}
                                    </div>
                                </div>
                          );
                        })}
                            </div>
                          </div>
                                      )}
                                    </div>
                
                <div className="flex space-x-2 ml-6">
                  <ActionButton
                    onClick={() => openEditModal(leg)}
                    variant="secondary"
                    size="sm"
                    icon={<PencilIcon className="w-4 h-4" />}
                  />
                  <ActionButton
                    onClick={() => handleDelete(leg.id)}
                    variant="danger"
                    size="sm"
                    icon={<TrashIcon className="w-4 h-4" />}
                  />
                                </div>
                            </div>
                          </div>
          ))}
        </div>
      )}
    </div>
  );

  const allerLegs = transportLegsForEvent
    .filter((leg) => leg.direction === TransportDirection.ALLER)
    .sort((a, b) =>
      (a.departureDate || "").localeCompare(b.departureDate || "")
    );
  const retourLegs = transportLegsForEvent
    .filter((leg) => leg.direction === TransportDirection.RETOUR)
    .sort((a, b) =>
      (a.departureDate || "").localeCompare(b.departureDate || "")
    );
  const jourJLegs = transportLegsForEvent
    .filter((leg) => leg.direction === TransportDirection.JOUR_J)
    .sort((a, b) =>
      (a.departureTime || "").localeCompare(b.departureTime || "")
    );

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton d'ajout global */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Plan de Transport</h2>
          <p className="text-gray-600">Organisation des déplacements pour {event.name}</p>
                  </div>
        <ActionButton
          onClick={openAddModal}
          icon={<PlusCircleIcon className="w-5 h-5" />}
        >
          Ajouter un Trajet
        </ActionButton>
      </div>

      {/* Sous-onglets */}
      {renderSubTabs()}



      {/* Contenu des onglets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeSubTab === 'aller' && (
          <>
            {renderUnassignedAlert('aller')}
            {renderAllerTab()}
          </>
        )}
        {activeSubTab === 'jourj' && (
          <>
            {renderUnassignedAlert('jourj')}
            {renderJourJTab()}
          </>
        )}
        {activeSubTab === 'retour' && (
          <>
            {renderUnassignedAlert('retour')}
            {renderRetourTab()}
          </>
        )}
      </div>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? "Modifier Trajet" : "Ajouter un Trajet"}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4 max-h-[85vh] overflow-y-auto p-2 -m-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Direction */}
              <div>
                <label htmlFor="direction" className="block text-sm font-medium text-gray-700">
                  Direction
                </label>
                <select
                  name="direction"
                  id="direction"
                  value={(currentTransportLeg as EventTransportLeg).direction}
                  onChange={handleInputChange}
                  className={lightSelectClasses}
                >
                  {(Object.values(TransportDirection) as TransportDirection[]).map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode de transport */}
              <div>
                <label htmlFor="mode" className="block text-sm font-medium text-gray-700">
                  Mode de transport
                </label>
                <select
                  name="mode"
                  id="mode"
                  value={(currentTransportLeg as EventTransportLeg).mode}
                  onChange={handleInputChange}
                  className={lightSelectClasses}
                >
                  {(Object.values(TransportMode) as TransportMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

                        {/* Véhicule assigné - Seulement pour les transports terrestres */}
            {((currentTransportLeg as EventTransportLeg).mode !== TransportMode.VOL && 
              (currentTransportLeg as EventTransportLeg).mode !== TransportMode.TRAIN) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="assignedVehicleId" className="block text-sm font-medium text-gray-700">
                Véhicule assigné
              </label>
              <select
                name="assignedVehicleId"
                id="assignedVehicleId"
                value={(currentTransportLeg as EventTransportLeg).assignedVehicleId || ""}
                onChange={handleInputChange}
                className={lightSelectClasses}
              >
                <option value="">Sélectionner un véhicule...</option>
                <option value="perso">Véhicule personnel</option>
                {appState.vehicles.map((vehicle) => {
                  const availability = checkVehicleAvailability(
                    vehicle,
                    (currentTransportLeg as EventTransportLeg).departureDate,
                    (currentTransportLeg as EventTransportLeg).arrivalDate,
                    appState.eventTransportLegs,
                    (currentTransportLeg as EventTransportLeg).id,
                    {
                      eventId: eventId,
                      direction: (currentTransportLeg as EventTransportLeg).direction,
                    }
                  );
                  return (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                      disabled={availability.status !== "available"}
                    >
                      {vehicle.name} {availability.reason}
                    </option>
                  );
                })}
              </select>
            </div>
                
                <div>
                  <label htmlFor="driverId" className="block text-sm font-medium text-gray-700">
                    Chauffeur
                  </label>
                  <select
                    name="driverId"
                    id="driverId"
                    value={(currentTransportLeg as EventTransportLeg).driverId || ""}
                    onChange={handleInputChange}
                    className={lightSelectClasses}
                  >
                    <option value="">Sélectionner un chauffeur...</option>
                    {appState.staff.map((staffMember) => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.firstName} {staffMember.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Dates et lieux */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Départ
                </label>
                <input
                  type="date"
                  name="departureDate"
                  value={(currentTransportLeg as EventTransportLeg).departureDate || ""}
                  onChange={handleInputChange}
                  className={lightInputClasses}
                />
                <input
                  type="time"
                  name="departureTime"
                  value={(currentTransportLeg as EventTransportLeg).departureTime || ""}
                  onChange={handleInputChange}
                  className={lightInputClasses}
                />
                <input
                  type="text"
                  name="departureLocation"
                  value={(currentTransportLeg as EventTransportLeg).departureLocation || ""}
                  onChange={handleInputChange}
                  placeholder="Lieu de départ"
                  className={lightInputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arrivée
                </label>
                <input
                  type="date"
                  name="arrivalDate"
                  value={(currentTransportLeg as EventTransportLeg).arrivalDate || ""}
                  onChange={handleInputChange}
                  className={lightInputClasses}
                />
                <input
                  type="time"
                  name="arrivalTime"
                  value={(currentTransportLeg as EventTransportLeg).arrivalTime || ""}
                  onChange={handleInputChange}
                  className={lightInputClasses}
                />
                <input
                  type="text"
                  name="arrivalLocation"
                  value={(currentTransportLeg as EventTransportLeg).arrivalLocation || ""}
                  onChange={handleInputChange}
                  placeholder="Lieu d'arrivée"
                  className={lightInputClasses}
                />
              </div>
            </div>

            {/* Sélection des occupants */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                <label className="block text-sm font-medium text-gray-700">
                  Occupants
                </label>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Les personnes récupérées aux étapes sont automatiquement ajoutées ici<br/>
                    ⚠️ Vous pouvez assigner une personne à plusieurs transports (survoler l'avertissement pour voir les détails)
                  </p>
                </div>
                {(() => {
                  const vehicle = (currentTransportLeg as EventTransportLeg).assignedVehicleId 
                    ? appState.vehicles.find(v => v.id === (currentTransportLeg as EventTransportLeg).assignedVehicleId)
                    : null;
                  const currentOccupants = (currentTransportLeg as EventTransportLeg).occupants?.length || 0;
                  let maxCapacity = Infinity;
                  
                  if (vehicle && vehicle.seats) {
                    maxCapacity = vehicle.seats;
                  } else if ((currentTransportLeg as EventTransportLeg).assignedVehicleId === "perso") {
                    maxCapacity = 5;
                  }
                  
                  return (
                    <div className="text-xs text-gray-600">
                      <span className={`font-medium ${currentOccupants >= maxCapacity ? 'text-red-600' : 'text-gray-600'}`}>
                        {currentOccupants}
                      </span>
                      {maxCapacity !== Infinity && (
                        <span className="text-gray-500"> / {maxCapacity}</span>
                      )}
                      {maxCapacity !== Infinity && currentOccupants >= maxCapacity && (
                        <span className="text-red-600 font-medium ml-1">(Plein)</span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                <div className="space-y-2">
                  {allAvailablePeople.map((person) => {
                    const isSelected = (currentTransportLeg as EventTransportLeg).occupants?.some(
                      (occ) => occ.id === person.id && occ.type === person.type
                    ) || false;
                    
                    const vehicle = (currentTransportLeg as EventTransportLeg).assignedVehicleId 
                      ? appState.vehicles.find(v => v.id === (currentTransportLeg as EventTransportLeg).assignedVehicleId)
                      : null;
                    const currentOccupants = (currentTransportLeg as EventTransportLeg).occupants?.length || 0;
                    let maxCapacity = Infinity;
                    
                    if (vehicle && vehicle.seats) {
                      maxCapacity = vehicle.seats;
                    } else if ((currentTransportLeg as EventTransportLeg).assignedVehicleId === "perso") {
                      maxCapacity = 5;
                    }
                    
                    const assignedPeople = getAssignedPeople();
                    const isAssignedElsewhere = assignedPeople.has(`${person.id}-${person.type}`) && !isSelected;
                    const isDisabled = (!isSelected && currentOccupants >= maxCapacity);
                    
                    return (
                      <label
                        key={`${person.id}-${person.type}`}
                        className={`flex items-center space-x-2 text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleOccupantChange(person.id, person.type)}
                          disabled={isDisabled}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className={`${person.isParticipant ? "font-semibold text-blue-700" : "text-gray-600"} ${isDisabled ? 'text-gray-400' : ''}`}>
                          {person.name}
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            person.type === 'rider' 
                              ? 'bg-pink-100 text-pink-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {person.type === "rider" ? getRiderRoleLabel(person.id) : "staff"}
                          </span>
                          {person.isParticipant && " - Participant"}
                          {isAssignedElsewhere && (
                            <span className="text-orange-500 text-xs ml-1" title={getPersonAssignments(person.id, person.type).join(', ')}>
                              ⚠️ (Aussi assigné ailleurs)
                            </span>
                          )}
                          {!isSelected && currentOccupants >= maxCapacity && !isAssignedElsewhere && (
                            <span className="text-red-500 text-xs ml-1">(Véhicule plein)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Étapes intermédiaires - Version simplifiée */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Récupérations / Déposes
                </label>
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                  onClick={handleAddStop}
                  icon={<PlusCircleIcon className="w-4 h-4" />}
                >
                  Ajouter une étape
                  </ActionButton>
              </div>
              
              <div className="space-y-4">
                {(currentTransportLeg as EventTransportLeg).intermediateStops?.map((stop, index) => (
                  <div key={stop.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Qui récupère */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          👤 Qui récupère
                        </label>
                                                                        <select
                          value={stop.persons?.[0]?.id || ""}
                          onChange={(e) => {
                            const personId = e.target.value;
                            if (personId) {
                              const person = allAvailablePeople.find(p => p.id === personId);
                              if (person) {
                                handleStopPersonChange(index, personId, person.type);
                              }
                            } else {
                              // Supprimer la personne de l'étape et des occupants
                      setCurrentTransportLeg((prev) => {
                        const updated = structuredClone(prev);
                                if (updated.intermediateStops && updated.intermediateStops[index]) {
                                  const currentPerson = updated.intermediateStops[index].persons?.[0];
                                  updated.intermediateStops[index].persons = [];
                                  
                                  // Retirer aussi des occupants si c'était la seule étape de récupération
                                  if (currentPerson && updated.occupants) {
                                    updated.occupants = updated.occupants.filter(
                                      (occ) => !(occ.id === currentPerson.id && occ.type === currentPerson.type)
                                    );
                                  }
                                }
                        return updated;
                      });
                            }
                          }}
                          className={lightSelectClasses}
                        >
                          <option value="">Sélectionner une personne...</option>
                          {allAvailablePeople.map((person) => {
                            const assignedPeople = getAssignedPeople();
                            const isAssigned = assignedPeople.has(`${person.id}-${person.type}`);
                            const isCurrentPerson = stop.persons?.[0]?.id === person.id;
                            
                            return (
                              <option 
                                key={`${person.id}-${person.type}`} 
                                value={person.id}
                              >
                                {person.name} {person.type === "rider" ? getRiderRoleLabel(person.id) : "staff"}
                                {isAssigned && !isCurrentPerson ? " ⚠️ (Aussi assigné ailleurs)" : ""}
                              </option>
                            );
                          })}
                        </select>
                </div>

                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📅 Date
                        </label>
                      <input
                        type="date"
                        value={stop.date}
                        onChange={(e) => handleStopChange(index, "date", e.target.value)}
                        className={lightInputClasses}
                      />
                      </div>

                      {/* Quand */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🕐 Heure
                        </label>
                      <input
                        type="time"
                        value={stop.time}
                        onChange={(e) => handleStopChange(index, "time", e.target.value)}
                        className={lightInputClasses}
                      />
                    </div>

                      {/* Où */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📍 Lieu
                        </label>
                        <input
                          type="text"
                          value={stop.location}
                          onChange={(e) => handleStopChange(index, "location", e.target.value)}
                          placeholder="Ex: Aéroport Tours, Gare SNCF..."
                          className={lightInputClasses}
                        />
                      </div>
                    </div>
                    
                    {/* Notes optionnelles */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Notes (optionnel)
                        </label>
                      <input
                        type="text"
                      value={stop.notes || ""}
                      onChange={(e) => handleStopChange(index, "notes", e.target.value)}
                        placeholder="Ex: Terminal 2, Porte 15, Numéro de vol..."
                        className={lightInputClasses}
                      />
                      </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <ActionButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveStop(stop.id)}
                        icon={<TrashIcon className="w-4 h-4" />}
                      >
                        Supprimer
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Détails */}
            <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                Détails {canViewFinancialInfo ? "(N° vol, répartition, prix, etc.)" : "(N° vol, répartition, etc.)"}
              </label>
              <textarea
                name="details"
                id="details"
                value={(currentTransportLeg as EventTransportLeg).details || ""}
                onChange={handleInputChange}
                rows={3}
                className={lightInputClasses}
                placeholder={canViewFinancialInfo ? "N° vol, répartition, prix, etc." : "N° vol, répartition, etc."}
              />
            </div>

            {/* Vol spécial Aurore */}
            {(currentTransportLeg as EventTransportLeg).mode === TransportMode.VOL && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isAuroreFlight"
                  id="isAuroreFlight"
                  checked={(currentTransportLeg as EventTransportLeg).isAuroreFlight || false}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isAuroreFlight" className="ml-2 block text-sm text-gray-900">
                  Ceci est le vol spécial d'Aurore {canViewFinancialInfo ? "(nécessite infos retour/prix)" : "(nécessite infos retour)"}
                </label>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Annuler
              </ActionButton>
              <ActionButton type="submit">
                {isEditing ? "Sauvegarder" : "Ajouter"}
              </ActionButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

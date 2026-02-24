import React, { useState, useEffect, useMemo } from 'react';
import { RaceEvent, OperationalLogisticsDay, OperationalTiming, AppState, EventTransportLeg, TransportDirection, TransportMode, MealDay, OperationalTimingCategory, Rider, StaffRole } from '../../types';
import { MealDay as MealDayEnum } from '../../types'; // For dayName dropdown
import ActionButton from '../../components/ActionButton';
import TrashIcon from '../../components/icons/TrashIcon';
import InformationCircleIcon from '../../components/icons/InformationCircleIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TruckIcon from '../../components/icons/TruckIcon';
import TrophyIcon from '../../components/icons/TrophyIcon';
import CakeIcon from '../../components/icons/CakeIcon';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';
import HandRaisedIcon from '../../components/icons/HandRaisedIcon';


// --- TIME PARSING UTILITIES ---

// Parses a time-of-day string (e.g., "14h30", "8:15") into minutes from midnight.
const parseTimeOfDayToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const cleanedTime = timeStr.trim().split('-')[0].trim();
    const parts = cleanedTime.replace('h', ':').split(':');
    
    if (parts.length > 0) {
        const hours = parseInt(parts[0], 10);
        const minutes = (parts.length > 1 && parts[1]) ? parseInt(parts[1], 10) : 0;
        if (!isNaN(hours) && !isNaN(minutes)) {
            return hours * 60 + minutes;
        }
    }
    return null;
};

// Parses a duration string (e.g., "1h30", "45min") into total minutes.
const parseDurationToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    let remainingStr = timeStr.toLowerCase().trim();
    let totalMinutes = 0;
    
    const hourMatch = remainingStr.match(/^(\d+(?:\.\d+)?)\s*h/);
    if (hourMatch) {
        totalMinutes += parseFloat(hourMatch[1]) * 60;
        remainingStr = remainingStr.replace(hourMatch[0], '').trim();
    }
    
    const minMatch = remainingStr.match(/^(\d+)\s*(?:min|m)?/);
    if (minMatch && minMatch[1]) {
        totalMinutes += parseInt(minMatch[1], 10);
    }

    return totalMinutes > 0 ? totalMinutes : null;
};

// Formats total minutes from midnight into a time-of-day string (e.g., "14h30").
const formatMinutesToTimeOfDay = (totalMinutes: number): string => {
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
};

// Subtracts a duration in minutes from a time-of-day string.
const subtractDurationFromTimeOfDay = (timeOfDayStr: string, minutesToSubtract: number): string | null => {
    const initialMinutes = parseTimeOfDayToMinutes(timeOfDayStr);
    if (initialMinutes === null) return null;
    const resultMinutes = initialMinutes - minutesToSubtract;
    return formatMinutesToTimeOfDay(resultMinutes);
};

// Arrondit une heure au quart d'heure le plus proche
const roundToNearestQuarter = (timeStr: string): string => {
    const minutes = parseTimeOfDayToMinutes(timeStr);
    if (minutes === null) return timeStr;
    
    // Arrondir au quart d'heure le plus proche (0, 15, 30, 45)
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return formatMinutesToTimeOfDay(roundedMinutes);
};


interface EventOperationalLogisticsTabProps {
  event: RaceEvent;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => void;
  appState: AppState;
  viewMode?: 'team' | 'individual'; // Nouveau prop pour le mode d'affichage
  selectedPersonId?: string; // ID de la personne pour le mode individuel
  setEventTransportLegs?: React.Dispatch<React.SetStateAction<EventTransportLeg[]>>; // Pour synchroniser avec les trajets
}

interface AutoTiming extends OperationalTiming {
    targetMealDay: MealDay;
}

const categoryStyles: Record<OperationalTimingCategory, { icon: React.FC<any>; color: string }> = {
    [OperationalTimingCategory.TRANSPORT]: { icon: TruckIcon, color: 'text-blue-500' },
    [OperationalTimingCategory.COURSE]: { icon: TrophyIcon, color: 'text-green-500' },
    [OperationalTimingCategory.REPAS]: { icon: CakeIcon, color: 'text-orange-500' },
    [OperationalTimingCategory.DIVERS]: { icon: InformationCircleIcon, color: 'text-gray-500' },
    [OperationalTimingCategory.MASSAGE]: { icon: HandRaisedIcon, color: 'text-teal-500' },
};

const EventOperationalLogisticsTab: React.FC<EventOperationalLogisticsTabProps> = ({ 
  event, 
  updateEvent, 
  appState, 
  viewMode = 'team', 
  selectedPersonId,
  setEventTransportLegs
}) => {
  const [logistics, setLogistics] = useState<OperationalLogisticsDay[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [deletedAutoTimings, setDeletedAutoTimings] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLogistics(structuredClone(event.operationalLogistics || []));
  }, [event.operationalLogistics]);

  const getOccupantName = (occupantId: string, type: 'rider' | 'staff'): string => {
    const person = type === 'rider'
      ? appState.riders.find(r => r.id === occupantId)
      : appState.staff.find(s => s.id === occupantId);
    return person ? `${person.firstName} ${person.lastName}` : 'Inconnu';
  };

  const getVehicleInfo = (vehicleId: string | undefined, leg?: EventTransportLeg): string => {
    if (!vehicleId) return 'Véhicule personnel';
    if (vehicleId === 'perso') {
      // Pour les véhicules personnels, afficher le nom de la personne
      if (leg && leg.occupants && leg.occupants.length > 0) {
        const occupantName = getOccupantName(leg.occupants[0].id, leg.occupants[0].type);
        return occupantName;
      }
      return 'Véhicule personnel';
    }
    const vehicle = appState.vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Véhicule inconnu';
  };

  const getAllVehiclesInfo = (leg: EventTransportLeg): string => {
    const vehicles: string[] = [];
    
    // Véhicule principal
    if (leg.assignedVehicleId) {
      vehicles.push(getVehicleInfo(leg.assignedVehicleId));
    }
    
    // Ajouter "Véhicule personnel" si il y a des occupants qui utilisent leur véhicule personnel
    // (logique basée sur le fait que certains occupants peuvent avoir leur propre véhicule)
    if (leg.occupants && leg.occupants.length > 0) {
      // Pour l'instant, on ajoute "Véhicule personnel" si il y a des occupants
      // Cette logique peut être affinée selon les besoins
      if (!vehicles.includes('Véhicule personnel')) {
        vehicles.push('Véhicule personnel');
      }
    }
    
    return vehicles.join(', ');
  };



  const autoGeneratedTimings = useMemo(() => {
    const timings: AutoTiming[] = [];
    const dayMap: Record<number, MealDayEnum> = { 0: MealDayEnum.DIMANCHE, 1: MealDayEnum.LUNDI, 2: MealDayEnum.MARDI, 3: MealDayEnum.MERCREDI, 4: MealDayEnum.JEUDI, 5: MealDayEnum.VENDREDI, 6: MealDayEnum.SAMEDI };
    const getTargetMealDay = (dateStr: string | undefined): MealDay | null => {
        if (!dateStr) return null;
        try {
            return dayMap[new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
        } catch { return null; }
    };
    // Fonction pour déterminer si un trajet est individuel (vol personnel, etc.)
    const isIndividualTrip = (leg: EventTransportLeg): boolean => {
        // Un trajet est considéré comme individuel SEULEMENT si :
        // 1. C'est un vol (mode VOL)
        // 2. OU c'est un trajet personnel spécifique (ex: vol d'Axelle)
        // Les véhicules du club (voitures, camping-cars, camions) sont TOUJOURS affichés
        return leg.mode === TransportMode.VOL || 
               leg.details?.toLowerCase().includes('personnel') ||
               leg.details?.toLowerCase().includes('individuel');
    };
    
    // Fonction pour déterminer si un trajet doit être affiché selon le mode
    const shouldShowInTiming = (leg: EventTransportLeg): boolean => {
        if (viewMode === 'individual' && selectedPersonId) {
            // Mode individuel : afficher tous les trajets de cette personne
            return leg.occupants?.some(occ => occ.id === selectedPersonId) || false;
        } else {
            // Mode équipe : afficher TOUS les véhicules du club
            // Seuls les vols personnels sont exclus
            if (leg.mode === TransportMode.VOL) {
                // Pour les vols, afficher seulement s'ils ont des étapes importantes
                return leg.intermediateStops && leg.intermediateStops.length > 0;
            } else {
                // Tous les autres véhicules (voitures, camping-cars, camions) sont TOUJOURS affichés
                return true;
            }
        }
    };
    
    appState.eventTransportLegs.filter(leg => leg.eventId === event.id).forEach(leg => {
        // Filtrer les trajets selon le mode d'affichage
        if (!shouldShowInTiming(leg)) {
            return; // Skip les trajets non pertinents
        }
        
        const isIndividual = isIndividualTrip(leg);
        
                // Afficher les départs de véhicules (sauf véhicules personnels)
        if (leg.departureDate && leg.departureTime) {
            const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
            
            // Ne pas afficher les départs des véhicules personnels
            if (leg.assignedVehicleId !== 'perso') {
                const targetDay = getTargetMealDay(leg.departureDate);
                if (targetDay) {
                    const description = `Départ du ${vehicleName}`;
                    timings.push({
                        id: `auto-transport-depart-${leg.id}`,
                        time: leg.departureTime,
                        description: description,
                        isAutoGenerated: true,
                        targetMealDay: targetDay,
                        category: OperationalTimingCategory.TRANSPORT
                    });
                }
            }
        }
                // Afficher toutes les arrivées de véhicules (collectifs et individuels)
        if (leg.arrivalDate && leg.arrivalTime) {
            const targetDay = getTargetMealDay(leg.arrivalDate);
            if (targetDay) {
                // Créer une description détaillée pour le jour J
                let description = '';
                
                // Format simple pour les arrivées
                const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                if (leg.arrivalLocation) {
                    description = `Arrivée des véhicules à ${leg.arrivalLocation} (${vehicleName})`;
                } else {
                    description = `Arrivée du ${vehicleName}`;
                }
                
                timings.push({
                    id: `auto-transport-arrivee-${leg.id}`,
                    time: leg.arrivalTime,
                    description: description,
                    isAutoGenerated: true,
                    targetMealDay: targetDay,
                    category: OperationalTimingCategory.TRANSPORT
                });
            }
        }
        // Add intermediate stops to the timeline
        if (leg.intermediateStops && leg.intermediateStops.length > 0) {
            leg.intermediateStops.forEach(stop => {
                const targetDay = getTargetMealDay(stop.date);
                if (targetDay && stop.time) {
                    // Informations sur le véhicule pour cette étape
                    const vehicleInfo = getVehicleInfo(leg.assignedVehicleId);
                    
                    // Déterminer le type d'étape avec emoji
                    let stopTypeLabel = '';
                    let emoji = '';
                    let isSimpleFormat = false;
                    
                    switch (stop.stopType) {
                        case 'AIRPORT_ARRIVAL':
                        case 'Arrivée aéroport':
                            stopTypeLabel = 'Vol arrive';
                            emoji = '✈️';
                            isSimpleFormat = true;
                            break;
                        case 'TRAIN_STATION_ARRIVAL':
                        case 'Arrivée gare':
                            stopTypeLabel = 'Train arrive';
                            emoji = '🚂';
                            isSimpleFormat = true;
                            break;
                        case 'PICKUP':
                        case 'Récupération':
                            stopTypeLabel = 'Récupération';
                            emoji = '👥';
                            break;
                        case 'DROPOFF':
                        case 'Dépose':
                            stopTypeLabel = 'Dépose';
                            emoji = '🚪';
                            break;
                        case 'MEETING_POINT':
                        case 'Lieu de rendez-vous':
                            stopTypeLabel = 'Rendez-vous';
                            emoji = '📍';
                            break;
                        case 'HOME_PICKUP':
                        case 'Récupération domicile':
                            stopTypeLabel = 'Récupération domicile';
                            emoji = '🏠';
                            break;
                        default:
                            stopTypeLabel = 'Étape';
                            emoji = '🛑';
                    }

                    const personsConcerned = stop.persons.map(p => getOccupantName(p.id, p.type)).join(', ');
                    let description = '';
                    
                                        // Format simple pour toutes les étapes
                    if (personsConcerned) {
                        const vehicleName = getVehicleInfo(leg.assignedVehicleId, leg);
                        description = `${stop.location} - Récupération ${personsConcerned} par ${vehicleName}`;
                    } else {
                        description = `${stop.location}`;
                    }

                    timings.push({
                        id: `auto-stop-${stop.id}`,
                        time: stop.time,
                        description: description,
                        isAutoGenerated: true,
                        targetMealDay: targetDay,
                        category: OperationalTimingCategory.TRANSPORT
                    });
                }
            });
        }
    });

    const { raceInfo } = event;
    if (raceInfo) {
      // Jour J : event.date en priorité, sinon permanence ou réunion DS pour que les départs apparaissent
      const mainEventDay = getTargetMealDay(event.date)
        || getTargetMealDay(raceInfo.permanenceDate)
        || getTargetMealDay(raceInfo.reunionDSDate);
      
      // Permanence
      if (raceInfo.permanenceTime) {
        const targetDay = getTargetMealDay(raceInfo.permanenceDate) || mainEventDay;
        if (targetDay) {
          timings.push({ 
            id: 'auto-permanence', 
            time: raceInfo.permanenceTime, 
            description: '📋 Permanence', 
            isAutoGenerated: true, 
            targetMealDay: targetDay, 
            category: OperationalTimingCategory.COURSE 
          });
        }
      }
      
      // Réunion Directeurs Sportifs
      if (raceInfo.reunionDSTime) {
        const targetDay = getTargetMealDay(raceInfo.reunionDSDate) || getTargetMealDay(raceInfo.permanenceDate) || mainEventDay;
        if (targetDay) {
          timings.push({ 
            id: 'auto-reunionDS', 
            time: raceInfo.reunionDSTime, 
            description: "👥 Réunion Directeurs Sportifs", 
            isAutoGenerated: true, 
            targetMealDay: targetDay, 
            category: OperationalTimingCategory.COURSE 
          });
        }
      }
      
      // Jour J - Événements principaux (départs course, présentation, arrivée sur site)
      if (mainEventDay) {
        // Départ réel de la course (toujours affiché si renseigné)
        if (raceInfo.departReelTime) {
          timings.push({ 
            id: 'auto-departReel', 
            time: raceInfo.departReelTime, 
            description: '🏁 Départ Réel', 
            isAutoGenerated: true, 
            targetMealDay: mainEventDay, 
            category: OperationalTimingCategory.COURSE 
          });
          
          // Repas avant le départ (3h avant)
          const mealTime = subtractDurationFromTimeOfDay(raceInfo.departReelTime, 180);
          if (mealTime) {
            timings.push({ 
              id: 'auto-repas', 
              time: mealTime, 
              description: '🍽️ Repas', 
              isAutoGenerated: true, 
              targetMealDay: mainEventDay, 
              category: OperationalTimingCategory.REPAS 
            });
          }
        }
        
        // Départ fictif (toujours affiché si renseigné)
        if (raceInfo.departFictifTime) {
          timings.push({ 
            id: 'auto-departFictif', 
            time: raceInfo.departFictifTime, 
            description: '🚩 Départ Fictif', 
            isAutoGenerated: true, 
            targetMealDay: mainEventDay, 
            category: OperationalTimingCategory.COURSE 
          });
        }
        
        // Présentation des équipes
        if (raceInfo.presentationTime) {
          timings.push({ 
            id: 'auto-presentation', 
            time: raceInfo.presentationTime, 
            description: '🎤 Présentation des équipes', 
            isAutoGenerated: true, 
            targetMealDay: mainEventDay, 
            category: OperationalTimingCategory.COURSE 
          });
          
          // Arrivée sur site (30min avant présentation)
          const arrivalOnSiteTime = subtractDurationFromTimeOfDay(raceInfo.presentationTime, 30);
          if (arrivalOnSiteTime) {
            timings.push({ 
              id: 'auto-arriveeSite', 
              time: arrivalOnSiteTime, 
              description: '📍 Arrivée sur site', 
              isAutoGenerated: true, 
              targetMealDay: mainEventDay, 
              category: OperationalTimingCategory.COURSE 
            });
          }
        }
        
        // Arrivée prévue
        if (raceInfo.arriveePrevueTime) {
          const arrivalDay = getTargetMealDay(event.endDate || event.date);
          if (arrivalDay) {
            timings.push({ 
              id: 'auto-arrivee', 
              time: raceInfo.arriveePrevueTime, 
              description: '🏆 Arrivée Prévue', 
              isAutoGenerated: true, 
              targetMealDay: arrivalDay, 
              category: OperationalTimingCategory.COURSE 
            });
          }
        }
      }
    }
    
    // Départ Hôtel et petit-déjeuner : à partir de l'arrivée sur site (ou d'une heure de référence si pas de présentation)
    const arrivalOnSiteTiming = timings.find(t => t.id === 'auto-arriveeSite');
    const raceInfoRef = event.raceInfo;
    const mainEventDayForHotel = raceInfoRef
      ? (getTargetMealDay(event.date) || getTargetMealDay(raceInfoRef.permanenceDate) || getTargetMealDay(raceInfoRef.reunionDSDate))
      : null;
    const accommodation = appState.eventAccommodations.find(a => a.eventId === event.id && !a.isStopover);
    const referenceArrivalTime = arrivalOnSiteTiming?.time ?? (raceInfoRef?.departFictifTime ? subtractDurationFromTimeOfDay(raceInfoRef.departFictifTime, 30) : raceInfoRef?.departReelTime ? subtractDurationFromTimeOfDay(raceInfoRef.departReelTime, 60) : null);
    const dayForHotel = arrivalOnSiteTiming?.targetMealDay ?? mainEventDayForHotel;

    if (referenceArrivalTime && dayForHotel && accommodation?.travelTimeToStart) {
      const travelDurationMinutes = parseDurationToMinutes(accommodation.travelTimeToStart);
      if (travelDurationMinutes !== null) {
        const totalTravelMinutesWithMargin = Math.ceil(travelDurationMinutes * 1.1);
        const hotelDepartureTime = subtractDurationFromTimeOfDay(referenceArrivalTime, totalTravelMinutesWithMargin);
        if (hotelDepartureTime) {
          const hasDepartHotel = timings.some(t => t.id === 'auto-departHotel');
          if (!hasDepartHotel) {
            timings.push({
              id: 'auto-departHotel',
              time: hotelDepartureTime,
              description: '🏨 Départ Hôtel',
              isAutoGenerated: true,
              targetMealDay: dayForHotel,
              category: OperationalTimingCategory.TRANSPORT
            });
          }
          const hasBreakfast = timings.some(t => t.id === 'auto-petitDejeuner');
          if (!hasBreakfast) {
            const breakfastTime = subtractDurationFromTimeOfDay(hotelDepartureTime, 90);
            if (breakfastTime) {
              timings.push({
                id: 'auto-petitDejeuner',
                time: breakfastTime,
                description: '🥐 Petit-déjeuner',
                isAutoGenerated: true,
                targetMealDay: dayForHotel,
                category: OperationalTimingCategory.REPAS
              });
            }
          }
        }
      }
    }
    
    // Ajouter le dîner du soir (si c'est un événement multi-jours)
    if (event.endDate && event.endDate !== event.date) {
        const endDay = getTargetMealDay(event.endDate);
        if (endDay) {
            // Dîner à 19h30 le soir de l'arrivée
            timings.push({
                id: 'auto-diner',
                time: '19h30',
                description: '🍽️ Dîner',
                isAutoGenerated: true,
                targetMealDay: endDay,
                category: OperationalTimingCategory.REPAS
            });
        }
    }

    return timings;
  }, [event, appState.eventTransportLegs, appState.eventAccommodations]);

  const mainEventDayName = useMemo(() => {
    const dayMap: Record<number, MealDayEnum> = { 0: MealDayEnum.DIMANCHE, 1: MealDayEnum.LUNDI, 2: MealDayEnum.MARDI, 3: MealDayEnum.MERCREDI, 4: MealDayEnum.JEUDI, 5: MealDayEnum.VENDREDI, 6: MealDayEnum.SAMEDI };
    if (!event.date) return null;
    try {
        return dayMap[new Date(`${event.date}T12:00:00Z`).getUTCDay()];
    } catch { return null; }
  }, [event.date]);

  const displayLogistics = useMemo(() => {
    const mergedDays: Record<string, OperationalLogisticsDay> = {};

    logistics.forEach(day => {
        mergedDays[day.dayName] = structuredClone(day);
    });

    autoGeneratedTimings.forEach(autoTiming => {
        const dayName = autoTiming.targetMealDay;
        const isAlreadyPresent = logistics.some(day => day.dayName === dayName && day.keyTimings.some(t => t.id === autoTiming.id));
        const isDeleted = deletedAutoTimings.has(autoTiming.id);

        if (!isAlreadyPresent && !isDeleted) {
            if (!mergedDays[dayName]) {
                mergedDays[dayName] = { id: `day-${dayName}`, dayName, keyTimings: [] };
            }
            mergedDays[dayName].keyTimings.push({ ...autoTiming, isOverridden: false });
        }
    });

    let finalDays = Object.values(mergedDays);
    finalDays.forEach(day => day.keyTimings.sort((a, b) => (parseTimeOfDayToMinutes(a.time) ?? 9999) - (parseTimeOfDayToMinutes(b.time) ?? 9999)));

    // Logique de groupement simplifiée (uniquement en mode équipe)
    const groupedDays = finalDays.map(day => {
        // En mode individuel, ne pas grouper les timings
        if (viewMode === 'individual') {
            return day;
        }
        
        const newKeyTimings: OperationalTiming[] = [];
        const processedIndices = new Set<number>();

        for (let i = 0; i < day.keyTimings.length; i++) {
            if (processedIndices.has(i)) continue;

            const currentTiming = day.keyTimings[i];
            
                        // Grouper les arrivées identiques
            if (currentTiming.description.includes('Arrivée des véhicules')) {
                const time = currentTiming.time;
                const baseDescription = currentTiming.description.replace(/\([^)]*\)/, '').trim();
                
                // Chercher d'autres arrivées identiques et collecter les véhicules
                const vehicles: string[] = [];
                const vehicleMatch = currentTiming.description.match(/\(([^)]+)\)/);
                if (vehicleMatch) {
                    vehicles.push(vehicleMatch[1]);
                }
                
                for (let j = i + 1; j < day.keyTimings.length; j++) {
                    if (processedIndices.has(j)) continue;
                    
                    const nextTiming = day.keyTimings[j];
                    if (nextTiming.time === time && 
                        nextTiming.description.includes('Arrivée des véhicules')) {
                        
                        const nextVehicleMatch = nextTiming.description.match(/\(([^)]+)\)/);
                        if (nextVehicleMatch) {
                            vehicles.push(nextVehicleMatch[1]);
                        }
                        processedIndices.add(j);
                    }
                }
                
                // Créer la description groupée avec tous les véhicules
                const uniqueVehicles = [...new Set(vehicles)];
                const location = baseDescription.replace('Arrivée des véhicules à ', '');
                const groupedDescription = `Arrivée des véhicules à ${location} (${uniqueVehicles.join(', ')})`;
                
                newKeyTimings.push({
                    ...currentTiming,
                    description: groupedDescription
                });
            } else if (currentTiming.description.includes('Départ du')) {
                // Grouper les départs identiques
                const time = currentTiming.time;
                const vehicleName = currentTiming.description.replace('Départ du ', '');
                
                // Chercher d'autres départs à la même heure
                const vehicles: string[] = [vehicleName];
                
                for (let j = i + 1; j < day.keyTimings.length; j++) {
                    if (processedIndices.has(j)) continue;
                    
                    const nextTiming = day.keyTimings[j];
                    if (nextTiming.time === time && 
                        nextTiming.description.includes('Départ du')) {
                        
                        const nextVehicleName = nextTiming.description.replace('Départ du ', '');
                        vehicles.push(nextVehicleName);
                        processedIndices.add(j);
                    }
                }
                
                // Créer la description groupée avec tous les véhicules
                if (vehicles.length > 1) {
                    const uniqueVehicles = [...new Set(vehicles)];
                    const groupedDescription = `Départ des véhicules (${uniqueVehicles.join(', ')})`;
                    
                    newKeyTimings.push({
                        ...currentTiming,
                        description: groupedDescription
                    });
                } else {
                    newKeyTimings.push(currentTiming);
                }
            } else {
                // Pour tous les autres timings, les ajouter normalement
                newKeyTimings.push(currentTiming);
            }
        }
        return { ...day, keyTimings: newKeyTimings };
    });

    return groupedDays.sort((a, b) => Object.values(MealDayEnum).indexOf(a.dayName) - Object.values(MealDayEnum).indexOf(b.dayName));
  }, [logistics, autoGeneratedTimings]);
  
  const handleTimingChange = (dayId: string, dayNameForCreation: MealDay, timing: OperationalTiming, field: keyof OperationalTiming, value: any) => {
    setLogistics(currentLogistics => {
        const updatedLogistics = structuredClone(currentLogistics);
        let dayIndex = updatedLogistics.findIndex(d => d.id === dayId);

        if (dayIndex === -1) {
            const newDay: OperationalLogisticsDay = { id: dayId, dayName: dayNameForCreation, keyTimings: [] };
            updatedLogistics.push(newDay);
            dayIndex = updatedLogistics.length - 1; 
        }
        
        let dayToUpdate = updatedLogistics[dayIndex];
        let timingIndex = dayToUpdate.keyTimings.findIndex(t => t.id === timing.id);
        
        let processedValue = value;
        if (field === 'order') {
          processedValue = value === '' ? undefined : parseInt(value, 10);
        }

        if (timingIndex > -1) {
          // Editing existing timing
          (dayToUpdate.keyTimings[timingIndex] as any)[field] = processedValue;
          if (dayToUpdate.keyTimings[timingIndex].isAutoGenerated) {
              dayToUpdate.keyTimings[timingIndex].isOverridden = true;
          }
        } else {
          // Adding a new timing
          const newTiming = { ...timing, [field]: processedValue, isOverridden: timing.isAutoGenerated, id: timing.id || Date.now().toString() };
          dayToUpdate.keyTimings.push(newTiming as OperationalTiming);
        }

        // Synchronisation avec les trajets de transport si c'est un timing de transport
        if (field === 'time' && timing.isAutoGenerated && setEventTransportLegs) {
          // Arrondir l'heure au quart d'heure le plus proche
          const roundedTime = roundToNearestQuarter(processedValue);
          syncTimingWithTransportLegs(timing.id, roundedTime);
          
          // Mettre à jour aussi l'affichage avec l'heure arrondie
          if (timingIndex > -1) {
            (dayToUpdate.keyTimings[timingIndex] as any)[field] = roundedTime;
          }
        }

        return updatedLogistics;
    });
};

  // Fonction pour synchroniser les modifications de timing avec les trajets de transport
  const syncTimingWithTransportLegs = (timingId: string, newTime: string) => {
    if (!setEventTransportLegs) return;

    // Extraire l'ID du trajet depuis l'ID du timing
    const legIdMatch = timingId.match(/auto-transport-(depart|arrivee)-(.+)/);
    const stopIdMatch = timingId.match(/auto-stop-(.+)/);
    
    if (legIdMatch) {
      // Synchronisation pour les départs/arrivées principaux
      const timingType = legIdMatch[1]; // 'depart' ou 'arrivee'
      const legId = legIdMatch[2];

      setEventTransportLegs(prevLegs => {
        return prevLegs.map(leg => {
          if (leg.id === legId) {
            const updatedLeg = { ...leg };
            
            if (timingType === 'depart') {
              updatedLeg.departureTime = newTime;
            } else if (timingType === 'arrivee') {
              updatedLeg.arrivalTime = newTime;
            }
            
            return updatedLeg;
          }
          return leg;
        });
      });
    } else if (stopIdMatch) {
      // Synchronisation pour les étapes intermédiaires
      const stopId = stopIdMatch[1];

      setEventTransportLegs(prevLegs => {
        return prevLegs.map(leg => {
          if (leg.intermediateStops) {
            const updatedLeg = { ...leg };
            updatedLeg.intermediateStops = leg.intermediateStops.map(stop => {
              if (stop.id === stopId) {
                return { ...stop, time: newTime };
              }
              return stop;
            });
            return updatedLeg;
          }
          return leg;
        });
      });
    }
};


  const handleDayNameChange = (dayId: string, newDayName: MealDay) => {
    setLogistics(prev => prev.map(day => day.id === dayId ? { ...day, dayName: newDayName } : day));
  };

  const addDay = () => setLogistics(prev => [...prev, { id: Date.now().toString(), dayName: MealDayEnum.AUTRE, keyTimings: [] }]);
  const removeDay = (dayIdToRemove: string) => setLogistics(prev => prev.filter(day => day.id !== dayIdToRemove));
  
  const addTimingToDay = (dayId: string, predefinedType?: string) => {
    const day = displayLogistics.find(d => d.id === dayId);
    if (!day) return;
    
    let newTiming: Partial<OperationalTiming> = {
      id: Date.now().toString(), 
      time: '', 
      description: '', 
      isAutoGenerated: false, 
      category: OperationalTimingCategory.DIVERS
    };
    
    // Timings prédéfinis
    if (predefinedType) {
      switch (predefinedType) {
        case 'reveil':
          newTiming = {
            ...newTiming,
            description: '⏰ Réveil',
            category: OperationalTimingCategory.DIVERS
          };
          break;
        case 'petit-dejeuner':
          newTiming = {
            ...newTiming,
            description: '🥐 Petit-déjeuner',
            category: OperationalTimingCategory.REPAS
          };
          break;
        case 'dejeuner':
          newTiming = {
            ...newTiming,
            description: '🍽️ Déjeuner',
            category: OperationalTimingCategory.REPAS
          };
          break;
        case 'diner':
          newTiming = {
            ...newTiming,
            description: '🍽️ Dîner',
            category: OperationalTimingCategory.REPAS
          };
          break;
        case 'briefing':
          newTiming = {
            ...newTiming,
            description: '📋 Briefing',
            category: OperationalTimingCategory.COURSE
          };
          break;
        case 'reunion':
          newTiming = {
            ...newTiming,
            description: '👥 Réunion',
            category: OperationalTimingCategory.COURSE
          };
          break;
        case 'massage':
          newTiming = {
            ...newTiming,
            description: '💆 Massage',
            category: OperationalTimingCategory.MASSAGE
          };
          break;
        case 'velo':
          newTiming = {
            ...newTiming,
            description: '🚴 Départ à vélo de l\'hôtel',
            category: OperationalTimingCategory.TRANSPORT
          };
          break;
        default:
          break;
      }
    }
    
    handleTimingChange(dayId, day.dayName, newTiming as OperationalTiming, 'description', newTiming.description || '');
  };

  const removeTimingFromDay = (dayId: string, timingId: string) => {
    // Vérifier si c'est un timing auto-généré
    const isAutoGenerated = autoGeneratedTimings.some(timing => timing.id === timingId);
    
    if (isAutoGenerated) {
      // Ajouter à la liste des timings auto-générés supprimés
      setDeletedAutoTimings(prev => new Set([...prev, timingId]));
    }
    
    setLogistics(prev => prev.map(day => {
      if (day.id === dayId) {
        return { ...day, keyTimings: day.keyTimings.filter(t => t.id !== timingId) };
      }
      return day;
    }));
  };

  const selectAllTimingsForDay = (dayId: string) => {
    setSelectedDay(dayId);
  };

  const deselectAllTimingsForDay = (dayId: string) => {
    setLogistics(prev => prev.map(day => {
      if (day.id === dayId) {
        return { ...day, keyTimings: [] };
      }
      return day;
    }));
  };

  const toggleDaySelection = (dayId: string) => {
    if (selectedDay === dayId) {
      setSelectedDay(null);
    } else {
      setSelectedDay(dayId);
    }
  };

  const restoreDeletedAutoTimings = () => {
    setDeletedAutoTimings(new Set());
  };

  const handleSave = () => {
    updateEvent({ operationalLogistics: logistics });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLogistics(structuredClone(event.operationalLogistics || []));
    setIsEditing(false);
  };
  
  const lightInputClass = "block w-full px-2 py-1 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 text-xs";
  
  // Obtenir le nom de la personne pour le mode individuel
  const getPersonName = (): string => {
    if (viewMode === 'individual' && selectedPersonId) {
      const rider = appState.riders.find(r => r.id === selectedPersonId);
      const staff = appState.staff.find(s => s.id === selectedPersonId);
      if (rider) return `${rider.firstName} ${rider.lastName}`;
      if (staff) return `${staff.firstName} ${staff.lastName}`;
    }
    return '';
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-700">
            {viewMode === 'individual' 
              ? `Timing Personnel - ${getPersonName()}` 
              : 'Logistique Opérationnelle (Timing par Jour)'
            }
          </h3>
          {viewMode === 'individual' && (
            <p className="text-sm text-gray-500 mt-1">
              Affichage des trajets et timings personnels uniquement
            </p>
          )}
        </div>
        {!isEditing && viewMode === 'team' && (
          <ActionButton onClick={() => setIsEditing(true)} variant="primary">
            Modifier Timings
          </ActionButton>
        )}
      </div>

      {isEditing && viewMode === 'team' ? (
        <div className="space-y-4">
          {deletedAutoTimings.size > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">
                      Timings auto-générés supprimés
                    </h3>
                    <p className="text-yellow-700">
                      {deletedAutoTimings.size} timing{deletedAutoTimings.size > 1 ? 's' : ''} auto-généré{deletedAutoTimings.size > 1 ? 's' : ''} supprimé{deletedAutoTimings.size > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={restoreDeletedAutoTimings}
                >
                  Restaurer tous
                </ActionButton>
              </div>
            </div>
          )}
          {displayLogistics.map(day => {
            return (
            <div key={day.id} className={`p-3 border rounded-md ${selectedDay === day.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}>
              <div className="flex items-center mb-2">
                <select value={day.dayName} onChange={(e) => handleDayNameChange(day.id, e.target.value as MealDay)} className={`${lightInputClass} font-semibold !w-auto mr-2`}>
                  {Object.values(MealDayEnum).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {day.dayName === mainEventDayName && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">JOUR J</span>}
                
                {/* Boutons de sélection par jour */}
                <div className="flex gap-1 ml-2">
                  <ActionButton 
                    type="button" 
                    variant={selectedDay === day.id ? "primary" : "secondary"} 
                    size="sm" 
                    onClick={() => toggleDaySelection(day.id)} 
                    className="!p-1 text-xs"
                  >
                    {selectedDay === day.id ? "Sélectionné" : "Sélectionner"}
                  </ActionButton>
                  <ActionButton 
                    type="button" 
                    variant="danger" 
                    size="sm" 
                    onClick={() => deselectAllTimingsForDay(day.id)} 
                    className="!p-1 text-xs"
                  >
                    Vider
                  </ActionButton>
                </div>
                
                <ActionButton type="button" variant="danger" size="sm" onClick={() => removeDay(day.id)} className="ml-auto !p-1"><TrashIcon className="w-4 h-4"/></ActionButton>
              </div>
              
               <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-2">Catégorie</div>
                <div className="col-span-2">Heure</div>
                <div className="col-span-7">Description / Personnes</div>
                <div className="col-span-1"></div>
              </div>

              {day.keyTimings.map(timing => {
                const isMassage = timing.category === OperationalTimingCategory.MASSAGE;
                return (
                  <div key={timing.id} className="grid grid-cols-12 gap-2 mb-1 items-center">
                    <div className="col-span-2">
                        <select
                            value={timing.category || OperationalTimingCategory.DIVERS}
                            onChange={e => handleTimingChange(day.id, day.dayName, timing, 'category', e.target.value)}
                            className={lightInputClass}
                        >{Object.values(OperationalTimingCategory).map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select>
                    </div>
                    <div className="col-span-2">
                        <input 
                          type="text" 
                          value={timing.time} 
                          onChange={e => handleTimingChange(day.id, day.dayName, timing, 'time', e.target.value)} 
                          placeholder="ex: 14h" 
                          className={lightInputClass}
                          title={timing.isAutoGenerated ? "Heure automatiquement arrondie au quart d'heure le plus proche" : ""}
                        />
                        {timing.isAutoGenerated && timing.isOverridden && (
                          <span className="text-xs text-blue-600 ml-1">⏰</span>
                        )}
                    </div>
                    
                    {isMassage ? (
                      <>
                        <div className="col-span-2">
                            <select
                                value={timing.personId || ''}
                                onChange={e => handleTimingChange(day.id, day.dayName, timing, 'personId', e.target.value)}
                                className={lightInputClass}
                            >
                                <option value="">- Coureur -</option>
                                {appState.riders
                                    .filter(r => event.selectedRiderIds.includes(r.id))
                                    .map(r => <option key={r.id} value={r.id}>{`${r.firstName} ${r.lastName}`}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <select
                                value={timing.masseurId || ''}
                                onChange={e => handleTimingChange(day.id, day.dayName, timing, 'masseurId', e.target.value)}
                                className={lightInputClass}
                            >
                                <option value="">- Masseur -</option>
                                {appState.staff
                                    .filter(s => (s.role === StaffRole.KINE || s.role === StaffRole.ASSISTANT) && event.selectedStaffIds.includes(s.id))
                                    .map(s => <option key={s.id} value={s.id}>{`${s.firstName} ${s.lastName}`}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <input type="number" value={timing.order ?? ''} onChange={e => handleTimingChange(day.id, day.dayName, timing, 'order', e.target.value)} placeholder="Ordre" className={lightInputClass}/>
                        </div>
                      </>
                    ) : null}
                    
                    <div className={isMassage ? 'col-span-2' : 'col-span-7'}>
                        <input type="text" value={timing.description} onChange={e => handleTimingChange(day.id, day.dayName, timing, 'description', e.target.value)} placeholder="Description" className={lightInputClass} />
                    </div>
                    
                    <div className="col-span-1">
                        <ActionButton type="button" variant="danger" size="sm" onClick={() => removeTimingFromDay(day.id, timing.id)} className="!p-1 w-full"><TrashIcon className="w-4 h-4 mx-auto"/></ActionButton>
                    </div>
                  </div>
                )
              })}
              <div className="mt-2 flex gap-2">
                <ActionButton type="button" variant="secondary" size="sm" onClick={() => addTimingToDay(day.id)} className="text-xs" icon={<PlusCircleIcon className="w-3 h-3 mr-1"/>}>
                  Timing Libre
              </ActionButton>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      addTimingToDay(day.id, e.target.value);
                      e.target.value = ''; // Reset selection
                    }
                  }}
                  className="text-xs px-2 py-1 border rounded-md bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                >
                  <option value="">+ Timing Prédéfini</option>
                  <option value="reveil">⏰ Réveil</option>
                  <option value="petit-dejeuner">🥐 Petit-déjeuner</option>
                  <option value="dejeuner">🍽️ Déjeuner</option>
                  <option value="diner">🍽️ Dîner</option>
                  <option value="briefing">📋 Briefing</option>
                  <option value="reunion">👥 Réunion</option>
                  <option value="massage">💆 Massage</option>
                  <option value="velo">🚴 Départ à vélo</option>
                </select>
              </div>
            </div>
            )
          })}
          <div className="text-center mt-4 pt-4 border-t">
            <ActionButton type="button" variant="secondary" onClick={addDay} icon={<PlusCircleIcon className="w-4 h-4 mr-1"/>}>
                Ajouter une journée
            </ActionButton>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <ActionButton type="button" variant="secondary" onClick={handleCancel}>Annuler</ActionButton>
            <ActionButton type="button" onClick={handleSave}>Sauvegarder Timings</ActionButton>
          </div>
        </div>
      ) : (
        <>


          {displayLogistics.length > 0 ? (
          displayLogistics.map(day => (
            <div key={day.id} className="p-3 mb-3 border rounded-md bg-gray-50">
              <h4 className="text-md font-semibold text-gray-700 mb-1 flex items-center">
                  {day.dayName}
                  {day.dayName === mainEventDayName && <span className="ml-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">JOUR J</span>}
              </h4>
              <ul className="space-y-1">
                {day.keyTimings.map(timing => {
                  const category = timing.category || OperationalTimingCategory.DIVERS;
                  const Icon = categoryStyles[category].icon;
                  const color = categoryStyles[category].color;
                  const title = timing.isAutoGenerated ? (timing.isOverridden ? 'Automatique, modifié' : 'Automatique') : 'Manuel';
                  
                  let description = timing.description || "N/A";
                  if (category === OperationalTimingCategory.MASSAGE && timing.personId) {
                      const riderName = getOccupantName(timing.personId, 'rider');
                      description = `${description}: ${riderName} ${timing.order ? `(#${timing.order})` : ''}`;
                      if (timing.masseurId) {
                          const masseurName = getOccupantName(timing.masseurId, 'staff');
                          description += ` par ${masseurName}`;
                      }
                  }

                  return (
                    <li key={timing.id} className="flex items-start py-2 border-b border-gray-200 last:border-b-0">
                      <span title={title} className="flex-shrink-0 mt-0.5">
                        {timing.isOverridden ? 
                            <PencilIcon className="w-4 h-4 mr-2 text-purple-600"/> :
                            <Icon className={`w-4 h-4 mr-2 ${color}`}/>
                        }
                      </span>
                      <span className="font-semibold w-20 text-gray-700">{timing.time || "N/A"}:</span>
                      <div className="flex-1">
                        <span className="text-gray-900 leading-relaxed">{description}</span>

                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">Aucune logistique opérationnelle définie.</p>
        )}
        </>
      )}

      {viewMode === 'individual' && displayLogistics.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">👤</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun timing personnel</h3>
          <p className="text-gray-500">
            {getPersonName()} n'a pas de trajets ou timings personnels planifiés pour cet événement.
          </p>
        </div>
      )}

      {!isEditing && viewMode === 'team' && (
         <div className="mt-6 pt-4 border-t">
            <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center"><InformationCircleIcon className="w-5 h-5 mr-2 text-blue-500"/>Légende</h4>
            <ul className="text-xs text-gray-600 space-y-1">
                {Object.entries(categoryStyles).map(([cat, style]) => {
                    const Icon = style.icon;
                    return (
                         <li key={cat} className="flex items-center"><Icon className={`w-4 h-4 mr-2 flex-shrink-0 ${style.color}`}/> Timing de catégorie '{cat}'.</li>
                    );
                })}
                <li className="flex items-center"><PencilIcon className="w-4 h-4 mr-2 text-purple-600"/> Timing automatique qui a été modifié manuellement.</li>
            </ul>
        </div>
      )}
    </div>
  );
};

export default EventOperationalLogisticsTab;
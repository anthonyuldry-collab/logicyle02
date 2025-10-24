import React, { useState, useMemo } from 'react';
import { RaceEvent, EventTransportLeg, RiderEventSelection, RiderEventStatus, Rider, StaffMember, TransportStop, MealDay, TeamLevel, Discipline, EventType, TransportDirection, EventBudgetItem, BudgetItemCategory, User, TeamRole, EventRaceDocument, DocumentStatus, StaffRole } from '../types';
import { emptyRaceInformation, EVENT_TYPE_COLORS, ELIGIBLE_CATEGORIES_CONFIG } from '../constants'; 
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import ListBulletIcon from '../components/icons/ListBulletIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import CakeIcon from '../components/icons/CakeIcon'; // Added for birthday indicators
import { useTranslations } from '../hooks/useTranslations';
import { jsPDF } from 'jspdf';
import { getAvailableYears, filterEventsByYear, formatEventDate, formatEventDateRange, isPlanningYear } from '../utils/dateUtils';
import { getCurrentSeasonYear, getPlanningYears, getSeasonLabel, getSeasonTransitionStatus } from '../utils/seasonUtils';
import SeasonTransitionIndicator from '../components/SeasonTransitionIndicator';

interface EventsSectionProps {
  raceEvents: RaceEvent[];
  setRaceEvents: (event: RaceEvent) => Promise<void>;
  setEventDocuments: React.Dispatch<React.SetStateAction<EventRaceDocument[]>>;
  navigateToEventDetail: (eventId: string) => void;
  eventTransportLegs: EventTransportLeg[];
  riderEventSelections: RiderEventSelection[]; // Added for filtering
  deleteRaceEvent: (eventId: string) => void;
  // Added for birthday indicators
  riders: Rider[];
  staff: StaffMember[];
  teamLevel?: TeamLevel;
  currentUser: User;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const initialEventFormState: Omit<RaceEvent, 'id' | 'raceInfo' | 'operationalLogistics' | 'selectedRiderIds' | 'selectedStaffIds' | 'selectedVehicleIds' | 'checklistEmailSimulated'> = {
  name: '',
  date: new Date().toISOString().split('T')[0],
  location: '',
  eventType: EventType.COMPETITION,
  eligibleCategory: '',
  discipline: Discipline.ROUTE,
  minRiders: undefined,
  maxRiders: undefined,
};

// Helper to check for transport legs
const hasTransportLeg = (
  eventId: string,
  direction: TransportDirection,
  allTransportLegs: EventTransportLeg[]
): boolean => {
  return allTransportLegs.some(leg => leg.eventId === eventId && leg.direction === direction);
};

interface EventDisplayInfo extends RaceEvent {
  showDepartureIndicator?: boolean;
  showReturnIndicator?: boolean;
  isDepartureDay?: boolean;
}

const getEventDisplayInfoForDay = (
  date: Date,
  allRaceEvents: RaceEvent[],
  allTransportLegs: EventTransportLeg[]
): Array<EventDisplayInfo> => {
    const eventsForDay = new Map<string, EventDisplayInfo>();
    const currentDateMidnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
    const currentDateStr = currentDateMidnight.toISOString().split('T')[0];

    // 1. Add ongoing events
    allRaceEvents.forEach((event: RaceEvent) => {
        const eventStartDate = new Date(event.date + "T12:00:00Z");
        const eventEndDate = event.endDate ? new Date(event.endDate + "T23:59:59Z") : eventStartDate;
        if (currentDateMidnight >= eventStartDate && currentDateMidnight <= eventEndDate) {
            eventsForDay.set(event.id, { ...event });
        }
    });

    // 2. Add events with departures on this day
    allTransportLegs.forEach((leg: EventTransportLeg) => {
        if (leg.direction === TransportDirection.ALLER && leg.departureDate === currentDateStr) {
            const event = allRaceEvents.find(e => e.id === leg.eventId);
            if (event && !eventsForDay.has(event.id)) { // Add only if not already present
                eventsForDay.set(event.id, { ...event, isDepartureDay: true });
            }
        }
    });

    // 3. Set indicators for all events on the list
    return Array.from(eventsForDay.values()).map((event: EventDisplayInfo) => {
        const eventStartDate = new Date(event.date + "T12:00:00Z");
        const eventEndDate = event.endDate ? new Date(event.endDate + "T23:59:59Z") : eventStartDate;
        const isStartDay = currentDateMidnight.getTime() === eventStartDate.getTime();
        const isEndDay = currentDateMidnight.getTime() === eventEndDate.getTime();
        
        return {
            ...event,
            showDepartureIndicator: event.isDepartureDay || (isStartDay && hasTransportLeg(event.id, TransportDirection.ALLER, allTransportLegs)),
            showReturnIndicator: isEndDay && hasTransportLeg(event.id, TransportDirection.RETOUR, allTransportLegs),
        };
    }).sort((a: EventDisplayInfo, b: EventDisplayInfo) => a.name.localeCompare(b.name));
};

const getCategoryLabel = (id: string = ''): string => {
    const category = ELIGIBLE_CATEGORIES_CONFIG.flatMap(g => g.categories).find(cat => cat.id === id);
    return category ? category.label : id;
};

const parseTimeForSorting = (timeStr: string): number => {
    if (!timeStr) return 9999; // Put empty times at the end
    const cleanedTime = timeStr.trim().split('-')[0].trim();
    const parts = cleanedTime.replace('h', ':').split(':');
    
    if (parts.length > 0) {
        const hours = parseInt(parts[0], 10);
        const minutes = (parts.length > 1 && parts[1]) ? parseInt(parts[1], 10) : 0;
        
        if (!isNaN(hours) && !isNaN(minutes)) {
            return hours * 60 + minutes;
        }
    }
    return 9999;
};


export const EventsSection = ({ 
    raceEvents, 
    setRaceEvents, 
    setEventDocuments,
    navigateToEventDetail, 
    eventTransportLegs,
    riderEventSelections,
    deleteRaceEvent,
    riders,
    staff,
    teamLevel,
    currentUser,
}: EventsSectionProps): JSX.Element => {
  // Protection minimale - seulement raceEvents est requis
  if (!raceEvents) {
    return (
      <SectionWrapper title="Gestion des Événements">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
          <p className="mt-2 text-gray-500">Initialisation des données des événements...</p>
        </div>
      </SectionWrapper>
    );
  }

  const { t } = useTranslations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEventForModal, setCurrentEventForModal] = useState<Omit<RaceEvent, 'id' | 'raceInfo' | 'operationalLogistics' | 'selectedRiderIds' | 'selectedStaffIds' | 'selectedVehicleIds' | 'checklistEmailSimulated'> & { eligibleCategory: string; discipline: Discipline; endDate?: string }>(
    { ...initialEventFormState, eligibleCategory: '', discipline: Discipline.ROUTE }
  );
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [displayDate, setDisplayDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'table'>('monthly');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [sortColumn, setSortColumn] = useState<'name' | 'date' | 'location' | 'eventType' | 'discipline' | 'eligibleCategory'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  // NOTE: Filtering by team level has been removed as per last valid user request to simplify event creation
  const filteredRaceEvents = raceEvents;

  // Obtenir toutes les années disponibles dans les événements
  const getAvailableYearsList = () => {
    const eventYears = getAvailableYears(filteredRaceEvents, event => event.date);
    const planningYears = getPlanningYears();
    
    // Combiner les années d'événements et de planification, en supprimant les doublons
    const allYears = [...new Set([...eventYears, ...planningYears])];
    return allYears.sort((a, b) => b - a); // Tri décroissant
  };

  // Filtrer les événements par année
  const getFilteredEvents = () => filterEventsByYear(filteredRaceEvents, yearFilter, event => event.date);

  // Grouper les événements par année pour la vue annuelle
  const eventsByYear = useMemo(() => {
    const grouped: { [year: number]: { [month: number]: RaceEvent[] } } = {};
    filteredRaceEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth();
      
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      grouped[year][month].push(event);
    });
    return grouped;
  }, [filteredRaceEvents]);

  // Fonction de tri pour les événements
  const sortEvents = (events: RaceEvent[], column: string, direction: 'asc' | 'desc') => {
    return [...events].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        case 'eventType':
          aValue = a.eventType.toLowerCase();
          bValue = b.eventType.toLowerCase();
          break;
        case 'discipline':
          aValue = a.discipline.toLowerCase();
          bValue = b.discipline.toLowerCase();
          break;
        case 'eligibleCategory':
          aValue = a.eligibleCategory.toLowerCase();
          bValue = b.eligibleCategory.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Événements triés pour la vue tableau
  const sortedEvents = useMemo(() => {
    const filteredEvents = getFilteredEvents();
    return sortEvents(filteredEvents, sortColumn, sortDirection);
  }, [filteredRaceEvents, sortColumn, sortDirection, yearFilter]);

  // Gestionnaire de clic pour trier
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };


  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Gestion spéciale pour les champs numériques
    if (name === 'minRiders' || name === 'maxRiders') {
      const numValue = value === '' ? undefined : parseInt(value);
      setCurrentEventForModal(prev => ({ ...prev, [name]: numValue }));
    } else {
      setCurrentEventForModal(prev => ({ ...prev, [name]: name === 'endDate' && value === '' ? undefined : value }));
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditingModal && editingEventId) {
        const updatedEvent: RaceEvent = {
            ...(raceEvents.find(ev => ev.id === editingEventId) as RaceEvent), 
            name: currentEventForModal.name,
            date: currentEventForModal.date,
            endDate: currentEventForModal.endDate || currentEventForModal.date, 
            location: currentEventForModal.location,
            eventType: currentEventForModal.eventType,
            eligibleCategory: currentEventForModal.eligibleCategory,
            discipline: currentEventForModal.discipline,
            minRiders: currentEventForModal.minRiders,
            maxRiders: currentEventForModal.maxRiders,
        };
        await setRaceEvents(updatedEvent);
        navigateToEventDetail(editingEventId);
    } else {
        const newEvent: RaceEvent = {
            name: currentEventForModal.name,
            date: currentEventForModal.date,
            endDate: currentEventForModal.endDate || currentEventForModal.date,
            location: currentEventForModal.location,
            eventType: currentEventForModal.eventType,
            eligibleCategory: currentEventForModal.eligibleCategory,
            discipline: currentEventForModal.discipline,
            minRiders: currentEventForModal.minRiders,
            maxRiders: currentEventForModal.maxRiders,
            id: generateId(),
            raceInfo: { ...emptyRaceInformation },
            operationalLogistics: [],
            selectedRiderIds: [],
            selectedStaffIds: [],
            selectedVehicleIds: [],
            checklistEmailSimulated: false,
        };
        await setRaceEvents(newEvent);
        
        // Generate PDF Roadbook
        const doc = new jsPDF();
        
        // Page 1: Riders
        doc.setFontSize(22);
        doc.text(`Roadbook - ${newEvent.name}`, 105, 20, { align: 'center' });
        doc.setFontSize(16);
        doc.text('Page Coureurs', 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Date:', 20, 40);
        doc.text(new Date(newEvent.date + 'T12:00:00Z').toLocaleDateString('fr-FR'), 40, 40);
        doc.text('Lieu:', 20, 50);
        doc.text(newEvent.location, 40, 50);

        doc.text('Équipe sélectionnée:', 20, 60);
        doc.text('[Liste des coureurs à compléter]', 25, 67);

        doc.text('Staff:', 20, 80);
        doc.text('[Liste du staff à compléter]', 25, 87);

        doc.text('Timing clé:', 20, 100);
        doc.text('[Horaires à compléter]', 25, 107);
        
        doc.text('Hébergement:', 20, 120);
        doc.text('[Adresse de l\'hôtel à compléter]', 25, 127);

        // Page 2: Staff
        doc.addPage();
        doc.setFontSize(22);
        doc.text(`Roadbook - ${newEvent.name}`, 105, 20, { align: 'center' });
        doc.setFontSize(16);
        doc.text('Page Staff', 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Fréquence Radio:', 20, 40);
        doc.text('[À compléter]', 60, 40);

        doc.text('Contacts Organisation:', 20, 50);
        doc.text('[À compléter]', 65, 50);

        doc.text('Véhicules:', 20, 60);
        doc.text('[Liste des véhicules et chauffeurs à compléter]', 25, 67);
        
        const roadbookPdfDataUri = doc.output('datauristring');

        const newRoadbookDocument: EventRaceDocument = {
          id: generateId(),
          eventId: newEvent.id,
          name: `Roadbook - ${newEvent.name}`,
          status: DocumentStatus.EN_COURS,
          fileLinkOrPath: roadbookPdfDataUri,
          notes: 'Généré automatiquement à la création de l\'événement.',
        };
        
        // Generate PDF Licenses
        const licenseDoc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const keyStaffIds = new Set<string>();
        (newEvent.directeurSportifId || []).forEach(id => keyStaffIds.add(id));
        (newEvent.assistantId || []).forEach(id => keyStaffIds.add(id));
        (newEvent.mecanoId || []).forEach(id => keyStaffIds.add(id));

        const selectedKeyStaff = staff.filter(s => keyStaffIds.has(s.id));
        const selectedRiders = riders.filter(r => newEvent.selectedRiderIds.includes(r.id));

        const allParticipants = [...selectedRiders, ...selectedKeyStaff];

        let x = 15;
        let y = 20;
        const licenseWidth = 85.6;
        const licenseHeight = 53.98;
        const pageMargin = 15;
        const xMargin = 10;
        const yMargin = 15;

        licenseDoc.setFontSize(16);
        licenseDoc.text(`Licences - ${newEvent.name}`, 105, 15, { align: 'center' });

        allParticipants.forEach((person) => {
            licenseDoc.setFontSize(10);
            const personType = 'licenseNumber' in person ? 'Coureur' : (person as StaffMember).role;
            licenseDoc.text(`${person.firstName} ${person.lastName} (${personType})`, x, y - 2);

            if (person.licenseImageBase64 && person.licenseImageMimeType) {
                try {
                    const extension = person.licenseImageMimeType.split('/')[1] || 'jpeg';
                    licenseDoc.addImage(`data:${person.licenseImageMimeType};base64,${person.licenseImageBase64}`, extension.toUpperCase(), x, y, licenseWidth, licenseHeight);
                } catch (e) {
                    console.warn(`⚠️ Error adding image for ${person.firstName} ${person.lastName}:`, e);
                    licenseDoc.rect(x, y, licenseWidth, licenseHeight, 'S');
                    licenseDoc.text('Erreur image', x + licenseWidth / 2, y + licenseHeight / 2, { align: 'center' });
                }
            } else {
                licenseDoc.rect(x, y, licenseWidth, licenseHeight, 'S');
                licenseDoc.text('Licence manquante', x + licenseWidth / 2, y + licenseHeight / 2, { align: 'center' });
            }
            
            x += licenseWidth + xMargin;
            if (x + licenseWidth > 210) { // page width is 210mm
                x = pageMargin;
                y += licenseHeight + yMargin;
                if (y + licenseHeight > 297) { // page height is 297mm
                    licenseDoc.addPage();
                    licenseDoc.setFontSize(16);
                    licenseDoc.text(`Licences - ${newEvent.name} (suite)`, 105, 15, { align: 'center' });
                    y = 20;
                }
            }
        });

        const licensesPdfDataUri = licenseDoc.output('datauristring');
        const newLicensesDocument: EventRaceDocument = {
            id: generateId(),
            eventId: newEvent.id,
            name: `Licences - ${newEvent.name}`,
            status: DocumentStatus.FAIT,
            fileLinkOrPath: licensesPdfDataUri,
            notes: 'Généré automatiquement à la création de l\'événement.',
        };

        setEventDocuments(prevDocs => [...prevDocs, newRoadbookDocument, newLicensesDocument]);

        navigateToEventDetail(newEvent.id);
    }
    setIsModalOpen(false);
    setCurrentEventForModal({ ...initialEventFormState, eligibleCategory: '', discipline: Discipline.ROUTE });
    setIsEditingModal(false);
    setEditingEventId(null);
  };
  
  const openAddModal = (dateForNewEvent?: string) => {
    setCurrentEventForModal({ 
        ...initialEventFormState, 
        date: dateForNewEvent || new Date().toISOString().split('T')[0],
        endDate: dateForNewEvent || new Date().toISOString().split('T')[0],
        eligibleCategory: '',
        discipline: Discipline.ROUTE,
    });
    setIsEditingModal(false);
    setEditingEventId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: RaceEvent) => {
    setCurrentEventForModal({
        name: event.name,
        date: event.date,
        endDate: event.endDate || event.date,
        location: event.location,
        eventType: event.eventType,
        eligibleCategory: event.eligibleCategory,
        discipline: event.discipline,
        minRiders: event.minRiders,
        maxRiders: event.maxRiders,
    });
    setIsEditingModal(true);
    setEditingEventId(event.id);
    setIsModalOpen(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-200', 'border-blue-400');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-200', 'border-blue-400');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-200', 'border-blue-400');
    const eventId = e.dataTransfer.getData('text/plain');
    const newDateStr = e.currentTarget.getAttribute('data-date');
    if (!eventId || !newDateStr) return;

    const eventToUpdate = raceEvents.find(ev => ev.id === eventId);
    if (eventToUpdate) {
        const originalDate = new Date(eventToUpdate.date + "T12:00:00Z");
        const newDate = new Date(newDateStr + "T12:00:00Z");
        
        let newEndDate: string | undefined = undefined;
        if (eventToUpdate.endDate) {
            const diffTime = Math.abs(new Date(eventToUpdate.endDate).getTime() - originalDate.getTime());
            const newEndDateObj = new Date(newDate.getTime() + diffTime);
            newEndDate = newEndDateObj.toISOString().split('T')[0];
        } else {
            newEndDate = newDateStr;
        }
        
        const updatedEvent = { ...eventToUpdate, date: newDateStr, endDate: newEndDate };
        await setRaceEvents(updatedEvent);
    }
  };

  const month = displayDate.getMonth();
  const year = displayDate.getFullYear();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Fonction pour rendre la vue mensuelle (existante)
  const renderMonthlyView = () => (
    <>
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 border-b pb-2 mb-1">
        {daysOfWeek.map(day => <div key={day}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`empty-start-${i}`} className="h-32 bg-gray-100 rounded-md border"></div>)}
        {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
          const dayNumber = dayIndex + 1;
          const currentDate = new Date(Date.UTC(year, month, dayNumber));
          const currentDateStr = currentDate.toISOString().split('T')[0];
          
          const today = new Date();
          const isToday = today.getUTCFullYear() === year && 
                          today.getUTCMonth() === month &&
                          today.getUTCDate() === dayNumber;
          
          const eventsForDay = getEventDisplayInfoForDay(currentDate, filteredRaceEvents, eventTransportLegs);
          const birthdaysForDay = [...riders, ...staff].filter(p => p.birthDate && p.birthDate.substring(5) === currentDateStr.substring(5));

          return (
            <div
              key={dayNumber}
              className={`h-32 border rounded-md p-1 overflow-y-auto text-xs relative ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
              onClick={() => openAddModal(currentDateStr)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-date={currentDateStr}
            >
              <span className={`font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{dayNumber}</span>
              <div className="mt-1 space-y-0.5">
                {eventsForDay.map(event => (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', event.id)}
                    onClick={(e) => { e.stopPropagation(); navigateToEventDetail(event.id); }}
                    className={`p-1 rounded text-[10px] leading-tight cursor-pointer hover:opacity-80 ${EVENT_TYPE_COLORS[event.eventType]}`}
                  >
                    <span className="font-medium">{event.name}</span>
                  </div>
                ))}
                {birthdaysForDay.map(person => (
                  <div key={person.id} className="p-1 rounded text-[10px] bg-pink-100 text-pink-800 flex items-center">
                    <CakeIcon className="w-3 h-3 mr-1"/> {person.firstName} {person.lastName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {Array.from({ length: (7 - (adjustedFirstDay + daysInMonth) % 7) % 7 }).map((_, i) => <div key={`empty-end-${i}`} className="h-32 bg-gray-100 rounded-md border"></div>)}
      </div>
    </>
  );

  // Fonction pour rendre la vue annuelle
  const renderYearlyView = () => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const yearEvents = eventsByYear[currentYear] || {};
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((monthName, monthIndex) => {
          const monthEvents = yearEvents[monthIndex] || [];
          return (
            <div key={monthIndex} className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">{monthName} {currentYear}</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthEvents.length > 0 ? (
                  monthEvents.map(event => (
                    <div key={event.id} className="p-2 rounded border text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => navigateToEventDetail(event.id)}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-800 text-xs truncate">{event.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${EVENT_TYPE_COLORS[event.eventType]}`}>
                          {event.eventType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatEventDateRange(event, { 
                          day: 'numeric', 
                          month: 'short'
                        })} - {event.location}
                      </p>
                      <p className="text-xs text-gray-500">{event.discipline}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm italic">Aucun événement</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Fonction pour rendre la vue tableau
  const renderTableView = () => {
    const getSortIcon = (column: typeof sortColumn) => {
      if (sortColumn !== column) {
        return (
          <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
      }
      return sortDirection === 'asc' ? (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      ) : (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Événement
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center">
                  Lieu
                  {getSortIcon('location')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('eventType')}
              >
                <div className="flex items-center">
                  Type
                  {getSortIcon('eventType')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('discipline')}
              >
                <div className="flex items-center">
                  Discipline
                  {getSortIcon('discipline')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('eligibleCategory')}
              >
                <div className="flex items-center">
                  Catégorie
                  {getSortIcon('eligibleCategory')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Limites Athlètes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedEvents.map(event => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{event.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatEventDateRange(event)}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatEventDate(event.date, { 
                    weekday: 'short',
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{event.location}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${EVENT_TYPE_COLORS[event.eventType]}`}>
                    {event.eventType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{event.discipline}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{event.eligibleCategory}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {event.minRiders || event.maxRiders ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-600">
                        {event.minRiders || 0}-{event.maxRiders || '∞'}
                      </span>
                      <span className="text-xs text-gray-400">coureurs</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Non défini</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigateToEventDetail(event.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => openEditModal(event)}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Modifier
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <SectionWrapper
      title="Gestion des Événements"
      actionButton={<ActionButton onClick={() => openAddModal()} icon={<PlusCircleIcon className="w-5 h-5"/>}>Ajouter Événement</ActionButton>}
    >
      {/* Calendrier des événements */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          {viewMode === 'monthly' && (
            <>
              <ActionButton onClick={() => setDisplayDate(new Date(year, month - 1, 1))} variant="secondary" size="sm" icon={<ChevronLeftIcon className="w-4 h-4"/>} />
              <ActionButton onClick={() => setDisplayDate(new Date(year, month + 1, 1))} variant="secondary" size="sm" icon={<ChevronRightIcon className="w-4 h-4"/>} />
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-semibold text-gray-800 w-48 text-center">
                  {displayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <SeasonTransitionIndicator 
                  seasonYear={getCurrentSeasonYear()} 
                  showDetails={false}
                />
              </div>
            </>
          )}
          {viewMode === 'yearly' && (
            <div className="flex items-center space-x-2">
              <ActionButton onClick={() => setCurrentYear(currentYear - 1)} variant="secondary" size="sm" icon={<ChevronLeftIcon className="w-4 h-4"/>} />
              <h3 className="text-xl font-semibold text-gray-800 w-32 text-center">{currentYear}</h3>
              <ActionButton onClick={() => setCurrentYear(currentYear + 1)} variant="secondary" size="sm" icon={<ChevronRightIcon className="w-4 h-4"/>} />
            </div>
          )}
          {viewMode === 'table' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Liste des Événements</h3>
              <p className="text-sm text-gray-600 mt-1">
                {sortedEvents.length} événement{sortedEvents.length > 1 ? 's' : ''}
                {yearFilter !== 'all' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    📅 {yearFilter}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2 sm:mt-0">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="show-all-events" checked={showAllEvents} onChange={(e) => setShowAllEvents(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <label htmlFor="show-all-events" className="text-sm text-gray-600">Afficher toutes les courses</label>
          </div>
          {viewMode === 'table' && (
            <div className="flex items-center space-x-2">
              <label htmlFor="year-filter" className="text-sm text-gray-600">Année :</label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Toutes les années</option>
                {getAvailableYearsList().map(year => {
                  const seasonStatus = getSeasonTransitionStatus(year);
                  const isPlanning = isPlanningYear(year);
                  const isCurrentSeason = year === getCurrentSeasonYear();
                  
                  return (
                    <option key={year} value={year}>
                      {getSeasonLabel(year)} {isPlanning ? '📅' : ''} {isCurrentSeason ? '⭐' : ''}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => setYearFilter(2026)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  yearFilter === 2026 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📅 Planification 2026
              </button>
              <button
                onClick={() => setYearFilter('all')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  yearFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Toutes les années
              </button>
            </div>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Annuel
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tableau
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'monthly' && renderMonthlyView()}
      {viewMode === 'yearly' && renderYearlyView()}
      {viewMode === 'table' && renderTableView()}
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditingModal ? "Modifier Événement" : "Nouvel Événement"}>
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom de l'événement</label>
            <input type="text" name="name" id="name" value={currentEventForModal.name} onChange={handleModalInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900 placeholder-gray-500"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date de début</label>
              <input type="date" name="date" id="date" value={currentEventForModal.date} onChange={handleModalInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"/>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Date de fin (si étape)</label>
              <input type="date" name="endDate" id="endDate" value={currentEventForModal.endDate || ''} onChange={handleModalInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"/>
            </div>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Lieu</label>
            <input type="text" name="location" id="location" value={currentEventForModal.location} onChange={handleModalInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">Type</label>
              <select name="eventType" id="eventType" value={currentEventForModal.eventType} onChange={handleModalInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900">
                {Object.values(EventType).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="discipline" className="block text-sm font-medium text-gray-700">Discipline</label>
              <select name="discipline" id="discipline" value={currentEventForModal.discipline} onChange={handleModalInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900">
                {Object.values(Discipline).filter(d => d !== Discipline.TOUS).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="eligibleCategory" className="block text-sm font-medium text-gray-700">Catégorie de l'épreuve</label>
            <input 
              type="text" 
              name="eligibleCategory" 
              id="eligibleCategory" 
              value={currentEventForModal.eligibleCategory} 
              onChange={handleModalInputChange} 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900 placeholder-gray-500"
              placeholder="Ex: Elite Nationale, UCI 1.1, etc."
            />
          </div>
          
          {/* Section Limites de sélection */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Limites de sélection des athlètes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minRiders" className="block text-sm font-medium text-gray-700">Nombre minimum d'athlètes</label>
                <input 
                  type="number" 
                  name="minRiders" 
                  id="minRiders" 
                  min="0"
                  max="20"
                  value={currentEventForModal.minRiders || ''} 
                  onChange={handleModalInputChange} 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"
                  placeholder="Ex: 4"
                />
                <p className="mt-1 text-xs text-gray-500">Nombre minimum de coureurs requis pour cet événement</p>
              </div>
              <div>
                <label htmlFor="maxRiders" className="block text-sm font-medium text-gray-700">Nombre maximum d'athlètes</label>
                <input 
                  type="number" 
                  name="maxRiders" 
                  id="maxRiders" 
                  min="1"
                  max="20"
                  value={currentEventForModal.maxRiders || ''} 
                  onChange={handleModalInputChange} 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"
                  placeholder="Ex: 6"
                />
                <p className="mt-1 text-xs text-gray-500">Nombre maximum de coureurs autorisés pour cet événement</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                💡 <strong>Conseil :</strong> Ces limites seront utilisées dans le planning de saison pour contrôler les sélections d'athlètes.
                <br />
                <span className="text-xs">Exemples : Course classique (4-6), Championnat (6-8), Course locale (2-4)</span>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</ActionButton>
            <ActionButton type="submit">{isEditingModal ? "Sauvegarder" : "Créer"}</ActionButton>
          </div>
        </form>
      </Modal>
    </SectionWrapper>
  );
};
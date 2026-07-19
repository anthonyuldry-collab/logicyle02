
import React, { useState, useEffect } from 'react';
import { 
  AppState, 
  RaceEvent, 
  RiderEventSelection,
  EventTransportLeg, EventAccommodation, EventRaceDocument, 
  EventRadioEquipment, EventRadioAssignment, 
  EventBudgetItem, EventChecklistItem,   PerformanceEntry as AppPerformanceEntry, AppSection, User, TeamState, GlobalState, PeerRating,
  PermissionLevel,
  Vehicle,
  RiderSelfDebrief,
  PartnerMediaItem,
  PartnerRaceReport,
  Mission,
} from './types';
import ActionButton from './components/ActionButton'; 
import CalendarDaysIcon from './components/icons/CalendarDaysIcon'; 
import HomeIcon from './components/icons/HomeIcon'; 
import TrashIcon from './components/icons/TrashIcon';
import ConfirmationModal from './components/ConfirmationModal';

// Import tab components
import EventInfoTab from './sections/eventDetailTabs/EventInfoTab'; 
import EventParticipantsTab from './sections/eventDetailTabs/EventParticipantsTab'; 
import EventOperationalLogisticsTab from './sections/eventDetailTabs/EventOperationalLogisticsTab'; 
import { EventTransportTab } from './sections/eventDetailTabs/EventTransportTab'; 
import EventAccommodationTab from './sections/eventDetailTabs/EventAccommodationTab'; 
import EventAccommodationHistoryTab from './sections/eventDetailTabs/EventAccommodationHistoryTab';
import EventDocumentsTab from './sections/eventDetailTabs/EventDocumentsTab'; 
import EventBudgetTab from './sections/eventDetailTabs/EventBudgetTab'; 
import EventChecklistTab from './sections/eventDetailTabs/EventChecklistTab'; 
import { EventPerformanceTab } from './sections/eventDetailTabs/EventPerformanceTab'; 
import LogisticsSummaryTab from './sections/eventDetailTabs/LogisticsSummaryTab';
import PeerReviewTab from './sections/eventDetailTabs/PeerReviewTab';
import RiderEventDebriefTab from './sections/eventDetailTabs/RiderEventDebriefTab';
import StageCampMonitoringTab from './sections/eventDetailTabs/StageCampMonitoringTab';
import { getRiderProfileForUser, isRiderAbsentFromEvent } from './utils/eventRiderUtils';
import { useTranslations } from './hooks/useTranslations';
import { getStaffMemberForUser } from './utils/staffMemberUtils';
import { getStaffRoleKey } from './utils/staffRoleUtils';
import {
  getStaffRoleAccessProfile,
  staffRoleHasMissionTab,
} from './utils/staffRoleDataAccess';
import { isTrainingCamp } from './utils/trainingCampUtils';
import AssistantMissionTab from './components/eventMissionTabs/AssistantMissionTab';
import MecanoMissionTab from './components/eventMissionTabs/MecanoMissionTab';
import CommunicationMissionTab from './components/eventMissionTabs/CommunicationMissionTab';
import HealthMissionTab from './components/eventMissionTabs/HealthMissionTab';


interface EventDetailViewProps {
  event: RaceEvent; 
  eventId: string;
  appState: AppState; // Subcomponents need access to the full AppState
  navigateTo: (section: AppSection, eventId?: string) => void; 
  deleteRaceEvent: (eventId: string) => void;
  currentUser: User;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  
  // Setters for team state slices
  setRaceEvents: React.Dispatch<React.SetStateAction<RaceEvent[]>>;
  setEventTransportLegs: React.Dispatch<React.SetStateAction<EventTransportLeg[]>>;
  setEventAccommodations: React.Dispatch<React.SetStateAction<EventAccommodation[]>>;
  setEventDocuments: React.Dispatch<React.SetStateAction<EventRaceDocument[]>>;
  setEventRadioEquipments: React.Dispatch<React.SetStateAction<EventRadioEquipment[]>>;
  setEventRadioAssignments: React.Dispatch<React.SetStateAction<EventRadioAssignment[]>>;
  setEventBudgetItems: React.Dispatch<React.SetStateAction<EventBudgetItem[]>>;
  setEventChecklistItems: React.Dispatch<React.SetStateAction<EventChecklistItem[]>>;
  setPerformanceEntries: React.Dispatch<React.SetStateAction<AppPerformanceEntry[]>>;
  setPeerRatings: React.Dispatch<React.SetStateAction<PeerRating[]>>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: React.Dispatch<React.SetStateAction<RiderEventSelection[]>>;
  
  // Firebase save functions
  onSavePerformanceEntry: (item: AppPerformanceEntry) => Promise<void>;
  onSaveRiderSelfDebrief?: (debrief: RiderSelfDebrief) => Promise<void>;
  onSaveRaceEvent?: (event: RaceEvent) => Promise<void>;
  onSavePartnerMediaItem?: (item: PartnerMediaItem) => Promise<void>;
  onDeletePartnerMediaItem?: (itemId: string) => Promise<void>;
  onSavePartnerRaceReport?: (report: PartnerRaceReport) => Promise<void>;
  setMissions?: React.Dispatch<React.SetStateAction<Mission[]>>;
  initialTab?: EventDetailTab;
}

export type EventDetailTab = 
  | 'logisticsSummary'
  | 'info' | 'participants' | 'opLogistics' | 'transport' | 'accommodation' 
  | 'accommodationHistory'
  | 'documents' 
  | 'budget' 
  | 'checklist' 
  | 'peerReview'
  | 'performance'
  | 'riderDebrief'
  | 'staffMission'
  | 'campMonitoring';

function EventDetailView({ 
  event: initialEvent, 
  eventId, 
  appState, 
  navigateTo, 
  deleteRaceEvent, 
  currentUser,
  effectivePermissions,
  setRaceEvents,
  setEventTransportLegs,
  setEventAccommodations,
  setEventDocuments,
  setEventRadioEquipments,
  setEventRadioAssignments,
  setEventBudgetItems,
  setEventChecklistItems,
  setPerformanceEntries,
  setPeerRatings,
  setVehicles,
  riderEventSelections,
  setRiderEventSelections,
  onSavePerformanceEntry,
  onSaveRiderSelfDebrief,
  onSaveRaceEvent,
  onSavePartnerMediaItem,
  onDeletePartnerMediaItem,
  onSavePartnerRaceReport,
  setMissions,
  initialTab,
}: EventDetailViewProps) {
  const [activeTab, setActiveTab] = useState<EventDetailTab>(initialTab ?? 'logisticsSummary');
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, eventId]);

  const [currentEvent, setCurrentEvent] = useState<RaceEvent>(initialEvent);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    const foundEvent = appState.raceEvents.find(e => e.id === eventId);
    if (foundEvent) {
      setCurrentEvent((prev) => {
        if (prev.id !== eventId) return foundEvent;
        const prevDays = prev.raceInfo?.stageDays ?? [];
        const foundDays = foundEvent.raceInfo?.stageDays ?? [];
        if (prevDays.length === 0) return foundEvent;
        const mergedStageDays = foundDays.map((foundDay) => {
          const prevDay =
            prevDays.find((d) => d.id === foundDay.id)
            ?? prevDays.find((d) => d.date === foundDay.date);
          if (!prevDay) return foundDay;
          const prevRavitoLen = prevDay.ravitoVehicles?.length ?? 0;
          const foundRavitoLen = foundDay.ravitoVehicles?.length ?? 0;
          if (prevRavitoLen > foundRavitoLen) {
            return {
              ...foundDay,
              ravitoVehicles: prevDay.ravitoVehicles,
              additionalStaffIds:
                prevDay.additionalStaffIds ?? foundDay.additionalStaffIds,
            };
          }
          return foundDay;
        });
        return {
          ...foundEvent,
          raceInfo: { ...foundEvent.raceInfo, stageDays: mergedStageDays },
        };
      });
    } else {
      navigateTo('events');
    }
  }, [eventId, appState.raceEvents, navigateTo]);


  const updateEventDetails = (updatedEventData: Partial<RaceEvent>): Promise<void> => {
    const mergedEvent = { ...currentEvent, ...updatedEventData };
    setRaceEvents(prevEvents => prevEvents.map(e => e.id === eventId ? mergedEvent : e));
    setCurrentEvent(mergedEvent);
    if (onSaveRaceEvent) {
      return onSaveRaceEvent(mergedEvent).catch((err) => {
        console.error(err);
        alert('Erreur lors de la sauvegarde de l\'événement.');
        throw err;
      });
    }
    return Promise.resolve();
  };
  
  const updateRadioEquipment = (equipmentOrUpdater: EventRadioEquipment | ((prev: EventRadioEquipment | undefined) => EventRadioEquipment)) => {
    setEventRadioEquipments(prevEquipments => {
        const existingForEvent = prevEquipments.find(eq => eq.eventId === eventId);
        
        const newOrUpdatedEquipment: EventRadioEquipment = typeof equipmentOrUpdater === 'function' 
            ? equipmentOrUpdater(existingForEvent) 
            : equipmentOrUpdater;

        if (existingForEvent) {
            return prevEquipments.map(eq => eq.eventId === eventId ? newOrUpdatedEquipment : eq);
        } else {
            return [...prevEquipments, newOrUpdatedEquipment];
        }
    });
  };

  const updatePerformanceEntry = async (entryOrUpdater: AppPerformanceEntry | ((prev: AppPerformanceEntry | undefined) => AppPerformanceEntry)) => {
    let entryToSave: AppPerformanceEntry;
    
    if (typeof entryOrUpdater === 'function') {
      const existingEntry = appState.performanceEntries.find(p => p.eventId === eventId);
      entryToSave = entryOrUpdater(existingEntry);
    } else {
      entryToSave = entryOrUpdater;
    }

    // Sauvegarder dans Firebase
    await onSavePerformanceEntry(entryToSave);

    // Mettre à jour l'état local
    setPerformanceEntries(prevEntries => {
      const entryIndex = prevEntries.findIndex(p => p.eventId === eventId);
      const newEntries = [...prevEntries];
      if (entryIndex > -1) {
        newEntries[entryIndex] = entryToSave;
      } else {
        newEntries.push(entryToSave);
      }
      return newEntries;
    });
  };

  if (!currentEvent) {
    return (
      <div className="p-4 text-center text-gray-600">
        {t('loading')}
         <ActionButton onClick={() => navigateTo('events')} className="mt-4">
          Retour à la liste des événements
        </ActionButton>
      </div>
    );
  }

  // Filtrer les onglets selon les permissions de l'utilisateur
  const isRider = currentUser.userRole === 'Coureur';
  const riderProfile = getRiderProfileForUser(appState.riders, currentUser);
  const isSelectedRider =
    isRider
    && !!riderProfile
    && !!currentEvent.selectedRiderIds?.includes(riderProfile.id)
    && !isRiderAbsentFromEvent(riderProfile.id, eventId, riderEventSelections);
  const canViewRoster = effectivePermissions?.roster?.includes('view') ?? false;
  const canEditRoster = effectivePermissions?.roster?.includes('edit') ?? false;
  const canViewPerformance = effectivePermissions?.performance?.includes('view') ?? false;
  const canViewFinancial = effectivePermissions?.financial?.includes('view') ?? false;

  const staffMember = getStaffMemberForUser(currentUser, appState.staff);
  const staffRoleKey = staffMember ? getStaffRoleKey(staffMember.role) : null;
  const staffMissionProfile = getStaffRoleAccessProfile(staffRoleKey);
  const showStaffMissionTab = staffRoleHasMissionTab(staffRoleKey);
  const isAssistantRole = staffRoleKey === 'ASSISTANT';
  const isCommunicationRole = staffRoleKey === 'COMMUNICATION';
  const opLogisticsReadOnly = isAssistantRole || isCommunicationRole;
  const canEditMissionLogistics = staffMissionProfile?.canEditEventMissionLogistics ?? false;

  type TabDef = { id: EventDetailTab; label: string };

  const trainingCamp = isTrainingCamp(currentEvent);

  /** Onglets pertinents : course ≠ stage (pas d’éval coéquipiers / débrief course sur un camp). */
  const tabGroups: { label: string; tabs: TabDef[] }[] = [
    {
      label: 'Vue',
      tabs: [
        { id: 'logisticsSummary', label: t('eventTabLogisticsSummary') },
        {
          id: 'info',
          label: trainingCamp ? t('eventTabInfoStage') : t('eventTabInfo'),
        },
        ...(trainingCamp
          ? [{ id: 'campMonitoring' as const, label: t('eventTabCampMonitoring') }]
          : []),
      ],
    },
    ...(showStaffMissionTab && staffMissionProfile
      ? [
          {
            label: 'Mission',
            tabs: [{ id: 'staffMission' as const, label: staffMissionProfile.missionTabLabel }],
          },
        ]
      : []),
    {
      label: 'Équipe',
      tabs: [
        ...(canViewRoster ? [{ id: 'participants' as const, label: t('eventTabParticipants') }] : []),
        // Débriefs / évaluations : réservés aux compétitions
        ...(!trainingCamp && isSelectedRider
          ? [{ id: 'riderDebrief' as const, label: t('eventTabRiderDebrief') }]
          : []),
        ...(!trainingCamp && canViewPerformance
          ? [
              { id: 'peerReview' as const, label: t('eventTabPeerReview') },
              { id: 'performance' as const, label: t('eventTabPerformance') },
            ]
          : []),
      ],
    },
    {
      label: 'Logistique',
      tabs: [
        // Timing course (permanences / créneaux journée) surtout utile en compétition
        ...(!trainingCamp
          ? [{ id: 'opLogistics' as const, label: t('eventTabOpLogistics') }]
          : []),
        { id: 'transport', label: t('eventTabTransport') },
        { id: 'accommodation', label: t('eventTabAccommodation') },
        ...(canViewRoster
          ? [{ id: 'accommodationHistory' as const, label: t('eventTabAccommodationHistory') }]
          : []),
      ],
    },
    {
      label: 'Gestion',
      tabs: [
        ...(canViewRoster ? [{ id: 'documents' as const, label: t('eventTabDocuments') }] : []),
        ...(canViewFinancial ? [{ id: 'budget' as const, label: t('eventTabBudget') }] : []),
        { id: 'checklist', label: t('eventTabChecklist') },
      ],
    },
  ];

  const visibleTabGroups = tabGroups
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => !(isRider && tab.id === 'budget')),
    }))
    .filter((group) => group.tabs.length > 0);

  const visibleTabKey = visibleTabGroups
    .flatMap((g) => g.tabs.map((tab) => tab.id))
    .join(',');

  useEffect(() => {
    const ids = visibleTabKey.split(',').filter(Boolean);
    if (ids.length > 0 && !ids.includes(activeTab)) {
      setActiveTab('logisticsSummary');
    }
  }, [activeTab, visibleTabKey]);

  const eventDetailProps = {
    event: currentEvent,
    eventId,
    appState: appState,
    updateEvent: updateEventDetails,
    riderEventSelections,
    setRiderEventSelections,
  };

  return (
    <div className="min-h-full space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600 shrink-0" />
              {currentEvent.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-8">
              {new Date(currentEvent.date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {currentEvent.location ? ` · ${currentEvent.location}` : ''}
            </p>
          </div>
          <ActionButton onClick={() => navigateTo('events')} icon={<HomeIcon className="w-4 h-4" />} variant="secondary" size="sm">
            Retour
          </ActionButton>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <nav className="space-y-3" aria-label="Onglets événement">
          {visibleTabGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
        <div style={{ display: activeTab === 'logisticsSummary' ? 'block' : 'none' }}>
            <LogisticsSummaryTab
              {...eventDetailProps}
              currentUser={currentUser}
              effectivePermissions={effectivePermissions}
              users={appState.users}
              teamId={appState.activeTeamId}
            />
        </div>
         <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
            <EventInfoTab 
                {...eventDetailProps}
                radioEquipment={appState.eventRadioEquipments.find(eq => eq.eventId === eventId)}
                setRadioEquipment={updateRadioEquipment}
                radioAssignments={appState.eventRadioAssignments.filter(as => as.eventId === eventId)}
                setRadioAssignments={setEventRadioAssignments}
            />
        </div>
        <div style={{ display: activeTab === 'campMonitoring' ? 'block' : 'none' }}>
          {trainingCamp && (
            <StageCampMonitoringTab
              event={currentEvent}
              eventId={eventId}
              appState={appState}
              updateEvent={updateEventDetails}
              readOnly={isRider}
            />
          )}
        </div>
        <div style={{ display: activeTab === 'staffMission' ? 'block' : 'none' }}>
          {staffRoleKey === 'ASSISTANT' && (
            <AssistantMissionTab
              event={currentEvent}
              appState={appState}
              updateEvent={updateEventDetails}
              canEdit={canEditMissionLogistics}
            />
          )}
          {staffRoleKey === 'MECANO' && (
            <MecanoMissionTab event={currentEvent} appState={appState} />
          )}
          {staffRoleKey === 'COMMUNICATION' && (
            <CommunicationMissionTab
              event={currentEvent}
              appState={appState}
              updateEvent={updateEventDetails}
              currentUserId={currentUser?.id}
              onSavePartnerMediaItem={onSavePartnerMediaItem}
              onDeletePartnerMediaItem={onDeletePartnerMediaItem}
              onSavePartnerRaceReport={onSavePartnerRaceReport}
              onNavigatePartnerMedia={() => navigateTo('partnerPortal')}
            />
          )}
          {staffRoleKey === 'KINE' && (
            <HealthMissionTab
              event={currentEvent}
              appState={appState}
              title="Mission soins"
              subtitle="Suivi kiné des athlètes convoqués sur cette épreuve."
            />
          )}
          {staffRoleKey === 'MEDECIN' && (
            <HealthMissionTab
              event={currentEvent}
              appState={appState}
              title="Mission médicale"
              subtitle="Protocoles santé et allergies des partants."
            />
          )}
        </div>
        <div style={{ display: activeTab === 'participants' ? 'block' : 'none' }}>
            <EventParticipantsTab
              {...eventDetailProps}
              appState={appState}
              setMissions={setMissions}
              readOnly={!canEditRoster}
            />
        </div>
        <div style={{ display: activeTab === 'opLogistics' ? 'block' : 'none' }}>
            <EventOperationalLogisticsTab {...eventDetailProps} readOnly={opLogisticsReadOnly} />
        </div>
        <div style={{ display: activeTab === 'transport' ? 'block' : 'none' }}>
            <EventTransportTab 
                {...eventDetailProps}
                setEventTransportLegs={setEventTransportLegs}
                setEventBudgetItems={setEventBudgetItems}
                setVehicles={setVehicles}
                currentUser={currentUser}
                effectivePermissions={effectivePermissions}
            />
        </div>
        <div style={{ display: activeTab === 'accommodation' ? 'block' : 'none' }}>
            <EventAccommodationTab
                {...eventDetailProps}
                setEventAccommodations={setEventAccommodations}
                setEventBudgetItems={setEventBudgetItems}
                currentUser={currentUser}
                effectivePermissions={effectivePermissions}
            />
        </div>
        <div style={{ display: activeTab === 'accommodationHistory' ? 'block' : 'none' }}>
            <EventAccommodationHistoryTab
                {...eventDetailProps}
                setEventAccommodations={setEventAccommodations}
                currentUser={currentUser}
                effectivePermissions={effectivePermissions}
            />
        </div>
        <div style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
            <EventDocumentsTab
                {...eventDetailProps}
                setEventDocuments={setEventDocuments}
            />
        </div>
        {!isRider && (
          <div style={{ display: activeTab === 'budget' ? 'block' : 'none' }}>
              <EventBudgetTab 
                  {...eventDetailProps}
                  setEventBudgetItems={setEventBudgetItems}
                  currentUser={currentUser}
                  effectivePermissions={effectivePermissions}
              />
          </div>
        )}
        <div style={{ display: activeTab === 'checklist' ? 'block' : 'none' }}>
            <EventChecklistTab 
                {...eventDetailProps}
                setEventChecklistItems={setEventChecklistItems}
                currentUser={currentUser}
            />
        </div>
        <div style={{ display: activeTab === 'peerReview' ? 'block' : 'none' }}>
            <PeerReviewTab 
                {...eventDetailProps}
                setPeerRatings={setPeerRatings}
                currentUser={currentUser}
                riderEventSelections={riderEventSelections}
                raterUserId={currentUser.id}
            />
        </div>
        {onSaveRiderSelfDebrief && (
          <div style={{ display: activeTab === 'riderDebrief' ? 'block' : 'none' }}>
            <RiderEventDebriefTab
              event={currentEvent}
              appState={appState}
              currentUser={currentUser}
              riderEventSelections={riderEventSelections}
              setPeerRatings={setPeerRatings}
              onSaveRiderSelfDebrief={onSaveRiderSelfDebrief}
            />
          </div>
        )}
        <div style={{ display: activeTab === 'performance' ? 'block' : 'none' }}>
            <EventPerformanceTab 
                {...eventDetailProps}
                setPerformanceEntry={updatePerformanceEntry}
                currentUser={currentUser}
            />
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex justify-end">
        {!isRider && (
        <ActionButton onClick={() => setIsConfirmDeleteOpen(true)} variant="danger" icon={<TrashIcon className="w-4 h-4"/>}>
          Supprimer cet Événement
        </ActionButton>
        )}
      </div>

       <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => deleteRaceEvent(eventId)}
        title="Supprimer l'Événement"
        message="Êtes-vous sûr de vouloir supprimer cet événement et toutes les données associées ? Cette action est irréversible."
      />
    </div>
  );
}

export default EventDetailView;
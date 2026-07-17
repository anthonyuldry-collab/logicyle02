import React, { useEffect, useMemo } from 'react';
import { RaceEvent, AppState, EventRaceDocument, TeamLevel } from '../../types';
import DocumentsSection from '../DocumentsSection';
import UciFormsWorkflowPanel from '../../components/UciFormsWorkflowPanel';
import {
  ensureUciDocumentsForEvent,
  isUciCategoryEvent,
} from '../../utils/uciFormsWorkflow';
import { getDefaultPlanForTeamLevel } from '../../constants/subscriptionPlans';
import { getSubscriptionAccess } from '../../utils/subscriptionEntitlements';
import { hasUciPdfAccess } from '../../utils/contractUtils';

interface EventDocumentsTabProps {
  event: RaceEvent;
  eventId: string;
  appState: AppState;
  setEventDocuments: React.Dispatch<React.SetStateAction<EventRaceDocument[]>>;
}

const EventDocumentsTab: React.FC<EventDocumentsTabProps> = ({
  event,
  eventId,
  appState,
  setEventDocuments,
}) => {
  const activeTeam =
    appState.teams.find(t => t.id === appState.activeTeamId) ?? appState.teams[0];

  const canExportUciPdf = useMemo(() => {
    const fallback = getDefaultPlanForTeamLevel(appState.teamLevel ?? TeamLevel.HORS_DN);
    const access = getSubscriptionAccess(appState.subscription, fallback);
    return hasUciPdfAccess(access.planId, appState.teamLevel);
  }, [appState.subscription, appState.teamLevel]);

  useEffect(() => {
    if (!isUciCategoryEvent(event, appState.teamLevel)) return;
    const toAdd = ensureUciDocumentsForEvent(event, appState.eventDocuments, appState.teamLevel);
    if (toAdd.length > 0) {
      setEventDocuments(prev => [...prev, ...toAdd]);
    }
  }, [event, appState.eventDocuments, setEventDocuments]);

  const handleUpdateDocument = (doc: EventRaceDocument) => {
    setEventDocuments(prev => prev.map(d => (d.id === doc.id ? doc : d)));
  };

  return (
    <div className="space-y-4">
      {isUciCategoryEvent(event, appState.teamLevel) && (
        <UciFormsWorkflowPanel
          event={event}
          documents={appState.eventDocuments}
          riders={appState.riders}
          staff={appState.staff}
          team={activeTeam}
          teamLevel={appState.teamLevel}
          riderEventSelections={appState.riderEventSelections}
          canExportUciPdf={canExportUciPdf}
          onUpdateDocument={handleUpdateDocument}
        />
      )}
      <DocumentsSection
        documents={appState.eventDocuments.filter(doc => doc.eventId === eventId)}
        setDocuments={updater => {
          const currentDocs = appState.eventDocuments.filter(d => d.eventId === eventId);
          const otherDocs = appState.eventDocuments.filter(d => d.eventId !== eventId);
          const updatedDocs = typeof updater === 'function' ? updater(currentDocs) : updater;
          setEventDocuments([...otherDocs, ...updatedDocs]);
        }}
        eventId={eventId}
      />
    </div>
  );
};

export default EventDocumentsTab;

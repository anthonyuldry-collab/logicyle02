import React, { useMemo } from 'react';
import {
  DocumentStatus,
  EventRaceDocument,
  RaceEvent,
  Rider,
  RiderEventSelection,
  StaffMember,
  Team,
  TeamLevel,
  UciFormStepStatus,
} from '../types';
import ActionButton from './ActionButton';
import {
  UciWorkflowStepView,
  buildUciWorkflowViews,
  isUciCategoryEvent,
  UCI_STEP_STATUS_CLASSES,
  UCI_STEP_STATUS_LABELS,
} from '../utils/uciFormsWorkflow';
import { exportUciEngagementBulletin } from '../utils/uciFormExport';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { useTranslations } from '../hooks/useTranslations';

interface UciFormsWorkflowPanelProps {
  event: RaceEvent;
  documents: EventRaceDocument[];
  riders: Rider[];
  staff?: StaffMember[];
  team?: Team;
  teamLevel?: TeamLevel;
  riderEventSelections?: RiderEventSelection[];
  compact?: boolean;
  canExportUciPdf?: boolean;
  onUpdateDocument?: (doc: EventRaceDocument) => void;
  onOpenDocuments?: () => void;
}

const formatDue = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

const UciFormsWorkflowPanel: React.FC<UciFormsWorkflowPanelProps> = ({
  event,
  documents,
  riders,
  staff = [],
  team,
  teamLevel,
  riderEventSelections = [],
  compact = false,
  canExportUciPdf = true,
  onUpdateDocument,
  onOpenDocuments,
}) => {
  const { t } = useTranslations();
  const views = useMemo(
    () => buildUciWorkflowViews(event, documents, riders),
    [event, documents, riders],
  );

  if (!isUciCategoryEvent(event, teamLevel)) return null;

  const applicableViews = views.filter(v => v.applicable);
  const doneCount = applicableViews.filter(v => v.status === 'done').length;
  const overdueCount = applicableViews.filter(v => v.status === 'overdue').length;

  const handleGeneratePdf = (view: UciWorkflowStepView) => {
    if (!team || !canExportUciPdf) return;
    const selectedRiders = riders.filter(r => (event.selectedRiderIds || []).includes(r.id));
    const selectedStaff = staff.filter(s => (event.selectedStaffIds || []).includes(s.id));
    const variant = view.step.id === 'ENGAGEMENT_J3' ? 'J3' : 'J20';
    exportUciEngagementBulletin({
      team,
      event,
      riders: selectedRiders,
      staff: selectedStaff,
      riderEventSelections,
      variant,
    });
    if (onUpdateDocument && view.document) {
      onUpdateDocument({
        ...view.document,
        status: DocumentStatus.EN_COURS,
        notes: `${view.document.notes ?? ''}\nPDF ${variant} généré le ${new Date().toLocaleDateString('fr-FR')}`.trim(),
      });
    }
  };

  const handleMarkDone = (view: UciWorkflowStepView) => {
    if (!onUpdateDocument || !view.document) return;
    onUpdateDocument({ ...view.document, status: DocumentStatus.FAIT });
  };

  const renderStep = (view: UciWorkflowStepView) => {
    const { step, document, status, dueDate } = view;
    const pdfLabel =
      step.id === 'ENGAGEMENT_J3' ? t('uciGeneratePdfJ3') : t('uciGeneratePdfJ20');

    return (
      <li
        key={step.id}
        className={`rounded-lg border p-3 ${
          status === 'overdue'
            ? 'border-red-200 bg-red-50/50'
            : status === 'done'
            ? 'border-emerald-200 bg-emerald-50/30'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{step.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {step.regulationRef} · {t('uciDeadline')} {formatDue(dueDate)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${UCI_STEP_STATUS_CLASSES[status as UciFormStepStatus]}`}
          >
            {UCI_STEP_STATUS_LABELS[status as UciFormStepStatus]}
          </span>
        </div>

        {(!compact || status === 'overdue' || status === 'due_soon') && (
          <div className="flex flex-wrap gap-2 mt-2">
            {step.canGeneratePdf && team && (
              canExportUciPdf ? (
                <ActionButton size="sm" variant="secondary" onClick={() => handleGeneratePdf(view)}>
                  {pdfLabel}
                </ActionButton>
              ) : (
                <p className="text-[10px] text-violet-700 bg-violet-100 px-2 py-1 rounded">{t('uciPdfPlanHint')}</p>
              )
            )}
            {onUpdateDocument && document && status !== 'done' && (
              <ActionButton size="sm" onClick={() => handleMarkDone(view)}>
                {t('uciMarkDone')}
              </ActionButton>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={`rounded-xl border border-violet-500/30 bg-violet-950/40 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className={`font-semibold text-violet-100 flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'}`}>
            <DocumentTextIcon className="w-4 h-4" />
            {t('uciWorkflowTitle')}
          </h3>
          <p className="text-xs text-violet-200/90 mt-0.5">
            {doneCount}/{applicableViews.length} {t('uciStepsCompleted')}
            {overdueCount > 0 && ` · ${overdueCount} ${t('uciStepsOverdue')}`}
          </p>
          <p className="text-[10px] text-violet-300/80 mt-1">{t('uciWorkflowRegulationHint')}</p>
        </div>
        {onOpenDocuments && (
          <ActionButton size="sm" variant="secondary" onClick={onOpenDocuments}>
            {compact ? t('uciOpenEvent') : t('uciOpenDocuments')}
          </ActionButton>
        )}
      </div>

      <ul className={`space-y-2 ${compact ? 'max-h-64 overflow-y-auto' : ''}`}>
        {(compact ? applicableViews.filter(v => v.status !== 'done').slice(0, 4) : applicableViews).map(renderStep)}
      </ul>

      {compact && applicableViews.some(v => v.status === 'done') && (
        <p className="text-[10px] text-violet-300 mt-2">
          {doneCount} {t('uciStepsValidated')}
        </p>
      )}
    </div>
  );
};

export default UciFormsWorkflowPanel;

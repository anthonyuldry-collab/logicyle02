import React, { useMemo, useState } from 'react';
import {
  IncomeItem,
  PartnerNewsletter,
  PartnerNewsletterBlock,
  RaceEvent,
  Rider,
} from '../types';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';
import {
  PartnerNewsletterTemplateId,
  buildNewsletterFromTemplate,
} from '../utils/partnerNewsletterUtils';

interface PartnerNewsletterEditorProps {
  teamId: string;
  teamName: string;
  sponsorshipItems: IncomeItem[];
  raceEvents: RaceEvent[];
  riders: Rider[];
  newsletters: PartnerNewsletter[];
  canEdit: boolean;
  currentUserId?: string;
  onSave: (newsletter: PartnerNewsletter) => Promise<void>;
  onOpenPartnerPortal?: (incomeItemId?: string) => void;
}

const PRIMARY_TEMPLATES: PartnerNewsletterTemplateId[] = ['sponsor_spotlight', 'rider_interview'];
const SECONDARY_TEMPLATES: PartnerNewsletterTemplateId[] = [
  'race_results',
  'season_calendar',
  'visibility_report',
  'blank',
];

type WorkflowStep = 'finance' | 'sponsor' | 'compose' | 'publish' | 'partner';

function WorkflowStepper({
  activeStep,
  labels,
}: {
  activeStep: WorkflowStep;
  labels: Record<WorkflowStep, string>;
}) {
  const steps: WorkflowStep[] = ['finance', 'sponsor', 'compose', 'publish', 'partner'];
  const activeIndex = steps.indexOf(activeStep);

  return (
    <ol className="flex flex-wrap items-center gap-1 text-[11px] sm:text-xs text-violet-800">
      {steps.map((step, index) => {
        const isPast = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <React.Fragment key={step}>
            {index > 0 && <span className="text-violet-300 px-0.5">→</span>}
            <li
              className={`rounded-full px-2.5 py-1 font-medium border ${
                isActive
                  ? 'bg-violet-600 text-white border-violet-600'
                  : isPast
                    ? 'bg-white text-violet-700 border-violet-200'
                    : 'bg-violet-50/80 text-violet-500 border-violet-100'
              }`}
            >
              {labels[step]}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}

const BLOCK_LABEL_KEYS: Record<string, string> = {
  heading: 'partnerNewsletterBlock_heading',
  paragraph: 'partnerNewsletterBlock_paragraph',
  highlight: 'partnerNewsletterBlock_highlight',
  eventList: 'partnerNewsletterBlock_eventList',
  results: 'partnerNewsletterBlock_results',
  cta: 'partnerNewsletterBlock_cta',
  quote: 'partnerNewsletterBlock_quote',
  interview: 'partnerNewsletterBlock_interview',
  sponsorSpotlight: 'partnerNewsletterBlock_sponsorSpotlight',
};

const PartnerNewsletterEditor: React.FC<PartnerNewsletterEditorProps> = ({
  teamId,
  teamName,
  sponsorshipItems,
  raceEvents,
  riders,
  newsletters,
  canEdit,
  currentUserId,
  onSave,
  onOpenPartnerPortal,
}) => {
  const { t, language } = useTranslations();
  const [selectedIncomeId, setSelectedIncomeId] = useState(sponsorshipItems[0]?.id || '');
  const [templateId, setTemplateId] = useState<PartnerNewsletterTemplateId>('sponsor_spotlight');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [blocks, setBlocks] = useState<PartnerNewsletterBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const sponsorName = useMemo(
    () =>
      sponsorshipItems.find((i) => i.id === selectedIncomeId)?.sponsorCompanyName
      || sponsorshipItems.find((i) => i.id === selectedIncomeId)?.description
      || teamName,
    [sponsorshipItems, selectedIncomeId, teamName],
  );

  const teamNewsletters = useMemo(
    () =>
      newsletters
        .filter((n) => n.teamId === teamId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [newsletters, teamId],
  );

  const sponsorNewsletters = useMemo(
    () =>
      teamNewsletters.filter(
        (n) => !selectedIncomeId || !n.incomeItemId || n.incomeItemId === selectedIncomeId,
      ),
    [teamNewsletters, selectedIncomeId],
  );

  const workflowStep: WorkflowStep = blocks.length > 0 ? 'compose' : 'sponsor';

  const workflowLabels: Record<WorkflowStep, string> = {
    finance: t('commWorkflowFinance'),
    sponsor: t('commWorkflowSponsor'),
    compose: t('commWorkflowCompose'),
    publish: t('commWorkflowPublish'),
    partner: t('commWorkflowPartner'),
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubject('');
    setPreviewText('');
    setBlocks([]);
  };

  const applyTemplate = (id: PartnerNewsletterTemplateId = templateId) => {
    const built = buildNewsletterFromTemplate(id, {
      teamName,
      sponsorName,
      events: raceEvents,
      riders,
      language,
    });
    setTemplateId(id);
    setTitle(built.title);
    setSubject(built.subject);
    setPreviewText(built.previewText || '');
    setBlocks(built.blocks);
    setEditingId(null);
  };

  const loadNewsletter = (newsletter: PartnerNewsletter) => {
    setEditingId(newsletter.id);
    setSelectedIncomeId(newsletter.incomeItemId || selectedIncomeId);
    setTitle(newsletter.title);
    setSubject(newsletter.subject);
    setPreviewText(newsletter.previewText || '');
    setBlocks(newsletter.blocks);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const handleSave = async (publish: boolean) => {
    if (!canEdit || !title.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const now = new Date().toISOString();
      const newsletter: PartnerNewsletter = {
        id: editingId || `pn-${Date.now().toString(36)}`,
        teamId,
        incomeItemId: selectedIncomeId || undefined,
        title: title.trim(),
        subject: subject.trim() || title.trim(),
        previewText: previewText.trim() || undefined,
        blocks,
        status: publish ? 'published' : 'draft',
        createdAt: editingId
          ? teamNewsletters.find((n) => n.id === editingId)?.createdAt || now
          : now,
        publishedAt: publish ? now : teamNewsletters.find((n) => n.id === editingId)?.publishedAt,
        createdByUserId: currentUserId,
      };
      await onSave(newsletter);
      setFeedback(
        publish ? t('partnerNewsletterPublished') : t('partnerNewsletterSaved'),
      );
      if (publish) {
        resetForm();
      } else {
        setEditingId(newsletter.id);
      }
    } catch {
      setFeedback(t('partnerNewsletterSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (sponsorshipItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
          {t('commServicesLabel')}
        </p>
        <h4 className="text-lg font-semibold text-violet-950 mt-1">{t('commServicesTitle')}</h4>
        <p className="text-sm text-violet-800 mt-1">{t('commServicesDesc')}</p>
      </div>

      <WorkflowStepper activeStep={workflowStep} labels={workflowLabels} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-violet-900 mb-1">{t('partnerPortalSelectSponsor')}</label>
          <select
            className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm"
            value={selectedIncomeId}
            onChange={(e) => setSelectedIncomeId(e.target.value)}
          >
            {sponsorshipItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sponsorCompanyName || item.description}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-violet-900 mb-1">{t('commTemplatePrimary')}</label>
          <div className="flex flex-wrap gap-2">
            {PRIMARY_TEMPLATES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => applyTemplate(id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                  templateId === id && blocks.length > 0
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-violet-800 border-violet-200 hover:bg-violet-100'
                }`}
              >
                {t(`partnerNewsletterTemplate_${id}` as 'partnerNewsletterTemplate_sponsor_spotlight')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-violet-900 mb-1">{t('commTemplateSecondary')}</label>
        <div className="flex flex-wrap gap-2">
          {SECONDARY_TEMPLATES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyTemplate(id)}
              className="rounded-lg px-2.5 py-1.5 text-xs border border-violet-100 bg-white text-violet-700 hover:bg-violet-50"
            >
              {t(`partnerNewsletterTemplate_${id}` as 'partnerNewsletterTemplate_race_results')}
            </button>
          ))}
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="rounded-lg border border-violet-100 bg-white p-4 space-y-3">
          <input
            className="w-full text-lg font-semibold border-0 border-b border-gray-200 pb-2 focus:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('partnerNewsletterTitlePlaceholder')}
          />
          <input
            className="w-full text-sm text-gray-600 border-0 border-b border-gray-100 pb-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('partnerNewsletterSubjectPlaceholder')}
          />
          <input
            className="w-full text-xs text-gray-500"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder={t('partnerNewsletterPreviewPlaceholder')}
          />
          {blocks.map((block) => (
            <div key={block.id}>
              <span className="text-[10px] uppercase font-medium text-violet-600">
                {t(BLOCK_LABEL_KEYS[block.type] as 'partnerNewsletterBlock_interview')}
              </span>
              <textarea
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm min-h-[80px]"
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2 items-center">
          {blocks.length === 0 ? (
            <ActionButton size="sm" onClick={() => applyTemplate()}>
              {t('partnerNewsletterStart')}
            </ActionButton>
          ) : (
            <>
              <ActionButton size="sm" variant="secondary" onClick={() => void handleSave(false)} disabled={saving}>
                {t('partnerNewsletterSaveDraft')}
              </ActionButton>
              <ActionButton size="sm" onClick={() => void handleSave(true)} disabled={saving}>
                {t('partnerNewsletterPublish')}
              </ActionButton>
              <button type="button" onClick={resetForm} className="text-xs text-violet-700 hover:underline">
                {t('commResetForm')}
              </button>
            </>
          )}
          {onOpenPartnerPortal && selectedIncomeId && (
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => onOpenPartnerPortal(selectedIncomeId)}
            >
              {t('commPreviewPartnerPortal')}
            </ActionButton>
          )}
        </div>
      )}

      {feedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
          {feedback === t('partnerNewsletterPublished') && (
            <p className="text-xs mt-1 text-emerald-700">{t('commPublishHint')}</p>
          )}
        </div>
      )}

      {sponsorNewsletters.length > 0 && (
        <div className="border-t border-violet-200 pt-4">
          <p className="text-xs font-medium text-violet-900 mb-2">{t('partnerNewsletterHistory')}</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {sponsorNewsletters.slice(0, 12).map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 text-sm bg-white/80 rounded-md px-3 py-2">
                <button
                  type="button"
                  onClick={() => canEdit && loadNewsletter(n)}
                  className="truncate text-left hover:text-violet-700"
                >
                  {n.title}
                </button>
                <span className={`text-[10px] font-semibold uppercase shrink-0 ${
                  n.status === 'published' ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  {n.status === 'published' ? t('partnerNewsletterStatusPublished') : t('partnerNewsletterStatusDraft')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-violet-200 pt-3">
        <button
          type="button"
          onClick={() => setShowRoadmap((v) => !v)}
          className="text-xs text-violet-700 hover:text-violet-900"
        >
          {showRoadmap ? '▾' : '▸'} {t('commRoadmapTitle')}
        </button>
        {showRoadmap && (
          <ul className="mt-2 space-y-1 text-xs text-violet-800 list-disc list-inside">
            <li>{t('commRoadmapEmail')}</li>
            <li>{t('commRoadmapDeliverables')}</li>
            <li>{t('commRoadmapApproval')}</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default PartnerNewsletterEditor;

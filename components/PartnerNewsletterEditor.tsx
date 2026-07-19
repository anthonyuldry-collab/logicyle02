import React, { useMemo, useRef, useState } from 'react';
import {
  IncomeItem,
  PartnerGazetteFrequency,
  PartnerMediaItem,
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
import {
  GAZETTE_FREQUENCIES,
  getGazetteFrequencyLabel,
} from '../utils/partnerCommsUtils';
import * as firebaseService from '../services/firebaseService';
import {
  buildPartnerMediaStoragePath,
  extensionFromMime,
  readFileAsDataUrl,
} from '../utils/partnerMediaUtils';
import { generateId } from '../utils/themeUtils';

const ALL_SPONSORS_VALUE = '';

interface PartnerNewsletterEditorProps {
  teamId: string;
  teamName: string;
  sponsorshipItems: IncomeItem[];
  raceEvents: RaceEvent[];
  riders: Rider[];
  newsletters: PartnerNewsletter[];
  partnerMediaItems?: PartnerMediaItem[];
  canEdit: boolean;
  currentUserId?: string;
  onSave: (newsletter: PartnerNewsletter) => Promise<void>;
  onOpenPartnerPortal?: (incomeItemId?: string) => void;
  /** Mode com : pas d’étapes finance / contrats dans le stepper */
  commsOnly?: boolean;
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
  steps = ['finance', 'sponsor', 'compose', 'publish', 'partner'],
}: {
  activeStep: WorkflowStep;
  labels: Record<WorkflowStep, string>;
  steps?: WorkflowStep[];
}) {
  const activeIndex = Math.max(0, steps.indexOf(activeStep));

  return (
    <ol className="flex flex-wrap items-center gap-1 text-[11px] sm:text-xs text-violet-200">
      {steps.map((step, index) => {
        const isPast = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <React.Fragment key={step}>
            {index > 0 && <span className="text-violet-400/70 px-0.5">→</span>}
            <li
              className={`rounded-full px-2.5 py-1 font-medium border ${
                isActive
                  ? 'bg-violet-600 text-white border-violet-500'
                  : isPast
                    ? 'bg-violet-500/20 text-violet-100 border-violet-400/40'
                    : 'bg-slate-950/60 text-slate-300 border-white/15'
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
  image: 'partnerNewsletterBlock_image',
};

const PartnerNewsletterEditor: React.FC<PartnerNewsletterEditorProps> = ({
  teamId,
  teamName,
  sponsorshipItems,
  raceEvents,
  riders,
  newsletters,
  partnerMediaItems = [],
  canEdit,
  currentUserId,
  onSave,
  onOpenPartnerPortal,
  commsOnly = false,
}) => {
  const { t, language } = useTranslations();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedIncomeId, setSelectedIncomeId] = useState(ALL_SPONSORS_VALUE);
  const [templateId, setTemplateId] = useState<PartnerNewsletterTemplateId>('sponsor_spotlight');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [frequency, setFrequency] = useState<PartnerGazetteFrequency>('monthly');
  const [editionNumber, setEditionNumber] = useState<string>('');
  const [editionLabel, setEditionLabel] = useState('');
  const [blocks, setBlocks] = useState<PartnerNewsletterBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImageForBlockId, setUploadingImageForBlockId] = useState<string | null>(null);
  const [activeImageBlockId, setActiveImageBlockId] = useState<string | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const sponsorName = useMemo(() => {
    if (!selectedIncomeId) return t('partnerGazetteAllSponsors');
    return (
      sponsorshipItems.find((i) => i.id === selectedIncomeId)?.sponsorCompanyName
      || sponsorshipItems.find((i) => i.id === selectedIncomeId)?.description
      || teamName
    );
  }, [sponsorshipItems, selectedIncomeId, teamName, t]);

  const galleryPhotos = useMemo(
    () =>
      (partnerMediaItems || [])
        .filter((m) => m.teamId === teamId && m.status === 'published')
        .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt)),
    [partnerMediaItems, teamId],
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
      teamNewsletters.filter((n) => {
        if (!selectedIncomeId) return !n.incomeItemId;
        return !n.incomeItemId || n.incomeItemId === selectedIncomeId;
      }),
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
    setFrequency('monthly');
    setEditionNumber('');
    setEditionLabel('');
    setSelectedIncomeId(ALL_SPONSORS_VALUE);
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
    setSelectedIncomeId(newsletter.incomeItemId || ALL_SPONSORS_VALUE);
    setTitle(newsletter.title);
    setSubject(newsletter.subject);
    setPreviewText(newsletter.previewText || '');
    setFrequency(newsletter.frequency || 'monthly');
    setEditionNumber(newsletter.editionNumber != null ? String(newsletter.editionNumber) : '');
    setEditionLabel(newsletter.editionLabel || '');
    setBlocks(newsletter.blocks);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const addImageBlock = () => {
    const id = `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setBlocks((prev) => [...prev, { id, type: 'image', content: '' }]);
    setActiveImageBlockId(id);
  };

  const handleUploadImage = async (blockId: string, file: File | null) => {
    if (!file || !file.type.startsWith('image/') || !teamId) return;
    setUploadingImageForBlockId(blockId);
    try {
      const { dataUrl, mimeType } = await readFileAsDataUrl(file);
      const mediaId = generateId();
      const path = buildPartnerMediaStoragePath(teamId, mediaId, extensionFromMime(mimeType));
      const photoUrl = await firebaseService.uploadFile(dataUrl, path, mimeType);
      updateBlock(blockId, photoUrl);
    } catch (err) {
      console.error(err);
      setFeedback('Erreur lors de l’upload de la photo.');
    } finally {
      setUploadingImageForBlockId(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
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
        frequency,
        editionNumber: editionNumber.trim() ? Number(editionNumber) : undefined,
        editionLabel: editionLabel.trim() || undefined,
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
    <div className="rounded-xl border border-violet-400/35 bg-slate-900 p-5 space-y-5 shadow-lg shadow-black/30">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          {commsOnly ? t('partnerGazetteLabel') : t('commServicesLabel')}
        </p>
        <h4 className="text-lg font-semibold text-white mt-1">
          {commsOnly ? t('partnerGazetteTitle') : t('commServicesTitle')}
        </h4>
        <p className="text-sm text-slate-300 mt-1">
          {commsOnly ? t('partnerGazetteDesc') : t('commServicesDesc')}
        </p>
      </div>

      <WorkflowStepper
        activeStep={workflowStep}
        labels={workflowLabels}
        steps={
          commsOnly
            ? ['sponsor', 'compose', 'publish', 'partner']
            : ['finance', 'sponsor', 'compose', 'publish', 'partner']
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-200 mb-1">{t('partnerPortalSelectSponsor')}</label>
          <select
            className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={selectedIncomeId}
            onChange={(e) => setSelectedIncomeId(e.target.value)}
          >
            <option value={ALL_SPONSORS_VALUE}>{t('partnerGazetteAllSponsors')}</option>
            {sponsorshipItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sponsorCompanyName || item.description}
              </option>
            ))}
          </select>
          {!selectedIncomeId && (
            <p className="mt-1 text-[11px] text-violet-200/80">{t('partnerGazetteAllSponsorsHint')}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-200 mb-1">{t('partnerGazetteFrequency')}</label>
          <select
            className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as PartnerGazetteFrequency)}
          >
            {GAZETTE_FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {getGazetteFrequencyLabel(freq, language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-200 mb-1">{t('partnerGazetteEditionNumber')}</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={editionNumber}
            onChange={(e) => setEditionNumber(e.target.value)}
            placeholder="ex. 12"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-200 mb-1">{t('partnerGazetteEditionLabel')}</label>
          <input
            type="text"
            className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={editionLabel}
            onChange={(e) => setEditionLabel(e.target.value)}
            placeholder={t('partnerGazetteEditionPlaceholder')}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-200 mb-1">{t('partnerGazetteAngles')}</label>
        <div className="flex flex-wrap gap-2">
          {PRIMARY_TEMPLATES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyTemplate(id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                templateId === id && blocks.length > 0
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-slate-950 text-violet-100 border-white/20 hover:bg-violet-500/20 hover:border-violet-400/50'
              }`}
            >
              {t(`partnerNewsletterTemplate_${id}` as 'partnerNewsletterTemplate_sponsor_spotlight')}
            </button>
          ))}
          {SECONDARY_TEMPLATES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyTemplate(id)}
              className="rounded-lg px-2.5 py-1.5 text-xs border border-white/20 bg-slate-950 text-slate-200 hover:bg-violet-500/15 hover:border-violet-400/40"
            >
              {t(`partnerNewsletterTemplate_${id}` as 'partnerNewsletterTemplate_race_results')}
            </button>
          ))}
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="rounded-lg border border-white/15 bg-slate-950/80 p-4 space-y-3">
          <input
            className="w-full text-lg font-semibold bg-transparent text-white border-0 border-b border-white/20 pb-2 focus:ring-0 focus:border-violet-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('partnerNewsletterTitlePlaceholder')}
          />
          <input
            className="w-full text-sm text-slate-300 bg-transparent border-0 border-b border-white/10 pb-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('partnerNewsletterSubjectPlaceholder')}
          />
          <input
            className="w-full text-xs text-slate-400 bg-transparent"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder={t('partnerNewsletterPreviewPlaceholder')}
          />
          {blocks.map((block) => (
            <div key={block.id}>
              <span className="text-[10px] uppercase font-medium text-violet-300">
                {t(BLOCK_LABEL_KEYS[block.type] as 'partnerNewsletterBlock_interview')}
              </span>
              {block.type === 'image' ? (
                <div className="mt-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-white/20 bg-slate-900 px-2.5 py-1.5 text-xs text-violet-100 hover:border-violet-400/50"
                      disabled={!canEdit || uploadingImageForBlockId === block.id}
                      onClick={() => {
                        setActiveImageBlockId(block.id);
                        imageInputRef.current?.click();
                      }}
                    >
                      {uploadingImageForBlockId === block.id
                        ? '…'
                        : t('partnerGazetteUploadPhoto')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-white/20 bg-slate-900 px-2.5 py-1.5 text-xs text-violet-100 hover:border-violet-400/50"
                      disabled={!canEdit}
                      onClick={() => {
                        if (activeImageBlockId === block.id && showGalleryPicker) {
                          setShowGalleryPicker(false);
                        } else {
                          setActiveImageBlockId(block.id);
                          setShowGalleryPicker(true);
                        }
                      }}
                    >
                      {t('partnerGazettePickFromGallery')}
                    </button>
                  </div>
                  {showGalleryPicker && activeImageBlockId === block.id && (
                    <div className="rounded-md border border-white/15 bg-slate-900/80 p-2 max-h-40 overflow-y-auto">
                      {galleryPhotos.length === 0 ? (
                        <p className="text-[11px] text-slate-400">{t('partnerGazetteNoGalleryPhotos')}</p>
                      ) : (
                        <ul className="grid grid-cols-4 gap-2">
                          {galleryPhotos.slice(0, 24).map((photo) => (
                            <li key={photo.id}>
                              <button
                                type="button"
                                className="block w-full overflow-hidden rounded border border-white/10 hover:border-violet-400"
                                onClick={() => {
                                  updateBlock(block.id, photo.photoUrl);
                                  setShowGalleryPicker(false);
                                }}
                              >
                                <img src={photo.photoUrl} alt="" className="h-14 w-full object-cover" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <input
                    type="url"
                    className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    placeholder={t('partnerNewsletterImageUrl')}
                  />
                  <p className="text-[11px] text-slate-400">{t('partnerNewsletterImageHint')}</p>
                  {block.content.trim() && (
                    <img
                      src={block.content.trim()}
                      alt=""
                      className="mt-1 max-h-40 rounded-lg object-cover border border-white/10"
                    />
                  )}
                </div>
              ) : (
                <textarea
                  className="mt-1 w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 min-h-[80px]"
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, e.target.value)}
                />
              )}
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={addImageBlock}
              className="text-xs text-violet-300 hover:text-violet-100 hover:underline"
            >
              + {t('partnerGazetteAddPhoto')}
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (activeImageBlockId) void handleUploadImage(activeImageBlockId, file);
            }}
          />
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2 items-center">
          {blocks.length === 0 ? (
            <ActionButton size="sm" onClick={() => applyTemplate()}>
              {t('partnerGazetteStart')}
            </ActionButton>
          ) : (
            <>
              <ActionButton size="sm" variant="secondary" onClick={() => void handleSave(false)} disabled={saving}>
                {t('partnerNewsletterSaveDraft')}
              </ActionButton>
              <ActionButton size="sm" onClick={() => void handleSave(true)} disabled={saving}>
                {t('partnerGazettePublish')}
              </ActionButton>
              <button type="button" onClick={resetForm} className="text-xs text-violet-300 hover:text-violet-100 hover:underline">
                {t('commResetForm')}
              </button>
            </>
          )}
          {onOpenPartnerPortal && (
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => onOpenPartnerPortal(selectedIncomeId || sponsorshipItems[0]?.id)}
            >
              {t('partnerCommsOpenPreview')}
            </ActionButton>
          )}
        </div>
      )}

      {feedback && (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-100">
          {feedback}
          {feedback === t('partnerNewsletterPublished') && (
            <p className="text-xs mt-1 text-emerald-200/90">{t('commPublishHint')}</p>
          )}
        </div>
      )}

      {sponsorNewsletters.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs font-medium text-slate-200 mb-2">{t('partnerGazetteHistory')}</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {sponsorNewsletters.slice(0, 12).map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 text-sm bg-slate-950/70 rounded-md px-3 py-2 border border-white/10">
                <button
                  type="button"
                  onClick={() => canEdit && loadNewsletter(n)}
                  className="truncate text-left text-slate-100 hover:text-violet-200"
                >
                  {n.editionNumber != null ? `#${n.editionNumber} · ` : ''}
                  {n.title}
                  <span className="ml-2 text-[10px] text-slate-400">
                    {getGazetteFrequencyLabel(n.frequency, language)}
                  </span>
                </button>
                <span className={`text-[10px] font-semibold uppercase shrink-0 ${
                  n.status === 'published' ? 'text-emerald-300' : 'text-slate-400'
                }`}>
                  {n.status === 'published' ? t('partnerNewsletterStatusPublished') : t('partnerNewsletterStatusDraft')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => setShowRoadmap((v) => !v)}
          className="text-xs text-violet-300 hover:text-violet-100"
        >
          {showRoadmap ? '▾' : '▸'} {t('commRoadmapTitle')}
        </button>
        {showRoadmap && (
          <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc list-inside">
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

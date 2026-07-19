import React, { useMemo, useRef, useState } from 'react';
import {
  CounterpartDeliverableStatus,
  IncomeItem,
  PartnerMediaItem,
  PartnerMediaStatus,
  PartnerNewsletter,
  PartnerRaceReport,
  RaceEvent,
  Rider,
  User,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import PartnerNewsletterEditor from '../components/PartnerNewsletterEditor';
import { useTranslations } from '../hooks/useTranslations';
import * as firebaseService from '../services/firebaseService';
import { getActiveSponsorsForMedia } from '../utils/communicationMissionUtils';
import {
  collectCommsMediaMissions,
  sanitizeSponsorsForComms,
} from '../utils/partnerCommsUtils';
import { getCounterpartCategoryLabel } from '../utils/counterpartDeliverableUtils';
import {
  archivePartnerMediaItem,
  buildPartnerMediaStoragePath,
  createPartnerMediaDraft,
  extensionFromMime,
  getMediaEventLabel,
  getMediaSponsorLabel,
  publishPartnerMediaItem,
  readFileAsDataUrl,
} from '../utils/partnerMediaUtils';
import {
  archivePartnerRaceReport,
  publishPartnerRaceReport,
} from '../utils/partnerRaceReportUtils';
import { formatEventDateRange } from '../utils/dateUtils';

type HubTab = 'photos' | 'results' | 'newsletters' | 'missions';

interface PartnerMediaHubSectionProps {
  teamId: string;
  teamName: string;
  currentUser?: User;
  canEdit: boolean;
  /** Aperçu portail partenaire (managers) — absent pour la com */
  canPreviewPortal?: boolean;
  raceEvents?: RaceEvent[];
  riders?: Rider[];
  incomeItems: IncomeItem[];
  partnerMediaItems: PartnerMediaItem[];
  partnerRaceReports: PartnerRaceReport[];
  partnerNewsletters: PartnerNewsletter[];
  onSavePartnerMediaItem: (item: PartnerMediaItem) => Promise<void>;
  onDeletePartnerMediaItem: (itemId: string) => Promise<void>;
  onSavePartnerRaceReport: (report: PartnerRaceReport) => Promise<void>;
  onDeletePartnerRaceReport: (reportId: string) => Promise<void>;
  onSavePartnerNewsletter?: (newsletter: PartnerNewsletter) => Promise<void>;
  onUpdateMediaDeliverableStatus?: (
    incomeItemId: string,
    deliverableId: string,
    status: CounterpartDeliverableStatus,
  ) => Promise<void>;
  onNavigateToEvent?: (eventId: string) => void;
  onOpenPartnerPortalPreview?: (incomeItemId?: string) => void;
}

const STATUS_STYLE: Record<PartnerMediaStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-amber-100 text-amber-800',
};

const PartnerMediaHubSection: React.FC<PartnerMediaHubSectionProps> = ({
  teamId,
  teamName,
  currentUser,
  canEdit,
  canPreviewPortal = false,
  raceEvents = [],
  riders = [],
  incomeItems,
  partnerMediaItems,
  partnerRaceReports,
  partnerNewsletters,
  onSavePartnerMediaItem,
  onDeletePartnerMediaItem,
  onSavePartnerRaceReport,
  onDeletePartnerRaceReport,
  onSavePartnerNewsletter,
  onUpdateMediaDeliverableStatus,
  onNavigateToEvent,
  onOpenPartnerPortalPreview,
}) => {
  const { t, language } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<HubTab>('missions');
  const [filterEventId, setFilterEventId] = useState('');
  const [filterStatus, setFilterStatus] = useState<PartnerMediaStatus | ''>('');
  const [filterSponsorId, setFilterSponsorId] = useState('');
  const [uploadEventId, setUploadEventId] = useState('');
  const [uploadSponsorId, setUploadSponsorId] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

  /** Sponsors sans montants / contrats / contreparties (périmètre com). */
  const sponsorsForComms = useMemo(
    () => sanitizeSponsorsForComms(getActiveSponsorsForMedia(incomeItems)),
    [incomeItems],
  );

  const sortedEvents = useMemo(
    () => [...raceEvents].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [raceEvents],
  );

  const filteredMedia = useMemo(() => {
    return (partnerMediaItems || [])
      .filter((m) => m.teamId === teamId)
      .filter((m) => !filterEventId || m.eventId === filterEventId)
      .filter((m) => !filterStatus || m.status === filterStatus)
      .filter((m) => !filterSponsorId || m.incomeItemId === filterSponsorId)
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  }, [partnerMediaItems, teamId, filterEventId, filterStatus, filterSponsorId]);

  const filteredReports = useMemo(() => {
    return (partnerRaceReports || [])
      .filter((r) => r.teamId === teamId)
      .filter((r) => !filterEventId || r.eventId === filterEventId)
      .filter((r) => !filterStatus || r.status === filterStatus)
      .filter((r) => !filterSponsorId || r.incomeItemId === filterSponsorId)
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  }, [partnerRaceReports, teamId, filterEventId, filterStatus, filterSponsorId]);

  const publishedPhotos = filteredMedia.filter((m) => m.status === 'published').length;
  const publishedResults = filteredReports.filter((r) => r.status === 'published').length;
  const publishedNewsletters = (partnerNewsletters || []).filter(
    (n) => n.teamId === teamId && n.status === 'published',
  ).length;

  const mediaMissions = useMemo(
    () => collectCommsMediaMissions(getActiveSponsorsForMedia(incomeItems)),
    [incomeItems],
  );

  const openMissions = mediaMissions.filter(
    (m) => m.deliverable.status === 'planned' || m.deliverable.status === 'in_progress',
  ).length;

  const tabs: { id: HubTab; label: string; count: number }[] = [
    { id: 'missions', label: t('partnerCommsMissionsTab'), count: openMissions },
    { id: 'photos', label: t('partnerTabMedia'), count: publishedPhotos },
    { id: 'results', label: t('partnerTabResults'), count: publishedResults },
    { id: 'newsletters', label: t('partnerGazetteTitle'), count: publishedNewsletters },
  ];

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !canEdit) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const { dataUrl, mimeType } = await readFileAsDataUrl(file);
        const draft = createPartnerMediaDraft({
          teamId,
          photoUrl: '',
          mimeType,
          eventId: uploadEventId || undefined,
          incomeItemId: uploadSponsorId || undefined,
          caption: caption.trim() || undefined,
          createdByUserId: currentUser?.id,
          status: 'published',
        });
        const path = buildPartnerMediaStoragePath(
          teamId,
          draft.id,
          extensionFromMime(mimeType),
        );
        const photoUrl = await firebaseService.uploadFile(dataUrl, path, mimeType);
        await onSavePartnerMediaItem({ ...draft, photoUrl });
      }
      setCaption('');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l’envoi des photos.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveCaption = async (item: PartnerMediaItem) => {
    await onSavePartnerMediaItem({
      ...item,
      caption: captionDraft.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setEditingCaptionId(null);
  };

  return (
    <SectionWrapper title={t('partnerCommsHubTitle')}>
      <p className="text-sm text-gray-600 mb-2">{t('partnerCommsHubDesc')}</p>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-6">
        {t('partnerCommsScopeHint')}
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {canPreviewPortal && onOpenPartnerPortalPreview && (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => onOpenPartnerPortalPreview(sponsorsForComms[0]?.id)}
          >
            {t('partnerCommsOpenPreview')}
          </ActionButton>
        )}
      </div>

      {(activeTab === 'photos' || activeTab === 'results') && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-gray-600">{t('partnerMediaFilterEvent')}</span>
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">{t('partnerMediaFilterAll')}</option>
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-gray-600">{t('partnerMediaFilterStatus')}</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PartnerMediaStatus | '')}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">{t('partnerMediaFilterAll')}</option>
              <option value="draft">{t('partnerMediaDraft')}</option>
              <option value="published">{t('partnerMediaPublish')}</option>
              <option value="archived">{t('partnerMediaArchive')}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-gray-600">{t('partnerMediaFilterSponsor')}</span>
            <select
              value={filterSponsorId}
              onChange={(e) => setFilterSponsorId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">{t('partnerMediaFilterAll')}</option>
              {sponsorsForComms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sponsorCompanyName || s.description}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {activeTab === 'missions' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('partnerCommsMissionsDesc')}</p>
          {mediaMissions.length === 0 ? (
            <p className="text-sm text-gray-500">{t('partnerCommsMissionsEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {mediaMissions.map((mission) => {
                const d = mission.deliverable;
                return (
                  <li
                    key={`${mission.incomeItemId}-${d.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-indigo-700">
                          {mission.sponsorName}
                          {d.category && (
                            <span className="ml-2 text-gray-400">
                              · {getCounterpartCategoryLabel(d.category, language)}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 font-medium text-gray-900">{d.label}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {[d.channel, d.quantity != null && d.unit ? `${d.quantity} ${d.unit}` : null, d.frequency]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {d.dueDate && (
                          <p className="mt-1 text-xs text-amber-700">
                            Échéance : {d.dueDate}
                          </p>
                        )}
                        {d.notes && (
                          <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">{d.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          d.status === 'validated'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'delivered'
                              ? 'bg-blue-100 text-blue-800'
                              : d.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t(`partnerDeliverable_${d.status}` as 'partnerDeliverable_planned')}
                        </span>
                        {canEdit && onUpdateMediaDeliverableStatus && (
                          <select
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white"
                            value={d.status}
                            onChange={(e) =>
                              void onUpdateMediaDeliverableStatus(
                                mission.incomeItemId,
                                d.id,
                                e.target.value as CounterpartDeliverableStatus,
                              )
                            }
                          >
                            <option value="planned">{t('partnerDeliverable_planned')}</option>
                            <option value="in_progress">{t('partnerDeliverable_in_progress')}</option>
                            <option value="delivered">{t('partnerDeliverable_delivered')}</option>
                            <option value="validated">{t('partnerDeliverable_validated')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'photos' && (
        <>
          {canEdit && (
            <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-sky-950">{t('partnerMediaUpload')}</h3>
                <ActionButton
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? t('partnerMediaUploading') : t('partnerMediaUpload')}
                </ActionButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="text-gray-600">{t('partnerMediaFilterEvent')}</span>
                  <select
                    value={uploadEventId}
                    onChange={(e) => setUploadEventId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">{t('partnerMediaFilterAll')}</option>
                    {sortedEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-600">{t('partnerMediaTargetSponsor')}</span>
                  <select
                    value={uploadSponsorId}
                    onChange={(e) => setUploadSponsorId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">{t('partnerMediaAllSponsors')}</option>
                    {sponsorsForComms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sponsorCompanyName || s.description}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-600">{t('partnerMediaCaption')}</span>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          )}

          {filteredMedia.length === 0 ? (
            <p className="text-sm text-gray-500">{t('partnerMediaEmpty')}</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMedia.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <img src={item.photoUrl} alt={item.caption || ''} className="h-36 w-full object-cover" />
                  <div className="p-3 space-y-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[item.status]}`}>
                      {item.status}
                    </span>
                    <p className="text-xs text-gray-500">
                      {getMediaEventLabel(item, raceEvents) || '—'}
                      {getMediaSponsorLabel(item, sponsorsForComms as IncomeItem[])
                        ? ` · ${getMediaSponsorLabel(item, sponsorsForComms as IncomeItem[])}`
                        : ''}
                    </p>
                    {editingCaptionId === item.id ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={captionDraft}
                          onChange={(e) => setCaptionDraft(e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                        <div className="flex gap-2">
                          <button type="button" className="text-[11px] text-sky-700" onClick={() => saveCaption(item)}>OK</button>
                          <button type="button" className="text-[11px] text-gray-500" onClick={() => setEditingCaptionId(null)}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-800 line-clamp-2">{item.caption || '—'}</p>
                    )}
                    {canEdit && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          className="text-[11px] text-sky-700 hover:underline"
                          onClick={() =>
                            onSavePartnerMediaItem(
                              item.status === 'published'
                                ? archivePartnerMediaItem(item)
                                : publishPartnerMediaItem(item),
                            )
                          }
                        >
                          {item.status === 'published' ? t('partnerMediaArchive') : t('partnerMediaPublish')}
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-slate-600 hover:underline"
                          onClick={() => {
                            setEditingCaptionId(item.id);
                            setCaptionDraft(item.caption || '');
                          }}
                        >
                          Légende
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-red-600 hover:underline"
                          onClick={() => onDeletePartnerMediaItem(item.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === 'results' && (
        <>
          <p className="text-sm text-gray-600 mb-4">{t('partnerCommsResultsHint')}</p>
          {filteredReports.length === 0 ? (
            <p className="text-sm text-gray-500">{t('partnerResultsEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {filteredReports.map((report) => {
                const event = raceEvents.find((e) => e.id === report.eventId);
                return (
                  <li key={report.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{event?.name || report.eventId}</p>
                        {event && (
                          <p className="text-xs text-gray-500">{formatEventDateRange(event)}</p>
                        )}
                        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[report.status]}`}>
                          {report.status}
                        </span>
                      </div>
                      {canEdit && (
                        <div className="flex flex-wrap gap-2">
                          {onNavigateToEvent && (
                            <button
                              type="button"
                              className="text-xs text-sky-700 hover:underline"
                              onClick={() => onNavigateToEvent(report.eventId)}
                            >
                              Mission course
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs text-emerald-700 hover:underline"
                            onClick={() =>
                              onSavePartnerRaceReport(
                                report.status === 'published'
                                  ? archivePartnerRaceReport(report)
                                  : publishPartnerRaceReport(report),
                              )
                            }
                          >
                            {report.status === 'published'
                              ? t('partnerMediaArchive')
                              : t('partnerMediaPublish')}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => onDeletePartnerRaceReport(report.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                    {report.raceOverallRanking && (
                      <p className="mt-2 text-sm text-gray-800">
                        <span className="text-gray-500">{t('partnerResultsOverall')} : </span>
                        {report.raceOverallRanking}
                      </p>
                    )}
                    {report.teamRiderRankings && (
                      <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                        <span className="text-gray-500">{t('partnerResultsTeam')} : </span>
                        {report.teamRiderRankings}
                      </p>
                    )}
                    {report.resultsSummary && (
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{report.resultsSummary}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {activeTab === 'newsletters' && onSavePartnerNewsletter && (
        <div className="rounded-xl border border-violet-200 bg-slate-900 p-4">
          <PartnerNewsletterEditor
            teamId={teamId}
            teamName={teamName}
            sponsorshipItems={sponsorsForComms as IncomeItem[]}
            raceEvents={raceEvents}
            riders={riders}
            newsletters={partnerNewsletters}
            partnerMediaItems={partnerMediaItems}
            canEdit={canEdit}
            currentUserId={currentUser?.id}
            onSave={onSavePartnerNewsletter}
            onOpenPartnerPortal={onOpenPartnerPortalPreview}
            commsOnly
          />
        </div>
      )}

      {activeTab === 'newsletters' && !onSavePartnerNewsletter && (
        <p className="text-sm text-gray-500">{t('partnerCommsNewslettersNoEdit')}</p>
      )}
    </SectionWrapper>
  );
};

export default PartnerMediaHubSection;

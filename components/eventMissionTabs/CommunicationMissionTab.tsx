import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ChecklistRole,
  PartnerMediaItem,
  PartnerRaceReport,
  RaceEvent,
  Rider,
} from '../../types';
import { getEventSelectedRiders } from '../../utils/staffRoleDataAccess';
import EventOperationalLogisticsTab from '../../sections/eventDetailTabs/EventOperationalLogisticsTab';
import ActionButton from '../ActionButton';
import {
  buildPartantsSocialCopy,
  getActiveSponsorsForMedia,
  getEventMediaStaffContacts,
  getRaceScheduleHighlights,
  summarizePartnerNewsletters,
} from '../../utils/communicationMissionUtils';
import { collectCommsMediaMissions } from '../../utils/partnerCommsUtils';
import { getCounterpartCategoryLabel } from '../../utils/counterpartDeliverableUtils';
import {
  getFichePosteTasks,
  groupFicheTasksBySection,
  resolveFicheStructureForTeam,
} from '../../utils/fichePosteUtils';
import { formatEventDateRange } from '../../utils/dateUtils';
import { isStageRace } from '../../utils/stageRaceUtils';
import { useTranslations } from '../../hooks/useTranslations';
import * as firebaseService from '../../services/firebaseService';
import {
  archivePartnerMediaItem,
  buildPartnerMediaStoragePath,
  createPartnerMediaDraft,
  extensionFromMime,
  filterMediaByEvent,
  publishPartnerMediaItem,
  readFileAsDataUrl,
} from '../../utils/partnerMediaUtils';
import {
  buildRaceReportDraftFromPerformance,
  buildResultsSocialCopy,
  findPerformanceForEvent,
  findReportForEvent,
  hasPublishableResults,
  publishPartnerRaceReport,
} from '../../utils/partnerRaceReportUtils';

interface CommunicationMissionTabProps {
  event: RaceEvent;
  appState: AppState;
  updateEvent: (updated: Partial<RaceEvent>) => void;
  currentUserId?: string;
  onSavePartnerMediaItem?: (item: PartnerMediaItem) => Promise<void>;
  onDeletePartnerMediaItem?: (itemId: string) => Promise<void>;
  onSavePartnerRaceReport?: (report: PartnerRaceReport) => Promise<void>;
  onNavigatePartnerMedia?: () => void;
}

function RiderMediaCard({ rider }: { rider: Rider }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      {rider.photoUrl ? (
        <img src={rider.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-800">
          {rider.firstName?.[0]}
          {rider.lastName?.[0]}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-medium text-gray-900">
          {rider.firstName} {rider.lastName}
        </p>
        {(rider.categories?.length ?? 0) > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{rider.categories!.join(' · ')}</p>
        )}
      </div>
    </li>
  );
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-amber-100 text-amber-800',
};

const CommunicationMissionTab: React.FC<CommunicationMissionTabProps> = ({
  event,
  appState,
  updateEvent,
  currentUserId,
  onSavePartnerMediaItem,
  onDeletePartnerMediaItem,
  onSavePartnerRaceReport,
  onNavigatePartnerMedia,
}) => {
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedRiders = useMemo(
    () => getEventSelectedRiders(event, appState.riders),
    [event, appState.riders],
  );

  const teamId = appState.activeTeamId || '';
  const teamName =
    appState.teams.find(tm => tm.id === teamId)?.name || 'Équipe';

  const scheduleHighlights = useMemo(() => getRaceScheduleHighlights(event), [event]);
  const staffContacts = useMemo(
    () => getEventMediaStaffContacts(event, appState.staff),
    [event, appState.staff],
  );

  const ficheGroups = useMemo(() => {
    const structure = resolveFicheStructureForTeam(
      appState.teamLevel,
      appState.operationalSettings,
    );
    const tasks = getFichePosteTasks(
      ChecklistRole.COMMUNICATION,
      structure,
      appState.teamLevel,
      appState.operationalSettings,
      [event],
    );
    return groupFicheTasksBySection(tasks);
  }, [appState.teamLevel, appState.operationalSettings, event]);

  const sponsors = useMemo(
    () => getActiveSponsorsForMedia(appState.incomeItems),
    [appState.incomeItems],
  );

  const mediaMissions = useMemo(
    () => collectCommsMediaMissions(sponsors).slice(0, 8),
    [sponsors],
  );

  const newsletterSummary = useMemo(
    () => summarizePartnerNewsletters(appState.partnerNewsletters),
    [appState.partnerNewsletters],
  );

  const performance = useMemo(
    () => findPerformanceForEvent(appState.performanceEntries, event.id),
    [appState.performanceEntries, event.id],
  );

  const existingReport = useMemo(
    () => findReportForEvent(appState.partnerRaceReports || [], event.id),
    [appState.partnerRaceReports, event.id],
  );

  const eventMedia = useMemo(
    () => filterMediaByEvent(appState.partnerMediaItems || [], event.id),
    [appState.partnerMediaItems, event.id],
  );

  const [resultsSummary, setResultsSummary] = useState('');
  const [raceOverallRanking, setRaceOverallRanking] = useState('');
  const [teamRiderRankings, setTeamRiderRankings] = useState('');
  const [targetIncomeId, setTargetIncomeId] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setResultsSummary(existingReport?.resultsSummary || performance?.resultsSummary || '');
    setRaceOverallRanking(
      existingReport?.raceOverallRanking || performance?.raceOverallRanking || '',
    );
    setTeamRiderRankings(
      existingReport?.teamRiderRankings || performance?.teamRiderRankings || '',
    );
  }, [existingReport, performance]);

  const draftReport = useMemo(
    () =>
      buildRaceReportDraftFromPerformance({
        teamId,
        event,
        performance,
        incomeItemId: targetIncomeId || undefined,
        createdByUserId: currentUserId,
        existing: existingReport,
      }),
    [teamId, event, performance, targetIncomeId, currentUserId, existingReport],
  );

  const resultsCopy = useMemo(
    () =>
      buildResultsSocialCopy({
        event,
        riders: selectedRiders,
        teamName,
        report: {
          ...draftReport,
          resultsSummary,
          raceOverallRanking,
          teamRiderRankings,
        },
        performance,
      }),
    [
      event,
      selectedRiders,
      teamName,
      draftReport,
      resultsSummary,
      raceOverallRanking,
      teamRiderRankings,
      performance,
    ],
  );

  const partantsCopy = useMemo(
    () => buildPartantsSocialCopy({ event, riders: selectedRiders, teamName }),
    [event, selectedRiders, teamName],
  );

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length || !teamId || !onSavePartnerMediaItem) return;
    setUploading(true);
    setFeedback(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const { dataUrl, mimeType } = await readFileAsDataUrl(file);
        const draft = createPartnerMediaDraft({
          teamId,
          photoUrl: '',
          mimeType,
          eventId: event.id,
          incomeItemId: targetIncomeId || undefined,
          caption: caption.trim() || undefined,
          createdByUserId: currentUserId,
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
      setFeedback(t('partnerMediaUpload'));
    } catch (err) {
      console.error(err);
      setFeedback('Erreur lors de l’envoi des photos.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleMediaStatus = async (item: PartnerMediaItem) => {
    if (!onSavePartnerMediaItem) return;
    const next =
      item.status === 'published'
        ? archivePartnerMediaItem(item)
        : publishPartnerMediaItem(item);
    await onSavePartnerMediaItem(next);
  };

  const handlePublishReport = async () => {
    if (!teamId || !onSavePartnerRaceReport) return;
    setSavingReport(true);
    setFeedback(null);
    try {
      const base = buildRaceReportDraftFromPerformance({
        teamId,
        event,
        performance,
        incomeItemId: targetIncomeId || undefined,
        createdByUserId: currentUserId,
        existing: existingReport,
      });
      const toPublish = publishPartnerRaceReport({
        ...base,
        resultsSummary: resultsSummary.trim(),
        raceOverallRanking: raceOverallRanking.trim() || undefined,
        teamRiderRankings: teamRiderRankings.trim() || undefined,
      });
      await onSavePartnerRaceReport(toPublish);
      setFeedback(t('partnerRaceReportPublished'));
    } catch (err) {
      console.error(err);
      setFeedback('Erreur lors de la publication des résultats.');
    } finally {
      setSavingReport(false);
    }
  };

  const eventTypeLabel = isStageRace(event) ? 'Stage' : event.eventType;
  const canEditMedia = Boolean(onSavePartnerMediaItem);
  const canEditReport = Boolean(onSavePartnerRaceReport);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
        <h3 className="text-base font-semibold text-indigo-900">Mission média — {event.name}</h3>
        <p className="mt-1 text-sm text-indigo-800">
          Brief course, photos partenaires, résultats auto et modèles réseaux.
        </p>
        {onNavigatePartnerMedia && (
          <button
            type="button"
            className="mt-2 text-sm font-medium text-indigo-700 hover:underline"
            onClick={onNavigatePartnerMedia}
          >
            Ouvrir l’espace partenaire (contenus) →
          </button>
        )}
      </div>

      {feedback && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {feedback}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Brief course
          </h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Dates</dt>
              <dd className="text-gray-900 font-medium">{formatEventDateRange(event)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Lieu</dt>
              <dd className="text-gray-900">{event.location || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Type</dt>
              <dd className="text-gray-900">{eventTypeLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Discipline</dt>
              <dd className="text-gray-900">{event.discipline || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Catégorie</dt>
              <dd className="text-gray-900">{event.eligibleCategory || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Horaires clés
          </h4>
          {scheduleHighlights.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 italic">
              Renseignez les infos course (onglet Infos) pour alimenter le brief média.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {scheduleHighlights.map(row => (
                <li key={row.label} className="flex gap-2 text-sm">
                  <span className="w-36 shrink-0 text-gray-500">{row.label}</span>
                  <span className="text-gray-900 font-medium">{row.value}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {staffContacts.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Contacts sur la course
          </h4>
          <div className="mt-3 flex flex-wrap gap-4">
            {staffContacts.map(group => (
              <div key={group.label}>
                <p className="text-xs font-medium text-gray-500">{group.label}</p>
                <ul className="mt-1 text-sm text-gray-900">
                  {group.members.map(m => (
                    <li key={m.id}>
                      {m.firstName} {m.lastName}
                      {m.phone ? ` · ${m.phone}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-sky-950">
              {t('partnerMediaUpload')}
            </h4>
            <p className="text-xs text-sky-800 mt-1">
              Photos visibles dans l’espace partenaire après publication.
            </p>
          </div>
          {canEditMedia && (
            <ActionButton
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !teamId}
            >
              {uploading ? t('partnerMediaUploading') : t('partnerMediaUpload')}
            </ActionButton>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUploadFiles(e.target.files)}
          />
        </div>

        {canEditMedia && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600">{t('partnerMediaCaption')}</span>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ex. Départ officiel"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{t('partnerMediaTargetSponsor')}</span>
              <select
                value={targetIncomeId}
                onChange={(e) => setTargetIncomeId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{t('partnerMediaAllSponsors')}</option>
                {sponsors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sponsorCompanyName || s.description}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {eventMedia.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{t('partnerMediaEmpty')}</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {eventMedia.map((item) => (
              <li key={item.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <img src={item.photoUrl} alt={item.caption || ''} className="h-28 w-full object-cover" />
                <div className="p-2 space-y-1">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[item.status]}`}>
                    {item.status === 'published'
                      ? t('partnerMediaPublish')
                      : item.status === 'archived'
                        ? t('partnerMediaArchive')
                        : t('partnerMediaDraft')}
                  </span>
                  {item.caption && (
                    <p className="text-xs text-gray-700 line-clamp-2">{item.caption}</p>
                  )}
                  {canEditMedia && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        className="text-[11px] text-sky-700 hover:underline"
                        onClick={() => toggleMediaStatus(item)}
                      >
                        {item.status === 'published' ? t('partnerMediaArchive') : t('partnerMediaPublish')}
                      </button>
                      {onDeletePartnerMediaItem && (
                        <button
                          type="button"
                          className="text-[11px] text-red-600 hover:underline"
                          onClick={() => onDeletePartnerMediaItem(item.id)}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-950">
            {t('partnerRaceReportTitle')}
          </h4>
          <p className="text-xs text-emerald-800 mt-1">
            {hasPublishableResults(performance)
              ? t('partnerRaceReportPrefill')
              : t('partnerRaceReportNoPerf')}
          </p>
          {existingReport?.status === 'published' && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              {t('partnerRaceReportPublished')}
              {existingReport.publishedAt
                ? ` · ${new Date(existingReport.publishedAt).toLocaleString('fr-FR')}`
                : ''}
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <label className="block text-sm">
            <span className="text-gray-700">{t('partnerResultsOverall')}</span>
            <input
              type="text"
              value={raceOverallRanking}
              onChange={(e) => setRaceOverallRanking(e.target.value)}
              disabled={!canEditReport}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
              placeholder="Ex. 12e / 148"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">{t('partnerResultsTeam')}</span>
            <textarea
              value={teamRiderRankings}
              onChange={(e) => setTeamRiderRankings(e.target.value)}
              disabled={!canEditReport}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
              placeholder="Ex. Dupont 5e · Martin 18e"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">{t('partnerResultsSummary')}</span>
            <textarea
              value={resultsSummary}
              onChange={(e) => setResultsSummary(e.target.value)}
              disabled={!canEditReport}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </label>
        </div>

        {canEditReport && (
          <ActionButton onClick={handlePublishReport} disabled={savingReport || !teamId}>
            {savingReport
              ? '…'
              : existingReport?.status === 'published'
                ? t('partnerRaceReportUpdate')
                : t('partnerRaceReportPublish')}
          </ActionButton>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <EventOperationalLogisticsTab
          event={event}
          updateEvent={updateEvent}
          appState={appState}
          readOnly
          embedded
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Modèles réseaux sociaux</h4>
            <p className="text-xs text-gray-500">Textes préremplis à adapter avant publication.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => copyText('partants', partantsCopy)}
            >
              {copiedKey === 'partants' ? 'Copié ✓' : 'Copier annonce partantes'}
            </ActionButton>
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => copyText('results', resultsCopy)}
            >
              {copiedKey === 'results' ? 'Copié ✓' : 'Copier brouillon résultats'}
            </ActionButton>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-800 font-sans">
            {partantsCopy}
          </pre>
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-800 font-sans">
            {resultsCopy}
          </pre>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Partantes ({selectedRiders.length})
        </h4>
        {selectedRiders.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 italic">
            Aucune coureuse sélectionnée — demandez la validation de la sélection à l&apos;encadrement.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedRiders.map(rider => (
              <RiderMediaCard key={rider.id} rider={rider} />
            ))}
          </ul>
        )}
      </section>

      {ficheGroups.length > 0 && (
        <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-violet-950">
            Fiche de poste communication
          </h4>
          <div className="mt-3 space-y-4">
            {ficheGroups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-violet-800">{group.label}</p>
                <ul className="mt-1.5 space-y-1">
                  {group.items.map(task => (
                    <li key={task.name} className="flex items-start gap-2 text-sm text-violet-950">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      {task.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {(sponsors.length > 0 || newsletterSummary.recent.length > 0 || mediaMissions.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-950">
            Partenaires & missions média
          </h4>
          <p className="mt-1 text-xs text-amber-800">
            Posts / stories / RP à produire — pas de contrats ni montants.
          </p>
          {sponsors.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {sponsors.slice(0, 12).map(sponsor => (
                <li
                  key={sponsor.id}
                  className="rounded-full border border-amber-100 bg-white/80 px-3 py-1 text-sm font-medium text-gray-900"
                >
                  {sponsor.sponsorCompanyName || sponsor.description}
                </li>
              ))}
            </ul>
          )}
          {mediaMissions.length > 0 && (
            <ul className="mt-3 space-y-2">
              {mediaMissions.map((mission) => (
                <li
                  key={`${mission.incomeItemId}-${mission.deliverable.id}`}
                  className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-gray-900">{mission.deliverable.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mission.sponsorName}
                    {mission.deliverable.channel ? ` · ${mission.deliverable.channel}` : ''}
                    {mission.deliverable.category
                      ? ` · ${getCounterpartCategoryLabel(mission.deliverable.category, 'fr')}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {newsletterSummary.recent.length > 0 && (
            <div className="mt-4 pt-3 border-t border-amber-200/80">
              <p className="text-xs text-amber-900">
                Gazettes partenaires : {newsletterSummary.published} publiée
                {newsletterSummary.published > 1 ? 's' : ''}
                {newsletterSummary.drafts > 0
                  ? ` · ${newsletterSummary.drafts} brouillon${newsletterSummary.drafts > 1 ? 's' : ''}`
                  : ''}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CommunicationMissionTab;

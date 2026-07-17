import React, { useMemo, useState } from 'react';
import { OrganizerApplicationStatus, OrganizerContact } from '../types';
import ActionButton from './ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import {
  buildParticipationRequestLetter,
  copyParticipationRequestLetter,
  openParticipationRequestEmail,
} from '../utils/participationRequestLetter';
import ParticipationLetterPreview from './ParticipationLetterPreview';
import { getOrganizerDossierYear } from '../constants/demoOrganizerContacts';
import {
  downloadCandidatureDossier,
  filterOrganizerContacts,
  formatFrenchDate,
  getApplicationStatus,
  getDossierProgressStats,
  getMonthProjectionCounts,
  getTheoreticalEventDate,
  getUniqueCategories,
  groupOrganizerContactsByCategory,
  groupOrganizerContactsByMonth,
  setApplicationStatus,
} from '../utils/organizerContactUtils';
import CalendarProjectionPanel from './CalendarProjectionPanel';
import { TeamLevel } from '../types';
import {
  CIRCUIT_FILTER_OPTIONS,
  enrichOrganizerContact,
  GENDER_FILTER_OPTIONS,
  getCandidatureDeadlineDate,
  getGenderBadgeClass,
  getParticipationRegime,
  getTaxonomyBadgeClass,
  getTeamCalendarOfferSummary,
  isContactEligibleForTeam,
  isCandidatureWindowOpen,
  usesCycleWebRegistration,
  FEDERAL_REGISTRATION_LABEL,
  LEVEL_FILTER_OPTIONS,
  RaceCircuitTier,
  RaceCompetitionLevel,
  RaceGenderSegment,
  resolveRaceTaxonomy,
} from '../utils/raceCalendarTaxonomy';

interface OrganizerContactsPanelProps {
  contacts: OrganizerContact[];
  teamName: string;
  signerName?: string;
  teamLevel?: TeamLevel;
  onUpdateContact?: (contact: OrganizerContact) => void | Promise<void>;
  onSyncFromCalendar?: () => void | Promise<void>;
  onLoadDemoExamples?: () => void | Promise<void>;
}

type ViewMode = 'timeline' | 'category';
type PanelMode = 'dossier' | 'projection';

const STATUS_STYLES: Record<OrganizerApplicationStatus, string> = {
  pending: 'bg-slate-800 text-slate-200 border-slate-600',
  sent: 'bg-blue-950 text-blue-200 border-blue-700/60',
  accepted: 'bg-emerald-950 text-emerald-200 border-emerald-700/60',
  declined: 'bg-red-950 text-red-200 border-red-700/60',
};

const STATUS_CYCLE: OrganizerApplicationStatus[] = ['pending', 'sent', 'accepted', 'declined'];

const OrganizerContactsPanel: React.FC<OrganizerContactsPanelProps> = ({
  contacts,
  teamName,
  signerName,
  teamLevel,
  onUpdateContact,
  onSyncFromCalendar,
  onLoadDemoExamples,
}) => {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrganizerApplicationStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [panelMode, setPanelMode] = useState<PanelMode>('dossier');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [genderFilter, setGenderFilter] = useState<RaceGenderSegment | 'all'>('all');
  const [circuitFilter, setCircuitFilter] = useState<RaceCircuitTier | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<RaceCompetitionLevel | 'all'>('all');
  const [teamFitOnly, setTeamFitOnly] = useState(true);

  const targetYear = getOrganizerDossierYear();
  const teamOffer = getTeamCalendarOfferSummary(teamLevel);

  const categories = useMemo(() => getUniqueCategories(contacts), [contacts]);

  const filtered = useMemo(
    () =>
      filterOrganizerContacts(contacts, search, categoryFilter, statusFilter, targetYear, {
        gender: genderFilter,
        circuit: circuitFilter,
        level: levelFilter,
        teamLevel,
        teamFitOnly: teamFitOnly && Boolean(teamLevel),
      }),
    [
      contacts,
      search,
      categoryFilter,
      statusFilter,
      targetYear,
      genderFilter,
      circuitFilter,
      levelFilter,
      teamLevel,
      teamFitOnly,
    ]
  );

  const groups = useMemo(() => {
    if (viewMode === 'category') return groupOrganizerContactsByCategory(filtered);
    return groupOrganizerContactsByMonth(filtered, targetYear);
  }, [filtered, viewMode, targetYear]);

  const stats = useMemo(
    () => getDossierProgressStats(contacts, targetYear),
    [contacts, targetYear]
  );

  const monthCounts = useMemo(
    () => getMonthProjectionCounts(filtered, targetYear),
    [filtered, targetYear]
  );

  const statusLabel = (status: OrganizerApplicationStatus): string => {
    const map: Record<OrganizerApplicationStatus, string> = {
      pending: t('organizerAppStatusPending'),
      sent: t('organizerAppStatusSent'),
      accepted: t('organizerAppStatusAccepted'),
      declined: t('organizerAppStatusDeclined'),
    };
    return map[status];
  };

  const handleStatusClick = async (contact: OrganizerContact) => {
    if (!onUpdateContact) return;
    const current = getApplicationStatus(contact, targetYear);
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    const updated = setApplicationStatus(contact, targetYear, STATUS_CYCLE[nextIdx]);
    await onUpdateContact(updated);
  };

  const handleCandidater = async (contact: OrganizerContact) => {
    openParticipationRequestEmail({ teamName, contact, targetYear, signerName });
    if (onUpdateContact) {
      const updated = setApplicationStatus(contact, targetYear, 'sent');
      await onUpdateContact(updated);
    }
  };

  const handleCopy = async (contact: OrganizerContact) => {
    await copyParticipationRequestLetter({ teamName, contact, targetYear, signerName });
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkCandidater = async () => {
    const selected = filtered.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    for (let i = 0; i < selected.length; i++) {
      const contact = selected[i];
      const proceed =
        i === 0 ||
        window.confirm(
          t('organizerAppBulkNext')
            .replace('{current}', String(i + 1))
            .replace('{total}', String(selected.length))
            .replace('{event}', contact.eventName)
        );
      if (!proceed) break;
      openParticipationRequestEmail({ teamName, contact, targetYear, signerName });
      if (onUpdateContact) {
        await onUpdateContact(setApplicationStatus(contact, targetYear, 'sent'));
      }
    }
    setSelectedIds(new Set());
  };

  const handleSync = async () => {
    if (!onSyncFromCalendar) return;
    setSyncing(true);
    try {
      await onSyncFromCalendar();
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadDemo = async () => {
    if (!onLoadDemoExamples) return;
    setLoadingDemo(true);
    try {
      await onLoadDemoExamples();
    } finally {
      setLoadingDemo(false);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center p-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-700 font-medium">{t('organizerContactsEmptyTitle')}</p>
        <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">{t('organizerAppEmptyDesc')}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-5">
          {onSyncFromCalendar && (
            <ActionButton variant="primary" onClick={handleSync} disabled={syncing}>
              {syncing ? t('loading') : t('organizerAppSyncCalendar')}
            </ActionButton>
          )}
          {onLoadDemoExamples && (
            <ActionButton variant="secondary" onClick={handleLoadDemo} disabled={loadingDemo}>
              {loadingDemo ? t('loading') : t('organizerAppLoadExamples')}
            </ActionButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête dossier */}
      <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-700/40 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-indigo-100">
              {t('organizerAppDossierTitle').replace('{year}', String(targetYear))}
            </h3>
            <p className="text-sm text-indigo-200 mt-1">{t('organizerAppDossierDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-200">
              {stats.total} {t('organizerAppStatTotal')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200">
              {stats.pending} {t('organizerAppStatusPending')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-200 border border-blue-700/60">
              {stats.sent} {t('organizerAppStatusSent')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-700/60">
              {stats.accepted} {t('organizerAppStatusAccepted')}
            </span>
          </div>
        </div>

        {/* Progression dossier */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-indigo-200 mb-1">
            <span>{t('organizerAppProgressLabel')}</span>
            <span className="font-semibold">{stats.completionRate}% · {stats.withDate}/{stats.total} {t('organizerProjectionDated')}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
            {stats.accepted > 0 && (
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${(stats.accepted / stats.total) * 100}%` }}
                title={t('organizerAppStatusAccepted')}
              />
            )}
            {stats.sent > 0 && (
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${(stats.sent / stats.total) * 100}%` }}
                title={t('organizerAppStatusSent')}
              />
            )}
            {stats.declined > 0 && (
              <div
                className="bg-red-400 h-full transition-all"
                style={{ width: `${(stats.declined / stats.total) * 100}%` }}
                title={t('organizerAppStatusDeclined')}
              />
            )}
            {stats.pending > 0 && (
              <div
                className="bg-gray-300 h-full transition-all"
                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                title={t('organizerAppStatusPending')}
              />
            )}
          </div>
        </div>

        {/* Bandeau mois */}
        {monthCounts.length > 0 && panelMode === 'dossier' && (
          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {monthCounts.map(({ month, count, accepted }) => (
              <div
                key={month}
                className="shrink-0 flex flex-col items-center min-w-[3rem] px-2 py-1.5 rounded-lg bg-slate-800 border border-indigo-700/40"
                title={`${count} épreuve(s) — ${accepted} confirmée(s)`}
              >
                <span className="text-[10px] font-bold text-indigo-300 uppercase">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][month - 1]}
                </span>
                <span className="text-sm font-semibold text-white">{count}</span>
                {accepted > 0 && (
                  <span className="text-[9px] text-emerald-300 font-medium">{accepted}✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {teamLevel && (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/60 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-100">{t('organizerAppTeamOfferTitle')}</p>
          <p className="mt-1 text-emerald-200">{teamOffer.fr}</p>
          <label className="mt-2 flex items-center gap-2 text-xs cursor-pointer text-emerald-200">
            <input
              type="checkbox"
              checked={teamFitOnly}
              onChange={(e) => setTeamFitOnly(e.target.checked)}
              className="rounded border-emerald-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
            />
            {t('organizerAppTeamFitOnly')}
          </label>
        </div>
      )}

      {/* Sous-onglets dossier / projection */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm w-fit">
        <button
          type="button"
          onClick={() => setPanelMode('dossier')}
          className={`px-4 py-2 ${panelMode === 'dossier' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {t('organizerAppPanelDossier')}
        </button>
        <button
          type="button"
          onClick={() => setPanelMode('projection')}
          className={`px-4 py-2 border-l border-gray-200 ${panelMode === 'projection' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {t('organizerAppPanelProjection')}
        </button>
      </div>

      {panelMode === 'projection' ? (
        <CalendarProjectionPanel contacts={filtered} targetYear={targetYear} />
      ) : (
      <>
      {/* Filtres réglementaires UCI / FFC */}
      <div className="flex flex-wrap gap-2">
        {GENDER_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setGenderFilter(opt.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              genderFilter === opt.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
            }`}
          >
            {opt.fr}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {LEVEL_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLevelFilter(opt.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              levelFilter === opt.id
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {opt.fr}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {CIRCUIT_FILTER_OPTIONS.filter((o) => o.id !== 'all').slice(0, 6).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setCircuitFilter(circuitFilter === opt.id ? 'all' : opt.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              circuitFilter === opt.id
                ? getTaxonomyBadgeClass(opt.id as RaceCircuitTier) + ' ring-2 ring-indigo-300'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {opt.fr}
          </button>
        ))}
        {circuitFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setCircuitFilter('all')}
            className="px-3 py-1 rounded-full text-xs text-gray-500 underline"
          >
            {t('all')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('organizerContactsSearch')}
          className="flex-1 min-w-[200px] max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrganizerApplicationStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="all">{t('organizerAppFilterAllStatus')}</option>
          <option value="pending">{t('organizerAppStatusPending')}</option>
          <option value="sent">{t('organizerAppStatusSent')}</option>
          <option value="accepted">{t('organizerAppStatusAccepted')}</option>
          <option value="declined">{t('organizerAppStatusDeclined')}</option>
        </select>

        <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-2 ${viewMode === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {t('organizerAppViewTimeline')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('category')}
            className={`px-3 py-2 border-l border-gray-300 ${viewMode === 'category' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {t('organizerAppViewCategory')}
          </button>
        </div>

        {onSyncFromCalendar && (
          <ActionButton size="sm" variant="secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? t('loading') : t('organizerAppSyncCalendar')}
          </ActionButton>
        )}

        {onLoadDemoExamples && (
          <ActionButton size="sm" variant="secondary" onClick={handleLoadDemo} disabled={loadingDemo}>
            {loadingDemo ? t('loading') : t('organizerAppLoadExamples')}
          </ActionButton>
        )}

        <ActionButton
          size="sm"
          variant="secondary"
          onClick={() => downloadCandidatureDossier(filtered, teamName, targetYear)}
        >
          {t('organizerAppExportDossier')}
        </ActionButton>

        {selectedIds.size > 0 && (
          <ActionButton size="sm" variant="primary" onClick={handleBulkCandidater}>
            {t('organizerAppBulkApply').replace('{count}', String(selectedIds.size))}
          </ActionButton>
        )}
      </div>

      {/* Filtres catégorie */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              categoryFilter === null
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
            }`}
          >
            {t('all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Groupes */}
      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{t('organizerAppNoResults')}</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                {group.label}
                <span className="text-slate-500 font-normal">({group.contacts.length})</span>
              </h4>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.contacts.map((contact) => {
                  const theoretical = getTheoreticalEventDate(contact, targetYear);
                  const status = getApplicationStatus(contact, targetYear);
                  const isSelected = selectedIds.has(contact.id);
                  const enriched = enrichOrganizerContact(contact);
                  const taxonomy = resolveRaceTaxonomy(enriched);
                  const regime = getParticipationRegime(taxonomy);
                  const candidatureDeadline =
                    theoretical ? getCandidatureDeadlineDate(theoretical, taxonomy) : null;
                  const windowOpen =
                    theoretical ? isCandidatureWindowOpen(theoretical, taxonomy) : false;
                  const teamFit = isContactEligibleForTeam(enriched, teamLevel);

                  return (
                    <article
                      key={contact.id}
                      className={`relative rounded-lg border bg-slate-900/90 p-4 shadow-sm transition-shadow hover:shadow-md ${
                        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/40' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(contact.id)}
                          className="mt-1 rounded border-slate-500 bg-slate-800 text-indigo-500"
                          aria-label={contact.eventName}
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-white truncate" title={contact.eventName}>
                            {contact.eventName}
                          </h5>
                          <p className="text-sm text-sky-300 font-medium mt-0.5">
                            {theoretical
                              ? formatFrenchDate(theoretical, { approximate: true })
                              : t('organizerAppDateUnknown')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStatusClick(contact)}
                          disabled={!onUpdateContact}
                          title={onUpdateContact ? t('organizerAppStatusClick') : undefined}
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[status]} ${
                            onUpdateContact ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                          }`}
                        >
                          {statusLabel(status)}
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-medium ${getTaxonomyBadgeClass(taxonomy.circuitTier)}`}
                        >
                          {taxonomy.badgeLabel}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getGenderBadgeClass(taxonomy.genderSegment)}`}
                        >
                          {taxonomy.genderSegment === 'women'
                            ? 'F'
                            : taxonomy.genderSegment === 'men'
                              ? 'H'
                              : taxonomy.genderSegment === 'youth'
                                ? 'Jeunes'
                                : 'Mixte'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600 capitalize">
                          {taxonomy.competitionLevel}
                        </span>
                        {usesCycleWebRegistration(taxonomy) && (
                          <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-200 border border-sky-700/60 font-medium">
                            {FEDERAL_REGISTRATION_LABEL.fr}
                          </span>
                        )}
                        {teamLevel && !teamFit && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700/60">
                            {t('organizerAppOutsideOffer')}
                          </span>
                        )}
                        {contact.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700/60">
                            {contact.category}
                          </span>
                        )}
                        {contact.uciClass && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700/60">
                            {contact.uciClass}
                          </span>
                        )}
                        {contact.location && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 truncate max-w-full">
                            {contact.location}
                          </span>
                        )}
                      </div>

                      {candidatureDeadline && status === 'pending' && (
                        <p
                          className={`mt-2 text-[11px] ${
                            windowOpen ? 'text-emerald-300 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {windowOpen ? t('organizerAppCandidatureOpen') : t('organizerAppCandidatureDeadline')}{' '}
                          {formatFrenchDate(candidatureDeadline, { approximate: false })}
                          {' · '}
                          {regime.label.fr}
                        </p>
                      )}

                      <div className="mt-2 text-xs text-slate-400">
                        {contact.organizingEntity && <span>{contact.organizingEntity}</span>}
                        {contact.contactName && (
                          <span className="block">{contact.contactName}</span>
                        )}
                        <a
                          href={`mailto:${contact.contactEmail}`}
                          className="text-sky-300 hover:text-sky-200 hover:underline block truncate"
                        >
                          {contact.contactEmail}
                        </a>
                        {contact.participationYears?.length > 0 && (
                          <span className="block mt-1 text-slate-500">
                            {t('organizerAppParticipated')}: {contact.participationYears.join(', ')}
                          </span>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="mt-1.5 text-[11px] text-amber-200 bg-amber-950/70 border border-amber-700/50 rounded px-2 py-1 line-clamp-2">
                          {contact.notes}
                        </p>
                      )}

                      <div className="mt-3 flex gap-2">
                        <ActionButton
                          size="sm"
                          variant="primary"
                          className="flex-1"
                          onClick={() => handleCandidater(contact)}
                        >
                          {t('organizerAppCandidater')}
                        </ActionButton>
                        <ActionButton size="sm" variant="secondary" onClick={() => handleCopy(contact)}>
                          {copiedId === contact.id ? t('organizerContactsCopied') : t('organizerContactsCopyLetter')}
                        </ActionButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {filtered.length === 1 && panelMode === 'dossier' && (
        <details className="rounded-lg border border-white/10 bg-slate-900/60 p-4 text-sm">
          <summary className="cursor-pointer font-medium text-white">
            {t('organizerContactsPreviewLetter')}
          </summary>
          <ParticipationLetterPreview
            blocks={buildParticipationRequestLetter({ teamName, contact: filtered[0], targetYear, signerName }).blocks}
          />
        </details>
      )}
      </>
      )}
    </div>
  );
};

export default OrganizerContactsPanel;

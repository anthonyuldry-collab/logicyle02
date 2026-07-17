import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OrganizerApplicationStatus, OrganizerContact } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import {
  buildProjectionEntriesForYear,
  formatFrenchDate,
  formatProjectionDateRange,
  getDossierProgressStats,
  getTheoreticalEventDate,
} from '../utils/organizerContactUtils';
import {
  enrichOrganizerContact,
  getCandidatureDeadlineDate,
  getParticipationRegime,
  resolveRaceTaxonomy,
} from '../utils/raceCalendarTaxonomy';

interface CalendarProjectionPanelProps {
  contacts: OrganizerContact[];
  targetYear: number;
  onSelectContact?: (contact: OrganizerContact) => void;
}

const STATUS_DOT: Record<OrganizerApplicationStatus, string> = {
  pending: 'bg-gray-400',
  sent: 'bg-blue-500',
  accepted: 'bg-emerald-500',
  declined: 'bg-red-400',
};

const STATUS_RING: Record<OrganizerApplicationStatus, string> = {
  pending: 'ring-gray-200',
  sent: 'ring-blue-200',
  accepted: 'ring-emerald-300',
  declined: 'ring-red-200',
};

const STATUS_CHIP: Record<OrganizerApplicationStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-700',
};

const STATUS_BG: Record<OrganizerApplicationStatus, string> = {
  pending: 'bg-white border-gray-200 border-dashed hover:border-gray-300',
  sent: 'bg-blue-50/90 border-blue-200 border-dashed hover:border-blue-300',
  accepted: 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-400',
  declined: 'bg-red-50/70 border-red-200 border-dashed opacity-75',
};

const STATUS_BORDER: Record<OrganizerApplicationStatus, string> = {
  pending: 'border-l-gray-400',
  sent: 'border-l-blue-500',
  accepted: 'border-l-emerald-500',
  declined: 'border-l-red-400',
};

const FRENCH_MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

type ProjectionEntry = ReturnType<typeof buildProjectionEntriesForYear>[number];

function MonthEventCard({
  entry,
  onSelectContact,
  statusLabel,
  stageCountLabel,
}: {
  entry: ProjectionEntry;
  onSelectContact?: (contact: OrganizerContact) => void;
  statusLabel: (status: OrganizerApplicationStatus) => string;
  stageCountLabel: (count: number) => string;
}) {
  const taxonomy = resolveRaceTaxonomy(enrichOrganizerContact(entry.contact));
  const regime = getParticipationRegime(taxonomy);
  const deadline = getCandidatureDeadlineDate(entry.theoreticalDate, taxonomy);
  const genderShort =
    taxonomy.genderSegment === 'women'
      ? 'F'
      : taxonomy.genderSegment === 'men'
        ? 'H'
        : taxonomy.competitionLevel;
  const dateRangeLabel = entry.isStageRace
    ? formatProjectionDateRange(entry.theoreticalDate, entry.theoreticalEndDate, { approximate: true })
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelectContact?.(entry.contact)}
      className={`group w-full rounded-lg border px-2.5 py-2 text-left text-xs leading-snug transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${STATUS_BG[entry.status]}`}
      title={`${entry.contact.eventName} · ${regime.label.fr} · candidater avant ${deadline}${entry.stageCount ? ` · ${entry.stageCount} étapes` : ''}`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white ring-2 ${STATUS_DOT[entry.status]} ${STATUS_RING[entry.status]}`}
        >
          {entry.day}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold text-gray-900 group-hover:text-indigo-950">
            {entry.contact.eventName}
          </p>
          {dateRangeLabel && (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-indigo-800/90">
              {dateRangeLabel}
            </p>
          )}
          <p className="mt-0.5 truncate text-[11px] text-gray-500">
            {taxonomy.badgeLabel} · {genderShort}
            {entry.stageCount != null && entry.stageCount > 1
              ? ` · ${stageCountLabel(entry.stageCount)}`
              : ''}
          </p>
          <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CHIP[entry.status]}`}>
            {statusLabel(entry.status)}
          </span>
        </div>
      </div>
    </button>
  );
}

const CalendarProjectionPanel: React.FC<CalendarProjectionPanelProps> = ({
  contacts,
  targetYear,
  onSelectContact,
}) => {
  const { t } = useTranslations();
  const carouselRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  const [showEmptyMonths, setShowEmptyMonths] = useState(false);

  const entries = useMemo(
    () => buildProjectionEntriesForYear(contacts, targetYear),
    [contacts, targetYear],
  );

  const stats = useMemo(
    () => getDossierProgressStats(contacts, targetYear),
    [contacts, targetYear],
  );

  const entriesByMonth = useMemo(() => {
    const map = new Map<number, typeof entries>();
    for (const entry of entries) {
      const list = map.get(entry.month) || [];
      list.push(entry);
      map.set(entry.month, list);
    }
    return map;
  }, [entries]);

  const busyMonths = useMemo(
    () => [...entriesByMonth.keys()].sort((a, b) => a - b),
    [entriesByMonth],
  );

  const emptyMonths = useMemo(
    () => FRENCH_MONTHS_SHORT.map((_, i) => i + 1).filter((m) => !entriesByMonth.has(m)),
    [entriesByMonth],
  );

  const undatedCount = contacts.length - entries.length;

  const firstBusyMonth = busyMonths[0] ?? null;

  useEffect(() => {
    if (focusedMonth == null && firstBusyMonth != null) {
      setFocusedMonth(firstBusyMonth);
    }
  }, [firstBusyMonth, focusedMonth]);

  const scrollToMonth = useCallback((month: number) => {
    setFocusedMonth(month);
    const el = monthRefs.current[month];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const scrollCarousel = useCallback((direction: -1 | 1) => {
    const idx = focusedMonth != null ? busyMonths.indexOf(focusedMonth) : 0;
    const nextIdx = Math.max(0, Math.min(busyMonths.length - 1, idx + direction));
    const nextMonth = busyMonths[nextIdx];
    if (nextMonth != null) scrollToMonth(nextMonth);
  }, [busyMonths, focusedMonth, scrollToMonth]);

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">{t('organizerProjectionEmpty')}</p>
    );
  }

  const statusLabel = (status: OrganizerApplicationStatus) => {
    if (status === 'pending') return t('organizerAppStatusPending');
    if (status === 'sent') return t('organizerAppStatusSent');
    if (status === 'accepted') return t('organizerAppStatusAccepted');
    return t('organizerAppStatusDeclined');
  };

  const stageCountLabel = (count: number) =>
    t('organizerProjectionStageCount').replace('{count}', String(count));

  const filteredChrono = focusedMonth != null
    ? entries.filter((e) => e.month === focusedMonth)
    : entries;

  return (
    <div className="space-y-5">
      {/* En-tête + stats */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h4 className="text-lg font-semibold text-indigo-950">
              {t('organizerProjectionTitle').replace('{year}', String(targetYear))}
            </h4>
            <p className="mt-1 text-sm text-indigo-800/90 leading-relaxed">{t('organizerProjectionDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs shrink-0">
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-white px-3 py-1.5 font-medium text-indigo-900 shadow-sm">
              {entries.length} {t('organizerProjectionDated')}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm">
              {busyMonths.length} {t('organizerProjectionActiveMonths')}
            </span>
            {undatedCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-900">
                {undatedCount} {t('organizerAppDateUnknown').toLowerCase()}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 font-medium text-emerald-800">
              {stats.accepted} {t('organizerAppStatusAccepted').toLowerCase()}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
          {(Object.keys(STATUS_DOT) as OrganizerApplicationStatus[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
              {statusLabel(status)}
            </span>
          ))}
          <span className="text-gray-400">· {t('organizerProjectionApproxHint')}</span>
        </div>
      </div>

      {/* Vue d'ensemble — bandeau 12 mois défilant */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('organizerProjectionOverview')}
          </h5>
          <p className="text-[11px] text-gray-400 hidden sm:block">{t('organizerProjectionScrollMonths')}</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin snap-x snap-mandatory">
          {FRENCH_MONTHS_SHORT.map((label, monthIndex) => {
            const month = monthIndex + 1;
            const monthEntries = entriesByMonth.get(month) || [];
            const isActive = focusedMonth === month;
            const hasEvents = monthEntries.length > 0;

            return (
              <button
                key={month}
                type="button"
                onClick={() => {
                  if (hasEvents) scrollToMonth(month);
                }}
                className={`snap-start shrink-0 flex flex-col items-center rounded-lg border px-2.5 py-2 min-w-[52px] transition ${
                  isActive
                    ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200 shadow-sm'
                    : hasEvents
                      ? 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                      : 'border-gray-100 bg-gray-50/80 opacity-60 hover:opacity-100'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-indigo-800' : 'text-gray-600'}`}>
                  {label}
                </span>
                {hasEvents ? (
                  <>
                    <span className={`mt-1 text-sm font-bold ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {monthEntries.length}
                    </span>
                    <div className="mt-1 flex gap-0.5">
                      {monthEntries.slice(0, 4).map((e) => (
                        <span key={e.contact.id} className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[e.status]}`} />
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="mt-2 text-[10px] text-gray-300">—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carrousel des mois actifs */}
      {busyMonths.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-gray-900">
              {focusedMonth != null
                ? `${FRENCH_MONTHS_SHORT[focusedMonth - 1]} ${targetYear}`
                : t('organizerProjectionOverview')}
            </h5>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                disabled={focusedMonth === busyMonths[0]}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                aria-label="Mois précédent"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setFocusedMonth(null)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  focusedMonth == null
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                disabled={focusedMonth === busyMonths[busyMonths.length - 1]}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                aria-label="Mois suivant"
              >
                ›
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          >
            {(focusedMonth != null ? [focusedMonth] : busyMonths).map((month) => {
              const monthEntries = entriesByMonth.get(month) || [];
              const label = FRENCH_MONTHS_SHORT[month - 1];

              return (
                <div
                  key={month}
                  ref={(el) => { monthRefs.current[month] = el; }}
                  className="snap-center shrink-0 w-[min(100%,280px)] sm:w-[300px] flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm ring-1 ring-gray-100 min-h-[160px]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">{label}</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {monthEntries.length} course{monthEntries.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {monthEntries.map((entry) => (
                      <MonthEventCard
                        key={entry.contact.id}
                        entry={entry}
                        onSelectContact={onSelectContact}
                        statusLabel={statusLabel}
                        stageCountLabel={stageCountLabel}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mois vides repliables */}
      {emptyMonths.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEmptyMonths((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-100/80"
          >
            <span>
              {t('organizerProjectionEmptyMonths').replace('{count}', String(emptyMonths.length))}
            </span>
            <span className="text-xs text-indigo-600 font-medium">
              {showEmptyMonths ? t('organizerProjectionHideEmpty') : t('organizerProjectionShowEmpty')}
            </span>
          </button>
          {showEmptyMonths && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
              {emptyMonths.map((month) => (
                <span
                  key={month}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-400"
                >
                  {FRENCH_MONTHS_SHORT[month - 1]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chronologie */}
      {entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h5 className="text-sm font-semibold text-gray-900">{t('organizerProjectionChrono')}</h5>
                <p className="mt-0.5 text-xs text-gray-500">
                  {filteredChrono.length} course{filteredChrono.length > 1 ? 's' : ''}
                  {focusedMonth != null ? ` · ${FRENCH_MONTHS_SHORT[focusedMonth - 1]}` : ' · ordre chronologique'}
                </p>
              </div>
              {focusedMonth != null && (
                <button
                  type="button"
                  onClick={() => setFocusedMonth(null)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Voir toute la saison
                </button>
              )}
            </div>
          </div>
          <ol className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
            {filteredChrono.map((entry) => {
              const taxonomy = resolveRaceTaxonomy(enrichOrganizerContact(entry.contact));
              const meta = [taxonomy.badgeLabel, taxonomy.genderSegment, entry.contact.location]
                .filter(Boolean)
                .join(' · ');
              const deadline = getCandidatureDeadlineDate(entry.theoreticalDate, taxonomy);
              const dateLabel = entry.isStageRace
                ? formatProjectionDateRange(entry.theoreticalDate, entry.theoreticalEndDate, {
                    approximate: true,
                  })
                : formatFrenchDate(entry.theoreticalDate, { approximate: true });

              return (
                <li key={entry.contact.id}>
                  {onSelectContact ? (
                    <button
                      type="button"
                      onClick={() => onSelectContact(entry.contact)}
                      className={`flex w-full flex-col gap-3 border-l-4 px-4 py-3.5 text-left transition hover:bg-gray-50/90 focus:outline-none focus-visible:bg-indigo-50/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${STATUS_BORDER[entry.status]}`}
                    >
                      <div className="shrink-0 sm:w-36">
                        <p className="text-sm font-semibold text-indigo-800 leading-snug">{dateLabel}</p>
                        {entry.stageCount != null && entry.stageCount > 1 && (
                          <p className="mt-1 text-[11px] font-medium text-indigo-700">
                            {stageCountLabel(entry.stageCount)}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-gray-400">≈ date théorique</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 sm:text-base">{entry.contact.eventName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{meta}</p>
                        <p className="mt-1 text-xs text-indigo-700">
                          {t('organizerAppCandidatureDeadline')}{' '}
                          {formatFrenchDate(deadline, { approximate: false })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold sm:self-center ${STATUS_CHIP[entry.status]}`}
                      >
                        {statusLabel(entry.status)}
                      </span>
                    </button>
                  ) : (
                    <div
                      className={`flex flex-col gap-3 border-l-4 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${STATUS_BORDER[entry.status]}`}
                    >
                      <div className="shrink-0 sm:w-36">
                        <p className="text-sm font-semibold text-indigo-800 leading-snug">{dateLabel}</p>
                        {entry.stageCount != null && entry.stageCount > 1 && (
                          <p className="mt-1 text-[11px] font-medium text-indigo-700">
                            {stageCountLabel(entry.stageCount)}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-gray-400">≈ date théorique</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 sm:text-base">{entry.contact.eventName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{meta}</p>
                        <p className="mt-1 text-xs text-indigo-700">
                          {t('organizerAppCandidatureDeadline')}{' '}
                          {formatFrenchDate(deadline, { approximate: false })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold sm:self-center ${STATUS_CHIP[entry.status]}`}
                      >
                        {statusLabel(entry.status)}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};

export default CalendarProjectionPanel;

export function getProjectionsForCalendarDay(
  contacts: OrganizerContact[],
  targetYear: number,
  dateStr: string
): OrganizerContact[] {
  return contacts.filter((c) => getTheoreticalEventDate(c, targetYear) === dateStr);
}

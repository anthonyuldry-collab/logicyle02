import React, { useMemo, useState } from 'react';
import { AppSection, AppState, EventAccommodation, PermissionLevel, RaceEvent, User } from '../../types';
import ActionButton from '../../components/ActionButton';
import { saveData } from '../../services/firebaseService';
import { useTranslations } from '../../hooks/useTranslations';

interface EventAccommodationHistoryTabProps {
  event: RaceEvent;
  eventId: string;
  appState: AppState;
  setEventAccommodations: React.Dispatch<React.SetStateAction<EventAccommodation[]>>;
  currentUser?: User | null;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
}

type YearFilter = 'all' | number;

function getEventYear(event: RaceEvent): number | null {
  const d = new Date(event.date + 'T12:00:00Z');
  const year = d.getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function normalize(s: string) {
  return (s || '').trim().toLowerCase();
}

const outcomeBadgeClass: Record<NonNullable<EventAccommodation['reviewOutcome']>, string> = {
  good: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-200 text-gray-800',
  bad: 'bg-red-100 text-red-800',
};

const EventAccommodationHistoryTab: React.FC<EventAccommodationHistoryTabProps> = ({
  event,
  eventId,
  appState,
  setEventAccommodations,
  currentUser,
}) => {
  const { t } = useTranslations();
  const isRider = currentUser?.userRole === 'Coureur';
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [nameFilter, setNameFilter] = useState('');
  const [dirtyIds, setDirtyIds] = useState<Record<string, boolean>>({});
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const currentEventYear = useMemo(() => getEventYear(event), [event]);

  const outcomeLabel = (outcome: NonNullable<EventAccommodation['reviewOutcome']>) => {
    if (outcome === 'good') return t('accHistoryOutcomeGood');
    if (outcome === 'bad') return t('accHistoryOutcomeBad');
    return t('accHistoryOutcomeNeutral');
  };

  const relevantEventIds = useMemo(() => {
    const baseName = normalize(event.name);
    const baseLocation = normalize(event.location);

    return appState.raceEvents
      .filter(e => {
        const sameName = normalize(e.name) === baseName;
        const sameLocation = baseLocation && normalize(e.location) === baseLocation;
        return sameName || sameLocation;
      })
      .map(e => e.id);
  }, [appState.raceEvents, event.name, event.location]);

  const historyRows = useMemo(() => {
    const eventById = new Map(appState.raceEvents.map(e => [e.id, e]));

    const rows = appState.eventAccommodations
      .filter(acc => relevantEventIds.includes(acc.eventId))
      .map(acc => {
        const e = eventById.get(acc.eventId);
        const year = e ? getEventYear(e) : null;
        return { acc, event: e, year };
      })
      .filter(r => r.event && r.year !== null);

    const filteredByYear =
      yearFilter === 'all' ? rows : rows.filter(r => r.year === yearFilter);

    const f = normalize(nameFilter);
    const filteredByName =
      !f
        ? filteredByYear
        : filteredByYear.filter(r =>
            normalize(r.acc.hotelName).includes(f) || normalize(r.acc.address).includes(f)
          );

    return filteredByName.sort((a, b) => (b.year! - a.year!) || (b.event!.date || '').localeCompare(a.event!.date || ''));
  }, [appState.eventAccommodations, appState.raceEvents, relevantEventIds, yearFilter, nameFilter]);

  const availableYears = useMemo(() => {
    const eventById = new Map(appState.raceEvents.map(e => [e.id, e]));
    const years = new Set<number>();
    for (const acc of appState.eventAccommodations) {
      if (!relevantEventIds.includes(acc.eventId)) continue;
      const e = eventById.get(acc.eventId);
      if (!e) continue;
      const y = getEventYear(e);
      if (y !== null) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [appState.eventAccommodations, appState.raceEvents, relevantEventIds]);

  const stats = useMemo(() => ({
    total: historyRows.length,
    good: historyRows.filter(r => r.acc.reviewOutcome === 'good').length,
    bad: historyRows.filter(r => r.acc.reviewOutcome === 'bad').length,
  }), [historyRows]);

  const handleUpdateLocal = (id: string, patch: Partial<EventAccommodation>) => {
    setEventAccommodations(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
    setDirtyIds(prev => ({ ...prev, [id]: true }));
  };

  const handleSaveReview = async (item: EventAccommodation) => {
    if (!appState.activeTeamId) {
      alert("Aucune équipe active : impossible de sauvegarder l'avis.");
      return;
    }
    try {
      await saveData(appState.activeTeamId, 'eventAccommodations', item);
      setDirtyIds(prev => ({ ...prev, [item.id]: false }));
      setSaveMessage(t('accHistorySaved'));
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (e) {
      console.error('❌ Erreur sauvegarde avis hébergement:', e);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  };

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';
  const selectClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">
            {t('eventTabAccommodationHistory')}
            {currentEventYear ? ` · ${currentEventYear}` : ''}
          </h3>
          <p className="text-sm text-gray-500">
            {event.name}{event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="w-full md:w-40">
          <label className="block text-xs font-medium text-gray-600">{t('accHistoryYear')}</label>
          <select
            className={selectClass}
            value={yearFilter === 'all' ? 'all' : String(yearFilter)}
            onChange={e => {
              const v = e.target.value;
              setYearFilter(v === 'all' ? 'all' : Number(v));
            }}
          >
            <option value="all">{t('accHistoryYearAll')}</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:flex-1 md:max-w-sm">
          <label className="block text-xs font-medium text-gray-600">{t('accHistorySearch')}</label>
          <input
            className={inputClass}
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder={t('accHistorySearch')}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('accHistoryKpiTotal'), value: stats.total, tone: 'text-gray-900' },
          { label: t('accHistoryKpiGood'), value: stats.good, tone: 'text-emerald-600' },
          { label: t('accHistoryKpiBad'), value: stats.bad, tone: 'text-red-600' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[10px] uppercase text-gray-400">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {saveMessage}
        </div>
      )}

      {historyRows.length === 0 ? (
        <p className="text-gray-500 italic p-8 bg-gray-50 rounded-xl border border-dashed text-center">
          {t('accHistoryEmpty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {historyRows.map(({ acc, event: e, year }) => {
            const isCurrentEvent = acc.eventId === eventId;
            const outcome = acc.reviewOutcome;
            const note = acc.reviewNote || '';
            const isExpanded = !!expandedNoteIds[acc.id];
            const isDirty = !!dirtyIds[acc.id];

            return (
              <article
                key={acc.id}
                className={`rounded-xl border bg-white shadow-sm overflow-hidden ${isDirty ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-200'}`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {acc.hotelName || t('accHistoryNoName')}
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{year}</span>
                    {isCurrentEvent && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {t('accHistoryCurrentEvent')}
                      </span>
                    )}
                    {outcome && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${outcomeBadgeClass[outcome]}`}>
                        {outcomeLabel(outcome)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{acc.address || t('accHistoryNoAddress')}</p>
                  <p className="text-xs text-gray-500">{e?.name} · {e?.date || '—'}</p>

                  {!isRider && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">{t('accHistoryOutcome')}</label>
                        <select
                          className={selectClass}
                          value={acc.reviewOutcome || ''}
                          onChange={ev =>
                            handleUpdateLocal(acc.id, {
                              reviewOutcome: (ev.target.value || undefined) as EventAccommodation['reviewOutcome'],
                            })
                          }
                        >
                          <option value="">—</option>
                          <option value="good">{t('accHistoryOutcomeGood')}</option>
                          <option value="neutral">{t('accHistoryOutcomeNeutral')}</option>
                          <option value="bad">{t('accHistoryOutcomeBad')}</option>
                        </select>
                      </div>
                      <div>
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => setExpandedNoteIds(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                        >
                          {isExpanded ? '▾' : '▸'} {t('accHistoryExpandNote')}
                        </button>
                        {isExpanded && (
                          <textarea
                            className={`${inputClass} mt-1`}
                            rows={3}
                            value={note}
                            onChange={ev => handleUpdateLocal(acc.id, { reviewNote: ev.target.value })}
                            placeholder={t('accHistoryNotePlaceholder')}
                          />
                        )}
                      </div>
                      {isDirty && (
                        <div className="flex justify-end">
                          <ActionButton
                            size="sm"
                            onClick={() => {
                              const latest = appState.eventAccommodations.find(a => a.id === acc.id) || acc;
                              handleSaveReview(latest);
                            }}
                          >
                            {t('accHistorySave')}
                          </ActionButton>
                        </div>
                      )}
                    </div>
                  )}

                  {isRider && note.trim() && (
                    <p className="text-sm text-gray-600 border-t border-gray-100 pt-2">{note}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventAccommodationHistoryTab;

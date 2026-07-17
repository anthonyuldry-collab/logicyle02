import React, { useEffect, useMemo, useState } from 'react';
import { AppSection, AppState, EventAccommodation, RaceEvent, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import AccommodationPlacesMapPanel from '../components/AccommodationPlacesMapPanel';
import { saveData } from '../services/firebaseService';
import { useTranslations } from '../hooks/useTranslations';
import { buildAccommodationPlaceGroups } from '../utils/accommodationGeoUtils';

type YearFilter = 'all' | number;
type OutcomeFilter = 'all' | NonNullable<EventAccommodation['reviewOutcome']> | 'none';
type SortKey = 'dateDesc' | 'dateAsc' | 'hotelAsc';
type ViewTab = 'monthly' | 'recommended' | 'notRecommended' | 'byPlaces' | 'all';
type MonthlyScope = 'selectedYear' | 'allYears';

function getEventYear(event: RaceEvent): number | null {
  const d = new Date(event.date + 'T12:00:00Z');
  const year = d.getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function normalize(s: string) {
  return (s || '').trim().toLowerCase();
}

function getEventMonthIndex(event: RaceEvent): number | null {
  // event.date attendu: YYYY-MM-DD
  if (!event?.date) return null;
  const m = Number(event.date.split('-')[1]);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  return m - 1;
}

function getEventGroupKey(event: RaceEvent): string {
  // Regrouper "Paris-Bourges" d'une année sur l'autre
  // On garde le nom comme clé principale, + la localisation si le nom est trop générique.
  const name = normalize(event?.name || '');
  const loc = normalize(event?.location || '');
  return loc ? `${name}__${loc}` : name;
}

const outcomeBadgeClass: Record<NonNullable<EventAccommodation['reviewOutcome']>, string> = {
  good: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-200 text-gray-800',
  bad: 'bg-red-100 text-red-800',
};

const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface AccommodationHistorySectionProps {
  appState: AppState;
  setEventAccommodations: React.Dispatch<React.SetStateAction<EventAccommodation[]>>;
  currentUser: User;
  navigateTo: (section: AppSection, eventId?: string) => void;
}

export const AccommodationHistorySection: React.FC<AccommodationHistorySectionProps> = ({
  appState,
  setEventAccommodations,
  currentUser,
  navigateTo,
}) => {
  const { t, language } = useTranslations();
  const isRider = currentUser.userRole === 'Coureur';
  const monthLabels = language === 'en' ? MONTH_LABELS_EN : MONTH_LABELS_FR;

  const outcomeLabel = (outcome: NonNullable<EventAccommodation['reviewOutcome']>) => {
    if (outcome === 'good') return t('accHistoryOutcomeGood');
    if (outcome === 'bad') return t('accHistoryOutcomeBad');
    return t('accHistoryOutcomeNeutral');
  };

  const [viewTab, setViewTab] = useState<ViewTab>('monthly');
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dateDesc');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [monthlyScope, setMonthlyScope] = useState<MonthlyScope>('selectedYear');
  const [selectedEventGroupKey, setSelectedEventGroupKey] = useState<string | null>(null);
  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [dirtyIds, setDirtyIds] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const eventById = useMemo(() => new Map(appState.raceEvents.map(e => [e.id, e])), [appState.raceEvents]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const e of appState.raceEvents) {
      const y = getEventYear(e);
      if (y !== null) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [appState.raceEvents]);

  const baseRows = useMemo(() => {
    const f = normalize(search);

    return appState.eventAccommodations
      .map(acc => {
        const e = eventById.get(acc.eventId);
        const year = e ? getEventYear(e) : null;
        const monthIndex = e ? getEventMonthIndex(e) : null;
        return { acc, event: e, year, monthIndex };
      })
      .filter(r => r.event && r.year !== null)
      .filter(r => (yearFilter === 'all' ? true : r.year === yearFilter))
      .filter(r => {
        if (!f) return true;
        return (
          normalize(r.acc.hotelName).includes(f) ||
          normalize(r.acc.address).includes(f) ||
          normalize(r.event!.name).includes(f) ||
          normalize(r.event!.location).includes(f) ||
          normalize(r.acc.reviewNote || '').includes(f)
        );
      })
      .filter(r => r.monthIndex !== null);
  }, [appState.eventAccommodations, eventById, yearFilter, search]);

  const rows = useMemo(() => {
    const afterTab = baseRows.filter(r => {
      if (viewTab === 'recommended') return r.acc.reviewOutcome === 'good';
      if (viewTab === 'notRecommended') return r.acc.reviewOutcome === 'bad';
      if (viewTab === 'monthly') return r.monthIndex === selectedMonth;
      // byPlaces + all : pas de filtre tab supplémentaire ici
      return true;
    });

    const afterOutcome = afterTab.filter(r => {
      if (viewTab === 'recommended') return true;
      if (viewTab === 'notRecommended') return true;
      if (outcomeFilter === 'all') return true;
      if (outcomeFilter === 'none') return !r.acc.reviewOutcome;
      return r.acc.reviewOutcome === outcomeFilter;
    });

    return afterOutcome.sort((a, b) => {
      // Regroupement par année d'abord, puis tri dans l'année
      const dy = (b.year as number) - (a.year as number);
      if (dy !== 0) return dy;
      if (sortKey === 'hotelAsc') {
        const ha = (a.acc.hotelName || '').localeCompare(b.acc.hotelName || '', 'fr', { sensitivity: 'base' });
        if (ha !== 0) return ha;
      }
      const da = a.event!.date || '';
      const db = b.event!.date || '';
      if (sortKey === 'dateAsc') return da.localeCompare(db);
      return db.localeCompare(da);
    });
  }, [baseRows, viewTab, selectedMonth, outcomeFilter, sortKey]);

  const monthlyGroups = useMemo(() => {
    if (viewTab !== 'monthly') return [];

    // 1) Trouver les "événements ancre" du mois (dans l'année sélectionnée si possible)
    const yearForMonthly =
      yearFilter === 'all' ? (availableYears[0] ?? new Date().getFullYear()) : yearFilter;

    const anchorRows = baseRows.filter(r => {
      if (r.monthIndex !== selectedMonth) return false;
      if (monthlyScope === 'allYears') return true;
      return r.year === yearForMonthly;
    });

    const anchorEventIds = Array.from(new Set(anchorRows.map(r => r.event!.id)));
    const anchorEvents = anchorEventIds
      .map(id => eventById.get(id))
      .filter(Boolean) as RaceEvent[];

    const allEventsByKey = new Map<string, RaceEvent[]>();
    for (const e of appState.raceEvents) {
      const k = getEventGroupKey(e);
      const arr = allEventsByKey.get(k) || [];
      arr.push(e);
      allEventsByKey.set(k, arr);
    }

    const accommodationsByEventId = new Map<string, EventAccommodation[]>();
    for (const acc of appState.eventAccommodations) {
      const arr = accommodationsByEventId.get(acc.eventId) || [];
      arr.push(acc);
      accommodationsByEventId.set(acc.eventId, arr);
    }

    const f = normalize(search);
    const matchesSearch = (acc: EventAccommodation, ev: RaceEvent) => {
      if (!f) return true;
      return (
        normalize(acc.hotelName).includes(f) ||
        normalize(acc.address).includes(f) ||
        normalize(ev.name).includes(f) ||
        normalize(ev.location).includes(f) ||
        normalize(acc.reviewNote || '').includes(f)
      );
    };

    const matchesOutcome = (acc: EventAccommodation) => {
      if (outcomeFilter === 'all') return true;
      if (outcomeFilter === 'none') return !acc.reviewOutcome;
      return acc.reviewOutcome === outcomeFilter;
    };

    const applyViewTabFilter = (_acc: EventAccommodation) => true;

    // 2) Pour chaque groupe d'événement, montrer les logements multi-années
    const groups = anchorEvents
      .map(anchor => {
        const key = getEventGroupKey(anchor);
        const relatedEvents = (allEventsByKey.get(key) || []).slice();
        relatedEvents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const years = Array.from(
          new Set(relatedEvents.map(e => getEventYear(e)).filter((y): y is number => y !== null))
        ).sort((a, b) => b - a);

        const items = relatedEvents
          .flatMap(ev => {
            const accs = accommodationsByEventId.get(ev.id) || [];
            const y = getEventYear(ev);
            const m = getEventMonthIndex(ev);
            return accs.map(acc => ({ acc, event: ev, year: y, monthIndex: m }));
          })
          .filter(r => r.year !== null)
          // En mode "année sélectionnée", on ne garde que les lignes de l'année sélectionnée pour l'ancre
          // mais on affiche quand même les autres années dans le groupe (c'est justement le but)
          .filter(r => matchesSearch(r.acc, r.event))
          .filter(r => applyViewTabFilter(r.acc))
          .filter(r => matchesOutcome(r.acc));

        // tri interne : année desc puis date desc puis hôtel
        items.sort((a, b) => {
          const dy = (b.year as number) - (a.year as number);
          if (dy !== 0) return dy;
          const dd = (b.event.date || '').localeCompare(a.event.date || '');
          if (dd !== 0) return dd;
          return (a.acc.hotelName || '').localeCompare(b.acc.hotelName || '', 'fr', { sensitivity: 'base' });
        });

        // compteur rapide pour badges
        const good = items.filter(i => i.acc.reviewOutcome === 'good').length;
        const bad = items.filter(i => i.acc.reviewOutcome === 'bad').length;

        return {
          key,
          name: anchor.name,
          location: anchor.location,
          anchorYear: getEventYear(anchor),
          years,
          items,
          stats: { total: items.length, good, bad },
        };
      })
      // enlever les doublons de groupes (si plusieurs hébergements dans le mois)
      .reduce((acc, g) => {
        if (acc.some(x => x.key === g.key)) return acc;
        acc.push(g);
        return acc;
      }, [] as any[]);

    // tri des groupes : par date de l'ancre (desc) puis nom
    groups.sort((a: any, b: any) => {
      const ay = a.anchorYear ?? 0;
      const by = b.anchorYear ?? 0;
      if (ay !== by) return by - ay;
      return String(a.name).localeCompare(String(b.name), 'fr', { sensitivity: 'base' });
    });

    return groups;
  }, [
    viewTab,
    baseRows,
    appState.raceEvents,
    appState.eventAccommodations,
    eventById,
    yearFilter,
    availableYears,
    selectedMonth,
    monthlyScope,
    outcomeFilter,
    search,
  ]);

  const placeGroups = useMemo(() => {
    const sourceAccs =
      viewTab === 'byPlaces'
        ? rows.map((r) => r.acc)
        : appState.eventAccommodations;
    return buildAccommodationPlaceGroups(sourceAccs, eventById);
  }, [viewTab, rows, appState.eventAccommodations, eventById]);

  useEffect(() => {
    if (viewTab !== 'byPlaces') return;
    if (placeGroups.length === 0) {
      setSelectedPlaceKey(null);
      return;
    }
    if (selectedPlaceKey && placeGroups.some((g) => g.key === selectedPlaceKey)) return;
    setSelectedPlaceKey(placeGroups[0].key);
  }, [viewTab, placeGroups, selectedPlaceKey]);

  useEffect(() => {
    if (viewTab !== 'monthly') return;
    if (!monthlyGroups || monthlyGroups.length === 0) {
      setSelectedEventGroupKey(null);
      return;
    }
    if (selectedEventGroupKey && monthlyGroups.some((g: any) => g.key === selectedEventGroupKey)) return;
    setSelectedEventGroupKey(monthlyGroups[0].key);
  }, [viewTab, monthlyGroups, selectedEventGroupKey]);

  const monthCounts = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    for (const r of baseRows) {
      if (r.monthIndex === null) continue;
      counts[r.monthIndex] += 1;
    }
    return counts;
  }, [baseRows]);

  const totals = useMemo(() => {
    const total = rows.length;
    const withReview = rows.filter(r => !!r.acc.reviewOutcome || !!(r.acc.reviewNote || '').trim()).length;
    const good = rows.filter(r => r.acc.reviewOutcome === 'good').length;
    const bad = rows.filter(r => r.acc.reviewOutcome === 'bad').length;
    return { total, withReview, good, bad };
  }, [rows]);

  const updateLocal = (id: string, patch: Partial<EventAccommodation>) => {
    setEventAccommodations(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
    setDirtyIds(prev => ({ ...prev, [id]: true }));
  };

  const saveReview = async (item: EventAccommodation) => {
    if (!appState.activeTeamId) {
      alert("Aucune équipe active : impossible de sauvegarder.");
      return;
    }
    try {
      await saveData(appState.activeTeamId, 'eventAccommodations', item);
      setDirtyIds(prev => ({ ...prev, [item.id]: false }));
      setSaveMessage(t('accHistorySaved'));
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (e) {
      console.error('❌ Erreur sauvegarde avis hébergement:', e);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    }
  };

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';
  const selectClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';

  const tabButtonStyle = (tab: ViewTab) =>
    `px-3 py-2 font-medium text-sm rounded-full whitespace-nowrap transition-all ${
      viewTab === tab
        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-300/40'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  type HistoryRow = { acc: EventAccommodation; event: RaceEvent; year: number | null; monthIndex: number | null };

  const renderAccommodationCard = (row: HistoryRow, compact = false) => {
    const { acc, event, year } = row;
    const outcome = acc.reviewOutcome;
    const note = acc.reviewNote || '';
    const isExpanded = !!expandedCardIds[acc.id];
    const isDirty = !!dirtyIds[acc.id];

    return (
      <article
        key={`${acc.id}-${event.id}`}
        className={`rounded-xl border bg-white shadow-sm overflow-hidden ${isDirty ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-200'}`}
      >
        <div className={`p-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-gray-900 truncate">{acc.hotelName || t('accHistoryNoName')}</h4>
                {year != null && (
                  <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{year}</span>
                )}
                {outcome && (
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${outcomeBadgeClass[outcome]}`}>
                    {outcomeLabel(outcome)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{acc.address || t('accHistoryNoAddress')}</p>
              {!compact && (
                <p className="text-xs text-gray-500 mt-1">
                  {event.name}{event.location ? ` · ${event.location}` : ''} · {event.date || '—'}
                </p>
              )}
            </div>
            <ActionButton size="sm" variant="secondary" onClick={() => navigateTo('eventDetail', acc.eventId)}>
              {t('accHistoryOpenEvent')}
            </ActionButton>
          </div>

          {!isRider && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500">{t('accHistoryOutcome')}</label>
                <select
                  className={selectClass}
                  value={acc.reviewOutcome || ''}
                  onChange={e =>
                    updateLocal(acc.id, {
                      reviewOutcome: (e.target.value || undefined) as EventAccommodation['reviewOutcome'],
                    })
                  }
                >
                  <option value="">—</option>
                  <option value="good">{t('accHistoryOutcomeGood')}</option>
                  <option value="neutral">{t('accHistoryOutcomeNeutral')}</option>
                  <option value="bad">{t('accHistoryOutcomeBad')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setExpandedCardIds(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                >
                  {isExpanded ? '▾' : '▸'} {t('accHistoryExpandNote')}
                  {note.trim() && !isExpanded && `: ${note.length > 60 ? `${note.slice(0, 60)}…` : note}`}
                </button>
                {isExpanded && (
                  <textarea
                    className={`${inputClass} mt-1`}
                    rows={3}
                    value={note}
                    onChange={e => updateLocal(acc.id, { reviewNote: e.target.value })}
                    placeholder={t('accHistoryNotePlaceholder')}
                  />
                )}
              </div>
            </div>
          )}

          {isRider && note.trim() && (
            <p className="text-sm text-gray-600 border-t border-gray-100 pt-2">{note}</p>
          )}

          {!isRider && isDirty && (
            <div className="flex justify-end pt-1">
              <ActionButton
                size="sm"
                onClick={() => {
                  const latest = appState.eventAccommodations.find(a => a.id === acc.id) || acc;
                  saveReview(latest);
                }}
              >
                {t('accHistorySave')}
              </ActionButton>
            </div>
          )}
        </div>
      </article>
    );
  };

  const renderKpis = () => (
    <div className="mx-auto mb-4 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: t('accHistoryKpiTotal'), value: totals.total, tone: 'text-white' },
        { label: t('accHistoryKpiReviewed'), value: totals.withReview, tone: 'text-indigo-300' },
        { label: t('accHistoryKpiGood'), value: totals.good, tone: 'text-emerald-300' },
        { label: t('accHistoryKpiBad'), value: totals.bad, tone: 'text-rose-300' },
      ].map(kpi => (
        <div key={kpi.label} className="rounded-2xl border border-white/12 bg-slate-950/40 p-3 text-center shadow-sm">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{kpi.label}</p>
          <p className={`text-2xl font-bold ${kpi.tone}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );

  return (
    <SectionWrapper title={t('accHistoryTitle')}>
      <div className="space-y-4">
        {saveMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {saveMessage}
          </div>
        )}

        {renderKpis()}

        <div className="relative mx-auto w-full max-w-4xl">
          <input
            type="search"
            className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-sm focus:border-indigo-400 focus:ring-indigo-500/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('accHistorySearch')}
          />
        </div>

        <div className="mx-auto flex w-full max-w-4xl justify-center rounded-2xl border border-white/10 bg-slate-950/50 p-1.5">
          <nav className="flex flex-wrap justify-center gap-1" aria-label="Tabs">
            {([
              ['monthly', t('accHistoryTabMonthly')],
              ['byPlaces', t('accHistoryTabByPlaces')],
              ['recommended', t('accHistoryTabRecommended')],
              ['notRecommended', t('accHistoryTabNotRecommended')],
              ['all', t('accHistoryTabAll')],
            ] as const).map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setViewTab(tab)} className={tabButtonStyle(tab)}>
                {label}
              </button>
            ))}
          </nav>
        </div>

        {viewTab === 'monthly' && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {monthLabels.map((label, idx) => {
              const count = monthCounts[idx] || 0;
              const disabled = count === 0;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedMonth(idx)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedMonth === idx
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {label}
                  {count > 0 && <span className="ml-1.5 text-xs opacity-80">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {filtersOpen ? '▾' : '▸'} {t('accHistoryFilters')}
        </button>

        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <label className="block text-xs font-medium text-gray-600">{t('accHistoryYear')}</label>
              <select
                className={selectClass}
                value={yearFilter === 'all' ? 'all' : String(yearFilter)}
                onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">{t('accHistoryYearAll')}</option>
                {availableYears.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">{t('accHistoryOutcome')}</label>
              <select
                className={selectClass}
                value={outcomeFilter}
                onChange={e => setOutcomeFilter(e.target.value as OutcomeFilter)}
                disabled={viewTab === 'recommended' || viewTab === 'notRecommended'}
              >
                <option value="all">{t('accHistoryOutcomeAll')}</option>
                <option value="good">{t('accHistoryOutcomeGood')}</option>
                <option value="neutral">{t('accHistoryOutcomeNeutral')}</option>
                <option value="bad">{t('accHistoryOutcomeBad')}</option>
                <option value="none">{t('accHistoryOutcomeNone')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">{t('accHistorySort')}</label>
              <select className={selectClass} value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
                <option value="dateDesc">{t('accHistorySortDateDesc')}</option>
                <option value="dateAsc">{t('accHistorySortDateAsc')}</option>
                <option value="hotelAsc">{t('accHistorySortHotel')}</option>
              </select>
            </div>
            {viewTab === 'monthly' && (
              <div className="sm:col-span-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMonthlyScope('selectedYear')}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    monthlyScope === 'selectedYear' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                >
                  {t('accHistoryScopeYear')}
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyScope('allYears')}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    monthlyScope === 'allYears' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                >
                  {t('accHistoryScopeAllYears')}
                </button>
              </div>
            )}
          </div>
        )}

        {viewTab === 'byPlaces' ? (
          placeGroups.length === 0 ? (
            <div className="text-center p-10 rounded-2xl border border-dashed border-white/15 bg-slate-900">
              <p className="text-slate-300">{t('accHistoryPlacesEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('accHistoryPlacesTitle')}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{t('accHistoryPlacesSubtitle')}</p>
              </div>

              <AccommodationPlacesMapPanel
                places={placeGroups}
                selectedKey={selectedPlaceKey}
                onSelectPlace={setSelectedPlaceKey}
                language={language}
                onCoordsResolved={(key, lat, lng) => {
                  // Persiste les coords sur le premier séjour du lieu (best-effort)
                  const group = placeGroups.find((g) => g.key === key);
                  const first = group?.stays[0]?.acc;
                  if (!first || !appState.activeTeamId) return;
                  if (first.latitude === lat && first.longitude === lng) return;
                  const updated = { ...first, latitude: lat, longitude: lng };
                  setEventAccommodations((prev) =>
                    prev.map((a) => (a.id === first.id ? updated : a)),
                  );
                  void saveData(appState.activeTeamId, 'eventAccommodations', updated).catch(() => undefined);
                }}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 rounded-2xl border border-white/15 overflow-hidden bg-slate-900">
                  <div className="bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 border-b border-white/10">
                    {placeGroups.length} {language === 'fr' ? 'lieux' : 'places'}
                  </div>
                  <div className="max-h-[55vh] overflow-y-auto divide-y divide-white/10">
                    {placeGroups.map((g) => {
                      const isSelected = g.key === selectedPlaceKey;
                      return (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => setSelectedPlaceKey(g.key)}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isSelected
                              ? 'bg-indigo-500/20 border-l-4 border-l-indigo-400'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="font-semibold text-white truncate">{g.hotelName}</div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">{g.address}</div>
                          {g.cityHint && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">{g.cityHint}</div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-xs text-slate-400">
                              {g.stays.length} {t('accHistoryPlaceStays')}
                            </span>
                            {g.good > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/25 text-emerald-200">
                                {g.good} ✓
                              </span>
                            )}
                            {g.bad > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500/25 text-rose-200">
                                {g.bad} ✗
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-3">
                  {(() => {
                    const g = placeGroups.find((x) => x.key === selectedPlaceKey);
                    if (!g) {
                      return <p className="text-slate-400 text-sm p-4">{t('accHistorySelectEvent')}</p>;
                    }
                    const mapsQuery = encodeURIComponent(`${g.hotelName}, ${g.address}`);
                    return (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{g.hotelName}</h3>
                            <p className="text-sm text-slate-300 mt-0.5">{g.address}</p>
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-white/10"
                          >
                            {t('accHistoryPlaceOpenMaps')}
                          </a>
                        </div>
                        {g.stays.map(({ acc, event }) => {
                          if (!event) return null;
                          const year = getEventYear(event);
                          const monthIndex = getEventMonthIndex(event);
                          return renderAccommodationCard(
                            { acc, event, year, monthIndex },
                            true,
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )
        ) : rows.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed">
            <p className="text-gray-600">{t('accHistoryEmpty')}</p>
          </div>
        ) : viewTab === 'monthly' ? (
          monthlyGroups.length === 0 ? (
            <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed">
              <p className="text-gray-600">{t('accHistoryEmptyMonth')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 border-b">
                  {t('accHistoryEvents')}
                </div>
                <div className="max-h-[65vh] overflow-y-auto divide-y">
                  {monthlyGroups.map((g: any) => {
                    const isSelected = g.key === selectedEventGroupKey;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setSelectedEventGroupKey(g.key)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                      >
                        <div className="font-semibold text-gray-900 truncate">{g.name}</div>
                        {g.location && <div className="text-xs text-gray-500 truncate">{g.location}</div>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-xs text-gray-500">{g.stats.total} {t('accHistoryStays')}</span>
                          {g.stats.good > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 text-green-800">{g.stats.good} ✓</span>
                          )}
                          {g.stats.bad > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-800">{g.stats.bad} ✗</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-3">
                <p className="text-xs text-gray-500">{t('accHistoryGroupedByEvent')}</p>
                {(() => {
                  const g = monthlyGroups.find((x: any) => x.key === selectedEventGroupKey);
                  if (!g) {
                    return <p className="text-gray-500 text-sm p-4">{t('accHistorySelectEvent')}</p>;
                  }
                  return (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">{g.name}</h3>
                      {g.items.map((r: HistoryRow) => renderAccommodationCard(r, true))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(row => renderAccommodationCard(row as HistoryRow))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};


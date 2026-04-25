import React, { useEffect, useMemo, useState } from 'react';
import { AppSection, AppState, EventAccommodation, RaceEvent, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { saveData } from '../services/firebaseService';

type YearFilter = 'all' | number;
type OutcomeFilter = 'all' | NonNullable<EventAccommodation['reviewOutcome']> | 'none';
type SortKey = 'dateDesc' | 'dateAsc' | 'hotelAsc';
type ViewTab = 'monthly' | 'recommended' | 'notRecommended' | 'all';
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

const outcomeLabel: Record<NonNullable<EventAccommodation['reviewOutcome']>, string> = {
  good: 'Bien',
  neutral: 'Neutre',
  bad: 'Pas bien',
};

const outcomeBadgeClass: Record<NonNullable<EventAccommodation['reviewOutcome']>, string> = {
  good: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-200 text-gray-800',
  bad: 'bg-red-100 text-red-800',
};

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
  const isRider = currentUser.userRole === 'Coureur';

  const [viewTab, setViewTab] = useState<ViewTab>('monthly');
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dateDesc');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [monthlyScope, setMonthlyScope] = useState<MonthlyScope>('selectedYear');
  const [expandedEventGroups, setExpandedEventGroups] = useState<Record<string, boolean>>({});
  const [selectedEventGroupKey, setSelectedEventGroupKey] = useState<string | null>(null);

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

    const applyViewTabFilter = (acc: EventAccommodation) => {
      if (viewTab === 'recommended') return acc.reviewOutcome === 'good';
      if (viewTab === 'notRecommended') return acc.reviewOutcome === 'bad';
      return true;
    };

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
  };

  const saveReview = async (item: EventAccommodation) => {
    if (!appState.activeTeamId) {
      alert("Aucune équipe active : impossible de sauvegarder.");
      return;
    }
    try {
      await saveData(appState.activeTeamId, 'eventAccommodations', item);
    } catch (e) {
      console.error('❌ Erreur sauvegarde avis hébergement:', e);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    }
  };

  // Un peu plus "confort" que compact : padding + font un cran au-dessus
  const lightInputClass =
    'mt-1 block w-full px-4 py-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';
  const lightSelectClass =
    'mt-1 block w-full px-4 py-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';

  return (
    <SectionWrapper title="Historique hébergements">
      <div className="space-y-4">
        <div className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur supports-[backdrop-filter]:bg-gray-100/70 -mx-6 px-6 py-4 border-b">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setViewTab('monthly')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  viewTab === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setViewTab('recommended')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  viewTab === 'recommended'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Recommandés
              </button>
              <button
                type="button"
                onClick={() => setViewTab('notRecommended')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  viewTab === 'notRecommended'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Non recommandés
              </button>
              <button
                type="button"
                onClick={() => setViewTab('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  viewTab === 'all'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Tous
              </button>
            </div>

            {viewTab === 'monthly' && (
              <div className="flex flex-wrap gap-2">
                {[
                  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
                ].map((label, idx) => {
                  const count = monthCounts[idx] || 0;
                  const disabled = count === 0;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedMonth(idx)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedMonth === idx
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      } ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-white' : ''}`}
                      title={disabled ? 'Aucune course ce mois' : `${count} hébergement(s)`}
                    >
                      {label}
                      {count > 0 && <span className="ml-2 text-xs text-gray-500">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{totals.total}</span> hébergements trouvés ·{' '}
                <span className="font-semibold text-gray-800">{totals.withReview}</span> avec retour ·{' '}
                <span className="font-semibold text-gray-800">{totals.good}</span> “Bien” ·{' '}
                <span className="font-semibold text-gray-800">{totals.bad}</span> “Pas bien”
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full lg:w-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700">Année</label>
                <select
                  className={lightSelectClass}
                  value={yearFilter === 'all' ? 'all' : String(yearFilter)}
                  onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">Toutes</option>
                  {availableYears.map(y => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Avis</label>
                <select
                  className={lightSelectClass}
                  value={outcomeFilter}
                  onChange={e => setOutcomeFilter(e.target.value as OutcomeFilter)}
                  disabled={viewTab === 'recommended' || viewTab === 'notRecommended'}
                >
                  <option value="all">Tous</option>
                  <option value="good">Bien</option>
                  <option value="neutral">Neutre</option>
                  <option value="bad">Pas bien</option>
                  <option value="none">Sans avis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tri</label>
                <select
                  className={lightSelectClass}
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                >
                  <option value="dateDesc">Date (récent → ancien)</option>
                  <option value="dateAsc">Date (ancien → récent)</option>
                  <option value="hotelAsc">Hôtel (A → Z)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Recherche</label>
                <input
                  className={lightInputClass}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Hôtel, adresse, course, lieu, note…"
                />
              </div>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center p-6 bg-gray-50 rounded-lg border">
            <p className="text-gray-600">Aucun hébergement trouvé avec ces filtres.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {viewTab === 'monthly' ? (
                <div className="p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      Regroupé par <span className="font-semibold text-gray-800">événement</span> (multi-années).
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Portée :</span>
                      <button
                        type="button"
                        onClick={() => setMonthlyScope('selectedYear')}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          monthlyScope === 'selectedYear'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Année sélectionnée
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthlyScope('allYears')}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          monthlyScope === 'allYears'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Toutes années
                      </button>
                    </div>
                  </div>

                  {monthlyGroups.length === 0 ? (
                    <div className="text-center p-6 bg-gray-50 rounded-lg border">
                      <p className="text-gray-600">Aucun événement trouvé pour ce mois avec ces filtres.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-4 border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 border-b">
                          Événements
                        </div>
                        <div className="max-h-[65vh] overflow-y-auto divide-y">
                          {monthlyGroups.map((g: any) => {
                            const isSelected = g.key === selectedEventGroupKey;
                            return (
                              <button
                                key={g.key}
                                type="button"
                                onClick={() => setSelectedEventGroupKey(g.key)}
                                className={`w-full text-left px-3 py-3 hover:bg-gray-50 ${
                                  isSelected ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-900 truncate">{g.name}</div>
                                    {g.location && <div className="text-xs text-gray-500 truncate">{g.location}</div>}
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {(g.years || []).slice(0, 6).map((y: number) => (
                                        <span key={y} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-800">
                                          {y}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className="text-sm font-semibold text-gray-800">{g.stats.total}</div>
                                    <div className="text-[11px] text-gray-500">logements</div>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {g.stats.good > 0 && (
                                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-green-100 text-green-800">
                                      {g.stats.good} bien
                                    </span>
                                  )}
                                  {g.stats.bad > 0 && (
                                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-red-100 text-red-800">
                                      {g.stats.bad} pas bien
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="lg:col-span-8 border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 border-b flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate">
                            {monthlyGroups.find((g: any) => g.key === selectedEventGroupKey)?.name || 'Détails'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Multi-années · logements
                          </div>
                        </div>

                        {(() => {
                          const g = monthlyGroups.find((x: any) => x.key === selectedEventGroupKey);
                          if (!g) {
                            return (
                              <div className="p-6 text-center text-gray-600">
                                Sélectionne un événement à gauche.
                              </div>
                            );
                          }
                          return (
                            <div className="overflow-x-auto">
                              <table className="min-w-[980px] w-full text-sm">
                                <thead className="bg-white border-b">
                                  <tr className="text-left text-gray-600">
                                    <th className="px-4 py-3 font-semibold">Année</th>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                    <th className="px-4 py-3 font-semibold">Hôtel</th>
                                    <th className="px-4 py-3 font-semibold">Adresse</th>
                                    <th className="px-4 py-3 font-semibold">Avis</th>
                                    <th className="px-4 py-3 font-semibold">Note</th>
                                    <th className="px-4 py-3 font-semibold">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {g.items.map((r: any) => {
                                    const acc = r.acc as EventAccommodation;
                                    const ev = r.event as RaceEvent;
                                    const outcome = acc.reviewOutcome;
                                    const note = acc.reviewNote || '';
                                    const isExpanded = !!expandedNotes[acc.id];
                                    const hasNote = !!note.trim();
                                    return (
                                      <React.Fragment key={`${acc.id}-${ev.id}`}>
                                        <tr className="align-top hover:bg-gray-50">
                                          <td className="px-4 py-4 whitespace-nowrap text-gray-800 font-medium">{r.year}</td>
                                          <td className="px-4 py-4 whitespace-nowrap text-gray-700">{ev?.date || '—'}</td>
                                          <td className="px-4 py-4 text-gray-900 max-w-[280px]">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="truncate font-semibold" title={acc.hotelName || ''}>
                                                {acc.hotelName || '—'}
                                              </span>
                                              {outcome && (
                                                <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${outcomeBadgeClass[outcome]}`}>
                                                  {outcomeLabel[outcome]}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-4 text-gray-700 max-w-[380px]">
                                            <div className="truncate" title={acc.address || ''}>{acc.address || '—'}</div>
                                          </td>
                                          <td className="px-4 py-4 min-w-[180px]">
                                            <select
                                              className={lightSelectClass}
                                              disabled={isRider}
                                              value={acc.reviewOutcome || ''}
                                              onChange={ev2 =>
                                                updateLocal(acc.id, {
                                                  reviewOutcome: (ev2.target.value || undefined) as EventAccommodation['reviewOutcome'],
                                                })
                                              }
                                            >
                                              <option value="">—</option>
                                              <option value="good">Bien</option>
                                              <option value="neutral">Neutre</option>
                                              <option value="bad">Pas bien</option>
                                            </select>
                                          </td>
                                          <td className="px-4 py-4 min-w-[320px]">
                                            <div className="flex items-start gap-3">
                                              <span className={`text-gray-600 leading-relaxed ${hasNote ? '' : 'italic'}`}>
                                                {hasNote ? (isExpanded ? note : (note.length > 90 ? `${note.slice(0, 90)}…` : note)) : '—'}
                                              </span>
                                              {hasNote && (
                                                <button
                                                  type="button"
                                                  className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                                                  onClick={() => setExpandedNotes(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                                                >
                                                  {isExpanded ? 'Réduire' : 'Voir'}
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                              <ActionButton size="sm" variant="secondary" onClick={() => navigateTo('eventDetail', acc.eventId)}>
                                                Ouvrir
                                              </ActionButton>
                                              {!isRider && (
                                                <ActionButton
                                                  size="sm"
                                                  variant="secondary"
                                                  onClick={() => {
                                                    const latest = appState.eventAccommodations.find(a => a.id === acc.id) || acc;
                                                    saveReview(latest);
                                                  }}
                                                >
                                                  Sauvegarder
                                                </ActionButton>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                        {!isRider && (
                                          <tr className="bg-gray-50/50">
                                            <td className="px-4 py-4 text-xs text-gray-500" colSpan={7}>
                                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                                                <div className="lg:col-span-2 text-xs font-semibold text-gray-600 pt-2">Éditer la note</div>
                                                <div className="lg:col-span-10">
                                                  <textarea
                                                    className={lightInputClass}
                                                    rows={3}
                                                    value={acc.reviewNote || ''}
                                                    onChange={ev3 => updateLocal(acc.id, { reviewNote: ev3.target.value })}
                                                    placeholder="Retour d’expérience (parking, repas, bruit, accueil, etc.)"
                                                  />
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 font-semibold">Année</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Course</th>
                    <th className="px-3 py-2 font-semibold">Lieu</th>
                    <th className="px-3 py-2 font-semibold">Hôtel</th>
                    <th className="px-3 py-2 font-semibold">Adresse</th>
                    <th className="px-3 py-2 font-semibold">Avis</th>
                    <th className="px-3 py-2 font-semibold">Note</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(({ acc, event, year }) => {
                    const outcome = acc.reviewOutcome;
                    const note = acc.reviewNote || '';
                    const isExpanded = !!expandedNotes[acc.id];
                    const hasNote = !!note.trim();

                    return (
                      <React.Fragment key={acc.id}>
                        <tr className="align-top hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-800 font-medium">{year}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{event?.date || '—'}</td>
                          <td className="px-3 py-2 text-gray-800 max-w-[220px]">
                            <div className="truncate" title={event?.name || ''}>{event?.name || '—'}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-700 max-w-[220px]">
                            <div className="truncate" title={event?.location || ''}>{event?.location || '—'}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-900 max-w-[220px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate font-semibold" title={acc.hotelName || ''}>
                                {acc.hotelName || '—'}
                              </span>
                              {outcome && (
                                <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${outcomeBadgeClass[outcome]}`}>
                                  {outcomeLabel[outcome]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700 max-w-[260px]">
                            <div className="truncate" title={acc.address || ''}>{acc.address || '—'}</div>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className={lightSelectClass}
                              disabled={isRider}
                              value={acc.reviewOutcome || ''}
                              onChange={ev =>
                                updateLocal(acc.id, {
                                  reviewOutcome: (ev.target.value || undefined) as EventAccommodation['reviewOutcome'],
                                })
                              }
                            >
                              <option value="">—</option>
                              <option value="good">Bien</option>
                              <option value="neutral">Neutre</option>
                              <option value="bad">Pas bien</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-2">
                              <span className={`text-gray-600 ${hasNote ? '' : 'italic'}`}>
                                {hasNote ? (isExpanded ? note : (note.length > 60 ? `${note.slice(0, 60)}…` : note)) : '—'}
                              </span>
                              {hasNote && (
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                                  onClick={() => setExpandedNotes(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                                >
                                  {isExpanded ? 'Réduire' : 'Voir'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <ActionButton
                                size="sm"
                                variant="secondary"
                                onClick={() => navigateTo('eventDetail', acc.eventId)}
                              >
                                Ouvrir
                              </ActionButton>
                              {!isRider && (
                                <ActionButton
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    const latest = appState.eventAccommodations.find(a => a.id === acc.id) || acc;
                                    saveReview(latest);
                                  }}
                                >
                                  Sauvegarder
                                </ActionButton>
                              )}
                            </div>
                          </td>
                        </tr>

                        {!isRider && (
                          <tr className="bg-gray-50/50">
                            <td className="px-3 py-2 text-xs text-gray-500" colSpan={9}>
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                                <div className="lg:col-span-2 text-xs font-semibold text-gray-600 pt-2">Éditer la note</div>
                                <div className="lg:col-span-10">
                                  <textarea
                                    className={lightInputClass}
                                    rows={2}
                                    value={acc.reviewNote || ''}
                                    onChange={ev => updateLocal(acc.id, { reviewNote: ev.target.value })}
                                    placeholder="Retour d’expérience (parking, repas, bruit, accueil, etc.)"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};


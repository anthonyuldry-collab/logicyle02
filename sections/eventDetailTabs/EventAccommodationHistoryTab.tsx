import React, { useMemo, useState } from 'react';
import { AppSection, AppState, EventAccommodation, PermissionLevel, RaceEvent, User } from '../../types';
import ActionButton from '../../components/ActionButton';
import { saveData } from '../../services/firebaseService';

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

const outcomeLabel: Record<NonNullable<EventAccommodation['reviewOutcome']>, string> = {
  good: 'Bien',
  neutral: 'Neutre',
  bad: 'Pas bien',
};

const EventAccommodationHistoryTab: React.FC<EventAccommodationHistoryTabProps> = ({
  event,
  eventId,
  appState,
  setEventAccommodations,
  currentUser,
}) => {
  const isRider = currentUser?.userRole === 'Coureur';
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [nameFilter, setNameFilter] = useState<string>('');

  const currentEventYear = useMemo(() => getEventYear(event), [event]);

  const relevantEventIds = useMemo(() => {
    const baseName = normalize(event.name);
    const baseLocation = normalize(event.location);

    return appState.raceEvents
      .filter(e => {
        const sameName = normalize(e.name) === baseName;
        // Location helps when names are generic; we keep it permissive (either matches name OR location).
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

    return filteredByName.sort((a, b) => (b.year! - a.year!));
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

  const handleUpdateLocal = (id: string, patch: Partial<EventAccommodation>) => {
    setEventAccommodations(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };

  const handleSaveReview = async (item: EventAccommodation) => {
    if (!appState.activeTeamId) {
      alert("Aucune équipe active : impossible de sauvegarder l'avis.");
      return;
    }
    try {
      await saveData(appState.activeTeamId, 'eventAccommodations', item);
    } catch (e) {
      console.error('❌ Erreur sauvegarde avis hébergement:', e);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  };

  const lightInputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
  const lightSelectClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-700">
            Historique hébergement {currentEventYear ? `(référence ${currentEventYear})` : ''}
          </h3>
          <p className="text-sm text-gray-500">
            Retrouver rapidement les hôtels d’une année sur l’autre, avec un avis et une note.
          </p>
        </div>

        <div className="w-full md:w-56">
          <label className="block text-sm font-medium text-gray-700">Année</label>
          <select
            className={lightSelectClass}
            value={yearFilter === 'all' ? 'all' : String(yearFilter)}
            onChange={e => {
              const v = e.target.value;
              setYearFilter(v === 'all' ? 'all' : Number(v));
            }}
          >
            <option value="all">Toutes</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-sm font-medium text-gray-700">Recherche (hôtel / adresse)</label>
          <input
            className={lightInputClass}
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="Ex: Ibis, Novotel, centre ville…"
          />
        </div>
      </div>

      {historyRows.length === 0 ? (
        <p className="text-gray-500 italic p-4 bg-gray-50 rounded-md border text-center">
          Aucun hébergement trouvé dans l’historique pour cette course (ou localisation).
        </p>
      ) : (
        <div className="space-y-4">
          {historyRows.map(({ acc, event: e, year }) => {
            const isCurrentEvent = acc.eventId === eventId;
            const outcome = acc.reviewOutcome;

            return (
              <div key={acc.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-md font-semibold text-gray-800 truncate">
                        {acc.hotelName || 'Hébergement sans nom'}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {year}
                      </span>
                      {isCurrentEvent && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Événement actuel
                        </span>
                      )}
                      {outcome && (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            outcome === 'good'
                              ? 'bg-green-100 text-green-800'
                              : outcome === 'bad'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-200 text-gray-800'
                          }`}
                          title="Avis"
                        >
                          {outcomeLabel[outcome]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{acc.address || 'Adresse non renseignée'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {e?.name} — {e?.location}
                    </p>
                  </div>

                  <div className="w-full md:w-96">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Avis</label>
                        <select
                          className={lightSelectClass}
                          disabled={isRider}
                          value={acc.reviewOutcome || ''}
                          onChange={ev =>
                            handleUpdateLocal(acc.id, {
                              reviewOutcome: (ev.target.value || undefined) as EventAccommodation['reviewOutcome'],
                            })
                          }
                        >
                          <option value="">—</option>
                          <option value="good">Bien</option>
                          <option value="neutral">Neutre</option>
                          <option value="bad">Pas bien</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Note (retour d’expérience)</label>
                        <textarea
                          className={lightInputClass}
                          disabled={isRider}
                          rows={3}
                          value={acc.reviewNote || ''}
                          onChange={ev => handleUpdateLocal(acc.id, { reviewNote: ev.target.value })}
                          placeholder="Ex: Parking camion OK, petit-déj tôt, chambres bruyantes, accueil super…"
                        />
                      </div>
                    </div>

                    {!isRider && (
                      <div className="mt-2 flex justify-end">
                        <ActionButton
                          size="sm"
                          onClick={() => {
                            // Recharger l’item à jour depuis l’état (au cas où)
                            const latest = appState.eventAccommodations.find(a => a.id === acc.id) || acc;
                            handleSaveReview(latest);
                          }}
                          variant="secondary"
                        >
                          Sauvegarder l’avis
                        </ActionButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventAccommodationHistoryTab;


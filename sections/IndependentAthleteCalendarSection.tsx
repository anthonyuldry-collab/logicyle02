import React, { useMemo, useState } from 'react';
import {
  AthleteCalendarEntry,
  AthleteCalendarEntryStatus,
  DisciplinePracticed,
  User,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import CalendarDaysIcon from '../components/icons/CalendarDaysIcon';
import MapPinIcon from '../components/icons/MapPinIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import {
  ATHLETE_CALENDAR_STATUS_LABELS,
  AthleteCalendarItem,
  buildAthleteCalendarItems,
  formatAthleteDateRange,
  isAthleteEntryUpcoming,
  removeAthleteCalendarEntry,
  upsertAthleteCalendarEntry,
} from '../utils/athleteCalendarUtils';
import { generateId } from '../utils/themeUtils';

interface IndependentAthleteCalendarSectionProps {
  currentUser: User;
  onSaveCalendar: (entries: AthleteCalendarEntry[]) => Promise<void>;
  onNavigateToTeamSearch?: () => void;
  /** En aperçu Super Admin : afficher des courses d’exemple */
  includeDemo?: boolean;
  readOnly?: boolean;
}

type ScopeFilter = 'upcoming' | 'past' | 'all';

const emptyForm = (): Omit<AthleteCalendarEntry, 'id' | 'source'> => ({
  name: '',
  startDate: '',
  endDate: '',
  location: '',
  discipline: DisciplinePracticed.ROUTE,
  notes: '',
  status: 'planned',
});

const IndependentAthleteCalendarSection: React.FC<IndependentAthleteCalendarSectionProps> = ({
  currentUser,
  onSaveCalendar,
  onNavigateToTeamSearch,
  includeDemo = false,
  readOnly = false,
}) => {
  const [scope, setScope] = useState<ScopeFilter>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const items = useMemo(
    () => buildAthleteCalendarItems(currentUser, { includeDemo }),
    [currentUser, includeDemo],
  );

  const filtered = useMemo(() => {
    if (scope === 'all') return items;
    if (scope === 'upcoming') {
      return items.filter(
        (i) => isAthleteEntryUpcoming(i) && i.status !== 'cancelled' && i.status !== 'done',
      );
    }
    return items.filter((i) => !isAthleteEntryUpcoming(i) || i.status === 'done');
  }, [items, scope]);

  const upcomingCount = items.filter(
    (i) => isAthleteEntryUpcoming(i) && i.status !== 'cancelled' && i.status !== 'done',
  ).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (item: AthleteCalendarItem) => {
    if (item.source === 'result' || item.source === 'demo') return;
    setEditingId(item.id);
    setForm({
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate || '',
      location: item.location || '',
      discipline: item.discipline || DisciplinePracticed.ROUTE,
      notes: item.notes || '',
      status: item.status,
    });
    setModalOpen(true);
  };

  const persistManual = async (nextManual: AthleteCalendarEntry[]) => {
    setSaving(true);
    try {
      await onSaveCalendar(nextManual);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveForm = async () => {
    if (!form.name.trim() || !form.startDate) {
      alert('Indiquez au minimum le nom et la date de début.');
      return;
    }
    const entry: AthleteCalendarEntry = {
      id: editingId || `race_${generateId()}`,
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      location: form.location?.trim() || undefined,
      discipline: form.discipline,
      notes: form.notes?.trim() || undefined,
      status: form.status,
      source: 'manual',
    };
    const current = (currentUser.personalRaceCalendar || []).filter((e) => e.source !== 'demo');
    const next = upsertAthleteCalendarEntry(current, entry);
    await persistManual(next);
    setModalOpen(false);
  };

  const handleDelete = async (item: AthleteCalendarItem) => {
    if (item.source === 'result' || item.source === 'demo') return;
    if (!window.confirm(`Supprimer « ${item.name} » du calendrier ?`)) return;
    const current = currentUser.personalRaceCalendar || [];
    await persistManual(removeAthleteCalendarEntry(current, item.id));
  };

  const statusChip = (status: AthleteCalendarEntryStatus) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-800';
    if (status === 'done') return 'bg-gray-100 text-gray-600';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <SectionWrapper title="Mon Calendrier Courses">
      <div className="space-y-5">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-indigo-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5" />
                Calendrier sportif personnel
              </h2>
              <p className="mt-1 text-sm text-indigo-800">
                Planifiez vos courses et stages. Vos résultats enregistrés apparaissent aussi ici.
                Utile pour les équipes qui consultent votre profil.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onNavigateToTeamSearch && (
                <ActionButton onClick={onNavigateToTeamSearch} variant="secondary" size="sm">
                  Chercher une équipe
                </ActionButton>
              )}
              {!readOnly && (
                <ActionButton onClick={openCreate} size="sm">
                  <span className="inline-flex items-center gap-1">
                    <PlusCircleIcon className="w-4 h-4" />
                    Ajouter
                  </span>
                </ActionButton>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-indigo-900">
              {upcomingCount} à venir
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-indigo-800">
              {items.length} au total
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {(
            [
              ['upcoming', 'À venir'],
              ['past', 'Passées'],
              ['all', 'Toutes'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                scope === key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-3 text-lg font-medium text-gray-700">
              {scope === 'upcoming'
                ? 'Aucune course à venir'
                : scope === 'past'
                  ? 'Aucune course passée'
                  : 'Calendrier vide'}
            </p>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Ajoutez vos objectifs (classiques, stages, critériums) pour structurer votre saison.
            </p>
            {!readOnly && (
              <ActionButton onClick={openCreate} className="mt-4">
                Ajouter une course
              </ActionButton>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => {
              const upcoming = isAthleteEntryUpcoming(item);
              const editable = item.source === 'manual' && !readOnly;
              return (
                <li
                  key={item.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    upcoming && item.status !== 'done'
                      ? 'border-indigo-200'
                      : 'border-gray-200 opacity-90'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                        {formatAthleteDateRange(item.startDate, item.endDate)}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-gray-900">{item.name}</h3>
                      {item.discipline && (
                        <p className="text-sm text-gray-600">{String(item.discipline)}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusChip(item.status)}`}
                      >
                        {ATHLETE_CALENDAR_STATUS_LABELS[item.status]}
                      </span>
                      {item.source === 'demo' && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                          Exemple
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {item.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                        {item.location}
                      </span>
                    )}
                    <span className="text-gray-400">{item.sourceLabel}</span>
                  </div>
                  {item.notes && (
                    <p className="mt-2 text-sm text-gray-600">{item.notes}</p>
                  )}
                  {editable && (
                    <div className="mt-3 flex gap-2">
                      <ActionButton size="sm" variant="secondary" onClick={() => openEdit(item)}>
                        Modifier
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        variant="danger"
                        onClick={() => void handleDelete(item)}
                        disabled={saving}
                      >
                        Supprimer
                      </ActionButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier la course' : 'Ajouter une course'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ex. Classic Lorient"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Début *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ville, pays…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discipline</label>
              <select
                value={form.discipline || DisciplinePracticed.ROUTE}
                onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.values(DisciplinePracticed).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as AthleteCalendarEntryStatus,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {(Object.keys(ATHLETE_CALENDAR_STATUS_LABELS) as AthleteCalendarEntryStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {ATHLETE_CALENDAR_STATUS_LABELS[s]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Objectifs, catégorie…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </ActionButton>
            <ActionButton onClick={() => void handleSaveForm()} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </SectionWrapper>
  );
};

export default IndependentAthleteCalendarSection;

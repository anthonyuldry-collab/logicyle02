import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  CampProgrammeDay,
  CampProgrammeItem,
  CampProgrammeSlotKind,
  RaceEvent,
  StageCampSessionType,
} from '../../types';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import {
  CAMP_PROGRAMME_DAY_TEMPLATES,
  CAMP_PROGRAMME_QUICK_SLOTS,
  CAMP_PROGRAMME_SLOT_KIND_LABELS,
  CampProgrammeDayTemplateId,
  STAGE_SESSION_TYPE_LABELS,
  addQuickProgrammeSlot,
  applyCampProgrammeTemplate,
  emptyCampProgrammeItem,
  findProgrammeOverlaps,
  listEventDayDates,
  seedCampProgrammeStructure,
  sortProgrammeItems,
  syncCampProgrammeDays,
  upsertCampProgrammeDay,
} from '../../utils/trainingCampUtils';
import {
  CampProgrammeExportOptions,
  CampProgrammeExportScope,
  copyCampProgrammeText,
  exportCampProgrammePdf,
  listCampProgrammeRecipients,
  openCampProgrammeEmail,
  shareCampProgrammePdf,
} from '../../utils/campProgrammePdfExport';
import { formatEventDate, formatEventDateRange } from '../../utils/dateUtils';

interface StageCampProgrammeTabProps {
  event: RaceEvent;
  eventId: string;
  appState: AppState;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => Promise<void> | void;
  readOnly?: boolean;
}

const SLOT_KIND_STYLE: Record<CampProgrammeSlotKind, string> = {
  meal: 'bg-amber-50 text-amber-800 border-amber-200',
  briefing: 'bg-slate-100 text-slate-700 border-slate-200',
  training: 'bg-sky-50 text-sky-800 border-sky-200',
  test: 'bg-violet-50 text-violet-800 border-violet-200',
  recovery: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  transfer: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

const cellInput =
  'w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400';

function daysSignature(days: CampProgrammeDay[]): string {
  return JSON.stringify(days);
}

function durationLabel(item: CampProgrammeItem): string {
  if (!item.startTime || !item.endTime) return '—';
  const [sh, sm] = item.startTime.split(':').map(Number);
  const [eh, em] = item.endTime.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

const StageCampProgrammeTab: React.FC<StageCampProgrammeTabProps> = ({
  event,
  eventId,
  appState,
  updateEvent,
  readOnly = false,
}) => {
  const dayDates = useMemo(() => listEventDayDates(event), [event.date, event.endDate]);
  const [selectedDate, setSelectedDate] = useState(dayDates[0] || event.date);
  const [draftDays, setDraftDays] = useState<CampProgrammeDay[]>(() =>
    syncCampProgrammeDays(event),
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<CampProgrammeExportScope>('all');
  const [exportDayDate, setExportDayDate] = useState(dayDates[0] || event.date);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSigRef = useRef(daysSignature(syncCampProgrammeDays(event)));
  const draftDaysRef = useRef(draftDays);
  draftDaysRef.current = draftDays;

  useEffect(() => {
    const synced = syncCampProgrammeDays(event);
    const sig = daysSignature(synced);
    if (!dirty || sig === lastSavedSigRef.current) {
      setDraftDays(synced);
      lastSavedSigRef.current = sig;
      setDirty(false);
    }
  }, [eventId, event.date, event.endDate, event.campProgrammeDays, dirty]);

  useEffect(() => {
    if (!dayDates.includes(selectedDate) && dayDates.length > 0) {
      setSelectedDate(dayDates[0]);
    }
  }, [dayDates, selectedDate]);

  const persistDays = useCallback(
    async (nextDays: CampProgrammeDay[]) => {
      const sig = daysSignature(nextDays);
      if (sig === lastSavedSigRef.current) {
        setDirty(false);
        return;
      }
      setSaving(true);
      setSaveMessage(null);
      try {
        await updateEvent({ campProgrammeDays: nextDays });
        lastSavedSigRef.current = sig;
        setDirty(false);
        setSaveMessage('Enregistré');
        window.setTimeout(() => setSaveMessage(null), 1800);
      } finally {
        setSaving(false);
      }
    },
    [updateEvent],
  );

  const schedulePersist = useCallback(
    (nextDays: CampProgrammeDay[]) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void persistDays(nextDays);
      }, 400);
    },
    [persistDays],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const applyDays = useCallback(
    (nextDays: CampProgrammeDay[], options?: { immediate?: boolean }) => {
      setDraftDays(nextDays);
      setDirty(true);
      if (readOnly) return;
      if (options?.immediate) {
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        void persistDays(nextDays);
      } else {
        schedulePersist(nextDays);
      }
    },
    [persistDays, readOnly, schedulePersist],
  );

  const selectedDay: CampProgrammeDay = useMemo(() => {
    return (
      draftDays.find((d) => d.date === selectedDate) || {
        id: `camp_prog_day_${selectedDate}`,
        date: selectedDate,
        items: [],
      }
    );
  }, [draftDays, selectedDate]);

  const selectedDayIndex = dayDates.indexOf(selectedDate);
  const sortedItems = useMemo(
    () => sortProgrammeItems(selectedDay.items),
    [selectedDay.items],
  );
  const overlaps = useMemo(() => findProgrammeOverlaps(sortedItems), [sortedItems]);
  const overlapIds = useMemo(() => {
    const set = new Set<string>();
    overlaps.forEach((o) => {
      set.add(o.aId);
      set.add(o.bId);
    });
    return set;
  }, [overlaps]);

  const emptyDaysCount = draftDays.filter((d) => (d.items?.length || 0) === 0).length;
  const totalItems = draftDays.reduce((sum, d) => sum + (d.items?.length || 0), 0);
  const coveragePct =
    dayDates.length > 0
      ? Math.round(
          (draftDays.filter((d) => (d.items?.length || 0) > 0).length / dayDates.length) * 100,
        )
      : 0;

  const patchSelectedDay = (
    patch: Partial<CampProgrammeDay>,
    options?: { immediate?: boolean },
  ) => {
    applyDays(upsertCampProgrammeDay(draftDays, { ...selectedDay, ...patch }), options);
  };

  const updateItem = (
    itemId: string,
    patch: Partial<CampProgrammeItem>,
    options?: { immediate?: boolean },
  ) => {
    const items = selectedDay.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item,
    );
    patchSelectedDay({ items: sortProgrammeItems(items) }, options);
  };

  const addBlankRow = () => {
    const last = sortedItems[sortedItems.length - 1];
    const start = last?.endTime || '08:00';
    patchSelectedDay(
      {
        items: sortProgrammeItems([
          ...selectedDay.items,
          emptyCampProgrammeItem({
            startTime: start,
            endTime: undefined,
            title: '',
            slotKind: 'training',
            sessionType: 'endurance',
          }),
        ]),
      },
      { immediate: true },
    );
  };

  const removeItem = (itemId: string) => {
    patchSelectedDay(
      { items: selectedDay.items.filter((item) => item.id !== itemId) },
      { immediate: true },
    );
  };

  const applyTemplate = (templateId: CampProgrammeDayTemplateId) => {
    const next = applyCampProgrammeTemplate(selectedDay, templateId);
    applyDays(upsertCampProgrammeDay(draftDays, next), { immediate: true });
  };

  const applyQuick = (quickId: string) => {
    const next = addQuickProgrammeSlot(selectedDay, quickId);
    applyDays(upsertCampProgrammeDay(draftDays, next), { immediate: true });
  };

  const seedWholeCamp = () => {
    applyDays(seedCampProgrammeStructure(draftDays), { immediate: true });
  };

  const clearDay = () => {
    patchSelectedDay({ theme: '', notes: '', items: [] }, { immediate: true });
  };

  const duplicatePreviousDay = () => {
    if (selectedDayIndex <= 0) return;
    const prev = draftDays.find((d) => d.date === dayDates[selectedDayIndex - 1]);
    if (!prev) return;
    patchSelectedDay(
      {
        theme: prev.theme,
        notes: prev.notes,
        items: sortProgrammeItems(
          prev.items.map((item) =>
            emptyCampProgrammeItem({
              startTime: item.startTime,
              endTime: item.endTime,
              title: item.title,
              slotKind: item.slotKind,
              sessionType: item.sessionType,
              location: item.location,
              notes: item.notes,
            }),
          ),
        ),
      },
      { immediate: true },
    );
  };

  const flushSave = () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    void persistDays(draftDaysRef.current);
  };

  const eventForExport = useMemo(
    (): RaceEvent => ({ ...event, campProgrammeDays: draftDays }),
    [event, draftDays],
  );

  const recipients = useMemo(
    () => listCampProgrammeRecipients(event, appState),
    [event, appState],
  );

  const teamName = useMemo(() => {
    const team = appState.teams?.find((t) => t.id === appState.activeTeamId);
    return team?.name || '';
  }, [appState.teams, appState.activeTeamId]);

  const buildExportOptions = useCallback((): CampProgrammeExportOptions => {
    return {
      scope: exportScope,
      dayDate: exportScope === 'day' ? exportDayDate : undefined,
      teamName: teamName || undefined,
    };
  }, [exportScope, exportDayDate, teamName]);

  const openExportModal = (preferDay = false) => {
    flushSave();
    setExportScope(preferDay ? 'day' : 'all');
    setExportDayDate(selectedDate);
    setSelectedEmails(recipients.map((r) => r.email));
    setExportStatus(null);
    setIsExportOpen(true);
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  };

  const selectRecipientGroup = (kind: 'all' | 'rider' | 'staff' | 'none') => {
    if (kind === 'none') {
      setSelectedEmails([]);
      return;
    }
    if (kind === 'all') {
      setSelectedEmails(recipients.map((r) => r.email));
      return;
    }
    setSelectedEmails(recipients.filter((r) => r.kind === kind).map((r) => r.email));
  };

  const handleDownloadPdf = () => {
    exportCampProgrammePdf(eventForExport, buildExportOptions());
    setExportStatus('PDF téléchargé');
  };

  const handleCopyText = async () => {
    try {
      await copyCampProgrammeText(eventForExport, buildExportOptions());
      setExportStatus('Texte copié dans le presse-papiers');
    } catch {
      setExportStatus('Impossible de copier le texte');
    }
  };

  const handleSendEmail = () => {
    if (selectedEmails.length === 0) {
      setExportStatus('Sélectionnez au moins un destinataire avec e-mail');
      return;
    }
    exportCampProgrammePdf(eventForExport, buildExportOptions());
    openCampProgrammeEmail({
      event: eventForExport,
      options: buildExportOptions(),
      emails: selectedEmails,
    });
    setExportStatus(
      'PDF téléchargé — joignez-le à l’e-mail qui s’ouvre (le client mail ne peut pas attacher automatiquement).',
    );
  };

  const handleShare = async () => {
    const result = await shareCampProgrammePdf({
      event: eventForExport,
      options: buildExportOptions(),
    });
    if (result === 'shared') setExportStatus('Partage lancé');
    else if (result === 'unsupported') {
      handleDownloadPdf();
      setExportStatus('Partage non disponible ici — PDF téléchargé');
    } else if (result === 'error') setExportStatus('Échec du partage');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Programme du stage</h3>
          <p className="text-sm text-gray-500">
            {event.name} · {formatEventDateRange(event)}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Timing opérationnel jour par jour. Partez d’un modèle, ajustez les horaires — pas besoin
            de tout ressaisir.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ActionButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openExportModal(false)}
              disabled={totalItems === 0}
            >
              PDF / Envoyer
            </ActionButton>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700">
              {coveragePct}% jours planifiés
            </span>
            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">
              {totalItems} créneaux
            </span>
            {overlaps.length > 0 && (
              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-700 font-medium">
                {overlaps.length} chevauchement{overlaps.length > 1 ? 's' : ''}
              </span>
            )}
            {dirty && !saving && <span className="text-amber-600">Non enregistré…</span>}
            {saving && <span className="text-gray-400">Enregistrement…</span>}
            {saveMessage && <span className="text-emerald-600 font-medium">{saveMessage}</span>}
          </div>
        </div>
      </div>

      {!readOnly && emptyDaysCount > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-sky-900">
            <span className="font-semibold">{emptyDaysCount} jour{emptyDaysCount > 1 ? 's' : ''} vide{emptyDaysCount > 1 ? 's' : ''}</span>
            {' — '}générez une structure type (arrivée → entraînement → départ) en un clic.
          </p>
          <ActionButton type="button" size="sm" onClick={seedWholeCamp}>
            Générer le programme type
          </ActionButton>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {dayDates.map((date, index) => {
          const day = draftDays.find((d) => d.date === date);
          const count = day?.items?.length || 0;
          const isActive = date === selectedDate;
          const dayOverlaps = findProgrammeOverlaps(day?.items || []).length;
          return (
            <button
              key={date}
              type="button"
              onClick={() => {
                flushSave();
                setSelectedDate(date);
                setExpandedNotesId(null);
              }}
              className={`shrink-0 min-w-[4.75rem] px-2.5 py-2 rounded-lg text-left border transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`text-[10px] font-semibold ${isActive ? 'text-sky-100' : 'text-gray-400'}`}>
                J{index + 1}
                {count > 0 ? ` · ${count}` : ''}
                {dayOverlaps > 0 ? ' ⚠' : ''}
              </div>
              <div className="text-xs font-medium leading-tight">
                {formatEventDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </button>
          );
        })}
      </div>

      {!readOnly && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Modèle de journée
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedDayIndex > 0 && (
                <button
                  type="button"
                  onClick={duplicatePreviousDay}
                  className="text-[11px] font-medium px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Copier J{selectedDayIndex}
                </button>
              )}
              {sortedItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearDay}
                  className="text-[11px] font-medium px-2 py-1 rounded-md border border-red-100 text-red-600 hover:bg-red-50"
                >
                  Vider le jour
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CAMP_PROGRAMME_DAY_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                title={tpl.description}
                onClick={() => applyTemplate(tpl.id)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 transition-colors"
              >
                {tpl.shortLabel}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Ajout rapide
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CAMP_PROGRAMME_QUICK_SLOTS.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => applyQuick(slot.id)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium border border-dashed border-gray-300 text-gray-600 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50/50"
                >
                  + {slot.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <label className="sr-only">Thème du jour</label>
            <input
              type="text"
              value={selectedDay.theme || ''}
              onChange={(e) => patchSelectedDay({ theme: e.target.value })}
              onBlur={flushSave}
              disabled={readOnly}
              className={`${cellInput} text-sm font-medium`}
              placeholder={`Thème J${selectedDayIndex + 1} — ex. Endurance longue`}
            />
          </div>
          <p className="text-[11px] text-gray-400 shrink-0">
            {formatEventDate(selectedDate, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        {sortedItems.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-700">Journée non planifiée</p>
            <p className="text-xs text-gray-400 mt-1">
              Choisissez un modèle ci-dessus, ou ajoutez des créneaux un par un.
            </p>
            {!readOnly && (
              <div className="mt-4 flex justify-center gap-2">
                <ActionButton
                  type="button"
                  size="sm"
                  onClick={() => applyTemplate('endurance')}
                >
                  Modèle endurance
                </ActionButton>
                <ActionButton type="button" size="sm" variant="secondary" onClick={addBlankRow}>
                  Ligne vide
                </ActionButton>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="px-2 py-2 font-semibold w-[4.5rem]">Début</th>
                  <th className="px-2 py-2 font-semibold w-[4.5rem]">Fin</th>
                  <th className="px-2 py-2 font-semibold w-[3.5rem]">Durée</th>
                  <th className="px-2 py-2 font-semibold w-[7.5rem]">Type</th>
                  <th className="px-2 py-2 font-semibold">Intitulé</th>
                  <th className="px-2 py-2 font-semibold w-[7rem]">Séance</th>
                  <th className="px-2 py-2 font-semibold w-[7rem]">Lieu</th>
                  <th className="px-2 py-2 font-semibold w-[4.5rem]" />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const hasOverlap = overlapIds.has(item.id);
                  const kind = item.slotKind || 'other';
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`border-b border-gray-50 align-middle ${
                          hasOverlap ? 'bg-red-50/60' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="time"
                            value={item.startTime || ''}
                            onChange={(e) =>
                              updateItem(item.id, {
                                startTime: e.target.value || undefined,
                              })
                            }
                            onBlur={flushSave}
                            disabled={readOnly}
                            className={cellInput}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="time"
                            value={item.endTime || ''}
                            onChange={(e) =>
                              updateItem(item.id, {
                                endTime: e.target.value || undefined,
                              })
                            }
                            onBlur={flushSave}
                            disabled={readOnly}
                            className={cellInput}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="text-[11px] text-gray-500 tabular-nums">
                            {durationLabel(item)}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={kind}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                { slotKind: e.target.value as CampProgrammeSlotKind },
                                { immediate: true },
                              )
                            }
                            disabled={readOnly}
                            className={`${cellInput} ${SLOT_KIND_STYLE[kind]}`}
                          >
                            {(Object.keys(CAMP_PROGRAMME_SLOT_KIND_LABELS) as CampProgrammeSlotKind[]).map(
                              (k) => (
                                <option key={k} value={k}>
                                  {CAMP_PROGRAMME_SLOT_KIND_LABELS[k]}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            onBlur={flushSave}
                            disabled={readOnly}
                            className={cellInput}
                            placeholder="Intitulé"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={item.sessionType || ''}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                {
                                  sessionType: (e.target.value || undefined) as
                                    | StageCampSessionType
                                    | undefined,
                                },
                                { immediate: true },
                              )
                            }
                            disabled={readOnly || (kind !== 'training' && kind !== 'test' && kind !== 'recovery')}
                            className={cellInput}
                          >
                            <option value="">—</option>
                            {(Object.keys(STAGE_SESSION_TYPE_LABELS) as StageCampSessionType[]).map(
                              (k) => (
                                <option key={k} value={k}>
                                  {STAGE_SESSION_TYPE_LABELS[k]}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={item.location || ''}
                            onChange={(e) => updateItem(item.id, { location: e.target.value })}
                            onBlur={flushSave}
                            disabled={readOnly}
                            className={cellInput}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Note"
                              onClick={() =>
                                setExpandedNotesId((id) => (id === item.id ? null : item.id))
                              }
                              className={`text-[11px] px-1.5 py-1 rounded ${
                                item.notes
                                  ? 'text-sky-700 bg-sky-50'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              Note
                            </button>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-[11px] text-red-500 hover:text-red-700 px-1.5 py-1"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedNotesId === item.id && (
                        <tr className="border-b border-gray-50 bg-gray-50/50">
                          <td colSpan={8} className="px-2 py-2">
                            <textarea
                              value={item.notes || ''}
                              onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                              onBlur={flushSave}
                              disabled={readOnly}
                              rows={2}
                              className={cellInput}
                              placeholder="Consignes (intensité, matériel, regroupement…)"
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!readOnly && sortedItems.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={addBlankRow}
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              + Ajouter une ligne
            </button>
            {overlaps.length > 0 && (
              <p className="text-[11px] text-red-600">
                Des créneaux se chevauchent — ajustez début / fin.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          Notes collectives du jour (optionnel)
        </label>
        <textarea
          value={selectedDay.notes || ''}
          onChange={(e) => patchSelectedDay({ notes: e.target.value })}
          onBlur={flushSave}
          disabled={readOnly}
          rows={2}
          className={`${cellInput} text-sm`}
          placeholder="Météo, matériel collectif, consignes staff…"
        />
      </div>

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Exporter / envoyer le programme"
      >
        <div className="space-y-4 text-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-200 mb-2">Périmètre</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="campProgExportScope"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                />
                Tout le stage
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="campProgExportScope"
                  checked={exportScope === 'day'}
                  onChange={() => setExportScope('day')}
                />
                Un jour seulement
              </label>
              {exportScope === 'day' && (
                <select
                  value={exportDayDate}
                  onChange={(e) => setExportDayDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  {dayDates.map((date, index) => (
                    <option key={date} value={date}>
                      J{index + 1} —{' '}
                      {formatEventDate(date, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-slate-200">Destinataires</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['all', 'Tous'],
                    ['rider', 'Athlètes'],
                    ['staff', 'Staff'],
                    ['none', 'Aucun'],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => selectRecipientGroup(kind)}
                    className="text-[11px] px-2 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {recipients.length === 0 ? (
              <p className="text-xs text-amber-200/90 rounded-lg border border-amber-700/40 bg-amber-950/40 px-3 py-2">
                Aucun e-mail sur les participants sélectionnés. Ajoutez des e-mails aux fiches athlètes /
                staff, ou téléchargez le PDF et envoyez-le manuellement.
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-700">
                {recipients.map((r) => (
                  <label
                    key={`${r.kind}-${r.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-800/80"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(r.email)}
                      onChange={() => toggleEmail(r.email)}
                    />
                    <span className="flex-1 min-w-0 truncate">
                      {r.label}
                      <span className="text-slate-400 text-xs ml-1">({r.email})</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {r.kind === 'rider' ? 'Athlète' : 'Staff'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <ActionButton type="button" size="sm" onClick={handleDownloadPdf}>
              Télécharger PDF
            </ActionButton>
            <ActionButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleSendEmail}
              disabled={selectedEmails.length === 0}
            >
              Envoyer par e-mail
            </ActionButton>
            <ActionButton type="button" size="sm" variant="secondary" onClick={() => void handleShare()}>
              Partager
            </ActionButton>
            <ActionButton type="button" size="sm" variant="secondary" onClick={() => void handleCopyText()}>
              Copier le texte
            </ActionButton>
          </div>

          {exportStatus && (
            <p className="text-xs text-sky-200 bg-sky-950/50 border border-sky-800/50 rounded-lg px-3 py-2">
              {exportStatus}
            </p>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">
            « Envoyer par e-mail » télécharge d’abord le PDF puis ouvre votre client mail (BCC) avec le
            programme en texte. Joignez le PDF manuellement — les navigateurs ne peuvent pas l’attacher
            automatiquement.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default StageCampProgrammeTab;

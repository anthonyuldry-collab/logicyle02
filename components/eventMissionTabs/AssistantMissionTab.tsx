import React, { useMemo, useState } from 'react';
import {
  AppState,
  MealDay,
  OperationalLogisticsDay,
  OperationalTiming,
  OperationalTimingCategory,
  RaceEvent,
} from '../../types';
import NutritionSummaryForAssistants from '../NutritionSummaryForAssistants';
import EventOperationalLogisticsTab from '../../sections/eventDetailTabs/EventOperationalLogisticsTab';
import ActionButton from '../ActionButton';
import {
  formatMassageScheduleForWhatsApp,
  getEventSelectedRiders,
  isFemaleRider,
} from '../../utils/staffRoleDataAccess';

interface AssistantMissionTabProps {
  event: RaceEvent;
  appState: AppState;
  updateEvent: (updated: Partial<RaceEvent>) => void;
  canEdit: boolean;
}

const generateId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const AssistantMissionTab: React.FC<AssistantMissionTabProps> = ({
  event,
  appState,
  updateEvent,
  canEdit,
}) => {
  const selectedRiders = useMemo(
    () => getEventSelectedRiders(event, appState.riders),
    [event, appState.riders],
  );
  const femaleRiders = useMemo(() => selectedRiders.filter(isFemaleRider), [selectedRiders]);
  const logistics = event.operationalLogistics ?? [];

  const allMassages = useMemo(() => {
    const rows: Array<{ day: OperationalLogisticsDay; timing: OperationalTiming }> = [];
    logistics.forEach(day => {
      (day.keyTimings ?? [])
        .filter(t => t.category === OperationalTimingCategory.MASSAGE)
        .forEach(timing => rows.push({ day, timing }));
    });
    return rows.sort((a, b) => (a.timing.time || '').localeCompare(b.timing.time || ''));
  }, [logistics]);

  const [copyOk, setCopyOk] = useState(false);

  const persistLogistics = (next: OperationalLogisticsDay[]) => {
    updateEvent({ operationalLogistics: next });
  };

  const updateMassage = (
    dayId: string,
    timingId: string,
    patch: Partial<OperationalTiming>,
  ) => {
    const next = logistics.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        keyTimings: (day.keyTimings ?? []).map(t =>
          t.id === timingId ? { ...t, ...patch } : t,
        ),
      };
    });
    persistLogistics(next);
  };

  const addMassage = () => {
    const defaultDay =
      logistics.find(d => d.dayName === MealDay.VENDREDI) ?? logistics[0];
    const newTiming: OperationalTiming = {
      id: generateId(),
      time: '19:00',
      description: 'Massage',
      category: OperationalTimingCategory.MASSAGE,
      personId: selectedRiders[0]?.id,
    };
    if (defaultDay) {
      persistLogistics(
        logistics.map(d =>
          d.id === defaultDay.id
            ? { ...d, keyTimings: [...(d.keyTimings ?? []), newTiming] }
            : d,
        ),
      );
    } else {
      persistLogistics([
        ...logistics,
        {
          id: generateId(),
          dayName: MealDay.VENDREDI,
          keyTimings: [newTiming],
        },
      ]);
    }
  };

  const removeMassage = (dayId: string, timingId: string) => {
    persistLogistics(
      logistics.map(day =>
        day.id === dayId
          ? { ...day, keyTimings: (day.keyTimings ?? []).filter(t => t.id !== timingId) }
          : day,
      ),
    );
  };

  const copyWhatsApp = async () => {
    const text = formatMassageScheduleForWhatsApp(event, appState.riders, appState.staff);
    await navigator.clipboard.writeText(text);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 2000);
  };

  if (selectedRiders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
        Aucune coureuse sélectionnée sur cette course. L&apos;encadrement doit valider les partantes
        pour afficher nutrition et massages.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
        <h3 className="text-base font-semibold text-teal-900">Mission assistant — {event.name}</h3>
        <p className="mt-1 text-sm text-teal-800">
          Fiche de poste : timings OP (transport, repas, course), bidons, ravitos, collations, stratégie
          glucidique (filles), horaires massages (WhatsApp).
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <EventOperationalLogisticsTab
          event={event}
          updateEvent={updateEvent}
          appState={appState}
          readOnly
          embedded
          excludeCategories={[OperationalTimingCategory.MASSAGE]}
        />
      </section>

      {femaleRiders.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-pink-900 uppercase tracking-wide">
            Stratégie glucidique — coureuses
          </h4>
          {femaleRiders.map(rider => (
            <div key={rider.id} className="rounded-xl border border-pink-200 bg-pink-50/40 p-1">
              <NutritionSummaryForAssistants rider={rider} highlightCarbStrategy />
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Nutrition & collations — effectif sélectionné
        </h4>
        {selectedRiders
          .filter(r => !femaleRiders.some(f => f.id === r.id))
          .map(rider => (
            <NutritionSummaryForAssistants key={rider.id} rider={rider} />
          ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Planning massages</h4>
            <p className="text-xs text-gray-500">
              À partager sur le groupe WhatsApp (fiche de poste).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {allMassages.length > 0 && (
              <ActionButton size="sm" variant="secondary" onClick={copyWhatsApp}>
                {copyOk ? 'Copié ✓' : 'Copier pour WhatsApp'}
              </ActionButton>
            )}
            {canEdit && (
              <ActionButton size="sm" onClick={addMassage}>
                Ajouter un créneau
              </ActionButton>
            )}
          </div>
        </div>

        {allMassages.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun massage planifié.</p>
        ) : (
          <div className="space-y-2">
            {allMassages.map(({ day, timing }) => (
              <div
                key={timing.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded-lg border border-gray-100 bg-gray-50/80 p-3"
              >
                <div className="md:col-span-2 text-xs font-medium text-gray-500">{day.dayName}</div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={timing.time || ''}
                    disabled={!canEdit}
                    onChange={e => updateMassage(day.id, timing.id, { time: e.target.value })}
                    placeholder="19h30"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-4">
                  <select
                    value={timing.personId || ''}
                    disabled={!canEdit}
                    onChange={e => updateMassage(day.id, timing.id, { personId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="">Coureuse</option>
                    {selectedRiders.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.firstName} {r.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <select
                    value={timing.masseurId || ''}
                    disabled={!canEdit}
                    onChange={e => updateMassage(day.id, timing.id, { masseurId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="">Masseur / masseuse</option>
                    {appState.staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                {canEdit && (
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeMassage(day.id, timing.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AssistantMissionTab;

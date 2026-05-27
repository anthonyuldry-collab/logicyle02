import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionButton from '../../components/ActionButton';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import {
  AppState,
  RaceEvent,
  StaffRole,
  StageDayLogistics,
  StageRaceVehicleKind,
  StageRavitoPoint,
  StageRavitoVehicle,
} from '../../types';
import {
  createEmptyRavitoVehicle,
  createRaceFollowerVehicle,
  ensureStageRaceLogistics,
  formatStageTitle,
  isStageRace,
  syncRaceFollowerStaffOccupants,
} from '../../utils/stageRaceUtils';
import { getStaffRoleDisplayLabel } from '../../utils/staffRoleUtils';
import { buildGoogleMapsDirectionsUrl } from '../../utils/transportLogisticsExport';

interface StageRavitoEditorProps {
  event: RaceEvent;
  eventId: string;
  stage: StageDayLogistics;
  updateEvent: (data: Partial<RaceEvent>) => void | Promise<void>;
  appState: AppState;
}

const stageDaySyncSignature = (event: RaceEvent, stageDate: string, stageId: string): string => {
  const day =
    event.raceInfo?.stageDays?.find((d) => d.id === stageId)
    ?? event.raceInfo?.stageDays?.find((d) => d.date === stageDate);
  return JSON.stringify({
    ravitoVehicles: day?.ravitoVehicles ?? [],
    additionalStaffIds: day?.additionalStaffIds ?? [],
  });
};

const lightInputClass =
  'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500';

const KIND_LABELS: Record<StageRaceVehicleKind, string> = {
  [StageRaceVehicleKind.RACE_FOLLOWER]: 'Véhicule suiveur course',
  [StageRaceVehicleKind.RAVITO]: 'Véhicule ravito',
  [StageRaceVehicleKind.STAFF_SUPPORT]: 'Véhicule staff',
};

const StageRavitoEditor: React.FC<StageRavitoEditorProps> = ({
  event,
  eventId,
  stage,
  updateEvent,
  appState,
}) => {
  const [formData, setFormData] = useState<RaceEvent>(() => ensureStageRaceLogistics(event));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const lastSyncedSigRef = useRef(stageDaySyncSignature(event, stage.date, stage.id));
  const skipNextSyncRef = useRef(false);

  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const sig = stageDaySyncSignature(event, stage.date, stage.id);
    if (sig === lastSyncedSigRef.current) return;
    lastSyncedSigRef.current = sig;
    setFormData(ensureStageRaceLogistics(event));
  }, [event, stage.date, stage.id]);

  const resolvedStageId = useMemo(() => {
    const days = formData.raceInfo?.stageDays ?? [];
    return (
      days.find((d) => d.id === stage.id)?.id
      ?? days.find((d) => d.date === stage.date)?.id
      ?? stage.id
    );
  }, [formData.raceInfo?.stageDays, stage.id, stage.date]);

  const stageFromForm = useMemo(() => {
    const days = formData.raceInfo?.stageDays ?? [];
    return (
      days.find((d) => d.id === resolvedStageId)
      ?? days.find((d) => d.date === stage.date)
      ?? stage
    );
  }, [formData.raceInfo?.stageDays, resolvedStageId, stage]);

  const eventStaffIds = useMemo(
    () => new Set(event.selectedStaffIds || []),
    [event.selectedStaffIds],
  );

  const additionalStaffIds = stageFromForm.additionalStaffIds ?? [];

  const staffForStage = useMemo(() => {
    const ids = new Set([...eventStaffIds, ...additionalStaffIds]);
    return appState.staff.filter((s) => ids.has(s.id));
  }, [appState.staff, eventStaffIds, additionalStaffIds]);

  const staffAvailableToAdd = useMemo(
    () =>
      appState.staff.filter(
        (s) => !eventStaffIds.has(s.id) && !additionalStaffIds.includes(s.id),
      ),
    [appState.staff, eventStaffIds, additionalStaffIds],
  );

  const staffByRole = useMemo(() => {
    const dsIds = new Set(event.directeurSportifId || []);
    const mecanoIds = new Set(event.mecanoId || []);
    return {
      directeurs: staffForStage.filter((s) => dsIds.has(s.id) || s.role === StaffRole.DS),
      mecanos: staffForStage.filter((s) => mecanoIds.has(s.id) || s.role === StaffRole.MECANO),
      autres: staffForStage.filter(
        (s) =>
          !additionalStaffIds.includes(s.id)
          && !dsIds.has(s.id)
          && !mecanoIds.has(s.id)
          && s.role !== StaffRole.DS
          && s.role !== StaffRole.MECANO,
      ),
      stageOnly: staffForStage.filter((s) => additionalStaffIds.includes(s.id)),
    };
  }, [staffForStage, event.directeurSportifId, event.mecanoId, additionalStaffIds]);

  if (!isStageRace(formData)) {
    return (
      <p className="text-sm text-gray-500 italic py-4">
        Les véhicules en course sont disponibles pour les courses à étapes.
      </p>
    );
  }

  const ravitoVehicles = stageFromForm.ravitoVehicles ?? [];

  const patchStage = useCallback(
    (updater: (day: StageDayLogistics) => StageDayLogistics) => {
      setFormData((prev) => ({
        ...prev,
        raceInfo: {
          ...prev.raceInfo,
          stageDays: (prev.raceInfo?.stageDays || []).map((day) =>
            day.id === resolvedStageId || day.date === stage.date
              ? updater(day)
              : day,
          ),
        },
      }));
    },
    [resolvedStageId, stage.date],
  );

  const addStageOnlyStaff = (staffId: string) => {
    patchStage((day) => ({
      ...day,
      additionalStaffIds: [...new Set([...(day.additionalStaffIds ?? []), staffId])],
    }));
  };

  const removeStageOnlyStaff = (staffId: string) => {
    patchStage((day) => ({
      ...day,
      additionalStaffIds: (day.additionalStaffIds ?? []).filter((id) => id !== staffId),
      ravitoVehicles: (day.ravitoVehicles ?? []).map((v) => ({
        ...v,
        staffOccupantIds: (v.staffOccupantIds ?? []).filter((id) => id !== staffId),
        directeurSportifStaffId:
          v.directeurSportifStaffId === staffId ? undefined : v.directeurSportifStaffId,
        mecanoStaffId: v.mecanoStaffId === staffId ? undefined : v.mecanoStaffId,
        driverId: v.driverId === staffId ? undefined : v.driverId,
      })),
    }));
  };

  const handleSave = async () => {
    const stageDay =
      formData.raceInfo?.stageDays?.find((d) => d.id === resolvedStageId)
      ?? formData.raceInfo?.stageDays?.find((d) => d.date === stage.date);
    const invalidFollower = (stageDay?.ravitoVehicles ?? []).find(
      (v) =>
        v.kind === StageRaceVehicleKind.RACE_FOLLOWER &&
        (!v.directeurSportifStaffId || !v.mecanoStaffId),
    );
    if (invalidFollower) {
      alert(
        'Chaque véhicule suiveur course doit avoir un directeur sportif et un mécanicien assignés.',
      );
      return;
    }

    if (!appState.activeTeamId) {
      alert('Aucune équipe active : impossible d\'enregistrer sur le serveur.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const normalized = ensureStageRaceLogistics({ ...formData, id: eventId });
      const syncedDays = (normalized.raceInfo?.stageDays || []).map((day) =>
        day.id === resolvedStageId || day.date === stage.date
          ? {
              ...day,
              ravitoVehicles: (day.ravitoVehicles ?? []).map((v) =>
                syncRaceFollowerStaffOccupants(v),
              ),
            }
          : day,
      );
      const toSave = {
        ...normalized,
        raceInfo: { ...normalized.raceInfo, stageDays: syncedDays },
      };
      await updateEvent(toSave);
      skipNextSyncRef.current = true;
      lastSyncedSigRef.current = stageDaySyncSignature(
        toSave,
        stage.date,
        resolvedStageId,
      );
      setFormData(toSave);
      setSaveMessage('Enregistré.');
      window.setTimeout(() => setSaveMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateVehicle = (vehicleId: string, patch: Partial<StageRavitoVehicle>) => {
    patchStage((day) => ({
      ...day,
      ravitoVehicles: (day.ravitoVehicles ?? []).map((v) => {
        if (v.id !== vehicleId) return v;
        let next = { ...v, ...patch };
        if (patch.kind !== undefined) {
          next.roleLabel = KIND_LABELS[patch.kind] || next.roleLabel;
          if (patch.kind === StageRaceVehicleKind.RAVITO && next.points.length === 0) {
            next = { ...next, points: createEmptyRavitoVehicle(StageRaceVehicleKind.RAVITO).points };
          }
          if (patch.kind === StageRaceVehicleKind.RACE_FOLLOWER) {
            next = syncRaceFollowerStaffOccupants(next);
          }
        }
        if (
          patch.directeurSportifStaffId !== undefined ||
          patch.mecanoStaffId !== undefined
        ) {
          next = syncRaceFollowerStaffOccupants(next);
        }
        return next;
      }),
    }));
  };

  const toggleStaffOccupant = (vehicleId: string, staffId: string) => {
    patchStage((day) => ({
      ...day,
      ravitoVehicles: (day.ravitoVehicles ?? []).map((v) => {
        if (v.id !== vehicleId) return v;
        const current = new Set(v.staffOccupantIds ?? []);
        if (current.has(staffId)) current.delete(staffId);
        else current.add(staffId);
        return { ...v, staffOccupantIds: [...current] };
      }),
    }));
  };

  const updatePoint = (
    vehicleId: string,
    pointId: string,
    patch: Partial<StageRavitoPoint>,
  ) => {
    patchStage((day) => ({
      ...day,
      ravitoVehicles: (day.ravitoVehicles ?? []).map((v) =>
        v.id !== vehicleId
          ? v
          : {
              ...v,
              points: v.points.map((p) => (p.id === pointId ? { ...p, ...patch } : p)),
            },
      ),
    }));
  };

  const addVehicle = (kind: StageRaceVehicleKind) => {
    const vehicle =
      kind === StageRaceVehicleKind.RACE_FOLLOWER
        ? createRaceFollowerVehicle(formData)
        : createEmptyRavitoVehicle(kind);
    patchStage((day) => ({
      ...day,
      ravitoVehicles: [...(day.ravitoVehicles ?? []), vehicle],
    }));
  };

  const removeVehicle = (vehicleId: string) => {
    patchStage((day) => ({
      ...day,
      ravitoVehicles: (day.ravitoVehicles ?? []).filter((v) => v.id !== vehicleId),
    }));
  };

  const addPoint = (vehicleId: string) => {
    patchStage((day) => ({
      ...day,
      ravitoVehicles: (day.ravitoVehicles ?? []).map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              points: [...v.points, createEmptyRavitoVehicle(StageRaceVehicleKind.RAVITO).points[0]],
            }
          : v,
      ),
    }));
  };

  const removePoint = (vehicleId: string, pointId: string) => {
    patchStage((day) => ({
      ...day,
      ravitoVehicles: (day.ravitoVehicles ?? []).map((v) =>
        v.id === vehicleId
          ? { ...v, points: v.points.filter((p) => p.id !== pointId) }
          : v,
      ),
    }));
  };

  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return '—';
    if (vehicleId === 'perso') return 'Véhicule personnel';
    return appState.vehicles.find((v) => v.id === vehicleId)?.name ?? 'Véhicule';
  };

  const getStaffName = (staffId?: string) => {
    if (!staffId) return '—';
    const s = appState.staff.find((x) => x.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : '—';
  };

  const renderStaffCheckboxes = (vehicle: StageRavitoVehicle) => {
    const kind = vehicle.kind ?? StageRaceVehicleKind.RAVITO;
    const lockedIds = new Set<string>();
    if (kind === StageRaceVehicleKind.RACE_FOLLOWER) {
      if (vehicle.directeurSportifStaffId) lockedIds.add(vehicle.directeurSportifStaffId);
      if (vehicle.mecanoStaffId) lockedIds.add(vehicle.mecanoStaffId);
    }

    const renderGroup = (title: string, members: typeof staffForStage) => {
      if (members.length === 0) return null;
      return (
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((s) => {
              const selected = (vehicle.staffOccupantIds ?? []).includes(s.id);
              const locked = lockedIds.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm border ${
                    selected
                      ? 'bg-blue-100 border-blue-300 text-blue-900'
                      : 'bg-white border-gray-200 text-gray-700'
                  } ${locked ? 'opacity-90' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={locked}
                    onChange={() => toggleStaffOccupant(vehicle.id, s.id)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  {s.firstName} {s.lastName}
                  <span className="text-xs text-gray-500">
                    ({getStaffRoleDisplayLabel(s.role)})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Staff à bord</p>
        <p className="text-xs text-slate-600 mb-3">
          Les coureuses sont sur le vélo pendant la course — seul le staff est assigné aux véhicules.
        </p>
        {renderGroup('Encadrement', [...staffByRole.directeurs, ...staffByRole.mecanos])}
        {renderGroup('Autres staff (événement)', staffByRole.autres)}
        {staffByRole.stageOnly.length > 0
          && renderGroup('Présents uniquement cette étape', staffByRole.stageOnly)}
      </div>
    );
  };

  const renderFollowerRequirements = (vehicle: StageRavitoVehicle) => {
    const missingDs = !vehicle.directeurSportifStaffId;
    const missingMeco = !vehicle.mecanoStaffId;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="md:col-span-2 text-xs text-amber-900 font-medium">
          Suiveur course : un directeur sportif et un mécanicien sont obligatoires à bord.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Directeur sportif <span className="text-red-600">*</span>
          </label>
          <select
            value={vehicle.directeurSportifStaffId || ''}
            onChange={(e) =>
              updateVehicle(vehicle.id, {
                directeurSportifStaffId: e.target.value || undefined,
              })
            }
            className={`${lightInputClass} ${missingDs ? 'border-amber-400' : ''}`}
          >
            <option value="">— Sélectionner —</option>
            {staffByRole.directeurs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
          {missingDs && (
            <p className="text-xs text-amber-700 mt-1">Renseignez le DS sur l&apos;événement ou ici.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mécanicien <span className="text-red-600">*</span>
          </label>
          <select
            value={vehicle.mecanoStaffId || ''}
            onChange={(e) =>
              updateVehicle(vehicle.id, { mecanoStaffId: e.target.value || undefined })
            }
            className={`${lightInputClass} ${missingMeco ? 'border-amber-400' : ''}`}
          >
            <option value="">— Sélectionner —</option>
            {staffByRole.mecanos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
          {missingMeco && (
            <p className="text-xs text-amber-700 mt-1">Renseignez le mécano sur l&apos;événement ou ici.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">
            Véhicules en course — {formatStageTitle(stageFromForm)}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Départ : {stageFromForm.departLocation || '—'} · Arrivée : {stageFromForm.arriveeLocation || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="text-xs text-emerald-700 font-medium">{saveMessage}</span>
          )}
          <ActionButton onClick={handleSave} disabled={isSaving} size="sm" variant="secondary">
            {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
          </ActionButton>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/60 space-y-3">
        <div>
          <h5 className="text-sm font-semibold text-blue-900">Staff présent uniquement cette étape</h5>
          <p className="text-xs text-blue-800 mt-1">
            Pour les vacataires ou renforts d&apos;une journée : ils apparaîtront dans les listes
            véhicules ci-dessous sans être inscrits sur toute la course.
          </p>
        </div>
        {staffByRole.stageOnly.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {staffByRole.stageOnly.map((s) => (
              <li
                key={s.id}
                className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm bg-white border border-blue-200"
              >
                <span>
                  {s.firstName} {s.lastName}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getStaffRoleDisplayLabel(s.role)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeStageOnlyStaff(s.id)}
                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                  title="Retirer de cette étape"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        {staffAvailableToAdd.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ajouter depuis l&apos;équipe
              </label>
              <select
                id="stage-only-staff-select"
                className={lightInputClass}
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) {
                    addStageOnlyStaff(id);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">— Choisir une personne —</option>
                {staffAvailableToAdd.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({getStaffRoleDisplayLabel(s.role)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">
            Tout le staff de l&apos;équipe est déjà sur l&apos;événement ou ajouté à cette étape.
          </p>
        )}
      </div>

      <div className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        Pendant la course, les <strong>coureuses roulent</strong> : les véhicules accueillent uniquement le{' '}
        <strong>staff</strong>. Le <strong>véhicule suiveur</strong> doit compter un{' '}
        <strong>DS</strong> et un <strong>mécanicien</strong> obligatoirement.
      </div>

      {ravitoVehicles.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-emerald-200 rounded-lg bg-emerald-50/50 space-y-3">
          <p className="text-gray-600">Aucun véhicule en course pour cette étape.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <ActionButton
              onClick={() => addVehicle(StageRaceVehicleKind.RACE_FOLLOWER)}
              size="sm"
            >
              + Suiveur course (DS + mécano)
            </ActionButton>
            <ActionButton
              onClick={() => addVehicle(StageRaceVehicleKind.RAVITO)}
              variant="secondary"
              size="sm"
            >
              + Véhicule ravito
            </ActionButton>
            <ActionButton
              onClick={() => addVehicle(StageRaceVehicleKind.STAFF_SUPPORT)}
              variant="secondary"
              size="sm"
            >
              + Véhicule staff
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {ravitoVehicles.map((vehicle) => {
            const kind = vehicle.kind ?? StageRaceVehicleKind.RAVITO;
            const showPoints = kind === StageRaceVehicleKind.RAVITO;
            const routePoints = vehicle.points
              .map((p) => p.location?.trim())
              .filter(Boolean) as string[];
            const mapsUrl =
              routePoints.length >= 2 ? buildGoogleMapsDirectionsUrl(routePoints) : null;

            return (
              <div
                key={vehicle.id}
                className={`border rounded-lg p-4 bg-white shadow-sm ${
                  kind === StageRaceVehicleKind.RACE_FOLLOWER
                    ? 'border-amber-300'
                    : 'border-emerald-200'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-4">
                  <span className="text-lg">
                    {kind === StageRaceVehicleKind.RACE_FOLLOWER
                      ? '🚗'
                      : kind === StageRaceVehicleKind.RAVITO
                        ? '🥤'
                        : '👥'}
                  </span>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    onClick={() => removeVehicle(vehicle.id)}
                    icon={<TrashIcon className="w-4 h-4" />}
                  >
                    Supprimer
                  </ActionButton>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={kind}
                      onChange={(e) =>
                        updateVehicle(vehicle.id, {
                          kind: e.target.value as StageRaceVehicleKind,
                        })
                      }
                      className={lightInputClass}
                    >
                      {Object.entries(KIND_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Véhicule flotte</label>
                    <select
                      value={vehicle.vehicleId || ''}
                      onChange={(e) =>
                        updateVehicle(vehicle.id, {
                          vehicleId: e.target.value || undefined,
                        })
                      }
                      className={lightInputClass}
                    >
                      <option value="">—</option>
                      <option value="perso">Véhicule personnel</option>
                      {appState.vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Conducteur</label>
                    <select
                      value={vehicle.driverId || ''}
                      onChange={(e) =>
                        updateVehicle(vehicle.id, {
                          driverId: e.target.value || undefined,
                        })
                      }
                      className={lightInputClass}
                    >
                      <option value="">— Staff conducteur —</option>
                      {staffForStage.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({getStaffRoleDisplayLabel(s.role)})
                          {additionalStaffIds.includes(s.id) ? ' · étape' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {kind === StageRaceVehicleKind.RACE_FOLLOWER && renderFollowerRequirements(vehicle)}

                {renderStaffCheckboxes(vehicle)}

                {showPoints && (
                  <div className="mb-3 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-semibold text-gray-700">Points ravito</h5>
                      <ActionButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addPoint(vehicle.id)}
                        icon={<PlusCircleIcon className="w-4 h-4" />}
                      >
                        Ajouter un point
                      </ActionButton>
                    </div>
                    <div className="space-y-3">
                      {vehicle.points.map((point, pIndex) => (
                        <div
                          key={point.id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-emerald-50/80 p-3 rounded-md border border-emerald-100"
                        >
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600">N°</label>
                            <input
                              type="text"
                              value={point.label || `Ravito ${pIndex + 1}`}
                              onChange={(e) =>
                                updatePoint(vehicle.id, point.id, { label: e.target.value })
                              }
                              className={lightInputClass}
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-gray-600">Lieu</label>
                            <input
                              type="text"
                              value={point.location}
                              onChange={(e) =>
                                updatePoint(vehicle.id, point.id, { location: e.target.value })
                              }
                              placeholder="Km, village…"
                              className={lightInputClass}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600">Arrivée</label>
                            <input
                              type="time"
                              value={point.arrivalTime}
                              onChange={(e) =>
                                updatePoint(vehicle.id, point.id, { arrivalTime: e.target.value })
                              }
                              className={lightInputClass}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600">Départ</label>
                            <input
                              type="time"
                              value={point.departureTime || ''}
                              onChange={(e) =>
                                updatePoint(vehicle.id, point.id, {
                                  departureTime: e.target.value,
                                })
                              }
                              className={lightInputClass}
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            {vehicle.points.length > 1 && (
                              <ActionButton
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => removePoint(vehicle.id, point.id)}
                                icon={<TrashIcon className="w-3 h-3" />}
                              >
                                <span className="sr-only">Supprimer</span>
                              </ActionButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Itinéraire (Google Maps)
                  </a>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {getVehicleName(vehicle.vehicleId)} · Conducteur : {getStaffName(vehicle.driverId)}
                  {(vehicle.staffOccupantIds?.length ?? 0) > 0 && (
                    <>
                      {' '}
                      · À bord :{' '}
                      {vehicle.staffOccupantIds
                        ?.map((id) => getStaffName(id))
                        .filter((n) => n !== '—')
                        .join(', ')}
                    </>
                  )}
                </p>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <ActionButton
              onClick={() => addVehicle(StageRaceVehicleKind.RACE_FOLLOWER)}
              size="sm"
              icon={<PlusCircleIcon className="w-5 h-5" />}
            >
              Suiveur course
            </ActionButton>
            <ActionButton
              onClick={() => addVehicle(StageRaceVehicleKind.RAVITO)}
              variant="secondary"
              size="sm"
              icon={<PlusCircleIcon className="w-5 h-5" />}
            >
              Ravito
            </ActionButton>
            <ActionButton
              onClick={() => addVehicle(StageRaceVehicleKind.STAFF_SUPPORT)}
              variant="secondary"
              size="sm"
              icon={<PlusCircleIcon className="w-5 h-5" />}
            >
              Staff
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageRavitoEditor;

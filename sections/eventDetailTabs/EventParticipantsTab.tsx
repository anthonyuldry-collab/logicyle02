

import React, { useState, useEffect, useMemo } from 'react';
import {
  RaceEvent,
  AppState,
  StaffRoleKey,
  StaffRole,
  RiderEventSelection,
  RiderEventStatus,
  Mission,
  MissionStatus,
} from '../../types';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import { STAFF_ROLES_CONFIG } from '../../constants';
import { getStaffRoleDisplayLabel } from '../../utils/staffRoleUtils';
import * as firebaseService from '../../services/firebaseService';
import { exportUciStartListPdf } from '../../utils/uciFormExport';
import { useTranslations } from '../../hooks/useTranslations';
import { useFeedbackTimeout } from '../../hooks/useFeedbackTimeout';
import {
  createMissionFromEvent,
  getOpenMissionsForEvent,
  VACATAIRE_MISSION_ROLES,
} from '../../utils/missionFromEventUtils';

const EVENT_ROLE_KEYS: StaffRoleKey[] = [
  'managerId', 'directeurSportifId', 'assistantId', 'mecanoId', 'kineId', 'medecinId',
  'respPerfId', 'entraineurId', 'dataAnalystId', 'prepaPhysiqueId', 'communicationId'
];

const STAFF_ROLE_TO_EVENT_KEY: Partial<Record<StaffRole, StaffRoleKey>> = {
  [StaffRole.MANAGER]: 'managerId',
  [StaffRole.DS]: 'directeurSportifId',
  [StaffRole.ASSISTANT]: 'assistantId',
  [StaffRole.MECANO]: 'mecanoId',
  [StaffRole.KINE]: 'kineId',
  [StaffRole.MEDECIN]: 'medecinId',
  [StaffRole.RESP_PERF]: 'respPerfId',
  [StaffRole.ENTRAINEUR]: 'entraineurId',
  [StaffRole.DATA_ANALYST]: 'dataAnalystId',
  [StaffRole.PREPA_PHYSIQUE]: 'prepaPhysiqueId',
  [StaffRole.COMMUNICATION]: 'communicationId',
};

/** Rôle stocké en base peut être la clé enum ("DS", "ENTRAINEUR") ou la valeur ("Directeur Sportif", "Entraîneur"). */
const STAFF_ROLE_KEY_TO_EVENT_KEY: Record<string, StaffRoleKey> = {
  MANAGER: 'managerId',
  DS: 'directeurSportifId',
  ASSISTANT: 'assistantId',
  MECANO: 'mecanoId',
  KINE: 'kineId',
  MEDECIN: 'medecinId',
  RESP_PERF: 'respPerfId',
  ENTRAINEUR: 'entraineurId',
  DATA_ANALYST: 'dataAnalystId',
  PREPA_PHYSIQUE: 'prepaPhysiqueId',
  COMMUNICATION: 'communicationId',
  AUTRE: 'assistantId',
};

function getEventRoleKeyForStaffRole(role: StaffRole | string): StaffRoleKey | undefined {
  const byValue = STAFF_ROLE_TO_EVENT_KEY[role as StaffRole];
  if (byValue) return byValue;
  return STAFF_ROLE_KEY_TO_EVENT_KEY[String(role)];
}

function getStaffRoleKeyInEvent(event: RaceEvent, staffId: string): StaffRoleKey | null {
  for (const key of EVENT_ROLE_KEYS) {
    const arr = (event as unknown as Record<string, unknown>)[key];
    if (Array.isArray(arr) && arr.includes(staffId)) return key;
  }
  return null;
}

function getRoleLabel(roleKey: StaffRoleKey): string {
  const role = STAFF_ROLES_CONFIG.flatMap(g => g.roles).find(r => r.key === roleKey);
  return role ? role.label.replace(/\s*\(s\)\s*$/, '') : roleKey;
}

interface EventParticipantsTabProps {
  event: RaceEvent;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => void;
  appState: AppState;
  riderEventSelections?: RiderEventSelection[];
  setRiderEventSelections?: React.Dispatch<React.SetStateAction<RiderEventSelection[]>>;
  setMissions?: React.Dispatch<React.SetStateAction<Mission[]>>;
  readOnly?: boolean;
}

const EventParticipantsTab: React.FC<EventParticipantsTabProps> = ({
  event,
  updateEvent,
  appState,
  riderEventSelections = [],
  setRiderEventSelections,
  setMissions,
  readOnly = false,
}) => {
  const { t } = useTranslations();
  const { feedback, showFeedback } = useFeedbackTimeout();
  const activeTeam = appState.teams?.find((tm) => tm.id === appState.activeTeamId);
  const [selectedRiderIds, setSelectedRiderIds] = useState<string[]>(event.selectedRiderIds || []);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(event.selectedStaffIds || []);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(event.selectedVehicleIds || []);
  const [staffRoleInEvent, setStaffRoleInEvent] = useState<Record<string, StaffRoleKey>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [filterRiderText, setFilterRiderText] = useState('');
  const [filterStaffText, setFilterStaffText] = useState('');
  const [filterStaffRoleKey, setFilterStaffRoleKey] = useState<StaffRoleKey | ''>('');
  const [filterVehicleText, setFilterVehicleText] = useState('');
  const [isVacataireModalOpen, setIsVacataireModalOpen] = useState(false);
  const [vacataireRole, setVacataireRole] = useState<StaffRole>(StaffRole.MECANO);
  const [vacataireDailyRate, setVacataireDailyRate] = useState('');
  const [vacataireNotes, setVacataireNotes] = useState('');

  const allRoleOptions = useMemo(() => STAFF_ROLES_CONFIG.flatMap(g => g.roles), []);

  const openVacataireMissions = useMemo(
    () => getOpenMissionsForEvent(appState.missions, event.id),
    [appState.missions, event.id]
  );

  const handlePublishVacataireMission = () => {
    const teamId = appState.activeTeamId;
    if (!setMissions || !teamId) {
      showFeedback('Impossible de publier l’offre (équipe ou persistance indisponible).');
      return;
    }
    const rate = vacataireDailyRate.trim() ? Number(vacataireDailyRate) : undefined;
    if (vacataireDailyRate.trim() && (!Number.isFinite(rate) || (rate ?? 0) <= 0)) {
      showFeedback('Indiquez un tarif journalier valide, ou laissez vide.');
      return;
    }
    const mission = createMissionFromEvent({
      event,
      teamId,
      role: vacataireRole,
      dailyRate: rate,
      description: vacataireNotes.trim() || undefined,
    });
    setMissions((prev) => [...(prev || []), mission]);
    setIsVacataireModalOpen(false);
    setVacataireDailyRate('');
    setVacataireNotes('');
    showFeedback(
      `Offre publiée : ${getStaffRoleDisplayLabel(vacataireRole)}. Visible dans Staff → Recrutement ; après acceptation → planning + budget vacataire.`
    );
  };

  useEffect(() => {
    setSelectedRiderIds(event.selectedRiderIds || []);
    setSelectedStaffIds(event.selectedStaffIds || []);
    setSelectedVehicleIds(event.selectedVehicleIds || []);
    const roleMap: Record<string, StaffRoleKey> = {};
    (event.selectedStaffIds || []).forEach(staffId => {
      const inEvent = getStaffRoleKeyInEvent(event, staffId);
      if (inEvent) {
        roleMap[staffId] = inEvent;
      } else {
        const member = appState.staff.find(s => s.id === staffId);
        roleMap[staffId] = (member && getEventRoleKeyForStaffRole(member.role)) || 'assistantId';
      }
    });
    setStaffRoleInEvent(roleMap);
  }, [event, appState.staff]);

  const handleSelectionChange = (id: string, type: 'riders' | 'staff' | 'vehicles') => {
    switch (type) {
      case 'riders':
        setSelectedRiderIds(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
        break;
      case 'staff': {
        setSelectedStaffIds(prev => {
          const next = prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id];
          if (!next.includes(id)) {
            setStaffRoleInEvent(prevRoles => {
              const nextRoles = { ...prevRoles };
              delete nextRoles[id];
              return nextRoles;
            });
          } else {
            const member = appState.staff.find(s => s.id === id);
            const defaultKey = (member && getEventRoleKeyForStaffRole(member.role)) || getStaffRoleKeyInEvent(event, id) || 'assistantId';
            setStaffRoleInEvent(prev => ({ ...prev, [id]: defaultKey }));
          }
          return next;
        });
        break;
      }
      case 'vehicles':
        setSelectedVehicleIds(prev => prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]);
        break;
    }
  };

  const handleStaffRoleChange = (staffId: string, roleKey: StaffRoleKey) => {
    setStaffRoleInEvent(prev => ({ ...prev, [staffId]: roleKey }));
  };

  const handleSave = async () => {
    const updatedEventData: Partial<RaceEvent> = {
      selectedRiderIds,
      selectedStaffIds,
      selectedVehicleIds,
    };
    EVENT_ROLE_KEYS.forEach(roleKey => {
      (updatedEventData as Record<string, string[]>)[roleKey] = selectedStaffIds.filter(
        id => staffRoleInEvent[id] === roleKey
      );
    });
    updateEvent(updatedEventData);

    // Synchroniser riderEventSelections : les coureurs sélectionnés dans l'événement sont des titulaires
    if (setRiderEventSelections && appState.activeTeamId) {
      const currentRiderIds = new Set(selectedRiderIds);
      const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);

      // Retirer les sélections pour les coureurs qui ne sont plus dans selectedRiderIds
      const toRemove = eventSelections.filter(sel => !currentRiderIds.has(sel.riderId));
      for (const sel of toRemove) {
        try {
          await firebaseService.deleteData(appState.activeTeamId, 'riderEventSelections', sel.id);
        } catch (e) {
          console.warn('Erreur suppression sélection', sel.id, e);
        }
      }
      if (toRemove.length > 0) {
        setRiderEventSelections(prev =>
          prev.filter(s => !(s.eventId === event.id && !currentRiderIds.has(s.riderId)))
        );
      }

      // Ajouter ou conserver une sélection TITULAIRE pour chaque coureur dans selectedRiderIds
      for (const riderId of currentRiderIds) {
        const existing = eventSelections.find(s => s.riderId === riderId);
        if (existing) {
          if (existing.status !== RiderEventStatus.TITULAIRE) {
            const updated = { ...existing, status: RiderEventStatus.TITULAIRE };
            try {
              await firebaseService.saveData(appState.activeTeamId, 'riderEventSelections', updated);
              setRiderEventSelections(prev =>
                prev.map(s => (s.eventId === event.id && s.riderId === riderId ? updated : s))
              );
            } catch (e) {
              console.warn('Erreur mise à jour sélection', e);
            }
          }
        } else {
          const newSelection: RiderEventSelection = {
            id: '',
            eventId: event.id,
            riderId,
            status: RiderEventStatus.TITULAIRE,
          };
          try {
            const savedId = await firebaseService.saveData(appState.activeTeamId, 'riderEventSelections', newSelection);
            newSelection.id = savedId;
            setRiderEventSelections(prev => [...prev, newSelection]);
          } catch (e) {
            console.warn('Erreur création sélection', e);
          }
        }
      }
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedRiderIds(event.selectedRiderIds || []);
    setSelectedStaffIds(event.selectedStaffIds || []);
    setSelectedVehicleIds(event.selectedVehicleIds || []);
    const roleMap: Record<string, StaffRoleKey> = {};
    (event.selectedStaffIds || []).forEach(staffId => {
      const inEvent = getStaffRoleKeyInEvent(event, staffId);
      if (inEvent) roleMap[staffId] = inEvent;
      else {
        const member = appState.staff.find(s => s.id === staffId);
        roleMap[staffId] = (member && getEventRoleKeyForStaffRole(member.role)) || 'assistantId';
      }
    });
    setStaffRoleInEvent(roleMap);
    setFilterRiderText('');
    setFilterStaffText('');
    setFilterStaffRoleKey('');
    setFilterVehicleText('');
    setIsEditing(false);
  };

  const getParticipantDetails = (participant: { id: string; name: string }, forStaffRole?: StaffRoleKey | null): string => {
    const staffMember = appState.staff.find(s => s.id === participant.id);
    if (staffMember) {
      const roleKey = forStaffRole ?? (isEditing ? staffRoleInEvent[participant.id] : getStaffRoleKeyInEvent(event, participant.id));
      const label = roleKey ? getRoleLabel(roleKey) : getStaffRoleDisplayLabel(staffMember.role || '');
      return `(${label})`;
    }
    const vehicle = appState.vehicles.find(v => v.id === participant.id);
    if (vehicle) return `(${vehicle.licensePlate})`;
    return '';
  };


  type FilterConfig = {
    filterText: string;
    setFilterText: (v: string) => void;
    filterRoleKey?: StaffRoleKey | '';
    setFilterRoleKey?: (v: StaffRoleKey | '') => void;
  };

  const renderParticipantList = <T extends { id: string; name: string }>(
    title: string,
    allAvailableParticipants: T[],
    selectedIds: string[],
    onChange?: (id: string, type: 'riders' | 'staff' | 'vehicles') => void,
    type?: 'riders' | 'staff' | 'vehicles',
    filterConfig?: FilterConfig
  ) => {
    const selectedParticipants = allAvailableParticipants.filter(p => selectedIds.includes(p.id));
    const filterText = (filterConfig?.filterText ?? '').trim().toLowerCase();
    const filterRoleKey = filterConfig?.filterRoleKey ?? '';

    let filteredParticipants = allAvailableParticipants;
    if (filterText) {
      if (type === 'vehicles') {
        filteredParticipants = filteredParticipants.filter(p => {
          const v = appState.vehicles.find(ve => ve.id === p.id);
          return v && (p.name.toLowerCase().includes(filterText) || v.name?.toLowerCase().includes(filterText) || v.licensePlate?.toLowerCase().includes(filterText));
        });
      } else {
        filteredParticipants = filteredParticipants.filter(p => p.name.toLowerCase().includes(filterText));
      }
    }
    if (type === 'staff' && filterRoleKey) {
      filteredParticipants = filteredParticipants.filter(p => {
        const member = appState.staff.find(s => s.id === p.id);
        return member && getEventRoleKeyForStaffRole(member.role) === filterRoleKey;
      });
    }

    if (!isEditing && selectedIds.length === 0) {
      return (
        <div>
          <h4 className="text-md font-semibold text-gray-700 mb-1">{title}</h4>
          <p className="text-sm text-gray-500 italic">Aucun participant de ce type sélectionné.</p>
        </div>
      );
    }
    return (
      <div>
        <h4 className="text-md font-semibold text-gray-700 mb-1">{title} ({selectedIds.length})</h4>
        {isEditing ? (
          <>
            {filterConfig && (
              <div className="flex flex-col gap-1.5 mb-2">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={filterConfig.filterText}
                  onChange={e => filterConfig.setFilterText(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white placeholder-gray-400"
                  aria-label="Filtrer la liste"
                />
                {type === 'staff' && filterConfig.setFilterRoleKey && (
                  <select
                    value={filterConfig.filterRoleKey ?? ''}
                    onChange={e => filterConfig.setFilterRoleKey!(e.target.value as StaffRoleKey | '')}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                    aria-label="Filtrer par rôle"
                  >
                    <option value="">Tous les rôles</option>
                    {allRoleOptions.map(ro => (
                      <option key={ro.key} value={ro.key}>{ro.label}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="max-h-64 overflow-y-auto space-y-1 p-2 border rounded-md bg-gray-50">
              {filteredParticipants.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  {allAvailableParticipants.length === 0
                    ? `Aucun ${title.toLowerCase().replace(' sélectionnés', '')} disponible globalement.`
                    : 'Aucun résultat pour ce filtre.'}
                </p>
              )}
              {type === 'riders'
                ? (() => {
                    const principal = filteredParticipants.filter(
                      (p) => (p as { rosterRole?: string }).rosterRole !== 'reserve',
                    );
                    const reserve = filteredParticipants.filter(
                      (p) => (p as { rosterRole?: string }).rosterRole === 'reserve',
                    );
                    const sections = [
                      { key: 'principal', label: 'Équipe 1', list: principal, accent: 'blue' },
                      { key: 'reserve', label: 'Réserve', list: reserve, accent: 'amber' },
                    ].filter((s) => s.list.length > 0);
                    const renderRiderRow = (p: T) => (
                      <div key={p.id} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          id={`${type}-${p.id}`}
                          checked={selectedIds.includes(p.id)}
                          onChange={() => onChange && type && onChange(p.id, type)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0"
                          aria-labelledby={`label-${type}-${p.id}`}
                        />
                        <label
                          id={`label-${type}-${p.id}`}
                          htmlFor={`${type}-${p.id}`}
                          className="ml-1 text-sm text-gray-700 shrink-0"
                        >
                          {p.name} {getParticipantDetails(p)}
                        </label>
                      </div>
                    );
                    if (sections.length <= 1) {
                      return filteredParticipants.map(renderRiderRow);
                    }
                    return sections.map((section) => (
                      <div key={section.key} className="space-y-1">
                        <div
                          className={`sticky top-0 z-[1] -mx-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide rounded ${
                            section.accent === 'blue'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {section.label}
                          <span className="ml-1.5 font-semibold normal-case tracking-normal opacity-80">
                            · {section.list.length}
                          </span>
                        </div>
                        {section.list.map(renderRiderRow)}
                      </div>
                    ));
                  })()
                : filteredParticipants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="checkbox"
                    id={`${type}-${p.id}`}
                    checked={selectedIds.includes(p.id)}
                    onChange={() => onChange && type && onChange(p.id, type)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0"
                    aria-labelledby={`label-${type}-${p.id}`}
                  />
                  <label id={`label-${type}-${p.id}`} htmlFor={`${type}-${p.id}`} className="ml-1 text-sm text-gray-700 shrink-0">
                    {p.name} {type === 'staff' ? getParticipantDetails(p, isEditing ? staffRoleInEvent[p.id] : getStaffRoleKeyInEvent(event, p.id)) : getParticipantDetails(p)}
                  </label>
                  {type === 'staff' && isEditing && selectedIds.includes(p.id) && (
                    <select
                      value={staffRoleInEvent[p.id] || 'assistantId'}
                      onChange={e => handleStaffRoleChange(p.id, e.target.value as StaffRoleKey)}
                      className="ml-auto text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-0 max-w-[160px]"
                      title="Rôle pour cet événement"
                    >
                      {allRoleOptions.map(ro => (
                        <option key={ro.key} value={ro.key}>{ro.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <ul className="list-none space-y-2 pl-0">
            {type === 'riders' ? (
              (() => {
                const principal = selectedParticipants.filter(
                  (p) => (p as { rosterRole?: string }).rosterRole !== 'reserve',
                );
                const reserve = selectedParticipants.filter(
                  (p) => (p as { rosterRole?: string }).rosterRole === 'reserve',
                );
                return (
                  <>
                    {principal.length > 0 && (
                      <li>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 mb-1">
                          Équipe 1 · {principal.length}
                        </p>
                        <ul className="list-disc list-inside pl-1 space-y-0.5">
                          {principal.map((participant) => (
                            <li key={participant.id} className="text-sm text-gray-700">
                              {participant.name} {getParticipantDetails(participant)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                    {reserve.length > 0 && (
                      <li>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 mb-1">
                          Réserve · {reserve.length}
                        </p>
                        <ul className="list-disc list-inside pl-1 space-y-0.5">
                          {reserve.map((participant) => (
                            <li key={participant.id} className="text-sm text-gray-700">
                              {participant.name} {getParticipantDetails(participant)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                  </>
                );
              })()
            ) : (
              selectedParticipants.map((participant) => (
                <li key={participant.id} className="text-sm text-gray-700 list-disc list-inside">
                  {participant.name} {getParticipantDetails(participant)}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    );
  }

  const ridersWithNames = [...appState.riders]
    .sort((a, b) => {
      const aRole = a.rosterRole === 'reserve' ? 1 : 0;
      const bRole = b.rosterRole === 'reserve' ? 1 : 0;
      if (aRole !== bRole) return aRole - bRole;
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr');
    })
    .map((r) => ({ ...r, name: `${r.firstName} ${r.lastName}` }));
  const staffWithNames = appState.staff.map(s => ({ ...s, name: `${s.firstName} ${s.lastName}` }));

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-gray-700">Participants à l'Événement</h3>
        <div className="flex gap-2 flex-wrap">
          {!readOnly && setMissions && appState.activeTeamId && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => setIsVacataireModalOpen(true)}
            >
              Ouvrir au vacataire
            </ActionButton>
          )}
          {!readOnly && activeTeam && selectedRiderIds.length > 0 && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => {
                const riders = appState.riders.filter((r) => selectedRiderIds.includes(r.id));
                const staff = appState.staff.filter((s) => selectedStaffIds.includes(s.id));
                exportUciStartListPdf(
                  activeTeam,
                  event,
                  riders,
                  staff,
                  riderEventSelections
                );
              }}
            >
              {t('exportUciStartList')}
            </ActionButton>
          )}
        {!readOnly && !isEditing && (
          <ActionButton onClick={() => setIsEditing(true)} variant="primary">
            Modifier les Participants
          </ActionButton>
        )}
        </div>
      </div>

      {feedback && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {feedback}
        </p>
      )}

      {openVacataireMissions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium mb-1">
            Offres vacataires ouvertes ({openVacataireMissions.length})
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {openVacataireMissions.map((m) => (
              <li key={m.id}>
                {getStaffRoleDisplayLabel(m.role)}
                {m.compensation ? ` · ${m.compensation}` : ''}
                {' · '}
                {m.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderParticipantList('Coureurs Sélectionnés', ridersWithNames, selectedRiderIds, handleSelectionChange, 'riders', {
          filterText: filterRiderText,
          setFilterText: setFilterRiderText,
        })}
        {renderParticipantList('Staff Participant', staffWithNames, selectedStaffIds, handleSelectionChange, 'staff', {
          filterText: filterStaffText,
          setFilterText: setFilterStaffText,
          filterRoleKey: filterStaffRoleKey,
          setFilterRoleKey: setFilterStaffRoleKey,
        })}
        {renderParticipantList('Véhicules Sélectionnés', appState.vehicles, selectedVehicleIds, handleSelectionChange, 'vehicles', {
          filterText: filterVehicleText,
          setFilterText: setFilterVehicleText,
        })}
      </div>

      {isEditing && (
        <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
          <ActionButton type="button" variant="secondary" onClick={handleCancel}>Annuler</ActionButton>
          <ActionButton type="button" onClick={handleSave}>Sauvegarder Participants</ActionButton>
        </div>
      )}

      <Modal
        isOpen={isVacataireModalOpen}
        onClose={() => setIsVacataireModalOpen(false)}
        title="Ouvrir au vacataire"
      >
        <div className="space-y-4 text-slate-200">
          <p className="text-sm text-slate-300">
            Publie une offre d&apos;emploi liée à <strong className="text-white">{event.name}</strong>.
            Une fois la candidature acceptée, le vacataire apparaît dans le planning et le coût
            (budget / facturation vacataire) est généré automatiquement.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Poste recherché
            </label>
            <select
              value={vacataireRole}
              onChange={(e) => setVacataireRole(e.target.value as StaffRole)}
              className="w-full rounded-md border border-slate-600 bg-slate-800 text-white text-sm px-3 py-2"
            >
              {VACATAIRE_MISSION_ROLES.map((role) => (
                <option key={role} value={role}>
                  {getStaffRoleDisplayLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tarif journalier (€) — optionnel
            </label>
            <input
              type="number"
              min={0}
              step={10}
              value={vacataireDailyRate}
              onChange={(e) => setVacataireDailyRate(e.target.value)}
              placeholder="ex. 150"
              className="w-full rounded-md border border-slate-600 bg-slate-800 text-white text-sm px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Précisions pour l&apos;offre — optionnel
            </label>
            <textarea
              value={vacataireNotes}
              onChange={(e) => setVacataireNotes(e.target.value)}
              rows={3}
              placeholder="Horaires, matériel requis, hébergement…"
              className="w-full rounded-md border border-slate-600 bg-slate-800 text-white text-sm px-3 py-2"
            />
          </div>
          <p className="text-xs text-slate-400">
            Dates : {event.date}
            {event.endDate && event.endDate !== event.date ? ` → ${event.endDate}` : ''}
            {event.location ? ` · ${event.location}` : ''}
            {' · '}Statut offre : {MissionStatus.OPEN}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsVacataireModalOpen(false)}
            >
              Annuler
            </ActionButton>
            <ActionButton type="button" size="sm" onClick={handlePublishVacataireMission}>
              Publier l&apos;offre
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventParticipantsTab;
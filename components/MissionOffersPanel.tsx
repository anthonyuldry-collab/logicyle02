import React, { useMemo, useState } from 'react';
import {
  Mission,
  MissionApplication,
  MissionApplicationStatus,
  MissionCompensationType,
  MissionStatus,
  StaffMember,
  StaffRole,
} from '../types';
import ActionButton from './ActionButton';
import Modal from './Modal';
import RatingStars from './RatingStars';
import {
  buildDemoMissionsForTeam,
  countMissionApplications,
  DEMO_MISSION_WITH_PIPELINE_ID,
  getMissionApplications,
  isDemoMission,
  resolveVacataireIdForApplicant,
} from '../constants/demoMissions';
import {
  buildDemoVacataires,
  getDemoVacataireProfile,
  getDemoVacataireRating,
} from '../constants/demoVacataires';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';

interface MissionOffersPanelProps {
  teamId: string;
  teamName: string;
  missions: Mission[];
  setMissions: (updater: React.SetStateAction<Mission[]>) => void;
  canEdit: boolean;
  /** Événements de l’équipe pour rattacher une mission week-end */
  raceEvents?: import('../types').RaceEvent[];
  /** Après acceptation : intégrer le vacataire dans le calendrier événement */
  onIntegrateAcceptedStaff?: (payload: {
    mission: Mission;
    application: MissionApplication;
    eventId: string;
  }) => void;
}

const emptyForm = {
  title: '',
  role: StaffRole.ASSISTANT as StaffRole,
  startDate: '',
  endDate: '',
  location: '',
  description: '',
  requirements: '',
  compensationType: MissionCompensationType.FREELANCE,
  compensation: '',
  dailyRate: '',
  eventId: '',
};

const APP_STATUS_CHIP: Record<MissionApplicationStatus, string> = {
  [MissionApplicationStatus.RECEIVED]: 'bg-gray-100 text-gray-700',
  [MissionApplicationStatus.REVIEWING]: 'bg-blue-100 text-blue-800',
  [MissionApplicationStatus.SHORTLISTED]: 'bg-indigo-100 text-indigo-800',
  [MissionApplicationStatus.INTERVIEW]: 'bg-amber-100 text-amber-900',
  [MissionApplicationStatus.ACCEPTED]: 'bg-emerald-100 text-emerald-800',
  [MissionApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
  [MissionApplicationStatus.WITHDRAWN]: 'bg-slate-100 text-slate-500',
};

const PIPELINE_ORDER: MissionApplicationStatus[] = [
  MissionApplicationStatus.RECEIVED,
  MissionApplicationStatus.REVIEWING,
  MissionApplicationStatus.SHORTLISTED,
  MissionApplicationStatus.INTERVIEW,
  MissionApplicationStatus.ACCEPTED,
  MissionApplicationStatus.REJECTED,
];

const ADVANCE_ORDER: MissionApplicationStatus[] = [
  MissionApplicationStatus.RECEIVED,
  MissionApplicationStatus.REVIEWING,
  MissionApplicationStatus.SHORTLISTED,
  MissionApplicationStatus.INTERVIEW,
  MissionApplicationStatus.ACCEPTED,
];

function nextPipelineStatus(
  current: MissionApplicationStatus
): MissionApplicationStatus | null {
  const idx = ADVANCE_ORDER.indexOf(current);
  if (idx < 0 || idx >= ADVANCE_ORDER.length - 1) return null;
  return ADVANCE_ORDER[idx + 1];
}

const MissionOffersPanel: React.FC<MissionOffersPanelProps> = ({
  teamId,
  teamName,
  missions,
  setMissions,
  canEdit,
  raceEvents = [],
  onIntegrateAcceptedStaff,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [trackingMissionId, setTrackingMissionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [profileApp, setProfileApp] = useState<MissionApplication | null>(null);

  const demoVacatairesById = useMemo(() => {
    const map = new Map<string, StaffMember>();
    for (const v of buildDemoVacataires()) map.set(v.id, v);
    return map;
  }, []);

  const resolveStaffProfile = (app: MissionApplication): StaffMember | undefined => {
    const vacId = resolveVacataireIdForApplicant(app.userId, app.email);
    if (vacId) return demoVacatairesById.get(vacId);
    const byEmail = [...demoVacatairesById.values()].find(
      (v) => v.email.toLowerCase() === app.email.toLowerCase()
    );
    return byEmail;
  };

  const teamMissions = useMemo(() => {
    const demos = buildDemoMissionsForTeam(teamId).map((m) => ({
      ...m,
      teamId,
    }));
    const real = (missions || []).filter((m) => m.teamId === teamId || !m.teamId);
    const byId = new Map<string, Mission>();
    for (const m of demos) byId.set(m.id, m);
    for (const m of real) {
      const prev = byId.get(m.id);
      byId.set(m.id, {
        ...prev,
        ...m,
        teamId: m.teamId || teamId,
        applications: m.applications?.length ? m.applications : prev?.applications,
        applicants: m.applicants?.length ? m.applicants : prev?.applicants,
      });
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.id === DEMO_MISSION_WITH_PIPELINE_ID) return -1;
      if (b.id === DEMO_MISSION_WITH_PIPELINE_ID) return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [missions, teamId]);

  const trackingMission = useMemo(
    () => (trackingMissionId ? teamMissions.find((m) => m.id === trackingMissionId) || null : null),
    [teamMissions, trackingMissionId]
  );

  const openCount = teamMissions.filter((m) => m.status === MissionStatus.OPEN).length;

  const persistMission = (mission: Mission) => {
    setMissions((prev) => {
      const list = prev || [];
      const exists = list.some((m) => m.id === mission.id);
      if (exists) return list.map((m) => (m.id === mission.id ? mission : m));
      return [...list, mission];
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      alert('Titre et dates sont obligatoires.');
      return;
    }
    const dailyRate = form.dailyRate ? Number(form.dailyRate) : undefined;
    const requirements = form.requirements
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const mission: Mission = {
      id: `mission_${Date.now().toString(36)}`,
      teamId,
      title: form.title.trim(),
      role: form.role,
      startDate: form.startDate,
      endDate: form.endDate,
      location: form.location.trim() || teamName,
      description: form.description.trim(),
      requirements,
      compensationType: form.compensationType,
      compensation:
        form.compensation.trim() ||
        (dailyRate ? `${dailyRate} € / jour` : 'À négocier'),
      dailyRate,
      status: MissionStatus.OPEN,
      eventId: form.eventId || undefined,
      applicants: [],
      applications: [],
    };
    setMissions((prev) => [...(prev || []), mission]);
    setForm(emptyForm);
    setShowForm(false);
  };

  const updateStatus = (mission: Mission, status: MissionStatus) => {
    persistMission({ ...mission, status });
  };

  const updateApplicationStatus = (
    mission: Mission,
    applicationId: string,
    status: MissionApplicationStatus
  ) => {
    const applications = getMissionApplications(mission).map((a) =>
      a.id === applicationId ? { ...a, status } : a
    );
    let nextStatus = mission.status;
    const accepted = applications.find((a) => a.id === applicationId);
    if (status === MissionApplicationStatus.ACCEPTED && accepted) {
      nextStatus = MissionStatus.FILLED;
      for (let i = 0; i < applications.length; i++) {
        if (
          applications[i].id !== applicationId &&
          applications[i].status !== MissionApplicationStatus.REJECTED &&
          applications[i].status !== MissionApplicationStatus.WITHDRAWN &&
          applications[i].status !== MissionApplicationStatus.ACCEPTED
        ) {
          applications[i] = {
            ...applications[i],
            status: MissionApplicationStatus.REJECTED,
            internalNote:
              applications[i].internalNote ||
              `Non retenu — poste pourvu par ${accepted.firstName} ${accepted.lastName}`,
          };
        }
      }
      setActionFeedback(
        `${accepted.firstName} ${accepted.lastName} accepté(e) — offre passée en Pourvu.`
      );
    } else if (status === MissionApplicationStatus.REJECTED) {
      setActionFeedback('Candidature refusée.');
    } else {
      setActionFeedback(`Statut mis à jour : ${status}`);
    }
    persistMission({
      ...mission,
      applications,
      applicants: applications.map((a) => a.userId),
      status: nextStatus,
    });
    if (
      status === MissionApplicationStatus.ACCEPTED &&
      accepted &&
      mission.eventId &&
      onIntegrateAcceptedStaff
    ) {
      onIntegrateAcceptedStaff({
        mission: { ...mission, applications, status: nextStatus },
        application: { ...accepted, status: MissionApplicationStatus.ACCEPTED },
        eventId: mission.eventId,
      });
    }
  };

  const advanceApplicant = (mission: Mission, appId: string, current: MissionApplicationStatus) => {
    const next = nextPipelineStatus(current);
    if (!next) return;
    updateApplicationStatus(mission, appId, next);
  };

  const statusChip = (status: MissionStatus) => {
    if (status === MissionStatus.OPEN) return 'bg-emerald-100 text-emerald-800';
    if (status === MissionStatus.FILLED) return 'bg-blue-100 text-blue-800';
    if (status === MissionStatus.CLOSED) return 'bg-gray-100 text-gray-700';
    return 'bg-amber-100 text-amber-800';
  };

  const applications = trackingMission ? getMissionApplications(trackingMission) : [];
  const pipelineCounts = PIPELINE_ORDER.map((status) => ({
    status,
    count: applications.filter((a) => a.status === status).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Offres d&apos;emploi & vacations</h4>
          <p className="text-sm text-gray-500 mt-0.5">
            Publiez des missions et suivez les candidatures.{' '}
            {openCount > 0
              ? `· ${openCount} offre${openCount > 1 ? 's' : ''} ouverte${openCount > 1 ? 's' : ''}`
              : ''}
          </p>
          <p className="text-xs text-indigo-700 mt-1">
            Astuce : ouvrez « Assistant(e) — Classic Lorient » → <strong>Suivi candidatures</strong> pour
            tester le pipeline (5 candidats fictifs).
          </p>
        </div>
        {canEdit && (
          <ActionButton onClick={() => setShowForm((v) => !v)} size="sm">
            {showForm ? 'Annuler' : 'Créer une offre'}
          </ActionButton>
        )}
      </div>

      {showForm && canEdit && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3"
        >
          <h5 className="font-semibold text-indigo-950">Nouvelle vacation / offre</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Titre *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Assistant(e) — Classic Lorient"
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              >
                {Object.values(StaffRole).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Lieu</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Ville / parcours"
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Début *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Fin *</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">
                Événement équipe (optionnel)
              </label>
              <select
                value={form.eventId}
                onChange={(e) => {
                  const eventId = e.target.value;
                  const ev = raceEvents.find((r) => r.id === eventId);
                  setForm((f) => ({
                    ...f,
                    eventId,
                    ...(ev
                      ? {
                          startDate: f.startDate || ev.date,
                          endDate: f.endDate || ev.endDate || ev.date,
                          location: f.location || ev.location || '',
                          title: f.title || `${getStaffRoleDisplayLabel(f.role)} — ${ev.name}`,
                        }
                      : {}),
                  }));
                }}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">— Aucun (dates mission seules) —</option>
                {[...raceEvents]
                  .filter((e) => e.name?.trim())
                  .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                  .map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.date} — {ev.name}
                      {ev.location ? ` (${ev.location})` : ''}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Si renseigné : à l&apos;acceptation, le vacataire est intégré au calendrier de
                l&apos;événement (week-end).
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Type de rémunération</label>
              <select
                value={form.compensationType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    compensationType: e.target.value as MissionCompensationType,
                  }))
                }
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              >
                {Object.values(MissionCompensationType).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Tarif jour (€)</label>
              <input
                type="number"
                min={0}
                value={form.dailyRate}
                onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Compensation (libellé)</label>
              <input
                value={form.compensation}
                onChange={(e) => setForm((f) => ({ ...f, compensation: e.target.value }))}
                placeholder="Ex: 150 € / jour + logement"
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">
                Prérequis (un par ligne)
              </label>
              <textarea
                rows={2}
                value={form.requirements}
                onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                placeholder={'Permis B\nExpérience UCI'}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <ActionButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Annuler
            </ActionButton>
            <ActionButton type="submit">Publier l&apos;offre</ActionButton>
          </div>
        </form>
      )}

      {teamMissions.length === 0 ? (
        <p className="text-center text-gray-500 italic py-10">
          Aucune offre pour le moment. Créez une vacation pour recruter un vacataire.
        </p>
      ) : (
        <div className="space-y-3">
          {teamMissions.map((mission) => {
            const appCount = countMissionApplications(mission);
            const isPipelineDemo = mission.id === DEMO_MISSION_WITH_PIPELINE_ID;
            return (
              <div
                key={mission.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isPipelineDemo ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="font-semibold text-gray-900">{mission.title}</h5>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusChip(mission.status)}`}
                      >
                        {mission.status}
                      </span>
                      {isDemoMission(mission.id) && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          Exemple
                        </span>
                      )}
                      {isPipelineDemo && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Suivi candidatures
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {getStaffRoleDisplayLabel(mission.role)} · {mission.location}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Du {new Date(mission.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} au{' '}
                      {new Date(mission.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}
                      {' · '}
                      {mission.compensation}
                    </p>
                    {mission.description && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{mission.description}</p>
                    )}
                    {appCount > 0 && (
                      <p className="mt-1 text-xs font-medium text-indigo-700">
                        {appCount} candidature{appCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ActionButton
                      size="sm"
                      onClick={() => {
                        setActionFeedback(null);
                        setTrackingMissionId(mission.id);
                      }}
                    >
                      {appCount > 0 ? `Candidatures (${appCount})` : 'Candidatures'}
                    </ActionButton>
                    {canEdit && mission.status === MissionStatus.OPEN && (
                      <>
                        <ActionButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setActionFeedback(null);
                            setTrackingMissionId(mission.id);
                          }}
                        >
                          Pourvoir
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="secondary"
                          onClick={() => updateStatus(mission, MissionStatus.CLOSED)}
                        >
                          Clôturer
                        </ActionButton>
                      </>
                    )}
                    {canEdit && mission.status !== MissionStatus.OPEN && (
                      <ActionButton
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus(mission, MissionStatus.OPEN)}
                      >
                        Rouvrir
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {trackingMission && (
        <Modal
          isOpen={!!trackingMission}
          onClose={() => {
            setTrackingMissionId(null);
            setActionFeedback(null);
          }}
          title={`Suivi — ${trackingMission.title}`}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-0.5 text-xs sm:text-sm">
                <li>
                  <strong>Reçue</strong> → examiner le profil
                </li>
                <li>
                  <strong>En examen</strong> → présélectionner les meilleurs
                </li>
                <li>
                  <strong>Présélection</strong> → planifier un entretien
                </li>
                <li>
                  <strong>Entretien</strong> → <strong>Accepter</strong> (offre = Pourvu) ou Refuser
                </li>
              </ol>
            </div>

            {trackingMission.status === MissionStatus.FILLED && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                Offre pourvue
                {applications.find((a) => a.status === MissionApplicationStatus.ACCEPTED)
                  ? ` — ${applications.find((a) => a.status === MissionApplicationStatus.ACCEPTED)!.firstName} ${applications.find((a) => a.status === MissionApplicationStatus.ACCEPTED)!.lastName}`
                  : ''}
              </div>
            )}

            {actionFeedback && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                {actionFeedback}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {pipelineCounts.map(({ status, count }) => (
                <div
                  key={status}
                  className={`rounded-lg px-3 py-2 text-center min-w-[88px] ${APP_STATUS_CHIP[status]}`}
                >
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] font-medium leading-tight">{status}</p>
                </div>
              ))}
            </div>

            {applications.length === 0 ? (
              <p className="text-center text-gray-500 italic py-8">
                Aucune candidature pour cette offre pour le moment.
              </p>
            ) : (
              <ul className="space-y-3">
                {[...applications]
                  .sort((a, b) => {
                    const order = [
                      MissionApplicationStatus.INTERVIEW,
                      MissionApplicationStatus.SHORTLISTED,
                      MissionApplicationStatus.REVIEWING,
                      MissionApplicationStatus.RECEIVED,
                      MissionApplicationStatus.ACCEPTED,
                      MissionApplicationStatus.REJECTED,
                      MissionApplicationStatus.WITHDRAWN,
                    ];
                    return order.indexOf(a.status) - order.indexOf(b.status);
                  })
                  .map((app) => {
                    const next = nextPipelineStatus(app.status);
                    const isTerminal =
                      app.status === MissionApplicationStatus.ACCEPTED ||
                      app.status === MissionApplicationStatus.REJECTED ||
                      app.status === MissionApplicationStatus.WITHDRAWN;
                    return (
                      <li
                        key={app.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-200 transition"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileApp(app)}
                            className="min-w-0 flex-1 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-semibold text-gray-900 group-hover:text-indigo-800">
                                {app.firstName} {app.lastName}
                              </h5>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${APP_STATUS_CHIP[app.status]}`}
                              >
                                {app.status}
                              </span>
                              <span className="text-[10px] font-medium text-indigo-600">
                                Voir le profil →
                              </span>
                            </div>
                            {/* Mini stepper */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {ADVANCE_ORDER.map((step, i) => {
                                const stepIdx = ADVANCE_ORDER.indexOf(app.status);
                                const reached =
                                  app.status === MissionApplicationStatus.REJECTED
                                    ? false
                                    : stepIdx >= i;
                                const current = app.status === step;
                                return (
                                  <span
                                    key={step}
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                                      current
                                        ? 'bg-indigo-600 text-white'
                                        : reached
                                          ? 'bg-indigo-100 text-indigo-800'
                                          : 'bg-gray-100 text-gray-400'
                                    }`}
                                  >
                                    {i + 1}. {step.replace('(e)', '')}
                                  </span>
                                );
                              })}
                            </div>
                            <p className="text-sm text-gray-500 mt-1.5">
                              {app.roleLabel || '—'}
                              {app.city ? ` · ${app.city}` : ''}
                              {app.dailyRate ? ` · ${app.dailyRate} €/j` : ''}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Candidaté le{' '}
                              {new Date(app.appliedAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            {app.message && (
                              <p className="mt-2 text-sm text-gray-700 italic">« {app.message} »</p>
                            )}
                            {app.internalNote && (
                              <p className="mt-1 text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 inline-block">
                                Note équipe : {app.internalNote}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                              {app.email && <span>{app.email}</span>}
                              {app.phone && <span>{app.phone}</span>}
                            </div>
                          </button>
                          {canEdit && !isTerminal && (
                            <div
                              className="flex flex-col gap-1.5 shrink-0 w-full sm:w-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {next && next !== MissionApplicationStatus.ACCEPTED && (
                                <ActionButton
                                  size="sm"
                                  onClick={() => advanceApplicant(trackingMission, app.id, app.status)}
                                >
                                  → {next}
                                </ActionButton>
                              )}
                              <ActionButton
                                size="sm"
                                onClick={() =>
                                  updateApplicationStatus(
                                    trackingMission,
                                    app.id,
                                    MissionApplicationStatus.ACCEPTED
                                  )
                                }
                              >
                                Accepter & pourvoir
                              </ActionButton>
                              <ActionButton
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  updateApplicationStatus(
                                    trackingMission,
                                    app.id,
                                    MissionApplicationStatus.REJECTED
                                  )
                                }
                              >
                                Refuser
                              </ActionButton>
                            </div>
                          )}
                          {canEdit && isTerminal && (
                            <div className="text-xs text-gray-500 italic shrink-0">
                              {app.status === MissionApplicationStatus.ACCEPTED
                                ? 'Candidat retenu'
                                : 'Candidature close'}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}

            <div className="flex justify-end pt-2">
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setTrackingMissionId(null);
                  setActionFeedback(null);
                }}
              >
                Fermer
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {profileApp && (() => {
        const staff = resolveStaffProfile(profileApp);
        const vacId = resolveVacataireIdForApplicant(profileApp.userId, profileApp.email);
        const profile = vacId ? getDemoVacataireProfile(vacId) : undefined;
        const rating = vacId ? getDemoVacataireRating(vacId) : { average: 0, count: 0 };
        const isTerminal =
          profileApp.status === MissionApplicationStatus.ACCEPTED ||
          profileApp.status === MissionApplicationStatus.REJECTED ||
          profileApp.status === MissionApplicationStatus.WITHDRAWN;

        return (
          <Modal
            isOpen={!!profileApp}
            onClose={() => setProfileApp(null)}
            title={`${profileApp.firstName} ${profileApp.lastName}`}
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">
                    {profileApp.roleLabel ||
                      (staff ? getStaffRoleDisplayLabel(staff.role) : 'Candidat')}{' '}
                    · Vacataire
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APP_STATUS_CHIP[profileApp.status]}`}
                    >
                      {profileApp.status}
                    </span>
                    {profileApp.city && (
                      <span className="text-sm text-gray-600">{profileApp.city}</span>
                    )}
                  </div>
                  {rating.count > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <RatingStars value={rating.average} size="md" readOnly />
                      <span className="font-bold text-amber-500">{rating.average.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">({rating.count} avis)</span>
                    </div>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-gray-900">
                    {profileApp.dailyRate
                      ? `${profileApp.dailyRate} € / jour`
                      : staff?.dailyRate
                        ? `${staff.dailyRate} € / jour`
                        : 'Tarif à négocier'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Candidaté le{' '}
                    {new Date(profileApp.appliedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {(staff?.professionalSummary ||
                staff?.defaultApplicationMessage ||
                profileApp.message) && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-1">
                    Présentation & message de candidature
                  </h5>
                  {staff?.professionalSummary && (
                    <p className="text-sm text-gray-700">{staff.professionalSummary}</p>
                  )}
                  {(profileApp.message || staff?.defaultApplicationMessage) && (
                    <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-indigo-200 pl-3">
                      Message de candidature : «{' '}
                      {profileApp.message || staff?.defaultApplicationMessage} »
                    </p>
                  )}
                </div>
              )}

              {staff && (
                <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <h5 className="text-sm font-semibold text-gray-900">Informations administratives</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                    {staff.birthDate && (
                      <p>
                        <span className="text-gray-500">Naissance :</span> {staff.birthDate}
                      </p>
                    )}
                    {staff.nationality && (
                      <p>
                        <span className="text-gray-500">Nationalité :</span> {staff.nationality}
                      </p>
                    )}
                    {(staff.address?.city || staff.address?.postalCode) && (
                      <p>
                        <span className="text-gray-500">Adresse :</span>{' '}
                        {[staff.address?.postalCode, staff.address?.city].filter(Boolean).join(' ')}
                      </p>
                    )}
                    {staff.phone && (
                      <p>
                        <span className="text-gray-500">Tél. :</span> {staff.phone}
                      </p>
                    )}
                  </div>
                  {staff.cvFileName && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm">
                      <span className="font-medium text-indigo-900 truncate">CV · {staff.cvFileName}</span>
                      {staff.cvFileBase64 && staff.cvMimeType ? (
                        <a
                          href={
                            staff.cvFileBase64.startsWith('data:')
                              ? staff.cvFileBase64
                              : `data:${staff.cvMimeType};base64,${staff.cvFileBase64}`
                          }
                          download={staff.cvFileName}
                          className="shrink-0 text-indigo-700 hover:underline"
                        >
                          Télécharger
                        </a>
                      ) : (
                        <span className="text-xs text-indigo-600">Déposé</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(staff?.skills?.length || 0) > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-1.5">Compétences</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {staff!.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-1.5">Parcours</h5>
                  {(staff?.experienceYears ?? profile?.experienceYears) != null && (
                    <p className="text-sm text-gray-700">
                      {staff?.experienceYears ?? profile?.experienceYears} ans d&apos;expérience
                    </p>
                  )}
                  {(staff?.certifications?.length || profile?.certifications.length) ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(staff?.certifications?.length
                        ? staff.certifications
                        : profile?.certifications || []
                      ).map((c) => (
                        <span
                          key={c}
                          className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(staff?.workHistory?.length || 0) > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {staff!.workHistory!.slice(0, 3).map((exp) => (
                        <li key={exp.id} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-800">{exp.position}</span>
                          {exp.company ? ` · ${exp.company}` : ''}
                          {(exp.startDate || exp.endDate) && (
                            <span className="text-gray-400">
                              {' '}
                              ({[exp.startDate, exp.endDate].filter(Boolean).join(' → ')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(staff?.languages?.length || profile?.languages?.length) && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-1.5">Langues</h5>
                  <ul className="text-sm text-gray-700 space-y-0.5">
                    {(staff?.languages || []).map((l) => (
                      <li key={l.id}>
                        {l.language} — {l.proficiency}
                      </li>
                    ))}
                    {!staff?.languages?.length &&
                      profile?.languages.map((l, i) => (
                        <li key={`${l.language}_${i}`}>
                          {l.language} — {l.proficiency}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {profileApp.internalNote && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
                  <strong>Note équipe :</strong> {profileApp.internalNote}
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Contact</h5>
                <div className="space-y-1 text-sm">
                  {profileApp.phone && <p>Tél. {profileApp.phone}</p>}
                  {profileApp.email && (
                    <p>
                      <a
                        href={`mailto:${profileApp.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {profileApp.email}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {profile && profile.reviews.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">
                    Avis récents ({profile.reviews.length})
                  </h5>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {profile.reviews.map((r) => (
                      <li key={r.id} className="rounded-lg border border-gray-100 bg-white p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{r.teamName}</p>
                          <RatingStars value={r.rating} size="sm" readOnly />
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{r.comment}</p>
                        {r.eventName && (
                          <p className="mt-0.5 text-[11px] text-gray-400">{r.eventName}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <ActionButton variant="secondary" onClick={() => setProfileApp(null)}>
                  Fermer
                </ActionButton>
                {profileApp.email && (
                  <ActionButton
                    variant="secondary"
                    onClick={() => {
                      window.location.href = `mailto:${profileApp.email}?subject=${encodeURIComponent(
                        `Candidature — ${trackingMission?.title || 'Mission'}`
                      )}`;
                    }}
                  >
                    Envoyer un e-mail
                  </ActionButton>
                )}
                {canEdit && trackingMission && !isTerminal && (
                  <ActionButton
                    onClick={() => {
                      updateApplicationStatus(
                        trackingMission,
                        profileApp.id,
                        MissionApplicationStatus.ACCEPTED
                      );
                      setProfileApp(null);
                    }}
                  >
                    Accepter & pourvoir
                  </ActionButton>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default MissionOffersPanel;

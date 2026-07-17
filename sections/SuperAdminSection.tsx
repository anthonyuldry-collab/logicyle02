import React, { useMemo, useState } from 'react';
import {
  Rider,
  StaffMember,
  Team,
  User,
  UserRole,
  SubscriptionPlanId,
  TeamSubscription,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  TrashIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BuildingOffice2Icon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { deleteData } from '../services/firebaseService';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';
import { isSuperAdminUser } from '../utils/superAdminUtils';
import { getPlanById } from '../constants/subscriptionPlans';
import { isIndependentUser } from '../utils/independentUtils';

interface SuperAdminSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  onDeleteRider: (rider: Rider) => void;
  onDeleteStaff: (staff: StaffMember) => void;
  onDeleteTeam?: (teamId: string) => Promise<void> | void;
  appState: {
    activeTeamId?: string | null;
    teams?: Team[];
    users?: User[];
  };
}

const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  trialing: 'Essai',
  pilot: 'Pilote',
  past_due: 'Impayé',
  canceled: 'Annulé',
};

function formatPlanLabel(planId?: SubscriptionPlanId): string {
  if (!planId) return '—';
  try {
    return getPlanById(planId).name.fr;
  } catch {
    return String(planId);
  }
}

function formatSubscription(sub?: TeamSubscription): { plan: string; status: string; detail: string } {
  if (!sub?.planId) {
    return { plan: 'Sans abonnement', status: '—', detail: '' };
  }
  const status = SUB_STATUS_LABEL[sub.status] || sub.status;
  const interval = sub.billingInterval === 'month' ? 'mensuel' : sub.billingInterval === 'year' ? 'annuel' : '';
  const end =
    sub.currentPeriodEnd
      ? `fin ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}`
      : sub.pilotEndsAt
        ? `pilote jusqu’au ${new Date(sub.pilotEndsAt).toLocaleDateString('fr-FR')}`
        : sub.trialEndsAt
          ? `essai jusqu’au ${new Date(sub.trialEndsAt).toLocaleDateString('fr-FR')}`
          : '';
  return {
    plan: formatPlanLabel(sub.planId),
    status,
    detail: [interval, end].filter(Boolean).join(' · '),
  };
}

function hasTeamSubscription(team: Team): boolean {
  return Boolean(team.subscription?.planId);
}

const SuperAdminSection: React.FC<SuperAdminSectionProps> = ({
  riders,
  staff,
  currentUser,
  onDeleteRider,
  onDeleteStaff,
  onDeleteTeam,
  appState,
}) => {
  const [selectedRiders, setSelectedRiders] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'riders' | 'staff' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [staffIndOpen, setStaffIndOpen] = useState(true);
  const [athletesIndOpen, setAthletesIndOpen] = useState(true);
  const [onlySubscribedTeams, setOnlySubscribedTeams] = useState(false);
  const [indepSearch, setIndepSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const isSuperAdmin = isSuperAdminUser(currentUser);
  const teams = appState.teams || [];
  const users = appState.users || [];

  const subscribedTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    const list = teams.filter((t) => (onlySubscribedTeams ? hasTeamSubscription(t) : true));
    const filtered = q
      ? list.filter(
          (t) =>
            (t.name || '').toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            (t.level || '').toLowerCase().includes(q)
        )
      : list;
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
  }, [teams, onlySubscribedTeams, teamSearch]);

  const cleanupTeams = useMemo(() => {
    const byId = teams.find((t) => t.id === 'YrqeJQsUmZ8qphjBZDxS');
    const byName = teams.filter((t) =>
      /ac\s*lanester\s*56\s*u19/i.test(t.name || '')
    );
    const map = new Map<string, Team>();
    byName.forEach((t) => map.set(t.id, t));
    if (byId) map.set(byId.id, byId);
    return Array.from(map.values());
  }, [teams]);

  const independentUsers = useMemo(
    () => users.filter((u) => isIndependentUser(u)),
    [users],
  );

  const independentStaffClean = useMemo(() => {
    const q = indepSearch.trim().toLowerCase();
    return independentUsers
      .filter((u) => u.userRole === UserRole.STAFF)
      .filter((u) => {
        if (!q) return true;
        const role = getStaffRoleDisplayLabel(u.staffRole).toLowerCase();
        return (
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          role.includes(q)
        );
      })
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'));
  }, [independentUsers, indepSearch]);

  const independentAthletes = useMemo(() => {
    const q = indepSearch.trim().toLowerCase();
    return independentUsers
      .filter((u) => u.userRole === UserRole.COUREUR)
      .filter((u) => {
        if (!q) return true;
        return (
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'));
  }, [independentUsers, indepSearch]);

  const duplicateRiders = useMemo(() => {
    const emailGroups = new Map<string, Rider[]>();
    riders.forEach((rider) => {
      if (!rider.email) return;
      if (!emailGroups.has(rider.email)) emailGroups.set(rider.email, []);
      emailGroups.get(rider.email)!.push(rider);
    });
    return Array.from(emailGroups.entries())
      .filter(([, profiles]) => profiles.length > 1)
      .map(([email, profiles]) => ({ email, profiles }));
  }, [riders]);

  const duplicateStaff = useMemo(() => {
    const emailGroups = new Map<string, StaffMember[]>();
    staff.forEach((member) => {
      if (!member.email) return;
      if (!emailGroups.has(member.email)) emailGroups.set(member.email, []);
      emailGroups.get(member.email)!.push(member);
    });
    return Array.from(emailGroups.entries())
      .filter(([, profiles]) => profiles.length > 1)
      .map(([email, profiles]) => ({ email, profiles }));
  }, [staff]);

  const filteredRiders = riders.filter(
    (rider) =>
      `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredStaff = staff.filter(
    (member) =>
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isSuperAdmin) {
    return (
      <SectionWrapper title="Super Administrateur">
        <div className="text-center p-8 bg-red-950/40 rounded-lg border border-red-800">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-200 mb-2">Accès refusé</h3>
          <p className="text-red-300/90">
            Réservé au compte plateforme. Aucune équipe ni nouveau compte ne peut obtenir cet accès.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  const handleSelectRider = (riderId: string) => {
    setSelectedRiders((prev) => {
      const next = new Set(prev);
      if (next.has(riderId)) next.delete(riderId);
      else next.add(riderId);
      return next;
    });
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!appState.activeTeamId) {
      alert('Aucun teamId actif. Impossible de supprimer.');
      return;
    }
    try {
      if (deleteType === 'riders') {
        for (const riderId of selectedRiders) {
          const rider = riders.find((r) => r.id === riderId);
          if (rider) {
            await deleteData(appState.activeTeamId, 'riders', riderId);
            onDeleteRider(rider);
          }
        }
        setSelectedRiders(new Set());
      } else if (deleteType === 'staff') {
        for (const staffId of selectedStaff) {
          const member = staff.find((s) => s.id === staffId);
          if (member) {
            await deleteData(appState.activeTeamId, 'staff', staffId);
            onDeleteStaff(member);
          }
        }
        setSelectedStaff(new Set());
      }
    } catch (error) {
      console.error('Erreur suppression Super Admin:', error);
      alert('Erreur lors de la suppression.');
    }
    setShowDeleteModal(false);
    setDeleteType(null);
  };

  const teamsWithSubCount = teams.filter(hasTeamSubscription).length;

  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete || !onDeleteTeam) return;
    const team = teamToDelete;
    setTeamToDelete(null);
    setDeletingTeamId(team.id);
    try {
      await onDeleteTeam(team.id);
    } catch (error) {
      console.error('Erreur suppression équipe:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la suppression de l’équipe.');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleCleanupTeams = async () => {
    if (!onDeleteTeam || cleanupTeams.length === 0) return;
    const names = cleanupTeams.map((t) => t.name || t.id).join(', ');
    if (!window.confirm(`Supprimer définitivement ${cleanupTeams.length} équipe(s) ?\n${names}`)) {
      return;
    }
    setCleanupBusy(true);
    try {
      for (const team of cleanupTeams) {
        setDeletingTeamId(team.id);
        await onDeleteTeam(team.id);
      }
    } catch (error) {
      console.error('Erreur nettoyage équipes:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors du nettoyage.');
    } finally {
      setDeletingTeamId(null);
      setCleanupBusy(false);
    }
  };

  return (
    <SectionWrapper title="Super Administrateur — Pilotage plateforme">
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Accès unique à ton compte. Aucune équipe ni nouvel utilisateur ne peut être promu Super Admin.
        </div>

        {cleanupTeams.length > 0 && onDeleteTeam && (
          <div className="rounded-lg border border-rose-700/50 bg-rose-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-rose-100">
              <p className="font-semibold">Nettoyage demandé</p>
              <p className="text-rose-200/80 text-xs mt-1">
                {cleanupTeams.map((t) => `${t.name || 'Sans nom'} (${t.id})`).join(' · ')}
              </p>
            </div>
            <ActionButton
              onClick={handleCleanupTeams}
              disabled={cleanupBusy}
              variant="danger"
            >
              {cleanupBusy ? 'Suppression…' : `Supprimer ${cleanupTeams.length} équipe(s)`}
            </ActionButton>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-600 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Équipes (total)</p>
            <p className="text-2xl font-semibold text-slate-100 mt-1">{teams.length}</p>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Avec abonnement</p>
            <p className="text-2xl font-semibold text-emerald-300 mt-1">{teamsWithSubCount}</p>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Staff indépendants</p>
            <p className="text-2xl font-semibold text-sky-300 mt-1">{independentStaffClean.length}</p>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Athlètes indépendants</p>
            <p className="text-2xl font-semibold text-violet-300 mt-1">{independentAthletes.length}</p>
          </div>
        </div>

        {/* Équipes + abonnements */}
        <section className="rounded-lg border border-slate-600 bg-slate-900/50 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/60"
            onClick={() => setTeamsOpen((v) => !v)}
          >
            {teamsOpen ? <ChevronDownIcon className="w-5 h-5 text-slate-400" /> : <ChevronRightIcon className="w-5 h-5 text-slate-400" />}
            <BuildingOffice2Icon className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-slate-100">Équipes & abonnements</span>
            <span className="ml-auto text-xs text-slate-400">{subscribedTeams.length} affichée(s)</span>
          </button>
          {teamsOpen && (
            <div className="border-t border-slate-700 px-4 py-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlySubscribedTeams}
                    onChange={(e) => setOnlySubscribedTeams(e.target.checked)}
                    className="rounded border-slate-500"
                  />
                  Afficher uniquement les équipes avec un abonnement
                </label>
                <input
                  type="search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Filtrer équipe (nom ou id)…"
                  className="input-field-sm flex-1"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                      <th className="py-2 pr-3">Équipe</th>
                      <th className="py-2 pr-3">Id</th>
                      <th className="py-2 pr-3">Niveau</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Statut</th>
                      <th className="py-2 pr-3">Détail</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribedTeams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          Aucune équipe à afficher.
                        </td>
                      </tr>
                    ) : (
                      subscribedTeams.map((team) => {
                        const sub = formatSubscription(team.subscription);
                        const isCleanupTarget = cleanupTeams.some((t) => t.id === team.id);
                        return (
                          <tr
                            key={team.id}
                            className={`border-b border-slate-800/80 text-slate-200 ${
                              isCleanupTarget ? 'bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="py-2.5 pr-3 font-medium">{team.name || team.id}</td>
                            <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">{team.id}</td>
                            <td className="py-2.5 pr-3 text-slate-400">{team.level || '—'}</td>
                            <td className="py-2.5 pr-3">
                              <span className="inline-flex rounded-md bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-emerald-200 text-xs font-medium">
                                {sub.plan}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-300">{sub.status}</td>
                            <td className="py-2.5 pr-3 text-slate-400 text-xs">{sub.detail || '—'}</td>
                            <td className="py-2.5 text-right">
                              {onDeleteTeam && (
                                <button
                                  type="button"
                                  disabled={deletingTeamId === team.id}
                                  onClick={() => setTeamToDelete(team)}
                                  className="text-xs font-medium text-rose-300 hover:text-rose-200 disabled:opacity-50"
                                >
                                  {deletingTeamId === team.id ? '…' : 'Supprimer'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="search"
            value={indepSearch}
            onChange={(e) => setIndepSearch(e.target.value)}
            placeholder="Filtrer indépendants (nom, email, fonction)…"
            className="input-field-sm flex-1"
          />
        </div>

        {/* Staff indépendants */}
        <section className="rounded-lg border border-slate-600 bg-slate-900/50 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/60"
            onClick={() => setStaffIndOpen((v) => !v)}
          >
            {staffIndOpen ? <ChevronDownIcon className="w-5 h-5 text-slate-400" /> : <ChevronRightIcon className="w-5 h-5 text-slate-400" />}
            <UserGroupIcon className="w-5 h-5 text-sky-400" />
            <span className="font-semibold text-slate-100">Staff indépendants</span>
            <span className="ml-auto text-xs text-slate-400">{independentStaffClean.length}</span>
          </button>
          {staffIndOpen && (
            <div className="border-t border-slate-700 px-4 py-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                    <th className="py-2 pr-3">Nom</th>
                    <th className="py-2 pr-3">Fonction</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Visibilité</th>
                    <th className="py-2">Abonnement</th>
                  </tr>
                </thead>
                <tbody>
                  {independentStaffClean.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Aucun staff indépendant.
                      </td>
                    </tr>
                  ) : (
                    independentStaffClean.map((u) => {
                      const sub = formatSubscription(u.subscription);
                      return (
                        <tr key={u.id} className="border-b border-slate-800/80 text-slate-200">
                          <td className="py-2.5 pr-3 font-medium">
                            {u.firstName} {u.lastName}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className="inline-flex rounded-md bg-sky-950/50 border border-sky-800/50 px-2 py-0.5 text-sky-200 text-xs">
                              {getStaffRoleDisplayLabel(u.staffRole) || 'Non renseignée'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-400 text-xs">{u.email}</td>
                          <td className="py-2.5 pr-3 text-xs text-slate-400">
                            {u.openToExternalMissions ? 'Ouvert missions' : 'Fermé'}
                            {u.isSearchable ? ' · visible' : ''}
                          </td>
                          <td className="py-2.5 text-xs text-slate-400">
                            {sub.plan}
                            {sub.status !== '—' ? ` · ${sub.status}` : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Athlètes indépendants */}
        <section className="rounded-lg border border-slate-600 bg-slate-900/50 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/60"
            onClick={() => setAthletesIndOpen((v) => !v)}
          >
            {athletesIndOpen ? <ChevronDownIcon className="w-5 h-5 text-slate-400" /> : <ChevronRightIcon className="w-5 h-5 text-slate-400" />}
            <UserIcon className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-slate-100">Athlètes indépendants</span>
            <span className="ml-auto text-xs text-slate-400">{independentAthletes.length}</span>
          </button>
          {athletesIndOpen && (
            <div className="border-t border-slate-700 px-4 py-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                    <th className="py-2 pr-3">Nom</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Visibilité</th>
                    <th className="py-2">Abonnement</th>
                  </tr>
                </thead>
                <tbody>
                  {independentAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        Aucun athlète indépendant.
                      </td>
                    </tr>
                  ) : (
                    independentAthletes.map((u) => {
                      const sub = formatSubscription(u.subscription);
                      return (
                        <tr key={u.id} className="border-b border-slate-800/80 text-slate-200">
                          <td className="py-2.5 pr-3 font-medium">
                            {u.firstName} {u.lastName}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-400 text-xs">{u.email}</td>
                          <td className="py-2.5 pr-3 text-xs text-slate-400">
                            {u.isSearchable ? 'Profil visible recruteurs' : 'Non visible'}
                          </td>
                          <td className="py-2.5 text-xs text-slate-400">
                            {sub.plan}
                            {sub.status !== '—' ? ` · ${sub.status}` : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Maintenance équipe active (doublons) — replié */}
        <section className="rounded-lg border border-slate-700 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/40"
            onClick={() => setShowMaintenance((v) => !v)}
          >
            {showMaintenance ? <ChevronDownIcon className="w-5 h-5 text-slate-500" /> : <ChevronRightIcon className="w-5 h-5 text-slate-500" />}
            <span className="font-medium text-slate-300">Maintenance — équipe active (doublons / purge)</span>
          </button>
          {showMaintenance && (
            <div className="border-t border-slate-800 px-4 py-4 space-y-4">
              <p className="text-xs text-slate-500">
                Concerne l’effectif de l’équipe actuellement chargée ({appState.activeTeamId || 'aucune'}).
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => setShowDuplicates(!showDuplicates)} variant="secondary" icon={<UserGroupIcon className="w-5 h-5" />}>
                  {showDuplicates ? 'Masquer doublons' : 'Afficher doublons'}
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setDeleteType('riders');
                    setShowDeleteModal(true);
                  }}
                  variant="danger"
                  disabled={selectedRiders.size === 0}
                  icon={<TrashIcon className="w-5 h-5" />}
                >
                  Supprimer coureurs ({selectedRiders.size})
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setDeleteType('staff');
                    setShowDeleteModal(true);
                  }}
                  variant="danger"
                  disabled={selectedStaff.size === 0}
                  icon={<TrashIcon className="w-5 h-5" />}
                >
                  Supprimer staff ({selectedStaff.size})
                </ActionButton>
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans l’équipe active…"
                className="input-field-sm w-full"
              />
              {showDuplicates && (
                <div className="text-sm text-amber-200/90">
                  Doublons coureurs : {duplicateRiders.length} · Doublons staff : {duplicateStaff.length}
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded border border-slate-700 p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-2">Coureurs ({filteredRiders.length})</p>
                  {filteredRiders.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 py-1 text-sm text-slate-300">
                      <input type="checkbox" checked={selectedRiders.has(r.id)} onChange={() => handleSelectRider(r.id)} />
                      {r.firstName} {r.lastName}
                    </label>
                  ))}
                </div>
                <div className="rounded border border-slate-700 p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-2">Staff ({filteredStaff.length})</p>
                  {filteredStaff.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 py-1 text-sm text-slate-300">
                      <input type="checkbox" checked={selectedStaff.has(s.id)} onChange={() => handleSelectStaff(s.id)} />
                      {s.firstName} {s.lastName}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteType(null);
        }}
        onConfirm={confirmDelete}
        title="Confirmer la suppression"
        message={`Supprimer définitivement ${deleteType === 'riders' ? selectedRiders.size : selectedStaff.size} profil(s) de l’équipe active ?`}
      />

      <ConfirmationModal
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={() => {
          void handleConfirmDeleteTeam();
        }}
        title="Supprimer l’équipe"
        message={
          teamToDelete
            ? `Supprimer définitivement « ${teamToDelete.name || teamToDelete.id} » et toutes ses données (effectifs, courses, finances…) ?`
            : ''
        }
      />
    </SectionWrapper>
  );
};

export default SuperAdminSection;

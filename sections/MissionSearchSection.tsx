

import React, { useState, useMemo, useEffect } from 'react';
import { Mission, MissionApplicationStatus, MissionStatus, StaffRole, Team, User } from '../types';
import { getMissionApplications, isDemoMission } from '../constants/demoMissions';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import BriefcaseIcon from '../components/icons/BriefcaseIcon';
import CalendarDaysIcon from '../components/icons/CalendarDaysIcon';
import MapPinIcon from '../components/icons/MapPinIcon';
import BanknotesIcon from '../components/icons/BanknotesIcon';
import {
  isMissionMarketplacePaymentsEnabled,
  formatMissionMarketplaceBanner,
  MISSION_COMMISSION_LABELS,
} from '../constants/missionMarketplace';
import { exportVacataireDraftMissionInvoicePdf } from '../utils/missionInvoicePdfExport';
import { finalizeVacataireMissionInvoice } from '../services/missionConnectService';
import { getMyAppliedMissionsGlobal } from '../services/firebaseService';
import { useTranslations } from '../hooks/useTranslations';

interface MissionSearchSectionProps {
  missions: Mission[];
  teams: Team[];
  currentUser: User;
  setMissions: (updater: React.SetStateAction<Mission[]>) => void;
  onApplyToMission?: (mission: Mission) => Promise<void>;
}

const MissionCard: React.FC<{ mission: Mission; teamName: string; onApply: () => void; onDetails: () => void, hasApplied: boolean }> = ({ mission, teamName, onApply, onDetails, hasApplied }) => {
    const startDate = new Date(mission.startDate + "T12:00:00Z").toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const endDate = new Date(mission.endDate + "T12:00:00Z").toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden transition-transform hover:scale-105">
            <div className="p-4">
                <p className="text-xs font-semibold uppercase text-blue-600">{teamName}</p>
                <h3 className="text-lg font-bold text-gray-800 mt-1">{mission.title}</h3>
                <p className="text-sm text-gray-500">{mission.role}</p>
            </div>
            <div className="p-4 space-y-2 border-t border-b border-gray-200 text-sm flex-grow">
                <p className="flex items-center text-gray-700"><CalendarDaysIcon className="w-4 h-4 mr-2 text-gray-400"/>Du {startDate} au {endDate}</p>
                <p className="flex items-center text-gray-700"><MapPinIcon className="w-4 h-4 mr-2 text-gray-400"/>{mission.location}</p>
                <p className="flex items-center text-gray-700"><BanknotesIcon className="w-4 h-4 mr-2 text-gray-400"/>{mission.compensation}</p>
            </div>
            <div className="p-3 bg-gray-50 flex justify-end space-x-2">
                <ActionButton onClick={onDetails} variant="secondary" size="sm">Détails</ActionButton>
                <ActionButton onClick={onApply} variant="primary" size="sm" disabled={hasApplied}>
                    {hasApplied ? 'Candidaté' : 'Postuler'}
                </ActionButton>
            </div>
        </div>
    );
};


const MissionSearchSection: React.FC<MissionSearchSectionProps> = ({ missions, teams, currentUser, setMissions, onApplyToMission }) => {
    const { t } = useTranslations();
    const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [finalizeBusyId, setFinalizeBusyId] = useState<string | null>(null);
    const userId = currentUser?.id;

    useEffect(() => {
      if (!userId || !isMissionMarketplacePaymentsEnabled()) return;
      let cancelled = false;
      (async () => {
        const applied = await getMyAppliedMissionsGlobal(userId);
        if (cancelled || !applied.length) return;
        setMissions((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of applied) byId.set(m.id, m);
          return Array.from(byId.values());
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, setMissions]);

    const allMissions = useMemo(() => {
        return (missions || []).filter((m) => !isDemoMission(m.id));
    }, [missions]);

    const myApplications = useMemo(() => {
        if (!allMissions.length || !userId) return new Set<string>();
        return new Set(allMissions.filter(m => m.applicants?.includes(userId)).map(m => m.id));
    }, [allMissions, userId]);

    const filteredMissions = useMemo(() => {
        if (!allMissions.length) return [];
        return allMissions.filter(mission => {
            if (mission.status !== MissionStatus.OPEN) return false;
            if (roleFilter !== 'all' && mission.role !== roleFilter) return false;
            if (startDateFilter && new Date(mission.startDate) < new Date(startDateFilter)) return false;
            return true;
        }).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [allMissions, roleFilter, startDateFilter]);

    const myPaidMissions = useMemo(() => {
        if (!allMissions.length || !userId) return [];
        return allMissions.filter((m) => {
            if (m.payment?.status !== 'paid') return false;
            const apps = getMissionApplications(m);
            return apps.some(
                (a) =>
                    a.userId === userId &&
                    a.status === MissionApplicationStatus.ACCEPTED,
            );
        });
    }, [allMissions, userId]);

    if (!currentUser || !userId) {
        return (
            <SectionWrapper title="Offres & Missions">
                <div className="text-center p-8 bg-gray-50 rounded-lg border">
                    <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
                    <p className="mt-2 text-gray-500">Initialisation des données utilisateur...</p>
                </div>
            </SectionWrapper>
        );
    }

    const getTeamName = (teamId: string) =>
        teams.find(t => t.id === teamId)?.name || 'Équipe partenaire';

    const handleApply = async (missionToApply: Mission) => {
        if (!userId) return;
        if (onApplyToMission) {
            await onApplyToMission(missionToApply);
        }
        setMissions(prevMissions =>
            prevMissions.map(m =>
                m.id === missionToApply.id
                    ? { ...m, applicants: [...(m.applicants || []), userId] }
                    : m
            )
        );
        alert(`Candidature envoyée pour le poste de "${missionToApply.title}" avec l'équipe ${getTeamName(missionToApply.teamId)}.`);
    };
    
    return (
        <SectionWrapper title="Offres & Missions">
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                isMissionMarketplacePaymentsEnabled()
                  ? 'border border-emerald-500/40 bg-emerald-950/70 text-emerald-100'
                  : 'border border-amber-500/40 bg-amber-950/80 text-amber-100'
              }`}
            >
              {formatMissionMarketplaceBanner('fr')}
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Missions vacataires ouvertes publiées par les équipes.
              Une fois accepté(e) sur un week-end, la mission apparaît automatiquement dans{' '}
              <strong>Mon Calendrier</strong>.
            </p>

            {isMissionMarketplacePaymentsEnabled() && myPaidMissions.length > 0 && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-3">
                <p className="text-sm font-medium text-emerald-900">
                  Missions payées — modèles de facture (net → Rovik)
                </p>
                <ul className="space-y-2">
                  {myPaidMissions.map((m) => {
                    const accepted = getMissionApplications(m).find(
                      (a) =>
                        a.userId === currentUser.id &&
                        a.status === MissionApplicationStatus.ACCEPTED,
                    );
                    if (!accepted || !m.payment) return null;
                    const issued = m.payment.vacataireInvoiceStatus === 'issued';
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-950"
                      >
                        <span>
                          {m.title} · {getTeamName(m.teamId)}
                          {issued && m.payment.vacataireInvoiceNumber
                            ? ` · ${m.payment.vacataireInvoiceNumber}`
                            : m.payment.vacataireInvoiceDraftNumber
                              ? ` · ${m.payment.vacataireInvoiceDraftNumber}`
                              : ''}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              exportVacataireDraftMissionInvoicePdf({
                                mission: m,
                                payment: m.payment!,
                                teamName: getTeamName(m.teamId),
                                accepted,
                                business: currentUser.business,
                              })
                            }
                          >
                            {MISSION_COMMISSION_LABELS.downloadVacataireDraft.fr}
                          </ActionButton>
                          {!issued && (
                            <ActionButton
                              size="sm"
                              variant="primary"
                              disabled={finalizeBusyId === m.id}
                              onClick={async () => {
                                setFinalizeBusyId(m.id);
                                try {
                                  const res = await finalizeVacataireMissionInvoice(m.teamId, m.id);
                                  setMissions((prev) =>
                                    prev.map((x) =>
                                      x.id === m.id && x.payment
                                        ? {
                                            ...x,
                                            payment: {
                                              ...x.payment,
                                              vacataireInvoiceStatus: 'issued',
                                              vacataireInvoiceNumber: res.invoiceNumber,
                                              vacataireInvoiceIssuedAt: new Date().toISOString(),
                                            },
                                          }
                                        : x,
                                    ),
                                  );
                                } catch (err) {
                                  console.error(err);
                                  alert(t('missionInvoicesFinalizeError'));
                                } finally {
                                  setFinalizeBusyId(null);
                                }
                              }}
                            >
                              {finalizeBusyId === m.id ? '…' : t('missionInvoicesFinalize')}
                            </ActionButton>
                          )}
                          {issued && (
                            <span className="text-xs font-medium text-emerald-800 self-center">
                              {t('missionInvoicesFinalizeDone')}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700">Rôle recherché</label>
                        <select
                            id="roleFilter"
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value as any)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="all">Tous les rôles</option>
                            {Object.values(StaffRole).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700">Disponible à partir du</label>
                        <input
                            type="date"
                            id="startDateFilter"
                            value={startDateFilter}
                            onChange={e => setStartDateFilter(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-2 py-2 border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {filteredMissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMissions.map(mission => (
                        <MissionCard 
                            key={mission.id}
                            mission={mission}
                            teamName={getTeamName(mission.teamId)}
                            onApply={() => handleApply(mission)}
                            onDetails={() => setSelectedMission(mission)}
                            hasApplied={myApplications.has(mission.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400"/>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune mission trouvée</h3>
                    <p className="mt-1 text-sm text-gray-500">Essayez d'ajuster vos filtres de recherche.</p>
                </div>
            )}
            
            {selectedMission && (
                <Modal isOpen={!!selectedMission} onClose={() => setSelectedMission(null)} title={selectedMission.title}>
                    <div className="space-y-4">
                        <p><strong className="font-semibold text-gray-800">Équipe:</strong> {getTeamName(selectedMission.teamId)}</p>
                        <p><strong className="font-semibold text-gray-800">Rôle:</strong> {selectedMission.role}</p>
                        <p><strong className="font-semibold text-gray-800">Dates:</strong> Du {new Date(selectedMission.startDate + "T12:00:00Z").toLocaleDateString('fr-FR')} au {new Date(selectedMission.endDate + "T12:00:00Z").toLocaleDateString('fr-FR')}</p>
                        <p><strong className="font-semibold text-gray-800">Lieu:</strong> {selectedMission.location}</p>
                        <p><strong className="font-semibold text-gray-800">Compensation:</strong> {selectedMission.compensation}</p>
                        <div>
                            <strong className="font-semibold text-gray-800">Description:</strong>
                            <p className="mt-1 text-gray-600 whitespace-pre-wrap">{selectedMission.description}</p>
                        </div>
                        {selectedMission.requirements && selectedMission.requirements.length > 0 && (
                             <div>
                                <strong className="font-semibold text-gray-800">Prérequis:</strong>
                                <ul className="list-disc list-inside mt-1 text-gray-600">
                                    {selectedMission.requirements.map((req, i) => <li key={i}>{req}</li>)}
                                </ul>
                            </div>
                        )}
                         <div className="pt-5 flex justify-end">
                            <ActionButton onClick={() => handleApply(selectedMission)} disabled={myApplications.has(selectedMission.id)}>
                                {myApplications.has(selectedMission.id) ? 'Candidaté' : 'Postuler'}
                            </ActionButton>
                         </div>
                    </div>
                </Modal>
            )}
        </SectionWrapper>
    );
};

export default MissionSearchSection;

import React, { useState, useMemo } from 'react';
import { AppState, Sex, User, UserRole, ScoutingRequestStatus, TeamMembershipStatus } from '../types';
import { SPIDER_CHART_CHARACTERISTICS_CONFIG, ALL_COUNTRIES } from '../constants';
import { getRiderCharacteristicSafe } from '../utils/riderUtils';
import ActionButton from './ActionButton';
import UserCircleIcon from './icons/UserCircleIcon';
import { useTranslations } from '../hooks/useTranslations';

interface TalentSearchTabProps {
  appState: AppState;
  onProfileSelect: (user: User) => void;
  onRequestScoutingAccess: (user: User) => Promise<void>;
  currentTeamId: string | null;
}

const getAge = (birthDate?: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const SpiderChart: React.FC<{ data: { axis: string; value: number }[]; size?: number }> = ({ data, size = 100 }) => {
    const numAxes = data.length;
    if (numAxes < 3) return null;
    const angleSlice = (Math.PI * 2) / numAxes;
    const radius = size / 3.5;
    const center = size / 2;

    const points = data.map((d, i) => {
        const value = Math.max(0, Math.min(d.value || 0, 100));
        const x = center + radius * (value / 100) * Math.cos(angleSlice * i - Math.PI / 2);
        const y = center + radius * (value / 100) * Math.sin(angleSlice * i - Math.PI / 2);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <polygon points={points} fill="rgba(239, 169, 182, 0.4)" stroke="rgba(239, 169, 182, 0.9)" strokeWidth="1" />
        </svg>
    );
};

const TalentSearchTab: React.FC<TalentSearchTabProps> = ({
  appState,
  onProfileSelect,
  onRequestScoutingAccess,
  currentTeamId,
}) => {
    const { t } = useTranslations();
    const [nameFilter, setNameFilter] = useState('');
    const [sexFilter, setSexFilter] = useState<'all' | Sex>('all');
    const [minAge, setMinAge] = useState(19);
    const [maxAge, setMaxAge] = useState(40);
    const [nationalityFilter, setNationalityFilter] = useState('all');
    const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

    const teamScoutingRequests = useMemo(() => {
        if (!currentTeamId || !appState.scoutingRequests) return [];
        return appState.scoutingRequests.filter((r) => r.requesterTeamId === currentTeamId);
    }, [appState.scoutingRequests, currentTeamId]);

    const getRequestForUser = (userId: string) =>
        teamScoutingRequests.find((r) => r.athleteId === userId);

    const filteredTalents = useMemo(() => {
        if (!currentTeamId || !appState.teamMemberships || !appState.users || !appState.scoutingRequests) return [];

        const currentTeamUserIds = new Set(
            appState.teamMemberships
                .filter(m => m.teamId === currentTeamId && m.status === TeamMembershipStatus.ACTIVE)
                .map(m => m.userId)
        );

        return appState.users.filter(user => {
            if (user.userRole !== UserRole.COUREUR) return false;
            if (currentTeamUserIds.has(user.id)) return false;

            const isPubliclySearchable = user.isSearchable;
            const riderProfile = appState.riders.find(r => r.email === user.email);
            const isRiderSearchable = riderProfile?.isSearchable;
            const isVisible = isPubliclySearchable || isRiderSearchable;

            const hasSharedData = appState.scoutingRequests.some(
                req => req.athleteId === user.id &&
                       req.requesterTeamId === currentTeamId &&
                       req.status === ScoutingRequestStatus.ACCEPTED
            );

            if (!isVisible && !hasSharedData) return false;

            const age = getAge(user.signupInfo?.birthDate);
            if (age === null || age < minAge || age > maxAge) return false;
            if (nameFilter && !`${user.firstName} ${user.lastName}`.toLowerCase().includes(nameFilter.toLowerCase())) return false;
            if (sexFilter !== 'all' && user.signupInfo?.sex !== sexFilter) return false;
            if (nationalityFilter !== 'all' && user.signupInfo?.nationality !== nationalityFilter) return false;

            return true;
        });
    }, [appState, nameFilter, minAge, maxAge, nationalityFilter, sexFilter, currentTeamId]);
    
    const spiderChartData = (user: User) => {
        return SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => ({
            axis: char.label,
            value: getRiderCharacteristicSafe(user, char.key),
        }));
    };

    const handleTalentAction = async (user: User) => {
        const existing = getRequestForUser(user.id);

        if (existing?.status === ScoutingRequestStatus.ACCEPTED) {
            onProfileSelect(user);
            return;
        }
        if (existing?.status === ScoutingRequestStatus.PENDING) {
            alert(t('talentScoutingRequestPending'));
            return;
        }
        if (existing?.status === ScoutingRequestStatus.REJECTED) {
            alert(t('talentScoutingRequestRejected'));
            return;
        }

        setLoadingUserId(user.id);
        try {
            await onRequestScoutingAccess(user);
            alert(t('talentScoutingRequestSent'));
        } finally {
            setLoadingUserId(null);
        }
    };

    const getButtonLabel = (userId: string) => {
        const existing = getRequestForUser(userId);
        if (existing?.status === ScoutingRequestStatus.ACCEPTED) return t('talentScoutingViewProfile');
        if (existing?.status === ScoutingRequestStatus.PENDING) return t('talentScoutingStatusPending');
        return t('talentScoutingRequestProfile');
    };

    const getStatusBadge = (userId: string) => {
        const existing = getRequestForUser(userId);
        if (!existing) return null;
        if (existing.status === ScoutingRequestStatus.ACCEPTED) {
            return (
                <span className="text-xs font-medium text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded">
                    {t('talentScoutingStatusAccepted')}
                </span>
            );
        }
        if (existing.status === ScoutingRequestStatus.PENDING) {
            return (
                <span className="text-xs font-medium text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded">
                    {t('talentScoutingStatusPending')}
                </span>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="Rechercher par nom..." className="input-field-sm col-span-full" />
                    <div>
                        <label className="block text-xs font-medium text-slate-300">Nationalité</label>
                        <select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)} className="input-field-sm">
                            <option value="all">Toutes Nationalités</option>
                            {ALL_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-300">Sexe</label>
                        <select value={sexFilter} onChange={e => setSexFilter(e.target.value as 'all' | Sex)} className="input-field-sm">
                            <option value="all">Tous les Sexes</option>
                            <option value={Sex.MALE}>{Sex.MALE}</option>
                            <option value={Sex.FEMALE}>{Sex.FEMALE}</option>
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-300">Tranche d&apos;âge: {minAge} - {maxAge} ans</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <input type="number" value={minAge} onChange={e => setMinAge(Number(e.target.value))} className="input-field-sm w-full" placeholder="Min" min="16" max="50"/>
                            <span className="text-slate-400">-</span>
                            <input type="number" value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} className="input-field-sm w-full" placeholder="Max" min="16" max="50"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTalents.map(user => {
                    const existing = getRequestForUser(user.id);
                    const isPending = existing?.status === ScoutingRequestStatus.PENDING;
                    return (
                    <div key={user.id} className="bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col border border-slate-700">
                        <div className="p-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                    <UserCircleIcon className="w-12 h-12 text-slate-500"/>
                                    <div>
                                        <h4 className="font-bold text-slate-100">{user.firstName} {user.lastName}</h4>
                                        <p className="text-xs text-slate-400">{getAge(user.signupInfo?.birthDate)} ans - {user.signupInfo?.nationality}</p>
                                        <div className="mt-1">{getStatusBadge(user.id)}</div>
                                    </div>
                                </div>
                                <div className="w-20 h-20 flex-shrink-0">
                                    <SpiderChart data={spiderChartData(user)} />
                                </div>
                            </div>
                             <div className="mt-2 text-xs text-slate-300">
                                <span className="font-semibold">Profil:</span> {user.qualitativeProfile || 'N/A'}
                             </div>
                        </div>
                         <div className="mt-auto p-2 bg-slate-700/50 text-right">
                             <ActionButton
                                onClick={() => handleTalentAction(user)}
                                variant="secondary"
                                size="sm"
                                disabled={loadingUserId === user.id || isPending}
                             >
                                {loadingUserId === user.id ? '...' : getButtonLabel(user.id)}
                             </ActionButton>
                        </div>
                    </div>
                );})}
            </div>
            {filteredTalents.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">Aucun talent ne correspond à vos critères de recherche.</p>
                    <div className="text-sm text-slate-500">
                        <p>{appState.users?.filter(u => u.userRole === UserRole.COUREUR).length || 0} coureurs dans la base</p>
                        <p>{appState.users?.filter(u => u.userRole === UserRole.COUREUR && u.isSearchable).length || 0} coureurs visibles en recrutement</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TalentSearchTab;

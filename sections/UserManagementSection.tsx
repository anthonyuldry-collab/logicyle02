
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { AppState, TeamMembership, TeamMembershipStatus, TeamRole, User, UserRole, PermissionLevel, AppSection, Team } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import TrashIcon from '../components/icons/TrashIcon';
import KeyIcon from '../components/icons/KeyIcon';
import UserPermissionsModal from '../components/UserPermissionsModal';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

interface UserManagementSectionProps {
    appState: AppState;
    currentTeamId: string;
    onApprove: (membership: TeamMembership) => Promise<void>;
    onDeny: (membership: TeamMembership) => Promise<void>;
    onInvite: (email: string, teamId: string, userRole?: UserRole) => Promise<void>;
    onRemove: (userId: string, teamId: string) => Promise<void>;
    onUpdateRole: (userId: string, teamId: string, newUserRole: UserRole) => Promise<void>;
    onUpdatePermissionRole: (userId: string, newPermissionRole: TeamRole) => Promise<void>;
    onUpdateUserCustomPermissions: (userId: string, newEffectivePermissions: Partial<Record<AppSection, PermissionLevel[]>>) => Promise<void>;
    onTransferUser: (userId: string, fromTeamId: string, toTeamId: string) => Promise<void>;
}

const UserManagementSection: React.FC<UserManagementSectionProps> = ({ 
    appState, 
    currentTeamId,
    onApprove, 
    onDeny, 
    onInvite, 
    onRemove, 
    onUpdateRole, 
    onUpdatePermissionRole,
    onUpdateUserCustomPermissions,
    onTransferUser
}: UserManagementSectionProps) => {
    const { users, teams, teamMemberships } = appState;
    
    // Protection contre les données undefined
    if (!users || !teams || !teamMemberships) {
        return (
            <SectionWrapper title="Gestion des Utilisateurs et des Accès">
                <div className="text-center p-8 bg-gray-50 rounded-lg border">
                    <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
                    <p className="mt-2 text-gray-500">Initialisation des données utilisateurs...</p>
                    <div className="mt-4 text-sm text-gray-400">
                        {!users && <div>• Utilisateurs en cours de chargement...</div>}
                        {!teams && <div>• Équipes en cours de chargement...</div>}
                        {!teamMemberships && <div>• Adhésions en cours de chargement...</div>}
                    </div>
                </div>
            </SectionWrapper>
        );
    }
    const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.COUREUR);
    const [editingPermissionsForUser, setEditingPermissionsForUser] = useState<User | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [userToTransfer, setUserToTransfer] = useState<User | null>(null);
    const [destinationTeamId, setDestinationTeamId] = useState('');
    const [transferConfirmation, setTransferConfirmation] = useState<{ user: User; team: Team } | null>(null);

    const pendingMemberships = teamMemberships.filter(m => m.status === TeamMembershipStatus.PENDING && m.teamId === currentTeamId);
    const activeMemberships = teamMemberships.filter(m => m.status === TeamMembershipStatus.ACTIVE && m.teamId === currentTeamId);
    
    const getUser = (userId: string) => users.find(u => u.id === userId);
    const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

    const handleInviteSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (inviteEmail) {
            try {
                await onInvite(inviteEmail, currentTeamId, inviteRole);
                setInviteEmail('');
            } catch (error) {
                console.warn('⚠️ Erreur lors de l\'invitation:', error);
                alert('⚠️ Erreur lors de l\'envoi de l\'invitation');
            }
        }
    };

    const openTransferModal = (user: User) => {
        setUserToTransfer(user);
        const firstOtherTeam = teams.find(t => t.id !== currentTeamId);
        setDestinationTeamId(firstOtherTeam ? firstOtherTeam.id : '');
        setTransferModalOpen(true);
    };

    const handleTransferConfirm = () => {
        if (userToTransfer && destinationTeamId) {
            const destinationTeam = teams.find(t => t.id === destinationTeamId);
            if (destinationTeam) {
                setTransferConfirmation({ user: userToTransfer, team: destinationTeam });
            }
            setTransferModalOpen(false);
        }
    };
    
    const executeTransfer = () => {
        if (transferConfirmation) {
            onTransferUser(transferConfirmation.user.id, currentTeamId, transferConfirmation.team.id);
            setTransferConfirmation(null);
            setUserToTransfer(null);
        }
    };

    // Fonctions de gestion avancée
    const exportTeamData = () => {
        try {
            const teamData = {
                team: teams.find((t: Team) => t.id === currentTeamId),
                members: activeMemberships.map((m: TeamMembership) => {
                    const user = getUser(m.userId || '');
                    return {
                        ...m,
                        user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null
                    };
                }),
                exportDate: new Date().toISOString()
            };

            const dataStr = JSON.stringify(teamData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `equipe_${currentTeamId}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            alert('Erreur lors de l\'export des données');
        }
    };

    const exportUserList = () => {
        try {
            const userList = activeMemberships.map((m: TeamMembership) => {
                const user = getUser(m.userId || '');
                return {
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    email: user?.email || '',
                    role: m.userRole,
                    permissionRole: user?.permissionRole || 'MEMBER',
                    joinedAt: m.requestedAt
                };
            });

            const csvContent = [
                ['Prénom', 'Nom', 'Email', 'Rôle', 'Permission', 'Date d\'adhésion'],
                ...userList.map((u: any) => [u.firstName, u.lastName, u.email, u.role, u.permissionRole, u.joinedAt])
            ].map((row: string[]) => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `utilisateurs_equipe_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            alert('Erreur lors de l\'export de la liste');
        }
    };

    const bulkUpdateRoles = () => {
        alert('Fonctionnalité de mise à jour en lot des rôles - À implémenter');
    };

    const sendTeamNotification = () => {
        alert('Fonctionnalité de notification d\'équipe - À implémenter');
    };

    const getRecentActivityLogs = () => {
        // Simulation de logs d'activité - À connecter avec un vrai système de logs
        interface ActivityLog {
            type: 'success' | 'warning' | 'info';
            message: string;
            timestamp: string;
        }
        
        const logs: ActivityLog[] = [
            {
                type: 'success',
                message: 'Nouveau membre approuvé: Jean Dupont',
                timestamp: 'Il y a 2h'
            },
            {
                type: 'warning',
                message: 'Tentative de connexion échouée pour user@example.com',
                timestamp: 'Il y a 4h'
            },
            {
                type: 'info',
                message: 'Mise à jour des permissions pour Marie Martin',
                timestamp: 'Il y a 6h'
            }
        ];
        
        return logs;
    };

    return (
        <SectionWrapper title="Gestion des Utilisateurs et des Accès">
            <div className="space-y-8">
                <div className="p-4 bg-white rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Inviter un nouveau membre</h3>
                    <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                            placeholder="email@du.nouveau.membre"
                            required
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                            value={inviteRole}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value as UserRole)}
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value={UserRole.COUREUR}>🚴 Coureur</option>
                            <option value={UserRole.STAFF}>👥 Staff</option>
                            <option value={UserRole.MANAGER}>👑 Manager</option>
                        </select>
                        <ActionButton type="submit" icon={<PlusCircleIcon className="w-5 h-5"/>}>
                            Envoyer une invitation
                        </ActionButton>
                    </form>
                </div>
                {/* Section des demandes en attente */}
                <div className="p-4 bg-white rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Demandes d'Adhésion en Attente</h3>
                    {pendingMemberships.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Aucune nouvelle demande d'adhésion.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        <th className="px-4 py-2">Nom</th>
                                        <th className="px-4 py-2">Email</th>
                                        <th className="px-4 py-2">Équipe Demandée</th>
                                        <th className="px-4 py-2">Rôle Demandé</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {pendingMemberships.map((membership: TeamMembership) => {
                                        const user = getUser(membership.userId || '');
                                        const team = getTeam(membership.teamId || '');
                                        if (!user || !team) return null;

                                        return (
                                            <tr key={membership.userId + membership.teamId}>
                                                <td className="px-4 py-2 font-medium">{user.firstName} {user.lastName}</td>
                                                <td className="px-4 py-2 text-gray-600">{user.email}</td>
                                                <td className="px-4 py-2 text-gray-600">{team.name}</td>
                                                <td className="px-4 py-2 text-gray-600">{membership.userRole}</td>
                                                <td className="px-4 py-2 text-right space-x-2">
                                                    <ActionButton 
                                                        onClick={async () => {
                                                            try {
                                                                // Transformer les données pour correspondre à l'interface attendue
                                                                // IMPORTANT: Dans Firebase, chaque document a un ID unique
                                                                // Si membership.id n'existe pas, nous devons le récupérer différemment
                                                                const membershipId = membership.id || membership.userId || 'unknown-id';
                                                                
                                                                const transformedMembership = {
                                                                    id: membershipId, // Utiliser l'ID disponible
                                                                    email: user?.email || 'unknown@email.com', // Récupérer l'email de l'utilisateur
                                                                    teamId: membership.teamId || 'unknown-team',
                                                                    status: membership.status || 'PENDING',
                                                                    userRole: membership.userRole || 'COUREUR',
                                                                    firstName: user?.firstName || '',
                                                                    lastName: user?.lastName || '',
                                                                    requestedUserRole: membership.userRole || 'COUREUR',
                                                                    requestedAt: membership.requestedAt || new Date().toISOString(),
                                                                    requestedBy: membership.requestedBy || 'unknown'
                                                                };
                                                                
                                                                // Vérifier que toutes les propriétés requises sont présentes
                                                                if (!transformedMembership.id || !transformedMembership.email || !transformedMembership.teamId) {
                                                                    alert('Erreur: Impossible de transformer les données d\'adhésion');
                                                                    return;
                                                                }
                                                                
                                                                await onApprove(transformedMembership);
                                                            } catch (error) {
                                                                console.error('Erreur lors de l\'approbation:', error);
                                                                alert('Erreur lors de l\'approbation');
                                                            }
                                                        }} 
                                                        variant="primary" 
                                                        size="sm" 
                                                        icon={<CheckCircleIcon className="w-4 h-4" />}
                                                    >
                                                        Approuver
                                                    </ActionButton>
                                                    <ActionButton 
                                                        onClick={async () => {
                                                            try {
                                                                // Transformer les données pour correspondre à l'interface attendue
                                                                // IMPORTANT: Dans Firebase, chaque document a un ID unique
                                                                // Si membership.id n'existe pas, nous devons le récupérer différemment
                                                                const membershipId = membership.id || membership.userId || 'unknown-id';
                                                                
                                                                const transformedMembership = {
                                                                    id: membershipId, // Utiliser l'ID disponible
                                                                    email: user?.email || 'unknown@email.com', // Récupérer l'email de l'utilisateur
                                                                    teamId: membership.teamId || 'unknown-team',
                                                                    status: membership.status || 'PENDING',
                                                                    userRole: membership.userRole || 'COUREUR',
                                                                    firstName: user?.firstName || '',
                                                                    lastName: user?.lastName || '',
                                                                    requestedUserRole: membership.userRole || 'COUREUR',
                                                                    requestedAt: membership.requestedAt || new Date().toISOString(),
                                                                    requestedBy: membership.requestedBy || 'unknown'
                                                                };
                                                                
                                                                // Vérifier que toutes les propriétés requises sont présentes
                                                                if (!transformedMembership.id || !transformedMembership.email || !transformedMembership.teamId) {
                                                                    alert('Erreur: Impossible de transformer les données d\'adhésion pour le refus');
                                                                    return;
                                                                }
                                                                
                                                                await onDeny(transformedMembership);
                                                            } catch (error) {
                                                                console.error('Erreur lors du refus:', error);
                                                                alert('Erreur lors du refus');
                                                            }
                                                        }} 
                                                        variant="danger" 
                                                        size="sm" 
                                                        icon={<XCircleIcon className="w-4 h-4" />}
                                                    >
                                                        Refuser
                                                    </ActionButton>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Statistiques de l'équipe */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{activeMemberships.length}</div>
                        <div className="text-sm text-blue-600">Membres Actifs</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-600">{pendingMemberships.length}</div>
                        <div className="text-sm text-yellow-600">Demandes en Attente</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                            {activeMemberships.filter((m: TeamMembership) => {
                                const user = getUser(m.userId || '');
                                return user?.permissionRole === TeamRole.ADMIN || user?.permissionRole === TeamRole.EDITOR;
                            }).length}
                        </div>
                        <div className="text-sm text-green-600">Managers/Admins</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">
                            {activeMemberships.filter((m: TeamMembership) => m.userRole === UserRole.COUREUR).length}
                        </div>
                        <div className="text-sm text-purple-600">Coureurs</div>
                    </div>
                </div>

                {/* Liste des membres actifs */}
                <div className="p-4 bg-white rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Membres Actifs</h3>
                    {activeMemberships.length === 0 ? (
                         <p className="text-sm text-gray-500 italic">Aucun membre actif dans l'équipe.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        <th className="px-4 py-2">Nom</th>
                                        <th className="px-4 py-2">Rôle Fonctionnel</th>
                                        <th className="px-4 py-2">Rôle Permissions</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {activeMemberships.map((membership: TeamMembership) => {
                                        const user = getUser(membership.userId || '');
                                        if (!user) return null;

                                        const isLastAdmin = user.permissionRole === TeamRole.ADMIN && users.filter((u: User) => u.permissionRole === TeamRole.ADMIN).length <= 1;

                                        return (
                                            <tr key={membership.userId + membership.teamId}>
                                                <td className="px-4 py-2 font-medium">{user.firstName} {user.lastName} <span className="text-gray-500 text-xs">({user.email})</span></td>
                                                <td className="px-4 py-2 text-gray-600 w-48">
                                                    {user.permissionRole === TeamRole.ADMIN ? (
                                                        membership.userRole
                                                    ) : (
                                                        <select
                                                            value={membership.userRole}
                                                            onChange={async (e: ChangeEvent<HTMLSelectElement>) => {
                                                                try {
                                                                    await onUpdateRole(user.id, currentTeamId, e.target.value as UserRole);
                                                                } catch (error) {
                                                                    console.error('Erreur lors de la mise à jour du rôle:', error);
                                                                    alert('Erreur lors de la mise à jour du rôle');
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs bg-white text-gray-900"
                                                        >
                                                            {Object.values(UserRole).map((role: UserRole) => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-gray-600 w-48">
                                                    <select
                                                        value={user.permissionRole}
                                                        onChange={async (e: ChangeEvent<HTMLSelectElement>) => {
                                                            try {
                                                                await onUpdatePermissionRole(user.id, e.target.value as TeamRole);
                                                            } catch (error) {
                                                                console.error('Erreur lors de la mise à jour du rôle de permission:', error);
                                                                alert('Erreur lors de la mise à jour du rôle de permission');
                                                            }
                                                        }}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        disabled={isLastAdmin}
                                                        title={isLastAdmin ? "Impossible de modifier le rôle du dernier administrateur." : ""}
                                                    >
                                                        {Object.values(TeamRole).map((role: TeamRole) => (
                                                            <option key={role} value={role}>{role}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2 text-right space-x-2">
                                                    <ActionButton onClick={() => openTransferModal(user)} variant="secondary" size="sm">Transférer</ActionButton>
                                                    <ActionButton onClick={() => setEditingPermissionsForUser(user)} variant="secondary" size="sm" icon={<KeyIcon className="w-4 h-4" />} title="Gérer les permissions individuelles" disabled={user.permissionRole === TeamRole.ADMIN}/>
                                                    <ActionButton 
                                                        onClick={async () => {
                                                            try {
                                                                await onRemove(user.id, currentTeamId);
                                                            } catch (error) {
                                                                console.error('Erreur lors de la suppression:', error);
                                                                alert('Erreur lors de la suppression');
                                                            }
                                                        }} 
                                                        variant="danger" 
                                                        size="sm" 
                                                        icon={<TrashIcon className="w-4 h-4"/>} 
                                                        disabled={isLastAdmin} 
                                                        title={isLastAdmin ? "Impossible de supprimer le dernier administrateur." : "Retirer de l'équipe"}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Gestion avancée de l'équipe */}
                <div className="p-4 bg-white rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Gestion Avancée de l'Équipe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Export des données */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-700">Export et Sauvegarde</h4>
                            <div className="space-y-2">
                                <ActionButton 
                                    onClick={() => exportTeamData()} 
                                    variant="secondary" 
                                    size="sm"
                                    className="w-full justify-center"
                                >
                                    📊 Exporter les Données de l'Équipe
                                </ActionButton>
                                <ActionButton 
                                    onClick={() => exportUserList()} 
                                    variant="secondary" 
                                    size="sm"
                                    className="w-full justify-center"
                                >
                                    👥 Exporter la Liste des Utilisateurs
                                </ActionButton>
                            </div>
                        </div>

                        {/* Actions d'administration */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-700">Actions d'Administration</h4>
                            <div className="space-y-2">
                                <ActionButton 
                                    onClick={() => bulkUpdateRoles()} 
                                    variant="secondary" 
                                    size="sm"
                                    className="w-full justify-center"
                                >
                                    🔄 Mise à Jour en Lot des Rôles
                                </ActionButton>
                                <ActionButton 
                                    onClick={() => sendTeamNotification()} 
                                    variant="secondary" 
                                    size="sm"
                                    className="w-full justify-center"
                                >
                                    📢 Envoyer une Notification d'Équipe
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logs d'activité */}
                <div className="p-4 bg-white rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Logs d'Activité Récente</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {getRecentActivityLogs().map((log, index: number) => (
                            <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                                <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-green-500' : log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                <span className="text-sm text-gray-600">{log.message}</span>
                                <span className="text-xs text-gray-400 ml-auto">{log.timestamp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Composant de test des enums - TEMPORAIRE */}
            {/* <div className="mt-6">
                <TestEnums />
            </div> */}

            {editingPermissionsForUser && (
                <UserPermissionsModal
                    isOpen={!!editingPermissionsForUser}
                    onClose={() => setEditingPermissionsForUser(null)}
                    user={editingPermissionsForUser}
                    basePermissions={appState.permissions}
                    onSave={onUpdateUserCustomPermissions}
                />
            )}
            {transferModalOpen && userToTransfer && (
                <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title={`Transférer ${userToTransfer.firstName} ${userToTransfer.lastName}`}>
                    <div className="space-y-4">
                        <p>Sélectionnez l'équipe de destination pour {userToTransfer.firstName}. Son affiliation à l'équipe actuelle sera désactivée et une demande sera envoyée à la nouvelle équipe.</p>
                        <div>
                            <label htmlFor="destination-team" className="block text-sm font-medium text-gray-700">Équipe de destination</label>
                            <select
                                id="destination-team"
                                value={destinationTeamId}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setDestinationTeamId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                                <option value="">-- Sélectionnez --</option>
                                {teams.filter((t: Team) => t.id !== currentTeamId).map((team: Team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                         <div className="flex justify-end space-x-2 pt-3">
                            <ActionButton type="button" variant="secondary" onClick={() => setTransferModalOpen(false)}>Annuler</ActionButton>
                            <ActionButton onClick={handleTransferConfirm} disabled={!destinationTeamId}>Confirmer le Transfert</ActionButton>
                        </div>
                    </div>
                </Modal>
            )}
            {transferConfirmation && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setTransferConfirmation(null)}
                    onConfirm={executeTransfer}
                    title={`Confirmer le transfert de ${transferConfirmation.user.firstName} ${transferConfirmation.user.lastName}`}
                    message={
                        <span>
                            Êtes-vous sûr de vouloir initier le transfert vers l'équipe <strong>{transferConfirmation.team.name}</strong> ?
                            <br />
                            L'affiliation actuelle sera désactivée et une nouvelle demande sera créée.
                        </span>
                    }
                />
            )}
        </SectionWrapper>
    );
};

export default UserManagementSection;

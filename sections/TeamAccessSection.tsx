import React, { useEffect, useState } from 'react';
import SectionWrapper from '../components/SectionWrapper';
import UserManagementSection, { type UserManagementSectionProps } from './UserManagementSection';
import PermissionsSection, { type PermissionsSectionProps } from './PermissionsSection';

export type TeamAccessTab = 'membres' | 'roles';

type TeamAccessSectionProps = {
  initialTab?: TeamAccessTab;
} & UserManagementSectionProps &
  PermissionsSectionProps;

const TeamAccessSection: React.FC<TeamAccessSectionProps> = ({
  initialTab = 'membres',
  // User management
  appState,
  currentTeamId,
  onApprove,
  onDeny,
  onInvite,
  onRemove,
  onUpdateRole,
  onUpdatePermissionRole,
  onUpdateUserCustomPermissions,
  onTransferUser,
  // Permissions
  permissions,
  setPermissions,
  permissionRoles,
  setPermissionRoles,
  users,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TeamAccessTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs: { id: TeamAccessTab; label: string; hint: string }[] = [
    {
      id: 'membres',
      label: 'Membres',
      hint: 'Invitations, rôles métier, accès individuels',
    },
    {
      id: 'roles',
      label: 'Rôles & permissions',
      hint: 'Niveaux d’accès et profils types',
    },
  ];

  return (
    <SectionWrapper title="Utilisateurs & accès">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className="block">{tab.label}</span>
                <span
                  className={`block text-[10px] font-normal mt-0.5 ${
                    active ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {tab.hint}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'membres' && (
          <UserManagementSection
            embedded
            appState={appState}
            currentTeamId={currentTeamId}
            onApprove={onApprove}
            onDeny={onDeny}
            onInvite={onInvite}
            onRemove={onRemove}
            onUpdateRole={onUpdateRole}
            onUpdatePermissionRole={onUpdatePermissionRole}
            onUpdateUserCustomPermissions={onUpdateUserCustomPermissions}
            onTransferUser={onTransferUser}
          />
        )}

        {activeTab === 'roles' && (
          <PermissionsSection
            embedded
            permissions={permissions}
            setPermissions={setPermissions}
            permissionRoles={permissionRoles}
            setPermissionRoles={setPermissionRoles}
            users={users}
            onSave={onSave}
          />
        )}
      </div>
    </SectionWrapper>
  );
};

export default TeamAccessSection;

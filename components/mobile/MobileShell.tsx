import React, { useState, useCallback } from 'react';
import { AppSection, User, UserRole } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  MOBILE_BOTTOM_TABS,
  getMobileTabProfile,
  shouldShowMobileTabBar,
} from '../../constants/mobileSections';
import MobileHeader from './MobileHeader';
import BottomTabBar from './BottomTabBar';
import InstallPwaPrompt from './InstallPwaPrompt';
import Sidebar from '../Sidebar';
import {
  Team,
  PermissionLevel,
  StaffMember,
  PermissionRole,
} from '../../types';

interface MobileShellProps {
  currentSection: AppSection;
  onSelectSection: (section: AppSection, eventId?: string) => void;
  teamLogoUrl?: string;
  onLogout: () => void;
  currentUser: User;
  effectivePermissions: Partial<Record<AppSection, PermissionLevel[]>>;
  staff: StaffMember[];
  permissionRoles: PermissionRole[];
  userTeams: Team[];
  currentTeamId: string | null;
  onTeamSwitch: (teamId: string) => void;
  isIndependent: boolean;
  onGoToLobby: () => void;
  children: React.ReactNode;
  lockedSections?: AppSection[];
  subscriptionBanner?: React.ReactNode;
}

const MobileShell: React.FC<MobileShellProps> = ({
  currentSection,
  onSelectSection,
  teamLogoUrl,
  onLogout,
  currentUser,
  effectivePermissions,
  staff,
  permissionRoles,
  userTeams,
  currentTeamId,
  onTeamSwitch,
  isIndependent,
  onGoToLobby,
  children,
  lockedSections = [],
  subscriptionBanner,
}) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showTabBar = isMobile && shouldShowMobileTabBar(isIndependent, currentUser.userRole as UserRole);
  const tabProfile = getMobileTabProfile(currentUser.userRole as UserRole, isIndependent);
  const tabs = MOBILE_BOTTOM_TABS[tabProfile];

  const handleSelectSection = useCallback(
    (section: AppSection, eventId?: string) => {
      onSelectSection(section, eventId);
      setDrawerOpen(false);
    },
    [onSelectSection]
  );

  const sidebar = (
    <Sidebar
      currentSection={currentSection}
      onSelectSection={handleSelectSection}
      teamLogoUrl={teamLogoUrl}
      onLogout={onLogout}
      currentUser={currentUser}
      effectivePermissions={effectivePermissions}
      staff={staff}
      permissionRoles={permissionRoles}
      userTeams={userTeams}
      currentTeamId={currentTeamId}
      onTeamSwitch={onTeamSwitch}
      isIndependent={isIndependent}
      onGoToLobby={onGoToLobby}
      isMobile={isMobile}
      isDrawerOpen={drawerOpen}
      onDrawerClose={() => setDrawerOpen(false)}
      lockedSections={lockedSections}
    />
  );

  if (!isMobile) {
    return (
      <div className="flex min-h-screen w-full">
        {sidebar}
        <main className="main-content flex-1 bg-gray-100 min-h-screen ml-72">
          {subscriptionBanner}
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {drawerOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40"
          aria-label="Fermer le menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {sidebar}

      <MobileHeader
        currentSection={currentSection}
        teamLogoUrl={teamLogoUrl}
        onMenuClick={() => setDrawerOpen(true)}
        isIndependent={isIndependent}
      />

      <main
        className={`main-content flex-1 bg-gray-100 min-h-screen pt-14 px-4 ${
          showTabBar ? 'pb-24' : 'pb-6'
        }`}
      >
        {subscriptionBanner}
        {children}
      </main>

      {showTabBar && (
        <BottomTabBar
          tabs={
            isIndependent && currentUser.userRole !== UserRole.STAFF
              ? tabs.filter((tab) => tab.section !== 'missionSearch')
              : tabs
          }
          currentSection={currentSection}
          onSelectSection={handleSelectSection}
          onMoreClick={() => setDrawerOpen(true)}
        />
      )}

      <InstallPwaPrompt />
    </div>
  );
};

export default MobileShell;

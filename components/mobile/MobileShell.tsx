import React, { useState, useCallback } from 'react';
import { AppSection, User, UserRole, Rider, UserNotification, IncomeItem } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  MOBILE_BOTTOM_TABS,
  getMobileTabProfile,
  shouldShowMobileTabBar,
} from '../../constants/mobileSections';
import MobileHeader from './MobileHeader';
import BottomTabBar from './BottomTabBar';
import InstallPwaPrompt from './InstallPwaPrompt';
import NotificationBell from '../NotificationBell';
import Sidebar from '../Sidebar';
import PageContent from '../PageContent';
import SuperAdminPreviewBanner from '../SuperAdminPreviewBanner';
import {
  SuperAdminPreviewConfig,
  isSuperAdminRolePreview,
} from '../../utils/superAdminPreview';
import { isSuperAdminUser } from '../../utils/superAdminUtils';
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
  realUser?: User;
  superAdminPreview?: SuperAdminPreviewConfig;
  onSuperAdminPreviewChange?: (config: SuperAdminPreviewConfig) => void;
  riders?: Rider[];
  incomeItems?: IncomeItem[];
  onExitSuperAdminPreview?: () => void;
  notifications?: UserNotification[];
  notificationUnreadCount?: number;
  pushPermission?: NotificationPermission;
  pushSupported?: boolean;
  onEnablePush?: () => Promise<NotificationPermission>;
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onOpenConvocation?: (eventId: string) => void;
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
  realUser,
  superAdminPreview,
  onSuperAdminPreviewChange,
  riders = [],
  incomeItems = [],
  onExitSuperAdminPreview,
  notifications = [],
  notificationUnreadCount = 0,
  pushPermission = 'default',
  pushSupported = false,
  onEnablePush,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenConvocation,
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

  const showRolePreview =
    !!realUser &&
    !!superAdminPreview &&
    isSuperAdminRolePreview(isSuperAdminUser(realUser), superAdminPreview);

  const previewBanner =
    showRolePreview && superAdminPreview && onExitSuperAdminPreview ? (
      <SuperAdminPreviewBanner
        preview={superAdminPreview}
        riders={riders}
        staff={staff}
        incomeItems={incomeItems}
        onExitPreview={onExitSuperAdminPreview}
      />
    ) : null;

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
      realUser={realUser}
      superAdminPreview={superAdminPreview}
      onSuperAdminPreviewChange={onSuperAdminPreviewChange}
      riders={riders}
      incomeItems={incomeItems}
    />
  );

  const notificationBell =
    onMarkNotificationRead && onMarkAllNotificationsRead && onOpenConvocation && onEnablePush ? (
      <NotificationBell
        notifications={notifications}
        unreadCount={notificationUnreadCount}
        pushPermission={pushPermission}
        pushSupported={pushSupported}
        onEnablePush={onEnablePush}
        onMarkRead={onMarkNotificationRead}
        onMarkAllRead={onMarkAllNotificationsRead}
        onOpenConvocation={onOpenConvocation}
        variant={isMobile ? 'mobile' : 'desktop'}
      />
    ) : null;

  const isImmersiveDashboard =
    currentSection === 'myDashboard' || currentSection === 'adminDashboard';

  if (!isMobile) {
    return (
      <div className="lc-app-shell flex min-h-screen w-full">
        <div className="lc-app-shell-bg" aria-hidden />
        {sidebar}
        <main className="main-content relative z-10 flex-1 min-h-screen ml-72">
          {notificationBell && (
            <div className="absolute top-4 right-6 z-30">{notificationBell}</div>
          )}
          {previewBanner}
          {subscriptionBanner}
          <PageContent immersive={isImmersiveDashboard}>{children}</PageContent>
        </main>
      </div>
    );
  }

  return (
    <div className="lc-app-shell flex min-h-screen w-full">
      <div className="lc-app-shell-bg" aria-hidden />
      {drawerOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
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
        notificationBell={notificationBell}
      />

      <main
        className={`main-content relative z-10 flex-1 min-h-screen pt-14 ${
          showTabBar ? 'pb-24' : 'pb-4'
        }`}
      >
        {previewBanner}
        {subscriptionBanner}
        <PageContent immersive={isImmersiveDashboard}>{children}</PageContent>
      </main>

      {showTabBar && (
        <BottomTabBar
          tabs={tabs}
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

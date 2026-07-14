import { AppSection, UserRole } from '../types';
import { TranslationKey } from '../translations';

export const MOBILE_BREAKPOINT = 768;

export interface MobileTabConfig {
  section: AppSection;
  labelKey: TranslationKey;
  icon: string;
}

export const MOBILE_BOTTOM_TABS: Record<'rider' | 'staff' | 'manager' | 'independent', MobileTabConfig[]> = {
  rider: [
    { section: 'myDashboard', labelKey: 'mobileTabHome', icon: 'HomeIcon' },
    { section: 'myCalendar', labelKey: 'mobileTabCalendar', icon: 'CalendarDaysIcon' },
    { section: 'myTrips', labelKey: 'mobileTabTrips', icon: 'PaperAirplaneIcon' },
    { section: 'myProfile', labelKey: 'mobileTabProfile', icon: 'IdentificationIcon' },
  ],
  staff: [
    { section: 'myDashboard', labelKey: 'mobileTabHome', icon: 'HomeIcon' },
    { section: 'expenseReceipts', labelKey: 'mobileTabReceipts', icon: 'DocumentTextIcon' },
    { section: 'myTrips', labelKey: 'mobileTabTrips', icon: 'PaperAirplaneIcon' },
    { section: 'myCalendar', labelKey: 'mobileTabCalendar', icon: 'CalendarDaysIcon' },
  ],
  manager: [
    { section: 'myDashboard', labelKey: 'mobileTabHome', icon: 'HomeIcon' },
    { section: 'events', labelKey: 'mobileTabCalendar', icon: 'CalendarDaysIcon' },
    { section: 'roster', labelKey: 'mobileTabRoster', icon: 'UsersIcon' },
    { section: 'userSettings', labelKey: 'mobileTabSettings', icon: 'Cog6ToothIcon' },
  ],
  independent: [
    { section: 'independentHub', labelKey: 'mobileTabHome', icon: 'HomeIcon' },
    { section: 'myCareer', labelKey: 'mobileTabCareer', icon: 'TrophyIcon' },
    { section: 'missionSearch', labelKey: 'mobileTabMissions', icon: 'BriefcaseIcon' },
    { section: 'userSettings', labelKey: 'mobileTabSettings', icon: 'Cog6ToothIcon' },
  ],
};

/** Sections accessibles en navigation mobile (drawer « Plus »). */
export const MOBILE_SECTIONS_BY_ROLE: Partial<Record<UserRole, AppSection[]>> = {
  [UserRole.COUREUR]: [
    'myDashboard', 'myCalendar', 'myTrips', 'nutrition', 'myProfile',
    'myResults', 'riderEquipment', 'bikeSetup', 'myCareer', 'userSettings',
  ],
  [UserRole.STAFF]: [
    'myDashboard', 'myCalendar', 'myTrips', 'expenseReceipts', 'missionSearch', 'myProfile', 'userSettings',
  ],
  [UserRole.MANAGER]: [
    'myDashboard', 'events', 'roster', 'season-planning', 'staff', 'performance',
    'scouting', 'vehicles', 'equipment', 'financial', 'expenseReceipts', 'userSettings',
  ],
};

export type MobileTabProfile = keyof typeof MOBILE_BOTTOM_TABS;

export function getMobileTabProfile(
  userRole: UserRole | undefined,
  isIndependent: boolean
): MobileTabProfile {
  if (isIndependent) return 'independent';
  if (userRole === UserRole.COUREUR) return 'rider';
  if (userRole === UserRole.STAFF) return 'staff';
  return 'manager';
}

export function shouldShowMobileTabBar(isIndependent: boolean, userRole?: UserRole): boolean {
  if (isIndependent) return true;
  return (
    userRole === UserRole.COUREUR ||
    userRole === UserRole.STAFF ||
    userRole === UserRole.MANAGER
  );
}

export type SidebarGroupKey =
  | 'dashboard'
  | 'mySpace'
  | 'team'
  | 'logistics'
  | 'finance'
  | 'administration';

export const SIDEBAR_GROUPS: Record<SidebarGroupKey, Record<'fr' | 'en', string>> = {
  dashboard: { fr: 'Tableau de bord', en: 'Dashboard' },
  mySpace: { fr: 'Mon Espace', en: 'My Space' },
  team: { fr: 'Équipe', en: 'Team' },
  logistics: { fr: 'Logistique', en: 'Logistics' },
  finance: { fr: 'Finances', en: 'Finance' },
  administration: { fr: 'Administration', en: 'Administration' },
};

export const SIDEBAR_GROUP_ORDER: SidebarGroupKey[] = [
  'dashboard',
  'mySpace',
  'team',
  'logistics',
  'finance',
  'administration',
];

export function getSidebarGroupLabel(key: SidebarGroupKey, language: 'fr' | 'en'): string {
  return SIDEBAR_GROUPS[key][language] || SIDEBAR_GROUPS[key].fr;
}

export function getSectionGroupKey(sectionId: string): SidebarGroupKey | undefined {
  return SECTION_GROUP_MAP[sectionId];
}

export function getSectionGroupLabel(
  sectionId: string,
  language: 'fr' | 'en'
): string | undefined {
  const key = getSectionGroupKey(sectionId);
  return key ? getSidebarGroupLabel(key, language) : undefined;
}

const SECTION_GROUP_MAP: Record<string, SidebarGroupKey> = {
  myDashboard: 'dashboard',
  events: 'dashboard',
  myCalendar: 'mySpace',
  myProfile: 'mySpace',
  myResults: 'mySpace',
  myTrips: 'mySpace',
  myCareer: 'mySpace',
  myStages: 'mySpace',
  missionSearch: 'mySpace',
  teamSearch: 'mySpace',
  nutrition: 'mySpace',
  riderEquipment: 'mySpace',
  adminDossier: 'mySpace',
  performance: 'team',
  roster: 'team',
  'season-planning': 'team',
  staff: 'team',
  scouting: 'team',
  equipment: 'logistics',
  vehicles: 'logistics',
  stocks: 'logistics',
  accommodationHistory: 'logistics',
  financial: 'finance',
  expenseReceipts: 'finance',
  adminDashboard: 'administration',
  organizationDashboard: 'administration',
  partnerPortal: 'administration',
  userSettings: 'administration',
  settings: 'administration',
  pricing: 'administration',
  userManagement: 'administration',
  permissions: 'administration',
  checklist: 'administration',
  superAdmin: 'administration',
};

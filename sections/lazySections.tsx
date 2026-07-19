import React, { Suspense, ComponentType } from 'react';
import { lazyWithReload } from '../utils/lazyWithReload';

function SectionLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-12 min-h-[200px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  );
}

export function SectionSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SectionLoadingFallback />}>{children}</Suspense>;
}

function lazyNamed<T extends ComponentType<any>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string
): React.LazyExoticComponent<T> {
  return lazyWithReload(() => loader().then((mod) => ({ default: mod[exportName] })));
}

export const LazyEventDetailView = lazyWithReload(() => import('../EventDetailView'));
export const LazyAdminDossierSection = lazyWithReload(() => import('./AdminDossierSection'));
export const LazyAdminDashboardSection = lazyWithReload(() => import('./AdminDashboardSection'));
export const LazySuperAdminSection = lazyWithReload(() => import('./SuperAdminSection'));
export const LazyAutomatedPerformanceProfileSection = lazyNamed(
  () => import('./AutomatedPerformanceProfileSection'),
  'AutomatedPerformanceProfileSection'
);
export const LazyCareerSection = lazyWithReload(() => import('./CareerSection'));
export const LazyChecklistSection = lazyWithReload(() => import('./ChecklistSection'));
export const LazyEquipmentSection = lazyWithReload(() => import('./EquipmentSection'));
export const LazyEventsSection = lazyNamed(() => import('./EventsSection'), 'EventsSection');
export const LazyFinancialSection = lazyNamed(() => import('./FinancialSection'), 'FinancialSection');
export const LazyMissionSearchSection = lazyWithReload(() => import('./MissionSearchSection'));
export const LazyTeamSearchSection = lazyWithReload(() => import('./TeamSearchSection'));
export const LazyMyTripsSection = lazyWithReload(() => import('./MyTripsSection'));
export const LazyNutritionSection = lazyWithReload(() => import('./NutritionSection'));
export const LazyPerformanceProjectSection = lazyNamed(
  () => import('./PerformanceProjectSection'),
  'PerformanceProjectSection'
);
export const LazyMyPerformanceSection = lazyWithReload(() => import('./MyPerformanceSection'));
export const LazyPerformanceSection = lazyWithReload(() => import('./PerformanceSection'));
export const LazyPerformancePoleSection = lazyWithReload(() => import('./PerformancePoleSection'));
export const LazyPermissionsSection = lazyWithReload(() => import('./PermissionsSection'));
export const LazyTeamAccessSection = lazyWithReload(() => import('./TeamAccessSection'));
export const LazyRiderEquipmentSection = lazyWithReload(() => import('./RiderEquipmentSection'));
export const LazyRosterSection = lazyWithReload(() => import('./RosterSection'));
export const LazySeasonPlanningSection = lazyWithReload(() => import('./SeasonPlanningSection'));
export const LazyScoutingSection = lazyWithReload(() => import('./ScoutingSection'));
export const LazySettingsSection = lazyWithReload(() => import('./SettingsSection'));
export const LazyStaffSection = lazyWithReload(() => import('./StaffSection'));
export const LazyStocksSection = lazyWithReload(() => import('./StocksSection'));
export const LazyAccommodationHistorySection = lazyNamed(
  () => import('./AccommodationHistorySection'),
  'AccommodationHistorySection'
);
export const LazyUserManagementSection = lazyWithReload(() => import('./UserManagementSection'));
export const LazyUserSettingsSection = lazyWithReload(() => import('./UserSettingsSection'));
export const LazyVehiclesSection = lazyWithReload(() => import('./VehiclesSection'));
export const LazyMyDashboardSection = lazyWithReload(() => import('./MyDashboardSection'));
export const LazyMyProfileSection = lazyWithReload(() => import('./MyProfileSection'));
export const LazyMyCalendarSection = lazyWithReload(() => import('./MyCalendarSection'));
export const LazyIndependentStaffCalendarSection = lazyWithReload(() => import('./IndependentStaffCalendarSection'));
export const LazyIndependentAthleteCalendarSection = lazyWithReload(() => import('./IndependentAthleteCalendarSection'));
export const LazyMyResultsSection = lazyWithReload(() => import('./MyResultsSection'));
export const LazyBikeSetupSection = lazyWithReload(() => import('./BikeSetupSection'));
export const LazyMyCareerSection = lazyWithReload(() => import('./MyCareerSection'));
export const LazyMyAdminSection = lazyWithReload(() => import('./MyAdminSection'));
export const LazyIndependentSpaceSection = lazyWithReload(() => import('./IndependentSpaceSection'));
export const LazyIndependentDashboardSection = lazyWithReload(() => import('./IndependentDashboardSection'));
export const LazyPricingSection = lazyWithReload(() => import('./PricingSection'));
export const LazyExpenseReceiptsSection = lazyWithReload(() => import('./ExpenseReceiptsSection'));
export const LazyOrganizationDashboardSection = lazyWithReload(() => import('./OrganizationDashboardSection'));
export const LazyPartnerPortalSection = lazyWithReload(() => import('./PartnerPortalSection'));

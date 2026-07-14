import React, { lazy, Suspense, ComponentType } from 'react';

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
  return lazy(() => loader().then((mod) => ({ default: mod[exportName] })));
}

export const LazyEventDetailView = lazy(() => import('../EventDetailView'));
export const LazyAdminDossierSection = lazy(() => import('./AdminDossierSection'));
export const LazyAdminDashboardSection = lazy(() => import('./AdminDashboardSection'));
export const LazySuperAdminSection = lazy(() => import('./SuperAdminSection'));
export const LazyAutomatedPerformanceProfileSection = lazyNamed(
  () => import('./AutomatedPerformanceProfileSection'),
  'AutomatedPerformanceProfileSection'
);
export const LazyCareerSection = lazy(() => import('./CareerSection'));
export const LazyChecklistSection = lazy(() => import('./ChecklistSection'));
export const LazyEquipmentSection = lazy(() => import('./EquipmentSection'));
export const LazyEventsSection = lazyNamed(() => import('./EventsSection'), 'EventsSection');
export const LazyFinancialSection = lazyNamed(() => import('./FinancialSection'), 'FinancialSection');
export const LazyMissionSearchSection = lazy(() => import('./MissionSearchSection'));
export const LazyMyTripsSection = lazy(() => import('./MyTripsSection'));
export const LazyNutritionSection = lazy(() => import('./NutritionSection'));
export const LazyPerformanceProjectSection = lazyNamed(
  () => import('./PerformanceProjectSection'),
  'PerformanceProjectSection'
);
export const LazyPerformanceSection = lazy(() => import('./PerformanceSection'));
export const LazyPerformancePoleSection = lazy(() => import('./PerformancePoleSection'));
export const LazyPermissionsSection = lazy(() => import('./PermissionsSection'));
export const LazyRiderEquipmentSection = lazy(() => import('./RiderEquipmentSection'));
export const LazyRosterSection = lazy(() => import('./RosterSection'));
export const LazySeasonPlanningSection = lazy(() => import('./SeasonPlanningSection'));
export const LazyScoutingSection = lazy(() => import('./ScoutingSection'));
export const LazySettingsSection = lazy(() => import('./SettingsSection'));
export const LazyStaffSection = lazy(() => import('./StaffSection'));
export const LazyStocksSection = lazy(() => import('./StocksSection'));
export const LazyAccommodationHistorySection = lazyNamed(
  () => import('./AccommodationHistorySection'),
  'AccommodationHistorySection'
);
export const LazyUserManagementSection = lazy(() => import('./UserManagementSection'));
export const LazyUserSettingsSection = lazy(() => import('./UserSettingsSection'));
export const LazyVehiclesSection = lazy(() => import('./VehiclesSection'));
export const LazyMyDashboardSection = lazy(() => import('./MyDashboardSection'));
export const LazyMyProfileSection = lazy(() => import('./MyProfileSection'));
export const LazyMyCalendarSection = lazy(() => import('./MyCalendarSection'));
export const LazyMyResultsSection = lazy(() => import('./MyResultsSection'));
export const LazyBikeSetupSection = lazy(() => import('./BikeSetupSection'));
export const LazyMyCareerSection = lazy(() => import('./MyCareerSection'));
export const LazyMyAdminSection = lazy(() => import('./MyAdminSection'));
export const LazyTalentAvailabilitySection = lazy(() => import('./TalentAvailabilitySection'));
export const LazyIndependentSpaceSection = lazy(() => import('./IndependentSpaceSection'));
export const LazyPricingSection = lazy(() => import('./PricingSection'));
export const LazyExpenseReceiptsSection = lazy(() => import('./ExpenseReceiptsSection'));

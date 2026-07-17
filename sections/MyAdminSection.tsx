import React, { useMemo } from 'react';
import {
  Rider,
  User,
  RaceEvent,
  RiderEventSelection,
  AppState,
  PermissionLevel,
  RiderEventPreference,
  StaffMember,
  UserRole,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import { RiderDetailModal } from '../components/RiderDetailModal';
import StaffMyProfileWorkspace from '../components/StaffMyProfileWorkspace';
import ShieldCheckIcon from '../components/icons/ShieldCheckIcon';
import { useTranslations } from '../hooks/useTranslations';
import { getRiderProfileForUser } from '../utils/eventRiderUtils';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';
import { buildRiderDossierCompletion } from '../utils/riderDossierUtils';
import { buildRiderContractSummary } from '../utils/contractUtils';
import { formatFinancialAmount } from '../utils/financialUtils';

interface MyAdminSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  onSaveRider: (rider: Rider) => void | Promise<void>;
  onSaveStaff: (staff: StaffMember) => void | Promise<void>;
  onUpdateRiderPreference?: (
    eventId: string,
    riderId: string,
    preference: RiderEventPreference,
    objectives?: string
  ) => void;
  appState: AppState;
  effectivePermissions: Record<string, PermissionLevel[]>;
}

const POWER_DURATIONS_CONFIG = [
  { key: 'power1s' as const, label: '1s', unit: 'W', sortable: true },
  { key: 'power5s' as const, label: '5s', unit: 'W', sortable: true },
  { key: 'power30s' as const, label: '30s', unit: 'W', sortable: true },
  { key: 'power1min' as const, label: '1min', unit: 'W', sortable: true },
  { key: 'power3min' as const, label: '3min', unit: 'W', sortable: true },
  { key: 'power5min' as const, label: '5min', unit: 'W', sortable: true },
  { key: 'power12min' as const, label: '12min', unit: 'W', sortable: true },
  { key: 'power20min' as const, label: '20min', unit: 'W', sortable: true },
  { key: 'criticalPower' as const, label: 'CP', unit: 'W', sortable: true },
];

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const MyAdminSection: React.FC<MyAdminSectionProps> = ({
  riders,
  staff,
  currentUser,
  raceEvents,
  riderEventSelections,
  onSaveRider,
  onSaveStaff,
  onUpdateRiderPreference,
  appState,
  effectivePermissions,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const riderProfile = getRiderProfileForUser(riders, currentUser);
  const staffProfile = getStaffMemberForUser(currentUser, staff);
  const isStaffUser =
    currentUser.userRole === UserRole.STAFF ||
    (currentUser.userRole === UserRole.MANAGER && Boolean(staffProfile));

  const riderDossier = useMemo(
    () => (riderProfile ? buildRiderDossierCompletion(riderProfile) : null),
    [riderProfile]
  );

  const contractSummary = useMemo(
    () => (riderProfile ? buildRiderContractSummary(riderProfile) : null),
    [riderProfile]
  );

  // Staff : espace fusionné « Mon Profil »
  if (isStaffUser) {
    return (
      <StaffMyProfileWorkspace
        staff={staff}
        currentUser={currentUser}
        onSaveStaff={onSaveStaff}
        title="Mon Profil"
      />
    );
  }

  if (!riderProfile) {
    return (
      <SectionWrapper title={t('titleMyAdminFile')} subtitle={t('adminDossierSubtitle')}>
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-700">{t('adminDossierNotFound')}</p>
          <p className="mt-2 text-sm text-gray-500">{t('adminDossierNotFoundHint')}</p>
        </div>
      </SectionWrapper>
    );
  }

  const missingChecks = riderDossier?.checks.filter((c) => !c.ok && !c.warning) ?? [];

  return (
    <SectionWrapper
      title={t('titleMyAdminFile')}
      subtitle={t('adminDossierSubtitle')}
      variant="hub"
      hideTitleOnMobile
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4">
          <div className="flex flex-wrap items-start gap-4">
            {riderProfile.photoUrl ? (
              <img
                src={riderProfile.photoUrl}
                alt={`${riderProfile.firstName} ${riderProfile.lastName}`}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-xl font-bold text-white shadow-md">
                {riderProfile.firstName?.[0] || 'C'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {riderProfile.firstName} {riderProfile.lastName}
              </h2>
              <p className="text-sm text-gray-600">{riderProfile.teamName || t('adminDossierTeamFallback')}</p>
              {riderDossier && (
                <div className="mt-3 max-w-md">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{t('adminDossierCompletion')}</span>
                    <span className="font-semibold text-violet-700">{riderDossier.percent}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-violet-100">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{ width: `${riderDossier.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {riderDossier.done}/{riderDossier.total} {t('adminDossierBlocksDone')}
                  </p>
                </div>
              )}
            </div>
            {contractSummary && contractSummary.monthlySalary > 0 && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  {t('adminDossierMonthlyPay')}
                </p>
                <p className="text-lg font-bold text-emerald-900">
                  {formatFinancialAmount(contractSummary.monthlySalary, locale)}
                </p>
                <p className="text-[11px] text-emerald-700">{t('adminDossierPayReadOnly')}</p>
              </div>
            )}
          </div>
        </div>

        {missingChecks.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">{t('adminDossierMissingTitle')}</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {missingChecks.map((c) => (
                <li key={c.key}>{language === 'fr' ? c.labelFr : c.labelEn}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-gray-500">{t('adminDossierHelp')}</p>

        <RiderDetailModal
          embedded
          rider={riderProfile}
          isOpen
          onClose={() => {}}
          onSaveRider={onSaveRider}
          onUpdateRiderPreference={onUpdateRiderPreference}
          raceEvents={raceEvents}
          riderEventSelections={riderEventSelections}
          performanceEntries={[]}
          powerDurationsConfig={POWER_DURATIONS_CONFIG}
          calculateWkg={(power?: number, weight?: number) => {
            if (!power || !weight) return '-';
            return (power / weight).toFixed(1);
          }}
          appState={appState}
          currentUser={currentUser}
          effectivePermissions={effectivePermissions}
          initialTab="admin"
          isEditMode
          adminDossierMode
        />
      </div>
    </SectionWrapper>
  );
};

export default MyAdminSection;

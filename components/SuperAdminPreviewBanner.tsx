import React from 'react';
import { IncomeItem, Rider, StaffMember } from '../types';
import {
  getSuperAdminPreviewLabel,
  SuperAdminPreviewConfig,
} from '../utils/superAdminPreview';

interface SuperAdminPreviewBannerProps {
  preview: SuperAdminPreviewConfig;
  riders: Rider[];
  staff: StaffMember[];
  incomeItems?: IncomeItem[];
  onExitPreview: () => void;
}

const SuperAdminPreviewBanner: React.FC<SuperAdminPreviewBannerProps> = ({
  preview,
  riders,
  staff,
  incomeItems = [],
  onExitPreview,
}) => (
  <div className="bg-amber-500 text-amber-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
    <span>
      <strong>Mode aperçu :</strong> {getSuperAdminPreviewLabel(preview, riders, staff, incomeItems)}
      <span className="opacity-80 ml-2">— navigation et menu comme ce profil</span>
    </span>
    <button
      type="button"
      onClick={onExitPreview}
      className="shrink-0 rounded-md bg-amber-950/15 px-3 py-1 text-xs font-semibold hover:bg-amber-950/25"
    >
      Revenir au mode Super Admin
    </button>
  </div>
);

export default SuperAdminPreviewBanner;

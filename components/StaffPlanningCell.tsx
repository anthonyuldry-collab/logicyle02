import React from 'react';
import {
  StaffEventSelection,
  StaffEventStatus,
  StaffEventPreference,
  StaffMember,
  User,
} from '../types';
import {
  submitStaffCandidature,
  declineStaffCandidature,
  validateStaffCandidature,
  cycleStaffAssignment,
  formatValidationLabel,
  getCandidatureLabel,
  isPendingCandidature,
  isOwnStaffMember,
  isStaffPlanningValidator,
} from '../utils/staffPlanningUtils';

interface StaffPlanningCellProps {
  eventId: string;
  member: StaffMember;
  selection: StaffEventSelection | undefined;
  currentUser: User;
  staff: StaffMember[];
  staffEventSelections: StaffEventSelection[];
  setStaffEventSelections: (updater: React.SetStateAction<StaffEventSelection[]>) => void;
  compact?: boolean;
}

const StaffPlanningCell: React.FC<StaffPlanningCellProps> = ({
  eventId,
  member,
  selection,
  currentUser,
  staff,
  staffEventSelections,
  setStaffEventSelections,
  compact = false,
}) => {
  const canValidate = isStaffPlanningValidator(currentUser, staff);
  const isOwn = isOwnStaffMember(currentUser, member);
  const canCandidater = isOwn;
  const label = getCandidatureLabel(selection);
  const pending = isPendingCandidature(selection);
  const validationText = formatValidationLabel(selection);
  const btn = compact ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-1';

  const candidatureClass =
    label === 'Retenu'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : label === 'Candidaté'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : label === 'Refusé' || label === 'Indispo'
          ? 'bg-slate-100 text-slate-600 border-slate-200'
          : 'bg-white text-gray-400 border-gray-200';

  const cycleTitle =
    label === 'Retenu'
      ? 'Cliquer : passer en Non'
      : label === 'Refusé' || label === 'Indispo'
        ? 'Cliquer : réinitialiser'
        : 'Cliquer : retenir sur cet événement';

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {/* Candidature staff (sa propre ligne) */}
      {canCandidater ? (
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() =>
              submitStaffCandidature(eventId, member.id, staffEventSelections, setStaffEventSelections)
            }
            className={`flex-1 rounded border font-medium transition-colors hover:bg-emerald-50 border-emerald-200 text-emerald-800 ${btn} ${
              selection?.staffPreference === StaffEventPreference.VEUT_PARTICIPER &&
              selection?.status === StaffEventStatus.EN_ATTENTE
                ? 'bg-emerald-50 ring-1 ring-emerald-300'
                : 'bg-white'
            }`}
            title="Je candidate pour cet événement"
          >
            Candidater
          </button>
          <button
            type="button"
            onClick={() =>
              declineStaffCandidature(eventId, member.id, staffEventSelections, setStaffEventSelections)
            }
            className={`flex-1 rounded border font-medium transition-colors hover:bg-red-50 border-red-200 text-red-700 ${btn} ${
              selection?.staffPreference === StaffEventPreference.NE_VEUT_PAS ||
              selection?.staffPreference === StaffEventPreference.ABSENT
                ? 'bg-red-50 ring-1 ring-red-200'
                : 'bg-white'
            }`}
            title="Je ne suis pas disponible"
          >
            Indispo
          </button>
        </div>
      ) : canValidate ? (
        <button
          type="button"
          onClick={() =>
            cycleStaffAssignment(
              eventId,
              member.id,
              selection,
              currentUser,
              staffEventSelections,
              setStaffEventSelections,
            )
          }
          className={`w-full rounded border text-center font-semibold transition-colors hover:ring-2 hover:ring-blue-300 cursor-pointer ${btn} py-1 ${candidatureClass}`}
          title={cycleTitle}
        >
          {label}
        </button>
      ) : (
        <div
          className={`w-full rounded border text-center font-medium ${btn} py-1 ${candidatureClass}`}
          title="Candidature"
        >
          {label}
        </div>
      )}

      {/* Réponse DS / manager — toujours disponible pour assigner */}
      {canValidate && (
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() =>
              validateStaffCandidature(
                eventId,
                member.id,
                true,
                currentUser,
                staffEventSelections,
                setStaffEventSelections,
              )
            }
            className={`flex-1 rounded border font-semibold transition-colors hover:bg-green-50 border-green-300 text-green-800 ${btn} ${
              selection?.status === StaffEventStatus.SELECTIONNE ? 'bg-green-50 ring-1 ring-green-300' : 'bg-white'
            }`}
            title="Retenir sur cet événement"
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() =>
              validateStaffCandidature(
                eventId,
                member.id,
                false,
                currentUser,
                staffEventSelections,
                setStaffEventSelections,
              )
            }
            className={`flex-1 rounded border font-semibold transition-colors hover:bg-slate-50 border-slate-300 text-slate-700 ${btn} ${
              selection?.status === StaffEventStatus.NON_SELECTIONNE ||
              selection?.status === StaffEventStatus.REFUSE
                ? 'bg-slate-100 ring-1 ring-slate-300'
                : 'bg-white'
            }`}
            title="Ne pas retenir"
          >
            Non
          </button>
        </div>
      )}

      {pending && canValidate && (
        <p className={`text-amber-700 font-medium text-center ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
          À valider
        </p>
      )}

      {validationText && (
        <p
          className={`text-gray-500 text-center leading-tight ${compact ? 'text-[8px]' : 'text-[9px]'}`}
          title={validationText}
        >
          {validationText}
        </p>
      )}
    </div>
  );
};

export default StaffPlanningCell;

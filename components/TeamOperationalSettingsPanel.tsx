import React from 'react';
import ActionButton from './ActionButton';
import {
  ChecklistRole,
  TeamFicheProfile,
  TeamGender,
  TeamLevel,
  TeamOperationalSettings,
  TeamEventFocus,
  TeamRecruitmentTarget,
  RaceEvent,
} from '../types';
import {
  TEAM_FICHE_PROFILE_OPTIONS,
  TEAM_EVENT_FOCUS_OPTIONS,
} from '../data/teamOperationalPresets';
import {
  getEnabledChecklistRoles,
  getEventFocusLabel,
  getOperationalPreset,
  getRecommendedOperationalSettings,
  normalizeOperationalSettings,
  resolveFicheStructure,
  toggleChecklistRole,
} from '../utils/teamOperationalUtils';
import { getStructureLevelLabel } from '../utils/fichePosteUtils';
import { FICHE_STRUCTURE_LABELS } from '../data/fichePosteCatalog';
import {
  getRecruitmentTargetsForTeam,
  getTeamMarketContext,
  RECRUITMENT_TARGET_OPTIONS,
} from '../utils/riderTeamMarketSegment';
import { TEAM_GENDER_LABELS } from '../utils/teamGenderUtils';
import { useTranslations } from '../hooks/useTranslations';

interface TeamOperationalSettingsPanelProps {
  teamLevel?: TeamLevel;
  operationalSettings?: TeamOperationalSettings;
  raceEvents?: RaceEvent[];
  onChange: (settings: TeamOperationalSettings) => void;
  onSave: () => void;
  onNavigateToChecklist?: () => void;
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const hintClass = 'text-xs text-gray-500 leading-relaxed';

const TeamOperationalSettingsPanel: React.FC<TeamOperationalSettingsPanelProps> = ({
  teamLevel,
  operationalSettings,
  raceEvents,
  onChange,
  onSave,
  onNavigateToChecklist,
}) => {
  const { t } = useTranslations();
  const normalized = normalizeOperationalSettings(teamLevel, operationalSettings);
  const preset = getOperationalPreset(teamLevel);
  const enabledRoles = getEnabledChecklistRoles(teamLevel, normalized);
  const ficheLevel = resolveFicheStructure(teamLevel, normalized);
  const ficheLabel = getStructureLevelLabel(ficheLevel);
  const eventFocusLabel = getEventFocusLabel(normalized, raceEvents);
  const marketContext = getTeamMarketContext(
    teamLevel ? { id: '', name: '', country: '', level: teamLevel } : undefined,
    normalized,
  );
  const availableRecruitmentTargets = getRecruitmentTargetsForTeam(marketContext);

  const handleRoleToggle = (role: ChecklistRole) => {
    const current = normalized.enabledChecklistRoles ?? [];
    onChange({
      ...normalized,
      enabledChecklistRoles: toggleChecklistRole(current, role),
    });
  };

  const handleFicheProfileChange = (value: TeamFicheProfile) => {
    onChange({ ...normalized, ficheProfile: value });
  };

  const handleEventFocusChange = (value: TeamEventFocus) => {
    onChange({ ...normalized, eventFocus: value });
  };

  const handleRecruitmentTargetChange = (value: TeamRecruitmentTarget) => {
    onChange({ ...normalized, recruitmentTarget: value });
  };

  const handleAcceptApplicationsChange = (checked: boolean) => {
    onChange({ ...normalized, acceptRiderApplications: checked });
  };

  const handleGenderChange = (value: TeamGender) => {
    onChange({ ...normalized, gender: value });
  };

  return (
    <div className="space-y-5">
      <p className={hintClass}>
        Adaptez les <strong>rôles checklist</strong> et le <strong>niveau des fiches de poste</strong> à votre
        secteur d&apos;activité. Un club jeunes n&apos;a pas les mêmes besoins qu&apos;une équipe pro.
      </p>

      <div className="rounded-lg bg-blue-50/80 border border-blue-100 p-4">
        <p className="text-sm font-semibold text-blue-900">{preset.label}</p>
        <p className={`${hintClass} mt-1 text-blue-800`}>{preset.description}</p>
        <p className={`${hintClass} mt-2 text-blue-700`}>
          Fiches : <strong>{ficheLabel}</strong>
          {' · '}
          Calendrier : <strong>{eventFocusLabel}</strong>
        </p>
      </div>

      <div>
        <label className={labelClass}>Focus calendrier (fiches & missions)</label>
        <select
          value={normalized.eventFocus ?? 'auto'}
          onChange={(e) => handleEventFocusChange(e.target.value as TeamEventFocus)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white"
        >
          {TEAM_EVENT_FOCUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className={`${hintClass} mt-1`}>
          {TEAM_EVENT_FOCUS_OPTIONS.find((o) => o.value === (normalized.eventFocus ?? 'auto'))?.hint}
          {normalized.eventFocus === 'auto' && raceEvents?.length
            ? ` Détecté : ${eventFocusLabel}.`
            : ''}
        </p>
      </div>

      <div>
        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer">
          <input
            type="checkbox"
            checked={normalized.acceptRiderApplications !== false}
            onChange={(e) => handleAcceptApplicationsChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="min-w-0">
            <span className="text-sm font-medium text-gray-900">Recevoir les candidatures coureurs</span>
            <span className={`block ${hintClass} mt-0.5`}>
              Affiche votre équipe sur le portail « Chercher une équipe » et autorise les demandes d&apos;adhésion.
            </span>
          </span>
        </label>
      </div>

      <div>
        <label className={labelClass}>{t('teamGenderSetting')}</label>
        <select
          value={normalized.gender ?? 'mixed'}
          onChange={(e) => handleGenderChange(e.target.value as TeamGender)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white"
        >
          <option value="men">{TEAM_GENDER_LABELS.men.fr}</option>
          <option value="women">{TEAM_GENDER_LABELS.women.fr}</option>
          <option value="mixed">{TEAM_GENDER_LABELS.mixed.fr}</option>
        </select>
        <p className={`${hintClass} mt-1`}>{t('teamGenderSettingHint')}</p>
      </div>

      <div>
        <label className={labelClass}>Cible de recrutement (marché talents)</label>
        <select
          value={normalized.recruitmentTarget ?? 'auto'}
          onChange={(e) => handleRecruitmentTargetChange(e.target.value as TeamRecruitmentTarget)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white"
        >
          {RECRUITMENT_TARGET_OPTIONS.filter((opt) => availableRecruitmentTargets.includes(opt.id)).map(
            (opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ),
          )}
        </select>
        <p className={`${hintClass} mt-1`}>
          {RECRUITMENT_TARGET_OPTIONS.find((o) => o.id === (normalized.recruitmentTarget ?? 'auto'))?.hint}
          {' '}Ex. : une WorldTour ne voit que Pro et Elite ; la réserve peut cibler les U19.
        </p>
      </div>

      <div>
        <label className={labelClass}>Profil des fiches de poste</label>
        <select
          value={normalized.ficheProfile ?? 'auto'}
          onChange={(e) => handleFicheProfileChange(e.target.value as TeamFicheProfile)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white"
        >
          {TEAM_FICHE_PROFILE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value !== 'auto' && opt.value in FICHE_STRUCTURE_LABELS
                ? ` — ${FICHE_STRUCTURE_LABELS[opt.value as keyof typeof FICHE_STRUCTURE_LABELS]}`
                : ''}
            </option>
          ))}
        </select>
        <p className={`${hintClass} mt-1`}>
          En mode automatique, le niveau est déduit du secteur : jeunes/club → régional, DN/fédé → national, pro → DN/WT.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className={labelClass}>Rôles actifs (checklists & fiches)</label>
          <ActionButton variant="secondary" size="sm" onClick={() => onChange(getRecommendedOperationalSettings(teamLevel))}>
            Appliquer le profil recommandé
          </ActionButton>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.values(ChecklistRole).map((role) => {
            const isEnabled = enabledRoles.includes(role);
            const isOptional = preset.optionalRoles.includes(role);
            const hint = preset.optionalRoleHints[role];
            return (
              <label
                key={role}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isEnabled
                    ? 'border-blue-200 bg-blue-50/50'
                    : 'border-gray-200 bg-gray-50/50 opacity-80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleRoleToggle(role)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="min-w-0">
                  <span className="text-sm font-medium text-gray-900">{role}</span>
                  {isOptional && !isEnabled && hint && (
                    <span className={`block ${hintClass} mt-0.5 text-amber-700`}>{hint}</span>
                  )}
                  {isEnabled && isOptional && (
                    <span className={`block ${hintClass} mt-0.5`}>Rôle optionnel activé</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        <p className={`${hintClass} mt-2`}>
          {enabledRoles.length} rôle(s) actif(s). Les rôles désactivés sont masqués dans l&apos;éditeur de checklists.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <ActionButton onClick={onSave}>Enregistrer le profil opérationnel</ActionButton>
        {onNavigateToChecklist && (
          <ActionButton variant="secondary" onClick={onNavigateToChecklist}>
            Ouvrir les fiches de poste
          </ActionButton>
        )}
      </div>
    </div>
  );
};

export default TeamOperationalSettingsPanel;

import React, { useState } from 'react';
import {
  User,
  UserRole,
  ScoutingRequest,
  ScoutingRequestStatus,
  Team,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';

interface IndependentSpaceSectionProps {
  currentUser: User;
  teams: Team[];
  scoutingRequests: ScoutingRequest[];
  onUpdateProfile: (updates: Partial<User>) => Promise<void>;
  onRespondToScoutingRequest: (requestId: string, response: 'accepted' | 'rejected') => Promise<void>;
  onGoToLobby: () => void;
}

const IndependentSpaceSection: React.FC<IndependentSpaceSectionProps> = ({
  currentUser,
  teams,
  scoutingRequests,
  onUpdateProfile,
  onRespondToScoutingRequest,
  onGoToLobby,
}) => {
  const { t } = useTranslations();
  const isRider = currentUser.userRole === UserRole.COUREUR;
  const [professionalSummary, setProfessionalSummary] = useState(currentUser.professionalSummary || '');
  const [careerAspirations, setCareerAspirations] = useState(currentUser.careerAspirations || '');
  const [skillsText, setSkillsText] = useState((currentUser.skills || []).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchable, setIsSearchable] = useState(currentUser.isSearchable ?? false);
  const [openToMissions, setOpenToMissions] = useState(currentUser.openToExternalMissions ?? false);

  const myRequests = scoutingRequests.filter(
    (r) => r.athleteId === currentUser.id && r.status === ScoutingRequestStatus.PENDING
  );

  const getTeamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name || teamId;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile({
        professionalSummary,
        careerAspirations,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVisibilityToggle = async () => {
    if (isRider) {
      const next = !isSearchable;
      setIsSearchable(next);
      await onUpdateProfile({ isSearchable: next });
    } else {
      const next = !openToMissions;
      setOpenToMissions(next);
      await onUpdateProfile({ openToExternalMissions: next });
    }
  };

  return (
    <SectionWrapper title={t('independentHubTitle')}>
      <div className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-semibold text-blue-900">{t('independentHubWelcome')}</h2>
          <p className="mt-1 text-sm text-blue-800">{t('independentHubDesc')}</p>
          <ActionButton onClick={onGoToLobby} variant="secondary" className="mt-4">
            {t('independentJoinTeamCta')}
          </ActionButton>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Profil professionnel</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Présentation</label>
              <textarea
                value={professionalSummary}
                onChange={(e) => setProfessionalSummary(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Décrivez votre parcours, vos expériences..."
              />
            </div>
            {isRider ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs sportifs</label>
                <textarea
                  value={careerAspirations}
                  onChange={(e) => setCareerAspirations(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Vos ambitions pour la saison..."
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compétences (séparées par des virgules)</label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Mécanique, soins, logistique..."
                />
              </div>
            )}
            <ActionButton onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer le profil'}
            </ActionButton>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">
                {isRider ? t('independentVisibilityRider') : t('independentVisibilityStaff')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isRider
                  ? 'Les équipes pourront vous découvrir dans le module Scouting / Recrutement.'
                  : 'Les équipes pourront vous contacter pour des missions ponctuelles.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleVisibilityToggle}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                (isRider ? isSearchable : openToMissions) ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  (isRider ? isSearchable : openToMissions) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {isRider && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">{t('independentScoutingRequests')}</h3>
            {myRequests.length === 0 ? (
              <p className="text-sm text-gray-500">{t('independentNoScoutingRequests')}</p>
            ) : (
              <ul className="space-y-3">
                {myRequests.map((req) => (
                  <li key={req.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium text-gray-800">{getTeamName(req.requesterTeamId)}</p>
                      {req.message && <p className="text-sm text-gray-500 mt-1">{req.message}</p>}
                    </div>
                    <div className="flex gap-2">
                      <ActionButton
                        size="sm"
                        onClick={() => onRespondToScoutingRequest(req.id, 'accepted')}
                        icon={<CheckCircleIcon className="w-4 h-4" />}
                      >
                        Accepter
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        variant="secondary"
                        onClick={() => onRespondToScoutingRequest(req.id, 'rejected')}
                        icon={<XCircleIcon className="w-4 h-4" />}
                      >
                        Refuser
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default IndependentSpaceSection;

import React, { useMemo, useState } from 'react';
import { AppState, ScoutingDataScope, ScoutingRequest, User } from '../types';
import { SPIDER_CHART_CHARACTERISTICS_CONFIG, ALL_COUNTRIES } from '../constants';
import { demoUserToScoutingProfile, isDemoTalentUser } from '../constants/demoTalentProfiles';
import {
  getCountryLabel,
  getTalentCharacteristics,
  getTalentDiscipline,
  getCharacteristicCellClass,
  CHARACTERISTIC_SHORT_LABELS,
  getTalentPowerProfile,
  getTalentResultsHistory,
  getTalentPhotoUrl,
  getTalentCareerObjective,
  hasScoutingAccess,
} from '../utils/talentSearchUtils';
import { DISCIPLINE_FILTER_LABELS } from '../constants/demoTalentProfiles';
import {
  ALL_SCOUTING_DATA_SCOPES,
  SCOUTING_DATA_SCOPE_OPTIONS,
  hasScoutingScopeAccess,
  isAthleteOnWatchlist,
} from '../utils/scoutingProspectUtils';
import Modal from './Modal';
import ActionButton from './ActionButton';
import UserCircleIcon from './icons/UserCircleIcon';

interface TalentProfilePreviewModalProps {
  user: User;
  appState: AppState;
  teamScoutingRequests?: ScoutingRequest[];
  onClose: () => void;
  onAddToProspects: (user: User) => void;
  onAddWatchlistProspect?: (user: User) => void;
  onRequestContact?: (user: User, scopes: ScoutingDataScope[]) => void | Promise<void>;
}

const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const TalentRadarChart: React.FC<{ data: { axis: string; value: number }[]; size?: number }> = ({
  data,
  size = 220,
}) => {
  const numAxes = data.length;
  if (numAxes < 3) {
    return <p className="text-xs text-center text-gray-400">Données insuffisantes pour le graphique.</p>;
  }

  const maxValue = 100;
  const angleSlice = (Math.PI * 2) / numAxes;
  const radius = size / 3.2;
  const center = size / 2;

  const points = data
    .map((d, i) => {
      const value = Math.max(0, Math.min(d.value || 0, maxValue));
      const x = center + radius * (value / maxValue) * Math.cos(angleSlice * i - Math.PI / 2);
      const y = center + radius * (value / maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
      return `${x},${y}`;
    })
    .join(' ');

  const axisLines = data.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x2 = center + radius * cosAngle;
    const y2 = center + radius * sinAngle;
    const labelOffset = 14;
    const lx = center + (radius + labelOffset) * cosAngle;
    const ly = center + (radius + labelOffset) * sinAngle;
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    if (lx > center + 4) textAnchor = 'start';
    else if (lx < center - 4) textAnchor = 'end';
    return { x1: center, y1: center, x2, y2, label: d.axis, lx, ly, textAnchor };
  });

  const gridLevels = 5;
  const concentricPolygons = Array.from({ length: gridLevels }).map((_, levelIndex) => {
    const levelRadius = radius * ((levelIndex + 1) / gridLevels);
    return data
      .map((_, i) => {
        const x = center + levelRadius * Math.cos(angleSlice * i - Math.PI / 2);
        const y = center + levelRadius * Math.sin(angleSlice * i - Math.PI / 2);
        return `${x},${y}`;
      })
      .join(' ');
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block">
      <g>
        {concentricPolygons.map((polyPoints, i) => (
          <polygon
            key={`grid-${i}`}
            points={polyPoints}
            fill="none"
            stroke="rgb(229, 231, 235)"
            strokeWidth="0.8"
          />
        ))}
        {axisLines.map((line, i) => (
          <line
            key={`axis-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgb(209, 213, 219)"
            strokeWidth="0.8"
          />
        ))}
        <polygon
          points={points}
          fill="rgba(34, 197, 94, 0.25)"
          stroke="rgb(22, 163, 74)"
          strokeWidth="1.5"
        />
        {axisLines.map((line, i) => (
          <text
            key={`label-${i}`}
            x={line.lx}
            y={line.ly}
            fontSize="9"
            fill="rgb(75, 85, 99)"
            fontWeight="500"
            textAnchor={line.textAnchor}
            dominantBaseline="middle"
          >
            {line.label}
          </text>
        ))}
      </g>
    </svg>
  );
};

const LockedBlock: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

const TalentProfilePreviewModal: React.FC<TalentProfilePreviewModalProps> = ({
  user,
  appState,
  teamScoutingRequests = [],
  onClose,
  onAddToProspects,
  onAddWatchlistProspect,
  onRequestContact,
}) => {
  const riders = appState.riders ?? [];
  const [contactScopes, setContactScopes] = useState<ScoutingDataScope[]>(ALL_SCOUTING_DATA_SCOPES);
  const [showContactForm, setShowContactForm] = useState(false);

  const isDemo = isDemoTalentUser(user.id);
  const hasDataAccess =
    isDemo || hasScoutingAccess(user.id, teamScoutingRequests, ScoutingDataScope.PERFORMANCE_DATA);
  const hasProjectAccess =
    isDemo || hasScoutingScopeAccess(user.id, teamScoutingRequests, ScoutingDataScope.PERFORMANCE_PROJECT);
  const hasAnyAccess = isDemo || hasScoutingAccess(user.id, teamScoutingRequests);
  const onWatchlist = isAthleteOnWatchlist(user.id, appState.scoutingProfiles ?? []);

  const scoutingProfile = useMemo(
    () => (isDemo ? demoUserToScoutingProfile(user) : null),
    [user, isDemo],
  );
  const chars = useMemo(() => getTalentCharacteristics(user, riders), [user, riders]);
  const discipline = getTalentDiscipline(user, riders);
  const nationalityLabel = getCountryLabel(user.signupInfo?.nationality, ALL_COUNTRIES);
  const photoUrl = getTalentPhotoUrl(user, riders);
  const careerObjective = getTalentCareerObjective(user, riders);
  const power =
    scoutingProfile?.powerProfileFresh ??
    scoutingProfile?.powerProfile15KJ ??
    getTalentPowerProfile(user, riders);
  const resultsHistory = scoutingProfile?.resultsHistory ?? getTalentResultsHistory(user, riders);
  const qualitativeNotes = scoutingProfile?.qualitativeNotes;

  const spiderData = SPIDER_CHART_CHARACTERISTICS_CONFIG.map(c => ({
    axis: c.label,
    value: chars[c.key] ?? 0,
  }));

  const hasSpiderData = spiderData.some(d => d.value > 0);

  return (
    <Modal isOpen onClose={onClose} title={`${user.firstName} ${user.lastName}`}>
      <div className="space-y-5">
        {isDemo && (
          <p className="text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded px-3 py-2">
            Aperçu démo — c&apos;est le niveau de détail visible après acceptation de votre demande.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-28 h-28 rounded-xl object-cover border border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                <UserCircleIcon className="w-20 h-20 text-gray-300" />
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Âge</p>
              <p className="font-medium">{getAge(user.signupInfo?.birthDate) ?? '—'} ans</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Nationalité</p>
              <p className="font-medium">{nationalityLabel}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Discipline</p>
              <p className="font-medium">
                {discipline ? (DISCIPLINE_FILTER_LABELS[discipline] ?? discipline) : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Profil</p>
              <p className="font-medium">
                {user.qualitativeProfile || scoutingProfile?.qualitativeProfile || '—'}
              </p>
            </div>
            {user.signupInfo?.heightCm && (
              <div>
                <p className="text-gray-500 text-xs">Taille</p>
                <p className="font-medium">{user.signupInfo.heightCm} cm</p>
              </div>
            )}
            {user.signupInfo?.weightKg && (
              <div>
                <p className="text-gray-500 text-xs">Poids</p>
                <p className="font-medium">{user.signupInfo.weightKg} kg</p>
              </div>
            )}
          </div>
        </div>

        {hasProjectAccess && careerObjective ? (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
              Objectif / projet sportif
            </h4>
            <p className="text-sm text-blue-900">{careerObjective}</p>
          </div>
        ) : !isDemo && !hasProjectAccess ? (
          <LockedBlock message="Projet sportif non partagé par l'athlète." />
        ) : null}

        {hasDataAccess ? (
          <>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Profil radar</h4>
                {hasSpiderData ? (
                  <TalentRadarChart data={spiderData} />
                ) : (
                  <p className="text-xs text-center text-gray-400 py-8">Caractéristiques non renseignées</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Caractéristiques</h4>
                <div className="grid grid-cols-5 gap-1">
                  {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(c => {
                    const val = chars[c.key];
                    return (
                      <div key={c.key} className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          {CHARACTERISTIC_SHORT_LABELS[c.key] ?? c.label}
                        </p>
                        <div className={`text-xs py-1.5 rounded ${getCharacteristicCellClass(val)}`}>
                          {val > 0 ? val : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {(power.power5s || power.power1min || power.power5min || power.power20min) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Puissance (W)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {power.power5s && (
                    <div className="bg-gray-50 rounded px-3 py-2 border border-gray-100">
                      <p className="text-xs text-gray-500">5 s</p>
                      <p className="font-semibold">{power.power5s} W</p>
                    </div>
                  )}
                  {power.power1min && (
                    <div className="bg-gray-50 rounded px-3 py-2 border border-gray-100">
                      <p className="text-xs text-gray-500">1 min</p>
                      <p className="font-semibold">{power.power1min} W</p>
                    </div>
                  )}
                  {power.power5min && (
                    <div className="bg-gray-50 rounded px-3 py-2 border border-gray-100">
                      <p className="text-xs text-gray-500">5 min</p>
                      <p className="font-semibold">{power.power5min} W</p>
                    </div>
                  )}
                  {power.power20min && (
                    <div className="bg-gray-50 rounded px-3 py-2 border border-gray-100">
                      <p className="text-xs text-gray-500">20 min</p>
                      <p className="font-semibold">{power.power20min} W</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {resultsHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Derniers résultats</h4>
                <ul className="text-sm space-y-1.5">
                  {resultsHistory.slice(0, 5).map(r => (
                    <li
                      key={r.id}
                      className="flex justify-between text-gray-700 py-1 border-b border-gray-100 last:border-0"
                    >
                      <span className="truncate mr-2">{r.eventName}</span>
                      <span className="font-medium shrink-0">{r.rank}e</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {qualitativeNotes && (
              <p className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
                {qualitativeNotes}
              </p>
            )}
          </>
        ) : !isDemo ? (
          <LockedBlock message="Données performance non partagées — demandez un contact à l'athlète." />
        ) : null}

        {showContactForm && onRequestContact && (
          <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
            <p className="text-sm text-gray-700 font-medium">Périmètres demandés à l&apos;athlète</p>
            {SCOUTING_DATA_SCOPE_OPTIONS.map(({ value, label, description }) => (
              <label key={value} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactScopes.includes(value)}
                  onChange={() =>
                    setContactScopes(prev =>
                      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value],
                    )
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span className="text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-gray-500">{description}</span>
                </span>
              </label>
            ))}
            <div className="flex justify-end gap-2">
              <ActionButton variant="secondary" size="sm" onClick={() => setShowContactForm(false)}>
                Annuler
              </ActionButton>
              <ActionButton
                variant="primary"
                size="sm"
                disabled={contactScopes.length === 0}
                onClick={() => {
                  onRequestContact(user, contactScopes);
                  setShowContactForm(false);
                }}
              >
                Envoyer la demande
              </ActionButton>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
          <ActionButton onClick={onClose} variant="secondary">
            Fermer
          </ActionButton>
          {!isDemo && onAddWatchlistProspect && (
            <ActionButton
              onClick={() => onAddWatchlistProspect(user)}
              variant="secondary"
              disabled={onWatchlist}
            >
              {onWatchlist ? 'Déjà en suivi discret' : 'Suivi discret'}
            </ActionButton>
          )}
          {!isDemo && onRequestContact && !hasAnyAccess && !showContactForm && (
            <ActionButton onClick={() => setShowContactForm(true)} variant="secondary">
              Demander contact
            </ActionButton>
          )}
          {hasAnyAccess && (
            <ActionButton onClick={() => onAddToProspects(user)} variant="primary">
              Ajouter aux prospects
            </ActionButton>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TalentProfilePreviewModal;

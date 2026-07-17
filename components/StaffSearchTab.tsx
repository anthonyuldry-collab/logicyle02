import React, { useMemo, useState } from 'react';
import {
  StaffMember,
  StaffRole,
  RaceEvent,
  Address,
  PerformanceEntry,
  AvailabilityStatus,
  Mission,
  User,
} from '../types';
import ActionButton from './ActionButton';
import Modal from './Modal';
import MissionOffersPanel from './MissionOffersPanel';
import LocationMarkerIcon from './icons/LocationMarkerIcon';
import PhoneIcon from './icons/PhoneIcon';
import MailIcon from './icons/MailIcon';
import RatingStars from './RatingStars';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';
import {
  DEMO_RECRUITMENT_BASE_ADDRESS,
  VacataireReview,
  getDemoVacataireDistanceKm,
  getDemoVacataireProfile,
  getDemoVacataireRating,
  isDemoVacataire,
} from '../constants/demoVacataires';

interface StaffSearchTabProps {
  allStaff: StaffMember[];
  raceEvents: RaceEvent[];
  teamAddress?: Address;
  performanceEntries: PerformanceEntry[];
  missions?: Mission[];
  setMissions?: (updater: React.SetStateAction<Mission[]>) => void;
  teamId?: string;
  teamName?: string;
  currentUser?: User;
  canEditOffers?: boolean;
  onIntegrateAcceptedStaff?: (payload: {
    mission: Mission;
    application: import('../types').MissionApplication;
    eventId: string;
  }) => void;
}

type VacataireResult = StaffMember & {
  distance: number;
  averageRating: number;
  ratingCount: number;
};

type LocalRating = { rating: number; comment: string; date: string; teamName: string };

const calculateDistance = (address1?: Address, address2?: Address, staffId?: string): number => {
  if (staffId && isDemoVacataire(staffId)) {
    return getDemoVacataireDistanceKm(staffId) ?? 40;
  }
  if (!address1?.city || !address2?.city) return 999;
  if (address1.city.toLowerCase() === address2.city.toLowerCase()) return 12;
  return 80;
};

const datesOverlap = (startAStr: string, endAStr: string, startBStr: string, endBStr: string): boolean => {
  const startA = new Date(startAStr + 'T00:00:00Z').getTime();
  const endA = new Date(endAStr + 'T23:59:59Z').getTime();
  const startB = new Date(startBStr + 'T00:00:00Z').getTime();
  const endB = new Date(endBStr + 'T23:59:59Z').getTime();
  return startA <= endB && endA >= startB;
};

const StaffSearchTab: React.FC<StaffSearchTabProps> = ({
  allStaff,
  raceEvents,
  teamAddress,
  performanceEntries,
  missions = [],
  setMissions,
  teamId,
  teamName = 'Équipe',
  currentUser,
  canEditOffers = true,
  onIntegrateAcceptedStaff,
}) => {
  const [hubTab, setHubTab] = useState<'search' | 'offers'>('search');
  const [searchLocation, setSearchLocation] = useState<'teamBase' | string>('teamBase');
  const [searchDistance, setSearchDistance] = useState<number>(500);
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [missionStartDate, setMissionStartDate] = useState('');
  const [missionEndDate, setMissionEndDate] = useState('');
  const [selected, setSelected] = useState<VacataireResult | null>(null);
  const [localRatings, setLocalRatings] = useState<Record<string, LocalRating[]>>({});
  const [rateValue, setRateValue] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [rateFeedback, setRateFeedback] = useState<string | null>(null);

  const availableVacataires = useMemo(() => {
    if (!allStaff) return [];
    return allStaff.filter((s) => s.openToExternalMissions);
  }, [allStaff]);

  const resolveBaseAddress = (): Address => {
    if (searchLocation === 'teamBase') {
      return teamAddress?.city ? teamAddress : DEMO_RECRUITMENT_BASE_ADDRESS;
    }
    const selectedEvent = raceEvents.find((e) => e.id === searchLocation);
    if (selectedEvent?.location) {
      const locationParts = selectedEvent.location.split(',');
      return {
        city: locationParts[0]?.trim() || DEMO_RECRUITMENT_BASE_ADDRESS.city,
        country: locationParts[1]?.trim() || 'France',
      };
    }
    return DEMO_RECRUITMENT_BASE_ADDRESS;
  };

  const rateVacataire = (vacataire: StaffMember): { averageRating: number; ratingCount: number } => {
    const local = localRatings[vacataire.id] || [];
    if (isDemoVacataire(vacataire.id)) {
      const demo = getDemoVacataireRating(vacataire.id);
      if (local.length === 0) return { averageRating: demo.average, ratingCount: demo.count };
      const sum = demo.average * demo.count + local.reduce((s, r) => s + r.rating, 0);
      const count = demo.count + local.length;
      return { averageRating: Math.round((sum / count) * 10) / 10, ratingCount: count };
    }
    const ratings = (performanceEntries || [])
      .flatMap((pe) => pe.staffRatings || [])
      .filter((r) => r.staffId === vacataire.id && r.rating > 0);
    const all = [
      ...ratings.map((r) => r.rating),
      ...local.map((r) => r.rating),
    ];
    if (all.length === 0) return { averageRating: 0, ratingCount: 0 };
    const averageRating = all.reduce((s, n) => s + n, 0) / all.length;
    return { averageRating: Math.round(averageRating * 10) / 10, ratingCount: all.length };
  };

  const getReviews = (vacataire: StaffMember): Array<VacataireReview | LocalRating & { id?: string; eventName?: string }> => {
    const demoReviews = getDemoVacataireProfile(vacataire.id)?.reviews || [];
    const local = (localRatings[vacataire.id] || []).map((r, i) => ({
      id: `local_${i}`,
      ...r,
    }));
    const fromPerf = (performanceEntries || [])
      .flatMap((pe) =>
        (pe.staffRatings || [])
          .filter((r) => r.staffId === vacataire.id && (r.comment || r.rating))
          .map((r, i) => ({
            id: `perf_${pe.id}_${i}`,
            teamName: 'Votre équipe',
            rating: r.rating,
            comment: r.comment || '',
            date: pe.date || '',
            eventName: pe.eventId,
          }))
      );
    return [...local, ...demoReviews, ...fromPerf];
  };

  const searchResults = useMemo((): VacataireResult[] => {
    const baseAddress = resolveBaseAddress();
    const dayOfWeekMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hasDateFilter = Boolean(missionStartDate && missionEndDate);

    return availableVacataires
      .filter((vacataire) => {
        const roleMatch = roleFilter === 'all' || vacataire.role === roleFilter;
        if (!roleMatch) return false;

        const distance = calculateDistance(baseAddress, vacataire.address, vacataire.id);
        if (distance > searchDistance) return false;

        if (!hasDateFilter) return true;

        const isGenerallyUnavailable = (vacataire.availability || []).some(
          (period) =>
            period.status === AvailabilityStatus.NON_DISPONIBLE &&
            datesOverlap(missionStartDate, missionEndDate, period.startDate, period.endDate)
        );
        if (isGenerallyUnavailable) return false;

        if (vacataire.weeklyAvailability) {
          const startDate = new Date(missionStartDate + 'T12:00:00Z');
          const endDate = new Date(missionEndDate + 'T12:00:00Z');
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayKey = dayOfWeekMap[d.getUTCDay()];
            const dayAvailability =
              vacataire.weeklyAvailability[dayKey as keyof typeof vacataire.weeklyAvailability];
            if (
              dayAvailability &&
              !dayAvailability.morning &&
              !dayAvailability.afternoon &&
              !dayAvailability.evening
            ) {
              return false;
            }
          }
        }

        const isAssignedElsewhere = raceEvents.some(
          (event) =>
            (event.selectedStaffIds || []).includes(vacataire.id) &&
            datesOverlap(missionStartDate, missionEndDate, event.date, event.endDate || event.date)
        );
        if (isAssignedElsewhere) return false;

        return true;
      })
      .map((vacataire) => {
        const distance = calculateDistance(baseAddress, vacataire.address, vacataire.id);
        const { averageRating, ratingCount } = rateVacataire(vacataire);
        return { ...vacataire, distance, averageRating, ratingCount };
      })
      .sort((a, b) => b.averageRating - a.averageRating || a.distance - b.distance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    availableVacataires,
    searchLocation,
    searchDistance,
    roleFilter,
    teamAddress,
    raceEvents,
    missionStartDate,
    missionEndDate,
    performanceEntries,
    localRatings,
  ]);

  const usingFallbackAddress = searchLocation === 'teamBase' && !teamAddress?.city;
  const detailProfile = selected ? getDemoVacataireProfile(selected.id) : undefined;
  const detailReviews = selected ? getReviews(selected) : [];

  const submitRating = () => {
    if (!selected) return;
    if (rateValue < 1) {
      setRateFeedback('Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    const comment =
      rateComment.trim() ||
      `Note ${rateValue}/5 après mission — ${teamName || 'équipe'}.`;
    const entry: LocalRating = {
      rating: rateValue,
      comment,
      date: new Date().toISOString().slice(0, 10),
      teamName: teamName || currentUser?.firstName || 'Votre équipe',
    };
    const previousLocal = localRatings[selected.id] || [];
    const nextLocal = [entry, ...previousLocal];
    setLocalRatings((prev) => ({
      ...prev,
      [selected.id]: nextLocal,
    }));

    const demo = isDemoVacataire(selected.id) ? getDemoVacataireRating(selected.id) : null;
    let averageRating: number;
    let ratingCount: number;
    if (demo) {
      const sum = demo.average * demo.count + nextLocal.reduce((s, r) => s + r.rating, 0);
      ratingCount = demo.count + nextLocal.length;
      averageRating = Math.round((sum / ratingCount) * 10) / 10;
    } else {
      const fromPerf = (performanceEntries || [])
        .flatMap((pe) => pe.staffRatings || [])
        .filter((r) => r.staffId === selected.id && r.rating > 0)
        .map((r) => r.rating);
      const all = [...fromPerf, ...nextLocal.map((r) => r.rating)];
      ratingCount = all.length;
      averageRating =
        ratingCount > 0
          ? Math.round((all.reduce((s, n) => s + n, 0) / ratingCount) * 10) / 10
          : rateValue;
    }

    setSelected({
      ...selected,
      averageRating,
      ratingCount,
    });
    setRateComment('');
    setRateValue(0);
    setRateFeedback(`Avis ${entry.rating}/5 publié — merci !`);
  };

  const openVacataire = (vacataire: VacataireResult) => {
    setSelected(vacataire);
    setRateValue(0);
    setRateComment('');
    setRateFeedback(null);
  };

  return (
    <div className="text-gray-800">
      <div className="mb-4 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setHubTab('search')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            hubTab === 'search'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Chercher un vacataire
        </button>
        <button
          type="button"
          onClick={() => setHubTab('offers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            hubTab === 'offers'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Créer des offres / vacations
        </button>
      </div>

      {hubTab === 'offers' ? (
        teamId && setMissions ? (
          <MissionOffersPanel
            teamId={teamId}
            teamName={teamName}
            missions={missions}
            setMissions={setMissions}
            canEdit={canEditOffers}
            raceEvents={raceEvents}
            onIntegrateAcceptedStaff={onIntegrateAcceptedStaff}
          />
        ) : (
          <p className="text-sm text-gray-500 py-8 text-center">
            Sélectionnez une équipe active pour publier des offres.
          </p>
        )
      ) : (
        <>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-1">Rechercher un Vacataire</h4>
            <p className="text-sm text-gray-500 mb-3">
              Cliquez sur une fiche pour le détail, les compétences et les avis. Les dates sont
              optionnelles.
            </p>
            {usingFallbackAddress && (
              <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Adresse club non renseignée — recherche depuis Lorient (exemple).
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date de début mission</label>
                <input
                  type="date"
                  value={missionStartDate}
                  onChange={(e) => setMissionStartDate(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-2 py-2 border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date de fin mission</label>
                <input
                  type="date"
                  value={missionEndDate}
                  onChange={(e) => setMissionEndDate(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-2 py-2 border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Lieu de recherche</label>
                <select
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="teamBase">Depuis la base du club</option>
                  <optgroup label="Depuis une course">
                    {raceEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({event.location})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle recherché</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as StaffRole | 'all')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">Tous les rôles</option>
                  {(Object.values(StaffRole) as StaffRole[]).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-4">
                <label htmlFor="searchDistance" className="block text-sm font-medium text-gray-700">
                  Distance maximale (km)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    id="searchDistance"
                    min="10"
                    max="1000"
                    step="10"
                    value={searchDistance}
                    onChange={(e) => setSearchDistance(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                  <div className="text-center text-sm font-semibold w-20">{searchDistance} km</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3">Résultats ({searchResults.length})</h4>
            {searchResults.length === 0 ? (
              <p className="text-center text-gray-500 italic py-8">
                Aucun vacataire ne correspond à vos critères.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((vacataire) => (
                  <div
                    key={vacataire.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openVacataire(vacataire)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openVacataire(vacataire);
                      }
                    }}
                    className="bg-white rounded-lg shadow border p-4 text-left flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-bold text-gray-900">
                            {vacataire.firstName} {vacataire.lastName}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {vacataire.customRole || getStaffRoleDisplayLabel(vacataire.role)}
                          </p>
                          {isDemoVacataire(vacataire.id) && (
                            <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                              Exemple
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
                            <RatingStars value={vacataire.averageRating} size="sm" readOnly />
                            <span className="font-bold text-amber-500 text-sm">
                              {vacataire.averageRating > 0
                                ? vacataire.averageRating.toFixed(1)
                                : '—'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">({vacataire.ratingCount} avis)</p>
                        </div>
                      </div>
                      {vacataire.professionalSummary && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                          {vacataire.professionalSummary}
                        </p>
                      )}
                      {vacataire.skills?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {vacataire.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                            >
                              {skill}
                            </span>
                          ))}
                          {vacataire.skills.length > 3 && (
                            <span className="text-[10px] text-gray-400">
                              +{vacataire.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t text-sm text-gray-700">
                        <p className="flex items-center">
                          <LocationMarkerIcon className="w-4 h-4 mr-1" />{' '}
                          {vacataire.address?.city || 'Ville inconnue'}
                        </p>
                        <p className="font-semibold">
                          {vacataire.distance.toFixed(0)} km
                          {vacataire.dailyRate ? ` · ${vacataire.dailyRate} €/j` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs font-medium text-indigo-600">Voir la fiche →</span>
                      <ActionButton
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openVacataire(vacataire);
                        }}
                      >
                        Contacter
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={`${selected.firstName} ${selected.lastName}`}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">
                  {selected.customRole || getStaffRoleDisplayLabel(selected.role)} · Vacataire
                </p>
                {isDemoVacataire(selected.id) && (
                  <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                    Profil exemple
                  </span>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <RatingStars value={selected.averageRating} size="md" readOnly />
                  <span className="font-bold text-amber-500">
                    {selected.averageRating > 0 ? selected.averageRating.toFixed(1) : '—'}
                  </span>
                  <span className="text-sm text-gray-500">({selected.ratingCount} avis)</span>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-900">
                  {selected.dailyRate ? `${selected.dailyRate} € / jour` : 'Tarif à négocier'}
                </p>
                <p className="text-gray-500">
                  {selected.address?.city} · {selected.distance.toFixed(0)} km
                </p>
              </div>
            </div>

            {selected.professionalSummary && (
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-1">Présentation & message</h5>
                <p className="text-sm text-gray-700">{selected.professionalSummary}</p>
                {selected.defaultApplicationMessage && (
                  <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-indigo-200 pl-3">
                    Message type : « {selected.defaultApplicationMessage} »
                  </p>
                )}
              </div>
            )}

            {(detailProfile || selected.skills?.length || selected.experienceYears != null) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selected.skills?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-1.5">Compétences</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-1.5">Parcours</h5>
                  {(selected.experienceYears ?? detailProfile?.experienceYears) != null && (
                    <p className="text-sm text-gray-700">
                      {selected.experienceYears ?? detailProfile?.experienceYears} ans
                      d&apos;expérience
                    </p>
                  )}
                  {detailProfile?.availabilityNote && (
                    <p className="text-xs text-gray-500 mt-1">{detailProfile.availabilityNote}</p>
                  )}
                  {(selected.certifications?.length || detailProfile?.certifications.length) ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(selected.certifications?.length
                        ? selected.certifications
                        : detailProfile?.certifications || []
                      ).map((c) => (
                        <span
                          key={c}
                          className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(selected.workHistory?.length || 0) > 0 && (
                    <ul className="mt-2 space-y-1">
                      {selected.workHistory!.slice(0, 3).map((exp) => (
                        <li key={exp.id} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-800">{exp.position}</span>
                          {exp.company ? ` · ${exp.company}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {(selected.languages?.length || detailProfile?.languages?.length) && (
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-1.5">Langues</h5>
                <ul className="text-sm text-gray-700 space-y-0.5">
                  {(selected.languages || []).map((l) => (
                    <li key={l.id}>
                      {l.language} — {l.proficiency}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <h5 className="text-sm font-semibold text-gray-900">Informations administratives</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                {selected.birthDate && (
                  <p>
                    <span className="text-gray-500">Naissance :</span> {selected.birthDate}
                  </p>
                )}
                {selected.sex && (
                  <p>
                    <span className="text-gray-500">Sexe :</span> {selected.sex}
                  </p>
                )}
                {selected.nationality && (
                  <p>
                    <span className="text-gray-500">Nationalité :</span> {selected.nationality}
                  </p>
                )}
                {(selected.address?.city || selected.address?.postalCode) && (
                  <p>
                    <span className="text-gray-500">Adresse :</span>{' '}
                    {[selected.address?.streetName, selected.address?.postalCode, selected.address?.city]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
              {selected.cvFileName && (
                <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm">
                  <span className="font-medium text-indigo-900 truncate">CV · {selected.cvFileName}</span>
                  {selected.cvFileBase64 && selected.cvMimeType ? (
                    <a
                      href={
                        selected.cvFileBase64.startsWith('data:')
                          ? selected.cvFileBase64
                          : `data:${selected.cvMimeType};base64,${selected.cvFileBase64}`
                      }
                      download={selected.cvFileName}
                      className="shrink-0 text-indigo-700 hover:underline"
                    >
                      Télécharger
                    </a>
                  ) : (
                    <span className="text-xs text-indigo-600">Exemple (fichier non stocké)</span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">Contact</h5>
              <div className="space-y-1.5 text-sm">
                {selected.phone && (
                  <p className="flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" /> {selected.phone}
                  </p>
                )}
                {selected.email && (
                  <p className="flex items-center">
                    <MailIcon className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">
                      {selected.email}
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-gray-900 mb-2">
                Avis & notation ({detailReviews.length})
              </h5>
              {detailReviews.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucun avis pour le moment.</p>
              ) : (
                <ul className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {detailReviews.map((review, idx) => (
                    <li
                      key={'id' in review && review.id ? review.id : `rev_${idx}`}
                      className="rounded-lg border border-gray-100 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {'teamName' in review ? review.teamName : 'Équipe'}
                        </p>
                        <RatingStars value={review.rating} size="sm" readOnly />
                      </div>
                      {review.comment && (
                        <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        {review.date
                          ? new Date(review.date + (review.date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(
                              'fr-FR'
                            )
                          : ''}
                        {'eventName' in review && review.eventName ? ` · ${review.eventName}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h5 className="text-sm font-semibold text-amber-950 mb-1">Noter ce vacataire</h5>
              <p className="text-xs text-amber-900/80 mb-3">
                Cliquez sur les étoiles (elles doivent se remplir en doré), ajoutez un commentaire
                optionnel, puis publiez.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <RatingStars value={rateValue} onChange={setRateValue} size="lg" />
                <span className="text-sm font-semibold text-amber-800">
                  {rateValue > 0 ? `${rateValue} / 5` : 'Choisir une note'}
                </span>
              </div>
              <textarea
                rows={2}
                value={rateComment}
                onChange={(e) => setRateComment(e.target.value)}
                placeholder="Commentaire sur la mission (optionnel)…"
                className="w-full rounded-md border-amber-200 text-sm bg-white"
              />
              {rateFeedback && (
                <p
                  className={`mt-2 text-sm font-medium ${
                    rateFeedback.includes('publié') ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {rateFeedback}
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <ActionButton size="sm" onClick={submitRating} disabled={rateValue < 1}>
                  Publier l&apos;avis
                </ActionButton>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <ActionButton variant="secondary" onClick={() => setSelected(null)}>
                Fermer
              </ActionButton>
              <ActionButton
                onClick={() => {
                  if (selected.email) {
                    window.location.href = `mailto:${selected.email}?subject=${encodeURIComponent(
                      `Mission vacataire — ${teamName}`
                    )}`;
                  }
                }}
              >
                Envoyer un e-mail
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffSearchTab;

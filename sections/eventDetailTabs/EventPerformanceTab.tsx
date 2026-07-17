
import React, { useState, useEffect, useMemo } from 'react';
import { RaceEvent, PerformanceEntry as AppPerformanceEntry, RiderRating, Rider, AppState, StaffRating, StaffStatus, User, RiderSelfDebrief } from '../../types';
import { emptyPerformanceEntry } from '../../constants';
import ActionButton from '../../components/ActionButton';
import EventTabHeader from '../../components/eventDetail/EventTabHeader';
import ContributionRatingPicker from '../../components/eventDetail/ContributionRatingPicker';
import {
  getContributionRatingBadgeClass,
  getContributionRatingLabel,
  normalizeLegacyScoreToTen,
} from '../../utils/contributionRatingUtils';
import {
  getPerformanceRatingCriteria,
  getPerformanceRatingLabel,
} from '../../utils/performanceRatingScales';
import { getRiderProfileForUser } from '../../utils/eventRiderUtils';

interface EventPerformanceTabProps {
  event: RaceEvent;
  eventId: string;
  appState: AppState;
  setPerformanceEntry: (itemOrUpdater: AppPerformanceEntry | ((prevItem: AppPerformanceEntry | undefined) => AppPerformanceEntry)) => Promise<void>;
  currentUser?: User;
}

export const EventPerformanceTab: React.FC<EventPerformanceTabProps> = ({
  event,
  eventId,
  appState,
  setPerformanceEntry,
  currentUser,
}) => {
  const [performanceData, setPerformanceData] = useState<AppPerformanceEntry>(
    appState.performanceEntries.find((p) => p.eventId === eventId) ||
      emptyPerformanceEntry(eventId, `${eventId}_perf_tab_init_${Date.now()}`)
  );
  const [isEditing, setIsEditing] = useState(false);

  const currentRiderProfile = currentUser
    ? getRiderProfileForUser(appState.riders, currentUser)
    : undefined;

  useEffect(() => {
    const currentEntry = appState.performanceEntries.find((p) => p.eventId === eventId);
    const riderIdsInEvent = event.selectedRiderIds || [];
    const staffIdsInEvent = event.selectedStaffIds || [];

    let riderRatings: RiderRating[] = (currentEntry?.riderRatings || []).filter((r) =>
      riderIdsInEvent.includes(r.riderId)
    );
    const existingRiderIds = new Set(riderRatings.map((r) => r.riderId));
    riderIdsInEvent.forEach((riderId) => {
      if (!existingRiderIds.has(riderId)) {
        riderRatings.push({ riderId });
      }
    });

    let staffRatings: StaffRating[] = (currentEntry?.staffRatings || []).filter((r) =>
      staffIdsInEvent.includes(r.staffId)
    );
    const existingStaffIds = new Set(staffRatings.map((r) => r.staffId));
    staffIdsInEvent.forEach((staffId) => {
      if (!existingStaffIds.has(staffId)) {
        staffRatings.push({ staffId, rating: 0, eventId });
      }
    });

    const initialData = currentEntry || emptyPerformanceEntry(eventId, `${eventId}_perf_tab_effect_${Date.now()}`);
    setPerformanceData({ ...initialData, riderRatings, staffRatings });
  }, [eventId, appState.performanceEntries, event.selectedRiderIds, event.selectedStaffIds]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    participantId?: string,
    type?: 'rider' | 'staff',
    field?: keyof RiderRating | keyof StaffRating
  ) => {
    const { name, value, type: inputType } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setPerformanceData((prevData) => {
      if (participantId && type && field) {
        if (type === 'rider') {
          return {
            ...prevData,
            riderRatings: (prevData.riderRatings || []).map((rating) => {
              if (rating.riderId === participantId) {
                return { ...rating, [field]: inputType === 'checkbox' ? checked : value };
              }
              return rating;
            }),
          };
        }
        return {
          ...prevData,
          staffRatings: (prevData.staffRatings || []).map((rating) => {
            if (rating.staffId === participantId) {
              return { ...rating, [field]: value };
            }
            return rating;
          }),
        };
      }
      return { ...prevData, [name]: value };
    });
  };

  const updateRiderRating = (riderId: string, patch: Partial<RiderRating>) => {
    setPerformanceData((prev) => ({
      ...prev,
      riderRatings: (prev.riderRatings || []).map((r) =>
        r.riderId === riderId ? { ...r, ...patch } : r
      ),
    }));
  };

  const handleCollectiveChange = (riderId: string, value: number | undefined, isAbsent: boolean) => {
    updateRiderRating(riderId, {
      isAbsent,
      collectiveScore: isAbsent ? undefined : value,
      ...(isAbsent ? { technicalScore: undefined, physicalScore: undefined } : {}),
    });
  };

  const handleScoreChange = (
    participantId: string,
    type: 'rider' | 'staff',
    field: 'technicalScore' | 'physicalScore' | 'rating',
    value: number | undefined
  ) => {
    setPerformanceData((prevData) => {
      if (type === 'rider') {
        return {
          ...prevData,
          riderRatings: (prevData.riderRatings || []).map((rating) =>
            rating.riderId === participantId ? { ...rating, [field]: value } : rating
          ),
        };
      }
      return {
        ...prevData,
        staffRatings: (prevData.staffRatings || []).map((rating) =>
          rating.staffId === participantId ? { ...rating, [field]: value } : rating
        ),
      };
    });
  };

  const handleSave = async () => {
    await setPerformanceEntry(performanceData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const currentEntry = appState.performanceEntries.find((p) => p.eventId === eventId);
    setPerformanceData(currentEntry || emptyPerformanceEntry(eventId, `${eventId}_perf_tab_cancel_${Date.now()}`));
    setIsEditing(false);
  };

  const getParticipantName = (id: string, type: 'rider' | 'staff') => {
    const participant =
      type === 'rider'
        ? appState.riders.find((p) => p.id === id)
        : appState.staff.find((p) => p.id === id);
    return participant ? `${participant.firstName} ${participant.lastName}` : `ID: ${id}`;
  };

  const inputClass =
    'mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const checkboxClass = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500';

  const vacataires = appState.staff.filter(
    (s) => event.selectedStaffIds?.includes(s.id) && s.status === StaffStatus.VACATAIRE
  );

  const isRiderUser =
    currentUser?.userRole === 'COUREUR' || currentUser?.userRole === 'Coureur';

  const eventRiderDebriefs = useMemo(() => {
    const riderIds = new Set(event.selectedRiderIds ?? []);
    return (appState.riderSelfDebriefs ?? []).filter(
      (d) => d.eventId === eventId && riderIds.has(d.riderId),
    );
  }, [appState.riderSelfDebriefs, event.selectedRiderIds, eventId]);

  const renderRiderSelfDebriefCard = (debrief: RiderSelfDebrief) => {
    const rider = appState.riders.find((r) => r.id === debrief.riderId);
    const name = rider ? `${rider.firstName} ${rider.lastName}` : 'Coureur';
    const flags = [
      debrief.didNotStart ? 'DNS' : null,
      debrief.didNotFinish ? 'DNF' : null,
      debrief.crashed ? 'Chute' : null,
    ].filter(Boolean);

    return (
      <div key={debrief.id} className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-3 text-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-gray-900">{name}</strong>
          {debrief.submittedAt && (
            <span className="text-[11px] text-gray-500">
              {new Date(debrief.submittedAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
        {debrief.personalRanking && (
          <p><span className="font-medium text-gray-900">Résultat :</span> {debrief.personalRanking}</p>
        )}
        {flags.length > 0 && (
          <p className="text-xs text-amber-800">{flags.join(' · ')}</p>
        )}
        {debrief.selfSummary && (
          <p><span className="font-medium text-gray-900">Résumé :</span> {debrief.selfSummary}</p>
        )}
        {debrief.selfHighlights && (
          <p><span className="font-medium text-gray-900">Points positifs :</span> {debrief.selfHighlights}</p>
        )}
        {debrief.selfImprovements && (
          <p><span className="font-medium text-gray-900">Axes d&apos;amélioration :</span> {debrief.selfImprovements}</p>
        )}
        {(debrief.selfPhysicalFeel != null || debrief.selfTechnicalFeel != null) && (
          <p className="text-xs text-gray-600">
            {debrief.selfPhysicalFeel != null && `Physique : ${debrief.selfPhysicalFeel}/10`}
            {debrief.selfPhysicalFeel != null && debrief.selfTechnicalFeel != null && ' · '}
            {debrief.selfTechnicalFeel != null && `Technique : ${debrief.selfTechnicalFeel}/10`}
          </p>
        )}
      </div>
    );
  };

  const getFilteredRiderRatings = () => {
    if (!isRiderUser) return performanceData.riderRatings || [];
    const myId = currentRiderProfile?.id ?? currentUser?.id;
    return (performanceData.riderRatings || []).filter((rating) => rating.riderId === myId);
  };

  const displayScore = (score: number | undefined) => normalizeLegacyScoreToTen(score);

  const renderRiderCard = (rating: RiderRating, editing: boolean) => {
    const collective = displayScore(rating.collectiveScore);
    const technical = displayScore(rating.technicalScore);
    const physical = displayScore(rating.physicalScore);

    if (editing) {
      return (
        <div key={rating.riderId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <h5 className="text-sm font-semibold text-gray-900">{getParticipantName(rating.riderId, 'rider')}</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Classement</label>
              <input
                type="text"
                value={rating.classification || ''}
                onChange={(e) => handleInputChange(e, rating.riderId, 'rider', 'classification')}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-5">
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={!!rating.didNotStart} onChange={(e) => handleInputChange(e, rating.riderId, 'rider', 'didNotStart')} className={checkboxClass} />
                <span className="ml-2">DNS</span>
              </label>
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={!!rating.didNotFinish} onChange={(e) => handleInputChange(e, rating.riderId, 'rider', 'didNotFinish')} className={checkboxClass} />
                <span className="ml-2">DNF</span>
              </label>
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={!!rating.crashed} onChange={(e) => handleInputChange(e, rating.riderId, 'rider', 'crashed')} className={checkboxClass} />
                <span className="ml-2">Chute</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Apport au résultat (/10)</label>
            <ContributionRatingPicker
              value={collective}
              isAbsent={!!rating.isAbsent}
              onChange={(val, absent) => handleCollectiveChange(rating.riderId, val, absent)}
            />
          </div>
          {!rating.isAbsent && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-3">
                <ContributionRatingPicker
                  scale="technical"
                  allowAbsent={false}
                  value={technical}
                  onChange={(val) => handleScoreChange(rating.riderId, 'rider', 'technicalScore', val)}
                />
              </div>
              <div className="rounded-lg border border-teal-100 bg-teal-50/30 p-3">
                <ContributionRatingPicker
                  scale="physical"
                  allowAbsent={false}
                  value={physical}
                  onChange={(val) => handleScoreChange(rating.riderId, 'rider', 'physicalScore', val)}
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Feedback DS</label>
            <textarea value={rating.dsFeedback || ''} onChange={(e) => handleInputChange(e, rating.riderId, 'rider', 'dsFeedback')} rows={2} className={inputClass} />
          </div>
        </div>
      );
    }

    return (
      <div key={rating.riderId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">{getParticipantName(rating.riderId, 'rider')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Class. {rating.classification || '—'}</p>
          </div>
          {rating.isAbsent ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">Absent (X)</span>
          ) : collective != null ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getContributionRatingBadgeClass(collective)}`}>
              {collective}/10 — {getContributionRatingLabel(collective)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Non noté</span>
          )}
        </div>
        {(technical != null || physical != null || rating.dsFeedback) && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {technical != null && (
              <div className="text-xs">
                <span className={`inline-flex px-2 py-0.5 rounded-full border font-medium ${getContributionRatingBadgeClass(technical)}`}>
                  Technique {technical}/10 — {getPerformanceRatingLabel('technical', technical)}
                </span>
                <p className="text-gray-500 mt-1 leading-snug">{getPerformanceRatingCriteria('technical', technical)}</p>
              </div>
            )}
            {physical != null && (
              <div className="text-xs">
                <span className={`inline-flex px-2 py-0.5 rounded-full border font-medium ${getContributionRatingBadgeClass(physical)}`}>
                  Physique {physical}/10 — {getPerformanceRatingLabel('physical', physical)}
                </span>
                <p className="text-gray-500 mt-1 leading-snug">{getPerformanceRatingCriteria('physical', physical)}</p>
              </div>
            )}
            {rating.dsFeedback && <p className="text-xs text-gray-500 italic pt-1">{rating.dsFeedback}</p>}
          </div>
        )}
      </div>
    );
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <EventTabHeader
          title="Débriefing performance"
          subtitle="Apport collectif · technique (placement, tactique) · physique (forme du jour) — barèmes /10 objectifs"
          action={
            <div className="flex gap-2">
              <ActionButton variant="secondary" size="sm" onClick={handleCancel}>Annuler</ActionButton>
              <ActionButton size="sm" onClick={handleSave}>Enregistrer</ActionButton>
            </div>
          }
        />
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Débriefing général</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500">Objectifs généraux</label>
              <textarea name="generalObjectives" value={performanceData.generalObjectives} onChange={handleInputChange} rows={2} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Résumé des résultats</label>
              <textarea name="resultsSummary" value={performanceData.resultsSummary} onChange={handleInputChange} rows={2} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Enseignements clés</label>
              <textarea name="keyLearnings" value={performanceData.keyLearnings} onChange={handleInputChange} rows={2} className={inputClass} />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Évaluations coureurs</h4>
          {getFilteredRiderRatings().map((rating) => renderRiderCard(rating, true))}
        </div>
        {vacataires.length > 0 && !isRiderUser && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Staff vacataire</h4>
            {vacataires.map((staffMember) => {
              const rating = performanceData.staffRatings?.find((r) => r.staffId === staffMember.id);
              const staffScore = displayScore(rating?.rating);
              return (
                <div key={staffMember.id} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">{getParticipantName(staffMember.id, 'staff')}</h5>
                  <ContributionRatingPicker
                    compact
                    allowAbsent={false}
                    value={staffScore}
                    onChange={(val) => handleScoreChange(staffMember.id, 'staff', 'rating', val)}
                  />
                  <textarea
                    value={rating?.comment || ''}
                    onChange={(e) => handleInputChange(e, staffMember.id, 'staff', 'comment')}
                    rows={2}
                    className={`${inputClass} mt-2`}
                    placeholder="Commentaire (optionnel)"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const hasGeneral =
    performanceData.generalObjectives || performanceData.resultsSummary || performanceData.keyLearnings;

  return (
    <div className="space-y-4">
      <EventTabHeader
        title="Rapport de performance"
        subtitle="Apport · technique · physique — critères objectifs /10"
        action={!isRiderUser ? <ActionButton size="sm" onClick={() => setIsEditing(true)}>Modifier</ActionButton> : undefined}
      />
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Débriefing général</h4>
        {hasGeneral ? (
          <div className="text-sm text-gray-700 space-y-2">
            {performanceData.generalObjectives && <p><span className="font-medium text-gray-900">Objectifs :</span> {performanceData.generalObjectives}</p>}
            {performanceData.resultsSummary && <p><span className="font-medium text-gray-900">Résultats :</span> {performanceData.resultsSummary}</p>}
            {performanceData.keyLearnings && <p><span className="font-medium text-gray-900">Enseignements :</span> {performanceData.keyLearnings}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Aucun débriefing général saisi.</p>
        )}
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Évaluations individuelles</h4>
        {getFilteredRiderRatings().length > 0 ? (
          getFilteredRiderRatings().map((rating) => renderRiderCard(rating, false))
        ) : (
          <p className="text-sm text-gray-400 italic">Aucune évaluation enregistrée.</p>
        )}
      </div>
      {vacataires.length > 0 && !isRiderUser && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Évaluations staff</h4>
          {(performanceData.staffRatings || []).filter((r) => r.rating > 0).length > 0 ? (
            (performanceData.staffRatings || [])
              .filter((r) => r.rating > 0)
              .map((rating) => (
                <div key={rating.staffId} className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-sm">
                  <strong>{getParticipantName(rating.staffId, 'staff')}</strong> — {displayScore(rating.rating)}/10
                  {rating.comment && <span className="text-gray-600"> · {rating.comment}</span>}
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-400 italic">Aucune évaluation staff.</p>
          )}
        </div>
      )}
      {!isRiderUser && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Débriefings personnels des coureurs</h4>
          {eventRiderDebriefs.length > 0 ? (
            eventRiderDebriefs.map(renderRiderSelfDebriefCard)
          ) : (
            <p className="text-sm text-gray-400 italic">Aucun débriefing personnel reçu pour le moment.</p>
          )}
        </div>
      )}
    </div>
  );
};

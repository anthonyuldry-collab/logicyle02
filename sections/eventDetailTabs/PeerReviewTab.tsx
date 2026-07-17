import React, { useMemo } from 'react';
import { AppState, RaceEvent, PeerRating, User, RiderEventSelection, UserRole } from '../../types';
import EventTabHeader from '../../components/eventDetail/EventTabHeader';
import ContributionRatingPicker from '../../components/eventDetail/ContributionRatingPicker';
import {
  getContributionRatingBadgeClass,
  getContributionRatingLabel,
  getPerformanceRatingCriteria,
  getPerformanceRatingLabel,
} from '../../utils/contributionRatingUtils';
import { getRiderProfileForUser, isRiderAbsentFromEvent } from '../../utils/eventRiderUtils';

interface PeerReviewTabProps {
  event: RaceEvent;
  appState: AppState;
  setPeerRatings: (updater: React.SetStateAction<PeerRating[]>) => void;
  currentUser: User;
  riderEventSelections: RiderEventSelection[];
  raterUserId?: string;
}

type PeerRatingField = 'rating' | 'technicalScore' | 'physicalScore';

interface DimensionStats {
  total: number;
  count: number;
  average: number;
}

interface RiderPeerStats {
  contribution: DimensionStats;
  technical: DimensionStats;
  physical: DimensionStats;
}

const emptyDimensionStats = (): DimensionStats => ({ total: 0, count: 0, average: 0 });

const emptyRiderStats = (): RiderPeerStats => ({
  contribution: emptyDimensionStats(),
  technical: emptyDimensionStats(),
  physical: emptyDimensionStats(),
});

const isValidScore = (score: number | undefined): score is number =>
  score != null && score >= 1 && score <= 10;

const PeerReviewTab: React.FC<PeerReviewTabProps> = ({
  event,
  appState,
  setPeerRatings,
  currentUser,
  riderEventSelections,
  raterUserId,
}) => {
  const { riders, peerRatings } = appState;
  const isManagerView = currentUser.userRole !== UserRole.COUREUR;

  const currentRiderProfile = useMemo(
    () => getRiderProfileForUser(riders, currentUser),
    [riders, currentUser]
  );

  const raterRiderId = currentRiderProfile?.id ?? currentUser.id;

  const isCurrentRiderAbsent = useMemo(() => {
    if (!currentRiderProfile) return false;
    return isRiderAbsentFromEvent(currentRiderProfile.id, event.id, riderEventSelections);
  }, [currentRiderProfile, event.id, riderEventSelections]);

  const eventRiders = useMemo(() => {
    return riders.filter((r) => event.selectedRiderIds?.includes(r.id));
  }, [riders, event.selectedRiderIds]);

  const upsertPeerRating = (
    ratedRiderId: string,
    field: PeerRatingField,
    value: number | undefined
  ) => {
    if (value != null && (value < 1 || value > 10)) return;

    setPeerRatings((prevRatings) => {
      const existingRatingIndex = prevRatings.findIndex(
        (r) =>
          r.eventId === event.id &&
          r.raterRiderId === raterRiderId &&
          r.ratedRiderId === ratedRiderId
      );
      const newRatings = [...prevRatings];

      if (existingRatingIndex > -1) {
        const existing = {
          ...newRatings[existingRatingIndex],
          [field]: value,
          raterUserId: raterUserId ?? currentUser.id,
        };
        const hasAnyScore =
          isValidScore(existing.rating) ||
          isValidScore(existing.technicalScore) ||
          isValidScore(existing.physicalScore);
        if (!hasAnyScore) {
          newRatings.splice(existingRatingIndex, 1);
        } else {
          newRatings[existingRatingIndex] = existing;
        }
      } else if (value != null) {
        newRatings.push({
          id: `${event.id}-${raterRiderId}-${ratedRiderId}`,
          eventId: event.id,
          raterRiderId,
          raterUserId: raterUserId ?? currentUser.id,
          ratedRiderId,
          [field]: value,
        });
      }

      return newRatings;
    });
  };

  const myRatings = useMemo(() => {
    return peerRatings.filter(
      (r) => r.eventId === event.id && r.raterRiderId === raterRiderId
    );
  }, [peerRatings, event.id, raterRiderId]);

  const peerStatsByRider = useMemo(() => {
    const scores: Record<string, RiderPeerStats> = {};
    eventRiders.forEach((rider) => {
      scores[rider.id] = emptyRiderStats();
    });

    peerRatings
      .filter((r) => r.eventId === event.id)
      .forEach((entry) => {
        const stats = scores[entry.ratedRiderId];
        if (!stats) return;

        if (isValidScore(entry.rating)) {
          stats.contribution.total += entry.rating;
          stats.contribution.count++;
        }
        if (isValidScore(entry.technicalScore)) {
          stats.technical.total += entry.technicalScore;
          stats.technical.count++;
        }
        if (isValidScore(entry.physicalScore)) {
          stats.physical.total += entry.physicalScore;
          stats.physical.count++;
        }
      });

    Object.values(scores).forEach((stats) => {
      (['contribution', 'technical', 'physical'] as const).forEach((key) => {
        if (stats[key].count > 0) {
          stats[key].average = stats[key].total / stats[key].count;
        }
      });
    });

    return scores;
  }, [peerRatings, event.id, eventRiders]);

  const ratedCount = peerRatings.filter(
    (r) => r.eventId === event.id && isValidScore(r.rating)
  ).length;

  const renderDimensionCell = (
    avg: number,
    count: number,
    scale: 'contribution' | 'technical' | 'physical'
  ) => {
    if (count <= 0) {
      return <span className="text-sm text-gray-400">N/A</span>;
    }
    const rounded = Math.round(avg);
    const label =
      scale === 'contribution'
        ? getContributionRatingLabel(rounded)
        : getPerformanceRatingLabel(scale, rounded);
    return (
      <div className="space-y-0.5">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getContributionRatingBadgeClass(rounded)}`}>
          {avg.toFixed(1)}/10
        </span>
        <p className="text-[11px] text-gray-500 leading-snug">{label}</p>
      </div>
    );
  };

  const ManagerView = () => (
    <div className="space-y-4">
      <EventTabHeader
        title="Synthèse de l'esprit d'équipe"
        subtitle={`${eventRiders.length} coureur${eventRiders.length !== 1 ? 's' : ''} · ${ratedCount} évaluation${ratedCount !== 1 ? 's' : ''} · apport, technique et physique /10`}
      />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Coureur</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Apport moy.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Technique moy.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Physique moy.</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Évaluations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eventRiders.map((rider) => {
                const stats = peerStatsByRider[rider.id];
                const absent = isRiderAbsentFromEvent(rider.id, event.id, riderEventSelections);
                return (
                  <tr key={rider.id} className="hover:bg-blue-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {rider.firstName} {rider.lastName}
                        </span>
                        {absent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">Absent</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderDimensionCell(stats.contribution.average, stats.contribution.count, 'contribution')}</td>
                    <td className="px-4 py-3">{renderDimensionCell(stats.technical.average, stats.technical.count, 'technical')}</td>
                    <td className="px-4 py-3">{renderDimensionCell(stats.physical.average, stats.physical.count, 'physical')}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{stats.contribution.count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {ratedCount === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 border-t border-gray-100">
            Aucune évaluation enregistrée. Les coureuses présentes peuvent noter leurs coéquipières dans l&apos;onglet accessible depuis leur compte.
          </div>
        )}
      </div>
    </div>
  );

  const RiderView = () => {
    const teammates = eventRiders.filter((r) => r.id !== raterRiderId);

    if (!currentRiderProfile) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
          Profil coureur introuvable pour votre compte.
        </div>
      );
    }

    if (isCurrentRiderAbsent) {
      return (
        <div className="space-y-4">
          <EventTabHeader title="Évaluer mes coéquipiers" subtitle="Notation anonyme · barèmes /10 objectifs" />
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-amber-900">Vous êtes marqué(e) absent(e) sur cet événement.</p>
            <p className="text-xs text-amber-700 mt-2">Les coureurs absents ne peuvent pas évaluer leurs coéquipiers.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <EventTabHeader
          title="Évaluer mes coéquipiers"
          subtitle={`${teammates.length} coéquipier${teammates.length !== 1 ? 's' : ''} · notation anonyme · apport, technique et physique`}
        />
        <p className="text-xs text-gray-500 -mt-2">
          Votre évaluation est anonyme. Notez l&apos;apport, le niveau technique observable et la forme physique de chaque coéquipier selon les barèmes /10.
        </p>
        <div className="space-y-3">
          {teammates.map((rider) => {
            const entry = myRatings.find((r) => r.ratedRiderId === rider.id);
            const contribution = isValidScore(entry?.rating) ? entry.rating : undefined;
            const technical = entry?.technicalScore;
            const physical = entry?.physicalScore;
            const teammateAbsent = isRiderAbsentFromEvent(rider.id, event.id, riderEventSelections);

            return (
              <div
                key={rider.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {rider.firstName} {rider.lastName}
                  </p>
                  {teammateAbsent && (
                    <span className="inline-flex mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      Absente sur l&apos;événement
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <ContributionRatingPicker
                      compact
                      allowAbsent={false}
                      value={contribution}
                      onChange={(val) => upsertPeerRating(rider.id, 'rating', val)}
                    />
                  </div>
                  <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-3">
                    <ContributionRatingPicker
                      compact
                      scale="technical"
                      allowAbsent={false}
                      value={technical}
                      onChange={(val) => upsertPeerRating(rider.id, 'technicalScore', val)}
                    />
                  </div>
                  <div className="rounded-lg border border-teal-100 bg-teal-50/30 p-3">
                    <ContributionRatingPicker
                      compact
                      scale="physical"
                      allowAbsent={false}
                      value={physical}
                      onChange={(val) => upsertPeerRating(rider.id, 'physicalScore', val)}
                    />
                  </div>
                </div>

                {(contribution != null || technical != null || physical != null) && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-500">
                    {contribution != null && (
                      <p>
                        <span className="font-medium text-gray-700">Apport :</span>{' '}
                        {getPerformanceRatingCriteria('contribution', contribution)}
                      </p>
                    )}
                    {technical != null && (
                      <p>
                        <span className="font-medium text-gray-700">Technique :</span>{' '}
                        {getPerformanceRatingCriteria('technical', technical)}
                      </p>
                    )}
                    {physical != null && (
                      <p>
                        <span className="font-medium text-gray-700">Physique :</span>{' '}
                        {getPerformanceRatingCriteria('physical', physical)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {teammates.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Aucun coéquipier à évaluer sur cet événement.
          </div>
        )}
      </div>
    );
  };

  return <div>{isManagerView ? <ManagerView /> : <RiderView />}</div>;
};

export default PeerReviewTab;

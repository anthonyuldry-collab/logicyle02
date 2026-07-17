import React, { useMemo } from 'react';
import { AppState, RaceEvent, Rider } from '../../types';
import { getEventSelectedRiders } from '../../utils/staffRoleDataAccess';

interface HealthMissionTabProps {
  event: RaceEvent;
  appState: AppState;
  title: string;
  subtitle: string;
}

const HealthMissionTab: React.FC<HealthMissionTabProps> = ({
  event,
  appState,
  title,
  subtitle,
}) => {
  const selectedRiders = useMemo(
    () => getEventSelectedRiders(event, appState.riders),
    [event, appState.riders],
  );

  const renderRider = (rider: Rider) => (
    <div key={rider.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="font-semibold text-gray-900">
        {rider.firstName} {rider.lastName}
      </h4>
      <p className="mt-1 text-sm text-gray-600">
        État : <span className="font-medium">{rider.healthCondition || 'Non renseigné'}</span>
      </p>
      {(rider.allergies?.length ?? 0) > 0 && (
        <ul className="mt-2 text-sm text-amber-900 space-y-1">
          {rider.allergies!.map((a, i) => (
            <li key={i}>
              • {a.customAllergenName || a.allergenKey} — {a.regimeDetails || a.severity}
            </li>
          ))}
        </ul>
      )}
      {rider.assistantInstructions && (
        <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
          {rider.assistantInstructions}
        </p>
      )}
    </div>
  );

  if (selectedRiders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
        Aucun athlète sélectionné sur cette course.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <h3 className="text-base font-semibold text-emerald-900">{title} — {event.name}</h3>
        <p className="mt-1 text-sm text-emerald-800">{subtitle}</p>
      </div>
      {selectedRiders.map(renderRider)}
    </div>
  );
};

export default HealthMissionTab;

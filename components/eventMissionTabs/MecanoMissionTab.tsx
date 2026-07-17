import React, { useMemo } from 'react';
import { AppState, BikeSetup, RaceEvent, Rider } from '../../types';
import { getEventSelectedRiders } from '../../utils/staffRoleDataAccess';
import { eventHasTimeTrial } from '../../utils/stageRaceUtils';
import {
  formatTirePressureDisplay,
  getPreferredTirePressureCell,
} from '../../utils/tirePressureUtils';

interface MecanoMissionTabProps {
  event: RaceEvent;
  appState: AppState;
}

function formatBikeSummary(setup?: BikeSetup): string {
  return [setup?.brand, setup?.model, setup?.size].filter(Boolean).join(' · ') || '—';
}

function TirePressureReadout({ setup, label }: { setup?: BikeSetup; label: string }) {
  const { cell, conditionsLabel } = getPreferredTirePressureCell(setup?.tirePressures);

  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-800">
        <span>
          <span className="text-gray-500">AV</span>{' '}
          <span className="font-medium">{formatTirePressureDisplay(cell.front)}</span>
        </span>
        <span>
          <span className="text-gray-500">AR</span>{' '}
          <span className="font-medium">{formatTirePressureDisplay(cell.rear)}</span>
        </span>
      </div>
      {conditionsLabel && (cell.front?.trim() || cell.rear?.trim()) && (
        <p className="mt-0.5 text-[11px] text-gray-400">{conditionsLabel}</p>
      )}
    </div>
  );
}

function RiderEquipmentCard({ rider, showTimeTrial }: { rider: Rider; showTimeTrial: boolean }) {
  const gridCols = showTimeTrial ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="font-semibold text-gray-900">
        {rider.firstName} {rider.lastName}
      </h4>
      <div className={`mt-3 grid gap-4 text-sm ${gridCols}`}>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Vélo route</p>
          <p className="mt-1 text-gray-800">{formatBikeSummary(rider.roadBikeSetup)}</p>
        </div>
        <TirePressureReadout setup={rider.roadBikeSetup} label="Pressions route" />
        {showTimeTrial && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Vélo CLM</p>
              <p className="mt-1 text-gray-800">{formatBikeSummary(rider.ttBikeSetup)}</p>
            </div>
            <TirePressureReadout setup={rider.ttBikeSetup} label="Pressions CLM" />
          </>
        )}
      </div>
      {(rider.clothing?.length ?? 0) > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Textile / tailles</p>
          <ul className="space-y-0.5 text-sm text-gray-700">
            {rider.clothing!.map((item, i) => (
              <li key={i}>
                {item.type} — {item.brand || '—'} {item.size ? `(taille ${item.size})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const MecanoMissionTab: React.FC<MecanoMissionTabProps> = ({ event, appState }) => {
  const selectedRiders = useMemo(
    () => getEventSelectedRiders(event, appState.riders),
    [event, appState.riders],
  );

  const showTimeTrial = useMemo(() => eventHasTimeTrial(event), [event]);

  if (selectedRiders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
        Aucun coureur sélectionné sur cette course.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
        <h3 className="text-base font-semibold text-orange-900">Mission mécano — {event.name}</h3>
        <p className="mt-1 text-sm text-orange-800">
          Vélos, pressions pneus (AV / AR) et équipement des partants
          {showTimeTrial ? ' — étape chrono incluse' : ''}.
        </p>
      </div>

      {selectedRiders.map(rider => (
        <RiderEquipmentCard key={rider.id} rider={rider} showTimeTrial={showTimeTrial} />
      ))}
    </div>
  );
};

export default MecanoMissionTab;

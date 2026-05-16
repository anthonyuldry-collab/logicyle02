import React from 'react';
import { Rider, StageRiderStartTime } from '../../types';

interface StageTimeTrialDeparturesProps {
  isTimeTrial: boolean;
  premierDepartTime: string;
  riderStartTimes: StageRiderStartTime[];
  riders: Rider[];
  isEditing: boolean;
  inputClassName: string;
  onTimeTrialChange: (checked: boolean) => void;
  onPremierDepartTimeChange: (time: string) => void;
  onRiderDepartTimeChange: (riderId: string, departTime: string) => void;
}

const StageTimeTrialDepartures: React.FC<StageTimeTrialDeparturesProps> = ({
  isTimeTrial,
  premierDepartTime,
  riderStartTimes,
  riders,
  isEditing,
  inputClassName,
  onTimeTrialChange,
  onPremierDepartTimeChange,
  onRiderDepartTimeChange,
}) => {
  const riderName = (riderId: string) => {
    const r = riders.find(x => x.id === riderId);
    return r ? `${r.firstName} ${r.lastName}` : 'Coureuse';
  };

  const sortedStarts = [...riderStartTimes].sort((a, b) => {
    const orderA = a.startOrder ?? 999;
    const orderB = b.startOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return riderName(a.riderId).localeCompare(riderName(b.riderId), 'fr');
  });

  if (!isEditing) {
    return (
      <div className="md:col-span-2 space-y-2 border-t border-violet-200 pt-4 mt-2">
        <p>
          <strong>Contre-la-montre :</strong> {isTimeTrial ? 'Oui' : 'Non'}
        </p>
        {isTimeTrial && (
          <div className="space-y-1">
            <p>
              <strong>Heure du premier départ :</strong>{' '}
              {premierDepartTime?.trim() || 'N/A'}
            </p>
            <p className="text-sm font-medium text-violet-900">Départs individuels</p>
            {sortedStarts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aucune coureuse renseignée.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {sortedStarts.map((rst, idx) => (
                  <li key={rst.riderId} className="flex justify-between gap-4 border-b border-gray-100 py-1">
                    <span>
                      {rst.startOrder ?? idx + 1}. {riderName(rst.riderId)}
                    </span>
                    <span className="font-medium">{rst.departTime || 'N/A'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="md:col-span-2 space-y-4 border-t border-violet-200 pt-4 mt-2">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isTimeTrial"
          checked={Boolean(isTimeTrial)}
          onChange={e => onTimeTrialChange(e.target.checked)}
          className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
        />
        <label htmlFor="isTimeTrial" className="ml-2 text-sm font-medium text-gray-700">
          Contre-la-montre (départs échelonnés par coureuse, sans départ fictif)
        </label>
      </div>

      {isTimeTrial && (
        <div>
          <div className="mb-4">
            <label htmlFor="premierDepartTime" className="block text-sm font-medium text-gray-700">
              Heure du premier départ
            </label>
            <input
              id="premierDepartTime"
              type="text"
              value={premierDepartTime}
              onChange={e => onPremierDepartTimeChange(e.target.value)}
              placeholder="Ex: 13h00"
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-violet-700">
              Utilisée pour planifier l&apos;arrivée sur site : l&apos;équipe doit être présente environ 1h30
              avant ce départ (et non 30 min comme sur une course en ligne).
            </p>
          </div>
          <p className="text-sm text-violet-800 bg-violet-50 border border-violet-200 rounded-md px-3 py-2 mb-3">
            Renseignez l&apos;heure de départ de chaque coureuse. Le départ fictif et le départ réel groupé
            ne s&apos;appliquent pas.
          </p>
          {sortedStarts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Aucune coureuse sélectionnée pour cet événement (onglet Participants).
            </p>
          ) : (
            <div className="border border-violet-100 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-violet-50 text-xs font-semibold text-violet-900 uppercase">
                <span className="col-span-1">#</span>
                <span className="col-span-7">Coureuse</span>
                <span className="col-span-4">Heure de départ</span>
              </div>
              {sortedStarts.map((rst, idx) => (
                <div
                  key={rst.riderId}
                  className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-t border-violet-50"
                >
                  <span className="col-span-1 text-sm text-gray-500">{rst.startOrder ?? idx + 1}</span>
                  <span className="col-span-7 text-sm font-medium text-gray-800">
                    {riderName(rst.riderId)}
                  </span>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={rst.departTime}
                      onChange={e => onRiderDepartTimeChange(rst.riderId, e.target.value)}
                      placeholder="Ex: 13h05"
                      className={inputClassName}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StageTimeTrialDepartures;

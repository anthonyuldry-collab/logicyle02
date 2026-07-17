import React, { useMemo, useState } from 'react';
import { ScoutingDataScope, ScoutingRequest } from '../types';
import ActionButton from './ActionButton';
import {
  ALL_SCOUTING_DATA_SCOPES,
  SCOUTING_DATA_SCOPE_OPTIONS,
  isContactScoutingRequest,
} from '../utils/scoutingProspectUtils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface ScoutingRequestResponseCardProps {
  request: ScoutingRequest;
  teamName: string;
  onRespond: (
    requestId: string,
    response: 'accepted' | 'rejected',
    grantedScopes?: ScoutingDataScope[],
  ) => void | Promise<void>;
}

const ScoutingRequestResponseCard: React.FC<ScoutingRequestResponseCardProps> = ({
  request,
  teamName,
  onRespond,
}) => {
  const requestedScopes = useMemo(
    () => request.requestedScopes?.length ? request.requestedScopes : ALL_SCOUTING_DATA_SCOPES,
    [request.requestedScopes],
  );

  const [grantedScopes, setGrantedScopes] = useState<ScoutingDataScope[]>(requestedScopes);

  const toggleScope = (scope: ScoutingDataScope) => {
    setGrantedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope],
    );
  };

  if (!isContactScoutingRequest(request)) return null;

  return (
    <div className="p-3 bg-white rounded-md border border-blue-100 space-y-3">
      <div>
        <p className="text-sm text-gray-800">
          L&apos;équipe <strong>{teamName}</strong> souhaite entrer en contact avec vous.
        </p>
        {request.message && <p className="text-sm text-gray-600 mt-1">{request.message}</p>}
        <p className="text-xs text-gray-500 mt-1">
          Demande du {new Date(request.requestDate).toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Choisissez ce que vous acceptez de partager
        </p>
        {SCOUTING_DATA_SCOPE_OPTIONS.filter(o => requestedScopes.includes(o.value)).map(
          ({ value, label, description }) => (
            <label key={value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={grantedScopes.includes(value)}
                onChange={() => toggleScope(value)}
                className="mt-1 rounded border-gray-300"
              />
              <span className="text-sm">
                <span className="font-medium text-gray-800">{label}</span>
                <span className="block text-xs text-gray-500">{description}</span>
              </span>
            </label>
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <ActionButton
          onClick={() => onRespond(request.id, 'rejected')}
          variant="danger"
          size="sm"
          icon={<XCircleIcon className="w-4 h-4" />}
        >
          Refuser
        </ActionButton>
        <ActionButton
          onClick={() =>
            onRespond(
              request.id,
              'accepted',
              grantedScopes.length > 0 ? grantedScopes : undefined,
            )
          }
          variant="primary"
          size="sm"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          disabled={grantedScopes.length === 0}
        >
          Accepter la sélection
        </ActionButton>
      </div>
    </div>
  );
};

export default ScoutingRequestResponseCard;

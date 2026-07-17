import React, { useEffect, useState } from 'react';
import { Rider } from '../../types';
import ActionButton from '../ActionButton';
import SearchIcon from '../icons/SearchIcon';
import {
  buildDirectVeloSearchUrl,
  buildPcsSearchUrl,
  isValidHttpUrl,
  openExternalUrl,
} from '../../utils/cyclingResultsLinks';

interface ExternalResultsSearchPanelProps {
  rider: Rider;
  onSave?: (updates: Pick<Rider, 'pcsUrl' | 'directVeloUrl'>) => Promise<void> | void;
}

const ExternalResultsSearchPanel: React.FC<ExternalResultsSearchPanelProps> = ({ rider, onSave }) => {
  const defaultTerm = `${rider.firstName ?? ''} ${rider.lastName ?? ''}`.trim();
  const [searchTerm, setSearchTerm] = useState(defaultTerm);
  const [pcsUrl, setPcsUrl] = useState(rider.pcsUrl ?? '');
  const [directVeloUrl, setDirectVeloUrl] = useState(rider.directVeloUrl ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearchTerm(defaultTerm);
    setPcsUrl(rider.pcsUrl ?? '');
    setDirectVeloUrl(rider.directVeloUrl ?? '');
  }, [rider.id, rider.pcsUrl, rider.directVeloUrl, defaultTerm]);

  const handleSearchPcs = () => {
    openExternalUrl(buildPcsSearchUrl(rider.firstName, rider.lastName, searchTerm));
  };

  const handleSearchDirectVelo = () => {
    openExternalUrl(buildDirectVeloSearchUrl(rider.firstName, rider.lastName, searchTerm));
  };

  const handleSaveLinks = async () => {
    if (!onSave) return;
    setIsSaving(true);
    setSavedMessage(null);
    try {
      await onSave({
        pcsUrl: pcsUrl.trim() || undefined,
        directVeloUrl: directVeloUrl.trim() || undefined,
      });
      setSavedMessage('Liens enregistrés');
      setTimeout(() => setSavedMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const hasLinkChanges =
    (pcsUrl.trim() || '') !== (rider.pcsUrl?.trim() || '') ||
    (directVeloUrl.trim() || '') !== (rider.directVeloUrl?.trim() || '');

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Rechercher mon palmarès</h3>
        <p className="text-sm text-gray-500 mt-1">
          Consultez vos résultats sur ProCyclingStats ou DirectVélo. Enregistrez vos pages profil pour y accéder en un clic.
        </p>
      </div>

      <div>
        <label htmlFor="results-search-term" className="block text-sm font-medium text-gray-700 mb-1">
          Nom à rechercher
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="results-search-term"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Prénom Nom"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSearchPcs}
            icon={<SearchIcon className="w-4 h-4" />}
          >
            ProCyclingStats
          </ActionButton>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSearchDirectVelo}
            icon={<SearchIcon className="w-4 h-4" />}
          >
            DirectVélo
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
        <div className="space-y-2">
          <label htmlFor="pcs-url" className="block text-sm font-medium text-gray-700">
            Lien profil ProCyclingStats
          </label>
          <input
            id="pcs-url"
            type="url"
            value={pcsUrl}
            onChange={e => setPcsUrl(e.target.value)}
            placeholder="https://www.procyclingstats.com/rider/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            {isValidHttpUrl(pcsUrl) && (
              <ActionButton type="button" variant="secondary" size="sm" onClick={() => openExternalUrl(pcsUrl)}>
                Ouvrir PCS
              </ActionButton>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="directvelo-url" className="block text-sm font-medium text-gray-700">
            Lien profil DirectVélo
          </label>
          <input
            id="directvelo-url"
            type="url"
            value={directVeloUrl}
            onChange={e => setDirectVeloUrl(e.target.value)}
            placeholder="https://www.directvelo.com/coureur/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            {isValidHttpUrl(directVeloUrl) && (
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => openExternalUrl(directVeloUrl)}
              >
                Ouvrir DirectVélo
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      {onSave && (
        <div className="flex items-center gap-3">
          <ActionButton
            type="button"
            size="sm"
            onClick={handleSaveLinks}
            disabled={isSaving || !hasLinkChanges}
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer mes liens'}
          </ActionButton>
          {savedMessage && <span className="text-sm text-green-600">{savedMessage}</span>}
        </div>
      )}
    </div>
  );
};

export default ExternalResultsSearchPanel;

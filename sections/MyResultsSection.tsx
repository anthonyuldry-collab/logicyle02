import React, { useMemo } from 'react';
import { DisciplinePracticed, Rider, User, UserRole } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import TrophyIcon from '../components/icons/TrophyIcon';
import ExternalResultsSearchPanel from '../components/results/ExternalResultsSearchPanel';
import { getOwnRider } from '../utils/riderAccessUtils';
import { userToRiderProfile } from '../utils/independentUtils';

interface MyResultsSectionProps {
  riders: Rider[];
  currentUser: User;
  onSaveRider?: (rider: Rider) => void | Promise<void>;
}

const MyResultsSection: React.FC<MyResultsSectionProps> = ({
  riders,
  currentUser,
  onSaveRider,
}) => {
  const safeRiders = Array.isArray(riders) ? riders : [];

  const riderProfile =
    getOwnRider(safeRiders, currentUser) ||
    (currentUser.userRole === UserRole.COUREUR ||
    String(currentUser.userRole).toLowerCase() === 'coureur'
      ? userToRiderProfile(currentUser)
      : undefined);

  const recentResults = useMemo(() => {
    if (!riderProfile?.resultsHistory?.length) return [];
    return [...riderProfile.resultsHistory]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);
  }, [riderProfile?.resultsHistory]);

  if (!riderProfile) {
    return (
      <SectionWrapper title="Mon Palmarès">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <TrophyIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  const handleSaveLinks = async (updates: Pick<Rider, 'pcsUrl' | 'directVeloUrl'>) => {
    if (!onSaveRider) return;
    await onSaveRider({ ...riderProfile, ...updates });
  };

  return (
    <SectionWrapper title="Mon Palmarès">
      <div className="space-y-6">
        <ExternalResultsSearchPanel rider={riderProfile} onSave={onSaveRider ? handleSaveLinks : undefined} />

        {recentResults.length > 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résultats enregistrés dans LogiCycle</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Course</th>
                    <th className="py-2 pr-4 font-medium">Rang</th>
                    <th className="py-2 font-medium">Discipline</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.map(result => (
                    <tr key={result.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 pr-4 text-gray-700 whitespace-nowrap">
                        {result.date
                          ? new Date(result.date + 'T12:00:00').toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-900">{result.eventName || result.raceName || '—'}</td>
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{result.rank ?? result.position ?? '—'}</td>
                      <td className="py-2.5 text-gray-600">{result.discipline || DisciplinePracticed.ROUTE}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Les résultats détaillés et l’historique complet sont disponibles dans Ma Carrière.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            Aucun résultat enregistré localement pour le moment. Utilisez la recherche ci-dessus pour consulter votre
            palmarès sur ProCyclingStats ou DirectVélo.
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default MyResultsSection;

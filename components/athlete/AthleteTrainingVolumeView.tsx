import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '../../types';
import { NolioTraining, WeeklyTrainingSummary } from '../../types/nolio';
import {
  aggregateTrainingsByWeek,
  computeTrainingPeriodTotals,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSaddleHours,
  getDateRangeWeeks,
} from '../../utils/nolioTrainingUtils';
import {
  buildNolioAuthorizeUrl,
  disconnectNolio,
  fetchNolioTrainings,
  getNolioConnectionStatus,
  isNolioConfigured,
} from '../../services/nolioService';
import ChartBarIcon from '../icons/ChartBarIcon';

interface AthleteTrainingVolumeViewProps {
  currentUser: User;
  onConnectionChange?: (connected: boolean) => void;
}

const WEEKS_TO_SHOW = 12;

const SummaryCard: React.FC<{ label: string; value: string; sub?: string; accent?: string }> = ({
  label,
  value,
  sub,
  accent = 'text-gray-900',
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-bold tabular-nums mt-1 ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const WeekBar: React.FC<{ week: WeeklyTrainingSummary; maxHours: number }> = ({ week, maxHours }) => {
  const hours = week.totalDurationSeconds / 3600;
  const widthPct = maxHours > 0 ? Math.min(100, (hours / maxHours) * 100) : 0;
  const maxElev = week.totalElevationMeters;

  return (
    <div className="space-y-2 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800">{week.weekLabel}</span>
        <span className="text-xs text-gray-500 tabular-nums">
          {week.sessionCount} séance{week.sessionCount > 1 ? 's' : ''}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-700 font-medium">Heures de selle</span>
          <span className="font-bold text-blue-900 tabular-nums">{formatSaddleHours(week.totalDurationSeconds)}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
        <div className="bg-white rounded-md py-1.5 border border-gray-100">
          <div className="font-semibold text-gray-900 tabular-nums">{formatSaddleHours(week.totalDurationSeconds)}</div>
          <div className="text-gray-400 mt-0.5">Selle</div>
        </div>
        <div className="bg-white rounded-md py-1.5 border border-gray-100">
          <div className="font-semibold text-emerald-700 tabular-nums">{formatElevation(maxElev)}</div>
          <div className="text-gray-400 mt-0.5">D+</div>
        </div>
        <div className="bg-white rounded-md py-1.5 border border-gray-100">
          <div className="font-semibold text-gray-800 tabular-nums">{formatDistance(week.totalDistanceMeters)}</div>
          <div className="text-gray-400 mt-0.5">Distance</div>
        </div>
      </div>
    </div>
  );
};

const AthleteTrainingVolumeView: React.FC<AthleteTrainingVolumeViewProps> = ({
  currentUser,
  onConnectionChange,
}) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<NolioTraining[]>([]);
  const [connecting, setConnecting] = useState(false);

  const redirectUri = useMemo(() => `${window.location.origin}${window.location.pathname}`, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await getNolioConnectionStatus();
      setConnected(status.connected);
      onConnectionChange?.(status.connected);

      if (!status.connected) {
        setTrainings([]);
        return;
      }

      const { from, to } = getDateRangeWeeks(WEEKS_TO_SHOW);
      const response = await fetchNolioTrainings(from, to);
      setTrainings(response.trainings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les séances Nolio');
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  }, [onConnectionChange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const weeklySummaries = useMemo(
    () => aggregateTrainingsByWeek(trainings).slice(0, WEEKS_TO_SHOW),
    [trainings]
  );

  const periodTotals = useMemo(() => computeTrainingPeriodTotals(trainings), [trainings]);

  const maxWeekHours = useMemo(
    () => Math.max(...weeklySummaries.map(w => w.totalDurationSeconds / 3600), 1),
    [weeklySummaries]
  );

  const currentWeek = weeklySummaries[0];
  const avgWeeklyHours = useMemo(() => {
    if (weeklySummaries.length === 0) return 0;
    const total = weeklySummaries.reduce((s, w) => s + w.totalDurationSeconds, 0);
    return total / weeklySummaries.length / 3600;
  }, [weeklySummaries]);

  const totalElevation = useMemo(
    () => weeklySummaries.reduce((s, w) => s + w.totalElevationMeters, 0),
    [weeklySummaries]
  );

  const handleConnect = () => {
    if (!isNolioConfigured()) {
      setError('Intégration Nolio non configurée (VITE_NOLIO_CLIENT_ID manquant).');
      return;
    }
    setConnecting(true);
    try {
      window.location.href = buildNolioAuthorizeUrl(redirectUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur OAuth Nolio');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectNolio();
      setConnected(false);
      setTrainings([]);
      onConnectionChange?.(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur déconnexion');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        Chargement des volumes d&apos;entraînement…
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 text-center">
          <ChartBarIcon className="w-12 h-12 mx-auto text-blue-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Volume d&apos;entraînement (Nolio)</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Connectez Nolio pour suivre vos heures de selle, séances, distance et dénivelé par semaine.
          </p>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || !isNolioConfigured()}
            className="mt-5 inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {connecting ? 'Redirection…' : 'Connecter Nolio'}
          </button>
          {!isNolioConfigured() && (
            <p className="text-xs text-amber-600 mt-3">
              Configuration serveur requise : VITE_NOLIO_CLIENT_ID + Cloud Functions Nolio.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Volume d&apos;entraînement</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Données Nolio · {currentUser.firstName} {currentUser.lastName} · {WEEKS_TO_SHOW} dernières semaines
          </p>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="text-xs text-gray-500 hover:text-red-600 underline"
        >
          Déconnecter Nolio
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
        <p className="text-xs font-medium text-blue-100 uppercase tracking-wide mb-3">
          Totaux sur {WEEKS_TO_SHOW} semaines
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatSaddleHours(periodTotals.saddleSeconds)}</p>
            <p className="text-xs text-blue-100 mt-0.5">Heures de selle</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{periodTotals.sessionCount}</p>
            <p className="text-xs text-blue-100 mt-0.5">Séances</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatDistance(periodTotals.distanceMeters)}</p>
            <p className="text-xs text-blue-100 mt-0.5">Distance</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatElevation(periodTotals.elevationMeters)}</p>
            <p className="text-xs text-blue-100 mt-0.5">Dénivelé</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Heures de selle (sem. en cours)"
          value={currentWeek ? formatSaddleHours(currentWeek.totalDurationSeconds) : '—'}
          sub={currentWeek ? `${currentWeek.sessionCount} séance(s)` : undefined}
          accent="text-blue-600"
        />
        <SummaryCard
          label="Moy. hebdo selle"
          value={avgWeeklyHours > 0 ? formatSaddleHours(avgWeeklyHours * 3600) : '—'}
          sub={`sur ${weeklySummaries.length} sem.`}
        />
        <SummaryCard
          label="D+ cumulé"
          value={formatElevation(totalElevation)}
          sub={`${WEEKS_TO_SHOW} semaines`}
          accent="text-emerald-600"
        />
        <SummaryCard
          label="Distance cumulée"
          value={formatDistance(periodTotals.distanceMeters)}
          sub={`${periodTotals.sessionCount} séances`}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Historique hebdomadaire</h4>
        {weeklySummaries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Aucune séance sur la période. Vos activités Nolio apparaîtront ici automatiquement.
          </p>
        ) : (
          <div className="space-y-4">
            {weeklySummaries.map(week => (
              <WeekBar key={week.weekStart} week={week} maxHours={maxWeekHours} />
            ))}
          </div>
        )}
      </div>

      {trainings.length > 0 && (
        <details className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer">
            Détail des séances ({trainings.length})
          </summary>
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Séance</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Heures selle</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Distance</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">D+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...trainings]
                  .sort((a, b) => b.date_start.localeCompare(a.date_start))
                  .slice(0, 50)
                  .map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{t.date_start}</td>
                      <td className="px-4 py-2 text-gray-900">{t.name || '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-blue-700">
                        {formatSaddleHours(t.duration ?? 0)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatDistance(t.distance ?? 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatElevation(t.elevation_gain ?? 0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
};

export default AthleteTrainingVolumeView;

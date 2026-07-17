import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import {
  PERFORMANCE_CONNECTION_CATEGORY_LABELS,
  PERFORMANCE_CONNECTION_PROVIDERS,
  PerformanceConnectionId,
  PerformanceConnectionProvider,
} from '../constants/performanceConnections';
import {
  buildNolioAuthorizeUrl,
  disconnectNolio,
  getNolioConnectionStatus,
  isNolioConfigured,
} from '../services/nolioService';
import { useTranslations } from '../hooks/useTranslations';

interface PerformanceConnectionsPanelProps {
  currentUser: User;
}

type LocalInterestMap = Partial<Record<PerformanceConnectionId, string>>;

const interestStorageKey = (userId: string) => `logicycle_perf_connections_interest_${userId}`;

function loadInterest(userId: string): LocalInterestMap {
  try {
    const raw = localStorage.getItem(interestStorageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as LocalInterestMap;
  } catch {
    return {};
  }
}

function saveInterest(userId: string, map: LocalInterestMap) {
  localStorage.setItem(interestStorageKey(userId), JSON.stringify(map));
}

const PerformanceConnectionsPanel: React.FC<PerformanceConnectionsPanelProps> = ({
  currentUser,
}) => {
  const { language } = useTranslations();
  const lang = language === 'en' ? 'en' : 'fr';

  const [nolioConnected, setNolioConnected] = useState(Boolean(currentUser.nolioConnected));
  const [nolioLoading, setNolioLoading] = useState(true);
  const [nolioBusy, setNolioBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interest, setInterest] = useState<LocalInterestMap>(() => loadInterest(currentUser.id));
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNolioLoading(true);
      try {
        const status = await getNolioConnectionStatus();
        if (!cancelled) setNolioConnected(Boolean(status.connected));
      } catch {
        if (!cancelled) setNolioConnected(Boolean(currentUser.nolioConnected));
      } finally {
        if (!cancelled) setNolioLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser.id, currentUser.nolioConnected]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 3500);
  }, []);

  const handleNolioConnect = async () => {
    setError(null);
    setNolioBusy(true);
    try {
      if (!isNolioConfigured()) {
        setError(
          lang === 'en'
            ? 'Nolio is not configured on this environment (VITE_NOLIO_CLIENT_ID).'
            : 'Nolio n’est pas configuré sur cet environnement (VITE_NOLIO_CLIENT_ID).',
        );
        return;
      }
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      window.location.href = buildNolioAuthorizeUrl(redirectUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur OAuth Nolio');
    } finally {
      setNolioBusy(false);
    }
  };

  const handleNolioDisconnect = async () => {
    setError(null);
    setNolioBusy(true);
    try {
      await disconnectNolio();
      setNolioConnected(false);
      showFlash(lang === 'en' ? 'Nolio disconnected.' : 'Nolio déconnecté.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de déconnecter Nolio');
    } finally {
      setNolioBusy(false);
    }
  };

  const toggleInterest = (id: PerformanceConnectionId) => {
    setInterest((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        showFlash(
          lang === 'en'
            ? 'Interest removed.'
            : 'Demande retirée.',
        );
      } else {
        next[id] = new Date().toISOString();
        showFlash(
          lang === 'en'
            ? 'Noted — we will prioritize this connector.'
            : 'Noté — ce connecteur sera priorisé dans le déploiement.',
        );
      }
      saveInterest(currentUser.id, next);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<PerformanceConnectionProvider['category'], PerformanceConnectionProvider[]>();
    for (const p of PERFORMANCE_CONNECTION_PROVIDERS) {
      const list = map.get(p.category) || [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, []);

  const liveCount = nolioConnected ? 1 : 0;
  const interestCount = Object.keys(interest).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-500/35 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold text-indigo-200">
          {lang === 'en' ? 'Automatic performance sync' : 'Mise à jour automatique des performances'}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {lang === 'en'
            ? 'Link your training and recovery platforms so LogiCycle can refresh power, volume, HRV and sessions without manual entry.'
            : 'Liez vos plateformes d’entraînement et de récupération pour que LogiCycle actualise puissance, volume, HRV et séances sans saisie manuelle.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-950 px-3 py-1 font-medium text-emerald-200">
            {liveCount} {lang === 'en' ? 'connected' : 'connectée(s)'}
          </span>
          <span className="rounded-full border border-amber-500/40 bg-amber-950 px-3 py-1 font-medium text-amber-200">
            {interestCount} {lang === 'en' ? 'requested' : 'demandée(s)'}
          </span>
        </div>
      </div>

      {flash && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950 px-4 py-2.5 text-sm text-emerald-100">
          {flash}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950 px-4 py-2.5 text-sm text-rose-100">
          {error}
        </div>
      )}

      {Array.from(grouped.entries()).map(([category, providers]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {PERFORMANCE_CONNECTION_CATEGORY_LABELS[category][lang]}
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {providers.map((provider) => {
              const isNolio = provider.id === 'nolio';
              const connected = isNolio && nolioConnected;
              const requested = Boolean(interest[provider.id]);
              const isLive = provider.availability === 'live';

              return (
                <article
                  key={provider.id}
                  className="rounded-xl border border-white/10 bg-slate-900 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: provider.accent }}
                      aria-hidden
                    >
                      {provider.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-white">{provider.name}</h5>
                        {connected ? (
                          <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                            {lang === 'en' ? 'Connected' : 'Connecté'}
                          </span>
                        ) : isLive ? (
                          <span className="rounded-full bg-indigo-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                            {lang === 'en' ? 'Available' : 'Disponible'}
                          </span>
                        ) : requested ? (
                          <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                            {lang === 'en' ? 'Requested' : 'Demandé'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                            {lang === 'en' ? 'Coming soon' : 'Bientôt'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{provider.syncs}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    {isNolio ? (
                      connected ? (
                        <button
                          type="button"
                          onClick={handleNolioDisconnect}
                          disabled={nolioBusy || nolioLoading}
                          className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                        >
                          {lang === 'en' ? 'Disconnect' : 'Déconnecter'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleNolioConnect}
                          disabled={nolioBusy || nolioLoading}
                          className="rounded-full bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                        >
                          {nolioBusy
                            ? lang === 'en'
                              ? 'Redirecting…'
                              : 'Redirection…'
                            : lang === 'en'
                              ? 'Connect'
                              : 'Connecter'}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleInterest(provider.id)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          requested
                            ? 'border border-amber-400/40 bg-amber-950 text-amber-100 hover:bg-amber-900'
                            : 'bg-indigo-500 text-white hover:bg-indigo-400'
                        }`}
                      >
                        {requested
                          ? lang === 'en'
                            ? 'Cancel request'
                            : 'Annuler la demande'
                          : lang === 'en'
                            ? 'Notify me'
                            : 'Me prévenir'}
                      </button>
                    )}
                    {provider.website && (
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                      >
                        {lang === 'en' ? 'Website' : 'Site'}
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs leading-relaxed text-slate-500">
        {lang === 'en'
          ? 'OAuth tokens are stored server-side when a connector is live. Coming-soon platforms can be requested so we prioritise what athletes use most (TrainingPeaks, WHOOP, Intervals.icu, Garmin, COROS, Strava…).'
          : 'Les tokens OAuth sont stockés côté serveur dès qu’un connecteur est actif. Pour les plateformes à venir, signalez votre intérêt afin que nous priorisions ce que les athlètes utilisent vraiment (TrainingPeaks, WHOOP, Intervals.icu, Garmin, COROS, Strava…).'}
      </p>
    </div>
  );
};

export default PerformanceConnectionsPanel;

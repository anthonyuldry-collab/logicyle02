import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Rider, BikeSetup } from '../../types';
import BikeFitPanel from './BikeFitPanel';
import BikeFitOverviewCard from './BikeFitOverviewCard';
import TirePressureQuickEntry from './TirePressureQuickEntry';
import {
  BIKE_SETUP_META,
  BikeSetupKey,
  countWearAlerts,
  ensureBikeWear,
  getMostUrgentWear,
  getWearPercent,
  getWearStatus,
  WEAR_COMPONENTS,
} from '../../utils/bikeWearUtils';
import { checkUciTtCompliance, countUciTtErrors, getUciHeightCategoryLabel } from '../../utils/uciBikeFitUtils';

export type BikeFitTabId = 'overview' | 'road' | 'tt' | 'wear';

interface RiderBikeFitWorkspaceProps {
  rider: Rider;
  onSaveRider: (rider: Rider) => void;
  onRiderUpdated?: (rider: Rider) => void;
}

const RiderBikeFitWorkspace: React.FC<RiderBikeFitWorkspaceProps> = ({
  rider,
  onSaveRider,
  onRiderUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<BikeFitTabId>('overview');
  const [pressureBike, setPressureBike] = useState<'road' | 'tt'>('road');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const persistSetup = useCallback((bikeKey: BikeSetupKey, setup: BikeSetup) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    const updated: Rider = { ...rider, [bikeKey]: setup };
    onRiderUpdated?.(updated);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSaveRider(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 700);
  }, [rider, onSaveRider, onRiderUpdated]);

  const stats = useMemo(() => {
    const road = rider.roadBikeSetup;
    const tt = rider.ttBikeSetup;
    const alerts = countWearAlerts([road, tt]);
    const urgent = getMostUrgentWear([road, tt]);
    const roadWear = ensureBikeWear(road);
    const ttWear = ensureBikeWear(tt);
    const allItems = WEAR_COMPONENTS.flatMap(c => [
      { ...c, bike: 'Route' as const, wear: roadWear[c.key]! },
      { ...c, bike: 'CLM' as const, wear: ttWear[c.key]! },
    ]);
    const critical = allItems.filter(i => getWearStatus(getWearPercent(i.wear)) === 'replace');
    const uciTtErrors = countUciTtErrors(checkUciTtCompliance({
      cotes: tt.cotes ?? {},
      heightCm: rider.heightCm,
      uciHeightListRegistered: tt.uciHeightListRegistered,
    }));
    return { alerts, urgent, critical, road, tt, uciTtErrors };
  }, [rider]);

  const tabs: { id: BikeFitTabId; label: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'road', label: 'Vélo Route' },
    { id: 'tt', label: 'Vélo CLM' },
    { id: 'wear', label: 'Suivi usure' },
  ];

  const pressureKey = pressureBike === 'road' ? 'roadBikeSetup' : 'ttBikeSetup';
  const pressureSetup = rider[pressureKey];
  const pressureMeta = BIKE_SETUP_META[pressureKey];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-gray-600">
            Cotes, pressions et usure — outil coureur / staff, pas un atelier complet
          </p>
          {rider.heightCm && (
            <p className="text-xs text-gray-400 mt-0.5">
              Taille {rider.heightCm} cm · {getUciHeightCategoryLabel(rider.heightCm)}
            </p>
          )}
        </div>
        {saveStatus === 'saving' && <span className="text-xs text-blue-600">Enregistrement…</span>}
        {saveStatus === 'saved' && <span className="text-xs text-emerald-600">✓ Enregistré</span>}
      </div>

      <div className="bg-white rounded-xl border p-1 flex flex-wrap gap-1 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {tab.id === 'wear' && stats.alerts > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {stats.alerts}
              </span>
            )}
            {tab.id === 'tt' && stats.uciTtErrors > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                UCI {stats.uciTtErrors}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          {(stats.critical.length > 0 || stats.uciTtErrors > 0) && (
            <div className="space-y-2">
              {stats.uciTtErrors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
                  {stats.uciTtErrors} non-conformité{stats.uciTtErrors > 1 ? 's' : ''} UCI sur le vélo CLM
                  {' '}
                  <button type="button" onClick={() => setActiveTab('tt')} className="underline font-medium">
                    Voir les cotes
                  </button>
                </div>
              )}
              {stats.critical.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-amber-900 mb-1">Usure à prévoir</p>
                  <ul className="text-sm text-amber-800 space-y-0.5">
                    {stats.critical.map((item, i) => (
                      <li key={i}>• {item.label} ({item.bike}) — {getWearPercent(item.wear)}%</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BikeFitOverviewCard
              bikeKey="roadBikeSetup"
              setup={rider.roadBikeSetup}
              onOpen={() => setActiveTab('road')}
            />
            <BikeFitOverviewCard
              bikeKey="ttBikeSetup"
              setup={rider.ttBikeSetup}
              heightCm={rider.heightCm}
              onOpen={() => setActiveTab('tt')}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-gray-900">Pressions pneus</h4>
                <p className="text-xs text-gray-500">Saisie rapide selon route et météo du jour</p>
              </div>
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                {(['road', 'tt'] as const).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPressureBike(key)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      pressureBike === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {key === 'road' ? 'Route' : 'CLM'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              <TirePressureQuickEntry
                grid={pressureSetup.tirePressures}
                onChange={tp => persistSetup(pressureKey, { ...pressureSetup, tirePressures: tp })}
                bikeLabel={pressureMeta.title}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('wear')}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            >
              Suivi usure détaillé
              {stats.alerts > 0 && (
                <span className="ml-1.5 text-amber-600 font-semibold">({stats.alerts} alerte{stats.alerts > 1 ? 's' : ''})</span>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'road' && (
        <BikeFitPanel bikeKey="roadBikeSetup" setup={rider.roadBikeSetup} onChange={s => persistSetup('roadBikeSetup', s)} showWear={false} heightCm={rider.heightCm} />
      )}
      {activeTab === 'tt' && (
        <BikeFitPanel bikeKey="ttBikeSetup" setup={rider.ttBikeSetup} onChange={s => persistSetup('ttBikeSetup', s)} showWear={false} heightCm={rider.heightCm} />
      )}
      {activeTab === 'wear' && (
        <div className="space-y-8">
          <BikeFitPanel bikeKey="roadBikeSetup" setup={rider.roadBikeSetup} onChange={s => persistSetup('roadBikeSetup', s)} wearOnly />
          <hr className="border-gray-200" />
          <BikeFitPanel bikeKey="ttBikeSetup" setup={rider.ttBikeSetup} onChange={s => persistSetup('ttBikeSetup', s)} wearOnly />
        </div>
      )}
    </div>
  );
};

export default RiderBikeFitWorkspace;

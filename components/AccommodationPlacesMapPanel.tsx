import React, { useEffect, useMemo, useState } from 'react';
import {
  AccommodationPlaceGroup,
  buildGeocodeQuery,
  geocodeAddress,
  sleep,
} from '../utils/accommodationGeoUtils';

interface AccommodationPlacesMapPanelProps {
  places: AccommodationPlaceGroup[];
  selectedKey?: string | null;
  onSelectPlace?: (key: string) => void;
  language?: 'fr' | 'en';
  onCoordsResolved?: (key: string, lat: number, lng: number) => void;
}

function computeBounds(markers: { lat: number; lng: number }[]) {
  if (markers.length === 0) {
    return { minLat: 41.2, maxLat: 51.2, minLng: -5.2, maxLng: 9.8 };
  }
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const pad = markers.length === 1 ? 0.04 : 0.02;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
}

const AccommodationPlacesMapPanel: React.FC<AccommodationPlacesMapPanelProps> = ({
  places,
  selectedKey,
  onSelectPlace,
  language = 'fr',
  onCoordsResolved,
}) => {
  const [coordsByKey, setCoordsByKey] = useState<Record<string, { lat: number; lng: number }>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const missing = places.filter((p) => {
        if (p.lat != null && p.lng != null) return false;
        if (coordsByKey[p.key]) return false;
        return Boolean(p.address && p.address !== 'Adresse non renseignée');
      });

      // Précharger les coords déjà connues
      const known: Record<string, { lat: number; lng: number }> = {};
      for (const p of places) {
        if (p.lat != null && p.lng != null) known[p.key] = { lat: p.lat, lng: p.lng };
      }
      if (Object.keys(known).length > 0) {
        setCoordsByKey((prev) => ({ ...known, ...prev }));
      }

      if (missing.length === 0) return;

      setGeocoding(true);
      setGeocodeProgress({ done: 0, total: missing.length });

      for (let i = 0; i < missing.length; i++) {
        if (cancelled) return;
        const place = missing[i];
        const query = buildGeocodeQuery(place.hotelName, place.address, place.cityHint);
        const coords = await geocodeAddress(query);
        if (cancelled) return;
        if (coords) {
          setCoordsByKey((prev) => ({ ...prev, [place.key]: coords }));
          onCoordsResolved?.(place.key, coords.lat, coords.lng);
        }
        setGeocodeProgress({ done: i + 1, total: missing.length });
        if (i < missing.length - 1) await sleep(350);
      }

      if (!cancelled) setGeocoding(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when place keys change
  }, [places.map((p) => p.key).join('|')]);

  const markers = useMemo(() => {
    return places
      .map((p) => {
        const c = (p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null) || coordsByKey[p.key];
        if (!c) return null;
        return { ...p, lat: c.lat, lng: c.lng };
      })
      .filter(Boolean) as Array<AccommodationPlaceGroup & { lat: number; lng: number }>;
  }, [places, coordsByKey]);

  const bounds = useMemo(
    () => computeBounds(markers.map((m) => ({ lat: m.lat, lng: m.lng }))),
    [markers],
  );

  const toPosition = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / Math.max(0.0001, bounds.maxLng - bounds.minLng)) * 100;
    const y = (1 - (lat - bounds.minLat) / Math.max(0.0001, bounds.maxLat - bounds.minLat)) * 100;
    return {
      left: `${Math.min(96, Math.max(4, x))}%`,
      top: `${Math.min(92, Math.max(8, y))}%`,
    };
  };

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const mapBg = `https://www.openstreetmap.org/export/embed.html?bbox=${bounds.minLng}%2C${bounds.minLat}%2C${bounds.maxLng}%2C${bounds.maxLat}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;

  return (
    <div className="space-y-3">
      <div className="relative h-80 overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-lg">
        <iframe
          title={language === 'fr' ? 'Carte des hébergements' : 'Accommodation map'}
          src={mapBg}
          className="absolute inset-0 h-full w-full border-0 opacity-95"
          loading="lazy"
        />
        <div className="absolute inset-0 pointer-events-none">
          {markers.map((m) => {
            const pos = toPosition(m.lat, m.lng);
            const selected = m.key === selectedKey;
            const tone =
              m.bad > m.good ? 'bg-rose-500' : m.good > 0 ? 'bg-emerald-500' : 'bg-indigo-400';
            return (
              <button
                key={m.key}
                type="button"
                style={pos}
                onClick={() => onSelectPlace?.(m.key)}
                className={`pointer-events-auto absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 transition-transform ${
                  selected ? 'scale-110' : ''
                }`}
                title={m.hotelName}
              >
                <span className={`inline-flex h-3.5 w-3.5 rounded-full border-2 border-white shadow ${tone}`} />
                <span className="max-w-[140px] truncate rounded-full bg-slate-950/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                  {m.hotelName}
                </span>
              </button>
            );
          })}
        </div>
        <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/85 px-3 py-1 text-[11px] text-slate-200 shadow">
          {markers.length}/{places.length}{' '}
          {language === 'fr' ? 'lieux sur la carte' : 'places on map'}
          {geocoding && (
            <span className="ml-2 text-indigo-300">
              · {language === 'fr' ? 'géoloc.' : 'geocoding'} {geocodeProgress.done}/{geocodeProgress.total}
            </span>
          )}
        </div>
      </div>
      {places.length > 0 && markers.length === 0 && !geocoding && (
        <p className="text-sm text-slate-400">
          {language === 'fr'
            ? 'Aucune adresse géolocalisable pour le moment. Vérifiez les adresses des hébergements.'
            : 'No geocodable address yet. Check accommodation addresses.'}
        </p>
      )}
    </div>
  );
};

export default AccommodationPlacesMapPanel;

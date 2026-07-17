import { EventAccommodation, RaceEvent } from '../types';

export interface AccommodationPlaceGroup {
  key: string;
  hotelName: string;
  address: string;
  cityHint: string;
  stays: Array<{
    acc: EventAccommodation;
    event?: RaceEvent;
  }>;
  good: number;
  bad: number;
  neutral: number;
  lastDate?: string;
  lat?: number;
  lng?: number;
}

export function normalizePlaceKey(hotelName: string, address: string): string {
  const h = (hotelName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const a = (address || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${h}||${a}`;
}

export function buildAccommodationPlaceGroups(
  accommodations: EventAccommodation[],
  eventsById: Map<string, RaceEvent>,
): AccommodationPlaceGroup[] {
  const map = new Map<string, AccommodationPlaceGroup>();

  for (const acc of accommodations) {
    const hotelName = (acc.hotelName || '').trim() || 'Hébergement sans nom';
    const address = (acc.address || '').trim();
    if (!address && !acc.hotelName) continue;

    const key = normalizePlaceKey(hotelName, address);
    const event = eventsById.get(acc.eventId);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        hotelName,
        address: address || 'Adresse non renseignée',
        cityHint: event?.location || '',
        stays: [{ acc, event }],
        good: acc.reviewOutcome === 'good' ? 1 : 0,
        bad: acc.reviewOutcome === 'bad' ? 1 : 0,
        neutral: acc.reviewOutcome === 'neutral' ? 1 : 0,
        lastDate: event?.date,
        lat: acc.latitude,
        lng: acc.longitude,
      });
    } else {
      existing.stays.push({ acc, event });
      if (acc.reviewOutcome === 'good') existing.good += 1;
      if (acc.reviewOutcome === 'bad') existing.bad += 1;
      if (acc.reviewOutcome === 'neutral') existing.neutral += 1;
      if (event?.date && (!existing.lastDate || event.date > existing.lastDate)) {
        existing.lastDate = event.date;
        if (event.location) existing.cityHint = event.location;
      }
      if (acc.latitude != null && acc.longitude != null) {
        existing.lat = acc.latitude;
        existing.lng = acc.longitude;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const da = a.lastDate || '';
    const db = b.lastDate || '';
    if (da !== db) return db.localeCompare(da);
    return a.hotelName.localeCompare(b.hotelName, 'fr', { sensitivity: 'base' });
  });
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type PhotonResponse = { features?: PhotonFeature[] };

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  postcode?: string;
}

const geoCache = new Map<string, { lat: number; lng: number } | null>();
const searchCache = new Map<string, AddressSuggestion[]>();

function cacheKey(query: string) {
  return query.trim().toLowerCase();
}

function formatPhotonLabel(props: NonNullable<PhotonFeature['properties']>): string {
  const streetPart = [props.housenumber, props.street].filter(Boolean).join(' ').trim();
  const primary = streetPart || props.name?.trim() || '';
  const locality = [props.postcode, props.city].filter(Boolean).join(' ').trim();
  const parts = [primary, locality, props.state, props.country].filter(Boolean);
  return parts.join(', ');
}

function featureToSuggestion(feature: PhotonFeature): AddressSuggestion | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const props = feature.properties ?? {};
  const label = formatPhotonLabel(props);
  if (!label) return null;
  return {
    label,
    lat,
    lng,
    city: props.city,
    postcode: props.postcode,
  };
}

/** Recherche d'adresses avec suggestions (Photon / OSM). */
export async function searchAddressSuggestions(
  query: string,
  limit = 6,
  cityHint?: string,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 3) return [];

  const hint = cityHint?.trim();
  const searchQuery = hint && !q.toLowerCase().includes(hint.toLowerCase())
    ? `${q}, ${hint}`
    : q;
  const key = `${cacheKey(searchQuery)}::${limit}`;
  if (searchCache.has(key)) return searchCache.get(key) ?? [];

  try {
    const url = `https://photon.komoot.io/api/?limit=${limit}&lang=fr&q=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(url);
    if (!res.ok) {
      searchCache.set(key, []);
      return [];
    }
    const data = (await res.json()) as PhotonResponse;
    const suggestions = (data.features ?? [])
      .map(featureToSuggestion)
      .filter((item): item is AddressSuggestion => item != null);
    searchCache.set(key, suggestions);
    return suggestions;
  } catch {
    searchCache.set(key, []);
    return [];
  }
}

/** Géocodage Photon (OSM) — compatible navigateur + cache mémoire. */
export async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q || q.length < 5) return null;

  const key = cacheKey(q);
  if (geoCache.has(key)) return geoCache.get(key) ?? null;

  try {
    const url = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) {
      geoCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as PhotonResponse;
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) {
      geoCache.set(key, null);
      return null;
    }
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      geoCache.set(key, null);
      return null;
    }
    const point = { lat, lng };
    geoCache.set(key, point);
    return point;
  } catch {
    geoCache.set(key, null);
    return null;
  }
}

export function buildGeocodeQuery(hotelName: string, address: string, cityHint?: string): string {
  const parts = [hotelName, address, cityHint].filter(Boolean);
  return parts.join(', ');
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

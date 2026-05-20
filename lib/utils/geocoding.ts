/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Free, no API key. Politicamente usato in maniera moderata: usato solo
 * quando l'utente richiede il GPS.
 *
 * La ricerca località invece usa Open-Meteo Geocoding, che supporta bene
 * il search interattivo senza appoggiarsi all'autocomplete pubblico di Nominatim.
 */
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface PlaceInfo {
  display: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface PlaceSuggestion {
  id: number;
  display: string;
  name: string;
  region?: string;
  country?: string;
  lat: number;
  lng: number;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function uniqueParts(parts: Array<string | undefined>, name?: string): string[] {
  const seen = new Set<string>();
  const normalizedName = name?.trim().toLowerCase();

  return parts.filter((part): part is string => {
    if (!part) return false;
    const normalized = part.trim().toLowerCase();
    if (!normalized) return false;
    if (normalizedName && normalized === normalizedName) return false;
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function buildPlaceDisplay(name?: string, region?: string, country?: string): string {
  const baseName = name?.trim();
  if (!baseName) return "";

  const details = uniqueParts(
    [region, country && country.toLowerCase() !== "italia" ? country : undefined],
    baseName,
  );

  return [baseName, ...details].join(", ");
}

export async function searchPlaces(
  query: string,
  options?: { count?: number; signal?: AbortSignal },
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const url = new URL(OPEN_METEO_GEOCODING_URL);
    url.searchParams.set("name", trimmed);
    url.searchParams.set("count", String(options?.count ?? 6));
    url.searchParams.set("language", "it");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: options?.signal,
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    return results.flatMap((result: Record<string, unknown>) => {
      const id = typeof result.id === "number" ? result.id : null;
      const name = nonEmptyString(result.name);
      const region = nonEmptyString(result.admin1) ?? nonEmptyString(result.admin2);
      const country = nonEmptyString(result.country);
      const lat = typeof result.latitude === "number" ? result.latitude : null;
      const lng = typeof result.longitude === "number" ? result.longitude : null;
      const display = buildPlaceDisplay(name, region, country);

      if (id === null || !name || lat === null || lng === null || !display) return [];

      return [{ id, display, name, region, country, lat, lng }];
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo | null> {
  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lng.toString());
    url.searchParams.set("zoom", "10");
    url.searchParams.set("accept-language", "it");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const addr = (data?.address ?? {}) as Record<string, string>;
    const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.hamlet;
    const region = addr.state ?? addr.region;
    const country = addr.country;
    const display = buildPlaceDisplay(city, region, country) || (data?.display_name ?? "");

    return { display, city, region, country };
  } catch {
    return null;
  }
}

/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Free, no API key. Politicamente usato in maniera moderata: usato solo
 * durante l'onboarding (1 chiamata per utente).
 */
export interface PlaceInfo {
  display: string;
  city?: string;
  region?: string;
  country?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
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
    const display = [city, region].filter(Boolean).join(", ") || (data?.display_name ?? "");

    return { display, city, region, country };
  } catch {
    return null;
  }
}

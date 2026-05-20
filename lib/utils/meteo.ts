/**
 * Client Open-Meteo (https://open-meteo.com).
 * Free, no API key, copertura italiana eccellente.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export type Condizione =
  | "sole"
  | "nuvoloso"
  | "pioggia"
  | "temporale"
  | "neve"
  | "nebbia"
  | "altro";

export interface Attuale {
  temp: number;
  percepita: number;
  condizione: string;
  icona: string;
  vento: number;
  umidita: number;
  weatherCode: number;
}

export interface SlotGiornata {
  icona: string;
  temp: number;
  weatherCode: number;
}

export interface GiornoPrevisione {
  date: string;          // YYYY-MM-DD
  giornoLabel: string;   // "Oggi", "Domani", "Martedì"
  mattina: SlotGiornata;
  pomeriggio: SlotGiornata;
  sera: SlotGiornata;
  tempMin: number;
  tempMax: number;
  precipitazioniMm: number;
  ventoMaxKmh: number;
}

export interface AvvisoMeteo {
  livello: "info" | "warning" | "critical";
  icona: string;
  testo: string;
}

export interface MeteoData {
  attuale: Attuale;
  giorni: GiornoPrevisione[];   // Oggi + prossimi 2-3 giorni
  consiglio: string | null;
  avvisi: AvvisoMeteo[];
}

// ── ICONE da weather code ────────────────────────────────
const WEATHER_CODE: Record<number, { icona: string; desc: string }> = {
  0: { icona: "☀️", desc: "Sereno" },
  1: { icona: "🌤️", desc: "Prevalentemente sereno" },
  2: { icona: "⛅", desc: "Parzialmente nuvoloso" },
  3: { icona: "☁️", desc: "Coperto" },
  45: { icona: "🌫️", desc: "Nebbia" },
  48: { icona: "🌫️", desc: "Nebbia con brina" },
  51: { icona: "🌦️", desc: "Pioviggine leggera" },
  53: { icona: "🌦️", desc: "Pioviggine" },
  55: { icona: "🌦️", desc: "Pioviggine intensa" },
  61: { icona: "🌧️", desc: "Pioggia leggera" },
  63: { icona: "🌧️", desc: "Pioggia" },
  65: { icona: "🌧️", desc: "Pioggia forte" },
  71: { icona: "🌨️", desc: "Neve leggera" },
  73: { icona: "🌨️", desc: "Neve" },
  75: { icona: "❄️", desc: "Neve abbondante" },
  77: { icona: "❄️", desc: "Granelli di neve" },
  80: { icona: "🌦️", desc: "Rovesci leggeri" },
  81: { icona: "🌧️", desc: "Rovesci" },
  82: { icona: "⛈️", desc: "Rovesci violenti" },
  85: { icona: "🌨️", desc: "Rovesci di neve" },
  86: { icona: "❄️", desc: "Rovesci di neve abbondanti" },
  95: { icona: "⛈️", desc: "Temporale" },
  96: { icona: "⛈️", desc: "Temporale con grandine" },
  99: { icona: "⛈️", desc: "Temporale forte con grandine" },
};

function describeCode(code: number): { icona: string; desc: string } {
  return WEATHER_CODE[code] ?? { icona: "🌥️", desc: "Variabile" };
}

const GIORNI_SETTIMANA = [
  "Domenica", "Lunedì", "Martedì", "Mercoledì",
  "Giovedì", "Venerdì", "Sabato",
];

function labelGiorno(date: Date, today: Date): string {
  const diff = Math.round(
    (date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Domani";
  return GIORNI_SETTIMANA[date.getDay()];
}

/**
 * Recupera previsioni meteo (attuale + giornaliere + orarie per dividere in M/P/S).
 * Cache: 1h (revalidate=3600).
 */
export async function fetchMeteo(
  lat: number,
  lng: number,
): Promise<MeteoData> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
  );
  url.searchParams.set("hourly", "temperature_2m,weather_code");
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunshine_duration",
  );
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const json = await res.json();

  const cur = json.current;
  const curDesc = describeCode(cur.weather_code);
  const attuale: Attuale = {
    temp: Math.round(cur.temperature_2m),
    percepita: Math.round(cur.apparent_temperature),
    condizione: curDesc.desc,
    icona: curDesc.icona,
    vento: Math.round(cur.wind_speed_10m),
    umidita: Math.round(cur.relative_humidity_2m),
    weatherCode: cur.weather_code,
  };

  const hourly = {
    time: json.hourly.time as string[],
    temp: json.hourly.temperature_2m as number[],
    code: json.hourly.weather_code as number[],
  };
  const daily = {
    time: json.daily.time as string[],
    code: json.daily.weather_code as number[],
    tmax: json.daily.temperature_2m_max as number[],
    tmin: json.daily.temperature_2m_min as number[],
    prec: json.daily.precipitation_sum as number[],
    wind: json.daily.wind_speed_10m_max as number[],
  };

  function slotFor(date: string, hour: number): SlotGiornata {
    // Cerca la riga oraria ISO che corrisponde a date + hour locali
    const target = `${date}T${hour.toString().padStart(2, "0")}:00`;
    const idx = hourly.time.findIndex((t) => t.startsWith(target));
    if (idx === -1) {
      return { icona: "🌤️", temp: 0, weatherCode: 0 };
    }
    const desc = describeCode(hourly.code[idx]);
    return {
      icona: desc.icona,
      temp: Math.round(hourly.temp[idx]),
      weatherCode: hourly.code[idx],
    };
  }

  const today = new Date();
  const giorni: GiornoPrevisione[] = daily.time.map((d, i) => {
    const date = new Date(d + "T12:00");
    return {
      date: d,
      giornoLabel: labelGiorno(date, new Date()),
      mattina: slotFor(d, 8),
      pomeriggio: slotFor(d, 14),
      sera: slotFor(d, 20),
      tempMin: Math.round(daily.tmin[i]),
      tempMax: Math.round(daily.tmax[i]),
      precipitazioniMm: Math.round((daily.prec[i] ?? 0) * 10) / 10,
      ventoMaxKmh: Math.round(daily.wind[i] ?? 0),
    };
  });

  // ── Calcolo avvisi/consigli per il giorno successivo ──
  const domani = giorni.find((g) => g.giornoLabel === "Domani") ?? giorni[1];
  const avvisi: AvvisoMeteo[] = [];
  let consiglio: string | null = null;

  if (domani) {
    const dc = describeCode(domani.pomeriggio.weatherCode);
    if (domani.precipitazioniMm > 5) {
      avvisi.push({
        livello: "warning",
        icona: "🌧️",
        testo:
          "Domani pioverà — ricordati di controllare che le galline abbiano riparo!",
      });
    }
    if (domani.ventoMaxKmh > 40) {
      avvisi.push({
        livello: "warning",
        icona: "💨",
        testo: "Domani c'è molto vento — controlla che il pollaio sia ben chiuso",
      });
    }
    if (domani.tempMax > 35) {
      avvisi.push({
        livello: "critical",
        icona: "🌡️",
        testo:
          "Domani fa molto caldo — assicurati che le galline abbiano acqua fresca!",
      });
    }
    if (domani.tempMin < 0) {
      avvisi.push({
        livello: "warning",
        icona: "🥶",
        testo: "Domani si gela — controlla il ricovero notturno delle galline",
      });
    }
    if (
      domani.pomeriggio.weatherCode >= 95 ||
      (domani.pomeriggio.weatherCode >= 82 && domani.pomeriggio.weatherCode <= 86)
    ) {
      avvisi.push({
        livello: "critical",
        icona: "⛈️",
        testo:
          "Attenzione! Temporale previsto domani — metti al riparo le galline per tempo",
      });
    }
    if (domani.pomeriggio.weatherCode <= 1 && domani.tempMax >= 18 && domani.tempMax <= 28) {
      consiglio = `${dc.icona} Domani splende il sole — giornata perfetta per far uscire le galline!`;
    } else if (avvisi.length === 0) {
      consiglio = `${dc.icona} Domani: ${dc.desc.toLowerCase()}, max ${domani.tempMax}°.`;
    }
  }

  return { attuale, giorni, consiglio, avvisi };
}

// ── Posizione di fallback (per pollai senza coordinate) ──
export const FALLBACK_LOCATION = {
  lat: 41.9028,   // Roma
  lng: 12.4964,
};

export function hasCoords(p: {
  posizione_lat: number | null;
  posizione_lng: number | null;
}): boolean {
  return p.posizione_lat !== null && p.posizione_lng !== null;
}

export function getForecastUrl(locationName: string | null | undefined): string | null {
  const city = locationName
    ?.split(",")[0]
    ?.replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();

  if (!city) return null;

  const slug = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "+");

  return slug ? `https://www.3bmeteo.com/meteo/${slug}` : null;
}

/**
 * Restituisce orario alba/tramonto per una data specifica (default: oggi).
 * Open-Meteo daily=sunrise,sunset. Cache 1h.
 *
 * @param lat latitudine
 * @param lng longitudine
 * @param date YYYY-MM-DD (default: oggi locale)
 * @returns alba/tramonto in formato "HH:MM" (timezone locale) o null se non disponibile
 */
export async function getAlbaTramonto(
  lat: number,
  lng: number,
  date?: string,
): Promise<{ alba: string | null; tramonto: string | null }> {
  const day = date ?? new Date().toISOString().slice(0, 10);
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("start_date", day);
  url.searchParams.set("end_date", day);
  url.searchParams.set("timezone", "auto");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return { alba: null, tramonto: null };
    const json = await res.json();
    const sunrise = json.daily?.sunrise?.[0] as string | undefined;
    const sunset = json.daily?.sunset?.[0] as string | undefined;
    return {
      alba: sunrise ? sunrise.slice(11, 16) : null,
      tramonto: sunset ? sunset.slice(11, 16) : null,
    };
  } catch {
    return { alba: null, tramonto: null };
  }
}

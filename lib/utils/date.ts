/** Millisecondi in un giorno. Centralizzato per evitare la duplicazione `1000 * 60 * 60 * 24`. */
export const MS_DAY = 1000 * 60 * 60 * 24;

/** Mesi brevi in italiano. */
export const MESI_BREVI = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
] as const;

/** Mesi per esteso in italiano. */
export const MESI_LUNGHI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
] as const;

/** Giorni della settimana in italiano (domenica = 0). */
export const GIORNI = [
  "Domenica", "Lunedì", "Martedì", "Mercoledì",
  "Giovedì", "Venerdì", "Sabato",
] as const;

/** Data di oggi in formato YYYY-MM-DD (UTC, coerente con colonne DATE). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Mezzanotte locale di oggi in ISO 8601 — utile per query "da inizio giornata". */
export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** "15 mag" */
export function formatData(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

/** "15 maggio 2026" */
export function formatDataLunga(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getDate()} ${MESI_LUNGHI[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Lunedì 15 maggio" */
export function formatDataCompleta(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI_LUNGHI[d.getMonth()]}`;
}

export function giorniFa(date: string | Date, now: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((now.getTime() - d.getTime()) / MS_DAY);
}

export function etichettaGiornoRelativo(date: string | Date, now: Date = new Date()): string {
  const g = giorniFa(date, now);
  if (g === 0) return "Oggi";
  if (g === 1) return "Ieri";
  if (g < 7) return `${g} giorni fa`;
  return formatData(date);
}

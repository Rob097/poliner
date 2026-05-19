const MESI_BREVI = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
] as const;

const MESI_LUNGHI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
] as const;

const GIORNI = [
  "Domenica", "Lunedì", "Martedì", "Mercoledì",
  "Giovedì", "Venerdì", "Sabato",
] as const;

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
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function etichettaGiornoRelativo(date: string | Date, now: Date = new Date()): string {
  const g = giorniFa(date, now);
  if (g === 0) return "Oggi";
  if (g === 1) return "Ieri";
  if (g < 7) return `${g} giorni fa`;
  return formatData(date);
}

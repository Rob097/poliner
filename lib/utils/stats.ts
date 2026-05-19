/**
 * Helpers per aggregazioni statistiche.
 */

export type PeriodoStats = "settimana" | "mese" | "tre_mesi" | "anno" | "tutto";

export interface BucketKey {
  key: string;     // "2026-W18", "2026-05", "2026"
  label: string;   // "S18", "Mag", "2026"
  date: Date;      // inizio del bucket (per ordinamento)
}

const MS_DAY = 1000 * 60 * 60 * 24;

export function sogliaPerPeriodo(p: PeriodoStats, oggi: Date = new Date()): Date | null {
  if (p === "tutto") return null;
  const d = new Date(oggi);
  if (p === "settimana") d.setDate(d.getDate() - 7);
  else if (p === "mese") d.setMonth(d.getMonth() - 1);
  else if (p === "tre_mesi") d.setMonth(d.getMonth() - 3);
  else if (p === "anno") d.setFullYear(d.getFullYear() - 1);
  return d;
}

/**
 * Ritorna ISO week number (1-53) per la data data.
 */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / MS_DAY) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

export function bucketSettimana(d: Date): BucketKey {
  const { year, week } = isoWeek(d);
  // Lunedì di quella settimana
  const monday = new Date(d);
  const dayNum = monday.getDay() || 7;
  monday.setDate(monday.getDate() - dayNum + 1);
  monday.setHours(0, 0, 0, 0);
  return {
    key: `${year}-W${String(week).padStart(2, "0")}`,
    label: `S${week}`,
    date: monday,
  };
}

export function bucketMese(d: Date): BucketKey {
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: MESI_BREVI[d.getMonth()],
    date: new Date(d.getFullYear(), d.getMonth(), 1),
  };
}

/**
 * Sceglie la granularità automatica in base al periodo.
 */
export function granularitaPerPeriodo(p: PeriodoStats): "settimana" | "mese" {
  if (p === "settimana" || p === "mese" || p === "tre_mesi") return "settimana";
  return "mese";
}

export function bucketDi(d: Date, gran: "settimana" | "mese"): BucketKey {
  return gran === "settimana" ? bucketSettimana(d) : bucketMese(d);
}

/**
 * Riempie i bucket mancanti tra start e end con valori a 0.
 */
export function fillEmptyBuckets(
  data: { key: string; label: string; date: Date; [k: string]: unknown }[],
  start: Date,
  end: Date,
  gran: "settimana" | "mese",
  defaultValues: Record<string, number>,
): typeof data {
  const existing = new Map(data.map((d) => [d.key, d]));
  const out: typeof data = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const b = bucketDi(cur, gran);
    if (!existing.has(b.key)) {
      out.push({ ...b, ...defaultValues });
      existing.set(b.key, { ...b, ...defaultValues });
    }
    if (gran === "settimana") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
  return [...data, ...out].sort((a, b) => a.date.getTime() - b.date.getTime());
}

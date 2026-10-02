import type { Database } from "@/lib/supabase/database.types";
import { MESI_BREVI, MS_DAY, dateIsoInTimeZone } from "./date";

/**
 * Sospensione uova ("tempo di sospensione", in termini di legge "tempo di
 * attesa"): dopo un farmaco le uova delle galline trattate non sono
 * commestibili per un periodo.
 *
 * Le date sono stringhe `YYYY-MM-DD` (giorni italiani) e `dataFine` è
 * l'ULTIMO giorno incluso: le uova tornano buone dal giorno dopo.
 * La marcatura delle uova avviene nel DB (trigger su `uova` e
 * `sospensioni_uova`); qui c'è solo la logica di presentazione e i
 * controlli sui dati in ingresso.
 */

type SospensioneRow = Database["public"]["Tables"]["sospensioni_uova"]["Row"];
type SospensioneInsert = Database["public"]["Tables"]["sospensioni_uova"]["Insert"];

export interface SospensioneUova {
  id: string;
  dataInizio: string;
  dataFine: string;
  tutte: boolean;
  animaleIds: string[];
  motivo: string;
  prodotto: string | null;
  note: string | null;
  trattamentoId: string | null;
}

export type FaseSospensione = "programmata" | "in_corso" | "conclusa";

/** Colonne da selezionare per costruire una `SospensioneUova`. */
export const SOSPENSIONE_SELECT =
  "id, data_inizio, data_fine, tutte, animale_ids, motivo, prodotto, note, trattamento_id";

export const MOTIVI_SOSPENSIONE = [
  "Antibiotico",
  "Antiparassitario",
  "Vermifugo",
  "Antinfiammatorio",
  "Antimicotico",
  "Altro farmaco",
];

/** Durata massima accettata: oltre un anno è quasi certamente un errore di battitura. */
export const DURATA_MAX_GIORNI = 366;

export function daRigaSospensione(
  r: Pick<
    SospensioneRow,
    | "id"
    | "data_inizio"
    | "data_fine"
    | "tutte"
    | "animale_ids"
    | "motivo"
    | "prodotto"
    | "note"
    | "trattamento_id"
  >,
): SospensioneUova {
  return {
    id: r.id,
    dataInizio: r.data_inizio,
    dataFine: r.data_fine,
    tutte: r.tutte,
    animaleIds: r.animale_ids ?? [],
    motivo: r.motivo,
    prodotto: r.prodotto,
    note: r.note,
    trattamentoId: r.trattamento_id,
  };
}

// ── Date (solo giorno, senza fuso) ──────────────────────

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(data: string): number {
  const [y, m, d] = data.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isDataValida(data: string): boolean {
  if (!DATA_RE.test(data)) return false;
  const ms = toUtcMs(data);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === data;
}

export function aggiungiGiorni(data: string, giorni: number): string {
  return new Date(toUtcMs(data) + giorni * MS_DAY).toISOString().slice(0, 10);
}

/** Giorni da `da` ad `a` (negativo se `a` è prima). */
export function giorniTra(da: string, a: string): number {
  return Math.round((toUtcMs(a) - toUtcMs(da)) / MS_DAY);
}

/** "7 giorni a partire dal 2 ott" → ultimo giorno 8 ott. */
export function dataFineDaDurata(dataInizio: string, durataGiorni: number): string {
  return aggiungiGiorni(dataInizio, durataGiorni - 1);
}

/** Giorni di sospensione, estremi inclusi. */
export function durataGiorni(dataInizio: string, dataFine: string): number {
  return giorniTra(dataInizio, dataFine) + 1;
}

/** Primo giorno in cui le uova tornano commestibili. */
export function commestibiliDal(s: Pick<SospensioneUova, "dataFine">): string {
  return aggiungiGiorni(s.dataFine, 1);
}

export function oggiSospensioni(): string {
  return dateIsoInTimeZone();
}

export function faseSospensione(
  s: Pick<SospensioneUova, "dataInizio" | "dataFine">,
  oggi: string = oggiSospensioni(),
): FaseSospensione {
  if (oggi < s.dataInizio) return "programmata";
  if (oggi > s.dataFine) return "conclusa";
  return "in_corso";
}

/** Giorni che mancano al ritorno delle uova commestibili (0 = già oggi). */
export function giorniAlRitorno(
  s: Pick<SospensioneUova, "dataFine">,
  oggi: string = oggiSospensioni(),
): number {
  return Math.max(0, giorniTra(oggi, commestibiliDal(s)));
}

// ── Galline coinvolte ───────────────────────────────────

/**
 * Stessa regola del DB (`sospensione_uova_per`): un uovo senza gallina
 * indicata è coinvolto da qualunque sospensione, per prudenza.
 */
export function coinvolgeGallina(
  s: Pick<SospensioneUova, "tutte" | "animaleIds">,
  animaleId: string | null,
): boolean {
  return s.tutte || animaleId === null || s.animaleIds.includes(animaleId);
}

/** Sospensione che renderebbe non commestibile un uovo deposto in `data`. */
export function sospensionePerUovo(
  sospensioni: SospensioneUova[],
  animaleId: string | null,
  data: string,
): SospensioneUova | undefined {
  return sospensioni
    .filter(
      (s) => data >= s.dataInizio && data <= s.dataFine && coinvolgeGallina(s, animaleId),
    )
    .sort((a, b) => b.dataFine.localeCompare(a.dataFine))[0];
}

/**
 * Galline di una sospensione appena finita che sono davvero tornate libere,
 * cioè non coperte da altre sospensioni ancora in corso. `null` = nessuna:
 * l'avviso "uova di nuovo buone" non va dato.
 * Per una sospensione su tutto il pollaio, `eccetto` elenca le galline
 * ancora sospese per altri motivi.
 */
export function gallineTornateLibere(
  finita: Pick<SospensioneUova, "tutte" | "animaleIds">,
  inCorso: Pick<SospensioneUova, "tutte" | "animaleIds">[],
): { tutte: boolean; animaleIds: string[]; eccetto: string[] } | null {
  if (inCorso.some((s) => s.tutte)) return null;
  const ancoraSospese = new Set(inCorso.flatMap((s) => s.animaleIds));
  if (finita.tutte) {
    return { tutte: true, animaleIds: [], eccetto: Array.from(ancoraSospese) };
  }
  const libere = finita.animaleIds.filter((id) => !ancoraSospese.has(id));
  if (libere.length === 0) return null;
  return { tutte: false, animaleIds: libere, eccetto: [] };
}

export function nomiGalline(
  s: Pick<SospensioneUova, "tutte" | "animaleIds">,
  nomi: Map<string, string>,
): string {
  if (s.tutte) return "Tutto il pollaio";
  const elenco = s.animaleIds.map((id) => nomi.get(id) ?? "una gallina");
  if (elenco.length <= 1) return elenco[0] ?? "—";
  return `${elenco.slice(0, -1).join(", ")} e ${elenco[elenco.length - 1]}`;
}

/** Complemento "di Babet" / "delle tue galline", per frasi tipo "le uova …". */
export function diGalline(
  s: Pick<SospensioneUova, "tutte" | "animaleIds">,
  nomi: Map<string, string>,
): string {
  if (s.tutte) return "delle tue galline";
  return `di ${nomiGalline(s, nomi)}`;
}

// ── Formattazione ───────────────────────────────────────

/** "2 ott" a partire da `YYYY-MM-DD`, senza passare dal fuso del device. */
export function formatGiorno(data: string): string {
  const [, m, d] = data.split("-").map(Number);
  return `${d} ${MESI_BREVI[m - 1]}`;
}

// "dall'8", "all'11": elisione per i giorni che iniziano per vocale.
function elide(giorno: number): boolean {
  return giorno === 1 || giorno === 8 || giorno === 11;
}

export function dalGiorno(data: string): string {
  const d = Number(data.slice(8, 10));
  return `${elide(d) ? "dall'" : "dal "}${formatGiorno(data)}`;
}

export function alGiorno(data: string): string {
  const d = Number(data.slice(8, 10));
  return `${elide(d) ? "all'" : "al "}${formatGiorno(data)}`;
}

/** "dal 2 ott all'8 ott" (oppure "solo il 2 ott"). */
export function formatPeriodo(s: Pick<SospensioneUova, "dataInizio" | "dataFine">): string {
  if (s.dataInizio === s.dataFine) return `solo il ${formatGiorno(s.dataInizio)}`;
  return `${dalGiorno(s.dataInizio)} ${alGiorno(s.dataFine)}`;
}

export function etichettaRitorno(giorni: number): string {
  if (giorni <= 0) return "da oggi";
  if (giorni === 1) return "da domani";
  return `tra ${giorni} giorni`;
}

// ── Input dai form / dai tool AI ────────────────────────

export interface SospensioneInput {
  dataInizio: string;
  dataFine: string;
  tutte: boolean;
  animaleIds: string[];
  motivo: string;
  prodotto?: string | null;
  note?: string | null;
  trattamentoId?: string | null;
}

/** Messaggio d'errore per l'utente, oppure null se l'input è valido. */
export function validaSospensione(input: SospensioneInput): string | null {
  if (!input.motivo?.trim()) return "Indica il motivo (es. il farmaco somministrato).";
  if (!isDataValida(input.dataInizio)) return "La data di inizio non è valida.";
  if (!isDataValida(input.dataFine)) return "La data di fine non è valida.";
  if (input.dataFine < input.dataInizio) {
    return "La data di fine non può essere prima di quella di inizio.";
  }
  if (durataGiorni(input.dataInizio, input.dataFine) > DURATA_MAX_GIORNI) {
    return "Il periodo è troppo lungo: controlla le date.";
  }
  if (!input.tutte && input.animaleIds.length === 0) {
    return "Scegli almeno una gallina, oppure tutto il pollaio.";
  }
  return null;
}

/** Riga pronta per l'insert/update su `sospensioni_uova` (input già validato). */
export function rigaSospensione(
  pollaioId: string,
  input: SospensioneInput,
): SospensioneInsert {
  return {
    pollaio_id: pollaioId,
    data_inizio: input.dataInizio,
    data_fine: input.dataFine,
    tutte: input.tutte,
    animale_ids: input.tutte ? [] : Array.from(new Set(input.animaleIds)),
    motivo: input.motivo.trim(),
    prodotto: input.prodotto?.trim() || null,
    note: input.note?.trim() || null,
    trattamento_id: input.trattamentoId ?? null,
  };
}

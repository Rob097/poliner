import { TIPI_MANUTENZIONE, type TipoManutenzioneId, type TipoManutenzione } from "@/lib/constants/manutenzione";

export type StatoManutenzione = "ok" | "in_scadenza" | "scaduta";

export interface StatoTipo {
  tipo: TipoManutenzione;
  frequenza: number;
  ultimoIntervento: string | null;
  giorniDaUltimo: number;            // 999 se nessuno
  giorniRimanenti: number;           // negativi se in ritardo
  stato: StatoManutenzione;
}

const MS_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcola lo stato di tutti i tipi di manutenzione dato l'ultimo log + le frequenze custom.
 */
export function calcolaStatiManutenzione(
  ultimoPerTipo: Map<TipoManutenzioneId, string>,
  frequenzeOverride: Map<TipoManutenzioneId, number>,
  oggi: Date = new Date(),
): StatoTipo[] {
  return TIPI_MANUTENZIONE.map((tipo) => {
    const freq = frequenzeOverride.get(tipo.id) ?? tipo.frequenzaDefault;
    const ultimo = ultimoPerTipo.get(tipo.id) ?? null;
    let giorni: number;
    if (!ultimo) {
      giorni = 999;
    } else {
      giorni = Math.floor((oggi.getTime() - new Date(ultimo).getTime()) / MS_DAY);
    }
    const rimanenti = freq - giorni;
    let stato: StatoManutenzione;
    if (rimanenti < 0) stato = "scaduta";
    else if (rimanenti <= 2) stato = "in_scadenza";
    else stato = "ok";
    return {
      tipo,
      frequenza: freq,
      ultimoIntervento: ultimo,
      giorniDaUltimo: giorni,
      giorniRimanenti: rimanenti,
      stato,
    };
  });
}

export function colorePerStato(s: StatoManutenzione): string {
  if (s === "scaduta") return "#E8678A";
  if (s === "in_scadenza") return "#FFE07A";
  return "#B5D4B5";
}

export function labelStato(s: StatoTipo): string {
  if (s.stato === "scaduta") {
    return `⚠️ In ritardo di ${Math.abs(s.giorniRimanenti)} giorn${Math.abs(s.giorniRimanenti) === 1 ? "o" : "i"}`;
  }
  if (s.stato === "in_scadenza") {
    return `🔔 Tra ${s.giorniRimanenti} giorni`;
  }
  return `✓ Tra ${s.giorniRimanenti} giorni`;
}

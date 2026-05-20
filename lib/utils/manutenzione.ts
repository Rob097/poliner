export type StatoManutenzione = "ok" | "in_scadenza" | "scaduta";

export interface VoceManutenzione {
  id: string;
  nome: string;
  dove: string | null;
  icona: string;
  frequenza_giorni: number;
  consiglio_id: string | null;
  attivo: boolean;
}

export interface StatoVoce {
  voce: VoceManutenzione;
  ultimoIntervento: string | null;
  giorniDaUltimo: number; // 999 se mai fatto
  giorniRimanenti: number; // negativi se in ritardo
  stato: StatoManutenzione;
}

const MS_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcola lo stato di tutte le voci di manutenzione dato l'ultimo log per voce.
 */
export function calcolaStatiManutenzione(
  voci: VoceManutenzione[],
  ultimoPerVoce: Map<string, string>,
  oggi: Date = new Date(),
): StatoVoce[] {
  return voci.map((voce) => {
    const ultimo = ultimoPerVoce.get(voce.id) ?? null;
    let giorni: number;
    if (!ultimo) {
      giorni = 999;
    } else {
      giorni = Math.floor((oggi.getTime() - new Date(ultimo).getTime()) / MS_DAY);
    }
    const rimanenti = voce.frequenza_giorni - giorni;
    let stato: StatoManutenzione;
    if (rimanenti < 0) stato = "scaduta";
    else if (rimanenti <= 2) stato = "in_scadenza";
    else stato = "ok";
    return {
      voce,
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

export function labelStato(s: StatoVoce): string {
  if (s.ultimoIntervento === null) {
    return "Mai registrato";
  }
  if (s.stato === "scaduta") {
    const giorni = Math.abs(s.giorniRimanenti);
    return `⚠️ In ritardo di ${giorni} giorn${giorni === 1 ? "o" : "i"}`;
  }
  if (s.stato === "in_scadenza") {
    return `🔔 Tra ${s.giorniRimanenti} giorn${s.giorniRimanenti === 1 ? "o" : "i"}`;
  }
  return `✓ Tra ${s.giorniRimanenti} giorn${s.giorniRimanenti === 1 ? "o" : "i"}`;
}

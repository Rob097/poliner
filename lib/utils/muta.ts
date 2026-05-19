export interface PeriodoMuta {
  data_inizio: string;
  data_fine: string | null;
}

export interface StatoMuta {
  inMuta: boolean;
  giorni: number;
  inizio: Date | null;
}

/**
 * Determina lo stato attuale di muta dato l'elenco dei periodi.
 * `inMuta` è true se esiste un periodo aperto (senza data_fine).
 */
export function statoMutaCorrente(periodi: PeriodoMuta[], oggi: Date = new Date()): StatoMuta {
  const aperto = periodi.find((p) => !p.data_fine);
  if (!aperto) return { inMuta: false, giorni: 0, inizio: null };
  const inizio = new Date(aperto.data_inizio);
  const giorni = Math.floor((oggi.getTime() - inizio.getTime()) / (1000 * 60 * 60 * 24));
  return { inMuta: true, giorni: Math.max(0, giorni), inizio };
}

export type Conservazione = "ambiente" | "frigo";
export type StatoUovo = "disponibile" | "consumato" | "regalato";

export interface ConservazioneSettings {
  ambiente: number;  // giorni
  frigo: number;
}

export const CONSERVAZIONE_DEFAULT: ConservazioneSettings = {
  ambiente: 20,
  frigo: 28,
};

const MS_DAY = 1000 * 60 * 60 * 24;

export interface ScadenzaInfo {
  /** Giorni rimanenti prima della scadenza. Negativo = già scaduto. */
  giorniRimanenti: number;
  /** Data di scadenza in ISO. */
  scadenza: Date;
  /** Categoria semantica per UI */
  livello: "ok" | "in_scadenza" | "urgente" | "scaduto";
}

export function calcolaScadenza(
  dataDeposizione: string | Date,
  conservazione: Conservazione,
  settings: ConservazioneSettings = CONSERVAZIONE_DEFAULT,
  oggi: Date = new Date(),
): ScadenzaInfo {
  const dep = typeof dataDeposizione === "string"
    ? new Date(dataDeposizione)
    : dataDeposizione;
  const giorniMax = conservazione === "frigo" ? settings.frigo : settings.ambiente;
  const scadenza = new Date(dep.getTime() + giorniMax * MS_DAY);
  const giorniRimanenti = Math.ceil((scadenza.getTime() - oggi.getTime()) / MS_DAY);

  let livello: ScadenzaInfo["livello"];
  if (giorniRimanenti < 0) livello = "scaduto";
  else if (giorniRimanenti <= 2) livello = "urgente";
  else if (giorniRimanenti <= 5) livello = "in_scadenza";
  else livello = "ok";

  return { giorniRimanenti, scadenza, livello };
}

export function statoUovoLabel(s: StatoUovo): string {
  if (s === "disponibile") return "Disponibile";
  if (s === "consumato") return "Consumato";
  return "Regalato";
}

export function statoUovoColors(s: StatoUovo): { bg: string; color: string } {
  if (s === "disponibile") return { bg: "#B5D4B533", color: "#3d6b3d" };
  if (s === "consumato") return { bg: "#F0EDE8", color: "#9E968C" };
  return { bg: "#FFE4D044", color: "#b87333" };
}

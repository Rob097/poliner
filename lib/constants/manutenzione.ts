export type TipoManutenzioneId =
  | "pulizia_casetta"
  | "pulizia_pollaio"
  | "cambio_trucciolo"
  | "cambio_corteccia"
  | "bagno_sabbia"
  | "cambio_paglia";

export interface TipoManutenzione {
  id: TipoManutenzioneId;
  nome: string;
  dove: string;
  frequenzaDefault: number;
  icona: string;
}

export const TIPI_MANUTENZIONE: TipoManutenzione[] = [
  { id: "pulizia_casetta", nome: "Pulizia della casetta", dove: "Casetta interna", frequenzaDefault: 7, icona: "🧹" },
  { id: "pulizia_pollaio", nome: "Pulizia completa del pollaio", dove: "Tutto il recinto", frequenzaDefault: 14, icona: "🏠" },
  { id: "cambio_trucciolo", nome: "Cambio trucciolo", dove: "Casetta interna", frequenzaDefault: 7, icona: "🪵" },
  { id: "cambio_corteccia", nome: "Cambio corteccia di pino", dove: "Pollaio esterno", frequenzaDefault: 30, icona: "🌲" },
  { id: "bagno_sabbia", nome: "Rinnovo bagno di sabbia", dove: "Area bagno", frequenzaDefault: 14, icona: "⏳" },
  { id: "cambio_paglia", nome: "Cambio paglia nei nidi", dove: "Nidi", frequenzaDefault: 7, icona: "🌾" },
];

export function trovaTipo(id: string): TipoManutenzione | undefined {
  return TIPI_MANUTENZIONE.find((t) => t.id === id);
}

/**
 * Catalogo di "consigli" di manutenzione pre-compilati.
 *
 * Non è più un set di "tipi attivi": dopo Fase C, le voci attive vivono
 * nella tabella `manutenzioni_voci` create dall'utente. Questo catalogo
 * appare nella pagina /manutenzione come badge cliccabili: tap → form
 * di creazione voce pre-compilato col contenuto del consiglio.
 */

export type ConsiglioManutenzioneId =
  | "pulizia_casetta"
  | "pulizia_pollaio"
  | "cambio_trucciolo"
  | "cambio_corteccia"
  | "bagno_sabbia"
  | "cambio_paglia";

export interface ConsiglioManutenzione {
  id: ConsiglioManutenzioneId;
  nome: string;
  dove: string;
  frequenzaDefault: number;
  icona: string;
  descrizione: string;
}

export const CONSIGLI_MANUTENZIONE: ConsiglioManutenzione[] = [
  {
    id: "pulizia_casetta",
    nome: "Pulizia della casetta",
    dove: "Casetta interna",
    frequenzaDefault: 7,
    icona: "🧹",
    descrizione: "Rimuovi le deiezioni e pulisci dove dormono le galline.",
  },
  {
    id: "pulizia_pollaio",
    nome: "Pulizia completa del pollaio",
    dove: "Tutto il recinto",
    frequenzaDefault: 14,
    icona: "🏠",
    descrizione: "Pulizia approfondita di tutto il recinto e attrezzature.",
  },
  {
    id: "cambio_trucciolo",
    nome: "Cambio trucciolo",
    dove: "Casetta interna",
    frequenzaDefault: 7,
    icona: "🪵",
    descrizione: "Sostituisci la lettiera di trucciolo nella casetta.",
  },
  {
    id: "cambio_corteccia",
    nome: "Cambio corteccia di pino",
    dove: "Pollaio esterno",
    frequenzaDefault: 30,
    icona: "🌲",
    descrizione: "Cambia la corteccia di pino del fondo esterno.",
  },
  {
    id: "bagno_sabbia",
    nome: "Rinnovo bagno di sabbia",
    dove: "Area bagno",
    frequenzaDefault: 14,
    icona: "⏳",
    descrizione: "Rinnova la sabbia (con eventuale diatomea) per i bagni delle galline.",
  },
  {
    id: "cambio_paglia",
    nome: "Cambio paglia nei nidi",
    dove: "Nidi",
    frequenzaDefault: 7,
    icona: "🌾",
    descrizione: "Sostituisci la paglia dei nidi per uova pulite.",
  },
];

export function trovaConsiglio(id: string): ConsiglioManutenzione | undefined {
  return CONSIGLI_MANUTENZIONE.find((c) => c.id === id);
}

import type OpenAI from "openai";
import type { ToolContext } from "./read-tools";
import * as R from "./read-tools";
import * as W from "./write-tools";

type Handler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<unknown>;

export interface ToolRegistration {
  definition: OpenAI.Chat.Completions.ChatCompletionTool;
  handler: Handler;
}

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  handler: Handler,
): ToolRegistration {
  return {
    definition: {
      type: "function",
      function: { name, description, parameters },
    },
    handler,
  };
}

// ── READ TOOLS ───────────────────────────────────────────
export const READ_TOOLS: Record<string, ToolRegistration> = {
  get_animali: tool(
    "get_animali",
    "Restituisce la lista delle galline del pollaio attivo (di default solo quelle attive).",
    {
      type: "object",
      properties: {
        includi_defunte: {
          type: "boolean",
          description: "Se true, include anche le galline defunte.",
        },
      },
      additionalProperties: false,
    },
    (args, ctx) => R.get_animali(args as { includi_defunte?: boolean }, ctx),
  ),

  get_animale_dettaglio: tool(
    "get_animale_dettaglio",
    "Dettaglio completo di una gallina: anagrafica, conteggio uova totali e ultimi 30gg, eventi salute e inserimento recenti.",
    {
      type: "object",
      properties: {
        animale_id: { type: "string", description: "ID della gallina." },
      },
      required: ["animale_id"],
      additionalProperties: false,
    },
    (args, ctx) =>
      R.get_animale_dettaglio(args as { animale_id: string }, ctx),
  ),

  get_uova_recenti: tool(
    "get_uova_recenti",
    "Elenco delle uova deposte negli ultimi N giorni (default 7).",
    {
      type: "object",
      properties: {
        giorni: {
          type: "integer",
          minimum: 1,
          maximum: 90,
          description: "Numero di giorni indietro da considerare.",
        },
      },
      additionalProperties: false,
    },
    (args, ctx) => R.get_uova_recenti(args as { giorni?: number }, ctx),
  ),

  get_uova_stats: tool(
    "get_uova_stats",
    "Statistiche aggregate sulle uova: totale, media giornaliera, conteggio per gallina nel periodo (default 30 giorni).",
    {
      type: "object",
      properties: {
        giorni: {
          type: "integer",
          minimum: 1,
          maximum: 365,
          description: "Finestra in giorni.",
        },
      },
      additionalProperties: false,
    },
    (args, ctx) => R.get_uova_stats(args as { giorni?: number }, ctx),
  ),

  get_scorte: tool(
    "get_scorte",
    "Scorte di cibo del pollaio con segnalazione di quelle sotto soglia.",
    { type: "object", properties: {}, additionalProperties: false },
    (_, ctx) => R.get_scorte({}, ctx),
  ),

  get_spese_recenti: tool(
    "get_spese_recenti",
    "Spese degli ultimi N giorni (default 30) con totale in euro.",
    {
      type: "object",
      properties: {
        giorni: { type: "integer", minimum: 1, maximum: 365 },
      },
      additionalProperties: false,
    },
    (args, ctx) => R.get_spese_recenti(args as { giorni?: number }, ctx),
  ),

  get_lista_spesa: tool(
    "get_lista_spesa",
    "Lista della spesa: voci ancora da comprare e ultimi 10 comprati.",
    { type: "object", properties: {}, additionalProperties: false },
    (_, ctx) => R.get_lista_spesa({}, ctx),
  ),

  get_note_recenti: tool(
    "get_note_recenti",
    "Ultime 20 note del pollaio. Filtro opzionale per testo (ricerca case-insensitive).",
    {
      type: "object",
      properties: {
        testo: { type: "string", description: "Testo da cercare nelle note." },
        includi_archiviate: { type: "boolean" },
      },
      additionalProperties: false,
    },
    (args, ctx) =>
      R.get_note_recenti(
        args as { testo?: string; includi_archiviate?: boolean },
        ctx,
      ),
  ),

  get_manutenzioni_aperte: tool(
    "get_manutenzioni_aperte",
    "Tutte le voci di manutenzione attive con ultima esecuzione e stato (ok / in_scadenza / scaduto / mai_fatto).",
    { type: "object", properties: {}, additionalProperties: false },
    (_, ctx) => R.get_manutenzioni_aperte({}, ctx),
  ),

  get_rubrica: tool(
    "get_rubrica",
    "Rubrica dei contatti del pollaio (nome, telefono, relazione).",
    { type: "object", properties: {}, additionalProperties: false },
    (_, ctx) => R.get_rubrica({}, ctx),
  ),

  get_impostazioni_app: tool(
    "get_impostazioni_app",
    "Guida statica alle funzioni dell'app Poliner: come configurare notifiche, pollai, profilo, conservazione uova, aggiungere galline/uova/manutenzioni/note. Utile per rispondere a domande tipo 'come disattivo le notifiche?'.",
    { type: "object", properties: {}, additionalProperties: false },
    (_, ctx) => R.get_impostazioni_app({}, ctx),
  ),
};

// ── WRITE TOOLS ──────────────────────────────────────────
// L'assistente può eseguire azioni nel pollaio. Ogni write tool
// è autenticato come admin del pollaio attivo (via requireAdminPollaio
// nel route handler) e protetto dalle RLS DB.
export const WRITE_TOOLS: Record<string, ToolRegistration> = {
  registra_uovo: tool(
    "registra_uovo",
    "Registra uno o più uova nel pollaio attivo. Usa quando l'utente dice cose come 'segna un uovo di Babet' o 'registra 2 uova oggi'. Se la gallina non è specificata, ometti il campo.",
    {
      type: "object",
      properties: {
        gallina_nome: {
          type: "string",
          description: "Nome esatto della gallina che ha deposto l'uovo. Omettere se non è chiaro o se l'utente non lo dice.",
        },
        nido_nome: {
          type: "string",
          description: "Nome del nido. Omettere se non specificato.",
        },
        data: {
          type: "string",
          description: "Data di deposizione in formato ISO YYYY-MM-DD. Default: oggi.",
        },
        quantita: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "Numero di uova da registrare (1 per default).",
        },
        note: { type: "string", description: "Eventuali note." },
      },
      additionalProperties: false,
    },
    (args, ctx) =>
      W.registra_uovo(
        args as {
          gallina_nome?: string;
          nido_nome?: string;
          data?: string;
          quantita?: number;
          note?: string;
        },
        ctx,
      ),
  ),

  aggiungi_lista_spesa: tool(
    "aggiungi_lista_spesa",
    "Aggiunge una voce alla lista della spesa del pollaio attivo. Usa quando l'utente dice cose tipo 'aggiungi il mangime alla lista' o 'ricordami di comprare la lettiera'.",
    {
      type: "object",
      properties: {
        testo: {
          type: "string",
          description: "Cosa comprare (es. 'Mangime per ovaiole').",
        },
        quantita: {
          type: "string",
          description: "Quantità testuale opzionale (es. '5 kg', '2 sacchi').",
        },
        categoria: { type: "string" },
      },
      required: ["testo"],
      additionalProperties: false,
    },
    (args, ctx) =>
      W.aggiungi_lista_spesa(
        args as { testo?: string; quantita?: string; categoria?: string },
        ctx,
      ),
  ),

  crea_nota: tool(
    "crea_nota",
    "Crea una nota nel pollaio attivo. Usa quando l'utente dice 'annotami che…', 'segnati che…', 'prendi nota'. Il tag è opzionale tra 'osservazione', 'idea', 'promemoria'.",
    {
      type: "object",
      properties: {
        testo: { type: "string" },
        tag: {
          type: "string",
          enum: ["osservazione", "idea", "promemoria"],
        },
      },
      required: ["testo"],
      additionalProperties: false,
    },
    (args, ctx) =>
      W.crea_nota(
        args as { testo?: string; tag?: "osservazione" | "idea" | "promemoria" },
        ctx,
      ),
  ),

  registra_spesa: tool(
    "registra_spesa",
    "Registra una spesa sostenuta per il pollaio. Usa quando l'utente dice 'ho speso X euro per…' o simili.",
    {
      type: "object",
      properties: {
        descrizione: { type: "string" },
        importo_euro: { type: "number", exclusiveMinimum: 0 },
        categoria: { type: "string" },
        data: {
          type: "string",
          description: "Data della spesa in formato ISO YYYY-MM-DD. Default: oggi.",
        },
        note: { type: "string" },
      },
      required: ["descrizione", "importo_euro"],
      additionalProperties: false,
    },
    (args, ctx) =>
      W.registra_spesa(
        args as {
          descrizione?: string;
          importo_euro?: number;
          categoria?: string;
          data?: string;
          note?: string;
        },
        ctx,
      ),
  ),

  registra_evento_salute: tool(
    "registra_evento_salute",
    "Apre un evento di salute su una gallina (lo stato sarà 'in_corso'). Usa quando l'utente dice cose tipo 'Babet ha la cresta pallida', 'Lulù si gratta', 'ho trovato una piuma sanguinante'.",
    {
      type: "object",
      properties: {
        gallina_nome: { type: "string" },
        tipo: {
          type: "string",
          enum: ["malattia", "ferita", "comportamento", "parassiti", "guscio", "altro"],
        },
        descrizione: {
          type: "string",
          description: "Cosa hai osservato (1-2 frasi).",
        },
        data: {
          type: "string",
          description: "Data ISO YYYY-MM-DD. Default: oggi.",
        },
      },
      required: ["gallina_nome", "tipo"],
      additionalProperties: false,
    },
    (args, ctx) =>
      W.registra_evento_salute(
        args as {
          gallina_nome?: string;
          tipo?: W.TipoEventoSalute;
          descrizione?: string;
          data?: string;
        },
        ctx,
      ),
  ),

  registra_rifornimento_scorta: tool(
    "registra_rifornimento_scorta",
    "Registra l'aggiunta di una quantità a una scorta esistente E aggiorna il totale. Usa quando l'utente dice 'ho comprato 5 kg di mangime', 'ho riempito la scorta di X'.",
    {
      type: "object",
      properties: {
        scorta_nome: {
          type: "string",
          description: "Nome esatto della scorta (es. 'Mangime ovaiole', 'Pellet').",
        },
        quantita_aggiunta: { type: "number", exclusiveMinimum: 0 },
        note: { type: "string" },
      },
      required: ["scorta_nome", "quantita_aggiunta"],
      additionalProperties: false,
    },
    (args, ctx) =>
      W.registra_rifornimento_scorta(
        args as {
          scorta_nome?: string;
          quantita_aggiunta?: number;
          note?: string;
        },
        ctx,
      ),
  ),

  spunta_lista_spesa: tool(
    "spunta_lista_spesa",
    "Marca una voce della lista della spesa come 'comprata'. Usa quando l'utente dice 'ho comprato X' / 'spunta X dalla lista'. La ricerca è per testo: se il nome dato è ambiguo (più voci), riporta l'errore senza spuntare.",
    {
      type: "object",
      properties: {
        testo: {
          type: "string",
          description: "Testo o parte del testo della voce (es. 'mangime').",
        },
      },
      required: ["testo"],
      additionalProperties: false,
    },
    (args, ctx) => W.spunta_lista_spesa(args as { testo?: string }, ctx),
  ),

  registra_manutenzione: tool(
    "registra_manutenzione",
    "Registra l'esecuzione di una voce di manutenzione (es. 'ho pulito i nidi', 'ho disinfettato'). Cerca la voce per nome tra quelle attive nel pollaio.",
    {
      type: "object",
      properties: {
        voce_nome: {
          type: "string",
          description: "Nome (anche parziale) della voce di manutenzione.",
        },
        data: { type: "string" },
        note: { type: "string" },
      },
      required: ["voce_nome"],
      additionalProperties: false,
    },
    (args, ctx) =>
      W.registra_manutenzione(
        args as { voce_nome?: string; data?: string; note?: string },
        ctx,
      ),
  ),

  marca_uovo_consumato: tool(
    "marca_uovo_consumato",
    "Segna come consumate le N uova più vecchie disponibili (FIFO). Usa quando l'utente dice 'abbiamo mangiato 2 uova', 'oggi ne ho usate 3'. Opzionalmente filtrabile per gallina.",
    {
      type: "object",
      properties: {
        quantita: { type: "integer", minimum: 1, maximum: 12 },
        gallina_nome: {
          type: "string",
          description: "Se specificato, considera solo le uova di quella gallina.",
        },
      },
      additionalProperties: false,
    },
    (args, ctx) =>
      W.marca_uovo_consumato(
        args as { quantita?: number; gallina_nome?: string },
        ctx,
      ),
  ),
};

// ── REGISTRY UNIFICATO ───────────────────────────────────
export const ALL_TOOLS: Record<string, ToolRegistration> = {
  ...READ_TOOLS,
  ...WRITE_TOOLS,
};

export function openAIToolsArray(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return Object.values(ALL_TOOLS).map((t) => t.definition);
}

export async function executeToolCall(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = ALL_TOOLS[name];
  if (!tool) {
    return { errore: `Strumento sconosciuto: ${name}` };
  }
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { errore: "Argomenti del tool non validi (JSON malformato)." };
  }
  try {
    return await tool.handler(args, ctx);
  } catch (err) {
    console.error(`[ai-tool] ${name} fallito`, err);
    return {
      errore:
        "Errore nel recupero dei dati. Prova a riformulare la richiesta o continua senza questo dato.",
    };
  }
}

export type { ToolContext } from "./read-tools";

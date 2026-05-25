import type OpenAI from "openai";
import type { ToolContext } from "./read-tools";
import * as R from "./read-tools";

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
// Placeholder. In v1 sono vuoti: l'assistente è read-only.
// Quando vorremo attivare le azioni di scrittura (es. "registra
// un uovo di Babet"), aggiungeremo qui le definizioni + handler
// e cableremo un UI di conferma lato client.
export const WRITE_TOOLS: Record<string, ToolRegistration> = {};

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

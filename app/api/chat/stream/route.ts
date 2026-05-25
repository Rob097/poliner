import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { getOpenAI } from "@/lib/ai/openai";
import { mapOpenAIError, DAILY_QUOTA_ERROR } from "@/lib/ai/errors";
import { checkAndIncrementQuota } from "@/lib/ai/quota";
import { buildOverview } from "@/lib/ai/overview";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import {
  openAIToolsArray,
  executeToolCall,
  type ToolContext,
} from "@/lib/ai/tools";
import { MODELS, CHAT_PARAMS, MAX_HISTORY_MESSAGES } from "@/lib/ai/config";
import { generateTitleFor } from "@/lib/ai/title";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Allegato {
  type: "image";
  url: string;
}

interface StreamBody {
  conversationId: string;
  userMessage: string;
  allegati?: Allegato[];
}

const MAX_TOOL_ITERATIONS = 5;
const MAX_USER_MESSAGE_LEN = 4000;

type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function parseBody(raw: unknown): StreamBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.conversationId !== "string" || typeof b.userMessage !== "string")
    return null;
  const allegati = Array.isArray(b.allegati)
    ? b.allegati.filter(
        (a: unknown): a is Allegato =>
          !!a &&
          typeof a === "object" &&
          (a as { type?: unknown }).type === "image" &&
          typeof (a as { url?: unknown }).url === "string",
      )
    : [];
  return {
    conversationId: b.conversationId,
    userMessage: b.userMessage.slice(0, MAX_USER_MESSAGE_LEN),
    allegati,
  };
}

type UserContent = OpenAI.Chat.Completions.ChatCompletionUserMessageParam["content"];

function userMessageContent(
  text: string,
  allegati: Allegato[],
): UserContent {
  if (allegati.length === 0) return text;
  return [
    { type: "text", text },
    ...allegati.map((a) => ({
      type: "image_url" as const,
      image_url: { url: a.url },
    })),
  ];
}

export async function POST(req: NextRequest) {
  // ── 1. Parse + auth ───────────────────────────────────
  let body: StreamBody | null = null;
  try {
    body = parseBody(await req.json());
  } catch {
    /* body resterà null */
  }
  if (!body || body.userMessage.trim().length === 0) {
    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 },
    );
  }

  let ctx: Awaited<ReturnType<typeof requireAdminPollaio>>;
  try {
    ctx = await requireAdminPollaio();
  } catch {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const { supabase, user, pollaio, profile } = ctx;

  // ── 2. Verifica conversazione + pollaio ───────────────
  const { data: conv } = await supabase
    .from("chat_conversazioni")
    .select("id, user_id, pollaio_id, titolo")
    .eq("id", body.conversationId)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id || conv.pollaio_id !== pollaio.id) {
    return NextResponse.json(
      { error: "Conversazione non trovata." },
      { status: 404 },
    );
  }
  const conversationId = conv.id;
  const conversazioneIsNew = conv.titolo === "Nuova conversazione";

  // ── 3. Quota giornaliera ──────────────────────────────
  const quota = await checkAndIncrementQuota(supabase, user.id);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: DAILY_QUOTA_ERROR.message, code: "quota_daily" },
      { status: 429 },
    );
  }

  // ── 4. Salva subito il messaggio user (anche se OpenAI fallisce dopo) ──
  const userMessageText = body.userMessage.trim();
  await supabase.from("chat_messaggi").insert({
    conversazione_id: conversationId,
    ruolo: "user",
    contenuto: userMessageText,
    allegati: body.allegati as never,
  });

  // ── 5. Carica storico (sliding window) ───────────────
  const { data: storico } = await supabase
    .from("chat_messaggi")
    .select("ruolo, contenuto, allegati, created_at")
    .eq("conversazione_id", conversationId)
    .order("created_at", { ascending: true });

  const storicoLista = (storico ?? []).slice(-MAX_HISTORY_MESSAGES);

  // ── 6. Costruisci system prompt ───────────────────────
  const overview = await buildOverview(supabase, pollaio.id);
  const displayName = profile?.display_name ?? "Poliner";
  const systemPrompt = buildSystemPrompt({
    displayName,
    pollaioNome: pollaio.nome,
    overview,
  });

  // ── 7. Componi messaggi per OpenAI ────────────────────
  const oaMessages: ChatMsg[] = [{ role: "system", content: systemPrompt }];
  for (const m of storicoLista) {
    if (m.ruolo === "user") {
      const allegati = Array.isArray(m.allegati)
        ? (m.allegati as unknown as Allegato[])
        : [];
      oaMessages.push({
        role: "user",
        content: userMessageContent(m.contenuto, allegati),
      });
    } else if (m.ruolo === "assistant") {
      if (m.contenuto.trim().length > 0) {
        oaMessages.push({ role: "assistant", content: m.contenuto });
      }
    }
  }

  // ── 8. Apri lo stream SSE ─────────────────────────────
  const encoder = new TextEncoder();
  const toolCtx: ToolContext = {
    supabase,
    pollaioId: pollaio.id,
    userId: user.id,
  };
  const tools = openAIToolsArray();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        const openai = getOpenAI();
        let finalAssistantText = "";
        let totalTokenInput = 0;
        let totalTokenOutput = 0;

        // Tool calling loop
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const stream = await openai.chat.completions.create({
            model: MODELS.chat,
            ...CHAT_PARAMS,
            messages: oaMessages,
            tools,
            stream: true,
            stream_options: { include_usage: true },
          });

          let iterContent = "";
          const pending: Record<
            number,
            { id: string; name: string; args: string }
          > = {};
          let finishReason: string | null = null;

          for await (const chunk of stream) {
            const usage = chunk.usage;
            if (usage) {
              totalTokenInput += usage.prompt_tokens ?? 0;
              totalTokenOutput += usage.completion_tokens ?? 0;
            }
            const choice = chunk.choices?.[0];
            if (!choice) continue;
            if (choice.finish_reason) finishReason = choice.finish_reason;
            const delta = choice.delta;
            if (!delta) continue;
            if (typeof delta.content === "string" && delta.content.length > 0) {
              iterContent += delta.content;
              send({ type: "token", delta: delta.content });
            }
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const cur =
                  pending[idx] ?? (pending[idx] = { id: "", name: "", args: "" });
                if (tc.id) cur.id = tc.id;
                if (tc.function?.name) cur.name = tc.function.name;
                if (tc.function?.arguments)
                  cur.args += tc.function.arguments;
              }
            }
          }

          if (iterContent.length > 0) finalAssistantText += iterContent;

          const toolCalls = Object.values(pending).filter((t) => t.name);
          if (toolCalls.length === 0 || finishReason === "stop") {
            break;
          }

          // Aggiungi messaggio assistant con tool_calls
          oaMessages.push({
            role: "assistant",
            content: iterContent || null,
            tool_calls: toolCalls.map((t) => ({
              id: t.id,
              type: "function" as const,
              function: { name: t.name, arguments: t.args || "{}" },
            })),
          });

          // Esegui i tool e aggiungi le risposte
          for (const tc of toolCalls) {
            send({ type: "tool_call", name: tc.name });
            const result = await executeToolCall(tc.name, tc.args, toolCtx);
            oaMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
          // Continua il loop per la prossima completion
        }

        // ── Persisti il messaggio assistant finale ──
        await supabase.from("chat_messaggi").insert({
          conversazione_id: conversationId,
          ruolo: "assistant",
          contenuto: finalAssistantText,
          token_input: totalTokenInput || null,
          token_output: totalTokenOutput || null,
        });

        // Aggiorna ultimo_messaggio_at
        await supabase
          .from("chat_conversazioni")
          .update({ ultimo_messaggio_at: new Date().toISOString() })
          .eq("id", conversationId);

        // Auto-titolo se è il primo scambio
        if (conversazioneIsNew && finalAssistantText.length > 0) {
          const titolo = await generateTitleFor(userMessageText, finalAssistantText);
          await supabase
            .from("chat_conversazioni")
            .update({ titolo })
            .eq("id", conversationId);
          send({ type: "title", titolo });
        }

        send({ type: "done", ok: true });
      } catch (err) {
        const mapped = mapOpenAIError(err);
        console.error("[chat/stream]", err);
        send({ type: "error", message: mapped.message, code: mapped.code });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

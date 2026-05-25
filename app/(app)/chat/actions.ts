"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface ConversationSummary {
  id: string;
  titolo: string;
  ultimo_messaggio_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  ruolo: "user" | "assistant" | "tool" | "system";
  contenuto: string;
  allegati: Allegato[];
  tool_call: ToolCallRecord | null;
  created_at: string;
}

export interface Allegato {
  type: "image";
  url: string;
}

export interface ToolCallRecord {
  name: string;
  arguments?: string;
  result?: unknown;
}

// ── createConversation ──────────────────────────────────
export async function createConversation(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const { supabase, user, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("chat_conversazioni")
    .insert({
      user_id: user.id,
      pollaio_id: pollaio.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: "Non riesco a creare la conversazione. Riprova." };
  }
  revalidatePath("/chat");
  return { ok: true, id: data.id };
}

// ── getConversations ────────────────────────────────────
export async function getConversations(): Promise<ConversationSummary[]> {
  const { supabase, user, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("chat_conversazioni")
    .select("id, titolo, ultimo_messaggio_at, created_at")
    .eq("user_id", user.id)
    .eq("pollaio_id", pollaio.id)
    .order("ultimo_messaggio_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[chat] getConversations", error);
    return [];
  }
  return data ?? [];
}

// ── getConversation ─────────────────────────────────────
export async function getConversation(id: string): Promise<{
  conversation: ConversationSummary;
  messages: ChatMessage[];
} | null> {
  const { supabase, user, pollaio } = await requireAdminPollaio();
  const { data: conv } = await supabase
    .from("chat_conversazioni")
    .select("id, titolo, ultimo_messaggio_at, created_at, pollaio_id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id || conv.pollaio_id !== pollaio.id) {
    return null;
  }
  const { data: messaggi } = await supabase
    .from("chat_messaggi")
    .select("id, ruolo, contenuto, allegati, tool_call, created_at")
    .eq("conversazione_id", id)
    .order("created_at");
  const messages: ChatMessage[] = (messaggi ?? []).map((m) => ({
    id: m.id,
    ruolo: m.ruolo as ChatMessage["ruolo"],
    contenuto: m.contenuto,
    allegati: Array.isArray(m.allegati) ? (m.allegati as unknown as Allegato[]) : [],
    tool_call: (m.tool_call as ToolCallRecord | null) ?? null,
    created_at: m.created_at,
  }));
  return {
    conversation: {
      id: conv.id,
      titolo: conv.titolo,
      ultimo_messaggio_at: conv.ultimo_messaggio_at,
      created_at: conv.created_at,
    },
    messages,
  };
}

// ── deleteConversation ──────────────────────────────────
export async function deleteConversation(id: string): Promise<ActionResult> {
  const { supabase, user, pollaio } = await requireAdminPollaio();
  // Verifica che appartenga a user+pollaio prima di eliminare.
  const { data: conv } = await supabase
    .from("chat_conversazioni")
    .select("id, user_id, pollaio_id")
    .eq("id", id)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id || conv.pollaio_id !== pollaio.id) {
    return { ok: false, error: "Conversazione non trovata." };
  }
  const { error } = await supabase
    .from("chat_conversazioni")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Non riesco a eliminare la conversazione." };
  revalidatePath("/chat");
  return { ok: true };
}

// ── renameConversation ──────────────────────────────────
export async function renameConversation(
  id: string,
  titolo: string,
): Promise<ActionResult> {
  const titoloPulito = titolo.trim().slice(0, 80);
  if (!titoloPulito) {
    return { ok: false, error: "Il titolo non può essere vuoto." };
  }
  const { supabase, user, pollaio } = await requireAdminPollaio();
  const { data: conv } = await supabase
    .from("chat_conversazioni")
    .select("id, user_id, pollaio_id")
    .eq("id", id)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id || conv.pollaio_id !== pollaio.id) {
    return { ok: false, error: "Conversazione non trovata." };
  }
  const { error } = await supabase
    .from("chat_conversazioni")
    .update({ titolo: titoloPulito })
    .eq("id", id);
  if (error) return { ok: false, error: "Non riesco a rinominare la conversazione." };
  revalidatePath("/chat");
  revalidatePath(`/chat/${id}`);
  return { ok: true };
}

// ── startNewConversation (azione comoda dal FAB) ────────
export async function startNewConversation(): Promise<never> {
  const res = await createConversation();
  if (!res.ok) {
    redirect("/chat?error=create_failed");
  }
  redirect(`/chat/${res.id}`);
}

// Helper per il route handler streaming: verifica che la conversazione
// appartenga all'utente e al pollaio attivo. Usata anche dal frontend
// quando serve un'azione cross-page.
export async function assertConversationOwnership(id: string): Promise<boolean> {
  const { supabase, user, pollaio } = await requireAdminPollaio();
  const { data } = await supabase
    .from("chat_conversazioni")
    .select("user_id, pollaio_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return false;
  return data.user_id === user.id && data.pollaio_id === pollaio.id;
}

// Wrapper che `notFound()` su mismatch: comodo per le page dynamic
export async function requireConversation(id: string) {
  const result = await getConversation(id);
  if (!result) notFound();
  return result;
}

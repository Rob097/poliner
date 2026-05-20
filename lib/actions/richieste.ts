"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";
import { sendPushToUser } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok: boolean;
  errore?: string;
}

interface CreaRichiestaInput {
  quantita: number;
  nota?: string | null;
}

/**
 * Crea una richiesta uova per il pollaio attivo dell'utente corrente.
 * Inserisce e poi dispatcha notifica push a tutti gli admin del pollaio.
 * Nessun vincolo sulle scorte (è solo una wishlist).
 */
export async function creaRichiestaUova(
  input: CreaRichiestaInput,
): Promise<ActionResult> {
  if (input.quantita < 1) return { ok: false, errore: "Quantità non valida." };

  const { supabase, user, pollaio } = await requirePollaio();
  const nota = input.nota?.trim() || null;

  const { data: nuova, error } = await supabase
    .from("richieste_uova")
    .insert({
      pollaio_id: pollaio.id,
      richiedente_user_id: user.id,
      quantita: input.quantita,
      nota,
    })
    .select("id")
    .single();

  if (error || !nuova) {
    return { ok: false, errore: "Ops, non sono riuscita a inviare la richiesta." };
  }

  // Notifica push agli admin (best-effort: niente errore se push falliscono)
  await notificaAdminNuovaRichiesta({
    pollaioId: pollaio.id,
    pollaioNome: pollaio.nome,
    richiestaId: nuova.id,
    richiedenteId: user.id,
    richiedenteEmail: user.email ?? null,
    quantita: input.quantita,
  });

  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Accetta una richiesta (admin). Chiama la RPC atomica che blocca
 * scorte, crea il regalo e marca le uova come "regalato".
 */
export async function accettaRichiesta(
  richiestaId: string,
): Promise<ActionResult & { regaloId?: string }> {
  const { supabase } = await requirePollaio();

  const { data, error } = await supabase.rpc("accetta_richiesta_uova", {
    p_richiesta: richiestaId,
  });

  if (error) return { ok: false, errore: "Ops, riprova!" };

  type RpcResult = { ok: boolean; errore?: string; regalo_id?: string };
  const res = (data ?? { ok: false }) as RpcResult;
  if (!res.ok) return { ok: false, errore: res.errore ?? "Operazione non riuscita." };

  revalidatePath("/uova");
  revalidatePath("/");
  revalidatePath("/rubrica");
  return { ok: true, regaloId: res.regalo_id };
}

/**
 * Rifiuta una richiesta (admin). Nessuna sottrazione scorte.
 */
export async function rifiutaRichiesta(richiestaId: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();

  const { data, error } = await supabase.rpc("rifiuta_richiesta_uova", {
    p_richiesta: richiestaId,
  });

  if (error) return { ok: false, errore: "Ops, riprova!" };

  type RpcResult = { ok: boolean; errore?: string };
  const res = (data ?? { ok: false }) as RpcResult;
  if (!res.ok) return { ok: false, errore: res.errore ?? "Operazione non riuscita." };

  revalidatePath("/uova");
  return { ok: true };
}

/**
 * Il richiedente può annullare la propria richiesta finché è in_attesa.
 * Anche gli admin possono eliminare via questa action (RLS lo permette).
 */
export async function annullaRichiesta(richiestaId: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("richieste_uova").delete().eq("id", richiestaId);
  if (error) return { ok: false, errore: "Non sono riuscita a eliminare la richiesta." };
  revalidatePath("/uova");
  return { ok: true };
}

// ─── Helpers ─────────────────────────────────────────────

async function notificaAdminNuovaRichiesta(args: {
  pollaioId: string;
  pollaioNome: string;
  richiestaId: string;
  richiedenteId: string;
  richiedenteEmail: string | null;
  quantita: number;
}): Promise<void> {
  const admin = createAdminClient();

  // Admin del pollaio
  type Member = { user_id: string };
  const { data: admins } = await admin
    .from("pollaio_members")
    .select("user_id")
    .eq("pollaio_id", args.pollaioId)
    .eq("ruolo", "admin");

  const adminIds = ((admins ?? []) as unknown as Member[]).map((m) => m.user_id);
  if (adminIds.length === 0) return;

  // Nome richiedente per messaggio
  type Profile = { display_name: string | null };
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", args.richiedenteId)
    .single();
  const prof = profile as Profile | null;
  const nome =
    prof?.display_name?.trim() ||
    args.richiedenteEmail?.split("@")[0] ||
    "Un membro";

  const title = "🙏 Nuova richiesta uova";
  const body = `${nome} ha chiesto ${args.quantita} uov${args.quantita === 1 ? "o" : "a"}`;

  // Verifica preferenze: solo admin con push_attivo + categoria abilitata
  type Pref = {
    user_id: string;
    globale_attivo: boolean;
    push_attivo: boolean;
    categorie: Record<string, boolean> | null;
  };
  const { data: prefs } = await admin
    .from("preferenze_notifiche")
    .select("user_id, globale_attivo, push_attivo, categorie")
    .in("user_id", adminIds);
  const prefMap = new Map<string, Pref>(
    ((prefs ?? []) as unknown as Pref[]).map((p) => [p.user_id, p]),
  );

  const adminsAttivi = adminIds.filter((id) => {
    const p = prefMap.get(id);
    if (!p) return true; // nessuna preferenza → default = attivo
    if (!p.globale_attivo) return false;
    if (!p.push_attivo) return false;
    if (p.categorie && p.categorie["richiesta_uova"] === false) return false;
    return true;
  });

  await Promise.allSettled(
    adminsAttivi.map((id) =>
      sendPushToUser(id, {
        title,
        body,
        url: "/uova",
        tag: `richiesta-${args.richiestaId}`,
      }),
    ),
  );

  // Log in notifiche_inviate per visualizzazione in /notifiche
  const rows = adminIds.map((id) => ({
    user_id: id,
    categoria: "richiesta_uova",
    riferimento_id: args.richiestaId,
  }));
  await admin.from("notifiche_inviate").insert(rows);
}

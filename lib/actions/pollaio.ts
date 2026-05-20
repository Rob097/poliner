"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  errore?: string;
}

interface CreaPollaioInput {
  nome: string;
  posizione?: {
    nome: string;
    lat: number | null;
    lng: number | null;
  };
}

/**
 * Cambia il pollaio attivo per l'utente corrente.
 * Richiede che l'utente sia membro del pollaio.
 */
export async function switchPollaio(pollaioId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: member } = await supabase
    .from("pollaio_members")
    .select("pollaio_id")
    .eq("pollaio_id", pollaioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return { ok: false, errore: "Non fai parte di questo pollaio." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ pollaio_attivo_id: pollaioId })
    .eq("id", user.id);

  if (error) {
    return { ok: false, errore: "Non sono riuscito a cambiare pollaio. Riprova!" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Crea un nuovo pollaio per l'utente corrente. Il trigger
 * `auto_member_on_pollaio_insert` aggiunge automaticamente la
 * membership con ruolo 'admin'. Setta anche il nuovo pollaio
 * come attivo.
 */
export async function creaPollaio(
  input: CreaPollaioInput,
): Promise<ActionResult & { pollaioId?: string }> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, errore: "Dai un nome al tuo pollaio!" };

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("pollai")
    .insert({
      user_id: user.id,
      nome,
      posizione_nome: input.posizione?.nome.trim() || null,
      posizione_lat: input.posizione?.lat ?? null,
      posizione_lng: input.posizione?.lng ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, errore: "Ops, non sono riuscito a creare il pollaio. Riprova!" };
  }

  // Imposta come attivo
  await supabase
    .from("profiles")
    .update({ pollaio_attivo_id: data.id })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { ok: true, pollaioId: data.id };
}

/**
 * Rimuove l'utente corrente da un pollaio (lasciare un pollaio condiviso).
 * Vincolo: non si può abbandonare se si è l'ultimo admin.
 */
export async function abbandonaPollaio(pollaioId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  // Verifica ruolo
  const { data: mio } = await supabase
    .from("pollaio_members")
    .select("ruolo")
    .eq("pollaio_id", pollaioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mio) {
    return { ok: false, errore: "Non fai parte di questo pollaio." };
  }

  if (mio.ruolo === "admin") {
    // Conta gli altri admin
    const { count } = await supabase
      .from("pollaio_members")
      .select("*", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("ruolo", "admin");

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        errore:
          "Sei l'unico admin di questo pollaio. Promuovi qualcun altro prima di andartene oppure elimina il pollaio.",
      };
    }
  }

  const { error } = await supabase
    .from("pollaio_members")
    .delete()
    .eq("pollaio_id", pollaioId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, errore: "Non sono riuscito a rimuoverti dal pollaio. Riprova!" };
  }

  // Se era il pollaio attivo, lo resettiamo (requirePollaio sceglierà il prossimo)
  await supabase
    .from("profiles")
    .update({ pollaio_attivo_id: null })
    .eq("id", user.id)
    .eq("pollaio_attivo_id", pollaioId);

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Rimuove un altro membro dal pollaio attivo. Solo admin.
 * Non si può rimuovere sé stessi con questa action (usa abbandonaPollaio).
 * Non si può rimuovere l'ultimo admin.
 */
export async function rimuoviMembro(input: {
  pollaioId: string;
  userId: string;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  if (input.userId === user.id) {
    return { ok: false, errore: "Per andartene tu, usa 'Lascia pollaio'." };
  }

  const { data: mio } = await supabase
    .from("pollaio_members")
    .select("ruolo")
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mio || mio.ruolo !== "admin") {
    return { ok: false, errore: "Solo gli admin possono rimuovere membri." };
  }

  const { data: target } = await supabase
    .from("pollaio_members")
    .select("ruolo")
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, errore: "Membro non trovato." };
  }

  if (target.ruolo === "admin") {
    const { count } = await supabase
      .from("pollaio_members")
      .select("*", { count: "exact", head: true })
      .eq("pollaio_id", input.pollaioId)
      .eq("ruolo", "admin");

    if ((count ?? 0) <= 1) {
      return { ok: false, errore: "Non puoi rimuovere l'ultimo admin del pollaio." };
    }
  }

  const { error } = await supabase
    .from("pollaio_members")
    .delete()
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", input.userId);

  if (error) {
    return { ok: false, errore: "Non sono riuscito a rimuovere il membro. Riprova!" };
  }

  revalidatePath("/impostazioni/membri");
  return { ok: true };
}

/**
 * Cambia il ruolo di un membro (admin/guest). Solo admin.
 * Non si può degradare l'ultimo admin.
 */
export async function cambiaRuoloMembro(input: {
  pollaioId: string;
  userId: string;
  nuovoRuolo: "admin" | "guest";
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: mio } = await supabase
    .from("pollaio_members")
    .select("ruolo")
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mio || mio.ruolo !== "admin") {
    return { ok: false, errore: "Solo gli admin possono cambiare i ruoli." };
  }

  if (input.nuovoRuolo === "guest") {
    const { data: target } = await supabase
      .from("pollaio_members")
      .select("ruolo")
      .eq("pollaio_id", input.pollaioId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (target?.ruolo === "admin") {
      const { count } = await supabase
        .from("pollaio_members")
        .select("*", { count: "exact", head: true })
        .eq("pollaio_id", input.pollaioId)
        .eq("ruolo", "admin");

      if ((count ?? 0) <= 1) {
        return { ok: false, errore: "Non puoi degradare l'ultimo admin a guest." };
      }
    }
  }

  const { error } = await supabase
    .from("pollaio_members")
    .update({ ruolo: input.nuovoRuolo })
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", input.userId);

  if (error) {
    return { ok: false, errore: "Non sono riuscito ad aggiornare il ruolo. Riprova!" };
  }

  revalidatePath("/impostazioni/membri");
  return { ok: true };
}

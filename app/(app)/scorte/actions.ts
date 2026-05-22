"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface NuovaScortaInput {
  nome: string;
  quantita: number | null;
  unita: string | null;
  sogliaAvviso: number | null;
}

export async function createScorta(input: NuovaScortaInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("scorte_cibo")
    .insert({
      pollaio_id: pollaio.id,
      nome: input.nome.trim(),
      quantita: input.quantita,
      unita: input.unita?.trim() || null,
      soglia_avviso: input.sogliaAvviso,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Ops, non sono riuscita a salvare la scorta." };
  revalidatePath("/scorte");
  revalidatePath("/lista-spesa");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateScorta(
  id: string,
  input: NuovaScortaInput,
): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("scorte_cibo")
    .update({
      nome: input.nome.trim(),
      quantita: input.quantita,
      unita: input.unita?.trim() || null,
      soglia_avviso: input.sogliaAvviso,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/scorte");
  revalidatePath("/lista-spesa");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteScorta(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("scorte_cibo").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare la scorta." };
  revalidatePath("/scorte");
  return { ok: true };
}

export async function rifornisciScorta(
  scortaId: string,
  quantitaAggiunta: number,
  note: string | null = null,
): Promise<ActionResult> {
  if (quantitaAggiunta <= 0) return { ok: false, error: "Quantità non valida." };
  const { supabase } = await requireAdminPollaio();

  // 1. Trova quantità attuale
  const { data: scorta, error: sErr } = await supabase
    .from("scorte_cibo")
    .select("quantita")
    .eq("id", scortaId)
    .maybeSingle();
  if (sErr || !scorta) return { ok: false, error: "Scorta non trovata." };

  // 2. Log rifornimento
  const { error: rErr } = await supabase.from("scorte_rifornimenti").insert({
    scorta_id: scortaId,
    quantita_aggiunta: quantitaAggiunta,
    note: note?.trim() || null,
  });
  if (rErr) return { ok: false, error: "Ops, riprova!" };

  // 3. Aggiorna quantità attuale
  const nuovaQty = (scorta.quantita ?? 0) + quantitaAggiunta;
  const { error: uErr } = await supabase
    .from("scorte_cibo")
    .update({ quantita: nuovaQty })
    .eq("id", scortaId);
  if (uErr) return { ok: false, error: "Ops, riprova!" };

  revalidatePath("/scorte");
  revalidatePath("/");
  return { ok: true };
}

export async function consumaScorta(
  scortaId: string,
  quantitaConsumata: number,
): Promise<ActionResult> {
  if (quantitaConsumata <= 0) return { ok: false, error: "Quantità non valida." };
  const { supabase } = await requireAdminPollaio();
  const { data: scorta, error: sErr } = await supabase
    .from("scorte_cibo")
    .select("quantita")
    .eq("id", scortaId)
    .maybeSingle();
  if (sErr || !scorta) return { ok: false, error: "Scorta non trovata." };

  const nuovaQty = Math.max(0, (scorta.quantita ?? 0) - quantitaConsumata);
  const { error: uErr } = await supabase
    .from("scorte_cibo")
    .update({ quantita: nuovaQty })
    .eq("id", scortaId);
  if (uErr) return { ok: false, error: "Ops, riprova!" };

  revalidatePath("/scorte");
  revalidatePath("/");
  return { ok: true };
}

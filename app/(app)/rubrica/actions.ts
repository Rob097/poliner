"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";

export interface ContattoInput {
  nome: string;
  relazione: string | null;
  telefono: string | null;
  note: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createContatto(input: ContattoInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("contatti")
    .insert({
      pollaio_id: pollaio.id,
      nome: input.nome.trim(),
      relazione: input.relazione?.trim() || null,
      telefono: input.telefono?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: "Ops, non riesco a salvare il contatto." };
  revalidatePath("/rubrica");
  revalidatePath("/uova");
  return { ok: true, id: data.id };
}

export async function updateContatto(
  id: string,
  input: ContattoInput,
): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("contatti")
    .update({
      nome: input.nome.trim(),
      relazione: input.relazione?.trim() || null,
      telefono: input.telefono?.trim() || null,
      note: input.note?.trim() || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Ops, non riesco a salvare le modifiche." };
  revalidatePath("/rubrica");
  return { ok: true, id };
}

export async function deleteContatto(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("contatti").delete().eq("id", id);
  if (error) return { ok: false, error: "Non riesco a eliminare il contatto." };
  revalidatePath("/rubrica");
  return { ok: true };
}

/**
 * Collega un contatto della rubrica a un membro del pollaio.
 * Tutto lo storico regali del contatto resta intatto; se esisteva un
 * contatto auto-creato per quello stesso utente, lo storico viene
 * trasferito sul contatto target e l'orfano eliminato (via RPC).
 *
 * Solo admin. La verifica è dentro la RPC SECURITY DEFINER.
 */
export async function linkContattoUtente(input: {
  contattoId: string;
  utenteId: string;
  rinomina?: string;
}): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();

  const { data, error } = await supabase.rpc("merge_contatto_con_utente", {
    p_contatto: input.contattoId,
    p_utente: input.utenteId,
    p_rinomina: input.rinomina?.trim() || undefined,
  });

  if (error) {
    return { ok: false, error: "Ops, riprova!" };
  }

  type RpcResult = { ok: boolean; errore?: string };
  const res = (data ?? { ok: false }) as RpcResult;
  if (!res.ok) {
    return { ok: false, error: res.errore ?? "Operazione non riuscita." };
  }

  revalidatePath("/rubrica");
  revalidatePath("/uova");
  revalidatePath("/impostazioni/membri");
  return { ok: true };
}

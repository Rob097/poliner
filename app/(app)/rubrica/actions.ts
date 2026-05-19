"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

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
  const { supabase, pollaio } = await requirePollaio();
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
  const { supabase } = await requirePollaio();
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
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("contatti").delete().eq("id", id);
  if (error) return { ok: false, error: "Non riesco a eliminare il contatto." };
  revalidatePath("/rubrica");
  return { ok: true };
}

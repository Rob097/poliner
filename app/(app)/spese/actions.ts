"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface NuovaSpesaInput {
  data: string;             // YYYY-MM-DD
  importoEuro: number;
  descrizione: string;
  categoria: string | null;
  note: string | null;
}

export async function createSpesa(input: NuovaSpesaInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();
  const { data, error } = await supabase
    .from("spese")
    .insert({
      pollaio_id: pollaio.id,
      data: input.data,
      importo_euro: input.importoEuro,
      descrizione: input.descrizione.trim(),
      categoria: input.categoria?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Ops, non sono riuscita a salvare la spesa." };
  revalidatePath("/spese");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateSpesa(
  id: string,
  input: NuovaSpesaInput,
): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase
    .from("spese")
    .update({
      data: input.data,
      importo_euro: input.importoEuro,
      descrizione: input.descrizione.trim(),
      categoria: input.categoria?.trim() || null,
      note: input.note?.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, non sono riuscita a salvare le modifiche." };
  revalidatePath("/spese");
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteSpesa(id: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("spese").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare la spesa." };
  revalidatePath("/spese");
  revalidatePath("/");
  return { ok: true };
}

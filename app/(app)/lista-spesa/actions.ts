"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export type CategoriaLista = "cibo" | "lettiera" | "medicinali" | "altro";

export interface NuovaVoceInput {
  testo: string;
  categoria: CategoriaLista | null;
  quantita: string | null;
}

export async function aggiungiVoce(input: NuovaVoceInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();
  const { data, error } = await supabase
    .from("lista_spesa")
    .insert({
      pollaio_id: pollaio.id,
      testo: input.testo.trim(),
      categoria: input.categoria,
      quantita: input.quantita?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/lista-spesa");
  return { ok: true, id: data.id };
}

export async function toggleVoce(id: string, comprato: boolean): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase
    .from("lista_spesa")
    .update({
      comprato,
      data_acquisto: comprato ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/lista-spesa");
  return { ok: true };
}

export async function eliminaVoce(id: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("lista_spesa").delete().eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/lista-spesa");
  return { ok: true };
}

export async function svuotaAcquistati(): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();
  const { error } = await supabase
    .from("lista_spesa")
    .delete()
    .eq("pollaio_id", pollaio.id)
    .eq("comprato", true);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/lista-spesa");
  return { ok: true };
}

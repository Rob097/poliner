"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Azione rapida dal FAB: registra "pulizia casetta" con ora corrente.
 */
export async function quickAddPuliziaCasetta(): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();
  const { error } = await supabase.from("manutenzioni").insert({
    pollaio_id: pollaio.id,
    tipo: "pulizia_casetta",
    data: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

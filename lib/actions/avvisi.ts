"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Marca un avviso della home come "letto" per l'utente corrente nel pollaio
 * corrente. L'avviso resta nascosto finché la sua `avviso_key` (che incorpora
 * un cycle_id naturale per il tipo di avviso) non cambia. L'INSERT è
 * idempotente grazie al primary key composto.
 */
export async function segnaAvvisoComeLetto(
  avvisoKey: string,
): Promise<ActionResult> {
  if (!avvisoKey || typeof avvisoKey !== "string") {
    return { ok: false, error: "Chiave avviso non valida" };
  }
  const { supabase, user, pollaio } = await requirePollaio();
  const { error } = await supabase.from("avvisi_letti").upsert(
    {
      user_id: user.id,
      pollaio_id: pollaio.id,
      avviso_key: avvisoKey,
    },
    {
      onConflict: "user_id,pollaio_id,avviso_key",
      ignoreDuplicates: true,
    },
  );
  if (error) {
    console.error("[avvisi] segnaAvvisoComeLetto:", error.message);
    return { ok: false, error: "Ops, riprova!" };
  }
  revalidatePath("/");
  return { ok: true };
}

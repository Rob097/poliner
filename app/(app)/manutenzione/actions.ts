"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";
import type { TipoManutenzioneId } from "@/lib/constants/manutenzione";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface NuovoInterventoInput {
  tipo: TipoManutenzioneId;
  data: string;        // ISO
  note: string | null;
}

export async function registraIntervento(input: NuovoInterventoInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();
  const { error } = await supabase.from("manutenzioni").insert({
    pollaio_id: pollaio.id,
    tipo: input.tipo,
    data: input.data,
    note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: "Ops, non sono riuscita a salvare l'intervento." };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

export async function eliminaIntervento(id: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("manutenzioni").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare l'intervento." };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

export async function aggiornaFrequenza(
  tipo: TipoManutenzioneId,
  frequenzaGiorni: number,
): Promise<ActionResult> {
  if (frequenzaGiorni < 1) return { ok: false, error: "Frequenza non valida." };
  const { supabase, pollaio } = await requirePollaio();
  const { error } = await supabase
    .from("manutenzioni_config")
    .upsert(
      { pollaio_id: pollaio.id, tipo, frequenza_giorni: frequenzaGiorni },
      { onConflict: "pollaio_id,tipo" },
    );
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

export async function ripristinaFrequenza(
  tipo: TipoManutenzioneId,
): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();
  const { error } = await supabase
    .from("manutenzioni_config")
    .delete()
    .eq("pollaio_id", pollaio.id)
    .eq("tipo", tipo);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/manutenzione");
  return { ok: true };
}

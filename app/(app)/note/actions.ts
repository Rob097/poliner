"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export type TagNota = "osservazione" | "idea" | "promemoria";
export type CanaleNotifica = "push" | "email" | "entrambi";

export interface NuovaNotaInput {
  id: string;
  testo: string;
  tag: TagNota | null;
  fotoUrl: string | null;
  promemoriaData: string | null;       // ISO timestamp
  promemoriaCanale: CanaleNotifica | null;
}

export async function createNota(input: NuovaNotaInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { error } = await supabase.from("note").insert({
    id: input.id,
    pollaio_id: pollaio.id,
    testo: input.testo.trim(),
    tag: input.tag,
    foto_url: input.fotoUrl,
    promemoria_data: input.promemoriaData,
    promemoria_canale: input.promemoriaCanale,
  });
  if (error) return { ok: false, error: "Ops, non sono riuscita a salvare la nota." };
  revalidatePath("/note");
  revalidatePath("/");
  return { ok: true, id: input.id };
}

export async function updateNota(
  id: string,
  input: Omit<NuovaNotaInput, "id">,
): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("note")
    .update({
      testo: input.testo.trim(),
      tag: input.tag,
      foto_url: input.fotoUrl,
      promemoria_data: input.promemoriaData,
      promemoria_canale: input.promemoriaCanale,
      promemoria_inviato: false,   // reset se cambia data
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/note");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteNota(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("note").delete().eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/note");
  revalidatePath("/");
  return { ok: true };
}

export async function archiviaNota(id: string, archiviata: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("note")
    .update({ archiviata })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/note");
  revalidatePath("/");
  return { ok: true };
}

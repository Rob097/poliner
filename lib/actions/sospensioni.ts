"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { riepilogoUovaSospensione } from "@/lib/queries/sospensioni";
import {
  SOSPENSIONE_SELECT,
  daRigaSospensione,
  rigaSospensione,
  validaSospensione,
  type SospensioneInput,
} from "@/lib/utils/sospensioni";
import type { ActionResult } from "@/lib/types";

export type SospensioneFormInput = Omit<SospensioneInput, "trattamentoId">;

export interface SalvaSospensioneResult extends ActionResult {
  id?: string;
  /** Uova in scorta ora segnate come non commestibili da questa sospensione. */
  uovaMarcate?: number;
  /** Uova del periodo già consumate o regalate prima della registrazione. */
  uovaGiaUsate?: number;
}

// La marcatura delle uova la fanno i trigger del DB: qui basta scrivere la
// sospensione e poi leggere quante uova sono state toccate.
export async function creaSospensioneUova(
  input: SospensioneFormInput,
): Promise<SalvaSospensioneResult> {
  const errore = validaSospensione(input);
  if (errore) return { ok: false, error: errore };

  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("sospensioni_uova")
    .insert(rigaSospensione(pollaio.id, input))
    .select(SOSPENSIONE_SELECT)
    .single();
  if (error || !data) {
    console.error("[sospensioni] crea:", error?.message);
    return { ok: false, error: "Non sono riuscita a registrare la sospensione." };
  }

  const riepilogo = await riepilogoUovaSospensione(
    supabase,
    pollaio.id,
    daRigaSospensione(data),
  );
  revalidaSospensioni();
  return {
    ok: true,
    id: data.id,
    uovaMarcate: riepilogo.marcate,
    uovaGiaUsate: riepilogo.giaUsate,
  };
}

export async function aggiornaSospensioneUova(
  id: string,
  input: SospensioneFormInput,
): Promise<SalvaSospensioneResult> {
  const errore = validaSospensione(input);
  if (errore) return { ok: false, error: errore };

  const { supabase, pollaio } = await requireAdminPollaio();
  const patch = rigaSospensione(pollaio.id, input);
  // Il collegamento al trattamento non si tocca dal form.
  delete patch.trattamento_id;
  const { data, error } = await supabase
    .from("sospensioni_uova")
    .update(patch)
    .eq("id", id)
    .eq("pollaio_id", pollaio.id)
    .select(SOSPENSIONE_SELECT)
    .single();
  if (error || !data) {
    console.error("[sospensioni] aggiorna:", error?.message);
    return { ok: false, error: "Non sono riuscita a salvare le modifiche." };
  }

  const riepilogo = await riepilogoUovaSospensione(
    supabase,
    pollaio.id,
    daRigaSospensione(data),
  );
  revalidaSospensioni();
  return {
    ok: true,
    id: data.id,
    uovaMarcate: riepilogo.marcate,
    uovaGiaUsate: riepilogo.giaUsate,
  };
}

export async function eliminaSospensioneUova(id: string): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { error } = await supabase
    .from("sospensioni_uova")
    .delete()
    .eq("id", id)
    .eq("pollaio_id", pollaio.id);
  if (error) {
    console.error("[sospensioni] elimina:", error.message);
    return { ok: false, error: "Non sono riuscita a eliminare la sospensione." };
  }
  revalidaSospensioni();
  return { ok: true };
}

function revalidaSospensioni() {
  revalidatePath("/");
  revalidatePath("/uova");
  revalidatePath("/uova/sospensioni");
  revalidatePath("/galline", "layout");
}

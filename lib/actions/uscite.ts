"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { dateIsoInTimeZone, timeIsoInTimeZone } from "@/lib/utils/date";
import type { ActionResult } from "@/lib/types";

export type { ActionResult };

/**
 * Data e orario correnti nel fuso del pollaio.
 * log_uscite.ora_uscita/ora_rientro è TIME (no timezone).
 */
function nowUscita() {
  const now = new Date();

  return {
    data: dateIsoInTimeZone(now),
    ora: timeIsoInTimeZone(now),
  };
}

/**
 * Registra l'apertura del pollaio (ora corrente) per oggi.
 * Se la riga di oggi esiste già con ora_uscita, non sovrascrive (idempotente).
 */
export async function registraApertura(): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, ora } = nowUscita();

  // Verifica se la riga di oggi esiste già
  const { data: existing } = await supabase
    .from("log_uscite")
    .select("id, ora_uscita")
    .eq("pollaio_id", pollaio.id)
    .eq("data", data)
    .maybeSingle();

  if (existing?.ora_uscita) {
    return { ok: true }; // già aperto, no-op
  }

  if (existing) {
    const { error } = await supabase
      .from("log_uscite")
      .update({ ora_uscita: ora })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "Non sono riuscita a registrare l'apertura." };
  } else {
    const { error } = await supabase
      .from("log_uscite")
      .insert({ pollaio_id: pollaio.id, data, ora_uscita: ora });
    if (error) return { ok: false, error: "Non sono riuscita a registrare l'apertura." };
  }

  revalidatePath("/");
  revalidatePath("/uscite");
  return { ok: true };
}

/**
 * Registra la chiusura del pollaio (ora corrente) per oggi.
 * Se non esiste una riga di oggi, la crea con solo ora_rientro.
 */
export async function registraChiusura(): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, ora } = nowUscita();

  const { data: existing } = await supabase
    .from("log_uscite")
    .select("id, ora_rientro")
    .eq("pollaio_id", pollaio.id)
    .eq("data", data)
    .maybeSingle();

  if (existing?.ora_rientro) {
    return { ok: true }; // già chiuso
  }

  if (existing) {
    const { error } = await supabase
      .from("log_uscite")
      .update({ ora_rientro: ora })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "Non sono riuscita a registrare la chiusura." };
  } else {
    const { error } = await supabase
      .from("log_uscite")
      .insert({ pollaio_id: pollaio.id, data, ora_rientro: ora });
    if (error) return { ok: false, error: "Non sono riuscita a registrare la chiusura." };
  }

  revalidatePath("/");
  revalidatePath("/uscite");
  return { ok: true };
}

interface AggiornaOrarioInput {
  oraUscita?: string | null; // "HH:MM" o null
  oraRientro?: string | null;
  note?: string | null;
}

export async function aggiornaOrario(
  id: string,
  patch: AggiornaOrarioInput,
): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();

  const update: Record<string, unknown> = {};
  if (patch.oraUscita !== undefined) {
    update.ora_uscita = patch.oraUscita ? `${patch.oraUscita}:00`.slice(0, 8) : null;
  }
  if (patch.oraRientro !== undefined) {
    update.ora_rientro = patch.oraRientro ? `${patch.oraRientro}:00`.slice(0, 8) : null;
  }
  if (patch.note !== undefined) update.note = patch.note?.trim() || null;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("log_uscite").update(update).eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a salvare le modifiche." };

  revalidatePath("/");
  revalidatePath("/uscite");
  return { ok: true };
}

/**
 * Crea una riga storica manuale (per giornate dimenticate o passate).
 */
export async function creaUscitaManuale(input: {
  data: string; // YYYY-MM-DD
  oraUscita?: string | null;
  oraRientro?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { error } = await supabase.from("log_uscite").upsert(
    {
      pollaio_id: pollaio.id,
      data: input.data,
      ora_uscita: input.oraUscita ? `${input.oraUscita}:00`.slice(0, 8) : null,
      ora_rientro: input.oraRientro ? `${input.oraRientro}:00`.slice(0, 8) : null,
      note: input.note?.trim() || null,
    },
    { onConflict: "pollaio_id,data" },
  );
  if (error) return { ok: false, error: "Non sono riuscita a salvare la giornata." };

  revalidatePath("/");
  revalidatePath("/uscite");
  return { ok: true };
}

export async function eliminaUscita(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("log_uscite").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare la giornata." };
  revalidatePath("/");
  revalidatePath("/uscite");
  return { ok: true };
}

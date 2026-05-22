"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import type { ActionResult } from "@/lib/types";

export type { ActionResult };

export interface NuovoInterventoInput {
  voceId: string;
  data: string; // ISO
  note: string | null;
}

export async function registraIntervento(input: NuovoInterventoInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { error } = await supabase.from("manutenzioni").insert({
    pollaio_id: pollaio.id,
    voce_id: input.voceId,
    data: input.data,
    note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: "Ops, non sono riuscita a salvare l'intervento." };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

export async function eliminaIntervento(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("manutenzioni").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare l'intervento." };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

// ─── Voci ──────────────────────────────────────────────────

export interface NuovaVoceInput {
  nome: string;
  dove?: string | null;
  icona?: string;
  frequenzaGiorni: number;
  note?: string | null;
  consiglioId?: string | null;
}

export async function creaVoce(input: NuovaVoceInput): Promise<ActionResult & { voceId?: string }> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, error: "Dai un nome a questa voce." };
  if (input.frequenzaGiorni < 1) return { ok: false, error: "La frequenza deve essere almeno 1 giorno." };

  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("manutenzioni_voci")
    .insert({
      pollaio_id: pollaio.id,
      nome,
      dove: input.dove?.trim() || null,
      icona: input.icona?.trim() || "🧹",
      frequenza_giorni: input.frequenzaGiorni,
      note: input.note?.trim() || null,
      consiglio_id: input.consiglioId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Ops, non sono riuscita a creare la voce." };
  }

  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true, voceId: data.id };
}

export interface AggiornaVoceInput {
  nome?: string;
  dove?: string | null;
  icona?: string;
  frequenzaGiorni?: number;
  note?: string | null;
  attivo?: boolean;
}

export async function aggiornaVoce(id: string, patch: AggiornaVoceInput): Promise<ActionResult> {
  const update: Record<string, unknown> = {};
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) return { ok: false, error: "Il nome non può essere vuoto." };
    update.nome = nome;
  }
  if (patch.dove !== undefined) update.dove = patch.dove?.trim() || null;
  if (patch.icona !== undefined) update.icona = patch.icona.trim() || "🧹";
  if (patch.frequenzaGiorni !== undefined) {
    if (patch.frequenzaGiorni < 1) return { ok: false, error: "La frequenza deve essere almeno 1 giorno." };
    update.frequenza_giorni = patch.frequenzaGiorni;
  }
  if (patch.note !== undefined) update.note = patch.note?.trim() || null;
  if (patch.attivo !== undefined) update.attivo = patch.attivo;

  if (Object.keys(update).length === 0) return { ok: true };

  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("manutenzioni_voci").update(update).eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/manutenzione");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Disattiva una voce (soft delete: attivo=false). Lo storico log resta.
 */
export async function disattivaVoce(id: string): Promise<ActionResult> {
  return aggiornaVoce(id, { attivo: false });
}

/**
 * Riattiva una voce precedentemente disattivata.
 */
export async function riattivaVoce(id: string): Promise<ActionResult> {
  return aggiornaVoce(id, { attivo: true });
}

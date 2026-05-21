"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePollaio } from "@/lib/supabase/queries";
import { todayIso } from "@/lib/utils/date";

export interface NuovaGallinaInput {
  id: string;                // generato client per coerenza foto path
  nome: string;
  tipo: "gallina" | "gallo";
  razzaId: string | null;
  razzaCustom: string | null;
  dataNascita: string | null;
  colorePiumaggio: string | null;
  note: string | null;
  fotoUrl: string | null;
  // Per "aggiungi gallina già defunta"
  defuntaIl?: string | null;
  causaDecesso?: string | null;
  noteDecesso?: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createAnimale(input: NuovaGallinaInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();

  const isDefunta = !!input.defuntaIl;
  const { error } = await supabase.from("animali").insert({
    id: input.id,
    pollaio_id: pollaio.id,
    nome: input.nome.trim(),
    tipo: input.tipo,
    razza_id: input.razzaId,
    razza_custom: input.razzaCustom?.trim() || null,
    data_nascita: input.dataNascita,
    colore_piumaggio: input.colorePiumaggio?.trim() || null,
    note: input.note?.trim() || null,
    foto_url: input.fotoUrl,
    attivo: !isDefunta,
    defunta_il: input.defuntaIl ?? null,
    causa_decesso: input.causaDecesso?.trim() || null,
    note_decesso: input.noteDecesso?.trim() || null,
  });

  if (error) {
    return { ok: false, error: "Ops, qualcosa non ha funzionato. Riprova!" };
  }

  revalidatePath("/galline");
  revalidatePath("/galline/in-memoria");
  revalidatePath("/");
  return { ok: true, id: input.id };
}

export interface ModificaGallinaInput {
  id: string;
  nome: string;
  tipo: "gallina" | "gallo";
  razzaId: string | null;
  razzaCustom: string | null;
  dataNascita: string | null;
  colorePiumaggio: string | null;
  note: string | null;
  descrizionePubblica: string | null;
  fotoUrl: string | null;
}

export async function updateAnimale(input: ModificaGallinaInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();

  const { error } = await supabase
    .from("animali")
    .update({
      nome: input.nome.trim(),
      tipo: input.tipo,
      razza_id: input.razzaId,
      razza_custom: input.razzaCustom?.trim() || null,
      data_nascita: input.dataNascita,
      colore_piumaggio: input.colorePiumaggio?.trim() || null,
      note: input.note?.trim() || null,
      descrizione_pubblica: input.descrizionePubblica?.trim() || null,
      foto_url: input.fotoUrl,
    })
    .eq("id", input.id);

  if (error) {
    return { ok: false, error: "Ops, qualcosa non ha funzionato. Riprova!" };
  }

  revalidatePath("/galline");
  revalidatePath(`/galline/${input.id}`);
  revalidatePath("/");
  if (pollaio.pubblico_slug) {
    revalidatePath(`/p/${pollaio.pubblico_slug}`);
  }
  return { ok: true, id: input.id };
}

export async function archiviaAnimale(id: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();

  const { error } = await supabase
    .from("animali")
    .update({ attivo: false })
    .eq("id", id);

  if (error) return { ok: false, error: "Non sono riuscita ad archiviare la gallina." };
  revalidatePath("/galline");
  revalidatePath("/");
  return { ok: true };
}

// ── DEFUNTA ───────────────────────────────────────────────

export interface SegnaDefuntaInput {
  animaleId: string;
  defuntaIl: string;          // YYYY-MM-DD
  causa?: string | null;
  note?: string | null;
}

export async function segnaAnimaleDefunto(
  input: SegnaDefuntaInput,
): Promise<ActionResult> {
  const { supabase } = await requirePollaio();

  const { error } = await supabase
    .from("animali")
    .update({
      defunta_il: input.defuntaIl,
      causa_decesso: input.causa?.trim() || null,
      note_decesso: input.note?.trim() || null,
      attivo: false,
    })
    .eq("id", input.animaleId);

  if (error) {
    return { ok: false, error: "Non sono riuscita a salvare. Riprova!" };
  }

  revalidatePath("/galline");
  revalidatePath(`/galline/${input.animaleId}`);
  revalidatePath("/galline/in-memoria");
  revalidatePath("/uova");
  revalidatePath("/statistiche");
  revalidatePath("/");
  return { ok: true, id: input.animaleId };
}

// ── MUTA ──────────────────────────────────────────────────

export async function avviaMuta(animaleId: string): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();

  // Se c'è già una muta aperta, non crearne una nuova.
  const { data: aperta } = await supabase
    .from("periodi_muta")
    .select("id")
    .eq("animale_id", animaleId)
    .is("data_fine", null)
    .maybeSingle();
  if (aperta) return { ok: true };

  const today = todayIso();
  const { error } = await supabase.from("periodi_muta").insert({
    pollaio_id: pollaio.id,
    animale_id: animaleId,
    data_inizio: today,
  });

  if (error) return { ok: false, error: "Non sono riuscita a registrare la muta." };
  revalidatePath(`/galline/${animaleId}`);
  revalidatePath("/galline");
  return { ok: true };
}

export async function terminaMuta(animaleId: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();

  const { data: aperta } = await supabase
    .from("periodi_muta")
    .select("id")
    .eq("animale_id", animaleId)
    .is("data_fine", null)
    .maybeSingle();
  if (!aperta) return { ok: true };

  const today = todayIso();
  const { error } = await supabase
    .from("periodi_muta")
    .update({ data_fine: today })
    .eq("id", aperta.id);

  if (error) return { ok: false, error: "Non sono riuscita a chiudere la muta." };
  revalidatePath(`/galline/${animaleId}`);
  revalidatePath("/galline");
  return { ok: true };
}

// ── EVENTI SALUTE ─────────────────────────────────────────

export interface NuovoEventoSaluteInput {
  animaleId: string;
  tipo: "ferita" | "malattia" | "comportamento" | "parassiti" | "guscio" | "altro";
  descrizione: string | null;
  homeHospital?: boolean;
  hhDa?: string | null;   // YYYY-MM-DD
  hhA?: string | null;
}

export async function aggiungiEventoSalute(input: NuovoEventoSaluteInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();

  const homeHospital = !!input.homeHospital;
  const { error } = await supabase.from("eventi_salute").insert({
    pollaio_id: pollaio.id,
    animale_id: input.animaleId,
    tipo: input.tipo,
    descrizione: input.descrizione?.trim() || null,
    home_hospital: homeHospital,
    hh_da: homeHospital ? input.hhDa || todayIso() : null,
    hh_a: homeHospital ? input.hhA || null : null,
  });

  if (error) return { ok: false, error: "Non sono riuscita a registrare il problema." };
  revalidatePath(`/galline/${input.animaleId}`);
  revalidatePath("/galline");
  revalidatePath("/");
  return { ok: true };
}

export async function risolviEventoSalute(eventoId: string, animaleId: string): Promise<ActionResult> {
  const { supabase } = await requirePollaio();

  const today = todayIso();

  // Se l'evento è in home hospital e hh_a è ancora null, chiudiamo anche quello.
  const { data: evento } = await supabase
    .from("eventi_salute")
    .select("home_hospital, hh_a")
    .eq("id", eventoId)
    .maybeSingle();

  const patch: {
    stato: string;
    data_risoluzione: string;
    hh_a?: string;
  } = {
    stato: "risolto",
    data_risoluzione: new Date().toISOString(),
  };
  if (evento?.home_hospital && !evento.hh_a) {
    patch.hh_a = today;
  }

  const { error } = await supabase
    .from("eventi_salute")
    .update(patch)
    .eq("id", eventoId);

  if (error) return { ok: false, error: "Non sono riuscita a chiudere l'evento." };
  revalidatePath(`/galline/${animaleId}`);
  revalidatePath("/galline");
  revalidatePath("/");
  return { ok: true };
}

export interface AggiornaHomeHospitalInput {
  eventoId: string;
  animaleId: string;
  homeHospital: boolean;
  hhDa?: string | null;
  hhA?: string | null;
}

export async function aggiornaHomeHospital(
  input: AggiornaHomeHospitalInput,
): Promise<ActionResult> {
  const { supabase } = await requirePollaio();

  const today = todayIso();
  const { error } = await supabase
    .from("eventi_salute")
    .update({
      home_hospital: input.homeHospital,
      hh_da: input.homeHospital ? input.hhDa || today : null,
      hh_a: input.homeHospital ? input.hhA || null : null,
    })
    .eq("id", input.eventoId);

  if (error) return { ok: false, error: "Non sono riuscita ad aggiornare." };
  revalidatePath(`/galline/${input.animaleId}`);
  revalidatePath("/galline");
  revalidatePath("/");
  return { ok: true };
}

// ── TRATTAMENTI ───────────────────────────────────────────

export interface NuovoTrattamentoInput {
  animaleId: string | null;       // null = tutto il pollaio
  applicaATutti: boolean;
  data: string;                   // ISO timestamp
  tipo: string;
  prodotto: string | null;
  dose: string | null;
  note: string | null;
  prossimaData: string | null;
}

export async function aggiungiTrattamento(input: NuovoTrattamentoInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();

  const { error } = await supabase.from("trattamenti").insert({
    pollaio_id: pollaio.id,
    animale_id: input.applicaATutti ? null : input.animaleId,
    applica_a_tutti: input.applicaATutti,
    data: input.data,
    tipo: input.tipo.trim(),
    prodotto: input.prodotto?.trim() || null,
    dose: input.dose?.trim() || null,
    note: input.note?.trim() || null,
    prossima_data: input.prossimaData,
  });

  if (error) return { ok: false, error: "Non sono riuscita a registrare il trattamento." };
  if (input.animaleId) revalidatePath(`/galline/${input.animaleId}`);
  revalidatePath("/galline");
  return { ok: true };
}

export async function eliminaTrattamento(id: string, animaleId: string | null): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("trattamenti").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare il trattamento." };
  if (animaleId) revalidatePath(`/galline/${animaleId}`);
  revalidatePath("/galline");
  return { ok: true };
}

export async function gotoDetail(id: string) {
  redirect(`/galline/${id}`);
}

// ── INSERIMENTO ───────────────────────────────────────────

export type TipoEventoInserimento =
  | "quarantena_inizio"
  | "quarantena_fine"
  | "presentazione_visiva_inizio"
  | "presentazione_visiva_fine"
  | "convivenza_inizio"
  | "completato"
  | "nota";

export interface NuovoEventoInserimentoInput {
  animaleId: string;
  tipo: TipoEventoInserimento;
  data?: string;            // YYYY-MM-DD, default today
  note?: string | null;
  fotoUrl?: string | null;
}

export async function aggiungiEventoInserimento(
  input: NuovoEventoInserimentoInput,
): Promise<ActionResult> {
  const { supabase, pollaio } = await requirePollaio();

  const today = todayIso();
  const { error } = await supabase.from("eventi_inserimento").insert({
    pollaio_id: pollaio.id,
    animale_id: input.animaleId,
    tipo: input.tipo,
    data: input.data || today,
    note: input.note?.trim() || null,
    foto_url: input.fotoUrl?.trim() || null,
  });

  if (error) return { ok: false, error: "Non sono riuscita a salvare l'evento." };
  revalidatePath(`/galline/${input.animaleId}`);
  revalidatePath("/galline");
  revalidatePath("/");
  return { ok: true };
}

export async function eliminaEventoInserimento(
  id: string,
  animaleId: string,
): Promise<ActionResult> {
  const { supabase } = await requirePollaio();
  const { error } = await supabase.from("eventi_inserimento").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare l'evento." };
  revalidatePath(`/galline/${animaleId}`);
  revalidatePath("/galline");
  revalidatePath("/");
  return { ok: true };
}

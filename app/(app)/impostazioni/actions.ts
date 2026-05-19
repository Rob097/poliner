"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface PreferenzeNotificheInput {
  pushAttivo: boolean;
  emailAttivo: boolean;
  oraMeteo: string;            // HH:MM
  nonDisturbareInizio: string | null;
  nonDisturbareFine: string | null;
  categorie: Record<string, boolean>;
}

export async function aggiornaPreferenzeNotifiche(
  input: PreferenzeNotificheInput,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("preferenze_notifiche")
    .upsert(
      {
        user_id: user.id,
        push_attivo: input.pushAttivo,
        email_attivo: input.emailAttivo,
        ora_notifiche_meteo: input.oraMeteo,
        non_disturbare_inizio: input.nonDisturbareInizio,
        non_disturbare_fine: input.nonDisturbareFine,
        categorie: input.categorie,
      },
      { onConflict: "user_id" },
    );
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/impostazioni");
  return { ok: true };
}

export async function aggiornaProfilo(input: {
  displayName: string;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: input.displayName.trim() || null })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/impostazioni");
  return { ok: true };
}

export async function aggiornaPollaio(input: {
  nome: string;
  posizioneNome: string | null;
  conservazioneAmbienteGiorni: number;
  conservazioneFrigoGiorni: number;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("pollai")
    .update({
      nome: input.nome.trim(),
      posizione_nome: input.posizioneNome?.trim() || null,
      conservazione_ambiente_giorni: input.conservazioneAmbienteGiorni,
      conservazione_frigo_giorni: input.conservazioneFrigoGiorni,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/impostazioni");
  revalidatePath("/");
  return { ok: true };
}

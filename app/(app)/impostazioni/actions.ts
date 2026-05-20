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
  pollaioId: string;
  nome: string;
  posizioneNome: string | null;
  posizioneLat: number | null;
  posizioneLng: number | null;
  conservazioneAmbienteGiorni: number;
  conservazioneFrigoGiorni: number;
}): Promise<ActionResult> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, error: "Dai un nome al tuo pollaio!" };

  const posizioneNome = input.posizioneNome?.trim() || null;
  const hasOnlyOneCoord = (input.posizioneLat === null) !== (input.posizioneLng === null);
  if (hasOnlyOneCoord) {
    return { ok: false, error: "Seleziona una località valida o usa il GPS." };
  }

  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("pollaio_members")
    .select("ruolo")
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.ruolo !== "admin") {
    return { ok: false, error: "Solo gli admin possono modificare il pollaio." };
  }

  const { error } = await supabase
    .from("pollai")
    .update({
      nome,
      posizione_nome: posizioneNome,
      posizione_lat: posizioneNome ? input.posizioneLat : null,
      posizione_lng: posizioneNome ? input.posizioneLng : null,
      conservazione_ambiente_giorni: input.conservazioneAmbienteGiorni,
      conservazione_frigo_giorni: input.conservazioneFrigoGiorni,
    })
    .eq("id", input.pollaioId);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/impostazioni");
  revalidatePath("/");
  revalidatePath("/meteo");
  return { ok: true };
}

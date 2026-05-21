"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio, requireUser } from "@/lib/supabase/queries";
import { SLUG_REGEX } from "@/lib/utils/slug";

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

// ── PAGINA PUBBLICA ────────────────────────────────────────

async function requireAdmin(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof requirePollaio>>["supabase"]; pollaioId: string }
  | { ok: false; error: string }
> {
  const { supabase, pollaio, ruolo } = await requirePollaio();
  if (ruolo !== "admin") {
    return { ok: false, error: "Solo gli admin possono modificare la pagina pubblica." };
  }
  return { ok: true, supabase, pollaioId: pollaio.id };
}

async function getCurrentPublicSlug(
  supabase: Awaited<ReturnType<typeof requirePollaio>>["supabase"],
  pollaioId: string,
) {
  const { data } = await supabase
    .from("pollai")
    .select("pubblico_slug")
    .eq("id", pollaioId)
    .maybeSingle();

  return data?.pubblico_slug ?? null;
}

function getPublicSlugSaveError(
  error: { code?: string | null; message?: string | null; details?: string | null } | null,
) {
  if (!error) return null;

  if (error.code === "23505") {
    return "Questo slug è già usato, prova un altro.";
  }

  const raw = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (raw.includes("pubblico_slug") || raw.includes("pollai_pubblico_slug_key")) {
    return "Questo slug è già usato, prova un altro.";
  }

  return "Ops, riprova!";
}

export async function attivaPaginaPubblica(slug: string): Promise<ActionResult> {
  const slugClean = slug.trim().toLowerCase();
  if (!SLUG_REGEX.test(slugClean)) {
    return {
      ok: false,
      error: "Slug non valido: usa 3-40 caratteri tra a-z, 0-9 e -.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const previousSlug = await getCurrentPublicSlug(guard.supabase, guard.pollaioId);

  // Verifica unicità slug fra pollai diversi
  const { data: esistente } = await guard.supabase
    .from("pollai")
    .select("id")
    .eq("pubblico_slug", slugClean)
    .maybeSingle();
  if (esistente && esistente.id !== guard.pollaioId) {
    return { ok: false, error: "Questo slug è già usato, prova un altro." };
  }

  const { error } = await guard.supabase
    .from("pollai")
    .update({
      pubblico_slug: slugClean,
      pubblico_attivo: true,
    })
    .eq("id", guard.pollaioId);

  if (error) {
    return { ok: false, error: getPublicSlugSaveError(error) ?? "Ops, riprova!" };
  }

  revalidatePath("/impostazioni");
  revalidatePath(`/p/${slugClean}`);
  if (previousSlug && previousSlug !== slugClean) {
    revalidatePath(`/p/${previousSlug}`);
  }
  return { ok: true };
}

export async function disattivaPaginaPubblica(): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const currentSlug = await getCurrentPublicSlug(guard.supabase, guard.pollaioId);

  const { error } = await guard.supabase
    .from("pollai")
    .update({ pubblico_attivo: false })
    .eq("id", guard.pollaioId);

  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/impostazioni");
  if (currentSlug) {
    revalidatePath(`/p/${currentSlug}`);
  }
  return { ok: true };
}

export async function aggiornaDescrizionePubblica(testo: string): Promise<ActionResult> {
  const clean = testo.trim();
  if (clean.length > 500) {
    return { ok: false, error: "La descrizione può essere lunga al massimo 500 caratteri." };
  }
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const currentSlug = await getCurrentPublicSlug(guard.supabase, guard.pollaioId);

  const { error } = await guard.supabase
    .from("pollai")
    .update({ descrizione_pubblica: clean || null })
    .eq("id", guard.pollaioId);

  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/impostazioni");
  if (currentSlug) {
    revalidatePath(`/p/${currentSlug}`);
  }
  return { ok: true };
}

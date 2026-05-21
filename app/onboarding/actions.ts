"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Tipo } from "@/lib/types";

export interface OnboardingInput {
  pollaioId: string;
  pollaioNome: string;
  posizione: {
    nome: string;
    lat: number | null;
    lng: number | null;
  };
  fotoUrl: string | null;
  animale: {
    nome: string;
    tipo: Tipo;
    razzaId: string | null;
  };
}

export type OnboardingResult = ActionResult;

/**
 * Crea pollaio (con id passato dal client per coerenza con foto già uploadata)
 * e primo animale. Sull'ok ritorna senza ridirezione — il client redirige.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  // Se l'utente ha già un pollaio, non creiamo duplicati: torniamo OK e basta.
  const { data: existing } = await supabase
    .from("pollai")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const { error: pErr } = await supabase.from("pollai").insert({
    id: input.pollaioId,
    user_id: user.id,
    nome: input.pollaioNome.trim(),
    posizione_nome: input.posizione.nome.trim() || null,
    posizione_lat: input.posizione.lat,
    posizione_lng: input.posizione.lng,
    foto_url: input.fotoUrl,
  });

  if (pErr) {
    return { ok: false, error: "Ops, qualcosa non ha funzionato nel salvare il pollaio. Riprova!" };
  }

  const { error: aErr } = await supabase.from("animali").insert({
    pollaio_id: input.pollaioId,
    nome: input.animale.nome.trim(),
    tipo: input.animale.tipo,
    razza_id: input.animale.razzaId,
  });

  if (aErr) {
    // Pollaio creato ma animale no — utente potrà aggiungerlo dopo.
    revalidatePath("/", "layout");
    return { ok: true };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

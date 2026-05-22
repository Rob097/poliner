import { notFound, redirect } from "next/navigation";
import { createClient } from "./server";
import type { Database } from "./database.types";

export type Pollai = Database["public"]["Tables"]["pollai"]["Row"];
export type RuoloPollaio = "admin" | "guest";
export interface PollaioConRuolo {
  pollaio: Pollai;
  ruolo: RuoloPollaio;
}

/**
 * Restituisce l'utente corrente o redirige a /login.
 * Da usare solo in server component / route handler.
 */
export async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Restituisce il pollaio ATTIVO dell'utente, il suo ruolo, e la lista
 * di tutti i pollai a cui appartiene (per lo switcher).
 *
 * Se l'utente non ha nessun pollaio, redirige a /onboarding.
 * Se il pollaio_attivo_id su profiles non è più valido (es. è stato
 * rimosso), seleziona il primo pollaio disponibile.
 */
export async function requirePollaio() {
  const { supabase, user } = await requireUser();

  // Carica tutte le membership con i pollai joinati
  const { data: memberships } = await supabase
    .from("pollaio_members")
    .select("ruolo, pollai:pollaio_id(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  type Row = { ruolo: RuoloPollaio; pollai: Pollai };
  const rows = (memberships ?? []) as unknown as Row[];

  if (rows.length === 0) {
    redirect("/onboarding");
  }

  const pollai = rows.map((r) => r.pollai);
  const pollaiConRuolo: PollaioConRuolo[] = rows.map((r) => ({
    pollaio: r.pollai,
    ruolo: r.ruolo,
  }));

  // Pollaio attivo da profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("pollaio_attivo_id, display_name, avatar_url, email")
    .eq("id", user.id)
    .single();

  type ProfileRow = {
    pollaio_attivo_id: string | null;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  const prof = profile as ProfileRow | null;

  let attivoId = prof?.pollaio_attivo_id ?? null;
  let pollaio = pollai.find((p) => p.id === attivoId);

  if (!pollaio) {
    pollaio = pollai[0]!;
    attivoId = pollaio.id;
    await supabase.from("profiles").update({ pollaio_attivo_id: attivoId }).eq("id", user.id);
  }

  const ruolo = rows.find((r) => r.pollai.id === attivoId)?.ruolo ?? "guest";

  return { supabase, user, pollaio, ruolo, pollai, pollaiConRuolo, profile: prof };
}

/**
 * Variante di requirePollaio() che blocca i guest: se il ruolo nel pollaio
 * attivo non è 'admin' chiama notFound(). Da usare in page server component
 * e in server actions di mutazione admin-only.
 */
export async function requireAdminPollaio() {
  const ctx = await requirePollaio();
  if (ctx.ruolo !== "admin") notFound();
  return ctx;
}

import { redirect } from "next/navigation";
import { createClient } from "./server";

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
 * Restituisce il pollaio corrente dell'utente. Se non ne ha, redirige a /onboarding.
 */
export async function requirePollaio() {
  const { supabase, user } = await requireUser();
  const { data: pollaio } = await supabase
    .from("pollai")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!pollaio) redirect("/onboarding");
  return { supabase, user, pollaio };
}

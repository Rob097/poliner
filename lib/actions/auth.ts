"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Esegue il logout dell'utente corrente e redirige a /login.
 * Da chiamare dai client component (es. pulsante "Esci dall'account").
 */
export async function signOutAction(): Promise<never> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

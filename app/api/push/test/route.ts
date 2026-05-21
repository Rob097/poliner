import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";

/**
 * Endpoint di test: invia una notifica push a tutti gli endpoint dell'utente.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  const result = await sendPushToUser(user.id, {
    title: "🐔 Poliner",
    body: "Notifica di test — le push funzionano!",
    url: "/",
  });

  if (result.totali === 0) {
    return NextResponse.json({ ok: false, error: "Nessuna sottoscrizione" });
  }

  return NextResponse.json({
    ok: true,
    inviate: result.inviate,
    totali: result.totali,
  });
}

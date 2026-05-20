import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint di test: invia una notifica push a tutti gli endpoint dell'utente.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@rdlabs.digital";
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { ok: false, error: "VAPID keys non configurate" },
      { status: 500 },
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, error: "Nessuna sottoscrizione" });
  }

  const payload = JSON.stringify({
    title: "🐔 Poliner",
    body: "Notifica di test — le push funzionano!",
    icon: "/icons/icon-192.png",
    url: "/",
  });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ),
    ),
  );

  // Cleanup: rimuovi le subscription scadute (410 Gone, 404)
  const dead: string[] = [];
  results.forEach((r, i) => {
    if (
      r.status === "rejected" &&
      (r.reason as { statusCode?: number })?.statusCode &&
      [404, 410].includes((r.reason as { statusCode: number }).statusCode)
    ) {
      dead.push(subs[i].endpoint);
    }
  });
  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }

  const inviate = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, inviate, totali: subs.length });
}

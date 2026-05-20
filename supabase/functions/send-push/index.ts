// Edge Function: invia una notifica push a tutte le subscription di un utente.
// Riceve { userId, payload: { title, body, icon, url, tag } }

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@rdlabs.digital";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  try {
    const { userId, payload } = (await req.json()) as {
      userId: string;
      payload: PushPayload;
    };

    if (!userId || !payload?.title) {
      return new Response(
        JSON.stringify({ ok: false, error: "userId e payload.title obbligatori" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, inviate: 0, totali: 0 }), {
        headers: { "content-type": "application/json" },
      });
    }

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body ?? "",
      icon: payload.icon ?? "/icons/icon-192.png",
      url: payload.url ?? "/",
      tag: payload.tag,
    });

    const dead: string[] = [];
    let inviate = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
        inviate++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          dead.push(s.endpoint);
        } else {
          console.error("Push error", s.endpoint, e);
        }
      }
    }

    if (dead.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", dead);
    }

    return new Response(
      JSON.stringify({ ok: true, inviate, totali: subs.length, rimosse: dead.length }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});

import "server-only";
/**
 * Helper push server-side: invia notifiche web push direttamente
 * dal backend Next.js (senza passare per l'edge function).
 *
 * Usato dai server action che devono dispatchare notifiche immediate
 * (es. nuova richiesta uova → notifica agli admin).
 *
 * Richiede VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT nelle env.
 */

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:info@rdlabs.digital";

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
  return true;
}

const PUSH_REQUEST_OPTIONS = {
  TTL: 60 * 60,
  urgency: "high" as const,
};

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

/**
 * Invia una push a tutte le subscription dell'utente.
 * Rimuove le subscription scadute (404/410).
 * Usa un client admin (service role) per scrivere su push_subscriptions
 * indipendentemente dal contesto chiamante.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ inviate: number; totali: number; rimosse: number }> {
  if (!ensureVapid()) {
    return { inviate: 0, totali: 0, rimosse: 0 };
  }

  const admin = createAdminClient();
  type Sub = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const list = (subs ?? []) as unknown as Sub[];
  if (list.length === 0) return { inviate: 0, totali: 0, rimosse: 0 };

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    icon: "/icons/icon-192.png",
    url: payload.url ?? "/",
    tag: payload.tag,
  });

  const dead: string[] = [];
  let inviate = 0;
  for (const s of list) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        data,
        PUSH_REQUEST_OPTIONS,
      );
      inviate++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        dead.push(s.endpoint);
      } else {
        console.error("push error", s.endpoint, e);
      }
    }
  }

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return { inviate, totali: list.length, rimosse: dead.length };
}

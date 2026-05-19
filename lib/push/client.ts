"use client";

/**
 * Logica client-side per Web Push Notifications.
 */

export type PushStatus =
  | "unsupported"
  | "denied"
  | "default"
  | "granted"
  | "subscribed";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationStatus(): PushStatus {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushStatus;
}

/**
 * Converte la VAPID public key (base64url) in Uint8Array.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Richiede il permesso (se necessario) e si iscrive al push manager.
 * Salva la subscription via API.
 */
export async function enablePushNotifications(
  vapidPublicKey: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "Il browser non supporta le notifiche push" };
  }
  if (!vapidPublicKey) {
    return { ok: false, error: "VAPID public key non configurata" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Permesso negato" };
    }

    const registration = await navigator.serviceWorker.ready;

    // Se esiste già una subscription, ricicliamo
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const json = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: "Errore nel salvare la sottoscrizione" };
    }
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: (e as Error).message };
  }
}

export async function disablePushNotifications(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isPushSupported()) return { ok: true };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true };

    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: (e as Error).message };
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

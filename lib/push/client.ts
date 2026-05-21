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

const PUSH_SERVICE_WORKER_URL = "/sw.js";
const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000;
const SERVICE_WORKER_POLL_INTERVAL_MS = 150;

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.isSecureContext &&
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

async function waitForServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  return await new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Service worker non pronto: ricarica la pagina e riprova"));
    }, SERVICE_WORKER_READY_TIMEOUT_MS);

    navigator.serviceWorker.ready
      .then((registration) => {
        window.clearTimeout(timeoutId);
        resolve(registration);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function isPushWorker(worker: ServiceWorker | null | undefined): boolean {
  return worker?.scriptURL?.endsWith(PUSH_SERVICE_WORKER_URL) ?? false;
}

function isPushRegistration(
  registration: ServiceWorkerRegistration | null | undefined,
): registration is ServiceWorkerRegistration {
  if (!registration) return false;
  return (
    isPushWorker(registration.active) ||
    isPushWorker(registration.waiting) ||
    isPushWorker(registration.installing)
  );
}

async function getExistingRegistration(): Promise<ServiceWorkerRegistration | null> {
  const directRegistration =
    (await navigator.serviceWorker.getRegistration(PUSH_SERVICE_WORKER_URL)) ??
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration()) ??
    null;

  if (isPushRegistration(directRegistration)) return directRegistration;

  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.find((registration) => isPushRegistration(registration)) ?? null;
}

async function waitForActivePushRegistration(): Promise<ServiceWorkerRegistration> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SERVICE_WORKER_READY_TIMEOUT_MS) {
    const registration = await getExistingRegistration();
    if (registration?.active) return registration;

    await new Promise((resolve) => {
      window.setTimeout(resolve, SERVICE_WORKER_POLL_INTERVAL_MS);
    });
  }

  try {
    return await waitForServiceWorkerReady();
  } catch {
    throw new Error("Service worker non pronto: ricarica la pagina e riprova");
  }
}

async function getOrCreatePushRegistration(): Promise<ServiceWorkerRegistration> {
  const existingRegistration = await getExistingRegistration();
  if (existingRegistration?.active) return existingRegistration;

  if (!existingRegistration) {
    await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, { scope: "/" });
  }

  return await waitForActivePushRegistration();
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
  if (Notification.permission === "denied") {
    return {
      ok: false,
      error: "Permesso notifiche negato nelle impostazioni del browser",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Permesso negato" };
    }

    const registration = await getOrCreatePushRegistration();

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
    const registration = await getExistingRegistration();
    if (!registration) return { ok: true };
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
  const registration = await getExistingRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

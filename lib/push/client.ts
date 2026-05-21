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

const PUSH_SERVICE_WORKER_URL = "/push-sw.js";
const PUSH_SERVICE_WORKER_SCOPE = "/push-notifications/";
const APP_PUSH_SERVICE_WORKER_URL = "/sw.js";
const SERVICE_WORKER_READY_TIMEOUT_MS = 30_000;
const SERVICE_WORKER_POLL_INTERVAL_MS = 150;
const SERVICE_WORKER_READY_ERROR =
  "Service worker non ancora pronto: il primo avvio puo richiedere fino a 30 secondi. Riprova tra poco";
let pushRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

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

function isWorkerScriptUrl(
  worker: ServiceWorker | null | undefined,
  serviceWorkerUrl: string,
): boolean {
  return worker?.scriptURL?.endsWith(serviceWorkerUrl) ?? false;
}

function isPreferredPushWorker(worker: ServiceWorker | null | undefined): boolean {
  return isWorkerScriptUrl(worker, PUSH_SERVICE_WORKER_URL);
}

function isKnownPushWorker(worker: ServiceWorker | null | undefined): boolean {
  return (
    isWorkerScriptUrl(worker, PUSH_SERVICE_WORKER_URL) ||
    isWorkerScriptUrl(worker, APP_PUSH_SERVICE_WORKER_URL)
  );
}

function isAppPushWorker(worker: ServiceWorker | null | undefined): boolean {
  return isWorkerScriptUrl(worker, APP_PUSH_SERVICE_WORKER_URL);
}

function isPreferredPushRegistration(
  registration: ServiceWorkerRegistration | null | undefined,
): registration is ServiceWorkerRegistration {
  if (!registration) return false;
  return (
    isPreferredPushWorker(registration.active) ||
    isPreferredPushWorker(registration.waiting) ||
    isPreferredPushWorker(registration.installing)
  );
}

function isKnownPushRegistration(
  registration: ServiceWorkerRegistration | null | undefined,
): registration is ServiceWorkerRegistration {
  if (!registration) return false;
  return (
    isKnownPushWorker(registration.active) ||
    isKnownPushWorker(registration.waiting) ||
    isKnownPushWorker(registration.installing)
  );
}

function isAppPushRegistration(
  registration: ServiceWorkerRegistration | null | undefined,
): registration is ServiceWorkerRegistration {
  if (!registration) return false;
  return (
    isAppPushWorker(registration.active) ||
    isAppPushWorker(registration.waiting) ||
    isAppPushWorker(registration.installing)
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function getPreferredPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  const scopedRegistration =
    (await navigator.serviceWorker.getRegistration(PUSH_SERVICE_WORKER_SCOPE)) ?? null;

  if (isPreferredPushRegistration(scopedRegistration)) return scopedRegistration;

  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.find((registration) => isPreferredPushRegistration(registration)) ?? null;
}

async function getAppPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  const rootRegistration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration()) ??
    null;

  if (isAppPushRegistration(rootRegistration)) return rootRegistration;

  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.find((registration) => isAppPushRegistration(registration)) ?? null;
}

async function getKnownPushRegistrations(): Promise<ServiceWorkerRegistration[]> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.filter((registration) => isKnownPushRegistration(registration));
}

async function waitForActivePushRegistration(
  initialRegistration?: ServiceWorkerRegistration | null,
): Promise<ServiceWorkerRegistration> {
  const startedAt = Date.now();
  let currentRegistration = initialRegistration ?? null;

  while (Date.now() - startedAt < SERVICE_WORKER_READY_TIMEOUT_MS) {
    if (currentRegistration?.active && isPreferredPushWorker(currentRegistration.active)) {
      return currentRegistration;
    }

    const latestRegistration = await getPreferredPushRegistration();
    if (latestRegistration) {
      currentRegistration = latestRegistration;
      if (latestRegistration.active && isPreferredPushWorker(latestRegistration.active)) {
        return latestRegistration;
      }
    }

    await wait(SERVICE_WORKER_POLL_INTERVAL_MS);
  }

  throw new Error(SERVICE_WORKER_READY_ERROR);
}

async function getOrCreatePushRegistration(): Promise<ServiceWorkerRegistration> {
  const existingRegistration = await getPreferredPushRegistration();
  if (existingRegistration?.active && isPreferredPushWorker(existingRegistration.active)) {
    return existingRegistration;
  }

  const registration =
    existingRegistration ??
    (await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, {
      scope: PUSH_SERVICE_WORKER_SCOPE,
      updateViaCache: "none",
    }));

  return await waitForActivePushRegistration(registration);
}

async function unsubscribeAndForgetPushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch {
    // Continuiamo comunque con l'unsubscribe locale.
  }

  await subscription.unsubscribe();
}

async function savePushSubscription(subscription: PushSubscription): Promise<void> {
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
    throw new Error("Errore nel salvare la sottoscrizione");
  }
}

async function ensureRegistrationSubscription(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> {
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  await savePushSubscription(subscription);
  return subscription;
}

export async function migratePushSubscriptionToAppWorker(
  vapidPublicKey: string,
): Promise<void> {
  if (!isPushSupported() || !vapidPublicKey || Notification.permission !== "granted") {
    return;
  }

  const appRegistration = await getAppPushRegistration();
  if (!appRegistration) return;

  const appSubscription = await ensureRegistrationSubscription(appRegistration, vapidPublicKey);
  const preferredRegistration = await getPreferredPushRegistration();
  if (!preferredRegistration) return;

  const preferredSubscription = await preferredRegistration.pushManager.getSubscription();
  if (!preferredSubscription) return;
  if (preferredSubscription.endpoint === appSubscription.endpoint) return;

  await unsubscribeAndForgetPushSubscription(preferredSubscription);
}

export async function ensurePushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  if (!pushRegistrationPromise) {
    pushRegistrationPromise = getOrCreatePushRegistration().catch((error) => {
      pushRegistrationPromise = null;
      throw error;
    });
  }

  return await pushRegistrationPromise;
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

    const registration = await ensurePushServiceWorker();
    if (!registration) {
      return { ok: false, error: "Service worker non disponibile" };
    }

    await ensureRegistrationSubscription(registration, vapidPublicKey);

    migratePushSubscriptionToAppWorker(vapidPublicKey).catch((error) => {
      console.warn("migratePushSubscriptionToAppWorker", error);
    });

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
    const registrations = await getKnownPushRegistrations();
    for (const registration of registrations) {
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) continue;

      await unsubscribeAndForgetPushSubscription(subscription);
    }

    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: (e as Error).message };
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registrations = await getKnownPushRegistrations();

  for (const registration of registrations) {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) return true;
  }

  return false;
}

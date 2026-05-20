// Cron Edge Function: scansiona promemoria, uova in scadenza, manutenzione,
// trattamenti, scorte basse — invia notifiche push e/o email secondo le preferenze.
// Schedulare via pg_cron (vedi migration 0005_pg_cron).
//
// Multi-tenancy: per ogni pollaio recupera tutti gli admin via
// pollaio_members e dispatcha la notifica a ognuno (con dedup per user).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { trovaRazza } from "../../../lib/data/razze.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET_KEYS = (Deno.env.get("SUPABASE_SECRET_KEYS") ?? "")
  .split(",")
  .map((value: string) => value.trim())
  .filter(Boolean);
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@rdlabs.digital";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Poliner <info@rdlabs.digital>";
const ACCEPTED_FUNCTION_KEYS = [...new Set([...SECRET_KEYS, SERVICE_ROLE].filter(Boolean))];
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const ITALY_TIME_ZONE = "Europe/Rome";
const HOURLY_SWEEP_MINUTE = "05";
const FINE_PRODUZIONE_WARNING_DAYS = 30;
const MUTA_LUNGA_GIORNI = 70;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface UserBase {
  userId: string;
  email: string | null;
  pushAttivo: boolean;
  emailAttivo: boolean;
  categorie: Record<string, boolean>;
  globaleAttivo: boolean;
  oraMeteo: string;
}

interface NotificaInput extends UserBase {
  category: string;
  riferimentoId: string;
  push: { title: string; body: string; url?: string; tag?: string };
  emailSubject: string;
  emailBody: string;
}

function getIncomingSecret(req: Request): string {
  const apiKey = (req.headers.get("apikey") ?? "").trim();
  if (apiKey) return apiKey;

  const auth = req.headers.get("authorization") ?? "";
  return auth.replace(/^Bearer\s+/i, "").trim();
}

function shouldSendReminderPush(channel: string | null | undefined): boolean {
  return !channel || channel === "push" || channel === "entrambi";
}

function shouldSendReminderEmail(channel: string | null | undefined): boolean {
  return channel === "email" || channel === "entrambi";
}

function getTimePartsInZone(
  date: Date,
  timeZone: string,
): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: values.get("year") ?? "0000",
    month: values.get("month") ?? "01",
    day: values.get("day") ?? "01",
    hour: values.get("hour") ?? "00",
    minute: values.get("minute") ?? "00",
  };
}

function getItalyDateKey(date: Date): string {
  const parts = getTimePartsInZone(date, ITALY_TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getItalyTimeKey(date: Date): string {
  const parts = getTimePartsInZone(date, ITALY_TIME_ZONE);
  return `${parts.hour}:${parts.minute}`;
}

function normalizeTimeKey(timeValue: string | null | undefined): string {
  if (!timeValue) return "20:00";
  return timeValue.slice(0, 5);
}

function parseDateOnly(dateValue: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateValue.split("-").map(Number);
  return { year, month, day };
}

function daysBetweenDateOnly(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endUtc - startUtc) / 86400000);
}

function addMonthsToDateOnly(dateValue: string, months: number): string {
  const base = parseDateOnly(dateValue);
  const threshold = new Date(Date.UTC(base.year, base.month - 1, base.day, 12));
  threshold.setUTCMonth(threshold.getUTCMonth() + months);
  return threshold.toISOString().slice(0, 10);
}

function getAgeInMonths(
  dataNascita: string | null,
  etaApprossimativaMesi: number | null,
  todayKey: string,
): number | null {
  if (!dataNascita) return etaApprossimativaMesi;

  const nascita = parseDateOnly(dataNascita);
  const oggi = parseDateOnly(todayKey);
  let months = (oggi.year - nascita.year) * 12 + (oggi.month - nascita.month);
  if (oggi.day < nascita.day) months -= 1;
  return Math.max(0, months);
}

interface WeatherNotification {
  forecastDate: string;
  body: string;
  emailBody: string;
}

async function buildTomorrowWeatherNotification(
  lat: number,
  lng: number,
  pollaioNome: string,
): Promise<WeatherNotification | null> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
  );
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", ITALY_TIME_ZONE);
  url.searchParams.set("wind_speed_unit", "kmh");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const json = await res.json();
    const forecastDate = json.daily?.time?.[1] as string | undefined;
    if (!forecastDate) return null;

    const weatherCode = Number(json.daily?.weather_code?.[1] ?? -1);
    const tempMax = Number(json.daily?.temperature_2m_max?.[1] ?? NaN);
    const tempMin = Number(json.daily?.temperature_2m_min?.[1] ?? NaN);
    const precipitation = Number(json.daily?.precipitation_sum?.[1] ?? 0);
    const windMax = Number(json.daily?.wind_speed_10m_max?.[1] ?? 0);

    let body: string | null = null;
    if (weatherCode >= 95 || (weatherCode >= 82 && weatherCode <= 86)) {
      body = "⛈️ Attenzione! Temporale previsto domani — metti al riparo le galline per tempo";
    } else if (tempMax > 35) {
      body = "🌡️ Domani fa molto caldo — assicurati che le galline abbiano acqua fresca!";
    } else if (tempMin < 0) {
      body = "🥶 Domani si gela — controlla il ricovero notturno delle galline";
    } else if (windMax > 40) {
      body = "💨 Domani c'è molto vento — controlla che il pollaio sia ben chiuso";
    } else if (precipitation > 5) {
      body = "🌧️ Domani pioverà — ricordati di controllare che le galline abbiano riparo!";
    } else if (weatherCode <= 1 && tempMax >= 18 && tempMax <= 28) {
      body = "☀️ Domani splende il sole — giornata perfetta per far uscire le galline!";
    }

    if (!body) return null;

    return {
      forecastDate,
      body,
      emailBody: `${body}\n\nPrevisione riferita al pollaio "${pollaioNome}".`,
    };
  } catch (error) {
    console.error("Weather notification error", error);
    return null;
  }
}

async function alreadySent(
  supabase: SupabaseClient,
  userId: string,
  category: string,
  refId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("notifiche_inviate")
    .select("id")
    .eq("user_id", userId)
    .eq("categoria", category)
    .eq("riferimento_id", refId)
    .maybeSingle();
  return !!data;
}

async function markSent(
  supabase: SupabaseClient,
  userId: string,
  category: string,
  refId: string,
) {
  await supabase.from("notifiche_inviate").insert({
    user_id: userId,
    categoria: category,
    riferimento_id: refId,
  });
}

async function sendPush(
  supabase: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<number> {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return 0;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/icon-192.png",
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
      if (status === 404 || status === 410) dead.push(s.endpoint);
    }
  }
  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return inviate;
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const html = `<!doctype html><html lang="it"><body style="margin:0;padding:0;background:#FAF8F6;font-family:'Nunito',Arial,sans-serif;color:#2E2924"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #F0EDE8"><tr><td style="background:#E8678A;padding:18px 24px;color:#fff;font-size:20px;font-weight:700;font-family:'Lora',Georgia,serif">🐔 Poliner</td></tr><tr><td style="padding:24px;font-size:15px;line-height:1.6">${body.replace(/\n/g, "<br>")}</td></tr><tr><td style="padding:16px 24px;background:#FFF0F3;color:#9E968C;font-size:12px;text-align:center">Ricevi questa mail perché hai un account su Poliner.<br>Puoi modificare le preferenze dalle impostazioni dell'app.</td></tr></table></td></tr></table></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    return res.ok;
  } catch (e) {
    console.error("Email error", e);
    return false;
  }
}

async function dispatchNotifica(
  supabase: SupabaseClient,
  n: NotificaInput,
): Promise<{ push: boolean; email: boolean }> {
  if (!n.globaleAttivo) return { push: false, email: false };
  if (n.categorie[n.category] === false) return { push: false, email: false };

  if (await alreadySent(supabase, n.userId, n.category, n.riferimentoId)) {
    return { push: false, email: false };
  }

  let pushOk = false;
  let emailOk = false;

  if (n.pushAttivo) {
    const inviate = await sendPush(supabase, n.userId, n.push);
    pushOk = inviate > 0;
  }
  if (n.emailAttivo && n.email) {
    emailOk = await sendEmail(n.email, n.emailSubject, n.emailBody);
  }

  if (pushOk || emailOk) {
    await markSent(supabase, n.userId, n.category, n.riferimentoId);
  }
  return { push: pushOk, email: emailOk };
}

async function loadUserBase(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserBase | null> {
  const [profileRes, prefRes] = await Promise.all([
    supabase.from("profiles").select("email").eq("id", userId).maybeSingle(),
    supabase
      .from("preferenze_notifiche")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const pref = prefRes.data ?? {
    globale_attivo: true,
    push_attivo: true,
    email_attivo: false,
    categorie: {},
  };
  return {
    userId,
    email: profileRes.data?.email ?? null,
    pushAttivo: pref.push_attivo,
    emailAttivo: pref.email_attivo,
    categorie: (pref.categorie as Record<string, boolean>) ?? {},
    globaleAttivo: pref.globale_attivo,
    oraMeteo: normalizeTimeKey(pref.ora_notifiche_meteo),
  };
}

// ── MAIN ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Auth: chiamabile solo con la service-role key nell'header
  const incomingSecret = getIncomingSecret(req);
  if (!incomingSecret || !ACCEPTED_FUNCTION_KEYS.includes(incomingSecret)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const today = getItalyDateKey(now);
  const currentTime = getItalyTimeKey(now);
  const shouldRunHourlySweep = currentTime.endsWith(`:${HOURLY_SWEEP_MINUTE}`);

  const { data: pollai } = await supabase
    .from("pollai")
    .select(
      "id, nome, posizione_lat, posizione_lng, conservazione_ambiente_giorni, conservazione_frigo_giorni",
    );
  if (!pollai) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  const stats = {
    promemoria: 0,
    meteo: 0,
    uova_scadenza: 0,
    manutenzione: 0,
    trattamenti: 0,
    scorte: 0,
    fine_produzione: 0,
    muta_lunga: 0,
  };

  for (const p of pollai) {
    // Trova tutti gli admin del pollaio (li avvisiamo tutti)
    const { data: members } = await supabase
      .from("pollaio_members")
      .select("user_id")
      .eq("pollaio_id", p.id)
      .eq("ruolo", "admin");
    const adminIds = (members ?? []).map((m: { user_id: string }) => m.user_id as string);
    if (adminIds.length === 0) continue;

    const adminBases: UserBase[] = [];
    for (const id of adminIds) {
      const ub = await loadUserBase(supabase, id);
      if (ub) adminBases.push(ub);
    }

    const shouldRunWeather =
      p.posizione_lat !== null &&
      p.posizione_lng !== null &&
      adminBases.some(
        (ub) =>
          ub.oraMeteo === currentTime &&
          ub.globaleAttivo &&
          ub.pushAttivo &&
          ub.categorie.meteo !== false,
      );

    // ─── 1. PROMEMORIA ───
    const { data: promemoria } = await supabase
      .from("note")
      .select("id, testo, promemoria_data, promemoria_canale")
      .eq("pollaio_id", p.id)
      .eq("archiviata", false)
      .eq("promemoria_inviato", false)
      .not("promemoria_data", "is", null)
      .lte("promemoria_data", now.toISOString());

    for (const pr of promemoria ?? []) {
      let anyDispatched = false;
      const allowPush = shouldSendReminderPush(pr.promemoria_canale);
      const allowEmail = shouldSendReminderEmail(pr.promemoria_canale);

      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          pushAttivo: ub.pushAttivo && allowPush,
          emailAttivo: ub.emailAttivo && allowEmail,
          category: "promemoria",
          riferimentoId: pr.id,
          push: { title: "🔔 Promemoria", body: pr.testo, url: "/note", tag: `prom-${pr.id}` },
          emailSubject: "🔔 Promemoria · Poliner",
          emailBody: pr.testo,
        });
        if (push || email) anyDispatched = true;
      }
      if (anyDispatched) {
        await supabase.from("note").update({ promemoria_inviato: true }).eq("id", pr.id);
        stats.promemoria++;
      }
    }

    if (shouldRunWeather) {
      const weatherNotification = await buildTomorrowWeatherNotification(
        Number(p.posizione_lat),
        Number(p.posizione_lng),
        p.nome,
      );

      if (weatherNotification) {
        for (const ub of adminBases) {
          if (ub.oraMeteo !== currentTime) continue;

          const { push, email } = await dispatchNotifica(supabase, {
            ...ub,
            emailAttivo: false,
            category: "meteo",
            riferimentoId: `${p.id}-${weatherNotification.forecastDate}`,
            push: {
              title: "⛅ Meteo di domani",
              body: weatherNotification.body,
              url: "/meteo",
              tag: `meteo-${weatherNotification.forecastDate}`,
            },
            emailSubject: "⛅ Meteo di domani · Poliner",
            emailBody: weatherNotification.emailBody,
          });
          if (push || email) stats.meteo++;
        }
      }
    }

    if (!shouldRunHourlySweep) {
      continue;
    }

    // ─── 2. UOVA IN SCADENZA ───
    const { data: uova } = await supabase
      .from("uova")
      .select("id, data_deposizione, conservazione")
      .eq("pollaio_id", p.id)
      .eq("stato", "disponibile");
    const ambGg = p.conservazione_ambiente_giorni;
    const frigoGg = p.conservazione_frigo_giorni;
    let uovaScadIn5 = 0;
    let uovaScadIn2 = 0;
    for (const u of uova ?? []) {
      const dep = new Date(u.data_deposizione);
      const maxGg = u.conservazione === "frigo" ? frigoGg : ambGg;
      const scad = new Date(dep.getTime() + maxGg * 86400000);
      const rim = Math.ceil((scad.getTime() - now.getTime()) / 86400000);
      if (rim === 5) uovaScadIn5++;
      else if (rim === 2) uovaScadIn2++;
    }
    if (uovaScadIn5 > 0) {
      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          category: "uova_scadenza",
          riferimentoId: `${p.id}-5gg-${today}`,
          push: {
            title: "⚠️ Uova in scadenza",
            body: `${uovaScadIn5} uova scadono tra 5 giorni — usale o regalale!`,
            url: "/uova",
            tag: "uova-5gg",
          },
          emailSubject: "⚠️ Hai uova in scadenza",
          emailBody: `Hai ${uovaScadIn5} uova nel pollaio "${p.nome}" che scadranno tra 5 giorni. Puoi usarle in cucina o regalarle.`,
        });
        if (push || email) stats.uova_scadenza++;
      }
    }
    if (uovaScadIn2 > 0) {
      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          category: "uova_scadenza",
          riferimentoId: `${p.id}-2gg-${today}`,
          push: {
            title: "🚨 Uova in scadenza dopodomani",
            body: `${uovaScadIn2} uova scadono in 2 giorni!`,
            url: "/uova",
            tag: "uova-2gg",
          },
          emailSubject: "🚨 Uova in scadenza dopodomani",
          emailBody: `Hai ${uovaScadIn2} uova nel pollaio "${p.nome}" che scadranno tra 2 giorni. Sbrigati!`,
        });
        if (push || email) stats.uova_scadenza++;
      }
    }

    // ─── 3. MANUTENZIONE (voci dinamiche) ───
    const { data: voci } = await supabase
      .from("manutenzioni_voci")
      .select("id, nome, icona, frequenza_giorni")
      .eq("pollaio_id", p.id)
      .eq("attivo", true);
    const { data: manut } = await supabase
      .from("manutenzioni")
      .select("voce_id, data")
      .eq("pollaio_id", p.id)
      .order("data", { ascending: false });
    const ultimoMap = new Map<string, string>();
    for (const m of manut ?? []) {
      if (!ultimoMap.has(m.voce_id as string)) {
        ultimoMap.set(m.voce_id as string, m.data as string);
      }
    }
    for (const voce of voci ?? []) {
      const ultimo = ultimoMap.get(voce.id as string);
      if (!ultimo) continue; // mai fatta → nessuna notifica
      const giorni = Math.floor((now.getTime() - new Date(ultimo).getTime()) / 86400000);
      const rim = (voce.frequenza_giorni as number) - giorni;
      if (rim < 0) {
        for (const ub of adminBases) {
          const { push, email } = await dispatchNotifica(supabase, {
            ...ub,
            category: "manutenzione",
            riferimentoId: `${voce.id}-scaduta-${today}`,
            push: {
              title: "⚠️ Manutenzione in ritardo",
              body: `${voce.nome}: ${Math.abs(rim)} giorni di ritardo`,
              url: "/manutenzione",
              tag: `manut-${voce.id}`,
            },
            emailSubject: `⚠️ ${voce.nome} in ritardo`,
            emailBody: `La manutenzione "${voce.nome}" del pollaio "${p.nome}" è in ritardo di ${Math.abs(rim)} giorni.`,
          });
          if (push || email) stats.manutenzione++;
        }
      } else if (rim === 1) {
        for (const ub of adminBases) {
          const { push, email } = await dispatchNotifica(supabase, {
            ...ub,
            category: "manutenzione",
            riferimentoId: `${voce.id}-domani-${today}`,
            push: {
              title: "🔔 Manutenzione domani",
              body: `Domani tocca: ${voce.nome}`,
              url: "/manutenzione",
              tag: `manut-${voce.id}-1d`,
            },
            emailSubject: "🔔 Manutenzione domani",
            emailBody: `Promemoria: domani tocca "${voce.nome}" per il pollaio "${p.nome}".`,
          });
          if (push || email) stats.manutenzione++;
        }
      }
    }

    // ─── 4. TRATTAMENTI ───
    const tra3gg = new Date(now.getTime() + 3 * 86400000).toISOString();
    const { data: trattamenti } = await supabase
      .from("trattamenti")
      .select("id, tipo, prossima_data, animale_id")
      .eq("pollaio_id", p.id)
      .eq("notifica_inviata", false)
      .not("prossima_data", "is", null)
      .lte("prossima_data", tra3gg);
    for (const t of trattamenti ?? []) {
      if (!t.prossima_data) continue;
      let anyDispatched = false;
      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          category: "trattamenti",
          riferimentoId: t.id,
          push: {
            title: "💊 Trattamento in arrivo",
            body: `${t.tipo} — entro 3 giorni`,
            url: t.animale_id ? `/galline/${t.animale_id}` : "/galline",
            tag: `tratt-${t.id}`,
          },
          emailSubject: `💊 ${t.tipo} in arrivo`,
          emailBody: `Il trattamento "${t.tipo}" del pollaio "${p.nome}" è previsto per il ${new Date(
            t.prossima_data,
          ).toLocaleDateString("it-IT")}.`,
        });
        if (push || email) anyDispatched = true;
      }
      if (anyDispatched) {
        await supabase.from("trattamenti").update({ notifica_inviata: true }).eq("id", t.id);
        stats.trattamenti++;
      }
    }

    // ─── 5. SCORTE BASSE ───
    const { data: scorte } = await supabase
      .from("scorte_cibo")
      .select("id, nome, quantita, soglia_avviso")
      .eq("pollaio_id", p.id)
      .not("quantita", "is", null)
      .not("soglia_avviso", "is", null);
    for (const s of scorte ?? []) {
      if (s.quantita === null || s.soglia_avviso === null) continue;
      if (Number(s.quantita) > Number(s.soglia_avviso)) continue;
      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          category: "scorte",
          riferimentoId: `${s.id}-${today}`,
          push: {
            title: "📦 Scorta bassa",
            body: `${s.nome} sta finendo — aggiungila alla lista della spesa`,
            url: "/scorte",
            tag: `scorta-${s.id}`,
          },
          emailSubject: `📦 ${s.nome} sta finendo`,
          emailBody: `La scorta di "${s.nome}" è scesa sotto la soglia di avviso. Quantità attuale: ${s.quantita}.`,
        });
        if (push || email) stats.scorte++;
      }
    }

    const { data: animali } = await supabase
      .from("animali")
      .select("id, nome, tipo, razza_id, data_nascita, eta_approssimativa_mesi")
      .eq("pollaio_id", p.id)
      .eq("attivo", true)
      .eq("tipo", "gallina");

    const animaleNomeMap = new Map<string, string>();
    for (const animale of animali ?? []) {
      animaleNomeMap.set(animale.id, animale.nome);

      const fineProduzioneMesi = trovaRazza(animale.razza_id)?.fineProduzioneMesi ?? 36;
      const etaMesi = getAgeInMonths(
        animale.data_nascita,
        animale.eta_approssimativa_mesi,
        today,
      );
      if (etaMesi === null) continue;

      let riferimentoId: string | null = null;
      let pushBody: string | null = null;

      if (animale.data_nascita) {
        const sogliaData = addMonthsToDateOnly(animale.data_nascita, fineProduzioneMesi);
        const giorniAllaSoglia = daysBetweenDateOnly(today, sogliaData);
        if (giorniAllaSoglia < 0 || giorniAllaSoglia > FINE_PRODUZIONE_WARNING_DAYS) {
          continue;
        }

        riferimentoId = `${animale.id}-${sogliaData}`;
        pushBody =
          giorniAllaSoglia === 0
            ? `${animale.nome} raggiunge oggi la soglia di fine produzione.`
            : `${animale.nome} si avvicina alla fine della vita produttiva (${giorniAllaSoglia} giorni).`;
      } else {
        const mesiRimanenti = fineProduzioneMesi - etaMesi;
        if (mesiRimanenti < 0 || mesiRimanenti > 1) continue;

        riferimentoId = `${animale.id}-approx-${fineProduzioneMesi}`;
        pushBody =
          mesiRimanenti === 0
            ? `${animale.nome} e ormai oltre il picco produttivo.`
            : `${animale.nome} si avvicina alla fine della vita produttiva.`;
      }

      if (!riferimentoId || !pushBody) continue;

      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          emailAttivo: false,
          category: "fine_produzione",
          riferimentoId,
          push: {
            title: "🐔 Fine produzione in arrivo",
            body: pushBody,
            url: "/galline",
            tag: `fine-prod-${animale.id}`,
          },
          emailSubject: "🐔 Fine produzione in arrivo · Poliner",
          emailBody: `${pushBody}\n\nControlla la scheda di ${animale.nome} per i dettagli.`,
        });
        if (push || email) stats.fine_produzione++;
      }
    }

    const { data: muteAperte } = await supabase
      .from("periodi_muta")
      .select("animale_id, data_inizio")
      .eq("pollaio_id", p.id)
      .is("data_fine", null);

    for (const muta of muteAperte ?? []) {
      const giorniInMuta = daysBetweenDateOnly(muta.data_inizio, today);
      if (giorniInMuta < MUTA_LUNGA_GIORNI) continue;

      const nomeAnimale = animaleNomeMap.get(muta.animale_id) ?? "Una gallina";
      for (const ub of adminBases) {
        const { push, email } = await dispatchNotifica(supabase, {
          ...ub,
          emailAttivo: false,
          category: "muta_lunga",
          riferimentoId: `${muta.animale_id}-${muta.data_inizio}`,
          push: {
            title: "🪶 Muta lunga",
            body: `${nomeAnimale} e in muta da ${giorniInMuta} giorni.`,
            url: `/galline/${muta.animale_id}`,
            tag: `muta-${muta.animale_id}`,
          },
          emailSubject: "🪶 Muta lunga · Poliner",
          emailBody: `${nomeAnimale} e in muta da ${giorniInMuta} giorni. Controlla la sua scheda nell'app.`,
        });
        if (push || email) stats.muta_lunga++;
      }
    }
  }

  // Pulizia dedup oltre 30 giorni
  const limit = new Date(now.getTime() - 30 * 86400000).toISOString();
  await supabase.from("notifiche_inviate").delete().lt("inviata_il", limit);

  return new Response(JSON.stringify({ ok: true, pollai: pollai.length, stats }), {
    headers: { "content-type": "application/json" },
  });
});

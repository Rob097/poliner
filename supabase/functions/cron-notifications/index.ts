// Cron Edge Function: scansiona promemoria, uova in scadenza, manutenzione,
// trattamenti, scorte basse — invia notifiche push e/o email secondo le preferenze.
// Schedulare via pg_cron (vedi migration 0005_pg_cron).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@rdlabs.digital";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Poliner <info@rdlabs.digital>";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface NotificaInput {
  userId: string;
  email: string | null;
  pushAttivo: boolean;
  emailAttivo: boolean;
  categorie: Record<string, boolean>;
  category: string;          // chiave categoria preferenze
  riferimentoId: string;     // dedup key
  push: { title: string; body: string; url?: string; tag?: string };
  emailSubject: string;
  emailBody: string;
}

// ── HELPER ─────────────────────────────────────────────
const TIPI_MANUTENZIONE = [
  { id: "pulizia_casetta", nome: "Pulizia della casetta", default: 7 },
  { id: "pulizia_pollaio", nome: "Pulizia completa del pollaio", default: 14 },
  { id: "cambio_trucciolo", nome: "Cambio trucciolo", default: 7 },
  { id: "cambio_corteccia", nome: "Cambio corteccia di pino", default: 30 },
  { id: "bagno_sabbia", nome: "Rinnovo bagno di sabbia", default: 14 },
  { id: "cambio_paglia", nome: "Cambio paglia nei nidi", default: 7 },
] as const;

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
  // Verifica categoria abilitata
  if (n.categorie[n.category] === false) return { push: false, email: false };

  // Dedup
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

// ── MAIN ───────────────────────────────────────────────
Deno.serve(async (req) => {
  // Auth: chiamabile solo con la service-role key nell'header
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.includes(SERVICE_ROLE)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // ── Carica tutti gli utenti con un pollaio + le loro preferenze ──
  const { data: pollai } = await supabase
    .from("pollai")
    .select("id, nome, user_id, posizione_lat, posizione_lng, conservazione_ambiente_giorni, conservazione_frigo_giorni");
  if (!pollai) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  const stats = {
    promemoria: 0,
    uova_scadenza: 0,
    manutenzione: 0,
    trattamenti: 0,
    scorte: 0,
  };

  for (const p of pollai) {
    // Preferenze + profilo
    const [profileRes, prefRes] = await Promise.all([
      supabase.from("profiles").select("email").eq("id", p.user_id).maybeSingle(),
      supabase
        .from("preferenze_notifiche")
        .select("*")
        .eq("user_id", p.user_id)
        .maybeSingle(),
    ]);

    const pref = prefRes.data ?? {
      globale_attivo: true,
      push_attivo: true,
      email_attivo: false,
      categorie: {},
    };
    if (!pref.globale_attivo) continue;

    const userEmail = profileRes.data?.email ?? null;
    const categorie =
      (pref.categorie as Record<string, boolean>) ?? {};
    const base = {
      userId: p.user_id,
      email: userEmail,
      pushAttivo: pref.push_attivo,
      emailAttivo: pref.email_attivo,
      categorie,
    };

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
      const body = pr.testo;
      const { push, email } = await dispatchNotifica(supabase, {
        ...base,
        category: "promemoria",
        riferimentoId: pr.id,
        push: { title: "🔔 Promemoria", body, url: "/note", tag: `prom-${pr.id}` },
        emailSubject: "🔔 Promemoria · Poliner",
        emailBody: body,
      });
      if (push || email) {
        await supabase
          .from("note")
          .update({ promemoria_inviato: true })
          .eq("id", pr.id);
        stats.promemoria++;
      }
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
      const { push, email } = await dispatchNotifica(supabase, {
        ...base,
        category: "uova_scadenza",
        riferimentoId: `5gg-${today}`,
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
    if (uovaScadIn2 > 0) {
      const { push, email } = await dispatchNotifica(supabase, {
        ...base,
        category: "uova_scadenza",
        riferimentoId: `2gg-${today}`,
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

    // ─── 3. MANUTENZIONE ───
    const { data: manut } = await supabase
      .from("manutenzioni")
      .select("tipo, data")
      .eq("pollaio_id", p.id)
      .order("data", { ascending: false });
    const { data: config } = await supabase
      .from("manutenzioni_config")
      .select("tipo, frequenza_giorni")
      .eq("pollaio_id", p.id);
    const freqOverride = new Map<string, number>(
      (config ?? []).map((c) => [c.tipo, c.frequenza_giorni]),
    );
    const ultimoMap = new Map<string, string>();
    for (const m of manut ?? []) {
      if (!ultimoMap.has(m.tipo)) ultimoMap.set(m.tipo, m.data);
    }
    for (const tipo of TIPI_MANUTENZIONE) {
      const freq = freqOverride.get(tipo.id) ?? tipo.default;
      const ultimo = ultimoMap.get(tipo.id);
      if (!ultimo) continue;
      const giorni = Math.floor(
        (now.getTime() - new Date(ultimo).getTime()) / 86400000,
      );
      const rim = freq - giorni;
      if (rim < 0) {
        // Scaduta
        const { push, email } = await dispatchNotifica(supabase, {
          ...base,
          category: "manutenzione",
          riferimentoId: `${tipo.id}-scaduta-${today}`,
          push: {
            title: "⚠️ Manutenzione in ritardo",
            body: `${tipo.nome}: ${Math.abs(rim)} giorni di ritardo`,
            url: "/manutenzione",
            tag: `manut-${tipo.id}`,
          },
          emailSubject: `⚠️ ${tipo.nome} in ritardo`,
          emailBody: `La manutenzione "${tipo.nome}" del pollaio "${p.nome}" è in ritardo di ${Math.abs(rim)} giorni.`,
        });
        if (push || email) stats.manutenzione++;
      } else if (rim === 1) {
        // Domani
        const { push, email } = await dispatchNotifica(supabase, {
          ...base,
          category: "manutenzione",
          riferimentoId: `${tipo.id}-domani-${today}`,
          push: {
            title: "🔔 Manutenzione domani",
            body: `Domani tocca: ${tipo.nome}`,
            url: "/manutenzione",
            tag: `manut-${tipo.id}-1d`,
          },
          emailSubject: `🔔 Manutenzione domani`,
          emailBody: `Promemoria: domani tocca "${tipo.nome}" per il pollaio "${p.nome}".`,
        });
        if (push || email) stats.manutenzione++;
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
      const { push, email } = await dispatchNotifica(supabase, {
        ...base,
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
      if (push || email) {
        await supabase
          .from("trattamenti")
          .update({ notifica_inviata: true })
          .eq("id", t.id);
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
      const { push, email } = await dispatchNotifica(supabase, {
        ...base,
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

  // Pulizia dedup oltre 30 giorni
  const limit = new Date(now.getTime() - 30 * 86400000).toISOString();
  await supabase.from("notifiche_inviate").delete().lt("inviata_il", limit);

  return new Response(JSON.stringify({ ok: true, pollai: pollai.length, stats }), {
    headers: { "content-type": "application/json" },
  });
});

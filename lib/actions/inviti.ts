"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok: boolean;
  errore?: string;
}

interface CreaInvitiInput {
  pollaioId: string;
  emails: string[];
  ruolo: "admin" | "guest";
  messaggio?: string;
}

interface InvitoOK {
  email: string;
  token: string;
}

interface InvitoFallito {
  email: string;
  motivo: string;
}

export interface CreaInvitiResult {
  ok: boolean;
  inviati: InvitoOK[];
  falliti: InvitoFallito[];
  errore?: string;
}

export interface CreaAccountDaInvitoResult {
  ok: boolean;
  errore?: string;
  giaRegistrato?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildInvitoEmailHtml(params: {
  invitanteNome: string;
  pollaioNome: string;
  ruolo: "admin" | "guest";
  messaggio: string | null;
  link: string;
}): { subject: string; html: string } {
  const ruoloVerbo = params.ruolo === "admin" ? "a collaborare" : "a guardare";
  const ruoloLabel = params.ruolo === "admin" ? "collaboratrice/ore" : "visualizzatrice/ore";
  const messaggioBlock = params.messaggio
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #E8678A;background:#FFF0F3;color:#2E2924;border-radius:8px;font-style:italic">${escapeHtml(
        params.messaggio,
      )}</blockquote>`
    : "";

  const subject = `${params.invitanteNome} ti ha invitata/o nel pollaio "${params.pollaioNome}"`;
  const html = `
    <p style="margin:0 0 12px 0;font-size:17px"><b>${escapeHtml(params.invitanteNome)}</b> ti invita ${ruoloVerbo} nel pollaio</p>
    <p style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#E8678A;font-family:'Lora',Georgia,serif">${escapeHtml(params.pollaioNome)}</p>
    <p style="margin:0 0 8px 0;font-size:14px;color:#9E968C">Ti unirai come <b>${ruoloLabel}</b>.</p>
    ${messaggioBlock}
    <p style="margin:24px 0;text-align:center">
      <a href="${params.link}" style="display:inline-block;background:#E8678A;color:#fff;padding:14px 28px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px">Accetta invito</a>
    </p>
    <p style="margin:24px 0 0 0;font-size:12px;color:#9E968C;text-align:center">
      Link valido 7 giorni. Se non conosci ${escapeHtml(params.invitanteNome)}, ignora pure questa email.
    </p>
  `;
  return { subject, html };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendInvitoEmail(args: {
  to: string;
  invitanteNome: string;
  pollaioNome: string;
  ruolo: "admin" | "guest";
  messaggio: string | null;
  token: string;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const link = `${baseUrl.replace(/\/$/, "")}/invito/${args.token}`;

  const { subject, html } = buildInvitoEmailHtml({
    invitanteNome: args.invitanteNome,
    pollaioNome: args.pollaioNome,
    ruolo: args.ruolo,
    messaggio: args.messaggio,
    link,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // La send-email usa un token interno dedicato quando disponibile,
  // con fallback ai key Supabase server-side esistenti.
  const functionToken =
    process.env.SEND_EMAIL_FUNCTION_TOKEN ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !functionToken) {
    return { ok: false, error: "Configurazione Supabase mancante." };
  }

  try {
    const headers: HeadersInit = {
      "content-type": "application/json",
      authorization: `Bearer ${functionToken}`,
    };

    if (functionToken.startsWith("sb_secret_")) {
      headers.apikey = functionToken;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: args.to,
        subject,
        body: html,
        isHtml: true,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("send-email failed", res.status, txt);
      return { ok: false, error: `Edge function ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("send-email fetch threw", e);
    return { ok: false, error: (e as Error).message };
  }
}

export async function creaAccountDaInvito(params: {
  token: string;
  password: string;
}): Promise<CreaAccountDaInvitoResult> {
  if (params.password.length < 8) {
    return { ok: false, errore: "La password deve avere almeno 8 caratteri." };
  }

  const admin = createAdminClient();
  const { data: invito } = await admin
    .from("pollaio_inviti")
    .select("email, scadenza, accettato_il")
    .eq("token", params.token)
    .maybeSingle();

  if (!invito) {
    return { ok: false, errore: "Invito non valido o scaduto." };
  }
  if (invito.accettato_il) {
    return { ok: false, errore: "Questo invito è già stato accettato." };
  }
  if (new Date(invito.scadenza as string) <= new Date()) {
    return { ok: false, errore: "Questo invito è scaduto." };
  }

  const email = (invito.email as string).toLowerCase();

  const { data: profileEsistente } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileEsistente) {
    const { data: existingAuth, error: existingAuthError } = await admin.auth.admin.getUserById(
      profileEsistente.id as string,
    );

    if (existingAuthError) {
      console.error("creaAccountDaInvito getUserById failed", existingAuthError);
      return {
        ok: false,
        errore: "Ho trovato un account esistente ma non riesco a verificarlo adesso.",
      };
    }

    if (existingAuth.user && !existingAuth.user.email_confirmed_at) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existingAuth.user.id, {
        password: params.password,
        email_confirm: true,
      });

      if (updateError) {
        console.error("creaAccountDaInvito updateUserById failed", updateError);
        return {
          ok: false,
          errore: "Non sono riuscito a completare l'account già creato per questo invito.",
        };
      }

      return { ok: true };
    }

    return {
      ok: false,
      giaRegistrato: true,
      errore: "Esiste già un account con questa email. Accedi con la tua password per accettare l'invito.",
    };
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        ok: false,
        giaRegistrato: true,
        errore: "Esiste già un account con questa email. Accedi con la tua password per accettare l'invito.",
      };
    }

    console.error("creaAccountDaInvito failed", error);
    return {
      ok: false,
      errore: "Non sono riuscito a creare l'account da questo invito.",
    };
  }

  return { ok: true };
}

/**
 * Crea uno o più inviti via email per il pollaio dato. Solo admin.
 * Per ogni email:
 *  - verifica formato
 *  - skip se l'utente è già membro
 *  - insert pending invito (o riusa quello esistente)
 *  - invia email di invito
 *
 * Ritorna inviati[] e falliti[] con motivo.
 */
export async function creaInviti(input: CreaInvitiInput): Promise<CreaInvitiResult> {
  const { supabase, user } = await requireUser();

  // Verifico ruolo admin del pollaio
  const { data: myMember } = await supabase
    .from("pollaio_members")
    .select("ruolo")
    .eq("pollaio_id", input.pollaioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMember || myMember.ruolo !== "admin") {
    return {
      ok: false,
      errore: "Solo gli admin possono invitare nuove persone.",
      inviati: [],
      falliti: [],
    };
  }

  // Carico nome pollaio + nome invitante
  const [{ data: pollaio }, { data: profile }] = await Promise.all([
    supabase.from("pollai").select("nome").eq("id", input.pollaioId).single(),
    supabase.from("profiles").select("display_name, email").eq("id", user.id).single(),
  ]);

  if (!pollaio) {
    return { ok: false, errore: "Pollaio non trovato.", inviati: [], falliti: [] };
  }

  const invitanteNome =
    profile?.display_name?.trim() ||
    profile?.email?.split("@")[0] ||
    user.email?.split("@")[0] ||
    "Un amico";

  // Email già membri del pollaio
  const admin = createAdminClient();
  const { data: membriProfili } = await admin
    .from("pollaio_members")
    .select("user_id, profiles:user_id(email)")
    .eq("pollaio_id", input.pollaioId);

  type MemberRow = { user_id: string; profiles: { email: string | null } | null };
  const giaMembri = new Set<string>(
    ((membriProfili ?? []) as unknown as MemberRow[])
      .map((m) => m.profiles?.email?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );

  const messaggio = input.messaggio?.trim() || null;
  const inviati: InvitoOK[] = [];
  const falliti: InvitoFallito[] = [];
  const visti = new Set<string>();

  for (const raw of input.emails) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    if (visti.has(email)) continue;
    visti.add(email);

    if (!EMAIL_RE.test(email)) {
      falliti.push({ email: raw, motivo: "Email non valida" });
      continue;
    }
    if (email === user.email?.toLowerCase()) {
      falliti.push({ email, motivo: "Sei già membro di questo pollaio" });
      continue;
    }
    if (giaMembri.has(email)) {
      falliti.push({ email, motivo: "Questa persona è già membro" });
      continue;
    }

    // Insert / refresh invito
    const { data: existing } = await supabase
      .from("pollaio_inviti")
      .select("id, token, scadenza, accettato_il")
      .eq("pollaio_id", input.pollaioId)
      .ilike("email", email)
      .is("accettato_il", null)
      .maybeSingle();

    let token: string;

    if (existing) {
      const { data: updated, error } = await supabase
        .from("pollaio_inviti")
        .update({
          ruolo: input.ruolo,
          messaggio,
          scadenza: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invitato_da: user.id,
        })
        .eq("id", existing.id)
        .select("token")
        .single();
      if (error || !updated) {
        falliti.push({ email, motivo: "Errore aggiornando l'invito" });
        continue;
      }
      token = updated.token as string;
    } else {
      const { data: created, error } = await supabase
        .from("pollaio_inviti")
        .insert({
          pollaio_id: input.pollaioId,
          email,
          ruolo: input.ruolo,
          messaggio,
          invitato_da: user.id,
        })
        .select("token")
        .single();
      if (error || !created) {
        falliti.push({ email, motivo: "Errore creando l'invito" });
        continue;
      }
      token = created.token as string;
    }

    const send = await sendInvitoEmail({
      to: email,
      invitanteNome,
      pollaioNome: pollaio.nome,
      ruolo: input.ruolo,
      messaggio,
      token,
    });

    if (!send.ok) {
      falliti.push({
        email,
        motivo: send.error
          ? `Email non inviata: ${send.error}`
          : "Invito creato ma email non inviata",
      });
      continue;
    }

    inviati.push({ email, token });
  }

  revalidatePath("/impostazioni/membri");
  return { ok: true, inviati, falliti };
}

export async function revocaInvito(invitoId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("pollaio_inviti").delete().eq("id", invitoId);
  if (error) {
    return { ok: false, errore: "Non sono riuscito a revocare l'invito." };
  }

  revalidatePath("/impostazioni/membri");
  return { ok: true };
}

export async function accettaInvito(token: string): Promise<{
  ok: boolean;
  errore?: string;
  pollaioId?: string;
}> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.rpc("accept_invito", { p_token: token });
  if (error) {
    return { ok: false, errore: "Qualcosa è andato storto. Riprova!" };
  }

  type Res = { ok: boolean; errore?: string; pollaio_id?: string };
  const res = (data ?? { ok: false }) as Res;

  if (!res.ok) {
    return { ok: false, errore: res.errore ?? "Invito non valido." };
  }

  if (res.pollaio_id) {
    const { error: switchError } = await supabase
      .from("profiles")
      .update({ pollaio_attivo_id: res.pollaio_id })
      .eq("id", user.id);

    if (switchError) {
      console.error("accettaInvito switch failed", switchError);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, pollaioId: res.pollaio_id };
}

/**
 * Legge un invito come endpoint "pubblico" (l'utente potrebbe non essere ancora
 * autenticato perché deve registrarsi). Usa il service-role client per bypassare
 * RLS, ma restituisce solo dati minimi necessari per la UI della pagina invito.
 * Non restituisce mai dati personali oltre a quello che già appariva nell'email.
 */
export async function getInvitoPublic(token: string): Promise<
  | {
      ok: true;
      email: string;
      ruolo: "admin" | "guest";
      pollaioNome: string;
      invitanteNome: string;
      messaggio: string | null;
      scadenza: string;
    }
  | { ok: false; errore: string; scaduto?: boolean; gia_accettato?: boolean }
> {
  const admin = createAdminClient();

  const { data: invito } = await admin
    .from("pollaio_inviti")
    .select("email, ruolo, messaggio, scadenza, accettato_il, pollaio_id, invitato_da")
    .eq("token", token)
    .maybeSingle();

  if (!invito) {
    return { ok: false, errore: "Invito non trovato." };
  }
  if (invito.accettato_il) {
    return { ok: false, errore: "Questo invito è già stato accettato.", gia_accettato: true };
  }
  if (new Date(invito.scadenza as string) <= new Date()) {
    return { ok: false, errore: "Questo invito è scaduto.", scaduto: true };
  }

  const [{ data: pollaio }, { data: profile }] = await Promise.all([
    admin.from("pollai").select("nome").eq("id", invito.pollaio_id as string).single(),
    admin
      .from("profiles")
      .select("display_name, email")
      .eq("id", invito.invitato_da as string)
      .single(),
  ]);

  const invitanteNome =
    profile?.display_name?.trim() ||
    profile?.email?.split("@")[0] ||
    "Un membro del pollaio";

  return {
    ok: true,
    email: invito.email as string,
    ruolo: invito.ruolo as "admin" | "guest",
    pollaioNome: pollaio?.nome ?? "Pollaio",
    invitanteNome,
    messaggio: (invito.messaggio as string | null) ?? null,
    scadenza: invito.scadenza as string,
  };
}

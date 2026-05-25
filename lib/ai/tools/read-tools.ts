import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { trovaRazza } from "@/lib/data/razze";

export interface ToolContext {
  supabase: SupabaseClient<Database>;
  pollaioId: string;
  userId: string;
}

function dataIsoGiorniFa(giorni: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - giorni);
  return d.toISOString().slice(0, 10);
}

function etaMesi(dataNascita: string | null): number | null {
  if (!dataNascita) return null;
  const nasc = new Date(dataNascita);
  const ora = new Date();
  return Math.round(
    (ora.getTime() - nasc.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
}

function razzaLabel(
  razzaId: string | null,
  razzaCustom: string | null,
): string | null {
  if (razzaCustom) return razzaCustom;
  if (razzaId) return trovaRazza(razzaId)?.nome ?? razzaId;
  return null;
}

// ── 1. get_animali ───────────────────────────────────────
export async function get_animali(
  args: { includi_defunte?: boolean },
  ctx: ToolContext,
) {
  const includiDefunte = args.includi_defunte === true;
  const q = ctx.supabase
    .from("animali")
    .select(
      "id, nome, tipo, razza_id, razza_custom, data_nascita, eta_approssimativa_mesi, attivo, defunta_il, colore_piumaggio",
    )
    .eq("pollaio_id", ctx.pollaioId)
    .order("nome");
  const { data, error } = await q;
  if (error) throw error;
  const filtrate = (data ?? []).filter((a) => includiDefunte || a.attivo);
  return {
    animali: filtrate.map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      razza: razzaLabel(a.razza_id, a.razza_custom),
      eta_mesi: etaMesi(a.data_nascita) ?? a.eta_approssimativa_mesi ?? null,
      data_nascita: a.data_nascita,
      attiva: a.attivo,
      defunta_il: a.defunta_il,
      colore_piumaggio: a.colore_piumaggio,
    })),
    totale: filtrate.length,
  };
}

// ── 2. get_animale_dettaglio ─────────────────────────────
export async function get_animale_dettaglio(
  args: { animale_id: string },
  ctx: ToolContext,
) {
  const { animale_id } = args;
  const { data: a, error } = await ctx.supabase
    .from("animali")
    .select("*")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("id", animale_id)
    .maybeSingle();
  if (error) throw error;
  if (!a) return { errore: "Gallina non trovata in questo pollaio." };

  const [{ count: uovaTotali }, { count: uovaUltimoMese }, salute, inserimento] =
    await Promise.all([
      ctx.supabase
        .from("uova")
        .select("id", { count: "exact", head: true })
        .eq("animale_id", animale_id),
      ctx.supabase
        .from("uova")
        .select("id", { count: "exact", head: true })
        .eq("animale_id", animale_id)
        .gte("data_deposizione", dataIsoGiorniFa(30)),
      ctx.supabase
        .from("eventi_salute")
        .select("data, tipo, stato, descrizione, data_risoluzione")
        .eq("animale_id", animale_id)
        .order("data", { ascending: false })
        .limit(5),
      ctx.supabase
        .from("eventi_inserimento")
        .select("data, tipo, note")
        .eq("animale_id", animale_id)
        .order("data", { ascending: false })
        .limit(3),
    ]);

  return {
    id: a.id,
    nome: a.nome,
    tipo: a.tipo,
    razza: razzaLabel(a.razza_id, a.razza_custom),
    data_nascita: a.data_nascita,
    eta_mesi: etaMesi(a.data_nascita) ?? a.eta_approssimativa_mesi ?? null,
    attiva: a.attivo,
    defunta_il: a.defunta_il,
    causa_decesso: a.causa_decesso,
    colore_piumaggio: a.colore_piumaggio,
    note: a.note,
    uova_totali: uovaTotali ?? 0,
    uova_ultimi_30_giorni: uovaUltimoMese ?? 0,
    eventi_salute_recenti: salute.data ?? [],
    eventi_inserimento_recenti: inserimento.data ?? [],
  };
}

// ── 3. get_uova_recenti ──────────────────────────────────
export async function get_uova_recenti(
  args: { giorni?: number },
  ctx: ToolContext,
) {
  const giorni = Math.min(Math.max(args.giorni ?? 7, 1), 90);
  const dal = dataIsoGiorniFa(giorni);
  const { data, error } = await ctx.supabase
    .from("uova")
    .select("id, data_deposizione, animale_id, stato, conservazione, animali:animale_id(nome)")
    .eq("pollaio_id", ctx.pollaioId)
    .gte("data_deposizione", dal)
    .order("data_deposizione", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    data_deposizione: string;
    animale_id: string | null;
    stato: string;
    conservazione: string;
    animali: { nome: string } | null;
  }>;
  return {
    giorni,
    totale: rows.length,
    uova: rows.map((u) => ({
      id: u.id,
      data: u.data_deposizione,
      gallina: u.animali?.nome ?? null,
      stato: u.stato,
      conservazione: u.conservazione,
    })),
  };
}

// ── 4. get_uova_stats ────────────────────────────────────
export async function get_uova_stats(
  args: { giorni?: number },
  ctx: ToolContext,
) {
  const giorni = Math.min(Math.max(args.giorni ?? 30, 1), 365);
  const dal = dataIsoGiorniFa(giorni);
  const { data, error } = await ctx.supabase
    .from("uova")
    .select("animale_id, data_deposizione, animali:animale_id(nome)")
    .eq("pollaio_id", ctx.pollaioId)
    .gte("data_deposizione", dal);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    animale_id: string | null;
    data_deposizione: string;
    animali: { nome: string } | null;
  }>;
  const totale = rows.length;
  const perGallina = new Map<string, { nome: string; count: number }>();
  let senzaGallina = 0;
  for (const r of rows) {
    if (!r.animale_id || !r.animali) {
      senzaGallina += 1;
      continue;
    }
    const cur = perGallina.get(r.animale_id);
    if (cur) cur.count += 1;
    else perGallina.set(r.animale_id, { nome: r.animali.nome, count: 1 });
  }
  return {
    giorni,
    totale,
    media_giornaliera: Number((totale / giorni).toFixed(2)),
    senza_gallina: senzaGallina,
    per_gallina: Array.from(perGallina.entries())
      .map(([id, v]) => ({ id, nome: v.nome, count: v.count }))
      .sort((l, r) => r.count - l.count),
  };
}

// ── 5. get_scorte ────────────────────────────────────────
export async function get_scorte(_args: Record<string, never>, ctx: ToolContext) {
  const { data, error } = await ctx.supabase
    .from("scorte_cibo")
    .select("id, nome, quantita, unita, soglia_avviso")
    .eq("pollaio_id", ctx.pollaioId)
    .order("nome");
  if (error) throw error;
  const rows = data ?? [];
  let sottoSoglia = 0;
  const scorte = rows.map((s) => {
    const sotto =
      s.quantita != null && s.soglia_avviso != null && s.quantita < s.soglia_avviso;
    if (sotto) sottoSoglia += 1;
    return {
      id: s.id,
      nome: s.nome,
      quantita: s.quantita,
      unita: s.unita,
      soglia_avviso: s.soglia_avviso,
      sotto_soglia: sotto,
    };
  });
  return { scorte, sotto_soglia: sottoSoglia, totale: rows.length };
}

// ── 6. get_spese_recenti ─────────────────────────────────
export async function get_spese_recenti(
  args: { giorni?: number },
  ctx: ToolContext,
) {
  const giorni = Math.min(Math.max(args.giorni ?? 30, 1), 365);
  const dal = dataIsoGiorniFa(giorni);
  const { data, error } = await ctx.supabase
    .from("spese")
    .select("id, data, descrizione, importo_euro, categoria")
    .eq("pollaio_id", ctx.pollaioId)
    .gte("data", dal)
    .order("data", { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = data ?? [];
  const totale = rows.reduce((acc, r) => acc + Number(r.importo_euro), 0);
  return {
    giorni,
    totale_euro: Number(totale.toFixed(2)),
    voci: rows,
  };
}

// ── 7. get_lista_spesa ───────────────────────────────────
export async function get_lista_spesa(
  _args: Record<string, never>,
  ctx: ToolContext,
) {
  const { data, error } = await ctx.supabase
    .from("lista_spesa")
    .select("id, testo, quantita, categoria, comprato, data_acquisto")
    .eq("pollaio_id", ctx.pollaioId)
    .order("comprato")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  return {
    da_comprare: rows.filter((r) => !r.comprato),
    comprati_recenti: rows.filter((r) => r.comprato).slice(0, 10),
  };
}

// ── 8. get_note_recenti ──────────────────────────────────
export async function get_note_recenti(
  args: { testo?: string; includi_archiviate?: boolean },
  ctx: ToolContext,
) {
  let q = ctx.supabase
    .from("note")
    .select("id, data, testo, tag, archiviata, promemoria_data")
    .eq("pollaio_id", ctx.pollaioId)
    .order("data", { ascending: false })
    .limit(20);
  if (!args.includi_archiviate) q = q.eq("archiviata", false);
  if (args.testo) q = q.ilike("testo", `%${args.testo}%`);
  const { data, error } = await q;
  if (error) throw error;
  return { note: data ?? [], totale: (data ?? []).length };
}

// ── 9. get_manutenzioni_aperte ───────────────────────────
export async function get_manutenzioni_aperte(
  _args: Record<string, never>,
  ctx: ToolContext,
) {
  const { data: voci, error } = await ctx.supabase
    .from("manutenzioni_voci")
    .select("id, nome, icona, dove, frequenza_giorni, note")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("attivo", true)
    .order("nome");
  if (error) throw error;

  const ids = (voci ?? []).map((v) => v.id);
  const { data: esec } = await ctx.supabase
    .from("manutenzioni")
    .select("voce_id, data")
    .in("voce_id", ids.length > 0 ? ids : ["__none__"])
    .order("data", { ascending: false });

  const ultime = new Map<string, string>();
  for (const e of esec ?? []) {
    if (!ultime.has(e.voce_id)) ultime.set(e.voce_id, e.data);
  }
  const oggi = new Date();
  const items = (voci ?? []).map((v) => {
    const ultima = ultime.get(v.id) ?? null;
    let giorniDallUltima: number | null = null;
    let stato: "ok" | "in_scadenza" | "scaduto" | "mai_fatto" = "mai_fatto";
    if (ultima) {
      giorniDallUltima = Math.floor(
        (oggi.getTime() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24),
      );
      const ratio = giorniDallUltima / v.frequenza_giorni;
      stato = ratio >= 1 ? "scaduto" : ratio >= 0.8 ? "in_scadenza" : "ok";
    }
    return {
      id: v.id,
      nome: v.nome,
      icona: v.icona,
      dove: v.dove,
      frequenza_giorni: v.frequenza_giorni,
      ultima_esecuzione: ultima,
      giorni_dall_ultima: giorniDallUltima,
      stato,
    };
  });
  return {
    manutenzioni: items,
    da_fare: items.filter((x) => x.stato !== "ok").length,
  };
}

// ── 10. get_rubrica ──────────────────────────────────────
export async function get_rubrica(
  _args: Record<string, never>,
  ctx: ToolContext,
) {
  const { data, error } = await ctx.supabase
    .from("contatti")
    .select("id, nome, telefono, relazione, note")
    .eq("pollaio_id", ctx.pollaioId)
    .order("nome");
  if (error) throw error;
  return { contatti: data ?? [], totale: (data ?? []).length };
}

// ── 11. get_impostazioni_app ─────────────────────────────
// Guida statica alle funzioni dell'app: non legge dal DB ma serve all'AI
// per rispondere a domande tipo "come disattivo le notifiche?".
export async function get_impostazioni_app(
  _args: Record<string, never>,
  _ctx: ToolContext,
) {
  return {
    sezioni: [
      {
        nome: "Notifiche",
        come_arrivarci: "Vai su Impostazioni > Notifiche.",
        cosa_si_fa: [
          "Attivare/disattivare le push e le email a livello globale.",
          "Scegliere quali categorie ricevere (uova, scorte, manutenzioni, salute, promemoria).",
          "Impostare un orario di non disturbo (es. 22:00–07:00).",
          "Scegliere l'ora di invio delle notifiche meteo.",
        ],
      },
      {
        nome: "Pollai e ruoli",
        come_arrivarci: "Impostazioni > Pollai. Sulla home, il selettore in alto cambia il pollaio attivo.",
        cosa_si_fa: [
          "Vedere tutti i pollai a cui appartieni.",
          "Cambiare pollaio attivo (la chat AI vede SOLO il pollaio attivo).",
          "Invitare altri amministratori o ospiti via email.",
          "Modificare nome, foto e posizione di un pollaio (admin).",
          "Attivare la pagina pubblica (admin).",
        ],
      },
      {
        nome: "Profilo utente",
        come_arrivarci: "Impostazioni > Profilo.",
        cosa_si_fa: ["Cambiare nome visualizzato, avatar, email."],
      },
      {
        nome: "Conservazione uova",
        come_arrivarci: "Impostazioni > Pollaio > Conservazione.",
        cosa_si_fa: [
          "Impostare i giorni di conservazione a temperatura ambiente e in frigorifero.",
        ],
      },
      {
        nome: "Aggiungere una gallina",
        come_arrivarci: "Sezione Galline > pulsante 'Aggiungi'.",
        cosa_si_fa: [
          "Inserire nome, razza, data di nascita, foto, ed eventualmente avviare la procedura di inserimento (quarantena, presentazione, convivenza).",
        ],
      },
      {
        nome: "Aggiungere uova",
        come_arrivarci: "FAB '+' > 'Aggiungi uova', oppure pagina Uova.",
        cosa_si_fa: [
          "Registrare un uovo singolo associandolo a una gallina, oppure raccolta veloce in batch.",
        ],
      },
      {
        nome: "Manutenzioni",
        come_arrivarci: "Sezione Manutenzione.",
        cosa_si_fa: [
          "Vedere le manutenzioni in ritardo o in scadenza.",
          "Registrare un'esecuzione (data + foto + note).",
          "Aggiungere nuove voci personalizzate con frequenza in giorni.",
        ],
      },
      {
        nome: "Note e promemoria",
        come_arrivarci: "Sezione Note.",
        cosa_si_fa: [
          "Scrivere note libere con tag.",
          "Impostare un promemoria che invia una push alla data scelta.",
          "Archiviare o eliminare una nota dal menu '⋯' sulla card.",
        ],
      },
    ],
  };
}

import type { ToolContext } from "./read-tools";
import { RAZZE } from "@/lib/data/razze";

// ╔══════════════════════════════════════════════════════════╗
// ║ Write tools dell'assistente AI                           ║
// ║                                                          ║
// ║ Ogni handler riceve `ctx.supabase` già autenticato come  ║
// ║ admin del pollaio attivo (route handler ha già fatto     ║
// ║ requireAdminPollaio). Le RLS sui table garantiscono che  ║
// ║ non possa scrivere su pollai non suoi.                   ║
// ║                                                          ║
// ║ Convenzione: gli handler ritornano sempre un JSON con    ║
// ║ { ok: bool, ... }. In caso di errore, { ok: false,       ║
// ║ errore: "..." } con messaggio breve in italiano.         ║
// ╚══════════════════════════════════════════════════════════╝

function oggiISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function trovaAnimale(
  ctx: ToolContext,
  nome: string,
): Promise<{ id: string; nome: string } | null> {
  const { data } = await ctx.supabase
    .from("animali")
    .select("id, nome")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("attivo", true)
    .ilike("nome", nome.trim())
    .maybeSingle();
  return data;
}

async function trovaNido(
  ctx: ToolContext,
  nome: string,
): Promise<{ id: string; nome: string } | null> {
  const { data } = await ctx.supabase
    .from("nidi")
    .select("id, nome")
    .eq("pollaio_id", ctx.pollaioId)
    .ilike("nome", nome.trim())
    .maybeSingle();
  return data;
}

async function trovaScorta(
  ctx: ToolContext,
  nome: string,
): Promise<{ id: string; nome: string; quantita: number | null; unita: string | null } | null> {
  const { data } = await ctx.supabase
    .from("scorte_cibo")
    .select("id, nome, quantita, unita")
    .eq("pollaio_id", ctx.pollaioId)
    .ilike("nome", nome.trim())
    .maybeSingle();
  return data;
}

async function trovaVoceManutenzione(
  ctx: ToolContext,
  nome: string,
): Promise<{ id: string; nome: string } | null> {
  const { data } = await ctx.supabase
    .from("manutenzioni_voci")
    .select("id, nome")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("attivo", true)
    .ilike("nome", `%${nome.trim()}%`)
    .order("nome")
    .limit(1)
    .maybeSingle();
  return data;
}

async function trovaContatto(
  ctx: ToolContext,
  nome: string,
): Promise<{ id: string; nome: string } | null> {
  const { data } = await ctx.supabase
    .from("contatti")
    .select("id, nome")
    .eq("pollaio_id", ctx.pollaioId)
    .ilike("nome", nome.trim())
    .maybeSingle();
  return data;
}

function risolviRazza(nomeRazza: string | undefined): {
  razza_id: string | null;
  razza_custom: string | null;
} {
  const t = nomeRazza?.trim();
  if (!t) return { razza_id: null, razza_custom: null };
  const match = RAZZE.find((r) => r.nome.toLowerCase() === t.toLowerCase());
  if (match) return { razza_id: match.id, razza_custom: null };
  return { razza_id: null, razza_custom: t };
}

function uuid(): string {
  return crypto.randomUUID();
}

// ── registra_uovo ────────────────────────────────────────
export async function registra_uovo(
  args: {
    gallina_nome?: string;
    nido_nome?: string;
    data?: string;
    quantita?: number;
    note?: string;
  },
  ctx: ToolContext,
) {
  const quantita = Math.max(1, Math.min(args.quantita ?? 1, 12));
  const data = args.data?.trim() || oggiISO();

  let animaleId: string | null = null;
  let gallinaNomeRiconosciuta: string | null = null;
  if (args.gallina_nome) {
    const a = await trovaAnimale(ctx, args.gallina_nome);
    if (!a) {
      return {
        ok: false,
        errore: `Nessuna gallina di nome "${args.gallina_nome}" tra quelle attive. Verifica il nome o lascia il campo vuoto.`,
      };
    }
    animaleId = a.id;
    gallinaNomeRiconosciuta = a.nome;
  }

  let nidoId: string | null = null;
  if (args.nido_nome) {
    const n = await trovaNido(ctx, args.nido_nome);
    if (n) nidoId = n.id;
  }

  const righe = Array.from({ length: quantita }, () => ({
    pollaio_id: ctx.pollaioId,
    data_deposizione: data,
    animale_id: animaleId,
    nido_id: nidoId,
    note: args.note ?? null,
  }));

  const { data: inserite, error } = await ctx.supabase
    .from("uova")
    .insert(righe)
    .select("id");
  if (error) {
    console.error("[write] registra_uovo", error);
    return { ok: false, errore: "Non sono riuscita a registrare le uova." };
  }
  return {
    ok: true,
    registrate: inserite?.length ?? 0,
    gallina: gallinaNomeRiconosciuta,
    data,
  };
}

// ── aggiungi_lista_spesa ─────────────────────────────────
export async function aggiungi_lista_spesa(
  args: { testo?: string; quantita?: string; categoria?: string },
  ctx: ToolContext,
) {
  const testo = args.testo?.trim();
  if (!testo) {
    return { ok: false, errore: "Manca il testo della voce." };
  }
  const { error } = await ctx.supabase.from("lista_spesa").insert({
    pollaio_id: ctx.pollaioId,
    testo,
    quantita: args.quantita?.trim() || null,
    categoria: args.categoria?.trim() || null,
  });
  if (error) {
    console.error("[write] aggiungi_lista_spesa", error);
    return { ok: false, errore: "Non sono riuscita ad aggiungere alla lista." };
  }
  return { ok: true, testo };
}

// ── crea_nota ────────────────────────────────────────────
export type CanaleNotifica = "push" | "email" | "entrambi";

export async function crea_nota(
  args: {
    testo?: string;
    tag?: "osservazione" | "idea" | "promemoria";
    promemoria_data?: string; // ISO datetime
    promemoria_canale?: CanaleNotifica;
  },
  ctx: ToolContext,
) {
  const testo = args.testo?.trim();
  if (!testo) {
    return { ok: false, errore: "Manca il testo della nota." };
  }
  const tag = args.tag && ["osservazione", "idea", "promemoria"].includes(args.tag)
    ? args.tag
    : null;
  const canale: CanaleNotifica | null =
    args.promemoria_canale &&
    ["push", "email", "entrambi"].includes(args.promemoria_canale)
      ? args.promemoria_canale
      : args.promemoria_data
        ? "push"
        : null;
  const { error } = await ctx.supabase.from("note").insert({
    pollaio_id: ctx.pollaioId,
    testo,
    tag: args.promemoria_data ? "promemoria" : tag,
    promemoria_data: args.promemoria_data?.trim() || null,
    promemoria_canale: canale,
  });
  if (error) {
    console.error("[write] crea_nota", error);
    return { ok: false, errore: "Non sono riuscita a salvare la nota." };
  }
  return {
    ok: true,
    tag: args.promemoria_data ? "promemoria" : tag ?? "nota",
    con_promemoria: !!args.promemoria_data,
  };
}

// ── registra_evento_salute ───────────────────────────────
export type TipoEventoSalute =
  | "malattia"
  | "ferita"
  | "comportamento"
  | "parassiti"
  | "guscio"
  | "altro";

const TIPI_SALUTE: TipoEventoSalute[] = [
  "malattia",
  "ferita",
  "comportamento",
  "parassiti",
  "guscio",
  "altro",
];

export async function registra_evento_salute(
  args: {
    gallina_nome?: string;
    tipo?: TipoEventoSalute;
    descrizione?: string;
    data?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.gallina_nome?.trim();
  if (!nome) {
    return { ok: false, errore: "Serve il nome della gallina coinvolta." };
  }
  const tipo: TipoEventoSalute = TIPI_SALUTE.includes(args.tipo as TipoEventoSalute)
    ? (args.tipo as TipoEventoSalute)
    : "altro";
  const a = await trovaAnimale(ctx, nome);
  if (!a) {
    return {
      ok: false,
      errore: `Nessuna gallina di nome "${nome}" tra quelle attive.`,
    };
  }
  const { error } = await ctx.supabase.from("eventi_salute").insert({
    pollaio_id: ctx.pollaioId,
    animale_id: a.id,
    tipo,
    descrizione: args.descrizione?.trim() || null,
    data: args.data?.trim() || oggiISO(),
    stato: "in_corso",
  });
  if (error) {
    console.error("[write] registra_evento_salute", error);
    return { ok: false, errore: "Non sono riuscita a registrare l'evento." };
  }
  return { ok: true, gallina: a.nome, tipo };
}

// ── registra_rifornimento_scorta ─────────────────────────
export async function registra_rifornimento_scorta(
  args: { scorta_nome?: string; quantita_aggiunta?: number; note?: string },
  ctx: ToolContext,
) {
  const nome = args.scorta_nome?.trim();
  const qta = args.quantita_aggiunta;
  if (!nome) return { ok: false, errore: "Serve il nome della scorta." };
  if (typeof qta !== "number" || !(qta > 0))
    return { ok: false, errore: "Serve la quantità (numero maggiore di 0)." };
  const s = await trovaScorta(ctx, nome);
  if (!s) {
    return {
      ok: false,
      errore: `Nessuna scorta chiamata "${nome}". Verifica il nome esatto dalla sezione Scorte.`,
    };
  }
  const { error: rErr } = await ctx.supabase
    .from("scorte_rifornimenti")
    .insert({
      scorta_id: s.id,
      quantita_aggiunta: qta,
      note: args.note?.trim() || null,
    });
  if (rErr) {
    console.error("[write] rifornimento insert", rErr);
    return { ok: false, errore: "Non sono riuscita a registrare il rifornimento." };
  }
  const nuovaQty = (s.quantita ?? 0) + qta;
  const { error: uErr } = await ctx.supabase
    .from("scorte_cibo")
    .update({ quantita: nuovaQty })
    .eq("id", s.id);
  if (uErr) {
    console.error("[write] rifornimento update", uErr);
    return {
      ok: false,
      errore: "Rifornimento salvato ma non sono riuscita ad aggiornare il totale.",
    };
  }
  return {
    ok: true,
    scorta: s.nome,
    quantita_aggiunta: qta,
    totale: nuovaQty,
    unita: s.unita,
  };
}

// ── spunta_lista_spesa ────────────────────────────────────
export async function spunta_lista_spesa(
  args: { testo?: string },
  ctx: ToolContext,
) {
  const testo = args.testo?.trim();
  if (!testo) return { ok: false, errore: "Quale voce devo spuntare?" };
  const { data: candidati } = await ctx.supabase
    .from("lista_spesa")
    .select("id, testo")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("comprato", false)
    .ilike("testo", `%${testo}%`)
    .limit(2);
  const rows = candidati ?? [];
  if (rows.length === 0) {
    return {
      ok: false,
      errore: `Nessuna voce non comprata che assomigli a "${testo}".`,
    };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      errore: `Più voci corrispondono a "${testo}" (${rows.map((r) => r.testo).join(", ")}). Sii più specifico.`,
    };
  }
  const target = rows[0]!;
  const { error } = await ctx.supabase
    .from("lista_spesa")
    .update({ comprato: true, data_acquisto: oggiISO() })
    .eq("id", target.id);
  if (error) {
    console.error("[write] spunta_lista_spesa", error);
    return { ok: false, errore: "Non sono riuscita a spuntare la voce." };
  }
  return { ok: true, voce: target.testo };
}

// ── registra_manutenzione ─────────────────────────────────
export async function registra_manutenzione(
  args: { voce_nome?: string; data?: string; note?: string },
  ctx: ToolContext,
) {
  const nome = args.voce_nome?.trim();
  if (!nome) return { ok: false, errore: "Quale manutenzione hai fatto?" };
  const v = await trovaVoceManutenzione(ctx, nome);
  if (!v) {
    return {
      ok: false,
      errore: `Nessuna voce di manutenzione che assomigli a "${nome}". Controlla la sezione Manutenzione.`,
    };
  }
  const { error } = await ctx.supabase.from("manutenzioni").insert({
    pollaio_id: ctx.pollaioId,
    voce_id: v.id,
    data: args.data?.trim() || oggiISO(),
    note: args.note?.trim() || null,
  });
  if (error) {
    console.error("[write] registra_manutenzione", error);
    return { ok: false, errore: "Non sono riuscita a registrare la manutenzione." };
  }
  return { ok: true, voce: v.nome };
}

// ── marca_uovo_consumato ──────────────────────────────────
export async function marca_uovo_consumato(
  args: { quantita?: number; gallina_nome?: string },
  ctx: ToolContext,
) {
  const quantita = Math.max(1, Math.min(args.quantita ?? 1, 12));
  let animaleId: string | null = null;
  let gallinaNome: string | null = null;
  if (args.gallina_nome) {
    const a = await trovaAnimale(ctx, args.gallina_nome);
    if (!a) {
      return {
        ok: false,
        errore: `Nessuna gallina di nome "${args.gallina_nome}" tra quelle attive.`,
      };
    }
    animaleId = a.id;
    gallinaNome = a.nome;
  }
  // Seleziona le uova disponibili più vecchie (FIFO)
  let q = ctx.supabase
    .from("uova")
    .select("id, data_deposizione")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("stato", "disponibile")
    .order("data_deposizione")
    .limit(quantita);
  if (animaleId) q = q.eq("animale_id", animaleId);
  const { data: candidati, error: qErr } = await q;
  if (qErr) {
    console.error("[write] marca_uovo_consumato select", qErr);
    return { ok: false, errore: "Non riesco a leggere le uova disponibili." };
  }
  const rows = candidati ?? [];
  if (rows.length === 0) {
    return {
      ok: false,
      errore: gallinaNome
        ? `Nessun uovo disponibile di ${gallinaNome} da consumare.`
        : "Nessun uovo disponibile in scorta.",
    };
  }
  const ids = rows.map((r) => r.id);
  const { error: uErr } = await ctx.supabase
    .from("uova")
    .update({ stato: "consumato", data_consumato: oggiISO() })
    .in("id", ids);
  if (uErr) {
    console.error("[write] marca_uovo_consumato update", uErr);
    return { ok: false, errore: "Non sono riuscita a marcare le uova." };
  }
  return {
    ok: true,
    marcate: rows.length,
    quantita_richiesta: quantita,
    gallina: gallinaNome,
  };
}

// ── registra_spesa ───────────────────────────────────────
export async function registra_spesa(
  args: {
    descrizione?: string;
    importo_euro?: number;
    categoria?: string;
    data?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const descrizione = args.descrizione?.trim();
  const importo = args.importo_euro;
  if (!descrizione || typeof importo !== "number" || !(importo > 0)) {
    return {
      ok: false,
      errore: "Servono descrizione e importo (in euro, maggiore di 0).",
    };
  }
  const { error } = await ctx.supabase.from("spese").insert({
    pollaio_id: ctx.pollaioId,
    data: args.data?.trim() || oggiISO(),
    descrizione,
    importo_euro: importo,
    categoria: args.categoria?.trim() || null,
    note: args.note?.trim() || null,
  });
  if (error) {
    console.error("[write] registra_spesa", error);
    return { ok: false, errore: "Non sono riuscita a registrare la spesa." };
  }
  return { ok: true, descrizione, importo_euro: importo };
}

// ── aggiungi_gallina ──────────────────────────────────────
export async function aggiungi_gallina(
  args: {
    nome?: string;
    tipo?: "gallina" | "gallo";
    razza_nome?: string;
    data_nascita?: string;
    colore_piumaggio?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.nome?.trim();
  if (!nome) return { ok: false, errore: "Serve almeno il nome." };
  const tipo: "gallina" | "gallo" =
    args.tipo === "gallo" ? "gallo" : "gallina";
  const { razza_id, razza_custom } = risolviRazza(args.razza_nome);

  const { error } = await ctx.supabase.from("animali").insert({
    id: uuid(),
    pollaio_id: ctx.pollaioId,
    nome,
    tipo,
    razza_id,
    razza_custom,
    data_nascita: args.data_nascita?.trim() || null,
    colore_piumaggio: args.colore_piumaggio?.trim() || null,
    note: args.note?.trim() || null,
    attivo: true,
  });
  if (error) {
    console.error("[write] aggiungi_gallina", error);
    return {
      ok: false,
      errore: "Non sono riuscita ad aggiungere la gallina.",
    };
  }
  return { ok: true, nome, tipo };
}

// ── registra_trattamento ──────────────────────────────────
export async function registra_trattamento(
  args: {
    tipo?: string;
    gallina_nome?: string;
    prodotto?: string;
    dose?: string;
    data?: string;
    prossima_data?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const tipo = args.tipo?.trim();
  if (!tipo)
    return { ok: false, errore: "Che tipo di trattamento? (antiparassitario, vermifugo, ...)" };
  let animaleId: string | null = null;
  let nomeRiconosciuto: string | null = null;
  if (args.gallina_nome) {
    const a = await trovaAnimale(ctx, args.gallina_nome);
    if (!a) {
      return {
        ok: false,
        errore: `Nessuna gallina di nome "${args.gallina_nome}" tra quelle attive.`,
      };
    }
    animaleId = a.id;
    nomeRiconosciuto = a.nome;
  }
  const { error } = await ctx.supabase.from("trattamenti").insert({
    pollaio_id: ctx.pollaioId,
    animale_id: animaleId,
    applica_a_tutti: animaleId === null,
    tipo,
    prodotto: args.prodotto?.trim() || null,
    dose: args.dose?.trim() || null,
    data: args.data?.trim() || oggiISO(),
    prossima_data: args.prossima_data?.trim() || null,
    note: args.note?.trim() || null,
  });
  if (error) {
    console.error("[write] registra_trattamento", error);
    return { ok: false, errore: "Non sono riuscita a registrare il trattamento." };
  }
  return {
    ok: true,
    tipo,
    gallina: nomeRiconosciuto,
    a_tutte: animaleId === null,
  };
}

// ── registra_uscita ───────────────────────────────────────
export async function registra_uscita(
  args: {
    data?: string;
    ora_uscita?: string;
    ora_rientro?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const data = args.data?.trim() || oggiISO();
  if (!args.ora_uscita && !args.ora_rientro) {
    return { ok: false, errore: "Servono almeno ora uscita o ora rientro." };
  }
  const { error } = await ctx.supabase.from("log_uscite").insert({
    pollaio_id: ctx.pollaioId,
    data,
    ora_uscita: args.ora_uscita?.trim() || null,
    ora_rientro: args.ora_rientro?.trim() || null,
    note: args.note?.trim() || null,
  });
  if (error) {
    console.error("[write] registra_uscita", error);
    return { ok: false, errore: "Non sono riuscita a registrare l'uscita." };
  }
  return { ok: true, data };
}

// ── registra_regalo_uova ──────────────────────────────────
export async function registra_regalo_uova(
  args: {
    contatto_nome?: string;
    quantita?: number;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.contatto_nome?.trim();
  const quantita = args.quantita;
  if (!nome)
    return { ok: false, errore: "A chi hai regalato le uova? (nome contatto)" };
  if (typeof quantita !== "number" || !(quantita > 0))
    return { ok: false, errore: "Quante uova hai regalato? (numero > 0)" };

  const c = await trovaContatto(ctx, nome);
  if (!c) {
    return {
      ok: false,
      errore: `Nessun contatto chiamato "${nome}" nella rubrica.`,
    };
  }

  // Seleziona N uova disponibili più vecchie
  const { data: candidate } = await ctx.supabase
    .from("uova")
    .select("id")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("stato", "disponibile")
    .order("data_deposizione")
    .limit(quantita);
  const rows = candidate ?? [];
  if (rows.length < quantita) {
    return {
      ok: false,
      errore: `Hai solo ${rows.length} uova disponibili in scorta.`,
    };
  }

  const { data: regalo, error: rErr } = await ctx.supabase
    .from("regali")
    .insert({
      pollaio_id: ctx.pollaioId,
      contatto_id: c.id,
      quantita,
      note: args.note?.trim() || null,
    })
    .select("id")
    .single();
  if (rErr || !regalo) {
    console.error("[write] regalo insert", rErr);
    return { ok: false, errore: "Non sono riuscita a registrare il regalo." };
  }

  const { error: uErr } = await ctx.supabase
    .from("uova")
    .update({ stato: "regalato", regalo_id: regalo.id })
    .in(
      "id",
      rows.map((r) => r.id),
    );
  if (uErr) {
    // Rollback regalo
    await ctx.supabase.from("regali").delete().eq("id", regalo.id);
    console.error("[write] regalo update uova", uErr);
    return {
      ok: false,
      errore: "Non sono riuscita a marcare le uova come regalate.",
    };
  }
  return { ok: true, contatto: c.nome, quantita };
}

// ── aggiungi_contatto ─────────────────────────────────────
export async function aggiungi_contatto(
  args: {
    nome?: string;
    telefono?: string;
    relazione?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.nome?.trim();
  if (!nome) return { ok: false, errore: "Serve il nome del contatto." };
  const { error } = await ctx.supabase.from("contatti").insert({
    pollaio_id: ctx.pollaioId,
    nome,
    telefono: args.telefono?.trim() || null,
    relazione: args.relazione?.trim() || null,
    note: args.note?.trim() || null,
  });
  if (error) {
    console.error("[write] aggiungi_contatto", error);
    return { ok: false, errore: "Non sono riuscita ad aggiungere il contatto." };
  }
  return { ok: true, nome };
}

// ── marca_gallina_defunta ─────────────────────────────────
export async function marca_gallina_defunta(
  args: {
    gallina_nome?: string;
    data?: string;
    causa?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.gallina_nome?.trim();
  if (!nome) return { ok: false, errore: "Di quale gallina si tratta?" };
  const a = await trovaAnimale(ctx, nome);
  if (!a) {
    return {
      ok: false,
      errore: `Nessuna gallina di nome "${nome}" tra quelle attive.`,
    };
  }
  const { error } = await ctx.supabase
    .from("animali")
    .update({
      attivo: false,
      defunta_il: args.data?.trim() || oggiISO(),
      causa_decesso: args.causa?.trim() || null,
      note_decesso: args.note?.trim() || null,
    })
    .eq("id", a.id);
  if (error) {
    console.error("[write] marca_gallina_defunta", error);
    return { ok: false, errore: "Non sono riuscita ad aggiornare la scheda." };
  }
  return { ok: true, gallina: a.nome };
}

// ── aggiungi_nido ─────────────────────────────────────────
export async function aggiungi_nido(
  args: { nome?: string; note?: string },
  ctx: ToolContext,
) {
  const nome = args.nome?.trim();
  if (!nome) return { ok: false, errore: "Che nome ha il nido?" };
  // Calcola ordine = max(ordine) + 1
  const { data: ultimi } = await ctx.supabase
    .from("nidi")
    .select("ordine")
    .eq("pollaio_id", ctx.pollaioId)
    .order("ordine", { ascending: false })
    .limit(1);
  const ordine = ((ultimi?.[0]?.ordine ?? -1) as number) + 1;
  const { error } = await ctx.supabase.from("nidi").insert({
    pollaio_id: ctx.pollaioId,
    nome,
    note: args.note?.trim() || null,
    ordine,
  });
  if (error) {
    console.error("[write] aggiungi_nido", error);
    return { ok: false, errore: "Non sono riuscita ad aggiungere il nido." };
  }
  return { ok: true, nome };
}

// ── registra_evento_inserimento ──────────────────────────
export type TipoEventoInserimento =
  | "quarantena_inizio"
  | "quarantena_fine"
  | "presentazione_visiva_inizio"
  | "presentazione_visiva_fine"
  | "convivenza_inizio"
  | "completato"
  | "nota";

const TIPI_INSERIMENTO: TipoEventoInserimento[] = [
  "quarantena_inizio",
  "quarantena_fine",
  "presentazione_visiva_inizio",
  "presentazione_visiva_fine",
  "convivenza_inizio",
  "completato",
  "nota",
];

export async function registra_evento_inserimento(
  args: {
    gallina_nome?: string;
    tipo?: TipoEventoInserimento;
    data?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.gallina_nome?.trim();
  if (!nome) return { ok: false, errore: "Di quale gallina si tratta?" };
  if (!args.tipo || !TIPI_INSERIMENTO.includes(args.tipo)) {
    return {
      ok: false,
      errore:
        "Tipo evento mancante o non valido. Usa: quarantena_inizio/fine, presentazione_visiva_inizio/fine, convivenza_inizio, completato, nota.",
    };
  }
  const a = await trovaAnimale(ctx, nome);
  if (!a) {
    return {
      ok: false,
      errore: `Nessuna gallina di nome "${nome}" tra quelle attive.`,
    };
  }
  const { error } = await ctx.supabase.from("eventi_inserimento").insert({
    pollaio_id: ctx.pollaioId,
    animale_id: a.id,
    tipo: args.tipo,
    data: args.data?.trim() || oggiISO(),
    note: args.note?.trim() || null,
  });
  if (error) {
    console.error("[write] registra_evento_inserimento", error);
    return { ok: false, errore: "Non sono riuscita a registrare l'evento." };
  }
  return { ok: true, gallina: a.nome, tipo: args.tipo };
}

// ── aggiungi_scorta ───────────────────────────────────────
export async function aggiungi_scorta(
  args: {
    nome?: string;
    quantita?: number;
    soglia_avviso?: number;
    unita?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.nome?.trim();
  if (!nome) return { ok: false, errore: "Che nome ha la scorta?" };
  const { error } = await ctx.supabase.from("scorte_cibo").insert({
    pollaio_id: ctx.pollaioId,
    nome,
    quantita: typeof args.quantita === "number" ? args.quantita : null,
    soglia_avviso:
      typeof args.soglia_avviso === "number" ? args.soglia_avviso : null,
    unita: args.unita?.trim() || null,
  });
  if (error) {
    console.error("[write] aggiungi_scorta", error);
    return { ok: false, errore: "Non sono riuscita ad aggiungere la scorta." };
  }
  return { ok: true, nome };
}

// ── crea_voce_manutenzione ────────────────────────────────
export async function crea_voce_manutenzione(
  args: {
    nome?: string;
    frequenza_giorni?: number;
    icona?: string;
    dove?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.nome?.trim();
  const freq = args.frequenza_giorni;
  if (!nome) return { ok: false, errore: "Che nome ha la manutenzione?" };
  if (typeof freq !== "number" || freq <= 0) {
    return { ok: false, errore: "Ogni quanti giorni va fatta? (numero > 0)" };
  }
  const { error } = await ctx.supabase.from("manutenzioni_voci").insert({
    pollaio_id: ctx.pollaioId,
    nome,
    frequenza_giorni: Math.round(freq),
    icona: args.icona?.trim() || "🧹",
    dove: args.dove?.trim() || null,
    note: args.note?.trim() || null,
    attivo: true,
  });
  if (error) {
    console.error("[write] crea_voce_manutenzione", error);
    return { ok: false, errore: "Non sono riuscita a creare la voce." };
  }
  return { ok: true, nome, frequenza_giorni: Math.round(freq) };
}

// ── archivia_nota / ripristina_nota ───────────────────────
async function _toggleArchivia(
  args: { testo?: string },
  ctx: ToolContext,
  archivia: boolean,
) {
  const testo = args.testo?.trim();
  if (!testo)
    return { ok: false, errore: "Quale nota? Indicane parte del testo." };
  const { data: candidati } = await ctx.supabase
    .from("note")
    .select("id, testo")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("archiviata", !archivia)
    .ilike("testo", `%${testo}%`)
    .limit(3);
  const rows = candidati ?? [];
  if (rows.length === 0) {
    return {
      ok: false,
      errore: archivia
        ? `Nessuna nota attiva che contenga "${testo}".`
        : `Nessuna nota archiviata che contenga "${testo}".`,
    };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      errore: `Più note corrispondono ("${rows.map((r) => r.testo.slice(0, 40)).join(" / ")}"). Sii più specifico.`,
    };
  }
  const target = rows[0]!;
  const { error } = await ctx.supabase
    .from("note")
    .update({ archiviata: archivia })
    .eq("id", target.id);
  if (error) {
    console.error("[write] _toggleArchivia", error);
    return { ok: false, errore: "Non sono riuscita ad aggiornare la nota." };
  }
  return { ok: true, nota: target.testo.slice(0, 80) };
}

export function archivia_nota(args: { testo?: string }, ctx: ToolContext) {
  return _toggleArchivia(args, ctx, true);
}

export function ripristina_nota(args: { testo?: string }, ctx: ToolContext) {
  return _toggleArchivia(args, ctx, false);
}

// ── registra_muta ─────────────────────────────────────────
export async function registra_muta(
  args: {
    gallina_nome?: string;
    azione?: "inizio" | "fine";
    data?: string;
    note?: string;
  },
  ctx: ToolContext,
) {
  const nome = args.gallina_nome?.trim();
  const azione = args.azione;
  if (!nome) return { ok: false, errore: "Di quale gallina si tratta?" };
  if (azione !== "inizio" && azione !== "fine") {
    return {
      ok: false,
      errore: "Specifica azione: 'inizio' o 'fine'.",
    };
  }
  const a = await trovaAnimale(ctx, nome);
  if (!a) {
    return {
      ok: false,
      errore: `Nessuna gallina di nome "${nome}" tra quelle attive.`,
    };
  }
  const oggi = args.data?.trim() || oggiISO();
  if (azione === "inizio") {
    const { error } = await ctx.supabase.from("periodi_muta").insert({
      pollaio_id: ctx.pollaioId,
      animale_id: a.id,
      data_inizio: oggi,
      note: args.note?.trim() || null,
    });
    if (error) {
      console.error("[write] registra_muta inizio", error);
      return { ok: false, errore: "Non sono riuscita ad aprire la muta." };
    }
    return { ok: true, gallina: a.nome, azione: "inizio" };
  }
  // azione === "fine": chiudi l'ultima muta aperta
  const { data: aperte } = await ctx.supabase
    .from("periodi_muta")
    .select("id")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("animale_id", a.id)
    .is("data_fine", null)
    .order("data_inizio", { ascending: false })
    .limit(1);
  const target = aperte?.[0];
  if (!target) {
    return {
      ok: false,
      errore: `Nessuna muta aperta per ${a.nome}.`,
    };
  }
  const { error } = await ctx.supabase
    .from("periodi_muta")
    .update({ data_fine: oggi })
    .eq("id", target.id);
  if (error) {
    console.error("[write] registra_muta fine", error);
    return { ok: false, errore: "Non sono riuscita a chiudere la muta." };
  }
  return { ok: true, gallina: a.nome, azione: "fine" };
}

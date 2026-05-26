import type { ToolContext } from "./read-tools";

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
export async function crea_nota(
  args: { testo?: string; tag?: "osservazione" | "idea" | "promemoria" },
  ctx: ToolContext,
) {
  const testo = args.testo?.trim();
  if (!testo) {
    return { ok: false, errore: "Manca il testo della nota." };
  }
  const tag = args.tag && ["osservazione", "idea", "promemoria"].includes(args.tag)
    ? args.tag
    : null;
  const { error } = await ctx.supabase.from("note").insert({
    pollaio_id: ctx.pollaioId,
    testo,
    tag,
  });
  if (error) {
    console.error("[write] crea_nota", error);
    return { ok: false, errore: "Non sono riuscita a salvare la nota." };
  }
  return { ok: true, tag: tag ?? "nota" };
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
  // Seleziona le uova fresche più vecchie (FIFO)
  let q = ctx.supabase
    .from("uova")
    .select("id, data_deposizione")
    .eq("pollaio_id", ctx.pollaioId)
    .eq("stato", "fresco")
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
        ? `Nessun uovo fresco di ${gallinaNome} da consumare.`
        : "Nessun uovo fresco in scorta.",
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

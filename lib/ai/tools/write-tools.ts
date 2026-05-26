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

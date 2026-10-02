"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import type { Conservazione } from "@/lib/utils/uova";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface PrimoUovo {
  animaleId: string;
  nome: string;
  fotoUrl: string | null;
}

// ── NIDI ──────────────────────────────────────────────────

export async function createNido(input: {
  nome: string;
  note: string | null;
}): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("nidi")
    .insert({
      pollaio_id: pollaio.id,
      nome: input.nome.trim(),
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Non sono riuscita ad aggiungere il nido." };
  revalidatePath("/uova");
  revalidatePath("/uova/nidi");
  return { ok: true, id: data.id };
}

export async function updateNido(
  id: string,
  input: { nome: string; note: string | null },
): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("nidi")
    .update({
      nome: input.nome.trim(),
      note: input.note?.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a salvare il nido." };
  revalidatePath("/uova");
  revalidatePath("/uova/nidi");
  return { ok: true };
}

export async function deleteNido(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("nidi").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare il nido." };
  revalidatePath("/uova");
  revalidatePath("/uova/nidi");
  return { ok: true };
}

// ── UOVA ──────────────────────────────────────────────────

export interface NuovoUovoInput {
  id: string;
  animaleId: string | null;       // null = "non so"
  nidoId: string | null;
  dataDeposizione: string;        // ISO timestamp
  conservazione: Conservazione;
  note: string | null;
  fotoUrl: string | null;
}

export async function createUovo(
  input: NuovoUovoInput,
): Promise<ActionResult & { primeUova?: PrimoUovo[]; nonCommestibile?: boolean }> {
  const { supabase, pollaio } = await requireAdminPollaio();

  // Detection PRE-insert: se la gallina è specificata e non ha uova,
  // è candidata a "primo uovo".
  let isPrimo = false;
  if (input.animaleId) {
    const { count } = await supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("animale_id", input.animaleId);
    isPrimo = (count ?? 0) === 0;
  }

  // Lo stato lo decide il trigger del DB: 'non_commestibile' se l'uovo cade
  // in una sospensione (farmaci) attiva per quella gallina.
  const { data: inserito, error } = await supabase
    .from("uova")
    .insert({
      id: input.id,
      pollaio_id: pollaio.id,
      animale_id: input.animaleId,
      nido_id: input.nidoId,
      data_deposizione: input.dataDeposizione,
      conservazione: input.conservazione,
      note: input.note?.trim() || null,
      foto_url: input.fotoUrl,
    })
    .select("stato")
    .single();
  if (error) return { ok: false, error: "Ops, non sono riuscita a registrare l'uovo." };

  let primeUova: PrimoUovo[] | undefined;
  if (isPrimo && input.animaleId) {
    const { data: gallina } = await supabase
      .from("animali")
      .select("nome, foto_url")
      .eq("id", input.animaleId)
      .maybeSingle();
    if (gallina) {
      primeUova = [
        {
          animaleId: input.animaleId,
          nome: gallina.nome,
          fotoUrl: gallina.foto_url,
        },
      ];
    }
  }

  revalidatePath("/uova");
  revalidatePath("/");
  return {
    ok: true,
    id: input.id,
    primeUova,
    nonCommestibile: inserito?.stato === "non_commestibile",
  };
}

/**
 * Crea più uova in un'unica operazione (raccolta veloce).
 * Ogni "riga" definisce gallina + nido + quantità: produciamo N record
 * per ogni riga, tutti con la stessa data/conservazione/note globali.
 */
export interface CreaUovaBulkRiga {
  animaleId: string | null;     // null = "non so"
  nidoId: string | null;
  quantita: number;
}

export interface CreaUovaBulkInput {
  dataDeposizione: string;       // ISO timestamp
  conservazione: Conservazione;
  noteGlobali: string | null;
  righe: CreaUovaBulkRiga[];
}

export async function createUovaBulk(
  input: CreaUovaBulkInput,
): Promise<
  ActionResult & { creati?: number; nonCommestibili?: number; primeUova?: PrimoUovo[] }
> {
  const { supabase, pollaio } = await requireAdminPollaio();

  const note = input.noteGlobali?.trim() || null;
  type Row = {
    pollaio_id: string;
    animale_id: string | null;
    nido_id: string | null;
    data_deposizione: string;
    conservazione: Conservazione;
    note: string | null;
  };
  const rows: Row[] = [];
  for (const r of input.righe) {
    const q = Math.max(0, Math.floor(r.quantita));
    for (let i = 0; i < q; i++) {
      rows.push({
        pollaio_id: pollaio.id,
        animale_id: r.animaleId,
        nido_id: r.nidoId,
        data_deposizione: input.dataDeposizione,
        conservazione: input.conservazione,
        note,
      });
    }
  }

  if (rows.length === 0) {
    return { ok: false, error: "Aggiungi almeno un uovo prima di salvare." };
  }

  // Detection PRE-insert: trova le galline distinte non-null
  // che NON hanno ancora uova nel DB.
  const animaleIdsDistinct = Array.from(
    new Set(
      input.righe
        .map((r) => r.animaleId)
        .filter((id): id is string => id !== null),
    ),
  );

  const animaliConUova = new Set<string>();
  if (animaleIdsDistinct.length > 0) {
    const { data: esistenti } = await supabase
      .from("uova")
      .select("animale_id")
      .in("animale_id", animaleIdsDistinct);
    for (const row of esistenti ?? []) {
      if (row.animale_id) animaliConUova.add(row.animale_id);
    }
  }
  const animaliPrime = animaleIdsDistinct.filter((id) => !animaliConUova.has(id));

  const { data: inserite, error } = await supabase.from("uova").insert(rows).select("stato");
  if (error) {
    return { ok: false, error: "Ops, non sono riuscita a registrare le uova." };
  }
  const nonCommestibili = (inserite ?? []).filter((u) => u.stato === "non_commestibile").length;

  let primeUova: PrimoUovo[] | undefined;
  if (animaliPrime.length > 0) {
    const { data: galline } = await supabase
      .from("animali")
      .select("id, nome, foto_url")
      .in("id", animaliPrime);
    primeUova = (galline ?? []).map((g) => ({
      animaleId: g.id,
      nome: g.nome,
      fotoUrl: g.foto_url,
    }));
  }

  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true, creati: rows.length, nonCommestibili, primeUova };
}

export async function deleteUovo(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase.from("uova").delete().eq("id", id);
  if (error) return { ok: false, error: "Non sono riuscita a eliminare l'uovo." };
  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true };
}

export async function consumaUovo(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  // Solo uova disponibili: un uovo in sospensione non si mangia.
  const { data, error } = await supabase
    .from("uova")
    .update({
      stato: "consumato",
      data_consumato: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("stato", "disponibile")
    .select("id");
  if (error) return { ok: false, error: "Ops, riprova!" };
  if (!data || data.length === 0) {
    return { ok: false, error: "Quest'uovo non è disponibile." };
  }
  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true };
}

/** Butta via un uovo (tipicamente uno non commestibile per sospensione). */
export async function scartaUovo(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("uova")
    .update({ stato: "scartato" })
    .eq("id", id)
    .in("stato", ["disponibile", "non_commestibile"]);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/uova");
  revalidatePath("/uova/sospensioni");
  revalidatePath("/");
  return { ok: true };
}

/** Segna come scartate tutte le uova non commestibili del pollaio. */
export async function scartaUovaNonCommestibili(): Promise<ActionResult & { scartate?: number }> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { data, error } = await supabase
    .from("uova")
    .update({ stato: "scartato" })
    .eq("pollaio_id", pollaio.id)
    .eq("stato", "non_commestibile")
    .select("id");
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/uova");
  revalidatePath("/uova/sospensioni");
  revalidatePath("/");
  return { ok: true, scartate: data?.length ?? 0 };
}

export async function ripristinaUovo(
  id: string,
): Promise<ActionResult & { nonCommestibile?: boolean }> {
  const { supabase } = await requireAdminPollaio();
  // Se l'uovo cade in una sospensione, il trigger del DB lo riporta a
  // 'non_commestibile' invece che a 'disponibile'.
  const { data, error } = await supabase
    .from("uova")
    .update({
      stato: "disponibile",
      data_consumato: null,
      regalo_id: null,
    })
    .eq("id", id)
    .select("stato")
    .single();
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true, nonCommestibile: data?.stato === "non_commestibile" };
}

export async function aggiornaConservazione(
  id: string,
  conservazione: Conservazione,
): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("uova")
    .update({ conservazione })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/uova");
  return { ok: true };
}

// ── REGALI ────────────────────────────────────────────────

export interface RegaloInput {
  quantita: number;
  contattoId: string;
  note: string | null;
}

export async function regalaUova(input: RegaloInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();

  if (input.quantita < 1) return { ok: false, error: "Quantità non valida." };

  // 1. Trova N uova disponibili (più vecchie prima — FIFO)
  const { data: candidate, error: selErr } = await supabase
    .from("uova")
    .select("id")
    .eq("pollaio_id", pollaio.id)
    .eq("stato", "disponibile")
    .order("data_deposizione", { ascending: true })
    .limit(input.quantita);

  if (selErr) return { ok: false, error: "Ops, riprova!" };
  if (!candidate || candidate.length < input.quantita) {
    return {
      ok: false,
      error: `Hai solo ${candidate?.length ?? 0} uova disponibili.`,
    };
  }

  // 2. Crea il regalo
  const { data: regalo, error: rErr } = await supabase
    .from("regali")
    .insert({
      pollaio_id: pollaio.id,
      contatto_id: input.contattoId,
      quantita: input.quantita,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();

  if (rErr) return { ok: false, error: "Ops, non sono riuscita a registrare il regalo." };

  // 3. Marca le uova come regalate puntando al regalo appena creato.
  // Il filtro sullo stato ripete il controllo: un uovo bloccato da una
  // sospensione registrata nel frattempo non deve partire.
  const ids = candidate.map((u) => u.id);
  const { data: regalate, error: uErr } = await supabase
    .from("uova")
    .update({ stato: "regalato", regalo_id: regalo.id })
    .in("id", ids)
    .eq("stato", "disponibile")
    .select("id");

  if (uErr || (regalate?.length ?? 0) < ids.length) {
    // Rollback: rimette in scorta le uova eventualmente segnate (il trigger
    // ricalcola lo stato) ed elimina il regalo.
    await supabase
      .from("uova")
      .update({ stato: "disponibile", regalo_id: null })
      .eq("regalo_id", regalo.id);
    await supabase.from("regali").delete().eq("id", regalo.id);
    return { ok: false, error: "Le scorte sono cambiate nel frattempo, riprova!" };
  }

  revalidatePath("/uova");
  revalidatePath("/rubrica");
  revalidatePath("/");
  return { ok: true, id: regalo.id };
}

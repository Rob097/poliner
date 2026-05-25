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
): Promise<ActionResult & { primeUova?: PrimoUovo[] }> {
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

  const { error } = await supabase.from("uova").insert({
    id: input.id,
    pollaio_id: pollaio.id,
    animale_id: input.animaleId,
    nido_id: input.nidoId,
    data_deposizione: input.dataDeposizione,
    conservazione: input.conservazione,
    note: input.note?.trim() || null,
    foto_url: input.fotoUrl,
  });
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
  return { ok: true, id: input.id, primeUova };
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
): Promise<ActionResult & { creati?: number; primeUova?: PrimoUovo[] }> {
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

  const { error } = await supabase.from("uova").insert(rows);
  if (error) {
    return { ok: false, error: "Ops, non sono riuscita a registrare le uova." };
  }

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
  return { ok: true, creati: rows.length, primeUova };
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
  const { error } = await supabase
    .from("uova")
    .update({
      stato: "consumato",
      data_consumato: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true };
}

export async function ripristinaUovo(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdminPollaio();
  const { error } = await supabase
    .from("uova")
    .update({
      stato: "disponibile",
      data_consumato: null,
      regalo_id: null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Ops, riprova!" };
  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true };
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

  // 3. Marca le uova come regalate puntando al regalo appena creato
  const ids = candidate.map((u) => u.id);
  const { error: uErr } = await supabase
    .from("uova")
    .update({ stato: "regalato", regalo_id: regalo.id })
    .in("id", ids);

  if (uErr) {
    // Rollback: elimina il regalo se l'aggiornamento delle uova fallisce
    await supabase.from("regali").delete().eq("id", regalo.id);
    return { ok: false, error: "Ops, riprova!" };
  }

  revalidatePath("/uova");
  revalidatePath("/rubrica");
  revalidatePath("/");
  return { ok: true, id: regalo.id };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { dateIsoInTimeZone } from "@/lib/utils/date";
import {
  SOSPENSIONE_SELECT,
  aggiungiGiorni,
  coinvolgeGallina,
  daRigaSospensione,
  type SospensioneUova,
} from "@/lib/utils/sospensioni";

type Supa = SupabaseClient<Database>;

/**
 * Sospensioni uova del pollaio, dalla più recente.
 * - `daFine`: solo quelle con data_fine >= questa data (es. in corso + future).
 * - `animaleId`: solo quelle che coinvolgono la gallina (o tutto il pollaio).
 */
export async function caricaSospensioni(
  supabase: Supa,
  pollaioId: string,
  opts: { daFine?: string; animaleId?: string } = {},
): Promise<SospensioneUova[]> {
  let q = supabase
    .from("sospensioni_uova")
    .select(SOSPENSIONE_SELECT)
    .eq("pollaio_id", pollaioId)
    .order("data_fine", { ascending: false })
    .order("data_inizio", { ascending: false });
  if (opts.daFine) q = q.gte("data_fine", opts.daFine);
  if (opts.animaleId) q = q.or(`tutte.eq.true,animale_ids.cs.{${opts.animaleId}}`);

  const { data, error } = await q;
  if (error) {
    console.error("[sospensioni] caricaSospensioni:", error.message);
    return [];
  }
  return (data ?? []).map(daRigaSospensione);
}

/** id → nome di tutti gli animali del pollaio (anche defunti, per lo storico). */
export async function caricaNomiAnimali(
  supabase: Supa,
  pollaioId: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("animali")
    .select("id, nome")
    .eq("pollaio_id", pollaioId);
  if (error) console.error("[sospensioni] caricaNomiAnimali:", error.message);
  return new Map((data ?? []).map((a) => [a.id, a.nome]));
}

export interface RiepilogoUovaSospensione {
  /** Uova in scorta segnate come non commestibili da questa sospensione. */
  marcate: number;
  /**
   * Uova del periodo (galline coinvolte) già consumate o regalate prima che
   * la sospensione venisse registrata: utile per avvisare l'utente.
   */
  giaUsate: number;
}

export async function riepilogoUovaSospensione(
  supabase: Supa,
  pollaioId: string,
  s: SospensioneUova,
): Promise<RiepilogoUovaSospensione> {
  const [marcateRes, usateRes] = await Promise.all([
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("sospensione_id", s.id)
      .eq("stato", "non_commestibile"),
    // Finestra larga in UTC, poi filtro preciso sul giorno italiano.
    supabase
      .from("uova")
      .select("animale_id, data_deposizione")
      .eq("pollaio_id", pollaioId)
      .in("stato", ["consumato", "regalato"])
      .gte("data_deposizione", aggiungiGiorni(s.dataInizio, -1))
      .lt("data_deposizione", aggiungiGiorni(s.dataFine, 2)),
  ]);
  if (marcateRes.error) {
    console.error("[sospensioni] riepilogo marcate:", marcateRes.error.message);
  }
  if (usateRes.error) {
    console.error("[sospensioni] riepilogo già usate:", usateRes.error.message);
  }

  const giaUsate = (usateRes.data ?? []).filter((u) => {
    const giorno = dateIsoInTimeZone(new Date(u.data_deposizione));
    return (
      giorno >= s.dataInizio && giorno <= s.dataFine && coinvolgeGallina(s, u.animale_id)
    );
  }).length;

  return { marcate: marcateRes.count ?? 0, giaUsate };
}

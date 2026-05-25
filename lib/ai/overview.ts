import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface PollaioOverview {
  galline_attive: number;
  galline_defunte: number;
  ultima_data_uovo: string | null;
  uova_ultimi_7_giorni: number;
  scorte_sotto_soglia: Array<{
    nome: string;
    quantita: number | null;
    soglia: number | null;
    unita: string | null;
  }>;
  manutenzioni_in_ritardo: number;
  note_attive: number;
  lista_spesa_da_comprare: number;
}

function dataIsoGiorniFa(giorni: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - giorni);
  return d.toISOString().slice(0, 10);
}

export async function buildOverview(
  supabase: SupabaseClient<Database>,
  pollaioId: string,
): Promise<PollaioOverview> {
  const dal7 = dataIsoGiorniFa(7);
  const [
    galline,
    ultimoUovo,
    uova7,
    scorte,
    voci,
    esec,
    note,
    spesa,
  ] = await Promise.all([
    supabase
      .from("animali")
      .select("attivo")
      .eq("pollaio_id", pollaioId)
      .eq("tipo", "gallina"),
    supabase
      .from("uova")
      .select("data_deposizione")
      .eq("pollaio_id", pollaioId)
      .order("data_deposizione", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .gte("data_deposizione", dal7),
    supabase
      .from("scorte_cibo")
      .select("nome, quantita, unita, soglia_avviso")
      .eq("pollaio_id", pollaioId),
    supabase
      .from("manutenzioni_voci")
      .select("id, frequenza_giorni")
      .eq("pollaio_id", pollaioId)
      .eq("attivo", true),
    supabase
      .from("manutenzioni")
      .select("voce_id, data")
      .eq("pollaio_id", pollaioId)
      .order("data", { ascending: false }),
    supabase
      .from("note")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("archiviata", false),
    supabase
      .from("lista_spesa")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("comprato", false),
  ]);

  const gallineRows = galline.data ?? [];
  const attive = gallineRows.filter((g) => g.attivo).length;
  const defunte = gallineRows.length - attive;

  const sottoSoglia = (scorte.data ?? [])
    .filter(
      (s) =>
        s.quantita != null &&
        s.soglia_avviso != null &&
        s.quantita < s.soglia_avviso,
    )
    .map((s) => ({
      nome: s.nome,
      quantita: s.quantita,
      soglia: s.soglia_avviso,
      unita: s.unita,
    }));

  const ultimaPerVoce = new Map<string, string>();
  for (const e of esec.data ?? []) {
    if (!ultimaPerVoce.has(e.voce_id)) ultimaPerVoce.set(e.voce_id, e.data);
  }
  const oggi = new Date();
  let inRitardo = 0;
  for (const v of voci.data ?? []) {
    const ultima = ultimaPerVoce.get(v.id);
    if (!ultima) {
      inRitardo += 1;
      continue;
    }
    const giorni = Math.floor(
      (oggi.getTime() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (giorni >= v.frequenza_giorni) inRitardo += 1;
  }

  return {
    galline_attive: attive,
    galline_defunte: defunte,
    ultima_data_uovo: ultimoUovo.data?.data_deposizione ?? null,
    uova_ultimi_7_giorni: uova7.count ?? 0,
    scorte_sotto_soglia: sottoSoglia,
    manutenzioni_in_ritardo: inRitardo,
    note_attive: note.count ?? 0,
    lista_spesa_da_comprare: spesa.count ?? 0,
  };
}

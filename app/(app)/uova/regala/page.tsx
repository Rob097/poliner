import { requirePollaio } from "@/lib/supabase/queries";
import { RegalaUovaForm } from "./RegalaUovaForm";

export const dynamic = "force-dynamic";

export default async function RegalaUovaPage() {
  const { supabase, pollaio } = await requirePollaio();

  const [contattiRes, countRes, regaliRes] = await Promise.all([
    supabase
      .from("contatti")
      .select("id, nome, relazione")
      .eq("pollaio_id", pollaio.id)
      .order("nome"),
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaio.id)
      .eq("stato", "disponibile"),
    supabase
      .from("regali")
      .select("contatto_id, quantita")
      .eq("pollaio_id", pollaio.id),
  ]);

  const totaleMap = new Map<string, number>();
  for (const r of regaliRes.data ?? []) {
    if (!r.contatto_id) continue;
    totaleMap.set(r.contatto_id, (totaleMap.get(r.contatto_id) ?? 0) + r.quantita);
  }

  const contatti = (contattiRes.data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    relazione: c.relazione,
    totale: totaleMap.get(c.id) ?? 0,
  }));

  return (
    <RegalaUovaForm
      contatti={contatti}
      disponibili={countRes.count ?? 0}
    />
  );
}

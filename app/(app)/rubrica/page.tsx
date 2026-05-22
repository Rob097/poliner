import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { RubricaClient } from "./RubricaClient";

export const dynamic = "force-dynamic";

export default async function RubricaPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  // Tutti i contatti
  const { data: contatti } = await supabase
    .from("contatti")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .order("nome");

  const cIds = (contatti ?? []).map((c) => c.id);

  // Aggregazione regali per contatto (sum quantita, count, ultima data)
  const { data: regaliRaw } = cIds.length > 0
    ? await supabase
        .from("regali")
        .select("contatto_id, quantita, data")
        .in("contatto_id", cIds)
    : { data: [] as { contatto_id: string | null; quantita: number; data: string }[] };

  const aggregati = new Map<
    string,
    { totale: number; volte: number; ultimaData: string | null }
  >();
  for (const r of regaliRaw ?? []) {
    if (!r.contatto_id) continue;
    const cur = aggregati.get(r.contatto_id) ?? {
      totale: 0,
      volte: 0,
      ultimaData: null,
    };
    cur.totale += r.quantita;
    cur.volte += 1;
    if (!cur.ultimaData || r.data > cur.ultimaData) cur.ultimaData = r.data;
    aggregati.set(r.contatto_id, cur);
  }

  const items = (contatti ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    relazione: c.relazione,
    telefono: c.telefono,
    note: c.note,
    ...(aggregati.get(c.id) ?? { totale: 0, volte: 0, ultimaData: null }),
  }));

  return (
    <>
      <Header
        title="Rubrica"
        subtitle={items.length === 0 ? "Aggiungi il primo contatto" : "I tuoi contatti del pollaio"}
      />
      <ScreenContainer>
        <RubricaClient items={items} />
      </ScreenContainer>
    </>
  );
}

import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ScorteClient, type ScortaItem } from "./ScorteClient";

export const dynamic = "force-dynamic";

export default async function ScortePage() {
  const { supabase, pollaio } = await requirePollaio();

  const { data: scorte } = await supabase
    .from("scorte_cibo")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .order("nome");

  const items: ScortaItem[] = (scorte ?? []).map((s) => ({
    id: s.id,
    nome: s.nome,
    quantita: s.quantita !== null ? Number(s.quantita) : null,
    unita: s.unita,
    sogliaAvviso: s.soglia_avviso !== null ? Number(s.soglia_avviso) : null,
  }));

  // Autocomplete: nomi già usati
  const nomiUsati = Array.from(new Set(items.map((i) => i.nome)));

  return (
    <>
      <Header
        title="Scorte cibo"
        subtitle={
          items.length === 0
            ? "Tieni traccia di mais, pellet, lettiera..."
            : `${items.length} voce${items.length === 1 ? "" : "i"}`
        }
      />
      <ScreenContainer>
        <ScorteClient items={items} nomiUsati={nomiUsati} />
      </ScreenContainer>
    </>
  );
}

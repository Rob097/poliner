import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SpeseClient, type SpesaItem } from "./SpeseClient";

export const dynamic = "force-dynamic";

export default async function SpesePage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  // Fetch tutte le spese (ordinate desc)
  const { data: spese } = await supabase
    .from("spese")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .order("data", { ascending: false });

  // Fetch tutte le uova prodotte (per costo per uovo) — solo ID + data
  const { data: uova } = await supabase
    .from("uova")
    .select("data_deposizione")
    .eq("pollaio_id", pollaio.id);

  const items: SpesaItem[] = (spese ?? []).map((s) => ({
    id: s.id,
    data: s.data,
    importo: Number(s.importo_euro),
    descrizione: s.descrizione,
    categoria: s.categoria,
    note: s.note,
  }));

  const dateUova = (uova ?? []).map((u) => u.data_deposizione);

  // Lista autocomplete dalle descrizioni precedenti
  const suggerimenti = Array.from(
    new Set(items.map((s) => s.descrizione).filter(Boolean)),
  );

  return (
    <>
      <Header title="Registro spese" />
      <ScreenContainer>
        <SpeseClient
          spese={items}
          uovaDate={dateUova}
          suggerimenti={suggerimenti}
        />
      </ScreenContainer>
    </>
  );
}

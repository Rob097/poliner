import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { NoteClient, type NotaItem } from "./NoteClient";

export const dynamic = "force-dynamic";

interface SearchParams {
  nuova?: string;
}

export default async function NotePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, pollaio } = await requirePollaio();

  const { data: note } = await supabase
    .from("note")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .eq("archiviata", false)
    .order("data", { ascending: false });

  const items: NotaItem[] = (note ?? []).map((n) => ({
    id: n.id,
    testo: n.testo,
    data: n.data,
    tag: n.tag as NotaItem["tag"],
    fotoUrl: n.foto_url,
    promemoriaData: n.promemoria_data,
    promemoriaCanale: n.promemoria_canale as NotaItem["promemoriaCanale"],
    promemoriaInviato: n.promemoria_inviato,
  }));

  const apriNuova = searchParams.nuova === "1";

  return (
    <>
      <Header
        title="Note e promemoria"
        subtitle={
          items.length === 0
            ? "Appunta tutto quello che ti viene in mente"
            : `${items.length} not${items.length === 1 ? "a" : "e"}`
        }
      />
      <ScreenContainer>
        <NoteClient items={items} apriNuova={apriNuova} />
      </ScreenContainer>
    </>
  );
}

import { requireAdminPollaio } from "@/lib/supabase/queries";
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
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: note } = await supabase
    .from("note")
    .select("*")
    .eq("pollaio_id", pollaio.id)
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
    archiviata: !!n.archiviata,
  }));

  const apriNuova = resolvedSearchParams.nuova === "1";

  return (
    <ScreenContainer
      header={(
        <Header
          title="Note e promemoria"
          subtitle={(() => {
            const attive = items.filter((n) => !n.archiviata).length;
            if (items.length === 0) return "Appunta tutto quello che ti viene in mente";
            return `${attive} not${attive === 1 ? "a" : "e"}`;
          })()}
        />
      )}
    >
      <NoteClient items={items} apriNuova={apriNuova} />
    </ScreenContainer>
  );
}

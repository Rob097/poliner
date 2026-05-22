import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { InMemoriaList, type InMemoriaItem } from "./InMemoriaList";

export const dynamic = "force-dynamic";

export default async function GallineInMemoriaPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: animali } = await supabase
    .from("animali")
    .select(
      "id, nome, tipo, razza_id, razza_custom, data_nascita, foto_url, defunta_il, causa_decesso",
    )
    .eq("pollaio_id", pollaio.id)
    .not("defunta_il", "is", null)
    .order("defunta_il", { ascending: false });

  const lista: InMemoriaItem[] = (animali ?? []) as InMemoriaItem[];

  return (
    <ScreenContainer
      header={(
        <Header
          title="In memoria"
          subtitle={`${lista.length} ${lista.length === 1 ? "ricordata" : "ricordate"}`}
        />
      )}
    >
      {lista.length === 0 ? (
        <EmptyState
          icon="🤍"
          title="Nessuna in memoria"
          subtitle="Le galline che hai segnato come defunte appariranno qui, con tutto il loro storico."
        />
      ) : (
        <InMemoriaList items={lista} />
      )}
    </ScreenContainer>
  );
}

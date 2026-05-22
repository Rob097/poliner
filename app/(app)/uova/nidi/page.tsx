import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { NidiManager } from "./NidiManager";

export const dynamic = "force-dynamic";

export default async function NidiPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: nidi } = await supabase
    .from("nidi")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .order("ordine", { ascending: true })
    .order("nome");

  const nIds = (nidi ?? []).map((n) => n.id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: uovaPerNido } = nIds.length > 0
    ? await supabase
        .from("uova")
        .select("nido_id")
        .in("nido_id", nIds)
        .gte("data_deposizione", sevenDaysAgo)
    : { data: [] as { nido_id: string | null }[] };

  const counts = new Map<string, number>();
  for (const u of uovaPerNido ?? []) {
    if (!u.nido_id) continue;
    counts.set(u.nido_id, (counts.get(u.nido_id) ?? 0) + 1);
  }

  const items = (nidi ?? []).map((n) => ({
    id: n.id,
    nome: n.nome,
    note: n.note,
    uovaSettimana: counts.get(n.id) ?? 0,
  }));

  return (
    <>
      <Header title="Gestione nidi" subtitle={`${items.length} nid${items.length === 1 ? "o" : "i"}`} />
      <ScreenContainer>
        <NidiManager items={items} />
      </ScreenContainer>
    </>
  );
}

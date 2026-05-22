import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ListaSpesaClient, type VoceLista } from "./ListaSpesaClient";

export const dynamic = "force-dynamic";

export default async function ListaSpesaPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: voci } = await supabase
    .from("lista_spesa")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .order("comprato", { ascending: true })
    .order("created_at", { ascending: false });

  const items: VoceLista[] = (voci ?? []).map((v) => ({
    id: v.id,
    testo: v.testo,
    categoria: v.categoria as VoceLista["categoria"],
    quantita: v.quantita,
    comprato: v.comprato,
  }));

  return <ListaSpesaClient items={items} pollaioNome={pollaio.nome} />;
}

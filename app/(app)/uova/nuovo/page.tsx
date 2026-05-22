import { requireAdminPollaio } from "@/lib/supabase/queries";
import { NuovoUovoForm } from "./NuovoUovoForm";

export const dynamic = "force-dynamic";

export default async function NuovoUovoPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  const [animaliRes, nidiRes] = await Promise.all([
    supabase
      .from("animali")
      .select("id, nome, tipo, foto_url")
      .eq("pollaio_id", pollaio.id)
      .eq("tipo", "gallina")
      .eq("attivo", true)
      .order("nome"),
    supabase
      .from("nidi")
      .select("id, nome")
      .eq("pollaio_id", pollaio.id)
      .order("ordine")
      .order("nome"),
  ]);

  return (
    <NuovoUovoForm
      galline={(animaliRes.data ?? []).map((a) => ({
        id: a.id,
        nome: a.nome,
        fotoUrl: a.foto_url,
      }))}
      nidi={(nidiRes.data ?? []).map((n) => ({ id: n.id, nome: n.nome }))}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { ModificaGallinaForm } from "./ModificaGallinaForm";

export const dynamic = "force-dynamic";

export default async function ModificaGallinaPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: animale } = await supabase
    .from("animali")
    .select("*")
    .eq("id", params.id)
    .eq("pollaio_id", pollaio.id)
    .maybeSingle();

  if (!animale) notFound();
  if (!animale.attivo) redirect("/galline");

  return (
    <ModificaGallinaForm
      initial={{
        id: animale.id,
        nome: animale.nome,
        tipo: animale.tipo as "gallina" | "gallo",
        razzaId: animale.razza_id,
        razzaCustom: animale.razza_custom,
        dataNascita: animale.data_nascita,
        colorePiumaggio: animale.colore_piumaggio,
        note: animale.note,
        descrizionePubblica: animale.descrizione_pubblica,
        fotoUrl: animale.foto_url,
      }}
    />
  );
}

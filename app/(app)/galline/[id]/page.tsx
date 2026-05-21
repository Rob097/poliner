import { notFound, redirect } from "next/navigation";
import { requirePollaio } from "@/lib/supabase/queries";
import { ChickenDetail, type ChickenData } from "./ChickenDetail";

export const dynamic = "force-dynamic";

export default async function GallinaPage({ params }: { params: { id: string } }) {
  const { supabase, pollaio } = await requirePollaio();

  const { data: animale } = await supabase
    .from("animali")
    .select("*")
    .eq("id", params.id)
    .eq("pollaio_id", pollaio.id)
    .maybeSingle();

  if (!animale) notFound();
  // Mostriamo le defunte in detail (per consultare lo storico). Le archiviate
  // "pure" (attivo=false ma non defunte) invece redirect alla lista.
  if (!animale.attivo && !animale.defunta_il) redirect("/galline");

  const [uovaRes, trattamentiRes, muteRes, eventiRes, inserimentoRes] = await Promise.all([
    supabase
      .from("uova")
      .select("id, data_deposizione, stato, nido_id, note")
      .eq("animale_id", animale.id)
      .order("data_deposizione", { ascending: false })
      .limit(10),
    supabase
      .from("trattamenti")
      .select("*")
      .eq("pollaio_id", pollaio.id)
      .or(`animale_id.eq.${animale.id},applica_a_tutti.eq.true`)
      .order("data", { ascending: false }),
    supabase
      .from("periodi_muta")
      .select("*")
      .eq("animale_id", animale.id)
      .order("data_inizio", { ascending: false }),
    supabase
      .from("eventi_salute")
      .select("*")
      .eq("animale_id", animale.id)
      .order("data", { ascending: false }),
    supabase
      .from("eventi_inserimento")
      .select("id, tipo, data, note, foto_url")
      .eq("animale_id", animale.id)
      .order("data", { ascending: false }),
  ]);

  const { count: uovaCount7 } = await supabase
    .from("uova")
    .select("id", { count: "exact", head: true })
    .eq("animale_id", animale.id)
    .gte(
      "data_deposizione",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const { count: uovaTotali } = await supabase
    .from("uova")
    .select("id", { count: "exact", head: true })
    .eq("animale_id", animale.id);

  const { count: uovaRegalate } = await supabase
    .from("uova")
    .select("id", { count: "exact", head: true })
    .eq("animale_id", animale.id)
    .eq("stato", "regalato");

  const data: ChickenData = {
    animale,
    uova: uovaRes.data ?? [],
    trattamenti: trattamentiRes.data ?? [],
    periodiMuta: muteRes.data ?? [],
    eventiSalute: eventiRes.data ?? [],
    eventiInserimento: (inserimentoRes.data ?? []).map((e) => ({
      id: e.id,
      tipo: e.tipo,
      data: e.data,
      note: e.note,
      foto_url: e.foto_url,
    })),
    statsUova: {
      ultimaSettimana: uovaCount7 ?? 0,
      totali: uovaTotali ?? 0,
      regalate: uovaRegalate ?? 0,
    },
  };

  return <ChickenDetail data={data} />;
}

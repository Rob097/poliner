import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { StatisticheClient, type StatsData } from "./StatisticheClient";

export const dynamic = "force-dynamic";

export default async function StatistichePage() {
  const { supabase, pollaio } = await requirePollaio();

  const [uovaRes, animaliRes, speseRes, meteoRes, periodiMutaRes] =
    await Promise.all([
      supabase
        .from("uova")
        .select("id, data_deposizione, stato, animale_id")
        .eq("pollaio_id", pollaio.id),
      supabase
        .from("animali")
        .select("id, nome, foto_url, tipo, defunta_il")
        .eq("pollaio_id", pollaio.id),
      supabase
        .from("spese")
        .select("data, importo_euro, categoria")
        .eq("pollaio_id", pollaio.id),
      supabase
        .from("meteo_storico")
        .select("data, temp_min, temp_max")
        .eq("pollaio_id", pollaio.id),
      supabase
        .from("periodi_muta")
        .select("animale_id, data_inizio, data_fine")
        .eq("pollaio_id", pollaio.id),
    ]);

  const data: StatsData = {
    uova: (uovaRes.data ?? []).map((u) => ({
      data: u.data_deposizione,
      stato: u.stato as StatsData["uova"][number]["stato"],
      animaleId: u.animale_id,
    })),
    animali: (animaliRes.data ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      fotoUrl: a.foto_url,
      tipo: a.tipo as "gallina" | "gallo",
      defunta: !!a.defunta_il,
    })),
    spese: (speseRes.data ?? []).map((s) => ({
      data: s.data,
      importo: Number(s.importo_euro),
      categoria: s.categoria,
    })),
    meteo: (meteoRes.data ?? []).map((m) => ({
      data: m.data,
      tempMin: m.temp_min !== null ? Number(m.temp_min) : null,
      tempMax: m.temp_max !== null ? Number(m.temp_max) : null,
    })),
    periodiMuta: (periodiMutaRes.data ?? []).map((p) => ({
      animaleId: p.animale_id,
      inizio: p.data_inizio,
      fine: p.data_fine,
    })),
  };

  return (
    <>
      <Header title="Statistiche" />
      <StatisticheClient data={data} />
    </>
  );
}

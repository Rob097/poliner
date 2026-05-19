import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GallineListClient, type GallinaDisplay } from "./GallineListClient";

export const dynamic = "force-dynamic";

export default async function GallinePage() {
  const { supabase, pollaio } = await requirePollaio();

  const { data: animali } = await supabase
    .from("animali")
    .select("*")
    .eq("pollaio_id", pollaio.id)
    .eq("attivo", true)
    .order("nome");

  const aIds = (animali ?? []).map((a) => a.id);

  if (aIds.length === 0) {
    return (
      <>
        <Header title="Le tue galline" subtitle="0 galline" />
        <ScreenContainer>
          <GallineListClient galline={[]} pollaioId={pollaio.id} />
        </ScreenContainer>
      </>
    );
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [uovaRes, mutaRes, saluteRes] = await Promise.all([
    supabase
      .from("uova")
      .select("animale_id")
      .in("animale_id", aIds)
      .gte("data_deposizione", sevenDaysAgo),
    supabase
      .from("periodi_muta")
      .select("animale_id, data_inizio")
      .in("animale_id", aIds)
      .is("data_fine", null),
    supabase
      .from("eventi_salute")
      .select("animale_id, tipo, descrizione")
      .in("animale_id", aIds)
      .eq("stato", "in_corso"),
  ]);

  const uovaCount = new Map<string, number>();
  for (const u of uovaRes.data ?? []) {
    if (!u.animale_id) continue;
    uovaCount.set(u.animale_id, (uovaCount.get(u.animale_id) ?? 0) + 1);
  }

  const mutaMap = new Map<string, string>();
  for (const m of mutaRes.data ?? []) {
    mutaMap.set(m.animale_id, m.data_inizio);
  }

  const saluteMap = new Map<string, string>();
  for (const s of saluteRes.data ?? []) {
    if (!saluteMap.has(s.animale_id)) {
      saluteMap.set(s.animale_id, s.descrizione ?? s.tipo);
    }
  }

  const galline: GallinaDisplay[] = (animali ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    tipo: a.tipo as "gallina" | "gallo",
    razzaId: a.razza_id,
    razzaCustom: a.razza_custom,
    dataNascita: a.data_nascita,
    fotoUrl: a.foto_url,
    inMutaDal: mutaMap.get(a.id) ?? null,
    problemaAttivo: saluteMap.get(a.id) ?? null,
    uovaUltimaSettimana: uovaCount.get(a.id) ?? 0,
  }));

  const tipoGallineCount = galline.filter((g) => g.tipo === "gallina").length;
  const tipoGalliCount = galline.filter((g) => g.tipo === "gallo").length;
  const subtitle = [
    `${tipoGallineCount} galline`,
    tipoGalliCount > 0 ? `${tipoGalliCount} gallo${tipoGalliCount > 1 ? "" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Header title="Le tue galline" subtitle={subtitle || "Nessuna ancora"} />
      <ScreenContainer>
        <GallineListClient galline={galline} pollaioId={pollaio.id} />
      </ScreenContainer>
    </>
  );
}

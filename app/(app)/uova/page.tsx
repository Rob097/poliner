import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { UovaList, type UovoDisplay } from "./UovaList";

export const dynamic = "force-dynamic";

export default async function UovaPage() {
  const { supabase, pollaio } = await requirePollaio();

  // Fetch uova: tutte (per scorte + storico)
  const { data: uova } = await supabase
    .from("uova")
    .select("id, data_deposizione, stato, conservazione, foto_url, note, animale_id, nido_id, regalo_id")
    .eq("pollaio_id", pollaio.id)
    .order("data_deposizione", { ascending: false });

  // Animali e nidi per lookup
  const [animaliRes, nidiRes, regaliRes] = await Promise.all([
    supabase
      .from("animali")
      .select("id, nome, foto_url, tipo")
      .eq("pollaio_id", pollaio.id),
    supabase
      .from("nidi")
      .select("id, nome")
      .eq("pollaio_id", pollaio.id),
    supabase
      .from("regali")
      .select("id, contatto_id, quantita, data, contatti(nome)")
      .eq("pollaio_id", pollaio.id),
  ]);

  const animaleMap = new Map<string, { nome: string; foto_url: string | null }>();
  for (const a of animaliRes.data ?? []) {
    animaleMap.set(a.id, { nome: a.nome, foto_url: a.foto_url });
  }

  const nidoMap = new Map<string, string>();
  for (const n of nidiRes.data ?? []) {
    nidoMap.set(n.id, n.nome);
  }

  const regaloMap = new Map<string, string>(); // regalo_id → nome contatto
  for (const r of regaliRes.data ?? []) {
    const contatti = r.contatti as unknown as
      | { nome: string }
      | { nome: string }[]
      | null;
    const nome = Array.isArray(contatti)
      ? contatti[0]?.nome
      : contatti?.nome;
    regaloMap.set(r.id, nome ?? "—");
  }

  const uovaDisplay: UovoDisplay[] = (uova ?? []).map((u) => ({
    id: u.id,
    dataDeposizione: u.data_deposizione,
    stato: u.stato as UovoDisplay["stato"],
    conservazione: u.conservazione as UovoDisplay["conservazione"],
    fotoUrl: u.foto_url,
    note: u.note,
    gallinaNome: u.animale_id ? animaleMap.get(u.animale_id)?.nome ?? null : null,
    gallinaFotoUrl: u.animale_id
      ? animaleMap.get(u.animale_id)?.foto_url ?? null
      : null,
    nidoNome: u.nido_id ? nidoMap.get(u.nido_id) ?? null : null,
    regalatoA: u.regalo_id ? regaloMap.get(u.regalo_id) ?? null : null,
  }));

  return (
    <>
      <Header
        title="Le tue uova"
        subtitle={`${uovaDisplay.filter((u) => u.stato === "disponibile").length} disponibili`}
      />
      <ScreenContainer pad={false}>
        <UovaList
          uova={uovaDisplay}
          conservazioneSettings={{
            ambiente: pollaio.conservazione_ambiente_giorni,
            frigo: pollaio.conservazione_frigo_giorni,
          }}
        />
      </ScreenContainer>
    </>
  );
}

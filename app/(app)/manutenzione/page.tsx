import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TIPI_MANUTENZIONE, type TipoManutenzioneId } from "@/lib/constants/manutenzione";
import { calcolaStatiManutenzione } from "@/lib/utils/manutenzione";
import { ManutenzioneClient } from "./ManutenzioneClient";

export const dynamic = "force-dynamic";

export default async function ManutenzionePage() {
  const { supabase, pollaio } = await requirePollaio();

  const [logRes, configRes] = await Promise.all([
    supabase
      .from("manutenzioni")
      .select("id, tipo, data, note")
      .eq("pollaio_id", pollaio.id)
      .order("data", { ascending: false }),
    supabase
      .from("manutenzioni_config")
      .select("tipo, frequenza_giorni")
      .eq("pollaio_id", pollaio.id),
  ]);

  // Calcola l'ultimo intervento per ciascun tipo
  const ultimoPerTipo = new Map<TipoManutenzioneId, string>();
  for (const m of logRes.data ?? []) {
    const tipoId = m.tipo as TipoManutenzioneId;
    if (!ultimoPerTipo.has(tipoId)) {
      ultimoPerTipo.set(tipoId, m.data);
    }
  }

  // Override frequenze
  const frequenzeOverride = new Map<TipoManutenzioneId, number>();
  for (const c of configRes.data ?? []) {
    frequenzeOverride.set(c.tipo as TipoManutenzioneId, c.frequenza_giorni);
  }

  const stati = calcolaStatiManutenzione(ultimoPerTipo, frequenzeOverride);

  const ultimi = (logRes.data ?? []).slice(0, 8).map((m) => ({
    id: m.id,
    tipo: m.tipo as TipoManutenzioneId,
    tipoNome: TIPI_MANUTENZIONE.find((t) => t.id === m.tipo)?.nome ?? m.tipo,
    icona: TIPI_MANUTENZIONE.find((t) => t.id === m.tipo)?.icona ?? "🧹",
    data: m.data,
    note: m.note,
  }));

  return (
    <>
      <Header title="Manutenzione" subtitle="Pulizie e interventi" />
      <ScreenContainer>
        <ManutenzioneClient
          stati={stati}
          ultimi={ultimi}
          customFreq={Object.fromEntries(frequenzeOverride.entries())}
        />
      </ScreenContainer>
    </>
  );
}

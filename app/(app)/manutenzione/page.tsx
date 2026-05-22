import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { CONSIGLI_MANUTENZIONE } from "@/lib/constants/manutenzione";
import {
  calcolaStatiManutenzione,
  type VoceManutenzione,
} from "@/lib/utils/manutenzione";
import { ManutenzioneClient } from "./ManutenzioneClient";

export const dynamic = "force-dynamic";

export default async function ManutenzionePage() {
  const { supabase, pollaio, ruolo } = await requireAdminPollaio();

  type VoceRow = {
    id: string;
    nome: string;
    dove: string | null;
    icona: string;
    frequenza_giorni: number;
    consiglio_id: string | null;
    attivo: boolean;
    note: string | null;
  };

  type LogRow = {
    id: string;
    voce_id: string;
    data: string;
    note: string | null;
  };

  const [vociRes, logRes] = await Promise.all([
    supabase
      .from("manutenzioni_voci")
      .select("id, nome, dove, icona, frequenza_giorni, consiglio_id, attivo, note")
      .eq("pollaio_id", pollaio.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("manutenzioni")
      .select("id, voce_id, data, note")
      .eq("pollaio_id", pollaio.id)
      .order("data", { ascending: false }),
  ]);

  const voci = (vociRes.data ?? []) as unknown as VoceRow[];
  const log = (logRes.data ?? []) as unknown as LogRow[];

  const vociAttive: VoceManutenzione[] = voci
    .filter((v) => v.attivo)
    .map((v) => ({
      id: v.id,
      nome: v.nome,
      dove: v.dove,
      icona: v.icona,
      frequenza_giorni: v.frequenza_giorni,
      consiglio_id: v.consiglio_id,
      attivo: v.attivo,
    }));

  // Mappa voce_id -> ultima data
  const ultimoPerVoce = new Map<string, string>();
  for (const m of log) {
    if (!ultimoPerVoce.has(m.voce_id)) ultimoPerVoce.set(m.voce_id, m.data);
  }

  const stati = calcolaStatiManutenzione(vociAttive, ultimoPerVoce);

  // Consigli che NON sono già attivi
  const consigliAttiviIds = new Set(
    voci.filter((v) => v.attivo && v.consiglio_id).map((v) => v.consiglio_id),
  );
  const consigliDisponibili = CONSIGLI_MANUTENZIONE.filter(
    (c) => !consigliAttiviIds.has(c.id),
  );

  // Ultimi 8 interventi (con nome voce per visualizzazione)
  const vociMap = new Map(voci.map((v) => [v.id, v]));
  const ultimi = log.slice(0, 8).map((m) => {
    const v = vociMap.get(m.voce_id);
    return {
      id: m.id,
      voceId: m.voce_id,
      voceNome: v?.nome ?? "Voce eliminata",
      icona: v?.icona ?? "🧹",
      data: m.data,
      note: m.note,
    };
  });

  return (
    <>
      <Header title="Manutenzione" subtitle="Pulizie e interventi" />
      <ScreenContainer>
        <ManutenzioneClient
          ruolo={ruolo}
          stati={stati}
          consigli={consigliDisponibili}
          ultimi={ultimi}
        />
      </ScreenContainer>
    </>
  );
}

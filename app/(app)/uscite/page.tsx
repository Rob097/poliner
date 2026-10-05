import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { portaDaPollaio } from "@/lib/utils/porta";
import { UsciteClient, type UscitaRow } from "./UsciteClient";

export const dynamic = "force-dynamic";

export default async function UscitePage() {
  const { supabase, pollaio, ruolo } = await requirePollaio();

  type Row = {
    id: string;
    data: string;
    ora_uscita: string | null;
    ora_rientro: string | null;
    uscita_auto: boolean;
    rientro_auto: boolean;
    note: string | null;
  };

  const { data } = await supabase
    .from("log_uscite")
    .select("id, data, ora_uscita, ora_rientro, uscita_auto, rientro_auto, note")
    .eq("pollaio_id", pollaio.id)
    .order("data", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as unknown as Row[];

  const log: UscitaRow[] = rows.map((r) => ({
    id: r.id,
    data: r.data,
    oraUscita: r.ora_uscita ? r.ora_uscita.slice(0, 5) : null,
    oraRientro: r.ora_rientro ? r.ora_rientro.slice(0, 5) : null,
    uscitaAuto: r.uscita_auto,
    rientroAuto: r.rientro_auto,
    note: r.note,
  }));

  return (
    <ScreenContainer header={<Header title="Aperture & chiusure" subtitle={pollaio.nome} />}>
      <UsciteClient
        log={log}
        porta={portaDaPollaio(pollaio)}
        isAdmin={ruolo === "admin"}
      />
    </ScreenContainer>
  );
}

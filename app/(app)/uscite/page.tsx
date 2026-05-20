import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { UsciteClient, type UscitaRow } from "./UsciteClient";

export const dynamic = "force-dynamic";

export default async function UscitePage() {
  const { supabase, pollaio, ruolo } = await requirePollaio();

  type Row = {
    id: string;
    data: string;
    ora_uscita: string | null;
    ora_rientro: string | null;
    note: string | null;
  };

  const { data } = await supabase
    .from("log_uscite")
    .select("id, data, ora_uscita, ora_rientro, note")
    .eq("pollaio_id", pollaio.id)
    .order("data", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as unknown as Row[];

  const log: UscitaRow[] = rows.map((r) => ({
    id: r.id,
    data: r.data,
    oraUscita: r.ora_uscita ? r.ora_uscita.slice(0, 5) : null,
    oraRientro: r.ora_rientro ? r.ora_rientro.slice(0, 5) : null,
    note: r.note,
  }));

  return (
    <>
      <Header title="Aperture & chiusure" subtitle={pollaio.nome} />
      <ScreenContainer>
        <UsciteClient log={log} isAdmin={ruolo === "admin"} />
      </ScreenContainer>
    </>
  );
}

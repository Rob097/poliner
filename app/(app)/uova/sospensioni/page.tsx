import { requirePollaio } from "@/lib/supabase/queries";
import { caricaNomiAnimali, caricaSospensioni } from "@/lib/queries/sospensioni";
import { SospensioniClient, type ConteggioUova } from "./SospensioniClient";

export const dynamic = "force-dynamic";

export default async function SospensioniPage({
  searchParams,
}: {
  searchParams?: Promise<{ nuova?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { supabase, pollaio, ruolo } = await requirePollaio();
  const isAdmin = ruolo === "admin";

  const [sospensioni, nomi, gallineRes, uovaRes] = await Promise.all([
    caricaSospensioni(supabase, pollaio.id),
    caricaNomiAnimali(supabase, pollaio.id),
    supabase
      .from("animali")
      .select("id, nome, foto_url")
      .eq("pollaio_id", pollaio.id)
      .eq("tipo", "gallina")
      .eq("attivo", true)
      .is("defunta_il", null)
      .order("nome"),
    supabase
      .from("uova")
      .select("sospensione_id, stato")
      .eq("pollaio_id", pollaio.id)
      .not("sospensione_id", "is", null),
  ]);

  const conteggi: Record<string, ConteggioUova> = {};
  for (const u of uovaRes.data ?? []) {
    if (!u.sospensione_id) continue;
    const c = (conteggi[u.sospensione_id] ??= { bloccate: 0, scartate: 0 });
    if (u.stato === "non_commestibile") c.bloccate += 1;
    else if (u.stato === "scartato") c.scartate += 1;
  }

  return (
    <SospensioniClient
      sospensioni={sospensioni}
      nomi={Object.fromEntries(nomi)}
      galline={(gallineRes.data ?? []).map((g) => ({
        id: g.id,
        nome: g.nome,
        fotoUrl: g.foto_url,
      }))}
      conteggi={conteggi}
      isAdmin={isAdmin}
      apriNuova={isAdmin && resolvedSearchParams?.nuova === "1"}
    />
  );
}

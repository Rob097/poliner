import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { RichiesteSection, type RichiestaRow } from "@/components/uova/RichiesteSection";
import { createAdminClient } from "@/lib/supabase/admin";
import { UovaList, type UovoDisplay } from "./UovaList";

export const dynamic = "force-dynamic";

export default async function UovaPage({
  searchParams,
}: {
  searchParams?: { richiedi?: string };
}) {
  const { supabase, user, pollaio, ruolo } = await requirePollaio();
  const autoOpenRichiesta = searchParams?.richiedi === "1";

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

  const uovaDisponibili = uovaDisplay.filter((u) => u.stato === "disponibile").length;

  // ── Richieste pending (FIFO) ─────────────────────────────
  type RichRow = {
    id: string;
    quantita: number;
    nota: string | null;
    created_at: string;
    richiedente_user_id: string;
  };
  const { data: richiesteRaw } = await supabase
    .from("richieste_uova")
    .select("id, quantita, nota, created_at, richiedente_user_id")
    .eq("pollaio_id", pollaio.id)
    .eq("stato", "in_attesa")
    .order("created_at", { ascending: true });

  const richiesteRows = (richiesteRaw ?? []) as unknown as RichRow[];

  // Profili dei richiedenti (via admin client per leggere tutti i nomi
  // anche se l'utente corrente non avesse accesso diretto a profiles).
  const richiedentiIds = Array.from(new Set(richiesteRows.map((r) => r.richiedente_user_id)));
  const nomeMap = new Map<string, string>();
  if (richiedentiIds.length > 0) {
    type ProfRow = { id: string; display_name: string | null; email: string | null };
    const admin = createAdminClient();
    const { data: profili } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", richiedentiIds);
    for (const p of ((profili ?? []) as unknown as ProfRow[])) {
      nomeMap.set(p.id, p.display_name?.trim() || p.email?.split("@")[0] || "Membro");
    }
  }

  const richieste: RichiestaRow[] = richiesteRows.map((r) => ({
    id: r.id,
    quantita: r.quantita,
    nota: r.nota,
    createdAt: r.created_at,
    richiedenteUserId: r.richiedente_user_id,
    richiedenteNome: nomeMap.get(r.richiedente_user_id) ?? "Membro",
    isMia: r.richiedente_user_id === user.id,
  }));

  return (
    <ScreenContainer
      header={(
        <Header
          title="Le tue uova"
          subtitle={`${uovaDisponibili} disponibili`}
        />
      )}
      pad={false}
    >
        <RichiesteSection
          richieste={richieste}
          uovaDisponibili={uovaDisponibili}
          ruolo={ruolo}
          autoOpen={autoOpenRichiesta}
        />
        <UovaList
          uova={uovaDisplay}
          conservazioneSettings={{
            ambiente: pollaio.conservazione_ambiente_giorni,
            frigo: pollaio.conservazione_frigo_giorni,
          }}
          isAdmin={ruolo === "admin"}
        />
    </ScreenContainer>
  );
}

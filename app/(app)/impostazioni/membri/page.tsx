import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import {
  MembriClient,
  type ContattoRow,
  type InvitoRow,
  type MembroRow,
} from "./MembriClient";

export const dynamic = "force-dynamic";

export default async function MembriPage() {
  const { supabase, user, pollaio, ruolo } = await requirePollaio();

  type Row = {
    user_id: string;
    ruolo: "admin" | "guest";
    created_at: string;
  };

  // Membri del pollaio attivo
  const { data: members } = await supabase
    .from("pollaio_members")
    .select("user_id, ruolo, created_at")
    .eq("pollaio_id", pollaio.id)
    .order("created_at", { ascending: true });

  const rows = (members ?? []) as unknown as Row[];

  // Carica i profili dei membri
  const userIds = rows.map((r) => r.user_id);
  let profiliMap = new Map<
    string,
    { display_name: string | null; email: string | null; avatar_url: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profili } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url")
      .in("id", userIds);

    type ProfileRow = {
      id: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
    const profs = (profili ?? []) as unknown as ProfileRow[];
    profiliMap = new Map(
      profs.map((p) => [p.id, { display_name: p.display_name, email: p.email, avatar_url: p.avatar_url }]),
    );
  }

  // Contatti del pollaio (per il merge con membri guest)
  let contattiAll: ContattoRow[] = [];
  const contattoLinkatoPerUtente = new Map<string, ContattoRow>();
  if (ruolo === "admin") {
    type ContattoRaw = {
      id: string;
      nome: string;
      relazione: string | null;
      utente_id: string | null;
    };
    const { data: contattiData } = await supabase
      .from("contatti")
      .select("id, nome, relazione, utente_id")
      .eq("pollaio_id", pollaio.id)
      .order("nome", { ascending: true });
    contattiAll = ((contattiData ?? []) as unknown as ContattoRaw[]).map((c) => ({
      id: c.id,
      nome: c.nome,
      relazione: c.relazione,
      utenteId: c.utente_id,
    }));
    for (const c of contattiAll) {
      if (c.utenteId) contattoLinkatoPerUtente.set(c.utenteId, c);
    }
  }

  const membri: MembroRow[] = rows.map((r) => {
    const prof = profiliMap.get(r.user_id);
    const linkato = contattoLinkatoPerUtente.get(r.user_id);
    return {
      userId: r.user_id,
      ruolo: r.ruolo,
      displayName: prof?.display_name ?? null,
      email: prof?.email ?? null,
      isYou: r.user_id === user.id,
      contattoLinkatoNome: linkato?.nome ?? null,
    };
  });

  // Contatti senza utente_id (linkabili)
  const contattiLinkabili = contattiAll.filter((c) => !c.utenteId);

  // Inviti pending (solo admin li vede)
  let inviti: InvitoRow[] = [];
  if (ruolo === "admin") {
    type InvitoRaw = {
      id: string;
      email: string;
      ruolo: "admin" | "guest";
      scadenza: string;
      created_at: string;
    };
    const { data: invitiData } = await supabase
      .from("pollaio_inviti")
      .select("id, email, ruolo, scadenza, created_at")
      .eq("pollaio_id", pollaio.id)
      .is("accettato_il", null)
      .order("created_at", { ascending: false });
    inviti = ((invitiData ?? []) as unknown as InvitoRaw[]).map((i) => ({
      id: i.id,
      email: i.email,
      ruolo: i.ruolo,
      scadenza: i.scadenza,
    }));
  }

  return (
    <>
      <Header title="Membri" subtitle={pollaio.nome} />
      <ScreenContainer>
        <MembriClient
          pollaioId={pollaio.id}
          ruoloCorrente={ruolo}
          membri={membri}
          inviti={inviti}
          contattiLinkabili={contattiLinkabili}
        />
      </ScreenContainer>
    </>
  );
}

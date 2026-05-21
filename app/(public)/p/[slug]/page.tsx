import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { SLUG_REGEX } from "@/lib/utils/slug";
import { PaginaPubblicaView, type AnimalePubblico, type PollaioPubblico, type StatsPubbliche } from "./PaginaPubblicaView";

export const revalidate = 300; // ISR 5 minuti

export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  if (!SLUG_REGEX.test(params.slug)) return { title: "Pagina non trovata" };

  const supabase = createPublicClient();
  const { data: pollaio } = await supabase
    .from("pollai")
    .select("nome, descrizione_pubblica, foto_url")
    .eq("pubblico_slug", params.slug)
    .eq("pubblico_attivo", true)
    .maybeSingle();

  if (!pollaio) return { title: "Pagina non trovata" };

  const desc = pollaio.descrizione_pubblica?.slice(0, 160) ??
    `Scopri il pollaio "${pollaio.nome}" su Poliner.`;
  return {
    title: `${pollaio.nome} · Poliner`,
    description: desc,
    openGraph: {
      title: pollaio.nome,
      description: desc,
      images: pollaio.foto_url ? [pollaio.foto_url] : undefined,
      type: "website",
    },
  };
}

export default async function PaginaPubblicaPage(
  { params }: { params: { slug: string } },
) {
  if (!SLUG_REGEX.test(params.slug)) notFound();

  const supabase = createPublicClient();

  const { data: pollaioRaw } = await supabase
    .from("pollai")
    .select("id, nome, foto_url, posizione_nome, descrizione_pubblica")
    .eq("pubblico_slug", params.slug)
    .eq("pubblico_attivo", true)
    .maybeSingle();

  if (!pollaioRaw) notFound();

  const [animaliRes, statsRes] = await Promise.all([
    supabase
      .from("animali")
      .select(
        "id, nome, foto_url, razza_id, razza_custom, data_nascita, tipo, colore_piumaggio",
      )
      .eq("pollaio_id", pollaioRaw.id)
      .eq("attivo", true)
      .is("defunta_il", null)
      .order("nome"),
    supabase.rpc("public_pollaio_stats", { p_slug: params.slug }),
  ]);

  const pollaio: PollaioPubblico = {
    id: pollaioRaw.id,
    nome: pollaioRaw.nome,
    fotoUrl: pollaioRaw.foto_url,
    posizioneNome: pollaioRaw.posizione_nome,
    descrizionePubblica: pollaioRaw.descrizione_pubblica,
  };

  const animali: AnimalePubblico[] = (animaliRes.data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    fotoUrl: a.foto_url,
    razzaId: a.razza_id,
    razzaCustom: a.razza_custom,
    dataNascita: a.data_nascita,
    tipo: a.tipo as "gallina" | "gallo",
    colorePiumaggio: a.colore_piumaggio,
  }));

  const stat = statsRes.data?.[0];
  const stats: StatsPubbliche = {
    uovaTotali: Number(stat?.uova_totali ?? 0),
    uovaUltimoMese: Number(stat?.uova_ultimo_mese ?? 0),
    gallineCount: Number(stat?.galline_count ?? 0),
  };

  return <PaginaPubblicaView pollaio={pollaio} animali={animali} stats={stats} />;
}
